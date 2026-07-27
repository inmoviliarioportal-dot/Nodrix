-- Persiste las fuentes de ingreso declaradas por el cliente en el wizard
-- (sueldo fijo, boleta, pensión, alquiler, sociedad -- ver lib/income-types.ts),
-- tal cual las envió, para poder recalcular el tope de Leverage específico
-- por tipo de ingreso más adelante (GET /api/applications/[id]/proposal-bands)
-- sin tener que volver a pedirle los datos al cliente. Mismo patrón que
-- savings_amount (009) y total_debt_balance (020).
ALTER TABLE applications
    ADD COLUMN IF NOT EXISTS income_sources JSONB;
