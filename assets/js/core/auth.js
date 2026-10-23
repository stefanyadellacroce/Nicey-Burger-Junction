import { getSupabase, requireSupabase } from './supabase.js';
import { normalizeError } from './utils.js';

let cachedProfile = null;
let profileRequest = null;
let profileEpoch = 0;

export async function getSession() {
  const supabase = await getSupabase();
  if (!supabase) return null;

  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;

  return data.session || null;
}

export async function getProfile(force = false) {
  if (cachedProfile && !force) {
    return cachedProfile;
  }

  if (profileRequest && !force) {
    return profileRequest;
  }

  const epoch = profileEpoch;
  const request = (async () => {
    const supabase = await getSupabase();
    if (!supabase) return null;

    const {
      data: { user },
      error: userError
    } = await supabase.auth.getUser();

    if (userError) throw userError;
    if (!user) return null;

    const { data, error } = await supabase
      .from('profiles')
      .select(`
        id,
        full_name,
        phone,
        avatar_path,
        role,
        active,
        notification_preferences,
        created_at
      `)
      .eq('id', user.id)
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      throw new Error(
        'Your account exists but its profile record is missing.'
      );
    }

    return { ...data, email: user.email };
  })();

  profileRequest = request;

  try {
    const profile = await request;
    if (profileEpoch !== epoch) return null;
    cachedProfile = profile;
    return profile;
  } finally {
    if (profileRequest === request) profileRequest = null;
  }
}

/*
 * Supports BOTH:
 *
 * signIn(email, password)
 *
 * and
 *
 * signIn({
 *   email,
 *   password
 * })
 */
export async function signIn(input, legacyPassword) {
  const credentials =
    typeof input === 'object' && input !== null
      ? {
          email: String(input.email || '').trim().toLowerCase(),
          password: String(input.password || '')
        }
      : {
          email: String(input || '').trim().toLowerCase(),
          password: String(legacyPassword || '')
        };

  if (!credentials.email) {
    throw new Error('Email is required.');
  }

  if (!credentials.password) {
    throw new Error('Password is required.');
  }

  const supabase = await requireSupabase();

  const { data, error } = await supabase.auth.signInWithPassword({
    email: credentials.email,
    password: credentials.password
  });

  if (error) {
    console.error('Supabase login error:', error);
    throw error;
  }

  cachedProfile = null;
  profileRequest = null;
  profileEpoch += 1;

  const profile = await getProfile(true);

  if (!profile) {
    await supabase.auth.signOut().catch(() => {});
    throw new Error('Account profile was not found.');
  }

  if (profile.active === false) {
    await supabase.auth.signOut().catch(() => {});
    throw new Error('This account is inactive.');
  }

  return {
    ...data,
    profile
  };
}

export async function signUp({
  email,
  password,
  fullName,
  phone
}) {
  const supabase = await requireSupabase();

const redirectTo =
  `${location.origin}/login.html?verified=1`;

  const { data, error } = await supabase.auth.signUp({
    email: String(email || '').trim(),
    password: String(password || ''),
    options: {
      emailRedirectTo: redirectTo,
      data: {
        full_name: String(fullName || '').trim(),
        phone: String(phone || '').trim()
      }
    }
  });

  if (error) throw error;

  return data;
}

/*
 * Compatibility with newer registration controller.
 */
export async function signUpCustomer({
  email,
  password,
  fullName,
  phone
}) {
  return signUp({
    email,
    password,
    fullName,
    phone
  });
}

export async function signOut() {
  const supabase = await requireSupabase();

  cachedProfile = null;
  profileRequest = null;
  profileEpoch += 1;

  const { error } = await supabase.auth.signOut();

  if (error) throw error;
}

export async function resendSignupConfirmation(email) {
  const supabase = await requireSupabase();

  const normalizedEmail =
    String(email || '')
      .trim()
      .toLowerCase();

  if (!normalizedEmail) {
    throw new Error('Email is required.');
  }

  const { error } = await supabase.auth.resend({
    type: 'signup',
    email: normalizedEmail,
    options: {
      emailRedirectTo:
        `${location.origin}/login.html?verified=1`
    }
  });

  if (error) throw error;
}

export async function requestPasswordReset(email) {
  const supabase = await requireSupabase();

  const { error } = await supabase.auth.resetPasswordForEmail(
    String(email || '').trim(),
    {
      redirectTo:
        `${location.origin}/reset-password.html`
    }
  );

  if (error) throw error;
}

/*
 * Compatibility with newer forgot-password controller.
 */
export async function sendPasswordReset(email) {
  return requestPasswordReset(email);
}

export async function updatePassword(password) {
  const supabase = await requireSupabase();

  const { error } = await supabase.auth.updateUser({
    password
  });

  if (error) throw error;
}

export function roleHome(role) {
  if (role === 'ADMIN') {
    return '/admin/dashboard.html';
  }

  if (
    role === 'STAFF' ||
    role === 'MANAGER'
  ) {
    return '/operations/dashboard.html';
  }

  return '/customer/dashboard.html';
}

export function authErrorMessage(error) {
  const message =
    normalizeError(error);

  if (
    /invalid login credentials/i.test(message) ||
    /invalid login/i.test(message)
  ) {
    return 'Incorrect email or password.';
  }

  if (
    /email not confirmed/i.test(message)
  ) {
    return 'Verify your email before signing in.';
  }

  if (
    /profile record is missing/i.test(message)
  ) {
    return 'Your account exists, but its profile has not been set up correctly.';
  }

  if (
    /inactive/i.test(message)
  ) {
    return 'This account is inactive.';
  }

  return message;
}
