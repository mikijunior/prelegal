'use client';
import { NDAFormData } from '@/lib/nda-data';

interface Props {
  formData: NDAFormData;
  onChange: (data: NDAFormData) => void;
}

interface FieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
}

function Field({ id, label, value, onChange, placeholder, type = 'text' }: FieldProps) {
  return (
    <div>
      <label htmlFor={id} className="block text-xs font-medium text-slate-600 mb-1">
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full text-sm border border-slate-200 rounded-md px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-transparent placeholder:text-slate-300"
      />
    </div>
  );
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3 pb-2 border-b border-slate-200">
      {children}
    </h2>
  );
}

export default function NDAForm({ formData, onChange }: Props) {
  const update = (field: keyof NDAFormData, value: string) => {
    onChange({ ...formData, [field]: value });
  };

  return (
    <div className="p-5 space-y-7">
      <section>
        <SectionHeader>Party 1</SectionHeader>
        <div className="space-y-3">
          <Field id="p1-company" label="Company" value={formData.party1Company} onChange={(v) => update('party1Company', v)} placeholder="Acme Inc." />
          <Field id="p1-name" label="Signatory Name" value={formData.party1Name} onChange={(v) => update('party1Name', v)} placeholder="Jane Smith" />
          <Field id="p1-title" label="Title" value={formData.party1Title} onChange={(v) => update('party1Title', v)} placeholder="CEO" />
          <Field id="p1-address" label="Notice Address" value={formData.party1Address} onChange={(v) => update('party1Address', v)} placeholder="jane@acme.com" />
          <Field id="p1-date" label="Date" value={formData.party1Date} onChange={(v) => update('party1Date', v)} type="date" />
        </div>
      </section>

      <section>
        <SectionHeader>Party 2</SectionHeader>
        <div className="space-y-3">
          <Field id="p2-company" label="Company" value={formData.party2Company} onChange={(v) => update('party2Company', v)} placeholder="Beta Corp." />
          <Field id="p2-name" label="Signatory Name" value={formData.party2Name} onChange={(v) => update('party2Name', v)} placeholder="John Doe" />
          <Field id="p2-title" label="Title" value={formData.party2Title} onChange={(v) => update('party2Title', v)} placeholder="VP Business Development" />
          <Field id="p2-address" label="Notice Address" value={formData.party2Address} onChange={(v) => update('party2Address', v)} placeholder="john@beta.com" />
          <Field id="p2-date" label="Date" value={formData.party2Date} onChange={(v) => update('party2Date', v)} type="date" />
        </div>
      </section>

      <section>
        <SectionHeader>Agreement Terms</SectionHeader>
        <div className="space-y-4">
          <div>
            <label htmlFor="purpose" className="block text-xs font-medium text-slate-600 mb-1">
              Purpose
            </label>
            <textarea
              id="purpose"
              value={formData.purpose}
              onChange={(e) => update('purpose', e.target.value)}
              rows={3}
              className="w-full text-sm border border-slate-200 rounded-md px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-transparent resize-none"
            />
          </div>

          <Field id="effective-date" label="Effective Date" value={formData.effectiveDate} onChange={(v) => update('effectiveDate', v)} type="date" />

          <fieldset className="border-0 p-0 m-0">
            <legend className="block text-xs font-medium text-slate-600 mb-2">MNDA Term</legend>
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="radio"
                  name="mndaTermType"
                  value="expires"
                  checked={formData.mndaTermType === 'expires'}
                  onChange={() => update('mndaTermType', 'expires')}
                  className="accent-slate-700"
                />
                Expires after
                <input
                  type="number"
                  min="1"
                  value={formData.mndaTermYears}
                  onChange={(e) => update('mndaTermYears', e.target.value)}
                  disabled={formData.mndaTermType !== 'expires'}
                  aria-label="MNDA term years"
                  className="w-14 border border-slate-200 rounded px-2 py-0.5 text-center text-sm disabled:opacity-40 focus:outline-none focus:ring-1 focus:ring-slate-400"
                />
                year(s)
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="radio"
                  name="mndaTermType"
                  value="continues"
                  checked={formData.mndaTermType === 'continues'}
                  onChange={() => update('mndaTermType', 'continues')}
                  className="accent-slate-700"
                />
                Continues until terminated
              </label>
            </div>
          </fieldset>

          <fieldset className="border-0 p-0 m-0">
            <legend className="block text-xs font-medium text-slate-600 mb-2">Term of Confidentiality</legend>
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="radio"
                  name="confidentialityTermType"
                  value="period"
                  checked={formData.confidentialityTermType === 'period'}
                  onChange={() => update('confidentialityTermType', 'period')}
                  className="accent-slate-700"
                />
                <input
                  type="number"
                  min="1"
                  value={formData.confidentialityTermYears}
                  onChange={(e) => update('confidentialityTermYears', e.target.value)}
                  disabled={formData.confidentialityTermType !== 'period'}
                  aria-label="Confidentiality term years"
                  className="w-14 border border-slate-200 rounded px-2 py-0.5 text-center text-sm disabled:opacity-40 focus:outline-none focus:ring-1 focus:ring-slate-400"
                />
                year(s) from Effective Date
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="radio"
                  name="confidentialityTermType"
                  value="perpetuity"
                  checked={formData.confidentialityTermType === 'perpetuity'}
                  onChange={() => update('confidentialityTermType', 'perpetuity')}
                  className="accent-slate-700"
                />
                In perpetuity
              </label>
            </div>
          </fieldset>

          <Field
            id="governing-law"
            label="Governing Law (State)"
            value={formData.governingLaw}
            onChange={(v) => update('governingLaw', v)}
            placeholder="Delaware"
          />
          <Field
            id="jurisdiction"
            label="Jurisdiction"
            value={formData.jurisdiction}
            onChange={(v) => update('jurisdiction', v)}
            placeholder="New Castle, DE"
          />

          <div>
            <label htmlFor="modifications" className="block text-xs font-medium text-slate-600 mb-1">
              Modifications (optional)
            </label>
            <textarea
              id="modifications"
              value={formData.modifications}
              onChange={(e) => update('modifications', e.target.value)}
              rows={3}
              placeholder="List any modifications to the MNDA..."
              className="w-full text-sm border border-slate-200 rounded-md px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-transparent resize-none placeholder:text-slate-300"
            />
          </div>
        </div>
      </section>
    </div>
  );
}
