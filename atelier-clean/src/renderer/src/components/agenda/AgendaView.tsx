import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  X,
  Trash2,
  Calendar as CalendarIcon,
  CalendarDays,
  CalendarRange,
  Clock,
  Check
} from 'lucide-react'
import {
  addDays,
  addMonths,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
  subMonths
} from 'date-fns'
import { useAppStore } from '@/store/appStore'
import { useAtelierEditor } from '@/hooks/useAtelierEditor'
import AtelierEditor from '@/components/editor/AtelierEditor'
import type { AgendaEntry } from '@/types'

type ViewMode = 'month' | 'week'
type EntryType = 'note' | 'event' | 'task'

interface ModalState {
  open: boolean
  editingId: string | null
  title: string
  date: string
  time: string
  end_time: string
  type: EntryType
  color: string
  content: string
  tags: string
}

const COLOR_CHOICES: Array<{ key: string; value: string; label: string }> = [
  { key: 'bordeaux', value: '#8B2635', label: 'Bordo' },
  { key: 'navy', value: '#1B2B5E', label: 'Lacivert' },
  { key: 'gold', value: '#C4A35A', label: 'Altın' },
  { key: 'forest', value: '#2F4F3F', label: 'Orman' }
]

const TYPE_LABELS: Record<EntryType, string> = {
  note: 'Not',
  event: 'Etkinlik',
  task: 'Görev'
}

const TR_WEEKDAYS_SHORT = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz']
const TR_WEEKDAYS_LONG = ['PAZARTESİ', 'SALI', 'ÇARŞAMBA', 'PERŞEMBE', 'CUMA', 'CUMARTESİ', 'PAZAR']
const TR_MONTHS = [
  'Ocak',
  'Şubat',
  'Mart',
  'Nisan',
  'Mayıs',
  'Haziran',
  'Temmuz',
  'Ağustos',
  'Eylül',
  'Ekim',
  'Kasım',
  'Aralık'
]

function fmtKey(d: Date): string {
  return format(d, 'yyyy-MM-dd')
}

function trLongDate(d: Date): string {
  const wd = TR_WEEKDAYS_LONG[(d.getDay() + 6) % 7]
  return `${wd}, ${d.getDate()} ${TR_MONTHS[d.getMonth()]} ${d.getFullYear()}`
}

function emptyModal(date: string): ModalState {
  return {
    open: false,
    editingId: null,
    title: '',
    date,
    time: '',
    end_time: '',
    type: 'event',
    color: COLOR_CHOICES[0].value,
    content: '',
    tags: ''
  }
}

export default function AgendaView() {
  const { language, spellCheckEnabled, paperStyle } = useAppStore()

  const [today] = useState(new Date())
  const [cursor, setCursor] = useState<Date>(today)
  const [selectedDate, setSelectedDate] = useState<Date>(today)
  const [view, setView] = useState<ViewMode>('month')
  const [entries, setEntries] = useState<AgendaEntry[]>([])
  const [bottomHeight, setBottomHeight] = useState<number>(40) // percent
  const [resizing, setResizing] = useState(false)
  const [journalContent, setJournalContent] = useState('')
  const [journalId, setJournalId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [modal, setModal] = useState<ModalState>(emptyModal(fmtKey(today)))

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastLoadedJournalId = useRef<string | null>(null)
  const ignoreNextEditorChange = useRef(false)

  // ─── Range to load ────────────────────────────────────────────────
  const visibleRange = useMemo(() => {
    if (view === 'month') {
      const ms = startOfMonth(cursor)
      const me = endOfMonth(cursor)
      return {
        from: startOfWeek(ms, { weekStartsOn: 1 }),
        to: endOfWeek(me, { weekStartsOn: 1 })
      }
    }
    return {
      from: startOfWeek(cursor, { weekStartsOn: 1 }),
      to: endOfWeek(cursor, { weekStartsOn: 1 })
    }
  }, [cursor, view])

  const reloadEntries = useCallback(async () => {
    const list = await window.atelier.agenda.list(
      fmtKey(visibleRange.from),
      fmtKey(visibleRange.to)
    )
    setEntries(list)
  }, [visibleRange])

  useEffect(() => {
    reloadEntries()
  }, [reloadEntries])

  // ─── Entries by day key ──────────────────────────────────────────
  const entriesByDay = useMemo(() => {
    const map = new Map<string, AgendaEntry[]>()
    for (const e of entries) {
      const arr = map.get(e.date) ?? []
      arr.push(e)
      map.set(e.date, arr)
    }
    for (const arr of map.values()) {
      arr.sort((a, b) => (a.time || '').localeCompare(b.time || ''))
    }
    return map
  }, [entries])

  const selectedKey = fmtKey(selectedDate)
  const selectedEntries = entriesByDay.get(selectedKey) ?? []

  // ─── Daily journal: pick the first 'note' entry, or create one on edit ─
  const journalEntry = useMemo(
    () => selectedEntries.find((e) => e.type === 'note' && !e.time) ?? null,
    [selectedEntries]
  )

  useEffect(() => {
    if (journalEntry) {
      if (lastLoadedJournalId.current !== journalEntry.id) {
        ignoreNextEditorChange.current = true
        setJournalContent(journalEntry.content || '')
        setJournalId(journalEntry.id)
        lastLoadedJournalId.current = journalEntry.id
      }
    } else {
      ignoreNextEditorChange.current = true
      setJournalContent('')
      setJournalId(null)
      lastLoadedJournalId.current = null
    }
  }, [journalEntry, selectedKey])

  const editor = useAtelierEditor({
    content: journalContent,
    onChange: (html) => {
      if (ignoreNextEditorChange.current) {
        ignoreNextEditorChange.current = false
        return
      }
      setJournalContent(html)
    },
    language,
    spellCheck: spellCheckEnabled,
    placeholder: 'Bugünden bir satır… Hemingway günce.'
  })

  // ─── Debounced journal autosave ────────────────────────────────────
  useEffect(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    if (lastLoadedJournalId.current === null && journalContent.trim() === '') return
    saveTimer.current = setTimeout(async () => {
      setSaving(true)
      try {
        if (journalId) {
          await window.atelier.agenda.update(journalId, { content: journalContent })
          setEntries((prev) =>
            prev.map((e) => (e.id === journalId ? { ...e, content: journalContent } : e))
          )
        } else if (journalContent.trim() !== '') {
          const created = await window.atelier.agenda.create({
            title: trLongDate(selectedDate),
            content: journalContent,
            date: selectedKey,
            type: 'note',
            color: COLOR_CHOICES[2].value,
            tags: []
          })
          setJournalId(created.id)
          lastLoadedJournalId.current = created.id
          setEntries((prev) => [...prev, created])
        }
      } finally {
        setSaving(false)
      }
    }, 1200)
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current)
    }
  }, [journalContent, journalId, selectedDate, selectedKey])

  // ─── Resize handler ────────────────────────────────────────────────
  useEffect(() => {
    if (!resizing) return
    const onMove = (e: MouseEvent) => {
      const container = document.getElementById('agenda-root')
      if (!container) return
      const rect = container.getBoundingClientRect()
      const pct = ((rect.bottom - e.clientY) / rect.height) * 100
      setBottomHeight(Math.min(75, Math.max(20, pct)))
    }
    const onUp = () => setResizing(false)
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [resizing])

  // ─── Calendar grid days ────────────────────────────────────────────
  const days = useMemo(() => {
    const out: Date[] = []
    let d = visibleRange.from
    while (d <= visibleRange.to) {
      out.push(d)
      d = addDays(d, 1)
    }
    return out
  }, [visibleRange])

  // ─── Navigation ────────────────────────────────────────────────────
  const prev = () => setCursor((c) => (view === 'month' ? subMonths(c, 1) : addDays(c, -7)))
  const next = () => setCursor((c) => (view === 'month' ? addMonths(c, 1) : addDays(c, 7)))
  const goToday = () => {
    const now = new Date()
    setCursor(now)
    setSelectedDate(now)
  }

  // ─── Modal handlers ────────────────────────────────────────────────
  const openNewEntry = (date?: Date) => {
    setModal({ ...emptyModal(fmtKey(date ?? selectedDate)), open: true })
  }

  const openEdit = (e: AgendaEntry) => {
    setModal({
      open: true,
      editingId: e.id,
      title: e.title,
      date: e.date,
      time: e.time ?? '',
      end_time: e.end_time ?? '',
      type: (e.type as EntryType) || 'event',
      color: e.color,
      content: e.content || '',
      tags: (e.tags ?? []).join(', ')
    })
  }

  const saveModal = async () => {
    if (!modal.title.trim() || !modal.date) return
    const payload: Partial<AgendaEntry> = {
      title: modal.title.trim(),
      date: modal.date,
      time: modal.time || undefined,
      end_time: modal.end_time || undefined,
      type: modal.type,
      color: modal.color,
      content: modal.content,
      tags: modal.tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean)
    }
    if (modal.editingId) {
      await window.atelier.agenda.update(modal.editingId, payload)
    } else {
      await window.atelier.agenda.create(payload)
    }
    setModal(emptyModal(fmtKey(selectedDate)))
    await reloadEntries()
  }

  const deleteEntry = async (id: string) => {
    if (!confirm('Bu kaydı silmek istediğinize emin misiniz?')) return
    await window.atelier.agenda.delete(id)
    if (id === journalId) {
      setJournalId(null)
      setJournalContent('')
      lastLoadedJournalId.current = null
    }
    setEntries((prev) => prev.filter((e) => e.id !== id))
  }

  const toggleTaskComplete = async (e: AgendaEntry) => {
    const next = e.is_completed ? 0 : 1
    await window.atelier.agenda.update(e.id, { is_completed: next })
    setEntries((prev) => prev.map((x) => (x.id === e.id ? { ...x, is_completed: next } : x)))
  }

  // ─── Render ────────────────────────────────────────────────────────
  const headerLabel =
    view === 'month'
      ? `${TR_MONTHS[cursor.getMonth()]} ${cursor.getFullYear()}`
      : `${format(visibleRange.from, 'd MMM')} – ${format(visibleRange.to, 'd MMM yyyy')}`

  return (
    <div id="agenda-root" className="flex flex-col h-full bg-paper-cream fade-in">
      {/* ─── TOP: Calendar ──────────────────────────────────────────── */}
      <div
        className="flex flex-col paper-velin overflow-hidden"
        style={{ height: `${100 - bottomHeight}%` }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-8 pt-6 pb-3">
          <div className="flex items-center gap-4">
            <button onClick={prev} className="btn-ghost" title="Önceki">
              <ChevronLeft size={20} />
            </button>
            <div className="text-center min-w-[280px]">
              <h2 className="font-display italic text-4xl text-pineider-navy leading-none">
                {headerLabel}
              </h2>
              <p className="text-[11px] uppercase tracking-[0.18em] text-ink-secondary mt-1 font-ui">
                Moleskine · Hemingway günce
              </p>
            </div>
            <button onClick={next} className="btn-ghost" title="Sonraki">
              <ChevronRight size={20} />
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={goToday} className="btn-luxury text-sm flex items-center gap-1.5">
              <CalendarIcon size={14} /> Bugün
            </button>
            <div className="flex border border-pineider-gold/30 rounded-sm overflow-hidden">
              <button
                onClick={() => setView('month')}
                className={`px-3 py-1.5 text-sm font-ui flex items-center gap-1.5 transition ${
                  view === 'month'
                    ? 'bg-pineider-gold/15 text-pineider-bordeaux'
                    : 'text-ink-secondary hover:text-pineider-navy'
                }`}
                title="Ay görünümü"
              >
                <CalendarDays size={14} /> Ay
              </button>
              <button
                onClick={() => setView('week')}
                className={`px-3 py-1.5 text-sm font-ui flex items-center gap-1.5 transition ${
                  view === 'week'
                    ? 'bg-pineider-gold/15 text-pineider-bordeaux'
                    : 'text-ink-secondary hover:text-pineider-navy'
                }`}
                title="Hafta görünümü"
              >
                <CalendarRange size={14} /> Hafta
              </button>
            </div>
            <button
              onClick={() => openNewEntry()}
              className="btn-primary text-sm flex items-center gap-1.5"
            >
              <Plus size={14} /> Yeni Etkinlik
            </button>
          </div>
        </div>

        <div className="fleuron mx-8" />

        {/* Weekday header */}
        <div className="grid grid-cols-7 px-8 mb-1 text-[10px] uppercase tracking-[0.16em] font-ui text-ink-secondary">
          {TR_WEEKDAYS_SHORT.map((d, i) => (
            <div key={d} className={`px-2 py-1 ${i >= 5 ? 'text-pineider-bordeaux/80' : ''}`}>
              {d}
            </div>
          ))}
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-auto px-8 pb-4">
          <div className="calendar-grid">
            {days.map((d) => {
              const key = fmtKey(d)
              const dayEntries = entriesByDay.get(key) ?? []
              const isOutside = view === 'month' && !isSameMonth(d, cursor)
              const isWeekend = d.getDay() === 0 || d.getDay() === 6
              const isSelected = isSameDay(d, selectedDate)
              const isCur = isToday(d)
              return (
                <div
                  key={key}
                  onClick={() => setSelectedDate(d)}
                  onDoubleClick={() => openNewEntry(d)}
                  className={`calendar-day ${isOutside ? 'outside' : ''} ${
                    isWeekend ? 'weekend' : ''
                  } ${isCur ? 'today' : ''} ${
                    isSelected ? 'ring-2 ring-pineider-bordeaux/40 ring-inset' : ''
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <span className={`calendar-day-num ${isCur ? 'text-pineider-bordeaux' : ''}`}>
                      {d.getDate()}
                    </span>
                    {dayEntries.length > 0 && (
                      <span className="text-[9px] font-ui text-ink-secondary uppercase tracking-wider">
                        {dayEntries.length}
                      </span>
                    )}
                  </div>
                  <div className="mt-1 space-y-0.5">
                    {dayEntries.slice(0, 3).map((e) => (
                      <div
                        key={e.id}
                        className="flex items-center gap-1 text-[10px] font-body truncate"
                        title={e.title}
                      >
                        <span
                          className="inline-block w-1.5 h-1.5 rounded-full flex-shrink-0"
                          style={{ background: e.color }}
                        />
                        <span
                          className={`truncate ${
                            e.is_completed ? 'line-through text-ink-secondary' : 'text-ink-primary'
                          }`}
                        >
                          {e.time ? `${e.time} ` : ''}
                          {e.title}
                        </span>
                      </div>
                    ))}
                    {dayEntries.length > 3 && (
                      <div className="text-[9px] italic text-ink-secondary font-body">
                        +{dayEntries.length - 3} daha
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* ─── Resizer ─────────────────────────────────────────────── */}
      <div
        onMouseDown={() => setResizing(true)}
        className="h-[6px] cursor-row-resize relative group flex items-center justify-center bg-paper-warm/50 hover:bg-pineider-gold/20 transition"
      >
        <div className="w-16 h-[2px] bg-pineider-gold/40 group-hover:bg-pineider-gold transition" />
      </div>

      {/* ─── BOTTOM: Day detail ─────────────────────────────────── */}
      <div
        className="flex flex-col paper-toile overflow-hidden"
        style={{ height: `${bottomHeight}%` }}
      >
        <div className="px-8 pt-5 pb-2 flex items-start justify-between">
          <div>
            <div className="text-[11px] uppercase tracking-[0.22em] text-pineider-bordeaux font-ui">
              {trLongDate(selectedDate).split(',')[0]}
            </div>
            <h3 className="font-display italic text-3xl text-pineider-navy mt-0.5">
              {selectedDate.getDate()} {TR_MONTHS[selectedDate.getMonth()]}{' '}
              <span className="text-ink-secondary">{selectedDate.getFullYear()}</span>
            </h3>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <span
              className={`text-[11px] italic font-ui ${
                saving ? 'text-pineider-bordeaux' : 'text-ink-secondary'
              }`}
            >
              {saving ? 'kaydediliyor…' : journalId ? 'kaydedildi' : ''}
            </span>
            <button
              onClick={() => openNewEntry(selectedDate)}
              className="btn-luxury text-xs flex items-center gap-1"
            >
              <Plus size={12} /> Ekle
            </button>
          </div>
        </div>

        <div className="divider-gold mx-8" />

        <div className="flex-1 grid grid-cols-2 gap-0 overflow-hidden">
          {/* Entries column */}
          <div className="overflow-y-auto px-8 py-4 border-r border-pineider-gold/15">
            <h4 className="text-[10px] uppercase tracking-[0.22em] text-ink-secondary font-ui mb-3">
              Günün Kayıtları
            </h4>
            {selectedEntries.length === 0 && (
              <div className="text-center text-ink-secondary italic text-sm py-8 font-body">
                Bu güne ait bir kayıt yok.
              </div>
            )}
            <ul className="space-y-2">
              {selectedEntries.map((e) => (
                <li
                  key={e.id}
                  className="group flex items-start gap-3 p-3 paper-cotton shadow-paper hover:shadow-paper-lg transition"
                  style={{ borderLeft: `3px solid ${e.color}` }}
                >
                  {e.type === 'task' ? (
                    <button
                      onClick={() => toggleTaskComplete(e)}
                      className={`mt-1 w-4 h-4 border rounded-sm flex items-center justify-center flex-shrink-0 transition ${
                        e.is_completed
                          ? 'bg-pineider-gold border-pineider-gold text-paper-cream'
                          : 'border-ink-secondary/50 hover:border-pineider-gold'
                      }`}
                      title={e.is_completed ? 'Tamamlandı' : 'Tamamla'}
                    >
                      {e.is_completed ? <Check size={11} /> : null}
                    </button>
                  ) : (
                    <span
                      className="mt-1.5 w-2 h-2 rounded-full flex-shrink-0"
                      style={{ background: e.color }}
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2">
                      <button
                        onClick={() => openEdit(e)}
                        className={`font-display text-[15px] text-pineider-navy text-left ${
                          e.is_completed ? 'line-through text-ink-secondary' : ''
                        }`}
                      >
                        {e.title}
                      </button>
                      <span className="text-[10px] uppercase tracking-wider text-ink-secondary font-ui">
                        {TYPE_LABELS[(e.type as EntryType) || 'event']}
                      </span>
                    </div>
                    {(e.time || e.end_time) && (
                      <div className="flex items-center gap-1 text-[11px] text-ink-secondary font-body mt-0.5">
                        <Clock size={10} />
                        <span>
                          {e.time || ''}
                          {e.end_time ? ` – ${e.end_time}` : ''}
                        </span>
                      </div>
                    )}
                    {e.content && e.type !== 'note' && (
                      <div
                        className="text-[12px] text-ink-secondary font-body mt-1 line-clamp-2"
                        dangerouslySetInnerHTML={{ __html: e.content }}
                      />
                    )}
                  </div>
                  <button
                    onClick={() => deleteEntry(e.id)}
                    className="opacity-0 group-hover:opacity-100 text-ink-secondary hover:text-pineider-bordeaux transition"
                    title="Sil"
                  >
                    <Trash2 size={13} />
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Journal column */}
          <div className="overflow-hidden flex flex-col">
            <div className="px-6 pt-4 pb-1">
              <h4 className="text-[10px] uppercase tracking-[0.22em] text-ink-secondary font-ui">
                Günlük Defter
              </h4>
              <p className="font-display italic text-base text-pineider-navy/80 mt-0.5">
                bir paragraf, doğru bir cümle.
              </p>
            </div>
            <div className="flex-1 overflow-hidden">
              <AtelierEditor editor={editor} language={language} paperStyle={paperStyle} />
            </div>
          </div>
        </div>
      </div>

      {/* ─── Modal ──────────────────────────────────────────────── */}
      {modal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-leather-dark/40 fade-in">
          <div className="bg-paper-cream w-[520px] max-w-[94vw] shadow-paper-lg border border-pineider-gold/40 rounded-sm">
            <div className="flex items-center justify-between px-6 pt-5 pb-3">
              <h3 className="font-display italic text-2xl text-pineider-navy">
                {modal.editingId ? 'Kaydı Düzenle' : 'Yeni Etkinlik'}
              </h3>
              <button
                onClick={() => setModal(emptyModal(fmtKey(selectedDate)))}
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
                  value={modal.title}
                  onChange={(e) => setModal({ ...modal, title: e.target.value })}
                  placeholder="örn. Akşam yürüyüşü"
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] uppercase tracking-wider text-ink-secondary font-ui mb-1">
                    Tarih
                  </label>
                  <input
                    type="date"
                    className="luxury w-full"
                    value={modal.date}
                    onChange={(e) => setModal({ ...modal, date: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-[11px] uppercase tracking-wider text-ink-secondary font-ui mb-1">
                    Saat
                  </label>
                  <input
                    type="time"
                    className="luxury w-full"
                    value={modal.time}
                    onChange={(e) => setModal({ ...modal, time: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-[11px] uppercase tracking-wider text-ink-secondary font-ui mb-1">
                    Bitiş
                  </label>
                  <input
                    type="time"
                    className="luxury w-full"
                    value={modal.end_time}
                    onChange={(e) => setModal({ ...modal, end_time: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] uppercase tracking-wider text-ink-secondary font-ui mb-1">
                    Tür
                  </label>
                  <div className="flex border border-pineider-gold/30 rounded-sm overflow-hidden">
                    {(['event', 'note', 'task'] as EntryType[]).map((t) => (
                      <button
                        key={t}
                        onClick={() => setModal({ ...modal, type: t })}
                        className={`flex-1 px-2 py-1.5 text-sm font-ui transition ${
                          modal.type === t
                            ? 'bg-pineider-gold/15 text-pineider-bordeaux'
                            : 'text-ink-secondary hover:text-pineider-navy'
                        }`}
                      >
                        {TYPE_LABELS[t]}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] uppercase tracking-wider text-ink-secondary font-ui mb-1">
                    Renk
                  </label>
                  <div className="flex gap-2 pt-1">
                    {COLOR_CHOICES.map((c) => (
                      <button
                        key={c.key}
                        onClick={() => setModal({ ...modal, color: c.value })}
                        className={`w-7 h-7 rounded-full transition ${
                          modal.color === c.value
                            ? 'ring-2 ring-pineider-gold ring-offset-2 ring-offset-paper-cream'
                            : ''
                        }`}
                        style={{ background: c.value }}
                        title={c.label}
                      />
                    ))}
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-[11px] uppercase tracking-wider text-ink-secondary font-ui mb-1">
                  Not
                </label>
                <textarea
                  className="luxury w-full min-h-[80px] resize-none"
                  value={modal.content}
                  onChange={(e) => setModal({ ...modal, content: e.target.value })}
                  placeholder="kısa açıklama…"
                />
              </div>
              <div>
                <label className="block text-[11px] uppercase tracking-wider text-ink-secondary font-ui mb-1">
                  Etiketler
                </label>
                <input
                  className="luxury w-full"
                  value={modal.tags}
                  onChange={(e) => setModal({ ...modal, tags: e.target.value })}
                  placeholder="virgülle ayır: iş, kişisel"
                />
              </div>
            </div>
            <div className="divider-gold mx-6" />
            <div className="px-6 py-4 flex items-center justify-between gap-2">
              {modal.editingId ? (
                <button
                  onClick={() => {
                    deleteEntry(modal.editingId!)
                    setModal(emptyModal(fmtKey(selectedDate)))
                  }}
                  className="btn-ghost text-sm text-pineider-bordeaux flex items-center gap-1.5"
                >
                  <Trash2 size={13} /> Sil
                </button>
              ) : (
                <span />
              )}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setModal(emptyModal(fmtKey(selectedDate)))}
                  className="btn-ghost text-sm"
                >
                  İptal
                </button>
                <button onClick={saveModal} className="btn-primary text-sm">
                  {modal.editingId ? 'Güncelle' : 'Oluştur'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
