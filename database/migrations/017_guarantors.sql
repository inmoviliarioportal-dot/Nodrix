-- -----------------------------------------------------------------------------
-- GUARANTORS — aval/codeudor declarado por el cliente en el wizard
-- -----------------------------------------------------------------------------
-- Un aval por application (MVP): solo se pide renta + tipo de contrato +
-- parentesco, no un perfil financiero completo. `relationship` se limita a
-- los parentescos que la banca chilena típicamente acepta como aval
-- hipotecario válido (cónyuge/conviviente civil, padre, madre, hijo, hermano)
-- -- ver lib/wizard-storage.ts.
CREATE TABLE IF NOT EXISTS guarantors (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id           UUID NOT NULL REFERENCES organizations(id),
    application_id   UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    relationship     TEXT NOT NULL CHECK (relationship IN ('conyuge', 'padre', 'madre', 'hijo', 'hermano')),
    monthly_income   NUMERIC(14,2) NOT NULL CHECK (monthly_income >= 0),
    employment_type  TEXT NOT NULL CHECK (employment_type IN ('indefinido', 'plazo_fijo', 'honorarios', 'independiente')),
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_guarantors_one_per_application ON guarantors (application_id);
