/**
 * Self-service account deletion for signed-in customers.
 *
 * Apple guideline 5.1.1(v) and Google Play both require an in-app path to delete
 * an account created in-app. The client cannot call auth.admin.deleteUser — that
 * needs the service role — so this function verifies the caller's JWT and deletes
 * only that user. Cascading FKs on binder_entries, lend_groups, user_settings,
 * binder_shares, entitlements, and trades remove the associated rows.
 *
 * `verify_jwt = true` (default) rejects unauthenticated calls at the gateway.
 * The handler still calls getUser on the token so a forged Authorization header
 * cannot delete an arbitrary account.
 *
 * Deploy:
 *   supabase functions deploy delete-account
 */

import { createClient } from 'jsr:@supabase/supabase-js@2';

import { json } from '../_shared/http.ts';

Deno.serve(async (request) => {
  if (request.method !== 'POST') {
    return json({ error: 'method not allowed' }, 405);
  }

  const authHeader = request.headers.get('Authorization');
  if (!authHeader) {
    return json({ error: 'unauthorized' }, 401);
  }

  const url = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !serviceRoleKey) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    return json({ error: 'not configured' }, 503);
  }

  const admin = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const token = authHeader.replace(/^Bearer\s+/i, '');
  const {
    data: { user },
    error: userError,
  } = await admin.auth.getUser(token);

  if (userError || !user) {
    return json({ error: 'unauthorized' }, 401);
  }

  const { error: deleteError } = await admin.auth.admin.deleteUser(user.id);
  if (deleteError) {
    console.error(`deleteUser(${user.id}) failed:`, deleteError.message);
    return json({ error: 'deletion failed' }, 500);
  }

  return json({ ok: true });
});
