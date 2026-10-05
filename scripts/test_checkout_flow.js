const baseUrl = 'http://localhost:3000';

async function testCheckoutFlow() {
  const cookieJar = {};

  function parseCookies(res) {
    const rawSetCookie = res.headers.get('set-cookie');
    if (rawSetCookie) {
      rawSetCookie.split(',').forEach(c => {
        const parts = c.split(';')[0].split('=');
        if (parts.length >= 2) cookieJar[parts[0].trim()] = parts[1].trim();
      });
    }
  }

  function getCookieHeader() {
    return Object.entries(cookieJar).map(([k, v]) => `${k}=${v}`).join('; ');
  }

  console.log('1. Adding item to cart...');
  const addRes = await fetch(baseUrl + '/api/cart', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': getCookieHeader()
    },
    body: JSON.stringify({
      variant_id: '895b8a10-e24e-4911-8e0e-e5930ea2ae6c',
      quantity: 1
    })
  });
  parseCookies(addRes);

  console.log('2. Proceeding to Cashfree checkout...');
  const checkoutRes = await fetch(baseUrl + '/api/checkout', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': getCookieHeader()
    },
    body: JSON.stringify({
      full_name: 'Harshit Shukla',
      email: 'hhshukla241099@gmail.com',
      phone: '9876543210',
      address_line1: '123 Street Block B',
      city: 'Mumbai',
      state: 'Maharashtra',
      pin_code: '400001',
      payment_method: 'cashfree'
    })
  });
  const checkoutData = await checkoutRes.json();
  console.log('Cashfree Checkout status:', checkoutRes.status, 'Response:', checkoutData);
}

testCheckoutFlow();
