'use client'

import React, { useEffect, useState } from 'react'

interface SocialConfig {
  whatsapp_support_enabled: boolean
  whatsapp_number: string
  whatsapp_greeting: string
}

export function WhatsAppFloatingButton() {
  const [config, setConfig] = useState<SocialConfig | null>(null)

  useEffect(() => {
    let isMounted = true
    const controller = new AbortController()

    async function loadConfig() {
      try {
        const res = await fetch('/api/social-config', {
          signal: controller.signal,
          headers: { Accept: 'application/json' },
        })
        if (res.ok) {
          const data = await res.json()
          if (isMounted) {
            setConfig(data)
          }
        }
      } catch {
        // Silently swallow aborts or network issues
      }
    }

    loadConfig()

    return () => {
      isMounted = false
      controller.abort()
    }
  }, [])

  // If WhatsApp is disabled or no valid digits are configured, render absolutely nothing
  if (!config || !config.whatsapp_support_enabled || !config.whatsapp_number) {
    return null
  }

  const digits = config.whatsapp_number.replace(/\D/g, '')
  if (digits.length < 10) {
    return null
  }

  const greeting = config.whatsapp_greeting || 'Hi Bubble Boom, I need help with my order or a product.'
  const waUrl = `https://wa.me/${digits}?text=${encodeURIComponent(greeting)}`

  return (
    <aside aria-label="Customer WhatsApp Support">
      <a
        href={waUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Chat with Bubble Boom on WhatsApp"
        title="Chat with Bubble Boom on WhatsApp"
        className="fixed z-40 right-4 bottom-20 sm:right-6 sm:bottom-6 w-12 h-12 sm:w-13 sm:h-13 min-w-[44px] min-h-[44px] rounded-full bg-[#25D366] text-white flex items-center justify-center shadow-lg hover:shadow-xl hover:scale-108 active:scale-95 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#25D366] group"
      >
        {/* Recognizable SVG WhatsApp Icon */}
        <svg
          viewBox="0 0 24 24"
          width="26"
          height="26"
          fill="currentColor"
          className="translate-x-[0.5px]"
          aria-hidden="true"
        >
          <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91C2.13 13.66 2.59 15.36 3.45 16.86L2.05 22L7.3 20.62C8.75 21.41 10.38 21.83 12.04 21.83C17.5 21.83 21.95 17.38 21.95 11.92C21.95 9.27 20.92 6.78 19.05 4.91C17.18 3.04 14.69 2 12.04 2ZM12.05 20.15C10.57 20.15 9.12 19.75 7.85 19L7.55 18.82L4.43 19.64L5.26 16.6L5.06 16.29C4.24 14.98 3.81 13.47 3.81 11.91C3.81 7.37 7.5 3.68 12.05 3.68C14.25 3.68 16.32 4.54 17.88 6.1C19.44 7.66 20.29 9.72 20.29 11.92C20.29 16.46 16.59 20.15 12.05 20.15ZM16.57 14.36C16.32 14.24 15.1 13.64 14.88 13.56C14.65 13.48 14.49 13.44 14.32 13.68C14.16 13.93 13.69 14.48 13.54 14.65C13.4 14.81 13.25 14.83 13 14.71C12.75 14.59 11.95 14.33 11 13.48C10.26 12.82 9.76 12 9.61 11.75C9.47 11.51 9.6 11.37 9.72 11.25C9.83 11.14 9.97 10.96 10.09 10.82C10.22 10.68 10.26 10.58 10.34 10.41C10.42 10.25 10.38 10.11 10.32 9.98C10.26 9.86 9.77 8.66 9.57 8.16C9.37 7.68 9.17 7.74 9.02 7.74C8.88 7.73 8.71 7.73 8.55 7.73C8.39 7.73 8.12 7.79 7.89 8.04C7.67 8.28 7.03 8.88 7.03 10.1C7.03 11.32 7.92 12.5 8.04 12.66C8.16 12.82 9.78 15.32 12.26 16.39C12.85 16.65 13.31 16.8 13.67 16.91C14.26 17.1 14.8 17.07 15.22 17.01C15.7 16.94 16.68 16.41 16.89 15.83C17.09 15.25 17.09 14.75 17.03 14.65C16.97 14.54 16.82 14.48 16.57 14.36Z" />
        </svg>

        {/* Accessible screen-reader label */}
        <span className="sr-only">Chat with Bubble Boom on WhatsApp</span>
      </a>
    </aside>
  )
}
