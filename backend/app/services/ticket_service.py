import uuid
from datetime import UTC, datetime

from sqlmodel import Session, select, update

from app.core.errors import EventNotFoundError, InvalidTicketSignatureError, TicketNotFoundError
from app.core.qr import build_qr_image
from app.core.security import build_qr_payload, verify_qr_payload
from app.models import Event, Reservation, ReservationSeat, Seat, SeatStatus, Ticket, TicketStatus, User
from app.schemas import EventRead, SeatRead, TicketRead, TicketValidationRead


def generate_tickets_for_reservation(session: Session, reservation: Reservation) -> list[Ticket]:
    """One Ticket per admission: a general reservation of quantity N
    becomes N tickets with no seat, a seatmap reservation becomes one
    ticket per reserved seat (ADR 0011). Seats also flip reserved -> sold
    here: once a ticket exists for a seat, it is no longer just held for
    an unpaid reservation, it belongs to a confirmed admission.
    """
    if reservation.quantity is not None:
        tickets = [
            Ticket(reservation_id=reservation.id, event_id=reservation.event_id, customer_id=reservation.customer_id)
            for _ in range(reservation.quantity)
        ]
    else:
        seat_ids = session.exec(
            select(ReservationSeat.seat_id).where(ReservationSeat.reservation_id == reservation.id)
        ).all()
        session.execute(update(Seat).where(Seat.id.in_(seat_ids)).values(status=SeatStatus.sold))
        tickets = [
            Ticket(
                reservation_id=reservation.id,
                event_id=reservation.event_id,
                customer_id=reservation.customer_id,
                seat_id=seat_id,
            )
            for seat_id in seat_ids
        ]

    session.add_all(tickets)
    session.commit()
    for ticket in tickets:
        session.refresh(ticket)
    return tickets


def list_my_tickets(session: Session, customer: User) -> list[TicketRead]:
    tickets = session.exec(
        select(Ticket).where(Ticket.customer_id == customer.id).order_by(Ticket.created_at.desc())
    ).all()
    return [_to_ticket_read(session, ticket) for ticket in tickets]


def get_public_ticket(session: Session, public_code: uuid.UUID) -> TicketRead:
    """No auth required: the public_code itself (an unguessable UUID,
    never the sequential id) is the access control, the same trust model
    as the QR signature (ADR 0012). Whoever holds the link holds the
    ticket, matching how sharing a physical ticket works (ADR 0013).
    """
    ticket = session.exec(select(Ticket).where(Ticket.public_code == public_code)).first()
    if ticket is None:
        raise TicketNotFoundError("TICKET_NOT_FOUND", f"ticket {public_code} not found", public_code=str(public_code))
    return _to_ticket_read(session, ticket)


def validate_ticket(session: Session, event_id: int, code: str) -> TicketValidationRead:
    """The gate's single decision point: valid, invalid, already_used or
    wrong_event, never more than those four (matches the challenge's own
    wording). `code` is either a full signed QR payload from the camera
    ("public_code.signature") or a bare public_code typed by hand; only
    the former is signature-checked (ADR 0014).
    """
    if session.get(Event, event_id) is None:
        raise EventNotFoundError("EVENT_NOT_FOUND", f"event {event_id} not found", event_id=str(event_id))

    if "." in code:
        try:
            raw_code = verify_qr_payload(code)
        except InvalidTicketSignatureError:
            return TicketValidationRead(outcome="invalid")
    else:
        raw_code = code

    try:
        public_code = uuid.UUID(raw_code)
    except ValueError:
        return TicketValidationRead(outcome="invalid")

    ticket = session.exec(select(Ticket).where(Ticket.public_code == public_code)).first()
    if ticket is None:
        return TicketValidationRead(outcome="invalid")

    event = session.get(Event, ticket.event_id)
    seat = session.get(Seat, ticket.seat_id) if ticket.seat_id is not None else None
    seat_read = SeatRead.model_validate(seat) if seat else None

    if ticket.event_id != event_id:
        return TicketValidationRead(outcome="wrong_event", event_title=event.title, seat=seat_read)

    if ticket.status == TicketStatus.used:
        return TicketValidationRead(
            outcome="already_used", event_title=event.title, seat=seat_read, used_at=ticket.used_at
        )
    if ticket.status == TicketStatus.cancelled:
        return TicketValidationRead(outcome="invalid", event_title=event.title, seat=seat_read)

    # status is valid: flip it atomically, guarded in the same statement,
    # so two simultaneous scans of the same ticket can never both win.
    used_at = datetime.now(UTC)
    statement = (
        update(Ticket)
        .where(Ticket.id == ticket.id, Ticket.status == TicketStatus.valid)
        .values(status=TicketStatus.used, used_at=used_at)
    )
    result = session.execute(statement)
    if result.rowcount == 0:
        # Lost the race: something else changed the ticket's status
        # between the read above and this UPDATE. Re-read rather than
        # assuming "already_used", a concurrent cancellation (ADR 0017)
        # lands here too and is not the same outcome.
        session.rollback()
        session.refresh(ticket)
        if ticket.status == TicketStatus.cancelled:
            return TicketValidationRead(outcome="invalid", event_title=event.title, seat=seat_read)
        return TicketValidationRead(
            outcome="already_used", event_title=event.title, seat=seat_read, used_at=ticket.used_at
        )
    session.commit()
    return TicketValidationRead(outcome="valid", event_title=event.title, seat=seat_read, used_at=used_at)


def _to_ticket_read(session: Session, ticket: Ticket) -> TicketRead:
    event = session.get(Event, ticket.event_id)
    seat = session.get(Seat, ticket.seat_id) if ticket.seat_id is not None else None
    payload = build_qr_payload(str(ticket.public_code))
    return TicketRead(
        id=ticket.id,
        reservation_id=ticket.reservation_id,
        status=ticket.status,
        seat_id=ticket.seat_id,
        public_code=ticket.public_code,
        qr_payload=payload,
        qr_image=build_qr_image(payload),
        used_at=ticket.used_at,
        created_at=ticket.created_at,
        event=EventRead.model_validate(event),
        seat=SeatRead.model_validate(seat) if seat else None,
    )
