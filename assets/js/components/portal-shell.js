import { requireAuth } from '../core/guards.js';
import { signOut } from '../core/auth.js';
import { el } from '../core/dom.js';

const BRAND = Object.freeze({
  logo: '/assets/images/nicey-burger-logo-transparent.png',
  mascot: '/assets/images/nicey-mascot.png'
});

const nav = {
  operations: [
    ['Overview', [
      ['Dashboard', 'dashboard.html', 'speedometer2']
    ]],

    ['Orders', [
      ['Orders', 'orders.html', 'receipt'],
      ['Kitchen Queue', 'kitchen.html', 'fire'],
      ['Walk-in / POS', 'walk-in.html', 'calculator']
    ]],

    ['Finance', [
      ['Payments', 'payments.html', 'credit-card']
    ]],

    ['Customers', [
      ['Customers', 'customers.html', 'people']
    ]],

    ['Inventory', [
      ['Inventory', 'inventory.html', 'boxes']
    ]]
  ],

  admin: [
    ['Overview', [
      ['Dashboard', 'dashboard.html', 'speedometer2']
    ]],

    ['Orders', [
      ['Orders', 'orders.html', 'receipt'],
      ['Kitchen Queue', 'kitchen.html', 'fire'],
      ['Walk-in / POS', 'walk-in.html', 'calculator']
    ]],

    ['Customers', [
      ['Customers', 'customers.html', 'people']
    ]],

    ['Communication', [
      ['Inquiries', 'inquiries.html', 'envelope']
    ]],

    ['Menu', [
      ['Products', 'products.html', 'burger'],
      ['Categories', 'categories.html', 'grid'],
      ['Add-ons', 'addons.html', 'plus-circle'],
      ['Ingredients', 'ingredients.html', 'basket'],
      ['Recipes', 'recipes.html', 'journal-text']
    ]],

    ['Inventory', [
      ['Inventory', 'inventory.html', 'boxes'],
      ['Stock Movements', 'stock-movements.html', 'arrow-left-right'],
      ['Suppliers', 'suppliers.html', 'truck'],
      ['Purchase Orders', 'purchase-orders.html', 'clipboard-check']
    ]],

    ['Finance', [
      ['Payments', 'payments.html', 'credit-card'],
      ['Transactions', 'transactions.html', 'cash-stack'],
      ['Expenses', 'expenses.html', 'wallet2']
    ]],

    ['Marketing', [
      ['Promotions', 'promotions.html', 'tag']
    ]],

    ['Analytics', [
      ['Reports', 'reports.html', 'bar-chart'],
      ['Machine Learning', 'machine-learning.html', 'cpu']
    ]],

    ['Administration', [
      ['Users', 'users.html', 'person-gear'],
      ['Activity Logs', 'activity-logs.html', 'clock-history'],
      ['Settings', 'settings.html', 'gear'],
      ['Payment & Delivery', 'commerce-setup.html', 'sliders']
    ]]
  ]
};

function normalizePath(pathname = location.pathname) {
  return pathname
    .replace(/\/+/g, '/')
    .replace(/\/$/, '') || '/';
}

function resolvePortalHref(kind, href) {
  if (/^(https?:|mailto:|tel:|#)/i.test(href)) {
    return href;
  }

  if (href.startsWith('/')) {
    return href;
  }

  return `/${kind}/${href}`;
}

function isCurrentPage(target) {
  const current = normalizePath();

  const targetUrl = new URL(
    target,
    location.origin
  );

  return current === normalizePath(targetUrl.pathname);
}

function createBrandBlock(kind) {
  const brandLink = el(
    'a',
    {
      href: `/${kind}/dashboard.html`,
      className: 'portal-brand',
      'aria-label': `${kind === 'admin' ? 'Admin' : 'Staff'} dashboard`
    },
    el('img', {
      src: BRAND.logo,
      alt: 'Nicey Burger Junction',
      className: 'brand-logo portal-brand-logo',
      loading: 'eager',
      decoding: 'async'
    })
  );

  const roleLabel =
    kind === 'admin'
      ? 'Admin Portal'
      : 'Staff Portal';

  const portalIdentity = el(
    'div',
    {
      className: 'portal-brand-meta'
    },
    [
      el('span', {
        className: 'portal-brand-kicker',
        text: 'Nicey Burger Junction'
      }),

      el('strong', {
        className: 'portal-brand-role',
        text: roleLabel
      })
    ]
  );

  return el(
    'div',
    {
      className: 'portal-brand-wrap'
    },
    [
      brandLink,
      portalIdentity
    ]
  );
}

function createMascotPanel(profile, kind) {
  const firstName =
    (
      profile?.full_name ||
      profile?.email ||
      'Team'
    )
      .trim()
      .split(/\s+/)[0];

  const message =
    kind === 'admin'
      ? 'Keep Nicey running smoothly.'
      : 'Let’s serve something nice.';

  const label =
    kind === 'admin'
      ? 'ADMIN CONTROL'
      : 'STAFF TEAM';

  return el(
    'div',
    {
      className: 'portal-mascot-card'
    },
    [
      el('img', {
        src: BRAND.mascot,
        alt: '',
        className: 'portal-mascot',
        loading: 'lazy',
        decoding: 'async',
        'aria-hidden': 'true'
      }),

      el(
        'div',
        {
          className: 'portal-mascot-copy'
        },
        [
          el('small', {
            text: label
          }),

          el('strong', {
            text: `Hi, ${firstName}!`
          }),

          el('span', {
            text: message
          })
        ]
      )
    ]
  );
}

function createPortalNavigation(
  kind,
  closeSidebar
) {
  const portalNav = el(
    'nav',
    {
      className: 'portal-nav',
      'aria-label': `${kind} navigation`
    }
  );

  nav[kind].forEach(([group, items]) => {
    const wrap = el(
      'div',
      {
        className: 'portal-nav-group'
      },
      el('div', {
        className: 'portal-nav-title',
        text: group
      })
    );

    items.forEach(
      ([label, href, icon]) => {
        const target =
          resolvePortalHref(
            kind,
            href
          );

        const anchor = el(
          'a',
          {
            href: target
          },
          [
            el('i', {
              className: `bi bi-${icon}`,
              'aria-hidden': 'true'
            }),

            el('span', {
              text: label
            })
          ]
        );

        if (isCurrentPage(target)) {
          anchor.setAttribute(
            'aria-current',
            'page'
          );
        }

        anchor.addEventListener(
          'click',
          closeSidebar
        );

        wrap.append(anchor);
      }
    );

    portalNav.append(wrap);
  });

  return portalNav;
}

function setupResponsiveSidebar(
  sidebar,
  menuButton
) {
  if (!sidebar || !menuButton) {
    return () => {};
  }

  let backdrop =
    document.querySelector(
      '.portal-sidebar-backdrop'
    );

  if (!backdrop) {
    backdrop = el(
      'div',
      {
        className:
          'portal-sidebar-backdrop',
        'aria-hidden': 'true'
      }
    );

    document.body.append(backdrop);
  }

  const setOpen = open => {
    sidebar.classList.toggle(
      'open',
      open
    );

    backdrop.classList.toggle(
      'open',
      open
    );

    menuButton.setAttribute(
      'aria-expanded',
      String(open)
    );

    document.body.classList.toggle(
      'portal-nav-open',
      open
    );
  };

  const close = () => {
    setOpen(false);
  };

  menuButton.addEventListener(
    'click',
    () => {
      setOpen(
        !sidebar.classList.contains(
          'open'
        )
      );
    }
  );

  backdrop.addEventListener(
    'click',
    close
  );

  document.addEventListener(
    'keydown',
    event => {
      if (
        event.key === 'Escape' &&
        sidebar.classList.contains('open')
      ) {
        close();
        menuButton.focus();
      }
    }
  );

  window.addEventListener(
    'resize',
    () => {
      if (window.innerWidth > 1100) {
        close();
      }
    }
  );

  return close;
}

function createTopbar(
  profile,
  sidebar
) {
  const menu = el(
    'button',
    {
      className:
        'icon-btn portal-menu-toggle',
      type: 'button',
      'aria-label':
        'Toggle portal navigation',
      'aria-controls':
        'portal-sidebar',
      'aria-expanded': 'false'
    },
    el('i', {
      className: 'bi bi-list',
      'aria-hidden': 'true'
    })
  );

  const avatarText =
    (
      profile.full_name ||
      profile.email ||
      'N'
    )
      .trim()
      .charAt(0)
      .toUpperCase();

  const avatar = el(
    'span',
    {
      className:
        'portal-user-avatar',
      text: avatarText,
      'aria-hidden': 'true'
    }
  );

  const identity = el(
    'div',
    {
      className:
        'portal-user-copy'
    },
    [
      el('strong', {
        text:
          profile.full_name ||
          profile.email
      }),

      el('div', {
        className:
          'muted portal-role',
        text: profile.role
      })
    ]
  );

  const logout = el(
    'button',
    {
      className:
        'icon-btn portal-logout',
      type: 'button',
      'aria-label': 'Log out',
      title: 'Log out'
    },
    el('i', {
      className:
        'bi bi-box-arrow-right',
      'aria-hidden': 'true'
    })
  );

  logout.addEventListener(
    'click',
    async () => {
      logout.disabled = true;

      logout.setAttribute(
        'aria-busy',
        'true'
      );

      try {
        await signOut();
        location.replace('/');
      } finally {
        logout.disabled = false;

        logout.removeAttribute(
          'aria-busy'
        );
      }
    }
  );

  const user = el(
    'div',
    {
      className: 'portal-user'
    },
    [
      avatar,
      identity,
      logout
    ]
  );

  const closeSidebar =
    setupResponsiveSidebar(
      sidebar,
      menu
    );

  return {
    nodes: [
      menu,
      user
    ],

    closeSidebar
  };
}

export async function mountPortalShell(
  kind = 'operations'
) {
  if (!nav[kind]) {
    throw new Error(
      `Unknown portal shell kind: ${kind}`
    );
  }

  const roles =
    kind === 'admin'
      ? ['ADMIN']
      : [
          'STAFF',
          'MANAGER',
          'ADMIN'
        ];

  const sidebar =
    document.getElementById(
      'portal-sidebar'
    );

  const topbar =
    document.getElementById(
      'portal-topbar'
    );

  let closeSidebar = () => {};

  // Keep the page navigation in place while account validation runs.
  if (sidebar) {
    sidebar.setAttribute('aria-busy', 'true');
    if (!sidebar.querySelector('.portal-nav')) {
      sidebar.replaceChildren(
        createBrandBlock(kind),
        createPortalNavigation(kind, () => closeSidebar())
      );
    }
  }

  if (topbar && !topbar.hasChildNodes()) {
    topbar.replaceChildren(
      el('span', {
        className: 'portal-topbar-loading',
        text: 'Loading account…'
      })
    );
  }

  const profile =
    await requireAuth({
      roles
    });

  if (!profile) {
    return null;
  }

  // An admin opening a staff URL should stay in the admin portal.
  if (kind === 'operations' && profile.role === 'ADMIN') {
    const page = location.pathname.split('/').pop() || 'dashboard.html';
    location.replace(`/admin/${page}${location.search}${location.hash}`);
    return null;
  }

  /*
   * Build topbar first so the responsive
   * sidebar close handler is available.
   */
  if (topbar) {
    const sidebarWasOpen = sidebar?.classList.contains('open') || false;
    const topbarContent =
      createTopbar(
        profile,
        sidebar
      );

    if (sidebarWasOpen) {
      topbarContent.nodes[0].setAttribute('aria-expanded', 'true');
    }

    closeSidebar =
      topbarContent.closeSidebar;

    topbar.replaceChildren(
      ...topbarContent.nodes
    );
  }

  /*
   * Build sidebar.
   */
  if (sidebar) {
    sidebar.append(createMascotPanel(profile, kind));
    sidebar.removeAttribute('aria-busy');
  }

  return profile;
}
