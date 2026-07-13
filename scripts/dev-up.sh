#!/usr/bin/env bash
# dev-up.sh
#
# Levanta el entorno de desarrollo local completo usando Supabase CLI
# (Postgres + Auth + Storage + Realtime + Studio + Mailpit), corriendo
# internamente sobre Docker.
#
# Prerequisitos:
#   - Docker Desktop corriendo
#   - Supabase CLI instalado (`supabase --version`)
#   - Ejecutar desde la raíz del repo (donde vive supabase/config.toml)
#
# Uso:
#   ./scripts/dev-up.sh
#
# Al terminar, imprime las URLs y keys que hay que copiar a .env.local.

set -euo pipefail
cd "$(dirname "$0")/.."

echo "==> Levantando stack local de Supabase (Docker)..."
supabase start

echo ""
echo "==> Entorno local arriba. Copia estos valores a tu .env.local:"
echo ""
supabase status

echo ""
echo "Studio (UI):    http://127.0.0.1:54323"
echo "Mailpit (mail): http://127.0.0.1:54324"
echo ""
echo "Para detener:            ./scripts/dev-down.sh"
echo "Para resetear la DB:     ./scripts/dev-reset.sh"
