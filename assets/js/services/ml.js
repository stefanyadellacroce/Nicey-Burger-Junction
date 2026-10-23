import {
    requireSupabase
} from '../core/supabase.js';


function isoDate(
    date
) {
    return date
        .toISOString()
        .slice(
            0,
            10
        );
}


export async function getActiveModels() {
    const supabase =
        await requireSupabase();


    const {
        data,
        error
    } =
        await supabase
            .from(
                'ml_models'
            )
            .select('*')
            .eq(
                'status',
                'ACTIVE'
            )
            .order(
                'trained_at',
                {
                    ascending:
                        false
                }
            );


    if (error) {
        throw error;
    }


    return data || [];
}


export async function getDemandForecast(
    days = 14
) {
    const supabase =
        await requireSupabase();


    const safeDays =
        Math.min(
            365,
            Math.max(
                1,
                Math.floor(
                    Number(days)
                    ||
                    14
                )
            )
        );


    const start =
        new Date();


    const end =
        new Date(
            start
        );


    end.setDate(
        end.getDate()
        +
        safeDays
    );


    const {
        data,
        error
    } =
        await supabase
            .from(
                'demand_forecasts'
            )
            .select(
                `
                *,
                product:products(
                    name,
                    slug
                )
                `
            )
            .gte(
                'forecast_date',
                isoDate(start)
            )
            .lte(
                'forecast_date',
                isoDate(end)
            )
            .order(
                'forecast_date'
            );


    if (error) {
        throw error;
    }


    return data || [];
}


export async function getInventoryForecast() {
    const supabase =
        await requireSupabase();


    const {
        data,
        error
    } =
        await supabase
            .from(
                'inventory_forecasts'
            )
            .select(
                `
                *,
                ingredient:ingredients(
                    name,
                    unit
                )
                `
            )
            .gte(
                'forecast_date',
                isoDate(
                    new Date()
                )
            )
            .order(
                'forecast_date'
            );


    if (error) {
        throw error;
    }


    return data || [];
}


export async function getRecommendations(
    productId = null,
    limit = 6
) {
    const supabase =
        await requireSupabase();


    const safeLimit =
        Math.min(
            50,
            Math.max(
                1,
                Math.floor(
                    Number(limit)
                    ||
                    6
                )
            )
        );


    let query =
        supabase
            .from(
                'product_recommendations'
            )
            .select(
                `
                score,
                reason,
                recommended:products(
                    id,
                    slug,
                    name,
                    base_price,
                    short_description,
                    images:product_images(
                        path,
                        sort_order
                    )
                )
                `
            )
            .order(
                'score',
                {
                    ascending:
                        false
                }
            )
            .limit(
                safeLimit
            );


    if (productId) {
        query =
            query.eq(
                'source_product_id',
                productId
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