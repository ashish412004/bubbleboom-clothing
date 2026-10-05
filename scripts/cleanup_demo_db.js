const fs = require('fs');
const path = require('path');

const envPath = path.resolve(process.cwd(), '.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
const env = {};
envContent.split(/\r?\n/).forEach(line => {
  const idx = line.indexOf('=');
  if (idx > -1) {
    const k = line.slice(0, idx).trim();
    let v = line.slice(idx + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    env[k] = v;
  }
});

const headers = {
  apikey: env.SUPABASE_SERVICE_ROLE_KEY,
  Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
  'Content-Type': 'application/json',
  Prefer: 'return=representation',
};

async function run() {
  console.log('=== STARTING DATABASE CLEANUP ===');

  // 1. Clean Demo Collections: Monochrome Originals & Urban Essentials
  console.log('\n1. Removing demo collections...');
  const delColRes = await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/collections?slug=in.(monochrome-originals,urban-essentials)`, {
    method: 'DELETE',
    headers,
  });
  console.log('Collections deleted status:', delColRes.status);

  // Also remove from collection_products
  const delColProdRes = await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/collection_products?collection_id=in.(c0110000-0000-0000-0000-000000000001,c0110000-0000-0000-0000-000000000002)`, {
    method: 'DELETE',
    headers,
  });
  console.log('Collection products unlinked status:', delColProdRes.status);

  // 2. Clean Demo Coupons (Promotional Offers)
  console.log('\n2. Removing demo coupons (BOOM10, FIRSTBOOM)...');
  const delCpnRes = await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/coupons?code=in.(BOOM10,FIRSTBOOM)`, {
    method: 'DELETE',
    headers,
  });
  console.log('Coupons deleted status:', delCpnRes.status);

  // 3. Remove invented descriptions from categories (e.g. 240 GSM, 380 GSM fleece)
  console.log('\n3. Cleaning invented specifications from category descriptions...');
  const catUpdates = [
    { slug: 'oversized-tshirts', desc: 'Relaxed and boxy silhouettes.' },
    { slug: 'hoodies-sweatshirts', desc: 'Heavyweight hoodies and fleece.' },
    { slug: 'cargo-bottoms', desc: 'Utility pants and sweatpants.' },
    { slug: 'shirts', desc: 'Boxy streetwear shirts.' },
    { slug: 'jackets', desc: 'Outerwear and tactical layers.' },
    { slug: 'accessories', desc: 'Caps and lifestyle essentials.' },
  ];
  for (const cu of catUpdates) {
    const patchRes = await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/categories?slug=eq.${cu.slug}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ description: cu.desc }),
    });
    console.log(`Updated category ${cu.slug}: status ${patchRes.status}`);
  }

  // 4. Archive/Deactivate demo products that have order item history so orders remain intact
  // Demo product IDs: d1000000-0000-0000-0000-000000000001 and d1000000-0000-0000-0000-000000000003
  console.log('\n4. Deactivating demo products & zeroing variants while preserving real orders...');
  const demoProdIds = [
    'd1000000-0000-0000-0000-000000000001',
    'd1000000-0000-0000-0000-000000000003',
  ];
  for (const pid of demoProdIds) {
    // Check if can hard delete or must soft delete
    const prodRes = await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/products?id=eq.${pid}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({
        is_active: false,
        is_published: false,
      }),
    });
    console.log(`Deactivated demo product ${pid}: status ${prodRes.status}`);

    const varRes = await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/product_variants?product_id=eq.${pid}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({
        is_active: false,
        stock: 0,
      }),
    });
    console.log(`Zeroed stock and deactivated variants for ${pid}: status ${varRes.status}`);
  }

  // 5. Clean reviews table if any
  try {
    const revRes = await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/reviews?select=*`, {
      method: 'DELETE',
      headers,
    });
    console.log('\n5. Cleaned fake demo reviews:', revRes.status);
  } catch {}

  console.log('\n=== DATABASE CLEANUP COMPLETED ===');
}

run();
