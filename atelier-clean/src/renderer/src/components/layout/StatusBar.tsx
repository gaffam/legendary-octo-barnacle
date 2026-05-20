import { useAppStore } from '@/store/appStore'
import type { Language } from '@/types'

const LANG_LABELS: Record<Language, { label: string; flag: string }> = {
  tr: { label: 'Türkçe', flag: '🇹🇷' },
  en: { label: 'English', flag: '🇬🇧' },
  fr: { label: 'Français', flag: '🇫🇷' },
  it: { label: 'Italiano', flag: '🇮🇹' }
}

export default function StatusBar() {
  const {
    language,
    setLanguage,
    spellCheckEnabled,
    toggleSpellCheck,
    paperStyle,
    setPaperStyle,
    documents,
    activeDocumentId
  } = useAppStore()
  const activeDoc = documents.find((d) => d.id === activeDocumentId)
  const dateStr = new Date().toLocaleDateString(language === 'tr' ? 'tr-TR' : language, {
    weekday: 'long',
    day: 'numeric',
    month: 'long'
  })

  return (
    <div className="status-bar h-7 flex items-center justify-between px-4 border-t border-ink-primary/10 bg-paper-warm">
      <div className="flex items-center gap-4">
        <span className="italic capitalize">{dateStr}</span>
        {activeDoc && (
          <>
            <span className="text-pineider-gold">•</span>
            <span>{activeDoc.word_count} sözcük</span>
          </>
        )}
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1">
          <span className="text-ink-secondary text-[10px] mr-1">Kağıt:</span>
          {(['velin', 'toile', 'cotton'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setPaperStyle(s)}
              className={`px-2 py-0.5 text-[10px] rounded-sm transition ${
                paperStyle === s
                  ? 'bg-pineider-gold/20 text-pineider-bordeaux'
                  : 'hover:bg-ink-primary/5'
              }`}
            >
              {s === 'velin' ? 'Vélin' : s === 'toile' ? 'Toile' : 'Cotton'}
            </button>
          ))}
        </div>

        <span className="text-ink-secondary/40">|</span>

        <button
          onClick={toggleSpellCheck}
          className={`text-[11px] transition ${spellCheckEnabled ? 'text-pineider-bordeaux' : 'text-ink-secondary/50'}`}
          title="Yazım denetimi"
        >
          {spellCheckEnabled ? '✓ Yazım' : '✗ Yazım'}
        </button>

        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value as Language)}
          className="bg-transparent border-none text-[11px] outline-none cursor-pointer text-ink-primary font-ui"
        >
          {(Object.entries(LANG_LABELS) as [Language, typeof LANG_LABELS.tr][]).map(([k, v]) => (
            <option key={k} value={k}>
              {v.flag} {v.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}
