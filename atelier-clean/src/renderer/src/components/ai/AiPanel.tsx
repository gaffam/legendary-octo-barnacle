import { useEffect, useMemo, useRef, useState } from 'react'
import {
  X,
  Send,
  Plus,
  Loader2,
  MessageSquare,
  Sparkles,
  Settings as SettingsIcon,
  Trash2
} from 'lucide-react'
import { useAppStore } from '@/store/appStore'
import type { AIConversation, AIMessage } from '@/types'

type Provider = 'anthropic' | 'openai'

const DEFAULT_MODELS: Record<Provider, string> = {
  anthropic: 'claude-opus-4-5-20251101',
  openai: 'gpt-4o'
}

const QUICK_ACTIONS: Array<{ label: string; prompt: string }> = [
  {
    label: '✨ Geliştir',
    prompt:
      'Aşağıdaki metni dilbilgisi, üslup ve akıcılık açısından geliştir. Türünü ve sesini koru:\n\n'
  },
  {
    label: '📝 Devam Et',
    prompt: 'Aşağıdaki metnin doğal bir devamını yaz. Aynı üslubu, tonu ve perspektifi sürdür:\n\n'
  },
  {
    label: '🔄 Çevir',
    prompt: 'Aşağıdaki metni İngilizceye doğal, edebi bir şekilde çevir:\n\n'
  },
  {
    label: '✏️ Özet',
    prompt: 'Aşağıdaki metni kısa ve öz bir şekilde özetle:\n\n'
  }
]

function genId() {
  return `conv_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
}

function nowTs() {
  return Math.floor(Date.now() / 1000)
}

export default function AiPanel() {
  const { settings, toggleAiPanel, setView } = useAppStore()

  const apiKey = settings['ai.api_key'] || ''
  const provider = ((settings['ai.provider'] as Provider) || 'anthropic') as Provider
  const model = settings['ai.model'] || DEFAULT_MODELS[provider]

  const [conversations, setConversations] = useState<AIConversation[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [messages, setMessages] = useState<AIMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showHistory, setShowHistory] = useState(false)

  const panelRef = useRef<HTMLDivElement | null>(null)
  const bodyRef = useRef<HTMLDivElement | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)

  // Load conversations on mount
  useEffect(() => {
    void (async () => {
      try {
        const list = await window.atelier.ai.listConversations()
        setConversations(list)
      } catch (e) {
        // ignore
      }
    })()
  }, [])

  // Auto-scroll on new message
  useEffect(() => {
    if (bodyRef.current) {
      bodyRef.current.scrollTop = bodyRef.current.scrollHeight
    }
  }, [messages, loading])

  // Close on outside click
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (!panelRef.current) return
      if (panelRef.current.contains(e.target as Node)) return
      toggleAiPanel()
    }
    // Slight delay so the toggle click doesn't immediately close it
    const t = setTimeout(() => document.addEventListener('mousedown', onClick), 100)
    return () => {
      clearTimeout(t)
      document.removeEventListener('mousedown', onClick)
    }
  }, [toggleAiPanel])

  // Esc to close
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') toggleAiPanel()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [toggleAiPanel])

  const activeConversation = useMemo(
    () => conversations.find((c) => c.id === activeId) || null,
    [conversations, activeId]
  )

  function startNewConversation() {
    setActiveId(null)
    setMessages([])
    setError(null)
    setShowHistory(false)
    setTimeout(() => textareaRef.current?.focus(), 50)
  }

  function selectConversation(c: AIConversation) {
    setActiveId(c.id)
    setMessages(c.messages || [])
    setError(null)
    setShowHistory(false)
  }

  async function deleteConversation(id: string, e: React.MouseEvent) {
    e.stopPropagation()
    if (!confirm('Bu sohbeti silmek istediğinize emin misiniz?')) return
    try {
      await window.atelier.ai.deleteConversation(id)
      setConversations((prev) => prev.filter((c) => c.id !== id))
      if (activeId === id) startNewConversation()
    } catch {
      // ignore
    }
  }

  async function persistConversation(updatedMessages: AIMessage[]) {
    try {
      if (activeId) {
        const updated = await window.atelier.ai.updateConversation(activeId, {
          messages: updatedMessages,
          updated_at: nowTs()
        })
        setConversations((prev) => prev.map((c) => (c.id === activeId ? updated : c)))
      } else {
        const title =
          updatedMessages[0]?.content.slice(0, 48).replace(/\s+/g, ' ').trim() || 'Yeni Sohbet'
        const created = await window.atelier.ai.createConversation({
          id: genId(),
          title,
          messages: updatedMessages,
          created_at: nowTs(),
          updated_at: nowTs()
        })
        setActiveId(created.id)
        setConversations((prev) => [created, ...prev])
      }
    } catch {
      // ignore persistence errors silently
    }
  }

  async function sendMessage(rawText?: string) {
    const text = (rawText ?? input).trim()
    if (!text || loading) return

    if (!apiKey) {
      setError('Önce ayarlardan API anahtarı girin.')
      return
    }

    setError(null)
    const userMsg: AIMessage = { role: 'user', content: text, timestamp: nowTs() }
    const next = [...messages, userMsg]
    setMessages(next)
    setInput('')
    setLoading(true)

    try {
      const res = await window.atelier.ai.complete({
        provider,
        apiKey,
        model: model || DEFAULT_MODELS[provider],
        messages: next,
        maxTokens: 2048
      })

      if (res.success && res.text) {
        const aiMsg: AIMessage = {
          role: 'assistant',
          content: res.text,
          timestamp: nowTs()
        }
        const finalMsgs = [...next, aiMsg]
        setMessages(finalMsgs)
        void persistConversation(finalMsgs)
      } else {
        setError(res.error || 'Bilinmeyen bir hata oluştu.')
      }
    } catch (e: any) {
      setError(e?.message || 'AI isteği başarısız oldu.')
    } finally {
      setLoading(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void sendMessage()
    }
  }

  function applyQuickAction(prompt: string) {
    setInput((cur) => (cur ? `${prompt}${cur}` : prompt))
    textareaRef.current?.focus()
  }

  return (
    <aside
      ref={panelRef}
      className="paper-velin fade-in flex flex-col h-full border-l shadow-paper-lg"
      style={{
        width: 400,
        minWidth: 400,
        borderLeftColor: 'rgba(196,163,90,0.4)'
      }}
    >
      {/* Header */}
      <header
        className="flex items-center justify-between px-5 py-4 border-b"
        style={{ borderBottomColor: 'rgba(196,163,90,0.35)' }}
      >
        <div className="flex items-center gap-2">
          <Sparkles size={18} className="text-pineider-gold" />
          <h2 className="font-display italic text-xl text-pineider-navy leading-none">
            Yapay Zekâ Asistanı
          </h2>
        </div>
        <button
          className="btn-luxury btn-ghost"
          onClick={toggleAiPanel}
          aria-label="Kapat"
          title="Kapat"
        >
          <X size={16} />
        </button>
      </header>

      {/* Conversation switcher */}
      <div
        className="px-5 py-3 border-b flex items-center gap-2"
        style={{ borderBottomColor: 'rgba(28,28,40,0.08)' }}
      >
        <button
          className="btn-luxury flex-1 flex items-center justify-between text-sm"
          onClick={() => setShowHistory((s) => !s)}
        >
          <span className="flex items-center gap-2 truncate">
            <MessageSquare size={14} className="text-ink-secondary shrink-0" />
            <span className="truncate font-ui italic">
              {activeConversation?.title || 'Yeni Sohbet'}
            </span>
          </span>
          <span className="text-ink-faded text-xs ml-2">
            {conversations.length > 0 ? `${conversations.length}` : ''}
          </span>
        </button>
        <button
          className="btn-luxury btn-ghost"
          onClick={startNewConversation}
          title="Yeni sohbet başlat"
          aria-label="Yeni sohbet"
        >
          <Plus size={16} />
        </button>
      </div>

      {showHistory && (
        <div
          className="max-h-60 overflow-y-auto border-b fade-in"
          style={{ borderBottomColor: 'rgba(28,28,40,0.08)' }}
        >
          {conversations.length === 0 ? (
            <div className="px-5 py-4 text-sm italic text-ink-faded font-ui">Henüz sohbet yok.</div>
          ) : (
            conversations.map((c) => (
              <div
                key={c.id}
                onClick={() => selectConversation(c)}
                className={`flex items-center justify-between px-5 py-2 cursor-pointer transition-colors ${
                  c.id === activeId ? 'bg-pineider-gold/10' : 'hover:bg-pineider-gold/5'
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate font-ui text-sm text-ink-primary">{c.title}</div>
                  <div className="text-xs text-ink-faded font-ui">
                    {new Date(c.updated_at * 1000).toLocaleDateString('tr-TR', {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
                </div>
                <button
                  className="btn-ghost btn-luxury opacity-50 hover:opacity-100"
                  onClick={(e) => deleteConversation(c.id, e)}
                  title="Sil"
                  aria-label="Sohbeti sil"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {/* Body / messages */}
      <div ref={bodyRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
        {!apiKey && (
          <div
            className="rounded p-4 border fade-in"
            style={{
              borderColor: 'rgba(139,38,53,0.4)',
              background: 'rgba(139,38,53,0.06)'
            }}
          >
            <div className="font-display italic text-lg text-pineider-bordeaux mb-2">
              API Anahtarı Gerekli
            </div>
            <div className="font-ui text-sm text-ink-secondary mb-3">
              Önce ayarlardan API anahtarı girin. Anthropic veya OpenAI sağlayıcısı seçebilirsiniz.
            </div>
            <button
              className="btn-luxury btn-primary text-sm inline-flex items-center gap-2"
              onClick={() => {
                setView('settings')
                toggleAiPanel()
              }}
            >
              <SettingsIcon size={14} />
              Ayarları Aç
            </button>
          </div>
        )}

        {apiKey && messages.length === 0 && (
          <div className="text-center py-10 fade-in">
            <div className="fleuron">❦</div>
            <div className="font-display italic text-2xl text-pineider-navy mb-1">Hoş geldiniz</div>
            <div className="font-ui text-sm text-ink-secondary px-4">
              Yazınızı geliştirmek, çevirmek veya yeni fikirler keşfetmek için bir mesaj yazın.
            </div>
            <div className="divider-gold my-5" />
            <div className="font-ui text-xs text-ink-faded">
              Sağlayıcı:{' '}
              <span className="italic">
                {provider === 'anthropic' ? 'Anthropic (Claude)' : 'OpenAI'}
              </span>
              {' · '}
              Model: <span className="italic">{model || DEFAULT_MODELS[provider]}</span>
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div
            key={i}
            className={`${
              m.role === 'user' ? 'ai-message-user' : 'ai-message-assistant'
            } fade-in font-body text-[15px] leading-relaxed whitespace-pre-wrap`}
          >
            <div className="text-[11px] uppercase tracking-widest font-ui text-ink-faded mb-1">
              {m.role === 'user' ? 'Siz' : 'Asistan'}
            </div>
            {m.content}
          </div>
        ))}

        {loading && (
          <div className="ai-message-assistant fade-in flex items-center gap-2">
            <Loader2 size={14} className="animate-spin text-pineider-gold" />
            <span className="font-ui italic text-sm text-ink-secondary">Düşünüyor…</span>
          </div>
        )}

        {error && (
          <div
            className="rounded p-3 text-sm font-ui fade-in"
            style={{
              background: 'rgba(139,38,53,0.08)',
              color: 'var(--pineider-bordeaux)',
              border: '1px solid rgba(139,38,53,0.3)'
            }}
          >
            {error}
          </div>
        )}
      </div>

      {/* Quick actions */}
      {apiKey && (
        <div
          className="px-5 pt-3 pb-2 border-t flex flex-wrap gap-2"
          style={{ borderTopColor: 'rgba(28,28,40,0.08)' }}
        >
          {QUICK_ACTIONS.map((qa) => (
            <button
              key={qa.label}
              className="btn-luxury btn-ghost text-xs font-ui"
              onClick={() => applyQuickAction(qa.prompt)}
              disabled={loading}
            >
              {qa.label}
            </button>
          ))}
        </div>
      )}

      {/* Composer */}
      <div className="px-5 py-3 border-t" style={{ borderTopColor: 'rgba(196,163,90,0.35)' }}>
        <div className="flex items-end gap-2">
          <textarea
            ref={textareaRef}
            className="luxury flex-1 resize-none"
            rows={3}
            placeholder={
              apiKey
                ? 'Bir şey sorun veya yazın… (Enter ile gönder, Shift+Enter satır)'
                : 'API anahtarı girilene kadar mesaj gönderilemez'
            }
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={!apiKey || loading}
          />
          <button
            className="btn-luxury btn-primary self-stretch px-3 inline-flex items-center justify-center"
            onClick={() => sendMessage()}
            disabled={!apiKey || loading || !input.trim()}
            aria-label="Gönder"
            title="Gönder"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          </button>
        </div>
      </div>
    </aside>
  )
}
