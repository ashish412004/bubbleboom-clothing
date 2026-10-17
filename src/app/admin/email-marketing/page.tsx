'use client'

import { useState, useEffect, useMemo } from 'react'
import Image from 'next/image'
import Link from 'next/link'
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

export default function AdminEmailMarketingPage() {
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
  const [audienceType, setAudienceType] = useState<CampaignAudienceType>('all_opted_in')
  const [selectedTemplate, setSelectedTemplate] = useState<CampaignTemplateId>('drop_soon')

  // Content state
  const [heading, setHeading] = useState('')
  const [subheading, setSubheading] = useState('')
  const [bodyText, setBodyText] = useState('')
  const [heroImageUrl, setHeroImageUrl] = useState('')
  const [heroImageAlt, setHeroImageAlt] = useState('')

  // OPTIONAL CTA BUTTON (Default: false)
  const [showCta, setShowCta] = useState(false)
  const [ctaText, setCtaText] = useState('EXPLORE COLLECTION')
  const [ctaUrl, setCtaUrl] = useState('https://bubbleboomstore.com/shop')
  const [ctaStyle, setCtaStyle] = useState<'black' | 'white' | 'outline'>('black')

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

  // Calculate live eligible recipient count based on selected audience
  const eligibleRecipientsCount = useMemo(() => {
    return directoryEntries.filter((e) => {
      if (e.consent_status !== 'opted_in') return false
      if (audienceType === 'all_opted_in') return true
      if (audienceType === 'newsletter_only') return e.is_newsletter_subscriber
      if (audienceType === 'customers_opted_in') return e.is_registered_customer
      return true
    }).length
  }, [directoryEntries, audienceType])

  // Apply a template preset
  const handleApplyPreset = (templateId: CampaignTemplateId) => {
    const preset = CAMPAIGN_PRESET_TEMPLATES[templateId]
    if (!preset) return

    setSelectedTemplate(templateId)
    setSubject(preset.defaultSubject)
    setPreheader(preset.defaultPreheader)
    setHeading(preset.defaultContent.heading || '')
    setSubheading(preset.defaultContent.subheading || '')
    setBodyText(preset.defaultContent.body_text || '')
    setHeroImageUrl(preset.defaultContent.hero_image_url || '')
    setHeroImageAlt(preset.defaultContent.hero_image_alt || '')
    // Default CTA is strictly OFF per requirements
    setShowCta(Boolean(preset.defaultContent.show_cta))
    setCtaText(preset.defaultContent.cta_text || 'VISIT STORE')
    setCtaUrl(preset.defaultContent.cta_url || 'https://bubbleboomstore.com')
    setCtaStyle(preset.defaultContent.cta_style || 'black')
    setSecondaryBlocks(preset.defaultContent.secondary_blocks || [])

    toast.success(`Loaded preset: ${preset.name}`)
  }

  // Initialize new composer
  const handleNewCampaign = (templateId: CampaignTemplateId = 'drop_soon') => {
    setCampaignId(null)
    setCampaignName(`Campaign ${new Date().toLocaleDateString('en-GB')}`)
    setAudienceType('all_opted_in')
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
    setShowCta(Boolean(c.show_cta))
    setCtaText(c.cta_text || 'EXPLORE COLLECTION')
    setCtaUrl(c.cta_url || 'https://bubbleboomstore.com/shop')
    setCtaStyle(c.cta_style || 'black')
    setSecondaryBlocks(c.secondary_blocks || [])

    setActiveTab('composer')
  }

  // Duplicate campaign
  const handleDuplicateCampaign = (camp: MarketingCampaign) => {
    setCampaignId(null)
    setCampaignName(`${camp.name} (Copy)`)
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
    setShowCta(Boolean(c.show_cta))
    setCtaText(c.cta_text || 'EXPLORE COLLECTION')
    setCtaUrl(c.cta_url || 'https://bubbleboomstore.com/shop')
    setCtaStyle(c.cta_style || 'black')
    setSecondaryBlocks(c.secondary_blocks || [])

    setActiveTab('composer')
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
        toast.success('Promotional banner uploaded successfully!')
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to upload image')
    } finally {
      setUploadingBanner(false)
    }
  }

  // Construct current campaign content
  const currentContent: CampaignContent = useMemo(() => {
    return {
      heading: heading.trim(),
      subheading: subheading.trim(),
      body_text: bodyText.trim(),
      hero_image_url: heroImageUrl.trim(),
      hero_image_alt: heroImageAlt.trim(),
      // Optional CTA Button: strictly boolean
      show_cta: showCta,
      cta_text: ctaText.trim(),
      cta_url: ctaUrl.trim(),
      cta_style: ctaStyle,
      secondary_blocks: secondaryBlocks,
    }
  }, [
    heading,
    subheading,
    bodyText,
    heroImageUrl,
    heroImageAlt,
    showCta,
    ctaText,
    ctaUrl,
    ctaStyle,
    secondaryBlocks,
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

    // Save first if not saved
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
    if (eligibleRecipientsCount === 0) {
      toast.error('No eligible opted-in subscribers found for this audience.')
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
        `Campaign dispatched successfully! Sent to ${data.summary?.sent || 0} opted-in subscribers.`
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

  // Filtered customer directory
  const filteredDirectory = useMemo(() => {
    return directoryEntries.filter((item) => {
      const matchesSearch =
        searchQuery === '' ||
        item.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.full_name && item.full_name.toLowerCase().includes(searchQuery.toLowerCase()))

      const matchesConsent =
        consentFilter === 'all' || item.consent_status === consentFilter

      return matchesSearch && matchesConsent
    })
  }, [directoryEntries, searchQuery, consentFilter])

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="border-b border-neutral-800 pb-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono tracking-widest text-neutral-400 uppercase">
              BUBBLE BOOM // MARKETING STUDIO
            </span>
            <span className="bg-white text-black px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider">
              PROD
            </span>
          </div>
          <h1 className="text-2xl font-black uppercase tracking-tight text-white mt-1">
            Email Marketing Studio
          </h1>
          <p className="text-xs text-neutral-400 mt-0.5">
            Design visual streetwear marketing campaigns &amp; manage verified opt-in customer contacts.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => handleNewCampaign('drop_soon')}
            className="bg-white text-black px-4 py-2 text-xs font-mono font-bold uppercase tracking-wider hover:bg-neutral-200 transition-colors flex items-center gap-2 cursor-pointer shadow-[3px_3px_0px_0px_rgba(255,255,255,0.3)]"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create Campaign</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-neutral-800 gap-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('campaigns')}
          className={`px-4 py-2 text-xs font-mono uppercase tracking-wider transition-colors border-b-2 cursor-pointer ${
            activeTab === 'campaigns'
              ? 'border-white text-white font-bold'
              : 'border-transparent text-neutral-400 hover:text-white'
          }`}
        >
          Campaigns &amp; Drafts ({campaigns.length})
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
          <span>Visual Composer {campaignId && '(Active)'}</span>
        </button>

        <button
          onClick={() => setActiveTab('customers')}
          className={`px-4 py-2 text-xs font-mono uppercase tracking-wider transition-colors border-b-2 cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'customers'
              ? 'border-white text-white font-bold'
              : 'border-transparent text-neutral-400 hover:text-white'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Customer Directory ({directoryEntries.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('subscribers')}
          className={`px-4 py-2 text-xs font-mono uppercase tracking-wider transition-colors border-b-2 cursor-pointer ${
            activeTab === 'subscribers'
              ? 'border-white text-white font-bold'
              : 'border-transparent text-neutral-400 hover:text-white'
          }`}
        >
          Opted-In Subscribers ({directoryStats.optedInCount})
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: CAMPAIGNS LIST                                                     */}
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
                Sent Campaigns
              </span>
              <span className="text-2xl font-black text-emerald-400 mt-1 block">
                {campaigns.filter((c) => c.status === 'sent').length}
              </span>
            </div>
            <div className="p-4 bg-neutral-900 border border-neutral-800">
              <span className="text-[10px] font-mono tracking-wider text-neutral-400 block uppercase">
                Drafts in Progress
              </span>
              <span className="text-2xl font-black text-neutral-300 mt-1 block">
                {campaigns.filter((c) => c.status === 'draft').length}
              </span>
            </div>
            <div className="p-4 bg-neutral-900 border border-neutral-800">
              <span className="text-[10px] font-mono tracking-wider text-neutral-400 block uppercase">
                Eligible Subscribers
              </span>
              <span className="text-2xl font-black text-white mt-1 block">
                {directoryStats.optedInCount}
              </span>
            </div>
          </div>

          {loadingCampaigns ? (
            <div className="p-12 text-center text-xs font-mono text-neutral-400 bg-neutral-900 border border-neutral-800">
              Loading marketing campaigns...
            </div>
          ) : campaigns.length === 0 ? (
            <div className="p-12 text-center bg-neutral-900 border border-neutral-800">
              <Mail className="w-10 h-10 text-neutral-600 mx-auto mb-3" />
              <h3 className="text-sm font-black uppercase text-white tracking-wider">
                No Campaigns Created Yet
              </h3>
              <p className="text-xs text-neutral-400 mt-1 max-w-sm mx-auto">
                Start composing your first streetwear marketing drop announcement or product launch email.
              </p>
              <button
                onClick={() => handleNewCampaign('drop_soon')}
                className="mt-4 bg-white text-black px-4 py-2 text-xs font-mono font-bold uppercase tracking-wider hover:bg-neutral-200"
              >
                Launch Studio Composer
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
                      {camp.status === 'sent' ? 'View Details' : 'Edit Composer'}
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
      {/* TAB 2: VISUAL COMPOSER & PREVIEW                                          */}
      {/* ========================================================================= */}
      {activeTab === 'composer' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* LEFT COLUMN: Controls & Content Editor (7 Cols) */}
          <div className="lg:col-span-7 space-y-6">
            {/* Presets Bar */}
            <div className="p-4 bg-neutral-900 border border-neutral-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-neutral-300">
                  Streetwear Template Presets
                </span>
                <span className="text-[10px] font-mono text-neutral-400">
                  Click to populate theme
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {Object.values(CAMPAIGN_PRESET_TEMPLATES).map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleApplyPreset(preset.id)}
                    className={`p-2.5 text-left text-xs font-mono border transition-all cursor-pointer ${
                      selectedTemplate === preset.id
                        ? 'border-white bg-white text-black font-bold'
                        : 'border-neutral-800 bg-black text-neutral-300 hover:border-neutral-600'
                    }`}
                  >
                    <span className="block truncate font-bold uppercase">{preset.name}</span>
                    <span className="text-[9px] block text-neutral-400 truncate mt-0.5">
                      {preset.id}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Campaign Metadata */}
            <div className="p-5 bg-neutral-900 border border-neutral-800 space-y-4">
              <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-white border-b border-neutral-800 pb-2">
                1. Campaign Settings &amp; Target Audience
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

              <div>
                <label className="block text-[11px] font-mono uppercase text-neutral-400 mb-1">
                  Target Audience (Strictly Opted-In Only)
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setAudienceType('all_opted_in')}
                    className={`p-2.5 border text-xs font-mono text-left cursor-pointer transition-colors ${
                      audienceType === 'all_opted_in'
                        ? 'border-white bg-neutral-800 text-white font-bold'
                        : 'border-neutral-800 bg-black text-neutral-400 hover:text-white'
                    }`}
                  >
                    <span className="block font-bold">All Opted-In</span>
                    <span className="text-[10px] text-neutral-400 block mt-0.5">
                      Subscribers &amp; Customers
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAudienceType('newsletter_only')}
                    className={`p-2.5 border text-xs font-mono text-left cursor-pointer transition-colors ${
                      audienceType === 'newsletter_only'
                        ? 'border-white bg-neutral-800 text-white font-bold'
                        : 'border-neutral-800 bg-black text-neutral-400 hover:text-white'
                    }`}
                  >
                    <span className="block font-bold">Newsletter Only</span>
                    <span className="text-[10px] text-neutral-400 block mt-0.5">
                      Website Opt-Ins
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAudienceType('customers_opted_in')}
                    className={`p-2.5 border text-xs font-mono text-left cursor-pointer transition-colors ${
                      audienceType === 'customers_opted_in'
                        ? 'border-white bg-neutral-800 text-white font-bold'
                        : 'border-neutral-800 bg-black text-neutral-400 hover:text-white'
                    }`}
                  >
                    <span className="block font-bold">Customers Only</span>
                    <span className="text-[10px] text-neutral-400 block mt-0.5">
                      Registered &amp; Opted-In
                    </span>
                  </button>
                </div>

                <div className="mt-2.5 p-2 bg-black border border-neutral-800 flex items-center justify-between text-xs font-mono">
                  <span className="text-neutral-400">Authoritative Eligible Recipients:</span>
                  <strong className="text-emerald-400 font-bold">
                    {eligibleRecipientsCount} verified contacts
                  </strong>
                </div>
              </div>
            </div>

            {/* Content Editor */}
            <div className="p-5 bg-neutral-900 border border-neutral-800 space-y-4">
              <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-white border-b border-neutral-800 pb-2">
                2. Visual Content &amp; Media
              </h2>

              {/* Hero Banner Image */}
              <div>
                <label className="block text-[11px] font-mono uppercase text-neutral-400 mb-1">
                  Promotional Banner Image (Optional)
                </label>
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={heroImageUrl}
                      onChange={(e) => setHeroImageUrl(e.target.value)}
                      placeholder="https://... or upload photo"
                      className="flex-1 bg-black border border-neutral-700 p-2.5 text-xs text-white placeholder:text-neutral-600 focus:outline-none focus:border-white font-mono"
                    />
                    <label className="bg-neutral-800 hover:bg-neutral-700 text-white px-3 py-2 text-xs font-mono flex items-center gap-1.5 cursor-pointer shrink-0">
                      <Upload className="w-3.5 h-3.5" />
                      <span>{uploadingBanner ? 'Uploading...' : 'Upload'}</span>
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
                    <div className="relative h-32 w-full max-w-sm border border-neutral-700 bg-black overflow-hidden">
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

              {/* Subheading & Heading */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-mono uppercase text-neutral-400 mb-1">
                    Subheading / Eyebrow (Optional)
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
                  placeholder="Write your email body copy. Paragraphs are automatically formatted."
                  className="w-full bg-black border border-neutral-700 p-2.5 text-xs text-white placeholder:text-neutral-600 focus:outline-none focus:border-white font-mono"
                />
              </div>

              {/* ========================================================================= */}
              {/* REQUIREMENT 1: OPTIONAL CTA BUTTON (TOGGLE ON/OFF, DEFAULT OFF)           */}
              {/* ========================================================================= */}
              <div className="pt-3 border-t border-neutral-800 space-y-3">
                <div className="flex items-center justify-between p-3 bg-black border border-neutral-800">
                  <div>
                    <span className="text-xs font-mono font-bold uppercase text-white block">
                      Add CTA Button
                    </span>
                    <span className="text-[10px] text-neutral-400 font-mono">
                      Optional clickable call-to-action button. When OFF, completely omitted with no empty space.
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowCta(!showCta)}
                    className={`px-3 py-1 text-xs font-mono font-bold uppercase tracking-wider transition-colors cursor-pointer border ${
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

                    <div>
                      <label className="block text-[10px] font-mono uppercase text-neutral-400 mb-1">
                        Button Styling
                      </label>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setCtaStyle('black')}
                          className={`px-3 py-1.5 text-[11px] font-mono border cursor-pointer ${
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
                          className={`px-3 py-1.5 text-[11px] font-mono border cursor-pointer ${
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
                          className={`px-3 py-1.5 text-[11px] font-mono border cursor-pointer ${
                            ctaStyle === 'outline'
                              ? 'bg-white text-black font-bold border-white'
                              : 'bg-black text-neutral-300 border-neutral-700'
                          }`}
                        >
                          Monochrome Outline
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* ========================================================================= */}
              {/* REQUIREMENT 2: MANDATORY WEBSITE LINK NOTICE                              */}
              {/* ========================================================================= */}
              <div className="p-3 bg-neutral-950 border border-neutral-800 text-[11px] font-mono flex items-start gap-2.5">
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
                disabled={eligibleRecipientsCount === 0}
                className="bg-emerald-500 hover:bg-emerald-400 disabled:bg-neutral-700 text-black px-5 py-2 text-xs font-mono font-black uppercase tracking-widest transition-colors cursor-pointer shadow-[2px_2px_0px_0px_rgba(255,255,255,0.4)]"
              >
                Dispatch Campaign ({eligibleRecipientsCount})
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
                <div className="border-2 border-black bg-white shadow-[6px_6px_0px_0px_rgba(255,255,255,0.2)] text-black overflow-hidden">
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
                    <div className="p-6 space-y-4 text-center">
                      {subheading && (
                        <span className="text-[10px] font-mono font-bold tracking-[2px] text-neutral-500 uppercase block">
                          {subheading}
                        </span>
                      )}

                      {heading && (
                        <h2 className="text-xl font-black uppercase tracking-tight text-black leading-tight">
                          {heading}
                        </h2>
                      )}

                      {bodyText && (
                        <div className="text-xs text-neutral-700 leading-relaxed text-left space-y-2">
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
                        <div className="pt-2">
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
      {/* TAB 3: CUSTOMER EMAIL DIRECTORY                                           */}
      {/* ========================================================================= */}
      {activeTab === 'customers' && (
        <div className="space-y-4">
          {/* Top Search & Filter */}
          <div className="p-4 bg-neutral-900 border border-neutral-800 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-neutral-500 absolute left-3 top-3" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search email or customer name..."
                className="w-full bg-black border border-neutral-700 pl-9 pr-3 py-2 text-xs text-white placeholder:text-neutral-500 font-mono focus:outline-none focus:border-white"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-[11px] font-mono text-neutral-400 shrink-0">Filter Consent:</span>
              <select
                value={consentFilter}
                onChange={(e) => setConsentFilter(e.target.value)}
                className="bg-black border border-neutral-700 text-xs text-white p-2 font-mono focus:outline-none"
              >
                <option value="all">All Contacts ({directoryEntries.length})</option>
                <option value="opted_in">Opted-In ({directoryStats.optedInCount})</option>
                <option value="not_opted_in">Not Subscribed ({directoryStats.notOptedInCount})</option>
                <option value="unsubscribed">Unsubscribed ({directoryStats.unsubscribedCount})</option>
              </select>

              <button
                onClick={fetchDirectory}
                className="p-2 bg-neutral-800 text-neutral-300 hover:text-white"
                title="Refresh contacts"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Directory Stats Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="p-3 bg-neutral-900 border border-neutral-800">
              <span className="text-[10px] font-mono text-neutral-400 block uppercase">
                Total Contacts
              </span>
              <strong className="text-lg font-black text-white">{directoryEntries.length}</strong>
            </div>
            <div className="p-3 bg-neutral-900 border border-neutral-800">
              <span className="text-[10px] font-mono text-neutral-400 block uppercase">
                Registered Users
              </span>
              <strong className="text-lg font-black text-neutral-300">
                {directoryStats.totalCustomers}
              </strong>
            </div>
            <div className="p-3 bg-neutral-900 border border-neutral-800">
              <span className="text-[10px] font-mono text-neutral-400 block uppercase">
                Opted-In (Eligible)
              </span>
              <strong className="text-lg font-black text-emerald-400">
                {directoryStats.optedInCount}
              </strong>
            </div>
            <div className="p-3 bg-neutral-900 border border-neutral-800">
              <span className="text-[10px] font-mono text-neutral-400 block uppercase">
                Not Subscribed
              </span>
              <strong className="text-lg font-black text-neutral-400">
                {directoryStats.notOptedInCount}
              </strong>
            </div>
            <div className="p-3 bg-neutral-900 border border-neutral-800">
              <span className="text-[10px] font-mono text-neutral-400 block uppercase">
                Unsubscribed
              </span>
              <strong className="text-lg font-black text-rose-400">
                {directoryStats.unsubscribedCount}
              </strong>
            </div>
          </div>

          {/* Table */}
          {loadingDirectory ? (
            <div className="p-12 text-center text-xs font-mono text-neutral-400 bg-neutral-900 border border-neutral-800">
              Loading customer directory...
            </div>
          ) : filteredDirectory.length === 0 ? (
            <div className="p-12 text-center bg-neutral-900 border border-neutral-800 text-xs font-mono text-neutral-400">
              No contacts matching the criteria.
            </div>
          ) : (
            <div className="border border-neutral-800 bg-neutral-900 overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-black text-neutral-400 uppercase text-[10px] border-b border-neutral-800">
                  <tr>
                    <th className="p-3">Customer Email</th>
                    <th className="p-3">Name</th>
                    <th className="p-3">Registered On</th>
                    <th className="p-3">Last Sign In</th>
                    <th className="p-3">Auth Provider</th>
                    <th className="p-3">Marketing Consent</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800 text-neutral-300">
                  {filteredDirectory.map((entry) => (
                    <tr key={entry.email} className="hover:bg-neutral-800/40">
                      <td className="p-3 font-bold text-white truncate max-w-xs">{entry.email}</td>
                      <td className="p-3 text-neutral-400">{entry.full_name || '—'}</td>
                      <td className="p-3 text-neutral-400 whitespace-nowrap">
                        {entry.created_at
                          ? new Date(entry.created_at).toLocaleDateString('en-GB')
                          : '—'}
                      </td>
                      <td className="p-3 text-neutral-400 whitespace-nowrap">
                        {entry.last_sign_in_at
                          ? new Date(entry.last_sign_in_at).toLocaleDateString('en-GB')
                          : '—'}
                      </td>
                      <td className="p-3 text-neutral-400 uppercase text-[10px]">
                        {entry.provider}
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
                          {entry.consent_status.replace('_', ' ')}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: OPTED-IN SUBSCRIBERS                                               */}
      {/* ========================================================================= */}
      {activeTab === 'subscribers' && (
        <div className="space-y-4">
          <div className="p-4 bg-neutral-900 border border-neutral-800 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-black uppercase text-white tracking-wider">
                Active Marketing Subscribers ({directoryStats.optedInCount})
              </h3>
              <p className="text-xs text-neutral-400 mt-0.5">
                These addresses have explicitly opted in and will receive broadcast marketing emails.
              </p>
            </div>
            <button
              onClick={fetchDirectory}
              className="p-2 bg-neutral-800 text-neutral-300 hover:text-white"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          <div className="border border-neutral-800 bg-neutral-900 overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-black text-neutral-400 uppercase text-[10px] border-b border-neutral-800">
                <tr>
                  <th className="p-3">Subscriber Email</th>
                  <th className="p-3">Name</th>
                  <th className="p-3">Source</th>
                  <th className="p-3">Opt-In Date</th>
                  <th className="p-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800 text-neutral-300">
                {directoryEntries
                  .filter((e) => e.consent_status === 'opted_in')
                  .map((sub) => (
                    <tr key={sub.email} className="hover:bg-neutral-800/40">
                      <td className="p-3 font-bold text-white">{sub.email}</td>
                      <td className="p-3 text-neutral-400">{sub.full_name || '—'}</td>
                      <td className="p-3 text-neutral-400 uppercase text-[10px]">
                        {sub.is_registered_customer ? 'Registered Customer' : 'Newsletter Form'}
                      </td>
                      <td className="p-3 text-neutral-400">
                        {sub.marketing_consent_at
                          ? new Date(sub.marketing_consent_at).toLocaleDateString('en-GB')
                          : sub.created_at
                          ? new Date(sub.created_at).toLocaleDateString('en-GB')
                          : '—'}
                      </td>
                      <td className="p-3">
                        <button
                          type="button"
                          onClick={async () => {
                            if (
                              !window.confirm(
                                `Manually unsubscribe ${sub.email} from marketing emails?`
                              )
                            )
                              return
                            try {
                              const res = await fetch('/api/admin/email-marketing/subscribers', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ email: sub.email, action: 'unsubscribe' }),
                              })
                              if (!res.ok) throw new Error('Failed to update')
                              toast.success(`${sub.email} unsubscribed`)
                              fetchDirectory()
                            } catch {
                              toast.error('Failed to unsubscribe')
                            }
                          }}
                          className="text-[10px] text-neutral-400 hover:text-red-400 underline cursor-pointer"
                        >
                          Manual Opt-Out
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
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
              Deliver a live test rendering of this marketing email directly to your inbox to inspect formatting, images, typography, and buttons.
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
                <span className="text-neutral-400">Target Audience:</span>
                <span className="text-white font-bold">{audienceType.replace(/_/g, ' ')}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-neutral-800">
                <span className="text-neutral-400">CTA Button:</span>
                <span className="text-white font-bold">{showCta ? `ON (${ctaText})` : 'OFF (Omitted)'}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-neutral-400">Verified Opted-In Count:</span>
                <span className="text-emerald-400 font-bold">{eligibleRecipientsCount} recipients</span>
              </div>
            </div>

            <p className="text-[11px] text-neutral-400 font-mono leading-relaxed">
              Emails will strictly be sent to verified opted-in subscribers. Unsubscribed or non-opted customers are automatically excluded.
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
