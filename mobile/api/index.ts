// In a production environment, this would be an environment variable
// For local development on an emulator/device, we use the local machine IP or localhost
const BASE_URL = 'http://localhost:8000/api';

export interface RecommendRequest {
  seed_ids: string[];
}

export interface RecommendResponse {
  media_id: string;
  title: string;
  similarity_score: number;
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
