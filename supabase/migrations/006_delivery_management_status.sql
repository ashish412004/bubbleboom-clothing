-- 006_delivery_management_status.sql
-- Update orders status check constraint and ensure fulfillment tracking columns exist

ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_status_check CHECK (
  status IN (
    'pending',
    'confirmed',
    'unfulfilled',
    'packed',
    'pickup_scheduled',
    'shipped',
    'out_for_delivery',
    'delivered',
    'delivery_exception',
    'return_to_origin',
    'cancelled',
    'return_requested',
    'returned',
    'refunded'
  )
);

-- Ensure fulfillment metadata columns exist on orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS tracking_url TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS dispatch_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS estimated_delivery_min DATE;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS estimated_delivery_max DATE;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS package_weight_grams INTEGER;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS package_dimensions JSONB;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS status_history JSONB DEFAULT '[]'::JSONB;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipped_email_sent_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivered_email_sent_at TIMESTAMP WITH TIME ZONE;

-- Notify PostgREST to immediately refresh its schema cache
NOTIFY pgrst, 'reload schema';

