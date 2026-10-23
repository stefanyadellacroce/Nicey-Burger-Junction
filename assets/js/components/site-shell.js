import {
  getProfile,
  signOut
} from '../core/auth.js';

import {
  getCartCount
} from '../services/cart.js';

import {
  getPublicSettings
} from '../services/settings.js';

import {
  el
} from '../core/dom.js';

import {
  mountCustomerSidebar
} from './customer-sidebar.js';


/* =========================================================
   BRAND
   ========================================================= */

const BRAND = Object.freeze({
  logo: '/assets/images/nicey-burger-logo-transparent.png'
});


/* =========================================================
   PUBLIC NAVIGATION
   ========================================================= */

const PUBLIC_NAV = Object.freeze([
  {
    label: 'Home',
    section: 'home-section',
    href: '/'
  },
  {
    label: 'Menu',
    section: 'menu',
    href: '/menu.html'
  },
  {
    label: 'Promotions',
    section: 'promotions',
    href: '/promotions.html'
  },
  {
    label: 'About',
    section: 'about',
    href: '/about.html'
  },
  {
    label: 'Contact',
    section: 'contact',
    href: '/contact.html'
  }
]);


/* =========================================================
   PATH HELPERS
   ========================================================= */

function normalizePath(
  pathname = location.pathname
) {
  return pathname
    .replace(/\/+/g, '/')
    .replace(/\/index\.html$/, '/')
    .replace(/\/$/, '') || '/';
}


function sectionHref(
  sectionId
) {
  return PUBLIC_NAV.find(
    item => item.section === sectionId
  )?.href || '/';
}


/* =========================================================
   ACCOUNT ROUTING
   ========================================================= */

function accountDestination(
  profile
) {
  if (
    profile?.role === 'ADMIN'
  ) {
    return '/admin/dashboard.html';
  }


  if (
    profile?.role === 'STAFF' ||
    profile?.role === 'MANAGER'
  ) {
    return '/operations/dashboard.html';
  }


  return '/customer/dashboard.html';
}


/* =========================================================
   LOGO
   ========================================================= */

function createLogo() {
  const accountPage =
    document.body.classList.contains('customer-shell') ||
    document.body.classList.contains('customer-access-page');

  return el(
    'a',
    {
      href: accountPage
        ? '/customer/dashboard.html'
        : sectionHref('home-section'),

      className:
        'brand-link premium-brand',

      'aria-label': accountPage
        ? 'Customer dashboard'
        : 'Nicey Burger Junction home'
    },

    el('img', {
      src:
        BRAND.logo,

      alt:
        'Nicey Burger Junction',

      className:
        'brand-logo premium-brand-logo',

      loading:
        'eager',

      decoding:
        'async'
    })
  );
}


/* =========================================================
   DESKTOP NAVIGATION
   ========================================================= */

function createDesktopNavigation() {
  const nav = el(
    'nav',
    {
      id:
        'main-nav',

      className:
        'main-nav premium-desktop-nav',

      'aria-label':
        'Primary navigation'
    }
  );


  PUBLIC_NAV.forEach(
    item => {
      const isActive =
        normalizePath() === normalizePath(item.href);

      const link = el(
        'a',
        {
          href:
            sectionHref(
              item.section
            ),

          className:
            `premium-nav-link ${
              isActive
                ? 'is-active'
                : ''
            }`,

          'data-nav-section':
            item.section
        },

        item.label
      );


      if (isActive) {
        link.setAttribute(
          'aria-current',
          'page'
        );
      }


      nav.append(
        link
      );
    }
  );


  return nav;
}


/* =========================================================
   MOBILE NAVIGATION
   ========================================================= */

function createMobileNavigation() {
  const inner = el(
    'div',
    {
      className:
        'container-nbj premium-mobile-menu-inner'
    }
  );


  PUBLIC_NAV.forEach(
    (
      item,
      index
    ) => {
      const isActive =
        normalizePath() === normalizePath(item.href);

      inner.append(
        el(
          'a',
          {
            href:
              sectionHref(
                item.section
              ),

            className:
              `premium-mobile-link ${
                isActive
                  ? 'is-active'
                  : ''
              }`,

            'data-mobile-section':
              item.section
          },

          [
            el('span', {
              className:
                'premium-mobile-number',

              text:
                String(index + 1)
                  .padStart(
                    2,
                    '0'
                  )
            }),

            el('strong', {
              text:
                item.label
            }),

            el('i', {
              className:
                'bi bi-arrow-right',

              'aria-hidden':
                'true'
            })
          ]
        )
      );
    }
  );


  inner.append(
    el('div', {
      id:
        'mobile-account-area',

      className:
        'premium-mobile-account-area'
    })
  );


  return el(
    'nav',
    {
      id:
        'premium-mobile-menu',

      className:
        'premium-mobile-menu',

      'aria-label':
        'Mobile navigation'
    },

    inner
  );
}


/* =========================================================
   SECTION PROGRESS
   ========================================================= */

function createSectionProgress() {
  const track = el(
    'div',
    {
      className:
        'premium-progress-track'
    }
  );


  PUBLIC_NAV.forEach(
    (
      item,
      index
    ) => {
      track.append(
        el(
          'a',
          {
            href:
              sectionHref(
                item.section
              ),

            className:
              `premium-progress-step ${
                index === 0
                  ? 'is-active'
                  : ''
              }`,

            'data-progress-section':
              item.section,

            'aria-label':
              `Go to ${item.label}`
          },

          el('span', {})
        )
      );
    }
  );


  const inner = el(
    'div',
    {
      className:
        'premium-progress-inner'
    },

    [
      el('span', {
        id:
          'premium-progress-number',

        className:
          'premium-progress-number',

        text:
          '01'
      }),

      el('span', {
        id:
          'premium-progress-label',

        className:
          'premium-progress-label',

        text:
          'HOME'
      }),

      track
    ]
  );


  return el(
    'div',
    {
      className:
        'premium-section-progress'
    },

    inner
  );
}


/* =========================================================
   CART
   ========================================================= */

function createCartButton() {
  return el(
    'a',
    {
      href:
        '/customer/cart.html',

      className:
        'icon-btn cart-button premium-cart-button',

      'aria-label':
        'Shopping cart'
    },

    [
      el('i', {
        className:
          'bi bi-bag',

        'aria-hidden':
          'true'
      }),

      el('span', {
        id:
          'cart-count',

        className:
          'cart-count premium-cart-count is-empty',

        text:
          '0',

        'aria-label':
          '0 items in cart'
      })
    ]
  );
}


/* =========================================================
   DESKTOP ACCOUNT
   ========================================================= */

function createAccountButton(
  profile
) {
  const displayName =
    profile?.full_name?.trim() ||
    'Account';


  return el(
    'a',
    {
      href:
        accountDestination(
          profile
        ),

      className:
        'site-account-button premium-account-button'
    },

    [
      el('span', {
        className:
          'site-account-avatar',

        text:
          displayName
            .charAt(0)
            .toUpperCase(),

        'aria-hidden':
          'true'
      }),

      el('span', {
        className:
          'account-label',

        text:
          displayName
      })
    ]
  );
}


/* =========================================================
   LOGIN
   ========================================================= */

function createLoginButton() {
  return el(
    'a',
    {
      href:
        '/login.html',

      className:
        'site-login-link premium-login-button'
    },

    [
      el('i', {
        className:
          'bi bi-person',

        'aria-hidden':
          'true'
      }),

      el('span', {
        text:
          'Sign in'
      })
    ]
  );
}


/* =========================================================
   LOGOUT
   ========================================================= */

function attachLogout(
  button
) {
  let signingOut =
    false;


  button.addEventListener(
    'click',

    async () => {
      if (
        signingOut
      ) {
        return;
      }


      signingOut =
        true;


      button.disabled =
        true;


      button.setAttribute(
        'aria-busy',
        'true'
      );


      try {
        await signOut();

        location.href =
          '/';

      } catch (
        error
      ) {
        console.error(
          'Unable to sign out:',
          error
        );


        signingOut =
          false;


        button.disabled =
          false;


        button.removeAttribute(
          'aria-busy'
        );
      }
    }
  );


  return button;
}


function createLogoutButton() {
  return attachLogout(
    el(
      'button',
      {
        className:
          'icon-btn site-logout premium-logout-button',

        type:
          'button',

        'aria-label':
          'Log out',

        title:
          'Log out'
      },

      el('i', {
        className:
          'bi bi-box-arrow-right',

        'aria-hidden':
          'true'
      })
    )
  );
}


/* =========================================================
   MOBILE ACCOUNT
   ========================================================= */

function createMobileLogin() {
  return el(
    'a',
    {
      href:
        '/login.html',

      className:
        'premium-mobile-link premium-mobile-auth-link'
    },

    [
      el('span', {
        className:
          'premium-mobile-auth-icon'

      }, el('i', {
        className:
          'bi bi-person-circle',

        'aria-hidden':
          'true'
      })),
      el('span', {
        className:
          'premium-mobile-auth-copy'
      }, [
        el('strong', { text: 'Sign in' }),
        el('small', { text: 'Access your account' })
      ]),

      el('i', {
        className:
          'bi bi-arrow-right',

        'aria-hidden':
          'true'
      })
    ]
  );
}


function createMobileAccount(
  profile
) {
  const displayName =
    profile?.full_name?.trim() ||
    'My account';


  return el(
    'a',
    {
      href:
        accountDestination(
          profile
        ),

      className:
        'premium-mobile-link premium-mobile-auth-link'
    },

    [
      el('span', {
        className:
          'premium-mobile-auth-icon'

      }, el('i', {
        className:
          'bi bi-person-circle',

        'aria-hidden':
          'true'
      })),
      el('span', {
        className:
          'premium-mobile-auth-copy'
      }, [
        el('strong', { text: displayName }),
        el('small', { text: 'View your account' })
      ]),

      el('i', {
        className:
          'bi bi-arrow-right',

        'aria-hidden':
          'true'
      })
    ]
  );
}


function createMobileLogout() {
  return attachLogout(
    el(
      'button',
      {
        type:
          'button',

        className:
          'premium-mobile-link premium-mobile-logout'
      },

      [
        el('span', {
          className:
            'premium-mobile-number',

          text:
            'EX'
        }),

        el('strong', {
          text:
            'Log out'
        }),

        el('i', {
          className:
            'bi bi-box-arrow-right',

          'aria-hidden':
            'true'
        })
      ]
    )
  );
}


/* =========================================================
   MOBILE BURGER
   ========================================================= */

function createMobileToggle(
  mobileNavigation
) {
  const toggle = el(
    'button',
    {
      id:
        'premium-mobile-toggle',

      className:
        'mobile-nav-toggle premium-mobile-toggle',

      type:
        'button',

      'aria-controls':
        'premium-mobile-menu',

      'aria-expanded':
        'false',

      'aria-label':
        'Open navigation'
    },

    [
      el('span', {}),
      el('span', {}),
      el('span', {})
    ]
  );


  function isOpen() {
    return mobileNavigation
      .classList
      .contains(
        'is-open'
      );
  }


  function closeNavigation() {
    mobileNavigation
      .classList
      .remove(
        'is-open'
      );


    toggle
      .classList
      .remove(
        'is-open'
      );


    toggle.setAttribute(
      'aria-expanded',
      'false'
    );


    toggle.setAttribute(
      'aria-label',
      'Open navigation'
    );
  }


  function openNavigation() {
    mobileNavigation
      .classList
      .add(
        'is-open'
      );


    toggle
      .classList
      .add(
        'is-open'
      );


    toggle.setAttribute(
      'aria-expanded',
      'true'
    );


    toggle.setAttribute(
      'aria-label',
      'Close navigation'
    );
  }


  toggle.addEventListener(
    'click',

    event => {
      event.preventDefault();
      event.stopPropagation();


      if (
        isOpen()
      ) {
        closeNavigation();
      } else {
        openNavigation();
      }
    }
  );


  mobileNavigation.addEventListener(
    'click',
    event => {
      if (event.target.closest?.('a')) {
        closeNavigation();
      }
    }
  );


  document.addEventListener(
    'click',

    event => {
      if (
        !isOpen()
      ) {
        return;
      }


      if (
        toggle.contains(
          event.target
        ) ||
        mobileNavigation.contains(
          event.target
        )
      ) {
        return;
      }


      closeNavigation();
    }
  );


  document.addEventListener(
    'keydown',

    event => {
      if (
        event.key ===
        'Escape'
      ) {
        closeNavigation();
      }
    }
  );


  window.addEventListener(
    'resize',

    () => {
      if (
        window.innerWidth >
        900
      ) {
        closeNavigation();
      }
    },

    {
      passive:
        true
    }
  );


  return toggle;
}


/* =========================================================
   HEADER ACTIONS
   FIX:
   Does NOT wait for getProfile().
   Navbar renders immediately.
   ========================================================= */

function createHeaderActions(
  mobileNavigation
) {
  const customerAccountPage =
    document.body.classList.contains('customer-shell');

  const actions = el(
    'div',
    {
      className:
        'header-actions premium-nav-actions'
    }
  );


  const cart =
    createCartButton();


  const loginButton =
    createLoginButton();


  const mobileLogin =
    createMobileLogin();

  const accountPlaceholder = customerAccountPage
    ? createAccountButton({ role: 'CUSTOMER', full_name: 'My account' })
    : null;

  const mobileAccountPlaceholder = customerAccountPage
    ? createMobileAccount({ role: 'CUSTOMER', full_name: 'My account' })
    : null;


  const toggle =
    createMobileToggle(
      mobileNavigation
    );


  const mobileAccountArea =
    mobileNavigation
      .querySelector(
        '#mobile-account-area'
      );


  /*
   * Render controls immediately.
   * No Supabase waiting here.
   */

  if (customerAccountPage) {
    actions.append(cart, accountPlaceholder, createLogoutButton(), toggle);
    mobileAccountArea?.append(mobileAccountPlaceholder, createMobileLogout());
  } else {
    actions.append(cart, loginButton, toggle);
    mobileAccountArea?.append(mobileLogin);
  }


  /*
   * Load profile in background.
   * Navbar remains fully usable.
   */

  getProfile()
    .then(
      profile => {
        if (
          !profile
        ) {
          return;
        }

        if (customerAccountPage) {
          if (accountPlaceholder?.isConnected) {
            accountPlaceholder.replaceWith(createAccountButton(profile));
          }

          if (mobileAccountPlaceholder?.isConnected) {
            mobileAccountPlaceholder.replaceWith(createMobileAccount(profile));
          }

          return;
        }


        if (
          loginButton.isConnected
        ) {
          loginButton.replaceWith(
            createAccountButton(
              profile
            ),

            createLogoutButton()
          );
        }


        if (
          mobileLogin.isConnected
        ) {
          mobileLogin.replaceWith(
            createMobileAccount(
              profile
            ),

            createMobileLogout()
          );
        }
      }
    )
    .catch(
      error => {
        console.warn(
          'Unable to load profile:',
          error
        );
      }
    );


  return actions;
}


/* =========================================================
   ACTIVE NAVIGATION STATE
   ========================================================= */

function setActiveSection(
  header,
  sectionId
) {
  const index =
    PUBLIC_NAV.findIndex(
      item =>
        item.section ===
        sectionId
    );


  if (
    index < 0
  ) {
    return;
  }

  const currentType =
    normalizePath() === '/' &&
    sectionId !== 'home-section'
      ? 'location'
      : 'page';


  header
    .querySelectorAll(
      '[data-nav-section]'
    )
    .forEach(
      link => {
        const active =
          link.dataset
            .navSection ===
          sectionId;


        link.classList.toggle(
          'is-active',
          active
        );


        if (
          active
        ) {
          link.setAttribute(
            'aria-current',
            currentType
          );
        } else {
          link.removeAttribute(
            'aria-current'
          );
        }
      }
    );


  header
    .querySelectorAll(
      '[data-mobile-section]'
    )
    .forEach(
      link => {
        const active =
          link.dataset.mobileSection === sectionId;

        link.classList.toggle('is-active', active);

        if (active) {
          link.setAttribute('aria-current', currentType);
        } else {
          link.removeAttribute('aria-current');
        }
      }
    );


  header
    .querySelectorAll(
      '[data-progress-section]'
    )
    .forEach(
      (
        step,
        stepIndex
      ) => {
        step.classList.toggle(
          'is-active',

          stepIndex ===
            index
        );


        step.classList.toggle(
          'is-complete',

          stepIndex <
            index
        );

        if (stepIndex === index) {
          step.setAttribute('aria-current', currentType);
        } else {
          step.removeAttribute('aria-current');
        }
      }
    );


  const number =
    header.querySelector(
      '#premium-progress-number'
    );


  const label =
    header.querySelector(
      '#premium-progress-label'
    );


  if (
    number
  ) {
    number.textContent =
      String(
        index + 1
      ).padStart(
        2,
        '0'
      );
  }


  if (
    label
  ) {
    label.textContent =
      PUBLIC_NAV[
        index
      ].label.toUpperCase();
  }
}


/* =========================================================
   CURRENT PAGE
   ========================================================= */

function setCurrentPage(
  header
) {
  const currentPage = PUBLIC_NAV.find(
    item => normalizePath(item.href) === normalizePath()
  );

  if (currentPage) {
    setActiveSection(header, currentPage.section);
  }
}


function trackHomeSections(
  header
) {
  if (normalizePath() !== '/') {
    return;
  }

  const sections = PUBLIC_NAV.map(item => ({
    section: item.section,
    element: document.getElementById(item.section)
  })).filter(item => item.element);

  if (!sections.length) {
    return;
  }

  let activeSection =
    header.querySelector('[data-nav-section].is-active')
      ?.dataset.navSection || '';
  let frame = 0;

  function update() {
    frame = 0;

    const headerBottom =
      header.getBoundingClientRect().bottom;
    const focusLine =
      headerBottom + Math.min(
        Math.max(0, window.innerHeight - headerBottom) * .28,
        180
      );
    let visibleSection = sections[0].section;

    sections.forEach(item => {
      if (item.element.getBoundingClientRect().top <= focusLine) {
        visibleSection = item.section;
      }
    });

    if (
      window.scrollY + window.innerHeight >=
      document.documentElement.scrollHeight - 2
    ) {
      visibleSection = sections[sections.length - 1].section;
    }

    if (visibleSection !== activeSection) {
      activeSection = visibleSection;
      setActiveSection(header, visibleSection);
    }
  }

  function schedule() {
    if (!frame) {
      frame = window.requestAnimationFrame(update);
    }
  }

  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule, { passive: true });
  window.addEventListener('load', schedule, { once: true });
  window.addEventListener('pageshow', schedule);

  if ('ResizeObserver' in window) {
    const observer = new ResizeObserver(schedule);
    sections.forEach(item => observer.observe(item.element));
  }

  schedule();
}


function avoidCurrentPageReload(
  header
) {
  header.querySelectorAll(
    '[data-nav-section], [data-mobile-section], [data-progress-section], .premium-brand'
  ).forEach(link => {
    const destination = new URL(link.href);

    if (
      destination.origin !== location.origin ||
      normalizePath(destination.pathname) !== normalizePath() ||
      destination.search ||
      destination.hash
    ) {
      return;
    }

    link.addEventListener('click', event => {
      if (
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }

      event.preventDefault();
      window.scrollTo(0, 0);
    });
  });
}


/* =========================================================
   CART COUNT
   Runs in background.
   ========================================================= */

async function updateCartCount() {
  const cartCount =
    document.getElementById(
      'cart-count'
    );


  if (
    !cartCount
  ) {
    return;
  }


  try {
    const count =
      await getCartCount();


    const safeCount =
      Math.max(
        0,
        Number(count) || 0
      );


    cartCount.textContent =
      safeCount > 99
        ? '99+'
        : String(
            safeCount
          );


    cartCount.setAttribute(
      'aria-label',

      `${safeCount} ${
        safeCount === 1
          ? 'item'
          : 'items'
      } in cart`
    );


    cartCount.classList.toggle(
      'is-empty',
      safeCount === 0
    );

  } catch (
    error
  ) {
    console.warn(
      'Unable to update cart count:',
      error
    );
  }
}


/* =========================================================
   HEADER
   FIX:
   Header mount is synchronous.
   ========================================================= */

function mountHeader(
  headerTarget
) {
  const mobileWasOpen = Boolean(
    headerTarget.querySelector('#premium-mobile-menu.is-open')
  );

  const header = el(
    'header',
    {
      className:
        'site-header premium-site-header'
    }
  );


  const inner = el(
    'div',
    {
      className:
        'container-nbj header-inner premium-nav-shell'
    }
  );


  const logo =
    createLogo();


  const desktopNavigation =
    createDesktopNavigation();


  const mobileNavigation =
    createMobileNavigation();


  const actions =
    createHeaderActions(
      mobileNavigation
    );

  if (mobileWasOpen) {
    mobileNavigation.classList.add('is-open');
    const toggle = actions.querySelector('#premium-mobile-toggle');
    toggle?.classList.add('is-open');
    toggle?.setAttribute('aria-expanded', 'true');
    toggle?.setAttribute('aria-label', 'Close navigation');
  }


  inner.append(
    logo,
    desktopNavigation,
    actions
  );


  const isPrimaryPage = PUBLIC_NAV.some(
    item => normalizePath(item.href) === normalizePath()
  );

  header.append(inner);

  if (isPrimaryPage) {
    header.append(createSectionProgress());
  }

  header.append(mobileNavigation);


  headerTarget.replaceWith(
    header
  );

  mountCustomerSidebar(actions);


  /*
   * Navigation is now already usable.
   */

  setCurrentPage(
    header
  );

  trackHomeSections(
    header
  );

  avoidCurrentPageReload(
    header
  );


  /*
   * Cart loads in background.
   * Do NOT await it.
   */

  updateCartCount();


  window.addEventListener(
    'cart:updated',
    updateCartCount
  );
}


/* =========================================================
   FOOTER BRAND
   ========================================================= */

function createFooterBrand(
  settings
) {
  return el(
    'div',
    {
      className:
        'footer-brand-column'
    },

    [
      el(
        'a',
        {
          href:
            sectionHref(
              'home-section'
            ),

          className:
            'footer-brand-link',

          'aria-label':
            'Nicey Burger Junction home'
        },

        el('img', {
          src:
            BRAND.logo,

          alt:
            'Nicey Burger Junction',

          className:
            'footer-logo',

          loading:
            'lazy',

          decoding:
            'async'
        })
      ),


      el('p', {
        className:
          'footer-tagline',

        text:
          settings?.store_tagline ||
          'Burgers made to crave. Freshly prepared for pickup or delivery.'
      })
    ]
  );
}


/* =========================================================
   FOOTER LINKS
   ========================================================= */

function createFooterLinks() {
  const explore = el(
    'div',
    {
      className:
        'footer-link-group'
    },

    [
      el('strong', {
        text:
          'Explore'
      }),


      el(
        'a',
        {
          href:
            sectionHref(
              'menu'
            )
        },

        'Menu'
      ),


      el(
        'a',
        {
          href:
            sectionHref(
              'promotions'
            )
        },

        'Promotions'
      ),


      el(
        'a',
        {
          href:
            '/customer/orders.html'
        },

        'Track orders'
      )
    ]
  );


  const help = el(
    'div',
    {
      className:
        'footer-link-group'
    },

    [
      el('strong', {
        text:
          'Help'
      }),


      el(
        'a',
        {
          href:
            '/faq.html'
        },

        'FAQ'
      ),


      el(
        'a',
        {
          href:
            sectionHref(
              'contact'
            )
        },

        'Contact'
      ),


      el(
        'a',
        {
          href:
            '/terms.html'
        },

        'Ordering policy'
      )
    ]
  );


  return [
    explore,
    help
  ];
}


/* =========================================================
   BUSINESS INFO
   ========================================================= */

function createBusinessInfo(
  settings
) {
  const company = el(
    'div',
    {
      className:
        'footer-business'
    }
  );


  company.append(
    el('strong', {
      text:
        settings?.business_name ||
        'Nicey Burger Junction'
    })
  );


  if (
    settings?.business_address
  ) {
    company.append(
      el(
        'p',
        {},

        [
          el('i', {
            className:
              'bi bi-geo-alt',

            'aria-hidden':
              'true'
          }),

          document.createTextNode(
            ` ${settings.business_address}`
          )
        ]
      )
    );
  }


  if (
    settings?.business_phone
  ) {
    company.append(
      el(
        'p',
        {},

        [
          el('i', {
            className:
              'bi bi-telephone',

            'aria-hidden':
              'true'
          }),

          document.createTextNode(
            ` ${settings.business_phone}`
          )
        ]
      )
    );
  }


  if (
    settings
      ?.business_hours_summary
  ) {
    company.append(
      el(
        'p',
        {},

        [
          el('i', {
            className:
              'bi bi-clock',

            'aria-hidden':
              'true'
          }),

          document.createTextNode(
            ` ${settings.business_hours_summary}`
          )
        ]
      )
    );
  }


  return company;
}


/* =========================================================
   FOOTER
   ========================================================= */

function mountFooter(
  footerTarget
) {
  const settings = {};

  if (
    !footerTarget.isConnected
  ) {
    return;
  }


  const footer = el(
    'footer',
    {
      className:
        'site-footer'
    }
  );


  const container = el(
    'div',
    {
      className:
        'container-nbj'
    }
  );


  const grid = el(
    'div',
    {
      className:
        'footer-grid'
    }
  );


  const brand =
    createFooterBrand(
      settings
    );


  const [
    explore,
    help
  ] =
    createFooterLinks();


  const company =
    createBusinessInfo(
      settings
    );


  grid.append(
    brand,
    explore,
    help,
    company
  );


  const legal = el(
    'div',
    {
      className:
        'legal-row'
    },

    [
      el('span', {
        text:
          `© ${
            new Date()
              .getFullYear()
          } Nicey Burger Junction`
      }),


      el(
        'span',
        {
          className:
            'footer-legal-links'
        },

        [
          el(
            'a',
            {
              href:
                '/privacy.html'
            },

            'Privacy'
          ),


          document.createTextNode(
            ' · '
          ),


          el(
            'a',
            {
              href:
                '/terms.html'
            },

            'Terms'
          )
        ]
      )
    ]
  );


  container.append(
    grid,
    legal
  );


  footer.append(
    container
  );


  footerTarget.replaceWith(
    footer
  );

  getPublicSettings()
    .then(freshSettings => {
      if (!footer.isConnected) return;

      const tagline = footer.querySelector('.footer-tagline');
      if (tagline) {
        tagline.textContent = freshSettings?.store_tagline ||
          'Burgers made to crave. Freshly prepared for pickup or delivery.';
      }

      company.replaceWith(createBusinessInfo(freshSettings));
    })
    .catch(error => {
      console.warn('Unable to load public settings:', error);
    });
}


/* =========================================================
   SITE SHELL
   FIX:
   Do not block the whole application waiting
   for header/footer network requests.
   ========================================================= */

export function mountSiteShell({ includeFooter = true } = {}) {
  const headerTarget =
    document.getElementById(
      'site-header'
    );


  const footerTarget =
    document.getElementById(
      'site-footer'
    );


  if (
    headerTarget
  ) {
    mountHeader(
      headerTarget
    );
  }


  if (
    includeFooter &&
    footerTarget &&
    !document.body.classList.contains('customer-shell') &&
    !document.body.classList.contains('customer-access-page')
  ) {
    mountFooter(
      footerTarget
    );
  }
}
