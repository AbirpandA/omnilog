from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.adapters.secondary.sentence_transformer_engine import SentenceTransformerEngine
from app.adapters.secondary.real_tmdb_provider import RealTMDBProvider
from app.use_cases.vibe_recommendation import VibeRecommendationUseCase
from app.adapters.primary.api import router, get_use_case
import os
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="OmniLog Hexagonal API", version="1.0.0")

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
    print("Booting up OmniLog AI Engine...")
    # 1. Initialize Secondary Adapters
    vector_engine = SentenceTransformerEngine('all-MiniLM-L6-v2')
    media_provider = RealTMDBProvider(vector_engine)
    
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
