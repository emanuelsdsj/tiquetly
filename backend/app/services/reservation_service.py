from sqlmodel import Session, update

from app.core.errors import EventNotFoundError, SoldOutError, WrongReservationModeError
from app.models import Event, EventStatus, Reservation, ReservationMode, ReservationStatus, User


def create_general_reservation(session: Session, customer: User, event_id: int, quantity: int) -> Reservation:
    event = session.get(Event, event_id)
    if event is None or event.status != EventStatus.published:
        raise EventNotFoundError(f"event {event_id} not found")
    if event.reservation_mode != ReservationMode.general:
        raise WrongReservationModeError("this event sells by seat, not by quantity")

    # Single UPDATE, guarded by the capacity check in its own WHERE clause: two
    # concurrent requests racing for the last seats can never both succeed past
    # the limit, because the database evaluates and applies each UPDATE
    # atomically, there is no read-then-write gap for a second request to land in.
    statement = (
        update(Event)
        .where(Event.id == event_id, Event.reserved_count + quantity <= Event.capacity)
        .values(reserved_count=Event.reserved_count + quantity)
    )
    result = session.execute(statement)
    if result.rowcount == 0:
        raise SoldOutError("not enough capacity left for this event")

    reservation = Reservation(
        event_id=event_id,
        customer_id=customer.id,
        quantity=quantity,
        status=ReservationStatus.pending,
    )
    session.add(reservation)
    session.commit()
    session.refresh(reservation)
    return reservation
