# REQUIREMENTS.md

## 1. Core User Flows

### 1.1 Media Logging (Offline First)

- The user can search for a movie, TV show, or book.
- The search query hits the stateless FastAPI backend, which proxies TMDB/OpenLibrary and returns standard JSON.
- The user logs the item into their local `expo-sqlite` database.
- The user assigns a reaction (`lame`, `okay`, `freaking`, `Absolute cinema`).
- The user can optionally add private text notes and tag the item with predefined vibe tags (e.g., `Atmospheric`, `Slow Burn`).

### 1.2 The "Weekly 7" Recommendation Engine

- The app features a dedicated "Discover" tab.
- When requested, the mobile app queries SQLite for the IDs of media the user has marked as `freaking` or `Absolute cinema`.
- The app sends a lightweight JSON payload of these `seed_ids` and `ignored_ids` to the FastAPI backend.
- The backend returns exactly 7 highly personalized recommendations based on semantic vector similarity (Vibe Matching).

### 1.3 Recent Releases Filter

- The user can toggle a "Fresh Releases Only" filter on the Discover tab.
- This forces the backend to only consider movies released within the last 90 days when calculating the Weekly 7.

## 2. Non-Functional Requirements

- **Performance:** App must load local logs instantly. Use React Native `FlatList` with optimized `getItemLayout` for scrolling large libraries.
- **Privacy:** No account creation. No OAuth. No JWTs. The user's taste profile is derived locally on the device and only sent as an anonymous array of integers during a recommendation request.
- **Aesthetics:** The UI must feel premium, using glassmorphism overlays on top of high-resolution movie posters fetched from TMDB.
