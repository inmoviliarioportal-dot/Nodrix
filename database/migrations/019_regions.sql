-- -----------------------------------------------------------------------------
-- REGIONES DE CHILE + ACTIVACIÓN POR REGIÓN + PROPIEDAD DE VIVIENDA ACEPTADA
-- -----------------------------------------------------------------------------
-- Catálogo de regiones habilitadas para el selector región/comuna del
-- cliente. Solo RM viene habilitada por defecto en el MVP -- admin/gerencia
-- puede activar el resto desde /admin/regions.
CREATE TABLE IF NOT EXISTS regions (
    id      TEXT PRIMARY KEY,   -- código corto: 'RM','I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII','XIV','XV','XVI'
    name    TEXT NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT false
);

INSERT INTO regions (id, name, enabled) VALUES
    ('XV', 'Arica y Parinacota', false),
    ('I', 'Tarapacá', false),
    ('II', 'Antofagasta', false),
    ('III', 'Atacama', false),
    ('IV', 'Coquimbo', false),
    ('V', 'Valparaíso', false),
    ('RM', 'Metropolitana de Santiago', true),
    ('VI', 'Libertador General Bernardo O''Higgins', false),
    ('VII', 'Maule', false),
    ('XVI', 'Ñuble', false),
    ('VIII', 'Biobío', false),
    ('IX', 'La Araucanía', false),
    ('XIV', 'Los Ríos', false),
    ('X', 'Los Lagos', false),
    ('XI', 'Aysén del General Carlos Ibáñez del Campo', false),
    ('XII', 'Magallanes y de la Antártica Chilena', false)
ON CONFLICT (id) DO NOTHING;

-- accepted_housing_property_id: propiedad de vivienda propia (individual,
-- no bundle de 1/2/3 departamentos) elegida por el cliente cuando
-- purpose es 'vivienda_propia' o 'ambos'.
ALTER TABLE applications
    ADD COLUMN IF NOT EXISTS accepted_housing_property_id UUID REFERENCES properties(id);
