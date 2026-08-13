from fastapi import APIRouter, Depends
from sqlmodel import Session

from app.api.deps import require_admin
from app.db import get_session
from app.models import User
from app.schemas import StaffAccountCreate, UserRead
from app.services import auth_service

router = APIRouter(prefix="/admin", tags=["admin"])


@router.post("/users", response_model=UserRead, status_code=201, dependencies=[Depends(require_admin)])
def create_staff_account(data: StaffAccountCreate, session: Session = Depends(get_session)) -> User:
    return auth_service.create_staff_account(session, data)


@router.get("/users", response_model=list[UserRead], dependencies=[Depends(require_admin)])
def list_staff_accounts(session: Session = Depends(get_session)) -> list[User]:
    return auth_service.list_staff_accounts(session)
