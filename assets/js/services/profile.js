import {
    requireSupabase
} from '../core/supabase.js';

import {
    getProfile
} from '../core/auth.js';


function cleanText(
    value
) {
    return String(
        value ?? ''
    ).trim();
}


function nullableText(
    value
) {
    const cleaned =
        cleanText(
            value
        );


    return cleaned
        ||
        null;
}


export async function updateProfile(
    values = {}
) {
    const supabase =
        await requireSupabase();


    const profile =
        await getProfile();


    if (!profile?.id) {
        throw new Error(
            'Authenticated profile could not be found.'
        );
    }


    const safe = {};


    if (
        Object.prototype
            .hasOwnProperty
            .call(
                values,
                'full_name'
            )
    ) {
        safe.full_name =
            cleanText(
                values.full_name
            );
    }


    if (
        Object.prototype
            .hasOwnProperty
            .call(
                values,
                'phone'
            )
    ) {
        safe.phone =
            cleanText(
                values.phone
            );
    }


    if (
        Object.prototype
            .hasOwnProperty
            .call(
                values,
                'notification_preferences'
            )
    ) {
        safe.notification_preferences =
            (
                values.notification_preferences
                &&
                typeof values.notification_preferences ===
                    'object'
            )
                ? {
                    ...values.notification_preferences
                }
                : {};
    }


    if (
        !Object.keys(
            safe
        ).length
    ) {
        return profile;
    }


    const {
        data,
        error
    } =
        await supabase
            .from(
                'profiles'
            )
            .update(
                safe
            )
            .eq(
                'id',
                profile.id
            )
            .select()
            .single();


    if (error) {
        throw error;
    }


    /*
     * Refresh auth.js' cached profile without
     * making an otherwise-successful update fail
     * if the refresh itself encounters a problem.
     */
    await getProfile(true)
        .catch(
            error => {
                console.warn(
                    'Profile cache refresh failed:',
                    error
                );
            }
        );


    return data;
}


export async function listAddresses() {
    const supabase =
        await requireSupabase();


    const {
        data,
        error
    } =
        await supabase
            .from(
                'user_addresses'
            )
            .select('*')
            .order(
                'is_default',
                {
                    ascending:
                        false
                }
            )
            .order(
                'created_at'
            );


    if (error) {
        throw error;
    }


    return data || [];
}


export async function saveAddress(
    address = {}
) {
    const supabase =
        await requireSupabase();


    const payload = {
        label:
            cleanText(
                address.label
            ),

        recipient_name:
            cleanText(
                address.recipient_name
            ),

        phone:
            cleanText(
                address.phone
            ),

        address_line1:
            cleanText(
                address.address_line1
            ),

        address_line2:
            nullableText(
                address.address_line2
            ),

        barangay:
            nullableText(
                address.barangay
            ),

        city:
            cleanText(
                address.city
            ),

        province:
            nullableText(
                address.province
            ),

        postal_code:
            nullableText(
                address.postal_code
            ),

        delivery_zone_id:
            address.delivery_zone_id
            ||
            null,

        is_default:
            Boolean(
                address.is_default
            )
    };


    if (!payload.address_line1) {
        throw new Error(
            'Address line is required.'
        );
    }


    if (!payload.city) {
        throw new Error(
            'City is required.'
        );
    }


    if (address.id) {
        const {
            data,
            error
        } =
            await supabase
                .from(
                    'user_addresses'
                )
                .update(
                    payload
                )
                .eq(
                    'id',
                    address.id
                )
                .select()
                .single();


        if (error) {
            throw error;
        }


        return data;
    }


    const {
        data,
        error
    } =
        await supabase
            .from(
                'user_addresses'
            )
            .insert(
                payload
            )
            .select()
            .single();


    if (error) {
        throw error;
    }


    return data;
}


export async function deleteAddress(
    id
) {
    if (!id) {
        throw new Error(
            'Address ID is required.'
        );
    }


    const supabase =
        await requireSupabase();


    const {
        error
    } =
        await supabase
            .from(
                'user_addresses'
            )
            .delete()
            .eq(
                'id',
                id
            );


    if (error) {
        throw error;
    }
}


export async function listFavorites() {
    const supabase =
        await requireSupabase();


    const {
        data,
        error
    } =
        await supabase
            .from(
                'favorites'
            )
            .select(
                `
                product:products(
                    id,
                    slug,
                    name,
                    base_price,
                    short_description,
                    manually_sold_out,
                    active,
                    images:product_images(
                        path,
                        sort_order
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
            );


    if (error) {
        throw error;
    }


    return (
        data || []
    )
        .map(
            row =>
                row.product
        )
        .filter(Boolean);
}


export async function toggleFavorite(
    productId,
    on
) {
    if (!productId) {
        throw new Error(
            'Product ID is required.'
        );
    }


    const supabase =
        await requireSupabase();


    if (on) {
        const {
            error
        } =
            await supabase
                .from(
                    'favorites'
                )
                .upsert(
                    {
                        product_id:
                            productId
                    },
                    {
                        onConflict:
                            'customer_id,product_id'
                    }
                );


        if (error) {
            throw error;
        }


        return;
    }


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
                productId
            );


    if (error) {
        throw error;
    }
}