from datetime import datetime

from sqlmodel import Session, select

from app.models import Event, EventCategory, EventStatus, ReservationMode, Seat, User
from app.schemas import EventCreate

# Simple fixed-width layout for seatmap events: seats fill row A first, then
# B, and so on, ten to a row. Good enough for a theater-sized capacity;
# revisit if an event ever needs an irregular layout (aisles, sections).
SEATS_PER_ROW = 10


def create_event(session: Session, organizer: User, data: EventCreate) -> Event:
    event = Event(
        organizer_id=organizer.id,
        source=data.source,
        external_id=data.external_id,
        title=data.title,
        image=data.image,
        description=data.description,
        category=data.category,
        date=data.date,
        venue=data.venue,
        capacity=data.capacity,
        price=data.price,
        reservation_mode=data.reservation_mode,
        # No draft/review step in this scope: an organizer creating an
        # event is publishing it, ready to sell immediately.
        status=EventStatus.published,
    )
    session.add(event)
    session.commit()
    session.refresh(event)

    if event.reservation_mode == ReservationMode.seatmap:
        _generate_seats(session, event)

    return event


def _generate_seats(session: Session, event: Event) -> None:
    for i in range(event.capacity):
        row = chr(ord("A") + i // SEATS_PER_ROW)
        col = str(i % SEATS_PER_ROW + 1)
        session.add(Seat(event_id=event.id, row=row, col=col))
    session.commit()


def list_events_for_organizer(session: Session, organizer: User) -> list[Event]:
    statement = select(Event).where(Event.organizer_id == organizer.id)
    return list(session.exec(statement).all())


def search_published_events(
    session: Session,
    *,
    q: str | None = None,
    category: EventCategory | None = None,
    date_from: datetime | None = None,
    date_to: datetime | None = None,
    price_min: float | None = None,
    price_max: float | None = None,
) -> list[Event]:
    statement = select(Event).where(Event.status == EventStatus.published)
    if q:
        statement = statement.where(Event.title.ilike(f"%{q}%"))
    if category:
        statement = statement.where(Event.category == category)
    if date_from:
        statement = statement.where(Event.date >= date_from)
    if date_to:
        statement = statement.where(Event.date <= date_to)
    if price_min is not None:
        statement = statement.where(Event.price >= price_min)
    if price_max is not None:
        statement = statement.where(Event.price <= price_max)
    statement = statement.order_by(Event.date)
    return list(session.exec(statement).all())
