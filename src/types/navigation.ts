export type NavigationItemType =
  | 'link'
  | 'category'
  | 'collection'
  | 'department'
  | 'sale'
  | 'custom'

export interface NavigationSubItem {
  id: string
  label: string
  url: string
  sort_order: number
  is_visible: boolean
  show_on_desktop: boolean
  show_on_mobile: boolean
  target?: '_self' | '_blank'
}

export interface NavigationItem {
  id: string
  name: string
  type: NavigationItemType
  url: string
  is_visible: boolean
  show_on_desktop: boolean
  show_on_mobile: boolean
  auto_hide_empty: boolean
  sort_order: number
  is_default?: boolean
  badge?: string | null
  target?: '_self' | '_blank'
  dropdown_items?: NavigationSubItem[]
  eligible_count?: number
}

export interface NavigationSettings {
  items: NavigationItem[]
  updated_at?: string
  updated_by?: string
}

export const DEFAULT_NAVIGATION_ITEMS: NavigationItem[] = [
  {
    id: 'nav-shop-all',
    name: 'Shop All',
    type: 'link',
    url: '/shop',
    sort_order: 1,
    is_visible: true,
    show_on_desktop: true,
    show_on_mobile: true,
    auto_hide_empty: false,
    is_default: true,
  },
  {
    id: 'nav-new-arrivals',
    name: 'New Arrivals',
    type: 'link',
    url: '/shop?sort=newest',
    sort_order: 2,
    is_visible: true,
    show_on_desktop: true,
    show_on_mobile: true,
    auto_hide_empty: false,
    is_default: true,
  },
  {
    id: 'nav-men',
    name: 'Men',
    type: 'department',
    url: '/shop?category=men',
    sort_order: 3,
    is_visible: true,
    show_on_desktop: true,
    show_on_mobile: true,
    auto_hide_empty: true,
    is_default: true,
    dropdown_items: [
      {
        id: 'sub-men-tshirts',
        label: 'T-Shirts',
        url: '/shop?category=t-shirts&department=men',
        sort_order: 1,
        is_visible: true,
        show_on_desktop: true,
        show_on_mobile: true,
      },
      {
        id: 'sub-men-hoodies',
        label: 'Hoodies',
        url: '/shop?category=hoodies&department=men',
        sort_order: 2,
        is_visible: true,
        show_on_desktop: true,
        show_on_mobile: true,
      },
      {
        id: 'sub-men-cargos',
        label: 'Cargos',
        url: '/shop?category=cargos&department=men',
        sort_order: 3,
        is_visible: true,
        show_on_desktop: true,
        show_on_mobile: true,
      },
      {
        id: 'sub-men-shirts',
        label: 'Shirts',
        url: '/shop?category=shirts&department=men',
        sort_order: 4,
        is_visible: true,
        show_on_desktop: true,
        show_on_mobile: true,
      },
    ],
  },
  {
    id: 'nav-women',
    name: 'Women',
    type: 'department',
    url: '/shop?category=women',
    sort_order: 4,
    is_visible: true,
    show_on_desktop: true,
    show_on_mobile: true,
    auto_hide_empty: true,
    is_default: true,
    dropdown_items: [
      {
        id: 'sub-women-tshirts',
        label: 'T-Shirts',
        url: '/shop?category=t-shirts&department=women',
        sort_order: 1,
        is_visible: true,
        show_on_desktop: true,
        show_on_mobile: true,
      },
      {
        id: 'sub-women-hoodies',
        label: 'Hoodies',
        url: '/shop?category=hoodies&department=women',
        sort_order: 2,
        is_visible: true,
        show_on_desktop: true,
        show_on_mobile: true,
      },
    ],
  },
  {
    id: 'nav-footwear',
    name: 'Footwear',
    type: 'category',
    url: '/shop?category=footwear',
    sort_order: 5,
    is_visible: true,
    show_on_desktop: true,
    show_on_mobile: true,
    auto_hide_empty: true,
    is_default: true,
  },
  {
    id: 'nav-collections',
    name: 'Collections',
    type: 'collection',
    url: '/collections',
    sort_order: 6,
    is_visible: true,
    show_on_desktop: true,
    show_on_mobile: true,
    auto_hide_empty: false,
    is_default: true,
  },
  {
    id: 'nav-sale',
    name: 'Sale',
    type: 'sale',
    url: '/shop?sale=true',
    sort_order: 7,
    is_visible: true,
    show_on_desktop: true,
    show_on_mobile: true,
    auto_hide_empty: true,
    is_default: true,
  },
]
