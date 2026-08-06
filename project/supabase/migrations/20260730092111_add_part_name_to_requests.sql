ALTER TABLE requests ADD COLUMN IF NOT EXISTS part_name text;
ALTER TABLE requests ADD COLUMN IF NOT EXISTS part_category text;

COMMENT ON COLUMN requests.part_name IS 'Nom de la pièce sélectionnée depuis le catalogue';
COMMENT ON COLUMN requests.part_category IS 'Catégorie de la pièce sélectionnée';
