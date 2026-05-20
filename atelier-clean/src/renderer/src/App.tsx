import { useEffect } from 'react'
import { useAppStore } from './store/appStore'
import TitleBar from './components/layout/TitleBar'
import Sidebar from './components/layout/Sidebar'
import StatusBar from './components/layout/StatusBar'
import EditorView from './components/editor/EditorView'
import NotebookView from './components/notebook/NotebookView'
import AgendaView from './components/agenda/AgendaView'
import ZettelkastenView from './components/zettelkasten/ZettelkastenView'
import RssView from './components/rss/RssView'
import SettingsView from './components/settings/SettingsView'
import AiPanel from './components/ai/AiPanel'

export default function App() {
  const { currentView, loadSettings, loadNotebooks, loadDocuments, aiPanelOpen } = useAppStore()

  useEffect(() => {
    ;(async () => {
      await loadSettings()
      await loadNotebooks()
      await loadDocuments()
    })()
  }, [])

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-paper-cream">
      <TitleBar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-hidden relative paper-velin">
          <div key={currentView} className="absolute inset-0 page-turn">
            {currentView === 'editor' && <EditorView />}
            {currentView === 'notebook' && <NotebookView />}
            {currentView === 'agenda' && <AgendaView />}
            {currentView === 'zettelkasten' && <ZettelkastenView />}
            {currentView === 'rss' && <RssView />}
            {currentView === 'settings' && <SettingsView />}
          </div>
        </main>
        {aiPanelOpen && <AiPanel />}
      </div>
      <StatusBar />
    </div>
  )
}
