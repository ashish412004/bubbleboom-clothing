'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import {
  Users,
  Search,
  RefreshCw,
  Mail,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Filter,
  CheckSquare,
  Square,
  UserCheck,
  UserX,
  Send,
} from 'lucide-react'
import { CustomerDirectoryEntry } from '@/lib/email-marketing/types'

export default function AdminCustomerDirectoryPage() {
  const router = useRouter()
  const [entries, setEntries] = useState<CustomerDirectoryEntry[]>([])
  const [stats, setStats] = useState({
    totalCustomers: 0,
    totalSubscribers: 0,
    optedInCount: 0,
    unsubscribedCount: 0,
    notOptedInCount: 0,
  })
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [consentFilter, setConsentFilter] = useState<string>('all')
  const [authFilter, setAuthFilter] = useState<string>('all')
  const [selectedEmails, setSelectedEmails] = useState<string[]>([])

  const fetchDirectory = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/email-marketing/customers')
      if (res.ok) {
        const data = await res.json()
        setEntries(data.entries || [])
        setStats({
          totalCustomers: data.totalCustomers || 0,
          totalSubscribers: data.totalSubscribers || 0,
          optedInCount: data.optedInCount || 0,
          unsubscribedCount: data.unsubscribedCount || 0,
          notOptedInCount: data.notOptedInCount || 0,
        })
      }
    } catch {
      toast.error('Failed to load customer directory')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDirectory()
  }, [])

  // Filter only registered customers (plus newsletter-only if desired, but primarily registered customers)
  const filtered = useMemo(() => {
    return entries.filter((item) => {
      // Must match search query
      const matchesSearch =
        searchQuery === '' ||
        item.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.full_name && item.full_name.toLowerCase().includes(searchQuery.toLowerCase()))

      // Must match consent filter
      const matchesConsent =
        consentFilter === 'all' || item.consent_status === consentFilter

      // Must match auth filter
      const matchesAuth =
        authFilter === 'all' ||
        (authFilter === 'google' && item.provider === 'google') ||
        (authFilter === 'email' && item.provider === 'email') ||
        (authFilter === 'newsletter' && item.provider === 'newsletter')

      return matchesSearch && matchesConsent && matchesAuth
    })
  }, [entries, searchQuery, consentFilter, authFilter])

  // Select/Deselect handlers
  const handleToggleSelect = (email: string) => {
    setSelectedEmails((prev) =>
      prev.includes(email) ? prev.filter((e) => e !== email) : [...prev, email]
    )
  }

  const handleSelectAll = () => {
    if (selectedEmails.length === filtered.length) {
      setSelectedEmails([])
    } else {
      setSelectedEmails(filtered.map((e) => e.email))
    }
  }

  // Navigate to Email Marketing Composer with selected customers
  const handleComposeForSelected = () => {
    if (selectedEmails.length === 0) {
      toast.error('Please select at least one customer.')
      return
    }

    const eligibleSelected = entries.filter(
      (e) => selectedEmails.includes(e.email) && e.consent_status === 'opted_in'
    )

    if (eligibleSelected.length === 0) {
      toast.error(
        'None of the selected customers have opted in to marketing emails. Promotional campaigns can only be dispatched to opted-in contacts.'
      )
      return
    }

    if (eligibleSelected.length < selectedEmails.length) {
      toast(
        `${eligibleSelected.length} of ${selectedEmails.length} selected customers have marketing consent and will be eligible.`,
        { icon: 'ℹ️' }
      )
    }

    // Save selected emails to sessionStorage and navigate
    sessionStorage.setItem('bb_campaign_specific_recipients', JSON.stringify(selectedEmails))
    router.push('/admin/email-marketing?tab=composer&audience=specific_customers')
  }

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="border-b border-neutral-800 pb-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono tracking-widest text-neutral-400 uppercase">
              BUBBLE BOOM // REGISTERED CUSTOMERS
            </span>
            <span className="bg-white text-black px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider">
              AUTHORITATIVE
            </span>
          </div>
          <h1 className="text-2xl font-black uppercase tracking-tight text-white mt-1">
            Registered Customer Directory
          </h1>
          <p className="text-xs text-neutral-400 mt-0.5">
            Verified customers registered via Google OAuth, Email OTP, or password. Excludes unconsented promotional sends.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchDirectory}
            className="p-2 bg-neutral-900 border border-neutral-700 text-neutral-300 hover:text-white transition-colors"
            title="Refresh directory"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <Link
            href="/admin/email-marketing"
            className="bg-white text-black px-4 py-2 text-xs font-mono font-bold uppercase tracking-wider hover:bg-neutral-200 transition-colors flex items-center gap-2"
          >
            <Mail className="w-3.5 h-3.5" />
            <span>Open Email Marketing</span>
          </Link>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="p-4 bg-neutral-900 border border-neutral-800">
          <span className="text-[10px] font-mono tracking-wider text-neutral-400 block uppercase">
            Registered Customers
          </span>
          <strong className="text-2xl font-black text-white mt-1 block">
            {stats.totalCustomers}
          </strong>
          <span className="text-[10px] text-neutral-500 font-mono mt-0.5 block">
            Verified Auth Users
          </span>
        </div>

        <div className="p-4 bg-neutral-900 border border-neutral-800">
          <span className="text-[10px] font-mono tracking-wider text-neutral-400 block uppercase">
            Marketing-Eligible
          </span>
          <strong className="text-2xl font-black text-emerald-400 mt-1 block">
            {stats.optedInCount}
          </strong>
          <span className="text-[10px] text-emerald-500/80 font-mono mt-0.5 block">
            Consented to Drops
          </span>
        </div>

        <div className="p-4 bg-neutral-900 border border-neutral-800">
          <span className="text-[10px] font-mono tracking-wider text-neutral-400 block uppercase">
            Not Consented
          </span>
          <strong className="text-2xl font-black text-neutral-300 mt-1 block">
            {stats.notOptedInCount}
          </strong>
          <span className="text-[10px] text-neutral-500 font-mono mt-0.5 block">
            Service Emails Only
          </span>
        </div>

        <div className="p-4 bg-neutral-900 border border-neutral-800">
          <span className="text-[10px] font-mono tracking-wider text-neutral-400 block uppercase">
            Unsubscribed
          </span>
          <strong className="text-2xl font-black text-rose-400 mt-1 block">
            {stats.unsubscribedCount}
          </strong>
          <span className="text-[10px] text-rose-500/80 font-mono mt-0.5 block">
            Suppressed from Sends
          </span>
        </div>

        <div className="p-4 bg-neutral-900 border border-neutral-800">
          <span className="text-[10px] font-mono tracking-wider text-neutral-400 block uppercase">
            Newsletter-Only
          </span>
          <strong className="text-2xl font-black text-neutral-400 mt-1 block">
            {stats.totalSubscribers}
          </strong>
          <span className="text-[10px] text-neutral-500 font-mono mt-0.5 block">
            Legacy Website Opt-Ins
          </span>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="p-4 bg-neutral-900 border border-neutral-800 flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-neutral-500 absolute left-3 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search email, name..."
            className="w-full bg-black border border-neutral-700 pl-9 pr-3 py-2 text-xs text-white placeholder:text-neutral-500 font-mono focus:outline-none focus:border-white"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-mono text-neutral-400">Consent:</span>
            <select
              value={consentFilter}
              onChange={(e) => setConsentFilter(e.target.value)}
              className="bg-black border border-neutral-700 text-xs text-white p-2 font-mono focus:outline-none"
            >
              <option value="all">All Consent ({entries.length})</option>
              <option value="opted_in">Opted-In ({stats.optedInCount})</option>
              <option value="not_opted_in">Not Consented ({stats.notOptedInCount})</option>
              <option value="unsubscribed">Unsubscribed ({stats.unsubscribedCount})</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-mono text-neutral-400">Auth:</span>
            <select
              value={authFilter}
              onChange={(e) => setAuthFilter(e.target.value)}
              className="bg-black border border-neutral-700 text-xs text-white p-2 font-mono focus:outline-none"
            >
              <option value="all">All Providers</option>
              <option value="google">Google OAuth</option>
              <option value="email">Email / Password</option>
              <option value="newsletter">Newsletter Opt-In</option>
            </select>
          </div>

          {selectedEmails.length > 0 && (
            <button
              onClick={handleComposeForSelected}
              className="bg-emerald-500 hover:bg-emerald-400 text-black px-3 py-2 text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Compose to ({selectedEmails.length})</span>
            </button>
          )}
        </div>
      </div>

      {/* Directory Table */}
      {loading ? (
        <div className="p-12 text-center text-xs font-mono text-neutral-400 bg-neutral-900 border border-neutral-800">
          Loading verified registered customers...
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-12 text-center bg-neutral-900 border border-neutral-800">
          <Users className="w-10 h-10 text-neutral-600 mx-auto mb-2" />
          <h3 className="text-sm font-black uppercase text-white tracking-wider">
            No Customer Records Found
          </h3>
          <p className="text-xs text-neutral-400 mt-1 max-w-sm mx-auto font-mono">
            No customer accounts match your current filter criteria.
          </p>
        </div>
      ) : (
        <div className="border border-neutral-800 bg-neutral-900 overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-black text-neutral-400 uppercase text-[10px] border-b border-neutral-800 select-none">
              <tr>
                <th className="p-3 w-10 text-center">
                  <button
                    onClick={handleSelectAll}
                    className="text-neutral-400 hover:text-white cursor-pointer"
                  >
                    {selectedEmails.length === filtered.length && filtered.length > 0 ? (
                      <CheckSquare className="w-4 h-4 text-white" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                  </button>
                </th>
                <th className="p-3">Customer Email</th>
                <th className="p-3">Name</th>
                <th className="p-3">Authentication Method</th>
                <th className="p-3">Registered On</th>
                <th className="p-3">Last Sign In</th>
                <th className="p-3">Marketing Permission</th>
                <th className="p-3 text-right">Orders</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800 text-neutral-300">
              {filtered.map((entry) => {
                const isSelected = selectedEmails.includes(entry.email)
                return (
                  <tr
                    key={entry.email}
                    className={`hover:bg-neutral-800/40 transition-colors ${
                      isSelected ? 'bg-neutral-800/60' : ''
                    }`}
                  >
                    <td className="p-3 text-center">
                      <button
                        onClick={() => handleToggleSelect(entry.email)}
                        className="text-neutral-400 hover:text-white cursor-pointer"
                      >
                        {isSelected ? (
                          <CheckSquare className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <Square className="w-4 h-4" />
                        )}
                      </button>
                    </td>
                    <td className="p-3 font-bold text-white max-w-xs truncate">
                      {entry.email}
                    </td>
                    <td className="p-3 text-neutral-400">
                      {entry.full_name || '—'}
                    </td>
                    <td className="p-3">
                      <span className="text-[10px] bg-black border border-neutral-800 text-neutral-300 px-2 py-0.5 rounded-sm uppercase tracking-wider inline-block">
                        {entry.auth_method_label}
                      </span>
                    </td>
                    <td className="p-3 text-neutral-400 whitespace-nowrap">
                      {entry.created_at
                        ? new Date(entry.created_at).toLocaleDateString('en-GB', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })
                        : '—'}
                    </td>
                    <td className="p-3 text-neutral-400 whitespace-nowrap">
                      {entry.last_sign_in_at
                        ? new Date(entry.last_sign_in_at).toLocaleDateString('en-GB', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })
                        : '—'}
                    </td>
                    <td className="p-3">
                      <span
                        className={`text-[9px] font-bold px-2 py-0.5 rounded-sm uppercase tracking-wider inline-block ${
                          entry.consent_status === 'opted_in'
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                            : entry.consent_status === 'unsubscribed'
                            ? 'bg-rose-950 text-rose-400 border border-rose-800'
                            : 'bg-neutral-800 text-neutral-400 border border-neutral-700'
                        }`}
                      >
                        {entry.consent_status === 'opted_in'
                          ? 'Opted In'
                          : entry.consent_status === 'unsubscribed'
                          ? 'Unsubscribed'
                          : 'Not Consented'}
                      </span>
                    </td>
                    <td className="p-3 text-right text-neutral-400 font-mono">
                      {entry.orders_count || 0}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Safety Notice */}
      <div className="p-4 bg-black border border-neutral-800 text-xs font-mono text-neutral-400 flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <strong className="text-white block uppercase tracking-wider">
            Strict Marketing Consent &amp; Privacy Safeguards
          </strong>
          <p className="leading-relaxed">
            Registering an account or logging in through Bubble Boom does not automatically grant promotional marketing consent. Only customers with active marketing permissions receive promotional emails. Essential transactional emails (receipts, delivery updates) are sent separately regardless of marketing preference.
          </p>
        </div>
      </div>
    </div>
  )
}
