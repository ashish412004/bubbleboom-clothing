'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, Play, Pause } from 'lucide-react'

export interface HeroSlide {
  id: string
  src: string
  mobileSrc?: string
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
    mobileSrc: '/images/brand/hero-banner-1-mobile.png',
    fallbackSrc: '/images/brand/hero-banner-1.png',
    alt: 'Bubble Boom Streetwear Originals - Editorial Apparel on Concrete Pedestals',
    title: 'Bubble Boom Originals',
  },
  {
    id: 'hero-2',
    src: '/images/brand/hero-banner-2.webp',
    mobileSrc: '/images/brand/hero-banner-2-mobile.jpg',
    fallbackSrc: '/images/brand/hero-banner-2.png',
    alt: 'Bubble Boom Oversized Hoodies & Signature Tees with Velvet Texture',
    title: 'Street Luxury Hoodies',
  },
  {
    id: 'hero-3',
    src: '/images/brand/hero-banner-3.webp',
    mobileSrc: '/images/brand/hero-banner-3-mobile.jpg',
    fallbackSrc: '/images/brand/hero-banner-3.png',
    alt: 'Bubble Boom Capsule Collection Rack under Studio Spotlight',
    title: 'Capsule Drops on Rack',
  },
  {
    id: 'hero-4',
    src: '/images/brand/hero-banner-4.webp',
    mobileSrc: '/images/brand/hero-banner-4-mobile.jpg',
    fallbackSrc: '/images/brand/hero-banner-4.png',
    alt: 'Bubble Boom Official Luxury Unboxing & Streetwear Collection',
    title: 'Official Packaging Unboxing',
  },
]

const AUTOPLAY_INTERVAL = 5000 // 5 seconds per slide

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
  const [isControlsFocused, setIsControlsFocused] = useState(false)
  const [isPausedByUser, setIsPausedByUser] = useState(false)
  const [animKey, setAnimKey] = useState(0)

  const remainingTimeRef = useRef(AUTOPLAY_INTERVAL)
  const startTimeRef = useRef<number>(Date.now())
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const touchStartXRef = useRef<number | null>(null)
  const touchStartYRef = useRef<number | null>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

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

  // Navigation callbacks
  const nextSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % slides.length)
  }, [slides.length])

  const prevSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + slides.length) % slides.length)
  }, [slides.length])

  const goToSlide = useCallback((index: number) => {
    setCurrentIndex(index)
  }, [])

  const togglePlayPause = () => {
    setIsPausedByUser((prev) => !prev)
  }

  // Determine whether autoplay is actively paused
  const isAutoplayPaused =
    isHovered ||
    isControlsFocused ||
    !isTabVisible ||
    isReducedMotion ||
    isPausedByUser ||
    slides.length <= 1

  // Whenever currentIndex changes, reset remaining countdown & animation cycle
  useEffect(() => {
    remainingTimeRef.current = AUTOPLAY_INTERVAL
    setAnimKey((prev) => prev + 1)
  }, [currentIndex])

  // Synchronized countdown timer with pause/resume support
  useEffect(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }

    if (isAutoplayPaused) {
      // Record elapsed time while running so we can resume accurately
      const elapsed = Date.now() - startTimeRef.current
      remainingTimeRef.current = Math.max(0, remainingTimeRef.current - elapsed)
      return
    }

    startTimeRef.current = Date.now()
    const delay = remainingTimeRef.current > 0 ? remainingTimeRef.current : AUTOPLAY_INTERVAL

    timerRef.current = setTimeout(() => {
      nextSlide()
    }, delay)

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
        timerRef.current = null
      }
    }
  }, [currentIndex, isAutoplayPaused, nextSlide])

  // Touch event listeners for mobile swipe gestures
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartXRef.current = e.touches[0].clientX
    touchStartYRef.current = e.touches[0].clientY
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartXRef.current === null || touchStartYRef.current === null) return
    const diffX = touchStartXRef.current - e.changedTouches[0].clientX
    const diffY = touchStartYRef.current - e.changedTouches[0].clientY

    // Trigger only if swipe is predominantly horizontal to preserve vertical scroll
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
      suppressHydrationWarning
      className="relative min-h-[580px] h-auto min-[360px]:h-[88svh] sm:min-h-[620px] md:min-h-[75vh] md:h-[78vh] lg:h-[80vh] max-h-[820px] bg-black text-white flex flex-col md:flex-row md:items-center md:justify-center overflow-hidden"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      aria-roledescription="carousel"
      aria-label="Bubble Boom Brand Hero Banner Carousel"
    >
      {/* Dynamic Keyframes for smooth GPU-accelerated progress animation */}
      <style>{`
        @keyframes heroProgressFill {
          0% { transform: scaleX(0); }
          100% { transform: scaleX(1); }
        }
      `}</style>

      {/* 1. Background Slides with smooth 500ms crossfade */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        {slides.map((slide, index) => {
          const isActive = index === currentIndex
          // Render only the LCP primary slide on initial SSR/HTML payload, mount remaining slides after hydration
          if (index !== 0 && !mounted) return null
          return (
            <div
              key={slide.id}
              className={`absolute inset-0 ${
                isReducedMotion ? 'transition-none' : 'transition-opacity duration-500 ease-in-out'
              } ${isActive ? 'opacity-100 z-[2]' : 'opacity-0 z-[1]'}`}
              aria-hidden={!isActive}
            >
              {/* Desktop Landscape Background (768px and above): completely unchanged */}
              <div className="hidden md:block absolute inset-0">
                <Image
                  src={slide.src}
                  alt={slide.alt}
                  fill
                  priority={index === 0}
                  loading={index === 0 ? undefined : 'lazy'}
                  quality={80}
                  className="object-cover object-[72%_center] sm:object-center select-none"
                  sizes="(min-width: 768px) 100vw, 1px"
                />
              </div>

              {/* Mobile Vertical 9:16 Background (below 768px): supplied vertical mobile photoshoot image */}
              <div className="block md:hidden absolute inset-0">
                <Image
                  src={slide.mobileSrc || slide.src}
                  alt={slide.alt}
                  fill
                  priority={index === 0}
                  loading={index === 0 ? undefined : 'lazy'}
                  quality={85}
                  className="object-cover object-center select-none"
                  sizes="(max-width: 767px) 100vw, 1px"
                />
              </div>
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

      {/* 3A. Mobile 3-Zone Layout (< 768px): Top Text, Middle Fashion Models, Bottom CTAs & Minimal Controls */}
      <div className="md:hidden relative z-10 w-full h-full flex-1 flex flex-col justify-between items-center px-5 sm:px-8 pt-[clamp(48px,7vh,68px)] pb-4 text-center">
        {/* TOP ZONE – HEADING AND SUBTITLE */}
        <div className="flex flex-col items-center">
          <h1 className="text-3xl min-[380px]:text-4xl min-[440px]:text-5xl font-extrabold tracking-tighter uppercase leading-[0.92] text-white drop-shadow-[0_4px_16px_rgba(0,0,0,0.85)]">
            {heroTitle || 'WEAR THE BOOM.'}
          </h1>
          <p className="mt-3 min-[380px]:mt-3.5 text-xs min-[380px]:text-sm text-white/95 max-w-[280px] min-[380px]:max-w-xs font-medium leading-relaxed drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]">
            {heroDescription || 'Every style. Every mood. Make it yours.'}
          </p>
        </div>

        {/* MIDDLE ZONE – UNOBSTRUCTED FASHION IMAGE AREA (Streetwear Models & Blue Lighting) */}
        <div className="flex-1 w-full min-h-[140px] pointer-events-none" aria-hidden="true" />

        {/* BOTTOM ZONE – STACKED CTAS & COMPACT SLIDER INDICATORS */}
        <div className="w-full flex flex-col items-center">
          {/* CTA Buttons: Vertically stacked, centered, identical width, 10-12px gap, 44-50px height */}
          <div className="flex flex-col gap-2.5 sm:gap-3 w-full max-w-[280px] min-[380px]:max-w-[320px] mb-5 min-[380px]:mb-6">
            <Link
              href={primaryCtaLink || '/shop'}
              className="w-full h-11 min-[380px]:h-12 bg-white text-black hover:bg-neutral-200 px-6 text-xs uppercase tracking-widest font-extrabold flex items-center justify-center transition-all active:scale-98 shadow-2xl"
            >
              {primaryCtaText || 'SHOP NOW'}
              <ArrowRight size={15} className="ml-2" />
            </Link>
            <Link
              href={secondaryCtaLink || '/collections'}
              className="w-full h-11 min-[380px]:h-12 bg-black/60 backdrop-blur-md border border-white text-white hover:bg-white hover:text-black px-6 text-xs uppercase tracking-widest font-extrabold flex items-center justify-center transition-all active:scale-98 shadow-2xl"
            >
              {secondaryCtaText || 'EXPLORE COLLECTIONS'}
            </Link>
          </div>

          {/* Small Transparent Slider Progress Indicators Capsule (No Pause/Play button on mobile) */}
          {slides.length > 1 && (
            <div
              className="inline-flex items-center gap-2 bg-black/25 backdrop-blur-md px-3 py-1.5 rounded-full shadow-lg"
              role="tablist"
              aria-label="Mobile hero carousel slide navigation"
            >
              {slides.map((slide, idx) => {
                const isActive = idx === currentIndex
                return (
                  <button
                    key={`mobile-slide-${slide.id}`}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    aria-label={`Go to slide ${idx + 1}: ${slide.title || slide.alt}`}
                    onClick={() => goToSlide(idx)}
                    className="group relative flex items-center justify-center h-8 min-w-[26px] px-0.5 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-white rounded-full"
                  >
                    <span className="sr-only">{`Go to slide ${idx + 1}`}</span>
                    <div
                      className={`h-[3px] rounded-full overflow-hidden transition-all duration-300 ease-out ${
                        isActive
                          ? 'w-[30px] bg-white/30 relative'
                          : 'w-[24px] bg-white/30 group-hover:bg-white/60'
                      }`}
                    >
                      {isActive && (
                        <div
                          key={`mobile-progress-${idx}-${animKey}`}
                          className="hero-progress-fill absolute inset-0 bg-white rounded-full origin-left"
                          style={{
                            animation: isReducedMotion ? 'none' : `heroProgressFill ${AUTOPLAY_INTERVAL}ms linear forwards`,
                            animationPlayState: isAutoplayPaused ? 'paused' : 'running',
                            transformOrigin: 'left',
                          }}
                        />
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* 3B. Desktop Headline, Description & CTAs (768px and above: COMPLETELY UNCHANGED) */}
      <div className="hidden md:flex relative z-10 max-w-4xl mx-auto px-6 sm:px-10 md:px-12 py-10 sm:py-14 md:py-16 pb-16 sm:pb-20 text-center flex-col items-center">
        {/* Hero Main Heading */}
        <h1 className="text-3xl sm:text-6xl md:text-7xl lg:text-8xl font-extrabold tracking-tighter uppercase leading-[0.92] mb-3 sm:mb-4 text-white drop-shadow-[0_4px_16px_rgba(0,0,0,0.85)]">
          {heroTitle || 'WEAR THE BOOM.'}
        </h1>

        {/* Description */}
        <p className="text-xs sm:text-base md:text-lg lg:text-xl text-white/95 max-w-xl font-medium leading-relaxed mb-6 sm:mb-7 drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]">
          {heroDescription || 'Every style. Every mood. Make it yours.'}
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4 w-full sm:w-auto">
          <Link
            href={primaryCtaLink || '/shop'}
            className="w-full sm:w-auto bg-white text-black hover:bg-neutral-200 px-7 sm:px-8 py-3.5 sm:py-4 text-xs uppercase tracking-widest font-extrabold flex items-center justify-center transition-all hover:scale-105 shadow-2xl"
          >
            {primaryCtaText || 'SHOP NOW'}
            <ArrowRight size={16} className="ml-2" />
          </Link>
          <Link
            href={secondaryCtaLink || '/collections'}
            className="w-full sm:w-auto bg-black/50 backdrop-blur-md border border-white text-white hover:bg-white hover:text-black px-7 sm:px-8 py-3.5 sm:py-4 text-xs uppercase tracking-widest font-extrabold flex items-center justify-center transition-all shadow-2xl"
          >
            {secondaryCtaText || 'EXPLORE COLLECTIONS'}
          </Link>
        </div>
      </div>

      {/* 4. Desktop Minimal Animated Progress Bars with Pause/Play Control (768px and above: COMPLETELY UNCHANGED) */}
      {slides.length > 1 && (
        <div className="hidden md:flex absolute bottom-3 sm:bottom-4 md:bottom-5 inset-x-0 z-20 items-center justify-center pointer-events-none">
          <div
            className="inline-flex items-center gap-2 bg-black/45 backdrop-blur-md border border-white/15 px-3 py-1.5 rounded-full pointer-events-auto shadow-2xl"
            role="tablist"
            aria-label="Hero carousel slide navigation"
            onFocus={() => setIsControlsFocused(true)}
            onBlur={() => setIsControlsFocused(false)}
          >
            {/* Subtle Pause/Play button */}
            <button
              type="button"
              onClick={togglePlayPause}
              aria-label={isPausedByUser ? 'Resume autoplay' : 'Pause autoplay'}
              aria-pressed={isPausedByUser}
              className="p-1.5 text-white/70 hover:text-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white rounded-full cursor-pointer mr-0.5"
            >
              {isPausedByUser ? (
                <Play size={11} className="fill-current" />
              ) : (
                <Pause size={11} className="fill-current" />
              )}
            </button>

            {/* Slide Progress Bars */}
            {slides.map((slide, idx) => {
              const isActive = idx === currentIndex
              return (
                <button
                  key={slide.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  aria-label={`Go to slide ${idx + 1}: ${slide.title || slide.alt}`}
                  onClick={() => goToSlide(idx)}
                  className="group relative flex items-center justify-center h-10 min-w-[32px] sm:min-w-[36px] px-0.5 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-white rounded-full"
                >
                  <span className="sr-only">{`Go to slide ${idx + 1}`}</span>
                  {/* Progress bar track: 3.5px height, 44px active width, 28px inactive width, fully rounded */}
                  <div
                    className={`h-[3.5px] rounded-full overflow-hidden transition-all duration-300 ease-out ${
                      isActive
                        ? 'w-[44px] bg-white/30 relative'
                        : 'w-[28px] bg-white/30 group-hover:bg-white/60'
                    }`}
                  >
                    {isActive && (
                      <div
                        key={`progress-${idx}-${animKey}`}
                        className="hero-progress-fill absolute inset-0 bg-white rounded-full origin-left"
                        style={{
                          animation: isReducedMotion ? 'none' : `heroProgressFill ${AUTOPLAY_INTERVAL}ms linear forwards`,
                          animationPlayState: isAutoplayPaused ? 'paused' : 'running',
                          transformOrigin: 'left',
                        }}
                      />
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      )}
    </section>
  )
}
