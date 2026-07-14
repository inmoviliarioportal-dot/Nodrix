-- Red de seguridad contra applications duplicadas para el mismo customer.
-- La lógica de dedup de POST /api/leads (findCustomerByEmail -> si existe,
-- reutiliza su última application o crea una si no tiene ninguna) tiene una
-- ventana de carrera: dos requests concurrentes para el mismo customer sin
-- application todavía pueden ambas ver "no tiene" y crear una cada una
-- (confirmado en producción de pruebas: 2 applications con ~3ms de
-- diferencia). Este índice único hace que la BD rechace la segunda
-- inserción concurrente en vez de aceptarla -- app/api/leads/route.ts
-- atrapa el conflicto y devuelve la application ya creada por la primera.
--
-- Solo cubre applications "abiertas" (no CIERRE): un customer sí puede
-- volver a postular después de cerrar un proceso anterior.
CREATE UNIQUE INDEX IF NOT EXISTS idx_applications_one_open_per_customer
    ON applications (customer_id)
    WHERE stage <> 'CIERRE';
