# OmniLog: Advanced Development Roadmap

This document serves as the master blueprint for the OmniLog project, outlining the entire architectural vision and the step-by-step phases of development.

## Core Architectural Philosophy
OmniLog is built on a hybrid architecture designed for extreme privacy and infinite scalability:
1. **The Monolithic Mobile Client (Local-First):** The React Native app acts as a highly cohesive monolith. All user data, ratings, and logs are stored exclusively on the device using a local SQLite database. The app can be used completely offline.
2. **The Hexagonal Backend (Stateless AI Proxy):** A FastAPI Python backend built using Ports & Adapters (Hexagonal Architecture). It stores zero user state and acts purely as a lightning-fast mathematical engine for discovering new media.

## The Recommendation Engine (How it works)
We completely bypass generic collaborative filtering (e.g., "users who liked X also liked Y"). Instead, we use **Semantic Text Embeddings**.
- **Data Sourcing:** We fetch rich metadata (plot, keywords, emotional tones, director styles) from the TMDB API.
- **Vectorization:** The backend uses `sentence-transformers/all-MiniLM-L6-v2` to convert this text into a 384-dimensional mathematical coordinate (a vector).
- **The "Vibe" Match:** When a user wants recommendations, their phone sends a small, anonymous list of movie IDs they rated highly (e.g., *Her* and *Lost in Translation*). The backend calculates the **Centroid** (the exact mathematical average) of these movies. It then uses **Cosine Similarity** against a massive Vector Database (like FAISS or Qdrant) to find movies that occupy the exact same emotional and atmospheric space (e.g., *In the Mood for Love*).

---

## Development Phases

### Phase 1: Mobile UI & Monolithic Foundations (✅ COMPLETED)
- **Goal:** Establish the strictly-typed TypeScript frontend and local persistence layer.
- **Key Deliverables:**
  - Migrated the Expo React Native app to TypeScript.
  - Initialized the raw `expo-sqlite` database (`media_items` and `user_reactions` tables).
  - Built the `LibraryScreen` with a Dark Glassmorphism aesthetic (`expo-blur`).
  - Integrated `lucide-react-native` for the 4-tier rating system icons.
  - Established the unified Tab Navigation routing.

### Phase 2: Backend Hexagonal Core (✅ COMPLETED)
- **Goal:** Build the pure mathematical brain of the backend, completely isolated from HTTP or external APIs.
- **Key Deliverables:**
  - Initialized the Hexagonal directory structure (`domain`, `ports`, `adapters`, `use_cases`).
  - Defined Python domain models (`Vector`, `CandidateMedia`).
  - Defined abstract interfaces (`IVectorEngine`, `IMediaProvider`).
  - Built the `VibeRecommendationUseCase` to handle Centroid calculations and Cosine Similarity scoring.

### Phase 3: Backend Adapters & Delivery (▶️ CURRENT PHASE)
- **Goal:** Write the concrete implementations for the backend and expose them via FastAPI.
- **Key Deliverables:**
  - Implement `SentenceTransformerAdapter` (Vector Engine).
  - Implement `TMDBProviderAdapter` (Media Provider) to fetch real movie data.
  - Setup a Vector Database (or an in-memory FAISS cache for MVP) to ensure massive horizontal scalability.
  - Build the FastAPI routers (`/api/recommend`) utilizing Dependency Injection.

### Phase 4: Full System Integration & Polish (✅ COMPLETED)
- **Goal:** Connect the mobile app to the living backend.
- **Key Deliverables:**
  - Build the `SearchScreen` UI on mobile to let users query the TMDB proxy and log real movies.
  - Build the `DiscoverScreen` UI to trigger the weekly "Vibe" recommendations.
  - End-to-end testing, ensuring the app loads data instantly from SQLite and gracefully handles network requests to the stateless backend.

### Phase 5: Production Ready Features (✅ COMPLETED)
- **Goal:** Implement real API integration and UI polish.
- **Key Deliverables:**
  - Implement Real TMDB API Integration (`RealTMDBProvider`).
  - Fix Android Emulator networking (use `10.0.2.2`).
  - Create `DetailsScreen.tsx` for movie plots, genres, and ratings.
  - Replace 'freaking' with 'pure gold' in rating schema.
  - Build floating glassmorphic Navigation Bar using `expo-blur`.
  - Apply performance optimizations (FlatList, optimized blur).
