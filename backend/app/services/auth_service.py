from sqlmodel import Session, select

from app.core.errors import EmailAlreadyRegisteredError, InvalidCredentialsError
from app.core.security import hash_password, verify_password
from app.models import User, UserRole
from app.schemas import UserCreate


def register_customer(session: Session, data: UserCreate) -> User:
    existing = session.exec(select(User).where(User.email == data.email)).first()
    if existing:
        raise EmailAlreadyRegisteredError(f"email {data.email} is already registered")

    user = User(
        email=data.email,
        hashed_password=hash_password(data.password),
        name=data.name,
        role=UserRole.customer,
    )
    session.add(user)
    session.commit()
    session.refresh(user)
    return user


def authenticate_user(session: Session, email: str, password: str) -> User:
    user = session.exec(select(User).where(User.email == email)).first()
    if not user or not verify_password(password, user.hashed_password):
        raise InvalidCredentialsError("invalid email or password")
    return user
