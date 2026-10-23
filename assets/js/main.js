import './config.js';

import {
    mountSiteShell
} from './components/site-shell.js';

import {
    getStoreStatus
} from './services/settings.js';

import {
    isConfigured
} from './core/config.js';

import {
    el
} from './core/dom.js';

import {
    getProfile,
    getSession,
    roleHome,
    signOut
} from './core/auth.js';


let bootStarted = false;

const STOREFRONT_PAGES = new Set([
    '/',
    '/index.html',
    '/promotions.html',
    '/about.html'
]);

const CUSTOMER_ACCESS_PAGES = new Set([
    '/menu.html',
    '/product.html',
    '/customer/cart.html',
    '/contact.html',
    '/faq.html',
    '/privacy.html',
    '/terms.html'
]);

async function enforcePublicPageAccess() {
    const path = location.pathname
        .replace(/\/+/g, '/')
        .replace(/\/$/, '')
        .toLowerCase() || '/';

    if (
        !STOREFRONT_PAGES.has(path) &&
        !CUSTOMER_ACCESS_PAGES.has(path)
    ) {
        return false;
    }

    const session = await getSession();
    if (!session) return false;

    const profile = await getProfile();
    if (!profile) {
        throw new Error('Unable to load your account. Please refresh the page.');
    }

    if (profile.active === false) {
        location.replace('/unauthorized.html');
        return true;
    }

    if (
        STOREFRONT_PAGES.has(path) ||
        profile.role !== 'CUSTOMER'
    ) {
        location.replace(roleHome(profile.role));
        return true;
    }

    document.body.classList.add('customer-access-page');

    const logo = document.querySelector('.premium-site-header .premium-brand');
    if (logo) {
        logo.href = roleHome(profile.role);
        logo.setAttribute('aria-label', 'Customer dashboard');
    }

    if (path === '/menu.html') {
        const backLink = document.querySelector(
            '.menu-hero .page-back-link[href="/"]'
        );

        if (backLink) {
            backLink.href = roleHome(profile.role);
            backLink.lastChild.textContent = ' Back to account';
        }
    } else if (path === '/product.html') {
        const accountCrumb = document.querySelector(
            '.product-breadcrumb a[href="/"]'
        );

        if (accountCrumb) {
            accountCrumb.href = roleHome(profile.role);
            accountCrumb.textContent = 'My account';
        }
    }

    return false;
}

function showAccessError(error) {
    console.error('Account access check failed:', error);

    const main = document.querySelector('main');
    if (!main) return;

    const message = el('p', {
        text: 'Unable to check your account right now. Please try again.'
    });

    const retry = el('button', {
        type: 'button',
        className: 'btn-nbj',
        text: 'Try again'
    });
    retry.addEventListener('click', () => location.reload());

    const logout = el('button', {
        type: 'button',
        className: 'btn-nbj ghost',
        text: 'Log out'
    });
    logout.addEventListener('click', async () => {
        logout.disabled = true;
        try {
            await signOut();
            location.replace('/');
        } catch (signOutError) {
            console.error('Unable to log out:', signOutError);
            message.textContent = 'Unable to log out. Please try again.';
            logout.disabled = false;
        }
    });

    main.replaceChildren(
        el('section', { className: 'auth-shell' },
            el('div', { className: 'auth-card' }, [
                el('h1', { text: 'Account unavailable' }),
                message,
                el('div', { className: 'cluster' }, [retry, logout])
            ])
        )
    );
}


function showSetupNotice() {
    const main =
        document.querySelector(
            'main'
        );


    if (!main) {
        return;
    }


    /*
     * Prevent duplicate setup notices if this
     * script is accidentally initialized twice.
     */
    if (
        main.querySelector(
            '[data-setup-notice]'
        )
    ) {
        return;
    }


    const box =
        el(
            'div',
            {
                className:
                    'container-nbj mt-3',

                'data-setup-notice':
                    'true'
            },
            el(
                'div',
                {
                    className:
                        'alert-setup',

                    role:
                        'status',

                    text:
                        'Website setup required: configure the Supabase project URL and publishable key in the server environment. Public design pages remain visible, but database actions are disabled.'
                }
            )
        );


    main.prepend(
        box
    );
}


async function updateStoreStatus() {
    const statusNode =
        document.querySelector(
            '[data-store-status]'
        );


    if (
        !statusNode ||
        !isConfigured
    ) {
        return;
    }


    try {
        const status =
            await getStoreStatus();


        const open =
            Boolean(
                status?.open
            );


        statusNode.textContent =
            open
                ? 'OPEN'
                : 'CLOSED';


        statusNode.classList.toggle(
            'text-success',
            open
        );


        statusNode.classList.toggle(
            'text-danger',
            !open
        );


        statusNode.title =
            status?.reason
            ||
            '';

    } catch (error) {
        console.error(
            'Store status error:',
            error
        );


        statusNode.textContent =
            'STATUS UNAVAILABLE';


        statusNode.classList.remove(
            'text-success',
            'text-danger'
        );


        statusNode.title =
            '';
    }
}


function showPageError(
    error
) {
    console.error(
        'Page controller error:',
        error
    );


    const region =
        document.getElementById(
            'page-error'
        );


    if (!region) {
        return;
    }


    region.hidden =
        false;


    region.textContent =
        error?.message
        ||
        'Unable to load this page.';
}


async function initializeController() {
    const controller =
        String(
            document.body
                ?.dataset
                ?.controller
            ||
            ''
        ).trim();


    if (!controller) {
        return;
    }


    /*
     * Controller names come from our own
     * data-controller attributes. Restrict the
     * value before constructing an import path.
     */
    if (
        !/^[a-z0-9-]+$/i.test(
            controller
        )
    ) {
        throw new Error(
            'Invalid page controller.'
        );
    }


    const module =
        await import(
            `./pages/${controller}.js`
        );


    if (
        typeof module.init ===
        'function'
    ) {
        await module.init();
    }
}


async function initializeSiteShell(includeFooter = true) {
    try {
        await mountSiteShell({ includeFooter });

    } catch (error) {
        /*
         * A shell/header failure should not prevent
         * the page controller from loading.
         */
        console.error(
            'Site shell error:',
            error
        );
    }
}


async function boot() {
    if (bootStarted) {
        return;
    }


    bootStarted =
        true;

    // Render the shared header before any session or profile request.
    // A new document otherwise shows an empty header while auth loads.
    
const shellTask = initializeSiteShell();


    if (!isConfigured) {
        showSetupNotice();
    } else {
        try {
            if (await enforcePublicPageAccess()) {
                return;
            }
        } catch (error) {
            showAccessError(error);
            return;
        }
    }
 
    
if (document.body.classList.contains('customer-shell')) {
    import('./components/persistent-navigation.js')
        .then(({ enablePersistentNavigation }) => {
            enablePersistentNavigation({
                area: 'customer',
                onNavigate: () =>
                    initializeController().catch(showPageError)
            });
        })
        .catch(error => {
            console.error('Customer navigation error:', error);
        });
}

    
const tasks = [shellTask];



    if (isConfigured) {
        tasks.push(
            updateStoreStatus()
        );
    }


    tasks.push(
        initializeController()
            .catch(
                showPageError
            )
    );


    await Promise.allSettled(
        tasks
    );
}


if (
    document.readyState ===
    'loading'
) {
    document.addEventListener(
        'DOMContentLoaded',
        boot,
        {
            once:
                true
        }
    );

} else {
    boot();
}
