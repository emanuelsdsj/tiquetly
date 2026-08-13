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
    # True when Ticketmaster reports assigned seating for the event (its
    # `seatmap.staticUrl` field is present), False for general admission
    # shows and always False from TMDb (movies are always seatmap through
    # the existing category rule regardless of this field, see ADR 0003).
    # Drives whether a show is created in seatmap or general mode (ADR
    # 0003 addendum): Ticketmaster does not expose the real seat-by-seat
    # layout at this API tier, only this yes/no signal, so a detected
    # seatmap show still gets the same synthetic per-row grid movies do.
    has_seatmap: bool = False


class CatalogProvider(Protocol):
    # `city`, `year`, `country` and `genre` are accepted by both providers
    # for a uniform call signature (see the route in
    # api/routes/catalog.py), but each only honors the filters its own
    # source actually supports: city and country for Ticketmaster
    # (shows), year and genre for TMDb (movies, and only without a
    # keyword for genre, see TmdbProvider.search).
    def search(
        self,
        keyword: str | None = None,
        *,
        city: str | None = None,
        year: int | None = None,
        country: str | None = None,
        genre: str | None = None,
    ) -> list[CatalogEvent]: ...
