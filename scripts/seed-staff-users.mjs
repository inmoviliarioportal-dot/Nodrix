#!/usr/bin/env node
/**
 * Creates real, loggable-in Supabase Auth accounts for the staff roles
 * (asesor, admin, gerencia) and mirrors them into `public.users` with the
 * matching role. Without this, there is no way to sign in to
 * `/backoffice/*` or `/admin/*` — `POST /api/auth/register` always creates
 * `role = 'cliente'`, and `database/seeds/001_dev_seed.sql` only inserts a
 * `public.users` row (no matching Supabase Auth user, so it can't log in).
 *
 * Usage (against local Supabase, after `supabase start`):
 *   node scripts/seed-staff-users.mjs
 *
 * Reads NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY from .env.local.
 */
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

function loadEnvLocal() {
  try {
    const content = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
    for (const line of content.split("\n")) {
      const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (match && !process.env[match[1]]) {
        process.env[match[1]] = match[2].trim();
      }
    }
  } catch {
    // .env.local not found — assume env vars are already set (e.g. CI).
  }
}

loadEnvLocal();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const MVP_ORG_ID = "00000000-0000-0000-0000-000000000001";
const STAFF_PASSWORD = "Nodrix123!";

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY (.env.local).");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const STAFF = [
  { email: "asesor@nodrix.dev", role: "asesor", full_name: "Asesor Demo" },
  { email: "admin@nodrix.dev", role: "admin", full_name: "Admin Demo" },
  { email: "gerencia@nodrix.dev", role: "gerencia", full_name: "Gerencia Demo" },
];

async function findAuthUserByEmail(email) {
  // No direct "get by email" in the admin API — page through listUsers().
  let page = 1;
  const perPage = 200;
  for (;;) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    const found = data.users.find((u) => u.email === email);
    if (found) return found;
    if (data.users.length < perPage) return null;
    page += 1;
  }
}

async function main() {
  for (const staff of STAFF) {
    let authUser = await findAuthUserByEmail(staff.email);

    if (!authUser) {
      const { data, error } = await supabase.auth.admin.createUser({
        email: staff.email,
        password: STAFF_PASSWORD,
        email_confirm: true,
        user_metadata: { name: staff.full_name },
      });
      if (error) {
        console.error(`Failed to create auth user ${staff.email}:`, error.message);
        continue;
      }
      authUser = data.user;
      console.log(`Created auth user: ${staff.email}`);
    } else {
      console.log(`Auth user already exists: ${staff.email}`);
    }

    const { error: upsertError } = await supabase.from("users").upsert(
      {
        id: authUser.id,
        org_id: MVP_ORG_ID,
        email: staff.email,
        role: staff.role,
        full_name: staff.full_name,
      },
      { onConflict: "id" }
    );

    if (upsertError) {
      console.error(`Failed to upsert public.users row for ${staff.email}:`, upsertError.message);
      continue;
    }

    console.log(`  -> public.users role = ${staff.role}`);
  }

  console.log("\nDone. Staff credentials (dev only):");
  for (const staff of STAFF) {
    console.log(`  ${staff.role.padEnd(9)} ${staff.email}  /  ${STAFF_PASSWORD}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
