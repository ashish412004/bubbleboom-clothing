import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatPrice(price: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price)
}

export function formatDiscount(mrp: number, sellingPrice: number): number {
  return Math.round(((mrp - sellingPrice) / mrp) * 100)
}

export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
}

export function getSafeImageUrl(
  url: any,
  fallback: string = 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800&q=80'
): string {
  if (!url || typeof url !== 'string') return fallback
  const trimmed = url.trim()
  if (!trimmed) return fallback
  // Discard local Windows/disk file paths like C:\Users\...
  if (trimmed.includes('\\') || /^[a-zA-Z]:/.test(trimmed)) {
    return fallback
  }
  // Discard obvious web pages or non-image URLs (e.g. Amazon / Flipkart product pages)
  if (
    trimmed.includes('/dp/') ||
    trimmed.includes('/gp/product/') ||
    trimmed.includes('/p/') && trimmed.includes('flipkart.com') ||
    /\.(html?|php)(\?.*)?$/i.test(trimmed)
  ) {
    return fallback
  }
  // Valid web path or relative public asset
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('/')) {
    return trimmed
  }
  return fallback
}
