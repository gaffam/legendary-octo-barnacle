import { ipcMain } from 'electron'
import { getDb } from '../database'
import { randomUUID } from 'crypto'

async function fetchFeed(url: string) {
  const Parser = (await import('rss-parser')).default
  const parser = new Parser({
    timeout: 15000,
    headers: { 'User-Agent': 'Atelier RSS Reader/1.0' }
  })
  return await parser.parseURL(url)
}

export function registerRssHandlers(): void {
  // Feed management
  ipcMain.handle('rss:addFeed', async (_e, url: string) => {
    try {
      const feed = await fetchFeed(url)
      const db = getDb()
      const id = randomUUID()
      const now = Date.now()
      db.prepare(
        `
        INSERT OR IGNORE INTO rss_feeds (id, title, url, description, last_fetched, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `
      ).run(id, feed.title || url, url, feed.description || '', now, now)

      const savedFeed = db.prepare('SELECT * FROM rss_feeds WHERE url = ?').get(url) as any

      // Save initial articles
      const stmt = db.prepare(`
        INSERT OR IGNORE INTO rss_articles (id, feed_id, title, url, content, summary, author, published_at, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)

      for (const item of (feed.items || []).slice(0, 50)) {
        if (!item.link) continue
        const articleId = randomUUID()
        stmt.run(
          articleId,
          savedFeed.id,
          item.title || '',
          item.link,
          item.content || item['content:encoded'] || '',
          item.contentSnippet || '',
          item.creator || item.author || '',
          item.pubDate ? new Date(item.pubDate).getTime() : now,
          now
        )
      }

      return { success: true, feed: savedFeed }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  })

  ipcMain.handle('rss:refreshFeed', async (_e, feedId: string) => {
    try {
      const db = getDb()
      const feed = db.prepare('SELECT * FROM rss_feeds WHERE id = ?').get(feedId) as any
      if (!feed) return { success: false, error: 'Feed not found' }

      const parsedFeed = await fetchFeed(feed.url)
      const now = Date.now()

      db.prepare(
        'UPDATE rss_feeds SET last_fetched = ?, title = COALESCE(?, title) WHERE id = ?'
      ).run(now, parsedFeed.title || null, feedId)

      const stmt = db.prepare(`
        INSERT OR IGNORE INTO rss_articles (id, feed_id, title, url, content, summary, author, published_at, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)

      let newCount = 0
      for (const item of (parsedFeed.items || []).slice(0, 50)) {
        if (!item.link) continue
        const result = stmt.run(
          randomUUID(),
          feedId,
          item.title || '',
          item.link,
          item.content || item['content:encoded'] || '',
          item.contentSnippet || '',
          item.creator || item.author || '',
          item.pubDate ? new Date(item.pubDate).getTime() : now,
          now
        )
        if (result.changes > 0) newCount++
      }

      return { success: true, newArticles: newCount }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  })

  ipcMain.handle('rss:refreshAll', async () => {
    const db = getDb()
    const feeds = db.prepare('SELECT * FROM rss_feeds WHERE is_active = 1').all() as any[]
    let total = 0
    for (const feed of feeds) {
      try {
        const parsedFeed = await fetchFeed(feed.url)
        const now = Date.now()
        db.prepare('UPDATE rss_feeds SET last_fetched = ? WHERE id = ?').run(now, feed.id)
        const stmt = db.prepare(`
          INSERT OR IGNORE INTO rss_articles (id, feed_id, title, url, content, summary, author, published_at, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `)
        for (const item of (parsedFeed.items || []).slice(0, 50)) {
          if (!item.link) continue
          const result = stmt.run(
            randomUUID(),
            feed.id,
            item.title || '',
            item.link,
            item.content || item['content:encoded'] || '',
            item.contentSnippet || '',
            item.creator || item.author || '',
            item.pubDate ? new Date(item.pubDate).getTime() : now,
            now
          )
          if (result.changes > 0) total++
        }
      } catch (err) {
        console.error(`Failed to refresh feed ${feed.url}:`, err)
      }
    }
    return { success: true, newArticles: total }
  })

  ipcMain.handle('rss:listFeeds', () => {
    return getDb().prepare('SELECT * FROM rss_feeds ORDER BY title').all()
  })

  ipcMain.handle('rss:deleteFeed', (_e, id: string) => {
    getDb().prepare('DELETE FROM rss_feeds WHERE id = ?').run(id)
    return true
  })

  // Article management
  ipcMain.handle(
    'rss:listArticles',
    (
      _e,
      opts: {
        feedId?: string
        onlySaved?: boolean
        onlyUnread?: boolean
        limit?: number
        offset?: number
      }
    ) => {
      const db = getDb()
      let query =
        'SELECT a.*, f.title as feed_title FROM rss_articles a LEFT JOIN rss_feeds f ON a.feed_id = f.id WHERE 1=1'
      const params: any[] = []
      if (opts.feedId) {
        query += ' AND a.feed_id = ?'
        params.push(opts.feedId)
      }
      if (opts.onlySaved) {
        query += ' AND a.is_saved = 1'
      }
      if (opts.onlyUnread) {
        query += ' AND a.is_read = 0'
      }
      query += ' ORDER BY a.published_at DESC LIMIT ? OFFSET ?'
      params.push(opts.limit || 50, opts.offset || 0)
      return db.prepare(query).all(...params)
    }
  )

  ipcMain.handle('rss:markRead', (_e, id: string, isRead: boolean) => {
    getDb()
      .prepare('UPDATE rss_articles SET is_read = ? WHERE id = ?')
      .run(isRead ? 1 : 0, id)
    return true
  })

  ipcMain.handle('rss:toggleSaved', (_e, id: string) => {
    const db = getDb()
    const article = db.prepare('SELECT is_saved FROM rss_articles WHERE id = ?').get(id) as any
    if (!article) return false
    db.prepare('UPDATE rss_articles SET is_saved = ? WHERE id = ?').run(
      article.is_saved ? 0 : 1,
      id
    )
    return true
  })

  ipcMain.handle('rss:searchArticles', (_e, query: string) => {
    const db = getDb()
    const q = `%${query}%`
    return db
      .prepare(
        `
      SELECT a.*, f.title as feed_title FROM rss_articles a
      LEFT JOIN rss_feeds f ON a.feed_id = f.id
      WHERE a.title LIKE ? OR a.summary LIKE ? OR a.content LIKE ?
      ORDER BY a.published_at DESC LIMIT 50
    `
      )
      .all(q, q, q)
  })

  ipcMain.handle('rss:getStats', () => {
    const db = getDb()
    const totalFeeds = (db.prepare('SELECT COUNT(*) as c FROM rss_feeds').get() as any).c
    const totalArticles = (db.prepare('SELECT COUNT(*) as c FROM rss_articles').get() as any).c
    const unreadCount = (
      db.prepare('SELECT COUNT(*) as c FROM rss_articles WHERE is_read = 0').get() as any
    ).c
    const savedCount = (
      db.prepare('SELECT COUNT(*) as c FROM rss_articles WHERE is_saved = 1').get() as any
    ).c
    return { totalFeeds, totalArticles, unreadCount, savedCount }
  })
}
