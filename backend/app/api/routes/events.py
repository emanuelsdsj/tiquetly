from datetime import datetime

from fastapi import APIRouter, Depends
from sqlmodel import Session

from app.api.deps import require_customer, require_organizer
from app.core.errors import EventNotFoundError
from app.db import get_session
from app.models import Event, EventCategory, EventStatus, Reservation, User
from app.schemas import EventCreate, EventRead, GeneralReservationCreate, ReservationRead
from app.services import event_service, reservation_service

router = APIRouter(prefix="/events", tags=["events"])


@router.get("", response_model=list[EventRead])
def search_events(
    q: str | None = None,
    category: EventCategory | None = None,
    date_from: datetime | None = None,
    date_to: datetime | None = None,
    price_min: float | None = None,
    price_max: float | None = None,
    session: Session = Depends(get_session),
) -> list[Event]:
    return event_service.search_published_events(
        session,
        q=q,
        category=category,
        date_from=date_from,
        date_to=date_to,
        price_min=price_min,
        price_max=price_max,
    )


@router.post("", response_model=EventRead, status_code=201)
def create_event(
    data: EventCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(require_organizer),
) -> Event:
    return event_service.create_event(session, current_user, data)


@router.get("/mine", response_model=list[EventRead])
def list_my_events(
    session: Session = Depends(get_session),
    current_user: User = Depends(require_organizer),
) -> list[Event]:
    return event_service.list_events_for_organizer(session, current_user)


@router.get("/{event_id}", response_model=EventRead)
def get_event(event_id: int, session: Session = Depends(get_session)) -> Event:
    event = session.get(Event, event_id)
    if event is None or event.status != EventStatus.published:
        raise EventNotFoundError(f"event {event_id} not found")
    return event


@router.post("/{event_id}/reservations", response_model=ReservationRead, status_code=201)
def create_general_reservation(
    event_id: int,
    data: GeneralReservationCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(require_customer),
) -> Reservation:
    return reservation_service.create_general_reservation(session, current_user, event_id, data.quantity)
