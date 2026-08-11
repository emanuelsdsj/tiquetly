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


class CatalogProvider(Protocol):
    def search(self, keyword: str | None = None) -> list[CatalogEvent]: ...
