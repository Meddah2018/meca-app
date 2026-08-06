/*
# Add vehicle IDs to requests table

1. Changes
- Add `vehicle_brand_id` (text, nullable) to store the brand identifier from the catalog.
- Add `vehicle_model_id` (text, nullable) to store the model identifier from the catalog.
- The existing `vehicle_make`, `vehicle_model`, and `vehicle_year` columns are kept for backward compatibility and display.
2. Security
- No changes to RLS policies.
*/

ALTER TABLE requests ADD COLUMN IF NOT EXISTS vehicle_brand_id text;
ALTER TABLE requests ADD COLUMN IF NOT EXISTS vehicle_model_id text;

COMMENT ON COLUMN requests.vehicle_brand_id IS 'Identifiant de la marque dans le catalogue véhicules';
COMMENT ON COLUMN requests.vehicle_model_id IS 'Identifiant du modèle dans le catalogue véhicules';
