-- 039: el ESTADO del inmueble que busca el cliente pasa a ser multi-selección.
--
-- Contexto de negocio: un cliente puede estar dispuesto a comprar una unidad
-- de entrega inmediata Y ADEMÁS una en verde o en blanco (distinto plazo de
-- entrega, distinto precio). Con una sola opción había que elegir una y se
-- perdía el resto de su interés real, lo que angostaba de más las propiedades
-- que se le podían ofrecer.
--
-- Mismo patrón que `property_destinations` (migración 025):
-- `property_status` (singular) se conserva como snapshot del primer valor
-- elegido, para no romper lecturas existentes ni el CHECK de la migración
-- 004; `property_statuses` es la fuente de verdad nueva.
--
-- Sin CHECK sobre el arreglo: los valores válidos (en_verde | en_blanco |
-- usado | entrega_inmediata | sin_definir) se validan en la capa de
-- aplicación, igual que en `property_destinations`.
--
-- Idempotente: se puede re-aplicar sin efecto.

ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS property_statuses TEXT[];

COMMENT ON COLUMN customers.property_statuses IS
  'Estados de inmueble que acepta el cliente (multi-selección). property_status queda como snapshot del primero. Ver migración 039.';
