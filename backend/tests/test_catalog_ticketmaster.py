import httpx
import pytest

from app.core.config import settings
from app.core.errors import CatalogProviderError
from app.services.catalog.ticketmaster import TicketmasterProvider

RAW_EVENT = {
    "id": "abc123",
    "name": "Test Show",
    "info": "Doors open at 8pm",
    "images": [{"url": "https://example.com/image.jpg"}],
    "dates": {"start": {"dateTime": "2026-09-01T23:00:00Z"}},
    "_embedded": {"venues": [{"name": "Test Venue"}]},
}


def _provider(handler) -> TicketmasterProvider:
    transport = httpx.MockTransport(handler)
    return TicketmasterProvider(client=httpx.Client(transport=transport))


@pytest.fixture(autouse=True)
def _api_key(monkeypatch):
    monkeypatch.setattr(settings, "ticketmaster_api_key", "test-key")


def test_search_normalizes_a_ticketmaster_event():
    def handler(request: httpx.Request) -> httpx.Response:
        assert request.url.params["apikey"] == "test-key"
        return httpx.Response(200, json={"_embedded": {"events": [RAW_EVENT]}})

    provider = _provider(handler)

    events = provider.search(keyword="test")

    assert len(events) == 1
    event = events[0]
    assert event.source == "ticketmaster"
    assert event.external_id == "abc123"
    assert event.title == "Test Show"
    assert event.image == "https://example.com/image.jpg"
    assert event.venue == "Test Venue"
    assert event.category == "show"
    assert event.date is not None


def test_search_returns_an_empty_list_when_ticketmaster_has_no_matches():
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, json={"page": {"totalElements": 0}})

    provider = _provider(handler)

    assert provider.search(keyword="nothing-matches-this") == []


def test_search_raises_when_the_api_key_is_not_configured(monkeypatch):
    monkeypatch.setattr(settings, "ticketmaster_api_key", "")
    provider = _provider(lambda request: httpx.Response(200, json={}))

    with pytest.raises(CatalogProviderError):
        provider.search()


def test_search_raises_when_ticketmaster_returns_an_error():
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(500, json={"fault": "internal error"})

    provider = _provider(handler)

    with pytest.raises(CatalogProviderError):
        provider.search()
