-- =============================================================================
-- 001_dev_seed.sql — Datos mínimos de desarrollo (NO usar en producción)
-- =============================================================================
-- Requiere schema.sql y audit_fn.sql ya aplicados.

INSERT INTO users (id, org_id, email, role, full_name)
VALUES (
    '00000000-0000-0000-0000-0000000000a1',
    '00000000-0000-0000-0000-000000000001',
    'asesor.demo@nodrix.dev',
    'asesor',
    'Asesor Demo'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO customers (id, org_id, rut_hash, rut_ciphertext, name, email, phone)
VALUES (
    '00000000-0000-0000-0000-0000000000b1',
    '00000000-0000-0000-0000-000000000001',
    'demo-rut-hash-12345',
    NULL,
    'Cliente Demo',
    'cliente.demo@nodrix.dev',
    '+56900000000'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO applications (id, org_id, customer_id, stage)
VALUES (
    '00000000-0000-0000-0000-0000000000c1',
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-0000000000b1',
    'RECEPCIONADA'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO properties (id, org_id, name, price_uf, location, investment_type, available)
VALUES (
    '00000000-0000-0000-0000-0000000000d1',
    '00000000-0000-0000-0000-000000000001',
    'Proyecto Demo Torre Norte',
    3500.00,
    'Santiago, Chile',
    'renta',
    true
) ON CONFLICT (id) DO NOTHING;
