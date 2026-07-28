# AGENTS.md - OmniLog Project Rules

## 1. Project Overview

OmniLog is a highly personalized, privacy-first mobile application for logging movies and books. It uses a custom vector-based vibe algorithm to suggest 7 weekly recommendations.

## 2. Tech Stack & Boundaries

- **Frontend Framework:** React Native with Expo.
- **Styling (STRICT NO TAILWIND):** Do NOT use NativeWind, Tailwind, or inline un-memoized styles. All styling MUST be done using React Native's `StyleSheet.create`.
- **Icons (STRICT NO EMOJIS):** Emojis are strictly forbidden in the UI. Use `lucide-react-native` for all iconography.
- **Local Database:** `expo-sqlite` (using the modern synchronous API).
- **Backend:** Python 3.12+ with FastAPI. The backend is 100% STATELESS. It connects to TMDB/OpenLibrary, calculates vector embeddings using `sentence-transformers`, and returns JSON. No user data is ever stored in the cloud.

## 3. UI/UX Design System: Dark Glassmorphism

- **Theme:** Strict Dark Mode ONLY. Do not write light-mode toggle logic.
- **Backgrounds:** The root app background should be a deep, rich dark color (e.g., `#050505`) or an abstract dark mesh gradient image.
- **Cards/Containers:** Use `expo-blur` (`<BlurView tint="dark" intensity={40}>`) for all floating elements, navigation bars, and media cards.
- **Borders:** All glass cards must have a 1px border of `rgba(255, 255, 255, 0.1)` and a subtle `borderRadius` of `16` to `24`.

## 4. The Rating System Constraint

Standard 5-star ratings are BANNED. You must use the exact 4-tier naming convention below, paired with specific Lucide icons:

1. `lame` (Lucide `ThumbsDown`)
2. `okay` (Lucide `Minus` or `Meh`)
3. `freaking` (Lucide `Sparkles` or `Flame`)
4. `Absolute cinema` (Lucide `Clapperboard` or `Projector`)

## 5. Execution Principles

- Do not introduce deprecated Expo APIs (e.g., avoid `expo-av`, use `expo-audio` / `expo-video` for SDK 57+).
- Keep the FastAPI service completely stateless: pass payload vectors explicitly rather than maintaining backend session state.
