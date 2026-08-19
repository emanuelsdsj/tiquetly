from datetime import UTC, datetime, timedelta

from sqlmodel import select

from app.core.security import create_access_token
from app.models import Event, EventStatus, User, UserRole


def _future_iso(days: int) -> str:
    # Fixed future dates go stale the moment "today" catches up to them
    # (this bit the suite for real: MOVIE_PAYLOAD's old hardcoded
    # 2026-08-15 became a past date and silently failed every test in
    # this file once ADR 0025's past-date filtering kicked in). Anchoring
    # to now keeps these fixtures future forever.
    return (datetime.now(UTC) + timedelta(days=days)).strftime("%Y-%m-%dT%H:%M:%SZ")


SHOW_PAYLOAD = {
    "source": "ticketmaster",
    "external_id": "abc123",
    "title": "Legião Urbana - Turnê 40 Anos",
    "category": "show",
    "date": _future_iso(60),
    "venue": "Allianz Parque",
    "capacity": 3,
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
    "capacity": 12,
    "price": 32.0,
    "reservation_mode": "seatmap",
}


def _organizer_token(session):
    user = User(email="org@example.com", hashed_password="x", name="Org", role=UserRole.organizer)
    session.add(user)
    session.commit()
    session.refresh(user)
    return create_access_token(user_id=user.id, role=user.role.value)


def _publish_both(client, session):
    token = _organizer_token(session)
    headers = {"Authorization": f"Bearer {token}"}
    client.post("/events", json=SHOW_PAYLOAD, headers=headers)
    client.post("/events", json=MOVIE_PAYLOAD, headers=headers)


def test_search_events_requires_no_authentication(client, session):
    _publish_both(client, session)

    response = client.get("/events")

    assert response.status_code == 200
    assert len(response.json()) == 2


def test_search_events_excludes_unpublished(client, session):
    _publish_both(client, session)
    cancelled = session.exec(select(Event)).first()
    cancelled.status = EventStatus.cancelled
    session.add(cancelled)
    session.commit()

    response = client.get("/events")

    assert response.status_code == 200
    assert len(response.json()) == 1


def test_search_events_filters_by_keyword(client, session):
    _publish_both(client, session)

    response = client.get("/events", params={"q": "odisseia"})

    assert response.status_code == 200
    body = response.json()
    assert len(body) == 1
    assert body[0]["title"] == "A Odisseia"


def test_search_events_filters_by_category(client, session):
    _publish_both(client, session)

    response = client.get("/events", params={"category": "show"})

    assert response.status_code == 200
    body = response.json()
    assert len(body) == 1
    assert body[0]["category"] == "show"


def test_search_events_filters_by_price_range(client, session):
    _publish_both(client, session)

    response = client.get("/events", params={"price_max": 50})

    assert response.status_code == 200
    body = response.json()
    assert len(body) == 1
    assert body[0]["title"] == "A Odisseia"


def test_search_events_excludes_a_past_dated_event_by_default(client, session):
    token = _organizer_token(session)
    headers = {"Authorization": f"Bearer {token}"}
    past_payload = {**SHOW_PAYLOAD, "date": "2020-01-01T00:00:00Z"}
    client.post("/events", json=past_payload, headers=headers)
    client.post("/events", json=MOVIE_PAYLOAD, headers=headers)

    response = client.get("/events")

    assert response.status_code == 200
    body = response.json()
    assert len(body) == 1
    assert body[0]["title"] == "A Odisseia"


def test_search_events_still_returns_a_past_dated_event_with_an_explicit_date_from(client, session):
    # The gate screen's own "today" query (date_from + date_to for the
    # local day) must still find an event that already started (ADR
    # 0025): the auto-exclusion only applies to the plain, no-date-filter
    # browse case.
    token = _organizer_token(session)
    headers = {"Authorization": f"Bearer {token}"}
    past_payload = {**SHOW_PAYLOAD, "date": "2020-01-01T00:00:00Z"}
    client.post("/events", json=past_payload, headers=headers)

    response = client.get("/events", params={"date_from": "2019-12-31T00:00:00Z"})

    assert response.status_code == 200
    body = response.json()
    assert len(body) == 1
    assert body[0]["date"].startswith("2020-01-01")
