-- 014_order_status_notification_trigger.sql
-- Automatically queues order notification outbox entries on legitimate order status transitions,
-- ensuring updates made directly in Supabase or via any API always generate outbox events.

CREATE OR REPLACE FUNCTION public.handle_order_status_change_notification()
RETURNS TRIGGER AS $$
DECLARE
  v_event_type TEXT;
  v_unique_event TEXT;
  v_customer_email TEXT;
  v_customer_name TEXT;
  v_items JSONB := '[]'::jsonb;
BEGIN
  -- Only trigger when status actually changes
  IF OLD.status IS NOT DISTINCT FROM NEW.status THEN
    RETURN NEW;
  END IF;

  -- Map order status transition to notification event_type
  IF NEW.status = 'confirmed' THEN
    v_event_type := 'order_confirmed';
  ELSIF NEW.status = 'packed' THEN
    v_event_type := 'order_packed';
  ELSIF NEW.status = 'shipped' THEN
    v_event_type := 'order_shipped';
  ELSIF NEW.status = 'out_for_delivery' THEN
    v_event_type := 'out_for_delivery';
  ELSIF NEW.status = 'delivered' THEN
    v_event_type := 'order_delivered';
  ELSIF NEW.status = 'cancelled' THEN
    v_event_type := 'order_cancelled';
  ELSIF NEW.status = 'refunded' THEN
    v_event_type := 'refund_completed';
  ELSE
    RETURN NEW;
  END IF;

  -- Determine customer email
  v_customer_email := COALESCE(
    NEW.guest_email,
    NEW.shipping_address->>'email'
  );

  IF v_customer_email IS NULL AND NEW.user_id IS NOT NULL THEN
    SELECT email INTO v_customer_email FROM public.profiles WHERE id = NEW.user_id;
  END IF;

  -- If still no customer email found, cannot notify
  IF v_customer_email IS NULL OR v_customer_email = '' THEN
    RETURN NEW;
  END IF;

  -- Determine customer name
  v_customer_name := COALESCE(
    NEW.shipping_address->>'full_name',
    'Valued Customer'
  );

  -- Assemble items if order_items exist
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'product_id', oi.product_id,
      'product_name', oi.product_name,
      'quantity', oi.quantity,
      'price', oi.selling_price,
      'total_amount', oi.total_amount,
      'variant_info', oi.variant_info
    )
  ), '[]'::jsonb) INTO v_items
  FROM public.order_items oi
  WHERE oi.order_id = NEW.id;

  v_unique_event := NEW.id::text || '_' || v_event_type;

  -- Insert into email_notification_outbox with ON CONFLICT DO NOTHING for complete idempotency
  INSERT INTO public.email_notification_outbox (
    id,
    order_id,
    customer_email,
    event_type,
    status,
    attempts,
    created_at,
    unique_event_id,
    payload
  )
  VALUES (
    gen_random_uuid(),
    NEW.id,
    v_customer_email,
    v_event_type,
    'pending',
    0,
    NOW(),
    v_unique_event,
    jsonb_build_object(
      'order_id', NEW.id,
      'order_number', COALESCE(NEW.order_number, NEW.id::text),
      'event', v_event_type,
      'recipient_email', v_customer_email,
      'customer_name', v_customer_name,
      'total_amount', NEW.total_amount,
      'payment_method', NEW.payment_method,
      'payment_status', NEW.payment_status,
      'shipping_address', NEW.shipping_address,
      'carrier', NEW.carrier,
      'tracking_number', NEW.tracking_number,
      'tracking_url', NEW.tracking_url,
      'items', v_items
    )
  )
  ON CONFLICT (unique_event_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate trigger on public.orders
DROP TRIGGER IF EXISTS trg_order_status_notification ON public.orders;
CREATE TRIGGER trg_order_status_notification
  AFTER UPDATE OF status ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_order_status_change_notification();
