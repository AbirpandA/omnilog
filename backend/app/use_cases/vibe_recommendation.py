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

    def execute(self, seed_ids: List[str], top_n: int = 7) -> List[RecommendationResult]:
        # 1. Fetch seed media items
        seeds = self.media_provider.get_media_by_ids(seed_ids)
        if not seeds:
            return []
            
        # 2. Extract vectors and calculate the target "Vibe" centroid
        seed_vectors = [seed.vector for seed in seeds]
        target_vibe = self._calculate_centroid(seed_vectors)
        
        # 3. Fetch candidates (excluding the seeds themselves)
        candidates = self.media_provider.get_candidates(exclude_ids=seed_ids, limit=100)
        
        # 4. Score each candidate against the target vibe
        results = []
        for candidate in candidates:
            score = self.vector_engine.cosine_similarity(target_vibe, candidate.vector)
            results.append(
                RecommendationResult(
                    media_id=candidate.id,
                    title=candidate.title,
                    similarity_score=score
                )
            )
            
        # 5. Sort by highest similarity and return top N (default 7 as per spec)
        results.sort(key=lambda r: r.similarity_score, reverse=True)
        return results[:top_n]
