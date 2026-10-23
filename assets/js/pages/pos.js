import {
    listProducts
} from '../services/products.js';

import {
    createOrder
} from '../services/orders.js';

import {
    requireSupabase
} from '../core/supabase.js';

import {
    el,
    replaceChildren
} from '../core/dom.js';

import {
    money,
    notify,
    setBusy,
    uid
} from '../core/utils.js';


let products = [];

let cart = [];

let methods = [];

let customers = [];


function findProduct(
    productId
) {
    return products.find(
        product =>
            product.id ===
            productId
    );
}


function itemPrice(
    item
) {
    const product =
        findProduct(
            item.product_id
        );


    if (!product) {
        return 0;
    }


    const variant =
        product.variants
            ?.find(
                value =>
                    value.id ===
                    item.variant_id
            );


    const selectedAddons =
        new Set(
            item.addon_ids
            ||
            []
        );


    const addonTotal =
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
                    selectedAddons.has(
                        addon.id
                    )
            )
            .reduce(
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
            );


    return (
        Number(
            product.base_price
            ||
            0
        )
        +
        Number(
            variant?.price_delta
            ||
            0
        )
        +
        addonTotal
    );
}


function selectedAddonNames(
    item,
    product
) {
    const selected =
        new Set(
            item.addon_ids
            ||
            []
        );


    return (
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
                selected.has(
                    addon.id
                )
        )
        .map(
            addon =>
                addon.name
        );
}


function renderCart() {
    const container =
        document.getElementById(
            'pos-cart'
        );


    const totalNode =
        document.getElementById(
            'pos-total'
        );


    const placeButton =
        document.getElementById(
            'pos-place-order'
        );


    if (
        !container ||
        !totalNode ||
        !placeButton
    ) {
        return;
    }


    if (!cart.length) {
        replaceChildren(
            container,
            [
                el(
                    'div',
                    {
                        className:
                            'empty-state',

                        text:
                            'Select products to build a walk-in order.'
                    }
                )
            ]
        );

    } else {
        replaceChildren(
            container,
            cart.map(
                (
                    item,
                    index
                ) => {
                    const product =
                        findProduct(
                            item.product_id
                        );


                    if (!product) {
                        return el(
                            'div',
                            {
                                className:
                                    'panel p-2',

                                text:
                                    'Unavailable product'
                            }
                        );
                    }


                    const variant =
                        product.variants
                            ?.find(
                                value =>
                                    value.id ===
                                    item.variant_id
                            );


                    const addonNames =
                        selectedAddonNames(
                            item,
                            product
                        );


                    const row =
                        el(
                            'div',
                            {
                                className:
                                    'panel p-2'
                            },
                            [
                                el(
                                    'div',
                                    {
                                        className:
                                            'd-flex justify-content-between gap-2'
                                    },
                                    [
                                        el(
                                            'strong',
                                            {
                                                text:
                                                    `${item.quantity}× ${product.name}`
                                            }
                                        ),

                                        el(
                                            'strong',
                                            {
                                                text:
                                                    money(
                                                        itemPrice(
                                                            item
                                                        )
                                                        *
                                                        item.quantity
                                                    )
                                            }
                                        )
                                    ]
                                ),

                                variant
                                    ? el(
                                        'div',
                                        {
                                            className:
                                                'help-text',

                                            text:
                                                variant.name
                                        }
                                    )
                                    : null,

                                addonNames.length
                                    ? el(
                                        'div',
                                        {
                                            className:
                                                'help-text',

                                            text:
                                                addonNames.join(
                                                    ', '
                                                )
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


                    const removeButton =
                        el(
                            'button',
                            {
                                type:
                                    'button',

                                className:
                                    'btn btn-link text-danger p-0',

                                text:
                                    'Remove'
                            }
                        );


                    removeButton.onclick =
                        () => {
                            cart.splice(
                                index,
                                1
                            );


                            renderCart();
                        };


                    row.append(
                        removeButton
                    );


                    return row;
                }
            )
        );
    }


    const subtotal =
        cart.reduce(
            (
                total,
                item
            ) =>
                total
                +
                itemPrice(
                    item
                )
                *
                item.quantity,
            0
        );


    totalNode.textContent =
        money(
            subtotal
        );


    placeButton.disabled =
        !cart.length;
}


function formatPriceDelta(
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


function getItemFields() {
    let fields =
        document.getElementById(
            'pos-item-fields'
        );


    if (fields) {
        return fields;
    }


    /*
     * Fallback without destroying the existing
     * #pos-item-form or its submit button.
     */
    const form =
        document.getElementById(
            'pos-item-form'
        );


    if (!form) {
        return null;
    }


    fields =
        el(
            'div',
            {
                id:
                    'pos-item-fields'
            }
        );


    form.prepend(
        fields
    );


    return fields;
}


function customize(
    product
) {
    const dialog =
        document.getElementById(
            'pos-dialog'
        );


    const fields =
        getItemFields();


    if (
        !dialog ||
        !fields
    ) {
        return;
    }


    replaceChildren(
        fields,
        [
            el(
                'h3',
                {
                    text:
                        product.name
                }
            )
        ]
    );


    const activeVariants =
        (
            product.variants || []
        )
            .filter(
                variant =>
                    variant.active
            );


    if (
        activeVariants.length
    ) {
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


        activeVariants.forEach(
            variant => {
                select.append(
                    el(
                        'option',
                        {
                            value:
                                variant.id,

                            text:
                                `${variant.name}${formatPriceDelta(
                                    variant.price_delta
                                )}`
                        }
                    )
                );
            }
        );


        fields.append(
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
                                'Variant'
                        }
                    ),

                    select
                ]
            )
        );
    }


    const availableAddons =
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


    if (
        availableAddons.length
    ) {
        const addonField =
            el(
                'div',
                {
                    className:
                        'field'
                },
                el(
                    'label',
                    {
                        text:
                            'Add-ons'
                    }
                )
            );


        availableAddons.forEach(
            addon => {
                addonField.append(
                    el(
                        'label',
                        {
                            className:
                                'd-flex gap-2'
                        },
                        [
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
                            ),

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


        fields.append(
            addonField
        );
    }


    fields.append(
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
                            'Quantity'
                    }
                ),

                el(
                    'input',
                    {
                        type:
                            'number',

                        name:
                            'quantity',

                        className:
                            'form-control',

                        min:
                            '1',

                        max:
                            '20',

                        value:
                            '1',

                        required:
                            'required'
                    }
                )
            ]
        ),

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
                            'Note'
                    }
                ),

                el(
                    'input',
                    {
                        name:
                            'instructions',

                        className:
                            'form-control',

                        maxlength:
                            '500',

                        placeholder:
                            'Kitchen note'
                    }
                )
            ]
        )
    );


    dialog.dataset.productId =
        product.id;


    dialog.showModal();
}


function renderProducts() {
    const container =
        document.getElementById(
            'pos-products'
        );


    if (!container) {
        return;
    }


    const available =
        products.filter(
            product =>
                product.active !==
                false
                &&
                !product.manually_sold_out
        );


    replaceChildren(
        container,
        available.map(
            product => {
                const button =
                    el(
                        'button',
                        {
                            className:
                                'pos-product',

                            type:
                                'button'
                        },
                        [
                            el(
                                'strong',
                                {
                                    text:
                                        product.name
                                }
                            ),

                            el(
                                'div',
                                {
                                    className:
                                        'help-text',

                                    text:
                                        product.category
                                            ?.name
                                        ||
                                        ''
                                }
                            ),

                            el(
                                'div',
                                {
                                    className:
                                        'price',

                                    text:
                                        money(
                                            product.base_price
                                            ||
                                            0
                                        )
                                }
                            )
                        ]
                    );


                button.onclick =
                    () =>
                        customize(
                            product
                        );


                return button;
            }
        )
    );
}


function populatePaymentMethods() {
    const select =
        document.getElementById(
            'pos-payment'
        );


    if (!select) {
        return;
    }


    replaceChildren(
        select,
        [
            el(
                'option',
                {
                    value:
                        '',

                    text:
                        'Select payment method'
                }
            )
        ]
    );


    methods.forEach(
        method => {
            select.append(
                el(
                    'option',
                    {
                        value:
                            method.code,

                        text:
                            method.name
                    }
                )
            );
        }
    );
}


function populateCustomers() {
    const select =
        document.getElementById(
            'pos-customer'
        );


    if (!select) {
        return;
    }


    replaceChildren(
        select,
        [
            el(
                'option',
                {
                    value:
                        '',

                    text:
                        'Walk-in Customer'
                }
            )
        ]
    );


    customers.forEach(
        customer => {
            select.append(
                el(
                    'option',
                    {
                        value:
                            customer.id,

                        text:
                            customer.full_name
                            ||
                            customer.phone
                            ||
                            customer.id
                    }
                )
            );
        }
    );
}


function setWalkInCustomer(
    customer = null
) {
    const name =
        document.getElementById(
            'pos-name'
        );


    const phone =
        document.getElementById(
            'pos-phone'
        );


    if (name) {
        name.value =
            customer?.full_name
            ||
            'Walk-in Customer';
    }


    if (phone) {
        phone.value =
            customer?.phone
            ||
            'Walk-in';
    }
}


export async function init() {
    const supabase =
        await requireSupabase();


    const [
        loadedProducts,
        methodResult,
        customerResult
    ] =
        await Promise.all([
            listProducts(),

            supabase
                .from(
                    'payment_methods'
                )
                .select('*')
                .eq(
                    'active',
                    true
                )
                .order(
                    'sort_order'
                ),

            supabase
                .from(
                    'profiles'
                )
                .select(
                    'id,full_name,phone'
                )
                .eq(
                    'role',
                    'CUSTOMER'
                )
                .eq(
                    'active',
                    true
                )
                .order(
                    'full_name'
                )
                .limit(
                    500
                )
        ]);


    if (methodResult.error) {
        throw methodResult.error;
    }


    if (customerResult.error) {
        throw customerResult.error;
    }


    products =
        loadedProducts || [];


    methods =
        methodResult.data || [];


    customers =
        customerResult.data || [];


    renderProducts();

    populatePaymentMethods();

    populateCustomers();

    setWalkInCustomer();


    const customerSelect =
        document.getElementById(
            'pos-customer'
        );


    customerSelect?.addEventListener(
        'change',
        () => {
            const customer =
                customers.find(
                    item =>
                        item.id ===
                        customerSelect.value
                );


            setWalkInCustomer(
                customer || null
            );
        }
    );


    const itemForm =
        document.getElementById(
            'pos-item-form'
        );


    itemForm?.addEventListener(
        'submit',
        event => {
            event.preventDefault();


            const dialog =
                document.getElementById(
                    'pos-dialog'
                );


            const product =
                findProduct(
                    dialog?.dataset
                        .productId
                );


            if (
                !dialog ||
                !product
            ) {
                return;
            }


            const formData =
                new FormData(
                    itemForm
                );


            const quantity =
                Math.min(
                    20,
                    Math.max(
                        1,
                        Number(
                            formData.get(
                                'quantity'
                            )
                            ||
                            1
                        )
                    )
                );


            cart.push({
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
                    [],

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


            dialog.close();


            renderCart();
        }
    );


    const placeButton =
        document.getElementById(
            'pos-place-order'
        );


    placeButton?.addEventListener(
        'click',
        async () => {
            if (
                placeButton.disabled
                ||
                !cart.length
            ) {
                return;
            }


            const payment =
                document.getElementById(
                    'pos-payment'
                )
                    ?.value
                ||
                '';


            if (!payment) {
                notify(
                    'Select a payment method.',
                    'danger'
                );

                return;
            }


            setBusy(
                placeButton,
                true,
                'Creating…'
            );


            try {
                const result =
                    await createOrder(
                        {
                            source:
                                'POS',

                            customer_id:
                                customerSelect
                                    ?.value
                                ||
                                null,

                            customer_name:
                                document
                                    .getElementById(
                                        'pos-name'
                                    )
                                    ?.value
                                    .trim()
                                ||
                                'Walk-in Customer',

                            customer_phone:
                                document
                                    .getElementById(
                                        'pos-phone'
                                    )
                                    ?.value
                                    .trim()
                                ||
                                'Walk-in',

                            customer_email:
                                '',

                            fulfillment_type:
                                'PICKUP',

                            payment_method:
                                payment,

                            payment_paid:
                                Boolean(
                                    document
                                        .getElementById(
                                            'pos-paid'
                                        )
                                        ?.checked
                                ),

                            pickup_notes:
                                'POS / walk-in order',

                            items:
                                cart
                        },

                        uid()
                    );


                notify(
                    `Created ${result.order_number}.`,
                    'success'
                );


                window.location.href =
                    `order-details.html?id=${encodeURIComponent(
                        result.order_id
                    )}`;

            } catch (error) {
                console.error(
                    'POS order creation error:',
                    error
                );


                notify(
                    error?.message
                    ||
                    'Unable to create the order.',
                    'danger'
                );


                setBusy(
                    placeButton,
                    false
                );
            }
        }
    );


    renderCart();
}