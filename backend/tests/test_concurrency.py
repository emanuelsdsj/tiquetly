"""Step 18's concurrency pass: the existing tests for the atomic guards
(ADR 0008, 0009, 0014) simulate a race by issuing requests one after the
other against a single shared Session, which proves the guarded UPDATE's
logic but not that it survives two connections actually writing at the
same time. These tests use a real file-backed SQLite database and two
threads with independent Sessions of their own, synchronized with a
Barrier so both reach the guarded UPDATE as close to simultaneously as
the test can arrange, the same shape of race a production deployment
would face under concurrent requests.
"""

import threading
from datetime import UTC, datetime

from sqlmodel import Session, SQLModel, create_engine, select

from app.core.errors import ReservationNotCancellableError, SoldOutError
from app.models import (
    Event,
    EventCategory,
    EventSource,
    EventStatus,
    Reservation,
    ReservationMode,
    ReservationStatus,
    Seat,
    SeatStatus,
    Ticket,
    TicketStatus,
    User,
    UserRole,
)
from app.services import reservation_service, ticket_service


def _race_engine(tmp_path):
    db_path = tmp_path / "race.db"
    engine = create_engine(f"sqlite:///{db_path}", connect_args={"check_same_thread": False})
    SQLModel.metadata.create_all(engine)
    return engine


def _run_concurrently(*targets):
    barrier = threading.Barrier(len(targets))
    results = [None] * len(targets)

    def wrap(index, fn):
        barrier.wait()
        results[index] = fn()

    threads = [threading.Thread(target=wrap, args=(i, fn)) for i, fn in enumerate(targets)]
    for t in threads:
        t.start()
    for t in threads:
        t.join()
    return results


def test_general_reservation_never_oversells_under_concurrent_requests(tmp_path):
    engine = _race_engine(tmp_path)
    with Session(engine) as setup:
        customer = User(email="c@race.com", hashed_password="x", name="C", role=UserRole.customer)
        setup.add(customer)
        setup.commit()
        setup.refresh(customer)
        event = Event(
            organizer_id=1,
            source=EventSource.ticketmaster,
            external_id="race-general",
            title="Race Show",
            category=EventCategory.show,
            date=datetime.now(UTC),
            venue="Race Venue",
            capacity=1,
            price=10.0,
            reservation_mode=ReservationMode.general,
            status=EventStatus.published,
        )
        setup.add(event)
        setup.commit()
        setup.refresh(event)
        event_id, customer_id = event.id, customer.id

    def attempt():
        with Session(engine) as session:
            customer_obj = session.get(User, customer_id)
            try:
                reservation_service.create_general_reservation(session, customer_obj, event_id, 1)
                return "success"
            except SoldOutError:
                return "sold_out"

    results = _run_concurrently(attempt, attempt)

    assert sorted(results) == ["sold_out", "success"]
    with Session(engine) as session:
        final_event = session.get(Event, event_id)
        assert final_event.reserved_count == 1


def test_seatmap_reservation_never_double_books_a_seat_under_concurrent_requests(tmp_path):
    engine = _race_engine(tmp_path)
    with Session(engine) as setup:
        customer = User(email="c@race.com", hashed_password="x", name="C", role=UserRole.customer)
        setup.add(customer)
        setup.commit()
        setup.refresh(customer)
        event = Event(
            organizer_id=1,
            source=EventSource.tmdb,
            external_id="race-seatmap",
            title="Race Movie",
            category=EventCategory.movie,
            date=datetime.now(UTC),
            venue="Race Cinema",
            capacity=1,
            price=10.0,
            reservation_mode=ReservationMode.seatmap,
            status=EventStatus.published,
        )
        setup.add(event)
        setup.commit()
        setup.refresh(event)
        seat = Seat(event_id=event.id, row="A", col="1", status=SeatStatus.available)
        setup.add(seat)
        setup.commit()
        setup.refresh(seat)
        event_id, seat_id, customer_id = event.id, seat.id, customer.id

    def attempt():
        with Session(engine) as session:
            customer_obj = session.get(User, customer_id)
            try:
                reservation_service.create_seatmap_reservation(session, customer_obj, event_id, [seat_id])
                return "success"
            except SoldOutError:
                return "sold_out"

    results = _run_concurrently(attempt, attempt)

    assert sorted(results) == ["sold_out", "success"]
    with Session(engine) as session:
        final_seat = session.get(Seat, seat_id)
        assert final_seat.status == SeatStatus.reserved


def test_gate_never_validates_the_same_ticket_twice_under_concurrent_scans(tmp_path):
    engine = _race_engine(tmp_path)
    with Session(engine) as setup:
        customer = User(email="c@race.com", hashed_password="x", name="C", role=UserRole.customer)
        setup.add(customer)
        setup.commit()
        setup.refresh(customer)
        event = Event(
            organizer_id=1,
            source=EventSource.ticketmaster,
            external_id="race-gate",
            title="Race Show",
            category=EventCategory.show,
            date=datetime.now(UTC),
            venue="Race Venue",
            capacity=5,
            price=10.0,
            reservation_mode=ReservationMode.general,
            status=EventStatus.published,
        )
        setup.add(event)
        setup.commit()
        setup.refresh(event)
        ticket = Ticket(reservation_id=1, event_id=event.id, customer_id=customer.id, status=TicketStatus.valid)
        setup.add(ticket)
        setup.commit()
        setup.refresh(ticket)
        event_id, public_code = event.id, str(ticket.public_code)

    def attempt():
        with Session(engine) as session:
            result = ticket_service.validate_ticket(session, event_id, public_code)
            return result.outcome

    results = _run_concurrently(attempt, attempt)

    assert sorted(results) == ["already_used", "valid"]
    with Session(engine) as session:
        final_ticket = session.exec(select(Ticket).where(Ticket.event_id == event_id)).first()
        assert final_ticket.status == TicketStatus.used
        assert final_ticket.used_at is not None


def test_cancelling_and_scanning_the_same_ticket_never_both_win(tmp_path):
    """ADR 0017's guard, raced against ADR 0014's: a customer cancelling a
    paid reservation and a gatekeeper scanning its ticket at the same
    instant must never both succeed, whichever wins has to leave the
    ticket and its reservation in a matching state, never a ticket
    that is `used` under a `cancelled` reservation or vice versa.
    """
    engine = _race_engine(tmp_path)
    with Session(engine) as setup:
        customer = User(email="c@race.com", hashed_password="x", name="C", role=UserRole.customer)
        setup.add(customer)
        setup.commit()
        setup.refresh(customer)
        event = Event(
            organizer_id=1,
            source=EventSource.ticketmaster,
            external_id="race-cancel-vs-scan",
            title="Race Show",
            category=EventCategory.show,
            date=datetime.now(UTC),
            venue="Race Venue",
            capacity=1,
            price=10.0,
            reservation_mode=ReservationMode.general,
            status=EventStatus.published,
            reserved_count=1,
        )
        setup.add(event)
        setup.commit()
        setup.refresh(event)
        reservation = Reservation(event_id=event.id, customer_id=customer.id, quantity=1, status=ReservationStatus.paid)
        setup.add(reservation)
        setup.commit()
        setup.refresh(reservation)
        ticket = Ticket(
            reservation_id=reservation.id, event_id=event.id, customer_id=customer.id, status=TicketStatus.valid
        )
        setup.add(ticket)
        setup.commit()
        setup.refresh(ticket)
        event_id = event.id
        reservation_id = reservation.id
        customer_id = customer.id
        ticket_id = ticket.id
        public_code = str(ticket.public_code)

    def attempt_cancel():
        with Session(engine) as session:
            customer_obj = session.get(User, customer_id)
            try:
                reservation_service.cancel_reservation(session, customer_obj, reservation_id)
                return "cancelled"
            except ReservationNotCancellableError:
                return "cancel_rejected"

    def attempt_validate():
        with Session(engine) as session:
            return ticket_service.validate_ticket(session, event_id, public_code).outcome

    results = _run_concurrently(attempt_cancel, attempt_validate)

    assert results in (["cancelled", "invalid"], ["cancel_rejected", "valid"])
    with Session(engine) as session:
        final_ticket = session.get(Ticket, ticket_id)
        final_reservation = session.get(Reservation, reservation_id)
        if final_ticket.status == TicketStatus.cancelled:
            assert final_reservation.status == ReservationStatus.cancelled
        else:
            assert final_ticket.status == TicketStatus.used
            assert final_reservation.status == ReservationStatus.paid
