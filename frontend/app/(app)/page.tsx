'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

import ChatPanel from '@/components/ChatPanel';
import DocumentPreview from '@/components/DocumentPreview';
import { ApiError } from '@/lib/api';
import {
  DEFAULT_FORM_DATA,
  DOCUMENT_DISPLAY_NAMES,
  DocumentType,
} from '@/lib/document-types';
import { getDocumentByType } from '@/lib/documents';

function HomeInner() {
  const search = useSearchParams();
  const router = useRouter();
  const [docType, setDocType] = useState<DocumentType | null>(null);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [hydrating, setHydrating] = useState(false);
  const [hydrationError, setHydrationError] = useState<string | null>(null);

  const doc = search.get('doc') as DocumentType | null;

  // Hydrate from ?doc=<type> — runs whenever the URL param changes so a
  // "Continue" click from /documents reloads the draft.
  useEffect(() => {
    if (!doc || !DOCUMENT_DISPLAY_NAMES[doc]) return;
    setDocType(doc);
    setFormData({ ...DEFAULT_FORM_DATA[doc] });
    setHydrating(true);
    setHydrationError(null);
    getDocumentByType(doc)
      .then((saved) => {
        setFormData((prev) => ({ ...prev, ...saved.fields }));
      })
      .catch((err: Error) => {
        // 404 is the normal first-visit case (no saved draft yet); only
        // surface real errors in the header.
        if (!(err instanceof ApiError) || err.status !== 404) {
          setHydrationError(err.message);
        }
      })
      .finally(() => setHydrating(false));
  }, [doc]);

  function handleDocTypeSelected(selected: DocumentType) {
    if (selected === docType) return;
    setDocType(selected);
    setFormData({ ...DEFAULT_FORM_DATA[selected] });
    // Clear ?doc= from the URL so refreshes don't re-trigger hydration.
    router.replace('/', { scroll: false });
  }

  function handleFieldsUpdate(fields: Record<string, string>) {
    setFormData((prev) => ({ ...prev, ...fields }));
  }

  const headerLabel = docType
    ? DOCUMENT_DISPLAY_NAMES[docType]
    : 'Legal Document Creator';

  return (
    <div className="h-full flex flex-col">
      <div className="no-print shrink-0 bg-white border-b border-slate-200 px-6 py-2.5 text-xs text-slate-500 flex items-center gap-2">
        <span className="font-semibold text-slate-700">{headerLabel}</span>
        {hydrating ? (
          <span className="text-slate-400">· Loading saved draft…</span>
        ) : null}
        {hydrationError ? (
          <span className="text-red-500">· {hydrationError}</span>
        ) : null}
      </div>
      <main className="flex flex-1 overflow-hidden">
        <aside className="no-print w-96 shrink-0 overflow-hidden flex flex-col border-r border-slate-200 bg-white">
          <ChatPanel
            docType={docType}
            formData={formData}
            onFieldsUpdate={handleFieldsUpdate}
            onDocTypeSelected={handleDocTypeSelected}
          />
        </aside>
        <section className="flex-1 overflow-y-auto">
          <DocumentPreview docType={docType} formData={formData} />
        </section>
      </main>
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={null}>
      <HomeInner />
    </Suspense>
  );
}