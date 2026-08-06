-- 038: destino (categoría) elegido por el cliente para CADA propiedad seleccionada.
--
-- Contexto: en /onboarding/initial-proposal el cliente ve un carrusel por
-- destino (Airbnb, alquiler tradicional, venta a corto plazo, ...). Una misma
-- propiedad puede aparecer en más de un carrusel, así que saber solo QUÉ
-- propiedades eligió (`selected_property_ids`) pierde la información de PARA
-- QUÉ objetivo las eligió -- que es justamente lo que el asesor necesita para
-- evaluar la solicitud.
--
-- Forma: objeto JSON `{ "<property_id>": "<destino>" }`. Se usa jsonb (y no
-- una tabla puente) por consistencia con el resto de datos de propuesta ya
-- guardados en `applications` (selected_property_ids, income_sources), y
-- porque el máximo es de 6 propiedades por solicitud.
--
-- Las claves son ids de propiedades y los valores uno de los destinos válidos
-- del wizard: vivir | airbnb | alquiler_tradicional | venta_corto_plazo. No se
-- valida con CHECK porque el catálogo de destinos vive en el código
-- (lib/wizard-storage.ts) y crecería sin migración.
--
-- Idempotente: se puede re-aplicar sin efecto.

ALTER TABLE applications
  ADD COLUMN IF NOT EXISTS selected_property_destinations JSONB;

COMMENT ON COLUMN applications.selected_property_destinations IS
  'Mapa {property_id: destino} con la categoría que el cliente eligió para cada propiedad seleccionada. Complementa selected_property_ids. Ver migración 038.';
