-- El flujo de propuesta de inversión pasó de 3 "bundles" fijos (1/2/3
-- departamentos) a un carrusel de hasta 8 propiedades individuales que el
-- cliente selecciona libremente (ver app/api/properties/recommendations/route.ts
-- y components/dashboard/PropertyCarousel.tsx) -- el CHECK anterior
-- (1, 2, 3) ya no aplica, ahora acepta cualquier conteo entre 1 y 8.
ALTER TABLE applications DROP CONSTRAINT IF EXISTS applications_accepted_department_count_check;
ALTER TABLE applications
    ADD CONSTRAINT applications_accepted_department_count_check
    CHECK (accepted_department_count IS NULL OR accepted_department_count BETWEEN 1 AND 8);
