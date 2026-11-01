
import { getSupabase } from '../core/supabase.js';

// Keep navigation mounted and update only page content.
export function enablePersistentNavigation({ area, onNavigate }) {
  const base = `/${area}/`;
  let navigationId = 0;
  let requestController = null;
  let mountedUrl = location.href;

  const validUrl = url =>
    url.origin === location.origin &&
    url.pathname.startsWith(base) &&
    url.pathname.endsWith('.html');

  const activePage = path => {
    if (/\/order-(details|confirmation)\.html$/.test(path)) {
      return `${base}orders.html`;
    }

    if (area === 'customer' && path.endsWith('/checkout.html')) {
      return `${base}cart.html`;
    }

    return path;
  };

  function markActive(path) {
    const active = activePage(path);

    const sidebar = area === 'customer'
      ? document.getElementById('customer-sidebar')
      : document.getElementById('portal-sidebar');

    sidebar?.querySelectorAll('nav a[href]').forEach(link => {
      const selected = new URL(link.href).pathname === active;

      if (selected) {
        link.setAttribute('aria-current', 'page');
      } else {
        link.removeAttribute('aria-current');
      }
    });
  }

  async function navigate(url, { addHistory = true } = {}) {
    const destination = new URL(url, location.href);

    if (!validUrl(destination)) {
      location.assign(destination.href);
      return;
    }

    const id = ++navigationId;

    requestController?.abort();

    const controller = new AbortController();
    requestController = controller;

    const currentMain = document.getElementById('main-content');

    if (!currentMain) {
      location.assign(destination.href);
      return;
    }

    currentMain.setAttribute('aria-busy', 'true');

    try {
      const response = await fetch(destination.href, {
        signal: controller.signal,
        credentials: 'same-origin',
        headers: {
          Accept: 'text/html'
        }
      });

      if (
        !response.ok ||
        !response.headers.get('content-type')?.includes('text/html')
      ) {
        throw new Error('Unable to load page');
      }

      const html = await response.text();

      const doc = new DOMParser().parseFromString(
        html,
        'text/html'
      );

      const nextMain = doc.getElementById('main-content');

      const correctArea = area === 'customer'
        ? (
            doc.body.classList.contains('customer-shell') ||
            destination.pathname === '/customer/cart.html'
          )
        : doc.body.dataset.portal === area;

      if (!nextMain || !correctArea || id !== navigationId) {
        if (id === navigationId) {
          location.assign(destination.href);
        }
        return;
      }

      // Load CSS required by the destination page.
      const styles = [
        ...doc.querySelectorAll(
          'head link[rel="stylesheet"][href^="/assets/css/"]'
        )
      ];

      await Promise.all(
        styles.map(link => new Promise(resolve => {
          const href = link.getAttribute('href');

          if (
            document.querySelector(
              `head link[rel="stylesheet"][href="${href}"]`
            )
          ) {
            resolve();
            return;
          }

          const sheet = document.createElement('link');

          sheet.rel = 'stylesheet';
          sheet.href = href;
          sheet.media = link.media || 'all';
          sheet.onload = resolve;
          sheet.onerror = resolve;

          document.head.append(sheet);
        }))
      );

      if (id !== navigationId) return;

      // Clean up listeners, charts and realtime subscriptions.
      window.dispatchEvent(new Event('nicey:page-leave'));

      document.querySelectorAll('#main-content canvas').forEach(canvas => {
        canvas.__chart?.destroy?.();
        canvas.__chart = null;
      });

      const client = await getSupabase().catch(() => null);

      await Promise.allSettled(
        (client?.getChannels?.() || []).map(channel =>
          client.removeChannel(channel)
        )
      );

      if (id !== navigationId) return;

      // Replace content, not the navigation or topbar.
      document.getElementById('main-content').replaceWith(
        document.importNode(nextMain, true)
      );

      document.title = doc.title;
      document.body.dataset.controller =
        doc.body.dataset.controller || '';
      document.body.dataset.entity =
        doc.body.dataset.entity || '';

      if (addHistory) {
        history.pushState({}, '', destination.href);
      }

      mountedUrl = destination.href;

      document.querySelector('#toast-region')?.replaceChildren();

      // Close mobile navigation after selecting a page.
      document.querySelector('#portal-sidebar')
        ?.classList.remove('open');

      document.querySelector('.portal-sidebar-backdrop')
        ?.classList.remove('open');

      document.querySelector('#customer-sidebar')
        ?.classList.remove('is-open');

      document.querySelector('.customer-sidebar-backdrop')
        ?.classList.remove('is-open');

      document.body.classList.remove(
        'portal-nav-open',
        'customer-sidebar-open'
      );

      document.querySelector('.portal-menu-toggle')
        ?.setAttribute('aria-expanded', 'false');

      document.querySelector('.customer-sidebar-toggle')
        ?.setAttribute('aria-expanded', 'false');

      // Update the selected item immediately.
      markActive(destination.pathname);

      // Reset page content scroll without resetting sidebar scroll.
      window.scrollTo({
        top: 0,
        left: 0,
        behavior: 'instant'
      });

      // Initialize the destination page controller.
      await onNavigate();

    } catch (error) {
      if (error.name !== 'AbortError' && id === navigationId) {
        console.error('Navigation failed:', error);

        // Safely fall back to normal navigation.
        location.assign(destination.href);
      }

    } finally {
      if (id === navigationId) {
        document.getElementById('main-content')
          ?.removeAttribute('aria-busy');
      }
    }
  }

  document.addEventListener('click', event => {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }

    const link = event.target.closest?.('a[href]');

    if (
      !link ||
      (link.target && link.target !== '_self') ||
      link.hasAttribute('download')
    ) {
      return;
    }

    const url = new URL(link.href, location.href);

    if (!validUrl(url)) return;

    if (
      url.pathname === location.pathname &&
      url.search === location.search
    ) {
      return;
    }

    event.preventDefault();
    void navigate(url.href);
  });

  // Support browser Back and Forward buttons.
  window.addEventListener('popstate', () => {
    const url = new URL(location.href);
    const previous = new URL(mountedUrl);

    if (
      url.pathname === previous.pathname &&
      url.search === previous.search
    ) {
      return;
    }

    if (validUrl(url)) {
      void navigate(location.href, {
        addHistory: false
      });
    } else {
      location.reload();
    }
  });
}
