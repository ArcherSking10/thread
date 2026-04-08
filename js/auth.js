import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';
import { SUPABASE_URL, SUPABASE_ANON_KEY, isConfigured } from './config.js';

// 只在配置好时才初始化 supabase client
export const supabase = isConfigured()
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

export async function getSession() {
  if (!supabase) return null;
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

export async function getCurrentUser() {
  if (!supabase) return null;
  const session = await getSession();
  if (!session) return null;
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, full_name')
    .eq('id', session.user.id)
    .single();
  return {
    ...session.user,
    role:     profile?.role,
    fullName: profile?.full_name,
    isAdmin:  profile?.role === 'admin',
  };
}

export async function signUp(email, password, fullName) {
  if (!supabase) throw new Error('Supabase not configured. Fill in js/config.js first.');
  const { data, error } = await supabase.auth.signUp({
    email, password,
    options: { data: { full_name: fullName, role: 'customer' } },
  });
  if (error) throw error;
  return data;
}

export async function login(email, password) {
  if (!supabase) throw new Error('Supabase not configured. Fill in js/config.js first.');
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function logout() {
  if (supabase) await supabase.auth.signOut();
  window.location.href = '/login.html';
}

/**
 * 路由守卫：未登录跳转到登录页。
 * 本地未配置时：直接返回 null，不跳转，页面自行处理。
 */
export async function requireAuth(redirectTo = '/login.html') {
  if (!isConfigured()) return null; // 本地调试：跳过守卫
  const session = await getSession();
  if (!session) {
    const next = location.pathname + location.search;
    window.location.href = redirectTo + '?next=' + encodeURIComponent(next);
    return null;
  }
  return session;
}

/**
 * 路由守卫：非管理员跳转到首页。
 * 本地未配置时：跳过守卫。
 */
export async function requireAdmin() {
  if (!isConfigured()) return null; // 本地调试：跳过守卫
  const user = await getCurrentUser();
  if (!user || !user.isAdmin) {
    window.location.href = '/';
    return null;
  }
  return user;
}

/**
 * 更新导航栏登录状态。
 * 本地未配置时：显示"Dev mode"提示。
 */
export async function updateNav() {
  const el = document.getElementById('nav-auth');
  if (!el) return;

  // 未配置时：不显示任何内容（移除 DEV MODE）
  if (!isConfigured()) {
    el.innerHTML = `<a href="/login.html">Sign in</a>`;
    return;
  }

  const user = await getCurrentUser();
  if (user) {
    el.innerHTML = user.isAdmin
      ? `<a href="/admin/">Admin</a><a href="#" class="nav-sep" onclick="import('/js/auth.js').then(m => m.logout())">Sign out</a>`
      : `<a href="/account.html">My orders</a><a href="#" class="nav-sep" onclick="import('/js/auth.js').then(m => m.logout())">Sign out</a>`;
  } else {
    el.innerHTML = `<a href="/login.html">Sign in</a>`;
  }
}
