import {
    requireSupabase
} from '../core/supabase.js';


const PRODUCT_IMAGE_TYPES = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp'
};


const MAX_PRODUCT_IMAGE_SIZE =
    4 * 1024 * 1024;


function safeLimit(
    value,
    fallback = 500
) {
    const number =
        Number(value);


    if (
        !Number.isFinite(number)
        ||
        number <= 0
    ) {
        return fallback;
    }


    return Math.min(
        Math.floor(number),
        2000
    );
}


export async function crudList(
    table,
    select = '*',
    options = {}
) {
    const supabase =
        await requireSupabase();


    let query =
        supabase
            .from(table)
            .select(select)
            .limit(
                safeLimit(
                    options.limit
                )
            );


    if (options.order) {
        query =
            query.order(
                options.order,
                {
                    ascending:
                        options.ascending
                        ??
                        true
                }
            );
    }


    const {
        data,
        error
    } =
        await query;


    if (error) {
        throw error;
    }


    return data || [];
}


export async function crudSave(
    table,
    payload,
    id = null
) {
    const supabase =
        await requireSupabase();


    const query =
        id
            ? supabase
                .from(table)
                .update(payload)
                .eq(
                    'id',
                    id
                )
            : supabase
                .from(table)
                .insert(payload);


    const {
        data,
        error
    } =
        await query
            .select()
            .single();


    if (error) {
        throw error;
    }


    return data;
}


export async function archive(
    table,
    id,
    active = false
) {
    const supabase =
        await requireSupabase();


    const {
        data,
        error
    } =
        await supabase
            .from(table)
            .update({
                active:
                    Boolean(active)
            })
            .eq(
                'id',
                id
            )
            .select()
            .single();


    if (error) {
        throw error;
    }


    return data;
}


export async function invokeAdminUsers(
    action,
    payload = {}
) {
    const supabase =
        await requireSupabase();


    const {
        data,
        error
    } =
        await supabase
            .functions
            .invoke(
                'admin-users',
                {
                    body: {
                        action,
                        ...payload
                    }
                }
            );


    if (error) {
        throw error;
    }


    if (
        data?.error
    ) {
        throw new Error(
            String(
                data.error
            )
        );
    }


    return data || {};
}


export async function uploadProductImage(
    productId,
    file
) {
    if (
        !file
        ||
        !(file instanceof File)
    ) {
        throw new Error(
            'Choose a product image.'
        );
    }


    const extension =
        PRODUCT_IMAGE_TYPES[
            file.type
        ];


    if (!extension) {
        throw new Error(
            'Use JPG, PNG or WEBP.'
        );
    }


    if (
        file.size >
        MAX_PRODUCT_IMAGE_SIZE
    ) {
        throw new Error(
            'Image must be 4 MB or smaller.'
        );
    }


    const supabase =
        await requireSupabase();


    const path =
        `products/${productId}/${crypto.randomUUID()}.${extension}`;


    const {
        error
    } =
        await supabase
            .storage
            .from(
                'product-images'
            )
            .upload(
                path,
                file,
                {
                    contentType:
                        file.type,

                    upsert:
                        false
                }
            );


    if (error) {
        throw error;
    }


    const {
        data
    } =
        supabase
            .storage
            .from(
                'product-images'
            )
            .getPublicUrl(
                path
            );


    return {
        path,
        publicUrl:
            data?.publicUrl
            ||
            ''
    };
}