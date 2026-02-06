import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    // Check for OPTIONS request for CORS
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
        const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

        if (!supabaseUrl || !serviceRoleKey) {
            console.error('Missing Environment Variables:', {
                url: !!supabaseUrl,
                key: !!serviceRoleKey
            });
            throw new Error('Server configuration error: Missing Environment Variables');
        }

        const supabaseClient = createClient(
            supabaseUrl,
            serviceRoleKey,
            {
                auth: {
                    autoRefreshToken: false,
                    persistSession: false
                }
            }
        )

        let body;
        try {
            body = await req.json();
        } catch (e) {
            console.error('Failed to parse JSON body:', e);
            throw new Error('Invalid JSON body');
        }

        const { user_id } = body;

        console.log(`Received request to delete user_id: ${user_id}`);

        if (!user_id) {
            console.error('User ID missing in payload', body);
            return new Response(
                JSON.stringify({ error: 'User ID is required', received: body }),
                {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                    status: 400
                }
            )
        }

        // -1. Delete from user_roles (Explicit cleanup)
        console.log('Step -1: Deleting from user_roles...');
        const { error: deleteRolesError } = await supabaseClient
            .from('user_roles')
            .delete()
            .eq('user_id', user_id);

        if (deleteRolesError) {
            console.error('User roles deletion error:', JSON.stringify(deleteRolesError));
            throw deleteRolesError;
        }

        // 0. Update employees table - Unlink user_id to allow profile deletion
        // We cannot blindly delete employees because of FK to sales_orders, payroll etc.
        // So we set user_id to NULL. This preserves sales history but frees the Profile to be deleted.
        console.log('Step 0: Unlinking employee record...');
        const { error: unlinkError } = await supabaseClient
            .from('employees')
            .update({ user_id: null, is_active: false }) // Also mark inactive
            .eq('user_id', user_id);

        if (unlinkError) {
            console.error('Error unlinking employee:', JSON.stringify(unlinkError));
            throw unlinkError;
        }

        // 1. Delete from public.profiles
        // Now that employee is unlinked, this should succeed (unless other blocking constraints exist)
        console.log('Step 1: Deleting from profiles...');
        const { error: deleteProfileError } = await supabaseClient
            .from('profiles')
            .delete()
            .eq('id', user_id)

        if (deleteProfileError && deleteProfileError.code !== 'PGRST116') {
            console.error('Profile deletion error:', JSON.stringify(deleteProfileError));
            throw deleteProfileError;
        }

        // 2. Delete from auth.users
        console.log('Step 2: Deleting from auth.users...');
        const { error: deleteAuthError } = await supabaseClient.auth.admin.deleteUser(user_id)

        if (deleteAuthError) {
            // Check if user not found - treat as success for idempotency
            const isNotFound = (deleteAuthError as any).status === 404 ||
                deleteAuthError.message.includes('not found');

            if (isNotFound) {
                console.log('Auth user not found (already deleted?), proceeding.');
            } else {
                console.error('Error deleting auth user:', JSON.stringify(deleteAuthError));
                throw deleteAuthError;
            }
        }

        console.log('Deletion successful');
        return new Response(
            JSON.stringify({ message: 'User deleted successfully' }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200
            }
        )

    } catch (error) {
        console.error('Unexpected error in delete-user:', error);
        return new Response(
            JSON.stringify({ error: error.message, stack: error.stack }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 500 // Return 500 for unexpected errors
            }
        )
    }
})
