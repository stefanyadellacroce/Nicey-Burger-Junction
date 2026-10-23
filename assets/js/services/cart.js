import {
    getSupabase
} from '../core/supabase.js';

import {
    getProfile
} from '../core/auth.js';

import {
    uid
} from '../core/utils.js';


const KEY =
    'nbj_cart_v2';


function emitCartChanged(
    detail = {}
) {
    window.dispatchEvent(
        new CustomEvent(
            'nbj:cart-changed',
            {
                detail
            }
        )
    );
}


function localCart() {
    try {
        const value =
            JSON.parse(
                localStorage.getItem(KEY)
                ||
                '[]'
            );


        return Array.isArray(value)
            ? value
            : [];

    } catch {
        return [];
    }
}


function saveLocal(
    items,
    emit = true
) {
    const safeItems =
        Array.isArray(items)
            ? items
            : [];


    localStorage.setItem(
        KEY,
        JSON.stringify(
            safeItems
        )
    );


    if (emit) {
        emitCartChanged({
            count:
                safeItems.reduce(
                    (
                        total,
                        item
                    ) =>
                        total
                        +
                        Number(
                            item.quantity
                            ||
                            0
                        ),
                    0
                )
        });
    }
}


function uniqueStrings(
    values
) {
    return [
        ...new Set(
            (
                Array.isArray(values)
                    ? values
                    : []
            )
                .map(
                    value =>
                        String(value)
                )
                .filter(Boolean)
        )
    ];
}


function normalizeItem(
    item
) {
    return {
        id:
            item.id
            ||
            uid(),

        product_id:
            item.product_id,

        variant_id:
            item.variant_id
            ||
            null,

        addon_ids:
            uniqueStrings(
                item.addon_ids
            ),

        quantity:
            Math.max(
                1,
                Math.floor(
                    Number(
                        item.quantity
                        ||
                        1
                    )
                )
                ||
                1
            ),

        instructions:
            String(
                item.instructions
                ||
                ''
            )
                .trim()
                .slice(
                    0,
                    500
                ),

        removed_ingredients:
            uniqueStrings(
                item.removed_ingredients
            )
    };
}


function sameSelection(
    first,
    second
) {
    const firstAddons =
        uniqueStrings(
            first.addon_ids
        )
            .sort();


    const secondAddons =
        uniqueStrings(
            second.addon_ids
        )
            .sort();


    const firstRemoved =
        uniqueStrings(
            first.removed_ingredients
        )
            .sort();


    const secondRemoved =
        uniqueStrings(
            second.removed_ingredients
        )
            .sort();


    return (
        first.product_id ===
        second.product_id
        &&
        (
            first.variant_id
            ||
            null
        )
        ===
        (
            second.variant_id
            ||
            null
        )
        &&
        JSON.stringify(
            firstAddons
        )
        ===
        JSON.stringify(
            secondAddons
        )
        &&
        JSON.stringify(
            firstRemoved
        )
        ===
        JSON.stringify(
            secondRemoved
        )
        &&
        String(
            first.instructions
            ||
            ''
        )
        ===
        String(
            second.instructions
            ||
            ''
        )
    );
}


async function currentCustomer(
    supabase
) {
    if (!supabase) {
        return null;
    }


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
        return null;
    }


    return profile;
}


async function serverCartId(
    supabase,
    userId
) {
    let {
        data,
        error
    } =
        await supabase
            .from(
                'carts'
            )
            .select(
                'id'
            )
            .eq(
                'customer_id',
                userId
            )
            .eq(
                'status',
                'ACTIVE'
            )
            .maybeSingle();


    if (error) {
        throw error;
    }


    if (data) {
        return data.id;
    }


    ({
        data,
        error
    } =
        await supabase
            .from(
                'carts'
            )
            .insert({
                customer_id:
                    userId,

                status:
                    'ACTIVE'
            })
            .select(
                'id'
            )
            .single()
    );


    if (error) {
        throw error;
    }


    return data.id;
}


export async function getCart() {
    const supabase =
        await getSupabase();


    const profile =
        await currentCustomer(
            supabase
        );


    if (
        !supabase ||
        !profile
    ) {
        return localCart();
    }


    const cartId =
        await serverCartId(
            supabase,
            profile.id
        );


    const {
        data,
        error
    } =
        await supabase
            .from(
                'cart_items'
            )
            .select(
                `
                id,
                product_id,
                variant_id,
                quantity,
                instructions,
                removed_ingredients,
                created_at,
                addons:cart_item_addons(
                    addon:addons(
                        id,
                        name,
                        price
                    )
                ),
                product:products(
                    id,
                    slug,
                    name,
                    base_price,
                    manually_sold_out,
                    active,
                    images:product_images(
                        path,
                        sort_order
                    )
                ),
                variant:product_variants(
                    id,
                    name,
                    price_delta
                )
                `
            )
            .eq(
                'cart_id',
                cartId
            )
            .order(
                'created_at'
            );


    if (error) {
        throw error;
    }


    return (
        data || []
    )
        .map(
            item => ({
                ...item,

                addon_ids:
                    (
                        item.addons || []
                    )
                        .map(
                            value =>
                                value.addon?.id
                        )
                        .filter(Boolean)
            })
        );
}


export async function getCartCount() {
    const items =
        await getCart();


    return items.reduce(
        (
            total,
            item
        ) =>
            total
            +
            Number(
                item.quantity
                ||
                0
            ),
        0
    );
}


export async function addToCart(
    item
) {
    const normalized =
        normalizeItem(
            item
        );


    if (
        !normalized.product_id
    ) {
        throw new Error(
            'Product ID is required.'
        );
    }


    const supabase =
        await getSupabase();


    const profile =
        await currentCustomer(
            supabase
        );


    if (
        !supabase ||
        !profile
    ) {
        const items =
            localCart();


        const same =
            items.find(
                existing =>
                    sameSelection(
                        existing,
                        normalized
                    )
            );


        if (same) {
            same.quantity =
                Number(
                    same.quantity
                    ||
                    0
                )
                +
                normalized.quantity;

        } else {
            items.push(
                normalized
            );
        }


        saveLocal(
            items
        );


        return normalized;
    }


    const cartId =
        await serverCartId(
            supabase,
            profile.id
        );


    const {
        data,
        error
    } =
        await supabase
            .from(
                'cart_items'
            )
            .insert({
                cart_id:
                    cartId,

                product_id:
                    normalized.product_id,

                variant_id:
                    normalized.variant_id,

                quantity:
                    normalized.quantity,

                instructions:
                    normalized.instructions,

                removed_ingredients:
                    normalized.removed_ingredients
            })
            .select(
                'id'
            )
            .single();


    if (error) {
        throw error;
    }


    if (
        normalized.addon_ids.length
    ) {
        const {
            error: addonError
        } =
            await supabase
                .from(
                    'cart_item_addons'
                )
                .insert(
                    normalized.addon_ids
                        .map(
                            addonId => ({
                                cart_item_id:
                                    data.id,

                                addon_id:
                                    addonId
                            })
                        )
                );


        if (addonError) {
            /*
             * Prevent an incomplete cart item
             * when its add-on write fails.
             */
            await supabase
                .from(
                    'cart_items'
                )
                .delete()
                .eq(
                    'id',
                    data.id
                );


            throw addonError;
        }
    }


    emitCartChanged();


    return data;
}


export async function updateCartItem(
    id,
    patch
) {
    const supabase =
        await getSupabase();


    const profile =
        await currentCustomer(
            supabase
        );


    if (
        !supabase ||
        !profile
    ) {
        const items =
            localCart();


        const item =
            items.find(
                value =>
                    value.id === id
            );


        if (!item) {
            return;
        }


        if (
            patch.quantity != null
        ) {
            item.quantity =
                Math.max(
                    1,
                    Math.floor(
                        Number(
                            patch.quantity
                        )
                    )
                    ||
                    1
                );
        }


        if (
            patch.instructions != null
        ) {
            item.instructions =
                String(
                    patch.instructions
                )
                    .trim()
                    .slice(
                        0,
                        500
                    );
        }


        if (
            Object.prototype
                .hasOwnProperty
                .call(
                    patch,
                    'variant_id'
                )
        ) {
            item.variant_id =
                patch.variant_id
                ||
                null;
        }


        if (
            Object.prototype
                .hasOwnProperty
                .call(
                    patch,
                    'removed_ingredients'
                )
        ) {
            item.removed_ingredients =
                uniqueStrings(
                    patch.removed_ingredients
                );
        }


        if (
            Object.prototype
                .hasOwnProperty
                .call(
                    patch,
                    'addon_ids'
                )
        ) {
            item.addon_ids =
                uniqueStrings(
                    patch.addon_ids
                );
        }


        saveLocal(
            items
        );


        return;
    }


    const allowed = {};


    if (
        patch.quantity != null
    ) {
        allowed.quantity =
            Math.max(
                1,
                Math.floor(
                    Number(
                        patch.quantity
                    )
                )
                ||
                1
            );
    }


    if (
        patch.instructions != null
    ) {
        allowed.instructions =
            String(
                patch.instructions
            )
                .trim()
                .slice(
                    0,
                    500
                );
    }


    if (
        Object.prototype
            .hasOwnProperty
            .call(
                patch,
                'variant_id'
            )
    ) {
        allowed.variant_id =
            patch.variant_id
            ||
            null;
    }


    if (
        Object.prototype
            .hasOwnProperty
            .call(
                patch,
                'removed_ingredients'
            )
    ) {
        allowed.removed_ingredients =
            uniqueStrings(
                patch.removed_ingredients
            );
    }


    if (
        Object.keys(
            allowed
        ).length
    ) {
        const {
            error
        } =
            await supabase
                .from(
                    'cart_items'
                )
                .update(
                    allowed
                )
                .eq(
                    'id',
                    id
                );


        if (error) {
            throw error;
        }
    }


    if (
        Object.prototype
            .hasOwnProperty
            .call(
                patch,
                'addon_ids'
            )
    ) {
        const newIds =
            uniqueStrings(
                patch.addon_ids
            );


        const {
            data: existing,
            error: readError
        } =
            await supabase
                .from(
                    'cart_item_addons'
                )
                .select(
                    'addon_id'
                )
                .eq(
                    'cart_item_id',
                    id
                );


        if (readError) {
            throw readError;
        }


        const previousIds =
            (
                existing || []
            )
                .map(
                    value =>
                        value.addon_id
                )
                .filter(Boolean);


        const {
            error: deleteError
        } =
            await supabase
                .from(
                    'cart_item_addons'
                )
                .delete()
                .eq(
                    'cart_item_id',
                    id
                );


        if (deleteError) {
            throw deleteError;
        }


        if (newIds.length) {
            const {
                error: insertError
            } =
                await supabase
                    .from(
                        'cart_item_addons'
                    )
                    .insert(
                        newIds.map(
                            addonId => ({
                                cart_item_id:
                                    id,

                                addon_id:
                                    addonId
                            })
                        )
                    );


            if (insertError) {
                /*
                 * Best-effort restoration of the
                 * previous add-on selection.
                 */
                if (previousIds.length) {
                    await supabase
                        .from(
                            'cart_item_addons'
                        )
                        .insert(
                            previousIds.map(
                                addonId => ({
                                    cart_item_id:
                                        id,

                                    addon_id:
                                        addonId
                                })
                            )
                        );
                }


                throw insertError;
            }
        }
    }


    emitCartChanged();
}


export async function removeCartItem(
    id
) {
    const supabase =
        await getSupabase();


    const profile =
        await currentCustomer(
            supabase
        );


    if (
        !supabase ||
        !profile
    ) {
        saveLocal(
            localCart()
                .filter(
                    item =>
                        item.id !== id
                )
        );


        return;
    }


    const {
        error
    } =
        await supabase
            .from(
                'cart_items'
            )
            .delete()
            .eq(
                'id',
                id
            );


    if (error) {
        throw error;
    }


    emitCartChanged();
}


export async function clearLocalCart() {
    saveLocal([]);
}


export async function mergeLocalCartToServer() {
    let items =
        localCart();


    if (!items.length) {
        return;
    }


    const supabase =
        await getSupabase();


    const profile =
        await currentCustomer(
            supabase
        );


    if (
        !supabase ||
        !profile
    ) {
        return;
    }


    while (
        items.length
    ) {
        const item =
            items[0];


        await addToCart(
            item
        );


        /*
         * Remove each successfully merged item
         * immediately so a later failure/retry
         * cannot duplicate earlier items.
         */
        items =
            items.slice(1);


        saveLocal(
            items,
            false
        );
    }


    emitCartChanged();
}


export function onCartChanged(
    callback
) {
    window.addEventListener(
        'nbj:cart-changed',
        callback
    );


    return () => {
        window.removeEventListener(
            'nbj:cart-changed',
            callback
        );
    };
}