import { contextBridge, ipcRenderer } from 'electron'

const api = {
  // Window controls
  window: {
    minimize: () => ipcRenderer.send('window:minimize'),
    maximize: () => ipcRenderer.send('window:maximize'),
    close: () => ipcRenderer.send('window:close'),
    isMaximized: () => ipcRenderer.invoke('window:isMaximized'),
    onMaximized: (cb: (isMax: boolean) => void) => {
      const handler = (_: unknown, isMax: boolean) => cb(isMax)
      ipcRenderer.on('window:maximized', handler)
      return () => ipcRenderer.removeListener('window:maximized', handler)
    }
  },

  // Spell check
  spell: {
    check: (word: string, lang: string) => ipcRenderer.invoke('spell:check', word, lang),
    checkBatch: (words: string[], lang: string) =>
      ipcRenderer.invoke('spell:checkBatch', words, lang),
    addWord: (word: string, lang: string) => ipcRenderer.invoke('spell:addWord', word, lang),
    availableLanguages: () => ipcRenderer.invoke('spell:languages')
  },

  // File operations
  file: {
    exportPdf: (title: string, html: string) => ipcRenderer.invoke('file:exportPdf', title, html),
    exportDocx: (title: string, html: string) => ipcRenderer.invoke('file:exportDocx', title, html),
    exportMarkdown: (title: string, html: string) =>
      ipcRenderer.invoke('file:exportMarkdown', title, html),
    importMarkdown: () => ipcRenderer.invoke('file:importMarkdown'),
    openInExplorer: (path: string) => ipcRenderer.invoke('file:openInExplorer', path),
    getDataPath: () => ipcRenderer.invoke('file:getDataPath')
  },

  // Database - Documents
  documents: {
    create: (data: any) => ipcRenderer.invoke('db:createDocument', data),
    get: (id: string) => ipcRenderer.invoke('db:getDocument', id),
    update: (id: string, data: any) => ipcRenderer.invoke('db:updateDocument', id, data),
    delete: (id: string) => ipcRenderer.invoke('db:deleteDocument', id),
    list: (notebookId?: string) => ipcRenderer.invoke('db:listDocuments', notebookId),
    search: (query: string) => ipcRenderer.invoke('db:searchDocuments', query)
  },

  // Notebooks
  notebooks: {
    list: () => ipcRenderer.invoke('db:listNotebooks'),
    create: (data: any) => ipcRenderer.invoke('db:createNotebook', data),
    update: (id: string, data: any) => ipcRenderer.invoke('db:updateNotebook', id, data),
    delete: (id: string) => ipcRenderer.invoke('db:deleteNotebook', id)
  },

  // Agenda
  agenda: {
    create: (data: any) => ipcRenderer.invoke('db:createAgendaEntry', data),
    list: (dateFrom?: string, dateTo?: string) =>
      ipcRenderer.invoke('db:listAgendaEntries', dateFrom, dateTo),
    update: (id: string, data: any) => ipcRenderer.invoke('db:updateAgendaEntry', id, data),
    delete: (id: string) => ipcRenderer.invoke('db:deleteAgendaEntry', id)
  },

  // Zettelkasten
  zettel: {
    create: (data: any) => ipcRenderer.invoke('db:createZettel', data),
    list: () => ipcRenderer.invoke('db:listZettels'),
    update: (id: string, data: any) => ipcRenderer.invoke('db:updateZettel', id, data),
    delete: (id: string) => ipcRenderer.invoke('db:deleteZettel', id),
    search: (query: string) => ipcRenderer.invoke('db:searchZettels', query)
  },

  // Settings
  settings: {
    get: (key: string) => ipcRenderer.invoke('db:getSetting', key),
    set: (key: string, value: string) => ipcRenderer.invoke('db:setSetting', key, value),
    getAll: () => ipcRenderer.invoke('db:getAllSettings')
  },

  // AI
  ai: {
    complete: (opts: any) => ipcRenderer.invoke('ai:complete', opts),
    improveText: (opts: any) => ipcRenderer.invoke('ai:improveText', opts),
    listConversations: () => ipcRenderer.invoke('db:listConversations'),
    createConversation: (data: any) => ipcRenderer.invoke('db:createConversation', data),
    updateConversation: (id: string, data: any) =>
      ipcRenderer.invoke('db:updateConversation', id, data),
    deleteConversation: (id: string) => ipcRenderer.invoke('db:deleteConversation', id)
  },

  // RSS
  rss: {
    addFeed: (url: string) => ipcRenderer.invoke('rss:addFeed', url),
    refreshFeed: (feedId: string) => ipcRenderer.invoke('rss:refreshFeed', feedId),
    refreshAll: () => ipcRenderer.invoke('rss:refreshAll'),
    listFeeds: () => ipcRenderer.invoke('rss:listFeeds'),
    deleteFeed: (id: string) => ipcRenderer.invoke('rss:deleteFeed', id),
    listArticles: (opts: any) => ipcRenderer.invoke('rss:listArticles', opts),
    markRead: (id: string, isRead: boolean) => ipcRenderer.invoke('rss:markRead', id, isRead),
    toggleSaved: (id: string) => ipcRenderer.invoke('rss:toggleSaved', id),
    searchArticles: (query: string) => ipcRenderer.invoke('rss:searchArticles', query),
    getStats: () => ipcRenderer.invoke('rss:getStats')
  },

  // Cloud
  cloud: {
    testConnection: (config: any) => ipcRenderer.invoke('cloud:testConnection', config),
    sync: (config: any) => ipcRenderer.invoke('cloud:sync', config),
    restore: (config: any) => ipcRenderer.invoke('cloud:restore', config),
    localBackup: () => ipcRenderer.invoke('cloud:localBackup')
  }
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('atelier', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore
  window.atelier = api
}

export type AtelierAPI = typeof api
