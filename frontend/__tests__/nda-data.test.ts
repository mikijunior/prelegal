import { formatDisplayDate, defaultFormData } from '@/lib/nda-data';

describe('formatDisplayDate', () => {
  it('returns empty string for empty input', () => {
    expect(formatDisplayDate('')).toBe('');
  });

  it('formats a valid ISO date correctly', () => {
    expect(formatDisplayDate('2025-06-23')).toBe('June 23, 2025');
  });

  it('formats January 1st correctly', () => {
    expect(formatDisplayDate('2025-01-01')).toBe('January 1, 2025');
  });

  it('formats December 31st correctly', () => {
    expect(formatDisplayDate('2024-12-31')).toBe('December 31, 2024');
  });

  it('returns empty string for input without dashes', () => {
    expect(formatDisplayDate('not-a-date')).toBe('');
  });

  it('returns empty string for month out of range (13)', () => {
    expect(formatDisplayDate('2025-13-01')).toBe('');
  });

  it('returns empty string for month out of range (0)', () => {
    expect(formatDisplayDate('2025-00-01')).toBe('');
  });

  it('returns empty string when parts are missing', () => {
    expect(formatDisplayDate('2025-')).toBe('');
    expect(formatDisplayDate('2025')).toBe('');
  });
});

describe('defaultFormData', () => {
  it('has empty effectiveDate to prevent SSR/hydration mismatch', () => {
    expect(defaultFormData.effectiveDate).toBe('');
  });

  it('has a default purpose set', () => {
    expect(defaultFormData.purpose.length).toBeGreaterThan(0);
  });

  it('defaults mndaTermType to expires', () => {
    expect(defaultFormData.mndaTermType).toBe('expires');
  });

  it('defaults mndaTermYears to 1', () => {
    expect(defaultFormData.mndaTermYears).toBe('1');
  });

  it('defaults confidentialityTermType to period', () => {
    expect(defaultFormData.confidentialityTermType).toBe('period');
  });

  it('has all party fields empty', () => {
    expect(defaultFormData.party1Company).toBe('');
    expect(defaultFormData.party1Name).toBe('');
    expect(defaultFormData.party2Company).toBe('');
    expect(defaultFormData.party2Name).toBe('');
  });
});
