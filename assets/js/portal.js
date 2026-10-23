import './config.js';

import {
    mountPortalShell
} from './components/portal-shell.js';

import {
    isConfigured
} from './core/config.js';




let bootStarted = false;


function showPageError(
    error
) {
    console.error(
        'Portal page error:',
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


function getPortalKind() {
    const value =
        String(
            document.body
                ?.dataset
                ?.portal
            ||
            'operations'
        )
            .trim()
            .toLowerCase();


    if (
        value === 'admin'
    ) {
        return 'admin';
    }


    return 'operations';
}


async function initializeController(
    profile,
    kind
) {
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


    if (
        !/^[a-z0-9-]+$/i.test(
            controller
        )
    ) {
        throw new Error(
            'Invalid portal controller.'
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
        await module.init({
            profile,
            kind
        });
    }
}


async function boot() {
    if (bootStarted) {
        return;
    }


    bootStarted =
        true;


    if (!isConfigured) {
        window.location.replace(
            '/unauthorized.html?reason=setup'
        );

        return;
    }


    const kind =
        getPortalKind();


    try {
        /*
         * Keep this await.
         *
         * Unlike public pages, portal controllers
         * should not initialize until portal auth /
         * role validation has succeeded.
         */
        const profile =
            await mountPortalShell(
                kind
            );


        if (!profile) {
            return;
        }

        initializeController(profile, kind).catch(showPageError);

        try {
            const { enablePersistentNavigation } =
                await import('./components/persistent-navigation.js');

            enablePersistentNavigation({
                area: kind,
                onNavigate: () =>
                    initializeController(profile, kind).catch(showPageError)
            });
        } catch (error) {
            console.error('Portal navigation error:', error);
        }
    } catch (error) {
        showPageError(error);
    }
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
