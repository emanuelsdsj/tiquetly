from app.core.security import create_access_token
from app.models import User, UserRole

SHOW_PAYLOAD = {
    "source": "ticketmaster",
    "external_id": "abc123",
    "title": "Test Show",
    "category": "show",
    "date": "2026-09-01T23:00:00Z",
    "venue": "Test Venue",
    "capacity": 3,
    "price": 100.0,
    "reservation_mode": "general",
}


def _token_for(session, role: UserRole, email: str = "user@example.com") -> str:
    user = User(email=email, hashed_password="x", name="User", role=role)
    session.add(user)
    session.commit()
    session.refresh(user)
    return create_access_token(user_id=user.id, role=user.role.value)


def _publish_event(client, token):
    return client.post("/events", json=SHOW_PAYLOAD, headers={"Authorization": f"Bearer {token}"}).json()


def test_update_event_requires_authentication(client, session):
    token = _token_for(session, UserRole.organizer)
    event = _publish_event(client, token)

    response = client.patch(f"/events/{event['id']}", json={"title": "New title"})

    assert response.status_code == 401


def test_update_event_rejects_a_customer(client, session):
    org_token = _token_for(session, UserRole.organizer, "org@example.com")
    event = _publish_event(client, org_token)
    customer_token = _token_for(session, UserRole.customer, "c@example.com")

    response = client.patch(
        f"/events/{event['id']}",
        json={"title": "New title"},
        headers={"Authorization": f"Bearer {customer_token}"},
    )

    assert response.status_code == 403


def test_update_event_rejects_another_organizers_event(client, session):
    token_a = _token_for(session, UserRole.organizer, "a@example.com")
    token_b = _token_for(session, UserRole.organizer, "b@example.com")
    event = _publish_event(client, token_a)

    response = client.patch(
        f"/events/{event['id']}",
        json={"title": "Hijacked"},
        headers={"Authorization": f"Bearer {token_b}"},
    )

    assert response.status_code == 403


def test_update_event_rejects_a_nonexistent_event(client, session):
    token = _token_for(session, UserRole.organizer)

    response = client.patch("/events/9999", json={"title": "New title"}, headers={"Authorization": f"Bearer {token}"})

    assert response.status_code == 404


def test_update_event_changes_only_the_given_fields(client, session):
    token = _token_for(session, UserRole.organizer)
    event = _publish_event(client, token)

    response = client.patch(
        f"/events/{event['id']}",
        json={"title": "Updated title", "price": 150.0},
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["title"] == "Updated title"
    assert body["price"] == 150.0
    assert body["venue"] == SHOW_PAYLOAD["venue"]
    assert body["capacity"] == SHOW_PAYLOAD["capacity"]


def test_update_event_cannot_change_capacity_or_category(client, session):
    token = _token_for(session, UserRole.organizer)
    event = _publish_event(client, token)

    response = client.patch(
        f"/events/{event['id']}",
        json={"capacity": 999, "category": "movie"},
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["capacity"] == SHOW_PAYLOAD["capacity"]
    assert body["category"] == SHOW_PAYLOAD["category"]


def test_unpublish_event_requires_authentication(client, session):
    token = _token_for(session, UserRole.organizer)
    event = _publish_event(client, token)

    response = client.post(f"/events/{event['id']}/unpublish")

    assert response.status_code == 401


def test_unpublish_event_rejects_another_organizers_event(client, session):
    token_a = _token_for(session, UserRole.organizer, "a@example.com")
    token_b = _token_for(session, UserRole.organizer, "b@example.com")
    event = _publish_event(client, token_a)

    response = client.post(f"/events/{event['id']}/unpublish", headers={"Authorization": f"Bearer {token_b}"})

    assert response.status_code == 403


def test_unpublish_event_removes_it_from_public_search(client, session):
    token = _token_for(session, UserRole.organizer)
    event = _publish_event(client, token)

    response = client.post(f"/events/{event['id']}/unpublish", headers={"Authorization": f"Bearer {token}"})

    assert response.status_code == 200
    assert response.json()["status"] == "cancelled"
    assert client.get(f"/events/{event['id']}").status_code == 404
    assert client.get("/events").json() == []


def test_unpublish_event_rejects_unpublishing_twice(client, session):
    token = _token_for(session, UserRole.organizer)
    event = _publish_event(client, token)
    client.post(f"/events/{event['id']}/unpublish", headers={"Authorization": f"Bearer {token}"})

    response = client.post(f"/events/{event['id']}/unpublish", headers={"Authorization": f"Bearer {token}"})

    assert response.status_code == 409


def test_list_my_events_includes_cancelled_events(client, session):
    token = _token_for(session, UserRole.organizer)
    event = _publish_event(client, token)
    client.post(f"/events/{event['id']}/unpublish", headers={"Authorization": f"Bearer {token}"})

    response = client.get("/events/mine", headers={"Authorization": f"Bearer {token}"})

    assert response.status_code == 200
    body = response.json()
    assert len(body) == 1
    assert body[0]["status"] == "cancelled"
