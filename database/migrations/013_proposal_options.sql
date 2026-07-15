-- Propuesta FINAL: a diferencia de la propuesta inicial (simulación, banda
-- de deptos), esta la carga el asesor luego de la visita y la aprobación
-- bancaria -- hasta 6 opciones concretas (1 a 6 departamentos, con comuna y
-- precio reales) para que el cliente elija con cuál se queda antes de
-- avanzar a escrituración.
CREATE TABLE IF NOT EXISTS proposal_options (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id           UUID NOT NULL REFERENCES organizations(id),
    application_id   UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    department_count INTEGER NOT NULL CHECK (department_count BETWEEN 1 AND 6),
    purpose          TEXT CHECK (purpose IS NULL OR purpose IN ('inversion', 'vivienda_propia')),
    comuna           TEXT,
    price_uf         NUMERIC(12,2),
    notes            TEXT,
    status           TEXT NOT NULL DEFAULT 'pendiente'
        CHECK (status IN ('pendiente', 'aceptada', 'rechazada')),
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_proposal_options_application_id ON proposal_options (application_id);
CREATE INDEX IF NOT EXISTS idx_proposal_options_org_id ON proposal_options (org_id);

ALTER TABLE applications
    ADD COLUMN IF NOT EXISTS accepted_proposal_option_id UUID REFERENCES proposal_options(id);
