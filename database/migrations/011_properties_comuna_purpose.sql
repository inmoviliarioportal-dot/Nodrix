-- Extiende `properties` para poder ofrecer valores por comuna en la etapa
-- PRE_EVALUACION_COMPLETADA ("Aprobado previo"): el cliente NO ve un listado
-- de propiedades específicas, solo rangos de precio agregados por comuna +
-- imágenes referenciales del proyecto (ver CLAUDE.md/conversación: el fin es
-- que se anime a agendar una visita física, no que elija por foto).
--
-- `purpose` usa el mismo vocabulario que `customers.investment_type`
-- ('inversion' | 'vivienda_propia' | 'ambos') para poder matchear
-- directamente el perfil del cliente con las propiedades disponibles.
ALTER TABLE properties
    ADD COLUMN IF NOT EXISTS comuna TEXT NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS purpose TEXT
        CHECK (purpose IS NULL OR purpose IN ('inversion', 'vivienda_propia', 'ambos')),
    ADD COLUMN IF NOT EXISTS floor_plan_url TEXT;

CREATE INDEX IF NOT EXISTS idx_properties_comuna ON properties (comuna);

-- Datos de ejemplo para poder probar la vista de oferta por comuna antes de
-- que el equipo comercial cargue el inventario real desde /admin/properties.
INSERT INTO properties (org_id, name, comuna, location, price_uf, purpose, available, images)
VALUES
    ('00000000-0000-0000-0000-000000000001', 'Edificio Vista Sur', 'Ñuñoa', 'Ñuñoa, Santiago', 3200, 'ambos', true, '["https://picsum.photos/seed/nunoa-a/800/500"]'),
    ('00000000-0000-0000-0000-000000000001', 'Residencias del Parque', 'Ñuñoa', 'Ñuñoa, Santiago', 2800, 'inversion', true, '["https://picsum.photos/seed/nunoa-b/800/500"]'),
    ('00000000-0000-0000-0000-000000000001', 'Torre Providencia', 'Providencia', 'Providencia, Santiago', 4500, 'ambos', true, '["https://picsum.photos/seed/providencia-a/800/500"]'),
    ('00000000-0000-0000-0000-000000000001', 'Mirador Providencia', 'Providencia', 'Providencia, Santiago', 5200, 'vivienda_propia', true, '["https://picsum.photos/seed/providencia-b/800/500"]'),
    ('00000000-0000-0000-0000-000000000001', 'Condominio Las Condes', 'Las Condes', 'Las Condes, Santiago', 6800, 'vivienda_propia', true, '["https://picsum.photos/seed/lascondes-a/800/500"]'),
    ('00000000-0000-0000-0000-000000000001', 'Altos de Las Condes', 'Las Condes', 'Las Condes, Santiago', 7400, 'inversion', true, '["https://picsum.photos/seed/lascondes-b/800/500"]'),
    ('00000000-0000-0000-0000-000000000001', 'Plaza Oriente', 'Viña del Mar', 'Viña del Mar, Valparaíso', 2600, 'inversion', true, '["https://picsum.photos/seed/vina-a/800/500"]'),
    ('00000000-0000-0000-0000-000000000001', 'Parque Costanera', 'Viña del Mar', 'Viña del Mar, Valparaíso', 3100, 'ambos', true, '["https://picsum.photos/seed/vina-b/800/500"]')
ON CONFLICT DO NOTHING;
