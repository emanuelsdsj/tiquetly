"""Fixtures for the frontend E2E suite (Playwright, see `frontend/e2e/`):
one organizer, one gatekeeper, one published general-admission event, one
published seatmap event.

Unlike `app/seed.py`, this never calls the real Ticketmaster/TMDb APIs:
`event_service.create_event` trusts whatever catalog snapshot it is given
(ADR 0006) and never re-verifies it against the external provider, so a
fabricated snapshot is enough to produce a fully valid event. CI should
never need real catalog API keys just to run the test suite.

Customers are not seeded here, and no ticket is pre-purchased or
pre-validated: each E2E spec that needs one of those manufactures it
itself through the real UI (register, reserve, pay), so those code paths
stay exercised and specs never collide over shared state.

Run with `python -m app.e2e_fixtures`. Safe to run more than once, same
idempotency shape as `seed.py` (looked up by email/category first).
"""

from datetime import UTC, datetime, timedelta

from sqlmodel import Session, select

from app.core.security import hash_password
from app.db import engine
from app.models import Event, EventCategory, EventSource, ReservationMode, User, UserRole
from app.schemas import EventCreate
from app.services import event_service

E2E_PASSWORD = "tiquetly123"

E2E_USERS = [
    ("e2e-organizer@tiquetly.com", "E2E Organizer", UserRole.organizer),
    ("e2e-gatekeeper@tiquetly.com", "E2E Gatekeeper", UserRole.gatekeeper),
    ("e2e-admin@tiquetly.com", "E2E Admin", UserRole.admin),
]


def _get_or_create_user(session: Session, email: str, name: str, role: UserRole) -> User:
    user = session.exec(select(User).where(User.email == email)).first()
    if user:
        return user
    user = User(email=email, hashed_password=hash_password(E2E_PASSWORD), name=name, role=role)
    session.add(user)
    session.commit()
    session.refresh(user)
    return user


def _get_or_create_general_event(session: Session, organizer: User) -> Event:
    existing = session.exec(
        select(Event).where(Event.organizer_id == organizer.id, Event.category == EventCategory.show)
    ).first()
    if existing:
        return existing

    return event_service.create_event(
        session,
        organizer,
        EventCreate(
            source=EventSource.ticketmaster,
            external_id="e2e-show-fixture",
            title="E2E Test Show",
            description="Fixture event for the Playwright suite.",
            category=EventCategory.show,
            date=datetime.now(UTC) + timedelta(days=20),
            venue="E2E Arena",
            capacity=50,
            price=120.0,
            reservation_mode=ReservationMode.general,
        ),
    )


def _get_or_create_seatmap_event(session: Session, organizer: User) -> Event:
    existing = session.exec(
        select(Event).where(Event.organizer_id == organizer.id, Event.category == EventCategory.movie)
    ).first()
    if existing:
        return existing

    now = datetime.now(UTC)
    # Same "today" trick as seed.py, so the gate screen's "today" dropdown
    # finds this event, but a fixed noon broke as soon as ADR 0025 started
    # hiding past-dated events from the plain browse search: any CI run
    # starting after noon UTC (unpredictable, CI has no fixed time of day)
    # created the fixture already in the past, so reserve-seatmap.spec.js
    # and gate.spec.js could never find it on the home page to begin with.
    # A short buffer from the actual fixture-creation moment keeps it
    # reservable regardless of when in the day the job runs, clamped to
    # not cross into tomorrow (and out of "today" for the gate dropdown)
    # on the rare run that starts in the last half hour before midnight
    # UTC.
    event_time = min(now + timedelta(minutes=30), now.replace(hour=23, minute=59, second=0, microsecond=0))

    return event_service.create_event(
        session,
        organizer,
        EventCreate(
            source=EventSource.tmdb,
            external_id="e2e-movie-fixture",
            title="E2E Test Movie",
            description="Fixture event for the Playwright suite.",
            category=EventCategory.movie,
            date=event_time,
            venue="E2E Cinema",
            capacity=40,
            price=32.0,
            reservation_mode=ReservationMode.seatmap,
        ),
    )


def main() -> None:
    with Session(engine) as session:
        organizer = _get_or_create_user(session, *E2E_USERS[0])
        _get_or_create_user(session, *E2E_USERS[1])
        _get_or_create_user(session, *E2E_USERS[2])

        general_event = _get_or_create_general_event(session, organizer)
        seatmap_event = _get_or_create_seatmap_event(session, organizer)

        print("E2E fixtures ready.")
        print(f"  organizer:  {E2E_USERS[0][0]} / {E2E_PASSWORD}")
        print(f"  gatekeeper: {E2E_USERS[1][0]} / {E2E_PASSWORD}")
        print(f"  admin:      {E2E_USERS[2][0]} / {E2E_PASSWORD}")
        print(f"  general event: {general_event.title!r} (id {general_event.id})")
        print(f"  seatmap event: {seatmap_event.title!r} (id {seatmap_event.id})")


if __name__ == "__main__":
    main()
