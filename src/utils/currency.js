/**
 * Currency & number formatting utilities.
 * All pure functions — no side effects.
 */

/** Full BRL: R$ 1.234,56 */
export const BRL = (v) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);

/** Compact BRL: R$1.2k when >= 1000 */
export const BRLk = (v) => {
  const abs = Math.abs(v || 0);
  return abs >= 1000 ? `R$${(v / 1000).toFixed(1)}k` : BRL(v);
};

/** Percentage change from prev to curr */
export const pctOf = (curr, prev) =>
  prev !== 0 ? ((curr - prev) / Math.abs(prev)) * 100 : 0;

/** Clamp a value between min and max */
export const clamp = (v, min, max) => Math.min(Math.max(v, min), max);
