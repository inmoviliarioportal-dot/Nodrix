-- Rediseño de bandas de propuesta inicial: de 3 tramos (1 / 2-4 / 5-6) a 6
-- tramos (1 / 1-2 / 2-3 / 3-4 / 4-5 / 5-6), cada uno con un % estimado de
-- probabilidad de aprobación bancaria en vez de un nivel cualitativo
-- (alta/media/baja) -- ver lib/proposal-risk.ts.
--
-- Las selecciones previas con los valores viejos ('2-4') no tienen un
-- mapeo exacto a los nuevos tramos -- se limpian para que el cliente
-- vuelva a elegir con el nuevo detalle (es una simulación, no un dato de
-- negocio irrecuperable).
UPDATE applications
SET initial_proposal_band = NULL, initial_proposal_purpose = NULL, initial_proposal_selected_at = NULL
WHERE initial_proposal_band NOT IN ('1', '1-2', '2-3', '3-4', '4-5', '5-6');

ALTER TABLE applications DROP CONSTRAINT IF EXISTS applications_initial_proposal_band_check;
ALTER TABLE applications
    ADD CONSTRAINT applications_initial_proposal_band_check
    CHECK (initial_proposal_band IS NULL OR initial_proposal_band IN ('1', '1-2', '2-3', '3-4', '4-5', '5-6'));
