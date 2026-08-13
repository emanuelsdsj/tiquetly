from fastapi import APIRouter, Depends

from app.api.deps import get_ticketmaster_provider, get_tmdb_provider, require_organizer
from app.models import EventCategory, User
from app.services.catalog.base import CatalogEvent, CatalogProvider
from app.services.catalog.ticketmaster import TicketmasterProvider
from app.services.catalog.tmdb import TmdbProvider

router = APIRouter(prefix="/catalog", tags=["catalog"])


@router.get("/search", response_model=list[CatalogEvent])
def search_catalog(
    category: EventCategory,
    keyword: str | None = None,
    city: str | None = None,
    year: int | None = None,
    country: str | None = None,
    genre: str | None = None,
    ticketmaster: TicketmasterProvider = Depends(get_ticketmaster_provider),
    tmdb: TmdbProvider = Depends(get_tmdb_provider),
    current_user: User = Depends(require_organizer),
) -> list[CatalogEvent]:
    provider: CatalogProvider = ticketmaster if category == EventCategory.show else tmdb
    return provider.search(keyword, city=city, year=year, country=country, genre=genre)
