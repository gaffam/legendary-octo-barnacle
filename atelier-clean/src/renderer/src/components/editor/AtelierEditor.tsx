import { EditorContent, type Editor } from '@tiptap/react'
import { useEffect, useState } from 'react'

interface AtelierEditorProps {
  editor: Editor | null
  paperStyle?: 'velin' | 'toile' | 'cotton'
  language: string
  className?: string
}

interface SpellMenuState {
  visible: boolean
  x: number
  y: number
  word: string
  suggestions: string[]
  position?: number
}

export default function AtelierEditor({
  editor,
  paperStyle = 'velin',
  language,
  className = ''
}: AtelierEditorProps) {
  const [spellMenu, setSpellMenu] = useState<SpellMenuState>({
    visible: false,
    x: 0,
    y: 0,
    word: '',
    suggestions: []
  })

  useEffect(() => {
    ;(window as any).__spellContextMenu = async ({ word, x, y, language: lng, pos }: any) => {
      const result = await window.atelier.spell.check(word, lng)
      setSpellMenu({
        visible: true,
        x,
        y,
        word,
        suggestions: result.suggestions,
        position: pos
      })
    }
    const closeMenu = () => setSpellMenu((m) => ({ ...m, visible: false }))
    document.addEventListener('click', closeMenu)
    return () => {
      document.removeEventListener('click', closeMenu)
      ;(window as any).__spellContextMenu = null
    }
  }, [])

  const applySuggestion = (suggestion: string) => {
    if (!editor || spellMenu.position === undefined) return
    const state = editor.view.state
    let target: { from: number; to: number } | null = null
    state.doc.descendants((node, pos) => {
      if (target) return false
      if (!node.isText || typeof node.text !== 'string') return true
      const idx = node.text.indexOf(spellMenu.word)
      if (idx >= 0) {
        const from = pos + idx
        const to = from + spellMenu.word.length
        if (spellMenu.position! >= from && spellMenu.position! <= to) {
          target = { from, to }
        }
      }
      return true
    })
    if (target) {
      editor
        .chain()
        .focus()
        .setTextSelection({ from: (target as any).from, to: (target as any).to })
        .insertContent(suggestion)
        .run()
    }
    setSpellMenu((m) => ({ ...m, visible: false }))
  }

  const addToDictionary = async () => {
    await window.atelier.spell.addWord(spellMenu.word, language)
    setSpellMenu((m) => ({ ...m, visible: false }))
    editor?.commands.focus()
  }

  return (
    <div className={`relative overflow-y-auto h-full paper-${paperStyle} ${className}`}>
      <div className="max-w-3xl mx-auto py-8 min-h-full">
        <EditorContent editor={editor} />
      </div>

      {spellMenu.visible && (
        <div
          className="fixed z-50 bg-paper-cream border border-pineider-gold/40 shadow-paper-lg rounded-sm py-1 min-w-[200px] fade-in"
          style={{ left: spellMenu.x, top: spellMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-3 py-1 text-[10px] uppercase tracking-wider text-pineider-bordeaux border-b border-pineider-gold/20 italic">
            &quot;{spellMenu.word}&quot;
          </div>
          {spellMenu.suggestions.length === 0 ? (
            <div className="px-3 py-2 text-sm text-ink-secondary italic">Öneri yok</div>
          ) : (
            spellMenu.suggestions.map((sug, i) => (
              <button
                key={i}
                onClick={() => applySuggestion(sug)}
                className="block w-full text-left px-3 py-1.5 text-sm hover:bg-pineider-gold/10 transition font-body"
              >
                {sug}
              </button>
            ))
          )}
          <div className="border-t border-pineider-gold/20 mt-1">
            <button
              onClick={addToDictionary}
              className="block w-full text-left px-3 py-1.5 text-[12px] hover:bg-pineider-gold/10 text-pineider-navy italic"
            >
              + Sözlüğe ekle
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
