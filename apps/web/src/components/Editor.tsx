'use client'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Image from '@tiptap/extension-image'
import Link from '@tiptap/extension-link'
import { useEffect, useRef, useState } from 'react'
import {
  Bold, Italic, Heading1, Heading2, Heading3,
  Minus, Undo2, Redo2, ImageIcon, Loader2,
} from 'lucide-react'

interface EditorProps {
  content: string
  onChange: (html: string) => void
  placeholder?: string
  onImageUpload?: (file: File) => Promise<string>
}

export default function Editor({ content, onChange, placeholder = '내용을 입력하세요...', onImageUpload }: EditorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder }),
      Image.configure({ inline: false, allowBase64: false }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { class: 'text-accent underline underline-offset-2 hover:opacity-80 transition-opacity' },
      }),
    ],
    content,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: 'min-h-[280px] outline-none text-text-primary text-sm leading-7 px-5 py-4',
      },
    },
    onUpdate({ editor }) { onChange(editor.getHTML()) },
  })

  useEffect(() => {
    if (!editor) return
    const current = editor.getHTML()
    if (content === current) return
    if (content === '') {
      editor.commands.clearContent()
    } else if (current === '<p></p>' || current === '') {
      editor.commands.setContent(content)
    }
  }, [content, editor])

  const handleImageFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !onImageUpload || !editor) return
    setUploading(true)
    try {
      const url = await onImageUpload(file)
      editor.chain().focus().setImage({ src: url }).run()
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  if (!editor) return null

  const Sep = () => <div className="w-px h-4 bg-line mx-0.5 flex-shrink-0" />

  const Btn = ({ onClick, active = false, disabled = false, children }: {
    onClick: () => void; active?: boolean; disabled?: boolean; children: React.ReactNode
  }) => (
    <button type="button" onMouseDown={e => { e.preventDefault(); onClick() }} disabled={disabled}
      className={`p-1.5 rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
        active
          ? 'bg-accent text-white shadow-sm scale-95'
          : 'text-text-muted hover:text-text-primary hover:bg-bg-tertiary'
      }`}>
      {children}
    </button>
  )

  return (
    <div className="bg-bg-card rounded-2xl overflow-hidden border border-line focus-within:border-accent/40 focus-within:ring-2 focus-within:ring-accent/10 transition-all">

      {/* 숨김 파일 입력 */}
      {onImageUpload && (
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageFile} />
      )}

      {/* ── 툴바 ── */}
      <div className="flex flex-wrap items-center gap-0.5 px-3 py-2 border-b border-line bg-bg-secondary/50">
        <Btn onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive('heading', { level: 1 })}>
          <Heading1 className="w-4 h-4" />
        </Btn>
        <Btn onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive('heading', { level: 2 })}>
          <Heading2 className="w-4 h-4" />
        </Btn>
        <Btn onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive('heading', { level: 3 })}>
          <Heading3 className="w-4 h-4" />
        </Btn>
        <Sep />
        <Btn onClick={() => editor.chain().focus().setHorizontalRule().run()}><Minus className="w-4 h-4" /></Btn>
        <Sep />
        <Btn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')}><Bold className="w-4 h-4" /></Btn>
        <Btn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')}><Italic className="w-4 h-4" /></Btn>
        {onImageUpload && (
          <>
            <Sep />
            <Btn onClick={() => fileInputRef.current?.click()} disabled={uploading}>
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImageIcon className="w-4 h-4" />}
            </Btn>
          </>
        )}
        <Sep />
        <Btn onClick={() => editor.chain().focus().undo().run()}><Undo2 className="w-4 h-4" /></Btn>
        <Btn onClick={() => editor.chain().focus().redo().run()}><Redo2 className="w-4 h-4" /></Btn>
      </div>

      {/* ── 본문 ── */}
      <div className="[&_h1]:!text-base [&_h1]:!font-bold [&_h2]:!text-lg [&_h2]:!font-bold [&_h3]:!text-xl [&_h3]:!font-bold [&_h1]:!my-1 [&_h2]:!my-1.5 [&_h3]:!my-2 [&_strong]:!font-black [&_b]:!font-black [&_img]:rounded-xl [&_img]:max-w-full [&_img]:my-2 [&_img]:border [&_img]:border-line">
        <EditorContent editor={editor} />
      </div>
    </div>
  )
}
