import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import NDAPreview from '@/components/NDAPreview';
import { defaultFormData, NDAFormData } from '@/lib/nda-data';

beforeEach(() => {
  window.print = jest.fn();
});

function renderPreview(overrides: Partial<NDAFormData> = {}) {
  const formData = { ...defaultFormData, ...overrides };
  return render(<NDAPreview formData={formData} />);
}

describe('NDAPreview — empty state placeholders', () => {
  it('shows placeholder for empty party1Company in signature table', () => {
    renderPreview({ party1Company: '' });
    // Fill component renders "[Company]" for empty value
    const placeholders = screen.getAllByText('[Company]');
    expect(placeholders.length).toBeGreaterThan(0);
  });

  it('shows placeholder for empty governing law', () => {
    renderPreview({ governingLaw: '' });
    const placeholders = screen.getAllByText('[State]');
    expect(placeholders.length).toBeGreaterThan(0);
  });

  it('shows placeholder for empty jurisdiction', () => {
    renderPreview({ jurisdiction: '' });
    const placeholders = screen.getAllByText('[City or county and state]');
    expect(placeholders.length).toBeGreaterThan(0);
  });
});

describe('NDAPreview — filled state', () => {
  it('shows party1Company when filled', () => {
    renderPreview({ party1Company: 'Acme Inc.' });
    expect(screen.getAllByText('Acme Inc.').length).toBeGreaterThan(0);
  });

  it('shows party2Company when filled', () => {
    renderPreview({ party2Company: 'Beta Corp.' });
    expect(screen.getAllByText('Beta Corp.').length).toBeGreaterThan(0);
  });

  it('shows governing law when filled', () => {
    renderPreview({ governingLaw: 'Delaware' });
    expect(screen.getAllByText('Delaware').length).toBeGreaterThan(0);
  });

  it('shows jurisdiction when filled', () => {
    renderPreview({ jurisdiction: 'New Castle, DE' });
    expect(screen.getAllByText('New Castle, DE').length).toBeGreaterThan(0);
  });

  it('shows purpose in the document', () => {
    const purpose = 'Evaluating a joint venture';
    renderPreview({ purpose });
    // Purpose appears in cover page + multiple sections of standard terms
    expect(screen.getAllByText(purpose).length).toBeGreaterThan(0);
  });

  it('shows formatted effective date when filled', () => {
    renderPreview({ effectiveDate: '2025-06-23' });
    expect(screen.getAllByText('June 23, 2025').length).toBeGreaterThan(0);
  });

  it('shows modifications when provided', () => {
    renderPreview({ modifications: 'Section 9 shall be governed by NY law.' });
    expect(screen.getByText('Section 9 shall be governed by NY law.')).toBeInTheDocument();
  });

  it('shows "None" for modifications when empty', () => {
    renderPreview({ modifications: '' });
    expect(screen.getByText('None')).toBeInTheDocument();
  });
});

describe('NDAPreview — MNDA Term rendering', () => {
  it('shows expires term text when mndaTermType is expires', () => {
    renderPreview({ mndaTermType: 'expires', mndaTermYears: '2' });
    expect(screen.getByText(/Expires 2 year\(s\) from Effective Date/)).toBeInTheDocument();
  });

  it('shows continues term text when mndaTermType is continues', () => {
    renderPreview({ mndaTermType: 'continues' });
    expect(screen.getByText(/Continues until terminated/)).toBeInTheDocument();
  });

  it('shows perpetuity text when confidentialityTermType is perpetuity', () => {
    renderPreview({ confidentialityTermType: 'perpetuity' });
    expect(screen.getAllByText(/In perpetuity/i).length).toBeGreaterThan(0);
  });
});

describe('NDAPreview — Download PDF button', () => {
  it('renders the Download PDF button', () => {
    renderPreview();
    expect(screen.getByRole('button', { name: /download pdf/i })).toBeInTheDocument();
  });

  it('calls window.print() when Download PDF is clicked', async () => {
    const user = userEvent.setup();
    renderPreview();
    const button = screen.getByRole('button', { name: /download pdf/i });
    await user.click(button);
    expect(window.print).toHaveBeenCalledTimes(1);
  });
});

describe('NDAPreview — document structure', () => {
  it('renders the cover page title', () => {
    renderPreview();
    expect(screen.getByText('Mutual Non-Disclosure Agreement')).toBeInTheDocument();
  });

  it('renders the Standard Terms heading', () => {
    renderPreview();
    expect(screen.getByText('Standard Terms')).toBeInTheDocument();
  });

  it('renders all 11 standard term sections', () => {
    renderPreview();
    for (let i = 1; i <= 11; i++) {
      const pattern = new RegExp(`^${i}\\.`);
      const matches = screen.getAllByText(pattern, { exact: false });
      expect(matches.length).toBeGreaterThan(0);
    }
  });

  it('renders the signature table with all required rows', () => {
    renderPreview();
    expect(screen.getByText('Signature')).toBeInTheDocument();
    expect(screen.getByText('Print Name')).toBeInTheDocument();
    expect(screen.getByText('Title')).toBeInTheDocument();
    expect(screen.getByText('Notice Address')).toBeInTheDocument();
  });
});
