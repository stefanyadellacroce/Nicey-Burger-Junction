import {
    crudList,
    crudSave,
    archive
} from '../services/admin.js';

import {
    requireSupabase
} from '../core/supabase.js';

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


const configs = {
    categories: {
        table:
            'categories',

        title:
            'Category',

        order:
            'sort_order',

        columns: [
            [
                'name',
                'Name'
            ],
            [
                'slug',
                'Slug'
            ],
            [
                'sort_order',
                'Sort'
            ],
            [
                'active',
                'Status'
            ]
        ],

        fields: [
            [
                'name',
                'Name',
                'text',
                true
            ],
            [
                'slug',
                'Slug',
                'text',
                true
            ],
            [
                'description',
                'Description',
                'textarea'
            ],
            [
                'sort_order',
                'Sort order',
                'number'
            ],
            [
                'active',
                'Active',
                'checkbox'
            ]
        ]
    },


    addons: {
        table:
            'addons',

        title:
            'Add-on',

        order:
            'name',

        columns: [
            [
                'name',
                'Name'
            ],
            [
                'price',
                'Price',
                'money'
            ],
            [
                'active',
                'Status'
            ]
        ],

        fields: [
            [
                'name',
                'Name',
                'text',
                true
            ],
            [
                'price',
                'Price',
                'number',
                true
            ],
            [
                'active',
                'Active',
                'checkbox'
            ]
        ]
    },


    ingredients: {
        table:
            'ingredients',

        title:
            'Ingredient',

        order:
            'name',

        columns: [
            [
                'name',
                'Name'
            ],
            [
                'category',
                'Category'
            ],
            [
                'unit',
                'Unit'
            ],
            [
                'active',
                'Status'
            ]
        ],

        fields: [
            [
                'name',
                'Name',
                'text',
                true
            ],
            [
                'category',
                'Category',
                'text'
            ],
            [
                'unit',
                'Unit',
                'select',
                true,
                [
                    'pc',
                    'g',
                    'kg',
                    'ml',
                    'l',
                    'slice',
                    'pack',
                    'serving'
                ]
            ],
            [
                'active',
                'Active',
                'checkbox'
            ]
        ]
    },


    suppliers: {
        table:
            'suppliers',

        title:
            'Supplier',

        order:
            'name',

        columns: [
            [
                'name',
                'Supplier'
            ],
            [
                'contact_person',
                'Contact'
            ],
            [
                'phone',
                'Phone'
            ],
            [
                'email',
                'Email'
            ],
            [
                'active',
                'Status'
            ]
        ],

        fields: [
            [
                'name',
                'Supplier name',
                'text',
                true
            ],
            [
                'contact_person',
                'Contact person',
                'text'
            ],
            [
                'phone',
                'Phone',
                'text'
            ],
            [
                'email',
                'Email',
                'email'
            ],
            [
                'address',
                'Address',
                'textarea'
            ],
            [
                'notes',
                'Notes',
                'textarea'
            ],
            [
                'active',
                'Active',
                'checkbox'
            ]
        ]
    },


    promotions: {
        table:
            'promotions',

        title:
            'Promotion',

        order:
            'created_at',

        ascending:
            false,

        columns: [
            [
                'code',
                'Code'
            ],
            [
                'title',
                'Title'
            ],
            [
                'promo_type',
                'Type'
            ],
            [
                'amount',
                'Amount'
            ],
            [
                'minimum_spend',
                'Min spend',
                'money'
            ],
            [
                'ends_at',
                'Ends',
                'date'
            ],
            [
                'active',
                'Status'
            ]
        ],

        fields: [
            [
                'code',
                'Code',
                'text'
            ],
            [
                'title',
                'Title',
                'text',
                true
            ],
            [
                'description',
                'Description',
                'textarea'
            ],
            [
                'promo_type',
                'Type',
                'select',
                true,
                [
                    'PERCENTAGE',
                    'FIXED',
                    'PRODUCT',
                    'CATEGORY',
                    'COMBO'
                ]
            ],
            [
                'amount',
                'Amount / percent',
                'number',
                true
            ],
            [
                'minimum_spend',
                'Minimum spend',
                'number'
            ],
            [
                'maximum_discount',
                'Maximum discount',
                'number'
            ],
            [
                'usage_limit',
                'Usage limit',
                'number'
            ],
            [
                'per_user_limit',
                'Per-user limit',
                'number'
            ],
            [
                'starts_at',
                'Starts',
                'datetime-local'
            ],
            [
                'ends_at',
                'Ends',
                'datetime-local'
            ],
            [
                'automatic',
                'Automatic',
                'checkbox'
            ],
            [
                'active',
                'Active',
                'checkbox'
            ]
        ]
    },


    'expense-categories': {
        table:
            'expense_categories',

        title:
            'Expense category',

        order:
            'name',

        columns: [
            [
                'name',
                'Name'
            ],
            [
                'active',
                'Status'
            ]
        ],

        fields: [
            [
                'name',
                'Name',
                'text',
                true
            ],
            [
                'active',
                'Active',
                'checkbox'
            ]
        ]
    },


    expenses: {
        table:
            'expenses',

        title:
            'Expense',

        order:
            'expense_date',

        ascending:
            false,

        select:
            '*,category:expense_categories(name)',

        columns: [
            [
                'expense_date',
                'Date',
                'date'
            ],
            [
                'category.name',
                'Category'
            ],
            [
                'description',
                'Description'
            ],
            [
                'amount',
                'Amount',
                'money'
            ],
            [
                'payment_method',
                'Method'
            ],
            [
                'reference',
                'Reference'
            ]
        ],

        fields: [
            [
                'category_id',
                'Category',
                'lookup',
                true,
                {
                    table:
                        'expense_categories',

                    label:
                        'name'
                }
            ],
            [
                'description',
                'Description',
                'text',
                true
            ],
            [
                'amount',
                'Amount',
                'number',
                true
            ],
            [
                'expense_date',
                'Date',
                'date-input',
                true
            ],
            [
                'payment_method',
                'Payment method',
                'text'
            ],
            [
                'reference',
                'Reference',
                'text'
            ],
            [
                'notes',
                'Notes',
                'textarea'
            ]
        ],

        deletable:
            false
    }
};


let cfg = null;

let rows = [];


function valueAt(
    row,
    path
) {
    return path
        .split('.')
        .reduce(
            (
                value,
                key
            ) =>
                value?.[key],
            row
        );
}


function displayValue(
    value,
    type
) {
    if (
        type ===
        'money'
    ) {
        return money(
            value
        );
    }


    if (
        type ===
        'date'
    ) {
        return value
            ? formatDate(
                value,
                {
                    dateOnly:
                        true
                }
            )
            : '—';
    }


    if (
        typeof value ===
        'boolean'
    ) {
        return value
            ? 'Active'
            : 'Inactive';
    }


    return value ?? '—';
}


function toLocalDateTimeInput(
    value
) {
    if (!value) {
        return '';
    }


    const date =
        new Date(
            value
        );


    if (
        Number.isNaN(
            date.getTime()
        )
    ) {
        return '';
    }


    const local =
        new Date(
            date.getTime()
            -
            date.getTimezoneOffset()
            *
            60000
        );


    return local
        .toISOString()
        .slice(
            0,
            16
        );
}


function render() {
    const search =
        document.getElementById(
            'crud-search'
        );


    const tbody =
        document.getElementById(
            'crud-tbody'
        );


    if (
        !search ||
        !tbody
    ) {
        return;
    }


    const term =
        search.value
            .trim()
            .toLowerCase();


    const filtered =
        term
            ? rows.filter(
                row =>
                    JSON.stringify(row)
                        .toLowerCase()
                        .includes(term)
            )
            : rows;


    if (!filtered.length) {
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
                                colspan:
                                    String(
                                        cfg.columns.length
                                        +
                                        1
                                    ),

                                className:
                                    'text-center muted py-4',

                                text:
                                    term
                                        ? `No matching ${cfg.title.toLowerCase()} records found.`
                                        : `No ${cfg.title.toLowerCase()} records found.`
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
        filtered.map(
            row => {
                const tr =
                    el(
                        'tr'
                    );


                cfg.columns.forEach(
                    (
                        [
                            key,
                            ,
                            type
                        ]
                    ) => {
                        tr.append(
                            el(
                                'td',
                                {
                                    text:
                                        String(
                                            displayValue(
                                                valueAt(
                                                    row,
                                                    key
                                                ),
                                                type
                                            )
                                        )
                                }
                            )
                        );
                    }
                );


                const actionCell =
                    el(
                        'td',
                        {
                            className:
                                'cluster'
                        }
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
                                'Edit'
                        }
                    );


                editButton.onclick =
                    () =>
                        showEditor(
                            row
                        );


                actionCell.append(
                    editButton
                );


                if (
                    cfg.deletable !== false
                    &&
                    'active' in row
                ) {
                    const toggleButton =
                        el(
                            'button',
                            {
                                className:
                                    'btn btn-link p-0',

                                type:
                                    'button',

                                text:
                                    row.active
                                        ? 'Deactivate'
                                        : 'Activate'
                            }
                        );


                    toggleButton.onclick =
                        async () => {
                            if (
                                toggleButton.disabled
                            ) {
                                return;
                            }


                            setBusy(
                                toggleButton,
                                true,
                                row.active
                                    ? 'Deactivating…'
                                    : 'Activating…'
                            );


                            try {
                                await archive(
                                    cfg.table,
                                    row.id,
                                    !row.active
                                );


                                notify(
                                    `${cfg.title} ${
                                        row.active
                                            ? 'deactivated'
                                            : 'activated'
                                    }.`,
                                    'success'
                                );


                                await loadRows();

                            } catch (error) {
                                console.error(
                                    'Archive error:',
                                    error
                                );


                                notify(
                                    error?.message
                                    ||
                                    `Unable to update ${cfg.title.toLowerCase()}.`,
                                    'danger'
                                );

                            } finally {
                                setBusy(
                                    toggleButton,
                                    false
                                );
                            }
                        };


                    actionCell.append(
                        toggleButton
                    );
                }


                tr.append(
                    actionCell
                );


                return tr;
            }
        )
    );
}


async function loadRows() {
    rows =
        await crudList(
            cfg.table,
            cfg.select || '*',
            {
                order:
                    cfg.order,

                ascending:
                    cfg.ascending
                    ??
                    true
            }
        );


    render();
}


async function fieldNode(
    spec,
    row
) {
    const [
        name,
        label,
        type,
        required,
        extra
    ] =
        spec;


    const id =
        `crud-${name}`;


    if (
        type ===
        'checkbox'
    ) {
        const input =
            el(
                'input',
                {
                    id,
                    name,
                    type:
                        'checkbox',
                    className:
                        'form-check-input'
                }
            );


        input.checked =
            row ? Boolean(row[name]) : name === 'active';


        return el(
            'div',
            {
                className:
                    'form-check'
            },
            [
                input,

                el(
                    'label',
                    {
                        className:
                            'form-check-label',

                        for:
                            id,

                        text:
                            label
                    }
                )
            ]
        );
    }


    const wrapper =
        el(
            'div',
            {
                className:
                    'field'
            }
        );


    wrapper.append(
        el(
            'label',
            {
                for:
                    id,

                text:
                    label
            }
        )
    );


    let input;


    if (
        type ===
        'textarea'
    ) {
        input =
            el(
                'textarea',
                {
                    id,
                    name,
                    className:
                        'form-control',
                    rows:
                        '3',
                    ...(
                        required
                            ? {
                                required:
                                    'required'
                            }
                            : {}
                    )
                }
            );

    } else if (
        type ===
        'select'
    ) {
        input =
            el(
                'select',
                {
                    id,
                    name,
                    className:
                        'form-select',
                    ...(
                        required
                            ? {
                                required:
                                    'required'
                            }
                            : {}
                    )
                }
            );


        extra.forEach(
            value => {
                input.append(
                    el(
                        'option',
                        {
                            value,
                            text:
                                value
                        }
                    )
                );
            }
        );

    } else if (
        type ===
        'lookup'
    ) {
        input =
            el(
                'select',
                {
                    id,
                    name,
                    className:
                        'form-select',
                    ...(
                        required
                            ? {
                                required:
                                    'required'
                            }
                            : {}
                    )
                }
            );

        if (!required) {
            input.append(el('option', {
                value: '',
                text: 'None'
            }));
        }


        const supabase =
            await requireSupabase();


        const {
            data,
            error
        } =
            await supabase
                .from(
                    extra.table
                )
                .select(
                    `id,${extra.label}`
                )
                .eq(
                    'active',
                    true
                )
                .order(
                    extra.label
                );


        if (error) {
            throw error;
        }


        (
            data || []
        ).forEach(
            item => {
                input.append(
                    el(
                        'option',
                        {
                            value:
                                item.id,

                            text:
                                item[
                                    extra.label
                                ]
                        }
                    )
                );
            }
        );

    } else {
        const attributes = {
            id,
            name,
            type:
                type ===
                'date-input'
                    ? 'date'
                    : type,

            className:
                'form-control',

            ...(
                required
                    ? {
                        required:
                            'required'
                    }
                    : {}
            )
        };


        if (
            type ===
            'number'
        ) {
            attributes.step =
                '0.01';
        }


        input =
            el(
                'input',
                attributes
            );
    }


    if (
        row?.[name] != null
    ) {
        let value =
            row[name];


        if (
            type ===
            'datetime-local'
        ) {
            value =
                toLocalDateTimeInput(
                    value
                );
        }


        if (
            type ===
            'date-input'
        ) {
            value =
                String(value)
                    .slice(
                        0,
                        10
                    );
        }


        input.value =
            value;
    }


    wrapper.append(
        input
    );


    return wrapper;
}


async function openEditor(
    row = null
) {
    const dialog =
        document.getElementById(
            'crud-dialog'
        );


    const form =
        document.getElementById(
            'crud-form'
        );


    const title =
        document.getElementById(
            'crud-dialog-title'
        );


    if (
        !dialog ||
        !form ||
        !title
    ) {
        return;
    }


    form.replaceChildren();


    form.dataset.id =
        row?.id || '';


    title.textContent =
        `${
            row
                ? 'Edit'
                : 'New'
        } ${cfg.title}`;


    for (
        const spec
        of cfg.fields
    ) {
        form.append(
            await fieldNode(
                spec,
                row
            )
        );
    }

    if (cfg.table === 'ingredients') {
        const supabase = await requireSupabase();
        let inventory = null;
        if (row?.id) {
            const result = await supabase
                .from('inventory_items')
                .select('sku,reorder_level,preferred_stock,unit_cost,supplier_id')
                .eq('ingredient_id', row.id)
                .maybeSingle();
            if (result.error) throw result.error;
            inventory = result.data;
        }

        form.append(el('h3', {
            className: 'h5 mt-3',
            text: 'Inventory record'
        }));
        form.append(el('p', {
            className: 'muted',
            text: 'A stock record is saved with this ingredient. Record opening stock from Inventory after saving.'
        }));

        const stockValues = {
            inventory_sku: inventory?.sku ||
                (row?.name ? `ING-${row.name.toUpperCase().replace(/[^A-Z0-9]+/g, '-').replace(/^-|-$/g, '')}` : ''),
            inventory_reorder_level: inventory?.reorder_level ?? 0,
            inventory_preferred_stock: inventory?.preferred_stock ?? 0,
            inventory_unit_cost: inventory?.unit_cost ?? 0,
            inventory_supplier_id: inventory?.supplier_id || ''
        };
        const stockFields = [
            ['inventory_sku', 'Stock SKU', 'text', true],
            ['inventory_reorder_level', 'Reorder level', 'number', true],
            ['inventory_preferred_stock', 'Preferred stock', 'number', true],
            ['inventory_unit_cost', 'Unit cost', 'number', true],
            ['inventory_supplier_id', 'Preferred supplier', 'lookup', false, { table: 'suppliers', label: 'name' }]
        ];
        for (const spec of stockFields) {
            form.append(await fieldNode(spec, stockValues));
        }
        for (const name of ['inventory_reorder_level', 'inventory_preferred_stock']) {
            const input = form.elements.namedItem(name);
            input.step = '0.001';
            input.min = '0';
        }
        form.elements.namedItem('inventory_unit_cost').step = '0.0001';
        form.elements.namedItem('inventory_unit_cost').min = '0';
    }


    dialog.showModal();
}

async function showEditor(row = null) {
    try {
        await openEditor(row);
    } catch (error) {
        console.error('Unable to open editor:', error);
        notify(error?.message || 'Unable to open the editor.', 'danger');
    }
}


async function saveCurrentRecord() {
    const form =
        document.getElementById(
            'crud-form'
        );


    const saveButton =
        document.getElementById(
            'crud-save'
        );


    const dialog =
        document.getElementById(
            'crud-dialog'
        );


    if (
        !form ||
        !saveButton ||
        !dialog
    ) {
        return;
    }


    if (
        !form.reportValidity()
    ) {
        return;
    }


    if (
        saveButton.disabled
    ) {
        return;
    }


    setBusy(
        saveButton,
        true,
        'Saving…'
    );


    try {
        const formData =
            new FormData(
                form
            );


        const payload = {};


        for (
            const [
                name,
                ,
                type
            ]
            of cfg.fields
        ) {
            if (
                type ===
                'checkbox'
            ) {
                payload[name] =
                    Boolean(
                        form.elements[
                            name
                        ]?.checked
                    );

                continue;
            }


            let value =
                formData.get(
                    name
                );


            if (
                value === ''
            ) {
                value =
                    null;
            }


            if (
                type ===
                'number'
                &&
                value != null
            ) {
                value =
                    Number(
                        value
                    );
            }


            if (
                type ===
                'datetime-local'
                &&
                value
            ) {
                value =
                    new Date(
                        value
                    ).toISOString();
            }


            payload[name] =
                value;
        }


        if (cfg.table === 'ingredients') {
            const inventory = {
                sku: String(formData.get('inventory_sku') || '').trim(),
                reorder_level: Number(formData.get('inventory_reorder_level')),
                preferred_stock: Number(formData.get('inventory_preferred_stock')),
                unit_cost: Number(formData.get('inventory_unit_cost')),
                supplier_id: formData.get('inventory_supplier_id') || null
            };
            const supabase = await requireSupabase();
            const { error } = await supabase.rpc('save_ingredient_with_inventory', {
                p_ingredient: payload,
                p_inventory: inventory,
                p_id: form.dataset.id || null
            });
            if (error) throw error;
        } else {
            await crudSave(
                cfg.table,
                payload,
                form.dataset.id || null
            );
        }


        dialog.close();


        notify(
            `${cfg.title} saved.`,
            'success'
        );


        await loadRows();

    } catch (error) {
        console.error(
            'CRUD save error:',
            error
        );


        notify(
            error?.message
            ||
            `Unable to save ${cfg.title.toLowerCase()}.`,
            'danger'
        );

    } finally {
        setBusy(
            saveButton,
            false
        );
    }
}


export async function init() {
    cfg =
        configs[
            document.body
                .dataset
                .entity
        ];


    if (!cfg) {
        throw new Error(
            'Unknown admin entity.'
        );
    }


    const addButton =
        document.getElementById(
            'crud-add'
        );


    const search =
        document.getElementById(
            'crud-search'
        );


    const saveButton =
        document.getElementById(
            'crud-save'
        );


    if (
        !addButton ||
        !search ||
        !saveButton
    ) {
        console.warn(
            'Admin CRUD page elements were not found.'
        );

        return;
    }


    addButton.addEventListener(
        'click',
        () =>
            showEditor()
    );


    /*
     * Important:
     * filtering is local and does not hit
     * Supabase for each keystroke.
     */
    search.addEventListener(
        'input',
        render
    );


    saveButton.addEventListener(
        'click',
        saveCurrentRecord
    );

    document.getElementById('crud-form')?.addEventListener('submit', event => {
        event.preventDefault();
        saveCurrentRecord();
    });


    await loadRows();
}
