import { createClient as createServerClient, isSupabaseConfigured } from '@/lib/supabase/server'
import { Database } from '@/types/database'
import { generateSlug } from './utils'
import { MOCK_CATEGORIES } from './mock-data'
import fs from 'fs'
import path from 'path'

export function getDeletedCategoryIds(): Set<string> {
  try {
    const file = path.join(process.cwd(), '.next', 'bb_deleted_categories.json')
    if (fs.existsSync(file)) {
      const arr = JSON.parse(fs.readFileSync(file, 'utf-8'))
      return new Set(arr)
    }
  } catch {}
  return new Set()
}

export function saveDeletedCategoryId(id: string) {
  try {
    const dir = path.join(process.cwd(), '.next')
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
    const file = path.join(dir, 'bb_deleted_categories.json')
    let current: string[] = []
    if (fs.existsSync(file)) {
      try {
        current = JSON.parse(fs.readFileSync(file, 'utf-8'))
      } catch {}
    }
    if (!current.includes(id)) {
      current.push(id)
      fs.writeFileSync(file, JSON.stringify(current, null, 2), 'utf-8')
    }
  } catch {}
}

export type Category = Database['public']['Tables']['categories']['Row']

export async function getCategories() {
  const deletedIds = getDeletedCategoryIds()
  let list = MOCK_CATEGORIES.filter((c) => !deletedIds.has(c.id) && !deletedIds.has(c.slug))

  if (!isSupabaseConfigured()) {
    return list
  }

  try {
    const supabase = await createServerClient()

    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('is_active', true)
      .order('sort_order')

    if (error || !data || data.length === 0) {
      return list
    }

    return data.filter((c) => !deletedIds.has(c.id) && !deletedIds.has(c.slug))
  } catch {
    return list
  }
}

export async function getCategoryBySlug(slug: string) {
  const deletedIds = getDeletedCategoryIds()
  if (deletedIds.has(slug)) return null

  if (!isSupabaseConfigured()) {
    return MOCK_CATEGORIES.find((c) => c.slug === slug && !deletedIds.has(c.id)) || null
  }

  try {
    const supabase = await createServerClient()

    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('slug', slug)
      .eq('is_active', true)
      .single()

    if (error || !data || deletedIds.has(data.id)) {
      return MOCK_CATEGORIES.find((c) => c.slug === slug && !deletedIds.has(c.id)) || null
    }

    return data
  } catch {
    return MOCK_CATEGORIES.find((c) => c.slug === slug && !deletedIds.has(c.id)) || null
  }
}

export async function getCategoryById(id: string) {
  const deletedIds = getDeletedCategoryIds()
  if (deletedIds.has(id)) return null

  if (!isSupabaseConfigured()) {
    return MOCK_CATEGORIES.find((c) => c.id === id && !deletedIds.has(c.slug)) || null
  }

  try {
    const supabase = await createServerClient()

    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !data || deletedIds.has(data.id)) {
      return MOCK_CATEGORIES.find((c) => c.id === id && !deletedIds.has(c.slug)) || null
    }

    return data
  } catch {
    return MOCK_CATEGORIES.find((c) => c.id === id && !deletedIds.has(c.slug)) || null
  }
}

// Admin functions
export async function createCategory(category: Database['public']['Tables']['categories']['Insert']) {
  if (!isSupabaseConfigured()) {
    const newCat = {
      id: `cat-${Date.now()}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_active: true,
      sort_order: 10,
      description: null,
      parent_id: null,
      ...category,
    } as any
    MOCK_CATEGORIES.push(newCat)
    return { data: newCat }
  }

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
  if (!isSupabaseConfigured()) {
    const idx = MOCK_CATEGORIES.findIndex((c) => c.id === id)
    if (idx >= 0) {
      MOCK_CATEGORIES[idx] = { ...MOCK_CATEGORIES[idx], ...category }
      return { data: MOCK_CATEGORIES[idx] }
    }
  }

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
  saveDeletedCategoryId(id)

  const idx = MOCK_CATEGORIES.findIndex((c) => c.id === id || c.slug === id)
  if (idx >= 0) {
    saveDeletedCategoryId(MOCK_CATEGORIES[idx].id)
    saveDeletedCategoryId(MOCK_CATEGORIES[idx].slug)
    MOCK_CATEGORIES.splice(idx, 1)
  }

  if (isSupabaseConfigured()) {
    try {
      const supabase = await createServerClient()
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', id)

      if (error) {
        console.error('Error deleting category from DB:', error)
        return { error: error.message }
      }
    } catch (err: any) {
      return { error: err.message }
    }
  }

  return { success: true }
}
