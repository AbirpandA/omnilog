import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

import requests
from dotenv import load_dotenv
from loguru import logger
from app.adapters.secondary.sentence_transformer_engine import SentenceTransformerEngine
from app.adapters.secondary.real_tmdb_provider import RealTMDBProvider
from app.adapters.secondary.supabase_media_provider import SupabaseMediaProvider
from app.use_cases.sync_movies import SyncMoviesUseCase

load_dotenv()

vector_engine = SentenceTransformerEngine('all-MiniLM-L6-v2')
tmdb = RealTMDBProvider(vector_engine)
supabase = SupabaseMediaProvider(vector_engine, tmdb)

if not supabase.client:
    logger.error("Supabase client is not configured. Check .env")
    sys.exit(1)

# Curated directors, regions, and niches to ensure diverse representation
SEED_QUERIES = [
    # Master Directors
    "Satyajit Ray", "Guru Dutt", "Stanley Kubrick", "David Lynch", "Abbas Kiarostami",
    "Wong Kar-wai", "Andrei Tarkovsky", "Akira Kurosawa", "Agnès Varda", "Ingmar Bergman",
    # Regions
    "Bollywood Classic", "French New Wave", "Korean Cinema", "Italian Neorealism",
    # Specific diverse genres
    "Psychological Thriller", "Surrealism", "Slow Cinema", "Cyberpunk",
]

def search_tmdb_for_query(query: str, pages: int = 2) -> list:
    results = []
    for page in range(1, pages + 1):
        url = f"https://api.themoviedb.org/3/search/movie?query={query}&include_adult=false&language=en-US&page={page}"
        res = requests.get(url, headers=tmdb.headers)
        if res.status_code == 200:
            results.extend(res.json().get("results", []))
    return results

def search_tmdb_for_discover(with_genres: str = "", with_origin_country: str = "", pages: int = 5):
    results = []
    for page in range(1, pages + 1):
        url = f"https://api.themoviedb.org/3/discover/movie?language=en-US&sort_by=vote_count.desc&page={page}"
        if with_genres:
            url += f"&with_genres={with_genres}"
        if with_origin_country:
            url += f"&with_origin_country={with_origin_country}"
        res = requests.get(url, headers=tmdb.headers)
        if res.status_code == 200:
            results.extend(res.json().get("results", []))
    return results

def insert_to_supabase(candidates):
    inserted = 0
    for c in candidates:
        res = supabase.client.table("movies").select("id").eq("id", c.id).execute()
        if not res.data:
            supabase.client.table("movies").insert({
                "id": c.id,
                "title": c.title,
                "description": c.description,
                "poster_url": c.poster_url,
                "vibe_tag": c.vibe_tag,
                "embedding": c.vector.dimensions
            }).execute()
            inserted += 1
    return inserted

def seed():
    logger.info("Starting diverse seeding process...")
    total_inserted = 0
    
    # 1. Search text queries (Directors & Niche Themes)
    for q in SEED_QUERIES:
        logger.info(f"Seeding '{q}'...")
        raw_results = search_tmdb_for_query(q, pages=1)
        # Convert to CandidateMedia using TMDB Provider
        candidates = tmdb._process_results(raw_results, [], 20, filter_future=True)
        inserted = insert_to_supabase(candidates)
        total_inserted += inserted
        
    # 2. Add Top Bollywood (India)
    logger.info("Seeding top Bollywood movies...")
    raw_bolly = search_tmdb_for_discover(with_origin_country="IN", pages=3)
    bolly_cands = tmdb._process_results(raw_bolly, [], 60, filter_future=True)
    total_inserted += insert_to_supabase(bolly_cands)
    
    # 3. Add Top Horror & Sci-Fi
    logger.info("Seeding top Sci-Fi and Horror...")
    raw_genre = search_tmdb_for_discover(with_genres="27,878", pages=3)
    genre_cands = tmdb._process_results(raw_genre, [], 60, filter_future=True)
    total_inserted += insert_to_supabase(genre_cands)
    
    # 4. Sync Trending
    logger.info("Syncing latest/upcoming movies...")
    sync_uc = SyncMoviesUseCase(tmdb, supabase)
    sync_uc.sync_trending_movies()
    
    logger.info(f"Seeding complete! Inserted {total_inserted} diverse deep cuts.")

if __name__ == "__main__":
    seed()
