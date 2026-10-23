import {
    requireSupabase
} from '../core/supabase.js';


function validateRange(
    start,
    end
) {
    const startTime =
        Date.parse(
            start
        );


    const endTime =
        Date.parse(
            end
        );


    if (
        !Number.isFinite(
            startTime
        )
        ||
        !Number.isFinite(
            endTime
        )
    ) {
        throw new Error(
            'A valid report date range is required.'
        );
    }


    if (
        startTime >= endTime
    ) {
        throw new Error(
            'Report start must be before report end.'
        );
    }
}


function normalizeRows(
    value
) {
    if (Array.isArray(value)) {
        return value;
    }


    if (
        value === null
        ||
        value === undefined
    ) {
        return [];
    }


    return [
        value
    ];
}


export async function dashboardKpis() {
    const supabase =
        await requireSupabase();


    const {
        data,
        error
    } =
        await supabase.rpc(
            'dashboard_kpis'
        );


    if (error) {
        throw error;
    }


    /*
     * Support both:
     *   { today_sales: ... }
     * and
     *   [{ today_sales: ... }]
     */
    if (Array.isArray(data)) {
        return data[0] || {};
    }


    return data || {};
}


export async function salesReport(
    start,
    end
) {
    validateRange(
        start,
        end
    );


    const supabase =
        await requireSupabase();


    const {
        data,
        error
    } =
        await supabase.rpc(
            'sales_report',
            {
                p_start:
                    start,

                p_end:
                    end
            }
        );


    if (error) {
        throw error;
    }


    return normalizeRows(
        data
    );
}


export async function productReport(
    start,
    end
) {
    validateRange(
        start,
        end
    );


    const supabase =
        await requireSupabase();


    const {
        data,
        error
    } =
        await supabase.rpc(
            'product_performance_report',
            {
                p_start:
                    start,

                p_end:
                    end
            }
        );


    if (error) {
        throw error;
    }


    return normalizeRows(
        data
    );
}


export async function categoryReport(
    start,
    end
) {
    validateRange(
        start,
        end
    );


    const supabase =
        await requireSupabase();


    const {
        data,
        error
    } =
        await supabase.rpc(
            'category_performance_report',
            {
                p_start:
                    start,

                p_end:
                    end
            }
        );


    if (error) {
        throw error;
    }


    return normalizeRows(
        data
    );
}