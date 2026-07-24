from dataclasses import dataclass
from typing import List


@dataclass
class Vector:
    """Represents a mathematical embedding (e.g. 384 dimensions)."""

    dimensions: List[float]


@dataclass
class CandidateMedia:
    """Represents a movie/book candidate for recommendation."""

    id: str
    title: str
    description: str
    poster_url: str
    vector: Vector
    vibe_tag: str = ""


@dataclass
class RecommendationResult:
    """Represents a final recommendation with its similarity score."""

    media_id: str
    title: str
    description: str
    poster_url: str
    similarity_score: float
    vibe_tag: str = ""
