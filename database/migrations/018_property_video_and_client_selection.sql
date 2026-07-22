-- -----------------------------------------------------------------------------
-- VIDEO DE PROPIEDADES + SELECCIÓN DE PROPUESTA POR EL CLIENTE
-- -----------------------------------------------------------------------------
-- video_url: video referencial del inmueble (opcional), mostrado junto a las
-- imágenes en las propuestas de 1/2/3 departamentos.
ALTER TABLE properties
    ADD COLUMN IF NOT EXISTS video_url TEXT;

-- selected_property_ids: propiedades concretas elegidas por el cliente al
-- aceptar una de las 3 propuestas (1/2/3 departamentos).
ALTER TABLE applications
    ADD COLUMN IF NOT EXISTS selected_property_ids UUID[];

-- accepted_department_count: cantidad de departamentos de la propuesta
-- aceptada. Se guarda aparte de `initial_proposal_band` (que ya se usa para
-- la banda de riesgo auto-seleccionada por InitialProposalCard) para no
-- pisar ese valor con un concepto distinto (tamaño de propuesta elegido).
ALTER TABLE applications
    ADD COLUMN IF NOT EXISTS accepted_department_count INT CHECK (accepted_department_count IN (1, 2, 3));
