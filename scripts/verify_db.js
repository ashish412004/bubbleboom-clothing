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
};

async function verify() {
  const pRes = await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/products?select=id,name,slug,is_active,is_published`, { headers });
  const prods = await pRes.json();
  console.log('ACTIVE & INACTIVE PRODUCTS IN SUPABASE:');
  console.table(prods);

  const cRes = await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/collections?select=id,name,slug`, { headers });
  const cols = await cRes.json();
  console.log('COLLECTIONS IN SUPABASE:');
  console.table(cols);

  const cpnRes = await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/coupons?select=id,code,is_active`, { headers });
  const cpns = await cpnRes.json();
  console.log('COUPONS IN SUPABASE:');
  console.table(cpns);
}

verify();
