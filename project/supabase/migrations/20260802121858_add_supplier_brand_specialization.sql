/*
# Supplier Vehicle Brand Specialization

## Summary
Adds a many-to-many relationship between suppliers and vehicle brands so that
requests are only routed to suppliers who specialize in the requested vehicle's brand.

## New Tables

### supplier_brands
Junction table linking supplier_profiles to vehicle brand identifiers.
- supplier_id → supplier_profiles.id (CASCADE)
- brand_id   → text (matches the `id` field of VehicleBrand in the frontend catalog, e.g. 'renault', 'peugeot')
- Composite primary key (supplier_id, brand_id) prevents duplicates.
- A supplier can specialize in multiple brands; a brand can be linked to multiple suppliers.

## Security
- RLS enabled on supplier_brands.
- A supplier can read/insert/update/delete only their own brand links.
- Admins can read all supplier_brands rows.
- The existing `requests_select_suppliers` policy is replaced so that suppliers
  only see requests whose `vehicle_brand_id` matches one of their linked brands
  in supplier_brands. Suppliers with no brand links see no open requests.
- Backward-compatible: the request creation and notification workflow is unchanged;
  only the supplier-side SELECT filtering changes.

## Important Notes
1. The filtering is driven entirely by the database (RLS), so newly added brands
   in the catalog work automatically without code changes — suppliers just need
   to select them in their profile.
2. `requests.vehicle_brand_id` already exists (added in a prior migration) and
   stores the catalog brand id, which is what supplier_brands.brand_id matches.
3. Existing supplier requests/offers/orders are preserved; only visibility of
   future open requests is narrowed.
*/

-- Junction table: supplier ↔ vehicle brand
CREATE TABLE IF NOT EXISTS supplier_brands (
  supplier_id uuid NOT NULL REFERENCES supplier_profiles(id) ON DELETE CASCADE,
  brand_id    text NOT NULL,
  created_at  timestamptz DEFAULT now(),
  PRIMARY KEY (supplier_id, brand_id)
);

ALTER TABLE supplier_brands ENABLE ROW LEVEL SECURITY;

-- Suppliers manage their own brand links
DROP POLICY IF EXISTS "supplier_brands_select_own" ON supplier_brands;
CREATE POLICY "supplier_brands_select_own" ON supplier_brands FOR SELECT
  TO authenticated USING (auth.uid() = supplier_id);

DROP POLICY IF EXISTS "supplier_brands_insert_own" ON supplier_brands;
CREATE POLICY "supplier_brands_insert_own" ON supplier_brands FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = supplier_id);

DROP POLICY IF EXISTS "supplier_brands_update_own" ON supplier_brands;
CREATE POLICY "supplier_brands_update_own" ON supplier_brands FOR UPDATE
  TO authenticated USING (auth.uid() = supplier_id) WITH CHECK (auth.uid() = supplier_id);

DROP POLICY IF EXISTS "supplier_brands_delete_own" ON supplier_brands;
CREATE POLICY "supplier_brands_delete_own" ON supplier_brands FOR DELETE
  TO authenticated USING (auth.uid() = supplier_id);

-- Admins can read all
DROP POLICY IF EXISTS "supplier_brands_select_admin" ON supplier_brands;
CREATE POLICY "supplier_brands_select_admin" ON supplier_brands FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

CREATE INDEX IF NOT EXISTS idx_supplier_brands_brand_id ON supplier_brands(brand_id);

-- Replace the supplier-side requests SELECT policy so suppliers only see
-- requests whose vehicle_brand_id matches one of their specialized brands.
-- Admins and delivery keep full read access to requests.
DROP POLICY IF EXISTS "requests_select_suppliers" ON requests;
CREATE POLICY "requests_select_suppliers" ON requests FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
    OR (
      EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'supplier')
      AND EXISTS (
        SELECT 1 FROM supplier_brands sb
        WHERE sb.supplier_id = auth.uid()
          AND sb.brand_id = requests.vehicle_brand_id
      )
    )
    OR (
      EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'delivery')
    )
  );
