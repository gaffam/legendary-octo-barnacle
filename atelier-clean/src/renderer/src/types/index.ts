export type ViewType = 'editor' | 'notebook' | 'agenda' | 'zettelkasten' | 'rss' | 'ai' | 'settings'

export type Language = 'tr' | 'en' | 'fr' | 'it'

export interface Document {
  id: string
  title: string
  content: string
  format: string
  notebook_id?: string
  tags: string[]
  language: Language
  word_count: number
  created_at: number
  updated_at: number
  is_archived: number
  metadata: Record<string, unknown>
}

export interface Notebook {
  id: string
  title: string
  color: string
  icon: string
  description: string
  created_at: number
  updated_at: number
  sort_order: number
}

export interface AgendaEntry {
  id: string
  title: string
  content: string
  date: string
  time?: string
  end_time?: string
  type: string
  is_completed: number
  color: string
  tags: string[]
  created_at: number
  updated_at: number
}

export interface ZettelNote {
  id: string
  uid: string
  title: string
  content: string
  tags: string[]
  links: string[]
  backlinks: string[]
  created_at: number
  updated_at: number
}

export interface RssFeed {
  id: string
  title: string
  url: string
  description: string
  favicon_url: string
  last_fetched: number
  fetch_interval: number
  is_active: number
  created_at: number
}

export interface RssArticle {
  id: string
  feed_id: string
  feed_title?: string
  title: string
  url: string
  content: string
  summary: string
  author: string
  published_at: number
  is_read: number
  is_saved: number
  tags: string[]
  created_at: number
}

export interface AIMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp?: number
}

export interface AIConversation {
  id: string
  title: string
  document_id?: string
  messages: AIMessage[]
  created_at: number
  updated_at: number
}

export interface CloudConfig {
  provider: 'webdav'
  url: string
  username: string
  password: string
}

declare global {
  interface Window {
    atelier: {
      window: {
        minimize: () => void
        maximize: () => void
        close: () => void
        isMaximized: () => Promise<boolean>
        onMaximized: (cb: (isMax: boolean) => void) => () => void
      }
      spell: {
        check: (word: string, lang: string) => Promise<{ correct: boolean; suggestions: string[] }>
        checkBatch: (
          words: string[],
          lang: string
        ) => Promise<{ correct: boolean; suggestions: string[] }[]>
        addWord: (word: string, lang: string) => Promise<boolean>
        availableLanguages: () => Promise<string[]>
      }
      file: {
        exportPdf: (
          title: string,
          html: string
        ) => Promise<{ success: boolean; path?: string; error?: string }>
        exportDocx: (
          title: string,
          html: string
        ) => Promise<{ success: boolean; path?: string; error?: string }>
        exportMarkdown: (
          title: string,
          html: string
        ) => Promise<{ success: boolean; path?: string; error?: string }>
        importMarkdown: () => Promise<string | null>
        openInExplorer: (path: string) => Promise<void>
        getDataPath: () => Promise<string>
      }
      documents: {
        create: (data: Partial<Document>) => Promise<Document>
        get: (id: string) => Promise<Document | null>
        update: (id: string, data: Partial<Document>) => Promise<Document>
        delete: (id: string) => Promise<boolean>
        list: (notebookId?: string) => Promise<Document[]>
        search: (query: string) => Promise<Document[]>
      }
      notebooks: {
        list: () => Promise<Notebook[]>
        create: (data: Partial<Notebook>) => Promise<Notebook>
        update: (id: string, data: Partial<Notebook>) => Promise<Notebook>
        delete: (id: string) => Promise<boolean>
      }
      agenda: {
        create: (data: Partial<AgendaEntry>) => Promise<AgendaEntry>
        list: (dateFrom?: string, dateTo?: string) => Promise<AgendaEntry[]>
        update: (id: string, data: Partial<AgendaEntry>) => Promise<AgendaEntry>
        delete: (id: string) => Promise<boolean>
      }
      zettel: {
        create: (data: Partial<ZettelNote>) => Promise<ZettelNote>
        list: () => Promise<ZettelNote[]>
        update: (id: string, data: Partial<ZettelNote>) => Promise<ZettelNote>
        delete: (id: string) => Promise<boolean>
        search: (query: string) => Promise<ZettelNote[]>
      }
      settings: {
        get: (key: string) => Promise<string | null>
        set: (key: string, value: string) => Promise<boolean>
        getAll: () => Promise<Record<string, string>>
      }
      ai: {
        complete: (opts: {
          provider: 'anthropic' | 'openai'
          apiKey: string
          model: string
          messages: AIMessage[]
          systemPrompt?: string
          maxTokens?: number
        }) => Promise<{ success: boolean; text?: string; error?: string }>
        improveText: (opts: {
          provider: 'anthropic' | 'openai'
          apiKey: string
          model: string
          text: string
          instruction: string
          language: string
        }) => Promise<{ success: boolean; text?: string; error?: string }>
        listConversations: () => Promise<AIConversation[]>
        createConversation: (data: Partial<AIConversation>) => Promise<AIConversation>
        updateConversation: (id: string, data: Partial<AIConversation>) => Promise<AIConversation>
        deleteConversation: (id: string) => Promise<boolean>
      }
      rss: {
        addFeed: (url: string) => Promise<{ success: boolean; feed?: RssFeed; error?: string }>
        refreshFeed: (
          feedId: string
        ) => Promise<{ success: boolean; newArticles?: number; error?: string }>
        refreshAll: () => Promise<{ success: boolean; newArticles: number }>
        listFeeds: () => Promise<RssFeed[]>
        deleteFeed: (id: string) => Promise<boolean>
        listArticles: (opts: {
          feedId?: string
          onlySaved?: boolean
          onlyUnread?: boolean
          limit?: number
          offset?: number
        }) => Promise<RssArticle[]>
        markRead: (id: string, isRead: boolean) => Promise<boolean>
        toggleSaved: (id: string) => Promise<boolean>
        searchArticles: (query: string) => Promise<RssArticle[]>
        getStats: () => Promise<{
          totalFeeds: number
          totalArticles: number
          unreadCount: number
          savedCount: number
        }>
      }
      cloud: {
        testConnection: (
          config: CloudConfig
        ) => Promise<{ success: boolean; message?: string; error?: string }>
        sync: (
          config: CloudConfig
        ) => Promise<{ success: boolean; message?: string; error?: string }>
        restore: (
          config: CloudConfig
        ) => Promise<{ success: boolean; data?: unknown; localBackup?: string; error?: string }>
        localBackup: () => Promise<{ success: boolean; path?: string; error?: string }>
      }
    }
  }
}
