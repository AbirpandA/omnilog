from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import List
from app.use_cases.vibe_recommendation import VibeRecommendationUseCase

router = APIRouter()

class RecommendRequest(BaseModel):
    seed_ids: List[str]
    
class RecommendResponse(BaseModel):
    media_id: str
    title: str
    similarity_score: float

# We'll inject the usecase via FastAPI app state in main.py
def get_use_case() -> VibeRecommendationUseCase:
    raise NotImplementedError("Dependency injected in main.py")

@router.post("/recommend", response_model=List[RecommendResponse])
def get_recommendations(
    payload: RecommendRequest, 
    use_case: VibeRecommendationUseCase = Depends(get_use_case)
):
    """
    Accepts an array of high-rated media IDs and returns top recommendations
    based on the Centroid Vibe Vector.
    """
    results = use_case.execute(seed_ids=payload.seed_ids, top_n=7)
    
    # Map domain results to Pydantic DTOs
    return [
        RecommendResponse(
            media_id=r.media_id,
            title=r.title,
            similarity_score=r.similarity_score
        )
        for r in results
    ]
