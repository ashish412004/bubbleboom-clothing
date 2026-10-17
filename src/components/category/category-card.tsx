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

export function CategoryCard({
  category,
  priority = false,
  className = '',
  onClick,
  draggable = false,
}: CategoryCardProps) {
  const hasCoverImage = Boolean(category.cover_image && category.cover_image.trim().length > 0)

  return (
    <Link
      href={`/shop?category=${encodeURIComponent(category.slug)}`}
      onClick={onClick}
      draggable={draggable}
      className={`group relative block w-full aspect-[4/5] sm:aspect-[4/5] overflow-hidden bg-neutral-950 border border-neutral-900 focus:outline-none focus:ring-1 focus:ring-white transition-all select-none ${className}`}
      aria-label={`Browse ${category.name}`}
    >
      {hasCoverImage ? (
        <>
          <Image
            src={category.cover_image!}
            alt={category.name}
            fill
            sizes="(max-width: 640px) 75vw, (max-width: 1024px) 33vw, 25vw"
            priority={priority}
            className="object-cover object-center group-hover:scale-105 transition-transform duration-500 ease-out"
          />
          {/* Subtle dual-layer gradient overlay for optimal readability and editorial streetwear vibe */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-black/10 group-hover:from-black/90 group-hover:via-black/35 transition-colors" />
        </>
      ) : (
        /* Bubble Boom Branded Monochrome Fallback for categories with no images yet */
        <div className="absolute inset-0 bg-[#0C0C0C] flex flex-col items-center justify-center p-6 text-center overflow-hidden">
          {/* Subtle dot pattern watermark */}
          <div className="absolute inset-0 opacity-[0.06] bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />
          
          {/* Monogram Badge */}
          <div className="relative z-10 w-14 h-14 sm:w-16 sm:h-16 mb-4 flex items-center justify-center border border-neutral-800 bg-neutral-900/80 group-hover:border-neutral-500 transition-colors">
            <span className="font-mono text-xs sm:text-sm font-black tracking-widest text-neutral-400 group-hover:text-white transition-colors">
              BOOM
            </span>
          </div>

          <p className="relative z-10 text-[11px] font-mono tracking-widest uppercase text-neutral-500 max-w-[160px] line-clamp-1">
            BUBBLE BOOM
          </p>

          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent pointer-events-none" />
        </div>
      )}


      {/* Bottom Content Area */}
      <div className="absolute bottom-0 inset-x-0 p-3.5 sm:p-5 z-20 flex flex-col justify-end">
        <h3 className="text-sm sm:text-lg md:text-xl font-extrabold uppercase tracking-tight text-white leading-tight drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
          {category.name}
        </h3>

        {/* Desktop Explore Drop / Product count: simplified on mobile to keep cards minimal and avoid crowded text */}
        <div className="hidden sm:flex mt-2 items-center justify-between text-neutral-400 group-hover:text-white transition-colors">
          <span className="text-[11px] font-mono uppercase tracking-widest font-semibold flex items-center gap-1.5">
            Explore Drop
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </span>
          {category.product_count !== undefined && category.product_count > 0 && (
            <span className="text-[10px] font-mono text-neutral-400">
              {category.product_count} {category.product_count === 1 ? 'Drop' : 'Drops'}
            </span>
          )}
        </div>
      </div>
    </Link>
  )
}
