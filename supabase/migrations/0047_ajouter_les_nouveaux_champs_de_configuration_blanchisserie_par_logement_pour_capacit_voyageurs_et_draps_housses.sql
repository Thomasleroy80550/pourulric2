ALTER TABLE public.user_rooms
ADD COLUMN IF NOT EXISTS linen_guest_capacity integer NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS linen_large_sheet_qty integer NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS linen_large_duvet_cover_qty integer NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS linen_small_sheet_qty integer NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS linen_small_duvet_cover_qty integer NOT NULL DEFAULT 0;