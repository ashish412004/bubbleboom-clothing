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

  // Scroll by one card step with smooth alignment
  const scroll = (direction: 'prev' | 'next') => {
    const el = sliderRef.current
    if (!el) return

    const cards = Array.from(el.querySelectorAll('[data-category-card]')) as HTMLElement[]
    if (cards.length === 0) return

    const currentScroll = el.scrollLeft
    const gap = window.innerWidth >= 640 ? 24 : 12

    let targetScroll = currentScroll
    if (direction === 'next') {
      const nextCard = cards.find((card) => card.offsetLeft > currentScroll + 15)
      if (nextCard) {
        targetScroll = nextCard.offsetLeft - el.offsetLeft
      } else {
        targetScroll = currentScroll + (cards[0].offsetWidth + gap)
      }
    } else {
      const prevCards = cards.filter((card) => card.offsetLeft < currentScroll - 15)
      if (prevCards.length > 0) {
        const prevCard = prevCards[prevCards.length - 1]
        targetScroll = prevCard.offsetLeft - el.offsetLeft
      } else {
        targetScroll = Math.max(0, currentScroll - (cards[0].offsetWidth + gap))
      }
    }

    el.scrollTo({ left: Math.max(0, targetScroll), behavior: 'smooth' })
  }

  // Mouse Drag Handlers for Desktop (ultra-smooth 60/120fps motion)
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button !== 0) return
    const el = sliderRef.current
    if (!el) return

    isDraggingRef.current = true
    hasMovedRef.current = false
    startXRef.current = e.pageX - el.offsetLeft
    scrollLeftRef.current = el.scrollLeft

    // Temporarily turn off CSS smooth scrolling & snapping during mouse drag to eliminate jitter
    el.style.scrollBehavior = 'auto'
    el.style.scrollSnapType = 'none'
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return
    const el = sliderRef.current
    if (!el) return

    const currentX = e.pageX - el.offsetLeft
    const walk = (currentX - startXRef.current) * 1.25

    if (Math.abs(walk) > 4) {
      hasMovedRef.current = true
    }

    el.scrollLeft = scrollLeftRef.current - walk
  }

  const handleMouseUp = () => {
    if (!isDraggingRef.current) return
    isDraggingRef.current = false
    const el = sliderRef.current
    if (!el) return

    // Restore smooth scroll & snap behavior
    el.style.scrollBehavior = ''
    el.style.scrollSnapType = ''

    // Smoothly snap to closest card
    if (hasMovedRef.current) {
      const cards = Array.from(el.querySelectorAll('[data-category-card]')) as HTMLElement[]
      if (cards.length > 0) {
        const currentScroll = el.scrollLeft
        let closestCard = cards[0]
        let minDiff = Infinity
        for (const card of cards) {
          const diff = Math.abs(card.offsetLeft - el.offsetLeft - currentScroll)
          if (diff < minDiff) {
            minDiff = diff
            closestCard = card
          }
        }
        el.scrollTo({ left: closestCard.offsetLeft - el.offsetLeft, behavior: 'smooth' })
      }
    }
  }

  const handleMouseLeave = () => {
    if (!isDraggingRef.current) return
    isDraggingRef.current = false
    const el = sliderRef.current
    if (!el) return
    el.style.scrollBehavior = ''
    el.style.scrollSnapType = ''
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
    <section className="py-8 sm:py-16 lg:py-20 border-b border-neutral-200 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header: Matches Reference Screenshot */}
        <div className="flex items-end justify-between mb-4 sm:mb-8">
          <div>
            <p className="text-[11px] sm:text-xs uppercase tracking-widest font-bold text-neutral-500 mb-1">
              Curated Wardrobe
            </p>
            <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight uppercase text-black">
              Shop By Category
            </h2>
          </div>

          {/* Desktop View All Categories Link */}
          <Link
            href="/categories"
            className="text-xs uppercase tracking-widest font-bold hover:underline hidden sm:inline-flex items-center shrink-0 mb-1"
          >
            View All Categories <ArrowRight size={14} className="ml-1" />
          </Link>
        </div>

        {/* Horizontal Category Carousel Row: 78-80vw on mobile so next card is partially visible on right */}
        <div
          ref={sliderRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
          className="flex gap-3 sm:gap-6 overflow-x-auto scroll-smooth snap-x snap-mandatory touch-pan-x overscroll-x-contain [-webkit-overflow-scrolling:touch] will-change-scroll pb-2 pt-1 px-4 sm:px-6 lg:px-8 -mx-4 sm:-mx-6 lg:-mx-8 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden cursor-grab active:cursor-grabbing select-none"
          role="region"
          aria-label="Shop by category carousel"
          tabIndex={0}
        >
          {categories.map((cat, idx) => (
            <div
              key={cat.id}
              data-category-card
              className="snap-start shrink-0 flex-[0_0_78vw] sm:flex-[0_0_42%] md:flex-[0_0_36%] lg:flex-[0_0_30.5%] xl:flex-[0_0_23.5%] max-w-[340px]"
            >
              <CategoryCard
                category={cat}
                priority={idx < 3}
                onClick={handleCardClick}
              />
            </div>
          ))}
        </div>

        {/* Minimal Centered Arrow Buttons Underneath the Cards (Matches Reference Screenshot) */}
        <div className="flex items-center justify-center gap-3 pt-4 sm:pt-6 pb-1">
          <button
            type="button"
            onClick={() => scroll('prev')}
            disabled={!canScrollPrev}
            aria-label="Previous categories"
            className="w-10 h-10 sm:w-11 sm:h-11 flex items-center justify-center border border-neutral-300 hover:border-black bg-white text-black transition-colors disabled:opacity-25 disabled:cursor-not-allowed cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-black"
          >
            <ChevronLeft size={18} strokeWidth={2} />
          </button>

          <button
            type="button"
            onClick={() => scroll('next')}
            disabled={!canScrollNext}
            aria-label="Next categories"
            className="w-10 h-10 sm:w-11 sm:h-11 flex items-center justify-center border border-neutral-300 hover:border-black bg-white text-black transition-colors disabled:opacity-25 disabled:cursor-not-allowed cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-black"
          >
            <ChevronRight size={18} strokeWidth={2} />
          </button>
        </div>

        {/* Mobile View All Link underneath */}
        <div className="mt-4 text-center sm:hidden">
          <Link
            href="/categories"
            className="text-[11px] font-mono uppercase tracking-widest font-bold text-neutral-500 hover:text-black inline-flex items-center gap-1"
          >
            <span>View All Categories</span>
            <ArrowRight size={12} />
          </Link>
        </div>
      </div>
    </section>
  )
}
