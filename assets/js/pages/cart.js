import {
    getCart,
    updateCartItem,
    removeCartItem
} from '../services/cart.js';

import {
    getProductById,
    listRemovableIngredients
} from '../services/products.js';

import {
    getPublicSettings
} from '../services/settings.js';

import {
    getSupabase
} from '../core/supabase.js';

import {
    el,
    replaceChildren
} from '../core/dom.js';

import {
    money,
    notify,
    setBusy
} from '../core/utils.js';

import {
    isConfigured
} from '../core/config.js';


let rows = [];

let settings = {};


function addonRecord(
    value
) {
    return value?.addon
        ||
        value
        ||
        null;
}


function selectedAddonIds(
    item
) {
    if (
        Array.isArray(
            item.addon_ids
        )
    ) {
        return item.addon_ids;
    }


    return (
        item.addons_details
        ||
        item.addons
        ||
        []
    )
        .map(addonRecord)
        .filter(Boolean)
        .map(
            addon =>
                addon.id
        );
}


async function hydrate(
    item
) {
    if (
        item.product?.name
    ) {
        const addonDetails =
            (
                item.addons || []
            )
                .map(addonRecord)
                .filter(Boolean);


        return {
            ...item,

            quantity:
                Number(
                    item.quantity
                    ||
                    1
                ),

            addons_details:
                addonDetails,

            unit:
                Number(
                    item.product.base_price
                    ||
                    0
                )
                +
                Number(
                    item.variant
                        ?.price_delta
                    ||
                    0
                )
                +
                addonDetails.reduce(
                    (
                        total,
                        addon
                    ) =>
                        total
                        +
                        Number(
                            addon.price
                            ||
                            0
                        ),
                    0
                )
        };
    }


    const product =
        await getProductById(
            item.product_id
        );


    const variant =
        product.variants
            ?.find(
                value =>
                    value.id ===
                    item.variant_id
            );


    const addonIds =
        item.addon_ids
        ||
        [];


    const addonDetails =
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
                    addon
                    &&
                    addonIds.includes(
                        addon.id
                    )
            );


    return {
        ...item,

        quantity:
            Number(
                item.quantity
                ||
                1
            ),

        product,

        variant,

        addons_details:
            addonDetails,

        unit:
            Number(
                product.base_price
                ||
                0
            )
            +
            Number(
                variant
                    ?.price_delta
                ||
                0
            )
            +
            addonDetails.reduce(
                (
                    total,
                    addon
                ) =>
                    total
                    +
                    Number(
                        addon.price
                        ||
                        0
                    ),
                0
            )
    };
}


function calculateSubtotal() {
    return rows.reduce(
        (
            total,
            item
        ) =>
            total
            +
            item.unit
            *
            item.quantity,
        0
    );
}


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
            value;
    }
}


function updateSummary() {
    const subtotal =
        calculateSubtotal();


    const serviceFee =
        Number(
            settings.service_fee
            ||
            0
        );


    const tax =
        Math.max(
            subtotal,
            0
        )
        *
        (
            Number(
                settings.tax_rate_percent
                ||
                0
            )
            /
            100
        );


    setText(
        'cart-subtotal',
        money(subtotal)
    );


    setText(
        'cart-service',
        money(serviceFee)
    );


    setText(
        'cart-tax',
        money(tax)
    );


    setText(
        'cart-total',
        money(
            subtotal
            +
            serviceFee
            +
            tax
        )
    );


    return subtotal;
}


async function runCartMutation(
    button,
    callback
) {
    if (
        button?.disabled
    ) {
        return;
    }


    if (button) {
        button.disabled =
            true;
    }


    try {
        await callback();


        await render();

    } catch (error) {
        console.error(
            'Cart update error:',
            error
        );


        notify(
            error?.message
            ||
            'Unable to update your cart.',
            'danger'
        );

    } finally {
        if (button) {
            button.disabled =
                false;
        }
    }
}


function formatDelta(
    value
) {
    const amount =
        Number(
            value || 0
        );


    if (amount > 0) {
        return `+${money(amount)}`;
    }


    return money(
        amount
    );
}


async function render() {
    const raw =
        await getCart();


    rows =
        await Promise.all(
            raw.map(
                hydrate
            )
        );


    const itemsNode =
        document.getElementById(
            'cart-items'
        );


    const summaryNode =
        document.getElementById(
            'cart-summary'
        );


    if (
        !itemsNode ||
        !summaryNode
    ) {
        return;
    }


    if (!rows.length) {
        replaceChildren(
            itemsNode,
            [
                el(
                    'div',
                    {
                        className:
                            'empty-state'
                    },
                    [
                        el(
                            'i',
                            {
                                className:
                                    'bi bi-bag'
                            }
                        ),

                        el(
                            'h2',
                            {
                                text:
                                    'Your cart is empty'
                            }
                        ),

                        el(
                            'p',
                            {
                                text:
                                    'Add a burger, side or drink to start your order.'
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


        summaryNode.hidden =
            true;


        return;
    }


    summaryNode.hidden =
        false;


    replaceChildren(
        itemsNode,
        rows.map(
            createCartItem
        )
    );


    updateSummary();
}


function createCartItem(
    item
) {
    const article =
        el(
            'article',
            {
                className:
                    'line-item'
            }
        );


    const images =
        [
            ...(
                item.product.images
                ||
                []
            )
        ]
            .sort(
                (
                    a,
                    b
                ) =>
                    Number(
                        a.sort_order || 0
                    )
                    -
                    Number(
                        b.sort_order || 0
                    )
            );


    const thumbnail =
        el(
            'div',
            {
                className:
                    'line-thumb'
            },
            el(
                'img',
                {
                    src:
                        images[0]?.path
                        ||
                        '/assets/images/food-default.svg',

                    alt:
                        ''
                }
            )
        );


    const information =
        el(
            'div',
            {},
            [
                el(
                    'a',
                    {
                        href:
                            `/product.html?slug=${encodeURIComponent(
                                item.product.slug
                            )}`,

                        className:
                            'fw-bold text-decoration-none',

                        text:
                            item.product.name
                    }
                ),

                item.variant
                    ? el(
                        'div',
                        {
                            className:
                                'help-text',

                            text:
                                item.variant.name
                        }
                    )
                    : null,

                item.addons_details
                    .length
                    ? el(
                        'div',
                        {
                            className:
                                'help-text',

                            text:
                                item.addons_details
                                    .map(
                                        addon =>
                                            addon.name
                                    )
                                    .join(', ')
                        }
                    )
                    : null,

                item.removed_ingredients
                    ?.length
                    ? el(
                        'div',
                        {
                            className:
                                'help-text',

                            text:
                                `No: ${item.removed_ingredients.join(
                                    ', '
                                )}`
                        }
                    )
                    : null,

                item.instructions
                    ? el(
                        'div',
                        {
                            className:
                                'help-text',

                            text:
                                `Note: ${item.instructions}`
                        }
                    )
                    : null
            ]
        );


    const actions =
        el(
            'div',
            {
                className:
                    'stack'
            }
        );


    const quantity =
        el(
            'div',
            {
                className:
                    'quantity'
            }
        );


    const minusButton =
        el(
            'button',
            {
                type:
                    'button',

                'aria-label':
                    `Decrease ${item.product.name}`,

                text:
                    '−'
            }
        );


    const output =
        el(
            'output',
            {
                text:
                    String(
                        item.quantity
                    )
            }
        );


    const plusButton =
        el(
            'button',
            {
                type:
                    'button',

                'aria-label':
                    `Increase ${item.product.name}`,

                text:
                    '+'
            }
        );


    minusButton.addEventListener(
        'click',
        () =>
            runCartMutation(
                minusButton,
                async () => {
                    if (
                        item.quantity <= 1
                    ) {
                        await removeCartItem(
                            item.id
                        );

                        return;
                    }


                    await updateCartItem(
                        item.id,
                        {
                            quantity:
                                item.quantity
                                -
                                1
                        }
                    );
                }
            )
    );


    plusButton.addEventListener(
        'click',
        () =>
            runCartMutation(
                plusButton,
                () =>
                    updateCartItem(
                        item.id,
                        {
                            quantity:
                                item.quantity
                                +
                                1
                        }
                    )
            )
    );


    quantity.append(
        minusButton,
        output,
        plusButton
    );


    const editButton =
        el(
            'button',
            {
                className:
                    'btn-nbj ghost sm',

                type:
                    'button',

                text:
                    'Edit options'
            }
        );


    editButton.addEventListener(
        'click',
        async () => {
            if (
                editButton.disabled
            ) {
                return;
            }


            editButton.disabled =
                true;


            try {
                await editItem(
                    item
                );

            } catch (error) {
                console.error(
                    'Load cart options error:',
                    error
                );


                notify(
                    error?.message
                    ||
                    'Unable to load item options.',
                    'danger'
                );

            } finally {
                editButton.disabled =
                    false;
            }
        }
    );


    const removeButton =
        el(
            'button',
            {
                className:
                    'btn btn-link text-danger p-0',

                type:
                    'button',

                text:
                    'Remove'
            }
        );


    removeButton.addEventListener(
        'click',
        () =>
            runCartMutation(
                removeButton,
                async () => {
                    await removeCartItem(
                        item.id
                    );


                    notify(
                        'Item removed.',
                        'success'
                    );
                }
            )
    );


    actions.append(
        el(
            'strong',
            {
                text:
                    money(
                        item.unit
                        *
                        item.quantity
                    )
            }
        ),

        quantity,

        editButton,

        removeButton
    );


    article.append(
        thumbnail,
        information,
        actions
    );


    return article;
}


async function editItem(
    item
) {
    const dialog =
        document.getElementById(
            'cart-edit-dialog'
        );


    const body =
        document.getElementById(
            'cart-edit-body'
        );


    if (
        !dialog ||
        !body
    ) {
        return;
    }


    body.replaceChildren();


    const product =
        await getProductById(
            item.product.id
        );


    body.append(
        el(
            'h3',
            {
                text:
                    `Edit ${product.name}`
            }
        )
    );


    if (
        product.variants
            ?.length
    ) {
        const field =
            el(
                'div',
                {
                    className:
                        'field'
                }
            );


        field.append(
            el(
                'label',
                {
                    text:
                        'Variant'
                }
            )
        );


        const select =
            el(
                'select',
                {
                    className:
                        'form-select',

                    name:
                        'variant_id'
                }
            );


        product.variants
            .filter(
                variant =>
                    variant.active
                    ||
                    variant.id ===
                        item.variant_id
            )
            .forEach(
                variant => {
                    const option =
                        el(
                            'option',
                            {
                                value:
                                    variant.id,

                                text:
                                    variant.price_delta
                                        ? `${variant.name} (${formatDelta(
                                            variant.price_delta
                                        )})`
                                        : variant.name
                            }
                        );


                    option.selected =
                        variant.id ===
                        item.variant_id;


                    select.append(
                        option
                    );
                }
            );


        field.append(
            select
        );


        body.append(
            field
        );
    }


    const existingAddonIds =
        new Set(
            selectedAddonIds(
                item
            )
        );


    const addonField =
        el(
            'div',
            {
                className:
                    'field'
            }
        );


    addonField.append(
        el(
            'label',
            {
                text:
                    'Add-ons'
            }
        )
    );


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
                addon
                &&
                (
                    addon.active
                    ||
                    existingAddonIds.has(
                        addon.id
                    )
                )
        )
        .forEach(
            addon => {
                const checkbox =
                    el(
                        'input',
                        {
                            type:
                                'checkbox',

                            name:
                                'addon_ids',

                            value:
                                addon.id
                        }
                    );


                checkbox.checked =
                    existingAddonIds.has(
                        addon.id
                    );


                addonField.append(
                    el(
                        'label',
                        {
                            className:
                                'd-flex gap-2'
                        },
                        [
                            checkbox,

                            document.createTextNode(
                                `${addon.name} (+${money(
                                    addon.price
                                )})`
                            )
                        ]
                    )
                );
            }
        );


    body.append(
        addonField
    );


    const removable =
        await listRemovableIngredients(
            product.id
        );


    if (removable.length) {
        const field =
            el(
                'div',
                {
                    className:
                        'field'
                }
            );


        field.append(
            el(
                'label',
                {
                    text:
                        'Remove ingredients'
                }
            )
        );


        const removed =
            new Set(
                item.removed_ingredients
                ||
                []
            );


        removable.forEach(
            ingredient => {
                const checkbox =
                    el(
                        'input',
                        {
                            type:
                                'checkbox',

                            name:
                                'removed_ingredients',

                            value:
                                ingredient.name
                        }
                    );


                checkbox.checked =
                    removed.has(
                        ingredient.name
                    );


                field.append(
                    el(
                        'label',
                        {
                            className:
                                'd-flex gap-2'
                        },
                        [
                            checkbox,

                            document.createTextNode(
                                `No ${ingredient.name}`
                            )
                        ]
                    )
                );
            }
        );


        body.append(
            field
        );
    }


    const note =
        el(
            'textarea',
            {
                className:
                    'form-control',

                name:
                    'instructions',

                maxlength:
                    '500',

                rows:
                    '3'
            }
        );


    note.value =
        item.instructions
        ||
        '';


    body.append(
        el(
            'div',
            {
                className:
                    'field'
            },
            [
                el(
                    'label',
                    {
                        text:
                            'Special instructions'
                    }
                ),

                note
            ]
        )
    );


    dialog.dataset.itemId =
        item.id;


    dialog.showModal();
}


function promotionIsCurrentlyActive(
    promotion
) {
    if (
        !promotion?.active
    ) {
        return false;
    }


    const now =
        Date.now();


    if (
        promotion.starts_at
        &&
        new Date(
            promotion.starts_at
        ).getTime() > now
    ) {
        return false;
    }


    if (
        promotion.ends_at
        &&
        new Date(
            promotion.ends_at
        ).getTime() <= now
    ) {
        return false;
    }


    return true;
}


export async function init() {
    if (!isConfigured) {
        return;
    }


    const editSaveButton =
        document.getElementById(
            'cart-edit-save'
        );


    const editDialog =
        document.getElementById(
            'cart-edit-dialog'
        );


    const editForm =
        document.getElementById(
            'cart-edit-form'
        );


    const promoForm =
        document.getElementById(
            'cart-promo-form'
        );


    if (
        !editSaveButton ||
        !editDialog ||
        !editForm ||
        !promoForm
    ) {
        console.warn(
            'Cart page elements were not found.'
        );

        return;
    }


    settings =
        await getPublicSettings();


    editSaveButton.addEventListener(
        'click',
        async () => {
            if (
                editSaveButton.disabled
            ) {
                return;
            }


            setBusy(
                editSaveButton,
                true,
                'Saving…'
            );


            try {
                const formData =
                    new FormData(
                        editForm
                    );


                await updateCartItem(
                    editDialog.dataset.itemId,
                    {
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

                        instructions:
                            String(
                                formData.get(
                                    'instructions'
                                )
                                ||
                                ''
                            ).trim()
                    }
                );


                editDialog.close();


                notify(
                    'Cart options updated.',
                    'success'
                );


                await render();

            } catch (error) {
                console.error(
                    'Save cart options error:',
                    error
                );


                notify(
                    error?.message
                    ||
                    'Unable to update cart options.',
                    'danger'
                );

            } finally {
                setBusy(
                    editSaveButton,
                    false
                );
            }
        }
    );


    promoForm.addEventListener(
        'submit',
        async event => {
            event.preventDefault();


            const button =
                promoForm.querySelector(
                    'button[type="submit"]'
                );


            if (
                button?.disabled
            ) {
                return;
            }


            const code =
                String(
                    new FormData(
                        promoForm
                    ).get('code')
                    ||
                    ''
                )
                    .trim()
                    .toUpperCase();


            if (!code) {
                return;
            }


            setBusy(
                button,
                true,
                'Checking…'
            );


            try {
                const supabase =
                    await getSupabase();


                const {
                    data,
                    error
                } =
                    await supabase
                        .from(
                            'promotions'
                        )
                        .select(
                            'code,title,active,starts_at,ends_at'
                        )
                        .eq(
                            'code',
                            code
                        )
                        .maybeSingle();


                if (error) {
                    throw error;
                }


                if (
                    !promotionIsCurrentlyActive(
                        data
                    )
                ) {
                    notify(
                        'That promotion code is not active.',
                        'danger'
                    );

                    return;
                }


                localStorage.setItem(
                    'nbj_promo_code',
                    code
                );


                notify(
                    `${data.title} will be validated and applied at checkout.`,
                    'success'
                );

            } catch (error) {
                console.error(
                    'Promotion lookup error:',
                    error
                );


                notify(
                    error?.message
                    ||
                    'Unable to validate that promotion code.',
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


    await render();
}