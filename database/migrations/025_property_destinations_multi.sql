-- El cliente ahora elige el destino del inmueble DESPUÉS del wizard (junto a
-- la revelación de UF aprobadas, ver components/dashboard/InitialProposalCard.tsx),
-- y puede elegir MÁS DE UNO (ej. Airbnb + Alquiler tradicional a la vez).
-- `property_destination` (singular, wizard v10) queda como snapshot del
-- primer valor elegido para compatibilidad; `property_destinations` es la
-- fuente de verdad nueva.

ALTER TABLE customers ADD COLUMN IF NOT EXISTS property_destinations TEXT[];
