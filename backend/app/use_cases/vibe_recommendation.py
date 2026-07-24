"""
Vibe Recommendation Use Case

ARCHITECTURE:
This module is part of the Hexagonal Architecture (Ports & Adapters) backend.
It represents the pure domain logic for the AI Recommendation Engine.

THEORY OF OPERATION (Semantic Text Embeddings & Cosine Similarity):
1. Takes a list of seed movie IDs (sent anonymously from the local-first mobile client).
2. Retrieves rich metadata (plot, keywords) via the TMDB Provider port.
3. Uses the Vector Engine port (`sentence-transformers`) to convert text into high-dimensional vectors.
4. Calculates the Mathematical Centroid (average) of the seed vectors.
5. Computes Cosine Similarity against a massive database of candidates to find movies
   occupying the exact same emotional and atmospheric space.
"""

from typing import List
from app.domain.models import RecommendationResult, Vector
from app.ports.secondary.media_provider import IMediaProvider
from app.ports.secondary.vector_engine import IVectorEngine


class VibeRecommendationUseCase:
    """
    Pure Application logic for generating vector-based recommendations.
    This class has NO knowledge of HTTP, FastAPI, or TMDB. It relies solely on abstractions.
    """

    def __init__(self, media_provider: IMediaProvider, vector_engine: IVectorEngine):
        self.media_provider = media_provider
        self.vector_engine = vector_engine

    def _calculate_centroid(self, vectors: List[Vector]) -> Vector:
        """Calculates the average vector from a list of vectors."""
        if not vectors:
            raise ValueError("Cannot calculate centroid of empty vector list")

        dim = len(vectors[0].dimensions)
        centroid_dims = [0.0] * dim

        for v in vectors:
            for i in range(dim):
                centroid_dims[i] += v.dimensions[i]

        for i in range(dim):
            centroid_dims[i] /= len(vectors)

        return Vector(dimensions=centroid_dims)

    def execute(
        self, seed_ids: List[str], exclude_ids: List[str] = None, top_n: int = 7
    ) -> List[RecommendationResult]:
        if exclude_ids is None:
            exclude_ids = []

        # 1. Fetch seed media items
        seeds = self.media_provider.get_media_by_ids(seed_ids)
        if not seeds:
            return []

        # 2. Extract vectors and calculate the target "Vibe" centroid
        seed_vectors = [seed.vector for seed in seeds]
        target_vibe = self._calculate_centroid(seed_vectors)

        # 3. Fetch dynamically profiled candidates (excluding the seeds themselves and any user logs)
        all_excludes = list(set(seed_ids + exclude_ids))
        candidates = self.media_provider.get_candidates_for_vibe(
            seed_movies=seeds, exclude_ids=all_excludes, limit=100
        )

        # 4. Score each candidate against the target vibe
        results = []
        for candidate in candidates:
            score = self.vector_engine.cosine_similarity(target_vibe, candidate.vector)
            results.append(
                RecommendationResult(
                    media_id=candidate.id,
                    title=candidate.title,
                    description=candidate.description,
                    poster_url=candidate.poster_url,
                    similarity_score=score,
                )
            )

        # 5. Sort by highest similarity and return top N
        results.sort(key=lambda r: r.similarity_score, reverse=True)
        return results[:top_n]

    def execute_mood(
        self, mood_text: str, exclude_ids: List[str] = None, top_n: int = 20
    ) -> List[RecommendationResult]:
        if exclude_ids is None:
            exclude_ids = []

        # 1. Convert text to vector
        mood_vector = self.vector_engine.encode_text(mood_text)

        # 2. Fetch highly dynamic mood-based candidates
        candidates = self.media_provider.get_candidates_for_mood(
            mood_text=mood_text, exclude_ids=exclude_ids, limit=100
        )

        # 3. Score each candidate against the mood vector
        results = []
        for candidate in candidates:
            score = self.vector_engine.cosine_similarity(mood_vector, candidate.vector)
            results.append(
                RecommendationResult(
                    media_id=candidate.id,
                    title=candidate.title,
                    description=candidate.description,
                    poster_url=candidate.poster_url,
                    similarity_score=score,
                )
            )

        # 4. Sort and return
        results.sort(key=lambda r: r.similarity_score, reverse=True)
        return results[:top_n]

    def execute_similar(
        self, media_id: str, exclude_ids: List[str] = None, top_n: int = 10
    ) -> List[RecommendationResult]:
        if exclude_ids is None:
            exclude_ids = []

        seeds = self.media_provider.get_media_by_ids([media_id])
        if not seeds:
            return []

        target_vibe = seeds[0].vector

        all_excludes = list(set([media_id] + exclude_ids))

        candidates = self.media_provider.get_candidates_for_similar(
            media_id=media_id, exclude_ids=all_excludes, limit=50
        )

        results = []
        for candidate in candidates:
            score = self.vector_engine.cosine_similarity(target_vibe, candidate.vector)
            results.append(
                RecommendationResult(
                    media_id=candidate.id,
                    title=candidate.title,
                    description=candidate.description,
                    poster_url=candidate.poster_url,
                    similarity_score=score,
                )
            )

        results.sort(key=lambda r: r.similarity_score, reverse=True)
        return results[:top_n]
