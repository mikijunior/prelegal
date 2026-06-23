'use client';
import { NDAFormData, formatDisplayDate } from '@/lib/nda-data';

interface Props {
  formData: NDAFormData;
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

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-xs font-bold uppercase tracking-widest text-slate-600 mb-1">
      {children}
    </h2>
  );
}

function SectionNote({ children }: { children: React.ReactNode }) {
  return <p className="text-xs italic text-slate-400 mb-2">{children}</p>;
}

export default function NDAPreview({ formData }: Props) {
  const {
    party1Company, party1Name, party1Title, party1Address, party1Date,
    party2Company, party2Name, party2Title, party2Address, party2Date,
    purpose, effectiveDate, mndaTermType, mndaTermYears,
    confidentialityTermType, confidentialityTermYears,
    governingLaw, jurisdiction, modifications,
  } = formData;

  const displayEffectiveDate = formatDisplayDate(effectiveDate);

  const mndaTermText = mndaTermType === 'expires'
    ? `${mndaTermYears} year(s) from Effective Date`
    : 'the date of termination in accordance with the terms of the MNDA';

  const confidentialityTermText = confidentialityTermType === 'period'
    ? `${confidentialityTermYears} year(s) from Effective Date, but in the case of trade secrets until Confidential Information is no longer considered a trade secret under applicable laws`
    : 'In perpetuity';

  const mndaTermDisplay = mndaTermType === 'expires'
    ? `Expires ${mndaTermYears} year(s) from Effective Date.`
    : 'Continues until terminated in accordance with the terms of the MNDA.';

  const confidentialityTermDisplay = confidentialityTermType === 'period'
    ? `${confidentialityTermYears} year(s) from Effective Date, but in the case of trade secrets until Confidential Information is no longer considered a trade secret under applicable laws.`
    : 'In perpetuity.';

  function handleDownload() {
    window.print();
  }

  const signatureRows = [
    {
      label: 'Signature',
      v1: null,
      v2: null,
      isSignature: true,
    },
    { label: 'Print Name', v1: party1Name, v2: party2Name, ph: 'Name' },
    { label: 'Title', v1: party1Title, v2: party2Title, ph: 'Title' },
    { label: 'Company', v1: party1Company, v2: party2Company, ph: 'Company' },
    { label: 'Notice Address', v1: party1Address, v2: party2Address, ph: 'Address' },
    { label: 'Date', v1: formatDisplayDate(party1Date), v2: formatDisplayDate(party2Date), ph: 'Date' },
  ];

  return (
    <div className="min-h-full bg-slate-100">
      {/* Toolbar — hidden during print */}
      <div className="no-print sticky top-0 z-10 bg-white border-b border-slate-200 px-8 py-3 flex items-center justify-between">
        <p className="text-xs text-slate-400">Live preview — fill the form to complete the document</p>
        <button
          onClick={handleDownload}
          className="bg-slate-900 hover:bg-slate-700 text-white text-sm font-medium px-4 py-2 rounded-md transition-colors"
        >
          Download PDF
        </button>
      </div>

      {/* Document */}
      <div
        id="nda-document"
        className="max-w-3xl mx-auto my-8 bg-white shadow-sm border border-slate-200 print:shadow-none print:border-none print:my-0 print:max-w-none"
      >
        <div className="px-14 py-12 print:px-10 print:py-8">

          {/* ─── Cover Page ─── */}
          <h1 className="text-2xl font-bold text-center mb-1" style={{ fontFamily: 'Georgia, serif' }}>
            Mutual Non-Disclosure Agreement
          </h1>
          <p className="text-center text-xs text-slate-400 mb-8">Cover Page</p>

          <div className="text-sm text-slate-600 border-t border-slate-200 pt-6 mb-8">
            <p>
              This Mutual Non-Disclosure Agreement (the "MNDA") consists of: (1) this Cover Page ("Cover Page") and
              (2) the Common Paper Mutual NDA Standard Terms Version 1.0 ("Standard Terms") identical to those posted
              at commonpaper.com/standards/mutual-nda/1.0. Any modifications of the Standard Terms should be made
              on the Cover Page, which will control over conflicts with the Standard Terms.
            </p>
          </div>

          <div className="space-y-6 mb-10">
            <div>
              <SectionTitle>Purpose</SectionTitle>
              <SectionNote>How Confidential Information may be used</SectionNote>
              <p className="text-sm"><Fill value={purpose} label="How Confidential Information may be used" /></p>
            </div>

            <div>
              <SectionTitle>Effective Date</SectionTitle>
              <p className="text-sm"><Fill value={displayEffectiveDate} label="Today's date" /></p>
            </div>

            <div>
              <SectionTitle>MNDA Term</SectionTitle>
              <SectionNote>The length of this MNDA</SectionNote>
              <p className="text-sm">{mndaTermDisplay}</p>
            </div>

            <div>
              <SectionTitle>Term of Confidentiality</SectionTitle>
              <SectionNote>How long Confidential Information is protected</SectionNote>
              <p className="text-sm">{confidentialityTermDisplay}</p>
            </div>

            <div>
              <SectionTitle>Governing Law & Jurisdiction</SectionTitle>
              <p className="text-sm">
                Governing Law: <Fill value={governingLaw} label="State" />
              </p>
              <p className="text-sm mt-1">
                Jurisdiction: <Fill value={jurisdiction} label="City or county and state" />
              </p>
            </div>

            {(modifications || true) && (
              <div>
                <SectionTitle>MNDA Modifications</SectionTitle>
                <p className="text-sm whitespace-pre-wrap">
                  {modifications || <span className="text-slate-400 italic">None</span>}
                </p>
              </div>
            )}
          </div>

          <p className="text-sm mb-6">
            By signing this Cover Page, each party agrees to enter into this MNDA as of the Effective Date.
          </p>

          <div className="overflow-x-auto mb-8">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr>
                  <th className="text-left pr-6 pb-2 w-32 font-normal text-slate-400 text-xs" />
                  <th className="text-left pr-6 pb-2 font-semibold border-b-2 border-slate-300 text-slate-700">
                    PARTY 1
                    {party1Company && <span className="font-normal text-slate-500 ml-2">({party1Company})</span>}
                  </th>
                  <th className="text-left pb-2 font-semibold border-b-2 border-slate-300 text-slate-700">
                    PARTY 2
                    {party2Company && <span className="font-normal text-slate-500 ml-2">({party2Company})</span>}
                  </th>
                </tr>
              </thead>
              <tbody>
                {signatureRows.map((row) => (
                  <tr key={row.label} className="border-b border-slate-100">
                    <td className="py-3 pr-6 align-top text-xs text-slate-500">{row.label}</td>
                    <td className="py-3 pr-6 align-top">
                      {row.isSignature
                        ? <div className="h-10 border-b border-slate-200" />
                        : <Fill value={row.v1 ?? ''} label={row.ph ?? ''} />}
                    </td>
                    <td className="py-3 align-top">
                      {row.isSignature
                        ? <div className="h-10 border-b border-slate-200" />
                        : <Fill value={row.v2 ?? ''} label={row.ph ?? ''} />}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="text-xs text-slate-400 text-center">
            Common Paper Mutual Non-Disclosure Agreement (Version 1.0) free to use under CC BY 4.0.
          </p>

          {/* Page break before Standard Terms */}
          <div className="mt-12 border-t-2 border-double border-slate-200 print:break-after-page" />

          {/* ─── Standard Terms ─── */}
          <div className="mt-12">
            <h2 className="text-xl font-bold text-center mb-8" style={{ fontFamily: 'Georgia, serif' }}>
              Standard Terms
            </h2>

            <div className="space-y-5 text-sm leading-7 text-slate-800">
              <p>
                <strong>1. Introduction.</strong>{' '}
                This Mutual Non-Disclosure Agreement (which incorporates these Standard Terms and the Cover Page
                (defined below)) ("<strong>MNDA</strong>") allows each party ("<strong>Disclosing Party</strong>")
                to disclose or make available information in connection with the{' '}
                <Fill value={purpose} label="Purpose" />{' '}
                which (1) the Disclosing Party identifies to the receiving party ("<strong>Receiving Party</strong>")
                as "confidential", "proprietary", or the like or (2) should be reasonably understood as confidential
                or proprietary due to its nature and the circumstances of its disclosure
                ("<strong>Confidential Information</strong>"). Each party's Confidential Information also includes
                the existence and status of the parties' discussions and information on the Cover Page. Confidential
                Information includes technical or business information, product designs or roadmaps, requirements,
                pricing, security and compliance documentation, technology, inventions and know-how. To use this
                MNDA, the parties must complete and sign a cover page incorporating these Standard Terms
                ("<strong>Cover Page</strong>"). Each party is identified on the Cover Page and capitalized terms
                have the meanings given herein or on the Cover Page.
              </p>

              <p>
                <strong>2. Use and Protection of Confidential Information.</strong>{' '}
                The Receiving Party shall: (a) use Confidential Information solely for the{' '}
                <Fill value={purpose} label="Purpose" />; (b) not disclose Confidential Information to third
                parties without the Disclosing Party's prior written approval, except that the Receiving Party may
                disclose Confidential Information to its employees, agents, advisors, contractors and other
                representatives having a reasonable need to know for the <Fill value={purpose} label="Purpose" />,
                provided these representatives are bound by confidentiality obligations no less protective of the
                Disclosing Party than the applicable terms in this MNDA and the Receiving Party remains responsible
                for their compliance with this MNDA; and (c) protect Confidential Information using at least the
                same protections the Receiving Party uses for its own similar information but no less than a
                reasonable standard of care.
              </p>

              <p>
                <strong>3. Exceptions.</strong>{' '}
                The Receiving Party's obligations in this MNDA do not apply to information that it can demonstrate:
                (a) is or becomes publicly available through no fault of the Receiving Party; (b) it rightfully
                knew or possessed prior to receipt from the Disclosing Party without confidentiality restrictions;
                (c) it rightfully obtained from a third party without confidentiality restrictions; or (d) it
                independently developed without using or referencing the Confidential Information.
              </p>

              <p>
                <strong>4. Disclosures Required by Law.</strong>{' '}
                The Receiving Party may disclose Confidential Information to the extent required by law, regulation
                or regulatory authority, subpoena or court order, provided (to the extent legally permitted) it
                provides the Disclosing Party reasonable advance notice of the required disclosure and reasonably
                cooperates, at the Disclosing Party's expense, with the Disclosing Party's efforts to obtain
                confidential treatment for the Confidential Information.
              </p>

              <p>
                <strong>5. Term and Termination.</strong>{' '}
                This MNDA commences on the{' '}
                <Fill value={displayEffectiveDate} label="Effective Date" />{' '}
                and expires at the end of the{' '}
                <span className={mndaTermText ? 'bg-amber-50 text-amber-900 px-0.5' : 'text-slate-400'}>
                  {mndaTermText || '[MNDA Term]'}
                </span>. Either party may terminate this MNDA for any or no reason upon written notice to the other
                party. The Receiving Party's obligations relating to Confidential Information will survive for the{' '}
                <span className={confidentialityTermText ? 'bg-amber-50 text-amber-900 px-0.5' : 'text-slate-400'}>
                  {confidentialityTermText || '[Term of Confidentiality]'}
                </span>, despite any expiration or termination of this MNDA.
              </p>

              <p>
                <strong>6. Return or Destruction of Confidential Information.</strong>{' '}
                Upon expiration or termination of this MNDA or upon the Disclosing Party's earlier request, the
                Receiving Party will: (a) cease using Confidential Information; (b) promptly after the Disclosing
                Party's written request, destroy all Confidential Information in the Receiving Party's possession
                or control or return it to the Disclosing Party; and (c) if requested by the Disclosing Party,
                confirm its compliance with these obligations in writing. As an exception to subsection (b), the
                Receiving Party may retain Confidential Information in accordance with its standard backup or
                record retention policies or as required by law, but the terms of this MNDA will continue to apply
                to the retained Confidential Information.
              </p>

              <p>
                <strong>7. Proprietary Rights.</strong>{' '}
                The Disclosing Party retains all of its intellectual property and other rights in its Confidential
                Information and its disclosure to the Receiving Party grants no license under such rights.
              </p>

              <p>
                <strong>8. Disclaimer.</strong>{' '}
                ALL CONFIDENTIAL INFORMATION IS PROVIDED "AS IS", WITH ALL FAULTS, AND WITHOUT WARRANTIES,
                INCLUDING THE IMPLIED WARRANTIES OF TITLE, MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE.
              </p>

              <p>
                <strong>9. Governing Law and Jurisdiction.</strong>{' '}
                This MNDA and all matters relating hereto are governed by, and construed in accordance with, the
                laws of the State of <Fill value={governingLaw} label="Governing Law" />, without regard to the
                conflict of laws provisions of such <Fill value={governingLaw} label="Governing Law" />. Any legal
                suit, action, or proceeding relating to this MNDA must be instituted in the federal or state courts
                located in <Fill value={jurisdiction} label="Jurisdiction" />. Each party irrevocably submits to
                the exclusive jurisdiction of such <Fill value={jurisdiction} label="Jurisdiction" /> in any such
                suit, action, or proceeding.
              </p>

              <p>
                <strong>10. Equitable Relief.</strong>{' '}
                A breach of this MNDA may cause irreparable harm for which monetary damages are an insufficient
                remedy. Upon a breach of this MNDA, the Disclosing Party is entitled to seek appropriate equitable
                relief, including an injunction, in addition to its other remedies.
              </p>

              <p>
                <strong>11. General.</strong>{' '}
                Neither party has an obligation under this MNDA to disclose Confidential Information to the other
                or proceed with any proposed transaction. Neither party may assign this MNDA without the prior
                written consent of the other party, except that either party may assign this MNDA in connection
                with a merger, reorganization, acquisition or other transfer of all or substantially all its assets
                or voting securities. Any assignment in violation of this Section is null and void. This MNDA will
                bind and inure to the benefit of each party's permitted successors and assigns. Waivers must be
                signed by the waiving party's authorized representative and cannot be implied from conduct. If any
                provision of this MNDA is held unenforceable, it will be limited to the minimum extent necessary
                so the rest of this MNDA remains in effect. This MNDA (including the Cover Page) constitutes the
                entire agreement of the parties with respect to its subject matter, and supersedes all prior and
                contemporaneous understandings, agreements, representations, and warranties, whether written or
                oral, regarding such subject matter. This MNDA may only be amended, modified, waived, or
                supplemented by an agreement in writing signed by both parties. Notices, requests and approvals
                under this MNDA must be sent in writing to the email or postal addresses on the Cover Page and are
                deemed delivered on receipt. This MNDA may be executed in counterparts, including electronic
                copies, each of which is deemed an original and which together form the same agreement.
              </p>
            </div>

            <p className="text-xs text-slate-400 text-center mt-10">
              Common Paper Mutual Non-Disclosure Agreement{' '}
              <a
                href="https://commonpaper.com/standards/mutual-nda/1.0/"
                className="underline"
                target="_blank"
                rel="noreferrer"
              >
                Version 1.0
              </a>{' '}
              free to use under{' '}
              <a
                href="https://creativecommons.org/licenses/by/4.0/"
                className="underline"
                target="_blank"
                rel="noreferrer"
              >
                CC BY 4.0
              </a>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
