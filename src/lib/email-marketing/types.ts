export interface CampaignContent {
  heading?: string
  subheading?: string
  body_text?: string
  hero_image_url?: string
  hero_image_alt?: string
  text_alignment?: 'left' | 'center' | 'right'
  text_color?: string
  background_color?: string
  card_background_color?: string

  // Optional CTA Button: Default OFF. If false, completely removed from email.
  show_cta: boolean
  cta_text?: string
  cta_url?: string
  cta_style?: 'black' | 'white' | 'outline' | 'custom'
  cta_bg_color?: string
  cta_text_color?: string
  cta_alignment?: 'left' | 'center' | 'right'

  secondary_blocks?: Array<{
    title?: string
    text?: string
    image_url?: string
  }>

  // Specific customer emails when audience_type is 'specific_customers'
  specific_recipients?: string[]
}

export type CampaignTemplateId =
  | 'coming_soon'
  | 'first_drop'
  | 'new_collection'
  | 'exclusive_offer'
  | 'back_in_stock'
  | 'custom_blank'
  | 'drop_soon' // legacy alias for coming_soon

export type CampaignAudienceType =
  | 'all_registered'
  | 'marketing_eligible_registered'
  | 'specific_customers'
  | 'existing_opted_in'
  | 'all_opted_in' // backward-compat alias
  | 'newsletter_only' // backward-compat alias
  | 'customers_opted_in' // backward-compat alias

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
  auth_method_label: string
  is_registered_customer: boolean
  is_newsletter_subscriber: boolean
  consent_status: MarketingConsentStatus
  marketing_consent: boolean
  marketing_consent_at: string | null
  orders_count?: number
}

export interface AudienceBreakdown {
  audienceType: CampaignAudienceType
  totalCount: number
  eligibleCount: number
  excludedCount: number
  eligibleRecipients: { email: string; name?: string }[]
  exclusionReasons: {
    no_consent: number
    unsubscribed: number
    other: number
  }
}
