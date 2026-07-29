-- Destino real del inmueble (reemplaza la pregunta genérica "¿Qué buscas?"
-- del wizard, ver lib/wizard-storage.ts v10) + parámetros de proximidad para
-- perfilar propiedades de Airbnb/venta a corto plazo (ver
-- app/api/properties/recommendations/route.ts).

ALTER TABLE customers ADD COLUMN IF NOT EXISTS property_destination TEXT;

ALTER TABLE customers DROP CONSTRAINT IF EXISTS customers_property_destination_check;
ALTER TABLE customers ADD CONSTRAINT customers_property_destination_check
  CHECK (property_destination IS NULL OR property_destination IN ('vivir', 'airbnb', 'alquiler_tradicional', 'venta_corto_plazo'));

ALTER TABLE properties ADD COLUMN IF NOT EXISTS near_historic_center BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS near_tourist_zone BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS near_business_district BOOLEAN NOT NULL DEFAULT false;

-- El carrusel de propiedades baja de 8 a 6 (ver PropertyCarousel.tsx /
-- properties/recommendations/route.ts) -- angosta de vuelta el CHECK que la
-- migración 023 había ensanchado a 1-8.
ALTER TABLE applications DROP CONSTRAINT IF EXISTS applications_accepted_department_count_check;
ALTER TABLE applications ADD CONSTRAINT applications_accepted_department_count_check
  CHECK (accepted_department_count IS NULL OR (accepted_department_count BETWEEN 1 AND 6));
