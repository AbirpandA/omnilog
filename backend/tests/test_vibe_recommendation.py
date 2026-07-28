import pytest
from app.domain.models import CandidateMedia, Vector
from app.use_cases.vibe_recommendation import VibeRecommendationUseCase


class MockMediaProvider:
    def __init__(self):
        self.movies = {
            "1": CandidateMedia(id="1", title="Movie 1", description="", poster_url="", vector=Vector(dimensions=[1.0, 0.0, 0.0])),
            "2": CandidateMedia(id="2", title="Movie 2", description="", poster_url="", vector=Vector(dimensions=[0.0, 1.0, 0.0])),
        }
        self.candidates = [
            CandidateMedia(id="3", title="Movie 3", description="", poster_url="", vector=Vector(dimensions=[0.5, 0.5, 0.0])),
            CandidateMedia(id="4", title="Movie 4", description="", poster_url="", vector=Vector(dimensions=[0.0, 0.0, 1.0])),
        ]

    def get_media_by_ids(self, ids):
        return [self.movies[i] for i in ids if i in self.movies]

    def get_candidates_for_vibe(self, seed_movies, exclude_ids, limit):
        return [c for c in self.candidates if c.id not in exclude_ids]


class MockVectorEngine:
    def cosine_similarity(self, vec1: Vector, vec2: Vector) -> float:
        # Simple dot product for unit vectors
        dot = sum(a * b for a, b in zip(vec1.dimensions, vec2.dimensions))
        return dot


def test_centroid_calculation():
    provider = MockMediaProvider()
    engine = MockVectorEngine()
    use_case = VibeRecommendationUseCase(provider, engine)
    
    vec1 = Vector(dimensions=[1.0, 0.0, 0.0])
    vec2 = Vector(dimensions=[0.0, 1.0, 0.0])
    
    centroid = use_case._calculate_centroid([vec1, vec2])
    
    assert centroid.dimensions == [0.5, 0.5, 0.0]


def test_vibe_recommendation_execute():
    provider = MockMediaProvider()
    engine = MockVectorEngine()
    use_case = VibeRecommendationUseCase(provider, engine)
    
    results = use_case.execute(seed_ids=["1", "2"], top_n=1)
    
    # The centroid will be [0.5, 0.5, 0.0]
    # Candidate 3 is [0.5, 0.5, 0.0] (score = 0.5)
    # Candidate 4 is [0.0, 0.0, 1.0] (score = 0.0)
    # So Candidate 3 should win.
    
    assert len(results) == 1
    assert results[0].media_id == "3"
    assert results[0].similarity_score == 0.5
