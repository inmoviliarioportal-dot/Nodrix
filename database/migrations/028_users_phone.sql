-- Teléfono del usuario de backend (asesor/admin/gerencia) -- el asesor lo
-- carga desde "Editar mis datos" y se usa para armar el enlace de WhatsApp
-- que ve el cliente en su dashboard (ver WhatsAppBubble.tsx), en vez de un
-- número mock fijo para todos los asesores.
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone TEXT;
