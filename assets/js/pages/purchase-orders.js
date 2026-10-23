import {
    requireSupabase
} from '../core/supabase.js';

import {
    receivePurchaseOrder
} from '../services/inventory.js';

import {
    el,
    replaceChildren
} from '../core/dom.js';

import {
    money,
    formatDate,
    notify,
    setBusy
} from '../core/utils.js';


let supabase = null;

let purchaseOrders = [];

let suppliers = [];

let inventory = [];


async function load() {
    const [
        poResult,
        supplierResult,
        inventoryResult
    ] =
        await Promise.all([
            supabase
                .from(
                    'purchase_orders'
                )
                .select(
                    `
                    *,
                    supplier:suppliers(name),
                    items:purchase_order_items(
                        *,
                        inventory:inventory_items(
                            sku,
                            ingredient:ingredients(
                                name,
                                unit
                            )
                        )
                    )
                    `
                )
                .order(
                    'created_at',
                    {
                        ascending:
                            false
                    }
                ),

            supabase
                .from(
                    'suppliers'
                )
                .select(
                    'id,name'
                )
                .eq(
                    'active',
                    true
                )
                .order(
                    'name'
                ),

            supabase
                .from(
                    'inventory_items'
                )
                .select(
                    `
                    id,
                    sku,
                    unit_cost,
                    ingredient:ingredients(
                        name,
                        unit
                    )
                    `
                )
                .eq(
                    'active',
                    true
                )
                .order(
                    'sku'
                )
        ]);


    if (poResult.error) {
        throw poResult.error;
    }


    if (supplierResult.error) {
        throw supplierResult.error;
    }


    if (inventoryResult.error) {
        throw inventoryResult.error;
    }


    purchaseOrders =
        poResult.data || [];


    suppliers =
        supplierResult.data || [];


    inventory =
        inventoryResult.data || [];


    render();
}


function purchaseOrderTotal(
    po
) {
    return (
        po.items || []
    )
        .reduce(
            (
                total,
                item
            ) =>
                total
                +
                Number(
                    item.requested_quantity
                    ||
                    0
                )
                *
                Number(
                    item.unit_cost
                    ||
                    0
                ),
            0
        );
}


function render() {
    const tbody =
        document.getElementById(
            'po-tbody'
        );


    if (!tbody) {
        return;
    }


    if (!purchaseOrders.length) {
        replaceChildren(
            tbody,
            [
                el(
                    'tr',
                    {},
                    [
                        el(
                            'td',
                            {
                                colspan: '7',
                                className:
                                    'text-center muted py-4',
                                text:
                                    'No purchase orders found.'
                            }
                        )
                    ]
                )
            ]
        );

        return;
    }


    replaceChildren(
        tbody,
        purchaseOrders.map(
            po => {
                const status =
                    String(
                        po.status
                        ||
                        ''
                    );


                const actions =
                    el(
                        'td',
                        {
                            className:
                                'cluster'
                        }
                    );


                if (
                    [
                        'ORDERED',
                        'PARTIALLY_RECEIVED'
                    ]
                        .includes(
                            po.status
                        )
                ) {
                    const receive =
                        el(
                            'button',
                            {
                                className:
                                    'btn-nbj sm',
                                type:
                                    'button',
                                text:
                                    'Receive'
                            }
                        );


                    receive.onclick =
                        () =>
                            openReceive(
                                po
                            );


                    actions.append(
                        receive
                    );
                }


                const details =
                    el(
                        'button',
                        {
                            className:
                                'btn-nbj ghost sm',
                            type:
                                'button',
                            text:
                                'Details'
                        }
                    );


                details.onclick =
                    () =>
                        openDetails(
                            po
                        );


                actions.append(
                    details
                );


                return el(
                    'tr',
                    {},
                    [
                        el(
                            'td',
                            {
                                text:
                                    po.po_number
                                    ||
                                    '—'
                            }
                        ),

                        el(
                            'td',
                            {
                                text:
                                    po.supplier
                                        ?.name
                                    ||
                                    '—'
                            }
                        ),

                        el(
                            'td',
                            {},
                            el(
                                'span',
                                {
                                    className:
                                        `status-pill ${status.toLowerCase()}`,
                                    text:
                                        status
                                            .replaceAll(
                                                '_',
                                                ' '
                                            )
                                        ||
                                        '—'
                                }
                            )
                        ),

                        el(
                            'td',
                            {
                                text:
                                    String(
                                        po.items
                                            ?.length
                                        ||
                                        0
                                    )
                            }
                        ),

                        el(
                            'td',
                            {
                                text:
                                    money(
                                        purchaseOrderTotal(
                                            po
                                        )
                                    )
                            }
                        ),

                        el(
                            'td',
                            {
                                text:
                                    po.expected_date
                                        ? formatDate(
                                            po.expected_date,
                                            {
                                                dateOnly:
                                                    true
                                            }
                                        )
                                        : '—'
                            }
                        ),

                        actions
                    ]
                );
            }
        )
    );
}


function lineRow() {
    const row =
        el(
            'div',
            {
                className:
                    'portal-form-grid panel p-2 po-line'
            }
        );


    const select =
        el(
            'select',
            {
                className:
                    'form-select',

                name:
                    'inventory_item_id',

                required:
                    'required'
            }
        );


    select.append(
        el(
            'option',
            {
                value:
                    '',

                text:
                    'Select inventory item'
            }
        )
    );


    inventory.forEach(
        item => {
            select.append(
                el(
                    'option',
                    {
                        value:
                            item.id,

                        text:
                            `${item.sku} · ${
                                item.ingredient
                                    ?.name
                                ||
                                'Ingredient'
                            }`
                    }
                )
            );
        }
    );


    const quantity =
        el(
            'input',
            {
                className:
                    'form-control',

                name:
                    'quantity',

                type:
                    'number',

                min:
                    '0.001',

                step:
                    '0.001',

                required:
                    'required',

                placeholder:
                    'Quantity'
            }
        );


    const cost =
        el(
            'input',
            {
                className:
                    'form-control',

                name:
                    'cost',

                type:
                    'number',

                min:
                    '0',

                step:
                    '0.0001',

                required:
                    'required',

                placeholder:
                    'Unit cost'
            }
        );


    select.onchange =
        () => {
            const item =
                inventory.find(
                    value =>
                        value.id ===
                        select.value
                );


            if (item) {
                cost.value =
                    item.unit_cost
                    ??
                    '';
            }
        };


    const remove =
        el(
            'button',
            {
                className:
                    'btn btn-link text-danger',

                type:
                    'button',

                text:
                    'Remove'
            }
        );


    remove.onclick =
        () =>
            row.remove();


    row.append(
        select,
        quantity,
        cost,
        remove
    );


    return row;
}


function openCreate() {
    const dialog =
        document.getElementById(
            'po-dialog'
        );


    const form =
        document.getElementById(
            'po-form'
        );


    const lines =
        document.getElementById(
            'po-lines'
        );


    if (
        !dialog ||
        !form ||
        !lines
    ) {
        return;
    }


    form.reset();


    const supplierSelect =
        form.elements.namedItem(
            'supplier_id'
        );


    if (supplierSelect) {
        replaceChildren(
            supplierSelect,
            [
                el(
                    'option',
                    {
                        value:
                            '',

                        text:
                            'Select supplier'
                    }
                )
            ]
        );


        suppliers.forEach(
            supplier => {
                supplierSelect.append(
                    el(
                        'option',
                        {
                            value:
                                supplier.id,

                            text:
                                supplier.name
                        }
                    )
                );
            }
        );
    }


    replaceChildren(
        lines,
        [
            lineRow()
        ]
    );


    dialog.showModal();
}


function openReceive(po) {
    const dialog =
        document.getElementById(
            'receive-dialog'
        );


    const title =
        document.getElementById(
            'receive-title'
        );


    const body =
        document.getElementById(
            'receive-lines'
        );


    if (
        !dialog ||
        !body
    ) {
        return;
    }


    dialog.dataset.id =
        po.id;


    if (title) {
        title.textContent =
            `Receive ${po.po_number}`;
    }


    const remainingItems =
        (
            po.items || []
        )
            .filter(
                item =>
                    Number(
                        item.received_quantity
                        ||
                        0
                    )
                    <
                    Number(
                        item.requested_quantity
                        ||
                        0
                    )
            );


    replaceChildren(
        body,
        remainingItems.map(
            item => {
                const remaining =
                    Number(
                        item.requested_quantity
                        ||
                        0
                    )
                    -
                    Number(
                        item.received_quantity
                        ||
                        0
                    );


                return el(
                    'label',
                    {
                        className:
                            'field panel p-2'
                    },
                    [
                        el(
                            'span',
                            {
                                text:
                                    `${
                                        item.inventory
                                            ?.ingredient
                                            ?.name
                                        ||
                                        'Ingredient'
                                    } · remaining ${remaining} ${
                                        item.inventory
                                            ?.ingredient
                                            ?.unit
                                        ||
                                        ''
                                    }`
                            }
                        ),

                        el(
                            'input',
                            {
                                className:
                                    'form-control',

                                type:
                                    'number',

                                min:
                                    '0',

                                max:
                                    String(
                                        remaining
                                    ),

                                step:
                                    '0.001',

                                value:
                                    String(
                                        remaining
                                    ),

                                'data-po-item':
                                    item.id
                            }
                        )
                    ]
                );
            }
        )
    );


    dialog.showModal();
}


function openDetails(po) {
    const dialog =
        document.getElementById(
            'po-details-dialog'
        );


    const title =
        document.getElementById(
            'po-details-title'
        );


    const body =
        document.getElementById(
            'po-details-body'
        );


    if (
        !dialog ||
        !body
    ) {
        return;
    }


    if (title) {
        title.textContent =
            po.po_number;
    }


    replaceChildren(
        body,
        [
            el(
                'p',
                {
                    text:
                        `Supplier: ${
                            po.supplier
                                ?.name
                            ||
                            '—'
                        } · Status: ${
                            po.status
                            ||
                            '—'
                        }`
                }
            ),

            el(
                'div',
                {},
                (
                    po.items || []
                )
                    .map(
                        item =>
                            el(
                                'div',
                                {
                                    className:
                                        'summary-row'
                                },
                                [
                                    el(
                                        'span',
                                        {
                                            text:
                                                `${
                                                    item.inventory
                                                        ?.ingredient
                                                        ?.name
                                                    ||
                                                    'Ingredient'
                                                } · ${
                                                    item.received_quantity
                                                    ||
                                                    0
                                                }/${
                                                    item.requested_quantity
                                                    ||
                                                    0
                                                }`
                                        }
                                    ),

                                    el(
                                        'span',
                                        {
                                            text:
                                                money(
                                                    Number(
                                                        item.requested_quantity
                                                        ||
                                                        0
                                                    )
                                                    *
                                                    Number(
                                                        item.unit_cost
                                                        ||
                                                        0
                                                    )
                                                )
                                        }
                                    )
                                ]
                            )
                    )
            )
        ]
    );


    dialog.showModal();
}


function collectLines() {
    const lines =
        [
            ...document
                .querySelectorAll(
                    '#po-lines .po-line'
                )
        ]
            .map(
                row => ({
                    inventory_item_id:
                        row
                            .querySelector(
                                '[name="inventory_item_id"]'
                            )
                            ?.value
                        ||
                        '',

                    requested_quantity:
                        Number(
                            row
                                .querySelector(
                                    '[name="quantity"]'
                                )
                                ?.value
                            ||
                            0
                        ),

                    unit_cost:
                        Number(
                            row
                                .querySelector(
                                    '[name="cost"]'
                                )
                                ?.value
                            ||
                            0
                        )
                })
            )
            .filter(
                line =>
                    line.inventory_item_id
                    &&
                    line.requested_quantity >
                        0
            );


    const ids =
        lines.map(
            line =>
                line.inventory_item_id
        );


    if (
        new Set(ids).size !==
        ids.length
    ) {
        throw new Error(
            'Each inventory item can only appear once in a purchase order.'
        );
    }


    return lines;
}


export async function init() {
    supabase =
        await requireSupabase();



    const addButton =
        document.getElementById(
            'po-add'
        );


    const addLineButton =
        document.getElementById(
            'po-add-line'
        );


    const form =
        document.getElementById(
            'po-form'
        );


    const receiveButton =
        document.getElementById(
            'receive-save'
        );


    if (
        !addButton ||
        !addLineButton ||
        !form ||
        !receiveButton
    ) {
        console.warn(
            'Purchase-order page elements were not found.'
        );

        return;
    }


    addButton.onclick =
        openCreate;


    addLineButton.onclick =
        () =>
            document
                .getElementById(
                    'po-lines'
                )
                ?.append(
                    lineRow()
                );


    let pendingKey = null;
    form.addEventListener('input', () => { pendingKey = null; });
    form.addEventListener('change', () => { pendingKey = null; });

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
                'Creating…'
            );


            try {
                const formData =
                    new FormData(
                        form
                    );


                const supplierId =
                    formData.get(
                        'supplier_id'
                    );


                if (!supplierId) {
                    throw new Error(
                        'Select a supplier.'
                    );
                }


                const lines =
                    collectLines();


                if (!lines.length) {
                    throw new Error(
                        'Add at least one purchase-order item.'
                    );
                }

                pendingKey ||= crypto.randomUUID();


                const {
                    data: po,
                    error
                } =
                    await supabase
                        .rpc('create_purchase_order', {
                            p_supplier_id: supplierId,
                            p_lines: lines,
                            p_expected_date: formData.get('expected_date') || null,
                            p_notes: String(formData.get('notes') || '').trim(),
                            p_idempotency_key: pendingKey
                        });


                if (error) {
                    throw error;
                }


                document
                    .getElementById(
                        'po-dialog'
                    )
                    ?.close();


                notify(
                    `${po.po_number} created.`,
                    'success'
                );

                await load();

                pendingKey = null;

            } catch (error) {
                console.error(
                    'Create purchase order error:',
                    error
                );


                notify(
                    error?.message
                    ||
                    'Unable to create the purchase order.',
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


    receiveButton.onclick =
        async () => {
            if (
                receiveButton.disabled
            ) {
                return;
            }


            const dialog =
                document.getElementById(
                    'receive-dialog'
                );


            if (!dialog) {
                return;
            }


            const receipts =
                [
                    ...document
                        .querySelectorAll(
                            '#receive-lines [data-po-item]'
                        )
                ]
                    .map(
                        input => ({
                            purchase_order_item_id:
                                input.dataset
                                    .poItem,

                            quantity:
                                Number(
                                    input.value
                                )
                        })
                    )
                    .filter(
                        receipt =>
                            Number.isFinite(
                                receipt.quantity
                            )
                            &&
                            receipt.quantity >
                                0
                    );


            if (!receipts.length) {
                notify(
                    'Enter at least one received quantity.',
                    'warning'
                );

                return;
            }


            setBusy(
                receiveButton,
                true,
                'Receiving…'
            );


            try {
                await receivePurchaseOrder(
                    dialog.dataset.id,
                    receipts
                );


                dialog.close();


                notify(
                    'Stock received and inventory movements recorded.',
                    'success'
                );


                await load();

            } catch (error) {
                console.error(
                    'Receive purchase order error:',
                    error
                );


                notify(
                    error?.message
                    ||
                    'Unable to receive the purchase order.',
                    'danger'
                );

            } finally {
                setBusy(
                    receiveButton,
                    false
                );
            }
        };


    await load();
}
