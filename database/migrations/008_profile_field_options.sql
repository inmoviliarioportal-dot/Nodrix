-- Ajusta las opciones de registro según feedback de producto:
-- - Sexo: solo 3 opciones (se elimina 'otro', se remapea a 'prefiero_no_decir').
-- - Tipo de inversión: se agrega 'ambos' (comprar e invertir).
-- - Estado del inmueble: se agrega 'entrega_inmediata' (nuevo).

UPDATE customers SET gender = 'prefiero_no_decir' WHERE gender = 'otro';

ALTER TABLE customers DROP CONSTRAINT IF EXISTS customers_gender_check;
ALTER TABLE customers
    ADD CONSTRAINT customers_gender_check
    CHECK (gender IS NULL OR gender IN ('femenino', 'masculino', 'prefiero_no_decir'));

ALTER TABLE customers DROP CONSTRAINT IF EXISTS customers_investment_type_check;
ALTER TABLE customers
    ADD CONSTRAINT customers_investment_type_check
    CHECK (investment_type IS NULL OR investment_type IN ('inversion', 'vivienda_propia', 'ambos'));

ALTER TABLE customers DROP CONSTRAINT IF EXISTS customers_property_status_check;
ALTER TABLE customers
    ADD CONSTRAINT customers_property_status_check
    CHECK (property_status IS NULL OR property_status IN ('en_verde', 'en_blanco', 'usado', 'entrega_inmediata', 'sin_definir'));
