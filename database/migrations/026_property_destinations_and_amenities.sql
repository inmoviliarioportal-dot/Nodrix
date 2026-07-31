-- El equipo comercial ahora etiqueta cada propiedad con: (a) para qué
-- destino(s) es ideal (Airbnb/vivienda/alquiler tradicional/venta a corto
-- plazo -- mismos 4 valores que el cliente elige tras el wizard, ver
-- lib/wizard-storage.ts) y (b) qué servicios/comodidades tiene (piscina,
-- gimnasio, etc. -- ver lib/property-amenities.ts). Esto permite mostrarle
-- al cliente un carrusel SEPARADO por cada destino que seleccionó, y
-- badges con tooltip de servicios en cada tarjeta de propiedad.

ALTER TABLE properties ADD COLUMN IF NOT EXISTS target_destinations TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE properties ADD COLUMN IF NOT EXISTS amenities TEXT[] NOT NULL DEFAULT '{}';
