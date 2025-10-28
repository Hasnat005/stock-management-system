-- Supabase SQL Setup for Stock Management System (normalized schema)
-- Run this in your Supabase SQL Editor

-- Ensure required extension for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- -------------------------------
-- Categories
-- -------------------------------
CREATE TABLE IF NOT EXISTS categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'allow_all_categories' AND tablename = 'categories') THEN
    EXECUTE 'DROP POLICY allow_all_categories ON categories';
  END IF;
END$$;
CREATE POLICY allow_all_categories ON categories FOR ALL USING (true) WITH CHECK (true);

-- -------------------------------
-- Companies
-- -------------------------------
CREATE TABLE IF NOT EXISTS companies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'allow_all_companies' AND tablename = 'companies') THEN
    EXECUTE 'DROP POLICY allow_all_companies ON companies';
  END IF;
END$$;
CREATE POLICY allow_all_companies ON companies FOR ALL USING (true) WITH CHECK (true);

-- -------------------------------
-- Items
-- -------------------------------
CREATE TABLE IF NOT EXISTS items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  reorder_level INTEGER DEFAULT 0 CHECK (reorder_level >= 0),
  available_quantity INTEGER DEFAULT 0 CHECK (available_quantity >= 0),
  price NUMERIC NOT NULL CHECK (price >= 0),
  date_added TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- If an older version of the `items` table exists (created before this script was updated),
-- ensure the expected columns exist. This makes the script safe to re-run when the table
-- was previously created without the new columns.
ALTER TABLE items
  ADD COLUMN IF NOT EXISTS category_id UUID;

ALTER TABLE items
  ADD COLUMN IF NOT EXISTS company_id UUID;

ALTER TABLE items
  ADD COLUMN IF NOT EXISTS reorder_level INTEGER DEFAULT 0;

ALTER TABLE items
  ADD COLUMN IF NOT EXISTS available_quantity INTEGER DEFAULT 0;

ALTER TABLE items
  ADD COLUMN IF NOT EXISTS price NUMERIC DEFAULT 0;

ALTER TABLE items
  ADD COLUMN IF NOT EXISTS date_added TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Add foreign key constraints only if they don't already exist (safe for reruns)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_items_category'
  ) THEN
    ALTER TABLE items ADD CONSTRAINT fk_items_category FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_items_company'
  ) THEN
    ALTER TABLE items ADD CONSTRAINT fk_items_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE SET NULL;
  END IF;
END$$;

ALTER TABLE items ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'allow_all_items' AND tablename = 'items') THEN
    EXECUTE 'DROP POLICY allow_all_items ON items';
  END IF;
END$$;
CREATE POLICY allow_all_items ON items FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_items_name ON items(name);
CREATE INDEX IF NOT EXISTS idx_items_category_id ON items(category_id);
CREATE INDEX IF NOT EXISTS idx_items_company_id ON items(company_id);
CREATE INDEX IF NOT EXISTS idx_items_date_added ON items(date_added);

-- -------------------------------
-- Stock movements (Stock In / Stock Out)
-- -------------------------------
CREATE TABLE IF NOT EXISTS stock_movements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  item_id UUID REFERENCES items(id) ON DELETE CASCADE,
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  movement_type TEXT NOT NULL CHECK (movement_type IN ('IN','OUT')),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'allow_all_stock_movements' AND tablename = 'stock_movements') THEN
    EXECUTE 'DROP POLICY allow_all_stock_movements ON stock_movements';
  END IF;
END$$;
CREATE POLICY allow_all_stock_movements ON stock_movements FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_stock_movements_item_id ON stock_movements(item_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_company_id ON stock_movements(company_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_created_at ON stock_movements(created_at);

-- -------------------------------
-- Backfill / migrate legacy `quantity` column if present
-- Some older schema versions had a NOT NULL `quantity` column on `items`.
-- If that column exists, migrate its values into `available_quantity` safely
-- and remove the legacy column.
-- -------------------------------
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'items' AND column_name = 'quantity'
  ) THEN
    -- If available_quantity doesn't exist, rename legacy column to available_quantity
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'items' AND column_name = 'available_quantity'
    ) THEN
      ALTER TABLE items RENAME COLUMN quantity TO available_quantity;
      -- ensure defaults and constraints
      ALTER TABLE items ALTER COLUMN available_quantity SET DEFAULT 0;
      -- allow non-negative values
      BEGIN
        ALTER TABLE items ADD CONSTRAINT chk_available_quantity_nonneg CHECK (available_quantity >= 0);
      EXCEPTION WHEN duplicate_object THEN
        -- constraint already exists; ignore
        NULL;
      END;
    ELSE
      -- both columns exist: copy values where available_quantity is null, then drop legacy
      EXECUTE 'UPDATE items SET available_quantity = quantity WHERE available_quantity IS NULL';
      -- Drop legacy column
      BEGIN
        ALTER TABLE items DROP COLUMN quantity;
      EXCEPTION WHEN undefined_column THEN
        NULL;
      END;
    END IF;
  END IF;
END$$;

-- -------------------------------
-- Server-side functions (RPC) for safe stock in / out operations
-- Use supabase.rpc('stock_in', { item_id, company_id, qty })
-- -------------------------------
CREATE OR REPLACE FUNCTION stock_in(p_item UUID, p_company UUID, p_qty INTEGER)
RETURNS VOID AS $$
DECLARE
  current_qty INTEGER;
BEGIN
  IF p_qty IS NULL OR p_qty <= 0 THEN
    RAISE EXCEPTION 'Quantity must be a positive integer';
  END IF;

  -- Lock row to avoid race conditions
  SELECT available_quantity INTO current_qty FROM items WHERE id = p_item FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Item not found';
  END IF;

  INSERT INTO stock_movements(item_id, company_id, movement_type, quantity)
    VALUES (p_item, p_company, 'IN', p_qty);

  UPDATE items SET available_quantity = available_quantity + p_qty WHERE id = p_item;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION stock_out(p_item UUID, p_company UUID, p_qty INTEGER, p_reason TEXT)
RETURNS VOID AS $$
DECLARE
  current_qty INTEGER;
BEGIN
  IF p_qty IS NULL OR p_qty <= 0 THEN
    RAISE EXCEPTION 'Quantity must be a positive integer';
  END IF;

  -- Lock the item row
  SELECT available_quantity INTO current_qty FROM items WHERE id = p_item FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Item not found';
  END IF;

  IF current_qty < p_qty THEN
    RAISE EXCEPTION 'Insufficient stock for item';
  END IF;

  UPDATE items SET available_quantity = available_quantity - p_qty WHERE id = p_item;

  INSERT INTO stock_movements(item_id, company_id, movement_type, quantity, reason)
    VALUES (p_item, p_company, 'OUT', p_qty, p_reason);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- -------------------------------
-- Sample data (idempotent)
-- -------------------------------
INSERT INTO categories (name) VALUES ('Electronics') ON CONFLICT (name) DO NOTHING;
INSERT INTO categories (name) VALUES ('Furniture') ON CONFLICT (name) DO NOTHING;
INSERT INTO categories (name) VALUES ('Stationery') ON CONFLICT (name) DO NOTHING;

INSERT INTO companies (name) VALUES ('Default Supplier') ON CONFLICT (name) DO NOTHING;

-- Insert sample items (linking to companies/categories)
DO $$
DECLARE
  cat_electronics UUID;
  cat_furniture UUID;
  cat_stationery UUID;
  comp_default UUID;
BEGIN
  SELECT id INTO cat_electronics FROM categories WHERE name = 'Electronics' LIMIT 1;
  SELECT id INTO cat_furniture FROM categories WHERE name = 'Furniture' LIMIT 1;
  SELECT id INTO cat_stationery FROM categories WHERE name = 'Stationery' LIMIT 1;
  SELECT id INTO comp_default FROM companies WHERE name = 'Default Supplier' LIMIT 1;

  IF NOT EXISTS (SELECT 1 FROM items WHERE name = 'Laptop') THEN
    INSERT INTO items (name, category_id, company_id, available_quantity, price)
      VALUES ('Laptop', cat_electronics, comp_default, 5, 999.99);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM items WHERE name = 'Office Chair') THEN
    INSERT INTO items (name, category_id, company_id, available_quantity, price)
      VALUES ('Office Chair', cat_furniture, comp_default, 12, 149.99);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM items WHERE name = 'Notebook') THEN
    INSERT INTO items (name, category_id, company_id, available_quantity, price)
      VALUES ('Notebook', cat_stationery, comp_default, 50, 2.99);
  END IF;
END$$;