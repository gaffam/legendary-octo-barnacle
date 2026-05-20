import { ipcMain } from 'electron'
import { getDb } from '../database'
import { randomUUID } from 'crypto'

async function getAnthropicClient(apiKey: string) {
  const Anthropic = (await import('@anthropic-ai/sdk')).default
  return new Anthropic({ apiKey })
}

async function getOpenAIClient(apiKey: string) {
  const OpenAI = (await import('openai')).default
  return new OpenAI({ apiKey })
}

export function registerAiHandlers(): void {
  ipcMain.handle(
    'ai:complete',
    async (
      _event,
      opts: {
        provider: 'anthropic' | 'openai'
        apiKey: string
        model: string
        messages: { role: string; content: string }[]
        systemPrompt?: string
        maxTokens?: number
      }
    ) => {
      try {
        if (opts.provider === 'anthropic') {
          const client = await getAnthropicClient(opts.apiKey)
          const response = await client.messages.create({
            model: opts.model || 'claude-opus-4-5-20251101',
            max_tokens: opts.maxTokens || 2048,
            system:
              opts.systemPrompt ||
              `Sen Atelier adlı kişisel yazı asistanısın. Kullanıcının Türkçe, İngilizce, Fransızca ve İtalyanca yazmasına yardım ediyorsun. Yaratıcı, entelektüel ve zarif bir yaklaşımla yazarlık destekçisi olarak görev yapıyorsun.`,
            messages: opts.messages.map((m) => ({
              role: m.role as 'user' | 'assistant',
              content: m.content
            }))
          })
          const textBlock = response.content.find((b) => b.type === 'text')
          return { success: true, text: textBlock?.type === 'text' ? textBlock.text : '' }
        } else {
          const client = await getOpenAIClient(opts.apiKey)
          const msgs = [
            {
              role: 'system' as const,
              content: opts.systemPrompt || 'You are Atelier, a personal writing assistant.'
            },
            ...opts.messages.map((m) => ({
              role: m.role as 'user' | 'assistant',
              content: m.content
            }))
          ]
          const response = await client.chat.completions.create({
            model: opts.model || 'gpt-4o',
            messages: msgs,
            max_tokens: opts.maxTokens || 2048
          })
          return { success: true, text: response.choices[0].message.content || '' }
        }
      } catch (err: any) {
        return { success: false, error: err.message }
      }
    }
  )

  ipcMain.handle(
    'ai:improveText',
    async (
      _event,
      opts: {
        provider: 'anthropic' | 'openai'
        apiKey: string
        model: string
        text: string
        instruction: string
        language: string
      }
    ) => {
      const langMap: Record<string, string> = {
        tr: 'Türkçe',
        en: 'English',
        fr: 'Français',
        it: 'Italiano'
      }
      const systemPrompt = `Sen üst düzey bir yazı editörüsün. ${langMap[opts.language] || 'Türkçe'} dilinde yazılmış metni iyileştiriyorsun. Sadece düzeltilmiş metni döndür, açıklama yapma.`
      const userMsg = `Talimat: ${opts.instruction}\n\nMetin:\n${opts.text}`

      try {
        if (opts.provider === 'anthropic') {
          const client = await getAnthropicClient(opts.apiKey)
          const response = await client.messages.create({
            model: opts.model || 'claude-opus-4-5-20251101',
            max_tokens: 2048,
            system: systemPrompt,
            messages: [{ role: 'user', content: userMsg }]
          })
          const textBlock = response.content.find((b) => b.type === 'text')
          return { success: true, text: textBlock?.type === 'text' ? textBlock.text : '' }
        } else {
          const client = await getOpenAIClient(opts.apiKey)
          const response = await client.chat.completions.create({
            model: opts.model || 'gpt-4o',
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userMsg }
            ],
            max_tokens: 2048
          })
          return { success: true, text: response.choices[0].message.content || '' }
        }
      } catch (err: any) {
        return { success: false, error: err.message }
      }
    }
  )

  // Conversation management
  ipcMain.handle('db:listConversations', () => {
    const rows = getDb()
      .prepare('SELECT * FROM ai_conversations ORDER BY updated_at DESC')
      .all() as any[]
    return rows.map((r) => ({ ...r, messages: JSON.parse(r.messages) }))
  })

  ipcMain.handle('db:createConversation', (_e, data: any) => {
    const db = getDb()
    const id = randomUUID()
    const now = Date.now()
    db.prepare(
      `
      INSERT INTO ai_conversations (id, title, document_id, messages, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `
    ).run(
      id,
      data.title || 'Yeni Sohbet',
      data.document_id || null,
      JSON.stringify(data.messages || []),
      now,
      now
    )
    const row = db.prepare('SELECT * FROM ai_conversations WHERE id = ?').get(id) as any
    return { ...row, messages: JSON.parse(row.messages) }
  })

  ipcMain.handle('db:updateConversation', (_e, id: string, data: any) => {
    const db = getDb()
    db.prepare(
      `
      UPDATE ai_conversations SET
        title = COALESCE(?, title), messages = COALESCE(?, messages), updated_at = ?
      WHERE id = ?
    `
    ).run(data.title ?? null, data.messages ? JSON.stringify(data.messages) : null, Date.now(), id)
    const row = db.prepare('SELECT * FROM ai_conversations WHERE id = ?').get(id) as any
    return { ...row, messages: JSON.parse(row.messages) }
  })

  ipcMain.handle('db:deleteConversation', (_e, id: string) => {
    getDb().prepare('DELETE FROM ai_conversations WHERE id = ?').run(id)
    return true
  })
}
