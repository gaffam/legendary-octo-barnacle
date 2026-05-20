import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Search,
  Plus,
  Tag,
  Link2,
  Trash2,
  Network,
  FileText,
  ArrowRight,
  ArrowLeft,
  X
} from 'lucide-react'
import { Network as VisNetwork, DataSet } from 'vis-network/standalone'
import { useAppStore } from '@/store/appStore'
import { useAtelierEditor } from '@/hooks/useAtelierEditor'
import AtelierEditor from '@/components/editor/AtelierEditor'
import type { ZettelNote } from '@/types'

const GOLD = '#C4A35A'
const NAVY = '#1E2A44'
const BORDEAUX = '#7B1F2B'
const CREAM = '#F5EFE0'

function formatShortDate(ts: number): string {
  try {
    const d = new Date(ts)
    return d.toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: '2-digit' })
  } catch {
    return ''
  }
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

// Extract [[Title]] references from HTML/plain content.
function extractWikilinks(content: string): string[] {
  const text = stripHtml(content)
  const matches = text.match(/\[\[([^\]]+)\]\]/g) || []
  const unique = new Set<string>()
  matches.forEach((m) => {
    const inner = m.slice(2, -2).trim()
    if (inner) unique.add(inner)
  })
  return Array.from(unique)
}

// Highlight [[wikilink]] occurrences in HTML for preview rendering.
function highlightWikilinks(html: string): string {
  return html.replace(
    /\[\[([^\]]+)\]\]/g,
    '<span class="zettel-wikilink" style="color:#C4A35A;text-decoration:underline;text-underline-offset:3px;font-style:italic;">$1</span>'
  )
}

export default function ZettelkastenView() {
  const { language, spellCheckEnabled, paperStyle } = useAppStore()

  const [notes, setNotes] = useState<ZettelNote[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [tagsInput, setTagsInput] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [showRight, setShowRight] = useState(true)
  const [showGraph, setShowGraph] = useState(false)
  const [saving, setSaving] = useState(false)

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const ignoreNext = useRef(false)
  const lastLoadedId = useRef<string | null>(null)
  const graphRef = useRef<HTMLDivElement | null>(null)
  const networkRef = useRef<VisNetwork | null>(null)

  const editor = useAtelierEditor({
    content,
    onChange: (html) => {
      if (ignoreNext.current) {
        ignoreNext.current = false
        return
      }
      setContent(html)
    },
    language,
    spellCheck: spellCheckEnabled,
    placeholder: 'Tek bir düşünce, tek bir kart… [[başka not]] yazarak bağ kurun.'
  })

  // Load notes
  const reload = async () => {
    const list = await window.atelier.zettel.list()
    setNotes(list)
    return list
  }

  useEffect(() => {
    reload().then((list) => {
      if (list.length && !activeId) setActiveId(list[0].id)
    })
  }, [])

  // Search (debounced)
  useEffect(() => {
    const q = searchQuery.trim()
    const t = setTimeout(async () => {
      if (!q) {
        const list = await window.atelier.zettel.list()
        setNotes(list)
        return
      }
      const list = await window.atelier.zettel.search(q)
      setNotes(list)
    }, 250)
    return () => clearTimeout(t)
  }, [searchQuery])

  // Hydrate on selection
  useEffect(() => {
    const note = notes.find((n) => n.id === activeId)
    if (note && lastLoadedId.current !== note.id) {
      ignoreNext.current = true
      setTitle(note.title)
      setContent(note.content)
      setTagsInput((note.tags || []).join(', '))
      lastLoadedId.current = note.id
    } else if (!note) {
      setTitle('')
      setContent('')
      setTagsInput('')
      lastLoadedId.current = null
    }
  }, [activeId, notes])

  // Resolve wikilinks -> target UIDs (by case-insensitive title match)
  const resolveLinks = (htmlContent: string, allNotes: ZettelNote[], selfId: string): string[] => {
    const titles = extractWikilinks(htmlContent)
    const uids: string[] = []
    titles.forEach((t) => {
      const target = allNotes.find(
        (n) => n.id !== selfId && n.title.trim().toLowerCase() === t.toLowerCase()
      )
      if (target?.uid) uids.push(target.uid)
    })
    return Array.from(new Set(uids))
  }

  // Debounced save with bidirectional backlink maintenance
  useEffect(() => {
    if (!activeId) return
    if (lastLoadedId.current !== activeId) return
    if (saveTimer.current) clearTimeout(saveTimer.current)

    saveTimer.current = setTimeout(async () => {
      setSaving(true)
      const tags = tagsInput
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)

      const current = notes.find((n) => n.id === activeId)
      const allNotes = await window.atelier.zettel.list()
      const me = allNotes.find((n) => n.id === activeId)
      const myUid = me?.uid || current?.uid || ''

      const newLinks = resolveLinks(content, allNotes, activeId)
      const oldLinks = current?.links || []

      // Update self
      await window.atelier.zettel.update(activeId, {
        title: title || 'Adsız Not',
        content,
        tags,
        links: newLinks
      })

      // Maintain bidirectional backlinks
      const removed = oldLinks.filter((u) => !newLinks.includes(u))
      const added = newLinks.filter((u) => !oldLinks.includes(u))

      for (const uid of removed) {
        const target = allNotes.find((n) => n.uid === uid)
        if (!target) continue
        const newBack = (target.backlinks || []).filter((u) => u !== myUid)
        await window.atelier.zettel.update(target.id, { backlinks: newBack })
      }
      for (const uid of added) {
        const target = allNotes.find((n) => n.uid === uid)
        if (!target) continue
        const back = target.backlinks || []
        if (myUid && !back.includes(myUid)) {
          await window.atelier.zettel.update(target.id, { backlinks: [...back, myUid] })
        }
      }

      await reload()
      setSaving(false)
    }, 1200)

    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current)
    }
  }, [title, content, tagsInput, activeId])

  const handleCreate = async () => {
    const note = await window.atelier.zettel.create({
      title: 'Yeni Düşünce',
      content: '',
      tags: [],
      links: [],
      backlinks: []
    })
    await reload()
    setActiveId(note.id)
  }

  const handleDelete = async (id: string) => {
    const target = notes.find((n) => n.id === id)
    if (!target) return
    if (!confirm(`"${target.title}" notunu silmek istediğinize emin misiniz?`)) return
    // Remove this UID from any other note's backlinks/links
    const all = await window.atelier.zettel.list()
    for (const n of all) {
      if (n.id === id) continue
      const newBack = (n.backlinks || []).filter((u) => u !== target.uid)
      const newLinks = (n.links || []).filter((u) => u !== target.uid)
      if (
        newBack.length !== (n.backlinks || []).length ||
        newLinks.length !== (n.links || []).length
      ) {
        await window.atelier.zettel.update(n.id, { backlinks: newBack, links: newLinks })
      }
    }
    await window.atelier.zettel.delete(id)
    const list = await reload()
    if (activeId === id) setActiveId(list[0]?.id ?? null)
  }

  const activeNote = useMemo(() => notes.find((n) => n.id === activeId), [notes, activeId])

  const noteByUid = useMemo(() => {
    const m = new Map<string, ZettelNote>()
    notes.forEach((n) => m.set(n.uid, n))
    return m
  }, [notes])

  const outboundNotes = useMemo(
    () =>
      (activeNote?.links || []).map((uid) => noteByUid.get(uid)).filter(Boolean) as ZettelNote[],
    [activeNote, noteByUid]
  )
  const backlinkNotes = useMemo(
    () =>
      (activeNote?.backlinks || [])
        .map((uid) => noteByUid.get(uid))
        .filter(Boolean) as ZettelNote[],
    [activeNote, noteByUid]
  )

  // Graph rendering
  useEffect(() => {
    if (!showGraph || !graphRef.current) return
    const nodes = new DataSet(
      notes.map((n) => ({
        id: n.id,
        label: n.title || 'Adsız',
        color: {
          background: n.id === activeId ? BORDEAUX : NAVY,
          border: n.id === activeId ? GOLD : NAVY,
          highlight: { background: BORDEAUX, border: GOLD }
        },
        font: { color: CREAM, face: 'EB Garamond, serif', size: 14 },
        shape: 'dot',
        size: 14 + Math.min(8, (n.backlinks?.length || 0) * 2)
      }))
    )

    const edgesArr: { from: string; to: string }[] = []
    notes.forEach((n) => {
      ;(n.links || []).forEach((uid) => {
        const target = noteByUid.get(uid)
        if (target) edgesArr.push({ from: n.id, to: target.id })
      })
    })
    const edges = new DataSet(
      edgesArr.map((e, i) => ({
        id: `e${i}`,
        ...e,
        color: { color: GOLD, opacity: 0.65, highlight: BORDEAUX },
        smooth: { enabled: true, type: 'curvedCW', roundness: 0.2 },
        arrows: { to: { enabled: true, scaleFactor: 0.5 } },
        width: 1.2
      }))
    )

    const network = new VisNetwork(
      graphRef.current,
      { nodes: nodes as any, edges: edges as any },
      {
        physics: {
          enabled: true,
          solver: 'forceAtlas2Based',
          forceAtlas2Based: { gravitationalConstant: -50, springLength: 120 },
          stabilization: { iterations: 200 }
        },
        interaction: { hover: true, tooltipDelay: 200 },
        nodes: { borderWidth: 2 },
        layout: { improvedLayout: true }
      }
    )

    network.on('selectNode', (params) => {
      if (params.nodes?.length) setActiveId(params.nodes[0] as string)
    })

    networkRef.current = network
    return () => {
      network.destroy()
      networkRef.current = null
    }
  }, [showGraph, notes, activeId, noteByUid])

  // Render preview wikilinks via injected stylesheet click handler
  const handlePreviewClick = (_e: React.MouseEvent) => {
    // Currently a no-op; reserved for future click-on-wikilink to navigate
  }

  return (
    <div className="flex h-full bg-paper-cream fade-in">
      {/* LEFT: Note list */}
      <aside className="w-[280px] flex-shrink-0 border-r border-pineider-gold/20 flex flex-col paper-cotton">
        <div className="px-5 pt-6 pb-3">
          <h2 className="font-display italic text-xl text-pineider-navy">Zettelkasten</h2>
          <p className="text-[11px] uppercase tracking-[0.18em] text-ink-secondary mt-1 font-ui">
            Düşünce Atölyesi
          </p>
        </div>
        <div className="fleuron mx-5" />

        <div className="px-3 pt-3 pb-2">
          <div className="relative">
            <Search
              size={13}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-secondary"
            />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Ara…"
              className="luxury w-full pl-7 text-sm"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2">
          {notes.length === 0 && (
            <div className="text-center text-ink-secondary italic text-sm py-10 font-body">
              Henüz kart yok.
              <br />
              İlk düşünceyi yazın.
            </div>
          )}
          {notes.map((n) => {
            const isActive = n.id === activeId
            const linkCount = (n.links?.length || 0) + (n.backlinks?.length || 0)
            return (
              <button
                key={n.id}
                onClick={() => setActiveId(n.id)}
                className={`group w-full text-left paper-cotton px-3 py-2.5 transition-all relative ${
                  isActive ? 'ring-2 ring-pineider-gold/70 shadow-paper-lg' : 'hover:shadow-paper'
                }`}
              >
                <div className="flex items-start gap-2">
                  <FileText size={11} className="mt-1 text-pineider-bordeaux/70 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="font-mono text-[10px] text-pineider-gold tracking-wide">
                      {n.uid}
                    </div>
                    <div className="font-display italic text-[15px] text-pineider-navy truncate leading-tight">
                      {n.title || 'Adsız Not'}
                    </div>
                    {n.tags && n.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {n.tags.slice(0, 3).map((t) => (
                          <span
                            key={t}
                            className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 border border-pineider-gold/40 text-pineider-bordeaux font-ui rounded-sm"
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="flex items-center justify-between mt-1.5">
                      <span className="text-[10px] uppercase tracking-wider text-ink-secondary/70 font-ui">
                        {formatShortDate(n.updated_at)}
                      </span>
                      {linkCount > 0 && (
                        <span className="text-[10px] text-pineider-gold font-ui flex items-center gap-0.5">
                          <ArrowRight size={9} /> {linkCount}
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDelete(n.id)
                    }}
                    className="opacity-0 group-hover:opacity-100 text-ink-secondary hover:text-pineider-bordeaux transition"
                    title="Sil"
                  >
                    <Trash2 size={11} />
                  </button>
                </div>
              </button>
            )
          })}
        </div>

        <div className="p-3 border-t border-pineider-gold/20">
          <button
            onClick={handleCreate}
            className="btn-primary w-full flex items-center justify-center gap-2 text-sm"
          >
            <Plus size={14} /> Yeni Kart
          </button>
        </div>
      </aside>

      {/* CENTER: Editor */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {showGraph ? (
          <div className="flex-1 flex flex-col">
            <div className="px-8 pt-6 pb-3 border-b border-pineider-gold/15 bg-paper-cream flex items-center justify-between">
              <div>
                <h3 className="font-display italic text-2xl text-pineider-navy">Düşünce Ağı</h3>
                <p className="text-[11px] uppercase tracking-[0.18em] text-ink-secondary mt-1 font-ui">
                  Graph — {notes.length} kart
                </p>
              </div>
              <button
                onClick={() => setShowGraph(false)}
                className="btn-ghost text-sm flex items-center gap-2"
              >
                <X size={14} /> Kapat
              </button>
            </div>
            <div ref={graphRef} className="flex-1 leather-bg" />
          </div>
        ) : activeId && activeNote ? (
          <>
            <div className="px-10 pt-8 pb-3 border-b border-pineider-gold/15 bg-paper-cream">
              <div className="flex items-center gap-3 mb-2">
                <span className="font-mono text-xs text-pineider-gold tracking-wide">
                  {activeNote.uid}
                </span>
                <span className="text-[11px] uppercase tracking-[0.18em] text-ink-secondary font-ui">
                  Zettel
                </span>
                <span className="flex-1" />
                <span
                  className={`text-[11px] italic font-ui ${
                    saving ? 'text-pineider-bordeaux' : 'text-ink-secondary'
                  }`}
                >
                  {saving ? 'kaydediliyor…' : 'kaydedildi'}
                </span>
                <button
                  onClick={() => setShowRight((v) => !v)}
                  className="btn-ghost text-xs flex items-center gap-1"
                  title="Bağlantı panelini aç/kapat"
                >
                  <Link2 size={12} /> {showRight ? 'Gizle' : 'Bağlar'}
                </button>
                <button
                  onClick={() => setShowGraph(true)}
                  className="btn-ghost text-xs flex items-center gap-1"
                  title="Düşünce ağı"
                >
                  <Network size={12} /> Ağ
                </button>
              </div>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Bir düşünceye başlık verin…"
                className="w-full bg-transparent border-0 outline-none font-display italic text-3xl text-pineider-navy placeholder:text-ink-secondary/50"
              />
            </div>

            <div className="flex-1 overflow-hidden">
              <AtelierEditor editor={editor} language={language} paperStyle={paperStyle} />
            </div>

            {/* Tags input */}
            <div className="px-10 py-3 border-t border-pineider-gold/15 bg-paper-warm/30 flex items-center gap-3">
              <Tag size={13} className="text-pineider-bordeaux" />
              <input
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                placeholder="etiketler, virgülle ayrılır…"
                className="luxury flex-1 text-sm"
              />
            </div>

            {/* Inline preview of highlighted wikilinks */}
            <div
              className="px-10 py-2 border-t border-pineider-gold/10 bg-paper-cream/60 max-h-24 overflow-y-auto"
              onClick={handlePreviewClick}
            >
              <div className="text-[10px] uppercase tracking-[0.18em] text-ink-secondary font-ui mb-1">
                Önizleme · [[bağlantılar]]
              </div>
              <div
                className="font-body text-sm text-ink-primary leading-relaxed italic"
                dangerouslySetInnerHTML={{
                  __html: highlightWikilinks(stripHtml(content).slice(0, 240) || '—')
                }}
              />
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center paper-velin">
            <div className="text-center">
              <FileText size={42} className="mx-auto text-pineider-gold/60 mb-3" />
              <div className="font-display italic text-2xl text-pineider-navy">
                Bir kart seçin ya da oluşturun
              </div>
              <p className="text-sm text-ink-secondary mt-2 font-body italic">
                Tek bir düşünce, tek bir kart.
              </p>
            </div>
          </div>
        )}
      </main>

      {/* RIGHT: Links panel */}
      {showRight && !showGraph && (
        <aside className="w-[320px] flex-shrink-0 border-l border-pineider-gold/20 flex flex-col paper-cotton overflow-hidden">
          <div className="px-5 pt-6 pb-3">
            <h3 className="font-display italic text-xl text-pineider-navy">Bağlar</h3>
            <p className="text-[11px] uppercase tracking-[0.18em] text-ink-secondary mt-1 font-ui">
              İçeri & Dışarı
            </p>
          </div>
          <div className="fleuron mx-5" />

          <div className="px-3 py-3 flex-1 overflow-y-auto space-y-5">
            {/* Outbound */}
            <section>
              <div className="flex items-center gap-2 px-2 mb-2">
                <ArrowRight size={12} className="text-pineider-gold" />
                <span className="text-[11px] uppercase tracking-[0.18em] text-pineider-bordeaux font-ui">
                  Bağlantılar
                </span>
                <span className="text-[10px] text-ink-secondary font-ui ml-auto">
                  {outboundNotes.length}
                </span>
              </div>
              {outboundNotes.length === 0 ? (
                <div className="px-2 text-xs italic text-ink-secondary font-body">
                  Henüz bağ yok. İçerikte [[başlık]] kullanın.
                </div>
              ) : (
                <div className="space-y-1.5">
                  {outboundNotes.map((n) => (
                    <button
                      key={n.id}
                      onClick={() => setActiveId(n.id)}
                      className="w-full text-left px-3 py-2 paper-cotton hover:shadow-paper transition border-l-2 border-pineider-gold/60"
                    >
                      <div className="font-mono text-[9px] text-pineider-gold tracking-wide">
                        {n.uid}
                      </div>
                      <div className="font-display italic text-[14px] text-pineider-navy truncate">
                        {n.title || 'Adsız'}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </section>

            {/* Backlinks */}
            <section>
              <div className="flex items-center gap-2 px-2 mb-2">
                <ArrowLeft size={12} className="text-pineider-bordeaux" />
                <span className="text-[11px] uppercase tracking-[0.18em] text-pineider-bordeaux font-ui">
                  Geri Bağlantılar
                </span>
                <span className="text-[10px] text-ink-secondary font-ui ml-auto">
                  {backlinkNotes.length}
                </span>
              </div>
              {backlinkNotes.length === 0 ? (
                <div className="px-2 text-xs italic text-ink-secondary font-body">
                  Henüz geri bağ yok.
                </div>
              ) : (
                <div className="space-y-1.5">
                  {backlinkNotes.map((n) => (
                    <button
                      key={n.id}
                      onClick={() => setActiveId(n.id)}
                      className="w-full text-left px-3 py-2 paper-cotton hover:shadow-paper transition border-l-2 border-pineider-bordeaux/60"
                    >
                      <div className="font-mono text-[9px] text-pineider-gold tracking-wide">
                        {n.uid}
                      </div>
                      <div className="font-display italic text-[14px] text-pineider-navy truncate">
                        {n.title || 'Adsız'}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </section>
          </div>

          <div className="p-3 border-t border-pineider-gold/20">
            <button
              onClick={() => setShowGraph(true)}
              className="btn-luxury w-full flex items-center justify-center gap-2 text-sm"
            >
              <Network size={14} /> Düşünce Ağı
            </button>
          </div>
        </aside>
      )}
    </div>
  )
}
