import { createClient } from '@/lib/supabase/client'
import { createClient as createServerClient, createServiceClient } from '@/lib/supabase/server'
import { Database } from '@/types/database'

export async function signUp(email: string, password: string, fullName?: string) {
  const supabase = createClient()
  
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
      },
    },
  })

  if (error) {
    return { error: error.message }
  }

  return { data }
}

export async function signIn(email: string, password: string) {
  const supabase = createClient()
  
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    return { error: error.message }
  }

  return { data }
}

export async function signInWithGoogle() {
  const supabase = createClient()
  
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
    },
  })

  if (error) {
    return { error: error.message }
  }

  return { data }
}

export async function signOut() {
  const supabase = createClient()
  
  const { error } = await supabase.auth.signOut()

  if (error) {
    return { error: error.message }
  }

  return { success: true }
}

export async function resetPassword(email: string) {
  const supabase = createClient()
  
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/auth/reset-password`,
  })

  if (error) {
    return { error: error.message }
  }

  return { success: true }
}

export async function updatePassword(newPassword: string) {
  const supabase = createClient()
  
  const { error } = await supabase.auth.updateUser({
    password: newPassword,
  })

  if (error) {
    return { error: error.message }
  }

  return { success: true }
}

export async function getCurrentUser() {
  const supabase = await createServerClient()
  
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error) {
    return null
  }

  return user
}

export async function getUserProfile(userId: string) {
  const supabase = await createServerClient()
  
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()

  if (error) {
    return null
  }

  return data as Database['public']['Tables']['profiles']['Row'] | null
}

export async function isAdmin(userId: string): Promise<boolean> {
  try {
    const supabase = await createServiceClient()

    // 1. Check user_roles table
    const { data: userRole } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .maybeSingle()

    if (userRole && ['admin', 'superadmin'].includes(userRole.role)) {
      return true
    }

    // 2. Check profiles table
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .maybeSingle()

    if (profile && profile.role === 'admin') {
      return true
    }

    // 3. Fallback: check against ADMIN_EMAIL env variable if set
    if (process.env.ADMIN_EMAIL) {
      const { data: userData } = await supabase.auth.admin.getUserById(userId)
      if (userData?.user?.email === process.env.ADMIN_EMAIL) {
        return true
      }
    }

    return false
  } catch (err) {
    console.error('Error checking admin permissions:', err)
    return false
  }
}

