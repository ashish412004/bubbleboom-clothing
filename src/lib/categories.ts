import { createClient as createServerClient } from '@/lib/supabase/server'
import { Database } from '@/types/database'
import { generateSlug } from './utils'

export type Category = Database['public']['Tables']['categories']['Row']

export async function getCategories() {
  const supabase = await createServerClient()

  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('is_active', true)
    .order('sort_order')

  if (error) {
    console.error('Error fetching categories:', error)
    return []
  }

  return data
}

export async function getCategoryBySlug(slug: string) {
  const supabase = await createServerClient()

  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('slug', slug)
    .eq('is_active', true)
    .single()

  if (error) {
    console.error('Error fetching category:', error)
    return null
  }

  return data
}

export async function getCategoryById(id: string) {
  const supabase = await createServerClient()

  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    console.error('Error fetching category:', error)
    return null
  }

  return data
}

// Admin functions
export async function createCategory(category: Database['public']['Tables']['categories']['Insert']) {
  const supabase = await createServerClient()

  // @ts-ignore
  const { data, error } = await supabase
    .from('categories')
    .insert(category)
    .select()
    .single()

  if (error) {
    console.error('Error creating category:', error)
    return { error: error.message }
  }

  return { data }
}

export async function updateCategory(id: string, category: Database['public']['Tables']['categories']['Update']) {
  const supabase = await createServerClient()

  // @ts-ignore
  const { data, error } = await supabase
    .from('categories')
    .update(category)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Error updating category:', error)
    return { error: error.message }
  }

  return { data }
}

export async function deleteCategory(id: string) {
  const supabase = await createServerClient()

  const { error } = await supabase
    .from('categories')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Error deleting category:', error)
    return { error: error.message }
  }

  return { success: true }
}
