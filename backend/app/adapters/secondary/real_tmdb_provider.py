import os
import requests
from typing import List, Dict, Optional
from app.domain.models import CandidateMedia, Vector
from app.ports.secondary.media_provider import IMediaProvider
from app.ports.secondary.vector_engine import IVectorEngine

class RealTMDBProvider(IMediaProvider):
    def __init__(self, vector_engine: IVectorEngine):
        self.vector_engine = vector_engine
        self.access_token = os.environ.get("TMDB_ACCESS_TOKEN", "")
        self.headers = {
            "accept": "application/json",
            "Authorization": f"Bearer {self.access_token}"
        }
        self.base_url = "https://api.themoviedb.org/3"
        self.image_base_url = "https://image.tmdb.org/t/p/w500"
        self.backdrop_base_url = "https://image.tmdb.org/t/p/w1280"
        self.cache: Dict[str, CandidateMedia] = {}

    def _fetch_movie(self, movie_id: str) -> dict:
        url = f"{self.base_url}/movie/{movie_id}?language=en-US"
        response = requests.get(url, headers=self.headers)
        if response.status_code == 200:
            return response.json()
        return {}
        
    def get_movie_details(self, movie_id: str) -> Optional[dict]:
        url = f"{self.base_url}/movie/{movie_id}?language=en-US&append_to_response=credits"
        response = requests.get(url, headers=self.headers)
        if response.status_code == 200:
            data = response.json()
            
            # Extract director
            director = "Unknown"
            crew = data.get("credits", {}).get("crew", [])
            for c in crew:
                if c.get("job") == "Director":
                    director = c.get("name")
                    break
                    
            # Extract top 5 cast
            cast = data.get("credits", {}).get("cast", [])
            top_cast = [c.get("name") for c in cast[:5]]
            
            # Parse genres
            genres = [g.get("name") for g in data.get("genres", [])]
            
            poster_path = data.get("poster_path")
            backdrop_path = data.get("backdrop_path")
            
            return {
                "media_id": str(data.get("id")),
                "title": data.get("title", ""),
                "description": data.get("overview", ""),
                "poster_url": f"{self.image_base_url}{poster_path}" if poster_path else "",
                "backdrop_url": f"{self.backdrop_base_url}{backdrop_path}" if backdrop_path else "",
                "tmdb_rating": data.get("vote_average", 0.0),
                "director": director,
                "cast": top_cast,
                "runtime": data.get("runtime", 0),
                "genres": genres,
                "release_date": data.get("release_date", ""),
                "tagline": data.get("tagline", "")
            }
        return None

    def _create_candidate(self, tmdb_data: dict) -> CandidateMedia:
        movie_id = str(tmdb_data.get("id"))
        if movie_id in self.cache:
            return self.cache[movie_id]
            
        title = tmdb_data.get("title", "")
        overview = tmdb_data.get("overview", "")
        genres = ", ".join([g["name"] for g in tmdb_data.get("genres", [])]) if "genres" in tmdb_data else ""
        poster_path = tmdb_data.get("poster_path")
        poster_url = f"{self.image_base_url}{poster_path}" if poster_path else ""
        
        rich_description = f"{overview} Genres: {genres}"
        vec = self.vector_engine.encode_text(rich_description)
        
        candidate = CandidateMedia(
            id=movie_id,
            title=title,
            description=overview,
            poster_url=poster_url,
            vector=vec
        )
        self.cache[movie_id] = candidate
        return candidate

    def get_media_by_ids(self, ids: List[str]) -> List[CandidateMedia]:
        results = []
        for mid in ids:
            if mid in self.cache:
                results.append(self.cache[mid])
            else:
                data = self._fetch_movie(mid)
                if data and "id" in data:
                    results.append(self._create_candidate(data))
        return results
        
    def get_candidates(self, exclude_ids: List[str], limit: int = 50) -> List[CandidateMedia]:
        url = f"{self.base_url}/movie/popular?language=en-US&page=1"
        response = requests.get(url, headers=self.headers)
        candidates = []
        if response.status_code == 200:
            results = response.json().get("results", [])
            for r in results:
                mid = str(r["id"])
                if mid not in exclude_ids:
                    if mid in self.cache:
                        candidates.append(self.cache[mid])
                    else:
                        title = r.get("title", "")
                        overview = r.get("overview", "")
                        poster_path = r.get("poster_path")
                        poster_url = f"{self.image_base_url}{poster_path}" if poster_path else ""
                        
                        vec = self.vector_engine.encode_text(overview)
                        candidate = CandidateMedia(
                            id=mid,
                            title=title,
                            description=overview,
                            poster_url=poster_url,
                            vector=vec
                        )
                        self.cache[mid] = candidate
                        candidates.append(candidate)
                        
                        if len(candidates) >= limit:
                            break
        return candidates

    def search_media(self, query: str) -> List[CandidateMedia]:
        url = f"{self.base_url}/search/movie?query={query}&include_adult=false&language=en-US&page=1"
        response = requests.get(url, headers=self.headers)
        results = []
        if response.status_code == 200:
            for r in response.json().get("results", [])[:10]:
                mid = str(r["id"])
                if mid in self.cache:
                    results.append(self.cache[mid])
                else:
                    title = r.get("title", "")
                    overview = r.get("overview", "")
                    poster_path = r.get("poster_path")
                    poster_url = f"{self.image_base_url}{poster_path}" if poster_path else ""
                    
                    vec = self.vector_engine.encode_text(overview)
                    candidate = CandidateMedia(
                        id=mid,
                        title=title,
                        description=overview,
                        poster_url=poster_url,
                        vector=vec
                    )
                    self.cache[mid] = candidate
                    results.append(candidate)
        return results
        
    def get_latest_movies(self) -> List[CandidateMedia]:
        url = f"{self.base_url}/movie/now_playing?language=en-US&page=1"
        response = requests.get(url, headers=self.headers)
        results = []
        if response.status_code == 200:
            for r in response.json().get("results", [])[:10]:
                mid = str(r["id"])
                if mid in self.cache:
                    results.append(self.cache[mid])
                else:
                    title = r.get("title", "")
                    overview = r.get("overview", "")
                    poster_path = r.get("poster_path")
                    poster_url = f"{self.image_base_url}{poster_path}" if poster_path else ""
                    
                    vec = self.vector_engine.encode_text(overview)
                    candidate = CandidateMedia(
                        id=mid,
                        title=title,
                        description=overview,
                        poster_url=poster_url,
                        vector=vec
                    )
                    self.cache[mid] = candidate
                    results.append(candidate)
        return results
