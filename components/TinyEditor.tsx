'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import { useEffect, useCallback } from 'react';

interface Props {
  value: string;
  onChange: (val: string) => void;
  height?: number;
}

function Btn({ onClick, label, active, title }: { onClick: () => void; label: string; active?: boolean; title?: string }) {
  return (
    <button
      type="button"
      onMouseDown={(e) => { e.preventDefault(); onClick(); }}
      title={title || label}
      style={{
        padding: '3px 8px', border: active ? '1px solid #3b82f6' : '1px solid transparent',
        borderRadius: 5, background: active ? '#eff6ff' : 'transparent',
        cursor: 'pointer', fontSize: 12.5, fontWeight: 600,
        color: active ? '#1d4ed8' : '#475569', minWidth: 28, transition: 'all 0.1s',
      }}
    >{label}</button>
  );
}

function Sep() {
  return <span style={{ width: 1, background: '#e2e8f0', margin: '2px 4px', alignSelf: 'stretch', display: 'inline-block' }} />;
}

export default function TinyEditor({ value, onChange, height = 420 }: Props) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Underline,
      Image.configure({ inline: false }),
      Link.configure({ openOnClick: false }),
      Placeholder.configure({ placeholder: 'Start writing...' }),
    ],
    content: value,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  });

  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value || '', { emitUpdate: false });
    }
  }, [value, editor]);

  const addImage = useCallback(async () => {
    if (!editor) return;
    const input = document.createElement('input');
    input.type = 'file'; input.accept = 'image/*';
    input.onchange = async () => {
      const file = input.files?.[0]; if (!file) return;
      const fd = new FormData(); fd.append('file', file);
      const token = localStorage.getItem('token') || '';
      const res = await fetch('/api/upload', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd });
      const data = await res.json();
      if (data.success) editor.chain().focus().setImage({ src: data.url }).run();
    };
    input.click();
  }, [editor]);

  const addLink = useCallback(() => {
    if (!editor) return;
    const url = window.prompt('Enter URL:');
    if (url) editor.chain().focus().setLink({ href: url }).run();
  }, [editor]);

  if (!editor) return (
    <div style={{ height, border: '1px solid #e2e8f0', borderRadius: 8, background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
      Loading editor...
    </div>
  );

  return (
    <div style={{ border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden' }}>
      {/* Toolbar */}
      <div style={{ padding: '7px 10px', borderBottom: '1px solid #e2e8f0', display: 'flex', flexWrap: 'wrap', gap: 2, background: '#f8fafc', alignItems: 'center' }}>
        <Btn onClick={() => editor.chain().focus().toggleBold().run()} label="B" active={editor.isActive('bold')} title="Bold" />
        <Btn onClick={() => editor.chain().focus().toggleItalic().run()} label="I" active={editor.isActive('italic')} title="Italic" />
        <Btn onClick={() => editor.chain().focus().toggleUnderline().run()} label="U" active={editor.isActive('underline')} title="Underline" />
        <Btn onClick={() => editor.chain().focus().toggleStrike().run()} label="S̶" active={editor.isActive('strike')} title="Strikethrough" />
        <Sep />
        <Btn onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} label="H2" active={editor.isActive('heading', { level: 2 })} />
        <Btn onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} label="H3" active={editor.isActive('heading', { level: 3 })} />
        <Btn onClick={() => editor.chain().focus().toggleHeading({ level: 4 }).run()} label="H4" active={editor.isActive('heading', { level: 4 })} />
        <Sep />
        <Btn onClick={() => editor.chain().focus().toggleBulletList().run()} label="• List" active={editor.isActive('bulletList')} />
        <Btn onClick={() => editor.chain().focus().toggleOrderedList().run()} label="1. List" active={editor.isActive('orderedList')} />
        <Sep />
        <Btn onClick={() => editor.chain().focus().toggleBlockquote().run()} label="❝" active={editor.isActive('blockquote')} title="Blockquote" />
        <Btn onClick={() => editor.chain().focus().toggleCode().run()} label="<>" active={editor.isActive('code')} title="Inline Code" />
        <Btn onClick={() => editor.chain().focus().setHorizontalRule().run()} label="—" title="Divider" />
        <Sep />
        <Btn onClick={addImage} label="📷 Image" title="Upload Image" />
        <Btn onClick={addLink} label="🔗 Link" active={editor.isActive('link')} title="Add Link" />
        {editor.isActive('link') && (
          <Btn onClick={() => editor.chain().focus().unsetLink().run()} label="✕ Link" title="Remove Link" />
        )}
        <Sep />
        <Btn onClick={() => editor.chain().focus().undo().run()} label="↩" title="Undo" />
        <Btn onClick={() => editor.chain().focus().redo().run()} label="↪" title="Redo" />
      </div>
      {/* Content */}
      <div style={{ minHeight: height, padding: '12px 16px', background: '#fff' }} className="tiptap-prose">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
