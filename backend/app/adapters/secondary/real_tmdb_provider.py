import os
import random
import datetime
import httpx
import asyncio
from typing import List, Dict, Optional
from app.domain.models import CandidateMedia, Vector
from app.ports.secondary.media_provider import IMediaProvider
from app.ports.secondary.vector_engine import IVectorEngine

VIBE_MAP = {
    "28": "Adrenaline-fueled",  # Action
    "12": "Epic",  # Adventure
    "16": "Animated",  # Animation
    "35": "Hilarious",  # Comedy
    "80": "Gritty",  # Crime
    "99": "Real",  # Documentary
    "18": "Emotional",  # Drama
    "10751": "Wholesome",  # Family
    "14": "Magical",  # Fantasy
    "36": "Historic",  # History
    "27": "Terrifying",  # Horror
    "10402": "Musical",  # Music
    "9648": "Mysterious",  # Mystery
    "10749": "Romantic",  # Romance
    "878": "Futuristic",  # Sci-Fi
    "10770": "TV Movie",
    "53": "Tense",  # Thriller
    "10752": "War-torn",  # War
    "37": "Western",  # Western
}


class RealTMDBProvider(IMediaProvider):
    def __init__(self, vector_engine: IVectorEngine):
        self.vector_engine = vector_engine
        self.access_token = os.environ.get("TMDB_ACCESS_TOKEN", "")
        self.headers = {
            "accept": "application/json",
            "Authorization": f"Bearer {self.access_token}",
        }
        self.base_url = "https://api.themoviedb.org/3"
        self.image_base_url = "https://image.tmdb.org/t/p/w500"
        self.backdrop_base_url = "https://image.tmdb.org/t/p/w1280"
        from diskcache import Cache

        self.cache = Cache("./tmdb_cache")

    def _get_vibe_tag(self, genre_ids: List[int], genres_data: List[dict]) -> str:
        if genres_data:
            ids = [str(g.get("id")) for g in genres_data]
            names = [g.get("name", "") for g in genres_data]
        else:
            ids = [str(gid) for gid in genre_ids]
            names = []

        if not ids:
            return "Unknown Vibe"

        first_id = ids[0]
        adj = VIBE_MAP.get(first_id, "")

        # If we have a second genre, use it as the noun, else use the first genre's name
        noun = ""
        if len(ids) > 1 and len(names) > 1:
            noun = names[1]
        elif len(names) > 0:
            noun = names[0]
        else:
            noun = "Journey"

        if adj and noun:
            return f"{adj} {noun}"
        elif adj:
            return f"{adj} Vibe"
        elif noun:
            return noun
        return "Unknown Vibe"

    async def _safe_get(self, url: str):
        try:
            async with httpx.AsyncClient() as client:
                return await client.get(url, headers=self.headers, timeout=5.0)
        except httpx.RequestError as e:
            print(f"TMDB Network Error: {e}")

            class DummyResponse:
                status_code = 500

                def json(self):
                    return {}

            return DummyResponse()

    async def _fetch_movie(self, movie_id: str) -> dict:
        url = f"{self.base_url}/movie/{movie_id}?language=en-US"
        response = await self._safe_get(url)
        if response.status_code == 200:
            return response.json()
        return {}

    async def get_movie_details(self, movie_id: str) -> Optional[dict]:
        url = f"{self.base_url}/movie/{movie_id}?language=en-US&append_to_response=credits"
        response = await self._safe_get(url)
        if response.status_code == 200:
            data = response.json()

            director = "Unknown"
            crew = data.get("credits", {}).get("crew", [])
            for c in crew:
                if c.get("job") == "Director":
                    director = c.get("name")
                    break

            cast = data.get("credits", {}).get("cast", [])
            top_cast = [c.get("name") for c in cast[:5]]

            genres = [g.get("name") for g in data.get("genres", [])]

            poster_path = data.get("poster_path")
            backdrop_path = data.get("backdrop_path")

            return {
                "media_id": str(data.get("id")),
                "title": data.get("title", ""),
                "description": data.get("overview", ""),
                "poster_url": (
                    f"{self.image_base_url}{poster_path}" if poster_path else ""
                ),
                "backdrop_url": (
                    f"{self.backdrop_base_url}{backdrop_path}" if backdrop_path else ""
                ),
                "tmdb_rating": data.get("vote_average", 0.0),
                "director": director,
                "cast": top_cast,
                "runtime": data.get("runtime", 0),
                "genres": genres,
                "release_date": data.get("release_date", ""),
                "tagline": data.get("tagline", ""),
            }
        return None

    async def _create_candidate(self, tmdb_data: dict) -> CandidateMedia:
        movie_id = str(tmdb_data.get("id"))
        if movie_id in self.cache:
            return self.cache[movie_id]

        title = tmdb_data.get("title", "")
        overview = tmdb_data.get("overview", "")
        genres = (
            ", ".join([g["name"] for g in tmdb_data.get("genres", [])])
            if "genres" in tmdb_data
            else ""
        )
        poster_path = tmdb_data.get("poster_path")
        poster_url = f"{self.image_base_url}{poster_path}" if poster_path else ""

        vibe_tag = self._get_vibe_tag([], tmdb_data.get("genres", []))

        rich_description = f"{overview} Genres: {genres}"
        vec = await asyncio.to_thread(self.vector_engine.encode_text, rich_description)

        candidate = CandidateMedia(
            id=movie_id,
            title=title,
            description=overview,
            poster_url=poster_url,
            vector=vec,
            vibe_tag=vibe_tag,
        )
        self.cache[movie_id] = candidate
        return candidate

    async def get_media_by_ids(self, ids: List[str]) -> List[CandidateMedia]:
        results = []
        for mid in ids:
            if mid in self.cache:
                results.append(self.cache[mid])
            else:
                data = await self._fetch_movie(mid)
                if data and "id" in data:
                    results.append(await self._create_candidate(data))
        return results

    async def _process_results(
        self,
        results: List[dict],
        exclude_ids: List[str],
        limit: int,
        filter_future: bool = True,
    ) -> List[CandidateMedia]:
        candidates = []
        seen_mids = set()
        today_str = datetime.datetime.now().strftime("%Y-%m-%d")

        for r in results:
            mid = str(r["id"])
            if mid in exclude_ids or mid in seen_mids:
                continue
            seen_mids.add(mid)

            # Filter out future releases for recommendations
            release_date = r.get("release_date", "")
            if filter_future and release_date and release_date > today_str:
                continue

            if mid in self.cache:
                candidates.append(self.cache[mid])
            else:
                title = r.get("title", "")
                overview = r.get("overview", "")
                poster_path = r.get("poster_path")
                poster_url = (
                    f"{self.image_base_url}{poster_path}" if poster_path else ""
                )

                vibe_tag = self._get_vibe_tag(r.get("genre_ids", []), [])

                vec = await asyncio.to_thread(self.vector_engine.encode_text, overview)
                candidate = CandidateMedia(
                    id=mid,
                    title=title,
                    description=overview,
                    poster_url=poster_url,
                    vector=vec,
                    vibe_tag=vibe_tag,
                )
                self.cache[mid] = candidate
                candidates.append(candidate)

            if len(candidates) >= limit:
                break
        return candidates

    async def get_candidates_for_vibe(
        self, seed_movies: List[CandidateMedia], exclude_ids: List[str], limit: int = 50
    ) -> List[CandidateMedia]:
        genre_ids = []
        for seed in seed_movies:
            data = await self._fetch_movie(seed.id)
            if data and "genres" in data:
                genre_ids.extend([str(g["id"]) for g in data["genres"]])

        unique_genres = list(set(genre_ids))
        genre_query = "|".join(unique_genres[:3])

        page = random.randint(1, 5)

        url = f"{self.base_url}/discover/movie?language=en-US&page={page}"
        if genre_query:
            url += f"&with_genres={genre_query}"

        response = await self._safe_get(url)
        if response.status_code == 200:
            return await self._process_results(
                response.json().get("results", []),
                exclude_ids,
                limit,
                filter_future=True,
            )
        return []

    async def get_candidates_for_mood(
        self, mood_text: str, exclude_ids: List[str], limit: int = 50
    ) -> List[CandidateMedia]:
        # 1. Search TMDB Keyword database using the mood text (ignoring movie titles)
        keyword_url = f"{self.base_url}/search/keyword?query={mood_text}&page=1"
        response = await self._safe_get(keyword_url)
        keyword_ids = []
        if response.status_code == 200:
            k_results = response.json().get("results", [])
            keyword_ids = [str(k["id"]) for k in k_results[:2]]

        results = []

        # 2. If keywords found, discover movies with those tags
        if keyword_ids:
            with_keywords = "|".join(keyword_ids)
            disc_url = f"{self.base_url}/discover/movie?language=en-US&page=1&with_keywords={with_keywords}"
            disc_res = await self._safe_get(disc_url)
            if disc_res.status_code == 200:
                results.extend(disc_res.json().get("results", []))

        # 3. Always mix in a popular page to ensure we have enough fallback candidates
        page = random.randint(1, 3)
        pop_url = f"{self.base_url}/movie/popular?language=en-US&page={page}"
        pop_res = await self._safe_get(pop_url)
        if pop_res.status_code == 200:
            results.extend(pop_res.json().get("results", []))

        return await self._process_results(
            results, exclude_ids, limit, filter_future=True
        )

    async def get_candidates_for_similar(
        self, media_id: str, exclude_ids: List[str], limit: int = 50
    ) -> List[CandidateMedia]:
        url = f"{self.base_url}/movie/{media_id}/recommendations?language=en-US&page=1"
        response = await self._safe_get(url)
        results = []
        if response.status_code == 200:
            results.extend(response.json().get("results", []))

        if len(results) < limit:
            sim_url = f"{self.base_url}/movie/{media_id}/similar?language=en-US&page=1"
            sim_res = await self._safe_get(sim_url)
            if sim_res.status_code == 200:
                results.extend(sim_res.json().get("results", []))

        return await self._process_results(
            results, exclude_ids, limit, filter_future=True
        )

    async def search_media(self, query: str) -> List[CandidateMedia]:
        url = f"{self.base_url}/search/movie?query={query}&include_adult=false&language=en-US&page=1"
        response = await self._safe_get(url)
        if response.status_code == 200:
            return await self._process_results(
                response.json().get("results", []), [], 10, filter_future=False
            )
        return []

    async def get_latest_movies(self) -> List[CandidateMedia]:
        today = datetime.datetime.now().strftime("%Y-%m-%d")
        last_month = (datetime.datetime.now() - datetime.timedelta(days=30)).strftime(
            "%Y-%m-%d"
        )
        url = f"{self.base_url}/discover/movie?language=en-US&page=1&primary_release_date.gte={last_month}&primary_release_date.lte={today}&sort_by=popularity.desc"

        response = await self._safe_get(url)
        if response.status_code == 200:
            return await self._process_results(
                response.json().get("results", []), [], 10, filter_future=True
            )
        return []

    async def get_upcoming_movies(self) -> List[CandidateMedia]:
        # Only fetch movies strictly in the future
        today = (datetime.datetime.now() + datetime.timedelta(days=1)).strftime(
            "%Y-%m-%d"
        )
        next_month = (datetime.datetime.now() + datetime.timedelta(days=60)).strftime(
            "%Y-%m-%d"
        )
        url = f"{self.base_url}/discover/movie?language=en-US&page=1&primary_release_date.gte={today}&primary_release_date.lte={next_month}&sort_by=popularity.desc"

        response = await self._safe_get(url)
        if response.status_code == 200:
            return await self._process_results(
                response.json().get("results", []), [], 10, filter_future=False
            )
        return []
