-- Nivel profesional declarado por el cliente (profesional/ingeniero vs
-- técnico) -- parámetro CUALITATIVO que topa la probabilidad de aprobación
-- en lib/proposal-risk.ts (ver ProfessionalLevel): a igual renta, un
-- profesional tiene mayor empleabilidad de respaldo que un técnico, lo que
-- reduce el riesgo percibido de no pago a futuro. Default 'tecnico' (el
-- tope más conservador) para filas existentes -- no descalifica a nadie.
ALTER TABLE customers
    ADD COLUMN IF NOT EXISTS professional_level TEXT
        CHECK (professional_level IS NULL OR professional_level IN ('profesional', 'tecnico'));
