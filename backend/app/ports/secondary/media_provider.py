from typing import Protocol, List
from app.domain.models import CandidateMedia


class IMediaProvider(Protocol):
    """Protocol for fetching media information (e.g. from TMDB)."""

    def get_media_by_ids(self, ids: List[str]) -> List[CandidateMedia]:
        """Fetches full media objects given a list of IDs."""
        ...

    def get_candidates_for_vibe(
        self, seed_movies: List[CandidateMedia], exclude_ids: List[str], limit: int = 50
    ) -> List[CandidateMedia]:
        """Fetches dynamic candidates based on the genres/patterns of the seed movies."""
        ...

    def get_candidates_for_mood(
        self, mood_text: str, exclude_ids: List[str], limit: int = 50
    ) -> List[CandidateMedia]:
        """Fetches dynamic candidates by performing keyword searches based on the mood text."""
        ...

    def get_candidates_for_similar(
        self, media_id: str, exclude_ids: List[str], limit: int = 50
    ) -> List[CandidateMedia]:
        """Fetches closely related candidates using TMDB's similar endpoint."""
        ...

    def search_media(self, query: str) -> List[CandidateMedia]:
        """Searches for media by query string."""
        ...

    def get_latest_movies(self) -> List[CandidateMedia]:
        """Fetches latest releases."""
        ...

    def get_upcoming_movies(self) -> List[CandidateMedia]:
        """Fetches upcoming releases."""
        ...

    def get_movie_details(self, movie_id: str) -> dict:
        """Fetches full details for a movie."""
        ...
