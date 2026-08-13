import uuid
from datetime import UTC, datetime
from typing import Literal

from pydantic import BaseModel, EmailStr, Field, field_validator, model_validator

from app.models import (
    EventCategory,
    EventSource,
    EventStatus,
    ReservationMode,
    ReservationStatus,
    SeatStatus,
    TicketStatus,
    UserRole,
)


def _as_utc(value: datetime | None) -> datetime | None:
    # SQLite strips tzinfo on round-trip: every datetime this app writes is
    # already UTC (`_utcnow()` in models.py, or the frontend's own
    # `.toISOString()` before submitting an event date), but reading it
    # back gives a naive value. Pydantic then serializes a naive datetime
    # without a "Z"/offset, and `new Date(...)` on the frontend reads an
    # offset-less ISO string as the browser's *local* time, not UTC. That
    # silently shifted every timestamp doing real arithmetic (the
    # reservation countdown) by the browser's UTC offset, while pure
    # display code happened to look right regardless of timezone, since
    # formatting the same wrongly-localized value back in the same local
    # zone reproduces the original wall-clock digits, one error cancelling
    # the read of the other. Reattaching UTC here, at the API boundary,
    # fixes both instead of relying on that cancellation.
    if value is not None and value.tzinfo is None:
        return value.replace(tzinfo=UTC)
    return value


class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str


class StaffAccountCreate(BaseModel):
    # Admin-only account creation (ADR 0003 addendum's sibling decision,
    # see ADR 0023): deliberately narrower than UserCreate's role-implicit
    # "always customer" shape. Only organizer and gatekeeper are offered;
    # minting another admin from this screen was ruled out, see the ADR.
    email: EmailStr
    password: str
    name: str
    role: Literal[UserRole.organizer, UserRole.gatekeeper]


class UserRead(BaseModel):
    id: int
    email: str
    name: str
    role: UserRole

    model_config = {"from_attributes": True}


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class EventCreate(BaseModel):
    source: EventSource
    external_id: str
    title: str
    image: str | None = None
    description: str | None = None
    category: EventCategory
    date: datetime
    venue: str
    capacity: int = Field(gt=0)
    price: float = Field(ge=0)
    reservation_mode: ReservationMode

    @model_validator(mode="after")
    def _reservation_mode_matches_category(self) -> "EventCreate":
        # Decided in ADR 0003, relaxed in its addendum: movies always sell
        # by seat. Shows sold by quantity by default, but the frontend
        # switches to seatmap on its own when the picked Ticketmaster
        # result reports assigned seating (CatalogEvent.has_seatmap), so
        # only the movie side of the original rule is still enforced here.
        if self.category == EventCategory.movie and self.reservation_mode != ReservationMode.seatmap:
            raise ValueError(
                f"category {self.category.value} requires reservation_mode {ReservationMode.seatmap.value}"
            )
        return self


class EventUpdate(BaseModel):
    # Descriptive/commercial fields only (ADR 0016): capacity, category,
    # reservation_mode, source and external_id stay fixed after creation.
    title: str | None = None
    image: str | None = None
    description: str | None = None
    date: datetime | None = None
    venue: str | None = None
    price: float | None = Field(default=None, ge=0)


class EventRead(BaseModel):
    id: int
    organizer_id: int
    source: EventSource
    external_id: str
    title: str
    image: str | None
    description: str | None
    category: EventCategory
    date: datetime
    venue: str
    capacity: int
    reserved_count: int
    price: float
    reservation_mode: ReservationMode
    status: EventStatus
    created_at: datetime

    model_config = {"from_attributes": True}

    _normalize_dates = field_validator("date", "created_at", mode="after")(_as_utc)


class GeneralReservationCreate(BaseModel):
    quantity: int = Field(gt=0)


class ReservationRead(BaseModel):
    id: int
    event_id: int
    customer_id: int
    quantity: int | None
    status: ReservationStatus
    created_at: datetime

    model_config = {"from_attributes": True}

    _normalize_dates = field_validator("created_at", mode="after")(_as_utc)


class SeatRead(BaseModel):
    id: int
    row: str
    col: str
    status: SeatStatus

    model_config = {"from_attributes": True}


class SeatReservationCreate(BaseModel):
    seat_ids: list[int] = Field(min_length=1)


class PaymentCreate(BaseModel):
    # Simulation only: fields exist for form fidelity, but only card_number
    # decides the outcome (ADR 0010). No Luhn check, no expiry validation.
    card_number: str = Field(min_length=1)
    card_holder: str = Field(min_length=1)
    expiry: str = Field(min_length=1)
    cvv: str = Field(min_length=1)


class TicketRead(BaseModel):
    # Assembled by ticket_service, not converted straight from the Ticket
    # table (unlike EventRead/ReservationRead): a ticket display needs its
    # event and seat joined in, plus a QR payload/image that only exist as
    # derived values, none of which the Ticket row itself carries.
    id: int
    reservation_id: int
    status: TicketStatus
    seat_id: int | None
    public_code: uuid.UUID
    qr_payload: str
    qr_image: str
    used_at: datetime | None
    created_at: datetime
    event: EventRead
    seat: SeatRead | None = None

    _normalize_dates = field_validator("used_at", "created_at", mode="after")(_as_utc)


class TicketValidationCreate(BaseModel):
    event_id: int
    # Either a full signed QR payload ("public_code.signature") from the
    # camera, or a bare public_code typed in by hand (ADR 0014).
    code: str = Field(min_length=1)


TicketValidationOutcome = Literal["valid", "invalid", "already_used", "wrong_event"]


class TicketValidationRead(BaseModel):
    outcome: TicketValidationOutcome
    event_title: str | None = None
    seat: SeatRead | None = None
    used_at: datetime | None = None

    _normalize_dates = field_validator("used_at", mode="after")(_as_utc)
