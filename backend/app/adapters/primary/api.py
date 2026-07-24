from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from app.use_cases.vibe_recommendation import VibeRecommendationUseCase

router = APIRouter()

class RecommendRequest(BaseModel):
    seed_ids: List[str]
    
class RecommendResponse(BaseModel):
    media_id: str
    title: str
    description: str
    poster_url: str
    similarity_score: float

class SearchResponse(BaseModel):
    media_id: str
    title: str
    description: str
    poster_url: str

class LatestResponse(BaseModel):
    media_id: str
    title: str
    description: str
    poster_url: str

class MediaDetailsResponse(BaseModel):
    media_id: str
    title: str
    description: str
    poster_url: str
    backdrop_url: str
    tmdb_rating: float
    director: str
    cast: List[str]
    runtime: int
    genres: List[str]
    release_date: str
    tagline: str

# We'll inject the usecase via FastAPI app state in main.py
def get_use_case() -> VibeRecommendationUseCase:
    raise NotImplementedError("Dependency injected in main.py")

@router.post("/recommend", response_model=List[RecommendResponse])
def get_recommendations(
    payload: RecommendRequest, 
    use_case: VibeRecommendationUseCase = Depends(get_use_case)
):
    results = use_case.execute(seed_ids=payload.seed_ids, top_n=7)
    return [
        RecommendResponse(
            media_id=r.media_id,
            title=r.title,
            description=r.description,
            poster_url=r.poster_url,
            similarity_score=r.similarity_score
        )
        for r in results
    ]

@router.get("/search", response_model=List[SearchResponse])
def search(query: str, use_case: VibeRecommendationUseCase = Depends(get_use_case)):
    results = use_case.media_provider.search_media(query)
    return [
        SearchResponse(
            media_id=r.id,
            title=r.title,
            description=r.description,
            poster_url=r.poster_url
        )
        for r in results
    ]

@router.get("/latest", response_model=List[LatestResponse])
def get_latest(use_case: VibeRecommendationUseCase = Depends(get_use_case)):
    results = use_case.media_provider.get_latest_movies()
    return [
        LatestResponse(
            media_id=r.id,
            title=r.title,
            description=r.description,
            poster_url=r.poster_url
        )
        for r in results
    ]

@router.get("/movie/{media_id}", response_model=MediaDetailsResponse)
def get_movie_details(media_id: str, use_case: VibeRecommendationUseCase = Depends(get_use_case)):
    details = use_case.media_provider.get_movie_details(media_id)
    if not details:
        raise HTTPException(status_code=404, detail="Movie not found")
    return MediaDetailsResponse(**details)
