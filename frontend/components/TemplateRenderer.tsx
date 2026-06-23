'use client';
import { useEffect, useState, Fragment, ReactNode } from 'react';
import { DocumentType, TEMPLATE_PATHS, VARIABLE_MAPS, DOCUMENT_DISPLAY_NAMES } from '@/lib/document-types';

interface Props {
  docType: DocumentType;
  formData: Record<string, string>;
}

function Fill({ value, label }: { value: string; label: string }) {
  if (value) {
    return (
      <span className="bg-amber-50 border-b border-amber-400 text-amber-900 px-0.5">
        {value}
      </span>
    );
  }
  return (
    <span className="border-b border-dashed border-slate-300 text-slate-400 px-1 text-xs">
      [{label}]
    </span>
  );
}

// Split text on <span ...>...</span> tags and produce an array of segments.
// Each segment is either a plain string or a span object with class and text.
type Segment =
  | { type: 'text'; content: string }
  | { type: 'span'; cls: string; text: string };

function parseSpans(raw: string): Segment[] {
  const result: Segment[] = [];
  // Match <span class="...">...</span> including possessive suffixes like "'s"
  const spanRe = /<span class="([^"]+)">([^<]*)<\/span>('s|'s)?/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = spanRe.exec(raw)) !== null) {
    if (match.index > lastIndex) {
      result.push({ type: 'text', content: raw.slice(lastIndex, match.index) });
    }
    const suffix = match[3] ?? '';
    result.push({ type: 'span', cls: match[1], text: match[2] + suffix });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < raw.length) {
    result.push({ type: 'text', content: raw.slice(lastIndex) });
  }
  return result;
}

// Render bold markdown (**text**) within a plain text string.
function applyBold(text: string): ReactNode {
  const parts = text.split(/\*\*([^*]+)\*\*/);
  if (parts.length === 1) return text;
  return <>{parts.map((part, i) => i % 2 === 1 ? <strong key={i}>{part}</strong> : part)}</>;
}

// Render inline markdown links [text](url) and <https://url>, applying bold within text segments.
function renderInlineFormatting(text: string): ReactNode {
  const re = /\[([^\]]+)\]\(([^)]+)\)|<(https?:\/\/[^>]+)>/g;
  const parts: ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push(applyBold(text.slice(last, m.index)));
    if (m[1]) {
      parts.push(<a key={m.index} href={m[2]} className="underline text-blue-600" target="_blank" rel="noreferrer">{m[1]}</a>);
    } else {
      parts.push(<a key={m.index} href={m[3]} className="underline text-blue-600" target="_blank" rel="noreferrer">{m[3]}</a>);
    }
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(applyBold(text.slice(last)));
  return parts.length === 1 ? parts[0] : <>{parts}</>;
}

function renderSegments(
  segments: Segment[],
  varMap: Record<string, string>,
  formData: Record<string, string>,
  keyPrefix: string,
): ReactNode[] {
  return segments.map((seg, i) => {
    const k = `${keyPrefix}-${i}`;
    if (seg.type === 'text') {
      return <Fragment key={k}>{renderInlineFormatting(seg.content)}</Fragment>;
    }

    const { cls, text } = seg;

    if (cls === 'header_2') {
      return (
        <span key={k} className="font-bold text-slate-800">
          {text}
        </span>
      );
    }
    if (cls === 'header_3') {
      return (
        <span key={k} className="font-semibold italic text-slate-700">
          {text}
        </span>
      );
    }

    // Variable reference span
    if (
      cls === 'keyterms_link' ||
      cls === 'coverpage_link' ||
      cls === 'orderform_link' ||
      cls === 'businessterms_link'
    ) {
      // Strip trailing possessives for lookup (we preserved them in text already)
      const lookupKey = text.replace(/'s$|'s$/, '');
      const fieldKey = varMap[lookupKey] ?? varMap[text];
      const fieldValue = fieldKey ? (formData[fieldKey] ?? '') : '';
      return <Fill key={k} value={fieldValue} label={text} />;
    }

    return <span key={k}>{text}</span>;
  });
}

function renderInline(
  raw: string,
  varMap: Record<string, string>,
  formData: Record<string, string>,
  keyPrefix: string,
): ReactNode {
  const segments = parseSpans(raw);
  const nodes = renderSegments(segments, varMap, formData, keyPrefix);
  return nodes.length === 1 ? nodes[0] : <>{nodes}</>;
}

// Parse a template markdown string into React elements.
function renderTemplate(
  content: string,
  varMap: Record<string, string>,
  formData: Record<string, string>,
): ReactNode[] {
  const lines = content.split('\n');
  const elements: ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Blank line
    if (!line.trim()) {
      i++;
      continue;
    }

    // Markdown H1
    if (line.startsWith('# ')) {
      elements.push(
        <h1 key={i} className="text-2xl font-bold text-center mb-2" style={{ fontFamily: 'Georgia, serif' }}>
          {line.slice(2).trim()}
        </h1>,
      );
      i++;
      continue;
    }

    // Markdown H2
    if (line.startsWith('## ')) {
      elements.push(
        <h2 key={i} className="text-xl font-bold text-center mt-8 mb-4" style={{ fontFamily: 'Georgia, serif' }}>
          {line.slice(3).trim()}
        </h2>,
      );
      i++;
      continue;
    }

    // Markdown H3
    if (line.startsWith('### ')) {
      elements.push(
        <h3 key={i} className="text-xs font-bold uppercase tracking-widest text-slate-600 mt-4 mb-1">
          {line.slice(4).trim()}
        </h3>,
      );
      i++;
      continue;
    }

    // Numbered list item: "1. content" or "    1. content" (with any indentation)
    const numMatch = line.match(/^(\s*)(\d+)\.\s+(.*)$/);
    if (numMatch) {
      const indent = numMatch[1].length;
      const num = numMatch[2];
      const text = numMatch[3];
      const level = Math.floor(indent / 4); // 0=top, 1=sub, 2=sub-sub
      const inline = renderInline(text, varMap, formData, `${i}-inline`);

      if (level === 0) {
        elements.push(
          <p key={i} className="text-sm leading-7 text-slate-800 mt-3">
            <span className="font-semibold mr-1">{num}.</span>
            {inline}
          </p>,
        );
      } else if (level === 1) {
        elements.push(
          <p key={i} className="text-sm leading-7 text-slate-800 ml-6 mt-1">
            <span className="font-medium text-slate-600 mr-1">{num}.</span>
            {inline}
          </p>,
        );
      } else {
        elements.push(
          <p key={i} className="text-sm leading-7 text-slate-800 ml-12 mt-1">
            <span className="text-slate-500 mr-1">{num}.</span>
            {inline}
          </p>,
        );
      }
      i++;
      continue;
    }

    // Lettered sub-item: "        a. content"
    const letterMatch = line.match(/^(\s+)([a-z])\.\s+(.*)$/);
    if (letterMatch) {
      const text = letterMatch[3];
      const letter = letterMatch[2];
      const inline = renderInline(text, varMap, formData, `${i}-inline`);
      elements.push(
        <p key={i} className="text-sm leading-7 text-slate-800 ml-16 mt-1">
          <span className="text-slate-500 mr-1">{letter}.</span>
          {inline}
        </p>,
      );
      i++;
      continue;
    }

    // Bullet list item: "- item" or "  - item"
    if (line.match(/^\s*-\s+/)) {
      const text = line.replace(/^\s*-\s+/, '');
      const inline = renderInline(text, varMap, formData, `${i}-inline`);
      elements.push(
        <p key={i} className="text-sm leading-7 text-slate-800 ml-4 mt-1 flex gap-2">
          <span className="text-slate-400 shrink-0">•</span>
          <span>{inline}</span>
        </p>,
      );
      i++;
      continue;
    }

    // <label> tag (NDA coverpage style)
    if (line.trim().startsWith('<label>')) {
      const labelText = line.trim().replace(/<\/?label>/g, '');
      elements.push(
        <p key={i} className="text-xs italic text-slate-400 mb-1">{labelText}</p>,
      );
      i++;
      continue;
    }

    // Horizontal rule
    if (line.trim() === '---') {
      elements.push(<hr key={i} className="border-slate-200 my-6" />);
      i++;
      continue;
    }

    // Regular paragraph (may contain spans)
    const inline = renderInline(line, varMap, formData, `${i}-inline`);
    elements.push(
      <p key={i} className="text-sm leading-7 text-slate-800">
        {inline}
      </p>,
    );
    i++;
  }

  return elements;
}

// Simple cache to avoid re-fetching templates on every render.
const templateCache: Map<string, string> = new Map();

async function fetchTemplate(path: string): Promise<string> {
  if (templateCache.has(path)) return templateCache.get(path)!;
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Failed to load template: ${path}`);
  const text = await res.text();
  templateCache.set(path, text);
  return text;
}

export default function TemplateRenderer({ docType, formData }: Props) {
  const [content, setContent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const paths = TEMPLATE_PATHS[docType] ?? [];
  const varMap = VARIABLE_MAPS[docType] ?? {};
  const displayName = DOCUMENT_DISPLAY_NAMES[docType];

  useEffect(() => {
    setContent(null);
    setError(null);
    if (paths.length === 0) return;

    Promise.all(paths.map(fetchTemplate))
      .then((texts) => setContent(texts.join('\n\n---\n\n')))
      .catch((err) => setError(err.message));
  }, [docType, paths.join(',')]);

  function handleDownload() {
    window.print();
  }

  return (
    <div className="min-h-full bg-slate-100">
      {/* Toolbar */}
      <div className="no-print sticky top-0 z-10 bg-white border-b border-slate-200 px-8 py-3 flex items-center justify-between">
        <p className="text-xs text-slate-400">Live preview — chat with the AI to complete the document</p>
        <button
          onClick={handleDownload}
          className="bg-slate-900 hover:bg-slate-700 text-white text-sm font-medium px-4 py-2 rounded-md transition-colors"
        >
          Download PDF
        </button>
      </div>

      {/* Document */}
      <div className="max-w-3xl mx-auto my-8 bg-white shadow-sm border border-slate-200 print:shadow-none print:border-none print:my-0 print:max-w-none">
        <div className="px-14 py-12 print:px-10 print:py-8">
          {error && (
            <p className="text-red-500 text-sm text-center py-8">{error}</p>
          )}
          {!content && !error && (
            <p className="text-slate-400 text-sm text-center py-8">Loading template…</p>
          )}
          {content && (
            <div className="space-y-2">
              {renderTemplate(content, varMap, formData)}
            </div>
          )}
          <p className="text-xs text-slate-400 text-center mt-10">
            Common Paper {displayName} — free to use under CC BY 4.0.
          </p>
        </div>
      </div>
    </div>
  );
}
