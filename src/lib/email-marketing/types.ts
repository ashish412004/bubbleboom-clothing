export interface CampaignContent {
  heading?: string
  subheading?: string
  body_text?: string
  hero_image_url?: string
  hero_image_alt?: string
  // Optional CTA Button: Default OFF. If false, completely removed from email.
  show_cta: boolean
  cta_text?: string
  cta_url?: string
  cta_style?: 'black' | 'white' | 'outline'
  secondary_blocks?: Array<{
    title?: string
    text?: string
    image_url?: string
  }>
}

export type CampaignTemplateId =
  | 'drop_soon'
  | 'new_collection'
  | 'exclusive_offer'
  | 'back_in_stock'
  | 'custom_blank'

export type CampaignAudienceType =
  | 'all_opted_in'
  | 'newsletter_only'
  | 'customers_opted_in'

export type CampaignStatus =
  | 'draft'
  | 'scheduled'
  | 'sending'
  | 'sent'
  | 'cancelled'

export interface MarketingCampaign {
  id: string
  name: string
  subject: string
  preheader?: string | null
  sender_name?: string | null
  audience_type: CampaignAudienceType
  template_id: CampaignTemplateId
  content: CampaignContent
  status: CampaignStatus
  total_recipients: number
  sent_count: number
  failed_count: number
  created_by?: string | null
  created_at: string
  updated_at: string
  sent_at?: string | null
}

export type MarketingConsentStatus = 'opted_in' | 'not_opted_in' | 'unsubscribed'

export interface CustomerDirectoryEntry {
  id: string
  email: string
  full_name: string | null
  created_at: string
  last_sign_in_at: string | null
  provider: string
  is_registered_customer: boolean
  is_newsletter_subscriber: boolean
  consent_status: MarketingConsentStatus
  marketing_consent: boolean
  marketing_consent_at: string | null
}
