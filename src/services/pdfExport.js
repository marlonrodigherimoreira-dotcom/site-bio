/**
 * services/pdfExport.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Executive Financial Report — 3-page structure:
 *   Page 1 — Executive Summary (KPIs + health card with factors + short prose)
 *   Page 2 — Operational Analysis (clients, categories, bills)
 *   Page 3 — Insights & Recommendations (fact-based, auto-generated)
 *
 * CHANGELOG:
 *  - Health card now shows dynamic factor list (✓/✗) instead of one-liner
 *  - Executive summary prose is shorter — no repetition with health card
 *  - buildExecutiveSummary receives pInc for trend line
 *  - rankRow marks "Outros" rows with a subtle note
 *  - Recommendations are fact-based only
 *
 * Public API: exportPDF(transactions, bills, setup, onStart?, onEnd?)
 */

import { BRL, BRLk } from "../utils/currency";
import { monthLabel, monthsData, monthOf } from "../utils/date";
import { calcInsightsData } from "./finance";
import {
  calcFinancialHealth,
  buildExecutiveSummary,
  buildInsightsAndRecs,
  buildOperationalData,
  calcDependenciaFinanceira,
  buildAnalisEstrategica,
  renderDependenciaFinanceira,
} from "../utils/pdfHelpers";

// Exclude patrimonial Caixa/Fundos movements from all PDF calculations
const fin = (txs) => txs.filter(t => !t.isCaixaMov);

// ─── SHARED COLORS ────────────────────────────────────────────────────────────
const C = {
  green:  "#059669", greenBg: "#ecfdf5", greenBd: "#a7f3d0",
  red:    "#dc2626", redBg:   "#fef2f2", redBd:   "#fecaca",
  blue:   "#2563eb", blueBg:  "#eff6ff", blueBd:  "#bfdbfe",
  amber:  "#d97706", amberBg: "#fffbeb", amberBd: "#fde68a",
  text:   "#0f0f0e",
  sub:    "#6b6b66",
  faint:  "#ababA4",
  border: "#e8e8e5",
  bg:     "#f7f7f5",
  white:  "#ffffff",
};

// ─── DATE HELPER ──────────────────────────────────────────────────────────────
const todayStr = () => {
  const d  = new Date();
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${dd}/${mm}/${d.getFullYear()} às ${hh}:${mi}`;
};

// ─── HTML PRIMITIVES ─────────────────────────────────────────────────────────
const kpiBox = (label, value, color = C.text, sub = "") => `
  <div class="kpi-box">
    <div class="kpi-label">${label}</div>
    <div class="kpi-value" style="color:${color}">${value}</div>
    ${sub ? `<div class="kpi-sub">${sub}</div>` : ""}
  </div>`;

// rankRow: dim "Outros" rows visually so they don't dominate
const rankRow = (num, name, pct, val, barColor = C.green, isOthers = false) => `
  <div class="rank-row" ${isOthers ? 'style="opacity:0.6"' : ""}>
    <div class="rank-num">${num}</div>
    <div class="rank-name">${name}${isOthers ? ' <span style="font-size:9px;color:#ababA4">(sem cat.)</span>' : ""}</div>
    <div class="rank-bar-wrap">
      <div class="rank-bar-fill" style="width:${pct}%;background:${barColor}"></div>
    </div>
    <div class="rank-val" style="color:${barColor}">${val}</div>
    <div class="rank-pct">${pct}%</div>
  </div>`;

const row2 = (l, v, c = C.text) => `
  <div class="row2">
    <span class="row2-label">${l}</span>
    <span class="row2-value" style="color:${c}">${v}</span>
  </div>`;

const sectionTitle = (t, icon = "") => `
  <div class="section-title">${icon ? `<span>${icon}</span>` : ""}${t}</div>`;

const pageBreak = () => `<div class="page-break"></div>`;

const insightItem = (text) => `
  <div class="insight-item">${text}</div>`;

const recItem = (text, i) => `
  <div class="rec-item">
    <div class="rec-num">${i + 1}</div>
    <div class="rec-text">${text}</div>
  </div>`;

const billRow = (b, overdue) => {
  const due   = new Date(b.dueDate + "T00:00:00").toLocaleDateString("pt-BR");
  const color = b.type === "payable" ? C.red : C.green;
  const badge = overdue
    ? `<span class="badge-red">Vencida</span>`
    : `<span class="badge-sub">Pendente</span>`;
  return `
  <div class="row2">
    <span class="row2-label">${b.desc} <span style="color:${C.faint};font-size:10px">${due}</span> ${badge}</span>
    <span class="row2-value" style="color:${color}">${b.type === "payable" ? "-" : "+"}${BRL(b.amount)}</span>
  </div>`;
};

// ─── HEALTH CARD with dynamic factor list ────────────────────────────────────
const healthCard = (health) => {
  const factorLines = health.factors.map(f => `
    <div class="health-factor">
      <span class="health-factor-icon" style="color:${f.ok ? C.green : C.red}">${f.ok ? "✓" : "✗"}</span>
      <span style="color:${f.ok ? C.text : C.red}">${f.text}</span>
    </div>`).join("");

  return `
  <div class="health-card" style="background:${health.bg};border-color:${health.border}">
    <div class="health-left">
      <div class="health-label" style="color:${health.color}">Saúde Financeira</div>
      <div class="health-badge" style="color:${health.color}">${health.level}</div>
    </div>
    <div class="health-divider" style="background:${health.border}"></div>
    <div class="health-right">
      <div class="health-factors-title" style="color:${health.color}">Classificação baseada em:</div>
      ${factorLines}
    </div>
  </div>`;
};

// ─── CSS ──────────────────────────────────────────────────────────────────────
const buildCSS = () => `
  @import url('https://fonts.googleapis.com/css2?family=Rubik+Spray+Paint&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Inter', sans-serif;
    color: ${C.text};
    background: ${C.white};
    font-size: 12px;
    line-height: 1.55;
    padding: 48px 56px;
    max-width: 760px;
    margin: 0 auto;
  }

  /* ── Page break ── */
  .page-break { page-break-before: always; padding-top: 48px; }

  /* ── Document header ── */
  .doc-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 36px;
    padding-bottom: 20px;
    border-bottom: 2px solid ${C.text};
  }
  .logo { font-family: 'Rubik Spray Paint', cursive; font-size: 22px; letter-spacing: 0.01em; color: #E60023; }
  .logo span { display: none; }  /* brand is full word now */
  .doc-title { font-size: 12px; color: ${C.sub}; margin-top: 4px; }
  .header-meta { text-align: right; color: ${C.sub}; font-size: 11px; line-height: 1.9; }

  /* ── Page heading ── */
  .page-heading { font-size: 18px; font-weight: 700; letter-spacing: -0.03em; margin-bottom: 4px; }
  .page-sub     { font-size: 12px; color: ${C.sub}; margin-bottom: 24px; }

  /* ── Section title ── */
  .section-title {
    font-size: 10px; font-weight: 600; letter-spacing: 0.09em;
    text-transform: uppercase; color: ${C.faint};
    margin: 22px 0 10px; display: flex; align-items: center; gap: 5px;
  }

  /* ── KPI grid ── */
  .kpi-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 10px; }
  .kpi-box  { background: ${C.bg}; border-radius: 10px; padding: 13px 15px; border: 1px solid ${C.border}; }
  .kpi-label { font-size: 9px; font-weight: 600; letter-spacing: 0.09em; text-transform: uppercase; color: ${C.faint}; margin-bottom: 5px; }
  .kpi-value { font-family: 'DM Mono', 'Courier New', monospace; font-size: 18px; font-weight: 600; letter-spacing: -0.03em; }
  .kpi-sub   { font-size: 10px; color: ${C.faint}; margin-top: 3px; }

  /* ── Health card ── */
  .health-card {
    display: flex;
    align-items: flex-start;
    gap: 18px;
    padding: 18px 20px;
    border-radius: 14px;
    margin-bottom: 18px;
    border: 1px solid;
  }
  .health-left  { flex-shrink: 0; min-width: 100px; }
  .health-label { font-size: 9px; font-weight: 600; letter-spacing: 0.09em; text-transform: uppercase; margin-bottom: 5px; }
  .health-badge { font-size: 22px; font-weight: 700; letter-spacing: -0.03em; }
  .health-divider { width: 1px; align-self: stretch; flex-shrink: 0; }
  .health-right { flex: 1; }
  .health-factors-title { font-size: 10px; font-weight: 600; margin-bottom: 8px; opacity: 0.75; }
  .health-factor { display: flex; align-items: baseline; gap: 7px; margin-bottom: 5px; font-size: 11px; line-height: 1.5; }
  .health-factor-icon { font-size: 11px; font-weight: 700; flex-shrink: 0; width: 12px; }

  /* ── Summary prose ── */
  .summary-box {
    background: ${C.bg};
    border-radius: 12px;
    padding: 14px 18px;
    font-size: 12.5px;
    line-height: 1.75;
    color: ${C.sub};
    border: 1px solid ${C.border};
    margin-bottom: 8px;
  }

  /* ── Row 2-col ── */
  .row2 { display: flex; justify-content: space-between; align-items: baseline; padding: 7px 0; border-bottom: 1px solid ${C.border}; }
  .row2:last-child { border-bottom: none; }
  .row2-label { font-size: 12px; color: ${C.sub}; }
  .row2-value { font-family: 'DM Mono', 'Courier New', monospace; font-size: 12px; font-weight: 600; }

  /* ── Card ── */
  .card { background: ${C.bg}; border-radius: 12px; padding: 14px 16px; margin-bottom: 10px; border: 1px solid ${C.border}; }

  /* ── Two-column layout ── */
  .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }

  /* ── Rank rows ── */
  .rank-row { display: flex; align-items: center; gap: 9px; padding: 7px 0; border-bottom: 1px solid ${C.border}; }
  .rank-row:last-child { border-bottom: none; }
  .rank-num  { font-size: 10px; color: ${C.faint}; font-family: monospace; width: 14px; flex-shrink: 0; }
  .rank-name { flex: 1; font-size: 12px; font-weight: 500; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .rank-bar-wrap { width: 60px; background: ${C.border}; border-radius: 99px; height: 4px; overflow: hidden; flex-shrink: 0; }
  .rank-bar-fill { height: 100%; border-radius: 99px; }
  .rank-val  { font-family: 'DM Mono', 'Courier New', monospace; font-size: 11px; font-weight: 600; min-width: 52px; text-align: right; flex-shrink: 0; }
  .rank-pct  { font-size: 10px; color: ${C.faint}; min-width: 26px; text-align: right; flex-shrink: 0; }

  /* ── Bar chart ── */
  .bar-chart-wrap { display: flex; align-items: flex-end; gap: 5px; height: 72px; margin-bottom: 6px; }
  .bar-group { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: flex-end; gap: 1px; }
  .bar { width: 55%; border-radius: 3px 3px 0 0; }
  .bar-inc { background: ${C.green}; opacity: 0.85; }
  .bar-exp { background: ${C.red};   opacity: 0.7; }
  .bar-lbl { font-size: 8px; color: ${C.faint}; margin-top: 4px; }
  .chart-legend { display: flex; gap: 12px; margin-top: 4px; }
  .legend-dot { width: 7px; height: 7px; border-radius: 2px; display: inline-block; vertical-align: middle; margin-right: 4px; }

  /* ── Insights ── */
  .insight-item {
    font-size: 12px; line-height: 1.65;
    padding: 9px 13px; background: ${C.bg};
    border-radius: 8px; border: 1px solid ${C.border};
    border-left: 3px solid ${C.faint}; margin-bottom: 7px;
  }

  /* ── Recommendations ── */
  .rec-item {
    display: flex; align-items: flex-start; gap: 12px;
    padding: 11px 14px; background: ${C.white};
    border: 1px solid ${C.border}; border-radius: 10px; margin-bottom: 8px;
  }
  .rec-num {
    width: 22px; height: 22px; border-radius: 50%;
    background: ${C.text}; color: ${C.white};
    font-size: 11px; font-weight: 700;
    display: flex; align-items: center; justify-content: center; flex-shrink: 0;
  }
  .rec-text { font-size: 12px; line-height: 1.65; }

  /* ── Badges ── */
  .badge-red { font-size: 9px; font-weight: 600; color: ${C.red}; background: ${C.redBg}; border: 1px solid ${C.redBd}; border-radius: 99px; padding: 1px 6px; margin-left: 5px; }
  .badge-sub { font-size: 9px; font-weight: 600; color: ${C.faint}; background: ${C.bg}; border: 1px solid ${C.border}; border-radius: 99px; padding: 1px 6px; margin-left: 5px; }

  /* ── Análise Estratégica ── */
  .estrategica-module {
    background: #f7f7f5;
    border: 1px solid #e8e8e5;
    border-radius: 14px;
    padding: 18px 20px;
    margin-bottom: 16px;
  }
  .estrategica-module-title {
    font-size: 13px;
    font-weight: 700;
    letter-spacing: -0.01em;
    color: #0f0f0e;
    margin-bottom: 14px;
    padding-bottom: 10px;
    border-bottom: 1px solid #e8e8e5;
  }
  .dep-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 14px;
    gap: 16px;
  }
  .dep-pct {
    font-family: 'DM Mono', 'Courier New', monospace;
    font-size: 42px;
    font-weight: 700;
    letter-spacing: -0.04em;
    line-height: 1;
    margin-bottom: 8px;
  }
  .dep-badge {
    display: inline-block;
    font-size: 11px;
    font-weight: 600;
    border: 1.5px solid;
    border-radius: 99px;
    padding: 3px 10px;
  }
  .dep-client-box {
    text-align: right;
    flex-shrink: 0;
  }
  .dep-client-label {
    font-size: 9px;
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: #ababA4;
    margin-bottom: 4px;
  }
  .dep-client-name {
    font-size: 14px;
    font-weight: 700;
    color: #0f0f0e;
    margin-bottom: 2px;
  }
  .dep-client-value {
    font-family: 'DM Mono', 'Courier New', monospace;
    font-size: 13px;
    font-weight: 600;
    color: #059669;
  }
  .dep-client-share {
    font-size: 10px;
    color: #6b6b66;
    margin-top: 2px;
  }
  .dep-bar-wrap {
    width: 100%;
    height: 8px;
    background: #e8e8e5;
    border-radius: 99px;
    overflow: hidden;
    margin-bottom: 4px;
  }
  .dep-bar-fill {
    height: 100%;
    border-radius: 99px;
    transition: width 0.3s ease;
  }
  .dep-bar-labels {
    display: flex;
    justify-content: space-between;
    font-size: 9px;
    color: #ababA4;
    margin-bottom: 14px;
  }
  .dep-interpretation {
    font-size: 12px;
    line-height: 1.7;
    color: #6b6b66;
    margin-bottom: 12px;
    padding: 10px 14px;
    background: #ffffff;
    border-radius: 8px;
    border: 1px solid #e8e8e5;
  }
  .dep-recommendation {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    font-size: 11px;
    line-height: 1.65;
    color: #0f0f0e;
    background: #fffbeb;
    border: 1px solid #fde68a;
    border-radius: 8px;
    padding: 9px 12px;
  }
  .dep-rec-icon { font-size: 13px; flex-shrink: 0; margin-top: 1px; }

  /* ── Observações Inteligentes ── */
  .autopsia-item {
    display: flex; align-items: flex-start; gap: 11px;
    padding: 10px 14px; border-radius: 10px;
    margin-bottom: 8px; border: 1px solid;
  }
  .autopsia-icon { font-size: 14px; flex-shrink: 0; margin-top: 1px; }
  .autopsia-text { font-size: 12px; line-height: 1.65; }

  /* ── Evolution comparison ── */
  .evo-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
  .evo-box { background: ${C.bg}; border-radius: 10px; padding: 12px 14px; border: 1px solid ${C.border}; }
  .evo-label { font-size: 9px; font-weight: 600; letter-spacing: 0.09em; text-transform: uppercase; color: ${C.faint}; margin-bottom: 6px; }
  .evo-row { display: flex; align-items: baseline; gap: 8px; flex-wrap: wrap; }
  .evo-base { font-family: 'DM Mono', 'Courier New', monospace; font-size: 12px; color: ${C.sub}; }
  .evo-arrow { font-size: 11px; color: ${C.faint}; }
  .evo-current { font-family: 'DM Mono', 'Courier New', monospace; font-size: 12px; font-weight: 600; color: ${C.text}; }
  .evo-pct { font-family: 'DM Mono', 'Courier New', monospace; font-size: 15px; font-weight: 700; margin-top: 5px; }

  /* ── Footer ── */
  .doc-footer {
    margin-top: 44px; padding-top: 14px;
    border-top: 1px solid ${C.border};
    display: flex; justify-content: space-between;
    color: ${C.faint}; font-size: 10px;
  }

  /* ── Empty ── */
  .empty { font-size: 12px; color: ${C.faint}; text-align: center; padding: 16px 0; }

  @media print {
    body { padding: 28px 36px; }
    .page-break { padding-top: 0; }
  }
`;

// ─── BUILD HTML ───────────────────────────────────────────────────────────────
function buildHTML(transactions, bills, setup) {

  // ── Compute data ──────────────────────────────────────────────────────────
  const months6  = monthsData(transactions, 6);
  const insights = calcInsightsData(transactions, setup, months6);
  const mTx      = monthOf(transactions, 0);
  const pmTx     = (() => { const txs = transactions; let m = new Date().getMonth() - 1, y = new Date().getFullYear(); if (m < 0) { m += 12; y--; } return fin(txs).filter(t => { const d = new Date(t.date); return d.getMonth() === m && d.getFullYear() === y; }); })();

  const inc    = insights.inc;
  const exp    = insights.exp;
  const profit = inc - exp;
  const margin = inc > 0 ? (profit / inc) * 100 : 0;

  const pInc = pmTx.filter(t => t.type === "income").reduce((s, t) => s + t.amount, 0);

  const totalInv  = (setup.investment || 0) + fin(transactions).filter(t => t.type === "investment").reduce((s, t) => s + t.amount, 0);
  const roi       = totalInv > 0 ? (profit / totalInv) * 100 : 0;
  const pendIn    = bills.filter(b => !b.paid && b.type === "receivable").reduce((s, b) => s + b.amount, 0);
  const pendOut   = bills.filter(b => !b.paid && b.type === "payable").reduce((s, b) => s + b.amount, 0);
  const saldoPrev = profit + pendIn - pendOut;

  const overdueCount = bills.filter(b => {
    if (b.paid) return false;
    return new Date(b.dueDate + "T00:00:00") < new Date();
  }).length;

  const health  = calcFinancialHealth({ margin, profit, saldoPrev, urgentBillsCount: overdueCount, mrr: insights.mrr, overdueCount });
  const ml      = monthLabel(0);
  const summary = buildExecutiveSummary({ inc, exp, profit, margin, saldoPrev, pInc, monthLabel: ml });
  const { insights: insightLines, recommendations } = buildInsightsAndRecs(transactions, setup, bills);
  const opData  = buildOperationalData(transactions, bills);

  const maxBar      = Math.max(...months6.map(m => Math.max(m.inc, m.exp)), 1);
  const marginColor = margin >= 25 ? C.green : margin >= 10 ? C.amber : C.red;
  const roiColor    = roi >= 15    ? C.green : roi >= 5     ? C.amber : C.red;
  const profitColor = profit >= 0  ? C.green : C.red;

  // ── Evolution comparison: setup baseline vs current period ────────────────
  // Base = values informed during onboarding (already divided by months to get monthly)
  // Current = actual data from this month's transactions
  // pctEvolution returns null when base is 0/null/undefined (no reference)
  const pctEvolution = (base, current) => {
    const b = parseFloat(base);
    if (!b || isNaN(b)) return null;
    return ((current - b) / b) * 100;
  };
  const fmtPct = (pct) => {
    if (pct === null) return { text: "Sem referência", color: C.faint };
    const sign = pct >= 0 ? "+" : "";
    const color = pct > 0 ? C.green : pct < 0 ? C.red : C.faint;
    return { text: `${sign}${pct.toFixed(1)}%`, color };
  };

  // Metrics we can compare reliably:
  // Receita: base = setup.revenue (monthly avg), current = inc (this month)
  // Gastos:  base = setup.expenses (monthly avg), current = exp (this month)
  // Caixa/Fundos: setup stores current snapshot — we display them as-is,
  //               no "current" recalculation exists, so we skip pct for these
  const evoMetrics = [
    {
      label:   "Receita mensal",
      base:    setup.revenue,
      current: inc,
    },
    {
      label:   "Gastos mensais",
      base:    setup.expenses,
      current: exp,
    },
  ].map(m => {
    const pct  = pctEvolution(m.base, m.current);
    const fmt  = fmtPct(pct);
    return { ...m, pct, fmtPct: fmt };
  });

  // ── AUTÓPSIA FINANCEIRA ───────────────────────────────────────────────────
  // Pure rule-based analysis. Only generates observations that make sense
  // given the actual data. No AI, no score, no invented numbers.
  const autopsia = (() => {
    const obs     = [];  // general observations
    const pos     = [];  // positive highlights
    const atencao = [];  // points of attention

    const baseRev  = parseFloat(setup.revenue)   || 0;
    const baseExp  = parseFloat(setup.expenses)  || 0;
    const caixaVal = parseFloat(setup.caixa)     || 0;
    const mrr      = insights.mrr                || 0;

    // ── Revenue vs baseline ──────────────────────────────────────────────────
    if (baseRev > 0) {
      const diffRev = ((inc - baseRev) / baseRev) * 100;
      if (diffRev >= 10)
        obs.push(`📈 Receita atual (${BRL(inc)}) está <strong>${diffRev.toFixed(0)}% acima</strong> da referência inicial (${BRL(baseRev)}).`);
      else if (diffRev <= -10)
        obs.push(`📉 Receita atual (${BRL(inc)}) está <strong>${Math.abs(diffRev).toFixed(0)}% abaixo</strong> da referência inicial (${BRL(baseRev)}).`);
    }

    // ── Expenses vs baseline ─────────────────────────────────────────────────
    if (baseExp > 0) {
      const diffExp = ((exp - baseExp) / baseExp) * 100;
      if (diffExp >= 10)
        obs.push(`⚠ Gastos atuais (${BRL(exp)}) estão <strong>${diffExp.toFixed(0)}% acima</strong> da referência inicial (${BRL(baseExp)}).`);
      else if (diffExp <= -10)
        obs.push(`✅ Gastos atuais (${BRL(exp)}) estão <strong>${Math.abs(diffExp).toFixed(0)}% abaixo</strong> da referência inicial — controle de custos positivo.`);
    }

    // ── Revenue growing faster than expenses ─────────────────────────────────
    if (baseRev > 0 && baseExp > 0) {
      const dRev = ((inc - baseRev) / baseRev) * 100;
      const dExp = ((exp - baseExp) / baseExp) * 100;
      if (dRev > dExp + 5 && dRev > 0)
        pos.push(`A receita cresceu mais rápido que os gastos (+${dRev.toFixed(0)}% vs +${dExp.toFixed(0)}%), ampliando a margem do negócio.`);
      else if (dExp > dRev + 5 && dExp > 0)
        atencao.push(`Os gastos cresceram mais rápido que a receita (+${dExp.toFixed(0)}% vs +${dRev.toFixed(0)}%). Acompanhar essa tendência.`);
    }

    // ── Revenue trend (month over month) ─────────────────────────────────────
    if (pInc > 0) {
      const trend = ((inc - pInc) / pInc) * 100;
      if (trend >= 15)
        pos.push(`A receita cresceu ${trend.toFixed(0)}% em relação ao mês anterior — evolução positiva.`);
      else if (trend <= -15)
        atencao.push(`A receita recuou ${Math.abs(trend).toFixed(0)}% em relação ao mês anterior.`);
    }

    // ── Cash coverage ─────────────────────────────────────────────────────────
    if (caixaVal > 0 && exp > 0) {
      const months = caixaVal / exp;
      if (months >= 3)
        pos.push(`O caixa disponível (${BRL(caixaVal)}) cobre aproximadamente <strong>${months.toFixed(1)} meses</strong> de operação — boa proteção financeira.`);
      else if (months < 1)
        atencao.push(`O caixa disponível (${BRL(caixaVal)}) cobre menos de 1 mês de operação — reserva reduzida.`);
      else
        obs.push(`O caixa disponível (${BRL(caixaVal)}) cobre aproximadamente ${months.toFixed(1)} meses de operação.`);
    }

    // ── MRR share of revenue ──────────────────────────────────────────────────
    if (mrr > 0 && inc > 0) {
      const mrrShare = (mrr / inc) * 100;
      if (mrrShare >= 50)
        pos.push(`A receita recorrente (MRR) representa <strong>${mrrShare.toFixed(0)}% do faturamento</strong> — base sólida de previsibilidade.`);
      else if (mrrShare >= 20)
        obs.push(`A receita recorrente representa ${mrrShare.toFixed(0)}% do faturamento mensal.`);
      else
        atencao.push(`A receita recorrente representa apenas ${mrrShare.toFixed(0)}% do faturamento — a maioria das receitas não é previsível.`);
    } else if (mrr === 0 && inc > 0) {
      atencao.push("Nenhuma receita recorrente identificada. O faturamento depende inteiramente de novos negócios a cada mês.");
    }

    // ── Margin assessment ─────────────────────────────────────────────────────
    if (inc > 0) {
      if (margin >= 35)
        pos.push(`Margem de lucro de <strong>${margin.toFixed(0)}%</strong> — acima da média do setor de serviços.`);
      else if (margin < 10 && margin >= 0)
        atencao.push(`Margem de lucro de ${margin.toFixed(0)}% — abaixo do nível recomendável para sustentabilidade.`);
      else if (margin < 0)
        atencao.push(`Resultado negativo no período (prejuízo de ${BRL(Math.abs(profit))}). Revisão de receitas e custos é necessária.`);
    }

    // ── Ensure at least one item per section ──────────────────────────────────
    if (pos.length === 0 && profit > 0)
      pos.push(`O negócio gerou lucro líquido de ${BRL(profit)} no período.`);
    if (atencao.length === 0)
      atencao.push("Nenhuma inconsistência crítica identificada nos dados do período. Continue acompanhando os indicadores.");

    return {
      obs:     obs.slice(0, 4),
      pos:     pos.slice(0, 2),
      atencao: atencao.slice(0, 2),
    };
  })();

  const autopsiaItem = (text, bg, border, icon) => `
    <div class="autopsia-item" style="background:${bg};border-color:${border}">
      <div class="autopsia-icon">${icon}</div>
      <div class="autopsia-text">${text}</div>
    </div>`;

  // ── PAGE 4: AUTÓPSIA FINANCEIRA ───────────────────────────────────────────
  // ── ANÁLISE ESTRATÉGICA — Dependência Financeira ─────────────────────────
  const depData  = calcDependenciaFinanceira(transactions);
  const depHtml  = renderDependenciaFinanceira(depData, BRL, BRLk);
  const page5    = buildAnalisEstrategica([depHtml]);

    const page4 = `
    <div class="page-heading">Observações Inteligentes</div>
    <div class="page-sub">Diagnóstico automático baseado nos dados do período — sem recomendações, apenas fatos.</div>

    ${autopsia.obs.length > 0 ? `
      ${sectionTitle("Observações do Período")}
      ${autopsia.obs.map(t => autopsiaItem(t, C.bg, C.border, "📊")).join("")}
    ` : ""}

    ${sectionTitle("Destaque Positivo")}
    ${autopsia.pos.map(t => autopsiaItem(t, C.greenBg, C.greenBd, "✅")).join("")}

    ${sectionTitle("Ponto de Atenção")}
    ${autopsia.atencao.map(t => autopsiaItem(t, C.amberBg, C.amberBd, "⚠")).join("")}

    <div style="margin-top:16px;font-size:10px;color:${C.faint};line-height:1.6">
      As observações acima são geradas automaticamente a partir dos dados registrados no NOZIL.
      Representam um diagnóstico descritivo e não constituem aconselhamento financeiro.
    </div>`;
  const page1 = `
    <div class="page-heading">Resumo Executivo</div>
    <div class="page-sub">Visão geral do desempenho financeiro — ${ml} ${new Date().getFullYear()}</div>

    ${healthCard(health)}

    ${sectionTitle("Indicadores do Período")}
    <div class="kpi-grid">
      ${kpiBox("Receita total",  BRL(inc),    C.green,      "no mês")}
      ${kpiBox("Gastos totais",  BRL(exp),    C.red,        "no mês")}
      ${kpiBox("Lucro líquido",  BRL(profit), profitColor,  "resultado")}
    </div>
    <div class="kpi-grid">
      ${kpiBox("Margem",  `${margin.toFixed(1)}%`,  marginColor, "sobre receita")}
      ${kpiBox("ROI",     `${roi.toFixed(1)}%`,     roiColor,    "sobre capital investido")}
      ${kpiBox("MRR",     BRLk(insights.mrr),       C.blue,      "receita recorrente")}
    </div>

    ${sectionTitle("Fluxo de Caixa Previsto")}
    <div class="card">
      ${row2("A receber (contas abertas)", BRL(pendIn),    C.green)}
      ${row2("A pagar (contas abertas)",   BRL(pendOut),   C.red)}
      ${row2("Saldo previsto",             BRL(saldoPrev), saldoPrev >= 0 ? C.green : C.red)}
    </div>

    ${sectionTitle("Contexto do Período")}
    <div class="summary-box">${summary}</div>

    ${sectionTitle("Evolução — Últimos 6 Meses")}
    <div class="card">
      <div class="bar-chart-wrap">
        ${months6.map(m => {
          const iH = Math.max((m.inc / maxBar) * 64, m.inc > 0 ? 3 : 0).toFixed(0);
          const eH = Math.max((m.exp / maxBar) * 64, m.exp > 0 ? 3 : 0).toFixed(0);
          return `
          <div class="bar-group">
            <div class="bar bar-inc" style="height:${iH}px"></div>
            <div class="bar bar-exp" style="height:${eH}px"></div>
            <div class="bar-lbl">${m.label}</div>
          </div>`;
        }).join("")}
      </div>
      <div class="chart-legend">
        <span><span class="legend-dot" style="background:${C.green};opacity:0.85"></span>Receita</span>
        <span><span class="legend-dot" style="background:${C.red};opacity:0.7"></span>Gastos</span>
      </div>
      <div style="margin-top:10px">
        ${months6.map(m => row2(m.label, BRLk(m.profit), m.profit >= 0 ? C.green : C.red)).join("")}
      </div>
    </div>`;

  // ── PAGE 2: OPERATIONAL ANALYSIS ─────────────────────────────────────────
  const page2 = `
    <div class="page-heading">Análise Operacional</div>
    <div class="page-sub">Clientes, categorias e contas do período</div>

    <div class="two-col">
      <div>
        ${sectionTitle("Categorias de Receita")}
        <div class="card">
          ${opData.incCategories.length > 0
            ? opData.incCategories.map((c, i) => rankRow(i + 1, c.label, c.pct, BRLk(c.value), C.green, c.isOthers)).join("")
            : `<div class="empty">Sem dados</div>`}
        </div>
      </div>
      <div>
        ${sectionTitle("Categorias de Gasto")}
        <div class="card">
          ${opData.expCategories.length > 0
            ? opData.expCategories.map((c, i) => rankRow(i + 1, c.label, c.pct, BRLk(c.value), C.red, c.isOthers)).join("")
            : `<div class="empty">Sem dados</div>`}
        </div>
      </div>
    </div>

    ${sectionTitle("Melhores Clientes")}
    ${opData.clients.length > 0
      ? `<div class="card">${opData.clients.map((cl, i) => rankRow(i + 1, cl.name, cl.pct, BRLk(cl.value), C.green)).join("")}</div>`
      : `<div class="card"><div class="empty">Nenhum cliente registrado neste período.</div></div>`}

    ${opData.overdueBills.length > 0 ? `
      ${sectionTitle("Contas Vencidas", "🚨")}
      <div class="card">
        ${opData.overdueBills.map(b => billRow(b, true)).join("")}
      </div>` : ""}

    ${sectionTitle("Contas Pendentes")}
    ${opData.upcomingBills.length > 0
      ? `<div class="card">${opData.upcomingBills.slice(0, 8).map(b => billRow(b, false)).join("")}</div>`
      : `<div class="card"><div class="empty">✓ Nenhuma conta pendente.</div></div>`}`;

  // ── PAGE 3: INSIGHTS & RECOMMENDATIONS ───────────────────────────────────
  const page3 = `
    <div class="page-heading">Insights e Recomendações</div>
    <div class="page-sub">Observações automáticas baseadas nos dados do período</div>

    ${sectionTitle("Observações")}
    ${insightLines.map(line => insightItem(line)).join("")}

    ${sectionTitle("Pontos de Atenção")}
    ${recommendations.map((rec, i) => recItem(rec, i)).join("")}

    ${sectionTitle("Evolução Desde o Início")}
    <div class="evo-grid">
      ${evoMetrics.map(m => `
      <div class="evo-box">
        <div class="evo-label">${m.label}</div>
        <div class="evo-row">
          <span class="evo-base">${BRL(m.base || 0)}</span>
          <span class="evo-arrow">→</span>
          <span class="evo-current">${BRL(m.current)}</span>
        </div>
        <div class="evo-pct" style="color:${m.fmtPct.color}">${m.fmtPct.text}</div>
      </div>`).join("")}
    </div>
    ${(setup.caixa || 0) > 0 || (setup.fundos || 0) > 0 ? `
    ${sectionTitle("Caixa e Fundos")}
    <div class="card">
      ${(setup.caixa  || 0) > 0 ? row2("Caixa disponível",                BRL(setup.caixa),      C.green) : ""}
      ${(setup.fundos || 0) > 0 ? row2("Fundos guardados / investidos",    BRL(setup.fundos),     C.blue)  : ""}
      ${(setup.rendimento || 0) > 0 ? row2("Rendimento mensal informado",  `${setup.rendimento}%`, C.blue)  : ""}
    </div>` : ""}
    <div style="margin-top:12px;font-size:10px;color:${C.faint};line-height:1.6">
      Este relatório apresenta um diagnóstico baseado nos dados registrados no sistema.
      Não constitui aconselhamento financeiro ou empresarial.
    </div>`;

  // ── FULL DOCUMENT ─────────────────────────────────────────────────────────
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Relatório Executivo — NOZIL</title>
<style>${buildCSS()}</style>
</head>
<body>

<div class="doc-header">
  <div>
    <div class="logo">NOZIL</div>
    <div class="doc-title">Relatório Executivo Financeiro</div>
  </div>
  <div class="header-meta">
    Gerado em ${todayStr()}<br/>
    Referência: ${ml} · ${new Date().getFullYear()}<br/>
    Base: ${setup.months || 1} meses acumulados
  </div>
</div>

${page1}

${pageBreak()}
${page2}

${pageBreak()}
${page3}

${pageBreak()}
${page4}

${pageBreak()}
${page5}

<div class="doc-footer">
  <span>NOZIL — Painel Financeiro para Pequenos Negócios</span>
  <span>Gerado em ${todayStr()}</span>
</div>

</body>
</html>`;
}

// ─── PUBLIC API ───────────────────────────────────────────────────────────────
export async function exportPDF(transactions, bills, setup, onStart, onEnd) {
  onStart?.();

  const html = buildHTML(transactions, bills, setup);

  const printHTML = html.replace(
    "</body>",
    `<script>
      window.onload = function() {
        setTimeout(function() { window.print(); }, 450);
      };
    <\/script>
    </body>`
  );

  const blob = new Blob([printHTML], { type: "text/html;charset=utf-8" });
  const url  = URL.createObjectURL(blob);
  const win  = window.open(url, "_blank");

  if (!win) {
    const d  = new Date();
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const a  = document.createElement("a");
    a.href     = url;
    a.download = `relatorio-executivo-${dd}-${mm}-${d.getFullYear()}.html`;
    a.click();
  }

  setTimeout(() => URL.revokeObjectURL(url), 12000);
  onEnd?.();
}
