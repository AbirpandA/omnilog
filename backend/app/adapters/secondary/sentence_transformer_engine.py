import numpy as np
from typing import List
from sentence_transformers import SentenceTransformer
from numpy.linalg import norm
from app.domain.models import Vector
from app.ports.secondary.vector_engine import IVectorEngine

class SentenceTransformerEngine(IVectorEngine):
    def __init__(self, model_name: str = 'all-MiniLM-L6-v2'):
        # In a real production setting, this model should be loaded once globally
        # or hosted on a separate inference server. For this architecture, we load it into memory.
        print(f"Loading ML Model: {model_name}...")
        self.model = SentenceTransformer(model_name)
        
    def encode_text(self, text: str) -> Vector:
        """Converts text into a dense vector."""
        embedding = self.model.encode(text)
        return Vector(dimensions=embedding.tolist())
        
    def cosine_similarity(self, v1: Vector, v2: Vector) -> float:
        """Calculates the mathematical similarity between two vectors."""
        a = np.array(v1.dimensions)
        b = np.array(v2.dimensions)
        
        # Avoid division by zero
        if norm(a) == 0 or norm(b) == 0:
            return 0.0
            
        return float(np.dot(a, b) / (norm(a) * norm(b)))
