import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import NDAForm from '@/components/NDAForm';
import { defaultFormData, NDAFormData } from '@/lib/nda-data';

function renderWithState(overrides: Partial<NDAFormData> = {}) {
  const initialData = { ...defaultFormData, ...overrides };
  // Use real state so controlled inputs respond to typing
  function Wrapper() {
    const [formData, setFormData] = React.useState<NDAFormData>(initialData);
    return <NDAForm formData={formData} onChange={setFormData} />;
  }
  return render(<Wrapper />);
}

function renderWithMock(overrides: Partial<NDAFormData> = {}) {
  const formData = { ...defaultFormData, ...overrides };
  const onChange = jest.fn();
  render(<NDAForm formData={formData} onChange={onChange} />);
  return onChange;
}

describe('NDAForm — structure', () => {
  it('renders Party 1, Party 2, and Agreement Terms sections', () => {
    renderWithState();
    expect(screen.getByText('Party 1')).toBeInTheDocument();
    expect(screen.getByText('Party 2')).toBeInTheDocument();
    expect(screen.getByText('Agreement Terms')).toBeInTheDocument();
  });

  it('renders all Party 1 fields', () => {
    renderWithState();
    expect(screen.getByLabelText('Company', { selector: '#p1-company' })).toBeInTheDocument();
    expect(screen.getByLabelText('Signatory Name', { selector: '#p1-name' })).toBeInTheDocument();
    expect(screen.getByLabelText('Title', { selector: '#p1-title' })).toBeInTheDocument();
    expect(screen.getByLabelText('Notice Address', { selector: '#p1-address' })).toBeInTheDocument();
  });

  it('renders all Party 2 fields', () => {
    renderWithState();
    expect(screen.getByLabelText('Company', { selector: '#p2-company' })).toBeInTheDocument();
    expect(screen.getByLabelText('Signatory Name', { selector: '#p2-name' })).toBeInTheDocument();
  });

  it('renders the MNDA Term radio group', () => {
    renderWithState();
    expect(screen.getByRole('group', { name: 'MNDA Term' })).toBeInTheDocument();
  });

  it('renders the Term of Confidentiality radio group', () => {
    renderWithState();
    expect(screen.getByRole('group', { name: 'Term of Confidentiality' })).toBeInTheDocument();
  });
});

describe('NDAForm — Party 1 input', () => {
  it('updates party1Company when user types', async () => {
    const user = userEvent.setup();
    renderWithState();
    const input = screen.getByLabelText('Company', { selector: '#p1-company' }) as HTMLInputElement;
    await user.clear(input);
    await user.type(input, 'Acme Inc.');
    expect(input.value).toBe('Acme Inc.');
  });

  it('calls onChange with updated party1Company', async () => {
    const user = userEvent.setup();
    const onChange = renderWithMock();
    const input = screen.getByLabelText('Company', { selector: '#p1-company' });
    await user.type(input, 'A');
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ party1Company: 'A' })
    );
  });
});

describe('NDAForm — MNDA Term radio toggle', () => {
  it('"Continues until terminated" radio calls onChange with mndaTermType=continues', async () => {
    const user = userEvent.setup();
    const onChange = renderWithMock({ mndaTermType: 'expires' });
    const radio = screen.getByRole('radio', { name: 'Continues until terminated' });
    await user.click(radio);
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ mndaTermType: 'continues' })
    );
  });

  it('"Expires after" radio calls onChange with mndaTermType=expires', async () => {
    const user = userEvent.setup();
    const onChange = renderWithMock({ mndaTermType: 'continues' });
    // Find by value attribute since label text includes embedded input
    const radios = screen.getAllByRole('radio');
    const expiresRadio = radios.find((r) => (r as HTMLInputElement).value === 'expires')!;
    await user.click(expiresRadio);
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ mndaTermType: 'expires' })
    );
  });

  it('disables years input when mndaTermType is continues', () => {
    renderWithState({ mndaTermType: 'continues' });
    const yearsInput = screen.getByLabelText('MNDA term years') as HTMLInputElement;
    expect(yearsInput).toBeDisabled();
  });

  it('enables years input when mndaTermType is expires', () => {
    renderWithState({ mndaTermType: 'expires' });
    const yearsInput = screen.getByLabelText('MNDA term years') as HTMLInputElement;
    expect(yearsInput).not.toBeDisabled();
  });
});

describe('NDAForm — Term of Confidentiality radio toggle', () => {
  it('"In perpetuity" radio calls onChange with confidentialityTermType=perpetuity', async () => {
    const user = userEvent.setup();
    const onChange = renderWithMock({ confidentialityTermType: 'period' });
    const radio = screen.getByRole('radio', { name: 'In perpetuity' });
    await user.click(radio);
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ confidentialityTermType: 'perpetuity' })
    );
  });

  it('disables years input when confidentialityTermType is perpetuity', () => {
    renderWithState({ confidentialityTermType: 'perpetuity' });
    const yearsInput = screen.getByLabelText('Confidentiality term years') as HTMLInputElement;
    expect(yearsInput).toBeDisabled();
  });
});

describe('NDAForm — textarea fields', () => {
  it('Purpose textarea is labelled and editable', async () => {
    const user = userEvent.setup();
    renderWithState({ purpose: '' });
    const textarea = screen.getByLabelText('Purpose') as HTMLTextAreaElement;
    await user.type(textarea, 'For evaluating a partnership');
    expect(textarea.value).toBe('For evaluating a partnership');
  });

  it('Modifications textarea is labelled and editable', async () => {
    const user = userEvent.setup();
    renderWithState({ modifications: '' });
    const textarea = screen.getByLabelText('Modifications (optional)') as HTMLTextAreaElement;
    await user.type(textarea, 'No modifications');
    expect(textarea.value).toBe('No modifications');
  });
});
