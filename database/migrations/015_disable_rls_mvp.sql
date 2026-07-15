-- =============================================================================
-- Migración 015: Revertir RLS (activado por error en despliegue a producción)
-- =============================================================================
-- 002_rls.sql documenta explícitamente "NO SE EJECUTA EN EL MVP" -- requiere
-- un claim `org_id` en el JWT de Supabase Auth que hoy no existe (necesitaría
-- un Custom Access Token Hook). Se aplicó por error junto con el resto del
-- rango de migraciones al desplegar a Supabase Cloud, bloqueando con RLS
-- todas las lecturas del cliente (anon key) ya que `auth.jwt() ->> 'org_id'`
-- siempre es NULL. Este archivo deja las tablas como especifica el MVP:
-- RLS preparado (las políticas quedan definidas, ver 002_rls.sql) pero
-- deshabilitado operativamente -- aislamiento single-tenant a nivel de
-- aplicación, no de base de datos.
-- =============================================================================

ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE customers DISABLE ROW LEVEL SECURITY;
ALTER TABLE applications DISABLE ROW LEVEL SECURITY;
ALTER TABLE application_stage_history DISABLE ROW LEVEL SECURITY;
ALTER TABLE documents DISABLE ROW LEVEL SECURITY;
ALTER TABLE properties DISABLE ROW LEVEL SECURITY;
ALTER TABLE visits DISABLE ROW LEVEL SECURITY;
ALTER TABLE mortgage_operations DISABLE ROW LEVEL SECURITY;
ALTER TABLE deed_appointments DISABLE ROW LEVEL SECURITY;
ALTER TABLE closures DISABLE ROW LEVEL SECURITY;
ALTER TABLE audit_events DISABLE ROW LEVEL SECURITY;
