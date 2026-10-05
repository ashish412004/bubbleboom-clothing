'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

interface HeroCarouselProps {
  heroTitle?: string | null
  heroDescription?: string | null
  primaryCtaText?: string | null
  primaryCtaLink?: string | null
  secondaryCtaText?: string | null
  secondaryCtaLink?: string | null
}

const HERO_SLIDES = [
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
}: HeroCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isTabVisible, setIsTabVisible] = useState(true)
  const [isReducedMotion, setIsReducedMotion] = useState(false)

  const touchStartXRef = useRef<number | null>(null)
  const touchStartYRef = useRef<number | null>(null)

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
    setCurrentIndex((prev) => (prev + 1) % HERO_SLIDES.length)
  }, [])

  const prevSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + HERO_SLIDES.length) % HERO_SLIDES.length)
  }, [])

  const goToSlide = (index: number) => {
    setCurrentIndex(index)
  }

  // Autoplay interval effect (automatic cycle every 5 seconds)
  const shouldAutoAdvance = isTabVisible && !isReducedMotion

  useEffect(() => {
    if (!shouldAutoAdvance) return

    const interval = setInterval(() => {
      nextSlide()
    }, 5000)

    return () => clearInterval(interval)
  }, [shouldAutoAdvance, nextSlide])

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
    }
    touchStartXRef.current = null
    touchStartYRef.current = null
  }

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') {
      prevSlide()
    } else if (e.key === 'ArrowRight') {
      nextSlide()
    }
  }

  return (
    <section
      className="relative min-h-[75vh] sm:min-h-[85vh] h-[80vh] sm:h-[88vh] max-h-[960px] bg-black text-white flex items-center justify-center overflow-hidden"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      aria-roledescription="carousel"
      aria-label="Bubble Boom Brand Hero Banner Carousel"
    >
      {/* 1. Background Slides with 700ms smooth crossfade */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        {HERO_SLIDES.map((slide, index) => {
          const isActive = index === currentIndex
          return (
            <div
              key={slide.id}
              className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
                isActive ? 'opacity-100 z-[2]' : 'opacity-0 z-[1]'
              }`}
              aria-hidden={!isActive}
            >
              <Image
                src={slide.src}
                alt={slide.alt}
                fill
                priority={index === 0}
                quality={90}
                className="object-cover object-[72%_center] sm:object-center"
                sizes="100vw"
              />
            </div>
          )
        })}

        {/* Elegant dark gradient overlay for optimal text legibility across all slides */}
        <div className="absolute inset-0 z-[3] bg-black/60 bg-gradient-to-t from-black via-black/45 to-black/65" />
      </div>

      {/* 2. Geometric brand star overlay from brand monogram */}
      <div className="absolute inset-0 opacity-20 pointer-events-none z-[4]">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full border border-neutral-600/40" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] rounded-full border border-neutral-600/30" />
      </div>

      {/* 3. Fixed Headline, Description & CTAs (Completely stable, zero layout shift) */}
      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20 text-center flex flex-col items-center">
        {/* Monogram Badge */}
        <div className="mb-6 inline-flex items-center space-x-2 border border-neutral-800 bg-neutral-950/80 px-4 py-1.5 rounded-full">
          <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
          <span className="text-[11px] uppercase tracking-widest font-bold text-neutral-300">
            BUBBLE BOOM ORIGINALS
          </span>
        </div>

        {/* Hero Main Heading */}
        <h1 className="text-5xl sm:text-7xl md:text-8xl lg:text-9xl font-extrabold tracking-tighter uppercase leading-[0.9] mb-6">
          {heroTitle || 'WEAR THE BOOM.'}
        </h1>

        {/* Description */}
        <p className="text-base sm:text-xl md:text-2xl text-neutral-300 max-w-2xl font-normal leading-relaxed mb-10">
          {heroDescription || 'Every style. Every mood. Make it yours.'}
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
          <Link
            href={primaryCtaLink || '/shop'}
            className="w-full sm:w-auto bg-white text-black hover:bg-neutral-200 px-8 py-4 text-xs uppercase tracking-widest font-extrabold flex items-center justify-center transition-all hover:scale-105"
          >
            {primaryCtaText || 'SHOP NOW'}
            <ArrowRight size={16} className="ml-2" />
          </Link>
          <Link
            href={secondaryCtaLink || '/collections'}
            className="w-full sm:w-auto border border-white text-white hover:bg-white hover:text-black px-8 py-4 text-xs uppercase tracking-widest font-extrabold flex items-center justify-center transition-all"
          >
            {secondaryCtaText || 'EXPLORE COLLECTIONS'}
          </Link>
        </div>
      </div>

      {/* 4. Minimalist Slide Indicators (No arrows, no pause button) */}
      <div className="absolute bottom-5 sm:bottom-7 inset-x-0 z-20 flex items-center justify-center pointer-events-none">
        <div
          className="inline-flex items-center gap-2 bg-black/40 backdrop-blur-md border border-white/10 px-3 py-1.5 rounded-full pointer-events-auto"
          role="tablist"
          aria-label="Background slides"
        >
          {HERO_SLIDES.map((slide, idx) => {
            const isActive = idx === currentIndex
            return (
              <button
                key={slide.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                aria-label={`Go to slide ${idx + 1}`}
                onClick={() => goToSlide(idx)}
                className={`transition-all duration-300 rounded-full cursor-pointer ${
                  isActive ? 'w-6 sm:w-8 h-1.5 bg-white' : 'w-1.5 h-1.5 bg-white/40 hover:bg-white/80'
                }`}
              />
            )
          })}
        </div>
      </div>
    </section>
  )
}
