import {
  signIn,
  signUpCustomer,
  resendSignupConfirmation,
  sendPasswordReset,
  updatePassword,
  signOut,
  authErrorMessage
} from '../core/auth.js';

import {
  requireGuest
} from '../core/guards.js';

import {
  appUrl,
  roleHomePath,
  isConfigured
} from '../core/config.js';

import {
  getSafeNextUrl,
  passwordLooksValid,
  notify,
  setBusy
} from '../core/utils.js';


export async function init() {
  if (!isConfigured) {
    return;
  }

  const mode =
    String(
      document.body?.dataset?.authMode || ''
    )
      .trim()
      .toLowerCase();

  const form =
    document.querySelector(
      'form[data-auth-form]'
    );

  if (!form) {
    console.error(
      'Authentication form not found.'
    );

    return;
  }

  /*
   * Login/register/forgot pages should only
   * remain visible to signed-out users.
   *
   * Do not run requireGuest() on reset-password
   * because a recovery link may create a temporary
   * authenticated Supabase session.
   */
  if (
    mode === 'login' ||
    mode === 'register' ||
    mode === 'forgot'
  ) {
    const canStay =
      await requireGuest();

    if (!canStay) {
      return;
    }
  }

  if (mode === 'login') {
    setupLoginMessages();
    setupResendVerification(form);
  }

  form.addEventListener(
    'submit',
    async event => {
      event.preventDefault();

      const button =
        form.querySelector(
          'button[type="submit"]'
        );

      if (button?.disabled) {
        return;
      }

      const formData =
        new FormData(form);

      setBusy(
        button,
        true,
        getBusyText(mode)
      );

      try {
        if (mode === 'login') {
          await handleLogin(
            formData
          );

          return;
        }

        if (mode === 'register') {
          await handleRegister(
            form,
            formData
          );

          return;
        }

        if (mode === 'forgot') {
          await handleForgotPassword(
            form,
            formData
          );

          return;
        }

        if (mode === 'reset') {
          await handleResetPassword(
            formData
          );

          return;
        }

        throw new Error(
          'Unsupported authentication mode.'
        );

      } catch (error) {
        console.error(
          'Authentication error:',
          error
        );

        notify(
          getAuthErrorMessage(
            mode,
            error
          ),
          'danger'
        );

      } finally {
        setBusy(
          button,
          false
        );
      }
    }
  );
}


function setupLoginMessages() {
  const params =
    new URLSearchParams(
      window.location.search
    );

  if (
    params.get('verified') === '1'
  ) {
    notify(
      'Email verified successfully. You can now sign in.',
      'success'
    );
  }

  if (
    params.get('reset') === '1'
  ) {
    notify(
      'Password updated successfully. Sign in using your new password.',
      'success'
    );
  }
}


function setupResendVerification(form) {
  const button =
    document.getElementById(
      'resend-verification'
    );

  if (!button) {
    return;
  }

  button.addEventListener(
    'click',
    async () => {
      if (button.disabled) {
        return;
      }

      const emailInput =
        form.querySelector(
          '[name="email"]'
        );

      const email =
        String(
          emailInput?.value || ''
        )
          .trim()
          .toLowerCase();

      if (!email) {
        notify(
          'Enter your email address first.',
          'warning'
        );

        emailInput?.focus();

        return;
      }

      setBusy(
        button,
        true,
        'Sending…'
      );

      try {
        await resendSignupConfirmation(
          email
        );

        notify(
          'Verification email sent. Open the newest email to confirm your account.',
          'success'
        );

      } catch (error) {
        console.error(
          'Resend verification error:',
          error
        );

        notify(
          getAuthErrorMessage(
            'resend',
            error
          ),
          'danger'
        );

      } finally {
        setBusy(
          button,
          false
        );
      }
    }
  );
}


function getBusyText(mode) {
  const labels = {
    login:
      'Signing in…',

    register:
      'Creating account…',

    forgot:
      'Sending…',

    reset:
      'Updating password…'
  };

  return (
    labels[mode] ||
    'Please wait…'
  );
}


async function handleLogin(formData) {
  const email =
    String(
      formData.get('email') || ''
    )
      .trim()
      .toLowerCase();

  const password =
    String(
      formData.get('password') || ''
    );

  if (!email) {
    throw new Error(
      'Enter your email address.'
    );
  }

  if (!password) {
    throw new Error(
      'Enter your password.'
    );
  }

  const result =
    await signIn({
      email,
      password
    });

  const params =
    new URLSearchParams(
      window.location.search
    );

  const safeNext =
    getSafeNextUrl(
      params.get('next')
    );

  const role =
    result?.profile?.role;

  if (!role) {
    throw new Error(
      'profile_missing'
    );
  }

  const nextPath = safeNext
    ? new URL(safeNext, location.origin).pathname
    : '';

  const allowedNext =
    role === 'CUSTOMER'
      ? nextPath.startsWith('/customer/') ||
        ['/menu.html', '/product.html'].includes(nextPath)
      : role === 'ADMIN'
        ? nextPath.startsWith('/admin/') ||
          nextPath.startsWith('/operations/')
        : nextPath.startsWith('/operations/');

  if (safeNext && allowedNext) {
    const destination = new URL(safeNext, location.origin);

    if (role === 'ADMIN' && destination.pathname.startsWith('/operations/')) {
      destination.pathname = destination.pathname.replace('/operations/', '/admin/');
    }

    window.location.replace(
      `${destination.pathname}${destination.search}${destination.hash}`
    );

    return;
  }

  window.location.replace(
    appUrl(
      roleHomePath(
        role
      )
    )
  );
}


async function handleRegister(
  form,
  formData
) {
  const fullName =
    String(
      formData.get('full_name') || ''
    ).trim();

  const email =
    String(
      formData.get('email') || ''
    )
      .trim()
      .toLowerCase();

  const phone =
    String(
      formData.get('phone') || ''
    ).trim();

  const password =
    String(
      formData.get('password') || ''
    );

  const confirmation =
    String(
      formData.get('confirm_password') || ''
    );

  if (!fullName) {
    throw new Error(
      'Enter your full name.'
    );
  }

  if (!email) {
    throw new Error(
      'Enter your email address.'
    );
  }

  if (
    !passwordLooksValid(
      password
    )
  ) {
    throw new Error(
      'Password must contain at least 8 characters.'
    );
  }

  if (
    password !== confirmation
  ) {
    throw new Error(
      'Passwords do not match.'
    );
  }

  const data =
    await signUpCustomer({
      fullName,
      email,
      phone,
      password
    });

  form.reset();

  /*
   * When email confirmation is enabled,
   * Supabase normally creates the account
   * without immediately returning a session.
   */
  if (!data?.session) {
    notify(
      'Account created. Check your email and confirm your account before signing in.',
      'success'
    );

    return;
  }

  window.location.replace(
    appUrl(
      'customer/dashboard.html'
    )
  );
}


async function handleForgotPassword(
  form,
  formData
) {
  const email =
    String(
      formData.get('email') || ''
    )
      .trim()
      .toLowerCase();

  if (!email) {
    throw new Error(
      'Enter your email address.'
    );
  }

  await sendPasswordReset(
    email
  );

  form.reset();

  /*
   * Keep the response generic to avoid
   * exposing whether an account exists.
   */
  notify(
    'If an account exists for that email address, password recovery instructions will be sent.',
    'success'
  );
}


async function handleResetPassword(
  formData
) {
  const password =
    String(
      formData.get('password') || ''
    );

  const confirmation =
    String(
      formData.get('confirm_password') || ''
    );

  if (
    !passwordLooksValid(
      password
    )
  ) {
    throw new Error(
      'Password must contain at least 8 characters.'
    );
  }

  if (
    password !== confirmation
  ) {
    throw new Error(
      'Passwords do not match.'
    );
  }

  await updatePassword(
    password
  );

  try {
    await signOut();

  } catch (error) {
    console.error(
      'Post-reset sign-out error:',
      error
    );
  }

  window.location.replace(
    appUrl(
      'login.html?reset=1'
    )
  );
}


function getAuthErrorMessage(
  mode,
  error
) {
  const code =
    String(
      error?.code || ''
    )
      .trim()
      .toLowerCase();

  const message =
    String(
      error?.message || ''
    ).trim();

  const lower =
    message.toLowerCase();

  if (
    code === 'email_not_confirmed' ||
    lower.includes(
      'email not confirmed'
    )
  ) {
    return 'Please confirm your email address before signing in.';
  }

  if (
    code === 'invalid_credentials' ||
    lower.includes(
      'invalid login credentials'
    )
  ) {
    return 'Incorrect email or password.';
  }

  if (
    lower.includes('suspended') ||
    lower.includes('banned')
  ) {
    return 'This account has been suspended.';
  }

  if (
    lower.includes('inactive')
  ) {
    return 'This account is currently inactive.';
  }

  if (
    lower.includes(
      'profile_missing'
    ) ||
    lower.includes(
      'profile record is missing'
    ) ||
    lower.includes(
      'profile could not be found'
    )
  ) {
    return 'Your account exists, but its customer profile could not be found.';
  }

  if (
    mode === 'login'
  ) {
    return authErrorMessage(
      error
    );
  }

  if (
    mode === 'forgot'
  ) {
    return 'Password recovery could not be started. Please try again later.';
  }

  if (
    mode === 'resend'
  ) {
    return (
      message ||
      'Unable to resend the verification email.'
    );
  }

  if (
    mode === 'reset'
  ) {
    return (
      message ||
      'Password could not be updated.'
    );
  }

  return (
    message ||
    'Unable to complete the request.'
  );
}
