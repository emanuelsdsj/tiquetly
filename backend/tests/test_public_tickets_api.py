from app.core.security import create_access_token
from app.models import User, UserRole
from app.services.reservation_service import APPROVE_CARD_NUMBER

SHOW_PAYLOAD = {
    "source": "ticketmaster",
    "external_id": "abc123",
    "title": "Legião Urbana - Turnê 40 Anos",
    "category": "show",
    "date": "2026-09-01T23:00:00Z",
    "venue": "Allianz Parque",
    "capacity": 5,
    "price": 180.0,
    "reservation_mode": "general",
}

CARD_PAYLOAD = {
    "card_holder": "Maria Teste",
    "expiry": "12/30",
    "cvv": "123",
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


def _buy_a_ticket(client, session):
    event_id = _publish_event(client, session, SHOW_PAYLOAD)
    token = _token_for(session, UserRole.customer, "c@example.com")
    reservation = client.post(
        f"/events/{event_id}/reservations",
        json={"quantity": 1},
        headers={"Authorization": f"Bearer {token}"},
    ).json()
    client.post(
        f"/reservations/{reservation['id']}/pay",
        json={"card_number": APPROVE_CARD_NUMBER, **CARD_PAYLOAD},
        headers={"Authorization": f"Bearer {token}"},
    )
    return client.get("/tickets/mine", headers={"Authorization": f"Bearer {token}"}).json()[0]


def test_public_ticket_is_readable_without_authentication(client, session):
    ticket = _buy_a_ticket(client, session)

    response = client.get(f"/tickets/public/{ticket['public_code']}")

    assert response.status_code == 200
    body = response.json()
    assert body["id"] == ticket["id"]
    assert body["event"]["title"] == SHOW_PAYLOAD["title"]
    assert body["qr_image"].startswith("data:image/png;base64,")


def test_public_ticket_rejects_an_unknown_code(client):
    response = client.get("/tickets/public/00000000-0000-0000-0000-000000000000")

    assert response.status_code == 404


def test_public_ticket_rejects_a_malformed_code(client):
    response = client.get("/tickets/public/not-a-uuid")

    assert response.status_code == 422
