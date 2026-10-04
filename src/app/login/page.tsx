import { Suspense } from 'react'
import { Header } from '@/components/header/header'
import { Footer } from '@/components/footer/footer'
import { LoginForm } from './login-form'

export const metadata = {
  title: 'Sign In | BUBBLE BOOM',
  description: 'Sign in to your Bubble Boom account for fast checkout, order history, and saved capsules.',
}

export default function LoginPage() {
  return (
    <div className="flex flex-col min-h-screen bg-white text-black">
      <Header />

      <main className="flex-1 flex items-center justify-center py-16 px-4 bg-[#F8F8F6]">
        <Suspense fallback={<div className="p-8 text-center font-mono text-xs uppercase">Loading login...</div>}>
          <LoginForm />
        </Suspense>
      </main>

      <Footer />
    </div>
  )
}
