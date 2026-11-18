import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import test from 'node:test';
import { createClient } from '@supabase/supabase-js';

const url = process.env.SVARIO_BRANDING_TEST_URL ?? 'http://127.0.0.1:54321';
const key = process.env.SVARIO_BRANDING_TEST_KEY;
assert.ok(['127.0.0.1', 'localhost', '[::1]'].includes(new URL(url).hostname), 'Branding tests must use local Supabase.');
assert.ok(key, 'Set SVARIO_BRANDING_TEST_KEY to the local browser key.');
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAABgAAAAMCAYAAAB4MH11AAAAJElEQVR4nGPUiHL7z0BDwERLw0Fg1AKCYNQCgmDUAoKA5hYAAEq+Ad+/twa0AAAAAElFTkSuQmCC', 'base64');
const webp = Buffer.from('UklGRjgAAABXRUJQVlA4ICwAAACwAgCdASoYAAwAPm0qkUWkIqGYBABABsSxgABCBgAA/vDo1/+6Hvq8qcyAAA==', 'base64');
const anonymous = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

async function read(request) {
  const { data, error } = await request;
  assert.ok(!error, error?.message);
  return data;
}

test('local admins create, edit and validate private logos with safe retries', async (t) => {
  const admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { session } = await read(admin.auth.signInWithPassword({
    email: process.env.SVARIO_BRANDING_TEST_ADMIN_EMAIL,
    password: process.env.SVARIO_BRANDING_TEST_ADMIN_PASSWORD,
  }));
  assert.equal(await read(admin.rpc('is_svario_admin')), true);
  const owner = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { session: ownerSession } = await read(owner.auth.signUp({ email: `branding-${randomUUID()}@example.com`, password: randomUUID() }));
  await read(owner.rpc('ensure_account_initialized_v2'));
  const workspaceId = await read(owner.rpc('create_workspace', { p_name: `Logo test ${randomUUID()}`, p_type: 'team' }));
  t.after(() => read(owner.rpc('delete_workspace', { p_workspace_id: workspaceId })));
  const survey = await read(owner.rpc('create_survey_draft', { p_workspace_id: workspaceId, p_title: 'Logo test', p_slug: `logo-${randomUUID()}` }));
  await read(owner.from('questions').insert({ survey_id: survey.id, type: 'free_text', visualization_type: 'word_cloud', prompt: 'Test' }));
  await read(owner.rpc('publish_survey', { p_survey_id: survey.id }));

  const profile = () => read(admin.rpc('get_workspace_branding_editor', { p_workspace_id: workspaceId }).maybeSingle());
  const publicProfile = () => read(anonymous.rpc('get_survey_respondent_branding', { p_slug: survey.slug }).maybeSingle());
  async function save({ bytes, mime = 'image/png', revision = 0, displayName = 'Nordøya', accentColor = '#345678', token = session.access_token } = {}) {
    const body = new FormData();
    for (const [name, value] of Object.entries({ workspaceId, displayName, accentColor, revision: String(revision) })) body.set(name, value);
    if (bytes) body.set('logo', new File([bytes], mime === 'image/webp' ? 'logo.webp' : 'logo.png', { type: mime }));
    return fetch(`${url}/functions/v1/save-workspace-branding`, {
      method: 'POST', headers: { apikey: key, Authorization: `Bearer ${token}` }, body,
    });
  }

  assert.equal((await save({ bytes: png, token: ownerSession.access_token })).status, 403);
  assert.ok((await save({ bytes: png, token: key })).status >= 400);
  assert.equal((await save({ bytes: png })).status, 200);
  assert.equal((await profile()).is_active, false);
  assert.equal(await publicProfile(), null);
  assert.equal((await save({ bytes: png })).status, 409);

  await read(admin.rpc('set_workspace_respondent_branding_active', { p_workspace_id: workspaceId, p_is_active: true }));
  const savedRevision = (await profile()).revision;
  assert.equal((await save({ bytes: webp, mime: 'image/webp', revision: savedRevision, displayName: 'Nordøya redigert', accentColor: '#234567' })).status, 200);
  let saved = await profile();
  assert.equal(saved.is_active, true);
  assert.equal(saved.display_name, 'Nordøya redigert');
  assert.equal(saved.accent_color, '#234567');
  assert.equal(Buffer.from(saved.logo_png_base64, 'base64').subarray(1, 4).toString(), 'PNG');
  assert.equal((await publicProfile()).display_name, 'Nordøya redigert');

  for (const input of [
    { bytes: Buffer.from('<svg/>') },
    { bytes: png, mime: 'image/webp' },
    { bytes: png.subarray(0, 40) },
    { bytes: Buffer.alloc(1024 * 1024 + 1) },
    { accentColor: 'red' },
    { displayName: ' ' },
  ]) {
    const response = await save({ revision: saved.revision, ...input });
    assert.ok([400, 413].includes(response.status), `${response.status} ${await response.text()}`);
    assert.deepEqual(await profile(), saved, 'Failed validation must preserve the existing profile and logo');
  }
  const previousLogo = saved.logo_png_base64;
  assert.equal((await save({ revision: saved.revision, displayName: 'Nytt navn' })).status, 200);
  saved = await profile();
  assert.equal(saved.logo_png_base64, previousLogo);
  assert.equal(saved.display_name, 'Nytt navn');
  assert.ok((await owner.rpc('save_workspace_respondent_branding', {})).error);
  assert.ok((await anonymous.schema('app_private').from('workspace_respondent_branding').select('*')).error);

  const ownProfile = () => read(owner.rpc('get_my_workspace_branding', { p_workspace_id: workspaceId }).maybeSingle());
  async function replaceLogo({ bytes = png, mime = 'image/png', revision = saved.revision, token = ownerSession.access_token, extra = {} } = {}) {
    const body = new FormData();
    for (const [name, value] of Object.entries({ action: 'logo', workspaceId, revision: String(revision), ...extra })) body.set(name, value);
    if (bytes) body.set('logo', new File([bytes], 'logo', { type: mime }));
    return fetch(`${url}/functions/v1/save-workspace-branding`, {
      method: 'POST', headers: { apikey: key, Authorization: `Bearer ${token}` }, body,
    });
  }
  assert.deepEqual(await ownProfile(), saved);
  assert.equal((await replaceLogo({ token: session.access_token })).status, 403, 'Global admin without workspace membership does not use tenant access');
  for (const input of [
    { bytes: null }, { bytes: Buffer.from('<svg/>') }, { bytes: png, mime: 'image/webp' },
    { extra: { displayName: 'Forged' } }, { extra: { accentColor: '#000000' } }, { extra: { isActive: 'false' } },
  ]) {
    assert.equal((await replaceLogo(input)).status, 400);
    assert.deepEqual(await ownProfile(), saved, 'Failed tenant edits preserve the profile');
  }
  assert.equal((await replaceLogo()).status, 200);
  const replaced = await ownProfile();
  assert.equal(replaced.display_name, saved.display_name);
  assert.equal(replaced.accent_color, saved.accent_color);
  assert.equal(replaced.is_active, saved.is_active);
  assert.equal(replaced.revision, saved.revision + 1);
  assert.notEqual(replaced.logo_png_base64, saved.logo_png_base64);
  assert.equal((await publicProfile()).logo_png_base64, replaced.logo_png_base64, 'Anonymous respondents see the saved tenant logo');
  assert.equal((await replaceLogo()).status, 409);
  assert.equal((await save({ revision: saved.revision })).status, 409, 'A stale central admin edit cannot undo a tenant logo change');
  assert.deepEqual(await profile(), replaced);
  assert.ok((await owner.rpc('set_workspace_respondent_branding_active', { p_workspace_id: workspaceId, p_is_active: false })).error);
  assert.ok((await owner.rpc('replace_workspace_branding_logo', {
    p_auth_user_id: ownerSession.user.id, p_workspace_id: workspaceId,
    p_expected_revision: replaced.revision, p_logo_png_base64: png.toString('base64'),
  })).error, 'Browser callers cannot bypass the validator');
});

test('local interest inbox grants permission before the first customer logo', async (t) => {
  const client = () => createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const admin = client();
  await read(admin.auth.signInWithPassword({ email: process.env.SVARIO_BRANDING_TEST_ADMIN_EMAIL, password: process.env.SVARIO_BRANDING_TEST_ADMIN_PASSWORD }));
  const owner = client();
  const { session } = await read(owner.auth.signUp({ email: `interest-${randomUUID()}@example.com`, password: randomUUID() }));
  await read(owner.rpc('ensure_account_initialized_v2'));
  const workspaceId = await read(owner.rpc('create_workspace', { p_name: `Interesse ${randomUUID()}`, p_type: 'business' }));
  t.after(() => read(owner.rpc('delete_workspace', { p_workspace_id: workspaceId })));
  const survey = await read(owner.rpc('create_survey_draft', { p_workspace_id: workspaceId, p_title: 'Interesse', p_slug: `interest-${randomUUID()}` }));
  await read(owner.from('questions').insert({ survey_id: survey.id, type: 'free_text', visualization_type: 'word_cloud', prompt: 'Test' }));
  await read(owner.rpc('publish_survey', { p_survey_id: survey.id }));
  const access = () => read(owner.rpc('get_my_branding_access', { p_workspace_id: workspaceId }).single());
  const branding = () => read(owner.rpc('get_my_workspace_branding', { p_workspace_id: workspaceId }).maybeSingle());
  const publicProfile = () => read(anonymous.rpc('get_survey_respondent_branding', { p_slug: survey.slug }).maybeSingle());
  async function upload(bytes = png, mime = 'image/png', revision = 0) {
    const body = new FormData();
    body.set('action', 'logo'); body.set('workspaceId', workspaceId); body.set('revision', String(revision));
    body.set('logo', new File([bytes], 'logo', { type: mime }));
    return fetch(`${url}/functions/v1/save-workspace-branding`, { method: 'POST', headers: { apikey: key, Authorization: `Bearer ${session.access_token}` }, body });
  }
  assert.equal((await access()).is_allowed, false);
  assert.equal((await upload()).status, 403);
  assert.equal(await publicProfile(), null);
  const initialCount = await read(admin.rpc('count_new_branding_requests'));
  const ids = await Promise.all(Array.from({ length: 12 }, () => read(owner.rpc('request_workspace_branding', {
    p_workspace_id: workspaceId, p_contact_name: 'Testkontakt', p_contact_email: 'test@example.com', p_message: 'Ønsker egen logo',
  }))));
  assert.equal(new Set(ids).size, 1, 'Simultaneous interest requests are deduplicated');
  assert.equal((await access()).request_status, 'new');
  assert.equal((await access()).is_allowed, false);
  assert.equal(await read(admin.rpc('count_new_branding_requests')), initialCount + 1);
  const requests = await read(admin.rpc('list_workspace_branding_requests', { p_status: 'new', p_offset: 0 }));
  const request = requests.find(({ id }) => id === ids[0]);
  assert.ok(request);
  assert.equal(request.contact_name, 'Testkontakt');
  assert.equal((await upload()).status, 403);
  assert.ok((await owner.rpc('review_workspace_branding_request', { p_request_id: request.id, p_expected_revision: request.revision, p_status: 'approved' })).error);
  await read(admin.rpc('review_workspace_branding_request', { p_request_id: request.id, p_expected_revision: request.revision, p_status: 'in_review' }));
  assert.equal(await read(admin.rpc('count_new_branding_requests')), initialCount);
  assert.equal((await access()).request_status, 'in_review');
  assert.equal((await upload()).status, 403);
  await read(admin.rpc('review_workspace_branding_request', { p_request_id: request.id, p_expected_revision: request.revision + 1, p_status: 'approved' }));
  assert.equal((await access()).is_allowed, true);
  assert.equal(await branding(), null, 'Permission does not require a placeholder logo');
  assert.equal(await publicProfile(), null);
  assert.equal((await upload(Buffer.from('<svg/>'))).status, 400);
  assert.equal(await branding(), null);
  const outcomes = await Promise.all([upload(webp, 'image/webp'), upload(png)]);
  assert.deepEqual(outcomes.map(({ status }) => status).sort(), [200, 409], 'Only one simultaneous first upload can succeed');
  const profile = await branding();
  assert.equal(profile.revision, 1);
  assert.equal(profile.is_active, true);
  assert.equal((await publicProfile()).logo_png_base64, profile.logo_png_base64);
  assert.equal((await publicProfile()).display_name, profile.display_name);
  await read(admin.rpc('set_workspace_respondent_branding_active', { p_workspace_id: workspaceId, p_is_active: false }));
  assert.equal((await access()).is_allowed, true, 'Publication and permission remain separate');
  assert.equal(await publicProfile(), null);
  assert.equal((await upload(png, 'image/png', 2)).status, 200);
  assert.equal((await branding()).is_active, false, 'A new upload preserves administrative deactivation');
});
