import {
    requireSupabase
} from '../core/supabase.js';

import {
    uid
} from '../core/utils.js';


export async function listInventory() {
    const supabase =
        await requireSupabase();


    const {
        data,
        error
    } =
        await supabase
            .from(
                'inventory_items'
            )
            .select(
                `
                *,
                ingredient:ingredients(
                    id,
                    name,
                    unit
                ),
                supplier:suppliers!inventory_items_supplier_id_fkey(
                    id,
                    name
                )
                `
            )
            .order(
                'sku'
            );


    if (error) {
        throw error;
    }


    return data || [];
}


export async function adjustInventory(
    inventoryItemId,
    delta,
    movementType,
    notes = ''
) {
    if (!inventoryItemId) {
        throw new Error(
            'Inventory item is required.'
        );
    }


    const quantityDelta =
        Number(
            delta
        );


    if (
        !Number.isFinite(
            quantityDelta
        )
        ||
        quantityDelta === 0
    ) {
        throw new Error(
            'Inventory adjustment must be a non-zero number.'
        );
    }


    const type =
        String(
            movementType
            ||
            ''
        ).trim();


    if (!type) {
        throw new Error(
            'Movement type is required.'
        );
    }


    const supabase =
        await requireSupabase();


    const {
        data,
        error
    } =
        await supabase.rpc(
            'adjust_inventory',
            {
                p_inventory_item_id:
                    inventoryItemId,

                p_quantity_delta:
                    quantityDelta,

                p_movement_type:
                    type,

                p_notes:
                    String(
                        notes
                        ||
                        ''
                    ).trim(),

                p_idempotency_key:
                    uid()
            }
        );


    if (error) {
        throw error;
    }


    return data;
}


export async function listMovements(
    limit = 300
) {
    const supabase =
        await requireSupabase();


    const safeLimit =
        Math.min(
            2000,
            Math.max(
                1,
                Math.floor(
                    Number(limit)
                    ||
                    300
                )
            )
        );


    const {
        data,
        error
    } =
        await supabase
            .from(
                'inventory_movements'
            )
            .select(
                `
                *,
                item:inventory_items(
                    sku,
                    ingredient:ingredients(
                        name,
                        unit
                    )
                ),
                actor:profiles(
                    full_name
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
                safeLimit
            );


    if (error) {
        throw error;
    }


    return data || [];
}


export async function receivePurchaseOrder(
    purchaseOrderId,
    items
) {
    if (!purchaseOrderId) {
        throw new Error(
            'Purchase order is required.'
        );
    }


    const receipts =
        (
            Array.isArray(items)
                ? items
                : []
        )
            .map(
                item => ({
                    purchase_order_item_id:
                        item.purchase_order_item_id,

                    quantity:
                        Number(
                            item.quantity
                        )
                })
            )
            .filter(
                item =>
                    item.purchase_order_item_id
                    &&
                    Number.isFinite(
                        item.quantity
                    )
                    &&
                    item.quantity > 0
            );


    if (!receipts.length) {
        throw new Error(
            'Enter at least one received quantity.'
        );
    }


    const supabase =
        await requireSupabase();


    const {
        data,
        error
    } =
        await supabase.rpc(
            'receive_purchase_order',
            {
                p_purchase_order_id:
                    purchaseOrderId,

                p_receipts:
                    receipts,

                p_idempotency_key:
                    uid()
            }
        );


    if (error) {
        throw error;
    }


    return data;
}
