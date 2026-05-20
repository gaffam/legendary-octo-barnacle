import { useAppStore } from '@/store/appStore'
import { FileText, Plus, Search, Trash2 } from 'lucide-react'
import { useState, useMemo } from 'react'

function formatDate(ts: number, lang: string) {
  const d = new Date(ts)
  const today = new Date()
  if (d.toDateString() === today.toDateString()) {
    return d.toLocaleTimeString(lang, { hour: '2-digit', minute: '2-digit' })
  }
  return d.toLocaleDateString(lang, { day: 'numeric', month: 'short' })
}

export default function DocumentList() {
  const {
    documents,
    activeDocumentId,
    setActiveDocument,
    createDocument,
    deleteDocument,
    notebooks,
    activeNotebookId,
    setActiveNotebook,
    loadDocuments,
    language
  } = useAppStore()
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    if (!search) return documents
    const q = search.toLowerCase()
    return documents.filter(
      (d) => d.title.toLowerCase().includes(q) || d.content.toLowerCase().includes(q)
    )
  }, [documents, search])

  const handleNew = async () => {
    const doc = await createDocument({ title: 'Yeni Belge', content: '' })
    setActiveDocument(doc.id)
  }

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (confirm('Bu belgeyi silmek istediğinizden emin misiniz?')) {
      await deleteDocument(id)
    }
  }

  return (
    <div className="w-72 border-r border-ink-primary/10 paper-cotton flex flex-col">
      <div className="p-3 border-b border-ink-primary/10">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-display text-lg text-pineider-bordeaux italic">Belgeler</h2>
          <button onClick={handleNew} className="btn-luxury btn-ghost p-1.5" title="Yeni belge">
            <Plus size={14} strokeWidth={1.5} />
          </button>
        </div>

        <select
          value={activeNotebookId || ''}
          onChange={async (e) => {
            const val = e.target.value || null
            setActiveNotebook(val)
            await loadDocuments(val || undefined)
          }}
          className="luxury w-full text-xs mb-2"
        >
          <option value="">Tüm Defterler</option>
          {notebooks.map((nb) => (
            <option key={nb.id} value={nb.id}>
              {nb.title}
            </option>
          ))}
        </select>

        <div className="relative">
          <Search
            size={12}
            className="absolute left-2 top-1/2 -translate-y-1/2 text-ink-secondary/50"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Ara..."
            className="luxury w-full pl-7 text-xs"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="p-6 text-center text-ink-secondary/60 italic text-sm">
            <FileText size={32} className="mx-auto mb-2 opacity-30" strokeWidth={1.2} />
            Henüz belge yok
          </div>
        ) : (
          filtered.map((doc) => (
            <div
              key={doc.id}
              onClick={() => setActiveDocument(doc.id)}
              className={`group p-3 border-b border-ink-primary/5 cursor-pointer transition ${
                activeDocumentId === doc.id
                  ? 'bg-pineider-gold/10 border-l-2 border-l-pineider-gold'
                  : 'hover:bg-ink-primary/3'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="font-display italic text-sm text-ink-primary truncate">
                    {doc.title || 'Adsız Belge'}
                  </div>
                  <div className="text-[11px] text-ink-secondary/70 mt-1 line-clamp-2 font-body">
                    {doc.content
                      .replace(/<[^>]+>/g, ' ')
                      .trim()
                      .slice(0, 80) || 'Boş belge'}
                  </div>
                  <div className="flex items-center gap-2 mt-1.5 text-[10px] text-ink-secondary/50 font-ui">
                    <span>{formatDate(doc.updated_at, language)}</span>
                    <span>•</span>
                    <span>{doc.word_count} söz</span>
                  </div>
                </div>
                <button
                  onClick={(e) => handleDelete(doc.id, e)}
                  className="opacity-0 group-hover:opacity-100 transition p-1 hover:text-pineider-bordeaux"
                  title="Sil"
                >
                  <Trash2 size={12} strokeWidth={1.5} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
