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
import asyncio
import random
from app.domain.models import RecommendationResult, Vector
from app.ports.secondary.media_provider import IMediaProvider
from app.ports.secondary.vector_engine import IVectorEngine
from app.ports.secondary.cache_provider import ICacheProvider


class VibeRecommendationUseCase:
    """
    Pure Application logic for generating vector-based recommendations.
    This class has NO knowledge of HTTP, FastAPI, or TMDB. It relies solely on abstractions.
    """

    def __init__(self, media_provider: IMediaProvider, vector_engine: IVectorEngine, cache_provider: ICacheProvider = None):
        self.media_provider = media_provider
        self.vector_engine = vector_engine
        self.cache_provider = cache_provider

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

    async def execute(
        self, seed_ids: List[str], exclude_ids: List[str] = None, top_n: int = 7
    ) -> List[RecommendationResult]:
        if exclude_ids is None:
            exclude_ids = []

        # 1. Fetch seed media items (check cache first)
        seeds = []
        missing_ids = []
        
        if self.cache_provider:
            for sid in seed_ids:
                cached_seed = await self.cache_provider.get(sid)
                if cached_seed:
                    seeds.append(cached_seed)
                else:
                    missing_ids.append(sid)
        else:
            missing_ids = seed_ids
            
        if missing_ids:
            db_seeds = await self.media_provider.get_media_by_ids(missing_ids)
            seeds.extend(db_seeds)
            if self.cache_provider:
                for s in db_seeds:
                    await self.cache_provider.set(s.id, s)
        if not seeds:
            return []

        # 2. Extract vectors and calculate the target "Vibe" centroid
        seed_vectors = [seed.vector for seed in seeds]
        target_vibe = self._calculate_centroid(seed_vectors)

        # 3. Fetch dynamically profiled candidates (excluding the seeds themselves and any user logs)
        all_excludes = list(set(seed_ids + exclude_ids))
        candidates = await self.media_provider.get_candidates_for_vibe(
            seed_movies=seeds, exclude_ids=all_excludes, limit=100
        )

        # 4. Score each candidate against the target vibe
        results = []
        for i, candidate in enumerate(candidates):
            if candidate.vector.dimensions:
                base_score = self.vector_engine.cosine_similarity(target_vibe, candidate.vector)
            else:
                # Fallback: DB already sorted them by similarity, assign a declining score based on rank
                base_score = max(0.99 - (i * 0.01), 0.1)
            
            jitter = random.uniform(0.95, 1.05)
            score = min(base_score * jitter, 1.0)
            
            results.append(
                RecommendationResult(
                    media_id=candidate.id,
                    title=candidate.title,
                    description=candidate.description,
                    poster_url=candidate.poster_url,
                    similarity_score=score,
                    tmdb_rating=candidate.tmdb_rating,
                    vibe_tag=candidate.vibe_tag,
                )
            )

        # 5. Sort by highest similarity
        results.sort(key=lambda r: r.similarity_score, reverse=True)
        
        # Take the top 30 highly matched candidates
        top_candidates = results[:30]
        
        # Randomly sample 'top_n' from the top 30 to provide massive variety on refresh
        if len(top_candidates) > top_n:
            final_selection = random.sample(top_candidates, top_n)
        else:
            final_selection = top_candidates
            
        # Re-sort the final selection so the best matches in the sample appear first
        final_selection.sort(key=lambda r: r.similarity_score, reverse=True)
        return final_selection

    async def execute_mood(
        self, mood_text: str, exclude_ids: List[str] = None, top_n: int = 20
    ) -> List[RecommendationResult]:
        if exclude_ids is None:
            exclude_ids = []

        # 1. Convert text to vector in background thread to not block event loop
        mood_vector = await asyncio.to_thread(self.vector_engine.encode_text, mood_text)

        # 2. Fetch highly dynamic mood-based candidates
        candidates = await self.media_provider.get_candidates_for_mood(
            mood_text=mood_text, exclude_ids=exclude_ids, limit=100
        )

        # 3. Score each candidate against the mood vector
        results = []
        for i, candidate in enumerate(candidates):
            if candidate.vector.dimensions:
                base_score = self.vector_engine.cosine_similarity(mood_vector, candidate.vector)
            else:
                # Fallback: DB already sorted them by similarity, assign a declining score based on rank
                base_score = max(0.99 - (i * 0.01), 0.1)
            
            jitter = random.uniform(0.95, 1.05)
            score = min(base_score * jitter, 1.0)
            
            results.append(
                RecommendationResult(
                    media_id=candidate.id,
                    title=candidate.title,
                    description=candidate.description,
                    poster_url=candidate.poster_url,
                    similarity_score=score,
                    tmdb_rating=candidate.tmdb_rating,
                    vibe_tag=candidate.vibe_tag,
                )
            )

        # 4. Sort and sample for variety
        results.sort(key=lambda r: r.similarity_score, reverse=True)
        
        top_candidates = results[:30]
        if len(top_candidates) > top_n:
            final_selection = random.sample(top_candidates, top_n)
        else:
            final_selection = top_candidates
            
        final_selection.sort(key=lambda r: r.similarity_score, reverse=True)
        return final_selection

    async def execute_similar(
        self, media_id: str, exclude_ids: List[str] = None, top_n: int = 10
    ) -> List[RecommendationResult]:
        if exclude_ids is None:
            exclude_ids = []

        seeds = []
        if self.cache_provider:
            cached_seed = await self.cache_provider.get(media_id)
            if cached_seed:
                seeds.append(cached_seed)
                
        if not seeds:
            seeds = await self.media_provider.get_media_by_ids([media_id])
            if seeds and self.cache_provider:
                await self.cache_provider.set(seeds[0].id, seeds[0])
        if not seeds:
            return []

        centroid = seeds[0].vector.dimensions
        all_excludes = list(set([media_id] + exclude_ids))

        candidates = await self.media_provider.get_candidates_for_similar(
            media_id=media_id, exclude_ids=all_excludes, limit=50
        )

        # 3. Compute Cosine Similarity
        recommendations = []
        for i, cand in enumerate(candidates):
            if cand.vector.dimensions:
                base_score = self.vector_engine.cosine_similarity(seeds[0].vector, cand.vector)
            else:
                # Fallback: DB already sorted them by similarity, assign a declining score based on rank
                base_score = max(0.99 - (i * 0.01), 0.1)
            
            # Apply a +/- 5% random jitter to shuffle closely matched movies when refreshed
            jitter = random.uniform(0.95, 1.05)
            score = min(base_score * jitter, 1.0)
            
            recommendations.append(
                RecommendationResult(
                    media_id=cand.id,
                    title=cand.title,
                    description=cand.description,
                    poster_url=cand.poster_url,
                    similarity_score=score,
                    tmdb_rating=cand.tmdb_rating,
                    vibe_tag=cand.vibe_tag,
                )
            )
        recommendations.sort(key=lambda r: r.similarity_score, reverse=True)
        return recommendations[:top_n]
