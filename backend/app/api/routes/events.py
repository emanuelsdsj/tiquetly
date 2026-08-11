from fastapi import APIRouter, Depends
from sqlmodel import Session

from app.api.deps import require_organizer
from app.db import get_session
from app.models import Event, User
from app.schemas import EventCreate, EventRead
from app.services import event_service

router = APIRouter(prefix="/events", tags=["events"])


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
