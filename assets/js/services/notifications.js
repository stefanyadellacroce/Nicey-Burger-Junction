import {
    requireSupabase
} from '../core/supabase.js';


export async function listNotifications(
    limit = 50
) {
    const supabase =
        await requireSupabase();


    const safeLimit =
        Math.min(
            500,
            Math.max(
                1,
                Math.floor(
                    Number(limit)
                    ||
                    50
                )
            )
        );


    const {
        data,
        error
    } =
        await supabase
            .from(
                'notifications'
            )
            .select('*')
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


export async function markRead(
    id
) {
    if (!id) {
        throw new Error(
            'Notification ID is required.'
        );
    }


    const supabase =
        await requireSupabase();


    const {
        error
    } =
        await supabase
            .from(
                'notifications'
            )
            .update({
                read_at:
                    new Date()
                        .toISOString()
            })
            .eq(
                'id',
                id
            );


    if (error) {
        throw error;
    }
}


export async function markAllRead() {
    const supabase =
        await requireSupabase();


    const {
        error
    } =
        await supabase.rpc(
            'mark_all_notifications_read'
        );


    if (error) {
        throw error;
    }
}


export async function subscribeNotifications(
    callback
) {
    if (
        typeof callback !==
        'function'
    ) {
        throw new TypeError(
            'Notification callback must be a function.'
        );
    }


    const supabase =
        await requireSupabase();


    const channel =
        supabase
            .channel(
                'my-notifications'
            )
            .on(
                'postgres_changes',
                {
                    event:
                        'INSERT',

                    schema:
                        'public',

                    table:
                        'notifications'
                },
                payload => {
                    callback(
                        payload.new
                    );
                }
            )
            .subscribe();


    return () =>
        supabase.removeChannel(
            channel
        );
}