// import Database from 'better-sqlite3'
import { app } from 'electron'
import { join } from 'path'
import { existsSync, mkdirSync } from 'fs'

// let db: Database.Database

export function getDb(): any {
  // if (!db) throw new Error('Database not initialized')
  // return db
  return {}
}

export async function initDatabase(): Promise<void> {
  const userDataPath = app.getPath('userData')
  const dbDir = join(userDataPath, 'data')
  if (!existsSync(dbDir)) mkdirSync(dbDir, { recursive: true })

  // const dbPath = join(dbDir, 'atelier.db')
  // db = new Database(dbPath)
  // db.pragma('journal_mode = WAL')
  // db.pragma('foreign_keys = ON')

  // db.exec(`
  //   CREATE TABLE IF NOT EXISTS documents (
  //     id TEXT PRIMARY KEY,
  //     title TEXT NOT NULL DEFAULT 'Adsız Belge',
  //     content TEXT NOT NULL DEFAULT '',
  //     format TEXT NOT NULL DEFAULT 'rich',
  //     notebook_id TEXT,
  //     tags TEXT DEFAULT '[]',
  //     language TEXT DEFAULT 'tr',
  //     word_count INTEGER DEFAULT 0,
  //     created_at INTEGER NOT NULL,
  //     updated_at INTEGER NOT NULL,
  //     is_archived INTEGER DEFAULT 0,
  //     metadata TEXT DEFAULT '{}'
  //   );

  //   CREATE TABLE IF NOT EXISTS notebooks (
  //     id TEXT PRIMARY KEY,
  //     title TEXT NOT NULL,
  //     color TEXT DEFAULT '#8B2635',
  //     icon TEXT DEFAULT 'book',
  //     description TEXT DEFAULT '',
  //     created_at INTEGER NOT NULL,
  //     updated_at INTEGER NOT NULL,
  //     sort_order INTEGER DEFAULT 0
  //   );

  //   CREATE TABLE IF NOT EXISTS agenda_entries (
  //     id TEXT PRIMARY KEY,
  //     title TEXT NOT NULL,
  //     content TEXT DEFAULT '',
  //     date TEXT NOT NULL,
  //     time TEXT,
  //     end_time TEXT,
  //     type TEXT DEFAULT 'note',
  //     is_completed INTEGER DEFAULT 0,
  //     color TEXT DEFAULT '#1B2B5E',
  //     tags TEXT DEFAULT '[]',
  //     created_at INTEGER NOT NULL,
  //     updated_at INTEGER NOT NULL
  //   );

  //   CREATE TABLE IF NOT EXISTS zettel_notes (
  //     id TEXT PRIMARY KEY,
  //     uid TEXT UNIQUE NOT NULL,
  //     title TEXT NOT NULL,
  //     content TEXT NOT NULL DEFAULT '',
  //     tags TEXT DEFAULT '[]',
  //     links TEXT DEFAULT '[]',
  //     backlinks TEXT DEFAULT '[]',
  //     created_at INTEGER NOT NULL,
  //     updated_at INTEGER NOT NULL
  //   );

  //   CREATE TABLE IF NOT EXISTS rss_feeds (
  //     id TEXT PRIMARY KEY,
  //     title TEXT NOT NULL,
  //     url TEXT UNIQUE NOT NULL,
  //     description TEXT DEFAULT '',
  //     favicon_url TEXT DEFAULT '',
  //     last_fetched INTEGER,
  //     fetch_interval INTEGER DEFAULT 3600,
  //     is_active INTEGER DEFAULT 1,
  //     created_at INTEGER NOT NULL
  //   );

  //   CREATE TABLE IF NOT EXISTS rss_articles (
  //     id TEXT PRIMARY KEY,
  //     feed_id TEXT NOT NULL REFERENCES rss_feeds(id) ON DELETE CASCADE,
  //     title TEXT NOT NULL,
  //     url TEXT UNIQUE NOT NULL,
  //     content TEXT DEFAULT '',
  //     summary TEXT DEFAULT '',
  //     author TEXT DEFAULT '',
  //     published_at INTEGER,
  //     is_read INTEGER DEFAULT 0,
  //     is_saved INTEGER DEFAULT 0,
  //     tags TEXT DEFAULT '[]',
  //     created_at INTEGER NOT NULL,
  //     FOREIGN KEY(feed_id) REFERENCES rss_feeds(id)
  //   );

  //   CREATE TABLE IF NOT EXISTS settings (
  //     key TEXT PRIMARY KEY,
  //     value TEXT NOT NULL
  //   );

  //   CREATE VIRTUAL TABLE IF NOT EXISTS rss_articles_fts USING fts5(
  //     title, content, summary, author,
  //     content=rss_articles, content_rowid=rowid
  //   );

  //   CREATE TABLE IF NOT EXISTS ai_conversations (
  //     id TEXT PRIMARY KEY,
  //     title TEXT NOT NULL DEFAULT 'Yeni Sohbet',
  //     document_id TEXT,
  //     messages TEXT NOT NULL DEFAULT '[]',
  //     created_at INTEGER NOT NULL,
  //     updated_at INTEGER NOT NULL
  //   );
  // `)

  // // Seed default notebook
  // const existing = db.prepare('SELECT id FROM notebooks LIMIT 1').get()
  // if (!existing) {
  //   const now = Date.now()
  //   db.prepare(`
  //     INSERT INTO notebooks (id, title, color, icon, description, created_at, updated_at, sort_order)
  //     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  //   `).run(
  //     crypto.randomUUID(),
  //     'Ana Defter',
  //     '#8B2635',
  //     'book',
  //     'Kişisel notlar',
  //     now,
  //     now,
  //     0
  //   )
  // }

  // // Default settings
  // const defaults: Record<string, string> = {
  //   'editor.language': 'tr',
  //   'editor.font_size': '18',
  //   'editor.line_spacing': '1.8',
  //   'editor.paper_style': 'velin',
  //   'editor.typewriter_sound': 'false',
  //   'ai.provider': 'anthropic',
  //   'ai.model': 'claude-opus-4-5-20251101',
  //   'cloud.provider': 'webdav',
  //   'cloud.enabled': 'false',
  //   'ui.theme': 'pineider-capri',
  //   'ui.sidebar_width': '260',
  //   'spellcheck.enabled': 'true',
  //   'spellcheck.language': 'tr',
  // }

  // const insertSetting = db.prepare(
  //   'INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)'
  // )
  // for (const [k, v] of Object.entries(defaults)) {
  //   insertSetting.run(k, v)
  // }
}
