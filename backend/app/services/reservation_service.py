from datetime import UTC, datetime, timedelta

from sqlmodel import Session, select, update

from app.core.errors import (
    EventNotFoundError,
    ForbiddenError,
    InvalidTestCardError,
    ReservationNotCancellableError,
    ReservationNotFoundError,
    ReservationNotPendingError,
    SoldOutError,
    WrongReservationModeError,
)
from app.models import (
    Event,
    EventStatus,
    Reservation,
    ReservationMode,
    ReservationSeat,
    ReservationStatus,
    Seat,
    SeatStatus,
    Ticket,
    TicketStatus,
    User,
)
from app.services import ticket_service

# Fixed test card numbers this simulation recognizes, in the spirit of
# Stripe's own test cards (ADR 0010). Not real card numbers, no Luhn check.
APPROVE_CARD_NUMBER = "4242424242424242"
DECLINE_CARD_NUMBER = "4000000000000002"

# How long a reservation can sit unpaid before it is swept back to
# available stock (ADR 0024). Applies to both reservation modes alike.
RESERVATION_PENDING_TTL_MINUTES = 10


def _utcnow() -> datetime:
    return datetime.now(UTC)


def expire_stale_pending_reservations(session: Session, event_id: int) -> None:
    """Sweep this event's own pending reservations older than the TTL back
    to available stock. Lazy, not a background job (ADR 0024): called at
    the points that already read or mutate this event's availability, the
    same "checked at the moment it matters" posture as the atomic guards
    in this module and ADR 0004's realtime tradeoff, so no new moving part
    (scheduler, cron, worker process) enters the deploy.

    Guarded per-reservation, not as one batch UPDATE, so two callers
    racing to expire the same stale reservation can never both release its
    stock: only the caller whose conditional UPDATE actually flips
    pending -> expired does the release.
    """
    cutoff = _utcnow() - timedelta(minutes=RESERVATION_PENDING_TTL_MINUTES)
    stale = session.exec(
        select(Reservation).where(
            Reservation.event_id == event_id,
            Reservation.status == ReservationStatus.pending,
            Reservation.created_at < cutoff,
        )
    ).all()
    if not stale:
        return

    for reservation in stale:
        statement = (
            update(Reservation)
            .where(Reservation.id == reservation.id, Reservation.status == ReservationStatus.pending)
            .values(status=ReservationStatus.expired)
        )
        result = session.execute(statement)
        if result.rowcount == 0:
            continue
        _release_held_stock(session, reservation)
    session.commit()


def create_general_reservation(session: Session, customer: User, event_id: int, quantity: int) -> Reservation:
    event = session.get(Event, event_id)
    if event is None or event.status != EventStatus.published:
        raise EventNotFoundError("EVENT_NOT_FOUND", f"event {event_id} not found", event_id=str(event_id))
    if event.reservation_mode != ReservationMode.general:
        raise WrongReservationModeError("WRONG_MODE_EXPECTS_SEATS", "this event sells by seat, not by quantity")

    expire_stale_pending_reservations(session, event_id)

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
        raise SoldOutError("SOLD_OUT_CAPACITY", "not enough capacity left for this event")

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
        raise EventNotFoundError("EVENT_NOT_FOUND", f"event {event_id} not found", event_id=str(event_id))
    if event.reservation_mode != ReservationMode.seatmap:
        raise WrongReservationModeError("WRONG_MODE_EXPECTS_QUANTITY", "this event sells by quantity, not by seat")

    expire_stale_pending_reservations(session, event_id)

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
        raise SoldOutError("SOLD_OUT_SEATS", "one or more selected seats are no longer available")

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


def pay_reservation(session: Session, customer: User, reservation_id: int, card_number: str) -> Reservation:
    reservation = session.get(Reservation, reservation_id)
    if reservation is None:
        raise ReservationNotFoundError(
            "RESERVATION_NOT_FOUND", f"reservation {reservation_id} not found", reservation_id=str(reservation_id)
        )
    if reservation.customer_id != customer.id:
        raise ForbiddenError("FORBIDDEN_NOT_RESERVATION_OWNER", "this reservation belongs to another customer")

    expire_stale_pending_reservations(session, reservation.event_id)
    session.refresh(reservation)

    if reservation.status != ReservationStatus.pending:
        raise ReservationNotPendingError(
            "RESERVATION_NOT_PENDING",
            f"reservation is already {reservation.status.value}",
            status=reservation.status.value,
        )

    normalized_card_number = card_number.replace(" ", "")
    if normalized_card_number == APPROVE_CARD_NUMBER:
        reservation.status = ReservationStatus.paid
    elif normalized_card_number == DECLINE_CARD_NUMBER:
        reservation.status = ReservationStatus.failed
        _release_held_stock(session, reservation)
    else:
        raise InvalidTestCardError(
            "INVALID_TEST_CARD",
            f"unrecognized test card number, use {APPROVE_CARD_NUMBER} (approves) "
            f"or {DECLINE_CARD_NUMBER} (declines)",
            approve_card=APPROVE_CARD_NUMBER,
            decline_card=DECLINE_CARD_NUMBER,
        )

    session.add(reservation)
    session.commit()
    session.refresh(reservation)

    if reservation.status == ReservationStatus.paid:
        ticket_service.generate_tickets_for_reservation(session, reservation)

    return reservation


def cancel_reservation(session: Session, customer: User, reservation_id: int) -> Reservation:
    reservation = session.get(Reservation, reservation_id)
    if reservation is None:
        raise ReservationNotFoundError(
            "RESERVATION_NOT_FOUND", f"reservation {reservation_id} not found", reservation_id=str(reservation_id)
        )
    if reservation.customer_id != customer.id:
        raise ForbiddenError("FORBIDDEN_NOT_RESERVATION_OWNER", "this reservation belongs to another customer")
    if reservation.status not in (ReservationStatus.pending, ReservationStatus.paid):
        raise ReservationNotCancellableError(
            "RESERVATION_NOT_CANCELLABLE_STATUS",
            f"reservation is already {reservation.status.value}",
            status=reservation.status.value,
        )

    if reservation.status == ReservationStatus.paid:
        ticket_ids = session.exec(select(Ticket.id).where(Ticket.reservation_id == reservation.id)).all()
        # Guarded the same way as the gate's own valid -> used flip (ADR
        # 0014): if a concurrent scan already marked a ticket used, this
        # UPDATE will not touch it, and the rowcount mismatch below catches
        # that instead of silently cancelling an admission that already
        # happened.
        statement = (
            update(Ticket)
            .where(Ticket.id.in_(ticket_ids), Ticket.status == TicketStatus.valid)
            .values(status=TicketStatus.cancelled)
        )
        result = session.execute(statement)
        if result.rowcount != len(ticket_ids):
            session.rollback()
            raise ReservationNotCancellableError(
                "RESERVATION_NOT_CANCELLABLE_USED", "one or more tickets from this reservation were already used"
            )

    reservation.status = ReservationStatus.cancelled
    session.add(reservation)
    _release_held_stock(session, reservation)
    session.commit()
    session.refresh(reservation)
    return reservation


def _release_held_stock(session: Session, reservation: Reservation) -> None:
    """Give back whatever a declined reservation was holding: the counted
    quantity for general admission (ADR 0008), or the seats themselves for
    seatmap events (ADR 0009). Symmetric to how each is claimed on creation.
    """
    if reservation.quantity is not None:
        statement = (
            update(Event)
            .where(Event.id == reservation.event_id)
            .values(reserved_count=Event.reserved_count - reservation.quantity)
        )
        session.execute(statement)
        return

    seat_ids = session.exec(
        select(ReservationSeat.seat_id).where(ReservationSeat.reservation_id == reservation.id)
    ).all()
    if not seat_ids:
        return
    statement = update(Seat).where(Seat.id.in_(seat_ids)).values(status=SeatStatus.available)
    session.execute(statement)
