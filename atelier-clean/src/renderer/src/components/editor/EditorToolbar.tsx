import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Code,
  Undo,
  Redo,
  Link2,
  Minus,
  FileDown,
  FileText,
  FileType,
  Save,
  Plus
} from 'lucide-react'
import type { Editor } from '@tiptap/react'

interface EditorToolbarProps {
  editor: Editor | null
  title: string
  onTitleChange: (t: string) => void
  onSave: () => void
  onExportPdf: () => void
  onExportDocx: () => void
  onExportMd: () => void
  onNew: () => void
  saving?: boolean
}

export default function EditorToolbar({
  editor,
  title,
  onTitleChange,
  onSave,
  onExportPdf,
  onExportDocx,
  onExportMd,
  onNew,
  saving
}: EditorToolbarProps) {
  if (!editor) return null

  const btn = (active: boolean, onClick: () => void, Icon: typeof Bold, title: string) => (
    <button
      onClick={onClick}
      title={title}
      className={`p-1.5 rounded-sm transition ${
        active
          ? 'bg-pineider-gold/20 text-pineider-bordeaux'
          : 'text-ink-secondary hover:bg-ink-primary/5 hover:text-ink-primary'
      }`}
    >
      <Icon size={15} strokeWidth={1.5} />
    </button>
  )

  return (
    <div className="border-b border-ink-primary/10 bg-paper-warm/60 backdrop-blur-sm">
      {/* Title row */}
      <div className="flex items-center px-6 pt-3 pb-2 gap-3">
        <input
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          placeholder="Adsız Belge"
          className="luxury flex-1 text-2xl font-display italic bg-transparent border-none focus:outline-none placeholder:text-ink-secondary/40"
          style={{ fontFamily: 'Cormorant Garamond, Garamond, serif' }}
        />
        <button onClick={onNew} className="btn-luxury btn-ghost flex items-center gap-1.5 text-xs">
          <Plus size={13} strokeWidth={1.5} />
          Yeni
        </button>
        <button onClick={onSave} className="btn-luxury flex items-center gap-1.5 text-xs">
          <Save size={13} strokeWidth={1.5} />
          {saving ? 'Kaydediliyor...' : 'Kaydet'}
        </button>
      </div>

      {/* Tool buttons */}
      <div className="flex items-center px-6 pb-2 gap-0.5 flex-wrap">
        {btn(
          editor.isActive('bold'),
          () => editor.chain().focus().toggleBold().run(),
          Bold,
          'Kalın'
        )}
        {btn(
          editor.isActive('italic'),
          () => editor.chain().focus().toggleItalic().run(),
          Italic,
          'İtalik'
        )}
        {btn(
          editor.isActive('underline'),
          () => editor.chain().focus().toggleUnderline().run(),
          UnderlineIcon,
          'Altı çizili'
        )}
        {btn(
          editor.isActive('strike'),
          () => editor.chain().focus().toggleStrike().run(),
          Strikethrough,
          'Üstü çizili'
        )}

        <span className="w-px h-5 bg-ink-primary/10 mx-1.5" />

        {btn(
          editor.isActive('heading', { level: 1 }),
          () => editor.chain().focus().toggleHeading({ level: 1 }).run(),
          Heading1,
          'Başlık 1'
        )}
        {btn(
          editor.isActive('heading', { level: 2 }),
          () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
          Heading2,
          'Başlık 2'
        )}
        {btn(
          editor.isActive('heading', { level: 3 }),
          () => editor.chain().focus().toggleHeading({ level: 3 }).run(),
          Heading3,
          'Başlık 3'
        )}

        <span className="w-px h-5 bg-ink-primary/10 mx-1.5" />

        {btn(
          editor.isActive('bulletList'),
          () => editor.chain().focus().toggleBulletList().run(),
          List,
          'Madde'
        )}
        {btn(
          editor.isActive('orderedList'),
          () => editor.chain().focus().toggleOrderedList().run(),
          ListOrdered,
          'Numaralı liste'
        )}
        {btn(
          editor.isActive('blockquote'),
          () => editor.chain().focus().toggleBlockquote().run(),
          Quote,
          'Alıntı'
        )}
        {btn(
          editor.isActive('codeBlock'),
          () => editor.chain().focus().toggleCodeBlock().run(),
          Code,
          'Kod'
        )}

        <span className="w-px h-5 bg-ink-primary/10 mx-1.5" />

        {btn(
          false,
          () => {
            const url = prompt("Bağlantı URL'si:")
            if (url) editor.chain().focus().setLink({ href: url }).run()
          },
          Link2,
          'Bağlantı ekle'
        )}
        {btn(false, () => editor.chain().focus().setHorizontalRule().run(), Minus, 'Ayraç')}

        <span className="w-px h-5 bg-ink-primary/10 mx-1.5" />

        {btn(false, () => editor.chain().focus().undo().run(), Undo, 'Geri')}
        {btn(false, () => editor.chain().focus().redo().run(), Redo, 'İleri')}

        <span className="flex-1" />

        <div className="flex items-center gap-0.5">
          <button
            onClick={onExportMd}
            className="btn-luxury btn-ghost flex items-center gap-1 text-[11px]"
            title="Markdown olarak dışa aktar"
          >
            <FileType size={12} strokeWidth={1.5} />
            .md
          </button>
          <button
            onClick={onExportDocx}
            className="btn-luxury btn-ghost flex items-center gap-1 text-[11px]"
            title="Word olarak dışa aktar"
          >
            <FileText size={12} strokeWidth={1.5} />
            .docx
          </button>
          <button
            onClick={onExportPdf}
            className="btn-luxury btn-ghost flex items-center gap-1 text-[11px]"
            title="PDF olarak dışa aktar"
          >
            <FileDown size={12} strokeWidth={1.5} />
            .pdf
          </button>
        </div>
      </div>
    </div>
  )
}
