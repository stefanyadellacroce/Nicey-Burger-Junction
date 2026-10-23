import {
    requireAuth
} from '../core/guards.js';

import {
    listNotifications,
    markRead,
    markAllRead,
    subscribeNotifications
} from '../services/notifications.js';

import {
    el,
    replaceChildren
} from '../core/dom.js';

import {
    formatDate,
    notify,
    setBusy
} from '../core/utils.js';


let renderRunning =
    false;


let renderQueued =
    false;


function createNotificationCard(
    notification
) {
    const card =
        el(
            'article',
            {
                className:
                    `panel ${
                        notification.read_at
                            ? ''
                            : 'border-warning'
                    }`
            },
            [
                el(
                    'div',
                    {
                        className:
                            'd-flex justify-content-between gap-2'
                    },
                    [
                        el(
                            'strong',
                            {
                                text:
                                    notification.title
                                    ||
                                    'Notification'
                            }
                        ),

                        el(
                            'small',
                            {
                                className:
                                    'muted',

                                text:
                                    formatDate(
                                        notification.created_at
                                    )
                            }
                        )
                    ]
                ),

                el(
                    'p',
                    {
                        text:
                            notification.body
                            ||
                            ''
                    }
                )
            ]
        );


    if (
        notification.url
    ) {
        card.append(
            el(
                'a',
                {
                    href:
                        notification.url,

                    className:
                        'btn-nbj ghost sm',

                    text:
                        'Open'
                }
            )
        );
    }


    if (
        !notification.read_at
    ) {
        const button =
            el(
                'button',
                {
                    className:
                        'btn btn-link sm',

                    type:
                        'button',

                    text:
                        'Mark read'
                }
            );


        button.addEventListener(
            'click',
            async () => {
                if (
                    button.disabled
                ) {
                    return;
                }


                button.disabled =
                    true;


                try {
                    await markRead(
                        notification.id
                    );


                    await requestRender();

                } catch (error) {
                    console.error(
                        'Mark notification read error:',
                        error
                    );


                    notify(
                        error?.message
                        ||
                        'Unable to update the notification.',
                        'danger'
                    );

                } finally {
                    button.disabled =
                        false;
                }
            }
        );


        card.append(
            button
        );
    }


    return card;
}


async function performRender() {
    const container =
        document.getElementById(
            'notification-list'
        );


    if (!container) {
        return;
    }


    const notifications =
        await listNotifications();


    if (
        !notifications?.length
    ) {
        replaceChildren(
            container,
            [
                el(
                    'div',
                    {
                        className:
                            'empty-state panel',

                        text:
                            'No notifications yet.'
                    }
                )
            ]
        );

        return;
    }


    replaceChildren(
        container,
        notifications.map(
            createNotificationCard
        )
    );
}


async function requestRender() {
    if (renderRunning) {
        renderQueued =
            true;

        return;
    }


    renderRunning =
        true;


    try {
        do {
            renderQueued =
                false;


            await performRender();

        } while (
            renderQueued
        );

    } catch (error) {
        console.error(
            'Notification render error:',
            error
        );


        notify(
            'Notifications could not be refreshed.',
            'danger'
        );

    } finally {
        renderRunning =
            false;
    }
}


export async function init() {
    const context =
        await requireAuth({
            roles: [
                'CUSTOMER'
            ]
        });


    if (!context) {
        return;
    }


    const markAllButton =
        document.getElementById(
            'mark-all-read'
        );


    const list =
        document.getElementById(
            'notification-list'
        );


    if (
        !markAllButton ||
        !list
    ) {
        console.warn(
            'Notification page elements were not found.'
        );

        return;
    }


    markAllButton.addEventListener(
        'click',
        async () => {
            if (
                markAllButton.disabled
            ) {
                return;
            }


            setBusy(
                markAllButton,
                true,
                'Updating…'
            );


            try {
                await markAllRead();


                notify(
                    'Notifications marked as read.',
                    'success'
                );


                await requestRender();

            } catch (error) {
                console.error(
                    'Mark all notifications read error:',
                    error
                );


                notify(
                    error?.message
                    ||
                    'Unable to mark notifications as read.',
                    'danger'
                );

            } finally {
                setBusy(
                    markAllButton,
                    false
                );
            }
        }
    );


    await requestRender();


    await subscribeNotifications(
        () => {
            requestRender();
        }
    );
}