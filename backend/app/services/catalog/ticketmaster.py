from datetime import datetime
from typing import Any

import httpx

from app.core.config import settings
from app.core.errors import CatalogProviderError
from app.models import EventCategory, EventSource
from app.services.catalog.base import CatalogEvent

TICKETMASTER_EVENTS_URL = "https://app.ticketmaster.com/discovery/v2/events.json"


class TicketmasterProvider:
    """Adapts the Ticketmaster Discovery API to the common CatalogProvider interface.

    Scoped to the "Music" classification: Ticketmaster covers concerts and
    shows here, movies come from TmdbProvider instead, so the two never
    return overlapping results.
    """

    def __init__(self, client: httpx.Client | None = None):
        self._client = client or httpx.Client(timeout=10.0)

    def search(self, keyword: str | None = None) -> list[CatalogEvent]:
        if not settings.ticketmaster_api_key:
            raise CatalogProviderError(
                "CATALOG_API_KEY_MISSING", "Ticketmaster API key is not configured", provider="Ticketmaster"
            )

        params: dict[str, Any] = {
            "apikey": settings.ticketmaster_api_key,
            "classificationName": "Music",
            "size": 20,
        }
        if keyword:
            params["keyword"] = keyword

        try:
            response = self._client.get(TICKETMASTER_EVENTS_URL, params=params)
            response.raise_for_status()
        except httpx.HTTPError as exc:
            raise CatalogProviderError(
                "CATALOG_REQUEST_FAILED", f"Ticketmaster request failed: {exc}", provider="Ticketmaster"
            ) from exc

        payload = response.json()
        raw_events = payload.get("_embedded", {}).get("events", [])
        return [self._normalize(event) for event in raw_events]

    def _normalize(self, event: dict[str, Any]) -> CatalogEvent:
        images = event.get("images") or []
        image = images[0]["url"] if images else None

        venues = event.get("_embedded", {}).get("venues") or []
        venue = venues[0]["name"] if venues else None

        date_time = event.get("dates", {}).get("start", {}).get("dateTime")
        date = datetime.fromisoformat(date_time.replace("Z", "+00:00")) if date_time else None

        return CatalogEvent(
            source=EventSource.ticketmaster,
            external_id=event["id"],
            title=event["name"],
            image=image,
            description=event.get("info") or event.get("pleaseNote"),
            category=EventCategory.show,
            date=date,
            venue=venue,
        )
