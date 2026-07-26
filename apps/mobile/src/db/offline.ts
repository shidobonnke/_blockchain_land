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
  db.runSync("INSERT INTO sync_outbox (id,operation,payload,created_at) VALUES (?,?,?,?)",
    id, operation, JSON.stringify(payload), new Date().toISOString());
  return id;
}
export function queued() {
  return db.getAllSync<{id:string;operation:string;payload:string}>("SELECT * FROM sync_outbox WHERE status='QUEUED' ORDER BY created_at");
}
