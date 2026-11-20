import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, expect, it, vi } from 'vitest';
import { LoginPage } from '../../src/presentation/admin/auth/LoginPage';
import { RespondentPage } from '../../src/presentation/public/respondent/RespondentPage';

const mode = vi.hoisted(() => ({ customer: false }));
vi.mock('../../src/infrastructure/config/instanceBrand', () => ({
  get isCustomerBuild() { return mode.customer; },
  get instanceBrand() { return mode.customer
    ? { name: 'Lokal pilot', logoUrl: '/brand/logo.svg', identity: { organization: 'C-avsender', service: 'Skjema' } }
    : { name: 'Svario', logoUrl: null, identity: null }; },
}));
vi.mock('../../src/application/auth/AuthProvider', () => ({
  useAuth: () => ({ status: 'unauthenticated', isAdminReady: false }),
}));
const workspaceBrand = vi.hoisted(() => vi.fn(async () => ({
  displayName: 'B-avsender', logoSrc: '/fixture.svg', accentColor: '#345678',
})));
vi.mock('../../src/data/workspaces/respondentBrandingRepository', () => ({ getRespondentBranding: workspaceBrand }));
vi.mock('../../src/data/surveys/surveyRepository', () => ({
  getPublishedSurveyBySlug: async () => ({
    id: 'survey', slug: 'demo', title: 'Testskjema', responseMode: 'anonymous', sections: [],
    questions: [{ id: 'q', sectionId: null, type: 'free_text', prompt: 'Kommentar', isRequired: true }],
  }),
  submitSurveyResponse: async () => 'receipt-id',
}));
afterEach(cleanup);

it.each([false, true])('keeps login choices and the sender on the form and receipt separate (C=%s)', async customer => {
  mode.customer = customer;
  const user = userEvent.setup();
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const login = render(<MemoryRouter><LoginPage /></MemoryRouter>);
  expect(screen.getAllByRole('link', { name: 'Glemt passord?' })).toHaveLength(1);
  expect(!!screen.queryByRole('tab', { name: 'E-postlenke' })).toBe(!customer);
  expect(!!screen.queryByRole('img', { name: 'C-avsender' })).toBe(customer);
  login.unmount();

  render(<QueryClientProvider client={client}><MemoryRouter initialEntries={['/s/demo']}>
    <Routes><Route path="/s/:slug" element={<RespondentPage />} /></Routes>
  </MemoryRouter></QueryClientProvider>);
  const sender = { name: customer ? 'C-avsender' : 'B-avsender' };
  await screen.findByRole('img', sender);
  await user.type(await screen.findByRole('textbox'), 'Et fiktivt svar');
  await user.click(screen.getByRole('button', { name: 'Send inn' }));
  await screen.findByRole('heading', { name: 'Takk for svaret' });
  expect(screen.getByRole('img', sender).getAttribute('src')).toBe(customer ? '/brand/logo.svg' : '/fixture.svg');
  expect(!!screen.queryByText('Levert av Svario')).toBe(!customer);
  if (customer) expect(workspaceBrand).not.toHaveBeenCalled();
  else expect(workspaceBrand).toHaveBeenCalledWith('demo');
});
