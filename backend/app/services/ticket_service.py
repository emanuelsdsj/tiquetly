import uuid

from sqlmodel import Session, select, update

from app.core.errors import TicketNotFoundError
from app.core.qr import build_qr_image
from app.core.security import build_qr_payload
from app.models import Event, Reservation, ReservationSeat, Seat, SeatStatus, Ticket, User
from app.schemas import EventRead, SeatRead, TicketRead


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
        raise TicketNotFoundError(f"ticket {public_code} not found")
    return _to_ticket_read(session, ticket)


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
