import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient, isSupabaseConfigured } from '@/lib/supabase/server'
import { getCurrentUser, isAdmin } from '@/lib/auth'
import { deleteProduct, saveDevProduct } from '@/lib/products'
import { getSafeImageUrl } from '@/lib/utils'

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
        alt_text: product.name,
        sort_order: idx,
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
        tags: product.tags || [],
        variants: newVariants,
        images: newImages,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      saveDevProduct(createdProduct)
      return NextResponse.json({ success: true, product: createdProduct })
    }

    const supabase = await createServiceClient()

    // 1. Insert product
    const { data: createdProduct, error: prodErr } = await supabase
      .from('products')
      .insert({
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
        tags: product.tags || [],
      })
      .select()
      .single()

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
      const imagesToInsert = images.map((img: any, idx: number) => ({
        product_id: createdProduct.id,
        image_url: getSafeImageUrl(typeof img === 'string' ? img : img.image_url),
        alt_text: product.name,
        sort_order: idx,
      }))

      const { error: imgErr } = await supabase.from('product_images').insert(imagesToInsert)
      if (imgErr) {
        console.error('Error creating product images:', imgErr)
      }
    }

    // 4. Log in audit logs
    await supabase.from('admin_audit_logs').insert({
      admin_id: user.id,
      action: 'CREATE_PRODUCT',
      entity: 'products',
      entity_id: createdProduct.id,
      metadata: { name: product.name, slug: product.slug },
    })

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

    // 1. Update core product fields
    const { data: updatedProduct, error: prodErr } = await supabase
      .from('products')
      .update({
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
        updated_at: new Date().toISOString(),
      })
      .eq('id', product.id)
      .select()
      .single()

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

    // 3. Update images
    if (images && Array.isArray(images)) {
      // Delete old images and insert updated sequence
      await supabase.from('product_images').delete().eq('product_id', product.id)

      const imagesToInsert = images.map((img: any, idx: number) => ({
        product_id: product.id,
        image_url: getSafeImageUrl(typeof img === 'string' ? img : img.image_url),
        alt_text: product.name,
        sort_order: idx,
      }))

      if (imagesToInsert.length > 0) {
        await supabase.from('product_images').insert(imagesToInsert)
      }
    }

    // 4. Log in audit logs
    try {
      await supabase.from('admin_audit_logs').insert({
        admin_id: user.id,
        action: 'UPDATE_PRODUCT',
        entity: 'products',
        entity_id: product.id,
        metadata: { name: product.name, slug: product.slug, selling_price: product.selling_price },
      })
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

    const { id, is_published, selling_price, mrp, name } = await req.json()
    if (!id) {
      return NextResponse.json({ error: 'Product ID required' }, { status: 400 })
    }

    const supabase = await createServiceClient()
    const updateData: any = { updated_at: new Date().toISOString() }
    if (typeof is_published === 'boolean') updateData.is_published = is_published
    if (selling_price !== undefined) updateData.selling_price = Number(selling_price)
    if (mrp !== undefined) updateData.mrp = Number(mrp)
    if (name !== undefined) updateData.name = name

    const { data, error } = await supabase
      .from('products')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    try {
      await supabase.from('admin_audit_logs').insert({
        admin_id: user.id,
        action: 'PATCH_PRODUCT',
        entity: 'products',
        entity_id: id,
        metadata: updateData,
      })
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

    return NextResponse.json({ success: true, message: 'Product deleted successfully', id })
  } catch (error: any) {
    console.error('Admin delete product error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
