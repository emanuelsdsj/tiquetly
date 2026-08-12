from datetime import datetime

from sqlmodel import Session, select

from app.core.errors import EventNotFoundError, EventNotPublishedError, ForbiddenError
from app.models import Event, EventCategory, EventStatus, ReservationMode, Seat, User
from app.schemas import EventCreate, EventUpdate

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


def update_event(session: Session, organizer: User, event_id: int, data: EventUpdate) -> Event:
    event = _get_owned_event(session, organizer, event_id)

    # Only the descriptive/commercial fields are editable (ADR 0016):
    # capacity, category, reservation_mode, source and external_id all
    # feed the seat map or the atomic reservation guards, changing them
    # after seats/reservations may already exist is out of scope here.
    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(event, field, value)

    session.add(event)
    session.commit()
    session.refresh(event)
    return event


def unpublish_event(session: Session, organizer: User, event_id: int) -> Event:
    event = _get_owned_event(session, organizer, event_id)
    if event.status != EventStatus.published:
        raise EventNotPublishedError(f"event {event_id} is not published")

    event.status = EventStatus.cancelled
    session.add(event)
    session.commit()
    session.refresh(event)
    return event


def _get_owned_event(session: Session, organizer: User, event_id: int) -> Event:
    event = session.get(Event, event_id)
    if event is None:
        raise EventNotFoundError(f"event {event_id} not found")
    if event.organizer_id != organizer.id:
        raise ForbiddenError("this event belongs to another organizer")
    return event


def list_event_seats(session: Session, event_id: int) -> list[Seat]:
    event = session.get(Event, event_id)
    if event is None or event.status != EventStatus.published:
        raise EventNotFoundError(f"event {event_id} not found")

    statement = select(Seat).where(Seat.event_id == event_id)
    seats = list(session.exec(statement).all())
    # Sorted in Python, not SQL: `col` is stored as text (see the Seat
    # model), so an ORDER BY would sort "10" before "2" lexicographically.
    seats.sort(key=lambda seat: (seat.row, int(seat.col)))
    return seats
