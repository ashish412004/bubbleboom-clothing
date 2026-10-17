'use client'

import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight } from 'lucide-react'
import { CategoryWithCover } from '@/lib/categories'

interface CategoryCardProps {
  category: CategoryWithCover
  priority?: boolean
  className?: string
  onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void
  draggable?: boolean
}

const CATEGORY_EDITORIAL_TAGLINES: Record<string, string> = {
  't-shirts': 'EVERYDAY ESSENTIALS.\nBOLDER STATEMENTS.',
  'hoodies': 'LAYER UP.\nSTAY AHEAD.',
  'footwear': 'GROUNDED MOVES.\nMONOCHROME KICKS.',
  'cargos': 'TACTICAL UTILITY.\nRELAXED FIT.',
  'shirts': 'STRUCTURED BOXY.\nEFFORTLESS DRAPE.',
  'jeans': 'HEAVYWEIGHT DENIM.\nAUTHENTIC CUTS.',
  'sweatshirts': 'PREMIUM FLEECE.\nSIGNATURE DROP.',
  'joggers': 'STREET COMFORT.\nDEFINED MOTION.',
  'shorts': 'HEAVYWEIGHT CUT.\nSUMMER DRAPES.',
  'accessories': 'STATEMENT PIECES.\nFINISHING TOUCHES.',
}

export function CategoryCard({
  category,
  priority = false,
  className = '',
  onClick,
  draggable = false,
}: CategoryCardProps) {
  const hasCoverImage = Boolean(category.cover_image && category.cover_image.trim().length > 0)
  
  // Format tagline: use curated streetwear copy or format custom category description
  const tagline =
    CATEGORY_EDITORIAL_TAGLINES[category.slug.toLowerCase()] ||
    (category.description && category.description.trim().length > 0
      ? category.description.toUpperCase()
      : 'CURATED WARDROBE.\nWEAR THE BOOM.')

  // Check if image already embeds category heading/branding to prevent duplicate overlay text
  const hasEmbeddedPosterText =
    category.image_source === 'custom' ||
    Boolean(category.image_url && category.image_url.trim().length > 0)

  return (
    <Link
      href={`/shop?category=${encodeURIComponent(category.slug)}`}
      onClick={onClick}
      draggable={draggable}
      className={`group relative block w-full aspect-[3/4] sm:aspect-[4/5] overflow-hidden rounded-[20px] bg-neutral-950 focus:outline-none focus:ring-2 focus:ring-white transition-all select-none shadow-md ${className}`}
      aria-label={`Shop ${category.name}`}
    >
      {hasCoverImage ? (
        <>
          <div className="relative w-full h-full bg-neutral-950 flex items-center justify-center">
            <Image
              src={category.cover_image!}
              alt={category.name}
              fill
              sizes="(max-width: 640px) 74vw, (max-width: 1024px) 40vw, 340px"
              priority={priority}
              className="object-contain sm:object-cover object-center transition-transform duration-500 ease-out"
            />
          </div>
          {/* Editorial dark gradient overlay near the bottom making text crisp while keeping model/garments visible */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent pointer-events-none" />
        </>
      ) : (
        /* Fallback dark textured card */
        <div className="absolute inset-0 bg-[#0C0C0C] flex flex-col items-center justify-center p-6 text-center overflow-hidden">
          <div className="absolute inset-0 opacity-[0.06] bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />
          <div className="relative z-10 w-14 h-14 mb-4 flex items-center justify-center border border-neutral-800 bg-neutral-900/80">
            <span className="font-mono text-xs font-black tracking-widest text-neutral-400">
              BOOM
            </span>
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent pointer-events-none" />
        </div>
      )}

      {/* Overlay Content: Positioned inside bottom-left of card matching reference screenshot */}
      <div className="absolute bottom-0 inset-x-0 p-4 sm:p-6 z-20 flex flex-col items-start justify-end">
        {hasEmbeddedPosterText ? (
          // Avoid duplicate overlay headings when poster graphic already embeds typography
          <>
            <h3 className="sr-only">{category.name}</h3>
            <p className="sr-only">{tagline}</p>
          </>
        ) : (
          // Display bold category title and description when plain product photo is used
          <>
            <h3 className="text-[22px] sm:text-[30px] lg:text-[32px] font-black uppercase tracking-tight text-white leading-none mb-1.5 drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
              {category.name}
            </h3>
            <p className="text-[10px] sm:text-[11px] font-medium uppercase tracking-[0.18em] text-neutral-200 leading-snug mb-3 max-w-[260px] whitespace-pre-line drop-shadow-[0_1px_4px_rgba(0,0,0,0.8)]">
              {tagline}
            </p>
          </>
        )}

        {/* Outlined "Shop Now →" Button */}
        <span className="inline-flex items-center gap-2 border border-white text-white text-xs font-semibold px-3.5 py-1.5 sm:px-4 sm:py-2 bg-transparent rounded-none tracking-wide group-hover:bg-white group-hover:text-black transition-colors duration-200">
          <span>Shop Now</span>
          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
        </span>
      </div>
    </Link>
  )
}
