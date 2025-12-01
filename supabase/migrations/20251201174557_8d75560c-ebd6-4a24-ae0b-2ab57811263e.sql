-- Enable PostGIS extension for spatial queries
CREATE EXTENSION postgis;

-- Create areas table with GeoJSON polygon support
CREATE TABLE public.areas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  city TEXT NOT NULL DEFAULT 'Lahore',
  polygon GEOMETRY(POLYGON, 4326) NOT NULL,
  center_lat DECIMAL(10, 8) NOT NULL,
  center_lng DECIMAL(11, 8) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create spatial index on polygon column for fast geo queries
CREATE INDEX idx_areas_polygon ON public.areas USING GIST(polygon);

-- Enable RLS
ALTER TABLE public.areas ENABLE ROW LEVEL SECURITY;

-- Public can view active areas
CREATE POLICY "Public can view active areas"
ON public.areas FOR SELECT
USING (is_active = true);

-- Admins can manage all areas (we'll add admin role system later)
CREATE POLICY "Authenticated users can view all areas"
ON public.areas FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert areas"
ON public.areas FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update areas"
ON public.areas FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can delete areas"
ON public.areas FOR DELETE
TO authenticated
USING (true);

-- Create delivery_zones table (1:1 with areas)
CREATE TABLE public.delivery_zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  area_id UUID NOT NULL UNIQUE REFERENCES public.areas(id) ON DELETE CASCADE,
  delivery_fee DECIMAL(10, 2) NOT NULL,
  min_order_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
  estimated_time TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.delivery_zones ENABLE ROW LEVEL SECURITY;

-- Public can view delivery zones for active areas
CREATE POLICY "Public can view delivery zones"
ON public.delivery_zones FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.areas 
  WHERE areas.id = delivery_zones.area_id 
  AND areas.is_active = true
));

-- Authenticated users can manage delivery zones
CREATE POLICY "Authenticated users can manage delivery zones"
ON public.delivery_zones FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Create user_addresses table
CREATE TABLE public.user_addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label TEXT NOT NULL CHECK (label IN ('Home', 'Work', 'Other')),
  full_address TEXT NOT NULL CHECK (length(full_address) >= 10 AND length(full_address) <= 200),
  area_id UUID NOT NULL REFERENCES public.areas(id),
  lat DECIMAL(10, 8) NOT NULL CHECK (lat >= 23.5 AND lat <= 37.5),
  lng DECIMAL(11, 8) NOT NULL CHECK (lng >= 60 AND lng <= 78),
  instructions TEXT CHECK (instructions IS NULL OR length(instructions) <= 150),
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create index for user queries
CREATE INDEX idx_user_addresses_user_id ON public.user_addresses(user_id);

-- Enable RLS
ALTER TABLE public.user_addresses ENABLE ROW LEVEL SECURITY;

-- Users can only manage their own addresses
CREATE POLICY "Users can view their own addresses"
ON public.user_addresses FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own addresses"
ON public.user_addresses FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own addresses"
ON public.user_addresses FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own addresses"
ON public.user_addresses FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_areas_updated_at
  BEFORE UPDATE ON public.areas
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_delivery_zones_updated_at
  BEFORE UPDATE ON public.delivery_zones
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_user_addresses_updated_at
  BEFORE UPDATE ON public.user_addresses
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Function to ensure only one default address per user
CREATE OR REPLACE FUNCTION public.ensure_single_default_address()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_default = true THEN
    UPDATE public.user_addresses
    SET is_default = false
    WHERE user_id = NEW.user_id
    AND id != NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_single_default_address
  AFTER INSERT OR UPDATE ON public.user_addresses
  FOR EACH ROW
  EXECUTE FUNCTION public.ensure_single_default_address();

-- Function to automatically set area as active when delivery zone is created
CREATE OR REPLACE FUNCTION public.activate_area_on_delivery_zone()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_active = true THEN
    UPDATE public.areas
    SET is_active = true
    WHERE id = NEW.area_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER auto_activate_area
  AFTER INSERT OR UPDATE ON public.delivery_zones
  FOR EACH ROW
  EXECUTE FUNCTION public.activate_area_on_delivery_zone();