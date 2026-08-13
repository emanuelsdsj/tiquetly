from datetime import datetime
from typing import Protocol

from pydantic import BaseModel

from app.models import EventCategory, EventSource


class CatalogEvent(BaseModel):
    """Normalized shape every catalog provider adapts its source data into.

    The rest of the backend (event creation, search) only ever sees this,
    never a raw Ticketmaster or TMDb payload.
    """

    source: EventSource
    external_id: str
    title: str
    image: str | None = None
    description: str | None = None
    category: EventCategory
    date: datetime | None = None
    venue: str | None = None
    # Populated by Ticketmaster (from the venue's own city), always None
    # from TMDb (a movie has no city of its own). Search-time metadata
    # only: not part of EventCreate, the organizer's own "Venue" field on
    # the create-event form is what actually gets stored.
    city: str | None = None


class CatalogProvider(Protocol):
    # `city` and `year` are accepted by both providers for a uniform call
    # signature (see the route in api/routes/catalog.py), but each only
    # honors the one filter its own source actually supports: city for
    # Ticketmaster (shows), year for TMDb (movies, and only alongside a
    # keyword, see TmdbProvider.search).
    def search(
        self, keyword: str | None = None, *, city: str | None = None, year: int | None = None
    ) -> list[CatalogEvent]: ...
