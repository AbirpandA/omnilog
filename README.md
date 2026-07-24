# OmniLog

OmniLog is a privacy-first, highly personalized mobile application for cataloging movies, television shows, and books. The system leverages a local-first architecture coupled with a stateless microservice to deliver intelligent, vector-based recommendations without compromising user privacy.

## Architecture Overview

The system is composed of two primary layers:

### 1. Mobile Client (React Native & Expo)
- **Framework:** React Native managed via Expo.
- **Persistence:** Local `expo-sqlite` (using the modern synchronous API). All user logs, ratings, and preferences are stored exclusively on the device.
- **Styling:** Custom StyleSheet logic implementing a dark-mode glassmorphism design language using `expo-blur`. Third-party utility classes (e.g., Tailwind, NativeWind) are strictly prohibited.
- **Iconography:** `lucide-react-native` is the sole standard for icons.

### 2. Recommendation Microservice (FastAPI)
- **Framework:** Python 3.12+ with FastAPI.
- **State Management:** 100% Stateless. The service accepts an array of integer IDs representing the user's high-rated media, retrieves associated metadata from TMDB/OpenLibrary, and computes semantic similarities.
- **Machine Learning Engine:** Utilizes `sentence-transformers/all-MiniLM-L6-v2` to convert plot, director, visual style, and emotional tone into 384-dimensional vectors. Recommendations are ranked via cosine similarity against the centroid vector of the user's seed items.

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
