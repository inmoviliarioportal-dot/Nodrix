#!/usr/bin/env bash
# dev-down.sh
#
# Detiene limpiamente el entorno de desarrollo local levantado con
# `supabase start` (dev-up.sh). Los datos persisten en volúmenes Docker
# nombrados hasta que se corra `supabase stop --no-backup` manualmente.
#
# Prerequisitos:
#   - Supabase CLI instalado
#   - Ejecutar desde la raíz del repo
#
# Uso:
#   ./scripts/dev-down.sh

set -euo pipefail
cd "$(dirname "$0")/.."

echo "==> Deteniendo stack local de Supabase..."
supabase stop

echo "==> Entorno detenido. Los datos persisten (usa dev-reset.sh para limpiar el schema)."
