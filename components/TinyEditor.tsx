'use client';

import { useEffect, useRef } from 'react';
import { CKEditor } from '@ckeditor/ckeditor5-react';
import {
  ClassicEditor,
  Autoformat,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Code,
  Essentials,
  Heading,
  Image,
  ImageCaption,
  ImageStyle,
  ImageToolbar,
  ImageUpload,
  ImageResize,
  FileRepository,
  Indent,
  IndentBlock,
  Link,
  AutoLink,
  List,
  ListProperties,
  MediaEmbed,
  Paragraph,
  PasteFromOffice,
  Table,
  TableToolbar,
  TextTransformation,
  BlockQuote,
  CodeBlock,
  HorizontalLine,
  Alignment,
  FindAndReplace,
  SourceEditing,
} from 'ckeditor5';
import 'ckeditor5/ckeditor5.css';

interface Props {
  value: string;
  onChange: (val: string) => void;
  height?: number;
}

class UploadAdapter {
  private loader: any;
  constructor(loader: any) { this.loader = loader; }
  upload() {
    return this.loader.file.then((file: File) => new Promise<{ default: string }>((resolve, reject) => {
      const fd = new FormData();
      fd.append('file', file);
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') || '' : '';
      fetch('/api/upload', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd })
        .then(r => r.json())
        .then(d => { if (d.success) resolve({ default: d.url }); else reject(d.error || 'Upload failed'); })
        .catch(reject);
    }));
  }
  abort() {}
}

function uploadAdapterPlugin(editor: any) {
  editor.plugins.get('FileRepository').createUploadAdapter = (loader: any) => new UploadAdapter(loader);
}

const EDITOR_CONFIG = {
  licenseKey: 'GPL',
  plugins: [
    Essentials, Autoformat, Bold, Italic, Underline, Strikethrough, Code,
    Heading, Paragraph, Alignment, BlockQuote, CodeBlock, HorizontalLine,
    List, ListProperties, Indent, IndentBlock,
    Link, AutoLink,
    Image, ImageCaption, ImageStyle, ImageToolbar, ImageUpload, ImageResize, FileRepository,
    Table, TableToolbar,
    MediaEmbed, PasteFromOffice, TextTransformation,
    FindAndReplace, SourceEditing,
  ],
  toolbar: {
    items: [
      'undo', 'redo', '|', 'findAndReplace', 'sourceEditing', '|',
      'heading', '|',
      'bold', 'italic', 'underline', 'strikethrough', 'code', '|',
      'alignment', '|',
      'link', '|',
      'bulletedList', 'numberedList', 'indent', 'outdent', '|',
      'blockQuote', 'insertTable', 'uploadImage', 'mediaEmbed', 'horizontalLine', 'codeBlock',
    ],
    shouldNotGroupWhenFull: true,
  },
  heading: {
    options: [
      { model: 'paragraph' as const, title: 'Paragraph', class: 'ck-heading_paragraph' },
      { model: 'heading1' as const, view: 'h1', title: 'Heading 1', class: 'ck-heading_heading1' },
      { model: 'heading2' as const, view: 'h2', title: 'Heading 2', class: 'ck-heading_heading2' },
      { model: 'heading3' as const, view: 'h3', title: 'Heading 3', class: 'ck-heading_heading3' },
      { model: 'heading4' as const, view: 'h4', title: 'Heading 4', class: 'ck-heading_heading4' },
    ],
  },
  image: {
    toolbar: [
      'imageTextAlternative', 'toggleImageCaption', '|',
      'imageStyle:inline', 'imageStyle:block', 'imageStyle:side', '|',
      'resizeImage',
    ],
  },
  table: {
    contentToolbar: ['tableColumn', 'tableRow', 'mergeTableCells'],
  },
  list: {
    properties: {
      styles: true,
      startIndex: true,
      reversed: true,
    },
  },
  link: {
    addTargetToExternalLinks: true,
    defaultProtocol: 'https://',
  },
};

export default function TinyEditor({ value, onChange, height = 420 }: Props) {
  return (
    <div className="ck-editor-wrapper" style={{ '--ck-min-height': `${height}px` } as React.CSSProperties}>
      <CKEditor
        editor={ClassicEditor}
        data={value || ''}
        config={EDITOR_CONFIG as any}
        onReady={(editor: any) => {
          uploadAdapterPlugin(editor);
          editor.editing.view.change((writer: any) => {
            writer.setStyle('min-height', `${height}px`, editor.editing.view.document.getRoot());
          });
        }}
        onChange={(_event: any, editor: any) => {
          onChange(editor.getData());
        }}
      />
    </div>
  );
}
