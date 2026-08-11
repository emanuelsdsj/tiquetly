from fastapi import APIRouter, Depends

from app.api.deps import get_ticketmaster_provider, require_organizer
from app.models import User
from app.services.catalog.base import CatalogEvent
from app.services.catalog.ticketmaster import TicketmasterProvider

router = APIRouter(prefix="/catalog", tags=["catalog"])


@router.get("/shows", response_model=list[CatalogEvent])
def search_shows(
    keyword: str | None = None,
    provider: TicketmasterProvider = Depends(get_ticketmaster_provider),
    current_user: User = Depends(require_organizer),
) -> list[CatalogEvent]:
    return provider.search(keyword)
