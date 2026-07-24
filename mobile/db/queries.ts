import { db } from './index';

export type ReactionType = 'lame' | 'okay' | 'pure gold' | 'Absolute cinema';

export interface MediaItem {
  id: string;
  title: string;
  type: string;
  posterUri?: string;
  releaseYear?: string;
  runtime?: string;
  director?: string;
  description?: string;
}

export interface LogEntry {
  reactionId: string;
  reaction: ReactionType;
  updated_at: number;
  mediaId: string;
  title: string;
  type: string;
  posterUri?: string;
  releaseYear?: string;
  description?: string;
}

// Helper to generate a unique ID
function uuid(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

export function insertLog(media: MediaItem, reaction: ReactionType): void {
  // Use a transaction to ensure both inserts succeed together
  db.withTransactionSync(() => {
    // 1. Insert or Replace Media Item (in case they rate something again)
    db.runSync(
      `INSERT OR REPLACE INTO media_items (id, title, type, posterUri, releaseYear, runtime, director, description) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        media.id,
        media.title,
        media.type,
        media.posterUri || null,
        media.releaseYear || null,
        media.runtime || null,
        media.director || null,
        media.description || null
      ]
    );

    // 2. Delete any existing reaction for this media to prevent duplicates
    db.runSync(`DELETE FROM user_reactions WHERE media_id = ?`, [media.id]);

    // 3. Insert User Reaction
    const reactionId = uuid();
    const timestamp = Date.now();
    
    db.runSync(
      `INSERT INTO user_reactions (id, media_id, reaction, updated_at) 
       VALUES (?, ?, ?, ?)`,
      [reactionId, media.id, reaction, timestamp]
    );
  });
}

export function getAllLogs(): LogEntry[] {
  // Returns all logs with their media data, sorted by newest first
  const result = db.getAllSync(
    `SELECT 
        ur.id as reactionId, 
        ur.reaction, 
        ur.updated_at,
        mi.id as mediaId, 
        mi.title, 
        mi.type, 
        mi.posterUri, 
        mi.releaseYear,
        mi.description
     FROM user_reactions ur
     JOIN media_items mi ON ur.media_id = mi.id
     ORDER BY ur.updated_at DESC`
  ) as LogEntry[];
  
  return result;
}

export function getLogByMediaId(mediaId: string): LogEntry | null {
  const result = db.getFirstSync(
    `SELECT 
        ur.id as reactionId, 
        ur.reaction, 
        ur.updated_at,
        mi.id as mediaId, 
        mi.title, 
        mi.type, 
        mi.posterUri, 
        mi.releaseYear,
        mi.description
     FROM user_reactions ur
     JOIN media_items mi ON ur.media_id = mi.id
     WHERE ur.media_id = ?`,
    [mediaId]
  ) as LogEntry | undefined;
  
  return result || null;
}
