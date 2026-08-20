/*
# Replace flat 5% commission with a tiered pricing grid

## Summary
`offers.displayed_price` was a flat 5% markup on `net_price`. Replaced with
the tiered delivery-fee + commission grid from the business plan:
- net_price < 10 000 DA  : +400 DA delivery fee + 3%   commission
- net_price 10k-20k DA   : +500 DA delivery fee + 2.5% commission
- net_price > 20 000 DA  : +1000 DA delivery fee + 2%  commission

displayed_price = net_price + tier delivery fee + (net_price * tier rate)

## Changes
`displayed_price` stays a GENERATED ALWAYS ... STORED column (single source
of truth, used as-is everywhere: mechanic's offer comparator, orders,
history, admin). Postgres has no ALTER for a generation expression, so the
column is dropped and re-added — this recomputes it for every existing row,
no data loss.

## Display
No frontend change: the mechanic already sees only this single total, and
suppliers already see `net_price` (no fees), unchanged.
*/

ALTER TABLE offers DROP COLUMN displayed_price;

ALTER TABLE offers ADD COLUMN displayed_price numeric(10,2) GENERATED ALWAYS AS (
  ROUND(
    net_price
    + CASE
        WHEN net_price < 10000 THEN 400
        WHEN net_price <= 20000 THEN 500
        ELSE 1000
      END
    + net_price * CASE
        WHEN net_price < 10000 THEN 0.03
        WHEN net_price <= 20000 THEN 0.025
        ELSE 0.02
      END,
    2
  )
) STORED;

COMMENT ON COLUMN offers.displayed_price IS 'Prix affiché au mécanicien = prix net + frais de livraison du palier + commission du palier (voir grille dans le business plan)';
