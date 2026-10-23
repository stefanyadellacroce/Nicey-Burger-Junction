import {
  config,
  isConfigured
} from './config.js';

let client = null;
let sdkPromise = null;

const SDK_URL = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';

function loadSdk() {
  if (window.supabase?.createClient) {
    return Promise.resolve();
  }

  if (!sdkPromise) {
    sdkPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = SDK_URL;
      script.async = true;

      script.addEventListener('load', () => {
        if (window.supabase?.createClient) {
          resolve();
        } else {
          reject(new Error('Supabase JavaScript SDK did not initialize.'));
        }
      }, { once: true });

      script.addEventListener('error', () => {
        reject(new Error('Supabase JavaScript SDK failed to load.'));
      }, { once: true });

      document.head.append(script);
    }).catch(error => {
      sdkPromise = null;
      throw error;
    });
  }

  return sdkPromise;
}

function createClient() {
  if (!isConfigured) {
    return null;
  }

  if (client) {
    return client;
  }

  const factory =
    window.supabase?.createClient;

  if (!factory) {
    throw new Error(
      'Supabase JavaScript SDK failed to load from the configured CDN.'
    );
  }

  client = factory(
    config.supabaseUrl,
    config.supabaseAnonKey,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      },

      global: {
        headers: {
          'x-client-info':
            'nicey-burger-junction-web/1.0.0'
        }
      }
    }
  );

  return client;
}

function requireClientSync() {
  const instance = createClient();

  if (!instance) {
    throw new Error(
      'Supabase is not configured. See README.md.'
    );
  }

  return instance;
}

/*
 * Compatibility export for modules such as reset-password.js
 * that use `supabase.auth` directly. The client is still lazy.
 */
export const supabase = new Proxy(
  {},
  {
    get(_target, property) {
      const instance = requireClientSync();
      const value = instance[property];

      return typeof value === 'function'
        ? value.bind(instance)
        : value;
    }
  }
);

export async function getSupabase() {
  if (!isConfigured) return null;
  await loadSdk();
  return createClient();
}

export async function requireSupabase() {
  await loadSdk();
  return requireClientSync();
}
