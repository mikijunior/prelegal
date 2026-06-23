import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';

import DocumentsPage from '@/app/(app)/documents/page';
import * as docs from '@/lib/documents';

jest.mock('next/link', () => {
  // eslint-disable-next-line react/display-name
  return ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  );
});

jest.mock('@/lib/documents', () => ({
  listDocuments: jest.fn(),
  getDocumentByType: jest.fn(),
}));

const mockedList = docs.listDocuments as jest.MockedFunction<
  typeof docs.listDocuments
>;

beforeEach(() => {
  jest.resetAllMocks();
});

describe('DocumentsPage', () => {
  it('renders the empty state when no documents exist', async () => {
    mockedList.mockResolvedValueOnce([]);
    render(<DocumentsPage />);
    await waitFor(() =>
      expect(screen.getByText(/No documents yet/i)).toBeInTheDocument(),
    );
  });

  it('renders one row per document with a progress bar', async () => {
    mockedList.mockResolvedValueOnce([
      {
        id: 1,
        document_type: 'mutual_nda' as never,
        display_name: 'Mutual NDA',
        progress: { required_filled: 3, required_total: 17 },
        updated_at: new Date('2026-06-23T10:00:00Z').toISOString(),
      },
      {
        id: 2,
        document_type: 'baa' as never,
        display_name: 'Business Associate Agreement',
        progress: { required_filled: 5, required_total: 5 },
        updated_at: new Date('2026-06-22T10:00:00Z').toISOString(),
      },
    ]);
    render(<DocumentsPage />);

    await waitFor(() =>
      expect(screen.getByText('Mutual NDA')).toBeInTheDocument(),
    );
    expect(
      screen.getByText('Business Associate Agreement'),
    ).toBeInTheDocument();
    expect(screen.getByText(/3 of 17 required fields/i)).toBeInTheDocument();
    expect(screen.getByText(/5 of 5 required fields/i)).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: /Continue/i })).toHaveLength(2);
  });

  it('renders an error message when the list request fails', async () => {
    mockedList.mockRejectedValueOnce(new Error('boom'));
    render(<DocumentsPage />);
    await waitFor(() => expect(screen.getByText('boom')).toBeInTheDocument());
  });
});