import { createClient } from '@supabase/supabase-js';
import { normalizeLogo } from './logo.ts';

const productionOrigin = 'https://svario.no';
const maximumBodySize = 1024 * 1024 + 16384;

Deno.serve(async (request) => {
  const origin = request.headers.get('Origin');
  const headers = {
    'Access-Control-Allow-Origin': allowedOrigin(origin) ? origin! : productionOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Cache-Control': 'no-store',
    'Vary': 'Origin',
  };
  const json = (body: Record<string, unknown>, status = 200) => Response.json(body, { status, headers });
  if (request.method === 'OPTIONS') return new Response('ok', { headers });
  if (request.method !== 'POST') return json({ message: 'Method not allowed.' }, 405);

  const token = (request.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '').trim();
  if (!token) return json({ message: 'Logg inn på nytt.' }, 401);

  const url = Deno.env.get('SUPABASE_URL')!;
  const service = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: { user }, error: authError } = await service.auth.getUser(token);
  if (authError || !user) return json({ message: 'Logg inn på nytt.' }, 401);
  const caller = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  let form: FormData;
  try {
    const reader = request.body?.getReader();
    if (!reader) return json({ message: 'Skjemadata mangler.' }, 400);
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maximumBodySize) {
        await reader.cancel();
        return json({ message: 'Logoen kan være maks 1 MiB.' }, 413);
      }
      chunks.push(value);
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    form = await new Response(bytes, { headers: { 'Content-Type': request.headers.get('Content-Type') ?? '' } }).formData();
  } catch {
    return json({ message: 'Kunne ikke lese skjemaet.' }, 400);
  }

  const workspaceId = form.get('workspaceId');
  const displayName = form.get('displayName');
  const accentColor = form.get('accentColor');
  const revision = form.get('revision');
  const action = form.get('action') ?? 'profile';
  if (action !== 'profile' && action !== 'logo') return json({ message: 'Ukjent handling.' }, 400);
  if (typeof workspaceId !== 'string' || !/^[0-9a-f-]{36}$/i.test(workspaceId)
    || typeof revision !== 'string' || !/^\d+$/.test(revision) || !Number.isSafeInteger(Number(revision))) {
    return json({ message: 'Ugyldig arbeidsflate eller profilversjon.' }, 400);
  }
  if (action === 'logo') {
    const { data: access, error } = await caller.rpc('get_my_branding_access', { p_workspace_id: workspaceId }).single<{ is_allowed: boolean }>();
    if (error) return json({ message: 'Bare eiere og administratorer kan endre arbeidsflatens logo.', code: '42501' }, 403);
    if (!access.is_allowed) return json({ message: 'Svario må tillate profilering før du kan laste opp en logo.', code: '42501' }, 403);
    if (displayName !== null || accentColor !== null || form.has('isActive')) {
      return json({ message: 'Her kan du bare bytte logo.' }, 400);
    }
  } else {
    const { data: isAdmin, error: roleError } = await caller.rpc('is_svario_admin');
    if (roleError || !isAdmin) return json({ message: 'Denne handlingen krever Svario-admin.', code: '42501' }, 403);
  }
  if (action === 'profile' && (typeof displayName !== 'string' || !displayName.trim() || Array.from(displayName.trim()).length > 80
    || typeof accentColor !== 'string' || !/^#[0-9a-f]{6}$/i.test(accentColor))) {
    return json({ message: 'Fyll inn visningsnavn og en gyldig aksentfarge.' }, 400);
  }

  let logo: string | null = null;
  const file = form.get('logo');
  if (action === 'logo' && file === null) return json({ message: 'Velg en PNG- eller WebP-logo.' }, 400);
  if (file !== null) {
    if (!(file instanceof File)) return json({ message: 'Velg en PNG- eller WebP-logo.' }, 400);
    try {
      const normalized = normalizeLogo(new Uint8Array(await file.arrayBuffer()), file.type);
      // Chunk the conversion to avoid exceeding the JS argument limit.
      let binary = '';
      for (let offset = 0; offset < normalized.length; offset += 8192) {
        binary += String.fromCharCode(...normalized.subarray(offset, offset + 8192));
      }
      logo = btoa(binary);
    } catch (error) {
      return json({ message: error instanceof Error ? error.message : 'Ugyldig logo.' }, 400);
    }
  }

  const logoArgs = {
    p_auth_user_id: user.id, p_workspace_id: workspaceId,
    p_expected_revision: Number(revision), p_logo_png_base64: logo,
  };
  const { data, error } = action === 'logo'
    ? await service.rpc('replace_workspace_branding_logo', logoArgs)
    : await service.rpc('save_workspace_respondent_branding', {
      ...logoArgs, p_display_name: (displayName as string).trim(), p_accent_color: accentColor,
    });
  if (error) {
    if (error.code === '42501') return json({ message: 'Du har ikke tilgang til å endre denne profilen.', code: error.code }, 403);
    if (error.code === 'P0001') return json({ message: 'Profilen er endret av en annen. Last inn profilen på nytt før du lagrer.', code: error.code }, 409);
    if (error.code === 'P0002') return json({ message: 'Arbeidsflaten er ikke tilgjengelig.' }, 404);
    if (error.code === '22023') return json({ message: 'Kontroller navn, aksentfarge og logo.' }, 400);
    console.error('Saving workspace branding failed', error.code);
    return json({ message: 'Kunne ikke lagre profilen.' }, 500);
  }
  return json({ revision: data });
});

function allowedOrigin(origin: string | null) {
  if (!origin) return false;
  if (origin === productionOrigin) return true;
  try {
    const parsed = new URL(origin);
    return parsed.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(parsed.hostname);
  } catch {
    return false;
  }
}
