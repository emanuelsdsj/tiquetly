from datetime import UTC, datetime
from typing import Any

import httpx

from app.core.config import settings
from app.core.errors import CatalogProviderError
from app.models import EventCategory, EventSource
from app.services.catalog.base import CatalogEvent

TMDB_SEARCH_URL = "https://api.themoviedb.org/3/search/movie"
TMDB_NOW_PLAYING_URL = "https://api.themoviedb.org/3/movie/now_playing"
TMDB_IMAGE_BASE_URL = "https://image.tmdb.org/t/p/w500"


class TmdbProvider:
    """Adapts the TMDb API to the common CatalogProvider interface.

    With no keyword, lists movies currently in theaters (now_playing);
    with one, searches the full catalog instead, since now_playing has no
    query parameter of its own.
    """

    def __init__(self, client: httpx.Client | None = None):
        self._client = client or httpx.Client(timeout=10.0)

    def search(self, keyword: str | None = None) -> list[CatalogEvent]:
        if not settings.tmdb_api_key:
            raise CatalogProviderError("TMDb API key is not configured")

        if keyword:
            url, params = TMDB_SEARCH_URL, {"api_key": settings.tmdb_api_key, "query": keyword}
        else:
            url, params = TMDB_NOW_PLAYING_URL, {"api_key": settings.tmdb_api_key}

        try:
            response = self._client.get(url, params=params)
            response.raise_for_status()
        except httpx.HTTPError as exc:
            raise CatalogProviderError(f"TMDb request failed: {exc}") from exc

        results = response.json().get("results", [])
        return [self._normalize(movie) for movie in results]

    def _normalize(self, movie: dict[str, Any]) -> CatalogEvent:
        poster_path = movie.get("poster_path")
        image = f"{TMDB_IMAGE_BASE_URL}{poster_path}" if poster_path else None

        release_date = movie.get("release_date")
        date = datetime.fromisoformat(release_date).replace(tzinfo=UTC) if release_date else None

        return CatalogEvent(
            source=EventSource.tmdb,
            external_id=str(movie["id"]),
            title=movie["title"],
            image=image,
            description=movie.get("overview") or None,
            category=EventCategory.movie,
            date=date,
            venue=None,
        )
