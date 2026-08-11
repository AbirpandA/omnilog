import { PersistedClient, Persister } from "@tanstack/react-query-persist-client";
import { db } from "../db";

const QUERY_CACHE_KEY = "REACT_QUERY_OFFLINE_CACHE";

export function createSqlitePersister(): Persister {
  // Initialize table for the query cache
  db.execSync(`
    CREATE TABLE IF NOT EXISTS query_cache (
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT NOT NULL
    );
  `);

  return {
    persistClient: async (client: PersistedClient) => {
      try {
        db.runSync(
          "INSERT OR REPLACE INTO query_cache (key, value) VALUES (?, ?)",
          QUERY_CACHE_KEY,
          JSON.stringify(client)
        );
      } catch (error) {
        console.error("Error persisting react query client to sqlite", error);
      }
    },
    restoreClient: async () => {
      try {
        const row = db.getFirstSync<{ value: string }>(
          "SELECT value FROM query_cache WHERE key = ?",
          QUERY_CACHE_KEY
        );
        if (row && row.value) {
          return JSON.parse(row.value) as PersistedClient;
        }
      } catch (error) {
        console.error("Error restoring react query client from sqlite", error);
      }
      return undefined;
    },
    removeClient: async () => {
      try {
        db.runSync("DELETE FROM query_cache WHERE key = ?", QUERY_CACHE_KEY);
      } catch (error) {
        console.error("Error removing react query client from sqlite", error);
      }
    },
  };
}
