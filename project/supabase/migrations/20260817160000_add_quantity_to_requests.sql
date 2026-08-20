/*
# Add quantity to requests

## Summary
Mechanics can now specify how many units of the part they need (e.g. 2
pistons), either by typing it or via the voice message ("piston quantité 2").

## Changes
- `requests.quantity` (integer, NOT NULL, default 1, CHECK > 0).
*/

ALTER TABLE requests
  ADD COLUMN IF NOT EXISTS quantity integer NOT NULL DEFAULT 1;

ALTER TABLE requests
  ADD CONSTRAINT requests_quantity_positive CHECK (quantity > 0);

COMMENT ON COLUMN requests.quantity IS 'Nombre d''unités de la pièce demandées';
