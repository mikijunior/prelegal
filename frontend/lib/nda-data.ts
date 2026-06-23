export interface NDAFormData {
  party1Company: string;
  party1Name: string;
  party1Title: string;
  party1Address: string;
  party1Date: string;
  party2Company: string;
  party2Name: string;
  party2Title: string;
  party2Address: string;
  party2Date: string;
  purpose: string;
  effectiveDate: string;
  mndaTermType: 'expires' | 'continues';
  mndaTermYears: string;
  confidentialityTermType: 'period' | 'perpetuity';
  confidentialityTermYears: string;
  governingLaw: string;
  jurisdiction: string;
  modifications: string;
}

// effectiveDate left empty to avoid SSR/client hydration mismatch.
// page.tsx sets it to today's date via a lazy useState initializer.
export const defaultFormData: NDAFormData = {
  party1Company: '',
  party1Name: '',
  party1Title: '',
  party1Address: '',
  party1Date: '',
  party2Company: '',
  party2Name: '',
  party2Title: '',
  party2Address: '',
  party2Date: '',
  purpose: 'Evaluating whether to enter into a business relationship with the other party.',
  effectiveDate: '',
  mndaTermType: 'expires',
  mndaTermYears: '1',
  confidentialityTermType: 'period',
  confidentialityTermYears: '1',
  governingLaw: '',
  jurisdiction: '',
  modifications: '',
};

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export function formatDisplayDate(isoDate: string): string {
  if (!isoDate) return '';
  const parts = isoDate.split('-');
  if (parts.length !== 3) return '';
  const [year, month, day] = parts;
  const monthIndex = parseInt(month, 10) - 1;
  const dayNum = parseInt(day, 10);
  if (isNaN(monthIndex) || monthIndex < 0 || monthIndex > 11) return '';
  if (isNaN(dayNum)) return '';
  return `${MONTHS[monthIndex]} ${dayNum}, ${year}`;
}
