-- =============================================================================
-- 004_customer_profile_fields.sql — Perfil extendido de registro del cliente
-- =============================================================================
-- El registro (POST /api/auth/register) ahora recolecta el perfil completo
-- del cliente en vez de solo nombre/email/teléfono: RUT, apellido, sexo,
-- fecha de nacimiento, renta, tipo de inversión y estado del inmueble de
-- interés. `customers.name` se mantiene (se sigue computando como
-- "first_name last_name") para no romper el resto del flujo de leads que
-- ya lo consume.
--
-- Todas las columnas nuevas son NULLABLE: las filas de `customers` creadas
-- antes de esta migración (vía el flujo de leads sin registro, ej. RUT no
-- provisto) siguen siendo válidas.

ALTER TABLE customers
    ADD COLUMN IF NOT EXISTS first_name       TEXT,
    ADD COLUMN IF NOT EXISTS last_name        TEXT,
    ADD COLUMN IF NOT EXISTS gender           TEXT
        CHECK (gender IS NULL OR gender IN ('femenino', 'masculino', 'otro', 'prefiero_no_decir')),
    ADD COLUMN IF NOT EXISTS birth_date       DATE,
    ADD COLUMN IF NOT EXISTS age              INTEGER
        CHECK (age IS NULL OR (age >= 18 AND age <= 120)),
    ADD COLUMN IF NOT EXISTS monthly_income   NUMERIC(14,2)
        CHECK (monthly_income IS NULL OR monthly_income >= 0),
    ADD COLUMN IF NOT EXISTS investment_type  TEXT
        CHECK (investment_type IS NULL OR investment_type IN ('inversion', 'vivienda_propia')),
    ADD COLUMN IF NOT EXISTS property_status  TEXT
        CHECK (property_status IS NULL OR property_status IN ('en_verde', 'en_blanco', 'usado', 'sin_definir'));
