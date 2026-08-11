from datetime import datetime

from pydantic import BaseModel, EmailStr, Field, model_validator

from app.models import EventCategory, EventSource, EventStatus, ReservationMode, UserRole


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
    price: float
    reservation_mode: ReservationMode
    status: EventStatus
    created_at: datetime

    model_config = {"from_attributes": True}
