/**
 * services/importSpreadsheet.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Importação Inteligente de Lançamentos.
 *
 * Responsibilities:
 *   - readSpreadsheetFile(file)  → reads XLSX/XLS/CSV into raw rows (uses SheetJS)
 *   - processRows(rows, ...)     → detects columns, builds normalized rows,
 *                                   flags issues and possible duplicates
 *   - buildTransactionsFromRows  → converts accepted rows into transaction objects
 *     ready to be dispatched to the store
 *
 * Pure functions (no React) — easy to test in isolation.
 * The store / sheet UI calls these and handles state + UX.
 */

import * as XLSX from "xlsx";

// ─── HEADER KEYWORD DICTIONARIES (accent-insensitive) ─────────────────────────
const DATE_KEYS         = ["data", "date", "dt"];
const DESC_KEYS         = ["descricao", "descr", "historico", "titulo", "title", "item", "lancamento"];
const TYPE_KEYS         = ["tipo", "type"];
const CLIENT_KEYS       = ["cliente", "client", "fornecedor"];
const CAT_KEYS          = ["categoria", "category"];
const VALUE_KEYS        = ["valor", "amount", "total", "preco", "price"];
const INCOME_VALUE_KEYS = ["receita", "entrada", "credito", "income"];
const EXPENSE_VALUE_KEYS= ["despesa", "saida", "debito", "expense", "gasto"];

const INCOME_WORDS  = ["receita", "entrada", "credito", "income", "venda", "recebimento"];
const EXPENSE_WORDS = ["despesa", "saida", "debito", "expense", "gasto", "pagamento", "compra"];

// ─── HELPERS ────────────────────────────────────────────────────────────────
const pad = (n) => String(n).padStart(2, "0");

/** Strip accents + lowercase + trim — used for matching headers/categories/type text */
export function normalizeHeader(h) {
  return String(h ?? "")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().trim();
}

/** Detect which column index plays which role, based on header text.
 *  Each column is assigned to at most one role (first match wins). */
export function detectColumns(headers) {
  const norm = headers.map(normalizeHeader);
  const used = new Set();
  const find = (keys) => {
    for (let i = 0; i < norm.length; i++) {
      if (used.has(i)) continue;
      if (keys.some((k) => norm[i] === k || norm[i].includes(k))) { used.add(i); return i; }
    }
    return -1;
  };
  return {
    dateIdx:    find(DATE_KEYS),
    typeIdx:    find(TYPE_KEYS),
    clientIdx:  find(CLIENT_KEYS),
    catIdx:     find(CAT_KEYS),
    incomeIdx:  find(INCOME_VALUE_KEYS),
    expenseIdx: find(EXPENSE_VALUE_KEYS),
    valueIdx:   find(VALUE_KEYS),
    descIdx:    find(DESC_KEYS),
  };
}

/** Parse a monetary value in either BR (1.234,56) or US (1,234.56) notation,
 *  a raw number, or a currency-prefixed string ("R$ 89,00"). Returns null if unparseable. */
export function parseAmount(raw) {
  if (typeof raw === "number") return raw;
  if (raw == null) return null;
  let s = String(raw).trim();
  if (!s) return null;
  s = s.replace(/[^\d,.\-]/g, "");
  if (!s) return null;
  const hasComma = s.includes(","), hasDot = s.includes(".");
  if (hasComma && hasDot) {
    if (s.lastIndexOf(",") > s.lastIndexOf(".")) s = s.replace(/\./g, "").replace(",", ".");
    else s = s.replace(/,/g, "");
  } else if (hasComma) {
    s = s.replace(",", ".");
  }
  const n = parseFloat(s);
  return isNaN(n) ? null : n;
}

/** Parse a date cell (JS Date from SheetJS cellDates, ISO string, or BR dd/mm/yyyy). */
export function parseDateFlexible(raw) {
  if (raw instanceof Date && !isNaN(raw)) {
    return `${raw.getUTCFullYear()}-${pad(raw.getUTCMonth() + 1)}-${pad(raw.getUTCDate())}`;
  }
  if (typeof raw === "number") return null; // stray unformatted serial — treated as invalid
  const s = String(raw ?? "").trim();
  if (!s) return null;
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return `${m[1]}-${pad(m[2])}-${pad(m[3])}`;
  m = s.match(/^(\d{1,2})[\/.](\d{1,2})[\/.](\d{2,4})$/);
  if (m) {
    let [, d, mo, y] = m;
    if (y.length === 2) y = String(2000 + parseInt(y, 10));
    return `${y}-${pad(mo)}-${pad(d)}`;
  }
  const d2 = new Date(s);
  if (!isNaN(d2)) return `${d2.getFullYear()}-${pad(d2.getMonth() + 1)}-${pad(d2.getDate())}`;
  return null;
}

function resolveTypeFromText(t) {
  if (INCOME_WORDS.some((w) => t.includes(w))) return "income";
  if (EXPENSE_WORDS.some((w) => t.includes(w))) return "expense";
  return null;
}

/** Build one normalized row from a raw spreadsheet row + detected columns. */
function buildRow(r, idx, cols, knownCategories) {
  const get = (i) => (i >= 0 && i < r.length ? r[i] : "");
  const issues = [];

  const dateRaw = get(cols.dateIdx);
  const date = cols.dateIdx === -1 ? null : parseDateFlexible(dateRaw);
  if (cols.dateIdx === -1 || !date) issues.push("Data inválida ou ausente");

  let amount = null, type = null;
  if (cols.incomeIdx !== -1 || cols.expenseIdx !== -1) {
    const inc = parseAmount(get(cols.incomeIdx));
    const exp = parseAmount(get(cols.expenseIdx));
    if (inc != null && inc !== 0) { amount = Math.abs(inc); type = "income"; }
    else if (exp != null && exp !== 0) { amount = Math.abs(exp); type = "expense"; }
  } else if (cols.typeIdx !== -1) {
    type = resolveTypeFromText(normalizeHeader(get(cols.typeIdx)));
    const vRaw = cols.valueIdx !== -1 ? get(cols.valueIdx) : "";
    const v = parseAmount(vRaw);
    if (v != null) amount = Math.abs(v);
  } else if (cols.valueIdx !== -1) {
    const v = parseAmount(get(cols.valueIdx));
    if (v != null && v !== 0) { amount = Math.abs(v); type = v < 0 ? "expense" : "income"; }
  }

  if (amount == null || isNaN(amount)) issues.push("Valor inválido ou ausente");
  if (!type) issues.push("Não foi possível identificar Receita ou Despesa");

  const desc   = cols.descIdx   !== -1 ? String(get(cols.descIdx)).trim()   : "";
  const client = cols.clientIdx !== -1 ? String(get(cols.clientIdx)).trim() : "";

  let cat = "Outros";
  if (cols.catIdx !== -1) {
    const raw = String(get(cols.catIdx)).trim();
    const match = knownCategories.find((c) => normalizeHeader(c) === normalizeHeader(raw));
    if (match) cat = match; // never auto-creates a new category — falls back to "Outros"
  }

  return {
    _key:      `r${idx}`,
    rowIndex:  idx,
    date, amount, type,
    desc:      desc || "Lançamento importado",
    client, cat, issues,
    status:    issues.length ? "needs_review" : "ok",
    isDuplicate: false,
    duplicateDecision: null, // null | "import" | "ignore"
  };
}

const round2 = (n) => Math.round((n || 0) * 100) / 100;

function matchSig(a, b) {
  if (a.date !== b.date || a.amount !== b.amount || a.type !== b.type) return false;
  if (a.desc && b.desc) return a.desc === b.desc; // when both have a description, require it to match too
  return true;
}

/** Flags `isDuplicate` on rows that match an existing transaction OR an
 *  earlier "ok" row within the same import batch (date + value + type,
 *  refined by description when available on both sides). */
export function markDuplicates(parsedRows, existingTransactions) {
  const seen = [];
  const existingSigs = existingTransactions.map((t) => ({
    date: t.date, amount: round2(t.amount), type: t.type, desc: normalizeHeader(t.desc || ""),
  }));
  parsedRows.forEach((row) => {
    row.isDuplicate = false;
    if (row.status !== "ok") return;
    const sig = { date: row.date, amount: round2(row.amount), type: row.type, desc: normalizeHeader(row.desc) };
    const dup = existingSigs.some((e) => matchSig(e, sig)) || seen.some((s) => matchSig(s, sig));
    if (dup) row.isDuplicate = true;
    seen.push(sig);
  });
}

/** Reads raw AOA (array-of-arrays) from a File (.xlsx/.xls/.csv) via SheetJS.
 *  Only the first sheet is read — the flow never asks the user to pick a tab. */
export function readSpreadsheetFile(file) {
  return new Promise((resolve, reject) => {
    if (!file) { reject("Nenhum arquivo selecionado."); return; }
    const name = file.name.toLowerCase();
    const isCSV = name.endsWith(".csv");
    if (!isCSV && !name.endsWith(".xlsx") && !name.endsWith(".xls")) {
      reject("Formato não suportado. Envie um arquivo .xlsx, .xls ou .csv.");
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject("Erro ao ler o arquivo. Tente novamente.");
    reader.onload = (e) => {
      try {
        const workbook = XLSX.read(e.target.result, {
          type: isCSV ? "string" : "array",
          cellDates: true,
        });
        const sheetName = workbook.SheetNames[0];
        if (!sheetName) { reject("A planilha não contém nenhuma aba com dados."); return; }
        const ws = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: "" });
        resolve(rows);
      } catch {
        reject("Não foi possível ler este arquivo. Verifique se é um XLSX, XLS ou CSV válido.");
      }
    };
    if (isCSV) reader.readAsText(file, "utf-8");
    else reader.readAsArrayBuffer(file);
  });
}

/** Full pipeline: raw AOA rows → detected columns + normalized/flagged rows + duplicates. */
export function processRows(rawRows, existingTransactions = [], knownCategories = []) {
  const headerRowIdx = rawRows.findIndex((r) => r.filter((c) => String(c).trim() !== "").length >= 2);
  if (headerRowIdx === -1) return { rows: [], columns: null };

  const headers  = rawRows[headerRowIdx];
  const cols     = detectColumns(headers);
  const dataRows = rawRows.slice(headerRowIdx + 1).filter((r) => r.some((c) => String(c).trim() !== ""));

  const rows = dataRows.map((r, i) => buildRow(r, i, cols, knownCategories));
  markDuplicates(rows, existingTransactions);
  return { rows, columns: cols };
}

/** Converts accepted rows into transaction objects ready for the store.
 *  ids are based on a fixed base timestamp + row offset, guaranteeing
 *  uniqueness within a single import without extra dependencies. */
export function buildTransactionsFromRows(rows) {
  const base = Date.now();
  return rows.map((r, i) => ({
    id:     base + i,
    type:   r.type,
    desc:   r.desc,
    amount: r.amount,
    client: r.client || "",
    cat:    r.cat || "Outros",
    date:   r.date,
    rec:    false,
  }));
}
