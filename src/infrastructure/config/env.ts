type AppEnv = {
  supabaseUrl: string | null;
  supabasePublishableKey: string | null;
};

function blankToNull(value: string | undefined) {
  const trimmed = value?.trim() ?? '';
  return trimmed.length > 0 ? trimmed : null;
}

export const appEnv: AppEnv = {
  supabaseUrl: blankToNull(import.meta.env.VITE_SUPABASE_URL),
  supabasePublishableKey:
    blankToNull(import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY) ??
    blankToNull(import.meta.env.VITE_SUPABASE_ANON_KEY),
};

export const hasSupabaseConfig =
  appEnv.supabaseUrl !== null && appEnv.supabasePublishableKey !== null;
