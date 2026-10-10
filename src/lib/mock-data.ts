// In-memory catalog dataset for categories and initial collections
// Demo products, fake specifications and demo orders have been removed.

export const MOCK_CATEGORIES = [
  {
    id: 'c1000000-0000-0000-0000-000000000001',
    name: 'T-Shirts',
    slug: 't-shirts',
    description: 'Relaxed and boxy silhouette tees',
    sort_order: 1,
    is_active: true,
    created_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 'c1000000-0000-0000-0000-000000000004',
    name: 'Shirts',
    slug: 'shirts',
    description: 'Boxy cut shirts and overshirts',
    sort_order: 2,
    is_active: true,
    created_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 'c1000000-0000-0000-0000-000000000002',
    name: 'Hoodies',
    slug: 'hoodies',
    description: 'Streetwear hoodies and pullovers',
    sort_order: 3,
    is_active: true,
    created_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 'c1000000-0000-0000-0000-000000000012',
    name: 'Sweatshirts',
    slug: 'sweatshirts',
    description: 'Crewnecks and heavyweight sweatshirts',
    sort_order: 4,
    is_active: true,
    created_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 'c1000000-0000-0000-0000-000000000013',
    name: 'Jeans',
    slug: 'jeans',
    description: 'Baggy and relaxed cut streetwear denim',
    sort_order: 5,
    is_active: true,
    created_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 'c1000000-0000-0000-0000-000000000003',
    name: 'Cargos',
    slug: 'cargos',
    description: 'Utility cargos and tactical pants',
    sort_order: 6,
    is_active: true,
    created_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 'c1000000-0000-0000-0000-000000000014',
    name: 'Joggers',
    slug: 'joggers',
    description: 'Heavyweight fleece track pants and joggers',
    sort_order: 7,
    is_active: true,
    created_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 'c1000000-0000-0000-0000-000000000015',
    name: 'Shorts',
    slug: 'shorts',
    description: 'Heavyweight fleece and tactical shorts',
    sort_order: 8,
    is_active: true,
    created_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 'c1000000-0000-0000-0000-000000000010',
    name: 'Footwear',
    slug: 'footwear',
    description: 'Streetwear kicks, chunky sneakers and slides',
    sort_order: 9,
    is_active: true,
    created_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 'c1000000-0000-0000-0000-000000000006',
    name: 'Accessories',
    slug: 'accessories',
    description: 'Caps, beanies, socks and lifestyle gear',
    sort_order: 10,
    is_active: true,
    created_at: '2026-01-01T00:00:00Z',
  },
]

export const MOCK_COLLECTIONS: any[] = [
  {
    id: '7d109a48-82dd-4255-a5bb-601641260730',
    name: 'BUBBLE BOOM – MONOCHROME KICKS',
    slug: 'bubble-boom-monochrome-kicks',
    description: 'Introducing Bubble Boom Monochrome Kicks — our signature black-and-white sneaker collection. Designed for bold streetwear lovers, featuring chunky soles, premium-inspired detailing, everyday comfort, and standout Bubble Boom branding. Step into your own style.',
    banner_image_url: 'https://gcolfeickvmvgxjviplx.supabase.co/storage/v1/object/public/product-images/products/prod-1791666473871-9isu30-bubble-boom-black-white-chunky-sneaker.png',
    mobile_banner_image_url: null,
    is_visible: true,
    sort_order: 1,
    created_at: '2026-10-10T21:06:24.471Z',
    updated_at: '2026-10-10T21:06:24.471Z',
  },
]

export const MOCK_PRODUCTS: any[] = []

export const MOCK_ORDERS: any[] = []

export const MOCK_COUPONS: any[] = []

export const MOCK_RETURNS: any[] = []

export const MOCK_AUDIT_LOGS: any[] = []
