# OmniLog — System Architecture & Specs

## 1. Directory Structure (Monorepo)

omnilog/
├── apps/
│   └── mobile/                       # React Native (Expo SDK 57)
│       ├── app/                      # Expo Router Routes
│       │   ├── (tabs)/
│       │   │   ├── index.tsx         # Feed / Dashboard
│       │   │   ├── library.tsx       # Media Library
│       │   │   └── recommendations.tsx
│       │   └── media/[id].tsx        # Media Detail Screen
│       └── src/
│           ├── features/             # Feature-First Architecture
│           │   ├── media/
│           │   ├── reactions/
│           │   └── recommendations/
│           ├── core/                 # Shared Mobile Core
│           │   ├── db/               # SQLite Schema & Drizzle Setup
│           │   └── theme/            # Glassmorphism Tokens & UI
│           └── components/           # UI Primitives
├── services/
│   └── rec-engine/                   # FastAPI Microservice
│       ├── app/
│       │   ├── main.py               # FastAPI App Entrypoint
│       │   ├── vector.py             # Cosine similarity logic
│       │   └── schemas.py            # Pydantic models
│       ├── Dockerfile
│       └── requirements.txt
└── packages/
└── shared-types/                 # Shared TypeScript Types

## 2. The Glassmorphism UI Implementation (React Native)

To achieve the clean, minimal, dark-glass look without Tailwind, the agent must compose components using `expo-blur`.

**Standard Glass Card Component Pattern:**

```tsx
import { StyleSheet, View, Text } from 'react-native';
import { BlurView } from 'expo-blur';
import { Clapperboard } from 'lucide-react-native';

export const GlassMediaCard = ({ title, reaction }) => (
  <View style="{styles.shadowWrapper}">
    <BlurView intensity="{45}" style="{styles.glassContainer}" tint="dark">
      <Clapperboard color="rgba(255,255,255,0.8)" size="{24}"/>
      <Text style="{styles.titleText}">{title}</Text>
    </BlurView>
  </View>
);

**Standard Glass Card Component Pattern:**
```tsx
import { StyleSheet, View, Text } from 'react-native';
import { BlurView } from 'expo-blur';
import { Clapperboard } from 'lucide-react-native';

export const GlassMediaCard = ({ title, reaction }) => (
  <View style="{styles.shadowWrapper}">
    <BlurView intensity="{45}" style="{styles.glassContainer}" tint="dark">
      <Clapperboard color="rgba(255,255,255,0.8)" size="{24}"/>
      <Text style="{styles.titleText}">{title}</Text>
    </BlurView>
  </View>
);

const styles = StyleSheet.create({
  shadowWrapper: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 15,
    elevation: 10,
  },
  glassContainer: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    padding: 16,
    overflow: 'hidden',
    backgroundColor: 'rgba(20, 20, 20, 0.3)', // Deep tint backing
  },
  titleText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: 0.5,
  }
});

const styles = StyleSheet.create({
  shadowWrapper: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 15,
    elevation: 10,
  },
  glassContainer: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    padding: 16,
    overflow: 'hidden',
    backgroundColor: 'rgba(20, 20, 20, 0.3)', // Deep tint backing
  },
  titleText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: 0.5,
  }
});```

## 2. Local Database Schema (SQLite / Drizzle)

```ts
// src/core/db/schema.ts
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const mediaItems = sqliteTable('media_items', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  type: text('type').notNull(), // 'BOOK' | 'MOVIE' | 'ANIME' | 'GAME'
  coverUrl: text('cover_url'),
  summary: text('summary'),
  createdAt: integer('created_at').notNull(),
});

export const userReactions = sqliteTable('user_reactions', {
  id: text('id').primaryKey(),
  mediaId: text('media_id').references(() => mediaItems.id),
  reaction: text('reaction').notNull(), // 'LOVED' | 'LIKED' | 'OKAY' | 'DISLIKED'
  updatedAt: integer('updated_at').notNull(),
});```

Reaction Weight Mapping:

lame = -2.0

okay = 0.0

freaking = 1.0

Absolute cinema = 2.0

3. The "Vibe Vector" Recommendation Algorithm (FastAPI)The backend does not rely on genre overlap. It uses Semantic Text Embeddings.3.1 Data FlowMobile app queries SQLite for media where reaction_weight >= 1.0.Mobile sends POST /api/recommend with {"seed_ids": ["tt123", "tt456"]}.FastAPI receives the request.3.2 The Mathematical EngineFastAPI uses sentence-transformers/all-MiniLM-L6-v2. Every movie in your backend cache has a 384-dimensional vector $\vec{v}$ generated from a rich text string combining its plot, director, visual style, and emotional tone.To find recommendations, the backend calculates the centroid (average) vector of the user's seed movies:$$\vec{V}_{target} = \frac{1}{n} \sum_{i=1}^{n} \vec{v}_{seed_i}$$It then calculates the Cosine Similarity between the target vibe vector and all candidate movies in the database:$$\text{Similarity} = \frac{\vec{V}_{target} \cdot \vec{v}_{candidate}}{\Vert{}\vec{V}_{target}\Vert{} \Vert{}\vec{v}_{candidate}\Vert{}}$$

3.3 Python Implementation Spec

```py
from fastapi import FastAPI
from pydantic import BaseModel
import numpy as np
from sklearn.metrics.pairwise import cosine_similarity

app = FastAPI()

class RecommendRequest(BaseModel):
    seed_ids: list[str]
    exclude_ids: list[str]
    recent_only: bool = False

@app.post("/api/recommend")
async def get_weekly_seven(req: RecommendRequest):
    # 1. Fetch pre-computed 384D vectors for the seed_ids
    seed_vectors = fetch_vectors_for_ids(req.seed_ids)
    
    # 2. Calculate the Target Vibe Centroid
    target_vector = np.mean(seed_vectors, axis=0).reshape(1, -1)
    
    # 3. Fetch candidate pool (filter by date if recent_only is True)
    candidates = get_candidate_pool(req.exclude_ids, req.recent_only)
    candidate_vectors = [c['vector'] for c in candidates]
    
    # 4. Calculate Cosine Similarity
    similarities = cosine_similarity(target_vector, candidate_vectors)[0]
    
    # 5. Sort and return the top 7
    ranked_indices = np.argsort(similarities)[::-1][:7]
    
    return {
        "weekly_seven": [candidates[i]['metadata'] for i in ranked_indices]
    }```

## 3. Microservice Interface (FastAPI Stateless)
POST /v1/recommendations/rank: Accepts target preference weights and candidate vectors, returning ranked media IDs sorted by cosine similarity score.
