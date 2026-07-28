import os
from typing import List, Optional
from supabase import create_client, Client
from app.domain.models import CandidateMedia, Vector
from app.ports.secondary.media_provider import IMediaProvider
from app.adapters.secondary.real_tmdb_provider import RealTMDBProvider
from app.ports.secondary.vector_engine import IVectorEngine

class SupabaseMediaProvider(IMediaProvider):
    def __init__(self, vector_engine: IVectorEngine, tmdb_provider: RealTMDBProvider):
        self.vector_engine = vector_engine
        self.tmdb_provider = tmdb_provider
        
        supabase_url = os.environ.get("SUPABASE_URL", "")
        supabase_key = os.environ.get("SUPABASE_KEY", "")
        
        # We only initialize if credentials exist
        self.client: Optional[Client] = None
        if supabase_url and supabase_key:
            self.client = create_client(supabase_url, supabase_key)
            
    def _row_to_candidate(self, row: dict) -> CandidateMedia:
        return CandidateMedia(
            id=row["id"],
            title=row["title"],
            description=row["description"],
            poster_url=row.get("poster_url", ""),
            vibe_tag=row.get("vibe_tag", "Unknown Vibe"),
            vector=Vector(dimensions=[]) # Not needed for return payload
        )

    # ---------------------------------------------------------
    # HYBRID APPROACH: DEEP CATALOG (VECTOR SEARCH VIA SUPABASE)
    # ---------------------------------------------------------

    def get_candidates_for_vibe(
        self, seed_movies: List[CandidateMedia], exclude_ids: List[str], limit: int = 50
    ) -> List[CandidateMedia]:
        if not self.client:
            # Fallback to TMDB real-time if Supabase isn't configured
            return self.tmdb_provider.get_candidates_for_vibe(seed_movies, exclude_ids, limit)
            
        # 1. Calculate average vector (centroid) of seed movies
        vectors = [m.vector.dimensions for m in seed_movies if m.vector.dimensions]
        if not vectors:
            return self.tmdb_provider.get_candidates_for_vibe(seed_movies, exclude_ids, limit)
        
        centroid = [sum(x) / len(x) for x in zip(*vectors)]
            
        # 2. Query Supabase via RPC
        response = self.client.rpc("match_movies", {
            "query_embedding": centroid,
            "match_threshold": 0.5,
            "match_count": limit,
            "exclude_ids": exclude_ids
        }).execute()

        data = response.data
        if not data:
            # Fallback to TMDB real-time if Supabase has nothing
            return self.tmdb_provider.get_candidates_for_vibe(seed_movies, exclude_ids, limit)

        candidates = []
        for row in data:
            candidates.append(self._row_to_candidate(row))
        return candidates

    def get_candidates_for_mood(
        self, mood_text: str, exclude_ids: List[str], limit: int = 50
    ) -> List[CandidateMedia]:
        if not self.client:
            return self.tmdb_provider.get_candidates_for_mood(mood_text, exclude_ids, limit)

        mood_vector = self.vector_engine.encode_text(mood_text)

        response = self.client.rpc("match_movies", {
            "query_embedding": mood_vector.dimensions,
            "match_threshold": 0.4,
            "match_count": limit,
            "exclude_ids": exclude_ids
        }).execute()

        data = response.data
        if not data:
            return self.tmdb_provider.get_candidates_for_mood(mood_text, exclude_ids, limit)

        candidates = []
        for row in data:
            candidates.append(self._row_to_candidate(row))
        return candidates

    def get_candidates_for_similar(
        self, media_id: str, exclude_ids: List[str], limit: int = 50
    ) -> List[CandidateMedia]:
        if not self.client:
            return self.tmdb_provider.get_candidates_for_similar(media_id, exclude_ids, limit)

        # 1. Try to get the seed vector from Supabase first
        res = self.client.table("movies").select("embedding").eq("id", media_id).execute()
        if res.data and len(res.data) > 0 and res.data[0].get("embedding"):
            seed_vector = res.data[0]["embedding"]
        else:
            # Fallback to fetching TMDB and embedding it on the fly
            tmdb_res = self.tmdb_provider.get_media_by_ids([media_id])
            if not tmdb_res:
                return []
            seed_vector = tmdb_res[0].vector.dimensions

        response = self.client.rpc("match_movies", {
            "query_embedding": seed_vector,
            "match_threshold": 0.5,
            "match_count": limit,
            "exclude_ids": exclude_ids
        }).execute()

        data = response.data
        if not data:
            return self.tmdb_provider.get_candidates_for_similar(media_id, exclude_ids, limit)

        candidates = []
        for row in data:
            candidates.append(self._row_to_candidate(row))
        return candidates

    # ---------------------------------------------------------
    # HYBRID APPROACH: FRESH CATALOG (REAL-TIME VIA TMDB)
    # ---------------------------------------------------------

    def get_latest_movies(self) -> List[CandidateMedia]:
        return self.tmdb_provider.get_latest_movies()

    def get_upcoming_movies(self) -> List[CandidateMedia]:
        return self.tmdb_provider.get_upcoming_movies()
        
    def search_media(self, query: str) -> List[CandidateMedia]:
        return self.tmdb_provider.search_media(query)
        
    def get_media_by_ids(self, ids: List[str]) -> List[CandidateMedia]:
        return self.tmdb_provider.get_media_by_ids(ids)
        
    def get_movie_details(self, movie_id: str) -> Optional[dict]:
        return self.tmdb_provider.get_movie_details(movie_id)
