from datetime import UTC, datetime, timedelta

from sqlmodel import select

from app.core.security import create_access_token
from app.models import Reservation, User, UserRole


def _future_iso(days: int) -> str:
    # Fixed future dates go stale the moment "today" catches up to them;
    # anchoring to now keeps event fixtures future forever (see the same
    # fix and rationale in test_events_search_api.py).
    return (datetime.now(UTC) + timedelta(days=days)).strftime("%Y-%m-%dT%H:%M:%SZ")


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


def test_list_seats_returns_them_in_reading_order(client, session):
    event_id = _publish_event(client, session, MOVIE_PAYLOAD)

    response = client.get(f"/events/{event_id}/seats")

    assert response.status_code == 200
    body = response.json()
    assert len(body) == 4
    assert [(seat["row"], seat["col"]) for seat in body] == [("A", "1"), ("A", "2"), ("A", "3"), ("A", "4")]
    assert all(seat["status"] == "available" for seat in body)


def test_list_seats_rejects_a_nonexistent_event(client):
    response = client.get("/events/9999/seats")

    assert response.status_code == 404


def test_reserve_seats_requires_authentication(client, session):
    event_id = _publish_event(client, session, MOVIE_PAYLOAD)
    seats = client.get(f"/events/{event_id}/seats").json()

    response = client.post(f"/events/{event_id}/seat-reservations", json={"seat_ids": [seats[0]["id"]]})

    assert response.status_code == 401


def test_reserve_seats_rejects_an_organizer(client, session):
    event_id = _publish_event(client, session, MOVIE_PAYLOAD)
    seats = client.get(f"/events/{event_id}/seats").json()
    org_token = _token_for(session, UserRole.organizer, "org2@example.com")

    response = client.post(
        f"/events/{event_id}/seat-reservations",
        json={"seat_ids": [seats[0]["id"]]},
        headers={"Authorization": f"Bearer {org_token}"},
    )

    assert response.status_code == 403


def test_reserve_seats_marks_them_reserved(client, session):
    event_id = _publish_event(client, session, MOVIE_PAYLOAD)
    seats = client.get(f"/events/{event_id}/seats").json()
    token = _token_for(session, UserRole.customer, "c@example.com")

    response = client.post(
        f"/events/{event_id}/seat-reservations",
        json={"seat_ids": [seats[0]["id"], seats[1]["id"]]},
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 201
    body = response.json()
    assert body["status"] == "pending"
    assert body["quantity"] is None

    updated = client.get(f"/events/{event_id}/seats").json()
    statuses = {seat["id"]: seat["status"] for seat in updated}
    assert statuses[seats[0]["id"]] == "reserved"
    assert statuses[seats[1]["id"]] == "reserved"
    assert statuses[seats[2]["id"]] == "available"


def test_reserve_seats_rejects_an_already_taken_seat_without_reserving_the_rest(client, session):
    event_id = _publish_event(client, session, MOVIE_PAYLOAD)
    seats = client.get(f"/events/{event_id}/seats").json()
    token = _token_for(session, UserRole.customer, "c@example.com")

    first = client.post(
        f"/events/{event_id}/seat-reservations",
        json={"seat_ids": [seats[0]["id"], seats[1]["id"]]},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert first.status_code == 201

    second = client.post(
        f"/events/{event_id}/seat-reservations",
        json={"seat_ids": [seats[1]["id"], seats[2]["id"]]},
        headers={"Authorization": f"Bearer {token}"},
    )

    assert second.status_code == 409

    # Seat 2 was free when this second request started; it must not have
    # been left reserved by the attempt that ultimately failed.
    updated = client.get(f"/events/{event_id}/seats").json()
    statuses = {seat["id"]: seat["status"] for seat in updated}
    assert statuses[seats[2]["id"]] == "available"


def test_reserve_seats_rejects_a_general_admission_event(client, session):
    event_id = _publish_event(client, session, SHOW_PAYLOAD)
    token = _token_for(session, UserRole.customer, "c@example.com")

    response = client.post(
        f"/events/{event_id}/seat-reservations",
        json={"seat_ids": [1]},
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 422


def test_reserve_seats_rejects_an_empty_selection(client, session):
    event_id = _publish_event(client, session, MOVIE_PAYLOAD)
    token = _token_for(session, UserRole.customer, "c@example.com")

    response = client.post(
        f"/events/{event_id}/seat-reservations",
        json={"seat_ids": []},
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 422


def test_reserve_seats_rejects_a_nonexistent_event(client, session):
    token = _token_for(session, UserRole.customer, "c@example.com")

    response = client.post(
        "/events/9999/seat-reservations",
        json={"seat_ids": [1]},
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 404


def test_a_stale_pending_seat_reservation_frees_the_seat_on_the_next_read(client, session):
    event_id = _publish_event(client, session, MOVIE_PAYLOAD)
    token = _token_for(session, UserRole.customer, "c@example.com")
    seats = client.get(f"/events/{event_id}/seats").json()
    reserved = client.post(
        f"/events/{event_id}/seat-reservations",
        json={"seat_ids": [seats[0]["id"]]},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert reserved.status_code == 201

    reservation = session.exec(select(Reservation)).one()
    reservation.created_at = datetime.now(UTC) - timedelta(minutes=11)
    session.add(reservation)
    session.commit()

    seats_after = client.get(f"/events/{event_id}/seats").json()

    assert seats_after[0]["status"] == "available"
