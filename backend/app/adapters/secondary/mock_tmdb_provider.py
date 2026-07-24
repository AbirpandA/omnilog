from typing import List, Dict
from app.domain.models import CandidateMedia, Vector
from app.ports.secondary.media_provider import IMediaProvider
from app.ports.secondary.vector_engine import IVectorEngine

# Hardcoded catalog to demonstrate the Vibe Algorithm matching specific moods
MOCK_DATABASE = [
    {
        "id": "tt1",
        "title": "Her",
        "description": "A lonely writer develops an unlikely relationship with an operating system designed to meet his every need. Keywords: artificial intelligence, loneliness, neo-noir, near future, melancholy, longing, neon aesthetics."
    },
    {
        "id": "tt2",
        "title": "Lost in Translation",
        "description": "A faded movie star and a neglected young woman form an unlikely bond after crossing paths in Tokyo. Keywords: Tokyo, isolation, unspoken connection, alienation, mid-life crisis, platonic love, melancholy, neon aesthetics."
    },
    {
        "id": "tt3",
        "title": "In the Mood for Love",
        "description": "Two neighbors form a strong bond after both suspect extramarital activities of their spouses. Keywords: 1960s Hong Kong, unrequited love, unspoken connection, melancholy, loneliness, rich colors, missed opportunities, yearning."
    },
    {
        "id": "tt4",
        "title": "Perfect Days",
        "description": "A janitor in Tokyo lives a structured, peaceful life, finding beauty in the everyday moments. Keywords: Tokyo, solitude, finding beauty in small things, quiet, reflective, slice of life, peaceful."
    },
    {
        "id": "tt5",
        "title": "Moonlight",
        "description": "A chronicle of the childhood, adolescence and burgeoning adulthood of a young, African-American, gay man growing up in a rough neighborhood of Miami. Keywords: identity, coming of age, sexuality, vulnerability, emotional, atmospheric, self-discovery."
    },
    {
        "id": "tt6",
        "title": "Aftersun",
        "description": "Sophie reflects on the shared joy and private melancholy of a holiday she took with her father twenty years earlier. Keywords: memory, grief, father-daughter relationship, nostalgic, quiet tragedy, subtle, atmospheric, emotional, coming of age."
    },
    {
        "id": "tt7",
        "title": "The Matrix",
        "description": "A computer hacker learns from mysterious rebels about the true nature of his reality and his role in the war against its controllers. Keywords: cyber-punk, action, simulation, martial arts, sci-fi."
    }
]

class MockTMDBProvider(IMediaProvider):
    """
    A mock provider for testing the Vibe algorithm. 
    It pre-computes vectors for the mock database using the injected vector engine.
    """
    def __init__(self, vector_engine: IVectorEngine):
        self.vector_engine = vector_engine
        self.cache: Dict[str, CandidateMedia] = {}
        self._initialize_cache()
        
    def _initialize_cache(self):
        print("Pre-computing vectors for Mock TMDB Provider...")
        for item in MOCK_DATABASE:
            vec = self.vector_engine.encode_text(item["description"])
            self.cache[item["id"]] = CandidateMedia(
                id=item["id"],
                title=item["title"],
                description=item["description"],
                vector=vec
            )
            
    def get_media_by_ids(self, ids: List[str]) -> List[CandidateMedia]:
        return [self.cache[i] for i in ids if i in self.cache]
        
    def get_candidates(self, exclude_ids: List[str], limit: int = 50) -> List[CandidateMedia]:
        candidates = []
        for media_id, media in self.cache.items():
            if media_id not in exclude_ids:
                candidates.append(media)
        return candidates[:limit]
