import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
        const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

        const supabaseClient = createClient(supabaseUrl, serviceRoleKey, {
            auth: { autoRefreshToken: false, persistSession: false }
        })

        const body = await req.json();
        let { user_id, email } = body;

        console.log(`Deletion request for user_id: ${user_id}, email: ${email}`);

        // 0. Resolve User ID if only email is provided
        if (!user_id && email) {
            console.log(`Looking up user by email: ${email}`);
            const { data: { users }, error: listError } = await supabaseClient.auth.admin.listUsers();
            if (listError) throw listError;

            const user = users.find(u => u.email?.toLowerCase() === email.toLowerCase());
            if (user) {
                user_id = user.id;
                console.log(`Found user_id: ${user_id} for email: ${email}`);
            } else {
                console.log(`No auth user found for email: ${email}`);
            }
        }

        if (user_id) {
            // 1. Delete from user_roles
            await supabaseClient.from('user_roles').delete().eq('user_id', user_id);

            // 2. Unlink from employees
            await supabaseClient.from('employees').update({ user_id: null }).eq('user_id', user_id);

            // 3. Delete profile
            await supabaseClient.from('profiles').delete().eq('id', user_id);

            // 4. Delete auth user
            const { error: deleteAuthError } = await supabaseClient.auth.admin.deleteUser(user_id);
            if (deleteAuthError && (deleteAuthError as any).status !== 404) {
                throw deleteAuthError;
            }
        }

        return new Response(
            JSON.stringify({ message: 'User deletion processed', detected_id: user_id }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        )

    } catch (error) {
        console.error('Error in delete-user:', error);
        return new Response(
            JSON.stringify({ error: error.message }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        )
    }
})
