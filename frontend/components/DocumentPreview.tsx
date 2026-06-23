'use client';
import { DocumentType } from '@/lib/document-types';
import { NDAFormData, defaultFormData } from '@/lib/nda-data';
import NDAPreview from '@/components/NDAPreview';
import TemplateRenderer from '@/components/TemplateRenderer';

interface Props {
  docType: DocumentType | null;
  formData: Record<string, string>;
}

function toNDAFormData(raw: Record<string, string>): NDAFormData {
  return {
    ...defaultFormData,
    ...raw,
    mndaTermType: (raw.mndaTermType === 'continues' ? 'continues' : 'expires'),
    confidentialityTermType: (raw.confidentialityTermType === 'perpetuity' ? 'perpetuity' : 'period'),
  };
}

export default function DocumentPreview({ docType, formData }: Props) {
  if (!docType) {
    return (
      <div className="min-h-full bg-slate-100 flex items-center justify-center">
        <div className="text-center max-w-sm px-6">
          <p className="text-slate-500 text-sm leading-relaxed">
            Tell the AI assistant what type of legal document you need and it will guide you through the creation process.
          </p>
        </div>
      </div>
    );
  }

  if (docType === 'mutual_nda') {
    return <NDAPreview formData={toNDAFormData(formData)} />;
  }

  return <TemplateRenderer docType={docType} formData={formData} />;
}
