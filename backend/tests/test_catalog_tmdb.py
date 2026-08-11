import httpx
import pytest

from app.core.config import settings
from app.core.errors import CatalogProviderError
from app.services.catalog.tmdb import TmdbProvider

RAW_MOVIE = {
    "id": 42,
    "title": "Test Movie",
    "overview": "A movie about testing.",
    "poster_path": "/poster.jpg",
    "release_date": "2026-09-01",
}


def _provider(handler) -> TmdbProvider:
    transport = httpx.MockTransport(handler)
    return TmdbProvider(client=httpx.Client(transport=transport))


@pytest.fixture(autouse=True)
def _api_key(monkeypatch):
    monkeypatch.setattr(settings, "tmdb_api_key", "test-key")


def test_search_with_a_keyword_hits_the_search_endpoint():
    def handler(request: httpx.Request) -> httpx.Response:
        assert request.url.path == "/3/search/movie"
        assert request.url.params["query"] == "test"
        return httpx.Response(200, json={"results": [RAW_MOVIE]})

    events = _provider(handler).search(keyword="test")

    assert len(events) == 1
    event = events[0]
    assert event.source == "tmdb"
    assert event.external_id == "42"
    assert event.title == "Test Movie"
    assert event.image == "https://image.tmdb.org/t/p/w500/poster.jpg"
    assert event.category == "movie"
    assert event.venue is None
    assert event.date is not None


def test_search_with_no_keyword_hits_now_playing():
    def handler(request: httpx.Request) -> httpx.Response:
        assert request.url.path == "/3/movie/now_playing"
        return httpx.Response(200, json={"results": [RAW_MOVIE]})

    events = _provider(handler).search()

    assert len(events) == 1


def test_search_raises_when_the_api_key_is_not_configured(monkeypatch):
    monkeypatch.setattr(settings, "tmdb_api_key", "")
    provider = _provider(lambda request: httpx.Response(200, json={}))

    with pytest.raises(CatalogProviderError):
        provider.search()


def test_search_raises_when_tmdb_returns_an_error():
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(500, json={"status_message": "internal error"})

    provider = _provider(handler)

    with pytest.raises(CatalogProviderError):
        provider.search()
