import { create } from 'zustand'
import type { ViewType, Document, Notebook, Language } from '@/types'

interface AppState {
  // View
  currentView: ViewType
  setView: (view: ViewType) => void

  // Settings (cached)
  settings: Record<string, string>
  loadSettings: () => Promise<void>
  updateSetting: (key: string, value: string) => Promise<void>

  // Notebooks
  notebooks: Notebook[]
  activeNotebookId: string | null
  loadNotebooks: () => Promise<void>
  setActiveNotebook: (id: string | null) => void

  // Documents
  documents: Document[]
  activeDocumentId: string | null
  loadDocuments: (notebookId?: string) => Promise<void>
  setActiveDocument: (id: string | null) => void
  createDocument: (data?: Partial<Document>) => Promise<Document>
  updateDocument: (id: string, data: Partial<Document>) => Promise<void>
  deleteDocument: (id: string) => Promise<void>

  // Editor state
  language: Language
  setLanguage: (lang: Language) => void
  paperStyle: 'velin' | 'toile' | 'cotton'
  setPaperStyle: (style: 'velin' | 'toile' | 'cotton') => void
  spellCheckEnabled: boolean
  toggleSpellCheck: () => void

  // AI panel
  aiPanelOpen: boolean
  toggleAiPanel: () => void
}

export const useAppStore = create<AppState>((set, get) => ({
  currentView: 'editor',
  setView: (view) => set({ currentView: view }),

  settings: {},
  loadSettings: async () => {
    const settings = await window.atelier.settings.getAll()
    set({
      settings,
      language: (settings['editor.language'] as Language) || 'tr',
      paperStyle: (settings['editor.paper_style'] as 'velin' | 'toile' | 'cotton') || 'velin',
      spellCheckEnabled: settings['spellcheck.enabled'] !== 'false'
    })
  },
  updateSetting: async (key, value) => {
    await window.atelier.settings.set(key, value)
    set((s) => ({ settings: { ...s.settings, [key]: value } }))
  },

  notebooks: [],
  activeNotebookId: null,
  loadNotebooks: async () => {
    const notebooks = await window.atelier.notebooks.list()
    set({ notebooks })
    if (!get().activeNotebookId && notebooks.length > 0) {
      set({ activeNotebookId: notebooks[0].id })
    }
  },
  setActiveNotebook: (id) => set({ activeNotebookId: id }),

  documents: [],
  activeDocumentId: null,
  loadDocuments: async (notebookId) => {
    const documents = await window.atelier.documents.list(notebookId)
    set({ documents })
  },
  setActiveDocument: (id) => set({ activeDocumentId: id }),
  createDocument: async (data) => {
    const doc = await window.atelier.documents.create({
      notebook_id: get().activeNotebookId || undefined,
      language: get().language,
      ...data
    })
    await get().loadDocuments(get().activeNotebookId || undefined)
    set({ activeDocumentId: doc.id })
    return doc
  },
  updateDocument: async (id, data) => {
    await window.atelier.documents.update(id, data)
    set((s) => ({
      documents: s.documents.map((d) => (d.id === id ? { ...d, ...data } : d))
    }))
  },
  deleteDocument: async (id) => {
    await window.atelier.documents.delete(id)
    set((s) => ({
      documents: s.documents.filter((d) => d.id !== id),
      activeDocumentId: s.activeDocumentId === id ? null : s.activeDocumentId
    }))
  },

  language: 'tr',
  setLanguage: (lang) => {
    window.atelier.settings.set('editor.language', lang)
    set({ language: lang })
  },
  paperStyle: 'velin',
  setPaperStyle: (style) => {
    window.atelier.settings.set('editor.paper_style', style)
    set({ paperStyle: style })
  },
  spellCheckEnabled: true,
  toggleSpellCheck: () => {
    const v = !get().spellCheckEnabled
    window.atelier.settings.set('spellcheck.enabled', v ? 'true' : 'false')
    set({ spellCheckEnabled: v })
  },

  aiPanelOpen: false,
  toggleAiPanel: () => set((s) => ({ aiPanelOpen: !s.aiPanelOpen }))
}))
