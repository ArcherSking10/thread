// ================================================
// WARNING: Fill in all values before deploying
// ================================================

export const SUPABASE_URL      = 'https://YOUR_PROJECT.supabase.co'; // ⚠️ TODO
export const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';           // ⚠️ TODO
export const STRIPE_PUBLISHABLE_KEY   = 'pk_test_YOUR_KEY';           // ⚠️ TODO
export const CLOUDINARY_CLOUD_NAME    = 'YOUR_CLOUD_NAME';            // ⚠️ TODO
export const CLOUDINARY_UPLOAD_PRESET = 'YOUR_UPLOAD_PRESET';         // ⚠️ TODO
export const CHECKOUT_FUNCTION_URL    =
  'https://YOUR_PROJECT.supabase.co/functions/v1/create-checkout';    // ⚠️ TODO

/** 检查是否已填写真实 key（本地调试用） */
export function isConfigured() {
  return !SUPABASE_URL.includes('YOUR_PROJECT');
}
