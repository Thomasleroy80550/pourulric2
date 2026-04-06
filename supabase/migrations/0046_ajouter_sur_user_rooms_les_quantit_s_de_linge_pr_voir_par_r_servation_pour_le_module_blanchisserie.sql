ALTER TABLE public.user_rooms
ADD COLUMN IF NOT EXISTS linen_single_bed_qty integer NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS linen_double_bed_qty integer NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS linen_bath_towel_qty integer NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS linen_hand_towel_qty integer NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS linen_bath_mat_qty integer NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS linen_kitchen_towel_qty integer NOT NULL DEFAULT 0;