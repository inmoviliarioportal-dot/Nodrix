-- Propuesta inicial (simulación) que el cliente elige ANTES de subir
-- documentos: banda de departamentos (1 / 2-4 / 5-6) según su riesgo
-- crediticio (ver lib/proposal-risk.ts) y el lente con el que la evaluó
-- (inversión o vivienda propia). Es solo una simulación -- queda sujeta a
-- confirmación tras el envío de la documentación real al banco.
ALTER TABLE applications
    ADD COLUMN IF NOT EXISTS initial_proposal_band TEXT
        CHECK (initial_proposal_band IS NULL OR initial_proposal_band IN ('1', '2-4', '5-6')),
    ADD COLUMN IF NOT EXISTS initial_proposal_purpose TEXT
        CHECK (initial_proposal_purpose IS NULL OR initial_proposal_purpose IN ('inversion', 'vivienda_propia')),
    ADD COLUMN IF NOT EXISTS initial_proposal_selected_at TIMESTAMPTZ;
