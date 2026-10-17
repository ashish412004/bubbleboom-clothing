'use client'

import { useRef, useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react'
import { CategoryWithCover } from '@/lib/categories'
import { CategoryCard } from './category-card'

interface CategorySliderProps {
  categories: CategoryWithCover[]
}

export function CategorySlider({ categories }: CategorySliderProps) {
  const sliderRef = useRef<HTMLDivElement>(null)
  const [canScrollPrev, setCanScrollPrev] = useState(false)
  const [canScrollNext, setCanScrollNext] = useState(true)

  // Drag interaction state
  const isDraggingRef = useRef(false)
  const startXRef = useRef(0)
  const scrollLeftRef = useRef(0)
  const hasMovedRef = useRef(false)

  // Check whether slider can scroll backwards or forwards
  const updateScrollState = useCallback(() => {
    const el = sliderRef.current
    if (!el) return

    const { scrollLeft, scrollWidth, clientWidth } = el
    // Tolerances for fractional scaling
    setCanScrollPrev(scrollLeft > 6)
    setCanScrollNext(scrollLeft + clientWidth < scrollWidth - 6)
  }, [])

  useEffect(() => {
    const el = sliderRef.current
    if (!el) return

    updateScrollState()

    const onScroll = () => {
      updateScrollState()
    }

    el.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', updateScrollState)

    return () => {
      el.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', updateScrollState)
    }
  }, [updateScrollState, categories.length])

  // Scroll by one card step
  const scroll = (direction: 'prev' | 'next') => {
    const el = sliderRef.current
    if (!el) return

    const firstCard = el.querySelector('[data-category-card]') as HTMLElement
    // One card width plus gap (24px on desktop, 12px on mobile) or 80% client width fallback
    const cardStep = firstCard
      ? firstCard.offsetWidth + (window.innerWidth >= 640 ? 24 : 12)
      : el.clientWidth * 0.75

    const targetOffset = direction === 'next' ? cardStep : -cardStep
    el.scrollBy({ left: targetOffset, behavior: 'smooth' })
  }

  // Mouse Drag Handlers for Desktop
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    // Only handle primary left click
    if (e.button !== 0) return
    const el = sliderRef.current
    if (!el) return

    isDraggingRef.current = true
    hasMovedRef.current = false
    startXRef.current = e.pageX - el.offsetLeft
    scrollLeftRef.current = el.scrollLeft
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return
    const el = sliderRef.current
    if (!el) return

    const currentX = e.pageX - el.offsetLeft
    const walk = (currentX - startXRef.current) * 1.25

    if (Math.abs(walk) > 5) {
      hasMovedRef.current = true
    }

    el.scrollLeft = scrollLeftRef.current - walk
  }

  const handleMouseUp = () => {
    isDraggingRef.current = false
  }

  const handleMouseLeave = () => {
    isDraggingRef.current = false
  }

  // Suppress link navigation when a real drag occurred
  const handleCardClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (hasMovedRef.current) {
      e.preventDefault()
      e.stopPropagation()
    }
  }

  if (!categories || categories.length === 0) {
    return null
  }

  return (
    <section className="py-9 sm:py-24 border-b border-neutral-200 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header: Title + Minimal Controls + View All */}
        <div className="flex items-end justify-between mb-5 sm:mb-12">
          <div>
            <p className="text-[10px] sm:text-xs uppercase tracking-widest font-bold text-neutral-500 mb-0.5 sm:mb-1">
              Curated Wardrobe
            </p>
            <h2 className="text-xl sm:text-4xl font-extrabold tracking-tight uppercase">
              Shop By Category
            </h2>
          </div>

          <div className="flex items-center gap-2.5 sm:gap-4">
            {/* Minimal Monochrome Prev/Next Controls */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              <button
                type="button"
                onClick={() => scroll('prev')}
                disabled={!canScrollPrev}
                aria-label="Previous categories"
                className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center border border-black bg-white text-black hover:bg-black hover:text-white transition-colors disabled:opacity-20 disabled:cursor-not-allowed cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-black"
              >
                <ChevronLeft size={16} className="sm:hidden" strokeWidth={2.2} />
                <ChevronLeft size={18} className="hidden sm:block" strokeWidth={2.2} />
              </button>

              <button
                type="button"
                onClick={() => scroll('next')}
                disabled={!canScrollNext}
                aria-label="Next categories"
                className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center border border-black bg-white text-black hover:bg-black hover:text-white transition-colors disabled:opacity-20 disabled:cursor-not-allowed cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-black"
              >
                <ChevronRight size={16} className="sm:hidden" strokeWidth={2.2} />
                <ChevronRight size={18} className="hidden sm:block" strokeWidth={2.2} />
              </button>
            </div>

            {/* Desktop View All Categories Link */}
            <Link
              href="/categories"
              className="text-xs uppercase tracking-widest font-bold hover:underline hidden sm:inline-flex items-center shrink-0 ml-2"
            >
              View All Categories <ArrowRight size={14} className="ml-1" />
            </Link>
          </div>
        </div>

        {/* Horizontal Category Carousel Row */}
        <div
          ref={sliderRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
          className="flex gap-3 sm:gap-6 overflow-x-auto scroll-smooth snap-x snap-mandatory touch-pan-x pb-3 pt-1 px-4 sm:px-6 lg:px-8 -mx-4 sm:-mx-6 lg:-mx-8 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden cursor-grab active:cursor-grabbing select-none"
          role="region"
          aria-label="Shop by category carousel"
          tabIndex={0}
        >
          {categories.map((cat, idx) => (
            <div
              key={cat.id}
              data-category-card
              className="snap-start shrink-0 flex-[0_0_72%] sm:flex-[0_0_42%] md:flex-[0_0_36%] lg:flex-[0_0_30.5%] xl:flex-[0_0_23.5%] max-w-[270px] sm:max-w-[340px]"
            >
              <CategoryCard
                category={cat}
                priority={idx < 4}
                onClick={handleCardClick}
              />
            </div>
          ))}
        </div>

        {/* Mobile View All Categories Link (Below Carousel) */}
        <div className="mt-5 text-center sm:hidden">
          <Link
            href="/categories"
            className="inline-flex items-center justify-center w-full py-2.5 sm:py-3 border border-black text-xs font-mono uppercase font-bold tracking-wider hover:bg-black hover:text-white transition-colors"
          >
            View All Categories
            <ArrowRight size={14} className="ml-2" />
          </Link>
        </div>
      </div>
    </section>
  )
}
