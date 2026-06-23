'use client';
import { useState } from 'react';
import { DocumentType, DEFAULT_FORM_DATA, DOCUMENT_DISPLAY_NAMES } from '@/lib/document-types';
import ChatPanel from '@/components/ChatPanel';
import DocumentPreview from '@/components/DocumentPreview';

export default function Home() {
  const [docType, setDocType] = useState<DocumentType | null>(null);
  const [formData, setFormData] = useState<Record<string, string>>({});

  function handleDocTypeSelected(selected: DocumentType) {
    if (selected === docType) return;
    setDocType(selected);
    const defaults = { ...DEFAULT_FORM_DATA[selected] };
    if (selected === 'mutual_nda') {
      defaults.effectiveDate = new Date().toISOString().split('T')[0];
    }
    setFormData(defaults);
  }

  function handleFieldsUpdate(fields: Record<string, string>) {
    setFormData((prev) => ({ ...prev, ...fields }));
  }

  const headerLabel = docType ? DOCUMENT_DISPLAY_NAMES[docType] : 'Legal Document Creator';

  return (
    <div className="h-full flex flex-col">
      <header className="no-print shrink-0 bg-slate-900 text-white px-6 py-3 flex items-center gap-2">
        <span className="font-semibold tracking-tight">PreLegal</span>
        <span className="text-slate-500">/</span>
        <span className="text-slate-300 text-sm">{headerLabel}</span>
      </header>

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
