'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react'

export interface HeroSlide {
  id: string
  src: string
  fallbackSrc?: string
  alt: string
  title?: string
}

export interface HeroCarouselProps {
  heroTitle?: string | null
  heroDescription?: string | null
  primaryCtaText?: string | null
  primaryCtaLink?: string | null
  secondaryCtaText?: string | null
  secondaryCtaLink?: string | null
  slides?: HeroSlide[]
}

export const HERO_SLIDES: HeroSlide[] = [
  {
    id: 'hero-1',
    src: '/images/brand/hero-banner-1.webp',
    fallbackSrc: '/images/brand/hero-banner-1.png',
    alt: 'Bubble Boom Streetwear Originals - Editorial Apparel on Concrete Pedestals',
    title: 'Bubble Boom Originals',
  },
  {
    id: 'hero-2',
    src: '/images/brand/hero-banner-2.webp',
    fallbackSrc: '/images/brand/hero-banner-2.png',
    alt: 'Bubble Boom Oversized Hoodies & Signature Tees with Velvet Texture',
    title: 'Street Luxury Hoodies',
  },
  {
    id: 'hero-3',
    src: '/images/brand/hero-banner-3.webp',
    fallbackSrc: '/images/brand/hero-banner-3.png',
    alt: 'Bubble Boom Capsule Collection Rack under Studio Spotlight',
    title: 'Capsule Drops on Rack',
  },
  {
    id: 'hero-4',
    src: '/images/brand/hero-banner-4.webp',
    fallbackSrc: '/images/brand/hero-banner-4.png',
    alt: 'Bubble Boom Official Luxury Unboxing & Streetwear Collection',
    title: 'Official Packaging Unboxing',
  },
]

export function HeroCarousel({
  heroTitle,
  heroDescription,
  primaryCtaText,
  primaryCtaLink,
  secondaryCtaText,
  secondaryCtaLink,
  slides: customSlides,
}: HeroCarouselProps) {
  const slides = (customSlides && customSlides.length > 0) ? customSlides : HERO_SLIDES

  const [currentIndex, setCurrentIndex] = useState(0)
  const [mounted, setMounted] = useState(false)
  const [isTabVisible, setIsTabVisible] = useState(true)
  const [isReducedMotion, setIsReducedMotion] = useState(false)
  const [isHovered, setIsHovered] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const touchStartXRef = useRef<number | null>(null)
  const touchStartYRef = useRef<number | null>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  // Detect user preference for reduced motion
  useEffect(() => {
    if (typeof window === 'undefined') return
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    setIsReducedMotion(mediaQuery.matches)

    const handleChange = (e: MediaQueryListEvent) => {
      setIsReducedMotion(e.matches)
    }

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange)
      return () => mediaQuery.removeEventListener('change', handleChange)
    }
  }, [])

  // Detect browser tab visibility to avoid background resource waste
  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsTabVisible(document.visibilityState === 'visible')
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [])

  // Slide navigation callbacks
  const nextSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % slides.length)
  }, [slides.length])

  const prevSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + slides.length) % slides.length)
  }, [slides.length])

  const goToSlide = useCallback((index: number) => {
    setCurrentIndex(index)
  }, [])

  // Autoplay management with pause-on-hover & intelligent restart
  const startTimer = useCallback((delay = 5000) => {
    if (timerRef.current) clearInterval(timerRef.current)
    if (!isTabVisible || isReducedMotion || isHovered || slides.length <= 1) return

    timerRef.current = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % slides.length)
    }, delay)
  }, [isTabVisible, isReducedMotion, isHovered, slides.length])

  // Reset and restart autoplay on manual interaction (provides 6.5s grace period)
  const handleManualAction = useCallback(() => {
    startTimer(6500)
  }, [startTimer])

  useEffect(() => {
    startTimer(5000)
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [startTimer])

  // Touch event listeners for mobile swipe gestures
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartXRef.current = e.touches[0].clientX
    touchStartYRef.current = e.touches[0].clientY
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartXRef.current === null || touchStartYRef.current === null) return
    const diffX = touchStartXRef.current - e.changedTouches[0].clientX
    const diffY = touchStartYRef.current - e.changedTouches[0].clientY

    // Trigger only if swipe is predominantly horizontal
    if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 40) {
      if (diffX > 0) {
        nextSlide()
      } else {
        prevSlide()
      }
      handleManualAction()
    }
    touchStartXRef.current = null
    touchStartYRef.current = null
  }

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') {
      prevSlide()
      handleManualAction()
    } else if (e.key === 'ArrowRight') {
      nextSlide()
      handleManualAction()
    }
  }

  return (
    <section
      suppressHydrationWarning
      className="relative min-h-[75vh] sm:min-h-[85vh] h-[80vh] sm:h-[88vh] max-h-[960px] bg-black text-white flex items-center justify-center overflow-hidden"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      aria-roledescription="carousel"
      aria-label="Bubble Boom Brand Hero Banner Carousel"
    >
      {/* 1. Background Slides with smooth crossfade */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        {slides.map((slide, index) => {
          const isActive = index === currentIndex
          // Render only the LCP primary slide on initial SSR/HTML payload, mount remaining slides after hydration
          if (index !== 0 && !mounted) return null
          return (
            <div
              key={slide.id}
              className={`absolute inset-0 ${
                isReducedMotion ? 'transition-none' : 'transition-opacity duration-700 ease-in-out'
              } ${isActive ? 'opacity-100 z-[2]' : 'opacity-0 z-[1]'}`}
              aria-hidden={!isActive}
            >
              <Image
                src={slide.src}
                alt={slide.alt}
                fill
                priority={index === 0}
                loading={index === 0 ? undefined : 'lazy'}
                quality={80}
                className="object-cover object-[72%_center] sm:object-center select-none"
                sizes="100vw"
              />
            </div>
          )
        })}

        {/* Balanced, translucent editorial gradient: ensures products & fabrics are prominently visible */}
        <div
          className="absolute inset-0 z-[3] pointer-events-none"
          style={{
            background: 'linear-gradient(180deg, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0.15) 40%, rgba(0,0,0,0.55) 100%)',
          }}
        />

        {/* Soft radial focal vignette behind the text center so typography is razor-sharp */}
        <div
          className="absolute inset-0 z-[3] pointer-events-none"
          style={{
            background: 'radial-gradient(circle at center, rgba(0,0,0,0.32) 0%, rgba(0,0,0,0) 65%)',
          }}
        />
      </div>

      {/* 2. Geometric brand ring overlay from brand monogram */}
      <div className="absolute inset-0 opacity-15 pointer-events-none z-[4]">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full border border-neutral-500/30" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] rounded-full border border-neutral-500/20" />
      </div>

      {/* 3. Manual Navigation Arrows (Desktop & Mobile Accessible) */}
      {slides.length > 1 && (
        <>
          <button
            type="button"
            onClick={() => {
              prevSlide()
              handleManualAction()
            }}
            aria-label="Previous slide"
            className="absolute left-2.5 sm:left-6 md:left-8 top-1/2 -translate-y-1/2 z-20 w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center bg-black/45 hover:bg-white text-white hover:text-black border border-white/25 hover:border-white backdrop-blur-md transition-all duration-200 hover:scale-110 active:scale-95 focus:outline-none focus:ring-2 focus:ring-white/80 cursor-pointer shadow-xl group"
          >
            <ChevronLeft
              className="w-5 h-5 sm:w-6 sm:h-6 transition-transform group-hover:-translate-x-0.5"
              strokeWidth={2.5}
            />
          </button>

          <button
            type="button"
            onClick={() => {
              nextSlide()
              handleManualAction()
            }}
            aria-label="Next slide"
            className="absolute right-2.5 sm:right-6 md:right-8 top-1/2 -translate-y-1/2 z-20 w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center bg-black/45 hover:bg-white text-white hover:text-black border border-white/25 hover:border-white backdrop-blur-md transition-all duration-200 hover:scale-110 active:scale-95 focus:outline-none focus:ring-2 focus:ring-white/80 cursor-pointer shadow-xl group"
          >
            <ChevronRight
              className="w-5 h-5 sm:w-6 sm:h-6 transition-transform group-hover:translate-x-0.5"
              strokeWidth={2.5}
            />
          </button>
        </>
      )}

      {/* 4. Fixed Headline, Description & CTAs (Completely stable, zero layout shift) */}
      <div className="relative z-10 max-w-5xl mx-auto px-12 sm:px-16 md:px-20 py-16 sm:py-20 text-center flex flex-col items-center">
        {/* Monogram Badge */}
        <div className="mb-4 sm:mb-6 inline-flex items-center space-x-2 border border-white/20 bg-black/60 backdrop-blur-md px-3.5 sm:px-4 py-1.5 rounded-full shadow-lg">
          <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
          <span className="text-[10px] sm:text-[11px] uppercase tracking-widest font-bold text-white/90">
            BUBBLE BOOM ORIGINALS
          </span>
        </div>

        {/* Hero Main Heading */}
        <h1 className="text-4xl sm:text-7xl md:text-8xl lg:text-9xl font-extrabold tracking-tighter uppercase leading-[0.9] mb-4 sm:mb-6 text-white drop-shadow-[0_4px_16px_rgba(0,0,0,0.85)]">
          {heroTitle || 'WEAR THE BOOM.'}
        </h1>

        {/* Description */}
        <p className="text-sm sm:text-xl md:text-2xl text-white/95 max-w-2xl font-medium leading-relaxed mb-8 sm:mb-10 drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]">
          {heroDescription || 'Every style. Every mood. Make it yours.'}
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row items-center gap-3.5 sm:gap-4 w-full sm:w-auto">
          <Link
            href={primaryCtaLink || '/shop'}
            className="w-full sm:w-auto bg-white text-black hover:bg-neutral-200 px-8 py-4 text-xs uppercase tracking-widest font-extrabold flex items-center justify-center transition-all hover:scale-105 shadow-2xl"
          >
            {primaryCtaText || 'SHOP NOW'}
            <ArrowRight size={16} className="ml-2" />
          </Link>
          <Link
            href={secondaryCtaLink || '/collections'}
            className="w-full sm:w-auto bg-black/50 backdrop-blur-md border border-white text-white hover:bg-white hover:text-black px-8 py-4 text-xs uppercase tracking-widest font-extrabold flex items-center justify-center transition-all shadow-2xl"
          >
            {secondaryCtaText || 'EXPLORE COLLECTIONS'}
          </Link>
        </div>
      </div>

      {/* 5. Slide Indicators (Pagination dots with progress indication) */}
      {slides.length > 1 && (
        <div className="absolute bottom-6 sm:bottom-8 inset-x-0 z-20 flex items-center justify-center pointer-events-none">
          <div
            className="inline-flex items-center gap-2.5 bg-black/50 backdrop-blur-md border border-white/20 px-3.5 py-2 rounded-full pointer-events-auto shadow-lg"
            role="tablist"
            aria-label="Hero carousel slide pagination"
          >
            {slides.map((slide, idx) => {
              const isActive = idx === currentIndex
              return (
                <button
                  key={slide.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  aria-label={`Go to slide ${idx + 1}: ${slide.title || slide.alt}`}
                  onClick={() => {
                    goToSlide(idx)
                    handleManualAction()
                  }}
                  className={`transition-all duration-300 rounded-full cursor-pointer focus:outline-none focus:ring-2 focus:ring-white/80 ${
                    isActive
                      ? 'w-7 sm:w-9 h-2 bg-white shadow-[0_0_8px_rgba(255,255,255,0.6)]'
                      : 'w-2 h-2 bg-white/40 hover:bg-white/80'
                  }`}
                />
              )
            })}
          </div>
        </div>
      )}
    </section>
  )
}
