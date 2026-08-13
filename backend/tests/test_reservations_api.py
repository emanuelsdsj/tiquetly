from app.core.security import create_access_token
from app.models import User, UserRole

SHOW_PAYLOAD = {
    "source": "ticketmaster",
    "external_id": "abc123",
    "title": "Legião Urbana - Turnê 40 Anos",
    "category": "show",
    "date": "2026-09-01T23:00:00Z",
    "venue": "Allianz Parque",
    "capacity": 2,
    "price": 180.0,
    "reservation_mode": "general",
}

MOVIE_PAYLOAD = {
    "source": "tmdb",
    "external_id": "42",
    "title": "A Odisseia",
    "category": "movie",
    "date": "2026-08-15T00:00:00Z",
    "venue": "Cinemark Raposo Shopping",
    "capacity": 4,
    "price": 32.0,
    "reservation_mode": "seatmap",
}


def _token_for(session, role: UserRole, email: str) -> str:
    user = User(email=email, hashed_password="x", name="User", role=role)
    session.add(user)
    session.commit()
    session.refresh(user)
    return create_access_token(user_id=user.id, role=user.role.value)


def _publish_event(client, session, payload):
    org_token = _token_for(session, UserRole.organizer, "org@example.com")
    response = client.post("/events", json=payload, headers={"Authorization": f"Bearer {org_token}"})
    return response.json()["id"]


def test_reserve_requires_authentication(client, session):
    event_id = _publish_event(client, session, SHOW_PAYLOAD)

    response = client.post(f"/events/{event_id}/reservations", json={"quantity": 1})

    assert response.status_code == 401


def test_reserve_rejects_an_organizer(client, session):
    event_id = _publish_event(client, session, SHOW_PAYLOAD)
    org_token = _token_for(session, UserRole.organizer, "org2@example.com")

    response = client.post(
        f"/events/{event_id}/reservations",
        json={"quantity": 1},
        headers={"Authorization": f"Bearer {org_token}"},
    )

    assert response.status_code == 403


def test_reserve_creates_a_pending_reservation_and_updates_capacity(client, session):
    event_id = _publish_event(client, session, SHOW_PAYLOAD)
    token = _token_for(session, UserRole.customer, "c@example.com")

    response = client.post(
        f"/events/{event_id}/reservations",
        json={"quantity": 2},
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 201
    body = response.json()
    assert body["status"] == "pending"
    assert body["quantity"] == 2

    event = client.get(f"/events/{event_id}").json()
    assert event["reserved_count"] == 2


def test_reserve_rejects_when_not_enough_capacity_left(client, session):
    event_id = _publish_event(client, session, SHOW_PAYLOAD)
    token = _token_for(session, UserRole.customer, "c@example.com")

    first = client.post(
        f"/events/{event_id}/reservations",
        json={"quantity": 2},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert first.status_code == 201

    second = client.post(
        f"/events/{event_id}/reservations",
        json={"quantity": 1},
        headers={"Authorization": f"Bearer {token}"},
    )

    assert second.status_code == 409


def test_reserve_rejects_a_seatmap_event(client, session):
    event_id = _publish_event(client, session, MOVIE_PAYLOAD)
    token = _token_for(session, UserRole.customer, "c@example.com")

    response = client.post(
        f"/events/{event_id}/reservations",
        json={"quantity": 1},
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 422


def test_reserve_rejects_a_nonexistent_event(client, session):
    token = _token_for(session, UserRole.customer, "c@example.com")

    response = client.post(
        "/events/9999/reservations",
        json={"quantity": 1},
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 404
    body = response.json()
    assert body["code"] == "EVENT_NOT_FOUND"
    assert body["params"] == {"event_id": "9999"}


def test_reserve_rejects_zero_quantity(client, session):
    event_id = _publish_event(client, session, SHOW_PAYLOAD)
    token = _token_for(session, UserRole.customer, "c@example.com")

    response = client.post(
        f"/events/{event_id}/reservations",
        json={"quantity": 0},
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 422
