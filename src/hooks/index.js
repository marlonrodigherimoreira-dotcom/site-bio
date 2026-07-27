/**
 * hooks/index.js
 * ─────────────────────────────────────────────────────────────────────────────
 * All custom hooks. Each hook encapsulates one domain of logic so that
 * page components stay thin and declarative.
 */

import { useState, useEffect, useMemo } from "react";
import { calcDashboardStats, calcInsightsData, pendingIn, pendingOut, criticalMarginAlert, calcDayMovement, calcHiringAnalysis } from "../services/finance";
import { monthOf, monthsData, diffD } from "../utils/date";

// ─── UTILITY HOOKS ────────────────────────────────────────────────────────────

/**
 * Debounce any value.
 * @param {*}      value
 * @param {number} delay  milliseconds
 */
export function useDebounce(value, delay) {
  const [dv, setDv] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDv(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return dv;
}

// ─── DOMAIN HOOKS ─────────────────────────────────────────────────────────────

/**
 * All computed stats for the Home dashboard.
 * Single useMemo instead of scattered reduces across the component.
 */
export function useDashboardStats(transactions, bills, setup) {
  return useMemo(
    () => {
      const stats    = calcDashboardStats(transactions, setup);
      const alert    = criticalMarginAlert(transactions);
      const urgent   = bills
        .filter(b => !b.paid && diffD(b.dueDate) <= 3)
        .sort((a, b) => diffD(a.dueDate) - diffD(b.dueDate));
      const cashIn   = pendingIn(bills);
      const cashOut  = pendingOut(bills);
      return { ...stats, alert, urgentBills: urgent, pendIn: cashIn, pendOut: cashOut };
    },
    [transactions, bills, setup]
  );
}

/**
 * All computed data for the Insights tab.
 */
export function useInsightsData(transactions, setup) {
  const months6 = useMemo(() => monthsData(transactions, 6), [transactions]);
  return useMemo(
    () => {
      const data = calcInsightsData(transactions, setup, months6);
      // Enrich catSlices with pct for the donut chart
      const catTotal = Object.values(data.catMap).reduce((s, v) => s + v, 0) || 1;
      const catSlices = Object.entries(data.catMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([label, value]) => ({
          label,
          value,
          pct: ((value / catTotal) * 100).toFixed(0),
          color: { Serviço:"#059669",Produto:"#2563eb",Consultoria:"#7c3aed",Marketing:"#d97706",Software:"#06b6d4",Pessoal:"#dc2626",Outros:"#ababA4" }[label] || "#ababA4",
        }));
      return { ...data, catSlices, months6 };
    },
    [transactions, setup, months6]
  );
}

/**
 * Groups pending bills by urgency bucket.
 * Returns { overdue, today, week, later } + totals.
 */
export function useBillGroups(bills, filterType = "todos") {
  return useMemo(() => {
    let pending = bills.filter(b => !b.paid);
    if (filterType !== "todos") pending = pending.filter(b => b.type === filterType);
    pending = pending.sort((a, b) => diffD(a.dueDate) - diffD(b.dueDate));

    const overdue = [], today = [], week = [], later = [];
    pending.forEach(b => {
      const d = diffD(b.dueDate);
      if (d < 0)      overdue.push(b);
      else if (d === 0) today.push(b);
      else if (d <= 7)  week.push(b);
      else              later.push(b);
    });

    const groups = [
      { label:"Atrasadas",    items: overdue, color:"#dc2626" },
      { label:"Hoje",         items: today,   color:"#dc2626" },
      { label:"Esta semana",  items: week,    color:"#d97706" },
      { label:"Próximas",     items: later,   color:"#ababA4" },
    ].filter(g => g.items.length > 0);

    const totalPay = bills.filter(b => !b.paid && b.type === "payable").reduce((s, b) => s + b.amount, 0);
    const totalRec = bills.filter(b => !b.paid && b.type === "receivable").reduce((s, b) => s + b.amount, 0);

    return { groups, totalPay, totalRec, pending };
  }, [bills, filterType]);
}

/**
 * Financial summary (Entradas/Saídas/Investimentos) for a single day.
 * Used by the Calendário's day view — never lists transactions, only totals.
 */
export function useDayMovement(transactions, dateStr) {
  return useMemo(() => calcDayMovement(transactions, dateStr), [transactions, dateStr]);
}

/**
 * "Situação da empresa" live projection — recomputed on every render as the
 * user edits the Funcionário form. Never persisted (see TeamSheet: this
 * value never enters the object passed to onSave).
 */
export function useHiringAnalysis(transactions, monthlyCost) {
  return useMemo(() => calcHiringAnalysis(transactions, monthlyCost), [transactions, monthlyCost]);
}

/**
 * Unified search + filter for the single Catálogos list (Produtos +
 * Funcionários + Assinaturas). Purely a display-layer merge — `catalog`
 * and `team` stay in separate store slices/reducers exactly as before;
 * this hook never mutates either array, only combines them for rendering.
 */
export function useUnifiedCatalogFilter(catalog, team, filter, debouncedSearch) {
  return useMemo(() => {
    const productItems = catalog.map(c => ({ ...c, kind: "product" }));
    let list = [...productItems, ...team];

    if (filter !== "todos") list = list.filter(x => x.kind === filter);

    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase();
      list = list.filter(x => {
        if (x.kind === "product") {
          return x.name.toLowerCase().includes(q) ||
            (x.desc || "").toLowerCase().includes(q) ||
            (x.type || "").toLowerCase().includes(q);
        }
        if (x.kind === "employee") {
          return (x.name  || "").toLowerCase().includes(q) ||
            (x.role  || "").toLowerCase().includes(q) ||
            (x.phone || "").toLowerCase().includes(q);
        }
        // subscription
        return (x.name || "").toLowerCase().includes(q) || (x.cat || "").toLowerCase().includes(q);
      });
    }

    list.sort((a, b) => (b.id || 0) - (a.id || 0));
    return { filtered: list };
  }, [catalog, team, filter, debouncedSearch]);
}

/**
 * Filtering, sorting and grouping logic for the Entries (Lançamentos) tab.
 */
export function useEntriesFilter(transactions, filter, debouncedSearch, sort) {
  return useMemo(() => {
    let tx = [...transactions];
    if (filter === "mrr")        tx = tx.filter(t => t.rec);
    else if (filter === "caixa") tx = tx.filter(t => t.isCaixaMov);
    else if (filter !== "todos") tx = tx.filter(t => t.type === filter);
    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase();
      tx = tx.filter(t =>
        t.desc.toLowerCase().includes(q) ||
        (t.client || "").toLowerCase().includes(q) ||
        (t.cat || "").toLowerCase().includes(q)
      );
    }
    if (sort === "date")   tx.sort((a, b) => b.date.localeCompare(a.date));
    if (sort === "amount") tx.sort((a, b) => b.amount - a.amount);

    // Totals for the summary bar — exclude caixa movements unless viewing that filter
    const totTx  = filter === "caixa" ? tx : tx.filter(t => !t.isCaixaMov);
    const totInc = totTx.filter(t => t.type === "income").reduce((s, t) => s + t.amount, 0);
    const totExp = totTx.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0);

    // Group by date when sorting by date
    let grouped;
    if (sort === "date") {
      const g = {};
      tx.forEach(t => { g[t.date] = g[t.date] || []; g[t.date].push(t); });
      grouped = Object.entries(g)
        .sort((a, b) => b[0].localeCompare(a[0]))
        .map(([date, items]) => {
          const d    = diffD(date);
          const dt   = new Date(date + "T12:00:00");
          const label = d === 0 ? "Hoje" : d === -1 ? "Ontem" :
            dt.toLocaleDateString("pt-BR", { day:"2-digit", month:"short" });
          return { label, items };
        });
    } else {
      grouped = [{ label:"Todos", items: tx }];
    }

    return { filtered: tx, grouped, totInc, totExp };
  }, [transactions, filter, debouncedSearch, sort]);
}
