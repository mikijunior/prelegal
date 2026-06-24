/**
 * Tests for AuthProvider: initial render state, token validation on mount,
 * signOut clears user state.
 *
 * signIn/signUp integration is tested via ChatPanel.test.tsx which exercises
 * the full API round-trip with mocked responses.
 */

import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';

import { AuthProvider, useAuth } from '@/lib/auth-context';
import * as api from '@/lib/api';

function Consumer() {
  const { user, loading, signIn, signUp, signOut } = useAuth();
  if (loading) return <p aria-label="loading">Loading…</p>;
  return (
    <div>
      <p data-testid="user">{user ? user.email : 'Not signed in'}</p>
      <button onClick={() => signIn('test@example.com', 'Password123!')}>Sign In</button>
      <button onClick={() => signUp('new@example.com', 'Password123!')}>Sign Up</button>
      <button onClick={() => signOut()}>Sign Out</button>
    </div>
  );
}

jest.mock('@/lib/api', () => {
  const actual = jest.requireActual('@/lib/api');
  return {
    ...actual,
    apiFetch: jest.fn<typeof actual.apiFetch>(),
    getToken: jest.fn(() => null),
    setToken: jest.fn(),
    clearToken: jest.fn(),
  };
});

const mockedApiFetch = api.apiFetch as jest.MockedFunction<typeof api.apiFetch>;

// Use mockImplementation to avoid queue-polution between tests.
// Each test sets up its own implementation fresh.
function setupApiFetch() {
  mockedApiFetch.mockReset();
  mockedApiFetch.mockImplementation(() => new Promise(() => {}) as ReturnType<typeof api.apiFetch>);
}

afterEach(() => {
  jest.restoreAllMocks();
});

describe('AuthProvider — initial render', () => {
  it('shows loading state while /api/me is pending', () => {
    // Never resolves → loading stays visible
    setupApiFetch();
    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>,
    );
    expect(screen.getByLabelText('loading')).toBeInTheDocument();
  });

  it('renders Not signed in when /api/me returns 401', async () => {
    mockedApiFetch.mockReset();
    mockedApiFetch.mockImplementation(
      () => Promise.reject(new api.ApiError(401, 'Unauthorized')) as ReturnType<typeof api.apiFetch>
    );
    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>,
    );
    await waitFor(() => {
      expect(screen.getByTestId('user')).toHaveTextContent('Not signed in');
    });
  });

  it('renders user email when /api/me returns a user', async () => {
    mockedApiFetch.mockReset();
    mockedApiFetch.mockImplementation(
      () => Promise.resolve({ id: 1, email: 'me@example.com' }) as ReturnType<typeof api.apiFetch>
    );
    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>,
    );
    await waitFor(() => {
      expect(screen.getByTestId('user')).toHaveTextContent('me@example.com');
    });
  });
});

describe('AuthProvider — signOut', () => {
  it('signOut clears token and sets user to null', async () => {
    // First: render with a user (so we can sign them out)
    mockedApiFetch.mockReset();
    mockedApiFetch.mockImplementation(
      () => Promise.resolve({ id: 1, email: 'me@example.com' }) as ReturnType<typeof api.apiFetch>
    );

    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>,
    );

    // Wait for user to appear
    await waitFor(() => {
      expect(screen.getByTestId('user')).toHaveTextContent('me@example.com');
    });

    // Now sign out
    await act(async () => {
      await screen.getByRole('button', { name: 'Sign Out' }).click();
    });

    // Token should be cleared
    expect(api.clearToken).toHaveBeenCalled();
    // User should be signed out
    expect(screen.getByTestId('user')).toHaveTextContent('Not signed in');
  });
});
