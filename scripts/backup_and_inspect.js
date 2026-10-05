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

async function fetchTable(tableName) {
  const url = `${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/${tableName}?select=*`;
  const res = await fetch(url, {
    headers: {
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
    },
  });
  if (!res.ok) {
    const txt = await res.text();
    return { error: txt };
  }
  return await res.json();
}

async function run() {
  const tables = [
    'products',
    'product_variants',
    'product_images',
    'collections',
    'collection_products',
    'categories',
    'orders',
    'order_items',
    'reviews',
    'coupons',
    'coupon_usage',
    'inventory_movements',
  ];

  const backup = {};
  for (const t of tables) {
    const data = await fetchTable(t);
    backup[t] = data;
    console.log(`Table ${t}: ${Array.isArray(data) ? data.length : 'error'}`);
  }

  const backupDir = path.resolve(process.cwd(), 'database_backups');
  if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });
  const backupFile = path.join(backupDir, `backup_before_demo_cleanup_${Date.now()}.json`);
  fs.writeFileSync(backupFile, JSON.stringify(backup, null, 2), 'utf-8');
  console.log('Database backup successfully saved to:', backupFile);

  // Print product details
  if (Array.isArray(backup.products)) {
    console.log('\n--- PRODUCTS IN DB ---');
    backup.products.forEach(p => {
      console.log(`ID: ${p.id} | Name: "${p.name}" | Slug: "${p.slug}" | Created: ${p.created_at}`);
    });
  }

  // Print collections
  if (Array.isArray(backup.collections)) {
    console.log('\n--- COLLECTIONS IN DB ---');
    backup.collections.forEach(c => {
      console.log(`ID: ${c.id} | Name: "${c.name}" | Slug: "${c.slug}"`);
    });
  }

  // Print reviews
  if (Array.isArray(backup.reviews)) {
    console.log('\n--- REVIEWS IN DB ---');
    console.log(`Total reviews: ${backup.reviews.length}`);
  }
}

run();
