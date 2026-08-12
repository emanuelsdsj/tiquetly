import uuid
from datetime import datetime

from pydantic import BaseModel, EmailStr, Field, model_validator

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


class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str


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
        # Decided in ADR 0003: movies sell by seat, shows sell by quantity.
        # Enforced here so the two never drift out of sync silently.
        expected = ReservationMode.seatmap if self.category == EventCategory.movie else ReservationMode.general
        if self.reservation_mode != expected:
            raise ValueError(f"category {self.category.value} requires reservation_mode {expected.value}")
        return self


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
