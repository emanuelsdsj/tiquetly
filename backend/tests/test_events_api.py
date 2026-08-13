from sqlmodel import select

from app.core.security import create_access_token
from app.models import Seat, User, UserRole

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

MOVIE_PAYLOAD = {
    "source": "tmdb",
    "external_id": "42",
    "title": "Test Movie",
    "category": "movie",
    "date": "2026-09-01T00:00:00Z",
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
