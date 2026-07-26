import * as SQLite from "expo-sqlite";

const db = SQLite.openDatabaseSync("anagu.db");
export function initialiseOfflineStore() {
  db.execSync(`PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS sync_outbox (
      id TEXT PRIMARY KEY NOT NULL,
      operation TEXT NOT NULL,
      payload TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'QUEUED',
      attempts INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );`);
}
export function enqueue(operation: string, payload: unknown) {
  const id = crypto.randomUUID();
  db.runSync(
    "INSERT INTO sync_outbox (id,operation,payload,created_at) VALUES (?,?,?,?)",
    id,
    operation,
    JSON.stringify(payload),
    new Date().toISOString()
  );
  return id;
}
export function queued() {
  return db.getAllSync<{ id: string; operation: string; payload: string }>(
    "SELECT * FROM sync_outbox WHERE status='QUEUED' ORDER BY created_at"
  );
}

export function markSynced(id: string) {
  db.runSync("UPDATE sync_outbox SET status='SYNCED' WHERE id=?", id);
}

export function markFailed(id: string) {
  db.runSync("UPDATE sync_outbox SET attempts=attempts+1, status='QUEUED' WHERE id=?", id);
}

export function allOperations() {
  return db.getAllSync<{
    id: string;
    operation: string;
    status: string;
    attempts: number;
    created_at: string;
  }>("SELECT id,operation,status,attempts,created_at FROM sync_outbox ORDER BY created_at DESC");
}
