'use client'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Image from '@tiptap/extension-image'
import Link from '@tiptap/extension-link'
import { useEffect, useRef, useState } from 'react'
import {
  Bold, Italic, Strikethrough, Heading2, Heading3,
  List, ListOrdered, Quote, Code, Link2, Image as ImageIcon,
  Undo2, Redo2, X
} from 'lucide-react'

interface EditorProps {
  content: string
  onChange: (html: string) => void
  placeholder?: string
}

export default function Editor({ content, onChange, placeholder = '내용을 입력하세요...' }: EditorProps) {
  const [linkUrl, setLinkUrl] = useState('')
  const [showLinkInput, setShowLinkInput] = useState(false)
  const [imageUrl, setImageUrl] = useState('')
  const [showImageInput, setShowImageInput] = useState(false)
  const linkInputRef = useRef<HTMLInputElement>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder }),
      Image.configure({ inline: false, allowBase64: false }),
      Link.configure({ openOnClick: false, HTMLAttributes: { class: 'text-cyan-400 underline hover:text-cyan-300' } }),
    ],
    content,
    editorProps: {
      attributes: {
        class: 'min-h-[300px] outline-none text-slate-200 text-sm leading-relaxed p-4',
      },
    },
    onUpdate({ editor }) {
      onChange(editor.getHTML())
    },
  })

  useEffect(() => {
    if (showLinkInput) linkInputRef.current?.focus()
  }, [showLinkInput])

  useEffect(() => {
    if (showImageInput) imageInputRef.current?.focus()
  }, [showImageInput])

  useEffect(() => {
    if (editor && content !== editor.getHTML() && content === '') {
      editor.commands.clearContent()
    }
  }, [content, editor])

  const setLink = () => {
    if (!linkUrl.trim()) {
      editor?.chain().focus().unsetLink().run()
    } else {
      const url = /^https?:\/\//i.test(linkUrl) ? linkUrl : `https://${linkUrl}`
      editor?.chain().focus().setLink({ href: url }).run()
    }
    setLinkUrl('')
    setShowLinkInput(false)
  }

  const insertImage = () => {
    if (imageUrl.trim()) {
      editor?.chain().focus().setImage({ src: imageUrl.trim() }).run()
    }
    setImageUrl('')
    setShowImageInput(false)
  }

  if (!editor) return null

  const ToolBtn = ({
    onClick, active = false, title, children
  }: { onClick: () => void; active?: boolean; title: string; children: React.ReactNode }) => (
    <button
      type="button"
      onMouseDown={(e) => { e.preventDefault(); onClick() }}
      title={title}
      className={`p-1.5 rounded transition-colors ${active ? 'bg-cyan-600/30 text-cyan-300' : 'text-slate-400 hover:text-white hover:bg-slate-700'}`}
    >
      {children}
    </button>
  )

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden focus-within:border-cyan-500 transition-colors">
      <div className="flex flex-wrap items-center gap-0.5 px-3 py-2 border-b border-slate-700 bg-slate-800/80">
        <ToolBtn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} title="굵게">
          <Bold className="w-4 h-4" />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} title="기울임">
          <Italic className="w-4 h-4" />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive('strike')} title="취소선">
          <Strikethrough className="w-4 h-4" />
        </ToolBtn>

        <div className="w-px h-5 bg-slate-700 mx-1" />

        <ToolBtn onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive('heading', { level: 2 })} title="제목2">
          <Heading2 className="w-4 h-4" />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive('heading', { level: 3 })} title="제목3">
          <Heading3 className="w-4 h-4" />
        </ToolBtn>

        <div className="w-px h-5 bg-slate-700 mx-1" />

        <ToolBtn onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')} title="목록">
          <List className="w-4 h-4" />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')} title="번호 목록">
          <ListOrdered className="w-4 h-4" />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive('blockquote')} title="인용">
          <Quote className="w-4 h-4" />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleCode().run()} active={editor.isActive('code')} title="코드">
          <Code className="w-4 h-4" />
        </ToolBtn>

        <div className="w-px h-5 bg-slate-700 mx-1" />

        <ToolBtn onClick={() => setShowLinkInput(v => !v)} active={editor.isActive('link') || showLinkInput} title="링크">
          <Link2 className="w-4 h-4" />
        </ToolBtn>
        <ToolBtn onClick={() => setShowImageInput(v => !v)} active={showImageInput} title="이미지">
          <ImageIcon className="w-4 h-4" />
        </ToolBtn>

        <div className="w-px h-5 bg-slate-700 mx-1" />

        <ToolBtn onClick={() => editor.chain().focus().undo().run()} active={false} title="실행 취소">
          <Undo2 className="w-4 h-4" />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().redo().run()} active={false} title="다시 실행">
          <Redo2 className="w-4 h-4" />
        </ToolBtn>
      </div>

      {showLinkInput && (
        <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-700 bg-slate-900/50">
          <Link2 className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
          <input
            ref={linkInputRef}
            value={linkUrl}
            onChange={e => setLinkUrl(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') setLink(); if (e.key === 'Escape') { setShowLinkInput(false); setLinkUrl('') } }}
            placeholder="URL 입력 (Enter 확인, Esc 취소)"
            className="flex-1 bg-transparent text-white text-sm outline-none placeholder-slate-500"
          />
          <button type="button" onClick={setLink} className="text-xs text-cyan-400 hover:text-cyan-300 font-medium px-2 py-1 rounded hover:bg-cyan-600/10 transition-colors">적용</button>
          <button type="button" onClick={() => { setShowLinkInput(false); setLinkUrl('') }} className="text-slate-500 hover:text-white transition-colors"><X className="w-3.5 h-3.5" /></button>
        </div>
      )}

      {showImageInput && (
        <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-700 bg-slate-900/50">
          <ImageIcon className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
          <input
            ref={imageInputRef}
            value={imageUrl}
            onChange={e => setImageUrl(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') insertImage(); if (e.key === 'Escape') { setShowImageInput(false); setImageUrl('') } }}
            placeholder="이미지 URL 입력 (Enter 삽입, Esc 취소)"
            className="flex-1 bg-transparent text-white text-sm outline-none placeholder-slate-500"
          />
          <button type="button" onClick={insertImage} className="text-xs text-cyan-400 hover:text-cyan-300 font-medium px-2 py-1 rounded hover:bg-cyan-600/10 transition-colors">삽입</button>
          <button type="button" onClick={() => { setShowImageInput(false); setImageUrl('') }} className="text-slate-500 hover:text-white transition-colors"><X className="w-3.5 h-3.5" /></button>
        </div>
      )}

      <EditorContent editor={editor} />
    </div>
  )
}
