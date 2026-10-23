import {
    requireAuth
} from '../core/guards.js';

import {
    updateProfile
} from '../services/profile.js';

import {
    requireSupabase
} from '../core/supabase.js';

import {
    notify,
    setBusy
} from '../core/utils.js';


const MAX_AVATAR_SIZE =
    3 * 1024 * 1024;


const AVATAR_EXTENSIONS = {
    'image/jpeg':
        'jpg',

    'image/png':
        'png',

    'image/webp':
        'webp'
};


function control(
    form,
    name
) {
    return form.elements.namedItem(
        name
    );
}


async function setAvatarImage(
    supabase,
    avatar,
    path
) {
    if (
        !avatar ||
        !path
    ) {
        return;
    }


    const {
        data,
        error
    } =
        await supabase
            .storage
            .from(
                'profile-images'
            )
            .createSignedUrl(
                path,
                3600
            );


    if (error) {
        console.error(
            'Avatar signed URL error:',
            error
        );

        return;
    }


    if (
        data?.signedUrl
    ) {
        avatar.src =
            data.signedUrl;
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


    const user =
        context.user
        ||
        null;


    const profile =
        context.profile
        ||
        context;


    const form =
        document.getElementById(
            'profile-form'
        );


    if (!form) {
        console.warn(
            'Profile form was not found.'
        );

        return;
    }


    const fullName =
        control(
            form,
            'full_name'
        );


    const email =
        control(
            form,
            'email'
        );


    const phone =
        control(
            form,
            'phone'
        );


    const notifyOrder =
        control(
            form,
            'notify_order'
        );


    const notifyPromotions =
        control(
            form,
            'notify_promotions'
        );


    if (fullName) {
        fullName.value =
            profile.full_name
            ||
            '';
    }


    if (email) {
        email.value =
            user?.email
            ||
            profile.email
            ||
            '';
    }


    if (phone) {
        phone.value =
            profile.phone
            ||
            '';
    }


    if (notifyOrder) {
        notifyOrder.checked =
            profile
                .notification_preferences
                ?.order !==
            false;
    }


    if (notifyPromotions) {
        notifyPromotions.checked =
            profile
                .notification_preferences
                ?.promotions !==
            false;
    }


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


            setBusy(
                button,
                true,
                'Saving…'
            );


            try {
                const preferences = {
                    ...(
                        profile.notification_preferences
                        ||
                        {}
                    ),

                    order:
                        Boolean(
                            notifyOrder
                                ?.checked
                        ),

                    promotions:
                        Boolean(
                            notifyPromotions
                                ?.checked
                        )
                };


                const name =
                    String(
                        fullName?.value
                        ||
                        ''
                    ).trim();


                const phoneValue =
                    String(
                        phone?.value
                        ||
                        ''
                    ).trim();


                await updateProfile({
                    full_name:
                        name,

                    phone:
                        phoneValue,

                    notification_preferences:
                        preferences
                });


                /*
                 * Keep local state aligned so
                 * future saves preserve preferences.
                 */
                profile.full_name =
                    name;


                profile.phone =
                    phoneValue;


                profile.notification_preferences =
                    preferences;


                notify(
                    'Profile saved.',
                    'success'
                );

            } catch (error) {
                console.error(
                    'Profile save error:',
                    error
                );


                notify(
                    error?.message
                    ||
                    'Unable to save your profile.',
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


    const supabase =
        await requireSupabase();


    const avatar =
        document.getElementById(
            'profile-avatar'
        );


    if (
        profile.avatar_path
    ) {
        await setAvatarImage(
            supabase,
            avatar,
            profile.avatar_path
        );
    }


    const avatarInput =
        document.getElementById(
            'avatar-input'
        );


    avatarInput?.addEventListener(
        'change',
        async event => {
            const input =
                event.currentTarget;


            const file =
                input.files?.[0];


            if (!file) {
                return;
            }


            if (
                input.disabled
            ) {
                return;
            }


            const extension =
                AVATAR_EXTENSIONS[
                    file.type
                ];


            if (
                !extension
                ||
                file.size >
                MAX_AVATAR_SIZE
            ) {
                notify(
                    'Use JPG, PNG or WEBP up to 3 MB.',
                    'danger'
                );


                input.value =
                    '';


                return;
            }


            const profileId =
                profile.id
                ||
                user?.id;


            if (!profileId) {
                notify(
                    'Your profile could not be identified.',
                    'danger'
                );

                return;
            }


            const path =
                `${profileId}/${crypto.randomUUID()}.${extension}`;


            input.disabled =
                true;


            try {
                const {
                    error: uploadError
                } =
                    await supabase
                        .storage
                        .from(
                            'profile-images'
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
                    error: updateError
                } =
                    await supabase
                        .from(
                            'profiles'
                        )
                        .update({
                            avatar_path:
                                path
                        })
                        .eq(
                            'id',
                            profileId
                        );


                if (updateError) {
                    /*
                     * DB update failed after the file
                     * uploaded. Best-effort cleanup
                     * prevents unnecessary orphan files.
                     */
                    await supabase
                        .storage
                        .from(
                            'profile-images'
                        )
                        .remove([
                            path
                        ])
                        .catch(
                            () => {}
                        );


                    throw updateError;
                }


                profile.avatar_path =
                    path;


                await setAvatarImage(
                    supabase,
                    avatar,
                    path
                );


                notify(
                    'Profile photo updated.',
                    'success'
                );

            } catch (error) {
                console.error(
                    'Avatar update error:',
                    error
                );


                notify(
                    error?.message
                    ||
                    'Unable to update your profile photo.',
                    'danger'
                );

            } finally {
                input.disabled =
                    false;


                input.value =
                    '';
            }
        }
    );
}