import {
    invokeAdminUsers
} from '../services/admin.js';

import {
    el,
    replaceChildren
} from '../core/dom.js';

import {
    formatDate,
    notify,
    setBusy
} from '../core/utils.js';


let rows = [];


const ROLES = [
    'CUSTOMER',
    'STAFF',
    'MANAGER',
    'ADMIN'
];


async function load() {
    const result =
        await invokeAdminUsers(
            'list'
        );


    rows =
        result.users || [];


    render();
}


function activeAdminCount() {
    return rows.filter(
        user =>
            user.role ===
            'ADMIN'
            &&
            user.active !==
            false
    ).length;
}


function render() {
    const search =
        document.getElementById(
            'users-search'
        );


    const tbody =
        document.getElementById(
            'users-tbody'
        );


    if (
        !search ||
        !tbody
    ) {
        return;
    }


    const query =
        search.value
            .trim()
            .toLowerCase();


    const filtered =
        rows.filter(
            user => {
                if (!query) {
                    return true;
                }


                const text =
                    [
                        user.full_name,
                        user.email,
                        user.role,
                        user.active === false
                            ? 'inactive'
                            : 'active'
                    ]
                        .filter(Boolean)
                        .join(' ')
                        .toLowerCase();


                return text.includes(
                    query
                );
            }
        );


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
                                colspan: '6',
                                className:
                                    'text-center muted py-4',
                                text:
                                    'No matching users found.'
                            }
                        )
                    ]
                )
            ]
        );

        return;
    }


    const admins =
        activeAdminCount();


    replaceChildren(
        tbody,
        filtered.map(
            user => {
                const isLastActiveAdmin =
                    user.role ===
                    'ADMIN'
                    &&
                    user.active !==
                    false
                    &&
                    admins <= 1;


                const row =
                    el(
                        'tr'
                    );


                row.append(
                    el(
                        'td',
                        {
                            text:
                                user.full_name
                                ||
                                '—'
                        }
                    ),

                    el(
                        'td',
                        {
                            text:
                                user.email
                                ||
                                '—'
                        }
                    ),

                    el(
                        'td',
                        {
                            text:
                                user.role
                                ||
                                'CUSTOMER'
                        }
                    ),

                    el(
                        'td',
                        {},
                        el(
                            'span',
                            {
                                className:
                                    `status-pill ${
                                        user.active === false
                                            ? 'cancelled'
                                            : 'confirmed'
                                    }`,

                                text:
                                    user.active === false
                                        ? 'Inactive'
                                        : 'Active'
                            }
                        )
                    ),

                    el(
                        'td',
                        {
                            text:
                                user.created_at
                                    ? formatDate(
                                        user.created_at
                                    )
                                    : '—'
                        }
                    )
                );


                const actions =
                    el(
                        'td',
                        {
                            className:
                                'cluster'
                        }
                    );


                if (!isLastActiveAdmin) {
                    const activeButton =
                        el(
                            'button',
                            {
                                className:
                                    'btn-nbj ghost sm',

                                type:
                                    'button',

                                text:
                                    user.active === false
                                        ? 'Activate'
                                        : 'Deactivate'
                            }
                        );


                    activeButton.onclick =
                        async () => {
                            if (
                                activeButton.disabled
                            ) {
                                return;
                            }


                            setBusy(
                                activeButton,
                                true,
                                user.active === false
                                    ? 'Activating…'
                                    : 'Deactivating…'
                            );


                            try {
                                await invokeAdminUsers(
                                    'set_active',
                                    {
                                        user_id:
                                            user.id,

                                        active:
                                            user.active ===
                                            false
                                    }
                                );


                                notify(
                                    user.active === false
                                        ? 'User activated.'
                                        : 'User deactivated.',
                                    'success'
                                );


                                await load();

                            } catch (error) {
                                console.error(
                                    'Update user status error:',
                                    error
                                );


                                notify(
                                    error?.message
                                    ||
                                    'Unable to update the user.',
                                    'danger'
                                );

                            } finally {
                                setBusy(
                                    activeButton,
                                    false
                                );
                            }
                        };


                    actions.append(
                        activeButton
                    );
                }


                const roleSelect =
                    el(
                        'select',
                        {
                            className:
                                'form-select form-select-sm',

                            'aria-label':
                                `Role for ${
                                    user.full_name
                                    ||
                                    user.email
                                    ||
                                    'user'
                                }`
                        }
                    );


                const currentRole =
                    user.role
                    ||
                    'CUSTOMER';


                const roles =
                    ROLES.includes(
                        currentRole
                    )
                        ? ROLES
                        : [
                            currentRole,
                            ...ROLES
                        ];


                roles.forEach(
                    role => {
                        const option =
                            el(
                                'option',
                                {
                                    value:
                                        role,

                                    text:
                                        role
                                }
                            );


                        option.selected =
                            role ===
                            currentRole;


                        roleSelect.append(
                            option
                        );
                    }
                );


                /*
                 * Never permit the last active
                 * administrator to be demoted.
                 */
                roleSelect.disabled =
                    isLastActiveAdmin;


                roleSelect.onchange =
                    async () => {
                        const newRole =
                            roleSelect.value;


                        roleSelect.disabled =
                            true;


                        try {
                            await invokeAdminUsers(
                                'set_role',
                                {
                                    user_id:
                                        user.id,

                                    role:
                                        newRole
                                }
                            );


                            notify(
                                'Role updated.',
                                'success'
                            );


                            await load();

                        } catch (error) {
                            console.error(
                                'Update role error:',
                                error
                            );


                            notify(
                                error?.message
                                ||
                                'Unable to update the role.',
                                'danger'
                            );


                            await load();
                        }
                    };


                actions.append(
                    roleSelect
                );


                row.append(
                    actions
                );


                return row;
            }
        )
    );
}


export async function init() {
    const search =
        document.getElementById(
            'users-search'
        );


    const inviteButton =
        document.getElementById(
            'invite-user'
        );


    const dialog =
        document.getElementById(
            'user-dialog'
        );


    const form =
        document.getElementById(
            'user-form'
        );


    if (
        !search ||
        !inviteButton ||
        !dialog ||
        !form
    ) {
        console.warn(
            'User management page elements were not found.'
        );

        return;
    }


    search.addEventListener(
        'input',
        render
    );


    inviteButton.onclick =
        () =>
            dialog.showModal();


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


            const formData =
                new FormData(
                    form
                );


            const email =
                String(
                    formData.get(
                        'email'
                    )
                    ||
                    ''
                )
                    .trim()
                    .toLowerCase();


            const fullName =
                String(
                    formData.get(
                        'full_name'
                    )
                    ||
                    ''
                ).trim();


            const role =
                String(
                    formData.get(
                        'role'
                    )
                    ||
                    'STAFF'
                );


            setBusy(
                button,
                true,
                'Inviting…'
            );


            try {
                await invokeAdminUsers(
                    'invite',
                    {
                        email,

                        full_name:
                            fullName,

                        role
                    }
                );


                dialog.close();


                form.reset();


                notify(
                    'Invitation requested.',
                    'success'
                );


                await load();

            } catch (error) {
                console.error(
                    'Invite user error:',
                    error
                );


                notify(
                    error?.message
                    ||
                    'Unable to invite the user.',
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


    await load();
}