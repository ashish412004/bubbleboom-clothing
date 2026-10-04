'use client'

import { useEffect } from 'react'

declare global {
  interface Window {
    dataLayer?: any[]
    fbq?: any
  }
}

export function AnalyticsProvider() {
  useEffect(() => {
    // GA4
    if (process.env.NEXT_PUBLIC_GA4_ID) {
      const script = document.createElement('script')
      script.src = `https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GA4_ID}`
      script.async = true
      document.head.appendChild(script)

      window.dataLayer = window.dataLayer || []
      function gtag(...args: any[]) {
        if (window.dataLayer) {
          window.dataLayer.push(args)
        }
      }
      gtag('js', new Date())
      gtag('config', process.env.NEXT_PUBLIC_GA4_ID)
    }

    // Meta Pixel
    if (process.env.NEXT_PUBLIC_META_PIXEL_ID) {
      const script = document.createElement('script')
      script.innerHTML = `
        !function(f,b,e,v,n,t,s)
        {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
        n.callMethod.apply(n,arguments):n.queue.push(arguments)};
        if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
        n.queue=[];t=b.createElement(e);t.async=!0;
        t.src=v;s=b.getElementsByTagName(e)[0];
        s.parentNode.insertBefore(t,s)}(window, document,'script',
        'https://connect.facebook.net/en_US/fbevents.js');
        fbq('init', '${process.env.NEXT_PUBLIC_META_PIXEL_ID}');
        fbq('track', 'PageView');
      `
      document.head.appendChild(script)

      const noscript = document.createElement('noscript')
      noscript.innerHTML = `
        <img height="1" width="1" style="display:none"
        src="https://www.facebook.com/tr?id=${process.env.NEXT_PUBLIC_META_PIXEL_ID}&ev=PageView&noscript=1"/>
      `
      document.head.appendChild(noscript)
    }
  }, [])

  return null
}
