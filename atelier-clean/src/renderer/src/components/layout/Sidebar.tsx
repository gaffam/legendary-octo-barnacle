import { useAppStore } from '@/store/appStore'
import { PenLine, BookMarked, CalendarDays, Network, Rss, Sparkles, Settings } from 'lucide-react'
import type { ViewType } from '@/types'

interface NavItem {
  id: ViewType | 'ai'
  label: string
  icon: typeof PenLine
  description: string
}

const NAV_ITEMS: NavItem[] = [
  { id: 'editor', label: 'Yazıhane', icon: PenLine, description: 'Yazma masası' },
  { id: 'notebook', label: 'Defter', icon: BookMarked, description: 'Pamuklu bloknotlar' },
  { id: 'agenda', label: 'Ajanda', icon: CalendarDays, description: 'Takvim ve günce' },
  { id: 'zettelkasten', label: 'Zettelkasten', icon: Network, description: 'Düşünce ağı' },
  { id: 'rss', label: 'Beslemeler', icon: Rss, description: 'RSS ve okuma listesi' },
  { id: 'ai', label: 'Asistan', icon: Sparkles, description: 'Yapay zekâ' },
  { id: 'settings', label: 'Ayarlar', icon: Settings, description: 'Tercihler' }
]

export default function Sidebar() {
  const { currentView, setView, toggleAiPanel } = useAppStore()

  const handleClick = (id: ViewType | 'ai') => {
    if (id === 'ai') {
      toggleAiPanel()
    } else {
      setView(id)
    }
  }

  return (
    <aside className="w-60 leather-bg flex flex-col shadow-leather z-10">
      <div className="px-5 pt-6 pb-3">
        <div className="text-[10px] uppercase tracking-[0.2em] text-amber-100/40 font-ui">
          Şahsî Daire
        </div>
        <div className="divider-gold mt-2" />
      </div>

      <nav className="flex-1 overflow-y-auto">
        {NAV_ITEMS.map(({ id, label, icon: Icon, description }) => {
          const active = currentView === id
          return (
            <div
              key={id}
              className={`sidebar-item ${active ? 'active' : ''}`}
              onClick={() => handleClick(id)}
            >
              <Icon size={16} strokeWidth={1.4} />
              <div className="flex-1">
                <div className="leading-tight">{label}</div>
                <div className="text-[10px] text-amber-100/30 italic font-body">{description}</div>
              </div>
            </div>
          )
        })}
      </nav>

      <div className="px-5 py-4 border-t border-amber-100/10">
        <div className="text-[10px] text-amber-100/30 font-ui italic">Pineider Capri · Vélin</div>
        <div className="text-[10px] text-amber-100/20 font-ui mt-1">Atelier v1.0</div>
      </div>
    </aside>
  )
}
