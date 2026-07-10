'use client';

import { useRef, useState, type ReactNode } from 'react';
import { Bold, Code, Eye, Heading2, Italic, Link2, List, ListOrdered, Pencil } from 'lucide-react';
import { MarkdownRenderer } from '@/components/MarkdownRenderer';

type EditorTab = 'write' | 'preview' | 'split';

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minRows?: number;
}

interface ToolbarAction {
  label: string;
  icon: ReactNode;
  prefix: string;
  suffix: string;
  block?: boolean;
}

const TOOLBAR_ACTIONS: ToolbarAction[] = [
  { label: 'Bold', icon: <Bold size={14} />, prefix: '**', suffix: '**' },
  { label: 'Italic', icon: <Italic size={14} />, prefix: '_', suffix: '_' },
  { label: 'Heading', icon: <Heading2 size={14} />, prefix: '## ', suffix: '', block: true },
  { label: 'Link', icon: <Link2 size={14} />, prefix: '[', suffix: '](url)' },
  { label: 'Bullet list', icon: <List size={14} />, prefix: '- ', suffix: '', block: true },
  { label: 'Numbered list', icon: <ListOrdered size={14} />, prefix: '1. ', suffix: '', block: true },
  { label: 'Code', icon: <Code size={14} />, prefix: '`', suffix: '`' },
];

export function MarkdownEditor({
  value,
  onChange,
  placeholder = 'Write in markdown...',
  minRows = 6,
}: MarkdownEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [tab, setTab] = useState<EditorTab>('write');

  const applyFormatting = (action: ToolbarAction) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = value.slice(start, end);
    const insertion = action.block
      ? `${action.prefix}${selected || 'text'}${action.suffix}`
      : `${action.prefix}${selected || 'text'}${action.suffix}`;

    const nextValue = value.slice(0, start) + insertion + value.slice(end);
    onChange(nextValue);

    requestAnimationFrame(() => {
      textarea.focus();
      const cursor = start + insertion.length;
      textarea.setSelectionRange(cursor, cursor);
    });
  };

  const tabs: { id: EditorTab; label: string; icon: ReactNode }[] = [
    { id: 'write', label: 'Write', icon: <Pencil size={14} /> },
    { id: 'preview', label: 'Preview', icon: <Eye size={14} /> },
    { id: 'split', label: 'Split', icon: <Eye size={14} /> },
  ];

  return (
    <div className="overflow-hidden rounded-lg border border-lucina-rose bg-lucina-white">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-lucina-rose bg-lucina-primary/60 px-3 py-2">
        <div className="flex flex-wrap gap-1">
          {TOOLBAR_ACTIONS.map((action) => (
            <button
              key={action.label}
              type="button"
              onClick={() => applyFormatting(action)}
              title={action.label}
              className="rounded-md p-1.5 text-lucina-muted hover:bg-lucina-surface hover:text-lucina-primary transition-colors"
            >
              {action.icon}
            </button>
          ))}
        </div>

        <div className="flex rounded-lg border border-lucina-rose p-0.5">
          {tabs.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                tab === item.id
                  ? 'bg-lucina-rose text-lucina-primary'
                  : 'text-lucina-muted hover:text-lucina-primary'
              }`}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {tab === 'write' && (
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={minRows}
          className="w-full resize-y bg-lucina-white px-4 py-3 font-mono text-sm text-lucina-primary placeholder-lucina-muted focus:outline-none"
        />
      )}

      {tab === 'preview' && (
        <div className="min-h-[160px] px-4 py-3">
          <MarkdownRenderer content={value} />
        </div>
      )}

      {tab === 'split' && (
        <div className="grid min-h-[160px] grid-cols-1 lg:grid-cols-2">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            rows={minRows}
            className="w-full resize-y border-b border-lucina-rose bg-lucina-white px-4 py-3 font-mono text-sm text-lucina-primary placeholder-lucina-muted focus:outline-none lg:border-b-0 lg:border-r"
          />
          <div className="px-4 py-3 lg:max-h-[360px] lg:overflow-y-auto">
            <MarkdownRenderer content={value} />
          </div>
        </div>
      )}
    </div>
  );
}