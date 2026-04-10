// ================================================
// WARNING: Fill in all values before deploying
// ================================================

export const SUPABASE_URL      = 'https://jmbfthwpmzmpbvmpuitl.supabase.co';
export const SUPABASE_ANON_KEY = 'sb_publishable_pJsAwK9MIMktGV54741sbQ_9BjdT_20';
export const STRIPE_PUBLISHABLE_KEY   = 'pk_test_YOUR_KEY';           // ⚠️ TODO
export const CLOUDINARY_CLOUD_NAME    = 'dbiq6g7dl';           
export const CLOUDINARY_UPLOAD_PRESET = 'lunastitch_upload';        
export const CHECKOUT_FUNCTION_URL    =
  'https://jmbfthwpmzmpbvmpuitl.supabase.co/functions/v1/create-checkout';

/** 检查是否已填写真实 key（本地调试用） */
export function isConfigured() {
  return !SUPABASE_URL.includes('YOUR_PROJECT');
}
