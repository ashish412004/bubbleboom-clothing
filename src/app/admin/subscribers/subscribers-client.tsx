'use client'

import { useState } from 'react'
import {
  NewsletterSubscriber,
  SubscriberCounts,
  SubscriberStatus,
} from '@/lib/newsletter'
import {
  Users,
  CheckCircle2,
  Clock,
  UserX,
  Search,
  RefreshCw,
  Download,
} from 'lucide-react'

interface SubscribersClientProps {
  initialSubscribers: NewsletterSubscriber[]
  initialCounts: SubscriberCounts
  initialTotal: number
}

export function SubscribersClient({
  initialSubscribers,
  initialCounts,
  initialTotal,
}: SubscribersClientProps) {
  const [subscribers, setSubscribers] = useState<NewsletterSubscriber[]>(initialSubscribers)
  const [counts, setCounts] = useState<SubscriberCounts>(initialCounts)
  const [activeTab, setActiveTab] = useState<'all' | SubscriberStatus>('all')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)

  const fetchSubscribers = async (statusFilter = activeTab, searchQuery = search) => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (statusFilter !== 'all') params.set('status', statusFilter)
      if (searchQuery.trim()) params.set('search', searchQuery.trim())
      params.set('limit', '100')

      const res = await fetch(`/api/admin/subscribers?${params.toString()}`)
      if (res.ok) {
        const data = await res.json()
        setSubscribers(data.subscribers || [])
        setCounts(data.counts || counts)
      }
    } catch (err) {
      console.error('Failed to reload subscribers:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleTabChange = (tab: 'all' | SubscriberStatus) => {
    setActiveTab(tab)
    fetchSubscribers(tab, search)
  }

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    fetchSubscribers(activeTab, search)
  }

  const exportCsv = () => {
    if (!subscribers.length) return

    const headers = ['Email', 'Status', 'Consent Given', 'Source', 'Subscribed At', 'Confirmed At', 'Unsubscribed At']
    const rows = subscribers.map((s) => [
      s.email,
      s.status,
      s.consent_given ? 'Yes' : 'No',
      s.source || '',
      s.created_at || '',
      s.confirmed_at || '',
      s.unsubscribed_at || '',
    ])

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((r) => r.map((f) => `"${f}"`).join(','))].join('\n')

    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `bubbleboom_subscribers_${activeTab}_${Date.now()}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="space-y-6">
      {/* Metrics Banner */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="border-2 border-black bg-white p-5 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
          <div className="flex items-center justify-between text-neutral-500 mb-2">
            <span className="text-[11px] font-mono uppercase tracking-widest font-bold">Total Audience</span>
            <Users size={16} className="text-black" />
          </div>
          <div className="text-2xl font-black">{counts.total}</div>
          <div className="text-[10px] font-mono text-neutral-500 mt-1">All Recorded Submissions</div>
        </div>

        <div className="border-2 border-black bg-white p-5 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
          <div className="flex items-center justify-between text-neutral-500 mb-2">
            <span className="text-[11px] font-mono uppercase tracking-widest font-bold">Active Squad</span>
            <CheckCircle2 size={16} className="text-black" />
          </div>
          <div className="text-2xl font-black">{counts.active}</div>
          <div className="text-[10px] font-mono text-neutral-500 mt-1">Verified Double Opt-In</div>
        </div>

        <div className="border-2 border-black bg-white p-5 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
          <div className="flex items-center justify-between text-neutral-500 mb-2">
            <span className="text-[11px] font-mono uppercase tracking-widest font-bold">Pending Link</span>
            <Clock size={16} className="text-black" />
          </div>
          <div className="text-2xl font-black">{counts.pending}</div>
          <div className="text-[10px] font-mono text-neutral-500 mt-1">Awaiting Email Click</div>
        </div>

        <div className="border-2 border-black bg-white p-5 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
          <div className="flex items-center justify-between text-neutral-500 mb-2">
            <span className="text-[11px] font-mono uppercase tracking-widest font-bold">Unsubscribed</span>
            <UserX size={16} className="text-black" />
          </div>
          <div className="text-2xl font-black">{counts.unsubscribed}</div>
          <div className="text-[10px] font-mono text-neutral-500 mt-1">Opted Out (1-Click)</div>
        </div>
      </div>

      {/* Control Bar: Tabs, Search, Export */}
      <div className="border-2 border-black bg-white p-4 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0">
          {(
            [
              { key: 'all', label: 'All', count: counts.total },
              { key: 'active', label: 'Active', count: counts.active },
              { key: 'pending', label: 'Pending', count: counts.pending },
              { key: 'unsubscribed', label: 'Unsubscribed', count: counts.unsubscribed },
            ] as const
          ).map((tab) => {
            const isSelected = activeTab === tab.key
            return (
              <button
                key={tab.key}
                onClick={() => handleTabChange(tab.key)}
                className={`px-3 py-1.5 text-xs font-mono font-bold uppercase transition-colors shrink-0 flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-black text-white'
                    : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                }`}
              >
                <span>{tab.label}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-none ${isSelected ? 'bg-neutral-800 text-neutral-300' : 'bg-neutral-200 text-neutral-700'}`}>
                  {tab.count}
                </span>
              </button>
            )
          })}
        </div>

        {/* Search & Actions */}
        <div className="flex items-center gap-2">
          <form onSubmit={handleSearchSubmit} className="relative flex-1 md:w-64">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search email..."
              className="w-full bg-neutral-50 border border-black px-3 py-1.5 pl-8 text-xs font-mono placeholder-neutral-400 focus:outline-none focus:bg-white"
            />
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-500" />
          </form>

          <button
            onClick={() => fetchSubscribers(activeTab, search)}
            disabled={loading}
            title="Refresh List"
            className="p-2 border border-black bg-white hover:bg-neutral-100 transition-colors disabled:opacity-50"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>

          <button
            onClick={exportCsv}
            disabled={!subscribers.length}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-bold border border-black bg-white hover:bg-neutral-100 transition-colors disabled:opacity-50"
          >
            <Download size={14} />
            <span className="hidden sm:inline">Export CSV</span>
          </button>
        </div>
      </div>

      {/* Subscribers Table */}
      <div className="border-2 border-black bg-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-neutral-100 border-b-2 border-black uppercase tracking-wider text-[11px]">
              <tr>
                <th className="p-3.5">Subscriber Email</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5">Source</th>
                <th className="p-3.5">Subscribed Date</th>
                <th className="p-3.5">Confirmed Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {subscribers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-neutral-500">
                    {loading ? 'Loading subscribers...' : 'No subscribers found matching the criteria.'}
                  </td>
                </tr>
              ) : (
                subscribers.map((subscriber) => {
                  return (
                    <tr key={subscriber.id} className="hover:bg-neutral-50 transition-colors">
                      <td className="p-3.5 font-bold">
                        <span className={subscriber.status === 'unsubscribed' ? 'line-through text-neutral-400' : 'text-black'}>
                          {subscriber.email}
                        </span>
                      </td>
                      <td className="p-3.5">
                        {subscriber.status === 'active' && (
                          <span className="inline-flex items-center gap-1 bg-black text-white px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest">
                            <CheckCircle2 size={10} /> Active
                          </span>
                        )}
                        {subscriber.status === 'pending' && (
                          <span className="inline-flex items-center gap-1 bg-neutral-200 text-neutral-800 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest">
                            <Clock size={10} /> Pending
                          </span>
                        )}
                        {subscriber.status === 'unsubscribed' && (
                          <span className="inline-flex items-center gap-1 bg-neutral-100 text-neutral-500 border border-neutral-300 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest">
                            <UserX size={10} /> Unsubscribed
                          </span>
                        )}
                      </td>
                      <td className="p-3.5 text-neutral-600 uppercase text-[11px]">
                        {subscriber.source || 'storefront_footer'}
                      </td>
                      <td className="p-3.5 text-neutral-600">
                        {subscriber.created_at
                          ? new Date(subscriber.created_at).toLocaleDateString('en-IN', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : '—'}
                      </td>
                      <td className="p-3.5 text-neutral-600">
                        {subscriber.confirmed_at
                          ? new Date(subscriber.confirmed_at).toLocaleDateString('en-IN', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : subscriber.status === 'unsubscribed' && subscriber.unsubscribed_at
                          ? `Unsubscribed ${new Date(subscriber.unsubscribed_at).toLocaleDateString('en-IN', {
                              month: 'short',
                              day: 'numeric',
                            })}`
                          : 'Awaiting confirmation'}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
