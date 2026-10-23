import {
    getSupabase
} from '../core/supabase.js';

import {
    getPublicSettings
} from '../services/settings.js';

import {
    isConfigured
} from '../core/config.js';

import {
    notify,
    setBusy
} from '../core/utils.js';

function renderSettings(
    settings
) {
    document
        .querySelectorAll(
            '[data-setting]'
        )
        .forEach(
            node => {
                const key =
                    node.dataset.setting;


                const value =
                    settings?.[key];


                node.textContent =
                    value
                    ||
                    'Not yet configured';
            }
        );

    const address =
        String(settings?.business_address || '').trim()
        || 'Not yet configured';

    [
        'contact-address',
        'contact-map-address'
    ].forEach(id => {
        const node = document.getElementById(id);

        if (node) {
            node.textContent = address;
        }
    });
}


function renderMap(
    settings
) {
    const iframe =
        document.querySelector(
            '#map-area iframe'
        );
    const note = document.getElementById('contact-map-note');
    const link = document.getElementById('contact-map-link');
    if (!iframe) return;
    const safeUrl = value => {
        try {
            const url = new URL(String(value || ''));
            return url.protocol === 'https:' ? url.href : '';
        } catch {
            return '';
        }
    };
    const embed = safeUrl(settings?.map_embed_url);
    const largerMap = safeUrl(settings?.map_link_url);
    iframe.hidden = !embed;
    if (embed) iframe.src = embed;
    else iframe.removeAttribute('src');
    if (note) note.textContent = embed ? 'Map location from store settings.' :
        'Map location has not been configured.';
    if (link) {
        link.hidden = !largerMap;
        if (largerMap) link.href = largerMap;
    }
}


function getContactPayload(
    form
) {
    const formData =
        new FormData(
            form
        );


    return {
        name:
            String(
                formData.get(
                    'name'
                )
                ||
                ''
            ).trim(),

        email:
            String(
                formData.get(
                    'email'
                )
                ||
                ''
            )
                .trim()
                .toLowerCase(),

        phone:
            String(
                formData.get(
                    'phone'
                )
                ||
                ''
            ).trim()
            ||
            null,

        subject:
            String(
                formData.get(
                    'subject'
                )
                ||
                ''
            ).trim(),

        message:
            String(
                formData.get(
                    'message'
                )
                ||
                ''
            ).trim()
    };
}


function validateContactPayload(
    payload
) {
    if (!payload.name) {
        return 'Enter your name.';
    }


    if (
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/
            .test(
                payload.email
            )
    ) {
        return 'Enter a valid email address.';
    }


    if (!payload.subject) {
        return 'Enter a subject.';
    }


    if (
        payload.message.length <
        5
    ) {
        return 'Enter a message with at least 5 characters.';
    }


    return null;
}


export async function init() {
    if (!isConfigured) {
        return;
    }


    const form =
        document.getElementById(
            'contact-form'
        );


    if (!form) {
        console.warn(
            'Contact form was not found.'
        );

        return;
    }


    const settings =
        await getPublicSettings();


    renderSettings(
        settings || {}
    );


    renderMap(
        settings || {}
    );


    form.addEventListener(
        'submit',
        async event => {
            event.preventDefault();


            const button =
                form.querySelector(
                    'button[type="submit"]'
                );


            if (
                button?.disabled
            ) {
                return;
            }


            const payload =
                getContactPayload(
                    form
                );


            const validationError =
                validateContactPayload(
                    payload
                );


            if (validationError) {
                notify(
                    validationError,
                    'danger'
                );

                return;
            }


            setBusy(
                button,
                true,
                'Sending…'
            );


            try {
                const supabase =
                    await getSupabase();


                const {
                    error
                } =
                    await supabase
                        .from(
                            'contact_messages'
                        )
                        .insert(
                            payload
                        );


                if (error) {
                    throw error;
                }


                form.reset();


                notify(
                    'Thanks — your message has been received.',
                    'success'
                );

            } catch (error) {
                console.error(
                    'Contact form error:',
                    error
                );


                notify(
                    error?.message
                    ||
                    'Your message could not be sent. Please try again.',
                    'danger'
                );

            } finally {
                setBusy(
                    button,
                    false
                );
            }
        }
    );
}
