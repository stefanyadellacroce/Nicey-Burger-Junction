/// <reference lib="deno.ns" />

import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

const PRIVILEGED_ROLES = [
  'STAFF',
  'MANAGER',
  'ADMIN'
];

const ALL_ROLES = [
  'CUSTOMER',
  'STAFF',
  'MANAGER',
  'ADMIN'
];

function json(body: unknown, status = 200) {
  return new Response(
    JSON.stringify(body),
    {
      status,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    }
  );
}

async function writeAudit(
  adminClient: any,
  payload: Record<string, unknown>
) {
  const { error } = await adminClient
    .from('activity_logs')
    .insert(payload);

  if (error) {
    /*
     * Do not undo a successful user-management
     * action just because audit logging failed.
     */
    console.error(
      'Activity log write failed:',
      error
    );
  }
}

async function getTargetProfile(
  adminClient: any,
  userId: string
) {
  const { data, error } = await adminClient
    .from('profiles')
    .select('id,role,active')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

async function countActiveAdmins(
  adminClient: any
) {
  const {
    count,
    error
  } = await adminClient
    .from('profiles')
    .select(
      'id',
      {
        count: 'exact',
        head: true
      }
    )
    .eq('role', 'ADMIN')
    .eq('active', true);

  if (error) {
    throw error;
  }

  return count || 0;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(
      'ok',
      {
        headers: corsHeaders
      }
    );
  }

  if (req.method !== 'POST') {
    return json(
      {
        error: 'Method not allowed.'
      },
      405
    );
  }

  try {
    const url =
      Deno.env.get('SUPABASE_URL') || '';

    const anon =
      Deno.env.get('SUPABASE_ANON_KEY') || '';

    const service =
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

    const siteUrl =
      String(
        Deno.env.get('SITE_URL') || ''
      ).replace(/\/+$/, '');

    if (
      !url ||
      !anon ||
      !service
    ) {
      throw new Error(
        'Edge Function secrets are incomplete.'
      );
    }

    /*
     * =====================================================
     * 1. AUTHENTICATE THE CALLER
     * =====================================================
     */

    const bearer =
      req.headers.get('Authorization') || '';

    if (
      !/^Bearer\s+\S+/i.test(bearer)
    ) {
      return json(
        {
          error: 'Unauthorized.'
        },
        401
      );
    }

    /*
     * User-scoped client:
     *
     * - carries the logged-in user's JWT
     * - respects RLS
     * - lets protect_profile_trusted_fields()
     *   see the actual ADMIN caller
     */
    const userClient =
      createClient(
        url,
        anon,
        {
          global: {
            headers: {
              Authorization: bearer
            }
          },
          auth: {
            persistSession: false,
            autoRefreshToken: false,
            detectSessionInUrl: false
          }
        }
      );

    const token =
      bearer.replace(
        /^Bearer\s+/i,
        ''
      );

    const {
      data: authData,
      error: authError
    } =
      await userClient.auth.getUser(
        token
      );

    if (
      authError ||
      !authData.user
    ) {
      console.error(
        'Admin user authentication failed:',
        authError
      );

      return json(
        {
          error: 'Unauthorized.'
        },
        401
      );
    }

    /*
     * IMPORTANT:
     * Verify the ADMIN using userClient,
     * NOT service_role.
     */
    const {
      data: callerProfile,
      error: callerProfileError
    } =
      await userClient
        .from('profiles')
        .select('role,active')
        .eq(
          'id',
          authData.user.id
        )
        .single();

    if (callerProfileError) {
      console.error(
        'Admin profile lookup failed:',
        callerProfileError
      );

      return json(
        {
          error:
            'Unable to verify administrator profile.',
          details:
            callerProfileError.message
        },
        500
      );
    }

    if (
      callerProfile?.role !== 'ADMIN' ||
      callerProfile?.active !== true
    ) {
      return json(
        {
          error:
            'Administrator authorization required.',
          role:
            callerProfile?.role ?? null,
          active:
            callerProfile?.active ?? null
        },
        403
      );
    }

    /*
     * =====================================================
     * 2. CREATE SERVICE-ROLE CLIENT
     * =====================================================
     *
     * Only reached AFTER the caller has been
     * verified as an active ADMIN.
     */

    const adminClient =
      createClient(
        url,
        service,
        {
          auth: {
            persistSession: false,
            autoRefreshToken: false,
            detectSessionInUrl: false
          }
        }
      );

    const body =
      await req.json();

    const action =
      String(
        body?.action || ''
      )
        .trim()
        .toLowerCase();

    /*
     * =====================================================
     * LIST USERS
     * =====================================================
     */

    if (action === 'list') {
      const page =
        Math.max(
          1,
          Math.floor(
            Number(body.page) || 1
          )
        );

      const perPage =
        Math.min(
          200,
          Math.max(
            1,
            Math.floor(
              Number(body.perPage) || 100
            )
          )
        );

      const {
        data,
        error
      } =
        await adminClient.auth.admin
          .listUsers({
            page,
            perPage
          });

      if (error) {
        throw error;
      }

      const ids =
        data.users.map(
          (user: { id: string }) => user.id
        );

      let profiles: any[] = [];

      if (ids.length) {
        const {
          data: profileRows,
          error: profileError
        } =
          await adminClient
            .from('profiles')
            .select(
              `
              id,
              full_name,
              phone,
              role,
              active,
              created_at
              `
            )
            .in(
              'id',
              ids
            );

        if (profileError) {
          throw profileError;
        }

        profiles =
          profileRows || [];
      }

      const profileMap =
        new Map(
          profiles.map(
            profile => [
              profile.id,
              profile
            ]
          )
        );

      return json({
        users:
          data.users.map(
            (user: {
              id: string;
              email?: string | null;
              email_confirmed_at?: string | null;
              invited_at?: string | null;
              last_sign_in_at?: string | null;
            }) => ({
              id:
                user.id,

              email:
                user.email || '',

              email_confirmed_at:
                user.email_confirmed_at,

              invited_at:
                user.invited_at,

              last_sign_in_at:
                user.last_sign_in_at,

              ...(
                profileMap.get(user.id)
                ||
                {}
              )
            })
          )
      });
    }

    /*
     * =====================================================
     * INVITE STAFF / MANAGER / ADMIN
     * =====================================================
     */

    if (action === 'invite') {
      const email =
        String(
          body.email || ''
        )
          .trim()
          .toLowerCase();

      const role =
        String(
          body.role || 'STAFF'
        )
          .trim()
          .toUpperCase();

      const fullName =
        String(
          body.full_name || ''
        ).trim();

      if (
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
          email
        )
      ) {
        return json(
          {
            error:
              'A valid email is required.'
          },
          400
        );
      }

      if (
        !PRIVILEGED_ROLES.includes(
          role
        )
      ) {
        return json(
          {
            error:
              'Invalid privileged role.'
          },
          400
        );
      }

      /*
       * Supabase Auth Admin operation requires
       * the service-role client.
       */
      const {
        data,
        error
      } =
        await adminClient.auth.admin
          .inviteUserByEmail(
            email,
            {
              data: {
                full_name: fullName
              },

              redirectTo:
                siteUrl
                  ? `${siteUrl}/reset-password.html?invite=1`
                  : undefined
            }
          );

      if (error) {
        throw error;
      }

      if (!data?.user?.id) {
        throw new Error(
          'Supabase did not return the invited user.'
        );
      }

      /*
       * handle_new_user() should already have
       * created the profile as CUSTOMER.
       *
       * Update trusted fields using the ADMIN's
       * authenticated userClient so your
       * protect_profile_trusted_fields() trigger
       * can see auth.uid() = the actual ADMIN.
       */
      const {
        data: updatedProfile,
        error: profileUpdateError
      } =
        await userClient
          .from('profiles')
          .update({
            full_name:
              fullName,

            role,

            active:
              true
          })
          .eq(
            'id',
            data.user.id
          )
          .select(
            'id,full_name,role,active'
          )
          .maybeSingle();

      if (
        profileUpdateError ||
        !updatedProfile
      ) {
        console.error(
          'Invited profile role assignment failed:',
          profileUpdateError
        );

        /*
         * Avoid leaving a half-created Auth
         * account if role assignment fails.
         */
        try {
          await adminClient.auth.admin
            .deleteUser(
              data.user.id
            );
        } catch (cleanupError) {
          console.error(
            'Invite cleanup failed:',
            cleanupError
          );
        }

        return json(
          {
            error:
              'The Auth invite was created, but the staff profile could not be assigned.',

            details:
              profileUpdateError?.message
              ||
              'Profile update was blocked by database permissions or RLS.'
          },
          500
        );
      }

      await writeAudit(
        adminClient,
        {
          actor_id:
            authData.user.id,

          action:
            'INVITE',

          module:
            'USERS',

          record_type:
            'profile',

          record_id:
            data.user.id,

          description:
            `Invited ${role} user`,

          metadata: {
            email
          }
        }
      );

      return json(
        {
          user: {
            id:
              data.user.id,

            email,

            full_name:
              fullName,

            role,

            active:
              true
          }
        },
        201
      );
    }

    /*
     * =====================================================
     * CHANGE ROLE
     * =====================================================
     */

    if (action === 'set_role') {
      const userId =
        String(
          body.user_id || ''
        ).trim();

      const role =
        String(
          body.role || ''
        )
          .trim()
          .toUpperCase();

      if (!userId) {
        return json(
          {
            error:
              'User ID is required.'
          },
          400
        );
      }

      if (
        !ALL_ROLES.includes(
          role
        )
      ) {
        return json(
          {
            error:
              'Invalid role.'
          },
          400
        );
      }

      if (
        userId === authData.user.id &&
        role !== 'ADMIN'
      ) {
        return json(
          {
            error:
              'You cannot demote your own administrator account.'
          },
          400
        );
      }

      const target =
        await getTargetProfile(
          adminClient,
          userId
        );

      if (!target) {
        return json(
          {
            error:
              'User profile was not found.'
          },
          404
        );
      }

      /*
       * Backend protection against removing
       * the final active ADMIN.
       */
      if (
        target.role === 'ADMIN' &&
        target.active === true &&
        role !== 'ADMIN'
      ) {
        const adminCount =
          await countActiveAdmins(
            adminClient
          );

        if (adminCount <= 1) {
          return json(
            {
              error:
                'The last active administrator cannot be demoted.'
            },
            400
          );
        }
      }

      const {
        data: updated,
        error
      } =
        await userClient
          .from('profiles')
          .update({
            role
          })
          .eq(
            'id',
            userId
          )
          .select(
            'id,role,active'
          )
          .maybeSingle();

      if (error) {
        throw error;
      }

      if (!updated) {
        return json(
          {
            error:
              'Role update was blocked by database permissions or RLS.'
          },
          403
        );
      }

      await writeAudit(
        adminClient,
        {
          actor_id:
            authData.user.id,

          action:
            'ROLE_CHANGE',

          module:
            'USERS',

          record_type:
            'profile',

          record_id:
            userId,

          description:
            `Changed user role to ${role}`,

          metadata: {
            role
          }
        }
      );

      return json({
        user_id:
          userId,

        role
      });
    }

    /*
     * =====================================================
     * ACTIVATE / DEACTIVATE
     * =====================================================
     */

    if (action === 'set_active') {
      const userId =
        String(
          body.user_id || ''
        ).trim();

      if (!userId) {
        return json(
          {
            error:
              'User ID is required.'
          },
          400
        );
      }

      if (
        typeof body.active !==
        'boolean'
      ) {
        return json(
          {
            error:
              'Active must be true or false.'
          },
          400
        );
      }

      const active =
        body.active;

      if (
        userId === authData.user.id &&
        !active
      ) {
        return json(
          {
            error:
              'You cannot deactivate your own administrator account.'
          },
          400
        );
      }

      const target =
        await getTargetProfile(
          adminClient,
          userId
        );

      if (!target) {
        return json(
          {
            error:
              'User profile was not found.'
          },
          404
        );
      }

      if (
        target.role === 'ADMIN' &&
        target.active === true &&
        !active
      ) {
        const adminCount =
          await countActiveAdmins(
            adminClient
          );

        if (adminCount <= 1) {
          return json(
            {
              error:
                'The last active administrator cannot be deactivated.'
            },
            400
          );
        }
      }

      const {
        data: updated,
        error
      } =
        await userClient
          .from('profiles')
          .update({
            active
          })
          .eq(
            'id',
            userId
          )
          .select(
            'id,role,active'
          )
          .maybeSingle();

      if (error) {
        throw error;
      }

      if (!updated) {
        return json(
          {
            error:
              'Account status update was blocked by database permissions or RLS.'
          },
          403
        );
      }

      await writeAudit(
        adminClient,
        {
          actor_id:
            authData.user.id,

          action:
            active
              ? 'ACTIVATE'
              : 'DEACTIVATE',

          module:
            'USERS',

          record_type:
            'profile',

          record_id:
            userId,

          description:
            `${
              active
                ? 'Activated'
                : 'Deactivated'
            } user account`
        }
      );

      return json({
        user_id:
          userId,

        active
      });
    }

    /*
     * =====================================================
     * GENERATE REPLACEMENT INVITE LINK
     * =====================================================
     */

    if (
      action ===
      'generate_invite_link'
    ) {
      const email =
        String(
          body.email || ''
        )
          .trim()
          .toLowerCase();

      if (
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
          email
        )
      ) {
        return json(
          {
            error:
              'A valid email is required.'
          },
          400
        );
      }

      const {
        data,
        error
      } =
        await adminClient.auth.admin
          .generateLink({
            type:
              'invite',

            email,

            options: {
              redirectTo:
                siteUrl
                  ? `${siteUrl}/reset-password.html?invite=1`
                  : undefined
            }
          });

      if (error) {
        throw error;
      }

      await writeAudit(
        adminClient,
        {
          actor_id:
            authData.user.id,

          action:
            'INVITE_LINK',

          module:
            'USERS',

          record_type:
            'auth_user',

          record_id:
            email,

          description:
            'Generated a replacement invite link'
        }
      );

      return json({
        action_link:
          data.properties
            ?.action_link
          ||
          null
      });
    }

    return json(
      {
        error: 'Unknown action.'
      },
      400
    );

  } catch (error) {
    console.error(
      'admin-users function error:',
      error
    );

    return json(
      {
        error:
          error instanceof Error
            ? error.message
            : String(error)
      },
      400
    );
  }
});