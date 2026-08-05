import { describe, expect, it } from "vitest";
import { DEFAULT_LOAN_TERM_TIERS, loanTermYearsFor, MAX_AGE_AT_APPLICATION } from "../../lib/loan-term";

/** Construye un birthDate ISO tal que, a la fecha actual, la persona tiene
 * exactamente `age` años (nacida hoy hace `age` años, mismo día/mes -- no ha
 * cumplido años "de más" ni "de menos"). */
function birthDateForAge(age: number): string {
  const now = new Date();
  const year = now.getFullYear() - age;
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

describe("loanTermYearsFor", () => {
  describe("profesional", () => {
    it("44 años -> 30 años de plazo", () => {
      const result = loanTermYearsFor({ birthDate: birthDateForAge(44), professionalLevel: "profesional" });
      expect(result.years).toBe(30);
      expect(result.effectiveAge).toBe(44);
      expect(result.reason).toBe("profesional_30");
    });

    it("45 años -> 25 años de plazo (cruza el tramo)", () => {
      const result = loanTermYearsFor({ birthDate: birthDateForAge(45), professionalLevel: "profesional" });
      expect(result.years).toBe(25);
      expect(result.reason).toBe("profesional_25");
    });

    it("54 años -> 25 años de plazo", () => {
      const result = loanTermYearsFor({ birthDate: birthDateForAge(54), professionalLevel: "profesional" });
      expect(result.years).toBe(25);
    });

    it("55 años -> 15 años de plazo (cruza el tramo)", () => {
      const result = loanTermYearsFor({ birthDate: birthDateForAge(55), professionalLevel: "profesional" });
      expect(result.years).toBe(15);
      expect(result.reason).toBe("profesional_15");
    });

    it("65 años -> 15 años de plazo (borde superior)", () => {
      const result = loanTermYearsFor({ birthDate: birthDateForAge(65), professionalLevel: "profesional" });
      expect(result.years).toBe(15);
    });

    it("66 años -> sin plazo automático (null), deriva a revisión del asesor", () => {
      const result = loanTermYearsFor({ birthDate: birthDateForAge(66), professionalLevel: "profesional" });
      expect(result.years).toBeNull();
      expect(result.reason).toBe(`fuera_de_tramo_${MAX_AGE_AT_APPLICATION}+`);
    });
  });

  describe("tecnico", () => {
    it("54 años -> 25 años de plazo", () => {
      const result = loanTermYearsFor({ birthDate: birthDateForAge(54), professionalLevel: "tecnico" });
      expect(result.years).toBe(25);
      expect(result.reason).toBe("tecnico_25");
    });

    it("55 años -> 15 años de plazo (cruza el tramo)", () => {
      const result = loanTermYearsFor({ birthDate: birthDateForAge(55), professionalLevel: "tecnico" });
      expect(result.years).toBe(15);
      expect(result.reason).toBe("tecnico_15");
    });

    it("65 años -> 15 años de plazo (borde superior)", () => {
      const result = loanTermYearsFor({ birthDate: birthDateForAge(65), professionalLevel: "tecnico" });
      expect(result.years).toBe(15);
    });

    it("66 años -> sin plazo automático (null)", () => {
      const result = loanTermYearsFor({ birthDate: birthDateForAge(66), professionalLevel: "tecnico" });
      expect(result.years).toBeNull();
    });
  });

  describe("aval mejora el plazo si es más joven", () => {
    it("cliente 55 (profesional, 15 años) con aval de 40 -> usa la edad del aval, 30 años", () => {
      const result = loanTermYearsFor({
        birthDate: birthDateForAge(55),
        professionalLevel: "profesional",
        avalBirthDate: birthDateForAge(40),
      });
      expect(result.usedAval).toBe(true);
      expect(result.effectiveAge).toBe(40);
      expect(result.years).toBe(30);
    });

    it("aval más viejo que el cliente NO empeora el plazo (se ignora)", () => {
      const result = loanTermYearsFor({
        birthDate: birthDateForAge(40),
        professionalLevel: "profesional",
        avalBirthDate: birthDateForAge(60),
      });
      expect(result.usedAval).toBe(false);
      expect(result.effectiveAge).toBe(40);
      expect(result.years).toBe(30);
    });

    it("aval más joven puede rescatar a un cliente 66+ que quedaría sin tramo", () => {
      const result = loanTermYearsFor({
        birthDate: birthDateForAge(70),
        professionalLevel: "tecnico",
        avalBirthDate: birthDateForAge(50),
      });
      expect(result.usedAval).toBe(true);
      expect(result.effectiveAge).toBe(50);
      expect(result.years).toBe(25);
    });
  });

  describe("fallback plano (dato faltante)", () => {
    it("sin birthDate -> fallback (25 por defecto), effectiveAge null", () => {
      const result = loanTermYearsFor({ birthDate: undefined, professionalLevel: "profesional" });
      expect(result.years).toBe(25);
      expect(result.effectiveAge).toBeNull();
      expect(result.reason).toBe("sin_fecha_nacimiento_o_nivel_profesional_fallback");
    });

    it("sin professionalLevel -> fallback (25 por defecto)", () => {
      const result = loanTermYearsFor({ birthDate: birthDateForAge(30), professionalLevel: null });
      expect(result.years).toBe(25);
      expect(result.reason).toBe("sin_fecha_nacimiento_o_nivel_profesional_fallback");
    });

    it("respeta un fallbackYears custom cuando falta el dato", () => {
      const result = loanTermYearsFor({ birthDate: undefined, professionalLevel: "tecnico", fallbackYears: 20 });
      expect(result.years).toBe(20);
    });
  });

  describe("tiers custom (desde VariableSet)", () => {
    it("usa la matriz pasada explícitamente en vez de la default", () => {
      const customTiers = {
        profesional: [{ maxAge: 30, years: 30 as const }],
        tecnico: [{ maxAge: 30, years: 25 as const }],
      };
      const result = loanTermYearsFor({
        birthDate: birthDateForAge(35),
        professionalLevel: "profesional",
        tiers: customTiers,
      });
      // 35 > 30 (único tramo de la matriz custom) -> sin tramo
      expect(result.years).toBeNull();
    });
  });

  describe("ningún tramo produce edad + plazo > 80", () => {
    it("DEFAULT_LOAN_TERM_TIERS respeta el límite duro edad+plazo <= 80", () => {
      for (const levelTiers of Object.values(DEFAULT_LOAN_TERM_TIERS)) {
        for (const tier of levelTiers) {
          expect(tier.maxAge + tier.years).toBeLessThanOrEqual(80);
        }
      }
    });
  });
});
