from app.api.deps import get_ticketmaster_provider
from app.core.security import create_access_token
from app.main import app
from app.models import User, UserRole
from app.services.catalog.base import CatalogEvent

FAKE_EVENT = CatalogEvent(
    source="ticketmaster",
    external_id="abc123",
    title="Test Show",
    category="show",
)


class _FakeProvider:
    def search(self, keyword: str | None = None) -> list[CatalogEvent]:
        return [FAKE_EVENT]


def _token_for(session, role: UserRole) -> str:
    user = User(email=f"{role.value}@example.com", hashed_password="x", name="User", role=role)
    session.add(user)
    session.commit()
    session.refresh(user)
    return create_access_token(user_id=user.id, role=user.role.value)


def test_search_shows_requires_authentication(client):
    response = client.get("/catalog/shows")

    assert response.status_code == 401


def test_search_shows_rejects_a_customer(client, session):
    token = _token_for(session, UserRole.customer)

    response = client.get("/catalog/shows", headers={"Authorization": f"Bearer {token}"})

    assert response.status_code == 403


def test_search_shows_returns_normalized_events_for_an_organizer(client, session):
    token = _token_for(session, UserRole.organizer)
    app.dependency_overrides[get_ticketmaster_provider] = lambda: _FakeProvider()

    response = client.get("/catalog/shows?keyword=test", headers={"Authorization": f"Bearer {token}"})

    app.dependency_overrides.pop(get_ticketmaster_provider, None)
    assert response.status_code == 200
    body = response.json()
    assert len(body) == 1
    assert body[0]["external_id"] == "abc123"
    assert body[0]["source"] == "ticketmaster"
