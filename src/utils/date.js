/**
 * Date utilities.
 * `now` is a stable reference created once at app boot.
 * Pure helpers — no side effects.
 */

export const now = new Date();

/** ISO date string "YYYY-MM-DD" from a Date object */
export const fmt = (d) => d.toISOString().split("T")[0];

/** ISO date string N days ago from today */
export const dAgo = (n) => {
  const d = new Date(now);
  d.setDate(d.getDate() - n);
  return fmt(d);
};

/** ISO date string N days ahead from today */
export const dAhd = (n) => {
  const d = new Date(now);
  d.setDate(d.getDate() + n);
  return fmt(d);
};

/**
 * Days difference between a date string and today.
 * Negative = in the past, 0 = today, positive = future.
 */
export const diffD = (dateStr) =>
  Math.round(
    (new Date(dateStr + "T00:00:00") - new Date(fmt(now) + "T00:00:00")) /
      86400000
  );

/**
 * Filter transactions to a specific calendar month.
 * @param {Array}  txs  – transaction array
 * @param {number} off  – month offset (0 = current, 1 = previous, …)
 */
export const monthOf = (txs, off = 0) => {
  let m = now.getMonth() - off;
  let y = now.getFullYear();
  if (m < 0) { m += 12; y--; }
  return txs.filter((t) => {
    const d = new Date(t.date);
    return d.getMonth() === m && d.getFullYear() === y;
  });
};

/**
 * Build an array of monthly {label, inc, exp, profit} objects.
 * @param {Array}  txs – all transactions
 * @param {number} n   – how many months to go back (default 6)
 */
export const monthsData = (txs, n = 6) =>
  Array.from({ length: n }, (_, i) => {
    const tx  = monthOf(txs, n - 1 - i);
    const inc = tx.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
    const exp = tx.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
    let m = now.getMonth() - (n - 1 - i);
    let y = now.getFullYear();
    if (m < 0) { m += 12; y--; }
    const label = new Date(y, m, 1).toLocaleString("pt-BR", { month: "short" });
    return { label, inc, exp, profit: inc - exp };
  });

/** Localised long month name, title-cased */
export const monthLabel = (offset = 0) => {
  let m = now.getMonth() - offset;
  let y = now.getFullYear();
  if (m < 0) { m += 12; y--; }
  const s = new Date(y, m, 1).toLocaleString("pt-BR", { month: "long" });
  return s.charAt(0).toUpperCase() + s.slice(1);
};

// ─── CALENDAR GRID HELPERS ────────────────────────────────────────────────────
// Pure, reusable date-grid builders — not tied to any specific feature's UI,
// so any future screen needing a month grid can reuse them.

/** "Julho de 2026" for an arbitrary (year, month) pair — not tied to `now`. */
export const monthYearLabel = (year, month) => {
  const s = new Date(year, month, 1).toLocaleString("pt-BR", { month: "long" });
  return `${s.charAt(0).toUpperCase() + s.slice(1)} de ${year}`;
};

/** "Sábado, 19 de julho de 2026" from an ISO date string. */
export const fullDateLabel = (dateStr) => {
  const d = new Date(dateStr + "T12:00:00"); // noon avoids TZ edge cases
  const s = d.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  return s.charAt(0).toUpperCase() + s.slice(1);
};

/**
 * Builds a month grid as an array of weeks (each week = 7 day cells),
 * padded with the trailing days of the previous/next month so every
 * week row has exactly 7 cells. Week starts on Sunday.
 *
 * Each cell: { date: "YYYY-MM-DD", day: number, inMonth: bool, isToday: bool }
 */
export const buildMonthGrid = (year, month) => {
  const firstWeekday = new Date(year, month, 1).getDay(); // 0=Sun..6=Sat
  const numDays      = new Date(year, month + 1, 0).getDate();
  const prevNumDays  = new Date(year, month, 0).getDate();
  const todayStr     = fmt(now);

  const cells = [];
  for (let i = firstWeekday - 1; i >= 0; i--) {
    const d = prevNumDays - i;
    cells.push({ date: fmt(new Date(year, month - 1, d)), day: d, inMonth: false, isToday: false });
  }
  for (let d = 1; d <= numDays; d++) {
    const dateStr = fmt(new Date(year, month, d));
    cells.push({ date: dateStr, day: d, inMonth: true, isToday: dateStr === todayStr });
  }
  let nd = 1;
  while (cells.length % 7 !== 0) {
    cells.push({ date: fmt(new Date(year, month + 1, nd)), day: nd, inMonth: false, isToday: false });
    nd++;
  }

  const weeks = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
};
