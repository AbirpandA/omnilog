import sys
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from loguru import logger
from fastapi.middleware.cors import CORSMiddleware
from app.adapters.secondary.sentence_transformer_engine import SentenceTransformerEngine
from app.adapters.secondary.real_tmdb_provider import RealTMDBProvider
from app.adapters.secondary.supabase_media_provider import SupabaseMediaProvider
from app.use_cases.vibe_recommendation import VibeRecommendationUseCase
from app.adapters.primary.api import router, get_use_case
import os
from dotenv import load_dotenv

load_dotenv()

# Configure Loguru for structured JSON logging
logger.remove()
logger.add(sys.stderr, format="<green>{time:YYYY-MM-DD HH:mm:ss}</green> | <level>{level: <8}</level> | <cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> - <level>{message}</level>")

app = FastAPI(title="OmniLog Hexagonal API", version="1.0.0")

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.exception(f"Unhandled exception during request {request.method} {request.url}")
    return JSONResponse(
        status_code=500,
        content={"message": "An unexpected server error occurred.", "details": str(exc)},
    )

# Setup CORS for the mobile app
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def startup_event():
    logger.info("Booting up OmniLog AI Engine...")
    # 1. Initialize Secondary Adapters
    vector_engine = SentenceTransformerEngine('all-MiniLM-L6-v2')
    tmdb_provider = RealTMDBProvider(vector_engine)
    media_provider = SupabaseMediaProvider(vector_engine, tmdb_provider)
    
    # 2. Inject Adapters into the Use Case
    use_case = VibeRecommendationUseCase(
        media_provider=media_provider,
        vector_engine=vector_engine
    )
    
    # 3. Store in App State for FastAPI injection
    app.state.vibe_use_case = use_case

# Override the FastAPI Dependency Injection 
def override_get_use_case():
    return app.state.vibe_use_case

app.include_router(router, prefix="/api", dependencies=[])
app.dependency_overrides[get_use_case] = override_get_use_case

@app.get("/")
def health_check():
    return {"status": "OmniLog Engine Online", "architecture": "Hexagonal"}
