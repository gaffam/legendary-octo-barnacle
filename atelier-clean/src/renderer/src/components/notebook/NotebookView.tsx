import { useEffect, useRef, useState } from 'react'
import {
  BookMarked,
  Plus,
  Trash2,
  FileText,
  X,
  BookOpen,
  Bookmark,
  Pen,
  Coffee,
  Leaf,
  Feather
} from 'lucide-react'
import { useAppStore } from '@/store/appStore'
import { useAtelierEditor } from '@/hooks/useAtelierEditor'
import AtelierEditor from '@/components/editor/AtelierEditor'
import type { Document, Notebook } from '@/types'

const SPINE_COLORS = [
  '#7B1F2B', // bordeaux
  '#1E2A44', // navy
  '#C4A35A', // gold
  '#2F4F3F', // forest
  '#4A2C2A', // espresso
  '#8A6E3F', // tan
  '#6E5773', // plum
  '#3A6B6E' // teal
]

const ICON_CHOICES: Array<{
  key: string
  Icon: React.ComponentType<{ size?: number; className?: string }>
}> = [
  { key: 'book', Icon: BookOpen },
  { key: 'bookmark', Icon: Bookmark },
  { key: 'pen', Icon: Pen },
  { key: 'feather', Icon: Feather },
  { key: 'leaf', Icon: Leaf },
  { key: 'coffee', Icon: Coffee }
]

function NotebookIcon({
  name,
  size = 16,
  className = ''
}: {
  name: string
  size?: number
  className?: string
}) {
  const found = ICON_CHOICES.find((i) => i.key === name)
  const Icon = found?.Icon ?? BookMarked
  return <Icon size={size} className={className} />
}

function formatShortDate(ts: number): string {
  try {
    const d = new Date(ts)
    return d.toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' })
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

export default function NotebookView() {
  const {
    notebooks,
    activeNotebookId,
    setActiveNotebook,
    loadNotebooks,
    language,
    spellCheckEnabled,
    paperStyle
  } = useAppStore()

  const [docs, setDocs] = useState<Document[]>([])
  const [activeDocId, setActiveDocId] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [saving, setSaving] = useState(false)
  const [showCreateNotebook, setShowCreateNotebook] = useState(false)
  const [newNb, setNewNb] = useState({
    title: '',
    description: '',
    color: SPINE_COLORS[0],
    icon: ICON_CHOICES[0].key
  })

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const ignoreNext = useRef(false)
  const lastLoadedDocId = useRef<string | null>(null)

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
    placeholder: 'Sayfa burada başlar…'
  })

  useEffect(() => {
    loadNotebooks()
  }, [loadNotebooks])

  // Load docs when notebook changes
  useEffect(() => {
    let cancel = false
    if (!activeNotebookId) {
      setDocs([])
      setActiveDocId(null)
      return
    }
    window.atelier.documents.list(activeNotebookId).then((list) => {
      if (cancel) return
      setDocs(list)
      if (list.length && !list.find((d) => d.id === activeDocId)) {
        setActiveDocId(list[0].id)
      } else if (!list.length) {
        setActiveDocId(null)
      }
    })
    return () => {
      cancel = true
    }
  }, [activeNotebookId])

  // Hydrate editor when doc changes
  useEffect(() => {
    const doc = docs.find((d) => d.id === activeDocId)
    if (doc && lastLoadedDocId.current !== doc.id) {
      ignoreNext.current = true
      setTitle(doc.title)
      setContent(doc.content)
      lastLoadedDocId.current = doc.id
    } else if (!doc) {
      setTitle('')
      setContent('')
      lastLoadedDocId.current = null
    }
  }, [activeDocId, docs])

  // Debounced auto-save (1.2s)
  useEffect(() => {
    if (!activeDocId) return
    if (lastLoadedDocId.current !== activeDocId) return
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(async () => {
      setSaving(true)
      const updated = await window.atelier.documents.update(activeDocId, {
        title: title || 'Adsız Sayfa',
        content
      })
      setDocs((prev) => prev.map((d) => (d.id === activeDocId ? { ...d, ...updated } : d)))
      setSaving(false)
    }, 1200)
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current)
    }
  }, [title, content, activeDocId])

  const handleCreateNotebook = async () => {
    if (!newNb.title.trim()) return
    const nb = await window.atelier.notebooks.create({
      title: newNb.title.trim(),
      color: newNb.color,
      icon: newNb.icon,
      description: newNb.description.trim()
    })
    await loadNotebooks()
    setActiveNotebook(nb.id)
    setShowCreateNotebook(false)
    setNewNb({ title: '', description: '', color: SPINE_COLORS[0], icon: ICON_CHOICES[0].key })
  }

  const handleDeleteNotebook = async (nb: Notebook) => {
    if (!confirm(`"${nb.title}" defterini silmek istediğinize emin misiniz?`)) return
    await window.atelier.notebooks.delete(nb.id)
    if (activeNotebookId === nb.id) setActiveNotebook(null)
    await loadNotebooks()
  }

  const handleCreatePage = async () => {
    if (!activeNotebookId) return
    const doc = await window.atelier.documents.create({
      notebook_id: activeNotebookId,
      title: 'Yeni Sayfa',
      content: '',
      language
    })
    const list = await window.atelier.documents.list(activeNotebookId)
    setDocs(list)
    setActiveDocId(doc.id)
  }

  const handleDeletePage = async (id: string) => {
    if (!confirm('Bu sayfayı silmek istediğinize emin misiniz?')) return
    await window.atelier.documents.delete(id)
    const list = await window.atelier.documents.list(activeNotebookId!)
    setDocs(list)
    if (activeDocId === id) setActiveDocId(list[0]?.id ?? null)
  }

  const activeNotebook = notebooks.find((n) => n.id === activeNotebookId)
  const pageCounts = docs.length

  return (
    <div className="flex h-full bg-paper-cream fade-in">
      {/* LEFT: Notebooks list */}
      <aside className="w-[260px] flex-shrink-0 border-r border-pineider-gold/20 flex flex-col paper-cotton">
        <div className="px-5 pt-6 pb-3">
          <h2 className="font-display italic text-xl text-pineider-navy">Pamuklu Defterler</h2>
          <p className="text-[11px] uppercase tracking-[0.18em] text-ink-secondary mt-1 font-ui">
            Pineider · Capri
          </p>
        </div>
        <div className="fleuron mx-5" />

        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
          {notebooks.length === 0 && (
            <div className="text-center text-ink-secondary italic text-sm py-10 font-body">
              Henüz defter yok.
              <br />
              İlkini oluşturun.
            </div>
          )}
          {notebooks.map((nb) => {
            const isActive = nb.id === activeNotebookId
            return (
              <button
                key={nb.id}
                onClick={() => setActiveNotebook(nb.id)}
                className={`group w-full text-left notebook-card paper-cotton pl-4 pr-3 py-3 relative transition-all ${
                  isActive ? 'ring-2 ring-pineider-gold/70 shadow-paper-lg' : ''
                }`}
                style={{ borderLeft: `4px solid ${nb.color}` }}
              >
                <div className="flex items-start gap-2">
                  <NotebookIcon name={nb.icon} size={14} className="mt-1 text-pineider-bordeaux" />
                  <div className="flex-1 min-w-0">
                    <div className="font-display text-[15px] leading-tight text-pineider-navy truncate">
                      {nb.title}
                    </div>
                    {nb.description && (
                      <div className="text-[11px] text-ink-secondary italic truncate font-body mt-0.5">
                        {nb.description}
                      </div>
                    )}
                    <div className="text-[10px] uppercase tracking-wider text-ink-secondary/80 mt-1 font-ui">
                      {isActive ? `${pageCounts} sayfa` : '·'}
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDeleteNotebook(nb)
                    }}
                    className="opacity-0 group-hover:opacity-100 text-ink-secondary hover:text-pineider-bordeaux transition"
                    title="Sil"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </button>
            )
          })}
        </div>

        <div className="p-3 border-t border-pineider-gold/20">
          <button
            onClick={() => setShowCreateNotebook(true)}
            className="btn-luxury w-full flex items-center justify-center gap-2 text-sm"
          >
            <Plus size={14} /> Yeni Defter
          </button>
        </div>
      </aside>

      {/* CENTER: Pages list */}
      <section className="w-[320px] flex-shrink-0 border-r border-pineider-gold/20 flex flex-col bg-paper-warm/40">
        <div className="px-5 pt-6 pb-3">
          <h3 className="font-display italic text-xl text-pineider-navy">
            {activeNotebook ? activeNotebook.title : 'Sayfalar'}
          </h3>
          <p className="text-[11px] uppercase tracking-[0.18em] text-ink-secondary mt-1 font-ui">
            Notebook Pages
          </p>
        </div>
        <div className="fleuron mx-5" />

        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
          {!activeNotebook && (
            <div className="text-center text-ink-secondary italic text-sm py-10 font-body">
              Bir defter seçin
            </div>
          )}
          {activeNotebook && docs.length === 0 && (
            <div className="text-center text-ink-secondary italic text-sm py-10 font-body">
              Bu defter henüz boş.
            </div>
          )}
          {docs.map((d) => {
            const isActive = d.id === activeDocId
            const preview = stripHtml(d.content).slice(0, 80)
            return (
              <button
                key={d.id}
                onClick={() => setActiveDocId(d.id)}
                className={`group w-full text-left paper-cotton px-4 py-3 transition-all relative ${
                  isActive ? 'shadow-paper-lg ring-1 ring-pineider-gold/60' : 'hover:shadow-paper'
                }`}
                style={{
                  clipPath: 'polygon(0 0, 100% 1%, 99% 100%, 1% 99%)'
                }}
              >
                <div className="flex items-start gap-2">
                  <FileText size={12} className="mt-1 text-pineider-bordeaux/70 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="font-display text-[15px] text-pineider-navy truncate italic">
                      {d.title || 'Adsız Sayfa'}
                    </div>
                    {preview && (
                      <div className="text-[11px] text-ink-secondary font-body line-clamp-2 mt-1">
                        {preview}
                      </div>
                    )}
                    <div className="text-[10px] uppercase tracking-wider text-ink-secondary/70 mt-1.5 font-ui">
                      {formatShortDate(d.updated_at)}
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDeletePage(d.id)
                    }}
                    className="opacity-0 group-hover:opacity-100 text-ink-secondary hover:text-pineider-bordeaux transition"
                    title="Sil"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </button>
            )
          })}
        </div>

        {activeNotebook && (
          <div className="p-3 border-t border-pineider-gold/20">
            <button
              onClick={handleCreatePage}
              className="btn-primary w-full flex items-center justify-center gap-2 text-sm"
            >
              <Plus size={14} /> Yeni Sayfa
            </button>
          </div>
        )}
      </section>

      {/* RIGHT: Editor */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {activeDocId ? (
          <>
            <div className="px-10 pt-8 pb-3 border-b border-pineider-gold/15 bg-paper-cream">
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Sayfa başlığı…"
                className="w-full bg-transparent border-0 outline-none font-display italic text-3xl text-pineider-navy placeholder:text-ink-secondary/50"
              />
              <div className="flex items-center justify-between mt-2">
                <p className="text-[11px] uppercase tracking-[0.18em] text-ink-secondary font-ui">
                  {activeNotebook?.title}
                </p>
                <span
                  className={`text-[11px] italic font-ui ${saving ? 'text-pineider-bordeaux' : 'text-ink-secondary'}`}
                >
                  {saving ? 'kaydediliyor…' : 'kaydedildi'}
                </span>
              </div>
            </div>
            <div className="flex-1 overflow-hidden">
              <AtelierEditor editor={editor} language={language} paperStyle={paperStyle} />
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center paper-velin">
            <div className="text-center">
              <BookMarked size={42} className="mx-auto text-pineider-gold/60 mb-3" />
              <div className="font-display italic text-2xl text-pineider-navy">
                Sayfa açın ya da oluşturun
              </div>
              <p className="text-sm text-ink-secondary mt-2 font-body italic">
                Capri pamuklu kağıtta, mürekkebinizle.
              </p>
            </div>
          </div>
        )}
      </main>

      {/* Create notebook modal */}
      {showCreateNotebook && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-leather-dark/40 fade-in">
          <div className="bg-paper-cream w-[480px] max-w-[92vw] shadow-paper-lg border border-pineider-gold/40 rounded-sm">
            <div className="flex items-center justify-between px-6 pt-5 pb-3">
              <h3 className="font-display italic text-2xl text-pineider-navy">Yeni Defter</h3>
              <button
                onClick={() => setShowCreateNotebook(false)}
                className="text-ink-secondary hover:text-pineider-bordeaux"
              >
                <X size={18} />
              </button>
            </div>
            <div className="fleuron mx-6" />
            <div className="px-6 py-4 space-y-4">
              <div>
                <label className="block text-[11px] uppercase tracking-wider text-ink-secondary font-ui mb-1">
                  Başlık
                </label>
                <input
                  className="luxury w-full"
                  autoFocus
                  value={newNb.title}
                  onChange={(e) => setNewNb({ ...newNb, title: e.target.value })}
                  placeholder="örn. Seyir Defteri"
                />
              </div>
              <div>
                <label className="block text-[11px] uppercase tracking-wider text-ink-secondary font-ui mb-1">
                  Açıklama
                </label>
                <input
                  className="luxury w-full"
                  value={newNb.description}
                  onChange={(e) => setNewNb({ ...newNb, description: e.target.value })}
                  placeholder="kısa bir notu…"
                />
              </div>
              <div>
                <label className="block text-[11px] uppercase tracking-wider text-ink-secondary font-ui mb-2">
                  Renk
                </label>
                <div className="flex flex-wrap gap-2">
                  {SPINE_COLORS.map((c) => (
                    <button
                      key={c}
                      onClick={() => setNewNb({ ...newNb, color: c })}
                      className={`w-7 h-7 rounded-sm transition ${
                        newNb.color === c
                          ? 'ring-2 ring-pineider-gold ring-offset-2 ring-offset-paper-cream'
                          : ''
                      }`}
                      style={{ background: c }}
                      title={c}
                    />
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-[11px] uppercase tracking-wider text-ink-secondary font-ui mb-2">
                  İkon
                </label>
                <div className="flex flex-wrap gap-2">
                  {ICON_CHOICES.map(({ key, Icon }) => (
                    <button
                      key={key}
                      onClick={() => setNewNb({ ...newNb, icon: key })}
                      className={`w-9 h-9 flex items-center justify-center border rounded-sm transition ${
                        newNb.icon === key
                          ? 'border-pineider-gold bg-pineider-gold/10 text-pineider-bordeaux'
                          : 'border-pineider-gold/30 text-ink-secondary hover:text-pineider-navy'
                      }`}
                    >
                      <Icon size={16} />
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="divider-gold mx-6" />
            <div className="px-6 py-4 flex items-center justify-end gap-2">
              <button onClick={() => setShowCreateNotebook(false)} className="btn-ghost text-sm">
                İptal
              </button>
              <button onClick={handleCreateNotebook} className="btn-primary text-sm">
                Oluştur
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
