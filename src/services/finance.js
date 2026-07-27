/**
 * services/finance.js
 * ─────────────────────────────────────────────────────────────────────────────
 * All financial calculations live here.
 * Pure functions — receive data, return numbers/objects. No React, no side
 * effects. Easy to unit-test and future-proof for a real backend.
 */

import { monthOf, monthsData, now } from "../utils/date";
import { pctOf } from "../utils/currency";

// ─── PATRIMONIAL FILTER ────────────────────────────────────────────────────────
// Caixa/Fundos movements are tagged isCaixaMov:true.
// They appear in Lançamentos for history, but must NEVER enter any
// financial calculation (receita, gastos, lucro, ROI, MRR, dashboard, PDF).
const fin = (txs) => txs.filter(t => !t.isCaixaMov);

// ─── BASIC AGGREGATIONS ───────────────────────────────────────────────────────

export const sumIncome     = (txs) => fin(txs).filter(t => t.type === "income").reduce((s, t) => s + t.amount, 0);
export const sumExpense    = (txs) => fin(txs).filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0);
export const sumInvestment = (txs) => fin(txs).filter(t => t.type === "investment").reduce((s, t) => s + t.amount, 0);
export const sumProfit     = (txs) => sumIncome(txs) - sumExpense(txs);

// ─── MRR ──────────────────────────────────────────────────────────────────────
/**
 * Monthly Recurring Revenue.
 * Counts each unique (client+desc) recurring income transaction once.
 */
export const calcMRR = (txs) =>
  fin(txs)
    .filter(t => t.type === "income" && t.rec)
    .reduce(
      (acc, t) => {
        const k = `${t.client}|${t.desc}`;
        if (!acc.seen.has(k)) { acc.seen.add(k); acc.value += t.amount; }
        return acc;
      },
      { seen: new Set(), value: 0 }
    ).value;

// ─── MARGIN & ROI ─────────────────────────────────────────────────────────────

export const calcMargin = (income, profit) =>
  income > 0 ? (profit / income) * 100 : 0;

export const calcROI = (totalInvestment, profit) =>
  totalInvestment > 0 ? (profit / totalInvestment) * 100 : 0;

// ─── PAYBACK ─────────────────────────────────────────────────────────────────

export const calcPayback = (totalInvestment, avgMonthlyProfit) =>
  avgMonthlyProfit > 0 ? totalInvestment / avgMonthlyProfit : 0;

// ─── FORECAST ─────────────────────────────────────────────────────────────────


/**
 * Linear month-to-date projection of income for the current month.
 */
export const calcForecast = (currentIncome) => {
  const dom = now.getDate();
  const dim = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  return dom > 0 ? (currentIncome / dom) * dim : currentIncome;
};

/**
 * Project average profit forward N months.
 */
export const calcProjection = (avgMonthlyProfit, months) =>
  avgMonthlyProfit * months;

// ─── TICKET MÉDIO ────────────────────────────────────────────────────────────

export const calcAvgTicket = (totalRevenue, incomeCount) =>
  incomeCount > 0 ? totalRevenue / incomeCount : 0;

// ─── DASHBOARD STATS (memoised by caller) ────────────────────────────────────

/**
 * Returns all stats needed by the Home dashboard in one pass.
 * Caller should wrap in useMemo([transactions, setup]).
 */
export const calcDashboardStats = (transactions, setup) => {
  const mTx    = monthOf(transactions, 0);
  const inc    = sumIncome(mTx);
  const exp    = sumExpense(mTx);
  const profit = inc - exp;
  const margin = calcMargin(inc, profit);
  const mrr    = calcMRR(transactions);
  const forecast = calcForecast(inc);
  const totalInv = (setup.investment || 0) + sumInvestment(transactions);
  const roi    = calcROI(totalInv, profit);

  return { inc, exp, profit, margin, mrr, forecast, roi };
};

// ─── INSIGHTS DATA (memoised by caller) ──────────────────────────────────────

/**
 * Returns all stats needed by the Insights tab in one pass.
 */
export const calcInsightsData = (transactions, setup, months6) => {
  const mTx  = monthOf(transactions, 0);
  const pmTx = monthOf(transactions, 1);

  const inc   = sumIncome(mTx);
  const exp   = sumExpense(mTx);
  const pInc  = sumIncome(pmTx);
  const pExp  = sumExpense(pmTx);

  const totalInv    = (setup.investment || 0) + sumInvestment(transactions);
  const totalRev    = (setup.revenue    || 0) + sumIncome(transactions);
  const totalExp    = (setup.expenses   || 0) + sumExpense(transactions);
  const totalProfit = totalRev - totalExp;

  const roi       = calcROI(totalInv, totalProfit);
  const margin    = calcMargin(totalRev, totalProfit);
  const avgProfit = months6.reduce((s, m) => s + m.profit, 0) / 6;
  const payback   = calcPayback(totalInv, avgProfit);
  const mrr       = calcMRR(transactions);
  const finTxs    = fin(transactions);
  const avgTicket = calcAvgTicket(totalRev, finTxs.filter(t => t.type === "income").length);

  // Category breakdown (expenses)
  const catMap = {};
  finTxs.filter(t => t.type === "expense").forEach(t => {
    catMap[t.cat] = (catMap[t.cat] || 0) + t.amount;
  });

  // Client ranking
  const cMap = {};
  finTxs.filter(t => t.type === "income" && t.client).forEach(t => {
    cMap[t.client] = (cMap[t.client] || 0) + t.amount;
  });
  const totalCI = Object.values(cMap).reduce((s, v) => s + v, 0) || 1;

  const clientRanking = Object.entries(cMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, value]) => ({ name, value, pct: ((value / totalCI) * 100).toFixed(0) }));

  // Textual alerts
  const alerts = [];
  if (pInc > 0 && inc > 0) {
    const d = pctOf(inc, pInc);
    if (d > 5)  alerts.push({ icon:"📈", text:`Receita subiu ${d.toFixed(0)}% vs mês passado`,          color:"#059669" });
    if (d < -5) alerts.push({ icon:"📉", text:`Receita caiu ${Math.abs(d).toFixed(0)}% vs mês passado`, color:"#dc2626" });
  }
  const topCl = Object.entries(cMap).sort((a, b) => b[1] - a[1])[0];
  if (topCl && totalCI > 0 && topCl[1] / totalCI > 0.4)
    alerts.push({ icon:"⚠️", text:`${topCl[0]} representa ${((topCl[1]/totalCI)*100).toFixed(0)}% da receita total`, color:"#d97706" });
  const topCat = Object.entries(catMap).sort((a, b) => b[1] - a[1])[0];
  if (topCat)
    alerts.push({ icon:"💸", text:`Maior categoria de gasto: ${topCat[0]}`, color:"#6b6b66" });

  return {
    inc, exp, pInc, pExp, totalProfit, roi, margin,
    avgProfit, payback, mrr, avgTicket,
    catMap, clientRanking, alerts,
  };
};

// ─── BILLS AGGREGATIONS ──────────────────────────────────────────────────────

export const sumPending = (bills, type) =>
  bills.filter(b => !b.paid && b.type === type).reduce((s, b) => s + b.amount, 0);

export const pendingIn  = (bills) => sumPending(bills, "receivable");
export const pendingOut = (bills) => sumPending(bills, "payable");

// ─── CRITICAL ALERT ───────────────────────────────────────────────────────────

export const criticalMarginAlert = (transactions) => {
  const mTx  = monthOf(transactions, 0);
  const inc  = sumIncome(mTx);
  const exp  = sumExpense(mTx);
  const m    = inc > 0 ? ((inc - exp) / inc) * 100 : 0;
  if (m > 0 && m < 10)
    return { icon:"🚨", text:`Margem crítica em ${m.toFixed(0)}% — veja Insights`, color:"#dc2626" };
  return null;
};

// ─── DAY MOVEMENT (Calendário) ───────────────────────────────────────────────
/**
 * Financial summary for a single day — reuses the same sum helpers as the
 * dashboard, so caixa/fundos movements are excluded exactly like everywhere
 * else. Never creates or lists transactions — just aggregates existing ones.
 */
export const calcDayMovement = (transactions, dateStr) => {
  const dayTx = transactions.filter(t => t.date === dateStr);
  return {
    inc: sumIncome(dayTx),
    exp: sumExpense(dayTx),
    inv: sumInvestment(dayTx),
  };
};

// ─── HIRING ANALYSIS (Equipe) ─────────────────────────────────────────────────
/**
 * "Situação da empresa" — projects the current month's margin as if
 * `monthlyCost` (salário + benefícios/custos) were added to this month's
 * real expenses. Uses the exact same real transactions as the dashboard,
 * and the exact same 10% threshold already established by
 * criticalMarginAlert for "margem crítica" — no invented numbers.
 * Never persisted — recomputed live from current data every time.
 */
export const calcHiringAnalysis = (transactions, monthlyCost) => {
  const mTx       = monthOf(transactions, 0);
  const inc       = sumIncome(mTx);
  const exp       = sumExpense(mTx);
  const newExp    = exp + (monthlyCost || 0);
  const newProfit = inc - newExp;
  const newMargin = calcMargin(inc, newProfit);

  let status;
  if (newMargin < 10) status = "red";
  else if (newMargin < 20) status = "yellow";
  else status = "green";

  return { inc, exp, newExp, newProfit, newMargin, status };
};

// ─── MULTI-ITEM ENTRIES (Múltiplos produtos por lançamento) ──────────────────
/**
 * Sums a transaction's item list into its final amount. Works whether items
 * already carry a computed `total` (persisted shape) or only qty/unitPrice
 * as live-editable strings (EntrySheet while the user is still typing).
 * Pure — no side effects, nothing persisted here.
 */
export const calcItemsTotal = (items = []) =>
  items.reduce((s, it) => {
    const total = it.total != null ? parseFloat(it.total) : (parseFloat(it.qty) || 0) * (parseFloat(it.unitPrice) || 0);
    return s + (isNaN(total) ? 0 : total);
  }, 0);
