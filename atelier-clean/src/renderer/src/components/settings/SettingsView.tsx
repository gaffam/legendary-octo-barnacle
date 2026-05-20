import { useEffect, useMemo, useState } from 'react'
import {
  Settings as SettingsIcon,
  SpellCheck,
  Sparkles,
  Cloud,
  Info,
  Check,
  Loader2,
  AlertCircle,
  Eye,
  EyeOff,
  FolderOpen,
  Download,
  Upload,
  Save,
  RefreshCw
} from 'lucide-react'
import { useAppStore } from '@/store/appStore'
import type { Language } from '@/types'

type SectionId = 'general' | 'spell' | 'ai' | 'cloud' | 'about'

const SECTIONS: Array<{
  id: SectionId
  label: string
  icon: React.ComponentType<{ size?: number }>
}> = [
  { id: 'general', label: 'Genel', icon: SettingsIcon },
  { id: 'spell', label: 'Yazım Denetimi', icon: SpellCheck },
  { id: 'ai', label: 'Yapay Zekâ', icon: Sparkles },
  { id: 'cloud', label: 'Bulut Eşitleme', icon: Cloud },
  { id: 'about', label: 'Hakkında', icon: Info }
]

const LANGUAGES: Array<{ code: Language; label: string }> = [
  { code: 'tr', label: 'Türkçe' },
  { code: 'en', label: 'English' },
  { code: 'fr', label: 'Français' },
  { code: 'it', label: 'Italiano' }
]

const PAPER_STYLES = [
  { code: 'velin', label: 'Vélin', desc: 'G. Lalo — pürüzsüz, ipeksi' },
  { code: 'toile', label: 'Toile ancienne', desc: 'Eski dokulu, çapraz çizgili' },
  { code: 'cotton', label: 'Cotton', desc: 'Pamuk lifli, sıcak doku' }
]

const DEFAULT_MODELS = {
  anthropic: 'claude-opus-4-5-20251101',
  openai: 'gpt-4o'
}

interface TestState {
  status: 'idle' | 'loading' | 'success' | 'error'
  message?: string
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="font-display italic text-3xl text-pineider-navy mb-1 tracking-tight">
      {children}
    </h2>
  )
}

function FieldLabel({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <div className="mb-1.5">
      <div className="font-ui text-sm text-ink-primary tracking-wide">{children}</div>
      {hint && <div className="font-ui text-xs italic text-ink-faded mt-0.5">{hint}</div>}
    </div>
  )
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors"
      style={{
        background: checked ? 'var(--pineider-gold)' : 'rgba(28,28,40,0.2)'
      }}
    >
      <span
        className="inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform"
        style={{ transform: checked ? 'translateX(22px)' : 'translateX(2px)' }}
      />
    </button>
  )
}

function StatusBadge({ state }: { state: TestState }) {
  if (state.status === 'idle') return null
  if (state.status === 'loading')
    return (
      <span className="inline-flex items-center gap-1.5 text-sm font-ui italic text-ink-secondary">
        <Loader2 size={14} className="animate-spin" /> Test ediliyor…
      </span>
    )
  if (state.status === 'success')
    return (
      <span
        className="inline-flex items-center gap-1.5 text-sm font-ui italic"
        style={{ color: '#3F6B3A' }}
      >
        <Check size={14} /> {state.message || 'Bağlantı başarılı'}
      </span>
    )
  return (
    <span className="inline-flex items-center gap-1.5 text-sm font-ui italic text-pineider-bordeaux">
      <AlertCircle size={14} /> {state.message || 'Hata oluştu'}
    </span>
  )
}

export default function SettingsView() {
  const {
    settings,
    updateSetting,
    setLanguage,
    setPaperStyle,
    toggleSpellCheck,
    spellCheckEnabled
  } = useAppStore()

  const [section, setSection] = useState<SectionId>('general')

  // General
  const lang = (settings['editor.language'] as Language) || 'tr'
  const paper = (settings['editor.paper_style'] as 'velin' | 'toile' | 'cotton') || 'velin'
  const fontSize = parseInt(settings['editor.font_size'] || '18', 10)
  const lineSpacing = parseFloat(settings['editor.line_spacing'] || '1.85')

  // Spell
  const spellLang = settings['spellcheck.language'] || 'tr'
  const [availLangs, setAvailLangs] = useState<string[]>([])
  const [spellTest, setSpellTest] = useState<TestState>({ status: 'idle' })
  const [spellTestWord, setSpellTestWord] = useState('merhaba')

  // AI
  const aiProvider = (settings['ai.provider'] as 'anthropic' | 'openai') || 'anthropic'
  const aiKey = settings['ai.api_key'] || ''
  const aiModel = settings['ai.model'] || ''
  const [aiKeyLocal, setAiKeyLocal] = useState(aiKey)
  const [aiModelLocal, setAiModelLocal] = useState(aiModel)
  const [showAiKey, setShowAiKey] = useState(false)
  const [aiTest, setAiTest] = useState<TestState>({ status: 'idle' })

  // Cloud
  const cloudUrl = settings['cloud.url'] || ''
  const cloudUser = settings['cloud.username'] || ''
  const cloudPass = settings['cloud.password'] || ''
  const cloudEnabled = settings['cloud.enabled'] === 'true'
  const [cloudUrlLocal, setCloudUrlLocal] = useState(cloudUrl)
  const [cloudUserLocal, setCloudUserLocal] = useState(cloudUser)
  const [cloudPassLocal, setCloudPassLocal] = useState(cloudPass)
  const [showCloudPass, setShowCloudPass] = useState(false)
  const [cloudTest, setCloudTest] = useState<TestState>({ status: 'idle' })
  const [syncState, setSyncState] = useState<TestState>({ status: 'idle' })
  const [restoreState, setRestoreState] = useState<TestState>({ status: 'idle' })
  const [backupState, setBackupState] = useState<TestState>({ status: 'idle' })

  // About
  const [dataPath, setDataPath] = useState<string>('')
  const [rssStats, setRssStats] = useState<{
    totalFeeds: number
    totalArticles: number
    unreadCount: number
    savedCount: number
  } | null>(null)

  // Keep locals in sync when settings load
  useEffect(() => {
    setAiKeyLocal(aiKey)
  }, [aiKey])
  useEffect(() => {
    setAiModelLocal(aiModel)
  }, [aiModel])
  useEffect(() => {
    setCloudUrlLocal(cloudUrl)
    setCloudUserLocal(cloudUser)
    setCloudPassLocal(cloudPass)
  }, [cloudUrl, cloudUser, cloudPass])

  // Load auxiliary data
  useEffect(() => {
    void (async () => {
      try {
        const langs = await window.atelier.spell.availableLanguages()
        setAvailLangs(langs || [])
      } catch {
        /* ignore */
      }
      try {
        const path = await window.atelier.file.getDataPath()
        setDataPath(path)
      } catch {
        /* ignore */
      }
      try {
        const stats = await window.atelier.rss.getStats()
        setRssStats(stats)
      } catch {
        /* ignore */
      }
    })()
  }, [])

  const cloudConfig = useMemo(
    () => ({
      provider: 'webdav' as const,
      url: cloudUrlLocal,
      username: cloudUserLocal,
      password: cloudPassLocal
    }),
    [cloudUrlLocal, cloudUserLocal, cloudPassLocal]
  )

  // ── Handlers ────────────────────────────────────────────────────────────
  async function handleLangChange(v: Language) {
    setLanguage(v)
    await updateSetting('editor.language', v)
  }

  async function handlePaperChange(v: 'velin' | 'toile' | 'cotton') {
    setPaperStyle(v)
    await updateSetting('editor.paper_style', v)
  }

  async function handleFontSize(v: number) {
    await updateSetting('editor.font_size', String(v))
  }

  async function handleLineSpacing(v: number) {
    await updateSetting('editor.line_spacing', v.toFixed(2))
  }

  async function handleSpellLang(v: string) {
    await updateSetting('spellcheck.language', v)
  }

  async function runSpellTest() {
    setSpellTest({ status: 'loading' })
    try {
      const res = await window.atelier.spell.check(spellTestWord, spellLang)
      if (res.correct) {
        setSpellTest({ status: 'success', message: `“${spellTestWord}” doğru yazıldı.` })
      } else {
        const sug = (res.suggestions || []).slice(0, 5).join(', ')
        setSpellTest({
          status: 'error',
          message: `“${spellTestWord}” bulunamadı. Öneriler: ${sug || 'yok'}`
        })
      }
    } catch (e: any) {
      setSpellTest({ status: 'error', message: e?.message || 'Test başarısız' })
    }
  }

  async function saveAiSettings() {
    await updateSetting('ai.provider', aiProvider)
    await updateSetting('ai.api_key', aiKeyLocal)
    await updateSetting('ai.model', aiModelLocal)
  }

  async function handleAiProvider(p: 'anthropic' | 'openai') {
    await updateSetting('ai.provider', p)
    if (!aiModelLocal) {
      setAiModelLocal(DEFAULT_MODELS[p])
    }
  }

  async function runAiTest() {
    await saveAiSettings()
    if (!aiKeyLocal) {
      setAiTest({ status: 'error', message: 'API anahtarı girin' })
      return
    }
    setAiTest({ status: 'loading' })
    try {
      const res = await window.atelier.ai.complete({
        provider: aiProvider,
        apiKey: aiKeyLocal,
        model: aiModelLocal || DEFAULT_MODELS[aiProvider],
        messages: [{ role: 'user', content: 'Merhaba' }],
        maxTokens: 64
      })
      if (res.success) {
        setAiTest({
          status: 'success',
          message: `Bağlantı başarılı: “${(res.text || '').slice(0, 40)}…”`
        })
      } else {
        setAiTest({ status: 'error', message: res.error || 'Bağlantı kurulamadı' })
      }
    } catch (e: any) {
      setAiTest({ status: 'error', message: e?.message || 'Bağlantı kurulamadı' })
    }
  }

  async function saveCloudSettings() {
    await updateSetting('cloud.url', cloudUrlLocal)
    await updateSetting('cloud.username', cloudUserLocal)
    await updateSetting('cloud.password', cloudPassLocal)
  }

  async function runCloudTest() {
    await saveCloudSettings()
    setCloudTest({ status: 'loading' })
    try {
      const res = await window.atelier.cloud.testConnection(cloudConfig)
      if (res.success) {
        setCloudTest({ status: 'success', message: res.message || 'WebDAV erişilebilir' })
        await updateSetting('cloud.enabled', 'true')
      } else {
        setCloudTest({ status: 'error', message: res.error || 'Bağlantı başarısız' })
      }
    } catch (e: any) {
      setCloudTest({ status: 'error', message: e?.message || 'Hata' })
    }
  }

  async function runCloudSync() {
    await saveCloudSettings()
    setSyncState({ status: 'loading' })
    try {
      const res = await window.atelier.cloud.sync(cloudConfig)
      if (res.success) {
        setSyncState({ status: 'success', message: res.message || 'Yüklendi' })
      } else {
        setSyncState({ status: 'error', message: res.error || 'Eşitleme başarısız' })
      }
    } catch (e: any) {
      setSyncState({ status: 'error', message: e?.message || 'Hata' })
    }
  }

  async function runCloudRestore() {
    if (
      !confirm(
        'Buluttan geri yüklemek, yerel verilerin üzerine yazabilir. Önce yerel bir yedek alınacak. Devam edilsin mi?'
      )
    )
      return
    setRestoreState({ status: 'loading' })
    try {
      const res = await window.atelier.cloud.restore(cloudConfig)
      if (res.success) {
        const note = res.localBackup ? ` (Yerel yedek: ${res.localBackup})` : ''
        setRestoreState({ status: 'success', message: 'Buluttan geri yüklendi' + note })
      } else {
        setRestoreState({ status: 'error', message: res.error || 'Geri yükleme başarısız' })
      }
    } catch (e: any) {
      setRestoreState({ status: 'error', message: e?.message || 'Hata' })
    }
  }

  async function runLocalBackup() {
    setBackupState({ status: 'loading' })
    try {
      const res = await window.atelier.cloud.localBackup()
      if (res.success && res.path) {
        setBackupState({ status: 'success', message: `Yedek kaydedildi: ${res.path}` })
      } else {
        setBackupState({ status: 'error', message: res.error || 'Yedek alınamadı' })
      }
    } catch (e: any) {
      setBackupState({ status: 'error', message: e?.message || 'Hata' })
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <div className="paper-velin fade-in h-full overflow-y-auto">
      <div className="max-w-5xl mx-auto flex gap-8 px-10 py-10">
        {/* Sidebar nav */}
        <nav className="w-56 shrink-0">
          <div className="font-display italic text-xl text-pineider-navy mb-4">Ayarlar</div>
          <ul className="space-y-1">
            {SECTIONS.map((s) => {
              const Icon = s.icon
              const active = section === s.id
              return (
                <li key={s.id}>
                  <button
                    onClick={() => setSection(s.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-sm transition-all text-left ${
                      active
                        ? 'bg-pineider-gold/15 text-pineider-navy'
                        : 'text-ink-secondary hover:bg-pineider-gold/5'
                    }`}
                    style={{
                      borderLeft: active
                        ? '2px solid var(--pineider-gold)'
                        : '2px solid transparent'
                    }}
                  >
                    <Icon size={16} />
                    <span className="font-ui italic text-base">{s.label}</span>
                  </button>
                </li>
              )
            })}
          </ul>
        </nav>

        {/* Content */}
        <div className="flex-1 max-w-3xl min-w-0">
          {section === 'general' && (
            <section className="fade-in space-y-7">
              <SectionHeading>Genel</SectionHeading>
              <div className="divider-gold" />

              <div>
                <FieldLabel hint="Varsayılan yazma dili ve sözlük">Dil</FieldLabel>
                <div className="flex flex-wrap gap-2">
                  {LANGUAGES.map((l) => (
                    <button
                      key={l.code}
                      onClick={() => handleLangChange(l.code)}
                      className={`btn-luxury text-sm ${lang === l.code ? 'btn-primary' : ''}`}
                    >
                      {l.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <FieldLabel hint="Editör arkaplan dokusu">Kâğıt</FieldLabel>
                <div className="grid grid-cols-3 gap-3">
                  {PAPER_STYLES.map((p) => (
                    <button
                      key={p.code}
                      onClick={() => handlePaperChange(p.code as any)}
                      className={`notebook-card p-4 text-left transition-all ${
                        paper === p.code ? 'ring-2 ring-pineider-gold' : ''
                      }`}
                      style={{
                        outline: paper === p.code ? '2px solid var(--pineider-gold)' : 'none'
                      }}
                    >
                      <div className="font-display italic text-lg text-pineider-navy">
                        {p.label}
                      </div>
                      <div className="font-ui text-xs text-ink-faded italic mt-1">{p.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <FieldLabel hint={`${fontSize}px`}>Yazı boyutu</FieldLabel>
                <input
                  type="range"
                  min={14}
                  max={22}
                  step={1}
                  value={fontSize}
                  onChange={(e) => handleFontSize(parseInt(e.target.value, 10))}
                  className="w-full accent-pineider-gold"
                />
                <div className="flex justify-between text-xs text-ink-faded font-ui mt-1">
                  <span>14</span>
                  <span>22</span>
                </div>
              </div>

              <div>
                <FieldLabel hint={`${lineSpacing.toFixed(2)}×`}>Satır aralığı</FieldLabel>
                <input
                  type="range"
                  min={1.4}
                  max={2.2}
                  step={0.05}
                  value={lineSpacing}
                  onChange={(e) => handleLineSpacing(parseFloat(e.target.value))}
                  className="w-full accent-pineider-gold"
                />
                <div className="flex justify-between text-xs text-ink-faded font-ui mt-1">
                  <span>1.40</span>
                  <span>2.20</span>
                </div>
              </div>
            </section>
          )}

          {section === 'spell' && (
            <section className="fade-in space-y-7">
              <SectionHeading>Yazım Denetimi</SectionHeading>
              <div className="divider-gold" />

              <div className="flex items-center justify-between">
                <div>
                  <div className="font-ui text-sm text-ink-primary">Yazım denetimini aç</div>
                  <div className="font-ui text-xs italic text-ink-faded mt-0.5">
                    Bordo dalgalı çizgi ile yanlış yazımları göster
                  </div>
                </div>
                <Toggle checked={spellCheckEnabled} onChange={() => toggleSpellCheck()} />
              </div>

              <div>
                <FieldLabel hint="Sözlük dili">Sözlük</FieldLabel>
                <select
                  className="luxury w-64"
                  value={spellLang}
                  onChange={(e) => handleSpellLang(e.target.value)}
                >
                  {LANGUAGES.map((l) => (
                    <option key={l.code} value={l.code}>
                      {l.label} ({l.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <FieldLabel hint="Tek bir sözcüğü test edin">Test</FieldLabel>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    className="luxury flex-1 max-w-xs"
                    value={spellTestWord}
                    onChange={(e) => setSpellTestWord(e.target.value)}
                    placeholder="bir sözcük yazın…"
                  />
                  <button
                    className="btn-luxury text-sm"
                    onClick={runSpellTest}
                    disabled={!spellTestWord.trim()}
                  >
                    Test et
                  </button>
                </div>
                <div className="mt-2">
                  <StatusBadge state={spellTest} />
                </div>
              </div>

              <div>
                <FieldLabel hint="Kullanılabilir sözlükler">Kütüphane</FieldLabel>
                <div className="flex flex-wrap gap-2">
                  {availLangs.length === 0 && (
                    <span className="font-ui italic text-sm text-ink-faded">
                      Sözlük bulunamadı.
                    </span>
                  )}
                  {availLangs.map((l) => (
                    <span
                      key={l}
                      className="px-2 py-1 rounded-sm text-xs font-ui italic"
                      style={{
                        background: 'rgba(196,163,90,0.12)',
                        border: '1px solid rgba(196,163,90,0.35)',
                        color: 'var(--pineider-navy)'
                      }}
                    >
                      {l}
                    </span>
                  ))}
                </div>
              </div>
            </section>
          )}

          {section === 'ai' && (
            <section className="fade-in space-y-7">
              <SectionHeading>Yapay Zekâ</SectionHeading>
              <div className="divider-gold" />

              <div>
                <FieldLabel hint="AI sağlayıcı">Sağlayıcı</FieldLabel>
                <div className="flex gap-2">
                  <button
                    className={`btn-luxury text-sm ${aiProvider === 'anthropic' ? 'btn-primary' : ''}`}
                    onClick={() => handleAiProvider('anthropic')}
                  >
                    Anthropic (Claude)
                  </button>
                  <button
                    className={`btn-luxury text-sm ${aiProvider === 'openai' ? 'btn-primary' : ''}`}
                    onClick={() => handleAiProvider('openai')}
                  >
                    OpenAI
                  </button>
                </div>
              </div>

              <div>
                <FieldLabel hint="Yalnızca yerel olarak saklanır">API Anahtarı</FieldLabel>
                <div className="flex items-center gap-2 max-w-lg">
                  <input
                    type={showAiKey ? 'text' : 'password'}
                    className="luxury flex-1"
                    value={aiKeyLocal}
                    onChange={(e) => setAiKeyLocal(e.target.value)}
                    onBlur={saveAiSettings}
                    placeholder={aiProvider === 'anthropic' ? 'sk-ant-…' : 'sk-…'}
                    autoComplete="off"
                    spellCheck={false}
                  />
                  <button
                    className="btn-luxury btn-ghost"
                    onClick={() => setShowAiKey((v) => !v)}
                    title={showAiKey ? 'Gizle' : 'Göster'}
                    type="button"
                  >
                    {showAiKey ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>

              <div>
                <FieldLabel hint="Model adı (boşsa varsayılan kullanılır)">Model</FieldLabel>
                <input
                  type="text"
                  className="luxury max-w-lg w-full"
                  value={aiModelLocal}
                  onChange={(e) => setAiModelLocal(e.target.value)}
                  onBlur={saveAiSettings}
                  placeholder={DEFAULT_MODELS[aiProvider]}
                  spellCheck={false}
                />
              </div>

              <div className="flex items-center gap-3">
                <button
                  className="btn-luxury btn-primary text-sm inline-flex items-center gap-2"
                  onClick={runAiTest}
                  disabled={aiTest.status === 'loading'}
                >
                  {aiTest.status === 'loading' ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Sparkles size={14} />
                  )}
                  Bağlantıyı Test Et
                </button>
                <button
                  className="btn-luxury text-sm inline-flex items-center gap-2"
                  onClick={saveAiSettings}
                  type="button"
                >
                  <Save size={14} /> Kaydet
                </button>
              </div>

              <div className="min-h-[1.25rem]">
                <StatusBadge state={aiTest} />
              </div>

              <div
                className="text-xs font-ui italic px-3 py-2 rounded-sm"
                style={{
                  background: 'rgba(196,163,90,0.08)',
                  border: '1px solid rgba(196,163,90,0.3)',
                  color: 'var(--ink-secondary)'
                }}
              >
                Anahtarınız yalnızca yerel makinenizde saklanır. Hiçbir uzak sunucuya gönderilmez.
              </div>
            </section>
          )}

          {section === 'cloud' && (
            <section className="fade-in space-y-7">
              <SectionHeading>Bulut Eşitleme</SectionHeading>
              <div className="divider-gold" />

              <div className="flex items-center justify-between">
                <div>
                  <div className="font-ui text-sm text-ink-primary">Eşitlemeyi aç</div>
                  <div className="font-ui text-xs italic text-ink-faded mt-0.5">
                    WebDAV üzerinden yedek alma ve geri yükleme
                  </div>
                </div>
                <Toggle
                  checked={cloudEnabled}
                  onChange={(v) => updateSetting('cloud.enabled', v ? 'true' : 'false')}
                />
              </div>

              <div>
                <FieldLabel hint="https://cloud.example.com/remote.php/dav/files/kullanici/">
                  WebDAV URL
                </FieldLabel>
                <input
                  type="url"
                  className="luxury w-full max-w-xl"
                  value={cloudUrlLocal}
                  onChange={(e) => setCloudUrlLocal(e.target.value)}
                  onBlur={saveCloudSettings}
                  placeholder="https://…/remote.php/dav/files/kullanici/"
                  spellCheck={false}
                />
              </div>

              <div className="grid grid-cols-2 gap-4 max-w-xl">
                <div>
                  <FieldLabel>Kullanıcı adı</FieldLabel>
                  <input
                    type="text"
                    className="luxury w-full"
                    value={cloudUserLocal}
                    onChange={(e) => setCloudUserLocal(e.target.value)}
                    onBlur={saveCloudSettings}
                    autoComplete="off"
                    spellCheck={false}
                  />
                </div>
                <div>
                  <FieldLabel>Şifre</FieldLabel>
                  <div className="flex items-center gap-2">
                    <input
                      type={showCloudPass ? 'text' : 'password'}
                      className="luxury flex-1"
                      value={cloudPassLocal}
                      onChange={(e) => setCloudPassLocal(e.target.value)}
                      onBlur={saveCloudSettings}
                      autoComplete="off"
                      spellCheck={false}
                    />
                    <button
                      className="btn-luxury btn-ghost"
                      type="button"
                      onClick={() => setShowCloudPass((v) => !v)}
                    >
                      {showCloudPass ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  className="btn-luxury text-sm inline-flex items-center gap-2"
                  onClick={runCloudTest}
                  disabled={cloudTest.status === 'loading'}
                >
                  {cloudTest.status === 'loading' ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Cloud size={14} />
                  )}
                  Bağlantıyı Test Et
                </button>
                <button
                  className="btn-luxury btn-primary text-sm inline-flex items-center gap-2"
                  onClick={runCloudSync}
                  disabled={syncState.status === 'loading'}
                >
                  {syncState.status === 'loading' ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Upload size={14} />
                  )}
                  Şimdi Eşitle (Yükle)
                </button>
                <button
                  className="btn-luxury text-sm inline-flex items-center gap-2"
                  onClick={runCloudRestore}
                  disabled={restoreState.status === 'loading'}
                >
                  {restoreState.status === 'loading' ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Download size={14} />
                  )}
                  Buluttan Geri Yükle
                </button>
                <button
                  className="btn-luxury text-sm inline-flex items-center gap-2"
                  onClick={runLocalBackup}
                  disabled={backupState.status === 'loading'}
                >
                  {backupState.status === 'loading' ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Save size={14} />
                  )}
                  Yerel Yedek Oluştur
                </button>
              </div>

              <div className="space-y-1.5">
                <StatusBadge state={cloudTest} />
                <StatusBadge state={syncState} />
                <StatusBadge state={restoreState} />
                <StatusBadge state={backupState} />
              </div>

              <div
                className="text-xs font-ui italic px-3 py-2 rounded-sm"
                style={{
                  background: 'rgba(27,43,94,0.05)',
                  border: '1px solid rgba(27,43,94,0.2)',
                  color: 'var(--ink-secondary)'
                }}
              >
                Nextcloud ve ownCloud ile uyumludur. URL’yi <em>WebDAV bağlantısı</em> bölümünden
                alabilirsiniz (genellikle <code>/remote.php/dav/files/&lt;kullanıcı&gt;/</code> ile
                biter).
              </div>
            </section>
          )}

          {section === 'about' && (
            <section className="fade-in space-y-7">
              <SectionHeading>Hakkında</SectionHeading>
              <div className="divider-gold" />

              <div className="text-center py-2">
                <div className="font-display italic text-5xl text-pineider-navy">Atelier</div>
                <div className="font-ui italic text-sm text-ink-faded mt-1">sürüm 1.0</div>
                <div className="fleuron">❦</div>
                <div className="font-display italic text-lg text-ink-secondary max-w-md mx-auto">
                  “Kişisel bir yazı atölyesi — yalnızca size özel.”
                </div>
              </div>

              <div className="divider-gold" />

              <div>
                <FieldLabel hint="Belgeler, ayarlar ve veritabanı burada saklanır">
                  Veri dizini
                </FieldLabel>
                <div className="flex items-center gap-2">
                  <code
                    className="flex-1 truncate text-sm font-ui px-3 py-2 rounded-sm"
                    style={{
                      background: 'rgba(28,28,40,0.04)',
                      border: '1px solid rgba(28,28,40,0.1)'
                    }}
                    title={dataPath}
                  >
                    {dataPath || '—'}
                  </code>
                  <button
                    className="btn-luxury btn-ghost"
                    onClick={() => dataPath && window.atelier.file.openInExplorer(dataPath)}
                    disabled={!dataPath}
                    title="Dosya yöneticisinde aç"
                  >
                    <FolderOpen size={14} />
                  </button>
                </div>
              </div>

              <div>
                <FieldLabel hint="Kayıtlı beslemeler ve makaleler">RSS</FieldLabel>
                {rssStats ? (
                  <div className="grid grid-cols-4 gap-3">
                    <div className="notebook-card p-3 text-center">
                      <div className="font-display italic text-2xl text-pineider-navy">
                        {rssStats.totalFeeds}
                      </div>
                      <div className="font-ui text-xs italic text-ink-faded">besleme</div>
                    </div>
                    <div className="notebook-card p-3 text-center">
                      <div className="font-display italic text-2xl text-pineider-navy">
                        {rssStats.totalArticles}
                      </div>
                      <div className="font-ui text-xs italic text-ink-faded">makale</div>
                    </div>
                    <div className="notebook-card p-3 text-center">
                      <div className="font-display italic text-2xl text-pineider-bordeaux">
                        {rssStats.unreadCount}
                      </div>
                      <div className="font-ui text-xs italic text-ink-faded">okunmamış</div>
                    </div>
                    <div className="notebook-card p-3 text-center">
                      <div className="font-display italic text-2xl text-pineider-gold">
                        {rssStats.savedCount}
                      </div>
                      <div className="font-ui text-xs italic text-ink-faded">kayıtlı</div>
                    </div>
                  </div>
                ) : (
                  <div className="font-ui italic text-sm text-ink-faded inline-flex items-center gap-2">
                    <RefreshCw size={14} className="animate-spin" /> Yükleniyor…
                  </div>
                )}
              </div>

              <div className="fleuron">❦</div>
              <div className="font-ui italic text-xs text-center text-ink-faded">
                Pineider Capri · G. Lalo Vélin · Original Crown Mill · Moleskine Hemingway
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  )
}
