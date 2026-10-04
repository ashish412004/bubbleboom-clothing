import { Header } from '@/components/header/header'
import { Footer } from '@/components/footer/footer'
import { ContactClient } from './contact-client'

export const metadata = {
  title: 'Contact Us | BUBBLE BOOM',
  description: 'Reach out to Bubble Boom customer care for order updates, returns, and fit consultations.',
}

export default function ContactPage() {
  return (
    <div className="flex flex-col min-h-screen bg-white text-black">
      <Header />

      <main className="flex-1 bg-[#F8F8F6]">
        <ContactClient />
      </main>

      <Footer />
    </div>
  )
}
