export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          phone: string | null
          avatar_url: string | null
          role: 'customer' | 'admin'
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          phone?: string | null
          avatar_url?: string | null
          role?: 'customer' | 'admin'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          phone?: string | null
          avatar_url?: string | null
          role?: 'customer' | 'admin'
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          user_id: string
          role: 'admin' | 'staff' | 'superadmin'
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          role: 'admin' | 'staff' | 'superadmin'
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          role?: 'admin' | 'staff' | 'superadmin'
          created_at?: string
        }
        Relationships: []
      }
      addresses: {
        Row: {
          id: string
          user_id: string
          full_name: string
          phone: string
          address_line1: string
          address_line2: string | null
          city: string
          state: string
          pin_code: string
          country: string
          is_default: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          full_name: string
          phone: string
          address_line1: string
          address_line2?: string | null
          city: string
          state: string
          pin_code: string
          country?: string
          is_default?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          full_name?: string
          phone?: string
          address_line1?: string
          address_line2?: string | null
          city?: string
          state?: string
          pin_code?: string
          country?: string
          is_default?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          id: string
          name: string
          slug: string
          description: string | null
          image_url: string | null
          parent_id: string | null
          sort_order: number
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          description?: string | null
          image_url?: string | null
          parent_id?: string | null
          sort_order?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          description?: string | null
          image_url?: string | null
          parent_id?: string | null
          sort_order?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      collections: {
        Row: {
          id: string
          name: string
          slug: string
          description: string | null
          banner_image_url: string | null
          is_visible: boolean
          launch_date: string | null
          sort_order: number
          seo_title: string | null
          seo_description: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          description?: string | null
          banner_image_url?: string | null
          is_visible?: boolean
          launch_date?: string | null
          sort_order?: number
          seo_title?: string | null
          seo_description?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          description?: string | null
          banner_image_url?: string | null
          is_visible?: boolean
          launch_date?: string | null
          sort_order?: number
          seo_title?: string | null
          seo_description?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      collection_products: {
        Row: {
          id: string
          collection_id: string
          product_id: string
          sort_order: number
          created_at: string
        }
        Insert: {
          id?: string
          collection_id: string
          product_id: string
          sort_order?: number
          created_at?: string
        }
        Update: {
          id?: string
          collection_id?: string
          product_id?: string
          sort_order?: number
          created_at?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          id: string
          name: string
          slug: string
          description: string
          category_id: string | null
          material: string | null
          fit: string | null
          wash_care: string | null
          mrp: number
          selling_price: number
          is_active: boolean
          is_published: boolean
          seo_title: string | null
          seo_description: string | null
          tags: string[]
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          description: string
          category_id?: string | null
          material?: string | null
          fit?: string | null
          wash_care?: string | null
          mrp: number
          selling_price: number
          is_active?: boolean
          is_published?: boolean
          seo_title?: string | null
          seo_description?: string | null
          tags?: string[]
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          description?: string
          category_id?: string | null
          material?: string | null
          fit?: string | null
          wash_care?: string | null
          mrp?: number
          selling_price?: number
          is_active?: boolean
          is_published?: boolean
          seo_title?: string | null
          seo_description?: string | null
          tags?: string[]
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      product_images: {
        Row: {
          id: string
          product_id: string
          image_url: string
          storage_path: string | null
          alt_text: string | null
          sort_order: number
          created_at: string
        }
        Insert: {
          id?: string
          product_id: string
          image_url: string
          storage_path?: string | null
          alt_text?: string | null
          sort_order?: number
          created_at?: string
        }
        Update: {
          id?: string
          product_id?: string
          image_url?: string
          storage_path?: string | null
          alt_text?: string | null
          sort_order?: number
          created_at?: string
        }
        Relationships: []
      }
      product_variants: {
        Row: {
          id: string
          product_id: string
          sku: string
          color: string
          size: string
          stock: number
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          product_id: string
          sku: string
          color: string
          size: string
          stock?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          product_id?: string
          sku?: string
          color?: string
          size?: string
          stock?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      inventory_reservations: {
        Row: {
          id: string
          variant_id: string
          quantity: number
          order_id: string | null
          session_id: string | null
          user_id: string | null
          status: 'active' | 'confirmed' | 'released' | 'expired'
          expires_at: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          variant_id: string
          quantity: number
          order_id?: string | null
          session_id?: string | null
          user_id?: string | null
          status?: 'active' | 'confirmed' | 'released' | 'expired'
          expires_at: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          variant_id?: string
          quantity?: number
          order_id?: string | null
          session_id?: string | null
          user_id?: string | null
          status?: 'active' | 'confirmed' | 'released' | 'expired'
          expires_at?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      inventory_movements: {
        Row: {
          id: string
          variant_id: string
          movement_type: 'purchase' | 'sale' | 'return' | 'adjustment' | 'restock'
          quantity: number
          reference_id: string | null
          reference_type: string | null
          notes: string | null
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          variant_id: string
          movement_type: 'purchase' | 'sale' | 'return' | 'adjustment' | 'restock'
          quantity: number
          reference_id?: string | null
          reference_type?: string | null
          notes?: string | null
          created_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          variant_id?: string
          movement_type?: 'purchase' | 'sale' | 'return' | 'adjustment' | 'restock'
          quantity?: number
          reference_id?: string | null
          reference_type?: string | null
          notes?: string | null
          created_by?: string | null
          created_at?: string
        }
        Relationships: []
      }
      carts: {
        Row: {
          id: string
          user_id: string | null
          session_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          session_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          session_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      cart_items: {
        Row: {
          id: string
          cart_id: string
          variant_id: string
          quantity: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          cart_id: string
          variant_id: string
          quantity: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          cart_id?: string
          variant_id?: string
          quantity?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      wishlists: {
        Row: {
          id: string
          user_id: string | null
          session_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          session_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          session_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      wishlist_items: {
        Row: {
          id: string
          wishlist_id: string
          variant_id: string
          created_at: string
        }
        Insert: {
          id?: string
          wishlist_id: string
          variant_id: string
          created_at?: string
        }
        Update: {
          id?: string
          wishlist_id?: string
          variant_id?: string
          created_at?: string
        }
        Relationships: []
      }
      orders: {
        Row: {
          id: string
          order_number: string
          user_id: string | null
          guest_email: string | null
          guest_phone: string | null
          status: 'pending' | 'confirmed' | 'unfulfilled' | 'packed' | 'pickup_scheduled' | 'shipped' | 'out_for_delivery' | 'delivered' | 'delivery_exception' | 'return_to_origin' | 'cancelled' | 'return_requested' | 'returned' | 'refunded'
          payment_status: 'pending' | 'paid' | 'failed' | 'refunded' | 'partially_refunded'
          payment_method: 'cashfree' | 'cod'
          subtotal: number
          discount_amount: number
          shipping_amount: number
          total_amount: number
          coupon_id: string | null
          coupon_discount: number
          billing_address: Json
          shipping_address: Json
          notes: string | null
          cancellation_reason: string | null
          cancelled_at: string | null
          tracking_number: string | null
          carrier: string | null
          tracking_url?: string | null
          dispatch_date?: string | null
          estimated_delivery_min?: string | null
          estimated_delivery_max?: string | null
          package_weight_grams?: number | null
          package_dimensions?: Json | null
          status_history?: Json | null
          shipped_email_sent_at?: string | null
          delivered_email_sent_at?: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          order_number: string
          user_id?: string | null
          guest_email?: string | null
          guest_phone?: string | null
          status?: 'pending' | 'confirmed' | 'unfulfilled' | 'packed' | 'pickup_scheduled' | 'shipped' | 'out_for_delivery' | 'delivered' | 'delivery_exception' | 'return_to_origin' | 'cancelled' | 'return_requested' | 'returned' | 'refunded'
          payment_status?: 'pending' | 'paid' | 'failed' | 'refunded' | 'partially_refunded'
          payment_method?: 'cashfree' | 'cod'
          subtotal: number
          discount_amount?: number
          shipping_amount?: number
          total_amount: number
          coupon_id?: string | null
          coupon_discount?: number
          billing_address: Json
          shipping_address: Json
          notes?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          tracking_number?: string | null
          carrier?: string | null
          tracking_url?: string | null
          dispatch_date?: string | null
          estimated_delivery_min?: string | null
          estimated_delivery_max?: string | null
          package_weight_grams?: number | null
          package_dimensions?: Json | null
          status_history?: Json | null
          shipped_email_sent_at?: string | null
          delivered_email_sent_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          order_number?: string
          user_id?: string | null
          guest_email?: string | null
          guest_phone?: string | null
          status?: 'pending' | 'confirmed' | 'unfulfilled' | 'packed' | 'pickup_scheduled' | 'shipped' | 'out_for_delivery' | 'delivered' | 'delivery_exception' | 'return_to_origin' | 'cancelled' | 'return_requested' | 'returned' | 'refunded'
          payment_status?: 'pending' | 'paid' | 'failed' | 'refunded' | 'partially_refunded'
          payment_method?: 'cashfree' | 'cod'
          subtotal?: number
          discount_amount?: number
          shipping_amount?: number
          total_amount?: number
          coupon_id?: string | null
          coupon_discount?: number
          billing_address?: Json
          shipping_address?: Json
          notes?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          tracking_number?: string | null
          carrier?: string | null
          tracking_url?: string | null
          dispatch_date?: string | null
          estimated_delivery_min?: string | null
          estimated_delivery_max?: string | null
          package_weight_grams?: number | null
          package_dimensions?: Json | null
          status_history?: Json | null
          shipped_email_sent_at?: string | null
          delivered_email_sent_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      order_items: {
        Row: {
          id: string
          order_id: string
          product_id: string
          variant_id: string
          product_name: string
          variant_info: Json
          quantity: number
          mrp: number
          selling_price: number
          discount_amount: number
          total_amount: number
          created_at: string
        }
        Insert: {
          id?: string
          order_id: string
          product_id: string
          variant_id: string
          product_name: string
          variant_info: Json
          quantity: number
          mrp: number
          selling_price: number
          discount_amount?: number
          total_amount: number
          created_at?: string
        }
        Update: {
          id?: string
          order_id?: string
          product_id?: string
          variant_id?: string
          product_name?: string
          variant_info?: Json
          quantity?: number
          mrp?: number
          selling_price?: number
          discount_amount?: number
          total_amount?: number
          created_at?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          id: string
          order_id: string
          cashfree_order_id: string | null
          cf_payment_id: string | null
          amount: number
          status: 'pending' | 'paid' | 'failed' | 'cancelled' | 'refunded' | 'partially_refunded'
          payment_method: 'cashfree' | 'cod'
          currency: string
          payment_data: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          order_id: string
          cashfree_order_id?: string | null
          cf_payment_id?: string | null
          amount: number
          status?: 'pending' | 'paid' | 'failed' | 'cancelled' | 'refunded' | 'partially_refunded'
          payment_method?: 'cashfree' | 'cod'
          currency?: string
          payment_data?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          order_id?: string
          cashfree_order_id?: string | null
          cf_payment_id?: string | null
          amount?: number
          status?: 'pending' | 'paid' | 'failed' | 'cancelled' | 'refunded' | 'partially_refunded'
          payment_method?: 'cashfree' | 'cod'
          currency?: string
          payment_data?: Json
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      payment_events: {
        Row: {
          id: string
          payment_id: string
          event_type: string
          event_data: Json
          processed: boolean
          created_at: string
        }
        Insert: {
          id?: string
          payment_id: string
          event_type: string
          event_data: Json
          processed?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          payment_id?: string
          event_type?: string
          event_data?: Json
          processed?: boolean
          created_at?: string
        }
        Relationships: []
      }
      coupons: {
        Row: {
          id: string
          code: string
          description: string | null
          discount_type: 'percentage' | 'fixed'
          discount_value: number
          minimum_amount: number
          maximum_discount: number | null
          start_date: string
          expiry_date: string
          usage_limit: number | null
          usage_count: number
          per_customer_limit: number | null
          applicable_products: string[]
          applicable_collections: string[]
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          code: string
          description?: string | null
          discount_type: 'percentage' | 'fixed'
          discount_value: number
          minimum_amount?: number
          maximum_discount?: number | null
          start_date: string
          expiry_date: string
          usage_limit?: number | null
          usage_count?: number
          per_customer_limit?: number | null
          applicable_products?: string[]
          applicable_collections?: string[]
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          code?: string
          description?: string | null
          discount_type?: 'percentage' | 'fixed'
          discount_value?: number
          minimum_amount?: number
          maximum_discount?: number | null
          start_date?: string
          expiry_date?: string
          usage_limit?: number | null
          usage_count?: number
          per_customer_limit?: number | null
          applicable_products?: string[]
          applicable_collections?: string[]
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      coupon_usage: {
        Row: {
          id: string
          coupon_id: string
          user_id: string
          order_id: string
          discount_amount: number
          created_at: string
        }
        Insert: {
          id?: string
          coupon_id: string
          user_id: string
          order_id: string
          discount_amount: number
          created_at?: string
        }
        Update: {
          id?: string
          coupon_id?: string
          user_id?: string
          order_id?: string
          discount_amount?: number
          created_at?: string
        }
        Relationships: []
      }
      reviews: {
        Row: {
          id: string
          product_id: string
          user_id: string
          order_id: string | null
          rating: number
          review: string | null
          images: string[]
          is_verified_purchase: boolean
          is_approved: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          product_id: string
          user_id: string
          order_id?: string | null
          rating: number
          review?: string | null
          images?: string[]
          is_verified_purchase?: boolean
          is_approved?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          product_id?: string
          user_id?: string
          order_id?: string | null
          rating?: number
          review?: string | null
          images?: string[]
          is_verified_purchase?: boolean
          is_approved?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      returns: {
        Row: {
          id: string
          order_id: string
          user_id: string
          status: 'requested' | 'approved' | 'rejected' | 'pickup_scheduled' | 'received' | 'refund_processing' | 'refunded'
          reason: string
          notes: string | null
          images: string[]
          refund_amount: number
          refund_status: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          order_id: string
          user_id: string
          status?: 'requested' | 'approved' | 'rejected' | 'pickup_scheduled' | 'received' | 'refund_processing' | 'refunded'
          reason: string
          notes?: string | null
          images?: string[]
          refund_amount?: number
          refund_status?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          order_id?: string
          user_id?: string
          status?: 'requested' | 'approved' | 'rejected' | 'pickup_scheduled' | 'received' | 'refund_processing' | 'refunded'
          reason?: string
          notes?: string | null
          images?: string[]
          refund_amount?: number
          refund_status?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      return_items: {
        Row: {
          id: string
          return_id: string
          order_item_id: string
          quantity: number
          reason: string | null
          created_at: string
        }
        Insert: {
          id?: string
          return_id: string
          order_item_id: string
          quantity: number
          reason?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          return_id?: string
          order_item_id?: string
          quantity?: number
          reason?: string | null
          created_at?: string
        }
        Relationships: []
      }
      refunds: {
        Row: {
          id: string
          order_id: string
          return_id: string | null
          cashfree_refund_id: string | null
          cf_refund_id: string | null
          amount_paise: number
          refund_type: 'cashfree' | 'cod_manual' | 'store_credit'
          status: 'pending' | 'processing' | 'successful' | 'failed' | 'manual_review'
          reason: string
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          order_id: string
          return_id?: string | null
          cashfree_refund_id?: string | null
          cf_refund_id?: string | null
          amount_paise: number
          refund_type: 'cashfree' | 'cod_manual' | 'store_credit'
          status?: 'pending' | 'processing' | 'successful' | 'failed' | 'manual_review'
          reason: string
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          order_id?: string
          return_id?: string | null
          cashfree_refund_id?: string | null
          cf_refund_id?: string | null
          amount_paise?: number
          refund_type?: 'cashfree' | 'cod_manual' | 'store_credit'
          status?: 'pending' | 'processing' | 'successful' | 'failed' | 'manual_review'
          reason?: string
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      shipments: {
        Row: {
          id: string
          order_id: string
          courier: string | null
          awb: string | null
          tracking_id: string | null
          tracking_url: string | null
          tracking_data: Json
          status: string | null
          shipped_at: string | null
          delivered_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          order_id: string
          courier?: string | null
          awb?: string | null
          tracking_id?: string | null
          tracking_url?: string | null
          tracking_data?: Json
          status?: string | null
          shipped_at?: string | null
          delivered_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          order_id?: string
          courier?: string | null
          awb?: string | null
          tracking_id?: string | null
          tracking_url?: string | null
          tracking_data?: Json
          status?: string | null
          shipped_at?: string | null
          delivered_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      shipment_events: {
        Row: {
          id: string
          shipment_id: string
          event_type: string
          event_data: Json
          created_at: string
        }
        Insert: {
          id?: string
          shipment_id: string
          event_type: string
          event_data: Json
          created_at?: string
        }
        Update: {
          id?: string
          shipment_id?: string
          event_type?: string
          event_data?: Json
          created_at?: string
        }
        Relationships: []
      }
      banners: {
        Row: {
          id: string
          title: string
          image_url: string
          mobile_image_url: string | null
          link_url: string | null
          link_text: string | null
          position: string
          is_active: boolean
          start_date: string | null
          end_date: string | null
          sort_order: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          image_url: string
          mobile_image_url?: string | null
          link_url?: string | null
          link_text?: string | null
          position: string
          is_active?: boolean
          start_date?: string | null
          end_date?: string | null
          sort_order?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          image_url?: string
          mobile_image_url?: string | null
          link_url?: string | null
          link_text?: string | null
          position?: string
          is_active?: boolean
          start_date?: string | null
          end_date?: string | null
          sort_order?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      drops: {
        Row: {
          id: string
          name: string
          slug: string
          description: string | null
          banner_image_url: string
          launch_date: string
          launch_time: string
          status: 'coming_soon' | 'live' | 'ended'
          product_ids: string[]
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          description?: string | null
          banner_image_url: string
          launch_date: string
          launch_time: string
          status?: 'coming_soon' | 'live' | 'ended'
          product_ids?: string[]
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          description?: string | null
          banner_image_url?: string
          launch_date?: string
          launch_time?: string
          status?: 'coming_soon' | 'live' | 'ended'
          product_ids?: string[]
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      drop_products: {
        Row: {
          id: string
          drop_id: string
          product_id: string
          sort_order: number
          created_at: string
        }
        Insert: {
          id?: string
          drop_id: string
          product_id: string
          sort_order?: number
          created_at?: string
        }
        Update: {
          id?: string
          drop_id?: string
          product_id?: string
          sort_order?: number
          created_at?: string
        }
        Relationships: []
      }
      restock_requests: {
        Row: {
          id: string
          variant_id: string
          email: string
          phone: string | null
          is_notified: boolean
          created_at: string
        }
        Insert: {
          id?: string
          variant_id: string
          email: string
          phone?: string | null
          is_notified?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          variant_id?: string
          email?: string
          phone?: string | null
          is_notified?: boolean
          created_at?: string
        }
        Relationships: []
      }
      newsletter_subscribers: {
        Row: {
          id: string
          email: string
          status: 'pending' | 'active' | 'unsubscribed'
          confirmation_token: string | null
          token_expires_at: string | null
          confirmed_at: string | null
          unsubscribe_token: string | null
          unsubscribed_at: string | null
          last_sent_at: string | null
          consent_given: boolean
          source: string | null
          created_at: string
          updated_at: string | null
        }
        Insert: {
          id?: string
          email: string
          status?: 'pending' | 'active' | 'unsubscribed'
          confirmation_token?: string | null
          token_expires_at?: string | null
          confirmed_at?: string | null
          unsubscribe_token?: string | null
          unsubscribed_at?: string | null
          last_sent_at?: string | null
          consent_given?: boolean
          source?: string | null
          created_at?: string
          updated_at?: string | null
        }
        Update: {
          id?: string
          email?: string
          status?: 'pending' | 'active' | 'unsubscribed'
          confirmation_token?: string | null
          token_expires_at?: string | null
          confirmed_at?: string | null
          unsubscribe_token?: string | null
          unsubscribed_at?: string | null
          last_sent_at?: string | null
          consent_given?: boolean
          source?: string | null
          created_at?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      store_settings: {
        Row: {
          key: string
          value: Json
          description: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          key: string
          value: Json
          description?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          key?: string
          value?: Json
          description?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      content_pages: {
        Row: {
          id: string
          slug: string
          title: string
          content_html: string
          is_published: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          slug: string
          title: string
          content_html: string
          is_published?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          slug?: string
          title?: string
          content_html?: string
          is_published?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      outbox_jobs: {
        Row: {
          id: string
          job_type: string
          payload: Json
          status: 'pending' | 'processing' | 'completed' | 'failed'
          retry_count: number
          max_retries: number
          last_error: string | null
          scheduled_at: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          job_type: string
          payload: Json
          status?: 'pending' | 'processing' | 'completed' | 'failed'
          retry_count?: number
          max_retries?: number
          last_error?: string | null
          scheduled_at?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          job_type?: string
          payload?: Json
          status?: 'pending' | 'processing' | 'completed' | 'failed'
          retry_count?: number
          max_retries?: number
          last_error?: string | null
          scheduled_at?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      admin_audit_logs: {
        Row: {
          id: string
          admin_id: string
          action: string
          entity: string
          entity_id: string
          metadata: Json
          created_at: string
        }
        Insert: {
          id?: string
          admin_id: string
          action: string
          entity: string
          entity_id: string
          metadata?: Json
          created_at?: string
        }
        Update: {
          id?: string
          admin_id?: string
          action?: string
          entity?: string
          entity_id?: string
          metadata?: Json
          created_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      reserve_inventory: {
        Args: {
          p_variant_id: string
          p_quantity: number
          p_reference_id: string
          p_reference_type: string
          p_created_by?: string
        }
        Returns: void
      }
      release_inventory: {
        Args: {
          p_variant_id: string
          p_quantity: number
          p_reference_id: string
          p_reference_type: string
          p_created_by?: string
        }
        Returns: void
      }
      adjust_inventory: {
        Args: {
          p_variant_id: string
          p_quantity: number
          p_reference_id: string
          p_reference_type: string
          p_notes?: string
          p_created_by?: string
        }
        Returns: void
      }
      increment_coupon_usage: {
        Args: {
          p_coupon_id: string
        }
        Returns: void
      }
      get_variant_available_stock: {
        Args: {
          p_variant_id: string
        }
        Returns: number
      }
      reserve_stock_atomic: {
        Args: {
          p_variant_id: string
          p_quantity: number
          p_order_id: string
          p_session_id?: string
          p_user_id?: string
          p_hold_minutes?: number
        }
        Returns: string
      }
      confirm_stock_reservation: {
        Args: {
          p_order_id: string
          p_created_by?: string
        }
        Returns: void
      }
      release_stock_reservation: {
        Args: {
          p_order_id: string
        }
        Returns: void
      }
      cleanup_expired_reservations: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      is_admin: {
        Args: {
          check_user_id?: string
        }
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
