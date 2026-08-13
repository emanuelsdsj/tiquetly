from datetime import UTC, datetime, timedelta

from sqlmodel import select

from app.core.security import create_access_token
from app.models import Reservation, User, UserRole
from app.services.reservation_service import APPROVE_CARD_NUMBER, DECLINE_CARD_NUMBER

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


def _pay(client, token, reservation_id, card_number):
    return client.post(
        f"/reservations/{reservation_id}/pay",
        json={"card_number": card_number, **CARD_PAYLOAD},
        headers={"Authorization": f"Bearer {token}"},
    )


def test_pay_requires_authentication(client, session):
    event_id = _publish_event(client, session, SHOW_PAYLOAD)
    token = _token_for(session, UserRole.customer, "c@example.com")
    reservation = _reserve_general(client, token, event_id, 1)

    response = client.post(
        f"/reservations/{reservation['id']}/pay",
        json={"card_number": APPROVE_CARD_NUMBER, **CARD_PAYLOAD},
    )

    assert response.status_code == 401


def test_pay_rejects_an_organizer(client, session):
    event_id = _publish_event(client, session, SHOW_PAYLOAD)
    token = _token_for(session, UserRole.customer, "c@example.com")
    reservation = _reserve_general(client, token, event_id, 1)
    org_token = _token_for(session, UserRole.organizer, "org2@example.com")

    response = _pay(client, org_token, reservation["id"], APPROVE_CARD_NUMBER)

    assert response.status_code == 403


def test_pay_rejects_a_reservation_owned_by_another_customer(client, session):
    event_id = _publish_event(client, session, SHOW_PAYLOAD)
    token = _token_for(session, UserRole.customer, "c@example.com")
    reservation = _reserve_general(client, token, event_id, 1)
    other_token = _token_for(session, UserRole.customer, "other@example.com")

    response = _pay(client, other_token, reservation["id"], APPROVE_CARD_NUMBER)

    assert response.status_code == 403


def test_pay_rejects_a_nonexistent_reservation(client, session):
    token = _token_for(session, UserRole.customer, "c@example.com")

    response = _pay(client, token, 9999, APPROVE_CARD_NUMBER)

    assert response.status_code == 404


def test_pay_rejects_an_unrecognized_card_number(client, session):
    event_id = _publish_event(client, session, SHOW_PAYLOAD)
    token = _token_for(session, UserRole.customer, "c@example.com")
    reservation = _reserve_general(client, token, event_id, 1)

    response = _pay(client, token, reservation["id"], "1111111111111111")

    assert response.status_code == 422
    event = client.get(f"/events/{event_id}").json()
    assert event["reserved_count"] == 1


def test_pay_approves_with_the_approve_test_card(client, session):
    event_id = _publish_event(client, session, SHOW_PAYLOAD)
    token = _token_for(session, UserRole.customer, "c@example.com")
    reservation = _reserve_general(client, token, event_id, 1)

    response = _pay(client, token, reservation["id"], APPROVE_CARD_NUMBER)

    assert response.status_code == 200
    assert response.json()["status"] == "paid"


def test_pay_rejects_paying_an_already_paid_reservation_again(client, session):
    event_id = _publish_event(client, session, SHOW_PAYLOAD)
    token = _token_for(session, UserRole.customer, "c@example.com")
    reservation = _reserve_general(client, token, event_id, 1)
    _pay(client, token, reservation["id"], APPROVE_CARD_NUMBER)

    response = _pay(client, token, reservation["id"], APPROVE_CARD_NUMBER)

    assert response.status_code == 409


def test_pay_declines_with_the_decline_test_card_and_releases_general_capacity(client, session):
    event_id = _publish_event(client, session, SHOW_PAYLOAD)
    token = _token_for(session, UserRole.customer, "c@example.com")
    reservation = _reserve_general(client, token, event_id, 2)

    response = _pay(client, token, reservation["id"], DECLINE_CARD_NUMBER)

    assert response.status_code == 200
    assert response.json()["status"] == "failed"
    event = client.get(f"/events/{event_id}").json()
    assert event["reserved_count"] == 0


def test_pay_declines_and_releases_seatmap_seats(client, session):
    event_id = _publish_event(client, session, MOVIE_PAYLOAD)
    seats = client.get(f"/events/{event_id}/seats").json()
    token = _token_for(session, UserRole.customer, "c@example.com")
    reserve_response = client.post(
        f"/events/{event_id}/seat-reservations",
        json={"seat_ids": [seats[0]["id"], seats[1]["id"]]},
        headers={"Authorization": f"Bearer {token}"},
    )
    reservation = reserve_response.json()

    response = _pay(client, token, reservation["id"], DECLINE_CARD_NUMBER)

    assert response.status_code == 200
    assert response.json()["status"] == "failed"
    updated_seats = client.get(f"/events/{event_id}/seats").json()
    assert all(seat["status"] == "available" for seat in updated_seats)


def test_pay_rejects_a_reservation_that_expired_past_the_ttl(client, session):
    event_id = _publish_event(client, session, SHOW_PAYLOAD)
    token = _token_for(session, UserRole.customer, "c@example.com")
    reservation = _reserve_general(client, token, event_id, 2)
    stored = session.exec(select(Reservation).where(Reservation.id == reservation["id"])).one()
    stored.created_at = datetime.now(UTC) - timedelta(minutes=11)
    session.add(stored)
    session.commit()

    response = _pay(client, token, reservation["id"], APPROVE_CARD_NUMBER)

    assert response.status_code == 409
    body = response.json()
    assert body["code"] == "RESERVATION_NOT_PENDING"
    assert body["params"] == {"status": "expired"}
    event = client.get(f"/events/{event_id}").json()
    assert event["reserved_count"] == 0
