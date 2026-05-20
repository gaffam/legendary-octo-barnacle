import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Search,
  Plus,
  Rss,
  Bookmark,
  BookmarkCheck,
  RefreshCw,
  Eye,
  EyeOff,
  ExternalLink,
  Trash2,
  Layers,
  Inbox,
  X,
  Loader2
} from 'lucide-react'
import type { RssArticle, RssFeed } from '@/types'

type FilterMode =
  | { kind: 'all' }
  | { kind: 'unread' }
  | { kind: 'saved' }
  | { kind: 'feed'; feedId: string }
  | { kind: 'search'; query: string }

interface Stats {
  totalFeeds: number
  totalArticles: number
  unreadCount: number
  savedCount: number
}

const SUGGESTED_FEEDS: { title: string; url: string }[] = [
  {
    title: 'BBC News — Culture',
    url: 'https://feeds.bbci.co.uk/news/entertainment_and_arts/rss.xml'
  },
  { title: 'NY Times — Books', url: 'https://rss.nytimes.com/services/xml/rss/nyt/Books.xml' },
  { title: 'The Paris Review', url: 'https://www.theparisreview.org/blog/feed/' },
  { title: 'Literary Hub', url: 'https://lithub.com/feed/' },
  { title: 'Aeon', url: 'https://aeon.co/feed.rss' }
]

function formatShortDate(ts: number): string {
  if (!ts) return ''
  try {
    const d = new Date(ts)
    const now = new Date()
    const sameYear = d.getFullYear() === now.getFullYear()
    return d.toLocaleDateString('tr-TR', {
      day: '2-digit',
      month: 'short',
      year: sameYear ? undefined : '2-digit'
    })
  } catch {
    return ''
  }
}

function formatLongDate(ts: number): string {
  if (!ts) return ''
  try {
    return new Date(ts).toLocaleDateString('tr-TR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    })
  } catch {
    return ''
  }
}

function stripHtml(html: string): string {
  return (html || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export default function RssView() {
  const [feeds, setFeeds] = useState<RssFeed[]>([])
  const [articles, setArticles] = useState<RssArticle[]>([])
  const [stats, setStats] = useState<Stats>({
    totalFeeds: 0,
    totalArticles: 0,
    unreadCount: 0,
    savedCount: 0
  })
  const [feedUnread, setFeedUnread] = useState<Record<string, number>>({})

  const [filter, setFilter] = useState<FilterMode>({ kind: 'all' })
  const [activeArticleId, setActiveArticleId] = useState<string | null>(null)
  const [activeArticle, setActiveArticle] = useState<RssArticle | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [showAddFeed, setShowAddFeed] = useState(false)
  const [newFeedUrl, setNewFeedUrl] = useState('')
  const [addError, setAddError] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)

  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const reloadAll = async () => {
    const [fs, st] = await Promise.all([
      window.atelier.rss.listFeeds(),
      window.atelier.rss.getStats()
    ])
    setFeeds(fs)
    setStats(st)
    // compute per-feed unread counts via lightweight queries
    const map: Record<string, number> = {}
    await Promise.all(
      fs.map(async (f) => {
        const arts = await window.atelier.rss.listArticles({
          feedId: f.id,
          onlyUnread: true,
          limit: 200,
          offset: 0
        })
        map[f.id] = arts.length
      })
    )
    setFeedUnread(map)
  }

  useEffect(() => {
    reloadAll().then(() => {
      // Suggest defaults only if we have no feeds yet
      window.atelier.rss.listFeeds().then((fs) => {
        if (!fs.length) setShowSuggestions(true)
      })
    })
  }, [])

  const loadArticles = async (mode: FilterMode) => {
    if (mode.kind === 'search') {
      const list = await window.atelier.rss.searchArticles(mode.query)
      setArticles(list)
      return
    }
    const opts: {
      feedId?: string
      onlyUnread?: boolean
      onlySaved?: boolean
      limit: number
      offset: number
    } = { limit: 50, offset: 0 }
    if (mode.kind === 'unread') opts.onlyUnread = true
    if (mode.kind === 'saved') opts.onlySaved = true
    if (mode.kind === 'feed') opts.feedId = mode.feedId
    const list = await window.atelier.rss.listArticles(opts)
    setArticles(list)
  }

  useEffect(() => {
    loadArticles(filter)
  }, [filter])

  // Search (debounced) overrides filter mode while query is non-empty
  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current)
    const q = searchQuery.trim()
    searchTimer.current = setTimeout(() => {
      if (q) {
        setFilter({ kind: 'search', query: q })
      } else if (filter.kind === 'search') {
        setFilter({ kind: 'all' })
      }
    }, 280)
    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current)
    }
  }, [searchQuery])

  const openArticle = async (a: RssArticle) => {
    setActiveArticleId(a.id)
    setActiveArticle(a)
    if (!a.is_read) {
      await window.atelier.rss.markRead(a.id, true)
      setArticles((prev) => prev.map((x) => (x.id === a.id ? { ...x, is_read: 1 } : x)))
      setActiveArticle({ ...a, is_read: 1 })
      reloadAll()
    }
  }

  const toggleRead = async () => {
    if (!activeArticle) return
    const next = activeArticle.is_read ? 0 : 1
    await window.atelier.rss.markRead(activeArticle.id, next === 1)
    setArticles((prev) =>
      prev.map((x) => (x.id === activeArticle.id ? { ...x, is_read: next } : x))
    )
    setActiveArticle({ ...activeArticle, is_read: next })
    reloadAll()
  }

  const toggleSaved = async () => {
    if (!activeArticle) return
    await window.atelier.rss.toggleSaved(activeArticle.id)
    const next = activeArticle.is_saved ? 0 : 1
    setArticles((prev) =>
      prev.map((x) => (x.id === activeArticle.id ? { ...x, is_saved: next } : x))
    )
    setActiveArticle({ ...activeArticle, is_saved: next })
    reloadAll()
  }

  const toggleSavedInline = async (a: RssArticle) => {
    await window.atelier.rss.toggleSaved(a.id)
    const next = a.is_saved ? 0 : 1
    setArticles((prev) => prev.map((x) => (x.id === a.id ? { ...x, is_saved: next } : x)))
    if (activeArticle?.id === a.id) {
      setActiveArticle({ ...activeArticle, is_saved: next })
    }
    reloadAll()
  }

  const handleAddFeed = async (url?: string) => {
    const target = (url ?? newFeedUrl).trim()
    if (!target) return
    setAdding(true)
    setAddError(null)
    const res = await window.atelier.rss.addFeed(target)
    setAdding(false)
    if (!res.success) {
      setAddError(res.error || 'Besleme eklenemedi.')
      return
    }
    setNewFeedUrl('')
    setShowAddFeed(false)
    setShowSuggestions(false)
    await reloadAll()
    if (res.feed) setFilter({ kind: 'feed', feedId: res.feed.id })
  }

  const handleDeleteFeed = async (f: RssFeed) => {
    if (!confirm(`"${f.title}" beslemesini silmek istediğinize emin misiniz?`)) return
    await window.atelier.rss.deleteFeed(f.id)
    if (filter.kind === 'feed' && filter.feedId === f.id) setFilter({ kind: 'all' })
    await reloadAll()
  }

  const handleRefresh = async (feedId?: string) => {
    setRefreshing(true)
    if (feedId) {
      await window.atelier.rss.refreshFeed(feedId)
    } else {
      await window.atelier.rss.refreshAll()
    }
    await reloadAll()
    await loadArticles(filter)
    setRefreshing(false)
  }

  const headerTitle = useMemo(() => {
    switch (filter.kind) {
      case 'all':
        return 'Tüm Yazılar'
      case 'unread':
        return 'Okunmamış'
      case 'saved':
        return 'Kayıtlı'
      case 'search':
        return `Arama · "${filter.query}"`
      case 'feed': {
        const f = feeds.find((x) => x.id === filter.feedId)
        return f?.title || 'Besleme'
      }
    }
  }, [filter, feeds])

  return (
    <div className="flex h-full bg-paper-cream fade-in">
      {/* LEFT: Feeds */}
      <aside className="w-[220px] flex-shrink-0 border-r border-pineider-gold/20 flex flex-col paper-cotton">
        <div className="px-4 pt-6 pb-3">
          <h2 className="font-display italic text-xl text-pineider-navy">Beslemeler</h2>
          <p className="text-[11px] uppercase tracking-[0.18em] text-ink-secondary mt-1 font-ui">
            Okuma Listesi
          </p>
        </div>
        <div className="fleuron mx-4" />

        <div className="px-3 pt-3 pb-1 flex gap-2">
          <button
            onClick={() => setShowAddFeed(true)}
            className="btn-luxury flex-1 flex items-center justify-center gap-1.5 text-[12px] py-1.5"
          >
            <Plus size={12} /> Ekle
          </button>
          <button
            onClick={() => handleRefresh()}
            className="btn-ghost flex items-center justify-center gap-1 text-[12px] px-2 py-1.5"
            disabled={refreshing}
            title="Tümünü yenile"
          >
            {refreshing ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-2 py-2 space-y-0.5">
          <FilterRow
            label="Tüm Yazılar"
            Icon={Layers}
            count={stats.totalArticles}
            active={filter.kind === 'all'}
            onClick={() => setFilter({ kind: 'all' })}
          />
          <FilterRow
            label="Okunmamış"
            Icon={Inbox}
            count={stats.unreadCount}
            active={filter.kind === 'unread'}
            onClick={() => setFilter({ kind: 'unread' })}
            accent
          />
          <FilterRow
            label="Kayıtlı"
            Icon={BookmarkCheck}
            count={stats.savedCount}
            active={filter.kind === 'saved'}
            onClick={() => setFilter({ kind: 'saved' })}
          />

          <div className="pt-3 pb-1 px-2 text-[10px] uppercase tracking-[0.18em] text-ink-secondary font-ui">
            Kaynaklar
          </div>

          {feeds.length === 0 && (
            <div className="px-2 py-3 text-xs italic text-ink-secondary font-body text-center">
              Henüz besleme yok.
            </div>
          )}
          {feeds.map((f) => {
            const isActive = filter.kind === 'feed' && filter.feedId === f.id
            const unread = feedUnread[f.id] || 0
            return (
              <button
                key={f.id}
                onClick={() => setFilter({ kind: 'feed', feedId: f.id })}
                className={`group w-full text-left px-2 py-1.5 transition flex items-center gap-2 rounded-sm sidebar-item ${
                  isActive
                    ? 'bg-pineider-gold/15 text-pineider-bordeaux'
                    : 'text-ink-primary hover:bg-pineider-gold/8'
                }`}
              >
                <Rss size={11} className="flex-shrink-0 text-pineider-bordeaux/70" />
                <span className="flex-1 truncate font-body text-[13px] italic">
                  {f.title || f.url}
                </span>
                {unread > 0 && (
                  <span className="text-[10px] font-ui font-semibold text-pineider-gold">
                    {unread}
                  </span>
                )}
                <span
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDeleteFeed(f)
                  }}
                  className="opacity-0 group-hover:opacity-100 text-ink-secondary hover:text-pineider-bordeaux transition"
                  title="Sil"
                >
                  <Trash2 size={11} />
                </span>
              </button>
            )
          })}
        </div>
      </aside>

      {/* CENTER: Articles list */}
      <section className="w-[380px] flex-shrink-0 border-r border-pineider-gold/20 flex flex-col bg-paper-warm/40">
        <div className="px-5 pt-6 pb-3">
          <h3 className="font-display italic text-xl text-pineider-navy truncate">{headerTitle}</h3>
          <p className="text-[11px] uppercase tracking-[0.18em] text-ink-secondary mt-1 font-ui">
            {articles.length} yazı
          </p>
        </div>
        <div className="fleuron mx-5" />

        <div className="px-4 pt-3 pb-2">
          <div className="relative">
            <Search
              size={13}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-secondary"
            />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tüm yazılarda ara…"
              className="luxury w-full pl-7 text-sm"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-2">
          {articles.length === 0 && (
            <div className="text-center text-ink-secondary italic text-sm py-10 font-body">
              Burada yazı yok.
            </div>
          )}
          {articles.map((a) => {
            const isActive = a.id === activeArticleId
            const isRead = !!a.is_read
            const isSaved = !!a.is_saved
            const preview = stripHtml(a.summary || a.content).slice(0, 140)
            return (
              <button
                key={a.id}
                onClick={() => openArticle(a)}
                className={`group w-full text-left paper-cotton px-4 py-3 transition-all relative ${
                  isActive ? 'ring-2 ring-pineider-gold/70 shadow-paper-lg' : 'hover:shadow-paper'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[9px] uppercase tracking-[0.18em] text-pineider-bordeaux font-ui">
                    {a.feed_title || ''}
                  </span>
                  <div className="flex items-center gap-1.5">
                    {!isRead && (
                      <span className="w-1.5 h-1.5 rounded-full bg-pineider-gold inline-block" />
                    )}
                    <span
                      onClick={(e) => {
                        e.stopPropagation()
                        toggleSavedInline(a)
                      }}
                      className="text-ink-secondary hover:text-pineider-gold transition"
                      title={isSaved ? 'Kaydı kaldır' : 'Kaydet'}
                    >
                      {isSaved ? (
                        <BookmarkCheck size={12} className="text-pineider-gold" />
                      ) : (
                        <Bookmark size={12} className="opacity-60 group-hover:opacity-100" />
                      )}
                    </span>
                  </div>
                </div>
                <div
                  className={`font-display italic text-[16px] leading-tight ${
                    isRead ? 'text-ink-secondary/80' : 'text-pineider-navy font-medium'
                  }`}
                >
                  {a.title}
                </div>
                {preview && (
                  <div className="text-[12px] text-ink-secondary font-body line-clamp-2 mt-1.5 leading-snug">
                    {preview}
                  </div>
                )}
                <div className="flex items-center justify-between mt-2">
                  <span className="text-[10px] italic text-ink-secondary font-body truncate max-w-[60%]">
                    {a.author || '—'}
                  </span>
                  <span className="text-[10px] uppercase tracking-wider text-ink-secondary/70 font-ui">
                    {formatShortDate(a.published_at || a.created_at)}
                  </span>
                </div>
              </button>
            )
          })}
        </div>
      </section>

      {/* RIGHT: Reader */}
      <main className="flex-1 flex flex-col overflow-hidden bg-paper-cream">
        {activeArticle ? (
          <>
            <div className="px-8 pt-5 pb-3 border-b border-pineider-gold/15 flex items-center gap-2">
              <button
                onClick={() => window.open(activeArticle.url, '_blank')}
                className="btn-ghost text-xs flex items-center gap-1"
                title="Orijinali aç"
              >
                <ExternalLink size={12} /> Orijinal
              </button>
              <button
                onClick={toggleSaved}
                className="btn-ghost text-xs flex items-center gap-1"
                title={activeArticle.is_saved ? 'Kaydı kaldır' : 'Kaydet'}
              >
                {activeArticle.is_saved ? (
                  <>
                    <BookmarkCheck size={12} className="text-pineider-gold" /> Kayıtlı
                  </>
                ) : (
                  <>
                    <Bookmark size={12} /> Kaydet
                  </>
                )}
              </button>
              <button
                onClick={toggleRead}
                className="btn-ghost text-xs flex items-center gap-1"
                title={activeArticle.is_read ? 'Okunmadı yap' : 'Okundu yap'}
              >
                {activeArticle.is_read ? (
                  <>
                    <EyeOff size={12} /> Okunmadı
                  </>
                ) : (
                  <>
                    <Eye size={12} /> Okundu
                  </>
                )}
              </button>
              <span className="flex-1" />
              <button
                onClick={() => handleRefresh(activeArticle.feed_id)}
                className="btn-ghost text-xs flex items-center gap-1"
                title="Beslemeyi yenile"
                disabled={refreshing}
              >
                {refreshing ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : (
                  <RefreshCw size={12} />
                )}
                Yenile
              </button>
            </div>

            <article className="flex-1 overflow-y-auto">
              <div className="max-w-3xl mx-auto px-10 py-10">
                <div className="text-[11px] uppercase tracking-[0.22em] text-pineider-bordeaux font-ui mb-3">
                  {activeArticle.feed_title || ''}
                  <span className="text-ink-secondary/60 mx-2">·</span>
                  <span className="text-ink-secondary">
                    {formatLongDate(activeArticle.published_at || activeArticle.created_at)}
                  </span>
                </div>
                <h1 className="font-display text-4xl leading-tight text-pineider-navy mb-3">
                  {activeArticle.title}
                </h1>
                {activeArticle.author && (
                  <p className="font-body italic text-ink-secondary mb-6 text-base">
                    — {activeArticle.author}
                  </p>
                )}
                <div className="divider-gold mb-8" />
                <div
                  className="font-body text-[17px] text-ink-primary rss-content"
                  style={{ lineHeight: 1.8 }}
                  dangerouslySetInnerHTML={{
                    __html: activeArticle.content || activeArticle.summary || ''
                  }}
                />
                <div className="divider-gold mt-10" />
                <div className="mt-6 text-center">
                  <button
                    onClick={() => window.open(activeArticle.url, '_blank')}
                    className="btn-primary inline-flex items-center gap-2 text-sm"
                  >
                    <ExternalLink size={13} /> Kaynağa Git
                  </button>
                </div>
              </div>
            </article>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center paper-velin">
            <div className="text-center max-w-sm">
              <Rss size={42} className="mx-auto text-pineider-gold/60 mb-3" />
              <div className="font-display italic text-2xl text-pineider-navy">
                Beslemeler ve Okuma Listesi
              </div>
              <p className="text-sm text-ink-secondary mt-2 font-body italic">
                Yan sütundan bir yazı seçin ya da yeni bir besleme ekleyin.
              </p>
              {showSuggestions && (
                <div className="mt-8 text-left paper-cotton p-5 shadow-paper border border-pineider-gold/30">
                  <div className="text-[11px] uppercase tracking-[0.18em] text-pineider-bordeaux font-ui mb-3 text-center">
                    Önerilenler
                  </div>
                  <div className="space-y-2">
                    {SUGGESTED_FEEDS.map((s) => (
                      <button
                        key={s.url}
                        onClick={() => handleAddFeed(s.url)}
                        className="group w-full flex items-center justify-between gap-3 px-3 py-2 hover:bg-pineider-gold/10 transition rounded-sm"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="font-display italic text-pineider-navy text-[14px] truncate">
                            {s.title}
                          </div>
                          <div className="text-[10px] text-ink-secondary truncate font-body">
                            {s.url}
                          </div>
                        </div>
                        <Plus
                          size={14}
                          className="text-pineider-gold opacity-60 group-hover:opacity-100"
                        />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Add feed modal */}
      {showAddFeed && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-leather-dark/40 fade-in">
          <div className="bg-paper-cream w-[460px] max-w-[92vw] shadow-paper-lg border border-pineider-gold/40 rounded-sm">
            <div className="flex items-center justify-between px-6 pt-5 pb-3">
              <h3 className="font-display italic text-2xl text-pineider-navy">Yeni Besleme</h3>
              <button
                onClick={() => {
                  setShowAddFeed(false)
                  setAddError(null)
                  setNewFeedUrl('')
                }}
                className="text-ink-secondary hover:text-pineider-bordeaux"
              >
                <X size={18} />
              </button>
            </div>
            <div className="fleuron mx-6" />
            <div className="px-6 py-4 space-y-3">
              <label className="block text-[11px] uppercase tracking-wider text-ink-secondary font-ui">
                RSS / Atom URL
              </label>
              <input
                autoFocus
                value={newFeedUrl}
                onChange={(e) => setNewFeedUrl(e.target.value)}
                placeholder="https://…/feed.xml"
                className="luxury w-full"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddFeed()
                }}
              />
              {addError && (
                <div className="text-xs text-pineider-bordeaux italic font-body">{addError}</div>
              )}

              <div className="pt-2">
                <div className="text-[10px] uppercase tracking-[0.18em] text-ink-secondary font-ui mb-2">
                  Önerilenler
                </div>
                <div className="grid grid-cols-1 gap-1.5 max-h-48 overflow-y-auto">
                  {SUGGESTED_FEEDS.map((s) => (
                    <button
                      key={s.url}
                      onClick={() => setNewFeedUrl(s.url)}
                      className="text-left px-3 py-1.5 text-sm font-body italic text-ink-primary hover:bg-pineider-gold/10 transition rounded-sm"
                    >
                      <div className="text-pineider-navy">{s.title}</div>
                      <div className="text-[10px] text-ink-secondary not-italic font-ui truncate">
                        {s.url}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="divider-gold mx-6" />
            <div className="px-6 py-4 flex items-center justify-end gap-2">
              <button
                onClick={() => {
                  setShowAddFeed(false)
                  setAddError(null)
                  setNewFeedUrl('')
                }}
                className="btn-ghost text-sm"
              >
                İptal
              </button>
              <button
                onClick={() => handleAddFeed()}
                className="btn-primary text-sm flex items-center gap-2"
                disabled={adding || !newFeedUrl.trim()}
              >
                {adding && <Loader2 size={12} className="animate-spin" />}
                Ekle
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function FilterRow({
  label,
  Icon,
  count,
  active,
  onClick,
  accent
}: {
  label: string
  Icon: React.ComponentType<{ size?: number; className?: string }>
  count: number
  active: boolean
  onClick: () => void
  accent?: boolean
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-2 py-1.5 transition flex items-center gap-2 rounded-sm sidebar-item ${
        active
          ? 'bg-pineider-gold/15 text-pineider-bordeaux'
          : 'text-ink-primary hover:bg-pineider-gold/8'
      }`}
    >
      <Icon size={12} className={accent ? 'text-pineider-gold' : 'text-ink-secondary'} />
      <span className="flex-1 truncate font-body text-[13px] italic">{label}</span>
      {count > 0 && (
        <span className="text-[10px] font-ui font-semibold text-pineider-gold">{count}</span>
      )}
    </button>
  )
}
