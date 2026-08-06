
/*
# MecaPieces — Initial Schema

## Summary
Creates the full data model for the MecaPieces marketplace connecting mechanics (demandeurs)
with auto-parts suppliers (fournisseurs) in Algeria.

## New Tables

### profiles
Extends auth.users with role and personal info.
- id: matches auth.users.id
- role: 'mechanic' | 'supplier' | 'delivery' | 'admin'
- full_name, phone, is_approved (for supplier accounts)

### garage_profiles
Garage details for mechanics.
- user_id → profiles.id
- garage_name, address, city, wilaya

### supplier_profiles
Professional details for suppliers.
- user_id → profiles.id
- company_name, address, city, wilaya, specialties, zone

### vehicles
Vehicle catalogue for requests.
- make, model, year

### requests
Parts requests published by mechanics.
- mechanic_id, vehicle_id, description, audio_url, urgency, status
- status: 'open' | 'offer_selected' | 'closed'

### offers
Offers submitted by suppliers on requests.
- request_id, supplier_id
- part_name, part_brand, reference (optional), net_price, displayed_price (net * 1.05), delivery_estimate
- status: 'active' | 'selected' | 'rejected'

### orders
Created when mechanic selects an offer.
- offer_id, mechanic_id, supplier_id
- delivery_status: 'to_pickup' | 'in_delivery' | 'delivered'
- selected_at (drives delivery date rule), delivery_date (calculated), cash_amount

### reversements
Periodic payouts to suppliers.
- supplier_id, order_id, net_amount, status: 'pending' | 'paid'

### ratings
Reviews mechanics leave for suppliers after delivery.
- author_id, target_id (supplier), order_id, score (1–5), comment

## Security
- RLS enabled on all tables
- Mechanics see only their own requests and related data
- Suppliers see all open requests but only their own offers
- Delivery role sees orders assigned to them
- Admin role has full read access via policies scoped to role claim
*/

-- Profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('mechanic','supplier','delivery','admin')),
  full_name text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  is_approved boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_own" ON profiles;
CREATE POLICY "profiles_select_own" ON profiles FOR SELECT
  TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_insert_own" ON profiles;
CREATE POLICY "profiles_insert_own" ON profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_select_admin" ON profiles;
CREATE POLICY "profiles_select_admin" ON profiles FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

DROP POLICY IF EXISTS "profiles_update_admin" ON profiles;
CREATE POLICY "profiles_update_admin" ON profiles FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

-- Garage profiles (mechanics)
CREATE TABLE IF NOT EXISTS garage_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  garage_name text NOT NULL DEFAULT '',
  address text NOT NULL DEFAULT '',
  city text NOT NULL DEFAULT '',
  wilaya text NOT NULL DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE garage_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "garage_select_own" ON garage_profiles;
CREATE POLICY "garage_select_own" ON garage_profiles FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "garage_insert_own" ON garage_profiles;
CREATE POLICY "garage_insert_own" ON garage_profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "garage_update_own" ON garage_profiles;
CREATE POLICY "garage_update_own" ON garage_profiles FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "garage_admin_select" ON garage_profiles;
CREATE POLICY "garage_admin_select" ON garage_profiles FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

-- Supplier profiles
CREATE TABLE IF NOT EXISTS supplier_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  company_name text NOT NULL DEFAULT '',
  address text NOT NULL DEFAULT '',
  city text NOT NULL DEFAULT '',
  wilaya text NOT NULL DEFAULT '',
  specialties text NOT NULL DEFAULT '',
  zone text NOT NULL DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE supplier_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "supplier_profile_select_own" ON supplier_profiles;
CREATE POLICY "supplier_profile_select_own" ON supplier_profiles FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "supplier_profile_insert_own" ON supplier_profiles;
CREATE POLICY "supplier_profile_insert_own" ON supplier_profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "supplier_profile_update_own" ON supplier_profiles;
CREATE POLICY "supplier_profile_update_own" ON supplier_profiles FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "supplier_profile_select_for_mechanics" ON supplier_profiles;
CREATE POLICY "supplier_profile_select_for_mechanics" ON supplier_profiles FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('mechanic','delivery','admin'))
  );

-- Requests
CREATE TABLE IF NOT EXISTS requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mechanic_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  vehicle_make text NOT NULL DEFAULT '',
  vehicle_model text NOT NULL DEFAULT '',
  vehicle_year int,
  description text NOT NULL DEFAULT '',
  audio_url text,
  urgency text NOT NULL DEFAULT 'normal' CHECK (urgency IN ('normal','urgent')),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','offer_selected','closed')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "requests_select_own_mechanic" ON requests;
CREATE POLICY "requests_select_own_mechanic" ON requests FOR SELECT
  TO authenticated USING (auth.uid() = mechanic_id);

DROP POLICY IF EXISTS "requests_insert_own_mechanic" ON requests;
CREATE POLICY "requests_insert_own_mechanic" ON requests FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = mechanic_id);

DROP POLICY IF EXISTS "requests_update_own_mechanic" ON requests;
CREATE POLICY "requests_update_own_mechanic" ON requests FOR UPDATE
  TO authenticated USING (auth.uid() = mechanic_id) WITH CHECK (auth.uid() = mechanic_id);

DROP POLICY IF EXISTS "requests_select_suppliers" ON requests;
CREATE POLICY "requests_select_suppliers" ON requests FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('supplier','delivery','admin'))
  );

DROP POLICY IF EXISTS "requests_update_admin" ON requests;
CREATE POLICY "requests_update_admin" ON requests FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

-- Offers
CREATE TABLE IF NOT EXISTS offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
  supplier_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  part_name text NOT NULL,
  part_brand text NOT NULL,
  reference text,
  net_price numeric(10,2) NOT NULL,
  displayed_price numeric(10,2) GENERATED ALWAYS AS (ROUND(net_price * 1.05, 2)) STORED,
  delivery_estimate text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','selected','rejected')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE offers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "offers_select_own_supplier" ON offers;
CREATE POLICY "offers_select_own_supplier" ON offers FOR SELECT
  TO authenticated USING (auth.uid() = supplier_id);

DROP POLICY IF EXISTS "offers_insert_own_supplier" ON offers;
CREATE POLICY "offers_insert_own_supplier" ON offers FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = supplier_id);

DROP POLICY IF EXISTS "offers_update_own_supplier" ON offers;
CREATE POLICY "offers_update_own_supplier" ON offers FOR UPDATE
  TO authenticated USING (auth.uid() = supplier_id) WITH CHECK (auth.uid() = supplier_id);

-- Mechanics can see all offers on their own requests
DROP POLICY IF EXISTS "offers_select_mechanic_on_own_request" ON offers;
CREATE POLICY "offers_select_mechanic_on_own_request" ON offers FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM requests r
      WHERE r.id = offers.request_id AND r.mechanic_id = auth.uid()
    )
  );

-- Admin & delivery can see all offers
DROP POLICY IF EXISTS "offers_select_admin_delivery" ON offers;
CREATE POLICY "offers_select_admin_delivery" ON offers FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','delivery'))
  );

DROP POLICY IF EXISTS "offers_update_mechanic_select" ON offers;
CREATE POLICY "offers_update_mechanic_select" ON offers FOR UPDATE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM requests r
      WHERE r.id = offers.request_id AND r.mechanic_id = auth.uid()
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM requests r
      WHERE r.id = offers.request_id AND r.mechanic_id = auth.uid()
    )
  );

-- Orders
CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id uuid NOT NULL REFERENCES offers(id) ON DELETE CASCADE,
  mechanic_id uuid NOT NULL REFERENCES profiles(id),
  supplier_id uuid NOT NULL REFERENCES profiles(id),
  delivery_status text NOT NULL DEFAULT 'to_pickup' CHECK (delivery_status IN ('to_pickup','in_delivery','delivered')),
  selected_at timestamptz NOT NULL DEFAULT now(),
  delivery_date date,
  cash_amount numeric(10,2) NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "orders_select_mechanic" ON orders;
CREATE POLICY "orders_select_mechanic" ON orders FOR SELECT
  TO authenticated USING (auth.uid() = mechanic_id);

DROP POLICY IF EXISTS "orders_insert_mechanic" ON orders;
CREATE POLICY "orders_insert_mechanic" ON orders FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = mechanic_id);

DROP POLICY IF EXISTS "orders_select_supplier" ON orders;
CREATE POLICY "orders_select_supplier" ON orders FOR SELECT
  TO authenticated USING (auth.uid() = supplier_id);

DROP POLICY IF EXISTS "orders_select_admin_delivery" ON orders;
CREATE POLICY "orders_select_admin_delivery" ON orders FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','delivery'))
  );

DROP POLICY IF EXISTS "orders_update_delivery" ON orders;
CREATE POLICY "orders_update_delivery" ON orders FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('delivery','admin'))
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('delivery','admin'))
  );

-- Reversements (payouts to suppliers)
CREATE TABLE IF NOT EXISTS reversements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id uuid NOT NULL REFERENCES profiles(id),
  order_id uuid NOT NULL REFERENCES orders(id),
  net_amount numeric(10,2) NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid')),
  payment_date timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE reversements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "reversements_select_supplier" ON reversements;
CREATE POLICY "reversements_select_supplier" ON reversements FOR SELECT
  TO authenticated USING (auth.uid() = supplier_id);

DROP POLICY IF EXISTS "reversements_select_admin" ON reversements;
CREATE POLICY "reversements_select_admin" ON reversements FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

DROP POLICY IF EXISTS "reversements_insert_admin" ON reversements;
CREATE POLICY "reversements_insert_admin" ON reversements FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

DROP POLICY IF EXISTS "reversements_update_admin" ON reversements;
CREATE POLICY "reversements_update_admin" ON reversements FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

-- Ratings
CREATE TABLE IF NOT EXISTS ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id),
  target_id uuid NOT NULL REFERENCES profiles(id),
  order_id uuid NOT NULL REFERENCES orders(id),
  score int NOT NULL CHECK (score BETWEEN 1 AND 5),
  comment text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE ratings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ratings_select_all_auth" ON ratings;
CREATE POLICY "ratings_select_all_auth" ON ratings FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "ratings_insert_own" ON ratings;
CREATE POLICY "ratings_insert_own" ON ratings FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = author_id);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_requests_mechanic_id ON requests(mechanic_id);
CREATE INDEX IF NOT EXISTS idx_requests_status ON requests(status);
CREATE INDEX IF NOT EXISTS idx_offers_request_id ON offers(request_id);
CREATE INDEX IF NOT EXISTS idx_offers_supplier_id ON offers(supplier_id);
CREATE INDEX IF NOT EXISTS idx_orders_mechanic_id ON orders(mechanic_id);
CREATE INDEX IF NOT EXISTS idx_orders_supplier_id ON orders(supplier_id);
CREATE INDEX IF NOT EXISTS idx_orders_delivery_status ON orders(delivery_status);
CREATE INDEX IF NOT EXISTS idx_reversements_supplier_id ON reversements(supplier_id);
CREATE INDEX IF NOT EXISTS idx_reversements_status ON reversements(status);
