import { createClient } from '@supabase/supabase-js';

import { appEnv, hasSupabaseConfig } from '../../infrastructure/config/env';
import type { Database } from './database.types';

export const supabase = hasSupabaseConfig
  ? createClient<Database>(appEnv.supabaseUrl!, appEnv.supabasePublishableKey!)
  : null;
