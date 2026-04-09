import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';
import { SUPABASE_URL, SUPABASE_ANON_KEY, isConfigured } from './config.js';

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
    .maybeSingle();
  return {
    ...session.user,
    role:     profile?.role     ?? session.user.user_metadata?.role ?? 'customer',
    fullName: profile?.full_name ?? session.user.user_metadata?.full_name ?? '',
    isAdmin:  (profile?.role ?? session.user.user_metadata?.role) === 'admin',
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

// AUTH-03: reset password
export async function resetPassword(email) {
  if (!supabase) throw new Error('Supabase not configured.');
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: window.location.origin + '/login.html',
  });
  if (error) throw error;
}

export async function requireAuth(redirectTo = '/login.html') {
  if (!isConfigured()) return null;
  const session = await getSession();
  if (!session) {
    const next = location.pathname + location.search;
    window.location.href = redirectTo + '?next=' + encodeURIComponent(next);
    return null;
  }
  return session;
}

export async function requireAdmin() {
  if (!isConfigured()) return null;
  const user = await getCurrentUser();
  if (!user || !user.isAdmin) {
    window.location.href = '/';
    return null;
  }
  return user;
}

export async function updateNav() {
  const el = document.getElementById('nav-auth');
  if (!el) return;

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

  // NAV-01: mobile menu auth links
  const mobileAuth = document.getElementById('mobile-auth-links');
  if (mobileAuth) {
    const linkStyle = `font-size:22px;font-family:'Cormorant Garamond',Georgia,serif;color:var(--ink2)`;
    if (user) {
      mobileAuth.innerHTML = user.isAdmin
        ? `<a href="/admin/" style="${linkStyle}" onclick="closeMobile()">Admin</a>
           <a href="#" style="${linkStyle}" onclick="import('/js/auth.js').then(m=>m.logout())">Sign out</a>`
        : `<a href="/account.html" style="${linkStyle}" onclick="closeMobile()">My orders</a>
           <a href="#" style="${linkStyle}" onclick="import('/js/auth.js').then(m=>m.logout())">Sign out</a>`;
    } else {
      mobileAuth.innerHTML =
        `<a href="/login.html" style="${linkStyle}" onclick="closeMobile()">Sign in</a>`;
    }
  }
}
