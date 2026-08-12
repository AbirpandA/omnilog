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
import time
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

import random

# Massive curated pool of master directors across all genres and eras
ALL_DIRECTORS = [
    "Satyajit Ray", "Guru Dutt", "Stanley Kubrick", "David Lynch", "Abbas Kiarostami",
    "Wong Kar-wai", "Andrei Tarkovsky", "Akira Kurosawa", "Agnès Varda", "Ingmar Bergman",
    "Martin Scorsese", "Quentin Tarantino", "Christopher Nolan", "Bong Joon-ho",
    "Denis Villeneuve", "Steven Spielberg", "Ridley Scott", "Hayao Miyazaki",
    "Paul Thomas Anderson", "Wes Anderson", "Alfonso Cuarón", "Guillermo del Toro",
    "Alejandro G. Iñárritu", "David Fincher", "James Cameron", "Peter Jackson",
    "George Miller", "Francis Ford Coppola", "Alfred Hitchcock", "Fritz Lang",
    "Sergio Leone", "John Carpenter", "Sidney Lumet", "Billy Wilder", "Orson Welles",
    "Federico Fellini", "Pedro Almodóvar", "Park Chan-wook", "Hirokazu Kore-eda",
    "S. S. Rajamouli", "Mani Ratnam", "Anurag Kashyap", "Vishal Bhardwaj",
    "Taika Waititi", "Greta Gerwig", "Damien Chazelle", "Edgar Wright", "Jordan Peele",
    "Sam Mendes", "Kathryn Bigelow", "Spike Lee", "Richard Linklater", "Gaspar Noé"
]

TMDB_GENRES = {
    "28": "Action", "12": "Adventure", "16": "Animation", "35": "Comedy", 
    "80": "Crime", "99": "Documentary", "18": "Drama", "10751": "Family", 
    "14": "Fantasy", "36": "History", "27": "Horror", "10402": "Music", 
    "9648": "Mystery", "10749": "Romance", "878": "Sci-Fi", "10770": "TV Movie", 
    "53": "Thriller", "10752": "War", "37": "Western"
}

TMDB_REGIONS = {
    "US": "United States", "IN": "India", "KR": "South Korea", "JP": "Japan", 
    "FR": "France", "IT": "Italy", "ES": "Spain", "GB": "United Kingdom", 
    "DE": "Germany", "IR": "Iran", "HK": "Hong Kong", "MX": "Mexico"
}

def filter_high_quality(results: list) -> list:
    return [r for r in results if r.get("vote_average", 0) >= 7.0 and r.get("vote_count", 0) >= 10]

def safe_requests_get(url: str, headers: dict, retries: int = 3):
    """Wrapper around requests.get with robust retry logic to handle ConnectionResetError (Errno 54)"""
    for attempt in range(retries):
        try:
            res = requests.get(url, headers=headers, timeout=10)
            time.sleep(0.5) # Immediate pace to prevent TMDB IP ban
            return res
        except requests.exceptions.ConnectionError as e:
            logger.warning(f"Connection dropped by TMDB (Attempt {attempt + 1}/{retries}). Sleeping for {2 ** attempt}s...")
            time.sleep(2 ** attempt)
        except Exception as e:
            logger.error(f"Unexpected error fetching {url}: {e}")
            break
            
    # Return a dummy mock response on total failure
    class DummyResponse:
        status_code = 500
        def json(self): return {}
    return DummyResponse()

def fetch_director_movies(director_name: str) -> list:
    # 1. Find Director ID
    search_url = f"https://api.themoviedb.org/3/search/person?query={director_name}&language=en-US&page=1"
    res = safe_requests_get(search_url, headers=tmdb.headers)
    
    if res.status_code != 200:
        return []
        
    person_results = res.json().get("results", [])
    if not person_results:
        return []
        
    person_id = person_results[0].get("id")
    
    # 2. Get Movie Credits and Filter by Job == Director
    credits_url = f"https://api.themoviedb.org/3/person/{person_id}/movie_credits?language=en-US"
    credits_res = safe_requests_get(credits_url, headers=tmdb.headers)
    
    if credits_res.status_code != 200:
        return []
        
    crew = credits_res.json().get("crew", [])
    directorial_movies = [m for m in crew if m.get("job") == "Director"]
    
    # 3. Quality Filter
    return filter_high_quality(directorial_movies)

def search_tmdb_for_discover(with_genres: str = "", with_origin_country: str = "", pages: int = 5):
    results = []
    # Pick random pages to ensure dynamic seeding on every run
    random_pages = random.sample(range(1, 50), pages)
    for page in random_pages:
        url = f"https://api.themoviedb.org/3/discover/movie?language=en-US&sort_by=vote_average.desc&vote_count.gte=100&page={page}"
        if with_genres:
            url += f"&with_genres={with_genres}"
        if with_origin_country:
            url += f"&with_origin_country={with_origin_country}"
        res = safe_requests_get(url, headers=tmdb.headers)
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
    
    # 1. Fetch Master Directors dynamically
    # Pick 15 random directors per run to continually expand the DB without hitting rate limits too hard
    selected_directors = random.sample(ALL_DIRECTORS, min(15, len(ALL_DIRECTORS)))
    for director in selected_directors:
        logger.info(f"Seeding works directed by '{director}'...")
        raw_results = fetch_director_movies(director)
        # Convert to CandidateMedia using TMDB Provider
        candidates = await tmdb._process_results(raw_results, [], limit=100, filter_future=True)
        inserted = insert_to_supabase(candidates)
        total_inserted += inserted
        
    # 2. Add Diverse Global Cinema (Regions)
    selected_regions = random.sample(list(TMDB_REGIONS.keys()), 3)
    for region_code in selected_regions:
        region_name = TMDB_REGIONS[region_code]
        logger.info(f"Seeding high-quality cinema from {region_name} ({region_code})...")
        raw_region = search_tmdb_for_discover(with_origin_country=region_code, pages=3)
        region_cands = await tmdb._process_results(raw_region, [], limit=100, filter_future=True)
        total_inserted += insert_to_supabase(region_cands)
    
    # 3. Add Dynamic Genre Discoveries
    selected_genres = random.sample(list(TMDB_GENRES.keys()), 5)
    for genre_id in selected_genres:
        genre_name = TMDB_GENRES[genre_id]
        logger.info(f"Seeding random pages of Top {genre_name}...")
        raw_genre = search_tmdb_for_discover(with_genres=genre_id, pages=3)
        genre_cands = await tmdb._process_results(raw_genre, [], limit=100, filter_future=True)
        total_inserted += insert_to_supabase(genre_cands)
    
    logger.info(f"Seeding complete! Inserted {total_inserted} new high-quality deep cuts on this run.")

if __name__ == "__main__":
    asyncio.run(seed())
