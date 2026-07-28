import time
from typing import List
from loguru import logger
from app.adapters.secondary.real_tmdb_provider import RealTMDBProvider
from app.adapters.secondary.supabase_media_provider import SupabaseMediaProvider

class SyncMoviesUseCase:
    """
    Background worker use case for continuous sync of fresh movies into the Deep Catalog (Supabase).
    This enables User-Driven Dynamic Indexing and fresh catalog updates.
    """
    
    def __init__(self, tmdb_provider: RealTMDBProvider, supabase_provider: SupabaseMediaProvider):
        self.tmdb = tmdb_provider
        self.supabase = supabase_provider

    def sync_trending_movies(self):
        """
        Fetches the latest and upcoming movies from TMDB and indexes them into Supabase.
        This should be run on a cron job or background thread daily.
        """
        if not self.supabase.client:
            logger.warning("Supabase client not configured. Skipping sync.")
            return

        logger.info("Starting background sync for trending movies...")
        try:
            latest = self.tmdb.get_latest_movies()
            upcoming = self.tmdb.get_upcoming_movies()
            all_candidates = latest + upcoming
            
            inserted = 0
            for candidate in all_candidates:
                # 1. Check if movie already exists in DB
                res = self.supabase.client.table("movies").select("id").eq("id", candidate.id).execute()
                if not res.data:
                    # 2. Insert if missing
                    self.supabase.client.table("movies").insert({
                        "id": candidate.id,
                        "title": candidate.title,
                        "description": candidate.description,
                        "poster_url": candidate.poster_url,
                        "vibe_tag": candidate.vibe_tag,
                        "embedding": candidate.vector.dimensions
                    }).execute()
                    inserted += 1
                    
            logger.info(f"Background sync complete. Added {inserted} new movies to Deep Catalog.")
            
        except Exception as e:
            logger.error(f"Background sync failed: {e}")
