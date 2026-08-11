"""
seed_db.py

This script seeds the Supabase database with high-quality movie data.
It strictly filters for pure directorial works and top-rated movies.
"""
import sys
import os
import asyncio
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

# Curated directors and regions
DIRECTORS = [
    "Satyajit Ray", "Guru Dutt", "Stanley Kubrick", "David Lynch", "Abbas Kiarostami",
    "Wong Kar-wai", "Andrei Tarkovsky", "Akira Kurosawa", "Agnès Varda", "Ingmar Bergman",
    "Martin Scorsese", "Quentin Tarantino", "Christopher Nolan", "Bong Joon-ho"
]

def filter_high_quality(results: list) -> list:
    return [r for r in results if r.get("vote_average", 0) >= 7.0 and r.get("vote_count", 0) >= 10]

def fetch_director_movies(director_name: str) -> list:
    # 1. Find Director ID
    search_url = f"https://api.themoviedb.org/3/search/person?query={director_name}&language=en-US&page=1"
    res = requests.get(search_url, headers=tmdb.headers)
    if res.status_code != 200:
        return []
        
    person_results = res.json().get("results", [])
    if not person_results:
        return []
        
    person_id = person_results[0].get("id")
    
    # 2. Get Movie Credits and Filter by Job == Director
    credits_url = f"https://api.themoviedb.org/3/person/{person_id}/movie_credits?language=en-US"
    credits_res = requests.get(credits_url, headers=tmdb.headers)
    if credits_res.status_code != 200:
        return []
        
    crew = credits_res.json().get("crew", [])
    directorial_movies = [m for m in crew if m.get("job") == "Director"]
    
    # 3. Quality Filter
    return filter_high_quality(directorial_movies)

def search_tmdb_for_discover(with_genres: str = "", with_origin_country: str = "", pages: int = 5):
    results = []
    for page in range(1, pages + 1):
        url = f"https://api.themoviedb.org/3/discover/movie?language=en-US&sort_by=vote_average.desc&vote_count.gte=100&page={page}"
        if with_genres:
            url += f"&with_genres={with_genres}"
        if with_origin_country:
            url += f"&with_origin_country={with_origin_country}"
        res = requests.get(url, headers=tmdb.headers)
        if res.status_code == 200:
            results.extend(res.json().get("results", []))
    
    return filter_high_quality(results)

def insert_to_supabase(candidates):
    inserted = 0
    for c in candidates:
        try:
            res = supabase.client.table("movies").select("id").eq("id", c.id).execute()
            if not res.data:
                supabase.client.table("movies").insert({
                    "id": c.id,
                    "title": c.title,
                    "description": c.description,
                    "poster_url": c.poster_url,
                    "vibe_tag": c.vibe_tag,
                    "tmdb_rating": c.tmdb_rating,
                    "embedding": c.vector.dimensions
                }).execute()
                inserted += 1
        except Exception as e:
            logger.error(f"Failed to insert {c.title}: {e}")
    return inserted

async def seed():
    logger.info("Starting High-Quality diverse seeding process...")
    total_inserted = 0
    
    # 1. Fetch Master Directors
    for director in DIRECTORS:
        logger.info(f"Seeding works directed by '{director}'...")
        raw_results = fetch_director_movies(director)
        # Convert to CandidateMedia using TMDB Provider
        candidates = await tmdb._process_results(raw_results, [], limit=100, filter_future=True)
        inserted = insert_to_supabase(candidates)
        total_inserted += inserted
        
    # 2. Add Top Bollywood (India)
    logger.info("Seeding high-quality Bollywood movies...")
    raw_bolly = search_tmdb_for_discover(with_origin_country="IN", pages=5)
    bolly_cands = await tmdb._process_results(raw_bolly, [], limit=100, filter_future=True)
    total_inserted += insert_to_supabase(bolly_cands)
    
    # 3. Add Top Horror & Sci-Fi
    logger.info("Seeding top Sci-Fi and Horror...")
    raw_genre = search_tmdb_for_discover(with_genres="27,878", pages=5)
    genre_cands = await tmdb._process_results(raw_genre, [], limit=100, filter_future=True)
    total_inserted += insert_to_supabase(genre_cands)
    
    logger.info(f"Seeding complete! Inserted {total_inserted} high-quality deep cuts.")

if __name__ == "__main__":
    asyncio.run(seed())
