# OmniLog

OmniLog is a privacy-first, highly personalized mobile application for cataloging movies, television shows, and books. The system leverages a local-first architecture coupled with a stateless microservice to deliver intelligent, vector-based recommendations without compromising user privacy.

## System Architecture

```mermaid
graph TD
    %% Mobile Client Components
    subgraph "Mobile Client (React Native + Expo)"
        UI[UI Components]
        LocalDB[(SQLite Local DB)]
        Cache[(AsyncStorage Cache)]
        Query[React Query Persist Client]
        
        UI <--> Query
        Query <--> Cache
        UI <--> LocalDB
    end

    %% Backend Service
    subgraph "OmniLog API (FastAPI)"
        API[API Router]
        UseCase[Use Cases / Logic]
        
        subgraph "Hybrid Media Provider"
            Deco[SupabaseMediaProvider (Decorator)]
            TMDB[RealTMDBProvider]
        end
        
        VectorEngine[SentenceTransformer\n(all-MiniLM-L6-v2)]
        SyncTask[Background Sync Worker]
        
        API --> UseCase
        UseCase --> Deco
        Deco --> TMDB
        Deco <--> VectorEngine
        SyncTask --> TMDB
        SyncTask --> Deco
    end

    %% External Systems
    subgraph "External Providers"
        Supabase[(Supabase pgvector)]
        TMDB_API((TMDB API))
    end

    %% Flow Connections
    Query <-->|Stateless HTTP Requests\n(IDs only)| API
    Deco <-->|Semantic Search\n(match_movies RPC)| Supabase
    TMDB <-->|REST API| TMDB_API
    SyncTask -.->|Automated Pollination| Supabase
```

The system is composed of two primary layers:

### 1. Mobile Client (React Native & Expo)

- **Framework:** React Native managed via Expo.
- **Offline High-Availability:** Integrates `@tanstack/react-query-persist-client` backed by `AsyncStorage` to cache all API responses. The app remains fully functional in offline mode, rendering the library and past recommendations from the local cache.
- **Persistence (Local DB):** Local `expo-sqlite` (using the modern synchronous API). All user logs, ratings, and preferences are stored exclusively on the device to guarantee absolute privacy.
- **Styling:** Custom StyleSheet logic implementing a dark-mode glassmorphism design language using `expo-blur`. Third-party utility classes (e.g., Tailwind) are strictly prohibited to ensure a premium, customized aesthetic.
- **Iconography:** `lucide-react-native` is the sole standard for icons.

### 2. Deep Catalog Backend (FastAPI + Supabase)

- **Framework:** Python 3.12+ with FastAPI.
- **Hybrid Data Retrieval (Decorator Pattern):** 
  - **Live Fallback (`RealTMDBProvider`):** Direct connection to TMDB for fetching fresh releases ("Upcoming", "Trending Worldwide"). Integrated with `diskcache` to ensure microsecond latency.
  - **Vector DB (`SupabaseMediaProvider`):** Acts as a decorator over TMDB. Uses Supabase with `pgvector` to store a massive, user-driven catalog of curated niche movies (Master Directors, obscure genres).
- **Vibe Match Engine:** When a user requests recommendations, the backend retrieves the semantic metadata of their highly-rated movies, embeds them into a 384-dimensional vector via `all-MiniLM-L6-v2`, and queries the Supabase vector DB using cosine similarity (`match_movies` RPC).
- **Autonomous Pollination:** Contains a background worker (`SyncMoviesUseCase`) and seeding scripts to continuously ingest new diverse movies into the Supabase Vector DB.
- **Stateless Operations:** The backend stores zero user state. Privacy is enforced by requiring the client to send anonymous integer IDs for vector calculation.

## Database Schema (Local SQLite)

The local persistence layer stores two main entities:
- **MediaItems:** Core metadata (ID, title, type, poster URI, release year, runtime, and directors/authors).
- **UserReactions:** A specialized 4-tier rating system mapped to numeric weights:
  - `lame` (-2.0)
  - `okay` (0.0)
  - `freaking` (1.0)
  - `Absolute cinema` (2.0)

## Getting Started

### Prerequisites
- Node.js (v18+)
- Python (3.12+)
- Expo CLI
- iOS Simulator or Android Emulator

### Mobile Setup
1. Navigate to the mobile directory.
2. Install dependencies via `npm install`.
3. Start the Metro bundler using `npx expo start`.

### Backend Setup
1. Navigate to the backend directory.
2. Create and activate a virtual environment.
3. Install dependencies via `pip install -r requirements.txt`.
4. Start the FastAPI server using `uvicorn main:app --reload`.

## Development Principles

- **No Cloud Storage:** User data must never leave the device except as anonymous integer arrays during recommendation requests.
- **Strict Theming:** The application supports dark mode exclusively.
- **Stateless Operations:** The backend must rely entirely on the payload parameters and internal caches, avoiding any session or user-level persistence.
