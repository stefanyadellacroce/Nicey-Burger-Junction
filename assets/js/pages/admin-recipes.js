import {
    requireSupabase
} from '../core/supabase.js';

import {
    uploadProductImage
} from '../services/admin.js';

import {
    el,
    replaceChildren
} from '../core/dom.js';

import {
    money,
    notify,
    setBusy
} from '../core/utils.js';


let supabase = null;

let products = [];

let categories = [];

let addons = [];


const productSelect = `
    *,
    category:categories(
        id,
        name
    ),
    images:product_images(
        id,
        path,
        alt_text,
        sort_order
    ),
    variants:product_variants(*),
    product_addons(
        addon:addons(*)
    )
`;


function slugify(value) {
    return String(
        value || ''
    )
        .toLowerCase()
        .trim()
        .replace(
            /[^a-z0-9]+/g,
            '-'
        )
        .replace(
            /^-|-$/g,
            ''
        );
}


async function load() {
    const [
        productResult,
        categoryResult,
        addonResult
    ] =
        await Promise.all([
            supabase
                .from('products')
                .select(productSelect)
                .order('sort_order'),

            supabase
                .from('categories')
                .select('*')
                .order('sort_order'),

            supabase
                .from('addons')
                .select('*')
                .order('name')
        ]);


    if (productResult.error) {
        throw productResult.error;
    }


    if (categoryResult.error) {
        throw categoryResult.error;
    }


    if (addonResult.error) {
        throw addonResult.error;
    }


    products =
        productResult.data || [];


    categories =
        categoryResult.data || [];


    addons =
        addonResult.data || [];


    render();
}


function render() {
    const search =
        document.getElementById(
            'product-search'
        );


    const tbody =
        document.getElementById(
            'products-tbody'
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
        products.filter(
            product => {
                const haystack =
                    [
                        product.name,
                        product.slug,
                        product.category?.name
                    ]
                        .filter(Boolean)
                        .join(' ')
                        .toLowerCase();


                return (
                    !term
                    ||
                    haystack.includes(term)
                );
            }
        );


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
                                colspan: '7',
                                className:
                                    'text-center muted py-4',
                                text:
                                    term
                                        ? 'No matching products found.'
                                        : 'No products found.'
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
            product =>
                createProductRow(
                    product
                )
        )
    );
}


function createProductRow(
    product
) {
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
            openProduct(
                product
            );


    const optionsButton =
        el(
            'button',
            {
                className:
                    'btn-nbj ghost sm',
                type:
                    'button',
                text:
                    'Options'
            }
        );


    optionsButton.onclick =
        () =>
            openOptions(
                product
            );


    const availabilityButton =
        el(
            'button',
            {
                className:
                    'btn btn-link p-0',
                type:
                    'button',
                text:
                    product.manually_sold_out
                        ? 'Mark available'
                        : 'Mark sold out'
            }
        );


    availabilityButton.onclick =
        async () => {
            if (
                availabilityButton.disabled
            ) {
                return;
            }


            availabilityButton.disabled =
                true;


            try {
                const {
                    error
                } =
                    await supabase
                        .from('products')
                        .update({
                            manually_sold_out:
                                !product.manually_sold_out
                        })
                        .eq(
                            'id',
                            product.id
                        );


                if (error) {
                    throw error;
                }


                notify(
                    'Availability updated.',
                    'success'
                );


                await load();

            } catch (error) {
                console.error(
                    'Product availability error:',
                    error
                );


                notify(
                    error?.message
                    ||
                    'Unable to update product availability.',
                    'danger'
                );

            } finally {
                availabilityButton.disabled =
                    false;
            }
        };


    const archiveButton =
        el(
            'button',
            {
                className:
                    'btn btn-link p-0',
                type:
                    'button',
                text:
                    product.active
                        ? 'Archive'
                        : 'Restore'
            }
        );


    archiveButton.onclick =
        async () => {
            if (
                archiveButton.disabled
            ) {
                return;
            }


            archiveButton.disabled =
                true;


            try {
                const {
                    error
                } =
                    await supabase
                        .from('products')
                        .update({
                            active:
                                !product.active
                        })
                        .eq(
                            'id',
                            product.id
                        );


                if (error) {
                    throw error;
                }


                notify(
                    product.active
                        ? 'Product archived.'
                        : 'Product restored.',
                    'success'
                );


                await load();

            } catch (error) {
                console.error(
                    'Product archive error:',
                    error
                );


                notify(
                    error?.message
                    ||
                    'Unable to update product.',
                    'danger'
                );

            } finally {
                archiveButton.disabled =
                    false;
            }
        };


    actionCell.append(
        editButton,
        optionsButton,
        availabilityButton,
        archiveButton
    );


    /*
     * Must match current Products HTML:
     *
     * Product
     * Category
     * Price
     * Featured
     * Sold out
     * Active
     * Actions
     */
    return el(
        'tr',
        {},
        [
            el(
                'td',
                {
                    text:
                        product.name
                        ||
                        '—'
                }
            ),

            el(
                'td',
                {
                    text:
                        product.category
                            ?.name
                        ||
                        '—'
                }
            ),

            el(
                'td',
                {
                    text:
                        money(
                            product.base_price
                            ||
                            0
                        )
                }
            ),

            el(
                'td',
                {
                    text:
                        product.featured
                            ? 'Yes'
                            : 'No'
                }
            ),

            el(
                'td',
                {
                    text:
                        product.manually_sold_out
                            ? 'Yes'
                            : 'No'
                }
            ),

            el(
                'td',
                {
                    text:
                        product.active
                            ? 'Active'
                            : 'Archived'
                }
            ),

            actionCell
        ]
    );
}


function categoryOptions(
    selectedId
) {
    const select =
        el(
            'select',
            {
                name:
                    'category_id',
                className:
                    'form-select',
                required:
                    'required'
            }
        );


    categories
        .filter(
            category =>
                category.active
                ||
                category.id ===
                    selectedId
        )
        .forEach(
            category => {
                const option =
                    el(
                        'option',
                        {
                            value:
                                category.id,
                            text:
                                category.name
                        }
                    );


                if (
                    category.id ===
                    selectedId
                ) {
                    option.selected =
                        true;
                }


                select.append(
                    option
                );
            }
        );


    return select;
}


function control(
    form,
    name
) {
    return form.elements.namedItem(
        name
    );
}


function openProduct(
    product = null
) {
    const dialog =
        document.getElementById(
            'product-dialog'
        );


    const form =
        document.getElementById(
            'product-form'
        );


    const title =
        document.getElementById(
            'product-dialog-title'
        );


    const categoryHolder =
        document.getElementById(
            'product-category-holder'
        );


    if (
        !dialog ||
        !form ||
        !title ||
        !categoryHolder
    ) {
        return;
    }


    form.reset();


    form.dataset.id =
        product?.id || '';


    title.textContent =
        product
            ? 'Edit product'
            : 'New product';


    control(
        form,
        'name'
    ).value =
        product?.name || '';


    control(
        form,
        'slug'
    ).value =
        product?.slug || '';


    control(
        form,
        'short_description'
    ).value =
        product?.short_description
        ||
        '';


    control(
        form,
        'description'
    ).value =
        product?.description
        ||
        '';


    control(
        form,
        'base_price'
    ).value =
        product?.base_price
        ??
        '';


    control(
        form,
        'allergen_notes'
    ).value =
        product?.allergen_notes
        ||
        '';


    control(
        form,
        'sort_order'
    ).value =
        product?.sort_order
        ??
        0;


    control(
        form,
        'active'
    ).checked =
        product?.active
        ??
        true;


    control(
        form,
        'featured'
    ).checked =
        Boolean(
            product?.featured
        );


    control(
        form,
        'bestseller'
    ).checked =
        Boolean(
            product?.bestseller
        );


    control(
        form,
        'manually_sold_out'
    ).checked =
        Boolean(
            product?.manually_sold_out
        );


    replaceChildren(
        categoryHolder,
        [
            categoryOptions(
                product?.category_id
            )
        ]
    );


    dialog.showModal();
}


function openOptions(
    product
) {
    const dialog =
        document.getElementById(
            'options-dialog'
        );


    const title =
        document.getElementById(
            'options-title'
        );


    if (
        !dialog ||
        !title
    ) {
        return;
    }


    dialog.dataset.productId =
        product.id;


    title.textContent =
        `Options · ${product.name}`;


    renderOptions(
        product
    );


    dialog.showModal();
}


function formatPriceDelta(
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


function renderOptions(
    product
) {
    if (!product) {
        return;
    }


    const variantList =
        document.getElementById(
            'variant-list'
        );


    const addonChecks =
        document.getElementById(
            'product-addon-checks'
        );


    if (
        !variantList ||
        !addonChecks
    ) {
        return;
    }


    const variants =
        [
            ...(product.variants || [])
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


    replaceChildren(
        variantList,
        variants.map(
            variant => {
                const row =
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
                                        `${variant.name} · ${formatPriceDelta(
                                            variant.price_delta
                                        )}`
                                }
                            )
                        ]
                    );


                const button =
                    el(
                        'button',
                        {
                            className:
                                'btn btn-link p-0',
                            type:
                                'button',
                            text:
                                variant.active
                                    ? 'Deactivate'
                                    : 'Activate'
                        }
                    );


                button.onclick =
                    async () => {
                        if (
                            button.disabled
                        ) {
                            return;
                        }


                        button.disabled =
                            true;


                        try {
                            const {
                                error
                            } =
                                await supabase
                                    .from(
                                        'product_variants'
                                    )
                                    .update({
                                        active:
                                            !variant.active
                                    })
                                    .eq(
                                        'id',
                                        variant.id
                                    );


                            if (error) {
                                throw error;
                            }


                            await load();


                            renderOptions(
                                products.find(
                                    item =>
                                        item.id ===
                                        product.id
                                )
                            );

                        } catch (error) {
                            console.error(
                                'Variant status error:',
                                error
                            );


                            notify(
                                error?.message
                                ||
                                'Unable to update the variant.',
                                'danger'
                            );

                        } finally {
                            button.disabled =
                                false;
                        }
                    };


                row.append(
                    button
                );


                return row;
            }
        )
    );


    const linkedIds =
        new Set(
            (
                product.product_addons
                ||
                []
            )
                .map(
                    item =>
                        item.addon?.id
                )
                .filter(Boolean)
        );


    const availableAddons =
        addons.filter(
            addon =>
                addon.active
                ||
                linkedIds.has(
                    addon.id
                )
        );


    replaceChildren(
        addonChecks,
        availableAddons.map(
            addon => {
                const checkbox =
                    el(
                        'input',
                        {
                            type:
                                'checkbox',
                            value:
                                addon.id
                        }
                    );


                checkbox.checked =
                    linkedIds.has(
                        addon.id
                    );


                return el(
                    'label',
                    {
                        className:
                            'd-flex gap-2 align-items-center'
                    },
                    [
                        checkbox,

                        document.createTextNode(
                            `${addon.name} · ${money(
                                addon.price
                            )}`
                        )
                    ]
                );
            }
        )
    );
}


async function saveProduct(
    form
) {
    const formData =
        new FormData(
            form
        );


    const name =
        String(
            formData.get('name')
            ||
            ''
        ).trim();


    const payload = {
        category_id:
            formData.get(
                'category_id'
            ),

        name,

        slug:
            slugify(
                formData.get('slug')
                ||
                name
            ),

        short_description:
            String(
                formData.get(
                    'short_description'
                )
                ||
                ''
            ).trim()
            ||
            null,

        description:
            String(
                formData.get(
                    'description'
                )
                ||
                ''
            ).trim(),

        base_price:
            Number(
                formData.get(
                    'base_price'
                )
            ),

        allergen_notes:
            String(
                formData.get(
                    'allergen_notes'
                )
                ||
                ''
            ).trim()
            ||
            null,

        sort_order:
            Number(
                formData.get(
                    'sort_order'
                )
                ||
                0
            ),

        active:
            control(
                form,
                'active'
            ).checked,

        featured:
            control(
                form,
                'featured'
            ).checked,

        bestseller:
            control(
                form,
                'bestseller'
            ).checked,

        manually_sold_out:
            control(
                form,
                'manually_sold_out'
            ).checked
    };


    let productId =
        form.dataset.id;


    if (productId) {
        const {
            error
        } =
            await supabase
                .from('products')
                .update(payload)
                .eq(
                    'id',
                    productId
                );


        if (error) {
            throw error;
        }

    } else {
        const {
            data,
            error
        } =
            await supabase
                .from('products')
                .insert(payload)
                .select('id')
                .single();


        if (error) {
            throw error;
        }


        productId =
            data.id;
    }


    const fileInput =
        control(
            form,
            'image'
        );


    const file =
        fileInput
            ?.files
            ?.[0];


    if (file) {
        const uploaded =
            await uploadProductImage(
                productId,
                file
            );


        const {
            error
        } =
            await supabase
                .from(
                    'product_images'
                )
                .insert({
                    product_id:
                        productId,

                    path:
                        uploaded.path,

                    alt_text:
                        `${payload.name} menu photo`,

                    sort_order:
                        0
                });


        if (error) {
            throw error;
        }
    }
}


async function saveAddonLinks() {
    const dialog =
        document.getElementById(
            'options-dialog'
        );


    const button =
        document.getElementById(
            'save-addon-links'
        );


    if (
        !dialog ||
        !button
    ) {
        return;
    }


    const productId =
        dialog.dataset.productId;


    const product =
        products.find(
            item =>
                item.id ===
                productId
        );


    if (!product) {
        notify(
            'Product could not be found.',
            'danger'
        );

        return;
    }


    const selectedIds =
        new Set(
            [
                ...document
                    .querySelectorAll(
                        '#product-addon-checks input:checked'
                    )
            ]
                .map(
                    input =>
                        input.value
                )
        );


    const existingIds =
        new Set(
            (
                product.product_addons
                ||
                []
            )
                .map(
                    item =>
                        item.addon?.id
                )
                .filter(Boolean)
        );


    const removedIds =
        [
            ...existingIds
        ]
            .filter(
                id =>
                    !selectedIds.has(id)
            );


    const addedIds =
        [
            ...selectedIds
        ]
            .filter(
                id =>
                    !existingIds.has(id)
            );


    setBusy(
        button,
        true,
        'Saving…'
    );


    try {
        if (
            removedIds.length
        ) {
            const {
                error
            } =
                await supabase
                    .from(
                        'product_addons'
                    )
                    .delete()
                    .eq(
                        'product_id',
                        productId
                    )
                    .in(
                        'addon_id',
                        removedIds
                    );


            if (error) {
                throw error;
            }
        }


        if (
            addedIds.length
        ) {
            const {
                error
            } =
                await supabase
                    .from(
                        'product_addons'
                    )
                    .insert(
                        addedIds.map(
                            (
                                addonId,
                                index
                            ) => ({
                                product_id:
                                    productId,

                                addon_id:
                                    addonId,

                                sort_order:
                                    (
                                        existingIds.size
                                        +
                                        index
                                    )
                                    *
                                    10
                            })
                        )
                    );


            if (error) {
                throw error;
            }
        }


        notify(
            'Product add-ons saved.',
            'success'
        );


        await load();


        renderOptions(
            products.find(
                item =>
                    item.id ===
                    productId
            )
        );

    } catch (error) {
        console.error(
            'Save product add-ons error:',
            error
        );


        notify(
            error?.message
            ||
            'Unable to save product add-ons.',
            'danger'
        );

    } finally {
        setBusy(
            button,
            false
        );
    }
}


export async function init() {
    const search =
        document.getElementById(
            'product-search'
        );


    const addProduct =
        document.getElementById(
            'add-product'
        );


    const productForm =
        document.getElementById(
            'product-form'
        );


    const variantForm =
        document.getElementById(
            'variant-form'
        );


    const saveAddons =
        document.getElementById(
            'save-addon-links'
        );


    if (
        !search ||
        !addProduct ||
        !productForm ||
        !variantForm ||
        !saveAddons
    ) {
        console.warn(
            'Admin product page elements were not found.'
        );

        return;
    }


    supabase =
        await requireSupabase();


    search.addEventListener(
        'input',
        render
    );


    addProduct.addEventListener(
        'click',
        () =>
            openProduct()
    );


    control(
        productForm,
        'name'
    ).addEventListener(
        'blur',
        () => {
            const slug =
                control(
                    productForm,
                    'slug'
                );


            if (
                !slug.value
            ) {
                slug.value =
                    slugify(
                        control(
                            productForm,
                            'name'
                        ).value
                    );
            }
        }
    );


    productForm.addEventListener(
        'submit',
        async event => {
            event.preventDefault();


            const button =
                productForm.querySelector(
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
                'Saving…'
            );


            try {
                await saveProduct(
                    productForm
                );


                document
                    .getElementById(
                        'product-dialog'
                    )
                    ?.close();


                notify(
                    'Product saved.',
                    'success'
                );


                await load();

            } catch (error) {
                console.error(
                    'Save product error:',
                    error
                );


                notify(
                    error?.message
                    ||
                    'Unable to save the product.',
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


    variantForm.addEventListener(
        'submit',
        async event => {
            event.preventDefault();


            const button =
                variantForm.querySelector(
                    'button[type="submit"]'
                );


            if (
                button?.disabled
            ) {
                return;
            }


            const dialog =
                document.getElementById(
                    'options-dialog'
                );


            const productId =
                dialog?.dataset
                    .productId;


            if (!productId) {
                return;
            }


            const formData =
                new FormData(
                    variantForm
                );


            const name =
                String(
                    formData.get('name')
                    ||
                    ''
                ).trim();


            const priceDelta =
                Number(
                    formData.get(
                        'price_delta'
                    )
                    ||
                    0
                );


            const product =
                products.find(
                    item =>
                        item.id ===
                        productId
                );


            const nextSortOrder =
                (
                    product?.variants
                        ?.length
                    ||
                    0
                )
                *
                10;


            setBusy(
                button,
                true,
                'Adding…'
            );


            try {
                const {
                    error
                } =
                    await supabase
                        .from(
                            'product_variants'
                        )
                        .insert({
                            product_id:
                                productId,

                            name,

                            price_delta:
                                priceDelta,

                            sort_order:
                                nextSortOrder,

                            active:
                                true
                        });


                if (error) {
                    throw error;
                }


                variantForm.reset();


                await load();


                renderOptions(
                    products.find(
                        item =>
                            item.id ===
                            productId
                    )
                );

            } catch (error) {
                console.error(
                    'Add variant error:',
                    error
                );


                notify(
                    error?.message
                    ||
                    'Unable to add the variant.',
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


    saveAddons.addEventListener(
        'click',
        saveAddonLinks
    );


    await load();
}