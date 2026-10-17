import { getCurrentUser } from '@/lib/auth'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Wishlist | BUBBLE BOOM',
  description: 'Your saved wardrobe pieces and limited edition streetwear drops.',
}

export default async function WishlistPage() {
  const user = await getCurrentUser()
  if (!user) {
    redirect('/login?next=/wishlist')
  }

  redirect('/account/saved-drops')
}
