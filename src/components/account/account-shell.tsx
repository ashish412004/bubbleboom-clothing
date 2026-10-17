import { Header } from '@/components/header/header'
import { Footer } from '@/components/footer/footer'
import { AccountNav, UserProfileSummary } from '@/components/account/account-nav'

interface AccountShellProps {
  children: React.ReactNode
  user?: UserProfileSummary | null
}

export function AccountShell({ children, user }: AccountShellProps) {
  return (
    <div className="flex flex-col min-h-screen bg-white text-black">
      <Header />

      {/* Spacious Light-Grey Main Content Canvas (#F5F5F7) */}
      <main className="flex-1 bg-[#F5F5F7] py-6 sm:py-8 lg:py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Two-Column Account Dashboard Layout */}
          <div className="flex flex-col md:flex-row gap-6 lg:gap-8 items-start">
            {/* Left Sidebar (270-300px width on desktop) */}
            <aside className="w-full md:w-[280px] lg:w-[290px] shrink-0">
              <AccountNav user={user} />
            </aside>

            {/* Right Main Content Area: White Rounded Content Panel */}
            <section className="flex-1 min-w-0 w-full">
              <div className="bg-white rounded-2xl md:rounded-[20px] shadow-xs border border-neutral-200/80 p-5 sm:p-7 lg:p-8">
                {children}
              </div>
            </section>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
