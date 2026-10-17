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
  title: {
    default: "BUBBLE BOOM | Wear The Boom",
    template: "%s | BUBBLE BOOM",
  },
  description: "Bubble Boom - Premium Indian Fashion & Streetwear. Wear The Boom. Every style. Every mood. Make it yours.",
  keywords: ["Bubble Boom", "Indian streetwear", "oversized t-shirts", "hoodies", "cargo pants", "fashion"],
  icons: {
    icon: "/favicon.ico",
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
