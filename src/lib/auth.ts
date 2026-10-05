import { createClient } from '@/lib/supabase/client'
import { createClient as createServerClient, createServiceClient, isSupabaseConfigured } from '@/lib/supabase/server'
import { Database } from '@/types/database'
import { cookies } from 'next/headers'

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
  try {
    const cookieStore = await cookies()
    const rawAuth = cookieStore.get('bb_auth_user')?.value
    if (rawAuth) {
      return JSON.parse(rawAuth)
    }
  } catch {
    // ignore
  }

  if (!isSupabaseConfigured()) {
    return null
  }

  try {
    const supabase = await createServerClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error) {
      return null
    }
    return user
  } catch {
    return null
  }
}

export async function getUserProfile(userId: string) {
  try {
    const cookieStore = await cookies()
    const rawAuth = cookieStore.get('bb_auth_user')?.value
    if (rawAuth) {
      const u = JSON.parse(rawAuth)
      if (u.id === userId) {
        return {
          id: u.id,
          email: u.email,
          full_name: u.user_metadata?.full_name || 'Bubble Boom Member',
          phone: null,
          role: 'customer',
          created_at: u.created_at,
          updated_at: u.created_at,
        } as any
      }
    }
  } catch {
    // ignore
  }

  if (!isSupabaseConfigured()) {
    return null
  }

  try {
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
  } catch {
    return null
  }
}

export async function isAdmin(userId: string): Promise<boolean> {
  const allowedAdminEmail = (process.env.ADMIN_EMAIL || 'hhshukla241099@gmail.com').toLowerCase().trim()

  if (!isSupabaseConfigured()) {
    return false
  }

  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId)
  if (!isUuid) {
    return false
  }

  try {
    const supabase = await createServiceClient()

    // 1. Direct check against admin email in Supabase Auth
    try {
      const { data: userData } = await supabase.auth.admin.getUserById(userId)
      if (userData?.user?.email?.toLowerCase() === allowedAdminEmail) {
        return true
      }
    } catch {}

    // 2. Check user_roles table, and verify email matches
    const { data: userRole } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .maybeSingle()

    if (userRole && ['admin', 'superadmin'].includes(userRole.role)) {
      try {
        const { data: userData } = await supabase.auth.admin.getUserById(userId)
        if (userData?.user?.email?.toLowerCase() === allowedAdminEmail) {
          return true
        }
      } catch {}
    }

    // 3. Check profiles table, and verify email matches
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, email')
      .eq('id', userId)
      .maybeSingle()

    if (profile && profile.role === 'admin' && profile.email?.toLowerCase() === allowedAdminEmail) {
      return true
    }

    return false
  } catch (err) {
    console.error('Error checking admin permissions:', err)
    return false
  }
}

