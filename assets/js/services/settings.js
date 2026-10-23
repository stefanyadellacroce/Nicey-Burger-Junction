import {
    getSupabase
} from '../core/supabase.js';


const BOOLEAN_KEYS =
    new Set([
        'ordering_enabled',
        'pickup_enabled',
        'delivery_enabled'
    ]);


const NUMBER_KEYS =
    new Set([
        'default_delivery_fee',
        'minimum_order',
        'minimum_delivery_order',
        'preparation_minutes',
        'service_fee',
        'tax_rate_percent'
    ]);


let cache =
    null;


function unwrapValue(
    value
) {
    if (
        value
        &&
        typeof value ===
        'object'
        &&
        !Array.isArray(value)
        &&
        Object.prototype
            .hasOwnProperty
            .call(
                value,
                'value'
            )
    ) {
        return value.value;
    }


    return value;
}


function parseBoolean(
    value
) {
    value =
        unwrapValue(
            value
        );


    if (
        typeof value ===
        'boolean'
    ) {
        return value;
    }


    if (
        typeof value ===
        'number'
    ) {
        return value !== 0;
    }


    if (
        typeof value ===
        'string'
    ) {
        return [
            'true',
            '1',
            'yes',
            'on'
        ]
            .includes(
                value
                    .trim()
                    .toLowerCase()
            );
    }


    return false;
}


function normalizeSetting(
    key,
    value
) {
    value =
        unwrapValue(
            value
        );


    if (
        BOOLEAN_KEYS.has(
            key
        )
    ) {
        return parseBoolean(
            value
        );
    }


    if (
        NUMBER_KEYS.has(
            key
        )
    ) {
        const number =
            Number(
                value
            );


        return Number.isFinite(
            number
        )
            ? number
            : 0;
    }


    return value;
}


export async function getPublicSettings(
    force = false
) {
    if (
        cache
        &&
        !force
    ) {
        return {
            ...cache
        };
    }


    const supabase =
        await getSupabase();


    if (!supabase) {
        return {};
    }


    const {
        data,
        error
    } =
        await supabase
            .from(
                'settings'
            )
            .select(
                'key,value'
            )
            .eq(
                'public_read',
                true
            );


    if (error) {
        throw error;
    }


    cache =
        Object.fromEntries(
            (
                data || []
            )
                .map(
                    row => [
                        row.key,

                        normalizeSetting(
                            row.key,
                            row.value
                        )
                    ]
                )
        );


    return {
        ...cache
    };
}


export async function getAllSettings() {
    const supabase =
        await getSupabase();


    if (!supabase) {
        return [];
    }


    const {
        data,
        error
    } =
        await supabase
            .from(
                'settings'
            )
            .select('*')
            .order(
                'key'
            );


    if (error) {
        throw error;
    }


    return data || [];
}


export async function saveSetting(
    key,
    value,
    publicRead = false
) {
    const settingKey =
        String(
            key || ''
        ).trim();


    if (!settingKey) {
        throw new Error(
            'Setting key is required.'
        );
    }


    const supabase =
        await getSupabase();


    if (!supabase) {
        throw new Error(
            'Supabase is not configured.'
        );
    }


    /*
     * Keep compatibility with settings that
     * were historically stored as:
     *
     * { "value": ... }
     */
    const {
        data,
        error
    } =
        await supabase
            .from(
                'settings'
            )
            .upsert(
                {
                    key:
                        settingKey,

                    value: {
                        value
                    },

                    public_read:
                        Boolean(
                            publicRead
                        )
                },
                {
                    onConflict:
                        'key'
                }
            )
            .select()
            .single();


    if (error) {
        throw error;
    }


    cache =
        null;


    return data;
}


export async function getStoreStatus() {
    const supabase =
        await getSupabase();


    if (!supabase) {
        return {
            open:
                false,

            reason:
                'Supabase configuration required'
        };
    }


    const {
        data,
        error
    } =
        await supabase.rpc(
            'get_store_status'
        );


    if (error) {
        throw error;
    }


    /*
     * Support RPCs returning either one object
     * or a one-row result.
     */
    const status =
        Array.isArray(data)
            ? data[0]
            : data;


    if (
        !status
        ||
        typeof status !==
        'object'
    ) {
        return {
            open:
                false,

            reason:
                'Store status is unavailable'
        };
    }


    return {
        ...status,

        open:
            parseBoolean(
                status.open
            )
    };
}
