"""Seed the database with the test users and demo events the challenge
asks for: 1 organizer, 2 customers, 1 gatekeeper, one published show
event (Ticketmaster) and one published movie event (TMDb), both with
tickets available, and one ticket already validated so the gate screen
has an "already_used" case to demonstrate, not just the happy path.

Run with `python -m app.seed`. Requires TICKETMASTER_API_KEY and
TMDB_API_KEY set (see .env.example): unlike EventCreate elsewhere, this
script calls the real catalog APIs to build its demo events, the same
way an organizer would through the create-event screen.

Safe to run more than once: every user is looked up by email first, and
the show/movie events are only created if the organizer does not already
have one of that category, so re-running does not pile up duplicates.
"""

import sys
from datetime import UTC, datetime, timedelta

from sqlmodel import Session, select

from app.core.security import hash_password
from app.db import engine
from app.models import Event, EventCategory, ReservationMode, Ticket, User, UserRole
from app.schemas import EventCreate
from app.services import event_service, reservation_service, ticket_service
from app.services.catalog.ticketmaster import TicketmasterProvider
from app.services.catalog.tmdb import TmdbProvider
from app.services.reservation_service import APPROVE_CARD_NUMBER

SEED_PASSWORD = "tiquetly123"

SEED_USERS = [
    ("admin@tiquetly.com", "Admin Tiquetly", UserRole.admin),
    ("organizador@tiquetly.com", "Organizador Tiquetly", UserRole.organizer),
    ("cliente1@tiquetly.com", "Cliente Um", UserRole.customer),
    ("cliente2@tiquetly.com", "Cliente Dois", UserRole.customer),
    ("portaria@tiquetly.com", "Portaria Tiquetly", UserRole.gatekeeper),
]


def _get_or_create_user(session: Session, email: str, name: str, role: UserRole) -> tuple[User, bool]:
    user = session.exec(select(User).where(User.email == email)).first()
    if user:
        return user, False
    user = User(email=email, hashed_password=hash_password(SEED_PASSWORD), name=name, role=role)
    session.add(user)
    session.commit()
    session.refresh(user)
    return user, True


def _get_or_create_show_event(session: Session, organizer: User) -> tuple[Event | None, bool]:
    existing = session.exec(
        select(Event).where(Event.organizer_id == organizer.id, Event.category == EventCategory.show)
    ).first()
    if existing:
        return existing, False

    results = TicketmasterProvider().search(None)
    if not results:
        print("Ticketmaster returned no results, skipping the show event.", file=sys.stderr)
        return None, False
    catalog_event = results[0]

    event = event_service.create_event(
        session,
        organizer,
        EventCreate(
            source=catalog_event.source,
            external_id=catalog_event.external_id,
            title=catalog_event.title,
            image=catalog_event.image,
            description=catalog_event.description,
            category=EventCategory.show,
            # Overridden rather than trusting the catalog date: this
            # demo event should always read as upcoming, whenever the
            # seed happens to run relative to the real show's own date.
            date=datetime.now(UTC) + timedelta(days=20),
            venue=catalog_event.venue or "Arena Tiquetly",
            capacity=50,
            price=120.0,
            reservation_mode=ReservationMode.general,
        ),
    )
    return event, True


def _get_or_create_movie_event(session: Session, organizer: User) -> tuple[Event | None, bool]:
    existing = session.exec(
        select(Event).where(Event.organizer_id == organizer.id, Event.category == EventCategory.movie)
    ).first()
    if existing:
        return existing, False

    results = TmdbProvider().search(None)
    if not results:
        print("TMDb returned no results, skipping the movie event.", file=sys.stderr)
        return None, False
    catalog_event = results[0]

    event = event_service.create_event(
        session,
        organizer,
        EventCreate(
            source=catalog_event.source,
            external_id=catalog_event.external_id,
            title=catalog_event.title,
            image=catalog_event.image,
            description=catalog_event.description,
            category=EventCategory.movie,
            # Pinned to noon UTC today, not a few days out like the show
            # event: the gate screen only lists events happening today
            # (GatePage's own date_from/date_to filter), and this is the
            # event carrying the pre-validated ticket the gate demo needs
            # to find. Noon UTC rather than "now + a few hours" so the
            # calendar date never rolls over regardless of what time the
            # seed happens to run (a `+ timedelta(hours=6)` run late in
            # the UTC day was landing on tomorrow, missed on the first
            # try). Still only holds on the day the seed runs, and only
            # lines up with a gate operator's own "today" if their clock
            # is reasonably close to UTC, see "O que não funciona como
            # esperado" in the README.
            date=datetime.now(UTC).replace(hour=12, minute=0, second=0, microsecond=0),
            # TMDb has no venue of its own, this is a movie session, not
            # the film itself.
            venue="Cinemark Tiquetly",
            capacity=40,
            price=32.0,
            reservation_mode=ReservationMode.seatmap,
        ),
    )
    return event, True


def _buy_pay_and_validate_one_ticket(session: Session, customer: User, event: Event) -> None:
    if event.reservation_mode == ReservationMode.seatmap:
        seats = event_service.list_event_seats(session, event.id)
        reservation = reservation_service.create_seatmap_reservation(session, customer, event.id, [seats[0].id])
    else:
        reservation = reservation_service.create_general_reservation(session, customer, event.id, 1)

    reservation = reservation_service.pay_reservation(session, customer, reservation.id, APPROVE_CARD_NUMBER)
    ticket = session.exec(select(Ticket).where(Ticket.reservation_id == reservation.id)).first()
    ticket_service.validate_ticket(session, event.id, str(ticket.public_code))


def main() -> None:
    with Session(engine) as session:
        organizer, _ = _get_or_create_user(session, *SEED_USERS[0])
        customer1, _ = _get_or_create_user(session, *SEED_USERS[1])
        customer2, _ = _get_or_create_user(session, *SEED_USERS[2])
        _get_or_create_user(session, *SEED_USERS[3])

        show_event, show_created = _get_or_create_show_event(session, organizer)
        movie_event, movie_created = _get_or_create_movie_event(session, organizer)

        if movie_created and movie_event:
            _buy_pay_and_validate_one_ticket(session, customer1, movie_event)
        if show_created and show_event:
            reservation = reservation_service.create_general_reservation(session, customer2, show_event.id, 2)
            reservation_service.pay_reservation(session, customer2, reservation.id, APPROVE_CARD_NUMBER)

        print("Seed done.")
        print(f"  admin:      admin@tiquetly.com / {SEED_PASSWORD}")
        print(f"  organizer:  organizador@tiquetly.com / {SEED_PASSWORD}")
        print(f"  customer 1: cliente1@tiquetly.com / {SEED_PASSWORD}")
        print(f"  customer 2: cliente2@tiquetly.com / {SEED_PASSWORD}")
        print(f"  gatekeeper: portaria@tiquetly.com / {SEED_PASSWORD}")
        if show_event:
            print(f"  show event:  {show_event.title!r} (id {show_event.id})")
        if movie_event:
            print(f"  movie event: {movie_event.title!r} (id {movie_event.id}), one ticket already used")


if __name__ == "__main__":
    main()
