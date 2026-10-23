import { signOut } from '../core/auth.js';
import { el } from '../core/dom.js';

const ACCOUNT_LINKS = [
  ['Dashboard', '/customer/dashboard.html', 'grid-1x2'],
  ['Orders', '/customer/orders.html', 'receipt'],
  ['Favorites', '/customer/favorites.html', 'heart'],
  ['Notifications', '/customer/notifications.html', 'bell'],
  ['Addresses', '/customer/addresses.html', 'geo-alt'],
  ['Profile', '/customer/profile.html', 'person']
];

const SHOP_LINKS = [
  ['Cart', '/customer/cart.html', 'bag'],
  ['Browse menu', '/menu.html', 'shop']
];

function activeDestination() {
  const path = location.pathname;

  if (
    path.endsWith('/order-details.html') ||
    path.endsWith('/order-confirmation.html')
  ) {
    return '/customer/orders.html';
  }

  if (path.endsWith('/checkout.html')) {
    return '/customer/cart.html';
  }

  return path;
}

function createLinks(items, close) {
  return items.map(([label, href, icon]) => {
    const link = el('a', { href }, [
      el('i', {
        className: `bi bi-${icon}`,
        'aria-hidden': 'true'
      }),
      el('span', { text: label })
    ]);

    if (activeDestination() === href) {
      link.setAttribute('aria-current', 'page');
    }

    link.addEventListener('click', close);
    return link;
  });
}

export function mountCustomerSidebar(actions) {
  if (!document.body.classList.contains('customer-shell')) {
    return;
  }

  const previousSidebar = document.getElementById('customer-sidebar');
  const previousBackdrop = document.querySelector('.customer-sidebar-backdrop');
  const wasOpen = previousSidebar?.classList.contains('is-open') || false;

  const sidebar = el('aside', {
    id: 'customer-sidebar',
    className: 'customer-sidebar',
    'aria-label': 'Customer account navigation'
  });

  const backdrop = el('div', {
    className: 'customer-sidebar-backdrop',
    'aria-hidden': 'true'
  });

  const toggle = el('button', {
    type: 'button',
    className: 'icon-btn customer-sidebar-toggle',
    'aria-label': 'Open account navigation',
    'aria-controls': 'customer-sidebar',
    'aria-expanded': 'false'
  }, el('i', {
    className: 'bi bi-list',
    'aria-hidden': 'true'
  }));

  function setOpen(open) {
    const compact = window.innerWidth <= 900;
    const visible = compact && open;

    sidebar.classList.toggle('is-open', visible);
    backdrop.classList.toggle('is-open', visible);
    document.body.classList.toggle('customer-sidebar-open', visible);
    sidebar.inert = compact && !visible;
    toggle.setAttribute('aria-expanded', String(visible));
    toggle.setAttribute(
      'aria-label',
      visible ? 'Close account navigation' : 'Open account navigation'
    );
  }

  const close = () => setOpen(false);
  const closeButton = el('button', {
    type: 'button',
    className: 'customer-sidebar-close',
    'aria-label': 'Close account navigation'
  }, el('i', {
    className: 'bi bi-x-lg',
    'aria-hidden': 'true'
  }));

  closeButton.addEventListener('click', close);
  toggle.addEventListener('click', () => {
    setOpen(!sidebar.classList.contains('is-open'));
  });
  backdrop.addEventListener('click', close);

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && sidebar.classList.contains('is-open')) {
      close();
      toggle.focus();
    }
  });

  window.addEventListener('resize', close, { passive: true });

  const accountNav = el('nav', {
    className: 'customer-sidebar-nav',
    'aria-label': 'Account pages'
  }, createLinks(ACCOUNT_LINKS, close));

  const shopNav = el('nav', {
    className: 'customer-sidebar-nav',
    'aria-label': 'Shopping links'
  }, createLinks(SHOP_LINKS, close));

  const signOutButton = el('button', {
    type: 'button',
    className: 'customer-sidebar-signout'
  }, [
    el('i', {
      className: 'bi bi-box-arrow-right',
      'aria-hidden': 'true'
    }),
    el('span', { text: 'Sign out' })
  ]);

  signOutButton.addEventListener('click', async () => {
    if (signOutButton.disabled) return;

    signOutButton.disabled = true;

    try {
      await signOut();
      location.href = '/';
    } catch (error) {
      console.error('Unable to sign out:', error);
      signOutButton.disabled = false;
    }
  });

  sidebar.append(
    el('div', { className: 'customer-sidebar-heading' }, [
      el('div', {}, [
        el('small', { text: 'NICEY BURGER JUNCTION' }),
        el('strong', { text: 'My account' })
      ]),
      closeButton
    ]),
    el('span', {
      className: 'customer-sidebar-label',
      text: 'ACCOUNT'
    }),
    accountNav,
    el('span', {
      className: 'customer-sidebar-label',
      text: 'SHOP'
    }),
    shopNav,
    signOutButton
  );

  if (previousSidebar) {
    previousSidebar.replaceWith(sidebar);
  } else {
    document.body.prepend(sidebar);
  }

  if (previousBackdrop) {
    previousBackdrop.replaceWith(backdrop);
  } else {
    document.body.prepend(backdrop);
  }

  actions.prepend(toggle);
  setOpen(wasOpen);
}
