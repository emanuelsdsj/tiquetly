from app.api.deps import get_ticketmaster_provider, get_tmdb_provider
from app.core.security import create_access_token
from app.main import app
from app.models import User, UserRole
from app.services.catalog.base import CatalogEvent

FAKE_SHOW = CatalogEvent(source="ticketmaster", external_id="abc123", title="Test Show", category="show")
FAKE_MOVIE = CatalogEvent(source="tmdb", external_id="42", title="Test Movie", category="movie")


class _FakeProvider:
    def __init__(self, events: list[CatalogEvent]):
        self._events = events

    def search(self, keyword: str | None = None) -> list[CatalogEvent]:
        return self._events


def _token_for(session, role: UserRole) -> str:
    user = User(email=f"{role.value}@example.com", hashed_password="x", name="User", role=role)
    session.add(user)
    session.commit()
    session.refresh(user)
    return create_access_token(user_id=user.id, role=user.role.value)


def test_search_catalog_requires_authentication(client):
    response = client.get("/catalog/search?category=show")

    assert response.status_code == 401


def test_search_catalog_rejects_a_customer(client, session):
    token = _token_for(session, UserRole.customer)

    response = client.get("/catalog/search?category=show", headers={"Authorization": f"Bearer {token}"})

    assert response.status_code == 403


def test_search_catalog_uses_ticketmaster_for_shows(client, session):
    token = _token_for(session, UserRole.organizer)
    app.dependency_overrides[get_ticketmaster_provider] = lambda: _FakeProvider([FAKE_SHOW])
    app.dependency_overrides[get_tmdb_provider] = lambda: _FakeProvider([FAKE_MOVIE])

    response = client.get("/catalog/search?category=show&keyword=test", headers={"Authorization": f"Bearer {token}"})

    app.dependency_overrides.pop(get_ticketmaster_provider, None)
    app.dependency_overrides.pop(get_tmdb_provider, None)
    assert response.status_code == 200
    body = response.json()
    assert len(body) == 1
    assert body[0]["source"] == "ticketmaster"


def test_search_catalog_uses_tmdb_for_movies(client, session):
    token = _token_for(session, UserRole.organizer)
    app.dependency_overrides[get_ticketmaster_provider] = lambda: _FakeProvider([FAKE_SHOW])
    app.dependency_overrides[get_tmdb_provider] = lambda: _FakeProvider([FAKE_MOVIE])

    response = client.get("/catalog/search?category=movie", headers={"Authorization": f"Bearer {token}"})

    app.dependency_overrides.pop(get_ticketmaster_provider, None)
    app.dependency_overrides.pop(get_tmdb_provider, None)
    assert response.status_code == 200
    body = response.json()
    assert len(body) == 1
    assert body[0]["source"] == "tmdb"
