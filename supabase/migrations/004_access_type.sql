-- Map + Access Rules — adventure access type and play zone radius
ALTER TABLE adventures
  ADD COLUMN IF NOT EXISTS access_type text NOT NULL DEFAULT 'hybrid',
  ADD COLUMN IF NOT EXISTS play_radius_m integer;

COMMENT ON COLUMN adventures.access_type IS 'local | remote | demo | private | sponsor | hybrid';
COMMENT ON COLUMN adventures.play_radius_m IS 'On-site play zone radius in meters; null uses finder search radius';
