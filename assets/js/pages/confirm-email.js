import {
  requireSupabase
} from '../core/supabase.js';

import {
  notify,
  setBusy
} from '../core/utils.js';


export async function init() {
  const button =
    document.getElementById(
      'confirm-email-button'
    );

  const status =
    document.getElementById(
      'confirmation-status'
    );

  if (!button) {
    return;
  }

  const params =
    new URLSearchParams(
      window.location.search
    );

  const tokenHash =
    params.get('token_hash');

  const type =
    params.get('type') || 'email';


  if (!tokenHash) {
    status.textContent =
      'This confirmation link is invalid or incomplete.';

    button.disabled = true;

    return;
  }


  button.addEventListener(
    'click',
    async () => {
      if (button.disabled) {
        return;
      }

      setBusy(
        button,
        true,
        'Confirming…'
      );

      status.textContent = '';

      try {
        const supabase =
          await requireSupabase();

        const {
          error
        } =
          await supabase.auth.verifyOtp({
            token_hash:
              tokenHash,

            type:
              type
          });

        if (error) {
          throw error;
        }

        status.textContent =
          'Email confirmed successfully. Redirecting to sign in…';

        notify(
          'Your account has been verified.',
          'success'
        );

        setTimeout(
          () => {
            window.location.replace(
              '/login.html?verified=1'
            );
          },
          900
        );

      } catch (error) {
        console.error(
          'Email confirmation error:',
          error
        );

        status.textContent =
          error?.message ||
          'Unable to confirm this account.';

        notify(
          status.textContent,
          'danger'
        );

        setBusy(
          button,
          false
        );
      }
    }
  );
}