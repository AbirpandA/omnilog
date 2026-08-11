from typing import Protocol, List
from app.domain.models import CandidateMedia


class IMediaProvider(Protocol):
    """Protocol for fetching media information (e.g. from TMDB)."""

    async def get_media_by_ids(self, ids: List[str]) -> List[CandidateMedia]:
        """Fetches full media objects given a list of IDs."""
        ...

    async def get_candidates_for_vibe(
        self, seed_movies: List[CandidateMedia], exclude_ids: List[str], limit: int = 50
    ) -> List[CandidateMedia]:
        """Fetches dynamic candidates based on the genres/patterns of the seed movies."""
        ...

    async def get_candidates_for_mood(
        self, mood_text: str, exclude_ids: List[str], limit: int = 50
    ) -> List[CandidateMedia]:
        """Fetches dynamic candidates by performing keyword searches based on the mood text."""
        ...

    async def get_candidates_for_similar(
        self, media_id: str, exclude_ids: List[str], limit: int = 50
    ) -> List[CandidateMedia]:
        """Fetches closely related candidates using TMDB's similar endpoint."""
        ...

    async def search_media(self, query: str) -> List[CandidateMedia]:
        """Searches for media by query string."""
        ...

    async def get_latest_movies(self) -> List[CandidateMedia]:
        """Fetches latest releases."""
        ...

    async def get_upcoming_movies(self) -> List[CandidateMedia]:
        """Fetches upcoming releases."""
        ...

    async def get_movie_details(self, movie_id: str) -> dict:
        """Fetches full details for a movie."""
        ...
