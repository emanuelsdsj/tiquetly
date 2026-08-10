import uuid
from datetime import UTC, datetime
from enum import Enum

from sqlmodel import Field, SQLModel


def _utcnow() -> datetime:
    return datetime.now(UTC)


class UserRole(str, Enum):
    organizer = "organizer"
    customer = "customer"
    gatekeeper = "gatekeeper"


class EventSource(str, Enum):
    ticketmaster = "ticketmaster"
    tmdb = "tmdb"


class EventCategory(str, Enum):
    show = "show"
    movie = "movie"


class ReservationMode(str, Enum):
    seatmap = "seatmap"
    general = "general"


class EventStatus(str, Enum):
    draft = "draft"
    published = "published"
    cancelled = "cancelled"


class SeatStatus(str, Enum):
    available = "available"
    reserved = "reserved"
    sold = "sold"


class ReservationStatus(str, Enum):
    pending = "pending"
    paid = "paid"
    failed = "failed"
    cancelled = "cancelled"


class TicketStatus(str, Enum):
    valid = "valid"
    used = "used"
    cancelled = "cancelled"


class User(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    email: str = Field(unique=True, index=True)
    hashed_password: str
    name: str
    role: UserRole
    created_at: datetime = Field(default_factory=_utcnow)


class Event(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    organizer_id: int = Field(foreign_key="user.id")
    source: EventSource
    external_id: str
    title: str
    image: str | None = None
    description: str | None = None
    category: EventCategory
    date: datetime
    venue: str
    capacity: int
    price: float
    reservation_mode: ReservationMode
    status: EventStatus = EventStatus.draft
    # Counter used for the atomic capacity check on general (non-seatmap)
    # reservations: an UPDATE guarded by `reserved_count + n <= capacity`
    # in the same statement, so two concurrent reservations can never both
    # succeed past the limit.
    reserved_count: int = 0
    created_at: datetime = Field(default_factory=_utcnow)


class Seat(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    event_id: int = Field(foreign_key="event.id")
    row: str
    col: str
    status: SeatStatus = SeatStatus.available


class Reservation(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    event_id: int = Field(foreign_key="event.id")
    customer_id: int = Field(foreign_key="user.id")
    # Set when reservation_mode = general, null when reservation_mode =
    # seatmap (seats are listed in ReservationSeat instead).
    quantity: int | None = None
    status: ReservationStatus = ReservationStatus.pending
    created_at: datetime = Field(default_factory=_utcnow)


class ReservationSeat(SQLModel, table=True):
    """Join table: which seats belong to a seatmap reservation."""

    id: int | None = Field(default=None, primary_key=True)
    reservation_id: int = Field(foreign_key="reservation.id")
    seat_id: int = Field(foreign_key="seat.id")


class Ticket(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    reservation_id: int = Field(foreign_key="reservation.id")
    event_id: int = Field(foreign_key="event.id")
    customer_id: int = Field(foreign_key="user.id")
    seat_id: int | None = Field(default=None, foreign_key="seat.id")
    # Random, unguessable identifier used in the QR payload and the
    # public share link. Never the same as the numeric id, which is
    # sequential and would make ticket enumeration trivial.
    public_code: uuid.UUID = Field(default_factory=uuid.uuid4, unique=True, index=True)
    status: TicketStatus = TicketStatus.valid
    used_at: datetime | None = None
    created_at: datetime = Field(default_factory=_utcnow)
