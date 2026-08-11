import * as SQLite from "expo-sqlite";

export const db = SQLite.openDatabaseSync("OmniLog.db");

export function initDatabase() {
  db.execSync(`
    CREATE TABLE IF NOT EXISTS media_items (
      id TEXT PRIMARY KEY NOT NULL,
      title TEXT NOT NULL,
      type TEXT NOT NULL,
      posterUri TEXT,
      releaseYear TEXT,
      runtime TEXT,
      director TEXT,
      description TEXT
    );

    CREATE TABLE IF NOT EXISTS user_reactions (
      id TEXT PRIMARY KEY NOT NULL,
      media_id TEXT NOT NULL,
      reaction TEXT NOT NULL,
      notes TEXT,
      updated_at INTEGER NOT NULL,
      FOREIGN KEY (media_id) REFERENCES media_items(id)
    );
  `);

  // Quick migration in case the table exists without the description column
  try {
    db.execSync("ALTER TABLE media_items ADD COLUMN description TEXT;");
  } catch (e) {
    // Ignore error if column already exists
  }

  // Quick migration for notes column in user_reactions
  try {
    db.execSync("ALTER TABLE user_reactions ADD COLUMN notes TEXT;");
  } catch (e) {
    // Ignore error if column already exists
  }
}
