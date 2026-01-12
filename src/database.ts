import Database from "better-sqlite3";
import { ScreeningSnapshot } from "./types";

export class ScreeningDatabase {
  private readonly db: Database.Database;

  constructor(dbPath: string = "screenings.db") {
    this.db = new Database(dbPath);
    this.initTables();
  }

  private initTables() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS snapshots (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp TEXT NOT NULL,
        checksum TEXT NOT NULL,
        data TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS notifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        screening_key TEXT NOT NULL,
        event_type TEXT NOT NULL,
        sent_at TEXT NOT NULL,
        UNIQUE(screening_key, event_type)
      );

      CREATE INDEX IF NOT EXISTS idx_snapshots_timestamp ON snapshots(timestamp);
      CREATE INDEX IF NOT EXISTS idx_notifications_key ON notifications(screening_key);
    `);
  }

  saveSnapshot(snapshot: ScreeningSnapshot): void {
    const stmt = this.db.prepare(`
      INSERT INTO snapshots (timestamp, checksum, data)
      VALUES (?, ?, ?)
    `);

    stmt.run(
      snapshot.timestamp,
      snapshot.checksum,
      JSON.stringify(snapshot.screenings)
    );
  }

  getLastSnapshot(): ScreeningSnapshot | null {
    const stmt = this.db.prepare(`
      SELECT * FROM snapshots 
      ORDER BY timestamp DESC 
      LIMIT 1
    `);

    const row = stmt.get() as any;
    if (!row) return null;

    return {
      timestamp: row.timestamp,
      checksum: row.checksum,
      screenings: JSON.parse(row.data),
    };
  }

  markNotificationSent(screeningKey: string, eventType: string): void {
    const stmt = this.db.prepare(`
      INSERT OR IGNORE INTO notifications (screening_key, event_type, sent_at)
      VALUES (?, ?, ?)
    `);

    stmt.run(screeningKey, eventType, new Date().toISOString());
  }

  wasNotificationSent(screeningKey: string, eventType: string): boolean {
    const stmt = this.db.prepare(`
      SELECT 1 FROM notifications 
      WHERE screening_key = ? AND event_type = ?
    `);

    return !!stmt.get(screeningKey, eventType);
  }

  close(): void {
    this.db.close();
  }
}
