import * as SQLite from 'expo-sqlite';

export const db = SQLite.openDatabaseSync('OmniLog.db');

export function initDatabase() {
  db.execSync(`
    CREATE TABLE IF NOT EXISTS media_items (
      id TEXT PRIMARY KEY NOT NULL,
      title TEXT NOT NULL,
      type TEXT NOT NULL,
      posterUri TEXT,
      releaseYear TEXT,
      runtime TEXT,
      director TEXT
    );

    CREATE TABLE IF NOT EXISTS user_reactions (
      id TEXT PRIMARY KEY NOT NULL,
      media_id TEXT NOT NULL,
      reaction TEXT NOT NULL,
      updated_at INTEGER NOT NULL,
      FOREIGN KEY (media_id) REFERENCES media_items(id)
    );
  `);
}
