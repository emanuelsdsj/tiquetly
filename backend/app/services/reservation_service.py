from sqlmodel import Session, update

from app.core.errors import EventNotFoundError, SoldOutError, WrongReservationModeError
from app.models import (
    Event,
    EventStatus,
    Reservation,
    ReservationMode,
    ReservationSeat,
    ReservationStatus,
    Seat,
    SeatStatus,
    User,
)


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
        session.rollback()
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


def create_seatmap_reservation(session: Session, customer: User, event_id: int, seat_ids: list[int]) -> Reservation:
    event = session.get(Event, event_id)
    if event is None or event.status != EventStatus.published:
        raise EventNotFoundError(f"event {event_id} not found")
    if event.reservation_mode != ReservationMode.seatmap:
        raise WrongReservationModeError("this event sells by quantity, not by seat")

    unique_seat_ids = list(dict.fromkeys(seat_ids))

    # One UPDATE covering every requested seat, guarded the same way as the
    # general-admission counter: a seat only flips if it is still available,
    # so two customers racing for the same seat can never both get it. If
    # fewer rows flip than seats were requested, some were already taken; the
    # explicit rollback below undoes any seats that DID flip in this same
    # statement, rather than leaving a half-reserved selection. Relying on
    # the session closing without a commit to do this implicitly is not
    # enough, a caller can reuse the same session for another request
    # afterwards (tests do; so, in principle, could a future caller), and an
    # uncommitted-but-not-rolled-back UPDATE would still be visible to it.
    statement = (
        update(Seat)
        .where(Seat.id.in_(unique_seat_ids), Seat.event_id == event_id, Seat.status == SeatStatus.available)
        .values(status=SeatStatus.reserved)
    )
    result = session.execute(statement)
    if result.rowcount != len(unique_seat_ids):
        session.rollback()
        raise SoldOutError("one or more selected seats are no longer available")

    reservation = Reservation(
        event_id=event_id,
        customer_id=customer.id,
        quantity=None,
        status=ReservationStatus.pending,
    )
    session.add(reservation)
    session.commit()
    session.refresh(reservation)

    for seat_id in unique_seat_ids:
        session.add(ReservationSeat(reservation_id=reservation.id, seat_id=seat_id))
    session.commit()

    return reservation
