from fastapi import Depends
from fastapi.security import OAuth2PasswordBearer
from sqlmodel import Session

from app.core.errors import ForbiddenError, InvalidCredentialsError
from app.core.security import decode_access_token
from app.db import get_session
from app.models import User, UserRole
from app.services.catalog.ticketmaster import TicketmasterProvider
from app.services.catalog.tmdb import TmdbProvider

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


def get_current_user(
    token: str = Depends(oauth2_scheme),
    session: Session = Depends(get_session),
) -> User:
    payload = decode_access_token(token)
    user = session.get(User, int(payload["sub"]))
    if user is None:
        raise InvalidCredentialsError("user no longer exists")
    return user


def require_role(*roles: UserRole):
    def dependency(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in roles:
            raise ForbiddenError("not allowed for this role")
        return current_user

    return dependency


require_organizer = require_role(UserRole.organizer)
require_customer = require_role(UserRole.customer)
require_gatekeeper = require_role(UserRole.gatekeeper)


def get_ticketmaster_provider() -> TicketmasterProvider:
    return TicketmasterProvider()


def get_tmdb_provider() -> TmdbProvider:
    return TmdbProvider()
