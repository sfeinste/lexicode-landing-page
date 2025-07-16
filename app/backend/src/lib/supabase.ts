import { createClient } from '@supabase/supabase-js';
import { config } from '@/config';
import { logger } from '@/shared/logger';

// Validate required environment variables
if (!config.supabase.url || !config.supabase.anonKey || !config.supabase.serviceKey) {
  logger.error('Missing required Supabase configuration', {
    hasUrl: !!config.supabase.url,
    hasAnonKey: !!config.supabase.anonKey,
    hasServiceKey: !!config.supabase.serviceKey
  });
  throw new Error('Supabase configuration is incomplete. Please check your environment variables.');
}

// Create Supabase client for regular operations (uses anon key)
export const supabase = createClient(
  config.supabase.url,
  config.supabase.anonKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

// Create admin client with service role key for admin operations
export const supabaseAdmin = createClient(
  config.supabase.url,
  config.supabase.serviceKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);