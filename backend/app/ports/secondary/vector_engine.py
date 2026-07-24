from typing import Protocol, List
from app.domain.models import Vector

class IVectorEngine(Protocol):
    """Protocol for generating semantic text embeddings."""
    def encode_text(self, text: str) -> Vector:
        """Converts text into a dense vector."""
        ...
    
    def cosine_similarity(self, v1: Vector, v2: Vector) -> float:
        """Calculates the mathematical similarity between two vectors."""
        ...
