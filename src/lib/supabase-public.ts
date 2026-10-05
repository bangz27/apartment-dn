/** Publishable key only. Never put a secret or service_role key here. */
export const SUPABASE_URL = "https://jqjzkokarmfznwjoqhap.supabase.co";
export const SUPABASE_KEY = "sb_publishable_JupCwxxk_DpFJ6BIbHom9g_dsgkzwId";

export function maskKey(key: string): string {
  if (key.length <= 18) return "sb_publishable_…";
  return `${key.slice(0, 16)}…`;
}
