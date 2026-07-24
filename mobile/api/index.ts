import { Platform } from "react-native";

const BASE_URL =
  Platform.OS === "android"
    ? "http://10.0.2.2:8000/api"
    : "http://localhost:8000/api";

export interface RecommendRequest {
  seed_ids: string[];
}

export interface RecommendResponse {
  media_id: string;
  title: string;
  description: string;
  poster_url: string;
  similarity_score: number;
  vibe_tag?: string;
}

export interface SearchResponse {
  media_id: string;
  title: string;
  description: string;
  poster_url: string;
  vibe_tag?: string;
}

export interface LatestResponse {
  media_id: string;
  title: string;
  description: string;
  poster_url: string;
  vibe_tag?: string;
}

export interface MediaDetailsResponse {
  media_id: string;
  title: string;
  description: string;
  poster_url: string;
  backdrop_url: string;
  tmdb_rating: number;
  director: string;
  cast: string[];
  runtime: number;
  genres: string[];
  release_date: string;
  tagline: string;
}

export async function fetchRecommendations(
  seedIds: string[] = [],
): Promise<RecommendResponse[]> {
  try {
    // Note: We pull from local SQLite to get seeds in the component and pass them here.
    const response = await fetch(`${BASE_URL}/recommend?top_n=7`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ seed_ids: seedIds, exclude_ids: [] }),
    });
    if (!response.ok) throw new Error(`API error: ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error("Failed to fetch recommendations:", error);
    throw error;
  }
}

export async function fetchMoodRecommendations(
  mood: string,
  excludeIds: string[] = [],
  topN: number = 20,
): Promise<RecommendResponse[]> {
  try {
    const response = await fetch(`${BASE_URL}/mood`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mood, exclude_ids: excludeIds, top_n: topN }),
    });
    if (!response.ok) throw new Error(`API error: ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error("Failed to fetch mood recommendations:", error);
    throw error;
  }
}

export async function searchMovies(
  query: string,
  type: "title" | "mood",
): Promise<RecommendResponse[]> {
  try {
    if (type === "mood") {
      return await fetchMoodRecommendations(query);
    } else {
      const response = await fetch(
        `${BASE_URL}/search?query=${encodeURIComponent(query)}`,
      );
      if (!response.ok) throw new Error(`API error: ${response.status}`);
      const data: SearchResponse[] = await response.json();
      return data.map((d) => ({
        ...d,
        similarity_score: 0,
      }));
    }
  } catch (error) {
    console.error("Failed to search movies:", error);
    throw error;
  }
}

export async function fetchSimilarMovies(
  mediaId: string,
): Promise<RecommendResponse[]> {
  try {
    const response = await fetch(`${BASE_URL}/movie/${mediaId}/similar`);
    if (!response.ok) throw new Error(`API error: ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error("Failed to fetch similar movies:", error);
    throw error;
  }
}

export async function fetchLatestMovies(): Promise<LatestResponse[]> {
  try {
    const response = await fetch(`${BASE_URL}/latest`);
    if (!response.ok) throw new Error(`API error: ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error("Failed to fetch latest movies:", error);
    throw error;
  }
}

export async function fetchUpcomingMovies(): Promise<LatestResponse[]> {
  try {
    const response = await fetch(`${BASE_URL}/upcoming`);
    if (!response.ok) throw new Error(`API error: ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error("Failed to fetch upcoming movies:", error);
    throw error;
  }
}

export async function fetchMediaDetails(
  mediaId: string,
): Promise<MediaDetailsResponse> {
  try {
    const response = await fetch(`${BASE_URL}/movie/${mediaId}`);
    if (!response.ok) throw new Error(`API error: ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error("Failed to fetch media details:", error);
    throw error;
  }
}
