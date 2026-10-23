import {
    requireSupabase
} from '../core/supabase.js';

import {
    config
} from '../core/config.js';


const PRODUCT_SELECT = `
    id,
    slug,
    name,
    short_description,
    description,
    base_price,
    category_id,
    active,
    manually_sold_out,
    featured,
    bestseller,
    allergen_notes,
    sort_order,
    rating_average,
    rating_count,
    category:categories(
        id,
        name,
        slug
    ),
    images:product_images(
        id,
        path,
        alt_text,
        sort_order
    ),
    variants:product_variants(
        id,
        name,
        price_delta,
        active,
        sort_order
    ),
    product_addons(
        addon:addons(
            id,
            name,
            price,
            active
        )
    )
`;


function safeLimit(
    value,
    fallback = 4,
    maximum = 50
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
        maximum
    );
}


function sanitizeSearch(
    value
) {
    return String(
        value || ''
    )
        .trim()
        .replace(
            /[,%()]/g,
            ' '
        )
        .replace(
            /\s+/g,
            ' '
        );
}


function uniqueIds(
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


export function productImage(
    product
) {
    const images =
        [
            ...(product?.images || [])
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


    const image =
        images[0];


    if (!image?.path) {
        return '/assets/images/food-default.svg';
    }


    if (
        /^https?:\/\//i.test(
            image.path
        )
    ) {
        return image.path;
    }


    if (image.public_url) {
        return image.public_url;
    }


    const encodedPath =
        String(
            image.path
        )
            .replace(
                /^\/+/,
                ''
            )
            .split('/')
            .map(
                segment =>
                    encodeURIComponent(
                        segment
                    )
            )
            .join('/');


    return (
        `${config.supabaseUrl}/storage/v1/object/public/product-images/${encodedPath}`
    );
}


export async function listProducts(
    filters = {}
) {
    const supabase =
        await requireSupabase();


    let categoryId =
        null;


    const categorySlug =
        String(
            filters.category || ''
        ).trim();


    if (categorySlug) {
        const {
            data: category,
            error
        } =
            await supabase
                .from(
                    'categories'
                )
                .select(
                    'id'
                )
                .eq(
                    'slug',
                    categorySlug
                )
                .eq(
                    'active',
                    true
                )
                .maybeSingle();


        if (error) {
            throw error;
        }


        if (!category) {
            return [];
        }


        categoryId =
            category.id;
    }


    let query =
        supabase
            .from(
                'products'
            )
            .select(
                PRODUCT_SELECT
            )
            .eq(
                'active',
                true
            );


    if (categoryId) {
        query =
            query.eq(
                'category_id',
                categoryId
            );
    }


    if (filters.featured) {
        query =
            query.eq(
                'featured',
                true
            );
    }


    if (filters.bestseller) {
        query =
            query.eq(
                'bestseller',
                true
            );
    }


    const search =
        sanitizeSearch(
            filters.search
        );


    if (search) {
        query =
            query.or(
                `name.ilike.%${search}%,short_description.ilike.%${search}%`
            );
    }


    if (
        filters.available ===
        true
    ) {
        query =
            query.eq(
                'manually_sold_out',
                false
            );
    }


    if (
        filters.sort ===
        'price-asc'
    ) {
        query =
            query.order(
                'base_price',
                {
                    ascending:
                        true
                }
            );

    } else if (
        filters.sort ===
        'price-desc'
    ) {
        query =
            query.order(
                'base_price',
                {
                    ascending:
                        false
                }
            );

    } else if (
        filters.sort ===
        'name'
    ) {
        query =
            query.order(
                'name',
                {
                    ascending:
                        true
                }
            );

    } else {
        query =
            query.order(
                'sort_order',
                {
                    ascending:
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


export async function getProductBySlug(
    slug
) {
    const value =
        String(
            slug || ''
        ).trim();


    if (!value) {
        throw new Error(
            'Product slug is required.'
        );
    }


    const supabase =
        await requireSupabase();


    const {
        data,
        error
    } =
        await supabase
            .from(
                'products'
            )
            .select(
                PRODUCT_SELECT
            )
            .eq(
                'slug',
                value
            )
            .eq(
                'active',
                true
            )
            .single();


    if (error) {
        throw error;
    }


    return data;
}


export async function getProductById(
    id
) {
    if (!id) {
        throw new Error(
            'Product ID is required.'
        );
    }


    const supabase =
        await requireSupabase();


    const {
        data,
        error
    } =
        await supabase
            .from(
                'products'
            )
            .select(
                PRODUCT_SELECT
            )
            .eq(
                'id',
                id
            )
            .single();


    if (error) {
        throw error;
    }


    return data;
}


export async function listCategories() {
    const supabase =
        await requireSupabase();


    const {
        data,
        error
    } =
        await supabase
            .from(
                'categories'
            )
            .select(
                `
                id,
                name,
                slug,
                description,
                image_path,
                sort_order,
                active
                `
            )
            .eq(
                'active',
                true
            )
            .order(
                'sort_order'
            );


    if (error) {
        throw error;
    }


    return data || [];
}


export async function relatedProducts(
    product,
    limit = 4
) {
    if (
        !product?.id ||
        !product?.category_id
    ) {
        return [];
    }


    const supabase =
        await requireSupabase();


    const {
        data,
        error
    } =
        await supabase
            .from(
                'products'
            )
            .select(
                PRODUCT_SELECT
            )
            .eq(
                'category_id',
                product.category_id
            )
            .eq(
                'active',
                true
            )
            .neq(
                'id',
                product.id
            )
            .order(
                'sort_order'
            )
            .limit(
                safeLimit(
                    limit
                )
            );


    if (error) {
        throw error;
    }


    return data || [];
}


export async function checkAvailability(
    productId,
    variantId = null,
    quantity = 1,
    addonIds = []
) {
    if (!productId) {
        throw new Error(
            'Product ID is required.'
        );
    }


    const requestedQuantity =
        Math.max(
            1,
            Math.floor(
                Number(quantity)
                ||
                1
            )
        );


    const supabase =
        await requireSupabase();


    const {
        data,
        error
    } =
        await supabase.rpc(
            'check_product_availability',
            {
                p_product_id:
                    productId,

                p_variant_id:
                    variantId
                    ||
                    null,

                p_quantity:
                    requestedQuantity,

                p_addon_ids:
                    uniqueIds(
                        addonIds
                    )
            }
        );


    if (error) {
        throw error;
    }


    return data;
}


export async function listRemovableIngredients(
    productId
) {
    if (!productId) {
        return [];
    }


    const supabase =
        await requireSupabase();


    const {
        data,
        error
    } =
        await supabase
            .from(
                'product_ingredients'
            )
            .select(
                `
                ingredient:ingredients(
                    id,
                    name
                )
                `
            )
            .eq(
                'product_id',
                productId
            )
            .eq(
                'removable',
                true
            );


    if (error) {
        throw error;
    }


    const seen =
        new Map();


    (
        data || []
    )
        .forEach(
            row => {
                if (
                    row.ingredient?.id
                ) {
                    seen.set(
                        row.ingredient.id,
                        row.ingredient
                    );
                }
            }
        );


    return [
        ...seen.values()
    ];
}