import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'

interface SpellCheckOptions {
  language: string
  enabled: boolean
  debounceMs: number
}

const spellKey = new PluginKey('spellcheck')

const WORD_REGEX = /[\p{L}\p{M}]+/gu

const wordCache = new Map<string, boolean>()
const MAX_CACHE = 5000

function cacheKey(word: string, lang: string) {
  return `${lang}::${word.toLowerCase()}`
}

export const SpellCheckExtension = Extension.create<SpellCheckOptions>({
  name: 'spellcheck',

  addOptions() {
    return {
      language: 'tr',
      enabled: true,
      debounceMs: 600
    }
  },

  addProseMirrorPlugins() {
    const { language, enabled } = this.options

    let pendingTimer: ReturnType<typeof setTimeout> | null = null
    let decorations = DecorationSet.empty

    return [
      new Plugin({
        key: spellKey,
        state: {
          init: () => DecorationSet.empty,
          apply: (tr, oldSet) => {
            const meta = tr.getMeta(spellKey)
            if (meta?.decorations) return meta.decorations
            return oldSet.map(tr.mapping, tr.doc)
          }
        },
        props: {
          decorations(state) {
            return spellKey.getState(state)
          },
          handleDOMEvents: {
            contextmenu: (view, event) => {
              if (!enabled) return false
              const target = event.target as HTMLElement
              if (target && target.classList?.contains('spell-error')) {
                const word = target.textContent || ''
                event.preventDefault()
                ;(window as any).__spellContextMenu?.({
                  word,
                  x: (event as MouseEvent).clientX,
                  y: (event as MouseEvent).clientY,
                  language,
                  view,
                  pos: view.posAtCoords({
                    left: (event as MouseEvent).clientX,
                    top: (event as MouseEvent).clientY
                  })?.pos
                })
                return true
              }
              return false
            }
          }
        },
        view: (editorView) => {
          const checkSpelling = async () => {
            if (!enabled) {
              editorView.dispatch(
                editorView.state.tr.setMeta(spellKey, { decorations: DecorationSet.empty })
              )
              return
            }

            const newDecorations: Decoration[] = []
            const wordsToCheck: { word: string; from: number; to: number }[] = []

            editorView.state.doc.descendants((node, pos) => {
              if (!node.isText || !node.text) return
              const text = node.text
              let match: RegExpExecArray | null
              const re = new RegExp(WORD_REGEX.source, 'gu')
              while ((match = re.exec(text)) !== null) {
                const word = match[0]
                if (word.length < 3) continue
                if (/^\d+$/.test(word)) continue
                const from = pos + match.index
                const to = from + word.length

                const ck = cacheKey(word, language)
                if (wordCache.has(ck)) {
                  if (!wordCache.get(ck)) {
                    newDecorations.push(
                      Decoration.inline(from, to, { class: 'spell-error', 'data-word': word })
                    )
                  }
                } else {
                  wordsToCheck.push({ word, from, to })
                }
              }
            })

            // Apply already-cached decorations immediately
            decorations = DecorationSet.create(editorView.state.doc, newDecorations)
            editorView.dispatch(editorView.state.tr.setMeta(spellKey, { decorations }))

            if (wordsToCheck.length === 0) return

            // Batch-check uncached words
            try {
              const words = wordsToCheck.map((w) => w.word)
              const results = await window.atelier.spell.checkBatch(words, language)

              const moreDecorations: Decoration[] = [...newDecorations]
              wordsToCheck.forEach(({ word, from, to }, idx) => {
                const r = results[idx]
                const ck = cacheKey(word, language)
                wordCache.set(ck, r.correct)
                if (wordCache.size > MAX_CACHE) {
                  const firstKey = wordCache.keys().next().value
                  if (firstKey) wordCache.delete(firstKey)
                }
                if (!r.correct) {
                  moreDecorations.push(
                    Decoration.inline(from, to, { class: 'spell-error', 'data-word': word })
                  )
                }
              })

              decorations = DecorationSet.create(editorView.state.doc, moreDecorations)
              editorView.dispatch(editorView.state.tr.setMeta(spellKey, { decorations }))
            } catch (err) {
              console.error('Spell check error:', err)
            }
          }

          const scheduleCheck = () => {
            if (pendingTimer) clearTimeout(pendingTimer)
            pendingTimer = setTimeout(checkSpelling, 600)
          }

          // Initial check
          setTimeout(scheduleCheck, 100)

          return {
            update: () => {
              scheduleCheck()
            },
            destroy: () => {
              if (pendingTimer) clearTimeout(pendingTimer)
            }
          }
        }
      })
    ]
  }
})

export function clearSpellCache(language?: string) {
  if (language) {
    for (const k of wordCache.keys()) {
      if (k.startsWith(`${language}::`)) wordCache.delete(k)
    }
  } else {
    wordCache.clear()
  }
}
