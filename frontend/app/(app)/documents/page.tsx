'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import { DocumentListItem, listDocuments } from '@/lib/documents';

export default function DocumentsPage() {
  const [items, setItems] = useState<DocumentListItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listDocuments().then(setItems).catch((e: Error) => setError(e.message));
  }, []);

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center text-sm text-red-500">
        {error}
      </div>
    );
  }
  if (items === null) {
    return (
      <div className="flex-1 flex items-center justify-center text-sm text-slate-400">
        Loading…
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <Card className="max-w-md p-8 text-center">
          <h1 className="text-lg font-semibold text-slate-900 mb-2">
            No documents yet
          </h1>
          <p className="text-sm text-slate-500 mb-6">
            Start a new agreement — the AI assistant will guide you through it.
          </p>
          <Link href="/">
            <Button>Create your first document</Button>
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-3xl mx-auto p-8">
        <h1 className="text-2xl font-semibold text-slate-900 mb-1">
          My Documents
        </h1>
        <p className="text-sm text-slate-500 mb-6">
          Continue editing any of your drafts.
        </p>
        <div className="space-y-3">
          {items.map((item) => {
            const pct =
              item.progress.required_total > 0
                ? Math.round(
                    (item.progress.required_filled /
                      item.progress.required_total) *
                      100,
                  )
                : 0;
            return (
              <Card key={item.id} className="p-5 flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <h2 className="font-semibold text-slate-900">
                    {item.display_name}
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Last edited {new Date(item.updated_at).toLocaleString()}
                  </p>
                  <div className="mt-3 flex items-center gap-3">
                    <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-slate-900"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-xs text-slate-500 tabular-nums shrink-0">
                      {item.progress.required_filled} of{' '}
                      {item.progress.required_total} required fields
                    </span>
                  </div>
                </div>
                <Link href={`/?doc=${item.document_type}`}>
                  <Button>Continue</Button>
                </Link>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}