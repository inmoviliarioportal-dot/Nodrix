-- Agrega preferencias de vivienda a `properties` (dormitorios, baños, tipo)
-- para poder recomendar hasta 3 propiedades específicas a clientes de
-- vivienda_propia/ambos (ver POST /api/properties/recommendations). Los
-- clientes de "inversion" pura no pasan por este paso.
ALTER TABLE properties
    ADD COLUMN IF NOT EXISTS bedrooms INT,
    ADD COLUMN IF NOT EXISTS bathrooms INT,
    ADD COLUMN IF NOT EXISTS property_type TEXT
        CHECK (property_type IS NULL OR property_type IN ('casa', 'departamento'));

CREATE INDEX IF NOT EXISTS idx_properties_bedrooms ON properties (bedrooms);

-- Rellena las propiedades de ejemplo existentes (de la migración 011) con
-- valores razonables para poder probar el matching antes de que el equipo
-- comercial cargue el inventario real.
UPDATE properties SET bedrooms = 2, bathrooms = 1, property_type = 'departamento' WHERE name = 'Edificio Vista Sur';
UPDATE properties SET bedrooms = 1, bathrooms = 1, property_type = 'departamento' WHERE name = 'Residencias del Parque';
UPDATE properties SET bedrooms = 3, bathrooms = 2, property_type = 'departamento' WHERE name = 'Torre Providencia';
UPDATE properties SET bedrooms = 3, bathrooms = 2, property_type = 'casa' WHERE name = 'Mirador Providencia';
UPDATE properties SET bedrooms = 4, bathrooms = 3, property_type = 'casa' WHERE name = 'Condominio Las Condes';
UPDATE properties SET bedrooms = 2, bathrooms = 2, property_type = 'departamento' WHERE name = 'Altos de Las Condes';
UPDATE properties SET bedrooms = 1, bathrooms = 1, property_type = 'departamento' WHERE name = 'Plaza Oriente';
UPDATE properties SET bedrooms = 2, bathrooms = 2, property_type = 'departamento' WHERE name = 'Parque Costanera';
