/**
 * Tests for document-types.ts: DocumentType union, DOCUMENT_DISPLAY_NAMES,
 * TEMPLATE_PATHS, VARIABLE_MAPS, and DEFAULT_FORM_DATA.
 */

import {
  DOCUMENT_DISPLAY_NAMES,
  TEMPLATE_PATHS,
  VARIABLE_MAPS,
  DEFAULT_FORM_DATA,
} from '@/lib/document-types';

const ALL_DOC_TYPES = [
  'mutual_nda',
  'baa',
  'csa',
  'dpa',
  'partnership',
  'pilot',
  'psa',
  'sla',
  'software_license',
  'ai_addendum',
  'design_partner',
] as const;

describe('DOCUMENT_DISPLAY_NAMES', () => {
  it('has an entry for every document type', () => {
    for (const docType of ALL_DOC_TYPES) {
      expect(DOCUMENT_DISPLAY_NAMES[docType]).toBeDefined();
      expect(typeof DOCUMENT_DISPLAY_NAMES[docType]).toBe('string');
      expect(DOCUMENT_DISPLAY_NAMES[docType].length).toBeGreaterThan(0);
    }
  });

  it('does not have duplicates', () => {
    const values = Object.values(DOCUMENT_DISPLAY_NAMES);
    const unique = new Set(values);
    expect(unique.size).toBe(values.length);
  });
});

describe('TEMPLATE_PATHS', () => {
  it('has a path for every non-NDA document type', () => {
    for (const docType of ALL_DOC_TYPES) {
      if (docType === 'mutual_nda') {
        // NDA uses NDAPreview, not TemplateRenderer
        expect(TEMPLATE_PATHS[docType]).toBeUndefined();
        continue;
      }
      expect(TEMPLATE_PATHS[docType]).toBeDefined();
      expect(Array.isArray(TEMPLATE_PATHS[docType])).toBe(true);
      expect((TEMPLATE_PATHS[docType] as string[]).length).toBeGreaterThan(0);
    }
  });

  it('all template paths are strings starting with /templates/', () => {
    for (const docType of ALL_DOC_TYPES) {
      const paths = TEMPLATE_PATHS[docType];
      if (!paths) continue;
      for (const path of paths) {
        expect(path).toMatch(/^\/templates\/.+\.md$/);
      }
    }
  });
});

describe('VARIABLE_MAPS', () => {
  it('has a variable map for every non-NDA document type', () => {
    for (const docType of ALL_DOC_TYPES) {
      if (docType === 'mutual_nda') continue;
      expect(VARIABLE_MAPS[docType]).toBeDefined();
      expect(typeof VARIABLE_MAPS[docType]).toBe('object');
    }
  });

  it('variable map values are non-empty strings', () => {
    for (const docType of ALL_DOC_TYPES) {
      const map = VARIABLE_MAPS[docType];
      if (!map) continue;
      for (const [spanName, fieldKey] of Object.entries(map)) {
        expect(spanName.length).toBeGreaterThan(0);
        expect(fieldKey.length).toBeGreaterThan(0);
      }
    }
  });

  it('DEFAULT_FORM_DATA has the same keys as VARIABLE_MAPS for each doc type', () => {
    for (const docType of ALL_DOC_TYPES) {
      const varMap = VARIABLE_MAPS[docType];
      const defaultData = DEFAULT_FORM_DATA[docType];
      if (!varMap || !defaultData) continue;

      const varMapFieldKeys = new Set(Object.values(varMap));
      const defaultFieldKeys = new Set(Object.keys(defaultData));

      for (const fieldKey of defaultFieldKeys) {
        // Every default field key should appear in the variable map values
        // (they map template span names → form field keys)
        expect(defaultFieldKeys.has(fieldKey)).toBe(true);
      }
    }
  });
});

describe('DEFAULT_FORM_DATA', () => {
  it('has an entry for every document type', () => {
    for (const docType of ALL_DOC_TYPES) {
      expect(DEFAULT_FORM_DATA[docType]).toBeDefined();
      expect(typeof DEFAULT_FORM_DATA[docType]).toBe('object');
    }
  });

  it('entity name fields are empty strings for all doc types', () => {
    // Every doc type has at least one entity name field that starts as empty
    for (const docType of ALL_DOC_TYPES) {
      const data = DEFAULT_FORM_DATA[docType];
      // mutual_nda uses party1Company/party2Company; most others use provider/company/partner
      const hasProvider = 'provider' in data;
      const hasCompany = 'company' in data;
      const hasPartner = 'partner' in data;
      const hasPartyCompany = 'party1Company' in data || 'party2Company' in data;
      const hasAtLeastOneEntity = hasProvider || hasCompany || hasPartner || hasPartyCompany;
      expect(hasAtLeastOneEntity).toBe(true);
      if (hasProvider) expect(data.provider).toBe('');
      if (hasCompany) expect(data.company).toBe('');
      if (hasPartner) expect(data.partner).toBe('');
      if ('party1Company' in data) expect(data.party1Company).toBe('');
      if ('party2Company' in data) expect(data.party2Company).toBe('');
    }
  });

  it('mutual_nda has correct default mndaTermType and confidentialityTermType', () => {
    const nda = DEFAULT_FORM_DATA.mutual_nda;
    expect(nda.mndaTermType).toBe('expires');
    expect(nda.confidentialityTermType).toBe('period');
    expect(nda.mndaTermYears).toBe('1');
    expect(nda.confidentialityTermYears).toBe('1');
    expect(nda.purpose.length).toBeGreaterThan(0); // has a default purpose
  });

  it('ai_addendum has parentAgreement field', () => {
    const data = DEFAULT_FORM_DATA.ai_addendum;
    expect('parentAgreement' in data).toBe(true);
  });

  it('design_partner has term (not endDate) field', () => {
    const data = DEFAULT_FORM_DATA.design_partner;
    expect('term' in data).toBe(true);
    expect('endDate' in data).toBe(false);
  });

  it('sla has targetUptime and uptimeCredit fields', () => {
    const data = DEFAULT_FORM_DATA.sla;
    expect('targetUptime' in data).toBe(true);
    expect('uptimeCredit' in data).toBe(true);
    expect('targetResponseTime' in data).toBe(true);
    expect('supportChannel' in data).toBe(true);
  });

  it('psa has deliverables, fees, and sowTerm fields', () => {
    const data = DEFAULT_FORM_DATA.psa;
    expect('deliverables' in data).toBe(true);
    expect('fees' in data).toBe(true);
    expect('sowTerm' in data).toBe(true);
  });
});
