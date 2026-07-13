#!/usr/bin/env bash
# dev-reset.sh
#
# Resetea la base de datos local a un estado limpio y vuelve a aplicar
# database/schema.sql (dueño: agente DB Architect). Útil durante desarrollo
# cuando el schema cambia y quieres partir de cero.
#
# Prerequisitos:
#   - Supabase CLI instalado y stack local corriendo (o lo levanta este script)
#   - database/schema.sql debe existir (lo crea el agente DB Architect en
#     paralelo; si aún no existe, este script solo resetea el stack y avisa)
#
# Uso:
#   ./scripts/dev-reset.sh

set -euo pipefail
cd "$(dirname "$0")/.."

echo "==> Reseteando base de datos local (supabase db reset)..."
# `supabase db reset` recrea la DB desde cero y aplica automáticamente
# cualquier migración en supabase/migrations/. Nuestro schema.sql vive en
# database/schema.sql (propiedad del DB Architect), así que lo aplicamos
# explícitamente después del reset.
supabase db reset

SCHEMA_FILE="database/schema.sql"

if [ -f "$SCHEMA_FILE" ]; then
  echo "==> Aplicando $SCHEMA_FILE contra la DB local..."
  DB_CONTAINER="supabase_db_$(basename "$(pwd)")"
  if command -v psql >/dev/null 2>&1; then
    # psql local disponible (poco común en Windows sin instalar Postgres client)
    psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -f "$SCHEMA_FILE"
  else
    # Fallback: usar el psql empaquetado dentro del contenedor de Postgres
    # que levanta `supabase start` (no requiere instalar cliente Postgres local).
    docker exec -i "$DB_CONTAINER" psql -U postgres -d postgres < "$SCHEMA_FILE"
  fi
  echo "==> Schema aplicado correctamente."
else
  echo "==> AVISO: $SCHEMA_FILE no existe todavía (puede que el DB Architect"
  echo "    aún no lo haya creado). El stack quedó reseteado pero sin schema"
  echo "    de negocio aplicado. Vuelve a correr este script cuando exista."
fi

echo ""
echo "==> Reset completo."
