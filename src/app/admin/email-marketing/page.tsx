'use client'

import { useState, useEffect, useMemo, Suspense } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useSearchParams, useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import {
  Mail,
  Send,
  Plus,
  RefreshCw,
  Eye,
  Smartphone,
  Monitor,
  CheckCircle2,
  AlertCircle,
  Copy,
  Trash2,
  Users,
  Search,
  Upload,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  Sparkles,
  FileText,
  Filter,
  Check,
  X,
  AlignLeft,
  AlignCenter,
  AlignRight,
} from 'lucide-react'
import {
  CampaignContent,
  CampaignTemplateId,
  CampaignAudienceType,
  CustomerDirectoryEntry,
  MarketingCampaign,
} from '@/lib/email-marketing/types'
import {
  CAMPAIGN_PRESET_TEMPLATES,
  OFFICIAL_WEBSITE_URL,
  DEFAULT_SUPPORT_EMAIL,
  generateCampaignHtml,
} from '@/lib/email-marketing/templates'

type StudioTab = 'campaigns' | 'composer' | 'customers' | 'subscribers'
type PreviewDevice = 'desktop' | 'mobile'

function EmailMarketingStudioContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [activeTab, setActiveTab] = useState<StudioTab>('campaigns')
  const [loading, setLoading] = useState(false)

  // Campaigns list state
  const [campaigns, setCampaigns] = useState<MarketingCampaign[]>([])
  const [loadingCampaigns, setLoadingCampaigns] = useState(false)

  // Customer Directory state
  const [directoryEntries, setDirectoryEntries] = useState<CustomerDirectoryEntry[]>([])
  const [directoryStats, setDirectoryStats] = useState({
    totalCustomers: 0,
    totalSubscribers: 0,
    optedInCount: 0,
    unsubscribedCount: 0,
    notOptedInCount: 0,
  })
  const [loadingDirectory, setLoadingDirectory] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [consentFilter, setConsentFilter] = useState<string>('all')

  // Composer state
  const [campaignId, setCampaignId] = useState<string | null>(null)
  const [campaignName, setCampaignName] = useState('')
  const [subject, setSubject] = useState('')
  const [preheader, setPreheader] = useState('')
  const [senderName, setSenderName] = useState('Bubble Boom')
  const [audienceType, setAudienceType] = useState<CampaignAudienceType>('all_registered')
  const [selectedTemplate, setSelectedTemplate] = useState<CampaignTemplateId>('coming_soon')

  // Specific customers recipient pool
  const [specificEmails, setSpecificEmails] = useState<string[]>([])
  const [specificEmailInput, setSpecificEmailInput] = useState('')

  // Design & Typography state
  const [heading, setHeading] = useState('')
  const [subheading, setSubheading] = useState('')
  const [bodyText, setBodyText] = useState('')
  const [heroImageUrl, setHeroImageUrl] = useState('')
  const [heroImageAlt, setHeroImageAlt] = useState('')
  const [textAlignment, setTextAlignment] = useState<'left' | 'center' | 'right'>('center')
  const [textColor, setTextColor] = useState('#262626')
  const [cardBgColor, setCardBgColor] = useState('#ffffff')

  // OPTIONAL CTA BUTTON (Default: false)
  const [showCta, setShowCta] = useState(false)
  const [ctaText, setCtaText] = useState('EXPLORE COLLECTION')
  const [ctaUrl, setCtaUrl] = useState('https://bubbleboomstore.com/shop')
  const [ctaStyle, setCtaStyle] = useState<'black' | 'white' | 'outline' | 'custom'>('black')
  const [ctaBgColor, setCtaBgColor] = useState('#000000')
  const [ctaTextColor, setCtaTextColor] = useState('#ffffff')
  const [ctaAlignment, setCtaAlignment] = useState<'left' | 'center' | 'right'>('center')

  // Secondary blocks
  const [secondaryBlocks, setSecondaryBlocks] = useState<
    Array<{ title?: string; text?: string; image_url?: string }>
  >([])

  // Preview state
  const [previewDevice, setPreviewDevice] = useState<PreviewDevice>('desktop')
  const [showRawHtml, setShowRawHtml] = useState(false)

  // Test email modal
  const [showTestModal, setShowTestModal] = useState(false)
  const [testEmailAddress, setTestEmailAddress] = useState('hhshukla241099@gmail.com')
  const [sendingTest, setSendingTest] = useState(false)

  // Live dispatch confirmation modal
  const [showDispatchModal, setShowDispatchModal] = useState(false)
  const [dispatching, setDispatching] = useState(false)

  // Uploading hero banner
  const [uploadingBanner, setUploadingBanner] = useState(false)

  // Fetch campaigns
  const fetchCampaigns = async () => {
    setLoadingCampaigns(true)
    try {
      const res = await fetch('/api/admin/email-marketing/campaigns')
      if (res.ok) {
        const data = await res.json()
        setCampaigns(data.campaigns || [])
      }
    } catch {
      // ignore
    } finally {
      setLoadingCampaigns(false)
    }
  }

  // Fetch customer directory
  const fetchDirectory = async () => {
    setLoadingDirectory(true)
    try {
      const res = await fetch('/api/admin/email-marketing/customers')
      if (res.ok) {
        const data = await res.json()
        setDirectoryEntries(data.entries || [])
        setDirectoryStats({
          totalCustomers: data.totalCustomers || 0,
          totalSubscribers: data.totalSubscribers || 0,
          optedInCount: data.optedInCount || 0,
          unsubscribedCount: data.unsubscribedCount || 0,
          notOptedInCount: data.notOptedInCount || 0,
        })
      }
    } catch {
      // ignore
    } finally {
      setLoadingDirectory(false)
    }
  }

  useEffect(() => {
    fetchCampaigns()
    fetchDirectory()
  }, [])

  // Check URL params on mount
  useEffect(() => {
    const tab = searchParams.get('tab')
    const aud = searchParams.get('audience')
    if (tab === 'composer') {
      setActiveTab('composer')
    }
    if (aud === 'specific_customers') {
      setAudienceType('specific_customers')
      const stored = sessionStorage.getItem('bb_campaign_specific_recipients')
      if (stored) {
        try {
          const parsed = JSON.parse(stored)
          if (Array.isArray(parsed)) {
            setSpecificEmails(parsed)
          }
        } catch {}
      }
    }
  }, [searchParams])

  // Calculate live audience breakdown with strict marketing consent enforcement
  const audienceBreakdown = useMemo(() => {
    let pool: CustomerDirectoryEntry[] = []

    if (audienceType === 'all_registered' || audienceType === 'marketing_eligible_registered') {
      pool = directoryEntries.filter((e) => e.is_registered_customer)
    } else if (audienceType === 'specific_customers') {
      const specificSet = new Set(specificEmails.map((e) => e.trim().toLowerCase()))
      pool = directoryEntries.filter((e) => specificSet.has(e.email))
    } else {
      // 'existing_opted_in' or 'all_opted_in'
      pool = directoryEntries
    }

    const eligibleRecipients: { email: string; name?: string }[] = []
    let noConsentCount = 0
    let unsubscribedCount = 0

    const seen = new Set<string>()

    for (const contact of pool) {
      if (contact.consent_status === 'opted_in') {
        if (!seen.has(contact.email)) {
          seen.add(contact.email)
          eligibleRecipients.push({
            email: contact.email,
            name: contact.full_name || undefined,
          })
        }
      } else if (contact.consent_status === 'unsubscribed') {
        unsubscribedCount++
      } else {
        noConsentCount++
      }
    }

    const totalCount = pool.length
    const eligibleCount = eligibleRecipients.length
    const excludedCount = totalCount - eligibleCount

    return {
      totalCount,
      eligibleCount,
      excludedCount,
      eligibleRecipients,
      exclusionReasons: {
        no_consent: noConsentCount,
        unsubscribed: unsubscribedCount,
      },
    }
  }, [directoryEntries, audienceType, specificEmails])

  // Apply a template preset
  const handleApplyPreset = (templateId: CampaignTemplateId) => {
    const preset = CAMPAIGN_PRESET_TEMPLATES[templateId] || CAMPAIGN_PRESET_TEMPLATES.coming_soon
    if (!preset) return

    setSelectedTemplate(templateId)
    setSubject(preset.defaultSubject)
    setPreheader(preset.defaultPreheader)
    setHeading(preset.defaultContent.heading || '')
    setSubheading(preset.defaultContent.subheading || '')
    setBodyText(preset.defaultContent.body_text || '')
    setHeroImageUrl(preset.defaultContent.hero_image_url || '')
    setHeroImageAlt(preset.defaultContent.hero_image_alt || '')
    setTextAlignment(preset.defaultContent.text_alignment || 'center')
    // Default CTA is strictly OFF
    setShowCta(Boolean(preset.defaultContent.show_cta))
    setCtaText(preset.defaultContent.cta_text || 'VISIT STORE')
    setCtaUrl(preset.defaultContent.cta_url || 'https://bubbleboomstore.com')
    setCtaStyle(preset.defaultContent.cta_style || 'black')
    setCtaAlignment(preset.defaultContent.cta_alignment || 'center')
    setSecondaryBlocks(preset.defaultContent.secondary_blocks || [])

    toast.success(`Loaded preset: ${preset.name}`)
  }

  // Initialize new composer
  const handleNewCampaign = (templateId: CampaignTemplateId = 'coming_soon') => {
    setCampaignId(null)
    setCampaignName(`Campaign ${new Date().toLocaleDateString('en-GB')}`)
    setAudienceType('all_registered')
    handleApplyPreset(templateId)
    setActiveTab('composer')
  }

  // Edit existing campaign
  const handleEditCampaign = (camp: MarketingCampaign) => {
    setCampaignId(camp.id)
    setCampaignName(camp.name)
    setSubject(camp.subject)
    setPreheader(camp.preheader || '')
    setSenderName(camp.sender_name || 'Bubble Boom')
    setAudienceType(camp.audience_type)
    setSelectedTemplate(camp.template_id)

    const c = camp.content || {}
    setHeading(c.heading || '')
    setSubheading(c.subheading || '')
    setBodyText(c.body_text || '')
    setHeroImageUrl(c.hero_image_url || '')
    setHeroImageAlt(c.hero_image_alt || '')
    setTextAlignment(c.text_alignment || 'center')
    setTextColor(c.text_color || '#262626')
    setCardBgColor(c.card_background_color || '#ffffff')

    setShowCta(Boolean(c.show_cta))
    setCtaText(c.cta_text || 'EXPLORE COLLECTION')
    setCtaUrl(c.cta_url || 'https://bubbleboomstore.com/shop')
    setCtaStyle(c.cta_style || 'black')
    setCtaBgColor(c.cta_bg_color || '#000000')
    setCtaTextColor(c.cta_text_color || '#ffffff')
    setCtaAlignment(c.cta_alignment || 'center')
    setSecondaryBlocks(c.secondary_blocks || [])
    if (Array.isArray(c.specific_recipients)) {
      setSpecificEmails(c.specific_recipients)
    }

    setActiveTab('composer')
  }

  // Duplicate campaign
  const handleDuplicateCampaign = (camp: MarketingCampaign) => {
    handleEditCampaign(camp)
    setCampaignId(null)
    setCampaignName(`${camp.name} (Copy)`)
    toast.success('Campaign duplicated as a new draft.')
  }

  // Delete campaign
  const handleDeleteCampaign = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete campaign "${name}"?`)) return

    try {
      const res = await fetch(`/api/admin/email-marketing/campaigns/${id}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error('Failed to delete')
      setCampaigns((prev) => prev.filter((c) => c.id !== id))
      toast.success('Campaign deleted successfully')
    } catch {
      toast.error('Failed to delete campaign')
    }
  }

  // Handle banner upload
  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingBanner(true)
    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch('/api/admin/upload', {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Banner upload failed')
      }

      if (data.urls && data.urls[0]) {
        setHeroImageUrl(data.urls[0])
        toast.success('Promotional poster uploaded successfully!')
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to upload image')
    } finally {
      setUploadingBanner(false)
    }
  }

  // Add specific email
  const handleAddSpecificEmail = () => {
    const clean = specificEmailInput.trim().toLowerCase()
    if (!clean || !clean.includes('@')) {
      toast.error('Please enter a valid email address.')
      return
    }
    if (specificEmails.includes(clean)) {
      toast.error('Email already in list.')
      return
    }
    setSpecificEmails((prev) => [...prev, clean])
    setSpecificEmailInput('')
  }

  const handleRemoveSpecificEmail = (email: string) => {
    setSpecificEmails((prev) => prev.filter((e) => e !== email))
  }

  // Construct current campaign content
  const currentContent: CampaignContent = useMemo(() => {
    return {
      heading: heading.trim(),
      subheading: subheading.trim(),
      body_text: bodyText.trim(),
      hero_image_url: heroImageUrl.trim(),
      hero_image_alt: heroImageAlt.trim(),
      text_alignment: textAlignment,
      text_color: textColor,
      card_background_color: cardBgColor,
      // Optional CTA Button: strictly boolean
      show_cta: showCta,
      cta_text: ctaText.trim(),
      cta_url: ctaUrl.trim(),
      cta_style: ctaStyle,
      cta_bg_color: ctaBgColor,
      cta_text_color: ctaTextColor,
      cta_alignment: ctaAlignment,
      secondary_blocks: secondaryBlocks,
      specific_recipients: specificEmails,
    }
  }, [
    heading,
    subheading,
    bodyText,
    heroImageUrl,
    heroImageAlt,
    textAlignment,
    textColor,
    cardBgColor,
    showCta,
    ctaText,
    ctaUrl,
    ctaStyle,
    ctaBgColor,
    ctaTextColor,
    ctaAlignment,
    secondaryBlocks,
    specificEmails,
  ])

  // Current compiled HTML
  const compiledHtml = useMemo(() => {
    return generateCampaignHtml(currentContent, {
      campaignName: campaignName || 'Bubble Boom Preview',
      subject: subject || 'Announcement',
      preheader: preheader || undefined,
      senderName,
      unsubscribeUrl: `${OFFICIAL_WEBSITE_URL}/unsubscribe?email=preview@bubbleboomstore.com`,
      recipientEmail: 'preview@bubbleboomstore.com',
    })
  }, [currentContent, campaignName, subject, preheader, senderName])

  // Save Draft
  const handleSaveDraft = async () => {
    if (!campaignName.trim()) {
      toast.error('Please enter a campaign name.')
      return
    }
    if (!subject.trim()) {
      toast.error('Please enter an email subject line.')
      return
    }

    setLoading(true)
    try {
      const payload = {
        name: campaignName.trim(),
        subject: subject.trim(),
        preheader: preheader.trim(),
        sender_name: senderName.trim(),
        template_id: selectedTemplate,
        audience_type: audienceType,
        content: currentContent,
        status: 'draft',
      }

      const url = campaignId
        ? `/api/admin/email-marketing/campaigns/${campaignId}`
        : '/api/admin/email-marketing/campaigns'
      const method = campaignId ? 'PATCH' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await res.json()
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to save campaign')
      }

      if (data.campaign?.id) {
        setCampaignId(data.campaign.id)
      }

      toast.success('Campaign draft saved successfully!')
      fetchCampaigns()
    } catch (err: any) {
      toast.error(err.message || 'Failed to save draft')
    } finally {
      setLoading(false)
    }
  }

  // Send Test Email
  const handleSendTestEmail = async () => {
    if (!testEmailAddress || !testEmailAddress.includes('@')) {
      toast.error('Please enter a valid test recipient email address.')
      return
    }

    let targetId = campaignId
    if (!targetId) {
      try {
        const payload = {
          name: campaignName.trim() || 'Untitled Test Draft',
          subject: subject.trim() || 'Bubble Boom Test Preview',
          preheader: preheader.trim(),
          sender_name: senderName.trim(),
          template_id: selectedTemplate,
          audience_type: audienceType,
          content: currentContent,
          status: 'draft',
        }
        const res = await fetch('/api/admin/email-marketing/campaigns', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        const data = await res.json()
        if (data.campaign?.id) {
          targetId = data.campaign.id
          setCampaignId(targetId)
        }
      } catch {}
    }

    if (!targetId) {
      toast.error('Please save the draft before sending a test email.')
      return
    }

    setSendingTest(true)
    try {
      const res = await fetch(`/api/admin/email-marketing/campaigns/${targetId}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          is_test: true,
          test_email: testEmailAddress.trim().toLowerCase(),
        }),
      })

      const data = await res.json()
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Test email failed')
      }

      toast.success(`Test preview sent to ${testEmailAddress}! Check your inbox.`)
      setShowTestModal(false)
    } catch (err: any) {
      toast.error(err.message || 'Failed to send test email')
    } finally {
      setSendingTest(false)
    }
  }

  // Live Dispatch Campaign
  const handleDispatchCampaign = async () => {
    if (!campaignId) {
      toast.error('Please save your campaign draft first.')
      return
    }
    if (audienceBreakdown.eligibleCount === 0) {
      toast.error('No eligible opted-in contacts found in this audience pool.')
      return
    }

    setDispatching(true)
    try {
      const res = await fetch(`/api/admin/email-marketing/campaigns/${campaignId}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_test: false }),
      })

      const data = await res.json()
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to dispatch campaign')
      }

      toast.success(
        `Campaign dispatched successfully! Sent to ${data.summary?.sent || 0} opted-in recipients.`
      )
      setShowDispatchModal(false)
      fetchCampaigns()
      setActiveTab('campaigns')
    } catch (err: any) {
      toast.error(err.message || 'Campaign dispatch failed')
    } finally {
      setDispatching(false)
    }
  }

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="border-b border-neutral-800 pb-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono tracking-widest text-neutral-400 uppercase">
              BUBBLE BOOM // EMAIL MARKETING STUDIO
            </span>
            <span className="bg-white text-black px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider">
              ENTERPRISE
            </span>
          </div>
          <h1 className="text-2xl font-black uppercase tracking-tight text-white mt-1">
            Email Marketing Studio
          </h1>
          <p className="text-xs text-neutral-400 mt-0.5">
            Design streetwear drops, select registered audiences with strict consent filtering, and dispatch campaigns.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            href="/admin/customers"
            className="bg-neutral-900 border border-neutral-700 text-neutral-300 px-3.5 py-2 text-xs font-mono uppercase tracking-wider hover:text-white hover:border-neutral-500 transition-colors flex items-center gap-2"
          >
            <Users className="w-3.5 h-3.5" />
            <span>Customer Directory</span>
          </Link>

          <button
            onClick={() => handleNewCampaign('coming_soon')}
            className="bg-white text-black px-4 py-2 text-xs font-mono font-bold uppercase tracking-wider hover:bg-neutral-200 transition-colors flex items-center gap-2 cursor-pointer shadow-[3px_3px_0px_0px_rgba(255,255,255,0.3)]"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create Campaign</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-neutral-800 gap-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('campaigns')}
          className={`px-4 py-2 text-xs font-mono uppercase tracking-wider transition-colors border-b-2 cursor-pointer ${
            activeTab === 'campaigns'
              ? 'border-white text-white font-bold'
              : 'border-transparent text-neutral-400 hover:text-white'
          }`}
        >
          Campaigns &amp; Sent History ({campaigns.length})
        </button>

        <button
          onClick={() => setActiveTab('composer')}
          className={`px-4 py-2 text-xs font-mono uppercase tracking-wider transition-colors border-b-2 cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'composer'
              ? 'border-white text-white font-bold'
              : 'border-transparent text-neutral-400 hover:text-white'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Design Studio Composer {campaignId && '(Active)'}</span>
        </button>

        <Link
          href="/admin/customers"
          className="px-4 py-2 text-xs font-mono uppercase tracking-wider transition-colors border-b-2 border-transparent text-neutral-400 hover:text-white flex items-center gap-1.5"
        >
          <Users className="w-3.5 h-3.5" />
          <span>Registered Customers ({directoryStats.totalCustomers})</span>
        </Link>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: CAMPAIGNS & SENT HISTORY                                           */}
      {/* ========================================================================= */}
      {activeTab === 'campaigns' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="p-4 bg-neutral-900 border border-neutral-800">
              <span className="text-[10px] font-mono tracking-wider text-neutral-400 block uppercase">
                Total Campaigns
              </span>
              <span className="text-2xl font-black text-white mt-1 block">
                {campaigns.length}
              </span>
            </div>
            <div className="p-4 bg-neutral-900 border border-neutral-800">
              <span className="text-[10px] font-mono tracking-wider text-neutral-400 block uppercase">
                Sent Dispatches
              </span>
              <span className="text-2xl font-black text-emerald-400 mt-1 block">
                {campaigns.filter((c) => c.status === 'sent').length}
              </span>
            </div>
            <div className="p-4 bg-neutral-900 border border-neutral-800">
              <span className="text-[10px] font-mono tracking-wider text-neutral-400 block uppercase">
                Saved Drafts
              </span>
              <span className="text-2xl font-black text-neutral-300 mt-1 block">
                {campaigns.filter((c) => c.status === 'draft').length}
              </span>
            </div>
            <div className="p-4 bg-neutral-900 border border-neutral-800">
              <span className="text-[10px] font-mono tracking-wider text-neutral-400 block uppercase">
                Consented Subscribers
              </span>
              <span className="text-2xl font-black text-white mt-1 block">
                {directoryStats.optedInCount}
              </span>
            </div>
          </div>

          {loadingCampaigns ? (
            <div className="p-12 text-center text-xs font-mono text-neutral-400 bg-neutral-900 border border-neutral-800">
              Loading campaigns history...
            </div>
          ) : campaigns.length === 0 ? (
            <div className="p-12 text-center bg-neutral-900 border border-neutral-800">
              <Mail className="w-10 h-10 text-neutral-600 mx-auto mb-3" />
              <h3 className="text-sm font-black uppercase text-white tracking-wider">
                No Campaigns Created Yet
              </h3>
              <p className="text-xs text-neutral-400 mt-1 max-w-sm mx-auto font-mono">
                Launch the Design Studio to create and preview promotional emails for registered customers.
              </p>
              <button
                onClick={() => handleNewCampaign('coming_soon')}
                className="mt-4 bg-white text-black px-4 py-2 text-xs font-mono font-bold uppercase tracking-wider hover:bg-neutral-200"
              >
                Launch Design Studio
              </button>
            </div>
          ) : (
            <div className="border border-neutral-800 bg-neutral-900 divide-y divide-neutral-800">
              {campaigns.map((camp) => (
                <div
                  key={camp.id}
                  className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-neutral-800/40 transition-colors"
                >
                  <div className="space-y-1 max-w-xl">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[9px] font-mono font-bold px-2 py-0.5 uppercase tracking-wider ${
                          camp.status === 'sent'
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                            : camp.status === 'sending'
                            ? 'bg-amber-950 text-amber-400 border border-amber-800'
                            : 'bg-neutral-800 text-neutral-300 border border-neutral-700'
                        }`}
                      >
                        {camp.status}
                      </span>
                      <span className="text-[10px] font-mono text-neutral-400">
                        {new Date(camp.created_at).toLocaleDateString('en-GB', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                      {camp.content?.show_cta && (
                        <span className="bg-neutral-800 text-neutral-400 text-[9px] font-mono px-1.5 py-0.5">
                          CTA: ON
                        </span>
                      )}
                    </div>
                    <h3 className="text-sm font-black text-white uppercase tracking-tight">
                      {camp.name}
                    </h3>
                    <p className="text-xs text-neutral-400 font-mono truncate">
                      Subject: {camp.subject}
                    </p>
                    {camp.status === 'sent' && (
                      <p className="text-[11px] text-neutral-400 font-mono">
                        Sent to {camp.sent_count || 0} recipients on{' '}
                        {camp.sent_at ? new Date(camp.sent_at).toLocaleString() : 'N/A'}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 self-start md:self-auto">
                    <button
                      onClick={() => handleEditCampaign(camp)}
                      className="px-3 py-1.5 bg-neutral-800 text-white text-xs font-mono hover:bg-neutral-700 transition-colors cursor-pointer"
                    >
                      {camp.status === 'sent' ? 'View Details' : 'Edit Studio'}
                    </button>
                    <button
                      onClick={() => handleDuplicateCampaign(camp)}
                      className="p-1.5 text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer"
                      title="Duplicate as new draft"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteCampaign(camp.id, camp.name)}
                      className="p-1.5 text-neutral-500 hover:text-red-400 hover:bg-neutral-800 transition-colors cursor-pointer"
                      title="Delete campaign"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: DESIGN STUDIO COMPOSER & PREVIEW                                   */}
      {/* ========================================================================= */}
      {activeTab === 'composer' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* LEFT COLUMN: Controls & Content Editor (7 Cols) */}
          <div className="lg:col-span-7 space-y-6">
            {/* 6 Reusable Presets Bar */}
            <div className="p-4 bg-neutral-900 border border-neutral-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-neutral-300">
                  Bubble Boom Streetwear Presets (6 Templates)
                </span>
                <span className="text-[10px] font-mono text-neutral-400">
                  Select to load theme
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {[
                  'coming_soon',
                  'first_drop',
                  'new_collection',
                  'exclusive_offer',
                  'back_in_stock',
                  'custom_blank',
                ].map((key) => {
                  const preset = CAMPAIGN_PRESET_TEMPLATES[key]
                  if (!preset) return null
                  const isSelected = selectedTemplate === preset.id
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => handleApplyPreset(preset.id as CampaignTemplateId)}
                      className={`p-2.5 text-left text-xs font-mono border transition-all cursor-pointer ${
                        isSelected
                          ? 'border-white bg-white text-black font-bold'
                          : 'border-neutral-800 bg-black text-neutral-300 hover:border-neutral-600'
                      }`}
                    >
                      <span className="block truncate font-bold uppercase">{preset.name}</span>
                      <span className="text-[9px] block text-neutral-400 truncate mt-0.5">
                        {preset.id}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Campaign Metadata & Audience Selector */}
            <div className="p-5 bg-neutral-900 border border-neutral-800 space-y-4">
              <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-white border-b border-neutral-800 pb-2">
                1. Campaign Details &amp; Audience Selection
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-mono uppercase text-neutral-400 mb-1">
                    Internal Campaign Name *
                  </label>
                  <input
                    type="text"
                    value={campaignName}
                    onChange={(e) => setCampaignName(e.target.value)}
                    placeholder="e.g. Drop 001 Teaser Announcement"
                    className="w-full bg-black border border-neutral-700 p-2.5 text-xs text-white placeholder:text-neutral-600 focus:outline-none focus:border-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-mono uppercase text-neutral-400 mb-1">
                    Sender Display Name
                  </label>
                  <input
                    type="text"
                    value={senderName}
                    onChange={(e) => setSenderName(e.target.value)}
                    placeholder="Bubble Boom"
                    className="w-full bg-black border border-neutral-700 p-2.5 text-xs text-white placeholder:text-neutral-600 focus:outline-none focus:border-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-mono uppercase text-neutral-400 mb-1">
                  Email Subject Line *
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="e.g. DROP 001 // INCOMING TRANSMISSION"
                  className="w-full bg-black border border-neutral-700 p-2.5 text-xs text-white placeholder:text-neutral-600 focus:outline-none focus:border-white font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono uppercase text-neutral-400 mb-1">
                  Preheader / Preview Text
                </label>
                <input
                  type="text"
                  value={preheader}
                  onChange={(e) => setPreheader(e.target.value)}
                  placeholder="Limited quantities. Once sold out, never re-stocked."
                  className="w-full bg-black border border-neutral-700 p-2.5 text-xs text-white placeholder:text-neutral-600 focus:outline-none focus:border-white font-mono"
                />
              </div>

              {/* Phase 3 Audience Selector */}
              <div>
                <label className="block text-[11px] font-mono uppercase text-neutral-400 mb-1">
                  Select Recipient Audience
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setAudienceType('all_registered')}
                    className={`p-3 border text-xs font-mono text-left cursor-pointer transition-colors ${
                      audienceType === 'all_registered'
                        ? 'border-white bg-neutral-800 text-white font-bold'
                        : 'border-neutral-800 bg-black text-neutral-400 hover:text-white'
                    }`}
                  >
                    <span className="block font-bold">All Registered Customers</span>
                    <span className="text-[10px] text-neutral-400 block mt-0.5">
                      Filters automatically to marketing-consented contacts
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAudienceType('marketing_eligible_registered')}
                    className={`p-3 border text-xs font-mono text-left cursor-pointer transition-colors ${
                      audienceType === 'marketing_eligible_registered'
                        ? 'border-white bg-neutral-800 text-white font-bold'
                        : 'border-neutral-800 bg-black text-neutral-400 hover:text-white'
                    }`}
                  >
                    <span className="block font-bold">Marketing-Eligible Only</span>
                    <span className="text-[10px] text-neutral-400 block mt-0.5">
                      Registered users with explicit marketing consent
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAudienceType('specific_customers')}
                    className={`p-3 border text-xs font-mono text-left cursor-pointer transition-colors ${
                      audienceType === 'specific_customers'
                        ? 'border-white bg-neutral-800 text-white font-bold'
                        : 'border-neutral-800 bg-black text-neutral-400 hover:text-white'
                    }`}
                  >
                    <span className="block font-bold">Specific Customers ({specificEmails.length})</span>
                    <span className="text-[10px] text-neutral-400 block mt-0.5">
                      Hand-pick VIP customer email addresses
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAudienceType('existing_opted_in')}
                    className={`p-3 border text-xs font-mono text-left cursor-pointer transition-colors ${
                      audienceType === 'existing_opted_in'
                        ? 'border-white bg-neutral-800 text-white font-bold'
                        : 'border-neutral-800 bg-black text-neutral-400 hover:text-white'
                    }`}
                  >
                    <span className="block font-bold">All Opted-In Contacts</span>
                    <span className="text-[10px] text-neutral-400 block mt-0.5">
                      Includes newsletter opt-ins and registered customers
                    </span>
                  </button>
                </div>

                {/* Specific Customers Input Panel */}
                {audienceType === 'specific_customers' && (
                  <div className="mt-3 p-3 bg-black border border-neutral-800 space-y-2">
                    <div className="flex gap-2">
                      <input
                        type="email"
                        value={specificEmailInput}
                        onChange={(e) => setSpecificEmailInput(e.target.value)}
                        placeholder="Add customer email..."
                        className="flex-1 bg-neutral-900 border border-neutral-700 p-2 text-xs text-white font-mono focus:outline-none focus:border-white"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault()
                            handleAddSpecificEmail()
                          }
                        }}
                      />
                      <button
                        type="button"
                        onClick={handleAddSpecificEmail}
                        className="px-3 py-2 bg-neutral-800 text-white text-xs font-mono hover:bg-neutral-700"
                      >
                        Add
                      </button>
                    </div>

                    {specificEmails.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {specificEmails.map((email) => (
                          <span
                            key={email}
                            className="bg-neutral-900 border border-neutral-700 text-white text-[10px] font-mono px-2 py-1 flex items-center gap-1.5"
                          >
                            <span>{email}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveSpecificEmail(email)}
                              className="text-neutral-400 hover:text-red-400"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Detailed Audience Calculation Breakdown (Phase 3 Requirement) */}
                <div className="mt-3 p-3.5 bg-black border border-neutral-800 space-y-2 font-mono text-xs">
                  <div className="flex justify-between items-center text-neutral-400 pb-1.5 border-b border-neutral-800">
                    <span>Total Pool Count:</span>
                    <strong className="text-white">{audienceBreakdown.totalCount} contacts</strong>
                  </div>
                  <div className="flex justify-between items-center text-emerald-400 pb-1.5 border-b border-neutral-800">
                    <span className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Eligible Recipients (Marketing Consented):</span>
                    </span>
                    <strong className="text-emerald-400 text-sm font-bold">
                      {audienceBreakdown.eligibleCount} recipients
                    </strong>
                  </div>
                  <div className="flex justify-between items-center text-neutral-400 pt-0.5">
                    <span>Excluded (Safe from Send):</span>
                    <strong className="text-neutral-300">
                      {audienceBreakdown.excludedCount} contacts
                    </strong>
                  </div>
                  {audienceBreakdown.excludedCount > 0 && (
                    <div className="text-[10px] text-neutral-500 pt-1 space-y-0.5">
                      <div>
                        • {audienceBreakdown.exclusionReasons.no_consent} excluded: No promotional marketing consent given.
                      </div>
                      {audienceBreakdown.exclusionReasons.unsubscribed > 0 && (
                        <div>
                          • {audienceBreakdown.exclusionReasons.unsubscribed} excluded: Unsubscribed from marketing.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Content & Design Editor (Phase 6) */}
            <div className="p-5 bg-neutral-900 border border-neutral-800 space-y-4">
              <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-white border-b border-neutral-800 pb-2">
                2. Visual Content &amp; Design Customization
              </h2>

              {/* Promotional Poster / Hero Banner */}
              <div>
                <label className="block text-[11px] font-mono uppercase text-neutral-400 mb-1">
                  Promotional Poster / Banner Image (Optional)
                </label>
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={heroImageUrl}
                      onChange={(e) => setHeroImageUrl(e.target.value)}
                      placeholder="https://... or upload poster from device"
                      className="flex-1 bg-black border border-neutral-700 p-2.5 text-xs text-white placeholder:text-neutral-600 focus:outline-none focus:border-white font-mono"
                    />
                    <label className="bg-neutral-800 hover:bg-neutral-700 text-white px-3 py-2 text-xs font-mono flex items-center gap-1.5 cursor-pointer shrink-0">
                      <Upload className="w-3.5 h-3.5" />
                      <span>{uploadingBanner ? 'Uploading...' : 'Upload Poster'}</span>
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        className="hidden"
                        onChange={handleBannerUpload}
                        disabled={uploadingBanner}
                      />
                    </label>
                  </div>
                  {heroImageUrl && (
                    <div className="relative h-36 w-full max-w-sm border border-neutral-700 bg-black overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={heroImageUrl}
                        alt="Hero Preview"
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => setHeroImageUrl('')}
                        className="absolute top-1 right-1 bg-black/80 text-white p-1 text-[10px] hover:bg-red-950 font-mono"
                      >
                        Remove
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Headings */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-mono uppercase text-neutral-400 mb-1">
                    Subtitle / Eyebrow (Optional)
                  </label>
                  <input
                    type="text"
                    value={subheading}
                    onChange={(e) => setSubheading(e.target.value)}
                    placeholder="e.g. LIMITED EDITION RELEASE"
                    className="w-full bg-black border border-neutral-700 p-2.5 text-xs text-white placeholder:text-neutral-600 focus:outline-none focus:border-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-mono uppercase text-neutral-400 mb-1">
                    Main Heading (Optional)
                  </label>
                  <input
                    type="text"
                    value={heading}
                    onChange={(e) => setHeading(e.target.value)}
                    placeholder="e.g. DROP 001 // THE SHADOW DIVISION"
                    className="w-full bg-black border border-neutral-700 p-2.5 text-xs text-white placeholder:text-neutral-600 focus:outline-none focus:border-white font-mono"
                  />
                </div>
              </div>

              {/* Body Text */}
              <div>
                <label className="block text-[11px] font-mono uppercase text-neutral-400 mb-1">
                  Description / Custom Message
                </label>
                <textarea
                  rows={4}
                  value={bodyText}
                  onChange={(e) => setBodyText(e.target.value)}
                  placeholder="Write your email body copy. Paragraphs are automatically separated by empty lines."
                  className="w-full bg-black border border-neutral-700 p-2.5 text-xs text-white placeholder:text-neutral-600 focus:outline-none focus:border-white font-mono"
                />
              </div>

              {/* Typography & Color Customization Controls (Phase 6) */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-neutral-800">
                <div>
                  <label className="block text-[10px] font-mono uppercase text-neutral-400 mb-1">
                    Text Alignment
                  </label>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => setTextAlignment('left')}
                      className={`p-2 border text-xs font-mono flex-1 flex justify-center cursor-pointer ${
                        textAlignment === 'left' ? 'bg-white text-black border-white' : 'bg-black text-neutral-400 border-neutral-700'
                      }`}
                      title="Left Align"
                    >
                      <AlignLeft className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setTextAlignment('center')}
                      className={`p-2 border text-xs font-mono flex-1 flex justify-center cursor-pointer ${
                        textAlignment === 'center' ? 'bg-white text-black border-white' : 'bg-black text-neutral-400 border-neutral-700'
                      }`}
                      title="Center Align"
                    >
                      <AlignCenter className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setTextAlignment('right')}
                      className={`p-2 border text-xs font-mono flex-1 flex justify-center cursor-pointer ${
                        textAlignment === 'right' ? 'bg-white text-black border-white' : 'bg-black text-neutral-400 border-neutral-700'
                      }`}
                      title="Right Align"
                    >
                      <AlignRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-mono uppercase text-neutral-400 mb-1">
                    Text Colour
                  </label>
                  <div className="flex gap-1.5 items-center">
                    <input
                      type="color"
                      value={textColor}
                      onChange={(e) => setTextColor(e.target.value)}
                      className="w-8 h-8 p-0 bg-transparent border border-neutral-700 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={textColor}
                      onChange={(e) => setTextColor(e.target.value)}
                      className="flex-1 bg-black border border-neutral-700 p-1.5 text-xs text-white font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-mono uppercase text-neutral-400 mb-1">
                    Card Background
                  </label>
                  <div className="flex gap-1.5 items-center">
                    <input
                      type="color"
                      value={cardBgColor}
                      onChange={(e) => setCardBgColor(e.target.value)}
                      className="w-8 h-8 p-0 bg-transparent border border-neutral-700 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={cardBgColor}
                      onChange={(e) => setCardBgColor(e.target.value)}
                      className="flex-1 bg-black border border-neutral-700 p-1.5 text-xs text-white font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* ========================================================================= */}
              {/* PHASE 7: OPTIONAL CTA BUTTON (TOGGLE ON/OFF, DEFAULT OFF)                 */}
              {/* ========================================================================= */}
              <div className="pt-3 border-t border-neutral-800 space-y-3">
                <div className="flex items-center justify-between p-3.5 bg-black border border-neutral-800">
                  <div>
                    <span className="text-xs font-mono font-bold uppercase text-white block">
                      Add CTA Button
                    </span>
                    <span className="text-[10px] text-neutral-400 font-mono">
                      Optional call-to-action button. When OFF, completely removed with zero placeholder spacing.
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowCta(!showCta)}
                    className={`px-3.5 py-1 text-xs font-mono font-bold uppercase tracking-wider transition-colors cursor-pointer border ${
                      showCta
                        ? 'bg-emerald-500 text-black border-emerald-400'
                        : 'bg-neutral-800 text-neutral-400 border-neutral-700'
                    }`}
                  >
                    {showCta ? 'CTA: ON' : 'CTA: OFF'}
                  </button>
                </div>

                {showCta && (
                  <div className="p-4 bg-black/60 border border-neutral-800 space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-mono uppercase text-neutral-400 mb-1">
                          Button Text
                        </label>
                        <input
                          type="text"
                          value={ctaText}
                          onChange={(e) => setCtaText(e.target.value)}
                          placeholder="e.g. SHOP NEW ARRIVALS"
                          className="w-full bg-neutral-900 border border-neutral-700 p-2 text-xs text-white font-mono focus:outline-none focus:border-white"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-mono uppercase text-neutral-400 mb-1">
                          Button Destination URL
                        </label>
                        <input
                          type="text"
                          value={ctaUrl}
                          onChange={(e) => setCtaUrl(e.target.value)}
                          placeholder="https://bubbleboomstore.com/shop"
                          className="w-full bg-neutral-900 border border-neutral-700 p-2 text-xs text-white font-mono focus:outline-none focus:border-white"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      <div>
                        <label className="block text-[10px] font-mono uppercase text-neutral-400 mb-1">
                          Button Style
                        </label>
                        <div className="flex gap-1.5">
                          <button
                            type="button"
                            onClick={() => setCtaStyle('black')}
                            className={`px-2.5 py-1 text-[10px] font-mono border cursor-pointer ${
                              ctaStyle === 'black'
                                ? 'bg-white text-black font-bold border-white'
                                : 'bg-black text-neutral-300 border-neutral-700'
                            }`}
                          >
                            Black Solid
                          </button>
                          <button
                            type="button"
                            onClick={() => setCtaStyle('white')}
                            className={`px-2.5 py-1 text-[10px] font-mono border cursor-pointer ${
                              ctaStyle === 'white'
                                ? 'bg-white text-black font-bold border-white'
                                : 'bg-black text-neutral-300 border-neutral-700'
                            }`}
                          >
                            White Solid
                          </button>
                          <button
                            type="button"
                            onClick={() => setCtaStyle('outline')}
                            className={`px-2.5 py-1 text-[10px] font-mono border cursor-pointer ${
                              ctaStyle === 'outline'
                                ? 'bg-white text-black font-bold border-white'
                                : 'bg-black text-neutral-300 border-neutral-700'
                            }`}
                          >
                            Outline
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] font-mono uppercase text-neutral-400 mb-1">
                          Button Alignment
                        </label>
                        <div className="flex gap-1.5">
                          <button
                            type="button"
                            onClick={() => setCtaAlignment('left')}
                            className={`px-2.5 py-1 text-[10px] font-mono border cursor-pointer ${
                              ctaAlignment === 'left' ? 'bg-white text-black border-white' : 'bg-black text-neutral-300 border-neutral-700'
                            }`}
                          >
                            Left
                          </button>
                          <button
                            type="button"
                            onClick={() => setCtaAlignment('center')}
                            className={`px-2.5 py-1 text-[10px] font-mono border cursor-pointer ${
                              ctaAlignment === 'center' ? 'bg-white text-black border-white' : 'bg-black text-neutral-300 border-neutral-700'
                            }`}
                          >
                            Center
                          </button>
                          <button
                            type="button"
                            onClick={() => setCtaAlignment('right')}
                            className={`px-2.5 py-1 text-[10px] font-mono border cursor-pointer ${
                              ctaAlignment === 'right' ? 'bg-white text-black border-white' : 'bg-black text-neutral-300 border-neutral-700'
                            }`}
                          >
                            Right
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* PHASE 8: MANDATORY WEBSITE LINK NOTICE */}
              <div className="p-3.5 bg-neutral-950 border border-neutral-800 text-[11px] font-mono flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div className="text-neutral-400 leading-relaxed">
                  <strong className="text-white block">Official Website Hyperlink: Always Included</strong>
                  The official storefront link (
                  <span className="text-white underline">{OFFICIAL_WEBSITE_URL}</span>) is
                  automatically embedded in the promotional footer across desktop and mobile layouts.
                </div>
              </div>
            </div>

            {/* Bottom Actions Bar */}
            <div className="p-4 bg-neutral-900 border border-neutral-800 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSaveDraft}
                  disabled={loading}
                  className="bg-white text-black px-4 py-2 text-xs font-mono font-bold uppercase tracking-wider hover:bg-neutral-200 transition-colors cursor-pointer"
                >
                  {loading ? 'Saving...' : 'Save Draft'}
                </button>

                <button
                  type="button"
                  onClick={() => setShowTestModal(true)}
                  className="bg-neutral-800 text-white px-4 py-2 text-xs font-mono uppercase tracking-wider hover:bg-neutral-700 transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send Test Email</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => setShowDispatchModal(true)}
                disabled={audienceBreakdown.eligibleCount === 0}
                className="bg-emerald-500 hover:bg-emerald-400 disabled:bg-neutral-700 text-black px-5 py-2 text-xs font-mono font-black uppercase tracking-widest transition-colors cursor-pointer shadow-[2px_2px_0px_0px_rgba(255,255,255,0.4)]"
              >
                Dispatch Campaign ({audienceBreakdown.eligibleCount})
              </button>
            </div>
          </div>

          {/* RIGHT COLUMN: Live Accurate Mobile/Desktop Preview (5 Cols) */}
          <div className="lg:col-span-5 sticky top-6 space-y-3">
            {/* Preview Toolbar */}
            <div className="p-3 bg-neutral-900 border border-neutral-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold uppercase text-white">
                  Live Preview
                </span>
                <span className="text-[10px] font-mono text-neutral-400">
                  {showCta ? '• Layout with CTA' : '• Layout without CTA'}
                </span>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setPreviewDevice('desktop')}
                  className={`p-1.5 text-xs font-mono rounded cursor-pointer ${
                    previewDevice === 'desktop'
                      ? 'bg-white text-black'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                  title="Desktop View (600px)"
                >
                  <Monitor className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewDevice('mobile')}
                  className={`p-1.5 text-xs font-mono rounded cursor-pointer ${
                    previewDevice === 'mobile'
                      ? 'bg-white text-black'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                  title="Mobile View (375px)"
                >
                  <Smartphone className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setShowRawHtml(!showRawHtml)}
                  className={`p-1.5 text-xs font-mono rounded cursor-pointer ml-1 ${
                    showRawHtml
                      ? 'bg-neutral-700 text-white'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                  title="Toggle HTML code"
                >
                  <FileText className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Email Canvas Preview */}
            {showRawHtml ? (
              <div className="p-3 bg-black border border-neutral-800 font-mono text-[10px] text-neutral-300 max-h-[600px] overflow-auto">
                <pre>{compiledHtml}</pre>
              </div>
            ) : (
              <div
                className={`mx-auto transition-all ${
                  previewDevice === 'mobile' ? 'max-w-[375px]' : 'max-w-[600px]'
                }`}
              >
                <div
                  className="border-2 border-black shadow-[6px_6px_0px_0px_rgba(255,255,255,0.2)] overflow-hidden"
                  style={{ backgroundColor: cardBgColor }}
                >
                  {/* Email Header */}
                  <div className="p-5 bg-black text-white text-center border-b-2 border-black">
                    <span className="text-lg font-black tracking-[4px] uppercase block">
                      BUBBLE BOOM
                    </span>
                    <span className="text-[9px] font-mono tracking-widest text-neutral-400 uppercase mt-0.5 block">
                      OFFICIAL APPAREL // NEW DELHI
                    </span>
                  </div>

                  {/* Hero Banner Preview */}
                  {heroImageUrl && (
                    <div className="w-full bg-black">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={heroImageUrl}
                        alt={heroImageAlt || 'Bubble Boom'}
                        className="w-full h-auto block"
                      />
                    </div>
                  )}

                  {/* Content Area */}
                  {(heading || subheading || bodyText || showCta || secondaryBlocks.length > 0) && (
                    <div
                      className="p-6 space-y-4"
                      style={{ textAlign: textAlignment }}
                    >
                      {subheading && (
                        <span className="text-[10px] font-mono font-bold tracking-[2px] text-neutral-500 uppercase block">
                          {subheading}
                        </span>
                      )}

                      {heading && (
                        <h2
                          className="text-xl font-black uppercase tracking-tight leading-tight"
                          style={{ color: textColor }}
                        >
                          {heading}
                        </h2>
                      )}

                      {bodyText && (
                        <div
                          className="text-xs leading-relaxed space-y-2"
                          style={{ color: textColor, textAlign: textAlignment }}
                        >
                          {bodyText.split(/\n\s*\n/).map((para, i) => (
                            <p key={i}>{para}</p>
                          ))}
                        </div>
                      )}

                      {/* Secondary Blocks Preview */}
                      {secondaryBlocks.map((b, i) => (
                        <div key={i} className="p-3 bg-neutral-50 border border-neutral-200 text-left">
                          {b.title && (
                            <span className="font-mono text-xs font-bold uppercase block text-black">
                              {b.title}
                            </span>
                          )}
                          {b.text && (
                            <span className="text-xs text-neutral-600 block mt-1">{b.text}</span>
                          )}
                        </div>
                      ))}

                      {/* CTA Button Preview: ONLY IF showCta is TRUE */}
                      {showCta && (
                        <div
                          className="pt-2"
                          style={{ textAlign: ctaAlignment }}
                        >
                          <span
                            className={`inline-block text-xs font-black tracking-widest uppercase px-6 py-3 border-2 transition-all cursor-pointer ${
                              ctaStyle === 'white'
                                ? 'bg-white text-black border-black'
                                : ctaStyle === 'outline'
                                ? 'bg-transparent text-black border-black'
                                : 'bg-black text-white border-black'
                            }`}
                          >
                            {ctaText || 'EXPLORE COLLECTION'}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* MANDATORY WEBSITE BANNER */}
                  <div className="p-3 bg-neutral-50 border-t border-b border-neutral-200 text-center">
                    <span className="text-[10px] font-mono text-neutral-600 tracking-wider uppercase block">
                      EXPLORE THE FULL CATALOG ONLINE AT:
                    </span>
                    <a
                      href={OFFICIAL_WEBSITE_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-extrabold text-black underline tracking-wide mt-0.5 inline-block"
                    >
                      {OFFICIAL_WEBSITE_URL}
                    </a>
                  </div>

                  {/* FOOTER */}
                  <div className="p-6 bg-black text-neutral-400 text-center space-y-2">
                    <div>
                      <a
                        href={OFFICIAL_WEBSITE_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-black text-white uppercase tracking-widest hover:underline"
                      >
                        BUBBLEBOOMSTORE.COM &rarr;
                      </a>
                    </div>
                    <p className="text-[10px] text-neutral-500 leading-relaxed">
                      &copy; {new Date().getFullYear()} BUBBLE BOOM. All Rights Reserved.
                      <br />
                      Official Streetwear &amp; Oversized Apparel.
                      <br />
                      Contact: {DEFAULT_SUPPORT_EMAIL}
                    </p>
                    <p className="text-[9px] font-mono text-neutral-600 pt-1">
                      You received this email because you opted in to Bubble Boom marketing communications.
                      <br />
                      <span className="text-neutral-400 underline cursor-pointer">
                        click here to unsubscribe
                      </span>
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TEST SEND MODAL                                                           */}
      {/* ========================================================================= */}
      {showTestModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-neutral-900 border-2 border-white p-6 max-w-md w-full shadow-[8px_8px_0px_0px_rgba(255,255,255,1)]">
            <h3 className="text-base font-black uppercase tracking-tight text-white mb-2">
              Send Test Email Preview
            </h3>
            <p className="text-xs text-neutral-400 mb-4 leading-relaxed font-mono">
              Deliver a live test rendering of this marketing email directly to your inbox to inspect typography, images, and styling without contacting customers.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-[11px] font-mono uppercase text-neutral-400 mb-1">
                  Recipient Test Address
                </label>
                <input
                  type="email"
                  value={testEmailAddress}
                  onChange={(e) => setTestEmailAddress(e.target.value)}
                  placeholder="admin@bubbleboomstore.com"
                  className="w-full bg-black border border-neutral-700 p-2.5 text-xs text-white placeholder:text-neutral-600 font-mono focus:outline-none focus:border-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowTestModal(false)}
                  className="px-3 py-2 text-xs font-mono text-neutral-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSendTestEmail}
                  disabled={sendingTest}
                  className="bg-white text-black px-4 py-2 text-xs font-mono font-bold uppercase tracking-wider hover:bg-neutral-200"
                >
                  {sendingTest ? 'Sending...' : 'Send Test Preview'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* LIVE DISPATCH CONFIRMATION MODAL                                          */}
      {/* ========================================================================= */}
      {showDispatchModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-neutral-900 border-2 border-white p-6 max-w-lg w-full shadow-[8px_8px_0px_0px_rgba(255,255,255,1)] space-y-4">
            <div className="flex items-center gap-2 text-emerald-400 font-mono text-xs font-bold uppercase">
              <ShieldCheck className="w-4 h-4" />
              <span>Strict Send Authorization</span>
            </div>

            <h3 className="text-lg font-black uppercase tracking-tight text-white">
              Confirm Campaign Dispatch
            </h3>

            <div className="space-y-2 font-mono text-xs text-neutral-300 bg-black p-4 border border-neutral-800">
              <div className="flex justify-between py-1 border-b border-neutral-800">
                <span className="text-neutral-400">Campaign:</span>
                <span className="text-white font-bold">{campaignName}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-neutral-800">
                <span className="text-neutral-400">Subject:</span>
                <span className="text-white font-bold">{subject}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-neutral-800">
                <span className="text-neutral-400">Audience Selected:</span>
                <span className="text-white font-bold">{audienceType.replace(/_/g, ' ')}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-neutral-800">
                <span className="text-neutral-400">Total Pool:</span>
                <span className="text-neutral-400">{audienceBreakdown.totalCount} contacts</span>
              </div>
              <div className="flex justify-between py-1 border-b border-neutral-800">
                <span className="text-neutral-400">Excluded (No Consent):</span>
                <span className="text-neutral-400">{audienceBreakdown.excludedCount} contacts</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-emerald-400 font-bold">Authorized Eligible Recipients:</span>
                <span className="text-emerald-400 text-sm font-bold">
                  {audienceBreakdown.eligibleCount} recipients
                </span>
              </div>
            </div>

            <p className="text-[11px] text-neutral-400 font-mono leading-relaxed">
              Emails will strictly be delivered to verified opted-in contacts. Unconsented accounts are automatically filtered out.
            </p>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowDispatchModal(false)}
                className="px-3 py-2 text-xs font-mono text-neutral-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDispatchCampaign}
                disabled={dispatching}
                className="bg-emerald-500 hover:bg-emerald-400 text-black px-5 py-2 text-xs font-mono font-black uppercase tracking-widest"
              >
                {dispatching ? 'Dispatching...' : 'Yes, Send Now'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function AdminEmailMarketingPage() {
  return (
    <Suspense fallback={<div className="p-8 text-neutral-500 font-mono text-xs">Loading studio...</div>}>
      <EmailMarketingStudioContent />
    </Suspense>
  )
}
