import uuid

from fastapi import APIRouter, Depends
from sqlmodel import Session

from app.api.deps import require_customer, require_gatekeeper
from app.db import get_session
from app.models import User
from app.schemas import TicketRead, TicketValidationCreate, TicketValidationRead
from app.services import ticket_service

router = APIRouter(prefix="/tickets", tags=["tickets"])


@router.get("/mine", response_model=list[TicketRead])
def list_my_tickets(
    session: Session = Depends(get_session),
    current_user: User = Depends(require_customer),
) -> list[TicketRead]:
    return ticket_service.list_my_tickets(session, current_user)


@router.get("/public/{public_code}", response_model=TicketRead)
def get_public_ticket(public_code: uuid.UUID, session: Session = Depends(get_session)) -> TicketRead:
    return ticket_service.get_public_ticket(session, public_code)


@router.post("/validate", response_model=TicketValidationRead)
def validate_ticket(
    data: TicketValidationCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(require_gatekeeper),
) -> TicketValidationRead:
    return ticket_service.validate_ticket(session, data.event_id, data.code)
