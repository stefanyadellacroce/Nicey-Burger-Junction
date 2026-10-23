import {
    requireAuth
} from '../core/guards.js';

import {
    listFavorites
} from '../services/profile.js';

import {
    productCard
} from '../components/product-card.js';

import {
    el,
    replaceChildren
} from '../core/dom.js';


export async function init() {
    const context =
        await requireAuth({
            roles: [
                'CUSTOMER'
            ]
        });


    if (!context) {
        return;
    }


    const container =
        document.getElementById(
            'favorites-grid'
        );


    if (!container) {
        console.warn(
            'Favorites grid was not found.'
        );

        return;
    }


    const favorites =
        await listFavorites();


    if (
        !favorites?.length
    ) {
        replaceChildren(
            container,
            [
                el(
                    'div',
                    {
                        className:
                            'empty-state panel'
                    },
                    [
                        el(
                            'i',
                            {
                                className:
                                    'bi bi-heart'
                            }
                        ),

                        el(
                            'p',
                            {
                                text:
                                    'You have no saved favorites yet.'
                            }
                        ),

                        el(
                            'a',
                            {
                                href:
                                    '/menu.html',

                                className:
                                    'btn-nbj',

                                text:
                                    'Browse menu'
                            }
                        )
                    ]
                )
            ]
        );

        return;
    }


    replaceChildren(
        container,
        favorites.map(
            product =>
                productCard(
                    product
                )
        )
    );
}