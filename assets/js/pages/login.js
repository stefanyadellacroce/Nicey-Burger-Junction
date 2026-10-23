import {
  signIn,
  roleHome,
  authErrorMessage
} from '../core/auth.js';

import {
  requireGuest
} from '../core/guards.js';

import {
  notify,
  setBusy,
  parseQuery
} from '../core/utils.js';


function safeNextUrl(value) {
  if (!value) return null;

  try {
    const url =
      new URL(
        value,
        location.origin
      );

    if (
      url.origin !==
      location.origin
    ) {
      return null;
    }

    return (
      url.pathname +
      url.search +
      url.hash
    );

  } catch {
    return null;
  }
}


export async function init() {
  const guest =
    await requireGuest();

  if (!guest) {
    return;
  }

  const form =
    document.getElementById(
      'login-form'
    );

  const submit =
    document.getElementById(
      'login-submit'
    );

  const status =
    document.getElementById(
      'form-status'
    );

  if (!form) {
    console.error(
      'Login form not found.'
    );

    return;
  }

  const query =
    parseQuery();

  if (query.verified === '1') {
    notify(
      'Email verified. You can now sign in.',
      'success'
    );
  }

  if (query.reset === '1') {
    notify(
      'Password updated. Sign in with your new password.',
      'success'
    );
  }

  form.addEventListener(
    'submit',
    async event => {
      event.preventDefault();

      if (submit?.disabled) {
        return;
      }

      const formData =
        new FormData(form);

      const email =
        String(
          formData.get('email') ||
          ''
        )
          .trim()
          .toLowerCase();

      const password =
        String(
          formData.get('password') ||
          ''
        );

      if (!email) {
        if (status) {
          status.textContent =
            'Enter your email address.';
        }

        return;
      }

      if (!password) {
        if (status) {
          status.textContent =
            'Enter your password.';
        }

        return;
      }

      if (status) {
        status.textContent = '';
      }

      setBusy(
        submit,
        true,
        'Signing in…'
      );

      try {
        const result =
          await signIn({
            email,
            password
          });

        const profile =
          result.profile;

        const next =
          safeNextUrl(
            query.next
          );

        window.location.replace(
          next ||
          roleHome(
            profile?.role
          )
        );

      } catch (error) {
        console.error(
          'Login error:',
          error
        );

        const message =
          authErrorMessage(
            error
          );

        if (status) {
          status.textContent =
            message;
        }

        notify(
          message,
          'danger'
        );

        setBusy(
          submit,
          false
        );
      }
    }
  );
}