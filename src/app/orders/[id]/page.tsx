import { redirect } from 'next/navigation'

interface OrderRedirectPageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function OrderRedirectPage({ params, searchParams }: OrderRedirectPageProps) {
  const { id } = await params
  const sParams = await searchParams

  const query = new URLSearchParams()
  for (const [key, value] of Object.entries(sParams)) {
    if (typeof value === 'string') {
      query.set(key, value)
    } else if (Array.isArray(value)) {
      value.forEach((v) => query.append(key, v))
    }
  }

  const queryString = query.toString()
  redirect(`/orders/${encodeURIComponent(id)}/payment${queryString ? `?${queryString}` : ''}`)
}
