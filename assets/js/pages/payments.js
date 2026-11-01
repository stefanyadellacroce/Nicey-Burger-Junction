import {
    listPayments,
    signedProofUrl,
    verifyPayment,
    recordRefund,
    recordCashPayment
} from '../services/payments.js';

import {
    el,
    replaceChildren
} from '../core/dom.js';

import {
    money,
    formatDate,
    notify,
    setBusy
} from '../core/utils.js';


let rows = [];
let canRecordRefunds = true;


function getReference(
    payment
) {
    return (
        payment.reference
        ||
        payment.reference_number
        ||
        payment.transaction_reference
        ||
        '—'
    );
}


function getSubmittedDate(
    payment
) {
    return (
        payment.submitted_at
        ||
        payment.created_at
    );
}


async function loadRows() {
    rows =
        await listPayments(
            500
        )
        ||
        [];


    render();
}


function filteredRows() {
    const search =
        document.getElementById(
            'payment-search'
        );


    const statusFilter =
        document.getElementById(
            'payment-status-filter'
        );


    const term =
        String(
            search?.value
            ||
            ''
        )
            .trim()
            .toLowerCase();


    const status =
        statusFilter?.value
        ||
        '';


    return rows.filter(
        payment => {
            if (
                status
                &&
                payment.status !==
                status
            ) {
                return false;
            }


            if (!term) {
                return true;
            }


            const haystack =
                [
                    payment.order
                        ?.order_number,
                    payment.method
                        ?.name,
                    getReference(
                        payment
                    ),
                    payment.status
                ]
                    .filter(Boolean)
                    .join(' ')
                    .toLowerCase();


            return haystack.includes(
                term
            );
        }
    );
}


async function openProof(
    payment
) {
    /*
     * Open the new tab synchronously so browsers
     * are less likely to block it while the
     * signed URL is being requested.
     */
    const popup =
        window.open(
            'about:blank',
            '_blank'
        );


    if (popup) {
        popup.opener =
            null;
    }


    try {
        const url =
            await signedProofUrl(
                payment.proof_path
            );


        if (!url) {
            throw new Error(
                'Payment proof could not be opened.'
            );
        }


        if (popup) {
            popup.location.replace(
                url
            );

        } else {
            window.location.href =
                url;
        }

    } catch (error) {
        popup?.close();


        throw error;
    }
}


function createActionCell(
    payment
) {
    const cell =
        el(
            'td',
            {
                className:
                    'cluster'
            }
        );


    if (
        payment.proof_path
    ) {
        const button =
            el(
                'button',
                {
                    className:
                        'btn-nbj ghost sm',

                    type:
                        'button',

                    text:
                        'View proof'
                }
            );


        button.onclick =
            async () => {
                if (
                    button.disabled
                ) {
                    return;
                }


                button.disabled =
                    true;


                try {
                    await openProof(
                        payment
                    );

                } catch (error) {
                    console.error(
                        'Open payment proof error:',
                        error
                    );


                    notify(
                        error?.message
                        ||
                        'Unable to open the payment proof.',
                        'danger'
                    );

                } finally {
                    button.disabled =
                        false;
                }
            };


        cell.append(
            button
        );
    }


    if (
        [
            'PENDING',
            'SUBMITTED'
        ]
            .includes(
                payment.status
            )
        &&
        payment.method
            ?.method_type ===
            'CASH'
    ) {
        const button =
            el(
                'button',
                {
                    className:
                        'btn-nbj sm',

                    type:
                        'button',

                    text:
                        'Mark paid'
                }
            );


        button.onclick =
            async () => {
                if (
                    button.disabled
                ) {
                    return;
                }


                setBusy(
                    button,
                    true,
                    'Saving…'
                );


                try {
                    await recordCashPayment(
                        payment.id
                    );


                    notify(
                        'Cash payment recorded.',
                        'success'
                    );


                    await loadRows();

                } catch (error) {
                    console.error(
                        'Cash payment error:',
                        error
                    );


                    notify(
                        error?.message
                        ||
                        'Unable to record the cash payment.',
                        'danger'
                    );

                } finally {
                    setBusy(
                        button,
                        false
                    );
                }
            };


        cell.append(
            button
        );
    }


    if (
        [
            'PENDING',
            'SUBMITTED'
        ]
            .includes(
                payment.status
            )
        &&
        payment.method
            ?.method_type !==
            'CASH'
        &&
        (
            payment.status ===
                'SUBMITTED'
            ||
            payment.method
                ?.requires_proof !==
                true
        )
    ) {
        const verifyButton =
            el(
                'button',
                {
                    className:
                        'btn-nbj sm',

                    type:
                        'button',

                    text:
                        'Verify'
                }
            );


        verifyButton.onclick =
            async () => {
                if (
                    verifyButton.disabled
                ) {
                    return;
                }


                setBusy(
                    verifyButton,
                    true,
                    'Verifying…'
                );


                try {
                    await verifyPayment(
                        payment.id,
                        'VERIFY',
                        ''
                    );


                    notify(
                        'Payment verified.',
                        'success'
                    );


                    await loadRows();

                } catch (error) {
                    console.error(
                        'Payment verification error:',
                        error
                    );


                    notify(
                        error?.message
                        ||
                        'Unable to verify the payment.',
                        'danger'
                    );

                } finally {
                    setBusy(
                        verifyButton,
                        false
                    );
                }
            };


        const rejectButton =
            el(
                'button',
                {
                    className:
                        'btn btn-link text-danger p-0',

                    type:
                        'button',

                    text:
                        'Reject'
                }
            );


        rejectButton.onclick =
            async () => {
                if (
                    rejectButton.disabled
                ) {
                    return;
                }


                const reason =
                    String(
                        window.prompt(
                            'Rejection reason:'
                        )
                        ||
                        ''
                    ).trim();


                if (!reason) {
                    return;
                }


                rejectButton.disabled =
                    true;


                try {
                    await verifyPayment(
                        payment.id,
                        'REJECT',
                        reason
                    );


                    notify(
                        'Payment rejected.',
                        'success'
                    );


                    await loadRows();

                } catch (error) {
                    console.error(
                        'Reject payment error:',
                        error
                    );


                    notify(
                        error?.message
                        ||
                        'Unable to reject the payment.',
                        'danger'
                    );

                } finally {
                    rejectButton.disabled =
                        false;
                }
            };


        cell.append(
            verifyButton,
            rejectButton
        );
    }


    if (
        canRecordRefunds &&
        [
            'PAID',
            'VERIFIED',
            'PARTIALLY_REFUNDED'
        ]
            .includes(
                payment.status
            )
    ) {
        const refundButton =
            el(
                'button',
                {
                    className:
                        'btn-nbj ghost sm',

                    type:
                        'button',

                    text:
                        'Refund'
                }
            );


        refundButton.onclick =
            async () => {
                if (
                    refundButton.disabled
                ) {
                    return;
                }


                const total =
                    Number(
                        payment.amount
                        ||
                        0
                    );


                const refunded =
                    Number(
                        payment.refunded_amount
                        ||
                        0
                    );


                const maximum =
                    Math.max(
                        0,
                        total
                        -
                        refunded
                    );


                const rawAmount =
                    window.prompt(
                        `Refund amount (maximum ${maximum.toFixed(
                            2
                        )}):`
                    );


                if (
                    rawAmount ===
                    null
                ) {
                    return;
                }


                const amount =
                    Number(
                        rawAmount
                    );


                if (
                    !Number.isFinite(
                        amount
                    )
                    ||
                    amount <= 0
                    ||
                    amount > maximum
                ) {
                    notify(
                        'Enter a valid refund amount within the available balance.',
                        'danger'
                    );

                    return;
                }


                const reason =
                    String(
                        window.prompt(
                            'Refund reason:'
                        )
                        ||
                        ''
                    ).trim();


                if (!reason) {
                    return;
                }


                setBusy(
                    refundButton,
                    true,
                    'Saving…'
                );


                try {
                    await recordRefund(
                        payment.id,
                        amount,
                        reason
                    );


                    notify(
                        'Refund record created.',
                        'success'
                    );


                    await loadRows();

                } catch (error) {
                    console.error(
                        'Refund error:',
                        error
                    );


                    notify(
                        error?.message
                        ||
                        'Unable to record the refund.',
                        'danger'
                    );

                } finally {
                    setBusy(
                        refundButton,
                        false
                    );
                }
            };


        cell.append(
            refundButton
        );
    }


    return cell;
}


function render() {
    const tbody =
        document.getElementById(
            'payments-tbody'
        );


    if (!tbody) {
        return;
    }


    const filtered =
        filteredRows();


    if (!filtered.length) {
        replaceChildren(
            tbody,
            [
                el(
                    'tr',
                    {},
                    [
                        el(
                            'td',
                            {
                                colspan:
                                    '7',

                                className:
                                    'text-center muted py-4',

                                text:
                                    'No matching payment records found.'
                            }
                        )
                    ]
                )
            ]
        );

        return;
    }


    /*
     * Matches current Payments HTML:
     *
     * Order
     * Method
     * Amount
     * Reference
     * Status
     * Submitted
     * Actions
     */
    replaceChildren(
        tbody,
        filtered.map(
            payment => {
                const status =
                    String(
                        payment.status
                        ||
                        ''
                    );


                return el(
                    'tr',
                    {},
                    [
                        el(
                            'td',
                            {
                                text:
                                    payment.order
                                        ?.order_number
                                    ||
                                    '—'
                            }
                        ),

                        el(
                            'td',
                            {
                                text:
                                    payment.method
                                        ?.name
                                    ||
                                    '—'
                            }
                        ),

                        el(
                            'td',
                            {
                                text:
                                    money(
                                        payment.amount
                                        ||
                                        0
                                    )
                            }
                        ),

                        el(
                            'td',
                            {
                                text:
                                    getReference(
                                        payment
                                    )
                            }
                        ),

                        el(
                            'td',
                            {},
                            el(
                                'span',
                                {
                                    className:
                                        `status-pill ${status.toLowerCase()}`,

                                    text:
                                        status
                                        ||
                                        '—'
                                }
                            )
                        ),

                        el(
                            'td',
                            {
                                text:
                                    formatDate(
                                        getSubmittedDate(
                                            payment
                                        )
                                    )
                            }
                        ),

                        createActionCell(
                            payment
                        )
                    ]
                );
            }
        )
    );
}


export async function init({
    kind = 'admin'
} = {}) {
    canRecordRefunds =
        kind === 'admin';

    const search =
        document.getElementById(
            'payment-search'
        );


    const status =
        document.getElementById(
            'payment-status-filter'
        );


    const tbody =
        document.getElementById(
            'payments-tbody'
        );


    if (
        !search ||
        !status ||
        !tbody
    ) {
        console.warn(
            'Payment page elements were not found.'
        );

        return;
    }


    /*
     * Search and status filtering are now local.
     * listPayments() is no longer called for
     * every typed character.
     */
    search.addEventListener(
        'input',
        render
    );


    status.addEventListener(
        'change',
        render
    );


    await loadRows();
}