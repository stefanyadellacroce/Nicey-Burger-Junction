import {
    requireSupabase
} from '../core/supabase.js';

import {
    el,
    replaceChildren
} from '../core/dom.js';

import {
    notify,
    setBusy
} from '../core/utils.js';


let supabase = null;

let products = [];

let ingredients = [];


function selectedProduct() {
    return products.find(
        product =>
            product.id ===
            document.getElementById(
                'recipe-product'
            )?.value
    );
}


function populateSelect(
    select,
    options,
    placeholder
) {
    const previousValue =
        select.value;


    replaceChildren(
        select,
        [
            el(
                'option',
                {
                    value: '',
                    text: placeholder
                }
            ),
            ...options.map(
                option =>
                    el(
                        'option',
                        {
                            value: option.value,
                            text: option.text
                        }
                    )
            )
        ]
    );


    if (
        options.some(
            option =>
                option.value ===
                previousValue
        )
    ) {
        select.value =
            previousValue;
    }
}


function populateProducts() {
    const select =
        document.getElementById(
            'recipe-product'
        );


    populateSelect(
        select,
        products.map(
            product => ({
                value: product.id,
                text: product.name
            })
        ),
        'Select a product'
    );


    if (
        products.length &&
        !select.value
    ) {
        select.value =
            products[0].id;
    }
}


function populateRecipeOptions() {
    const product =
        selectedProduct();


    const variantSelect =
        document.getElementById(
            'recipe-variant'
        );


    const addonSelect =
        document.getElementById(
            'recipe-addon'
        );


    populateSelect(
        variantSelect,
        (product?.variants || [])
            .filter(
                variant =>
                    variant.active
            )
            .map(
                variant => ({
                    value: variant.id,
                    text: variant.name
                })
            ),
        'Base product recipe'
    );


    populateSelect(
        addonSelect,
        (product?.product_addons || [])
            .map(
                link => link.addon
            )
            .filter(
                addon =>
                    addon?.active
            )
            .map(
                addon => ({
                    value: addon.id,
                    text: addon.name
                })
            ),
        'Base recipe'
    );


    variantSelect.disabled =
        Boolean(addonSelect.value);


    addonSelect.disabled =
        Boolean(variantSelect.value);
}


function currentRecipeFilter() {
    return {
        productId:
            document.getElementById(
                'recipe-product'
            )?.value || '',

        variantId:
            document.getElementById(
                'recipe-variant'
            )?.value || null,

        addonId:
            document.getElementById(
                'recipe-addon'
            )?.value || null
    };
}


function renderRows(
    recipeItems
) {
    const tbody =
        document.getElementById(
            'recipe-tbody'
        );


    if (!recipeItems.length) {
        replaceChildren(
            tbody,
            [
                el(
                    'tr',
                    {},
                    el(
                        'td',
                        {
                            colspan: '5',
                            className:
                                'text-center muted py-4',
                            text:
                                'No ingredients are configured for this recipe.'
                        }
                    )
                )
            ]
        );

        return;
    }


    replaceChildren(
        tbody,
        recipeItems.map(
            item => {
                const removeButton =
                    el(
                        'button',
                        {
                            className:
                                'btn-nbj danger sm',
                            type: 'button',
                            text: 'Remove'
                        }
                    );


                removeButton.addEventListener(
                    'click',
                    () =>
                        removeRecipeItem(
                            item,
                            removeButton
                        )
                );


                return el(
                    'tr',
                    {},
                    [
                        el(
                            'td',
                            {
                                text:
                                    item.ingredient?.name
                                    || 'Unknown ingredient'
                            }
                        ),
                        el(
                            'td',
                            {
                                text:
                                    String(item.quantity)
                            }
                        ),
                        el(
                            'td',
                            {
                                text:
                                    item.ingredient?.unit
                                    || '—'
                            }
                        ),
                        el(
                            'td',
                            {
                                text:
                                    item.removable
                                        ? 'Yes'
                                        : 'No'
                            }
                        ),
                        el(
                            'td',
                            {
                                className: 'cluster'
                            },
                            removeButton
                        )
                    ]
                );
            }
        )
    );
}


async function loadRecipeItems() {
    const tbody =
        document.getElementById(
            'recipe-tbody'
        );


    const {
        productId,
        variantId,
        addonId
    } =
        currentRecipeFilter();


    if (!productId) {
        renderRows([]);
        return;
    }


    tbody.setAttribute(
        'aria-busy',
        'true'
    );


    let query =
        supabase
            .from('product_ingredients')
            .select(`
                id,
                quantity,
                removable,
                ingredient:ingredients(name,unit)
            `)
            .eq('product_id', productId);


    query =
        variantId
            ? query.eq('variant_id', variantId)
            : query.is('variant_id', null);


    query =
        addonId
            ? query.eq('addon_id', addonId)
            : query.is('addon_id', null);


    try {
        const {
            data,
            error
        } =
            await query.order(
                'created_at',
                {
                    ascending: true
                }
            );


        if (error) {
            throw error;
        }


        renderRows(data || []);

    } finally {
        tbody.removeAttribute(
            'aria-busy'
        );
    }
}


async function removeRecipeItem(
    item,
    button
) {
    if (
        button.disabled ||
        !window.confirm(
            `Remove ${item.ingredient?.name || 'this ingredient'} from the recipe?`
        )
    ) {
        return;
    }


    setBusy(
        button,
        true,
        'Removing…'
    );


    try {
        const {
            error
        } =
            await supabase
                .from('product_ingredients')
                .delete()
                .eq('id', item.id);


        if (error) {
            throw error;
        }


        await loadRecipeItems();

        notify(
            'Recipe ingredient removed.',
            'success'
        );

    } catch (error) {
        console.error(
            'Recipe ingredient removal error:',
            error
        );

        notify(
            error?.message
            || 'Unable to remove the recipe ingredient.',
            'danger'
        );

        setBusy(
            button,
            false
        );
    }
}


async function addRecipeItem(
    event
) {
    event.preventDefault();


    const form =
        event.currentTarget;


    const button =
        form.querySelector(
            'button[type="submit"]'
        );


    const {
        productId,
        variantId,
        addonId
    } =
        currentRecipeFilter();


    if (!productId) {
        notify(
            'Select a product before adding ingredients.',
            'warning'
        );

        return;
    }


    const formData =
        new FormData(form);


    const ingredientId =
        String(
            formData.get('ingredient_id')
            || ''
        );


    const quantity =
        Number(
            formData.get('quantity')
        );


    const removable =
        formData.has('removable');


    setBusy(
        button,
        true,
        'Saving…'
    );


    try {
        let existingQuery =
            supabase
                .from('product_ingredients')
                .select('id')
                .eq('product_id', productId)
                .eq('ingredient_id', ingredientId);


        existingQuery =
            variantId
                ? existingQuery.eq('variant_id', variantId)
                : existingQuery.is('variant_id', null);


        existingQuery =
            addonId
                ? existingQuery.eq('addon_id', addonId)
                : existingQuery.is('addon_id', null);


        const {
            data: existing,
            error: lookupError
        } =
            await existingQuery.maybeSingle();


        if (lookupError) {
            throw lookupError;
        }


        const values = {
            product_id: productId,
            variant_id: variantId,
            addon_id: addonId,
            ingredient_id: ingredientId,
            quantity,
            removable
        };


        const result =
            existing
                ? await supabase
                    .from('product_ingredients')
                    .update({
                        quantity,
                        removable
                    })
                    .eq('id', existing.id)
                : await supabase
                    .from('product_ingredients')
                    .insert(values);


        if (result.error) {
            throw result.error;
        }


        form.reset();

        await loadRecipeItems();

        notify(
            existing
                ? 'Recipe ingredient updated.'
                : 'Recipe ingredient added.',
            'success'
        );

    } catch (error) {
        console.error(
            'Recipe ingredient save error:',
            error
        );

        notify(
            error?.message
            || 'Unable to save the recipe ingredient.',
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
    supabase =
        await requireSupabase();


    const [
        productResult,
        ingredientResult
    ] =
        await Promise.all([
            supabase
                .from('products')
                .select(`
                    id,
                    name,
                    variants:product_variants(id,name,active),
                    product_addons(
                        addon:addons(id,name,active)
                    )
                `)
                .order('name'),
            supabase
                .from('ingredients')
                .select('id,name,unit')
                .eq('active', true)
                .order('name')
        ]);


    if (productResult.error) {
        throw productResult.error;
    }


    if (ingredientResult.error) {
        throw ingredientResult.error;
    }


    products =
        productResult.data || [];


    ingredients =
        ingredientResult.data || [];


    populateProducts();


    populateSelect(
        document.getElementById(
            'recipe-ingredient'
        ),
        ingredients.map(
            ingredient => ({
                value: ingredient.id,
                text:
                    `${ingredient.name} (${ingredient.unit})`
            })
        ),
        'Select an ingredient'
    );


    populateRecipeOptions();


    document.getElementById(
        'recipe-product'
    ).addEventListener(
        'change',
        async () => {
            populateRecipeOptions();

            try {
                await loadRecipeItems();
            } catch (error) {
                console.error(
                    'Recipe load error:',
                    error
                );

                notify(
                    error?.message
                    || 'Unable to load recipe ingredients.',
                    'danger'
                );
            }
        }
    );


    for (const id of [
        'recipe-variant',
        'recipe-addon'
    ]) {
        document.getElementById(
            id
        ).addEventListener(
            'change',
            async () => {
                document.getElementById(
                    id === 'recipe-variant'
                        ? 'recipe-addon'
                        : 'recipe-variant'
                ).disabled =
                    Boolean(
                        document.getElementById(id).value
                    );

                try {
                    await loadRecipeItems();
                } catch (error) {
                    console.error(
                        'Recipe load error:',
                        error
                    );

                    notify(
                        error?.message
                        || 'Unable to load recipe ingredients.',
                        'danger'
                    );
                }
            }
        );
    }


    document.getElementById(
        'recipe-form'
    ).addEventListener(
        'submit',
        addRecipeItem
    );


    await loadRecipeItems();
}
