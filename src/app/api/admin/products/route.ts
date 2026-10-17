import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { createServiceClient, isSupabaseConfigured } from '@/lib/supabase/server'
import { getCurrentUser, isAdmin } from '@/lib/auth'
import { deleteProduct, saveDevProduct, clearProductCache } from '@/lib/products'
import { clearCategoriesCache } from '@/lib/categories'
import { getSafeImageUrl } from '@/lib/utils'
import { extractStoragePath } from '@/lib/storage'

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || !(await isAdmin(user.id))) {
      return NextResponse.json({ error: 'Unauthorized admin access' }, { status: 403 })
    }

    const body = await req.json()
    const { product, variants, images } = body

    if (!product.name || !product.slug || !product.selling_price) {
      return NextResponse.json({ error: 'Name, slug, and selling price are required.' }, { status: 400 })
    }

    if (!isSupabaseConfigured()) {
      const newProdId = `prod-${Date.now()}`
      const newVariants = (variants || [{ color: 'Black', size: 'M', stock: 10 }]).map((v: any, idx: number) => ({
        id: `var-${Date.now()}-${idx}`,
        product_id: newProdId,
        sku: v.sku || `${product.slug.toUpperCase()}-${(v.color || 'BLK').toUpperCase()}-${(v.size || 'M').toUpperCase()}`,
        color: v.color || 'Black',
        size: v.size || 'M',
        stock: Number(v.stock) || 0,
        is_active: true,
      }))
      const newImages = (images || []).map((img: any, idx: number) => ({
        id: `img-${Date.now()}-${idx}`,
        product_id: newProdId,
        image_url: getSafeImageUrl(typeof img === 'string' ? img : img.image_url),
        color: typeof img === 'object' && img.color ? img.color.trim() : null,
        is_primary: typeof img === 'object' && Boolean(img.is_primary),
        alt_text: typeof img === 'object' && img.alt_text ? img.alt_text : product.name,
        sort_order: typeof img === 'object' && typeof img.sort_order === 'number' ? img.sort_order : idx,
      }))

      const createdProduct = {
        id: newProdId,
        name: product.name,
        slug: product.slug,
        description: product.description || '',
        category_id: product.category_id || null,
        material: product.material || null,
        fit: product.fit || null,
        wash_care: product.wash_care || null,
        mrp: product.mrp || product.selling_price,
        selling_price: product.selling_price,
        is_published: Boolean(product.is_published),
        is_active: true,
        product_mode: product.product_mode === 'live' || product.is_test === false ? 'live' : 'test',
        is_test: product.product_mode === 'live' || product.is_test === false ? false : true,
        tags: [
          ...(product.tags || []).filter((t: string) => !['mode:test', 'mode:live', 'test-product', 'live-product'].includes(t.toLowerCase())),
          (product.product_mode === 'live' || product.is_test === false) ? 'mode:live' : 'mode:test',
          (product.product_mode === 'live' || product.is_test === false) ? 'live-product' : 'test-product',
        ],
        department: product.department || 'unisex',
        variants: newVariants,
        images: newImages,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      saveDevProduct(createdProduct)
      return NextResponse.json({ success: true, product: createdProduct })
    }

    const supabase = await createServiceClient()

    const mode = product.product_mode === 'live' || product.is_test === false ? 'live' : 'test'
    const isTest = mode === 'test'
    const cleanTags = (product.tags || []).filter((t: string) => !['mode:test', 'mode:live', 'test-product', 'live-product'].includes(t.toLowerCase()))
    const finalTags = [...cleanTags, mode === 'test' ? 'mode:test' : 'mode:live', mode === 'test' ? 'test-product' : 'live-product']

    // 1. Insert product
    const insertPayload: any = {
      name: product.name,
      slug: product.slug,
      description: product.description || '',
      category_id: product.category_id || null,
      material: product.material || null,
      fit: product.fit || null,
      wash_care: product.wash_care || null,
      mrp: product.mrp || product.selling_price,
      selling_price: product.selling_price,
      is_published: Boolean(product.is_published),
      is_active: true,
      product_mode: mode,
      is_test: isTest,
      tags: finalTags,
      department: product.department || 'unisex',
    }

    let { data: createdProduct, error: prodErr } = await supabase
      .from('products')
      .insert(insertPayload)
      .select()
      .single()

    if (prodErr && (prodErr.message?.includes('department') || prodErr.message?.includes('product_mode') || prodErr.message?.includes('is_test'))) {
      if (prodErr.message?.includes('department')) delete insertPayload.department
      if (prodErr.message?.includes('product_mode')) delete insertPayload.product_mode
      if (prodErr.message?.includes('is_test')) delete insertPayload.is_test
      const retry = await supabase.from('products').insert(insertPayload).select().single()
      createdProduct = retry.data
      prodErr = retry.error
    }

    if (prodErr || !createdProduct) {
      throw new Error(prodErr?.message || 'Failed to create product record')
    }

    // 2. Insert variants
    if (variants && variants.length > 0) {
      const variantsToInsert = variants.map((v: any) => ({
        product_id: createdProduct.id,
        sku: v.sku || `${product.slug.toUpperCase()}-${v.color.toUpperCase()}-${v.size.toUpperCase()}`,
        color: v.color,
        size: v.size,
        stock: Number(v.stock) || 0,
        is_active: true,
      }))

      const { error: varErr } = await supabase.from('product_variants').insert(variantsToInsert)
      if (varErr) {
        console.error('Error creating variants:', varErr)
      }
    }

    // 3. Insert images
    if (images && images.length > 0) {
      const imagesToInsert = images
        .map((img: any, idx: number) => {
          const rawUrl = typeof img === 'string' ? img : img.image_url
          const safeUrl = getSafeImageUrl(rawUrl)
          const storagePath = (typeof img === 'object' && img.storage_path)
            ? img.storage_path
            : extractStoragePath(safeUrl)
          const color = typeof img === 'object' && img.color ? img.color.trim() : null
          const isPrimary = typeof img === 'object' && Boolean(img.is_primary)
          let altText = (typeof img === 'object' && img.alt_text) ? img.alt_text : product.name
          const cleanAlt = altText.replace(/\[color:[^\]]+\]/gi, '').replace(/\[primary\]/gi, '').trim()
          let tags = ''
          if (color) tags += `[color:${color}]`
          if (isPrimary) tags += `[primary]`
          altText = tags ? `${tags} ${cleanAlt}` : cleanAlt

          return {
            product_id: createdProduct.id,
            image_url: safeUrl,
            storage_path: storagePath || null,
            color: color || null,
            is_primary: isPrimary,
            alt_text: altText,
            sort_order: (typeof img === 'object' && typeof img.sort_order === 'number') ? img.sort_order : idx,
          }
        })
        .filter((item: any) => item.image_url)

      if (imagesToInsert.length > 0) {
        let { error: imgErr } = await supabase.from('product_images').insert(imagesToInsert as any)
        if (imgErr && (imgErr.message?.includes('color') || imgErr.message?.includes('is_primary') || imgErr.message?.includes('storage_path'))) {
          const fallbackImages = imagesToInsert.map(({ color, is_primary, storage_path, ...rest }: any) => {
            const fb: any = { ...rest }
            if (!imgErr?.message?.includes('storage_path')) fb.storage_path = storage_path
            if (!imgErr?.message?.includes('color')) fb.color = color
            if (!imgErr?.message?.includes('is_primary')) fb.is_primary = is_primary
            return fb
          })
          const fallbackRes = await supabase.from('product_images').insert(fallbackImages as any)
          imgErr = fallbackRes.error
        }
        if (imgErr) {
          console.error('Error creating product images:', imgErr)
        }
      }
    }

    // 4. Link collection if provided
    const targetCollectionId = product.collection_id || (product.collection_ids && product.collection_ids[0])
    if (targetCollectionId) {
      try {
        await supabase.from('collection_products').upsert({
          collection_id: targetCollectionId,
          product_id: createdProduct.id,
          sort_order: 0,
        }, { onConflict: 'collection_id,product_id' })
      } catch (colErr) {
        console.warn('Could not link product to collection:', colErr)
      }
    }

    // 5. Log in audit logs
    await supabase.from('admin_audit_logs').insert({
      admin_id: user.id,
      action: 'CREATE_PRODUCT',
      entity: 'products',
      entity_id: createdProduct.id,
      metadata: { name: product.name, slug: product.slug },
    })

    clearProductCache()
    clearCategoriesCache()

    try {
      revalidatePath('/products/[slug]', 'page')
      revalidatePath('/shop', 'page')
      revalidatePath('/shop', 'layout')
      revalidatePath('/', 'page')
      revalidatePath('/categories', 'page')
      revalidatePath('/collections', 'page')
      revalidatePath('/collections/[slug]', 'page')
      revalidatePath('/admin/products', 'page')
    } catch {}

    return NextResponse.json({ success: true, product: createdProduct })
  } catch (error: any) {
    console.error('Admin create product error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || !(await isAdmin(user.id))) {
      return NextResponse.json({ error: 'Unauthorized admin access' }, { status: 403 })
    }

    const body = await req.json()
    const { product, variants, images } = body

    if (!product?.id) {
      return NextResponse.json({ error: 'Product ID is required for update' }, { status: 400 })
    }
    if (!product.name || !product.slug || product.selling_price === undefined) {
      return NextResponse.json({ error: 'Name, slug, and selling price are required.' }, { status: 400 })
    }

    if (!isSupabaseConfigured()) {
      return NextResponse.json({ success: true, product })
    }

    const supabase = await createServiceClient()

    const mode = product.product_mode === 'live' || product.is_test === false ? 'live' : 'test'
    const isTest = mode === 'test'
    const cleanTags = (product.tags || []).filter((t: string) => !['mode:test', 'mode:live', 'test-product', 'live-product'].includes(t.toLowerCase()))
    const finalTags = [...cleanTags, mode === 'test' ? 'mode:test' : 'mode:live', mode === 'test' ? 'test-product' : 'live-product']

    // 1. Update core product fields
    const updatePayload: any = {
      name: product.name,
      slug: product.slug,
      description: product.description || '',
      category_id: product.category_id || null,
      material: product.material || null,
      fit: product.fit || null,
      wash_care: product.wash_care || null,
      mrp: Number(product.mrp) || Number(product.selling_price),
      selling_price: Number(product.selling_price),
      is_published: Boolean(product.is_published),
      product_mode: mode,
      is_test: isTest,
      tags: finalTags,
      department: product.department || 'unisex',
      updated_at: new Date().toISOString(),
    }

    let { data: updatedProduct, error: prodErr } = await supabase
      .from('products')
      .update(updatePayload)
      .eq('id', product.id)
      .select()
      .single()

    if (prodErr && (prodErr.message?.includes('department') || prodErr.message?.includes('product_mode') || prodErr.message?.includes('is_test'))) {
      if (prodErr.message?.includes('department')) delete updatePayload.department
      if (prodErr.message?.includes('product_mode')) delete updatePayload.product_mode
      if (prodErr.message?.includes('is_test')) delete updatePayload.is_test
      const retry = await supabase
        .from('products')
        .update(updatePayload)
        .eq('id', product.id)
        .select()
        .single()
      updatedProduct = retry.data
      prodErr = retry.error
    }

    if (prodErr) throw prodErr

    // 2. Update / Insert variants
    if (variants && Array.isArray(variants)) {
      for (const v of variants) {
        if (v.id && !v.id.startsWith('var-temp-') && !v.id.startsWith('var-new-')) {
          // Update existing variant
          await supabase
            .from('product_variants')
            .update({
              color: v.color,
              size: v.size,
              sku: v.sku || `${product.slug.toUpperCase()}-${v.color.toUpperCase()}-${v.size.toUpperCase()}`,
              stock: Number(v.stock) || 0,
              is_active: v.is_active !== undefined ? Boolean(v.is_active) : true,
              updated_at: new Date().toISOString(),
            })
            .eq('id', v.id)
        } else {
          // Insert new variant
          await supabase.from('product_variants').insert({
            product_id: product.id,
            color: v.color,
            size: v.size,
            sku: v.sku || `${product.slug.toUpperCase()}-${v.color.toUpperCase()}-${v.size.toUpperCase()}`,
            stock: Number(v.stock) || 0,
            is_active: true,
          })
        }
      }
    }

    // 3. Update images (retain old images until new upload and database insert succeed)
    if (images && Array.isArray(images)) {
      const validImages = images
        .map((img: any, idx: number) => {
          const rawUrl = typeof img === 'string' ? img : img.image_url
          const safeUrl = getSafeImageUrl(rawUrl)
          const storagePath = (typeof img === 'object' && img.storage_path)
            ? img.storage_path
            : extractStoragePath(safeUrl)
          const color = typeof img === 'object' && img.color ? img.color.trim() : null
          const isPrimary = typeof img === 'object' && Boolean(img.is_primary)
          let altText = (typeof img === 'object' && img.alt_text) ? img.alt_text : product.name
          const cleanAlt = altText.replace(/\[color:[^\]]+\]/gi, '').replace(/\[primary\]/gi, '').trim()
          let tags = ''
          if (color) tags += `[color:${color}]`
          if (isPrimary) tags += `[primary]`
          altText = tags ? `${tags} ${cleanAlt}` : cleanAlt

          return {
            product_id: product.id,
            image_url: safeUrl,
            storage_path: storagePath || null,
            color: color || null,
            is_primary: isPrimary,
            alt_text: altText,
            sort_order: (typeof img === 'object' && typeof img.sort_order === 'number') ? img.sort_order : idx,
          }
        })
        .filter((item: any) => item.image_url)

      if (validImages.length > 0) {
        // Collect current image IDs so we retain them if the new insert fails
        const { data: existingImages } = await supabase
          .from('product_images')
          .select('id')
          .eq('product_id', product.id)
        const oldImageIds = (existingImages || []).map((ci: any) => ci.id)

        // Insert new sequence first
        let { error: insertErr } = await supabase.from('product_images').insert(validImages as any)
        if (insertErr && (insertErr.message?.includes('color') || insertErr.message?.includes('is_primary') || insertErr.message?.includes('storage_path'))) {
          const fallbackImages = validImages.map(({ color, is_primary, storage_path, ...rest }: any) => {
            const fb: any = { ...rest }
            if (!insertErr?.message?.includes('storage_path')) fb.storage_path = storage_path
            if (!insertErr?.message?.includes('color')) fb.color = color
            if (!insertErr?.message?.includes('is_primary')) fb.is_primary = is_primary
            return fb
          })
          const fallbackRes = await supabase.from('product_images').insert(fallbackImages as any)
          insertErr = fallbackRes.error
        }

        if (insertErr) {
          console.error('Failed to update product images; old images preserved:', insertErr)
        } else if (oldImageIds.length > 0) {
          // New sequence inserted successfully; now delete previous records
          await supabase.from('product_images').delete().in('id', oldImageIds)
        }
      }
    }

    // 4. Sync collection association
    const targetCollectionId = product.collection_id !== undefined
      ? product.collection_id
      : (product.collection_ids ? product.collection_ids[0] : undefined)
    if (targetCollectionId !== undefined) {
      try {
        await supabase.from('collection_products').delete().eq('product_id', product.id)
        if (targetCollectionId) {
          await supabase.from('collection_products').upsert({
            collection_id: targetCollectionId,
            product_id: product.id,
            sort_order: 0,
          }, { onConflict: 'collection_id,product_id' })
        }
      } catch (colErr) {
        console.warn('Could not sync collection product association:', colErr)
      }
    }

    // 5. Log in audit logs
    try {
      await supabase.from('admin_audit_logs').insert({
        admin_id: user.id,
        action: 'UPDATE_PRODUCT',
        entity: 'products',
        entity_id: product.id,
        metadata: { name: product.name, slug: product.slug, selling_price: product.selling_price },
      })
    } catch {}

    clearProductCache()
    clearCategoriesCache()

    try {
      revalidatePath('/products/[slug]', 'page')
      revalidatePath('/shop', 'page')
      revalidatePath('/shop', 'layout')
      revalidatePath('/', 'page')
      revalidatePath('/categories', 'page')
      revalidatePath('/collections', 'page')
      revalidatePath('/collections/[slug]', 'page')
      revalidatePath('/admin/products', 'page')
    } catch {}

    return NextResponse.json({ success: true, product: updatedProduct })
  } catch (error: any) {
    console.error('Admin update product error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || !(await isAdmin(user.id))) {
      return NextResponse.json({ error: 'Unauthorized admin access' }, { status: 403 })
    }

    const { id, is_published, selling_price, mrp, name, product_mode, is_test } = await req.json()
    if (!id) {
      return NextResponse.json({ error: 'Product ID required' }, { status: 400 })
    }

    const supabase = await createServiceClient()
    const updateData: any = { updated_at: new Date().toISOString() }
    if (typeof is_published === 'boolean') updateData.is_published = is_published
    if (selling_price !== undefined) updateData.selling_price = Number(selling_price)
    if (mrp !== undefined) updateData.mrp = Number(mrp)
    if (name !== undefined) updateData.name = name

    if (product_mode !== undefined || is_test !== undefined) {
      const mode = product_mode === 'live' || is_test === false ? 'live' : 'test'
      updateData.product_mode = mode
      updateData.is_test = mode === 'test'

      // Also sync tags for compatibility
      try {
        const { data: curr } = await supabase.from('products').select('tags').eq('id', id).single()
        if (curr) {
          const cleanTags = (curr.tags || []).filter((t: string) => !['mode:test', 'mode:live', 'test-product', 'live-product'].includes(t.toLowerCase()))
          updateData.tags = [...cleanTags, mode === 'test' ? 'mode:test' : 'mode:live', mode === 'test' ? 'test-product' : 'live-product']
        }
      } catch {}
    }

    let { data, error } = await supabase
      .from('products')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error && (error.message?.includes('product_mode') || error.message?.includes('is_test'))) {
      delete updateData.product_mode
      delete updateData.is_test
      const retry = await supabase.from('products').update(updateData).eq('id', id).select().single()
      data = retry.data
      error = retry.error
    }

    if (error) throw error

    clearProductCache()
    clearCategoriesCache()

    try {
      await supabase.from('admin_audit_logs').insert({
        admin_id: user.id,
        action: 'PATCH_PRODUCT',
        entity: 'products',
        entity_id: id,
        metadata: updateData,
      })
    } catch {}

    try {
      revalidatePath('/products/[slug]', 'page')
      revalidatePath('/shop', 'page')
      revalidatePath('/shop', 'layout')
      revalidatePath('/', 'page')
      revalidatePath('/categories', 'page')
      revalidatePath('/collections', 'page')
      revalidatePath('/collections/[slug]', 'page')
      revalidatePath('/admin/products', 'page')
    } catch {}

    return NextResponse.json({ success: true, product: data })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || !(await isAdmin(user.id))) {
      return NextResponse.json({ error: 'Unauthorized admin access' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    let id = searchParams.get('id')

    if (!id) {
      try {
        const body = await req.json()
        id = body?.id
      } catch {}
    }

    if (!id) {
      return NextResponse.json({ error: 'Product ID is required for deletion' }, { status: 400 })
    }

    const res = await deleteProduct(id)
    if (res.error) {
      return NextResponse.json({ error: res.error }, { status: 500 })
    }

    clearProductCache()
    clearCategoriesCache()

    // Also log in audit logs if Supabase is configured
    try {
      const supabase = await createServiceClient()
      await supabase.from('admin_audit_logs').insert({
        admin_id: user.id,
        action: 'DELETE_PRODUCT',
        entity: 'products',
        entity_id: id,
        metadata: { deleted_id: id },
      })
    } catch {}

    try {
      revalidatePath('/products/[slug]', 'page')
      revalidatePath('/shop', 'page')
      revalidatePath('/shop', 'layout')
      revalidatePath('/', 'page')
      revalidatePath('/categories', 'page')
      revalidatePath('/collections', 'page')
      revalidatePath('/collections/[slug]', 'page')
      revalidatePath('/admin/products', 'page')
    } catch {}

    return NextResponse.json({ success: true, message: 'Product deleted successfully', id })
  } catch (error: any) {
    console.error('Admin delete product error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
