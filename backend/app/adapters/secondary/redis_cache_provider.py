import redis.asyncio as redis
import json
import dataclasses
from typing import Optional
from app.domain.models import CandidateMedia
from app.ports.secondary.cache_provider import ICacheProvider

class RedisCacheProvider(ICacheProvider):
    def __init__(self, redis_url: str = "redis://localhost:6379"):
        # Initialize the async redis client here
        self.client = redis.from_url(redis_url, decode_responses=True)

    async def get(self, media_id: str) -> Optional[CandidateMedia]:
        try:
            cache_data = await self.client.get(media_id)
            
            # If it exists, use json.loads() and convert it back to a CandidateMedia object
            if cache_data:
                data_dict = json.loads(cache_data)
                # Reconstruct the nested Vector object
                if "vector" in data_dict and data_dict["vector"]:
                    from app.domain.models import Vector
                    data_dict["vector"] = Vector(**data_dict["vector"])
                return CandidateMedia(**data_dict)
            return None
        except redis.ConnectionError:
            return None

    async def set(self, media_id: str, candidate: CandidateMedia, ttl_seconds: int = 3600) -> None:
        try:
            # CandidateMedia is a dataclass, so we use dataclasses.asdict() instead of .dict()
            cache_data = json.dumps(dataclasses.asdict(candidate))
            await self.client.setex(name=media_id, time=ttl_seconds, value=cache_data)
        except redis.ConnectionError:
            pass

    async def exists(self, media_id: str) -> bool:
        try:
            return await self.client.exists(media_id) > 0
        except redis.ConnectionError:
            return False
