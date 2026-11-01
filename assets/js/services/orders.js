import {
    requireSupabase
} from '../core/supabase.js';

import {
    uid
} from '../core/utils.js';


const PAYMENT_PROOF_TYPES = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'application/pdf': 'pdf'
};


const MAX_PAYMENT_PROOF_SIZE =
    5 * 1024 * 1024;


export async function createOrder(
    payload,
    idempotencyKey = uid()
) {
    if (
        !payload
        ||
        typeof payload !==
        'object'
    ) {
        throw new Error(
            'Order payload is required.'
        );
    }


    const supabase =
        await requireSupabase();


    const {
        data,
        error
    } =
        await supabase.rpc(
            'create_order',
            {
                p_payload:
                    payload,

                p_idempotency_key:
                    idempotencyKey
                    ||
                    uid()
            }
        );


    if (error) {
        throw error;
    }


    return data;
}


export async function listMyOrders() {
    const supabase =
        await requireSupabase();


    const {
        data,
        error
    } =
        await supabase
            .from(
                'orders'
            )
            .select(
                `
                id,
                order_number,
                status,
                payment_status,
                fulfillment_type,
                total,
                created_at,
                items:order_items(
                    id,
                    product_name,
                    variant_name,
                    quantity,
                    unit_price,
                    line_total
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


    return data || [];
}


export async function getOrder(
    id
) {
    if (!id) {
        throw new Error(
            'Order ID is required.'
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
                'orders'
            )
            .select(
                `
                *,
                items:order_items(
                    *,
                    product:products(slug),
                    addons:order_item_addons(*)
                ),
                history:order_status_history(*),
                payments(
                    *,
                    method:payment_methods(*)
                )
                `
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


export async function getOrderByNumber(
    orderNumber
) {
    const value =
        String(
            orderNumber
            ||
            ''
        ).trim();


    if (!value) {
        throw new Error(
            'Order number is required.'
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
                'orders'
            )
            .select(
                `
                *,
                items:order_items(
                    *,
                    addons:order_item_addons(*)
                ),
                history:order_status_history(*),
                payments(
                    *,
                    method:payment_methods(*)
                )
                `
            )
            .eq(
                'order_number',
                value
            )
            .single();


    if (error) {
        throw error;
    }


    return data;
}


export async function updateOrderStatus(
    orderId,
    newStatus,
    reason = ''
) {
    if (!orderId) {
        throw new Error(
            'Order ID is required.'
        );
    }


    const status =
        String(
            newStatus
            ||
            ''
        ).trim();


    if (!status) {
        throw new Error(
            'Order status is required.'
        );
    }


    const supabase =
        await requireSupabase();


    const {
        data,
        error
    } =
        await supabase.rpc(
            'update_order_status',
            {
                p_order_id:
                    orderId,

                p_new_status:
                    status,

                p_reason:
                    String(
                        reason
                        ||
                        ''
                    ).trim()
            }
        );


    if (error) {
        throw error;
    }


    return data;
}


export async function cancelMyOrder(
    orderId,
    reason
) {
    if (!orderId) {
        throw new Error(
            'Order ID is required.'
        );
    }


    const cancellationReason =
        String(
            reason
            ||
            ''
        ).trim();


    if (!cancellationReason) {
        throw new Error(
            'Cancellation reason is required.'
        );
    }


    const supabase =
        await requireSupabase();


    const {
        data,
        error
    } =
        await supabase.rpc(
            'cancel_order',
            {
                p_order_id:
                    orderId,

                p_reason:
                    cancellationReason
            }
        );


    if (error) {
        throw error;
    }


    return data;
}


export async function uploadPaymentProof(
    paymentId,
    file,
    reference
) {
    if (!paymentId) {
        throw new Error(
            'Payment ID is required.'
        );
    }


    if (
        !file
        ||
        !(file instanceof File)
    ) {
        throw new Error(
            'Choose a payment proof file.'
        );
    }


    const extension =
        PAYMENT_PROOF_TYPES[
            file.type
        ];


    if (!extension) {
        throw new Error(
            'Use JPG, PNG, WEBP, or PDF proof files.'
        );
    }


    if (
        file.size >
        MAX_PAYMENT_PROOF_SIZE
    ) {
        throw new Error(
            'Payment proof must be 5 MB or smaller.'
        );
    }


    const supabase =
        await requireSupabase();


    const path =
        `${paymentId}/${crypto.randomUUID()}.${extension}`;


    const {
        error: uploadError
    } =
        await supabase
            .storage
            .from(
                'payment-proofs'
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


    if (uploadError) {
        throw uploadError;
    }


    const {
        data,
        error
    } =
        await supabase.rpc(
            'submit_payment_proof',
            {
                p_payment_id:
                    paymentId,

                p_storage_path:
                    path,

                p_reference:
                    String(
                        reference
                        ||
                        ''
                    ).trim()
            }
        );


    if (error) {
        /*
         * Avoid leaving an unused proof file
         * when the database RPC fails.
         */
        try {
            await supabase
                .storage
                .from(
                    'payment-proofs'
                )
                .remove([
                    path
                ]);

        } catch (cleanupError) {
            console.error(
                'Payment proof cleanup failed:',
                cleanupError
            );
        }


        throw error;
    }


    return data;
}


export async function subscribeToMyOrder(
    orderId,
    callback
) {
    if (!orderId) {
        throw new Error(
            'Order ID is required.'
        );
    }


    if (
        typeof callback !==
        'function'
    ) {
        throw new TypeError(
            'Order subscription callback must be a function.'
        );
    }


    const supabase =
        await requireSupabase();


    const channel =
        supabase
            .channel(
                `order-${orderId}`
            )
            .on(
                'postgres_changes',
                {
                    event:
                        'UPDATE',

                    schema:
                        'public',

                    table:
                        'orders',

                    filter:
                        `id=eq.${orderId}`
                },
                payload =>
                    callback(
                        payload.new
                    )
            )
            .on(
                'postgres_changes',
                {
                    event:
                        'INSERT',

                    schema:
                        'public',

                    table:
                        'order_status_history',

                    filter:
                        `order_id=eq.${orderId}`
                },
                payload =>
                    callback(
                        payload.new
                    )
            )
            .subscribe();


    return () =>
        supabase.removeChannel(
            channel
        );
}


export async function listOperationalOrders(
    filters = {}
) {
    const supabase =
        await requireSupabase();


    const limit =
        Math.min(
            1000,
            Math.max(
                1,
                Math.floor(
                    Number(
                        filters.limit
                    )
                    ||
                    200
                )
            )
        );


    let query =
        supabase
            .from(
                'orders'
            )
            .select(
                `
                id,
                order_number,
                customer_name,
                customer_email,
                customer_phone,
                item_count,
                total,
                payment_status,
                fulfillment_type,
                status,
                created_at,
                source
                `
            )
            .order(
                'created_at',
                {
                    ascending:
                        false
                }
            )
            .limit(
                limit
            );


    if (
        filters.status
    ) {
        query =
            query.eq(
                'status',
                filters.status
            );
    }


    if (
        filters.fulfillment
    ) {
        query =
            query.eq(
                'fulfillment_type',
                filters.fulfillment
            );
    }


    if (
        filters.payment
    ) {
        query =
            query.eq(
                'payment_status',
                filters.payment
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


export async function subscribeToOperationalOrders(
    callback
) {
    if (
        typeof callback !==
        'function'
    ) {
        throw new TypeError(
            'Operational order callback must be a function.'
        );
    }


    const supabase =
        await requireSupabase();


    const channel =
        supabase
            .channel(
                'operations-orders'
            )
            .on(
                'postgres_changes',
                {
                    event:
                        '*',

                    schema:
                        'public',

                    table:
                        'orders'
                },
                payload => {
                    callback(
                        payload
                    );
                }
            )
            .subscribe();


    return () =>
        supabase.removeChannel(
            channel
        );
}