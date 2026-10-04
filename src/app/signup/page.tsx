import { Suspense } from 'react'
import { Header } from '@/components/header/header'
import { Footer } from '@/components/footer/footer'
import { SignupForm } from './signup-form'

export const metadata = {
  title: 'Create Account | BUBBLE BOOM',
  description: 'Join Bubble Boom to access limited edition streetwear drops and manage orders.',
}

export default function SignupPage() {
  return (
    <div className="flex flex-col min-h-screen bg-white text-black">
      <Header />

      <main className="flex-1 flex items-center justify-center py-16 px-4 bg-[#F8F8F6]">
        <Suspense fallback={<div className="p-8 text-center font-mono text-xs uppercase">Loading registration...</div>}>
          <SignupForm />
        </Suspense>
      </main>

      <Footer />
    </div>
  )
}
