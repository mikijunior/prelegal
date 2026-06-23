'use client';
import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { DocumentType, DOCUMENT_DISPLAY_NAMES } from '@/lib/document-types';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface Props {
  docType: DocumentType | null;
  formData: Record<string, string>;
  onFieldsUpdate: (fields: Record<string, string>) => void;
  onDocTypeSelected: (docType: DocumentType) => void;
}

const OPENING_MESSAGE: Message = {
  role: 'assistant',
  content:
    "Hello! I'm PreLegal, your AI legal assistant. What type of legal document do you need help creating today?",
};

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? '';

export default function ChatPanel({ docType, formData, onFieldsUpdate, onDocTypeSelected }: Props) {
  const [messages, setMessages] = useState<Message[]>([OPENING_MESSAGE]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Reset conversation history when moving from pre-selection into a specific document type,
  // so the field-gathering LLM only sees field-gathering turns, not the routing conversation.
  const prevDocTypeRef = useRef<DocumentType | null>(null);
  useEffect(() => {
    if (docType !== null && prevDocTypeRef.current === null) {
      setMessages([{
        role: 'assistant',
        content: `Great! Let's create your ${DOCUMENT_DISPLAY_NAMES[docType]}. To start, what are the names of the two parties involved?`,
      }]);
    }
    prevDocTypeRef.current = docType;
  }, [docType]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  async function sendMessage() {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: Message = { role: 'user', content: text };
    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setInput('');
    setLoading(true);
    setError(null);

    try {
      const apiMessages = nextMessages.filter((m) => m !== OPENING_MESSAGE);
      const res = await fetch(`${API_BASE}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: apiMessages,
          document_type: docType ?? null,
          current_fields: docType ? formData : {},
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail ?? `Server error ${res.status}`);
      }

      const data = await res.json();
      setMessages((prev) => [...prev, { role: 'assistant', content: data.reply }]);

      if (data.document_type) {
        onDocTypeSelected(data.document_type as DocumentType);
      }

      if (data.extracted_fields && Object.keys(data.extracted_fields).length > 0) {
        onFieldsUpdate(data.extracted_fields);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setError(msg);
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: "Sorry, I'm having trouble right now. Please try again." },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="shrink-0 px-5 py-3 border-b border-slate-200 bg-slate-50">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">AI Assistant</p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                msg.role === 'user'
                  ? 'bg-slate-900 text-white rounded-br-sm'
                  : 'bg-slate-100 text-slate-800 rounded-bl-sm'
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-slate-100 rounded-2xl rounded-bl-sm px-4 py-3">
              <span className="inline-flex gap-1 items-center">
                <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0ms]" />
                <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:150ms]" />
                <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:300ms]" />
              </span>
            </div>
          </div>
        )}

        {error && (
          <p className="text-xs text-red-500 text-center px-4">{error}</p>
        )}

        <div ref={bottomRef} />
      </div>

      <div className="shrink-0 px-4 py-3 border-t border-slate-200 bg-white">
        <div className="flex gap-2 items-end">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={loading}
            placeholder="Type a message… (Enter to send)"
            rows={2}
            className="flex-1 resize-none text-sm border border-slate-200 rounded-xl px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-transparent disabled:opacity-50 placeholder:text-slate-300"
          />
          <button
            onClick={sendMessage}
            disabled={loading || !input.trim()}
            className="shrink-0 bg-slate-900 hover:bg-slate-700 disabled:opacity-40 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors"
          >
            Send
          </button>
        </div>
        <p className="text-xs text-slate-400 mt-1.5">Shift+Enter for new line</p>
      </div>
    </div>
  );
}
