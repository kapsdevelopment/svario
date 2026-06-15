import { createClient } from '@supabase/supabase-js';

import { appEnv, hasSupabaseConfig } from '../../infrastructure/config/env';
import type { Database } from './database.types';

export const supabase = hasSupabaseConfig
  ? createClient<Database>(appEnv.supabaseUrl!, appEnv.supabasePublishableKey!)
  : null;

export const publicSupabase = hasSupabaseConfig
  ? createClient<Database>(
      appEnv.supabaseUrl!,
      appEnv.supabasePublishableKey!,
      {
        auth: {
          autoRefreshToken: false,
          detectSessionInUrl: false,
          persistSession: false,
          storageKey: 'svario-public-anon',
        },
      },
    )
  : null;
