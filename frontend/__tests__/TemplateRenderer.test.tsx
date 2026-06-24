/**
 * Tests for TemplateRenderer component.
 *
 * The component fetches a template on mount, so we need to mock fetch before
 * the component module loads. We use jest.isolateModules to get a fresh module
 * cache per test, allowing us to set up the mock first.
 */

import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

const MOCK_TEMPLATE = `# Cloud Service Agreement

## 1. Parties

This Cloud Service Agreement is between **<span class="coverpage_link">Provider</span>** and **<span class="coverpage_link">Customer</span>**.

## 2. Governing Law

Governed by the laws of **<span class="keyterms_link">Governing Law</span>** in **<span class="keyterms_link">Chosen Courts</span>**.

## 3. Subscription

Subscription period: **<span class="keyterms_link">Subscription Period</span>**.

## 4. Support

Support channel: **<span class="keyterms_link">Support Channel</span>**.
`;

const MOCK_DPA_TEMPLATE = `# Data Processing Agreement

**Provider**: **<span class="coverpage_link">Provider</span>**
**Customer**: **<span class="coverpage_link">Customer</span>**

Categories: **<span class="keyterms_link">Categories of Personal Data</span>**
Subjects: **<span class="keyterms_link">Categories of Data Subjects</span>**
Governing Member State: **<span class="keyterms_link">Governing Member State</span>**
`;

const MOCK_NDA_TEMPLATE = `# Mutual Non-Disclosure Agreement

Party 1: **<span class="coverpage_link">Party1Company</span>**
Party 2: **<span class="coverpage_link">Party2Company</span>**
Purpose: **<span class="keyterms_link">Purpose</span>**
`;

let mockResponse: { ok: boolean; status: number; text?: () => Promise<string> };

function setTemplateResponse(content: string) {
  mockResponse = { ok: true, status: 200, text: () => Promise.resolve(content) };
}

function setFetchError() {
  mockResponse = { ok: false, status: 404 };
}

function setNeverResolve() {
  mockResponse = { ok: true, status: 200 }; // text is never called, so it hangs
}

function renderTemplateRenderer(docType: string, formData: Record<string, string> = {}) {
  return import('@/components/TemplateRenderer').then(({ default: TemplateRenderer }) =>
    render(<TemplateRenderer docType={docType as never} formData={formData} />)
  );
}

describe('TemplateRenderer — loading state', () => {
  it('shows loading state before template loads', async () => {
    setNeverResolve();
    await jest.isolateModules(async () => {
      // Set up fetch mock BEFORE importing the component
      jest.spyOn(global, 'fetch').mockResolvedValueOnce(mockResponse as unknown as Response);
      const { default: TemplateRenderer } = await import('@/components/TemplateRenderer');
      render(<TemplateRenderer docType="csa" formData={{}} />);
      expect(screen.getByText('Loading template…')).toBeInTheDocument();
    });
  });
});

describe('TemplateRenderer — empty fields show placeholders', () => {
  it('shows [Provider] placeholder when provider is empty', async () => {
    setTemplateResponse(MOCK_TEMPLATE);
    await jest.isolateModules(async () => {
      jest.spyOn(global, 'fetch').mockResolvedValueOnce(mockResponse as unknown as Response);
      const { default: TemplateRenderer } = await import('@/components/TemplateRenderer');
      render(<TemplateRenderer docType="csa" formData={{ customer: 'Beta Corp' }} />);
      await waitFor(() => {
        expect(screen.queryByText('Loading template…')).not.toBeInTheDocument();
      });
      expect(screen.getAllByText('[Provider]').length).toBeGreaterThan(0);
    });
  });

  it('shows multiple placeholders when all fields are empty', async () => {
    setTemplateResponse(MOCK_TEMPLATE);
    await jest.isolateModules(async () => {
      jest.spyOn(global, 'fetch').mockResolvedValueOnce(mockResponse as unknown as Response);
      const { default: TemplateRenderer } = await import('@/components/TemplateRenderer');
      render(<TemplateRenderer docType="csa" formData={{}} />);
      await waitFor(() => {
        expect(screen.queryByText('Loading template…')).not.toBeInTheDocument();
      });
      expect(screen.getAllByText('[Provider]').length).toBeGreaterThan(0);
      expect(screen.getAllByText('[Customer]').length).toBeGreaterThan(0);
      expect(screen.getAllByText('[Governing Law]').length).toBeGreaterThan(0);
      expect(screen.getAllByText('[Chosen Courts]').length).toBeGreaterThan(0);
    });
  });

  it('shows both placeholder and filled value simultaneously', async () => {
    setTemplateResponse(MOCK_TEMPLATE);
    await jest.isolateModules(async () => {
      jest.spyOn(global, 'fetch').mockResolvedValueOnce(mockResponse as unknown as Response);
      const { default: TemplateRenderer } = await import('@/components/TemplateRenderer');
      render(<TemplateRenderer docType="csa" formData={{ provider: 'Acme' }} />);
      await waitFor(() => {
        expect(screen.queryByText('Loading template…')).not.toBeInTheDocument();
      });
      expect(screen.getAllByText('Acme').length).toBeGreaterThan(0);
      expect(screen.getAllByText('[Customer]').length).toBeGreaterThan(0);
    });
  });
});

describe('TemplateRenderer — filled fields', () => {
  it('renders filled CSA fields', async () => {
    setTemplateResponse(MOCK_TEMPLATE);
    await jest.isolateModules(async () => {
      jest.spyOn(global, 'fetch').mockResolvedValueOnce(mockResponse as unknown as Response);
      const { default: TemplateRenderer } = await import('@/components/TemplateRenderer');
      render(
        <TemplateRenderer
          docType="csa"
          formData={{
            provider: 'Acme',
            customer: 'Beta Corp',
            governingLaw: 'Delaware',
            chosenCourts: 'Courts in Delaware',
            subscriptionPeriod: '12 months',
            supportChannel: 'support@acme.com',
          }}
        />,
      );
      await waitFor(() => {
        expect(screen.queryByText('Loading template…')).not.toBeInTheDocument();
      });
      expect(screen.getAllByText('Acme').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Beta Corp').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Delaware').length).toBeGreaterThan(0);
    });
  });

  it('renders filled DPA fields', async () => {
    setTemplateResponse(MOCK_DPA_TEMPLATE);
    await jest.isolateModules(async () => {
      jest.spyOn(global, 'fetch').mockResolvedValueOnce(mockResponse as unknown as Response);
      const { default: TemplateRenderer } = await import('@/components/TemplateRenderer');
      render(
        <TemplateRenderer
          docType="dpa"
          formData={{
            provider: 'DataCo',
            customer: 'ClientCo',
            categoriesOfPersonalData: 'name, email',
            categoriesOfDataSubjects: 'end users',
            governingMemberState: 'Germany',
          }}
        />,
      );
      await waitFor(() => {
        expect(screen.queryByText('Loading template…')).not.toBeInTheDocument();
      });
      expect(screen.getAllByText('DataCo').length).toBeGreaterThan(0);
      expect(screen.getAllByText('ClientCo').length).toBeGreaterThan(0);
      expect(screen.getAllByText('name, email').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Germany').length).toBeGreaterThan(0);
    });
  });

  it('renders NDA fields via VARIABLE_MAPS', async () => {
    setTemplateResponse(MOCK_NDA_TEMPLATE);
    await jest.isolateModules(async () => {
      jest.spyOn(global, 'fetch').mockResolvedValueOnce(mockResponse as unknown as Response);
      const { default: TemplateRenderer } = await import('@/components/TemplateRenderer');
      render(
        <TemplateRenderer
          docType="mutual_nda"
          formData={{
            party1Company: 'Acme Inc.',
            party2Company: 'Beta Corp.',
            purpose: 'Evaluating a partnership',
          }}
        />,
      );
      await waitFor(() => {
        expect(screen.queryByText('Loading template…')).not.toBeInTheDocument();
      });
      expect(screen.getAllByText('Acme Inc.').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Beta Corp.').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Evaluating a partnership').length).toBeGreaterThan(0);
    });
  });
});

describe('TemplateRenderer — markdown structure', () => {
  it('renders h1 heading', async () => {
    setTemplateResponse(MOCK_TEMPLATE);
    await jest.isolateModules(async () => {
      jest.spyOn(global, 'fetch').mockResolvedValueOnce(mockResponse as unknown as Response);
      const { default: TemplateRenderer } = await import('@/components/TemplateRenderer');
      render(<TemplateRenderer docType="csa" formData={{}} />);
      await waitFor(() => {
        expect(screen.queryByText('Loading template…')).not.toBeInTheDocument();
      });
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Cloud Service Agreement');
    });
  });

  it('renders numbered sections', async () => {
    setTemplateResponse(MOCK_TEMPLATE);
    await jest.isolateModules(async () => {
      jest.spyOn(global, 'fetch').mockResolvedValueOnce(mockResponse as unknown as Response);
      const { default: TemplateRenderer } = await import('@/components/TemplateRenderer');
      render(<TemplateRenderer docType="csa" formData={{}} />);
      await waitFor(() => {
        expect(screen.queryByText('Loading template…')).not.toBeInTheDocument();
      });
      expect(screen.getByText(/^1\.\s+Parties/)).toBeInTheDocument();
      expect(screen.getByText(/^2\.\s+Governing/)).toBeInTheDocument();
      expect(screen.getByText(/^3\.\s+Subscription/)).toBeInTheDocument();
      expect(screen.getByText(/^4\.\s+Support/)).toBeInTheDocument();
    });
  });
});

describe('TemplateRenderer — error state', () => {
  it('shows error when template fetch fails', async () => {
    setFetchError();
    await jest.isolateModules(async () => {
      jest.spyOn(global, 'fetch').mockResolvedValueOnce(mockResponse as unknown as Response);
      const { default: TemplateRenderer } = await import('@/components/TemplateRenderer');
      render(<TemplateRenderer docType="csa" formData={{}} />);
      await waitFor(() => {
        expect(screen.getByText(/Failed to load template/i)).toBeInTheDocument();
      });
    });
  });
});

describe('TemplateRenderer — toolbar and footer', () => {
  it('renders Download PDF button', async () => {
    setTemplateResponse(MOCK_TEMPLATE);
    await jest.isolateModules(async () => {
      jest.spyOn(global, 'fetch').mockResolvedValueOnce(mockResponse as unknown as Response);
      const { default: TemplateRenderer } = await import('@/components/TemplateRenderer');
      render(<TemplateRenderer docType="csa" formData={{}} />);
      await waitFor(() => {
        expect(screen.queryByText('Loading template…')).not.toBeInTheDocument();
      });
      expect(screen.getByRole('button', { name: 'Download PDF' })).toBeInTheDocument();
    });
  });

  it('renders live preview hint', async () => {
    setTemplateResponse(MOCK_TEMPLATE);
    await jest.isolateModules(async () => {
      jest.spyOn(global, 'fetch').mockResolvedValueOnce(mockResponse as unknown as Response);
      const { default: TemplateRenderer } = await import('@/components/TemplateRenderer');
      render(<TemplateRenderer docType="csa" formData={{}} />);
      await waitFor(() => {
        expect(screen.queryByText('Loading template…')).not.toBeInTheDocument();
      });
      expect(screen.getByText(/Live preview/i)).toBeInTheDocument();
    });
  });

  it('renders CC BY footer', async () => {
    setTemplateResponse(MOCK_TEMPLATE);
    await jest.isolateModules(async () => {
      jest.spyOn(global, 'fetch').mockResolvedValueOnce(mockResponse as unknown as Response);
      const { default: TemplateRenderer } = await import('@/components/TemplateRenderer');
      render(<TemplateRenderer docType="csa" formData={{}} />);
      await waitFor(() => {
        expect(screen.queryByText('Loading template…')).not.toBeInTheDocument();
      });
      expect(screen.getByText(/Common Paper.*free to use under CC BY/i)).toBeInTheDocument();
    });
  });
});
