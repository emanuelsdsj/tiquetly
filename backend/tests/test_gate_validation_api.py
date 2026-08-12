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

OTHER_SHOW_PAYLOAD = {**SHOW_PAYLOAD, "external_id": "xyz789", "title": "Outro Show"}

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


def _publish_event(client, session, payload, org_email="org@example.com"):
    org_token = _token_for(session, UserRole.organizer, org_email)
    response = client.post("/events", json=payload, headers={"Authorization": f"Bearer {org_token}"})
    return response.json()["id"]


def _buy_a_ticket(client, session, event_id, customer_email="c@example.com"):
    token = _token_for(session, UserRole.customer, customer_email)
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


def _validate(client, token, event_id, code):
    return client.post(
        "/tickets/validate",
        json={"event_id": event_id, "code": code},
        headers={"Authorization": f"Bearer {token}"},
    )


def test_validate_requires_authentication(client, session):
    event_id = _publish_event(client, session, SHOW_PAYLOAD)

    response = client.post("/tickets/validate", json={"event_id": event_id, "code": "whatever"})

    assert response.status_code == 401


def test_validate_rejects_a_customer(client, session):
    event_id = _publish_event(client, session, SHOW_PAYLOAD)
    token = _token_for(session, UserRole.customer, "c@example.com")

    response = _validate(client, token, event_id, "whatever")

    assert response.status_code == 403


def test_validate_rejects_a_nonexistent_event(client, session):
    gate_token = _token_for(session, UserRole.gatekeeper, "gate@example.com")

    response = _validate(client, gate_token, 9999, "whatever")

    assert response.status_code == 404


def test_validate_marks_a_valid_ticket_as_used_via_the_signed_payload(client, session):
    event_id = _publish_event(client, session, SHOW_PAYLOAD)
    ticket = _buy_a_ticket(client, session, event_id)
    gate_token = _token_for(session, UserRole.gatekeeper, "gate@example.com")

    response = _validate(client, gate_token, event_id, ticket["qr_payload"])

    assert response.status_code == 200
    assert response.json()["outcome"] == "valid"


def test_validate_marks_a_valid_ticket_as_used_via_the_bare_public_code(client, session):
    event_id = _publish_event(client, session, SHOW_PAYLOAD)
    ticket = _buy_a_ticket(client, session, event_id)
    gate_token = _token_for(session, UserRole.gatekeeper, "gate@example.com")

    response = _validate(client, gate_token, event_id, ticket["public_code"])

    assert response.status_code == 200
    assert response.json()["outcome"] == "valid"


def test_validate_rejects_scanning_the_same_ticket_twice(client, session):
    event_id = _publish_event(client, session, SHOW_PAYLOAD)
    ticket = _buy_a_ticket(client, session, event_id)
    gate_token = _token_for(session, UserRole.gatekeeper, "gate@example.com")
    _validate(client, gate_token, event_id, ticket["qr_payload"])

    response = _validate(client, gate_token, event_id, ticket["qr_payload"])

    assert response.status_code == 200
    assert response.json()["outcome"] == "already_used"


def test_validate_rejects_a_tampered_qr_payload(client, session):
    event_id = _publish_event(client, session, SHOW_PAYLOAD)
    ticket = _buy_a_ticket(client, session, event_id)
    gate_token = _token_for(session, UserRole.gatekeeper, "gate@example.com")
    tampered = ticket["qr_payload"][:-1] + ("a" if ticket["qr_payload"][-1] != "a" else "b")

    response = _validate(client, gate_token, event_id, tampered)

    assert response.status_code == 200
    assert response.json()["outcome"] == "invalid"


def test_validate_rejects_an_unknown_code(client, session):
    event_id = _publish_event(client, session, SHOW_PAYLOAD)
    gate_token = _token_for(session, UserRole.gatekeeper, "gate@example.com")

    response = _validate(client, gate_token, event_id, "00000000-0000-0000-0000-000000000000")

    assert response.status_code == 200
    assert response.json()["outcome"] == "invalid"


def test_validate_flags_a_ticket_scanned_for_the_wrong_event(client, session):
    event_id = _publish_event(client, session, SHOW_PAYLOAD, "org1@example.com")
    other_event_id = _publish_event(client, session, OTHER_SHOW_PAYLOAD, "org2@example.com")
    ticket = _buy_a_ticket(client, session, event_id)
    gate_token = _token_for(session, UserRole.gatekeeper, "gate@example.com")

    response = _validate(client, gate_token, other_event_id, ticket["qr_payload"])

    assert response.status_code == 200
    body = response.json()
    assert body["outcome"] == "wrong_event"
    assert body["event_title"] == SHOW_PAYLOAD["title"]
