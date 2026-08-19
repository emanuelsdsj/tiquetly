from datetime import UTC, datetime, timedelta

from sqlmodel import select

from app.core.security import create_access_token
from app.models import Seat, User, UserRole


def _future_iso(days: int) -> str:
    # Fixed future dates go stale the moment "today" catches up to them;
    # anchoring to now keeps event fixtures future forever (see the same
    # fix and rationale in test_events_search_api.py).
    return (datetime.now(UTC) + timedelta(days=days)).strftime("%Y-%m-%dT%H:%M:%SZ")


SHOW_PAYLOAD = {
    "source": "ticketmaster",
    "external_id": "abc123",
    "title": "Test Show",
    "category": "show",
    "date": _future_iso(60),
    "venue": "Test Venue",
    "capacity": 3,
    "price": 100.0,
    "reservation_mode": "general",
}

MOVIE_PAYLOAD = {
    "source": "tmdb",
    "external_id": "42",
    "title": "Test Movie",
    "category": "movie",
    "date": _future_iso(60),
    "venue": "Test Cinema",
    "capacity": 12,
    "price": 40.0,
    "reservation_mode": "seatmap",
}


def _token_for(session, role: UserRole, email: str = "user@example.com") -> str:
    user = User(email=email, hashed_password="x", name="User", role=role)
    session.add(user)
    session.commit()
    session.refresh(user)
    return create_access_token(user_id=user.id, role=user.role.value)


def test_create_event_requires_authentication(client):
    response = client.post("/events", json=SHOW_PAYLOAD)

    assert response.status_code == 401


def test_create_event_rejects_a_customer(client, session):
    token = _token_for(session, UserRole.customer)

    response = client.post("/events", json=SHOW_PAYLOAD, headers={"Authorization": f"Bearer {token}"})

    assert response.status_code == 403


def test_create_event_publishes_a_general_admission_show(client, session):
    token = _token_for(session, UserRole.organizer)

    response = client.post("/events", json=SHOW_PAYLOAD, headers={"Authorization": f"Bearer {token}"})

    assert response.status_code == 201
    body = response.json()
    assert body["status"] == "published"
    assert body["capacity"] == 3
    assert session.exec(select(Seat)).first() is None
    # SQLite strips tzinfo on round-trip; without _as_utc in schemas.py
    # this comes back naive, which the frontend's `new Date(...)` would
    # read as local time instead of UTC (see the same assertion in
    # test_reservations_api.py for the arithmetic this actually broke).
    assert body["date"].endswith("Z")
    assert body["created_at"].endswith("Z")


def test_create_event_generates_seats_for_a_seatmap_movie(client, session):
    token = _token_for(session, UserRole.organizer)

    response = client.post("/events", json=MOVIE_PAYLOAD, headers={"Authorization": f"Bearer {token}"})

    assert response.status_code == 201
    event_id = response.json()["id"]
    seats = session.exec(select(Seat).where(Seat.event_id == event_id)).all()
    assert len(seats) == 12
    assert {seat.row for seat in seats} == {"A", "B"}


def test_create_event_generates_seats_for_a_show_with_assigned_seating(client, session):
    # ADR 0003 addendum: a show can now be seatmap too, when the picked
    # Ticketmaster result reports assigned seating. Unlike the movie case,
    # nothing here comes from CatalogEvent.has_seatmap directly (that
    # field only steers the frontend's choice of reservation_mode); the
    # backend just has to accept show + seatmap once the frontend sends it.
    token = _token_for(session, UserRole.organizer)
    payload = {**SHOW_PAYLOAD, "reservation_mode": "seatmap", "capacity": 15}

    response = client.post("/events", json=payload, headers={"Authorization": f"Bearer {token}"})

    assert response.status_code == 201
    event_id = response.json()["id"]
    seats = session.exec(select(Seat).where(Seat.event_id == event_id)).all()
    assert len(seats) == 15
    assert {seat.row for seat in seats} == {"A", "B"}


def test_create_event_rejects_a_past_date(client, session):
    token = _token_for(session, UserRole.organizer)
    payload = {**SHOW_PAYLOAD, "date": "2020-01-01T00:00:00Z"}

    response = client.post("/events", json=payload, headers={"Authorization": f"Bearer {token}"})

    assert response.status_code == 422
    assert response.json()["code"] == "VALIDATION_ERROR"


def test_create_event_rejects_a_movie_with_general_reservation_mode(client, session):
    token = _token_for(session, UserRole.organizer)
    payload = {**MOVIE_PAYLOAD, "reservation_mode": "general"}

    response = client.post("/events", json=payload, headers={"Authorization": f"Bearer {token}"})

    assert response.status_code == 422


def test_create_event_rejects_zero_capacity(client, session):
    token = _token_for(session, UserRole.organizer)
    payload = {**SHOW_PAYLOAD, "capacity": 0}

    response = client.post("/events", json=payload, headers={"Authorization": f"Bearer {token}"})

    assert response.status_code == 422
    body = response.json()
    # Pydantic validation errors (as opposed to domain AppErrors) must also
    # come back normalized: "detail" a plain string, never the framework's
    # default array of error objects, or the frontend renders "[object
    # Object]" wherever it expects text.
    assert isinstance(body["detail"], str)
    assert "capacity" in body["detail"]
    assert body["code"] == "VALIDATION_ERROR"


def test_list_my_events_only_returns_the_organizers_own(client, session):
    token_a = _token_for(session, UserRole.organizer, email="a@example.com")
    token_b = _token_for(session, UserRole.organizer, email="b@example.com")
    client.post("/events", json=SHOW_PAYLOAD, headers={"Authorization": f"Bearer {token_a}"})
    client.post("/events", json=MOVIE_PAYLOAD, headers={"Authorization": f"Bearer {token_b}"})

    response = client.get("/events/mine", headers={"Authorization": f"Bearer {token_a}"})

    assert response.status_code == 200
    body = response.json()
    assert len(body) == 1
    assert body[0]["title"] == "Test Show"
