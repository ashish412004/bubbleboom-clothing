import { Header } from '@/components/header/header'
import { Footer } from '@/components/footer/footer'
import { getSocialSettings } from '@/lib/settings'
import { ContactClient } from './contact-client'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Contact Us | Bubble Boom',
  description: 'Reach out to Bubble Boom customer support for order assistance, shipping inquiries, and fit advice.',
  alternates: {
    canonical: 'https://bubbleboomstore.com/contact',
  },
  openGraph: {
    title: 'Contact Us | Bubble Boom',
    description: 'Reach out to Bubble Boom customer support for order assistance, shipping inquiries, and fit advice.',
    url: 'https://bubbleboomstore.com/contact',
    siteName: 'Bubble Boom',
    type: 'website',
  },
}

export default async function ContactPage() {
  const social = await getSocialSettings()

  return (
    <div className="flex flex-col min-h-screen bg-white text-black">
      <Header />

      <main className="flex-1 bg-[#F8F8F6]">
        <ContactClient initialSocial={social} />
      </main>

      <Footer />
    </div>
  )
}
