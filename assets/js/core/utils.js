import {
  config
} from './config.js';

export const qs =
  (selector, root = document) =>
    root.querySelector(selector);

export const qsa =
  (selector, root = document) =>
    [...root.querySelectorAll(selector)];

export const escapeHtml =
  (value = '') =>
    String(value)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');

export function money(value = 0) {
  const number = Number(value);

  return new Intl.NumberFormat(
    config.currencyLocale,
    {
      style: 'currency',
      currency: config.currency,
      maximumFractionDigits: 2
    }
  ).format(
    Number.isFinite(number)
      ? number
      : 0
  );
}

export function formatDate(value, options = {}) {
  if (!value) {
    return '—';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '—';
  }

  return new Intl.DateTimeFormat(
    config.currencyLocale,
    {
      dateStyle: 'medium',
      timeStyle:
        options.dateOnly
          ? undefined
          : 'short'
    }
  ).format(date);
}

export function debounce(fn, wait = 250) {
  let timer = null;

  return (...args) => {
    window.clearTimeout(timer);

    timer = window.setTimeout(
      () => fn(...args),
      wait
    );
  };
}

export function safeText(node, value) {
  if (node) {
    node.textContent =
      value == null
        ? ''
        : String(value);
  }
}

export function setBusy(
  button,
  busy,
  busyLabel = 'Working…'
) {
  if (!button) {
    return;
  }

  if (busy) {
    if (!button.dataset.originalLabel) {
      button.dataset.originalLabel =
        button.textContent || '';
    }

    button.disabled = true;
    button.setAttribute(
      'aria-busy',
      'true'
    );
    button.textContent = busyLabel;

    return;
  }

  button.disabled = false;
  button.removeAttribute('aria-busy');

  if ('originalLabel' in button.dataset) {
    button.textContent =
      button.dataset.originalLabel;

    delete button.dataset.originalLabel;
  }
}

/* Compatibility alias used by the auth-page controllers. */
export function setButtonBusy(
  button,
  busy,
  busyLabel = 'Working…'
) {
  setBusy(
    button,
    busy,
    busyLabel
  );
}

export function setFormStatus(
  node,
  message = '',
  type = ''
) {
  if (!node) {
    return;
  }

  const text =
    String(message || '');

  node.textContent = text;
  node.hidden = !text;

  node.classList.remove(
    'is-success',
    'is-error',
    'is-info',
    'is-warning'
  );

  if (type) {
    node.dataset.status = type;

    if (text) {
      node.classList.add(
        `is-${type}`
      );
    }
  } else {
    delete node.dataset.status;
  }

  node.setAttribute(
    'role',
    type === 'error'
      ? 'alert'
      : 'status'
  );
}

export function passwordLooksValid(password) {
  return String(password || '').length >= 8;
}

export function getSafeNextUrl(value) {
  const raw =
    String(value || '').trim();

  if (!raw) {
    return null;
  }

  try {
    const url =
      new URL(
        raw,
        window.location.origin
      );

    if (
      url.origin !==
      window.location.origin
    ) {
      return null;
    }

    if (
      !['http:', 'https:']
        .includes(url.protocol)
    ) {
      return null;
    }

    return `${url.pathname}${url.search}${url.hash}`;

  } catch {
    return null;
  }
}

export function notify(
  message,
  type = 'info'
) {
  let region =
    document.getElementById(
      'toast-region'
    );

  if (!region) {
    region =
      document.createElement('div');

    region.id = 'toast-region';
    region.className = 'toast-region';
    region.setAttribute(
      'aria-live',
      'polite'
    );

    document.body.append(region);
  }

  const toast =
    document.createElement('div');

  toast.className =
    `nbj-toast is-${type}`;

  toast.setAttribute(
    'role',
    type === 'danger'
      ? 'alert'
      : 'status'
  );

  toast.textContent =
    String(message || '');

  region.append(toast);

  window.setTimeout(
    () => toast.remove(),
    4500
  );
}

export function parseQuery() {
  return Object.fromEntries(
    new URLSearchParams(
      window.location.search
    )
  );
}

export function uid() {
  return crypto.randomUUID();
}

export function clamp(number, min, max) {
  return Math.min(
    max,
    Math.max(min, number)
  );
}

export function normalizeError(error) {
  if (!error) {
    return 'Unknown error.';
  }

  return (
    error.message
    ||
    error.error_description
    ||
    String(error)
  );
}

function csvCell(value) {
  const text =
    value == null
      ? ''
      : typeof value === 'object'
        ? JSON.stringify(value)
        : String(value);

  return `"${text.replaceAll('"', '""')}"`;
}

export function toCsv(rows = []) {
  if (!Array.isArray(rows) || !rows.length) {
    return '';
  }

  const keys =
    [...new Set(
      rows.flatMap(
        row =>
          Object.keys(row || {})
      )
    )];

  return [
    keys.map(csvCell).join(','),
    ...rows.map(
      row =>
        keys
          .map(
            key =>
              csvCell(row?.[key])
          )
          .join(',')
    )
  ].join('\n');
}

export function downloadText(
  filename,
  text,
  mimeType = 'text/plain;charset=utf-8'
) {
  const blob =
    new Blob(
      [text],
      {
        type: mimeType
      }
    );

  const url =
    URL.createObjectURL(blob);

  const anchor =
    document.createElement('a');

  anchor.href = url;
  anchor.download = filename;

  document.body.append(anchor);
  anchor.click();
  anchor.remove();

  window.setTimeout(
    () => URL.revokeObjectURL(url),
    0
  );
}

export function downloadCsv(
  filename,
  rows
) {
  if (!rows?.length) {
    notify(
      'There is no data to export.',
      'warning'
    );

    return;
  }

  downloadText(
    filename,
    toCsv(rows),
    'text/csv;charset=utf-8'
  );
}

export function requireValue(
  formData,
  key,
  label = key
) {
  const value =
    String(
      formData.get(key) || ''
    ).trim();

  if (!value) {
    throw new Error(
      `${label} is required.`
    );
  }

  return value;
}
