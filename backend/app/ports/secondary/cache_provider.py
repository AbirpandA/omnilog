from typing import Protocol, Optional
from app.domain.models import CandidateMedia

class ICacheProvider(Protocol):
    """Protocol for caching media objects to prevent redundant API/DB calls."""

    async def get(self, media_id: str) -> Optional[CandidateMedia]:
        """Retrieves a CandidateMedia object from the cache by its ID."""
        ...

    async def set(self, media_id: str, candidate: CandidateMedia, ttl_seconds: int = 3600) -> None:
        """Stores a CandidateMedia object in the cache with an optional Time-To-Live (TTL)."""
        ...
        
    async def exists(self, media_id: str) -> bool:
        """Checks if a media ID exists in the cache."""
        ...
