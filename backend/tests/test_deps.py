import pytest

from app.api.deps import require_role
from app.core.errors import ForbiddenError
from app.models import User, UserRole


def _user(role: UserRole) -> User:
    return User(id=1, email="a@example.com", hashed_password="x", name="A", role=role)


def test_require_role_allows_the_matching_role():
    dependency = require_role(UserRole.organizer)

    result = dependency(current_user=_user(UserRole.organizer))

    assert result.role == UserRole.organizer


def test_require_role_blocks_other_roles():
    dependency = require_role(UserRole.organizer)

    with pytest.raises(ForbiddenError):
        dependency(current_user=_user(UserRole.customer))
