-- Inventory management functions for atomic operations

-- Function to reserve inventory (for pending orders)
CREATE OR REPLACE FUNCTION reserve_inventory(
  p_variant_id UUID,
  p_quantity INTEGER,
  p_reference_id UUID,
  p_reference_type TEXT,
  p_created_by UUID DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
  v_current_stock INTEGER;
BEGIN
  -- Get current stock with lock
  SELECT stock INTO v_current_stock
  FROM product_variants
  WHERE id = p_variant_id
  FOR UPDATE;

  -- Check if enough stock
  IF v_current_stock < p_quantity THEN
    RAISE EXCEPTION 'Insufficient stock';
  END IF;

  -- Reduce stock
  UPDATE product_variants
  SET stock = stock - p_quantity,
      updated_at = NOW()
  WHERE id = p_variant_id;

  -- Record movement
  INSERT INTO inventory_movements (
    variant_id,
    movement_type,
    quantity,
    reference_id,
    reference_type,
    created_by,
    created_at
  ) VALUES (
    p_variant_id,
    'sale',
    -p_quantity,
    p_reference_id,
    p_reference_type,
    p_created_by,
    NOW()
  );
END;
$$ LANGUAGE plpgsql;

-- Function to release inventory (for cancelled orders)
CREATE OR REPLACE FUNCTION release_inventory(
  p_variant_id UUID,
  p_quantity INTEGER,
  p_reference_id UUID,
  p_reference_type TEXT,
  p_created_by UUID DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  -- Increase stock
  UPDATE product_variants
  SET stock = stock + p_quantity,
      updated_at = NOW()
  WHERE id = p_variant_id;

  -- Record movement
  INSERT INTO inventory_movements (
    variant_id,
    movement_type,
    quantity,
    reference_id,
    reference_type,
    created_by,
    created_at
  ) VALUES (
    p_variant_id,
    'return',
    p_quantity,
    p_reference_id,
    p_reference_type,
    p_created_by,
    NOW()
  );
END;
$$ LANGUAGE plpgsql;

-- Function to adjust inventory (for manual adjustments)
CREATE OR REPLACE FUNCTION adjust_inventory(
  p_variant_id UUID,
  p_quantity INTEGER,
  p_reference_id UUID,
  p_reference_type TEXT,
  p_notes TEXT DEFAULT NULL,
  p_created_by UUID DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  -- Adjust stock
  UPDATE product_variants
  SET stock = stock + p_quantity,
      updated_at = NOW()
  WHERE id = p_variant_id;

  -- Record movement
  INSERT INTO inventory_movements (
    variant_id,
    movement_type,
    quantity,
    reference_id,
    reference_type,
    notes,
    created_by,
    created_at
  ) VALUES (
    p_variant_id,
    'adjustment',
    p_quantity,
    p_reference_id,
    p_reference_type,
    p_notes,
    p_created_by,
    NOW()
  );
END;
$$ LANGUAGE plpgsql;
