from fastapi import APIRouter, Depends
from sqlmodel import Session

from app.api.deps import require_customer
from app.db import get_session
from app.models import User
from app.schemas import TicketRead
from app.services import ticket_service

router = APIRouter(prefix="/tickets", tags=["tickets"])


@router.get("/mine", response_model=list[TicketRead])
def list_my_tickets(
    session: Session = Depends(get_session),
    current_user: User = Depends(require_customer),
) -> list[TicketRead]:
    return ticket_service.list_my_tickets(session, current_user)
