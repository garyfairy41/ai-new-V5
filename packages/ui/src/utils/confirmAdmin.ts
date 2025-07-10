import { supabase } from '../lib/supabase';

export async function confirmAdminUser() {
  try {
    // This is a workaround to confirm the admin user
    // In production, you would do this through Supabase dashboard or admin API
    
    const adminEmail = 'gamblerspassion@gmail.com';
    
    // Try to sign up the admin user again with a flag to auto-confirm
    const { data, error } = await supabase.auth.signUp({
      email: adminEmail,
      password: 'AdminPass123!',
      options: {
        emailRedirectTo: undefined,
        data: {
          client_name: 'Admin',
          company_name: 'AI Call Center',
          role: 'admin',
          auto_confirm: true
        }
      }
    });

    if (error && error.message.includes('already registered')) {
      console.log('Admin user already exists');
      return { success: true, message: 'Admin user already exists' };
    }

    if (error) {
      console.error('Error confirming admin:', error);
      return { success: false, error: error.message };
    }

    return { success: true, user: data.user };
  } catch (error) {
    console.error('Unexpected error:', error);
    return { success: false, error: 'Unexpected error occurred' };
  }
}

// Alternative approach: Use a service key to confirm the user
export async function confirmAdminWithServiceKey() {
  // This would require a service key and should be done server-side
  // For now, we'll use a client-side workaround
  
  try {
    // Create a temporary admin client with service key
    // Note: This is not secure for production - service keys should never be exposed to client
    // This is just for development/demo purposes
    
    console.log('Admin confirmation would require server-side implementation');
    return { success: false, error: 'Server-side confirmation required' };
  } catch {
    return { success: false, error: 'Service key confirmation failed' };
  }
}