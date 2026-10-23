const env = window.NBJ_ENV || {};

function normalizeRootUrl(raw) {
  const value = String(raw || '').trim().replace(/\/+$/, '');
  if (!value) return '';

  try {
    const url = new URL(value);

    if (
      url.protocol !== 'https:' &&
      !['localhost', '127.0.0.1'].includes(url.hostname)
    ) {
      throw new Error('Supabase URL must use HTTPS.');
    }

    if (/\/(rest|auth|storage)\/v1(?:\/|$)/i.test(url.pathname)) {
      throw new Error(
        'Use the Supabase project root URL only; remove /rest/v1, /auth/v1 or /storage/v1.'
      );
    }

    return `${url.origin}${url.pathname === '/' ? '' : url.pathname}`
      .replace(/\/+$/, '');
  } catch (error) {
    console.error('Invalid Supabase root URL:', error);
    return '';
  }
}

function normalizeSiteUrl(raw) {
  const value = String(raw || window.location.origin).trim();

  try {
    const url = new URL(value, window.location.origin);

    if (!['http:', 'https:'].includes(url.protocol)) {
      throw new Error('SITE_URL must use HTTP or HTTPS.');
    }

    return `${url.origin}${url.pathname === '/' ? '' : url.pathname}`
      .replace(/\/+$/, '');
  } catch (error) {
    console.error('Invalid SITE_URL:', error);
    return window.location.origin;
  }
}

export const config = Object.freeze({
  supabaseUrl: normalizeRootUrl(env.SUPABASE_URL),
  supabaseAnonKey: String(env.SUPABASE_ANON_KEY || '').trim(),
  siteUrl: normalizeSiteUrl(env.SITE_URL),
  currency: String(env.CURRENCY || 'PHP').toUpperCase(),
  currencyLocale: String(env.CURRENCY_LOCALE || 'en-PH'),
  debug: Boolean(env.DEBUG)
});

export const isConfigured = Boolean(
  config.supabaseUrl &&
  config.supabaseAnonKey
);

export function assertConfigured() {
  if (!isConfigured) {
    throw new Error(
      'Supabase is not configured. Set NBJ_SUPABASE_URL and NBJ_SUPABASE_PUBLISHABLE_KEY in the server environment.'
    );
  }
}

export function roleHomePath(role) {
  if (role === 'ADMIN') {
    return '/admin/dashboard.html';
  }

  if (['STAFF', 'MANAGER'].includes(role)) {
    return '/operations/dashboard.html';
  }

  return '/customer/dashboard.html';
}

export function appUrl(path = '') {
  const base = new URL(`${config.siteUrl}/`);
  const value = String(path || '').trim();

  if (!value) {
    return config.siteUrl;
  }

  const url = new URL(value, base);

  if (url.origin !== base.origin) {
    throw new Error('Only same-origin application URLs are allowed.');
  }

  return url.href;
}
