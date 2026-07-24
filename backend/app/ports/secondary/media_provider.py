from typing import Protocol, List
from app.domain.models import CandidateMedia

class IMediaProvider(Protocol):
    """Protocol for fetching media information (e.g. from TMDB)."""
    
    def get_media_by_ids(self, ids: List[str]) -> List[CandidateMedia]:
        """Fetches full media objects given a list of IDs."""
        ...
        
    def get_candidates(self, exclude_ids: List[str], limit: int = 50) -> List[CandidateMedia]:
        """Fetches a broad list of candidates to compare against, excluding seeds."""
        ...
