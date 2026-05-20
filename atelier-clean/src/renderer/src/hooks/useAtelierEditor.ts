import { useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import CharacterCount from '@tiptap/extension-character-count'
import Link from '@tiptap/extension-link'
import Underline from '@tiptap/extension-underline'
import { useEffect } from 'react'
import { SpellCheckExtension, clearSpellCache } from '../components/editor/SpellCheckExtension'

export function useAtelierEditor({
  content,
  onChange,
  language,
  spellCheck,
  placeholder
}: {
  content: string
  onChange: (html: string) => void
  language: string
  spellCheck: boolean
  placeholder?: string
}) {
  const editor = useEditor(
    {
      extensions: [
        StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
        Underline,
        Link.configure({ openOnClick: false, autolink: true }),
        Placeholder.configure({
          placeholder: placeholder ?? 'Burada bir his var… kelimelere dökmek için yazmaya başlayın.'
        }),
        CharacterCount,
        SpellCheckExtension.configure({ language, enabled: spellCheck, debounceMs: 600 })
      ],
      content,
      onUpdate: ({ editor }) => onChange(editor.getHTML()),
      editorProps: {
        attributes: {
          class: 'tiptap crown-mill-animate focus:outline-none',
          spellcheck: 'false'
        }
      }
    },
    [language, spellCheck]
  )

  useEffect(() => {
    if (editor && editor.getHTML() !== content) {
      editor.commands.setContent(content || '', false)
    }
  }, [content, editor])

  useEffect(() => {
    clearSpellCache(language)
  }, [language])

  return editor
}
