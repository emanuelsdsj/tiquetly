from fastapi import APIRouter, Depends
from sqlmodel import Session

from app.api.deps import require_customer
from app.db import get_session
from app.models import Reservation, User
from app.schemas import PaymentCreate, ReservationRead
from app.services import reservation_service

router = APIRouter(prefix="/reservations", tags=["reservations"])


@router.post("/{reservation_id}/pay", response_model=ReservationRead)
def pay_reservation(
    reservation_id: int,
    data: PaymentCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(require_customer),
) -> Reservation:
    return reservation_service.pay_reservation(session, current_user, reservation_id, data.card_number)


@router.post("/{reservation_id}/cancel", response_model=ReservationRead)
def cancel_reservation(
    reservation_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(require_customer),
) -> Reservation:
    return reservation_service.cancel_reservation(session, current_user, reservation_id)
