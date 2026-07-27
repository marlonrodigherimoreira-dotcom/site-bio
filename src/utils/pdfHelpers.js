/**
 * utils/pdfHelpers.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Pure helpers that transform raw app data into structured objects
 * consumed by pdfExport.js.
 *
 * CHANGELOG:
 *  - calcFinancialHealth: now returns `factors[]` with dynamic justification
 *  - buildExecutiveSummary: shorter — avoids repeating what health card shows
 *  - buildInsightsAndRecs: "Outros" alert added; recommendations are fact-based only
 *  - buildOperationalData: "Outros" warning flag attached to categories
 */

import { BRL, BRLk, pctOf } from "./currency";
import { monthOf, monthsData } from "./date";
import { calcInsightsData }   from "../services/finance";

// Exclude patrimonial Caixa/Fundos movements from all PDF calculations
const fin = (txs) => txs.filter(t => !t.isCaixaMov);

// ─── HEALTH CLASSIFICATION ────────────────────────────────────────────────────

/**
 * Returns health level + dynamic factor list explaining the classification.
 * Factors are generated from real data — no fixed text.
 */
export function calcFinancialHealth({ margin, profit, saldoPrev, urgentBillsCount, mrr, overdueCount }) {
  // Build factor list dynamically
  const factors = [];

  // Margin
  if (margin >= 35)
    factors.push({ ok: true,  text: `Margem de lucro de ${margin.toFixed(0)}%` });
  else if (margin >= 20)
    factors.push({ ok: true,  text: `Margem de lucro de ${margin.toFixed(0)}% (nível aceitável)` });
  else if (margin >= 8)
    factors.push({ ok: false, text: `Margem de lucro de ${margin.toFixed(0)}% (abaixo do recomendável)` });
  else
    factors.push({ ok: false, text: `Margem de lucro crítica: ${margin.toFixed(0)}%` });

  // Profit
  if (profit > 0)
    factors.push({ ok: true,  text: `Lucro líquido positivo (${BRL(profit)})` });
  else
    factors.push({ ok: false, text: `Resultado negativo no período (${BRL(profit)})` });

  // Cash flow
  if (saldoPrev >= 0)
    factors.push({ ok: true,  text: `Fluxo de caixa previsto positivo` });
  else
    factors.push({ ok: false, text: `Fluxo de caixa previsto negativo (${BRL(saldoPrev)})` });

  // MRR
  if (mrr > 0)
    factors.push({ ok: true,  text: `Receita recorrente presente (MRR: ${BRLk(mrr)})` });
  else
    factors.push({ ok: false, text: `Sem receita recorrente registrada` });

  // Overdue bills
  if (overdueCount === 0)
    factors.push({ ok: true,  text: `Nenhuma conta vencida em aberto` });
  else
    factors.push({ ok: false, text: `${overdueCount} conta${overdueCount > 1 ? "s" : ""} vencida${overdueCount > 1 ? "s" : ""} em aberto` });

  // Classify level
  const positives = factors.filter(f => f.ok).length;
  let level, color, bg, border;

  if (positives >= 5) {
    level = "Excelente"; color = "#059669"; bg = "#ecfdf5"; border = "#a7f3d0";
  } else if (positives >= 3 && profit > 0) {
    level = "Saudável";  color = "#059669"; bg = "#f0fdf4"; border = "#bbf7d0";
  } else if (positives >= 2) {
    level = "Atenção";   color = "#d97706"; bg = "#fffbeb"; border = "#fde68a";
  } else {
    level = "Crítico";   color = "#dc2626"; bg = "#fef2f2"; border = "#fecaca";
  }

  return { level, color, bg, border, factors };
}

// ─── EXECUTIVE SUMMARY ───────────────────────────────────────────────────────

/**
 * Short paragraph — does NOT repeat what the health card already shows.
 * Focuses on context: revenue source, trend, and single most important fact.
 */
export function buildExecutiveSummary({ inc, exp, profit, margin, saldoPrev, pInc, monthLabel }) {
  const profitLine = profit >= 0
    ? `O período encerrou com lucro líquido de ${BRL(profit)} sobre ${BRL(inc)} em receita.`
    : `O período encerrou com prejuízo de ${BRL(Math.abs(profit))} sobre ${BRL(inc)} em receita.`;

  let trendLine = "";
  if (pInc > 0) {
    const d = pctOf(inc, pInc);
    if (d > 10)       trendLine = ` A receita cresceu ${d.toFixed(0)}% em relação ao mês anterior.`;
    else if (d < -10) trendLine = ` A receita recuou ${Math.abs(d).toFixed(0)}% em relação ao mês anterior.`;
  }

  const fluxoLine = saldoPrev >= 0
    ? ` O fluxo previsto (${BRL(saldoPrev)}) permanece positivo.`
    : ` O fluxo previsto está negativo (${BRL(saldoPrev)}) — atenção às contas a pagar.`;

  return `${profitLine}${trendLine}${fluxoLine}`;
}

// ─── INSIGHTS & RECOMMENDATIONS ──────────────────────────────────────────────

/**
 * Generates data-driven observations and fact-based recommendations only.
 * "Outros" handling, anti-repetition with health card, conservative recs.
 */
export function buildInsightsAndRecs(transactions, setup, bills) {
  const months6 = monthsData(transactions, 6);
  const data    = calcInsightsData(transactions, setup, months6);
  const mTx     = fin(monthOf(transactions, 0));
  const pmTx    = fin(monthOf(transactions, 1));

  const inc  = mTx.filter(t => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const exp  = mTx.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  const pInc = pmTx.filter(t => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const pExp = pmTx.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  const margin = inc > 0 ? ((inc - exp) / inc) * 100 : 0;

  const insights        = [];
  const recommendations = [];

  // ── Revenue trend ──────────────────────────────────────────────────────────
  if (pInc > 0) {
    const d = pctOf(inc, pInc);
    if (d > 10)
      insights.push(`📈 Receita cresceu ${d.toFixed(0)}% em relação ao mês anterior.`);
    else if (d < -10)
      insights.push(`📉 Receita caiu ${Math.abs(d).toFixed(0)}% em relação ao mês anterior.`);
    else
      insights.push(`➡ Receita estável em relação ao mês anterior (${d >= 0 ? "+" : ""}${d.toFixed(0)}%).`);
  }

  // ── Expense trend ──────────────────────────────────────────────────────────
  if (pExp > 0 && exp > 0) {
    const dExp = pctOf(exp, pExp);
    const dInc = pInc > 0 ? pctOf(inc, pInc) : 0;
    if (dExp > 15 && dExp > dInc + 10)
      insights.push(`⚠ Gastos cresceram ${dExp.toFixed(0)}% enquanto a receita cresceu ${dInc.toFixed(0)}% no mesmo período.`);
  }

  // ── Top income category (skip "Outros" if dominant) ───────────────────────
  const incCatMap = {};
  mTx.filter(t => t.type === "income").forEach(t => {
    incCatMap[t.cat] = (incCatMap[t.cat] || 0) + t.amount;
  });
  const incTotal = Object.values(incCatMap).reduce((s, v) => s + v, 0) || 1;
  const outrosIncPct = ((incCatMap["Outros"] || 0) / incTotal) * 100;

  const topIncCat = Object.entries(incCatMap)
    .filter(([k]) => k !== "Outros")
    .sort((a, b) => b[1] - a[1])[0];

  if (topIncCat)
    insights.push(`💼 Principal fonte de receita: categoria <strong>${topIncCat[0]}</strong> (${BRL(topIncCat[1])}).`);

  // ── "Outros" alert for income ─────────────────────────────────────────────
  if (outrosIncPct > 40)
    insights.push(`🗂 A categoria "Outros" representa ${outrosIncPct.toFixed(0)}% das receitas registradas. Categorizar os lançamentos com mais detalhe pode melhorar a qualidade das análises futuras.`);

  // ── Top expense category ───────────────────────────────────────────────────
  const expTotal = Object.values(data.catMap || {}).reduce((s, v) => s + v, 0) || 1;
  const outrosExpPct = ((data.catMap?.["Outros"] || 0) / expTotal) * 100;

  const topExpCat = Object.entries(data.catMap || {})
    .filter(([k]) => k !== "Outros")
    .sort((a, b) => b[1] - a[1])[0];

  if (topExpCat)
    insights.push(`💸 Maior categoria de gastos: <strong>${topExpCat[0]}</strong> (${BRL(topExpCat[1])}).`);

  // ── "Outros" alert for expenses ───────────────────────────────────────────
  if (outrosExpPct > 40)
    insights.push(`🗂 A categoria "Outros" concentra ${outrosExpPct.toFixed(0)}% dos gastos. Categorizar as despesas com mais detalhe aumenta a precisão das análises.`);

  // ── Client concentration ───────────────────────────────────────────────────
  const cMap = {};
  fin(transactions).filter(t => t.type === "income" && t.client).forEach(t => {
    cMap[t.client] = (cMap[t.client] || 0) + t.amount;
  });
  const totalCI  = Object.values(cMap).reduce((s, v) => s + v, 0) || 1;
  const topClient = Object.entries(cMap).sort((a, b) => b[1] - a[1])[0];

  if (topClient && (topClient[1] / totalCI) > 0.5)
    insights.push(`⚠ O cliente <strong>${topClient[0]}</strong> concentra ${((topClient[1] / totalCI) * 100).toFixed(0)}% da receita total.`);
  else if (topClient)
    insights.push(`🏆 Maior cliente: <strong>${topClient[0]}</strong> (${BRLk(topClient[1])}, ${((topClient[1] / totalCI) * 100).toFixed(0)}% da receita).`);

  // ── Overdue bills ──────────────────────────────────────────────────────────
  const overdueCount = bills.filter(b => {
    if (b.paid) return false;
    return new Date(b.dueDate + "T00:00:00") < new Date();
  }).length;

  if (overdueCount === 0)
    insights.push(`✅ Nenhuma conta vencida encontrada no período.`);
  else
    insights.push(`🚨 ${overdueCount} conta${overdueCount > 1 ? "s" : ""} vencida${overdueCount > 1 ? "s" : ""} em aberto.`);

  // ── RECOMMENDATIONS — facts only, no business decisions ───────────────────

  // Revenue drop
  if (pInc > 0 && pctOf(inc, pInc) < -10)
    recommendations.push(`A receita apresentou queda de ${Math.abs(pctOf(inc, pInc)).toFixed(0)}% em relação ao mês anterior.`);

  // Client concentration
  if (topClient && (topClient[1] / totalCI) > 0.5)
    recommendations.push(`Existe concentração elevada de receita em um único cliente (${topClient[0]}: ${((topClient[1] / totalCI) * 100).toFixed(0)}%).`);

  // Overdue bills
  if (overdueCount > 0)
    recommendations.push(`Há ${overdueCount} conta${overdueCount > 1 ? "s" : ""} vencida${overdueCount > 1 ? "s" : ""} pendente${overdueCount > 1 ? "s" : ""} de regularização.`);

  // Gastos > Receita
  if (exp > inc)
    recommendations.push(`Os gastos do período (${BRL(exp)}) superaram a receita (${BRL(inc)}).`);

  // "Outros" dominates
  if (outrosExpPct > 40 || outrosIncPct > 40)
    recommendations.push(`Grande parte dos lançamentos está na categoria "Outros". Categorizar com mais detalhe melhora a qualidade das análises.`);

  // Negative cash flow
  const pendIn  = bills.filter(b => !b.paid && b.type === "receivable").reduce((s, b) => s + b.amount, 0);
  const pendOut = bills.filter(b => !b.paid && b.type === "payable").reduce((s, b) => s + b.amount, 0);
  const saldo   = (inc - exp) + pendIn - pendOut;
  if (saldo < 0)
    recommendations.push(`O fluxo de caixa previsto está negativo (${BRL(saldo)}). Acompanhar os vencimentos das próximas semanas.`);

  // Gastos crescendo mais rápido
  if (pExp > 0 && exp > 0) {
    const dExp = pctOf(exp, pExp);
    const dInc = pInc > 0 ? pctOf(inc, pInc) : 0;
    if (dExp > 15 && dExp > dInc + 10)
      recommendations.push(`Os gastos cresceram mais rápido que a receita neste período (gastos +${dExp.toFixed(0)}% vs receita +${dInc.toFixed(0)}%).`);
  }

  // Default if nothing critical found
  if (recommendations.length === 0)
    recommendations.push(`Nenhuma inconsistência relevante identificada nos dados do período.`);

  return {
    insights:        insights.slice(0, 6),
    recommendations: recommendations.slice(0, 4),
  };
}

// ─── OPERATIONAL DATA ────────────────────────────────────────────────────────

export function buildOperationalData(transactions, bills) {
  const mTx = monthOf(transactions, 0);

  // Income categories
  const incCatMap = {};
  mTx.filter(t => t.type === "income").forEach(t => {
    incCatMap[t.cat] = (incCatMap[t.cat] || 0) + t.amount;
  });
  const incTotal = Object.values(incCatMap).reduce((s, v) => s + v, 0) || 1;
  const incCategories = Object.entries(incCatMap)
    .sort((a, b) => b[1] - a[1]).slice(0, 5)
    .map(([label, value]) => ({
      label,
      value,
      pct: ((value / incTotal) * 100).toFixed(0),
      isOthers: label === "Outros",
    }));

  // Expense categories
  const expCatMap = {};
  mTx.filter(t => t.type === "expense").forEach(t => {
    expCatMap[t.cat] = (expCatMap[t.cat] || 0) + t.amount;
  });
  const expTotal = Object.values(expCatMap).reduce((s, v) => s + v, 0) || 1;
  const expCategories = Object.entries(expCatMap)
    .sort((a, b) => b[1] - a[1]).slice(0, 5)
    .map(([label, value]) => ({
      label,
      value,
      pct: ((value / expTotal) * 100).toFixed(0),
      isOthers: label === "Outros",
    }));

  // Client ranking
  const cMap = {};
  fin(transactions).filter(t => t.type === "income" && t.client).forEach(t => {
    cMap[t.client] = (cMap[t.client] || 0) + t.amount;
  });
  const clientTotal = Object.values(cMap).reduce((s, v) => s + v, 0) || 1;
  const clients = Object.entries(cMap)
    .sort((a, b) => b[1] - a[1]).slice(0, 5)
    .map(([name, value]) => ({ name, value, pct: ((value / clientTotal) * 100).toFixed(0) }));

  // Bills
  const nowDate = new Date();
  const pendingBills = bills.filter(b => !b.paid).map(b => ({
    ...b,
    overdue: new Date(b.dueDate + "T00:00:00") < nowDate,
  }));
  const overdueBills  = pendingBills.filter(b => b.overdue);
  const upcomingBills = pendingBills.filter(b => !b.overdue);

  return { incCategories, expCategories, clients, overdueBills, upcomingBills };
}

// ─── ANÁLISE ESTRATÉGICA ──────────────────────────────────────────────────────
// Central classification table — single source of truth for all
// financial-dependency thresholds. Add new ranges here without touching
// any other file.
const DEPENDENCIA_RANGES = [
  { max: 20, label: "Muito saudável", emoji: "🟢", color: "#059669" },
  { max: 40, label: "Saudável",       emoji: "🟢", color: "#059669" },
  { max: 60, label: "Atenção",        emoji: "🟡", color: "#d97706" },
  { max: 80, label: "Alto risco",     emoji: "🟠", color: "#ea580c" },
  { max: 100,label: "Risco crítico",  emoji: "🔴", color: "#dc2626" },
];

const DEPENDENCIA_INTERPRETACOES = {
  "Muito saudável": {
    texto:       "Sua carteira de clientes está bem diversificada. Nenhum cliente representa um risco de concentração relevante.",
    recomendacao: "Continue expandindo sua base de clientes e mantenha essa diversificação como meta estratégica.",
  },
  "Saudável": {
    texto:       "A concentração de receita está em um nível aceitável, mas há margem para melhorar a diversificação.",
    recomendacao: "Avalie oportunidades de ampliar sua carteira para reduzir a dependência do cliente principal.",
  },
  "Atenção": {
    texto:       "Um único cliente representa parte significativa do seu faturamento. Uma eventual perda desse contrato impactaria diretamente sua receita.",
    recomendacao: "Busque novos clientes até que nenhum represente mais de 40% da sua receita total.",
  },
  "Alto risco": {
    texto:       "Sua empresa apresenta dependência financeira elevada de um único cliente. Isso representa um risco operacional considerável.",
    recomendacao: "Priorize urgentemente a diversificação da carteira de clientes. Considere estratégias comerciais para conquistar novos contratos.",
  },
  "Risco crítico": {
    texto:       "Sua empresa depende fortemente de um único cliente. Caso ele deixe de contratar seus serviços, seu faturamento sofrerá uma redução severa e imediata.",
    recomendacao: "Diversificação é uma prioridade crítica. Nenhum cliente deveria representar mais de 40% da receita.",
  },
};

/**
 * calcDependenciaFinanceira(transactions)
 * ─────────────────────────────────────────────────────────────────────────────
 * Pure function. Groups income transactions by client, identifies the top
 * client, and returns the full dependency analysis object.
 *
 * Uses fin() to exclude isCaixaMov transactions, consistent with all other
 * financial calculations in pdfHelpers.
 *
 * @param {Array} transactions
 * @returns {{
 *   topClient:     string | null,
 *   topValue:      number,
 *   totalReceita:  number,
 *   pct:           number,
 *   range:         object,
 *   interpretacao: object,
 *   hasData:       boolean,
 * }}
 */
export function calcDependenciaFinanceira(transactions) {
  const incomes = fin(transactions).filter(t => t.type === "income" && t.client);

  // No client data → return empty state
  if (incomes.length === 0) {
    return {
      topClient:    null,
      topValue:     0,
      totalReceita: 0,
      pct:          0,
      range:        DEPENDENCIA_RANGES[0],
      interpretacao: DEPENDENCIA_INTERPRETACOES["Muito saudável"],
      hasData:      false,
    };
  }

  // Group by client
  const clientMap = {};
  incomes.forEach(t => {
    clientMap[t.client] = (clientMap[t.client] || 0) + t.amount;
  });

  const totalReceita = Object.values(clientMap).reduce((s, v) => s + v, 0);
  const [topClient, topValue] = Object.entries(clientMap)
    .sort((a, b) => b[1] - a[1])[0];

  const pct = totalReceita > 0 ? (topValue / totalReceita) * 100 : 0;

  // Find classification range (single source of truth)
  const range = DEPENDENCIA_RANGES.find(r => pct <= r.max) || DEPENDENCIA_RANGES[DEPENDENCIA_RANGES.length - 1];
  const interpretacao = DEPENDENCIA_INTERPRETACOES[range.label];

  return { topClient, topValue, totalReceita, pct, range, interpretacao, hasData: true };
}

/**
 * buildAnalisEstrategica(modules)
 * ─────────────────────────────────────────────────────────────────────────────
 * Receives an array of pre-rendered HTML module strings and wraps them in
 * the Análise Estratégica page container.
 *
 * Designed for scalability: future strategic modules (capacity, subscription
 * health, cash stability…) are just new entries in the modules array.
 *
 * @param {string[]} modules  — HTML strings for each strategic module
 * @returns {string}           — full page HTML
 */
export function buildAnalisEstrategica(modules) {
  return `
    <div class="page-heading">Análise Estratégica</div>
    <div class="page-sub">Diagnósticos automáticos baseados nos dados registrados no período.</div>
    ${modules.join("\n")}
  `;
}

/**
 * renderDependenciaFinanceira(data, BRL, BRLk)
 * ─────────────────────────────────────────────────────────────────────────────
 * Renders the Dependência Financeira module HTML from a pre-computed data
 * object. Kept separate from calcDependenciaFinanceira so tests can verify
 * calculation independently from rendering.
 *
 * @param {object} data    — result of calcDependenciaFinanceira()
 * @param {Function} BRL   — currency formatter
 * @param {Function} BRLk  — compact currency formatter
 * @returns {string}       — module HTML
 */
export function renderDependenciaFinanceira(data, BRL, BRLk) {
  if (!data.hasData) {
    return `
      <div class="estrategica-module">
        <div class="estrategica-module-title">Dependência Financeira</div>
        <div class="empty" style="padding:20px 0;text-align:center;color:#ababA4;font-size:12px">
          Nenhum lançamento de receita com cliente identificado no período.
        </div>
      </div>`;
  }

  const pctDisplay = data.pct.toFixed(1);
  const barFill    = Math.round(data.pct);
  const c          = data.range.color;

  return `
    <div class="estrategica-module">
      <div class="estrategica-module-title">Dependência Financeira</div>

      <!-- Main metric -->
      <div class="dep-header">
        <div>
          <div class="dep-pct" style="color:${c}">${pctDisplay}%</div>
          <div class="dep-badge" style="color:${c};border-color:${c}">
            ${data.range.emoji} ${data.range.label}
          </div>
        </div>
        <div class="dep-client-box">
          <div class="dep-client-label">Maior cliente</div>
          <div class="dep-client-name">${data.topClient}</div>
          <div class="dep-client-value">${BRL(data.topValue)}</div>
          <div class="dep-client-share">${pctDisplay}% do faturamento</div>
        </div>
      </div>

      <!-- Progress bar -->
      <div class="dep-bar-wrap">
        <div class="dep-bar-fill" style="width:${barFill}%;background:${c}"></div>
      </div>
      <div class="dep-bar-labels">
        <span>0%</span><span>50%</span><span>100%</span>
      </div>

      <!-- Interpretation -->
      <div class="dep-interpretation">${data.interpretacao.texto}</div>

      <!-- Recommendation -->
      <div class="dep-recommendation">
        <span class="dep-rec-icon">💡</span>
        <span>${data.interpretacao.recomendacao}</span>
      </div>
    </div>`;
}
