-- Agrega el número de departamento/unidad a `properties` -- el equipo
-- comercial lo carga al crear la propiedad y el asesor lo ve en el listado
-- de solo lectura (ver app/backoffice/properties).
ALTER TABLE properties ADD COLUMN IF NOT EXISTS unit_number TEXT;
