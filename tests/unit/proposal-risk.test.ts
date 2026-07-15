import { describe, expect, it } from "vitest";
import { calculateProposalBands } from "../../lib/proposal-risk";

describe("calculateProposalBands", () => {
  it("da baja seguridad en todas las bandas para un score BRONCE muy bajo", () => {
    const result = calculateProposalBands(10);
    expect(result.map((r) => r.level)).toEqual(["baja", "baja", "baja"]);
  });

  it("da alta seguridad en 1 depto pero baja/media en las bandas más altas para un score PLATA", () => {
    const result = calculateProposalBands(45);
    const byBand = Object.fromEntries(result.map((r) => [r.band, r.level]));
    expect(byBand["1"]).toBe("alta");
    expect(byBand["2-4"]).toBe("media");
    expect(byBand["5-6"]).toBe("baja");
  });

  it("da alta seguridad en 1 y 2-4 deptos para un score ORO", () => {
    const result = calculateProposalBands(65);
    const byBand = Object.fromEntries(result.map((r) => [r.band, r.level]));
    expect(byBand["1"]).toBe("alta");
    expect(byBand["2-4"]).toBe("alta");
    expect(byBand["5-6"]).toBe("media");
  });

  it("da alta seguridad en las 3 bandas para un score BLACK (excelente)", () => {
    const result = calculateProposalBands(95);
    expect(result.map((r) => r.level)).toEqual(["alta", "alta", "alta"]);
  });

  it("clampa scores fuera de rango en vez de romper", () => {
    expect(() => calculateProposalBands(-10)).not.toThrow();
    expect(() => calculateProposalBands(150)).not.toThrow();
    expect(calculateProposalBands(-10).every((r) => r.level === "baja")).toBe(true);
    expect(calculateProposalBands(150).every((r) => r.level === "alta")).toBe(true);
  });
});
