import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import ChatPanel from '@/components/ChatPanel';
import * as api from '@/lib/api';
import { DocumentType } from '@/lib/document-types';

jest.mock('@/lib/api', () => {
  const actual = jest.requireActual('@/lib/api');
  return {
    ...actual,
    apiFetch: jest.fn(),
    getToken: () => null,
    setToken: jest.fn(),
    clearToken: jest.fn(),
  };
});

const mockedApiFetch = api.apiFetch as jest.MockedFunction<typeof api.apiFetch>;

const noop = () => {};

function renderPanel(
  overrides: Partial<React.ComponentProps<typeof ChatPanel>> = {},
) {
  return render(
    <ChatPanel
      docType={null}
      formData={{}}
      onFieldsUpdate={noop}
      onDocTypeSelected={noop}
      {...overrides}
    />,
  );
}

beforeEach(() => {
  jest.resetAllMocks();
});

describe('ChatPanel — initial render', () => {
  it('shows the AI assistant header', () => {
    renderPanel();
    expect(screen.getByText('AI Assistant')).toBeInTheDocument();
  });

  it('shows the opening greeting', () => {
    renderPanel();
    expect(
      screen.getByText(/I'm PreLegal, your AI legal assistant/i),
    ).toBeInTheDocument();
  });

  it('renders the text input and Send button', () => {
    renderPanel();
    expect(screen.getByPlaceholderText(/Type a message/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Send' })).toBeInTheDocument();
  });

  it('Send button is disabled when input is empty', () => {
    renderPanel();
    expect(screen.getByRole('button', { name: 'Send' })).toBeDisabled();
  });
});

describe('ChatPanel — sending a message', () => {
  function mockReply(payload: Partial<{
    reply: string;
    document_type: DocumentType | null;
    extracted_fields: Record<string, string> | null;
    document_id: number | null;
    updated_at: string | null;
  }>) {
    mockedApiFetch.mockResolvedValueOnce({
      reply: 'Hi',
      document_type: null,
      extracted_fields: {},
      document_id: null,
      updated_at: null,
      ...payload,
    } as Awaited<ReturnType<typeof api.apiFetch>>);
  }

  it('displays the user message immediately', async () => {
    const user = userEvent.setup();
    mockReply({ reply: 'Got it!' });
    renderPanel();

    await user.type(screen.getByPlaceholderText(/Type a message/i), 'Acme Inc.');
    await user.click(screen.getByRole('button', { name: 'Send' }));

    expect(screen.getByText('Acme Inc.')).toBeInTheDocument();
  });

  it('displays the AI reply after the request resolves', async () => {
    const user = userEvent.setup();
    mockReply({ reply: 'What are the two company names?' });
    renderPanel();

    await user.type(screen.getByPlaceholderText(/Type a message/i), 'Hello');
    await user.click(screen.getByRole('button', { name: 'Send' }));

    await waitFor(() =>
      expect(
        screen.getByText('What are the two company names?'),
      ).toBeInTheDocument(),
    );
  });

  it('clears the input after sending', async () => {
    const user = userEvent.setup();
    mockReply({ reply: 'Got it!' });
    renderPanel();

    const textarea = screen.getByPlaceholderText(
      /Type a message/i,
    ) as HTMLTextAreaElement;
    await user.type(textarea, 'Acme Inc.');
    await user.click(screen.getByRole('button', { name: 'Send' }));

    expect(textarea.value).toBe('');
  });

  it('calls onFieldsUpdate with non-empty extracted fields', async () => {
    const user = userEvent.setup();
    const onFieldsUpdate = jest.fn();
    mockReply({ reply: 'Got it!', extracted_fields: { party1Company: 'Acme Inc.' } });
    renderPanel({ onFieldsUpdate });

    await user.type(screen.getByPlaceholderText(/Type a message/i), 'Acme');
    await user.click(screen.getByRole('button', { name: 'Send' }));

    await waitFor(() =>
      expect(onFieldsUpdate).toHaveBeenCalledWith({ party1Company: 'Acme Inc.' }),
    );
  });

  it('does not call onFieldsUpdate when extracted_fields is empty', async () => {
    const user = userEvent.setup();
    const onFieldsUpdate = jest.fn();
    mockReply({ reply: 'Tell me more.', extracted_fields: {} });
    renderPanel({ onFieldsUpdate });

    await user.type(screen.getByPlaceholderText(/Type a message/i), 'Hello');
    await user.click(screen.getByRole('button', { name: 'Send' }));

    await waitFor(() =>
      expect(screen.getByText('Tell me more.')).toBeInTheDocument(),
    );
    expect(onFieldsUpdate).not.toHaveBeenCalled();
  });

  it('calls onDocTypeSelected when the server returns a document_type', async () => {
    const user = userEvent.setup();
    const onDocTypeSelected = jest.fn();
    mockReply({ reply: 'Got it', document_type: 'baa' as DocumentType });
    renderPanel({ onDocTypeSelected });

    await user.type(screen.getByPlaceholderText(/Type a message/i), 'BAA');
    await user.click(screen.getByRole('button', { name: 'Send' }));

    await waitFor(() => expect(onDocTypeSelected).toHaveBeenCalledWith('baa'));
  });

  it('shows an error message on API failure', async () => {
    const user = userEvent.setup();
    mockedApiFetch.mockRejectedValueOnce(new Error('Network error'));
    renderPanel();

    await user.type(screen.getByPlaceholderText(/Type a message/i), 'Hello');
    await user.click(screen.getByRole('button', { name: 'Send' }));

    await waitFor(() => {
      expect(screen.getByText(/having trouble/i)).toBeInTheDocument();
      expect(screen.getByText('Network error')).toBeInTheDocument();
    });
  });

  it('sends on Enter key (without Shift)', async () => {
    const user = userEvent.setup();
    mockReply({ reply: 'Hi there!' });
    renderPanel();

    const textarea = screen.getByPlaceholderText(/Type a message/i);
    await user.type(textarea, 'Hello{Enter}');

    await waitFor(() => expect(mockedApiFetch).toHaveBeenCalledTimes(1));
  });

  it('does not send on Shift+Enter', async () => {
    const user = userEvent.setup();
    renderPanel();

    const textarea = screen.getByPlaceholderText(/Type a message/i);
    await user.type(textarea, 'Hello{Shift>}{Enter}{/Shift}');

    expect(mockedApiFetch).not.toHaveBeenCalled();
  });
});
