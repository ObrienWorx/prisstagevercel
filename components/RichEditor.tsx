'use client';

import { useEffect, useRef } from 'react';

interface Props {
  value: string;
  onChange: (val: string) => void;
  label?: string;
  minHeight?: number;
}

type ToolItem =
  | { sep: true; cmd?: undefined }
  | { cmd: string; icon: string; title: string; sep?: undefined };

const TOOLS: ToolItem[] = [
  { cmd: 'bold', icon: '<b>B</b>', title: 'Bold' },
  { cmd: 'italic', icon: '<i>I</i>', title: 'Italic' },
  { cmd: 'underline', icon: '<u>U</u>', title: 'Underline' },
  { cmd: 'strikeThrough', icon: '<s>S</s>', title: 'Strikethrough' },
  { sep: true },
  { cmd: 'h2', icon: 'H2', title: 'Heading 2' },
  { cmd: 'h3', icon: 'H3', title: 'Heading 3' },
  { sep: true },
  { cmd: 'insertUnorderedList', icon: '&#8226; List', title: 'Bullet List' },
  { cmd: 'insertOrderedList', icon: '1. List', title: 'Ordered List' },
  { sep: true },
  { cmd: 'blockquote', icon: '&#8220;Quote&#8221;', title: 'Blockquote' },
  { cmd: 'link', icon: '🔗 Link', title: 'Insert Link' },
  { sep: true },
  { cmd: 'removeFormat', icon: '&#10006; Clear', title: 'Clear Formatting' },
];

export default function RichEditor({ value, onChange, label = 'Content', minHeight = 280 }: Props) {
  const editorRef = useRef<HTMLDivElement>(null);
  const skipUpdate = useRef(false);

  useEffect(() => {
    if (editorRef.current && !skipUpdate.current) {
      editorRef.current.innerHTML = value || '';
    }
    skipUpdate.current = false;
  }, [value]);

  const exec = (cmd: string) => {
    const editor = editorRef.current;
    if (!editor) return;
    editor.focus();

    if (cmd === 'h2' || cmd === 'h3') {
      document.execCommand('formatBlock', false, `<${cmd}>`);
    } else if (cmd === 'blockquote') {
      document.execCommand('formatBlock', false, '<blockquote>');
    } else if (cmd === 'link') {
      const url = prompt('Enter URL (e.g. https://example.com):');
      if (url) document.execCommand('createLink', false, url);
    } else {
      document.execCommand(cmd, false);
    }
    handleInput();
  };

  const handleInput = () => {
    skipUpdate.current = true;
    onChange(editorRef.current?.innerHTML || '');
  };

  return (
    <div>
      {label && <label className="form-label">{label}</label>}
      <div className="border rounded overflow-hidden" style={{ borderColor: '#e2e8f0' }}>
        {/* Toolbar */}
        <div className="rich-editor-toolbar">
          {TOOLS.map((t, i) =>
            t.sep ? (
              <div key={i} style={{ width: 1, background: '#e2e8f0', margin: '0 4px', alignSelf: 'stretch' }} />
            ) : (
              <button
                key={t.cmd}
                type="button"
                title={t.title}
                className="btn btn-sm"
                style={{
                  fontSize: 12, padding: '2px 8px', border: '1px solid #e2e8f0',
                  background: '#fff', borderRadius: 6, lineHeight: 1.6,
                }}
                onMouseDown={(e) => { e.preventDefault(); exec(t.cmd!); }}
                dangerouslySetInnerHTML={{ __html: t.icon }}
              />
            )
          )}
        </div>
        {/* Content */}
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          onInput={handleInput}
          className="rich-editor-content"
          style={{ minHeight }}
          data-placeholder="Start writing..."
        />
      </div>
    </div>
  );
}
