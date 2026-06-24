/**
 * Unit tests for api.ts helpers: ApiError, getToken/setToken/clearToken, apiFetch.
 * Uses a plain jest mock assigned directly to global.fetch.
 */

import { ApiError, getToken, setToken, clearToken, apiFetch } from '@/lib/api';

// Global fetch mock — assigned in beforeEach, restored in afterEach
let mockFetch: jest.Mock;

beforeEach(() => {
  // Create fresh mock for each test
  mockFetch = jest.fn();
  // Replace global fetch directly (jsdom's fetch is writable)
  Object.defineProperty(globalThis, 'fetch', {
    value: mockFetch,
    configurable: true,
    writable: true,
  });
  // Clear localStorage
  localStorage.clear();
});

afterEach(() => {
  jest.restoreAllMocks();
});

function okResponse(body: unknown) {
  return { ok: true, status: 200, json: () => Promise.resolve(body) } as unknown as Response;
}

function errResponse(status: number, detail: string) {
  return {
    ok: false,
    status,
    json: () => Promise.resolve({ detail }),
  } as unknown as Response;
}

describe('ApiError', () => {
  it('stores status and detail', () => {
    const err = new ApiError(404, 'Not found');
    expect(err.status).toBe(404);
    expect(err.detail).toBe('Not found');
    expect(err.message).toBe('Not found');
  });
});

describe('getToken / setToken / clearToken', () => {
  it('returns null when no token is stored', () => {
    expect(getToken()).toBeNull();
  });

  it('setToken stores the token', () => {
    setToken('secret-abc');
    expect(getToken()).toBe('secret-abc');
  });

  it('clearToken removes the token', () => {
    setToken('secret-abc');
    clearToken();
    expect(getToken()).toBeNull();
  });
});

describe('apiFetch', () => {
  it('sets Content-Type header', async () => {
    mockFetch.mockResolvedValueOnce(okResponse({}));
    await apiFetch('/api/test');
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/test'),
      expect.objectContaining({
        headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
      }),
    );
  });

  it('skips Authorization header when skipAuth is true', async () => {
    mockFetch.mockResolvedValueOnce(okResponse({}));
    await apiFetch('/api/auth/signin', { skipAuth: true });
    const call = mockFetch.mock.calls[0];
    const headers = call[1].headers as Record<string, string>;
    expect(headers).not.toHaveProperty('Authorization');
  });

  it('adds Bearer token when skipAuth is false and token exists', async () => {
    setToken('my-token');
    mockFetch.mockResolvedValueOnce(okResponse({}));
    await apiFetch('/api/me');
    const call = mockFetch.mock.calls[0];
    const headers = call[1].headers as Record<string, string>;
    expect(headers['Authorization']).toBe('Bearer my-token');
  });

  it('returns parsed JSON on success', async () => {
    mockFetch.mockResolvedValueOnce(okResponse({ id: 1, email: 'a@b.com' }));
    const result = await apiFetch<{ id: number; email: string }>('/api/me');
    expect(result).toEqual({ id: 1, email: 'a@b.com' });
  });

  it('returns undefined on 204 No Content', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, status: 204 } as unknown as Response);
    const result = await apiFetch<void>('/api/resource', { method: 'DELETE' });
    expect(result).toBeUndefined();
  });

  it('throws ApiError with 401 on 401 response', async () => {
    mockFetch.mockResolvedValueOnce(errResponse(401, 'Not authenticated'));
    let caught: unknown;
    try {
      await apiFetch('/api/me');
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(ApiError);
    expect((caught as ApiError).status).toBe(401);
    expect((caught as ApiError).detail).toBe('Not authenticated');
  });

  it('clears token on 401', async () => {
    setToken('expired-token');
    mockFetch.mockResolvedValueOnce(errResponse(401, 'Token expired'));
    // Call without awaiting — the 401 handler will clear token before throwing
    try {
      await apiFetch('/api/me');
    } catch {
      // expected — token is cleared inside the catch before re-throw
    }
    // Token should have been cleared by the 401 handler
    expect(getToken()).toBeNull();
  });

  it('throws ApiError with detail on non-OK non-401 responses', async () => {
    mockFetch.mockResolvedValueOnce(errResponse(422, 'Validation error'));
    await expect(apiFetch('/api/test')).rejects.toMatchObject({ status: 422, detail: 'Validation error' });
  });

  it('throws ApiError with generic message when response has no detail', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500, json: () => Promise.resolve({}) } as unknown as Response);
    await expect(apiFetch('/api/test')).rejects.toThrow('Server error 500');
  });

  it('serializes body as JSON when body is provided', async () => {
    mockFetch.mockResolvedValueOnce(okResponse({}));
    await apiFetch('/api/test', { method: 'POST', body: { email: 'a@b.com' } });
    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ body: JSON.stringify({ email: 'a@b.com' }) }),
    );
  });

  it('uses correct HTTP method when specified', async () => {
    mockFetch.mockResolvedValueOnce(okResponse({}));
    await apiFetch('/api/test', { method: 'DELETE' });
    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ method: 'DELETE' }),
    );
  });
});
