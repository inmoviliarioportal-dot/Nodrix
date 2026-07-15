import { describe, expect, it } from "vitest";
import { calculateProposalBands, PROPOSAL_BANDS } from "../../lib/proposal-risk";

describe("calculateProposalBands", () => {
  it("retorna las 6 bandas en orden", () => {
    const result = calculateProposalBands(80);
    expect(result.map((r) => r.band)).toEqual(PROPOSAL_BANDS);
    expect(result).toHaveLength(6);
  });

  it("el % de aprobación decrece monotónicamente a medida que crece la banda", () => {
    const result = calculateProposalBands(85);
    for (let i = 1; i < result.length; i++) {
      expect(result[i].approvalProbability).toBeLessThanOrEqual(result[i - 1].approvalProbability);
    }
  });

  it("un score excelente (BLACK) da probabilidades altas incluso en la banda más exigente", () => {
    const result = calculateProposalBands(95);
    const byBand = Object.fromEntries(result.map((r) => [r.band, r.approvalProbability]));
    expect(byBand["1"]).toBeGreaterThanOrEqual(85);
    expect(byBand["5-6"]).toBeGreaterThanOrEqual(30);
  });

  it("un score bajo (BRONCE) da probabilidades bajas en todas las bandas", () => {
    const result = calculateProposalBands(15);
    expect(result.every((r) => r.approvalProbability <= 20)).toBe(true);
  });

  it("clampa el % entre 3 y 97 en vez de dar 0% o 100% absolutos", () => {
    const low = calculateProposalBands(-10);
    const high = calculateProposalBands(150);
    expect(low.every((r) => r.approvalProbability >= 3)).toBe(true);
    expect(high.every((r) => r.approvalProbability <= 97)).toBe(true);
  });

  it("nunca lanza con scores fuera de rango", () => {
    expect(() => calculateProposalBands(-10)).not.toThrow();
    expect(() => calculateProposalBands(1000)).not.toThrow();
    expect(() => calculateProposalBands(NaN)).not.toThrow();
  });
});
