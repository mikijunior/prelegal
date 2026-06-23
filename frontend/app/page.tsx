'use client';
import { useState } from 'react';
import { NDAFormData, defaultFormData } from '@/lib/nda-data';
import ChatPanel from '@/components/ChatPanel';
import NDAPreview from '@/components/NDAPreview';

export default function Home() {
  const [formData, setFormData] = useState<NDAFormData>(() => ({
    ...defaultFormData,
    effectiveDate: new Date().toISOString().split('T')[0],
  }));

  function handleFieldsUpdate(fields: Partial<NDAFormData>) {
    setFormData((prev) => ({ ...prev, ...fields }));
  }

  return (
    <div className="h-full flex flex-col">
      <header className="no-print shrink-0 bg-slate-900 text-white px-6 py-3 flex items-center gap-2">
        <span className="font-semibold tracking-tight">PreLegal</span>
        <span className="text-slate-500">/</span>
        <span className="text-slate-300 text-sm">Mutual NDA Creator</span>
      </header>

      <main className="flex flex-1 overflow-hidden">
        <aside className="no-print w-96 shrink-0 overflow-hidden flex flex-col border-r border-slate-200 bg-white">
          <ChatPanel formData={formData} onFieldsUpdate={handleFieldsUpdate} />
        </aside>

        <section className="flex-1 overflow-y-auto">
          <NDAPreview formData={formData} />
        </section>
      </main>
    </div>
  );
}
