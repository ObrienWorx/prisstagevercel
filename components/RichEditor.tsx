'use client';

import { useEffect, useRef, useCallback } from 'react';

interface Props {
  value: string;
  onChange: (val: string) => void;
  label?: string;
  minHeight?: number;
}

type ToolItem =
  | { sep: true; cmd?: undefined }
  | { cmd: string; icon: string; title: string; sep?: undefined };

const FONT_SIZES = ['10px','11px','12px','14px','16px','18px','20px','24px','28px','32px','36px'];

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
  const savedRange = useRef<Range | null>(null);

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

  const captureSelection = useCallback(() => {
    const sel = window.getSelection();
    savedRange.current = (sel && sel.rangeCount > 0) ? sel.getRangeAt(0).cloneRange() : null;
  }, []);

  const applyFontSize = (size: string) => {
    const editor = editorRef.current;
    if (!editor) return;
    editor.focus();
    const sel = window.getSelection();
    if (savedRange.current) { sel?.removeAllRanges(); sel?.addRange(savedRange.current); }
    if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return;
    const range = sel.getRangeAt(0);
    const frag = range.extractContents();
    const span = document.createElement('span');
    span.style.fontSize = size;
    span.appendChild(frag);
    range.insertNode(span);
    handleInput();
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
          <div style={{ width: 1, background: '#e2e8f0', margin: '0 4px', alignSelf: 'stretch' }} />
          <select
            title="Font size"
            style={{
              fontSize: 12, height: 28, border: '1px solid #e2e8f0',
              borderRadius: 6, padding: '0 4px', background: '#fff', cursor: 'pointer',
            }}
            defaultValue=""
            onMouseDown={captureSelection}
            onChange={e => { applyFontSize(e.target.value); e.target.value = ''; }}
          >
            <option value="" disabled>Size</option>
            {FONT_SIZES.map(s => (
              <option key={s} value={s}>{s.replace('px', '')}</option>
            ))}
          </select>
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
