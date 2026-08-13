from datetime import UTC, datetime
from typing import Any

import httpx

from app.core.config import settings
from app.core.errors import CatalogProviderError
from app.models import EventCategory, EventSource
from app.services.catalog.base import CatalogEvent

TMDB_SEARCH_URL = "https://api.themoviedb.org/3/search/movie"
TMDB_DISCOVER_URL = "https://api.themoviedb.org/3/discover/movie"
TMDB_NOW_PLAYING_URL = "https://api.themoviedb.org/3/movie/now_playing"
TMDB_IMAGE_BASE_URL = "https://image.tmdb.org/t/p/w500"


class TmdbProvider:
    """Adapts the TMDb API to the common CatalogProvider interface.

    Three different TMDb endpoints back a single `search`, picked by what
    was actually asked for: a keyword searches the full catalog by title
    (`/search/movie`); a year and/or genre with no keyword filters
    without a text query (`/discover/movie`, the only one of the three
    that supports either); neither one lists what's currently in theaters
    (`/movie/now_playing`), the default with the least to configure.
    """

    def __init__(self, client: httpx.Client | None = None):
        self._client = client or httpx.Client(timeout=10.0)

    def search(
        self,
        keyword: str | None = None,
        *,
        city: str | None = None,
        year: int | None = None,
        country: str | None = None,
        genre: str | None = None,
    ) -> list[CatalogEvent]:
        # `city` and `country` are part of the shared CatalogProvider
        # signature but have no equivalent here: TMDb has no
        # venue/location concept for a movie itself, so both are
        # silently ignored.
        if not settings.tmdb_api_key:
            raise CatalogProviderError("CATALOG_API_KEY_MISSING", "TMDb API key is not configured", provider="TMDb")

        if keyword:
            # `with_genres` only exists on /discover/movie, not
            # /search/movie's free-text search, so a genre picked
            # alongside a keyword has no endpoint that honors both; the
            # keyword wins and genre is silently ignored here, same
            # spirit as city/country above.
            url, params = TMDB_SEARCH_URL, {"api_key": settings.tmdb_api_key, "query": keyword}
            if year:
                params["primary_release_year"] = year
        elif year or genre:
            url, params = TMDB_DISCOVER_URL, {
                "api_key": settings.tmdb_api_key,
                "sort_by": "popularity.desc",
            }
            if year:
                params["primary_release_year"] = year
            if genre:
                params["with_genres"] = genre
        else:
            url, params = TMDB_NOW_PLAYING_URL, {"api_key": settings.tmdb_api_key}

        try:
            response = self._client.get(url, params=params)
            response.raise_for_status()
        except httpx.HTTPError as exc:
            raise CatalogProviderError(
                "CATALOG_REQUEST_FAILED", f"TMDb request failed: {exc}", provider="TMDb"
            ) from exc

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
