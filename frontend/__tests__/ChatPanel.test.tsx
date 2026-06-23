import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ChatPanel from '@/components/ChatPanel';
import { defaultFormData } from '@/lib/nda-data';

const noop = () => {};

function renderPanel(onFieldsUpdate = noop) {
  return render(
    <ChatPanel formData={{ ...defaultFormData }} onFieldsUpdate={onFieldsUpdate} />
  );
}

beforeEach(() => {
  jest.resetAllMocks();
  global.fetch = jest.fn();
});

describe('ChatPanel — initial render', () => {
  it('shows the AI assistant header', () => {
    renderPanel();
    expect(screen.getByText('AI Assistant')).toBeInTheDocument();
  });

  it('shows the opening greeting without any API call', () => {
    renderPanel();
    expect(
      screen.getByText(/Hello! I'm here to help you draft a Mutual NDA/i)
    ).toBeInTheDocument();
    expect(global.fetch).not.toHaveBeenCalled();
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
  function mockFetchSuccess(reply: string, extracted_fields: Record<string, string> = {}) {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ reply, extracted_fields }),
    });
  }

  it('displays the user message immediately', async () => {
    const user = userEvent.setup();
    mockFetchSuccess('Got it!');
    renderPanel();

    await user.type(screen.getByPlaceholderText(/Type a message/i), 'Acme Inc.');
    await user.click(screen.getByRole('button', { name: 'Send' }));

    expect(screen.getByText('Acme Inc.')).toBeInTheDocument();
  });

  it('shows a loading indicator while waiting', async () => {
    const user = userEvent.setup();
    let resolve!: (v: unknown) => void;
    (global.fetch as jest.Mock).mockReturnValueOnce(
      new Promise((r) => { resolve = r; })
    );
    renderPanel();

    await user.type(screen.getByPlaceholderText(/Type a message/i), 'Hello');
    await user.click(screen.getByRole('button', { name: 'Send' }));

    // Bounce dots are rendered during loading
    const dots = document.querySelectorAll('.animate-bounce');
    expect(dots.length).toBe(3);

    resolve({ ok: true, json: async () => ({ reply: 'Hi', extracted_fields: {} }) });
  });

  it('displays the AI reply after fetch resolves', async () => {
    const user = userEvent.setup();
    mockFetchSuccess('What are the two company names?');
    renderPanel();

    await user.type(screen.getByPlaceholderText(/Type a message/i), 'Hello');
    await user.click(screen.getByRole('button', { name: 'Send' }));

    await waitFor(() =>
      expect(screen.getByText('What are the two company names?')).toBeInTheDocument()
    );
  });

  it('clears the input after sending', async () => {
    const user = userEvent.setup();
    mockFetchSuccess('Got it!');
    renderPanel();

    const textarea = screen.getByPlaceholderText(/Type a message/i) as HTMLTextAreaElement;
    await user.type(textarea, 'Acme Inc.');
    await user.click(screen.getByRole('button', { name: 'Send' }));

    expect(textarea.value).toBe('');
  });

  it('calls onFieldsUpdate with non-empty extracted fields', async () => {
    const user = userEvent.setup();
    const onFieldsUpdate = jest.fn();
    mockFetchSuccess('Got it!', { party1Company: 'Acme Inc.' });
    render(
      <ChatPanel formData={{ ...defaultFormData }} onFieldsUpdate={onFieldsUpdate} />
    );

    await user.type(screen.getByPlaceholderText(/Type a message/i), 'Acme');
    await user.click(screen.getByRole('button', { name: 'Send' }));

    await waitFor(() =>
      expect(onFieldsUpdate).toHaveBeenCalledWith({ party1Company: 'Acme Inc.' })
    );
  });

  it('does not call onFieldsUpdate when extracted_fields is empty', async () => {
    const user = userEvent.setup();
    const onFieldsUpdate = jest.fn();
    mockFetchSuccess('Tell me more.', {});
    render(
      <ChatPanel formData={{ ...defaultFormData }} onFieldsUpdate={onFieldsUpdate} />
    );

    await user.type(screen.getByPlaceholderText(/Type a message/i), 'Hello');
    await user.click(screen.getByRole('button', { name: 'Send' }));

    await waitFor(() => expect(screen.getByText('Tell me more.')).toBeInTheDocument());
    expect(onFieldsUpdate).not.toHaveBeenCalled();
  });

  it('shows an error message on fetch failure', async () => {
    const user = userEvent.setup();
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));
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
    mockFetchSuccess('Hi there!');
    renderPanel();

    const textarea = screen.getByPlaceholderText(/Type a message/i);
    await user.type(textarea, 'Hello{Enter}');

    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));
  });

  it('does not send on Shift+Enter', async () => {
    const user = userEvent.setup();
    renderPanel();

    const textarea = screen.getByPlaceholderText(/Type a message/i);
    await user.type(textarea, 'Hello{Shift>}{Enter}{/Shift}');

    expect(global.fetch).not.toHaveBeenCalled();
  });
});
