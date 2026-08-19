from datetime import UTC, datetime, timedelta

from app.core.security import create_access_token
from app.models import User, UserRole
from app.services.reservation_service import APPROVE_CARD_NUMBER


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
    "capacity": 5,
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


def _pay(client, token, reservation_id):
    return client.post(
        f"/reservations/{reservation_id}/pay",
        json={"card_number": APPROVE_CARD_NUMBER, **CARD_PAYLOAD},
        headers={"Authorization": f"Bearer {token}"},
    )


def test_paying_a_general_reservation_generates_one_ticket_per_admission(client, session):
    event_id = _publish_event(client, session, SHOW_PAYLOAD)
    token = _token_for(session, UserRole.customer, "c@example.com")
    reservation = client.post(
        f"/events/{event_id}/reservations",
        json={"quantity": 3},
        headers={"Authorization": f"Bearer {token}"},
    ).json()

    _pay(client, token, reservation["id"])

    response = client.get("/tickets/mine", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    tickets = response.json()
    assert len(tickets) == 3
    assert all(t["status"] == "valid" for t in tickets)
    assert all(t["seat_id"] is None for t in tickets)
    assert all(t["event"]["id"] == event_id for t in tickets)
    assert all(t["qr_payload"] and t["qr_image"].startswith("data:image/png;base64,") for t in tickets)
    # each ticket has its own public code, and therefore its own QR payload
    assert len({t["public_code"] for t in tickets}) == 3


def test_paying_a_seatmap_reservation_generates_one_ticket_per_seat_and_marks_seats_sold(client, session):
    event_id = _publish_event(client, session, MOVIE_PAYLOAD)
    seats = client.get(f"/events/{event_id}/seats").json()
    token = _token_for(session, UserRole.customer, "c@example.com")
    reservation = client.post(
        f"/events/{event_id}/seat-reservations",
        json={"seat_ids": [seats[0]["id"], seats[1]["id"]]},
        headers={"Authorization": f"Bearer {token}"},
    ).json()

    _pay(client, token, reservation["id"])

    tickets = client.get("/tickets/mine", headers={"Authorization": f"Bearer {token}"}).json()
    assert len(tickets) == 2
    ticketed_seat_ids = {t["seat_id"] for t in tickets}
    assert ticketed_seat_ids == {seats[0]["id"], seats[1]["id"]}
    assert all(t["seat"] is not None for t in tickets)

    updated_seats = client.get(f"/events/{event_id}/seats").json()
    statuses = {seat["id"]: seat["status"] for seat in updated_seats}
    assert statuses[seats[0]["id"]] == "sold"
    assert statuses[seats[1]["id"]] == "sold"


def test_list_my_tickets_requires_authentication(client):
    response = client.get("/tickets/mine")

    assert response.status_code == 401


def test_list_my_tickets_only_returns_the_current_customers_tickets(client, session):
    event_id = _publish_event(client, session, SHOW_PAYLOAD)
    token_a = _token_for(session, UserRole.customer, "a@example.com")
    token_b = _token_for(session, UserRole.customer, "b@example.com")
    reservation_a = client.post(
        f"/events/{event_id}/reservations",
        json={"quantity": 1},
        headers={"Authorization": f"Bearer {token_a}"},
    ).json()
    _pay(client, token_a, reservation_a["id"])

    response = client.get("/tickets/mine", headers={"Authorization": f"Bearer {token_b}"})

    assert response.status_code == 200
    assert response.json() == []
