import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ToasterProvider } from "@/components/providers/toaster-provider";
import { CartDrawer } from "@/components/cart/cart-drawer";
import { SearchDrawer } from "@/components/search/search-drawer";
import { WhatsAppFloatingButton } from "@/components/support/whatsapp-floating-button";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#000000",
};

export const metadata: Metadata = {
  metadataBase: new URL("https://bubbleboomstore.com"),
  title: {
    default: "Bubble Boom | Oversized T-Shirts, Hoodies & Streetwear",
    template: "%s | Bubble Boom",
  },
  description: "Discover Bubble Boom streetwear. Explore bold fashion, oversized essentials and upcoming collections. Wear the Boom.",
  keywords: ["Bubble Boom", "streetwear", "oversized t-shirts", "hoodies", "cargo pants", "fashion", "Indian streetwear"],
  alternates: {
    canonical: "https://bubbleboomstore.com",
  },
  openGraph: {
    title: "Bubble Boom | Oversized T-Shirts, Hoodies & Streetwear",
    description: "Discover Bubble Boom streetwear. Explore bold fashion, oversized essentials and upcoming collections. Wear the Boom.",
    url: "https://bubbleboomstore.com",
    siteName: "Bubble Boom",
    locale: "en_IN",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Bubble Boom | Oversized T-Shirts, Hoodies & Streetwear",
    description: "Discover Bubble Boom streetwear. Explore bold fashion, oversized essentials and upcoming collections. Wear the Boom.",
    site: "@bubbleboomstore",
    creator: "@bubbleboomstore",
  },
  icons: {
    icon: "/favicon.ico",
  },
  robots: {
    index: true,
    follow: true,
  },
};


export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${inter.variable} h-full antialiased`}>
      <body suppressHydrationWarning className="min-h-full flex flex-col">
        <ToasterProvider />
        <CartDrawer />
        {children}
        <SearchDrawer />
        <WhatsAppFloatingButton />
      </body>
    </html>
  );
}
