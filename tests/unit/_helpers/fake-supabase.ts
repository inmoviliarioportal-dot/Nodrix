/**
 * Fake Supabase client — cliente en memoria, genérico, para tests de
 * integración "livianos" (sin red, sin Postgres real) que ejercitan rutas
 * completas de `app/api/**` en vez de solo funciones sueltas.
 *
 * Soporta únicamente las cadenas que los route handlers de este repo
 * realmente usan: `.select().eq().ilike().order().limit().maybeSingle()`
 * `.single()`, `.insert().select().single()`, `.update().eq()`,
 * `.upsert(obj, {onConflict})`, `.delete().eq()`. No es un mock de
 * PostgREST completo -- si un endpoint nuevo usa una cadena no soportada
 * acá, hay que extender este helper explícitamente (fallar fuerte es mejor
 * que fingir comportamiento incorrecto).
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;
export type FakeDb = Record<string, Row[]>;

let uuidCounter = 0;
function fakeUuid(): string {
  uuidCounter += 1;
  return `test-uuid-${uuidCounter.toString().padStart(8, "0")}`;
}

export function makeEmptyDb(): FakeDb {
  return {
    customers: [],
    applications: [],
    guarantors: [],
    application_stage_history: [],
    wizard_variable_sets: [],
    audit_events: [],
    scoring_rule_sets: [],
  };
}

function table(db: FakeDb, name: string): Row[] {
  if (!db[name]) db[name] = [];
  return db[name];
}

class SelectChain {
  private rows: Row[];
  constructor(rows: Row[]) {
    this.rows = rows;
  }
  eq(col: string, val: unknown): this {
    this.rows = this.rows.filter((r) => r[col] === val);
    return this;
  }
  ilike(col: string, val: string): this {
    const needle = String(val).toLowerCase().replace(/%/g, "");
    this.rows = this.rows.filter((r) => String(r[col] ?? "").toLowerCase().includes(needle));
    return this;
  }
  order(col: string, opts?: { ascending?: boolean }): this {
    const asc = opts?.ascending !== false;
    this.rows = [...this.rows].sort((a, b) => {
      if (a[col] === b[col]) return 0;
      const cmp = a[col] > b[col] ? 1 : -1;
      return asc ? cmp : -cmp;
    });
    return this;
  }
  limit(n: number): this {
    this.rows = this.rows.slice(0, n);
    return this;
  }
  maybeSingle(): Promise<{ data: Row | null; error: null }> {
    return Promise.resolve({ data: this.rows[0] ?? null, error: null });
  }
  single(): Promise<{ data: Row | null; error: { message: string } | null }> {
    if (this.rows.length === 0) {
      return Promise.resolve({ data: null, error: { message: "not found" } });
    }
    return Promise.resolve({ data: this.rows[0], error: null });
  }
  then<TResult1 = { data: Row[]; error: null }, TResult2 = never>(
    onfulfilled?: ((value: { data: Row[]; error: null }) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ): Promise<TResult1 | TResult2> {
    return Promise.resolve({ data: this.rows, error: null }).then(onfulfilled, onrejected);
  }
}

class InsertChain {
  constructor(private rows: Row[]) {}
  select(_cols?: string): SelectChain {
    return new SelectChain(this.rows);
  }
  then<TResult1 = { data: Row[]; error: null }, TResult2 = never>(
    onfulfilled?: ((value: { data: Row[]; error: null }) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ): Promise<TResult1 | TResult2> {
    return Promise.resolve({ data: this.rows, error: null }).then(onfulfilled, onrejected);
  }
}

class UpdateChain {
  private matched: Row[] = [];
  constructor(
    private db: FakeDb,
    private tableName: string,
    private patch: Row
  ) {}
  eq(col: string, val: unknown): this {
    const rows = table(this.db, this.tableName).filter((r) => r[col] === val);
    rows.forEach((r) => Object.assign(r, this.patch));
    this.matched = rows;
    return this;
  }
  select(_cols?: string): SelectChain {
    return new SelectChain(this.matched);
  }
  then<TResult1 = { data: Row[]; error: null }, TResult2 = never>(
    onfulfilled?: ((value: { data: Row[]; error: null }) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ): Promise<TResult1 | TResult2> {
    return Promise.resolve({ data: this.matched, error: null }).then(onfulfilled, onrejected);
  }
}

class DeleteChain {
  constructor(
    private db: FakeDb,
    private tableName: string
  ) {}
  eq(col: string, val: unknown): Promise<{ data: null; error: null }> {
    this.db[this.tableName] = table(this.db, this.tableName).filter((r) => r[col] !== val);
    return Promise.resolve({ data: null, error: null });
  }
}

/** Crea un cliente Supabase falso, en memoria, respaldado por `db` (objeto
 * mutable compartido entre llamadas -- así los tests pueden inspeccionar el
 * estado directamente, ej. `db.applications[0].wizard_variable_set_id`). */
export function makeFakeSupabaseClient(db: FakeDb) {
  return {
    from(tableName: string) {
      return {
        select(_cols?: string) {
          return new SelectChain([...table(db, tableName)]);
        },
        insert(payload: Row | Row[]) {
          const rows = Array.isArray(payload) ? payload : [payload];
          const inserted = rows.map((r) => {
            const row: Row = { id: fakeUuid(), created_at: new Date().toISOString(), ...r };
            table(db, tableName).push(row);
            return row;
          });
          return new InsertChain(inserted);
        },
        update(patch: Row) {
          return new UpdateChain(db, tableName, patch);
        },
        upsert(payload: Row, opts?: { onConflict?: string }) {
          const conflictCol = opts?.onConflict ?? "id";
          const rows = table(db, tableName);
          const existing = rows.find((r) => r[conflictCol] === payload[conflictCol]);
          if (existing) {
            Object.assign(existing, payload);
            return Promise.resolve({ data: [existing], error: null });
          }
          const row: Row = { id: fakeUuid(), created_at: new Date().toISOString(), ...payload };
          rows.push(row);
          return Promise.resolve({ data: [row], error: null });
        },
        delete() {
          return new DeleteChain(db, tableName);
        },
      };
    },
  };
}

/** Inserta directamente una fila en `db[table]`, generando `id`/`created_at`
 * si no vienen -- atajo para armar fixtures de test sin pasar por la API. */
export function seedRow(db: FakeDb, tableName: string, row: Row): Row {
  const full: Row = { id: fakeUuid(), created_at: new Date().toISOString(), ...row };
  table(db, tableName).push(full);
  return full;
}
