import {
  getProfile,
  getSession,
  roleHome
} from './auth.js';

import {
  notify
} from './utils.js';

export async function requireAuth(options = {}) {
  const session =
    await getSession();

  if (!session) {
    const next =
      encodeURIComponent(
        location.pathname +
        location.search
      );

    location.replace(
      `/login.html?next=${next}`
    );

    return null;
  }

  let profile;

  try {
    profile =
      await getProfile();

  } catch (error) {
    console.error(
      'Profile load error:',
      error
    );

    notify(
      error?.message ||
      'Unable to load your account profile.',
      'danger'
    );

    return null;
  }

  if (!profile) {
    notify(
      'Account profile could not be found.',
      'danger'
    );

    return null;
  }

  if (profile.active === false) {
    notify(
      'Your account is inactive.',
      'danger'
    );

    location.replace(
      '/unauthorized.html'
    );

    return null;
  }

  if (
    options.roles?.length &&
    !options.roles.includes(profile.role)
  ) {
    location.replace(
      '/unauthorized.html'
    );

    return null;
  }

  /*
   * Compatibility:
   *
   * context.profile.full_name
   * context.user.email
   *
   * AND old:
   *
   * context.full_name
   * context.role
   */
  return {
    ...profile,

    profile,

    user: {
      id:
        session.user?.id ||
        profile.id,

      email:
        session.user?.email ||
        profile.email ||
        ''
    }
  };
}

export async function requireGuest() {
  const session =
    await getSession();

  if (!session) {
    return true;
  }

  const profile =
    await getProfile()
      .catch(() => null);

  if (profile) {
    location.replace(
      roleHome(profile.role)
    );

    return false;
  }

  return true;
}

export async function redirectAuthenticated() {
  const session =
    await getSession();

  if (!session) return;

  const profile =
    await getProfile()
      .catch(() => null);

  if (profile) {
    location.replace(
      roleHome(profile.role)
    );
  }
}

