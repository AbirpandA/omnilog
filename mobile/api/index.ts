import { Platform } from 'react-native';

const BASE_URL = Platform.OS === 'android' ? 'http://10.0.2.2:8000/api' : 'http://localhost:8000/api';

export interface RecommendRequest {
  seed_ids: string[];
}

export interface RecommendResponse {
  media_id: string;
  title: string;
  description: string;
  poster_url: string;
  similarity_score: number;
}

export interface SearchResponse {
  media_id: string;
  title: string;
  description: string;
  poster_url: string;
}

export interface LatestResponse {
  media_id: string;
  title: string;
  description: string;
  poster_url: string;
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

export async function fetchRecommendations(seedIds: string[]): Promise<RecommendResponse[]> {
  try {
    const response = await fetch(`${BASE_URL}/recommend`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ seed_ids: seedIds }),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data: RecommendResponse[] = await response.json();
    return data;
  } catch (error) {
    console.error("Failed to fetch recommendations:", error);
    throw error;
  }
}

export async function searchMedia(query: string): Promise<SearchResponse[]> {
  try {
    const response = await fetch(`${BASE_URL}/search?query=${encodeURIComponent(query)}`);
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data: SearchResponse[] = await response.json();
    return data;
  } catch (error) {
    console.error("Failed to search media:", error);
    throw error;
  }
}

export async function fetchLatestMovies(): Promise<LatestResponse[]> {
  try {
    const response = await fetch(`${BASE_URL}/latest`);
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data: LatestResponse[] = await response.json();
    return data;
  } catch (error) {
    console.error("Failed to fetch latest movies:", error);
    throw error;
  }
}

export async function fetchMediaDetails(mediaId: string): Promise<MediaDetailsResponse> {
  try {
    const response = await fetch(`${BASE_URL}/movie/${mediaId}`);
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data: MediaDetailsResponse = await response.json();
    return data;
  } catch (error) {
    console.error("Failed to fetch media details:", error);
    throw error;
  }
}
