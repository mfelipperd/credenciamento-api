export type TaxAnnex = 'III' | 'V';

interface TaxBracket {
  limit: number;
  rate: number;
  deduction: number;
}

export interface TaxCalculation {
  bracket: number;
  nominalRate: number;
  deduction: number;
  effectiveRate: number;
  amount: number;
}

const TAX_BRACKETS: Record<TaxAnnex, TaxBracket[]> = {
  III: [
    { limit: 180_000, rate: 6, deduction: 0 },
    { limit: 360_000, rate: 11.2, deduction: 9_360 },
    { limit: 720_000, rate: 13.5, deduction: 17_640 },
    { limit: 1_800_000, rate: 16, deduction: 35_640 },
    { limit: 3_600_000, rate: 21, deduction: 125_640 },
    { limit: 4_800_000, rate: 33, deduction: 648_000 },
  ],
  V: [
    { limit: 180_000, rate: 15.5, deduction: 0 },
    { limit: 360_000, rate: 18, deduction: 4_500 },
    { limit: 720_000, rate: 19.5, deduction: 9_900 },
    { limit: 1_800_000, rate: 20.5, deduction: 17_100 },
    { limit: 3_600_000, rate: 23, deduction: 62_100 },
    { limit: 4_800_000, rate: 30.5, deduction: 540_000 },
  ],
};

export function calculateTax(
  annualRevenue: number,
  taxableRevenue: number,
  annex: TaxAnnex,
): TaxCalculation | null {
  if (annualRevenue <= 0 || taxableRevenue < 0) return null;

  const bracketIndex = TAX_BRACKETS[annex].findIndex(
    ({ limit }) => annualRevenue <= limit,
  );
  const index =
    bracketIndex >= 0 ? bracketIndex : TAX_BRACKETS[annex].length - 1;
  const bracket = TAX_BRACKETS[annex][index];
  const effectiveRate =
    ((annualRevenue * (bracket.rate / 100) - bracket.deduction) /
      annualRevenue) *
    100;
  const amount = Math.round(taxableRevenue * (effectiveRate / 100) * 100) / 100;

  return {
    bracket: index + 1,
    nominalRate: bracket.rate,
    deduction: bracket.deduction,
    effectiveRate: Math.round(effectiveRate * 100) / 100,
    amount,
  };
}
