import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

// Read .env file manually
const envPath = '../.env';
const envContent = fs.readFileSync(envPath, 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2) {
    const key = parts[0].trim();
    let val = parts.slice(1).join('=').trim();
    if (val.startsWith('"') && val.endsWith('"')) {
      val = val.substring(1, val.length - 1);
    }
    env[key] = val;
  }
});

const supabaseUrl = env['VITE_SUPABASE_URL'];
const serviceRoleKey = env['SUPABASE_SERVICE_ROLE_KEY'];
const anonKey = env['VITE_SUPABASE_PUBLISHABLE_KEY'];

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const supabaseAnon = createClient(supabaseUrl, anonKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function run() {
  const testEmail = 'test_clerk_user@example.com';
  const oldPassword = 'initialPassword123';
  const newPassword = 'newPassword123';
  let createdUserId = null;

  try {
    console.log(`[1] Cleaning up any existing user for ${testEmail}...`);
    const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    if (listError) throw listError;
    
    const existing = users.find(u => u.email === testEmail);
    if (existing) {
      console.log(`Found existing user with ID: ${existing.id}. Deleting...`);
      // Delete user roles first to avoid foreign key issues if any
      await supabaseAdmin.from('user_roles').delete().eq('user_id', existing.id);
      const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(existing.id);
      if (deleteError) throw deleteError;
      console.log('Existing user deleted.');
    }

    console.log(`[2] Creating test user ${testEmail}...`);
    const { data: { user }, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: testEmail,
      password: oldPassword,
      email_confirm: true,
      user_metadata: { full_name: 'Test Clerk User' }
    });
    if (createError) throw createError;
    
    createdUserId = user.id;
    console.log(`Test user created successfully. ID: ${createdUserId}`);

    console.log(`[3] Skipping manual role assignment (handled automatically by database trigger)...`);


    console.log(`[4] Verifying login with initial password: ${oldPassword}...`);
    const { data: loginData1, error: loginError1 } = await supabaseAnon.auth.signInWithPassword({
      email: testEmail,
      password: oldPassword
    });
    if (loginError1) {
      throw new Error(`Login with initial password failed: ${loginError1.message}`);
    }
    console.log(`Login successful! User ID returned: ${loginData1.user.id}`);

    console.log(`[5] Invoking Edge Function 'update-user-auth' to update password...`);
    // Invoke the function
    const { data: functionData, error: functionError } = await supabaseAdmin.functions.invoke('update-user-auth', {
      body: { user_id: createdUserId, password: newPassword }
    });
    if (functionError) {
      throw new Error(`Edge function invocation failed: ${functionError.message}`);
    }
    console.log('Edge function response:', functionData);

    console.log(`[6] Verifying login with old password: ${oldPassword} (should fail)...`);
    const { data: loginData2, error: loginError2 } = await supabaseAnon.auth.signInWithPassword({
      email: testEmail,
      password: oldPassword
    });
    if (loginError2) {
      console.log(`Login with old password failed as expected: ${loginError2.message}`);
    } else {
      throw new Error('Login with old password succeeded but should have failed!');
    }

    console.log(`[7] Verifying login with new password: ${newPassword} (should succeed)...`);
    const { data: loginData3, error: loginError3 } = await supabaseAnon.auth.signInWithPassword({
      email: testEmail,
      password: newPassword
    });
    if (loginError3) {
      throw new Error(`Login with new password failed: ${loginError3.message}`);
    }
    console.log(`Login with new password successful! Session access token present: ${!!loginData3.session?.access_token}`);

    console.log('SUCCESS: All authentication flow checks passed successfully!');
  } catch (err) {
    console.error('ERROR during testing:', err.message);
  } finally {
    if (createdUserId) {
      console.log(`[8] Cleaning up test user ${createdUserId}...`);
      await supabaseAdmin.from('user_roles').delete().eq('user_id', createdUserId);
      await supabaseAdmin.auth.admin.deleteUser(createdUserId);
      console.log('Cleanup complete.');
    }
  }
}

run();
