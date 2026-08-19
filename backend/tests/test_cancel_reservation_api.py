from datetime import UTC, datetime, timedelta

from app.core.security import create_access_token
from app.models import User, UserRole
from app.services.reservation_service import APPROVE_CARD_NUMBER, DECLINE_CARD_NUMBER


def _future_iso(days: int) -> str:
    # Fixed future dates go stale the moment "today" catches up to them;
    # anchoring to now keeps event fixtures future forever (see the same
    # fix and rationale in test_events_search_api.py).
    return (datetime.now(UTC) + timedelta(days=days)).strftime("%Y-%m-%dT%H:%M:%SZ")


SHOW_PAYLOAD = {
    "source": "ticketmaster",
    "external_id": "abc123",
    "title": "Legião Urbana - Turnê 40 Anos",
    "category": "show",
    "date": _future_iso(60),
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
    "date": _future_iso(45),
    "venue": "Cinemark Raposo Shopping",
    "capacity": 4,
    "price": 32.0,
    "reservation_mode": "seatmap",
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


def _reserve_general(client, token, event_id, quantity):
    response = client.post(
        f"/events/{event_id}/reservations",
        json={"quantity": quantity},
        headers={"Authorization": f"Bearer {token}"},
    )
    return response.json()


def _reserve_seats(client, token, event_id, seat_ids):
    response = client.post(
        f"/events/{event_id}/seat-reservations",
        json={"seat_ids": seat_ids},
        headers={"Authorization": f"Bearer {token}"},
    )
    return response.json()


def _pay(client, token, reservation_id, card_number):
    return client.post(
        f"/reservations/{reservation_id}/pay",
        json={"card_number": card_number, **CARD_PAYLOAD},
        headers={"Authorization": f"Bearer {token}"},
    )


def _cancel(client, token, reservation_id):
    return client.post(
        f"/reservations/{reservation_id}/cancel",
        headers={"Authorization": f"Bearer {token}"},
    )


def test_cancel_requires_authentication(client, session):
    event_id = _publish_event(client, session, SHOW_PAYLOAD)
    token = _token_for(session, UserRole.customer, "c@example.com")
    reservation = _reserve_general(client, token, event_id, 1)

    response = client.post(f"/reservations/{reservation['id']}/cancel")

    assert response.status_code == 401


def test_cancel_rejects_a_reservation_owned_by_another_customer(client, session):
    event_id = _publish_event(client, session, SHOW_PAYLOAD)
    token = _token_for(session, UserRole.customer, "c@example.com")
    reservation = _reserve_general(client, token, event_id, 1)
    other_token = _token_for(session, UserRole.customer, "other@example.com")

    response = _cancel(client, other_token, reservation["id"])

    assert response.status_code == 403


def test_cancel_rejects_a_nonexistent_reservation(client, session):
    token = _token_for(session, UserRole.customer, "c@example.com")

    response = _cancel(client, token, 9999)

    assert response.status_code == 404


def test_cancel_pending_general_reservation_releases_capacity(client, session):
    event_id = _publish_event(client, session, SHOW_PAYLOAD)
    token = _token_for(session, UserRole.customer, "c@example.com")
    reservation = _reserve_general(client, token, event_id, 2)

    response = _cancel(client, token, reservation["id"])

    assert response.status_code == 200
    assert response.json()["status"] == "cancelled"
    event = client.get(f"/events/{event_id}").json()
    assert event["reserved_count"] == 0


def test_cancel_pending_seatmap_reservation_releases_seats(client, session):
    event_id = _publish_event(client, session, MOVIE_PAYLOAD)
    seats = client.get(f"/events/{event_id}/seats").json()
    token = _token_for(session, UserRole.customer, "c@example.com")
    reservation = _reserve_seats(client, token, event_id, [seats[0]["id"], seats[1]["id"]])

    response = _cancel(client, token, reservation["id"])

    assert response.status_code == 200
    updated_seats = client.get(f"/events/{event_id}/seats").json()
    assert all(seat["status"] == "available" for seat in updated_seats)


def test_cancel_paid_general_reservation_releases_capacity_and_cancels_tickets(client, session):
    event_id = _publish_event(client, session, SHOW_PAYLOAD)
    token = _token_for(session, UserRole.customer, "c@example.com")
    reservation = _reserve_general(client, token, event_id, 2)
    _pay(client, token, reservation["id"], APPROVE_CARD_NUMBER)

    response = _cancel(client, token, reservation["id"])

    assert response.status_code == 200
    assert response.json()["status"] == "cancelled"
    event = client.get(f"/events/{event_id}").json()
    assert event["reserved_count"] == 0
    tickets = client.get("/tickets/mine", headers={"Authorization": f"Bearer {token}"}).json()
    assert all(ticket["status"] == "cancelled" for ticket in tickets)


def test_cancel_paid_seatmap_reservation_releases_seats_and_cancels_tickets(client, session):
    event_id = _publish_event(client, session, MOVIE_PAYLOAD)
    seats = client.get(f"/events/{event_id}/seats").json()
    token = _token_for(session, UserRole.customer, "c@example.com")
    reservation = _reserve_seats(client, token, event_id, [seats[0]["id"], seats[1]["id"]])
    _pay(client, token, reservation["id"], APPROVE_CARD_NUMBER)

    response = _cancel(client, token, reservation["id"])

    assert response.status_code == 200
    updated_seats = client.get(f"/events/{event_id}/seats").json()
    assert all(seat["status"] == "available" for seat in updated_seats)
    tickets = client.get("/tickets/mine", headers={"Authorization": f"Bearer {token}"}).json()
    assert all(ticket["status"] == "cancelled" for ticket in tickets)


def test_cancel_rejects_an_already_cancelled_reservation(client, session):
    event_id = _publish_event(client, session, SHOW_PAYLOAD)
    token = _token_for(session, UserRole.customer, "c@example.com")
    reservation = _reserve_general(client, token, event_id, 1)
    _cancel(client, token, reservation["id"])

    response = _cancel(client, token, reservation["id"])

    assert response.status_code == 409


def test_cancel_rejects_a_failed_reservation(client, session):
    event_id = _publish_event(client, session, SHOW_PAYLOAD)
    token = _token_for(session, UserRole.customer, "c@example.com")
    reservation = _reserve_general(client, token, event_id, 1)
    _pay(client, token, reservation["id"], DECLINE_CARD_NUMBER)

    response = _cancel(client, token, reservation["id"])

    assert response.status_code == 409


def test_cancel_rejects_a_paid_reservation_with_an_already_used_ticket(client, session):
    event_id = _publish_event(client, session, SHOW_PAYLOAD)
    token = _token_for(session, UserRole.customer, "c@example.com")
    reservation = _reserve_general(client, token, event_id, 1)
    _pay(client, token, reservation["id"], APPROVE_CARD_NUMBER)
    ticket = client.get("/tickets/mine", headers={"Authorization": f"Bearer {token}"}).json()[0]

    gate_token = _token_for(session, UserRole.gatekeeper, "gate@example.com")
    validate_response = client.post(
        "/tickets/validate",
        json={"event_id": event_id, "code": ticket["public_code"]},
        headers={"Authorization": f"Bearer {gate_token}"},
    )
    assert validate_response.json()["outcome"] == "valid"

    response = _cancel(client, token, reservation["id"])

    assert response.status_code == 409
    tickets = client.get("/tickets/mine", headers={"Authorization": f"Bearer {token}"}).json()
    assert tickets[0]["status"] == "used"
