import { useEffect, useRef, useState } from 'react'
import { useAppStore } from '@/store/appStore'
import AtelierEditor from './AtelierEditor'
import EditorToolbar from './EditorToolbar'
import DocumentList from './DocumentList'
import { useAtelierEditor } from '@/hooks/useAtelierEditor'

export default function EditorView() {
  const {
    language,
    spellCheckEnabled,
    paperStyle,
    documents,
    activeDocumentId,
    setActiveDocument,
    createDocument,
    updateDocument
  } = useAppStore()

  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [saving, setSaving] = useState(false)
  const [notification, setNotification] = useState<string>('')
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const ignoreNextChange = useRef(false)

  const editor = useAtelierEditor({
    content,
    onChange: (html) => {
      if (ignoreNextChange.current) {
        ignoreNextChange.current = false
        return
      }
      setContent(html)
    },
    language,
    spellCheck: spellCheckEnabled
  })

  const activeDoc = documents.find((d) => d.id === activeDocumentId)

  useEffect(() => {
    if (activeDoc) {
      ignoreNextChange.current = true
      setTitle(activeDoc.title)
      setContent(activeDoc.content)
    } else {
      setTitle('')
      setContent('')
    }
  }, [activeDocumentId])

  // Auto-save (debounced)
  useEffect(() => {
    if (!activeDocumentId) return
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(async () => {
      setSaving(true)
      await updateDocument(activeDocumentId, { title: title || 'Adsız Belge', content })
      setSaving(false)
    }, 1500)
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current)
    }
  }, [title, content, activeDocumentId])

  const handleNew = async () => {
    const doc = await createDocument({ title: 'Yeni Belge', content: '' })
    setActiveDocument(doc.id)
  }

  const ensureDoc = async () => {
    if (activeDocumentId) return activeDocumentId
    const doc = await createDocument({ title: title || 'Yeni Belge', content })
    return doc.id
  }

  const handleSave = async () => {
    const id = await ensureDoc()
    setSaving(true)
    await updateDocument(id, { title: title || 'Adsız Belge', content })
    setSaving(false)
    showNotification('Belge kaydedildi')
  }

  const showNotification = (msg: string) => {
    setNotification(msg)
    setTimeout(() => setNotification(''), 2500)
  }

  const exportPdf = async () => {
    await ensureDoc()
    const r = await window.atelier.file.exportPdf(title || 'Adsız', content)
    if (r.success && r.path) {
      showNotification(`PDF kaydedildi`)
      window.atelier.file.openInExplorer(r.path)
    } else {
      showNotification('PDF hatası: ' + r.error)
    }
  }

  const exportDocx = async () => {
    await ensureDoc()
    const r = await window.atelier.file.exportDocx(title || 'Adsız', content)
    if (r.success && r.path) {
      showNotification(`Word kaydedildi`)
      window.atelier.file.openInExplorer(r.path)
    } else {
      showNotification('Word hatası: ' + r.error)
    }
  }

  const exportMd = async () => {
    await ensureDoc()
    const r = await window.atelier.file.exportMarkdown(title || 'Adsız', content)
    if (r.success && r.path) {
      showNotification(`Markdown kaydedildi`)
      window.atelier.file.openInExplorer(r.path)
    } else {
      showNotification('MD hatası: ' + r.error)
    }
  }

  return (
    <div className="flex h-full">
      <DocumentList />
      <div className="flex-1 flex flex-col overflow-hidden relative">
        <EditorToolbar
          editor={editor}
          title={title}
          onTitleChange={setTitle}
          onSave={handleSave}
          onExportPdf={exportPdf}
          onExportDocx={exportDocx}
          onExportMd={exportMd}
          onNew={handleNew}
          saving={saving}
        />
        <div className="flex-1 overflow-hidden">
          <AtelierEditor editor={editor} language={language} paperStyle={paperStyle} />
        </div>
        {notification && (
          <div className="absolute bottom-6 right-8 bg-leather-dark text-pineider-gold px-4 py-2 rounded-sm shadow-paper-lg text-sm fade-in font-ui italic z-30">
            {notification}
          </div>
        )}
      </div>
    </div>
  )
}
