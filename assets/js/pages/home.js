import {
    isConfigured
} from '../core/config.js';

import {
    listProducts,
    listCategories
} from '../services/products.js';

import {
    getPublicSettings,
    getStoreStatus
} from '../services/settings.js';

import {
    getRecommendations
} from '../services/ml.js';

import {
    getSupabase
} from '../core/supabase.js';

import {
    productCard
} from '../components/product-card.js';

import {
    el,
    replaceChildren
} from '../core/dom.js';

import {
    money,
    formatDate
} from '../core/utils.js';


const categoryIcons = {
    burgers:
        '🍔',

    chicken:
        '🍗',

    'rice-meals':
        '🍚',

    'fries-sides':
        '🍟',

    drinks:
        '🥤',

    desserts:
        '🍩',

    combos:
        '🥡'
        
};


function renderStoreStatus(
    status
) {
    const node =
        document.getElementById(
            'hero-store-status'
        );


    if (!node) {
        return;
    }


    node.textContent =
        status.open
            ? 'OPEN NOW'
            : 'CURRENTLY CLOSED';


    node.className =
        `nbj-badge ${
            status.open
                ? 'success'
                : 'warning'
        }`;


    node.title =
        status.reason
        ||
        '';
}


function renderAnnouncement(
    settings
) {
    const node =
        document.getElementById(
            'announcement'
        );


    if (!node) {
        return;
    }


    const announcement =
        String(
            settings?.store_announcement
            ||
            ''
        ).trim();


    if (!announcement) {
        node.hidden =
            true;

        return;
    }


    node.textContent =
        announcement;


    node.hidden =
        false;
}


function renderCategories(
    categories
) {
    const container =
        document.getElementById(
            'home-categories'
        );


    if (!container) {
        return;
    }


    replaceChildren(
        container,
        categories.map(
            category =>
                el(
                    'a',
                    {
                        href:
                            `/menu.html?category=${encodeURIComponent(
                                category.slug
                            )}`,

                        className:
                            'category-card'
                    },
                    [
                        el(
                            'span',
                            {
                                className:
                                    'category-icon',

                                text:
                                    categoryIcons[
                                        category.slug
                                    ]
                                    ||
                                    '🍽️'
                            }
                        ),

                        el(
                            'span',
                            {
                                text:
                                    category.name
                            }
                        ),

                        el(
                            'small',
                            {
                                className:
                                    'muted',

                                text:
                                    category.description
                                    ||
                                    ''
                            }
                        )
                    ]
                )
        )
    );
}


function renderProducts(
    id,
    products
) {
    const node =
        document.getElementById(
            id
        );


    if (!node) {
        return;
    }


    replaceChildren(
        node,
        products.map(
            product =>
                productCard(
                    product
                )
        )
    );
}


async function getHomepageRecommendations(
    bestsellers
) {
    try {
        const results =
            await getRecommendations(
                null,
                4
            );


        const products =
            (
                results || []
            )
                .map(
                    item =>
                        item.recommended
                )
                .filter(Boolean);


        if (
            products.length
        ) {
            return products;

        }

    } catch (error) {
        console.warn(
            'Homepage recommendations unavailable:',
            error
        );
    }


    return bestsellers.slice(
        0,
        4
    );
}


function promotionLabel(
    promotion
) {
    if (
        promotion.promo_type ===
        'PERCENTAGE'
    ) {
        return `${Number(
            promotion.amount
            ||
            0
        )}% off`;
    }


    if (
        promotion.promo_type ===
        'FIXED'
    ) {
        return `${money(
            promotion.amount
            ||
            0
        )} off`;
    }


    return 'Special offer';
}


async function renderPromotions(
    supabase
) {
    const container =
        document.getElementById(
            'home-promotions'
        );


    if (!container) {
        return;
    }


    try {
        const now =
            new Date()
                .toISOString();


        /*
         * Promotion must be active AND:
         * - already started, or no start date
         * - not expired, or no end date
         */
        const {
            data,
            error
        } =
            await supabase
                .from(
                    'promotions'
                )
                .select('*')
                .eq(
                    'active',
                    true
                )
                .or(
                    `starts_at.is.null,starts_at.lte.${now}`
                )
                .or(
                    `ends_at.is.null,ends_at.gt.${now}`
                )
                .order(
                    'created_at',
                    {
                        ascending:
                            false
                    }
                )
                .limit(
                    3
                );


        if (error) {
            throw error;
        }


        replaceChildren(
            container,
            (
                data || []
            )
                .map(
                    promotion =>
                        el(
                            'article',
                            {
                                className:
                                    'panel'
                            },
                            [
                                el(
                                    'div',
                                    {
                                        className:
                                            'eyebrow',

                                        text:
                                            promotion.code
                                            ||
                                            'Automatic offer'
                                    }
                                ),

                                el(
                                    'h3',
                                    {
                                        text:
                                            promotion.title
                                    }
                                ),

                                el(
                                    'p',
                                    {
                                        className:
                                            'muted',

                                        text:
                                            promotion.description
                                            ||
                                            ''
                                    }
                                ),

                                el(
                                    'strong',
                                    {
                                        text:
                                            promotionLabel(
                                                promotion
                                            )
                                    }
                                ),

                                promotion.ends_at
                                    ? el(
                                        'small',
                                        {
                                            className:
                                                'd-block muted mt-2',

                                            text:
                                                `Ends ${formatDate(
                                                    promotion.ends_at,
                                                    {
                                                        dateOnly:
                                                            true
                                                    }
                                                )}`
                                        }
                                    )
                                    : null
                            ]
                        )
                )
        );

    } catch (error) {
        console.error(
            'Homepage promotions error:',
            error
        );


        replaceChildren(
            container,
            []
        );
    }
}


async function renderReviews(
    supabase
) {
    const container =
        document.getElementById(
            'home-reviews'
        );


    if (!container) {
        return;
    }


    try {
        const {
            data,
            error
        } =
            await supabase
                .from(
                    'reviews'
                )
                .select(
                    `
                    rating,
                    review_text,
                    created_at,
                    product:products(
                        name
                    )
                    `
                )
                .eq(
                    'visible',
                    true
                )
                .not(
                    'review_text',
                    'is',
                    null
                )
                .order(
                    'created_at',
                    {
                        ascending:
                            false
                    }
                )
                .limit(
                    3
                );


        if (error) {
            throw error;
        }


        const reviews =
            data || [];


        if (
            reviews.length
        ) {
            replaceChildren(
                container,
                reviews.map(
                    review => {
                        const rating =
                            Math.max(
                                0,
                                Math.min(
                                    5,
                                    Number(
                                        review.rating
                                        ||
                                        0
                                    )
                                )
                            );


                        return el(
                            'blockquote',
                            {
                                className:
                                    'panel'
                            },
                            [
                                el(
                                    'div',
                                    {
                                        className:
                                            'mb-2',

                                        text:
                                            '★'.repeat(
                                                rating
                                            )
                                            +
                                            '☆'.repeat(
                                                5
                                                -
                                                rating
                                            )
                                    }
                                ),

                                el(
                                    'p',
                                    {
                                        text:
                                            review.review_text
                                    }
                                ),

                                el(
                                    'footer',
                                    {
                                        className:
                                            'muted',

                                        text:
                                            `Verified customer · ${
                                                review.product
                                                    ?.name
                                                ||
                                                'Nicey order'
                                            }`
                                    }
                                )
                            ]
                        );
                    }
                )
            );


            return;
        }

    } catch (error) {
        console.error(
            'Homepage reviews error:',
            error
        );
    }


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
                                'bi bi-chat-heart'
                        }
                    ),

                    el(
                        'strong',
                        {
                            text:
                                'Verified reviews will appear here'
                        }
                    ),

                    el(
                        'p',
                        {
                            text:
                                'Customers can review products after a completed order.'
                        }
                    )
                ]
            )
        ]
    );
}


function renderPublicSettings(
    settings
) {
    document
        .querySelectorAll(
            '[data-setting]'
        )
        .forEach(
            node => {
                const value =
                    settings?.[
                        node.dataset.setting
                    ];


                if (
                    value !== null
                    &&
                    value !== undefined
                    &&
                    value !== ''
                ) {
                    node.textContent =
                        value;
                }
            }
        );
}


export async function init() {
    if (!isConfigured) {
        return;
    }


    const [
        settings,
        storeStatus,
        categories,
        featured,
        bestsellers
    ] =
        await Promise.all([
            getPublicSettings(),
            getStoreStatus(),
            listCategories(),
            listProducts({
                featured:
                    true
            }),
            listProducts({
                bestseller:
                    true
            })
        ]);


    renderStoreStatus(
        storeStatus
    );


    renderAnnouncement(
        settings
    );


    renderProducts(
        'featured-products',
        (
            featured || []
        ).slice(
            0,
            4
        )
    );


    renderCategories(
        categories || []
    );


    const recommended =
        await getHomepageRecommendations(
            bestsellers || []
        );


    renderProducts(
        'recommended-products',
        recommended
    );


    const supabase =
        await getSupabase();


    await Promise.all([
        renderPromotions(
            supabase
        ),

        renderReviews(
            supabase
        )
    ]);


    renderPublicSettings(
        settings
    );
}
