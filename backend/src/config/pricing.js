/**
 * Remittance pricing — single source for forex and fee tiers (env-overridable rate).
 * Adjust tiers here or extend with DB-backed config later.
 */

const FEE_TIERS = [
  { maxNPR: 100000, feeNPR: 500, label: '0 – 100,000 NPR' },
  { maxNPR: 200000, feeNPR: 1000, label: '100,001 – 200,000 NPR' },
  { maxNPR: Infinity, feeNPR: 3000, label: 'Above 200,000 NPR' },
];

const getForexRate = () => {
  const raw = process.env.FOREX_RATE_JPY_NPR;
  const v = raw !== undefined && raw !== '' ? parseFloat(raw) : 0.92;
  return Number.isFinite(v) && v > 0 ? v : 0.92;
};

const calculateServiceFee = (amountNPR) => {
  const n = Number(amountNPR);
  for (const tier of FEE_TIERS) {
    if (n <= tier.maxNPR) return tier.feeNPR;
  }
  return FEE_TIERS[FEE_TIERS.length - 1].feeNPR;
};

/** For API / UI — JSON-safe (Infinity → null for open-ended tier) */
const getFeeTierDefinitions = () =>
  FEE_TIERS.map(({ maxNPR, feeNPR, label }) => ({
    maxNPR: maxNPR === Infinity ? null : maxNPR,
    feeNPR,
    label,
  }));

module.exports = {
  FEE_TIERS,
  getForexRate,
  calculateServiceFee,
  getFeeTierDefinitions,
};
