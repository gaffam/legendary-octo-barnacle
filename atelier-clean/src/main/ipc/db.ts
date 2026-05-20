import { ipcMain } from 'electron'
import { getDb } from '../database'
import { randomUUID } from 'crypto'

// ─── Documents ────────────────────────────────────────────────────────────────

function createDocument(data: {
  title?: string
  content?: string
  format?: string
  notebook_id?: string
  tags?: string[]
  language?: string
  metadata?: Record<string, unknown>
}) {
  const db = getDb()
  const id = randomUUID()
  const now = Date.now()
  db.prepare(
    `
    INSERT INTO documents (id, title, content, format, notebook_id, tags, language, word_count, created_at, updated_at, metadata)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `
  ).run(
    id,
    data.title || 'Adsız Belge',
    data.content || '',
    data.format || 'rich',
    data.notebook_id || null,
    JSON.stringify(data.tags || []),
    data.language || 'tr',
    0,
    now,
    now,
    JSON.stringify(data.metadata || {})
  )
  return db.prepare('SELECT * FROM documents WHERE id = ?').get(id)
}

function parseDoc(row: any) {
  if (!row) return null
  return {
    ...row,
    tags: JSON.parse(row.tags || '[]'),
    metadata: JSON.parse(row.metadata || '{}')
  }
}

export function registerDbHandlers(): void {
  // Documents
  ipcMain.handle('db:createDocument', (_e, data) => parseDoc(createDocument(data)))

  ipcMain.handle('db:getDocument', (_e, id: string) => {
    const db = getDb()
    return parseDoc(db.prepare('SELECT * FROM documents WHERE id = ?').get(id))
  })

  ipcMain.handle('db:updateDocument', (_e, id: string, data: any) => {
    const db = getDb()
    const now = Date.now()
    const text = data.content || ''
    const wordCount = text
      .replace(/<[^>]+>/g, ' ')
      .split(/\s+/)
      .filter(Boolean).length
    db.prepare(
      `
      UPDATE documents SET
        title = COALESCE(?, title),
        content = COALESCE(?, content),
        format = COALESCE(?, format),
        notebook_id = COALESCE(?, notebook_id),
        tags = COALESCE(?, tags),
        language = COALESCE(?, language),
        word_count = ?,
        updated_at = ?,
        metadata = COALESCE(?, metadata)
      WHERE id = ?
    `
    ).run(
      data.title ?? null,
      data.content ?? null,
      data.format ?? null,
      data.notebook_id ?? null,
      data.tags ? JSON.stringify(data.tags) : null,
      data.language ?? null,
      wordCount,
      now,
      data.metadata ? JSON.stringify(data.metadata) : null,
      id
    )
    return parseDoc(db.prepare('SELECT * FROM documents WHERE id = ?').get(id))
  })

  ipcMain.handle('db:deleteDocument', (_e, id: string) => {
    const db = getDb()
    db.prepare('UPDATE documents SET is_archived = 1, updated_at = ? WHERE id = ?').run(
      Date.now(),
      id
    )
    return true
  })

  ipcMain.handle('db:listDocuments', (_e, notebookId?: string) => {
    const db = getDb()
    const rows = notebookId
      ? db
          .prepare(
            'SELECT * FROM documents WHERE notebook_id = ? AND is_archived = 0 ORDER BY updated_at DESC'
          )
          .all(notebookId)
      : db.prepare('SELECT * FROM documents WHERE is_archived = 0 ORDER BY updated_at DESC').all()
    return rows.map(parseDoc)
  })

  ipcMain.handle('db:searchDocuments', (_e, query: string) => {
    const db = getDb()
    const q = `%${query}%`
    const rows = db
      .prepare(
        `
      SELECT * FROM documents WHERE is_archived = 0 AND (title LIKE ? OR content LIKE ?)
      ORDER BY updated_at DESC LIMIT 50
    `
      )
      .all(q, q)
    return rows.map(parseDoc)
  })

  // Notebooks
  ipcMain.handle('db:listNotebooks', () => {
    return getDb().prepare('SELECT * FROM notebooks ORDER BY sort_order, created_at').all()
  })

  ipcMain.handle('db:createNotebook', (_e, data: any) => {
    const db = getDb()
    const id = randomUUID()
    const now = Date.now()
    db.prepare(
      `
      INSERT INTO notebooks (id, title, color, icon, description, created_at, updated_at, sort_order)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `
    ).run(
      id,
      data.title,
      data.color || '#8B2635',
      data.icon || 'book',
      data.description || '',
      now,
      now,
      data.sort_order || 0
    )
    return db.prepare('SELECT * FROM notebooks WHERE id = ?').get(id)
  })

  ipcMain.handle('db:updateNotebook', (_e, id: string, data: any) => {
    const db = getDb()
    db.prepare(
      `
      UPDATE notebooks SET title = COALESCE(?, title), color = COALESCE(?, color),
      icon = COALESCE(?, icon), description = COALESCE(?, description),
      updated_at = ? WHERE id = ?
    `
    ).run(
      data.title ?? null,
      data.color ?? null,
      data.icon ?? null,
      data.description ?? null,
      Date.now(),
      id
    )
    return db.prepare('SELECT * FROM notebooks WHERE id = ?').get(id)
  })

  ipcMain.handle('db:deleteNotebook', (_e, id: string) => {
    getDb().prepare('DELETE FROM notebooks WHERE id = ?').run(id)
    return true
  })

  // Agenda
  ipcMain.handle('db:createAgendaEntry', (_e, data: any) => {
    const db = getDb()
    const id = randomUUID()
    const now = Date.now()
    db.prepare(
      `
      INSERT INTO agenda_entries (id, title, content, date, time, end_time, type, is_completed, color, tags, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `
    ).run(
      id,
      data.title,
      data.content || '',
      data.date,
      data.time || null,
      data.end_time || null,
      data.type || 'note',
      0,
      data.color || '#1B2B5E',
      JSON.stringify(data.tags || []),
      now,
      now
    )
    const row = db.prepare('SELECT * FROM agenda_entries WHERE id = ?').get(id) as any
    return { ...row, tags: JSON.parse(row.tags || '[]') }
  })

  ipcMain.handle('db:listAgendaEntries', (_e, dateFrom?: string, dateTo?: string) => {
    const db = getDb()
    let rows: any[]
    if (dateFrom && dateTo) {
      rows = db
        .prepare('SELECT * FROM agenda_entries WHERE date >= ? AND date <= ? ORDER BY date, time')
        .all(dateFrom, dateTo)
    } else {
      rows = db.prepare('SELECT * FROM agenda_entries ORDER BY date DESC, time').all()
    }
    return rows.map((r: any) => ({ ...r, tags: JSON.parse(r.tags || '[]') }))
  })

  ipcMain.handle('db:updateAgendaEntry', (_e, id: string, data: any) => {
    const db = getDb()
    db.prepare(
      `
      UPDATE agenda_entries SET
        title = COALESCE(?, title), content = COALESCE(?, content),
        date = COALESCE(?, date), time = COALESCE(?, time), end_time = COALESCE(?, end_time),
        type = COALESCE(?, type), is_completed = COALESCE(?, is_completed),
        color = COALESCE(?, color), tags = COALESCE(?, tags), updated_at = ?
      WHERE id = ?
    `
    ).run(
      data.title ?? null,
      data.content ?? null,
      data.date ?? null,
      data.time ?? null,
      data.end_time ?? null,
      data.type ?? null,
      data.is_completed !== undefined ? (data.is_completed ? 1 : 0) : null,
      data.color ?? null,
      data.tags ? JSON.stringify(data.tags) : null,
      Date.now(),
      id
    )
    const row = db.prepare('SELECT * FROM agenda_entries WHERE id = ?').get(id) as any
    return { ...row, tags: JSON.parse(row.tags || '[]') }
  })

  ipcMain.handle('db:deleteAgendaEntry', (_e, id: string) => {
    getDb().prepare('DELETE FROM agenda_entries WHERE id = ?').run(id)
    return true
  })

  // Zettelkasten
  ipcMain.handle('db:createZettel', (_e, data: any) => {
    const db = getDb()
    const id = randomUUID()
    const now = Date.now()
    const uid =
      data.uid ||
      `Z${new Date()
        .toISOString()
        .replace(/[-:T.]/g, '')
        .slice(0, 14)}`
    db.prepare(
      `
      INSERT INTO zettel_notes (id, uid, title, content, tags, links, backlinks, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `
    ).run(
      id,
      uid,
      data.title,
      data.content || '',
      JSON.stringify(data.tags || []),
      JSON.stringify(data.links || []),
      JSON.stringify(data.backlinks || []),
      now,
      now
    )
    const row = db.prepare('SELECT * FROM zettel_notes WHERE id = ?').get(id) as any
    return {
      ...row,
      tags: JSON.parse(row.tags),
      links: JSON.parse(row.links),
      backlinks: JSON.parse(row.backlinks)
    }
  })

  ipcMain.handle('db:listZettels', () => {
    const rows = getDb()
      .prepare('SELECT * FROM zettel_notes ORDER BY updated_at DESC')
      .all() as any[]
    return rows.map((r) => ({
      ...r,
      tags: JSON.parse(r.tags),
      links: JSON.parse(r.links),
      backlinks: JSON.parse(r.backlinks)
    }))
  })

  ipcMain.handle('db:updateZettel', (_e, id: string, data: any) => {
    const db = getDb()
    db.prepare(
      `
      UPDATE zettel_notes SET
        title = COALESCE(?, title), content = COALESCE(?, content),
        tags = COALESCE(?, tags), links = COALESCE(?, links),
        backlinks = COALESCE(?, backlinks), updated_at = ?
      WHERE id = ?
    `
    ).run(
      data.title ?? null,
      data.content ?? null,
      data.tags ? JSON.stringify(data.tags) : null,
      data.links ? JSON.stringify(data.links) : null,
      data.backlinks ? JSON.stringify(data.backlinks) : null,
      Date.now(),
      id
    )
    const row = db.prepare('SELECT * FROM zettel_notes WHERE id = ?').get(id) as any
    return {
      ...row,
      tags: JSON.parse(row.tags),
      links: JSON.parse(row.links),
      backlinks: JSON.parse(row.backlinks)
    }
  })

  ipcMain.handle('db:deleteZettel', (_e, id: string) => {
    getDb().prepare('DELETE FROM zettel_notes WHERE id = ?').run(id)
    return true
  })

  ipcMain.handle('db:searchZettels', (_e, query: string) => {
    const q = `%${query}%`
    const rows = getDb()
      .prepare(
        'SELECT * FROM zettel_notes WHERE title LIKE ? OR content LIKE ? ORDER BY updated_at DESC'
      )
      .all(q, q) as any[]
    return rows.map((r) => ({
      ...r,
      tags: JSON.parse(r.tags),
      links: JSON.parse(r.links),
      backlinks: JSON.parse(r.backlinks)
    }))
  })

  // Settings
  ipcMain.handle('db:getSetting', (_e, key: string) => {
    const row = getDb().prepare('SELECT value FROM settings WHERE key = ?').get(key) as any
    return row?.value ?? null
  })

  ipcMain.handle('db:setSetting', (_e, key: string, value: string) => {
    getDb().prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(key, value)
    return true
  })

  ipcMain.handle('db:getAllSettings', () => {
    const rows = getDb().prepare('SELECT * FROM settings').all() as any[]
    const result: Record<string, string> = {}
    rows.forEach((r) => {
      result[r.key] = r.value
    })
    return result
  })
}
