import {
    requireSupabase
} from '../core/supabase.js';

import {
    uid
} from '../core/utils.js';


function safeLimit(
    value,
    fallback = 250
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


function requirePaymentId(
    paymentId
) {
    if (!paymentId) {
        throw new Error(
            'Payment ID is required.'
        );
    }
}


export async function listPayments(
    limit = 250
) {
    const supabase =
        await requireSupabase();


    const {
        data,
        error
    } =
        await supabase
            .from(
                'payments'
            )
            .select(
                `
                *,
                order:orders(
                    order_number,
                    customer_name,
                    total
                ),
                method:payment_methods(
                    name,
                    code,
                    method_type
                )
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
                safeLimit(
                    limit
                )
            );


    if (error) {
        throw error;
    }


    return data || [];
}


export async function signedProofUrl(
    path
) {
    const storagePath =
        String(
            path || ''
        ).trim();


    if (!storagePath) {
        throw new Error(
            'Payment proof path is missing.'
        );
    }


    const supabase =
        await requireSupabase();


    const {
        data,
        error
    } =
        await supabase
            .storage
            .from(
                'payment-proofs'
            )
            .createSignedUrl(
                storagePath,
                300
            );


    if (error) {
        throw error;
    }


    if (!data?.signedUrl) {
        throw new Error(
            'Payment proof URL could not be created.'
        );
    }


    return data.signedUrl;
}


export async function verifyPayment(
    paymentId,
    decision,
    reason = ''
) {
    requirePaymentId(
        paymentId
    );


    const normalizedDecision =
        String(
            decision || ''
        )
            .trim()
            .toUpperCase();


    if (
        ![
            'VERIFY',
            'REJECT'
        ]
            .includes(
                normalizedDecision
            )
    ) {
        throw new Error(
            'Invalid payment verification decision.'
        );
    }


    const normalizedReason =
        String(
            reason || ''
        ).trim();


    if (
        normalizedDecision ===
        'REJECT'
        &&
        !normalizedReason
    ) {
        throw new Error(
            'A rejection reason is required.'
        );
    }


    const supabase =
        await requireSupabase();


    const {
        data,
        error
    } =
        await supabase.rpc(
            'verify_payment',
            {
                p_payment_id:
                    paymentId,

                p_decision:
                    normalizedDecision,

                p_reason:
                    normalizedReason,

                p_idempotency_key:
                    uid()
            }
        );


    if (error) {
        throw error;
    }


    return data;
}


export async function recordRefund(
    paymentId,
    amount,
    reason
) {
    requirePaymentId(
        paymentId
    );


    const refundAmount =
        Number(amount);


    if (
        !Number.isFinite(
            refundAmount
        )
        ||
        refundAmount <= 0
    ) {
        throw new Error(
            'Refund amount must be greater than zero.'
        );
    }


    const refundReason =
        String(
            reason || ''
        ).trim();


    if (!refundReason) {
        throw new Error(
            'Refund reason is required.'
        );
    }


    const supabase =
        await requireSupabase();


    const {
        data,
        error
    } =
        await supabase.rpc(
            'record_refund',
            {
                p_payment_id:
                    paymentId,

                p_amount:
                    refundAmount,

                p_reason:
                    refundReason,

                p_idempotency_key:
                    uid()
            }
        );


    if (error) {
        throw error;
    }


    return data;
}


export async function recordCashPayment(
    paymentId
) {
    requirePaymentId(
        paymentId
    );


    const supabase =
        await requireSupabase();


    const {
        data,
        error
    } =
        await supabase.rpc(
            'record_cash_payment',
            {
                p_payment_id:
                    paymentId,

                p_idempotency_key:
                    uid()
            }
        );


    if (error) {
        throw error;
    }


    return data;
}