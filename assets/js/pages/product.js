import {
    getProductBySlug,
    relatedProducts,
    listRemovableIngredients,
    productImage
} from '../services/products.js';

import {
    addToCart
} from '../services/cart.js';

import {
    getProfile
} from '../core/auth.js';

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
    notify,
    parseQuery,
    setBusy
} from '../core/utils.js';

import {
    isConfigured
} from '../core/config.js';


function setText(
    id,
    value
) {
    const node =
        document.getElementById(
            id
        );


    if (node) {
        node.textContent =
            value ?? '';
    }
}


function formatDelta(
    value
) {
    const amount =
        Number(
            value || 0
        );


    if (!amount) {
        return '';
    }


    return amount > 0
        ? ` (+${money(amount)})`
        : ` (${money(amount)})`;
}


function renderCoreProduct(
    product
) {
    document.title =
        `${product.name} | Nicey Burger Junction`;


    const image =
        document.getElementById(
            'product-image'
        );


    if (image) {
        const images =
            [
                ...(product.images || [])
            ]
                .sort(
                    (
                        a,
                        b
                    ) =>
                        Number(
                            a.sort_order
                            ||
                            0
                        )
                        -
                        Number(
                            b.sort_order
                            ||
                            0
                        )
                );


        image.src =
            productImage(
                product
            );


        image.alt =
            images[0]?.alt_text
            ||
            product.name;
    }


    setText(
        'product-name',
        product.name
    );


    setText(
        'product-category',
        product.category?.name
        ||
        ''
    );


    setText(
        'product-description',
        product.description
        ||
        ''
    );


    setText(
        'product-price',
        money(
            product.base_price
            ||
            0
        )
    );


    setText(
        'allergen-notes',
        product.allergen_notes
        ||
        'Ask staff about ingredient or allergen concerns.'
    );
}


function renderVariants(
    product
) {
    const container =
        document.getElementById(
            'variant-options'
        );


    if (!container) {
        return;
    }


    const variants =
        (
            product.variants || []
        )
            .filter(
                variant =>
                    variant.active
            )
            .sort(
                (
                    a,
                    b
                ) =>
                    Number(
                        a.sort_order
                        ||
                        0
                    )
                    -
                    Number(
                        b.sort_order
                        ||
                        0
                    )
            );


    replaceChildren(
        container,
        variants.map(
            (
                variant,
                index
            ) => {
                const id =
                    `variant-${variant.id}`;


                const input =
                    el(
                        'input',
                        {
                            id,
                            type:
                                'radio',

                            name:
                                'variant_id',

                            value:
                                variant.id
                        }
                    );


                input.checked =
                    index === 0;


                return el(
                    'label',
                    {
                        className:
                            'panel p-2 d-flex gap-2 align-items-center',

                        for:
                            id
                    },
                    [
                        input,

                        el(
                            'span',
                            {
                                text:
                                    `${variant.name}${formatDelta(
                                        variant.price_delta
                                    )}`
                            }
                        )
                    ]
                );
            }
        )
    );


    container
        .closest(
            '.field'
        )
        ?.classList.toggle(
            'hidden',
            !variants.length
        );
}


function renderAddons(
    product
) {
    const container =
        document.getElementById(
            'addon-options'
        );


    if (!container) {
        return;
    }


    const addons =
        (
            product.product_addons
            ||
            []
        )
            .map(
                value =>
                    value.addon
            )
            .filter(
                addon =>
                    addon?.active
            );


    replaceChildren(
        container,
        addons.map(
            addon => {
                const id =
                    `addon-${addon.id}`;


                return el(
                    'label',
                    {
                        className:
                            'd-flex gap-2 align-items-center',

                        for:
                            id
                    },
                    [
                        el(
                            'input',
                            {
                                type:
                                    'checkbox',

                                name:
                                    'addon_ids',

                                id,

                                value:
                                    addon.id
                            }
                        ),

                        el(
                            'span',
                            {
                                text:
                                    `${addon.name} (+${money(
                                        addon.price
                                    )})`
                            }
                        )
                    ]
                );
            }
        )
    );


    container
        .closest(
            '.field'
        )
        ?.classList.toggle(
            'hidden',
            !addons.length
        );
}


async function renderRemovableIngredients(
    product
) {
    const container =
        document.getElementById(
            'remove-options'
        );


    if (!container) {
        return;
    }


    const removable =
        await listRemovableIngredients(
            product.id
        );


    replaceChildren(
        container,
        removable.map(
            ingredient => {
                const id =
                    `remove-${ingredient.id}`;


                return el(
                    'label',
                    {
                        className:
                            'd-flex gap-2 align-items-center',

                        for:
                            id
                    },
                    [
                        el(
                            'input',
                            {
                                type:
                                    'checkbox',

                                name:
                                    'removed_ingredients',

                                id,

                                value:
                                    ingredient.name
                            }
                        ),

                        el(
                            'span',
                            {
                                text:
                                    `No ${ingredient.name}`
                            }
                        )
                    ]
                );
            }
        )
    );


    container
        .closest(
            '.field'
        )
        ?.classList.toggle(
            'hidden',
            !removable.length
        );
}


function configureCartForm(
    product
) {
    const form =
        document.getElementById(
            'product-form'
        );


    if (!form) {
        return;
    }


    const submit =
        form.querySelector(
            'button[type="submit"]'
        );


    if (
        product.manually_sold_out
        ||
        product.active === false
    ) {
        if (submit) {
            submit.disabled =
                true;


            submit.textContent =
                'Sold out';
        }


        return;
    }


    form.addEventListener(
        'submit',
        async event => {
            event.preventDefault();


            const button =
                form.querySelector(
                    'button[type="submit"]'
                );


            if (
                button?.disabled
            ) {
                return;
            }


            setBusy(
                button,
                true,
                'Adding…'
            );


            try {
                const formData =
                    new FormData(
                        form
                    );


                const quantity =
                    Math.max(
                        1,
                        Number(
                            formData.get(
                                'quantity'
                            )
                            ||
                            1
                        )
                    );


                await addToCart({
                    product_id:
                        product.id,

                    variant_id:
                        formData.get(
                            'variant_id'
                        )
                        ||
                        null,

                    addon_ids:
                        formData.getAll(
                            'addon_ids'
                        ),

                    removed_ingredients:
                        formData.getAll(
                            'removed_ingredients'
                        ),

                    quantity,

                    instructions:
                        String(
                            formData.get(
                                'instructions'
                            )
                            ||
                            ''
                        ).trim()
                });


                notify(
                    `${product.name} added to cart.`,
                    'success'
                );

            } catch (error) {
                console.error(
                    'Add product to cart error:',
                    error
                );


                notify(
                    error?.message
                    ||
                    'Unable to add the product to your cart.',
                    'danger'
                );

            } finally {
                setBusy(
                    button,
                    false
                );
            }
        }
    );
}


async function renderRelated(
    product
) {
    const container =
        document.getElementById(
            'related-products'
        );


    if (!container) {
        return;
    }


    const related =
        await relatedProducts(
            product,
            4
        );


    replaceChildren(
        container,
        (
            related || []
        )
            .map(
                item =>
                    productCard(
                        item
                    )
            )
    );
}


async function renderReviews(
    supabase,
    productId
) {
    const container =
        document.getElementById(
            'product-reviews'
        );


    if (!container) {
        return;
    }


    const {
        data,
        error
    } =
        await supabase
            .from(
                'reviews'
            )
            .select(
                'id,rating,review_text,created_at'
            )
            .eq(
                'product_id',
                productId
            )
            .eq(
                'visible',
                true
            )
            .order(
                'created_at',
                {
                    ascending:
                        false
                }
            )
            .limit(
                20
            );


    if (error) {
        console.error(
            'Load product reviews error:',
            error
        );
    }


    const reviews =
        data || [];


    if (!reviews.length) {
        replaceChildren(
            container,
            [
                el(
                    'div',
                    {
                        className:
                            'empty-state',

                        text:
                            'No verified reviews yet.'
                    }
                )
            ]
        );

        return;
    }


    replaceChildren(
        container,
        reviews.map(
            review => {
                const rating =
                    Math.max(
                        0,
                        Math.min(
                            5,
                            Math.round(
                                Number(
                                    review.rating
                                    ||
                                    0
                                )
                            )
                        )
                    );


                return el(
                    'article',
                    {
                        className:
                            'panel'
                    },
                    [
                        el(
                            'div',
                            {
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
                                    ||
                                    'Rated without a written review.'
                            }
                        ),

                        el(
                            'small',
                            {
                                className:
                                    'muted',

                                text:
                                    'Verified customer'
                            }
                        )
                    ]
                );
            }
        )
    );
}


async function configureFavorite(
    supabase,
    product
) {
    const profile =
        await getProfile()
            .catch(
                () =>
                    null
            );


    if (
        profile?.role !==
        'CUSTOMER'
    ) {
        return profile;
    }


    const button =
        document.getElementById(
            'favorite-button'
        );


    if (!button) {
        return profile;
    }


    button.hidden =
        false;


    const {
        data,
        error
    } =
        await supabase
            .from(
                'favorites'
            )
            .select(
                'product_id'
            )
            .eq(
                'product_id',
                product.id
            )
            .maybeSingle();


    if (error) {
        console.error(
            'Favorite lookup error:',
            error
        );
    }


    let selected =
        Boolean(
            data
        );


    const paint =
        () => {
            button.textContent =
                selected
                    ? '♥ Saved'
                    : '♡ Save favorite';


            button.setAttribute(
                'aria-pressed',
                String(
                    selected
                )
            );
        };


    paint();


    button.addEventListener(
        'click',
        async () => {
            if (
                button.disabled
            ) {
                return;
            }


            button.disabled =
                true;


            try {
                if (selected) {
                    const {
                        error
                    } =
                        await supabase
                            .from(
                                'favorites'
                            )
                            .delete()
                            .eq(
                                'product_id',
                                product.id
                            );


                    if (error) {
                        throw error;
                    }

                } else {
                    const {
                        error
                    } =
                        await supabase
                            .from(
                                'favorites'
                            )
                            .insert({
                                product_id:
                                    product.id
                            });


                    if (error) {
                        throw error;
                    }
                }


                selected =
                    !selected;


                paint();

            } catch (error) {
                console.error(
                    'Favorite update error:',
                    error
                );


                notify(
                    error?.message
                    ||
                    'Unable to update your favorites.',
                    'danger'
                );

            } finally {
                button.disabled =
                    false;
            }
        }
    );


    return profile;
}


async function configureReviewForm(
    supabase,
    product
) {
    const form =
        document.getElementById(
            'review-form'
        );


    if (!form) {
        return;
    }


    const {
        data: eligible,
        error
    } =
        await supabase
            .from(
                'order_items'
            )
            .select(
                'id,order:orders!inner(status)'
            )
            .eq(
                'product_id',
                product.id
            )
            .eq(
                'order.status',
                'COMPLETED'
            )
            .limit(
                20
            );


    if (error) {
        console.error(
            'Review eligibility error:',
            error
        );

        return;
    }


    if (
        !eligible?.length
    ) {
        return;
    }


    const itemIds =
        eligible.map(
            item =>
                item.id
        );


    const {
        data: existingReviews,
        error: existingError
    } =
        await supabase
            .from(
                'reviews'
            )
            .select(
                'order_item_id'
            )
            .eq(
                'product_id',
                product.id
            )
            .in(
                'order_item_id',
                itemIds
            );


    if (existingError) {
        console.error(
            'Existing reviews lookup error:',
            existingError
        );

        return;
    }


    const reviewed =
        new Set(
            (
                existingReviews || []
            )
                .map(
                    review =>
                        review.order_item_id
                )
        );


    const eligibleItem =
        eligible.find(
            item =>
                !reviewed.has(
                    item.id
                )
        );


    if (!eligibleItem) {
        return;
    }


    form.hidden =
        false;

    if (location.hash === '#review-form') {
        form.scrollIntoView({
            behavior: 'smooth',
            block: 'center'
        });
    }


    form.addEventListener(
        'submit',
        async event => {
            event.preventDefault();


            const button =
                form.querySelector(
                    'button[type="submit"]'
                );


            if (
                button?.disabled
            ) {
                return;
            }


            const formData =
                new FormData(
                    form
                );


            const rating =
                Number(
                    formData.get(
                        'rating'
                    )
                );


            if (
                !Number.isInteger(
                    rating
                )
                ||
                rating < 1
                ||
                rating > 5
            ) {
                notify(
                    'Choose a rating from 1 to 5.',
                    'danger'
                );

                return;
            }


            setBusy(
                button,
                true,
                'Submitting…'
            );


            try {
                const {
                    error
                } =
                    await supabase
                        .from(
                            'reviews'
                        )
                        .insert({
                            product_id:
                                product.id,

                            order_item_id:
                                eligibleItem.id,

                            rating,

                            review_text:
                                String(
                                    formData.get(
                                        'review_text'
                                    )
                                    ||
                                    ''
                                ).trim()
                                ||
                                null
                        });


                if (error) {
                    throw error;
                }


                notify(
                    'Thanks for your review.',
                    'success'
                );


                form.hidden =
                    true;


                await renderReviews(
                    supabase,
                    product.id
                );

            } catch (error) {
                console.error(
                    'Submit review error:',
                    error
                );


                notify(
                    error?.message
                    ||
                    'Unable to submit your review.',
                    'danger'
                );

            } finally {
                setBusy(
                    button,
                    false
                );
            }
        }
    );
}


export async function init() {
    if (!isConfigured) {
        return;
    }


    const slug =
        parseQuery().slug;


    if (!slug) {
        throw new Error(
            'Product not specified.'
        );
    }


    const product =
        await getProductBySlug(
            slug
        );


    if (!product) {
        throw new Error(
            'Product not found.'
        );
    }


    renderCoreProduct(
        product
    );


    renderVariants(
        product
    );


    renderAddons(
        product
    );


    await renderRemovableIngredients(
        product
    );


    configureCartForm(
        product
    );


    await renderRelated(
        product
    );


    const supabase =
        await getSupabase();


    await renderReviews(
        supabase,
        product.id
    );


    const profile =
        await configureFavorite(
            supabase,
            product
        );


    if (
        profile?.role ===
        'CUSTOMER'
    ) {
        await configureReviewForm(
            supabase,
            product
        );
    }
}