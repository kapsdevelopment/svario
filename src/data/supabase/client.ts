import { createClient } from '@supabase/supabase-js';

import { appEnv, hasSupabaseConfig } from '../../infrastructure/config/env';

export const supabase = hasSupabaseConfig
  ? createClient(appEnv.supabaseUrl!, appEnv.supabasePublishableKey!)
  : null;
