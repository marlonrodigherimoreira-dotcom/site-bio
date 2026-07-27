/**
 * sheets/index.jsx
 * All bottom sheet modals. Each receives only what it needs from props
 * (no store coupling inside sheets — keeps them reusable).
 */

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { Sheet, Btn, Input, Sel, TypeToggle, Txt, Mon, Div, Lbl, MoneyInput, Tooltip, EmptyState, Press, SH, CostLinesEditor, ProductLinesEditor } from "../components";
import { CATS, T, F, WEEKDAYS_SHORT } from "../constants";
import { BRL, clamp } from "../utils/currency";
import { fmt, dAhd, now, buildMonthGrid, monthYearLabel, fullDateLabel } from "../utils/date";
import { storage } from "../services/storage";
import { useHiringAnalysis } from "../hooks";
import { readSpreadsheetFile, processRows, buildTransactionsFromRows, markDuplicates } from "../services/importSpreadsheet";
import { notesOnDate } from "../services/calendar";
import { calcDayMovement, calcItemsTotal } from "../services/finance";
import { initialCalcState, inputDigit, inputDecimal, inputOperator, inputPercent, calcEquals, clearAll, clearEntry, backspace } from "../services/calculatorLogic";
import { initialTokens, tokensAppendDigit, tokensAppendDecimal, tokensAppendOperator, tokensApplyPercent, tokensEquals, tokensClearAll, tokensClearEntry, tokensBackspace, tokensToDisplay } from "../services/calculatorDisplay";

// Normalise a category name: trim + title-case first letter, rest lowercase
// so "combustível", "Combustível", "COMBUSTÍVEL" all become "Combustível"
const normalise = (s) => {
  const t = s.trim();
  if (!t) return t;
  return t.charAt(0).toUpperCase() + t.slice(1).toLowerCase();
};

// ─── ENTRY SHEET ─────────────────────────────────────────────────────────────
export function EntrySheet({ open, onClose, onSave, defaultType = "income", transactions = [], catalog = [], team = [] }) {
  const empty = { type: defaultType, desc: "", amount: "", client: "", cat: "Serviço", date: fmt(now), rec: false };
  const [f, sF]                 = useState(empty);
  const [customCat, sCC]        = useState("");
  const [catErr, sCatErr]       = useState("");
  const [showCatalog, setShowCatalog] = useState(false);   // toggle catalog picker (produto principal)
  const [showTeam, setShowTeam]       = useState(false);   // toggle equipe picker
  const [customCats, setCustomCats]   = useState(() => storage.getCustomCats());
  const [qtyMain, setQtyMain]         = useState("1");     // Quantidade do produto principal (Receita)
  const [mainCatalogItemId, setMainCatalogItemId] = useState(null);
  const [additionalItems, setAdditionalItems]      = useState([]); // Produtos adicionais (opcional)

  useEffect(() => {
    if (open) {
      sF({ ...empty, type: defaultType });
      sCC("");
      sCatErr("");
      setShowCatalog(false);
      setShowTeam(false);
      setQtyMain("1");
      setMainCatalogItemId(null);
      setAdditionalItems([]);
    }
  }, [open, defaultType]);

  // Full category list: base CATS (without "Outros") + custom cats + "Outros" at end
  const allCats = useMemo(() => {
    const base = CATS.filter(c => c !== "Outros");
    const merged = [...base];
    customCats.forEach(c => { if (!merged.includes(c)) merged.push(c); });
    merged.push("Outros");
    return merged;
  }, [customCats]);

  const clients = useMemo(
    () => [...new Set(transactions.filter(t => t.client).map(t => t.client))],
    [transactions]
  );
  const recentDescs = useMemo(() => {
    const m = {};
    transactions.filter(t => t.type === f.type).forEach(t => { m[t.desc] = (m[t.desc] || 0) + 1; });
    return Object.keys(m).sort((a, b) => m[b] - m[a]).slice(0, 5);
  }, [transactions, f.type]);

  const validAdditional = useMemo(() => additionalItems
    .filter(it => it.name.trim() && parseFloat(it.qty) > 0 && parseFloat(it.unitPrice) >= 0)
    .map(it => ({
      id: it.id,
      catalogItemId: it.catalogItemId || null,
      name: it.name.trim(),
      qty: parseFloat(it.qty),
      unitPrice: parseFloat(it.unitPrice),
      total: parseFloat(it.qty) * parseFloat(it.unitPrice),
    })), [additionalItems]);

  // Produto principal: same Produto/Quantidade/Valor unitário/Total shape as
  // any additional item — it just lives in the entry's main fields instead
  // of the list below, since it's still part of the primary flow.
  const mainQty       = f.type === "income" ? (parseFloat(qtyMain) || 0) : 1;
  const mainUnitPrice = parseFloat(f.amount) || 0;
  const mainTotal      = mainQty * mainUnitPrice;
  const additionalTotal = useMemo(() => calcItemsTotal(validAdditional), [validAdditional]);
  const finalAmountPreview = f.type === "income" ? mainTotal + additionalTotal : parseFloat(f.amount) || 0;

  const save = useCallback(() => {
    const finalAmount = f.type === "income" ? finalAmountPreview : parseFloat(f.amount);
    if (!f.desc.trim() || !finalAmount) return;

    let finalCat = f.cat;

    if (f.cat === "Outros") {
      const norm = normalise(customCat);
      if (!norm) {
        sCatErr("Informe o nome da categoria personalizada.");
        return;
      }
      finalCat = norm;
      // Persist new custom category if not already known
      const updated = customCats.includes(norm) ? customCats : [...customCats, norm];
      setCustomCats(updated);
      storage.saveCustomCats(updated);
    }

    sCatErr("");
    const payload = { ...f, cat: finalCat, id: Date.now(), amount: finalAmount };

    // Full breakdown (produto principal + produtos adicionais) — only attached
    // when the optional section is actually used, so a simple entry stays
    // byte-identical to before. `amount` above remains the single source of
    // truth every other module already reads.
    if (f.type === "income" && validAdditional.length > 0) {
      const mainItem = { id: "main", catalogItemId: mainCatalogItemId, name: f.desc.trim(), qty: mainQty || 1, unitPrice: mainUnitPrice, total: mainTotal };
      payload.items = [mainItem, ...validAdditional];
    }

    onSave(payload);
    onClose();
  }, [f, finalAmountPreview, validAdditional, mainQty, mainUnitPrice, mainTotal, mainCatalogItemId, customCat, customCats, onSave, onClose]);

  const typeColor = f.type === "income" ? T.green : f.type === "investment" ? T.blue : T.text;
  const isOthers  = f.cat === "Outros";

  return (
    <Sheet open={open} onClose={onClose} title="Novo lançamento">
      <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>
        <TypeToggle value={f.type} onChange={v => sF({ ...f, type: v, cat: v === "income" ? "Serviço" : "Marketing" })}
          opts={[{ val: "income", label: "Receita" }, { val: "expense", label: "Gasto" }, { val: "investment", label: "Investimento" }]} />

        {/* Equipe picker — same mechanism as the catalog picker below, for expense entries */}
        {f.type === "expense" && team.length > 0 && (
          <div>
            <button onClick={() => setShowTeam(s => !s)}
              style={{ fontSize: 12, fontWeight: 600, color: T.blue, background: T.blueBg, border: `1px solid ${T.blueBd}`, borderRadius: 99, padding: "5px 12px", cursor: "pointer" }}>
              {showTeam ? "▲ Fechar equipe" : "◧ Selecionar da Equipe"}
            </button>
            {showTeam && (
              <div style={{ marginTop: 8, background: T.subtle, borderRadius: 12, border: `1px solid ${T.border}`, overflow: "hidden" }}>
                {team.map((m, i) => {
                  const cost = m.kind === "employee"
                    ? (parseFloat(m.salary) || 0) + (m.costLines || []).reduce((s, l) => s + (parseFloat(l.value) || 0), 0)
                    : (parseFloat(m.value) || 0);
                  return (
                    <button key={m.id} onClick={() => {
                      sF(prev => ({ ...prev, desc: m.name, amount: String(cost || ""), cat: m.kind === "employee" ? "Pessoal" : (m.cat || "Software") }));
                      setShowTeam(false);
                    }} style={{ width: "100%", textAlign: "left", padding: "10px 14px", background: "transparent", border: "none", borderBottom: i < team.length - 1 ? `1px solid ${T.borderLight}` : "none", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: 13, fontWeight: 500, color: T.text }}>{m.name} <span style={{ color: T.faint, fontWeight: 400 }}>{m.kind === "employee" ? "· Funcionário" : "· Assinatura"}</span></span>
                      {cost > 0 && <span style={{ fontSize: 12, color: T.green, fontFamily: "monospace", fontWeight: 600 }}>R$ {cost.toFixed(2).replace(".", ",")}</span>}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Catalog picker — produto principal, restaurado na posição original */}
        {f.type === "income" && catalog.length > 0 && (
          <div>
            <button onClick={() => setShowCatalog(s => !s)}
              style={{ fontSize: 12, fontWeight: 600, color: T.blue, background: T.blueBg, border: `1px solid ${T.blueBd}`, borderRadius: 99, padding: "5px 12px", cursor: "pointer" }}>
              {showCatalog ? "▲ Fechar catálogo" : "◧ Selecionar do Catálogo"}
            </button>
            {showCatalog && (
              <div style={{ marginTop: 8, background: T.subtle, borderRadius: 12, border: `1px solid ${T.border}`, overflow: "hidden" }}>
                {catalog.map((item, i) => (
                  <button key={item.id} onClick={() => {
                    sF(prev => ({ ...prev, desc: item.name, amount: String(item.finalPrice || ""), cat: item.type === "Produto" ? "Produto" : "Serviço" }));
                    setMainCatalogItemId(item.id);
                    setQtyMain("1");
                    setShowCatalog(false);
                  }} style={{ width: "100%", textAlign: "left", padding: "10px 14px", background: "transparent", border: "none", borderBottom: i < catalog.length - 1 ? `1px solid ${T.borderLight}` : "none", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 13, fontWeight: 500, color: T.text }}>{item.name}</span>
                    {item.finalPrice > 0 && <span style={{ fontSize: 12, color: T.green, fontFamily: "monospace", fontWeight: 600 }}>R$ {item.finalPrice.toFixed(2).replace(".", ",")}</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <div>
          <Input label="Descrição" value={f.desc} onChange={v => { sF({ ...f, desc: v }); setMainCatalogItemId(null); }} placeholder="Ex: Gestão de tráfego" list="desc-list" />
          <datalist id="desc-list">{recentDescs.map(d => <option key={d} value={d} />)}</datalist>
          {recentDescs.length > 0 && f.desc === "" && (
            <div style={{ display: "flex", gap: 5, marginTop: 6, flexWrap: "wrap" }}>
              {recentDescs.slice(0, 3).map(d => (
                <button key={d} onClick={() => sF({ ...f, desc: d })}
                  style={{ fontSize: 11, padding: "3px 9px", borderRadius: 99, background: T.subtle, border: `1px solid ${T.border}`, color: T.sub, cursor: "pointer" }}>
                  {d}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Valor — sempre presente, exatamente como sempre esteve. Quantidade é a única
            adição, para que o produto principal tenha a mesma estrutura dos adicionais. */}
        {f.type === "income" ? (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <MoneyInput label="Valor" value={f.amount} onChange={v => sF({ ...f, amount: v })} />
            <Input label="Quantidade" value={qtyMain} onChange={setQtyMain} type="number" inputMode="numeric" />
          </div>
        ) : (
          <MoneyInput label="Valor" value={f.amount} onChange={v => sF({ ...f, amount: v })} />
        )}

        {f.type === "income" && (
          <div>
            <Input label="Cliente (opcional)" value={f.client} onChange={v => sF({ ...f, client: v })} list="cl-list" placeholder="Nome do cliente" />
            <datalist id="cl-list">{clients.map(c => <option key={c} value={c} />)}</datalist>
          </div>
        )}
        {/* Category selector — shows full list including custom cats */}
        <Sel label="Categoria" value={f.cat}
          onChange={v => { sF({ ...f, cat: v }); sCatErr(""); sCC(""); }}
          options={allCats} />

        {/* Custom category field — appears only when "Outros" is selected */}
        {isOthers && (
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <Input
              label="Nome da categoria *"
              value={customCat}
              onChange={v => { sCC(v); if (v.trim()) sCatErr(""); }}
              placeholder="Ex: Combustível, Fretes, Eventos…"
              autoFocus
            />
            {catErr && (
              <Txt sz={12} c={T.red} sx={{ display: "block" }}>{catErr}</Txt>
            )}
            <Txt sz={11} c={T.faint} sx={{ display: "block" }}>
              Será salva como categoria reutilizável.
            </Txt>
          </div>
        )}

        <Input label="Data" value={f.date} onChange={v => sF({ ...f, date: v })} type="date" />

        {/* Produtos adicionais (opcional) — logo acima de Recorrente, nunca substitui o produto principal */}
        {f.type === "income" && (
          <ProductLinesEditor items={additionalItems} onChange={setAdditionalItems} catalog={catalog} />
        )}

        <label style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14, cursor: "pointer", padding: "4px 0" }}>
          <input type="checkbox" checked={f.rec} onChange={e => sF({ ...f, rec: e.target.checked })}
            style={{ width: 16, height: 16, accentColor: T.green }} />
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}><Txt sz={14}>Recorrente (conta no MRR)</Txt><Tooltip text="Marque esta opção se este valor acontece todos os meses ou de forma recorrente. Assinaturas, mensalidades e contratos recorrentes entram no MRR." flip={true} /></div>
        </label>
        <Btn onClick={save} variant="primary" full color={typeColor}>Salvar lançamento</Btn>
      </div>
    </Sheet>
  );
}

// ─── BILL SHEET ──────────────────────────────────────────────────────────────
export function BillSheet({ open, onClose, onSave }) {
  const empty = { type: "payable", desc: "", amount: "", dueDate: dAhd(7), paid: false, juros: "", periodJuros: "mes" };
  const [f, sF] = useState(empty);
  useEffect(() => { if (open) sF(empty); }, [open]);

  const save = () => {
    if (!f.desc.trim() || !f.amount) return;
    onSave({
      ...f,
      id:     Date.now(),
      amount: parseFloat(f.amount),
      juros:  parseFloat(f.juros) || 0,
    });
    onClose();
  };

  return (
    <Sheet open={open} onClose={onClose} title="Nova conta">
      <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>
        <TypeToggle value={f.type} onChange={v => sF({ ...f, type: v })}
          opts={[{ val: "payable", label: "A pagar" }, { val: "receivable", label: "A receber" }]} />
        <Input label="Descrição"  value={f.desc}    onChange={v => sF({ ...f, desc: v })}    placeholder="Ex: Aluguel" />
        <MoneyInput label="Valor" value={f.amount}  onChange={v => sF({ ...f, amount: v })} />
        <Input label="Vencimento" value={f.dueDate} onChange={v => sF({ ...f, dueDate: v })} type="date" />

        {/* Juros — only relevant for payable bills */}
        {f.type === "payable" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ borderTop: `1px solid ${T.border}`, paddingTop: 12 }}>
              <Lbl sx={{ marginBottom: 10 }}>Juros por atraso (opcional)</Lbl>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <Input label="Taxa (%)" value={f.juros} onChange={v => sF({ ...f, juros: v })}
                  type="number" inputMode="decimal" placeholder="Ex: 2" hint="Ex: 2 para 2%" />
                <Sel label="Período" value={f.periodJuros} onChange={v => sF({ ...f, periodJuros: v })}
                  options={[{ value: "mes", label: "Ao mês" }, { value: "dia", label: "Ao dia" }]} />
              </div>
            </div>
          </div>
        )}

        <Btn onClick={save} variant="primary" full color={T.purple}>Salvar conta</Btn>
      </div>
    </Sheet>
  );
}

// ─── PRICING SHEET ───────────────────────────────────────────────────────────
export function PricingSheet({ open, onClose }) {
  const [cost, sCost]     = useState("");
  const [fixed, sFixed]   = useState("");
  const [margin, sMargin] = useState(35);
  const [hours, sHours]   = useState("");

  const totalCost = (parseFloat(cost) || 0) + (parseFloat(fixed) || 0);
  const price     = totalCost > 0 ? totalCost / (1 - margin / 100) : 0;
  const profit    = price - totalCost;
  const hourly    = hours && price > 0 ? price / parseFloat(hours) : 0;

  return (
    <Sheet open={open} onClose={onClose} title="Calculadora de preço">
      <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>
        <MoneyInput label="Custo direto"          value={cost}  onChange={sCost}  hint="Custo sem overhead" />
        <MoneyInput label="Rateio despesas fixas" value={fixed} onChange={sFixed} />
        <Input label="Horas estimadas (opcional)" value={hours} onChange={sHours} type="number" inputMode="numeric" placeholder="Ex: 8" />
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <label style={{ fontSize: 12, fontWeight: 500, color: T.sub }}>Margem desejada</label>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <input
                type="number"
                value={margin}
                onChange={e => {
                  const raw = e.target.value;
                  if (raw === "") { sMargin(""); return; }
                  const n = clamp(parseInt(raw, 10) || 0, 5, 85);
                  sMargin(n);
                }}
                onBlur={() => { if (margin === "") sMargin(5); }}
                style={{ width: 52, padding: "4px 6px", fontSize: 14, fontFamily: F.mono, fontWeight: 600, color: T.blue, background: T.subtle, border: `1px solid ${T.border}`, borderRadius: 8, textAlign: "right", outline: "none" }}
              />
              <Txt sz={14} w={600} c={T.blue}>%</Txt>
            </div>
          </div>
          <input type="range" min={5} max={85} value={margin === "" ? 5 : margin} onChange={e => sMargin(Number(e.target.value))} style={{ accentColor: T.blue }} />
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
            <Txt sz={10} c={T.faint}>5%</Txt><Txt sz={10} c={T.faint}>85%</Txt>
          </div>
        </div>
        {totalCost > 0 && (
          <div style={{ background: T.subtle, borderRadius: 14, padding: "14px 16px", border: `1px solid ${T.border}` }}>
            {[{ l: "Custo total", v: BRL(totalCost), c: T.sub }, { l: "Lucro unitário", v: BRL(profit), c: T.green }].map(it => (
              <div key={it.l} style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                <Txt sz={13} c={T.sub}>{it.l}</Txt><Mon v={it.v} sz={13} c={it.c} />
              </div>
            ))}
            {hourly > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                <Txt sz={13} c={T.sub}>Valor/hora</Txt><Mon v={BRL(hourly)} sz={13} c={T.purple} />
              </div>
            )}
            <Div />
            <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 10 }}>
              <Txt sz={14} w={600}>Preço sugerido</Txt>
              <Mon v={BRL(price)} sz={20} c={T.blue} />
            </div>
          </div>
        )}
      </div>
    </Sheet>
  );
}

// ─── SETTINGS SHEET ──────────────────────────────────────────────────────────
export function SettingsSheet({ open, onClose, setup, onUpdate, onReset, onExportBackup, onImportBackup }) {
  const [f, sF]           = useState(setup || {});
  const [showHelp,    sShowHelp]    = useState(false);
  const [showConfirm, sShowConfirm] = useState(false);

  useEffect(() => {
    if (open) { sF(setup || {}); sShowHelp(false); sShowConfirm(false); }
  }, [open, setup]);
  const save = () => {
    onUpdate({
      ...f,
      revenue:    parseFloat(f.revenue)    || 0,
      expenses:   parseFloat(f.expenses)   || 0,
      investment: parseFloat(f.investment) || 0,
      caixa:      parseFloat(f.caixa)      || 0,
      fundos:     parseFloat(f.fundos)     || 0,
      rendimento: parseFloat(f.rendimento) || 0,
    });
    onClose();
  };

  return (
    <Sheet open={open} onClose={onClose} title="Configurações">
      <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>
        <MoneyInput label="Receita base (R$)"      value={String(f.revenue    || "")} onChange={v => sF({ ...f, revenue:    v })} hint="Não apaga lançamentos existentes" />
        <MoneyInput label="Gastos base (R$)"       value={String(f.expenses   || "")} onChange={v => sF({ ...f, expenses:   v })} />
        <MoneyInput label="Investimento base (R$)" value={String(f.investment || "")} onChange={v => sF({ ...f, investment: v })} />

        {/* ── Caixa e Fundos ── */}
        <div style={{ borderTop: `1px solid ${T.border}`, paddingTop: 14, display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: T.faint, marginBottom: 2 }}>
            Caixa e Fundos Guardados
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 5 }}>
              <span style={{ fontSize: 12, fontWeight: 500, color: T.sub }}>Caixa disponível (R$)</span>
              <Tooltip text="Dinheiro disponível para uso imediato na empresa." />
            </div>
            <MoneyInput value={String(f.caixa || "")} onChange={v => sF({ ...f, caixa: v })} hint="Dinheiro disponível para uso imediato" />
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 5 }}>
              <span style={{ fontSize: 12, fontWeight: 500, color: T.sub }}>Fundos guardados (R$)</span>
              <Tooltip text="Valores reservados para emergência, oportunidades ou segurança financeira." />
            </div>
            <MoneyInput value={String(f.fundos || "")} onChange={v => sF({ ...f, fundos: v })} />
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 5 }}>
              <span style={{ fontSize: 12, fontWeight: 500, color: T.sub }}>Rendimento mensal (%)</span>
              <Tooltip text="Quanto seus fundos rendem por mês, em percentual." />
            </div>
            <Input value={String(f.rendimento || "")} onChange={v => sF({ ...f, rendimento: parseFloat(v) || 0 })} type="number" inputMode="decimal" hint="Ex: 0,8 para 0,8% ao mês" />
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 4 }}>
          <Btn onClick={save} variant="primary" full>Salvar configurações</Btn>
        </div>

        {/* ── Backup & Restauração ── */}
        <div style={{ borderTop: `1px solid ${T.border}`, paddingTop: 16, display: "flex", flexDirection: "column", gap: 8 }}>
          {/* Section header with ? help button */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
            <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: T.faint, flex: 1 }}>
              Backup e Restauração
            </div>
            {/* ? button — opens info modal explaining what Backup is */}
            <button onClick={() => sShowHelp(true)}
              style={{ width: 18, height: 18, borderRadius: "50%", background: T.subtle, border: `1px solid ${T.border}`, color: T.sub, fontSize: 10, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              ?
            </button>
          </div>

          {/* Help modal — What is Backup */}
          {showHelp && (
            <div style={{ background: T.blueBg, border: `1px solid ${T.blueBd}`, borderRadius: 14, padding: "14px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
              <Txt sz={14} w={600} c={T.blue} sx={{ display: "block" }}>Como funciona o Backup?</Txt>
              <Txt sz={13} c={T.sub} sx={{ display: "block", lineHeight: 1.65 }}>
                O Backup cria uma cópia de todos os dados do NOZIL em um arquivo. Você pode guardar esse arquivo e utilizá-lo para restaurar suas informações sempre que precisar.
              </Txt>
              <Btn onClick={() => sShowHelp(false)} variant="secondary" sm full>Entendi</Btn>
            </div>
          )}

          {/* Pre-export confirmation modal — explains no auto-sync */}
          {showConfirm && (
            <div style={{ background: T.amberBg, border: `1px solid ${T.amberBd}`, borderRadius: 14, padding: "14px 16px", display: "flex", flexDirection: "column", gap: 12 }}>
              <Txt sz={14} w={600} c={T.amber} sx={{ display: "block" }}>Antes de continuar</Txt>
              <Txt sz={12} c={T.sub} sx={{ display: "block", lineHeight: 1.65 }}>
                O NOZIL salva seus dados localmente neste dispositivo. As alterações realizadas em um dispositivo não são sincronizadas automaticamente com outro.<br /><br />
                Sempre que desejar utilizar os dados mais recentes em outro aparelho, gere um novo Backup e restaure-o no outro dispositivo.
              </Txt>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => sShowConfirm(false)}
                  style={{ flex: 1, padding: "9px", borderRadius: 10, background: T.subtle, border: `1px solid ${T.border}`, fontSize: 13, fontWeight: 600, color: T.sub, cursor: "pointer" }}>
                  Cancelar
                </button>
                <button onClick={() => { sShowConfirm(false); onExportBackup(); }}
                  style={{ flex: 1, padding: "9px", borderRadius: 10, background: T.blue, border: "none", fontSize: 13, fontWeight: 600, color: "#fff", cursor: "pointer" }}>
                  Continuar
                </button>
              </div>
            </div>
          )}

          {/* Backup buttons */}
          <Btn onClick={() => sShowConfirm(true)} variant="secondary" full icon="💾">Exportar Backup</Btn>
          <Btn onClick={onImportBackup} variant="secondary" full icon="📂">Restaurar Backup</Btn>
        </div>

        <div style={{ borderTop: `1px solid ${T.border}`, paddingTop: 12 }}>
          <Btn onClick={() => { if (window.confirm("Zerar todos os dados? Esta ação não pode ser desfeita.")) onReset(); }} variant="danger" full>⚠ Zerar todos os dados</Btn>
        </div>
      </div>
    </Sheet>
  );
}

// ─── NOTES DRAWER ────────────────────────────────────────────────────────────
export function NotesDrawer({ open, onClose, notes, setNotes }) {
  return (
    <Sheet open={open} onClose={onClose} title="📒 Notas rápidas">
      <textarea value={notes} onChange={e => setNotes(e.target.value)}
        placeholder={"• Próximos passos\n• Lembretes operacionais\n• Anotações rápidas"}
        style={{ width: "100%", minHeight: 200, padding: "12px", fontSize: 14, fontFamily: F.sans, lineHeight: 1.7, background: T.subtle, border: `1.5px solid ${T.border}`, borderRadius: 12, color: T.text, outline: "none", resize: "none" }} />
      <Txt sz={11} c={T.faint} sx={{ display: "block", marginTop: 6, textAlign: "right" }}>Salvo automaticamente</Txt>
    </Sheet>
  );
}

// ─── BACKUP SHEET ─────────────────────────────────────────────────────────────
/**
 * BackupSheet — shown when user clicks "Restaurar Backup".
 * Handles file selection, confirmation dialog, and error display.
 * Calls onRestore(file) which returns a Promise from the store action.
 */
export function BackupSheet({ open, onClose, onRestore }) {
  const [status,  setStatus]  = useState(null);  // null | "loading" | "success" | "error"
  const [errMsg,  setErrMsg]  = useState("");
  const fileRef = useRef(null);

  const reset = () => { setStatus(null); setErrMsg(""); };

  useEffect(() => { if (open) reset(); }, [open]);

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!window.confirm("Restaurar este backup substituirá os dados atuais. Deseja continuar?")) {
      e.target.value = "";
      return;
    }
    setStatus("loading");
    onRestore(file)
      .then(() => {
        setStatus("success");
        setTimeout(() => { onClose(); reset(); }, 1400);
      })
      .catch((msg) => {
        setStatus("error");
        setErrMsg(msg);
        e.target.value = "";
      });
  };

  return (
    <Sheet open={open} onClose={onClose} title="📂 Restaurar Backup">
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

        {/* Info card */}
        <div style={{ background: T.blueBg, border: `1px solid ${T.blueBd}`, borderRadius: 14, padding: "13px 15px" }}>
          <Txt sz={13} c={T.blue} sx={{ display: "block", lineHeight: 1.6 }}>
            Selecione um arquivo <strong>backup-financeiro-*.json</strong> exportado anteriormente pelo NOZIL.
            Todos os dados atuais serão substituídos.
          </Txt>
        </div>

        {/* Status feedback */}
        {status === "loading" && (
          <div style={{ textAlign: "center", padding: "16px 0" }}>
            <Txt sz={14} c={T.sub}>Validando e restaurando...</Txt>
          </div>
        )}
        {status === "success" && (
          <div style={{ background: T.greenBg, border: `1px solid ${T.greenBd}`, borderRadius: 12, padding: "13px 15px", textAlign: "center" }}>
            <Txt sz={14} c={T.green} sx={{ display: "block" }}>✓ Backup restaurado com sucesso!</Txt>
          </div>
        )}
        {status === "error" && (
          <div style={{ background: T.redBg, border: `1px solid ${T.redBd}`, borderRadius: 12, padding: "13px 15px" }}>
            <Txt sz={13} c={T.red} sx={{ display: "block" }}>⚠ {errMsg}</Txt>
          </div>
        )}

        {/* File picker — hidden input triggered by button */}
        <input
          ref={fileRef}
          type="file"
          accept=".json"
          onChange={handleFile}
          style={{ display: "none" }}
        />

        {status !== "loading" && status !== "success" && (
          <Btn
            onClick={() => { reset(); fileRef.current?.click(); }}
            variant="primary"
            full
            color={T.blue}
            icon="📂"
          >
            Escolher arquivo de backup
          </Btn>
        )}

        <Txt sz={11} c={T.faint} sx={{ display: "block", textAlign: "center" }}>
          Somente arquivos .json gerados pelo NOZIL são aceitos.
        </Txt>
      </div>
    </Sheet>
  );
}

// ─── CATALOG SHEET ───────────────────────────────────────────────────────────
/**
 * CatalogSheet — add or edit a catalog item (product/service).
 * Props:
 *   open, onClose, onSave(item), editItem (null = new item)
 */
export function CatalogSheet({ open, onClose, onSave, editItem = null }) {
  const emptyItem = {
    name: "", type: "Serviço", desc: "",
    costLines: [],          // [{ id, name, value, desc }]
    rateio: "",
    margin: "30",
  };
  const [form, setForm]   = useState(emptyItem);
  const [costName, setCN] = useState("");
  const [costVal,  setCV] = useState("");
  const [costDesc, setCD] = useState("");
  const [err, setErr]     = useState("");

  useEffect(() => {
    if (open) {
      setForm(editItem ? { ...editItem } : emptyItem);
      setCN(""); setCV(""); setCD(""); setErr("");
    }
  }, [open, editItem]);

  // A "pending" cost line is valid only when BOTH name and value are filled.
  // Per spec: name-only or value-only must NEVER be auto-saved.
  const hasPendingCostLine = costName.trim() !== "" && costVal !== "" && !isNaN(parseFloat(costVal));

  // Commit the pending name/value/desc fields into costLines, then clear the mini-form.
  // Safe to call multiple times — does nothing if there's nothing valid to commit.
  const commitPendingCostLine = () => {
    if (!hasPendingCostLine) return;
    setForm(f => ({ ...f, costLines: [...f.costLines, { id: Date.now(), name: costName.trim(), value: costVal, desc: costDesc }] }));
    setCN(""); setCV(""); setCD("");
  };

  // Derived calculations — include the still-uncommitted pending line so the
  // preview (Custo total / Lucro / Preço final) is correct in real time,
  // even before the user blurs the field or clicks "+ Adicionar".
  const effectiveCostLines = hasPendingCostLine
    ? [...form.costLines, { id: "__pending", name: costName.trim(), value: costVal, desc: costDesc }]
    : form.costLines;

  const costTotal  = effectiveCostLines.reduce((s, l) => s + (parseFloat(l.value) || 0), 0)
                   + (parseFloat(form.rateio) || 0);
  const margin     = parseFloat(form.margin) || 0;
  const finalPrice = margin < 100 ? costTotal / (1 - margin / 100) : 0;
  const profit     = finalPrice - costTotal;

  // Manual button — kept for users who prefer it. Same commit logic.
  const addCostLine = () => commitPendingCostLine();
  const removeCostLine = (id) => setForm(f => ({ ...f, costLines: f.costLines.filter(l => l.id !== id) }));

  const save = () => {
    if (!form.name.trim()) { setErr("Informe o nome do item."); return; }

    // Auto-commit any valid pending cost line before saving, so the user
    // never loses a filled-in item just because they forgot to click "+ Adicionar".
    const finalCostLines = hasPendingCostLine
      ? [...form.costLines, { id: Date.now(), name: costName.trim(), value: costVal, desc: costDesc }]
      : form.costLines;

    onSave({ ...form, costLines: finalCostLines, id: editItem?.id || Date.now(), finalPrice: Math.round(finalPrice * 100) / 100 });
    onClose();
  };

  return (
    <Sheet open={open} onClose={onClose} title={editItem ? "Editar item" : "Novo item do Catálogo"}>
      <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>

        {/* Name + Type */}
        <Input label="Nome *" value={form.name} onChange={v => { setForm(f => ({ ...f, name: v })); setErr(""); }} placeholder="Ex: Troca de Tela, Plano Mensal…" />
        {err && <Txt sz={12} c={T.red} sx={{ display: "block", marginTop: -8 }}>{err}</Txt>}
        <TypeToggle value={form.type} onChange={v => setForm(f => ({ ...f, type: v }))}
          opts={[{ val: "Serviço", label: "Serviço" }, { val: "Produto", label: "Produto" }]} />
        <Input label="Descrição (opcional)" value={form.desc} onChange={v => setForm(f => ({ ...f, desc: v }))} placeholder="Detalhes do item" />

        {/* Cost lines */}
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 8 }}><div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: T.faint }}>Itens de custo</div><Tooltip text="Todo gasto necessário para entregar este produto ou serviço. Exemplos: matéria-prima, embalagem, frete, mão de obra ou comissão." /></div>
          {form.costLines.map(l => (
            <div key={l.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 10px", background: T.subtle, borderRadius: 10, marginBottom: 6, border: `1px solid ${T.border}` }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <Txt sz={13} w={500} sx={{ display: "block" }}>{l.name}</Txt>
                {l.desc ? <Txt sz={11} c={T.faint} sx={{ display: "block" }}>{l.desc}</Txt> : null}
              </div>
              <Mon v={`R$${parseFloat(l.value || 0).toFixed(2)}`} sz={13} c={T.text} />
              <button onClick={() => removeCostLine(l.id)}
                style={{ width: 22, height: 22, borderRadius: 99, background: T.redBg, border: `1px solid ${T.redBd}`, fontSize: 11, color: T.red, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
            </div>
          ))}
          {/* Add cost line — onBlur auto-commits when name+value are both filled */}
          <div style={{ background: T.subtle, borderRadius: 12, padding: "10px 12px", border: `1px solid ${T.border}`, display: "flex", flexDirection: "column", gap: 7 }}>
            <Txt sz={11} c={T.sub} sx={{ display: "block" }}>Adicionar item de custo</Txt>
            <Input value={costName} onChange={setCN} onBlur={commitPendingCostLine} placeholder="Nome (ex: Peça original)" />
            <MoneyInput value={costVal} onChange={setCV} onBlur={commitPendingCostLine} />
            <Input value={costDesc} onChange={setCD} onBlur={commitPendingCostLine} placeholder="Descrição (opcional)" />
            <Btn onClick={addCostLine} variant="secondary" sm full>+ Adicionar</Btn>
          </div>
        </div>

        {/* Rateio */}
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 5 }}>
            <span style={{ fontSize: 12, fontWeight: 500, color: T.sub }}>Rateio de despesas fixas</span>
            <Tooltip text="Parte das despesas fixas que deve ser considerada neste item, como aluguel, energia, internet e ferramentas." />
          </div>
          <MoneyInput
            value={form.rateio}
            onChange={v => setForm(f => ({ ...f, rateio: v }))}
            hint="Aluguel, energia, internet, ferramentas etc. proporcionais a este item"
          />
        </div>

        {/* Margin slider */}
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <label style={{ fontSize: 12, fontWeight: 500, color: T.sub }}>Margem desejada</label>
              <Tooltip text="Percentual de lucro desejado sobre o custo total." />
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <input
                type="number"
                value={form.margin}
                onChange={e => {
                  const raw = e.target.value;
                  if (raw === "") { setForm(f => ({ ...f, margin: "" })); return; }
                  const n = clamp(parseInt(raw, 10) || 0, 0, 85);
                  setForm(f => ({ ...f, margin: String(n) }));
                }}
                onBlur={() => { if (form.margin === "") setForm(f => ({ ...f, margin: "0" })); }}
                style={{ width: 52, padding: "4px 6px", fontSize: 14, fontFamily: F.mono, fontWeight: 600, color: T.blue, background: T.subtle, border: `1px solid ${T.border}`, borderRadius: 8, textAlign: "right", outline: "none" }}
              />
              <Txt sz={14} w={600} c={T.blue}>%</Txt>
            </div>
          </div>
          <input type="range" min={0} max={85} value={form.margin === "" ? 0 : form.margin}
            onChange={e => setForm(f => ({ ...f, margin: e.target.value }))}
            style={{ accentColor: T.blue, width: "100%" }} />
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
            <Txt sz={10} c={T.faint}>0%</Txt><Txt sz={10} c={T.faint}>85%</Txt>
          </div>
        </div>

        {/* Result preview */}
        {costTotal > 0 && (
          <div style={{ background: T.subtle, borderRadius: 14, padding: "14px 16px", border: `1px solid ${T.border}` }}>
            {[
              { l: "Custo total", v: `R$ ${costTotal.toFixed(2)}`, c: T.sub },
              { l: "Lucro unitário", v: `R$ ${profit.toFixed(2)}`, c: T.green },
            ].map(r => (
              <div key={r.l} style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <Txt sz={13} c={T.sub}>{r.l}</Txt>
                <Mon v={r.v} sz={13} c={r.c} />
              </div>
            ))}
            <div style={{ height: 1, background: T.border, marginBottom: 10 }} />
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <Txt sz={14} w={600}>Preço final</Txt>
              <Mon v={`R$ ${finalPrice.toFixed(2)}`} sz={20} c={T.blue} />
            </div>
          </div>
        )}

        <Btn onClick={save} variant="primary" full color={T.blue}>
          {editItem ? "Salvar alterações" : "Salvar item"}
        </Btn>
      </div>
    </Sheet>
  );
}

// ─── CAIXA SHEET ──────────────────────────────────────────────────────────────
/**
 * CaixaSheet — quick cash management panel.
 * Allows adding/withdrawing from Caixa or Fundos, and updating Rendimento.
 * These movements:
 *   - update setup.caixa / setup.fundos / setup.rendimento (via patchSetup)
 *   - create a transaction with isCaixaMov:true for the Lançamentos history
 *   - do NOT affect receita, lucro, ROI, MRR, or any financial calculation
 */
export function CaixaSheet({ open, onClose, setup, onPatchSetup, onAddTransaction }) {
  const [mode,    setMode]    = useState(null);   // "addCaixa"|"remCaixa"|"addFundos"|"remFundos"|"rendimento"
  const [amount,  setAmount]  = useState("");
  const [desc,    setDesc]    = useState("");
  const [rend,    setRend]    = useState("");
  const [err,     setErr]     = useState("");

  useEffect(() => {
    if (open) {
      setMode(null); setAmount(""); setDesc(""); setErr("");
      setRend(String(setup?.rendimento || ""));
    }
  }, [open]);

  const now = new Date();
  const todayFmt = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-${String(now.getDate()).padStart(2,"0")}`;

  const applyMovement = () => {
    const val = parseFloat(amount);
    if (!val || isNaN(val) || val <= 0) { setErr("Informe um valor válido maior que zero."); return; }
    setErr("");

    const current = {
      addCaixa:  parseFloat(setup?.caixa   || 0),
      remCaixa:  parseFloat(setup?.caixa   || 0),
      addFundos: parseFloat(setup?.fundos  || 0),
      remFundos: parseFloat(setup?.fundos  || 0),
    };

    let patch = {};
    let txDesc = "";
    let txType = "income";  // stored as income/expense for display colour, but isCaixaMov=true distinguishes them

    if (mode === "addCaixa")  { patch = { caixa:  current.addCaixa  + val }; txDesc = desc || "Adição ao Caixa";        txType = "income";  }
    if (mode === "remCaixa")  { patch = { caixa:  Math.max(0, current.remCaixa  - val) }; txDesc = desc || "Retirada do Caixa";      txType = "expense"; }
    if (mode === "addFundos") { patch = { fundos: current.addFundos + val }; txDesc = desc || "Adição aos Fundos";       txType = "income";  }
    if (mode === "remFundos") { patch = { fundos: Math.max(0, current.remFundos - val) }; txDesc = desc || "Retirada dos Fundos";    txType = "expense"; }

    onPatchSetup(patch);
    onAddTransaction({
      id: Date.now(),
      type:       txType,
      desc:       txDesc,
      amount:     val,
      client:     "",
      cat:        mode.includes("Fundos") ? "Fundos" : "Caixa",
      date:       todayFmt,
      rec:        false,
      isCaixaMov: true,     // flag for "Mov. Caixa" filter
    });
    setMode(null); setAmount(""); setDesc("");
  };

  const saveRendimento = () => {
    const r = parseFloat(rend) || 0;
    onPatchSetup({ rendimento: r });
    onClose();
  };

  const caixaAtual  = parseFloat(setup?.caixa    || 0);
  const fundosAtual = parseFloat(setup?.fundos   || 0);

  const btnStyle = (active, c) => ({
    flex: 1, padding: "10px 8px", borderRadius: 12,
    border: `1.5px solid ${active ? c : T.border}`,
    background: active ? `${c}18` : T.subtle,
    color: active ? c : T.sub,
    fontSize: 13, fontWeight: active ? 600 : 400,
    cursor: "pointer", transition: "all 0.13s",
  });

  return (
    <Sheet open={open} onClose={onClose} title="💰 Gestão de Caixa">
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

        {/* Current values */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {[
            { l: "Caixa disponível",  v: caixaAtual,  c: T.green },
            { l: "Fundos guardados",  v: fundosAtual, c: T.blue  },
          ].map(k => (
            <div key={k.l} style={{ background: T.subtle, borderRadius: 12, padding: "10px 13px", border: `1px solid ${T.border}` }}>
              <Lbl sx={{ marginBottom: 4, fontSize: 9 }}>{k.l}</Lbl>
              <Mon v={new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(k.v)} sz={14} c={k.c} />
            </div>
          ))}
        </div>

        {/* Caixa movements */}
        <div>
          <Lbl sx={{ marginBottom: 8 }}>Movimentação de Caixa</Lbl>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => { setMode("addCaixa"); setAmount(""); setDesc(""); setErr(""); }} style={btnStyle(mode === "addCaixa", T.green)}>+ Adicionar</button>
            <button onClick={() => { setMode("remCaixa"); setAmount(""); setDesc(""); setErr(""); }} style={btnStyle(mode === "remCaixa", T.red)}>− Retirar</button>
          </div>
        </div>

        {/* Fundos movements */}
        <div>
          <Lbl sx={{ marginBottom: 8 }}>Movimentação de Fundos</Lbl>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => { setMode("addFundos"); setAmount(""); setDesc(""); setErr(""); }} style={btnStyle(mode === "addFundos", T.blue)}>+ Adicionar</button>
            <button onClick={() => { setMode("remFundos"); setAmount(""); setDesc(""); setErr(""); }} style={btnStyle(mode === "remFundos", T.red)}>− Retirar</button>
          </div>
        </div>

        {/* Movement form */}
        {mode && mode !== "rendimento" && (
          <div style={{ background: T.subtle, borderRadius: 14, padding: "13px 14px", border: `1px solid ${T.border}`, display: "flex", flexDirection: "column", gap: 10 }}>
            <Txt sz={12} c={T.sub} sx={{ display: "block" }}>
              {mode === "addCaixa"  ? "Adicionar ao Caixa"  :
               mode === "remCaixa"  ? "Retirar do Caixa"   :
               mode === "addFundos" ? "Adicionar aos Fundos" : "Retirar dos Fundos"}
            </Txt>
            <MoneyInput value={amount} onChange={setAmount} />
            <Input value={desc} onChange={setDesc} placeholder="Descrição (opcional) — ex: Aporte dos sócios" />
            {err && <Txt sz={12} c={T.red} sx={{ display: "block" }}>{err}</Txt>}
            <Btn onClick={applyMovement} variant="primary" full
              color={mode.startsWith("add") ? (mode === "addCaixa" ? T.green : T.blue) : T.red}>
              Confirmar
            </Btn>
          </div>
        )}

        {/* Rendimento */}
        <div style={{ borderTop: `1px solid ${T.border}`, paddingTop: 14 }}>
          <Lbl sx={{ marginBottom: 8 }}>Rendimento Mensal dos Fundos (%)</Lbl>
          <Input value={rend} onChange={setRend} type="number" inputMode="decimal" placeholder="Ex: 0,8" hint="Em %. Ex: 0,8 para 0,8% ao mês" />
          <div style={{ marginTop: 10 }}>
            <Btn onClick={saveRendimento} variant="secondary" full sm>Atualizar rendimento</Btn>
          </div>
        </div>

      </div>
    </Sheet>
  );
}

// ─── IMPORT SHEET ─────────────────────────────────────────────────────────────
/**
 * ImportSheet — Importação Inteligente de Lançamentos.
 *
 * Steps: start → reading → review → importing → done | canceled
 *        (error can happen after "reading")
 *
 * The heavy lifting (parsing, column detection, validation, duplicate
 * detection) lives in services/importSpreadsheet.js. This component is
 * only responsible for the step machine + review/correction UX.
 */
export function ImportSheet({ open, onClose, transactions = [], addTransactionsBulk, onViewEntries }) {
  const [step,          setStep]          = useState("start"); // start|reading|review|importing|done|canceled|error
  const [fileName,      setFileName]      = useState("");
  const [errMsg,        setErrMsg]        = useState("");
  const [parsedRows,    setParsedRows]    = useState([]);
  const [editDrafts,    setEditDrafts]    = useState({});
  const [skipDupPref,   setSkipDupPref]   = useState(false);
  const [progress,      setProgress]      = useState(0);
  const [importedCount, setImportedCount] = useState(0);
  const [importTotal,   setImportTotal]   = useState(0);

  const fileRef   = useRef(null);
  const cancelRef = useRef(false);

  useEffect(() => {
    if (open) {
      setStep("start"); setFileName(""); setErrMsg("");
      setParsedRows([]); setEditDrafts({});
      setProgress(0); setImportedCount(0); setImportTotal(0);
      setSkipDupPref(storage.getImportPrefs().skipDuplicateWarning);
      cancelRef.current = false;
    }
  }, [open]);

  // ── Derived counts ──────────────────────────────────────────────────────
  const total           = parsedRows.length;
  const needsReviewRows  = useMemo(() => parsedRows.filter(r => r.status === "needs_review"), [parsedRows]);
  const unresolvedDup    = useMemo(() => parsedRows.filter(r => r.status === "ok" && r.isDuplicate && r.duplicateDecision === null), [parsedRows]);
  const willImportCount  = useMemo(() => parsedRows.filter(r => {
    if (r.status !== "ok") return false;
    if (r.isDuplicate && !skipDupPref && r.duplicateDecision === "ignore") return false;
    return true;
  }).length, [parsedRows, skipDupPref]);
  const canImport = needsReviewRows.length === 0 && (skipDupPref || unresolvedDup.length === 0) && willImportCount > 0;

  // ── File selection ──────────────────────────────────────────────────────
  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setErrMsg("");
    setStep("reading");
    try {
      const rawRows = await readSpreadsheetFile(file);
      await new Promise(res => setTimeout(res, 30)); // let "Lendo arquivo..." paint before the sync crunch
      const knownCategories = [...CATS, ...storage.getCustomCats()];
      const { rows } = processRows(rawRows, transactions, knownCategories);
      if (rows.length === 0) {
        setErrMsg("A planilha está vazia ou não foi possível encontrar nenhum lançamento nela.");
        setStep("error");
        return;
      }
      const initDrafts = {};
      rows.forEach(r => {
        if (r.status === "needs_review") {
          initDrafts[r._key] = {
            date:   r.date || fmt(now),
            amount: r.amount != null ? String(r.amount) : "",
            type:   r.type || "income",
            desc:   r.desc,
          };
        }
      });
      setParsedRows(rows);
      setEditDrafts(initDrafts);
      setStep("review");
    } catch (msg) {
      setErrMsg(typeof msg === "string" ? msg : "Não foi possível ler este arquivo.");
      setStep("error");
    } finally {
      e.target.value = "";
    }
  };

  // ── Correction actions ──────────────────────────────────────────────────
  const corrigirRow = (row) => {
    const draft  = editDrafts[row._key];
    const amtNum = parseFloat(String(draft.amount).replace(",", "."));
    if (!draft.date || !amtNum || isNaN(amtNum) || amtNum <= 0 || !draft.type) return;
    setParsedRows(prev => {
      const next = prev.map(r => r._key === row._key
        ? { ...r, date: draft.date, amount: amtNum, type: draft.type, desc: draft.desc.trim() || "Lançamento importado", issues: [], status: "ok" }
        : r);
      markDuplicates(next, transactions);
      return next;
    });
  };
  const ignorarRow = (row) => {
    setParsedRows(prev => prev.map(r => r._key === row._key ? { ...r, status: "ignored" } : r));
  };
  const resolveDup = (row, decision) => {
    setParsedRows(prev => prev.map(r => r._key === row._key ? { ...r, duplicateDecision: decision } : r));
  };
  const toggleSkipDup = (checked) => {
    setSkipDupPref(checked);
    storage.saveImportPrefs({ skipDuplicateWarning: checked });
  };

  // ── Import execution (batched, real progress, cancellable) ─────────────
  const goToImport = async () => {
    const finalRows = parsedRows.filter(r => {
      if (r.status !== "ok") return false;
      if (r.isDuplicate) {
        if (skipDupPref) return true;
        return r.duplicateDecision !== "ignore";
      }
      return true;
    });
    const txs = buildTransactionsFromRows(finalRows);
    cancelRef.current = false;
    setImportTotal(txs.length);
    setImportedCount(0);
    setProgress(0);
    setStep("importing");

    const BATCH = 40;
    let committed = 0;
    for (let i = 0; i < txs.length; i += BATCH) {
      if (cancelRef.current) break;
      const batch = txs.slice(i, i + BATCH);
      addTransactionsBulk(batch);
      committed += batch.length;
      setImportedCount(committed);
      setProgress(Math.round((committed / txs.length) * 100));
      await new Promise(res => setTimeout(res, 0)); // yield so the bar actually repaints
    }
    setStep(cancelRef.current ? "canceled" : "done");
  };

  const dateLabel = (d) => d ? d.split("-").reverse().join("/") : "—";

  return (
    <Sheet open={open} onClose={onClose} title="📥 Importar lançamentos">

      {/* ── START ── */}
      {step === "start" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ background: T.blueBg, border: `1px solid ${T.blueBd}`, borderRadius: 14, padding: "13px 15px" }}>
            <Txt sz={13} c={T.blue} sx={{ display: "block", lineHeight: 1.6 }}>
              Selecione uma planilha (.xlsx, .xls ou .csv) com seus lançamentos. O NOZIL lê o arquivo automaticamente, identifica data, valor, tipo e descrição, e mostra apenas o que precisar da sua revisão.
            </Txt>
          </div>
          <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleFile} style={{ display: "none" }} />
          <Btn onClick={() => fileRef.current?.click()} variant="primary" full color={T.blue} icon="📥">
            Escolher arquivo
          </Btn>
        </div>
      )}

      {/* ── READING ── */}
      {step === "reading" && (
        <div style={{ textAlign: "center", padding: "30px 0" }}>
          <Txt sz={14} c={T.sub}>Lendo {fileName}...</Txt>
        </div>
      )}

      {/* ── ERROR ── */}
      {step === "error" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ background: T.redBg, border: `1px solid ${T.redBd}`, borderRadius: 12, padding: "13px 15px" }}>
            <Txt sz={13} c={T.red} sx={{ display: "block" }}>⚠ {errMsg}</Txt>
          </div>
          <Btn onClick={() => setStep("start")} variant="secondary" full>Tentar outro arquivo</Btn>
        </div>
      )}

      {/* ── REVIEW ── */}
      {step === "review" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <Txt sz={13} w={600} sx={{ display: "block", marginBottom: 4 }}>Arquivo: {fileName}</Txt>
            <Txt sz={12} c={T.sub} sx={{ display: "block" }}>{total} lançamento{total === 1 ? "" : "s"} encontrado{total === 1 ? "" : "s"}.</Txt>
            <Txt sz={12} c={T.green} sx={{ display: "block" }}>{willImportCount} ser{willImportCount === 1 ? "á" : "ão"} importado{willImportCount === 1 ? "" : "s"}.</Txt>
            {needsReviewRows.length > 0 && (
              <Txt sz={12} c={T.amber} sx={{ display: "block" }}>{needsReviewRows.length} precisa{needsReviewRows.length === 1 ? "" : "m"} de revisão.</Txt>
            )}
          </div>

          {/* Problematic records — only these are shown, per spec */}
          {needsReviewRows.length > 0 && (
            <div>
              <Lbl sx={{ marginBottom: 8 }}>Registros que precisam de revisão</Lbl>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {needsReviewRows.map(row => {
                  const draft = editDrafts[row._key] || { date: row.date || fmt(now), amount: row.amount != null ? String(row.amount) : "", type: row.type || "income", desc: row.desc };
                  const amtNum = parseFloat(String(draft.amount).replace(",", "."));
                  const valid  = !!draft.date && !!amtNum && !isNaN(amtNum) && amtNum > 0 && !!draft.type;
                  const setDraft = (patch) => setEditDrafts(d => ({ ...d, [row._key]: { ...draft, ...patch } }));
                  return (
                    <div key={row._key} style={{ background: T.subtle, border: `1px solid ${T.border}`, borderRadius: 14, padding: "13px 14px", display: "flex", flexDirection: "column", gap: 10 }}>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                        {row.issues.map(is => (
                          <span key={is} style={{ fontSize: 10, fontWeight: 600, color: T.amber, background: T.amberBg, border: `1px solid ${T.amberBd}`, borderRadius: 99, padding: "2px 8px" }}>{is}</span>
                        ))}
                      </div>
                      <Txt sz={12} c={T.sub}>Linha original: {row.desc}{row.amount != null ? ` · ${BRL(row.amount)}` : ""}</Txt>
                      <TypeToggle value={draft.type} onChange={v => setDraft({ type: v })}
                        opts={[{ val: "income", label: "Receita" }, { val: "expense", label: "Despesa" }]} />
                      <Input label="Descrição" value={draft.desc} onChange={v => setDraft({ desc: v })} />
                      <MoneyInput label="Valor" value={draft.amount} onChange={v => setDraft({ amount: v })} />
                      <Input label="Data" value={draft.date} onChange={v => setDraft({ date: v })} type="date" />
                      <div style={{ display: "flex", gap: 8 }}>
                        <button onClick={() => ignorarRow(row)}
                          style={{ flex: 1, padding: "9px", borderRadius: 10, background: T.canvas, border: `1px solid ${T.border}`, fontSize: 13, fontWeight: 600, color: T.sub, cursor: "pointer" }}>
                          Ignorar
                        </button>
                        <button onClick={() => corrigirRow(row)} disabled={!valid}
                          style={{ flex: 1, padding: "9px", borderRadius: 10, background: valid ? T.blue : T.subtle, border: "none", fontSize: 13, fontWeight: 600, color: valid ? "#fff" : T.faint, cursor: valid ? "pointer" : "not-allowed" }}>
                          Corrigir
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Possible duplicates */}
          {!skipDupPref && unresolvedDup.length > 0 && (
            <div>
              <Lbl sx={{ marginBottom: 8 }}>Possíveis duplicados</Lbl>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {unresolvedDup.map(row => (
                  <div key={row._key} style={{ background: T.amberBg, border: `1px solid ${T.amberBd}`, borderRadius: 14, padding: "12px 14px", display: "flex", flexDirection: "column", gap: 8 }}>
                    <Txt sz={13} sx={{ display: "block" }}>{row.desc}</Txt>
                    <Txt sz={12} c={T.sub}>{dateLabel(row.date)} · {BRL(row.amount)} · {row.type === "income" ? "Receita" : "Despesa"}</Txt>
                    <Txt sz={11} c={T.amber} sx={{ display: "block" }}>Já existe um lançamento parecido.</Txt>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button onClick={() => resolveDup(row, "ignore")}
                        style={{ flex: 1, padding: "8px", borderRadius: 10, background: T.canvas, border: `1px solid ${T.border}`, fontSize: 12, fontWeight: 600, color: T.sub, cursor: "pointer" }}>
                        Ignorar
                      </button>
                      <button onClick={() => resolveDup(row, "import")}
                        style={{ flex: 1, padding: "8px", borderRadius: 10, background: T.amber, border: "none", fontSize: 12, fontWeight: 600, color: "#fff", cursor: "pointer" }}>
                        Importar mesmo assim
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: T.sub, marginTop: 10, cursor: "pointer" }}>
                <input type="checkbox" checked={skipDupPref} onChange={e => toggleSkipDup(e.target.checked)}
                  style={{ width: 15, height: 15, accentColor: T.blue }} />
                Não perguntar novamente sobre possíveis duplicados
              </label>
            </div>
          )}

          <Btn onClick={goToImport} disabled={!canImport} variant="primary" full color={T.blue}>
            {willImportCount > 0 ? `Importar (${willImportCount})` : "Importar"}
          </Btn>
          <Btn onClick={onClose} variant="ghost" full sm>Cancelar</Btn>
        </div>
      )}

      {/* ── IMPORTING (real progress) ── */}
      {step === "importing" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14, alignItems: "center", padding: "22px 0" }}>
          <Txt sz={14} w={600}>Importando...</Txt>
          <div style={{ width: "100%", height: 8, background: T.subtle, borderRadius: 99, overflow: "hidden", border: `1px solid ${T.border}` }}>
            <div style={{ width: `${progress}%`, height: "100%", background: T.blue, transition: "width 0.15s ease" }} />
          </div>
          <Mon v={`${progress}%`} sz={16} c={T.blue} />
          <Txt sz={12} c={T.faint}>{importedCount} de {importTotal} lançamentos</Txt>
          <button onClick={() => { cancelRef.current = true; }}
            style={{ fontSize: 13, fontWeight: 600, color: T.sub, background: "transparent", border: "none", cursor: "pointer", padding: "4px 0" }}>
            Cancelar importação
          </button>
        </div>
      )}

      {/* ── DONE ── */}
      {step === "done" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14, alignItems: "center", textAlign: "center", padding: "12px 0" }}>
          <div style={{ fontSize: 34 }}>✅</div>
          <Txt sz={16} w={700}>Importação concluída</Txt>
          <Txt sz={13} c={T.sub}>{importedCount} lançamento{importedCount === 1 ? "" : "s"} importado{importedCount === 1 ? "" : "s"}.</Txt>
          <Btn onClick={onViewEntries} variant="primary" full color={T.green}>Ver lançamentos</Btn>
        </div>
      )}

      {/* ── CANCELED ── */}
      {step === "canceled" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14, alignItems: "center", textAlign: "center", padding: "12px 0" }}>
          <Txt sz={16} w={700}>Importação cancelada</Txt>
          <Txt sz={13} c={T.sub}>
            {importedCount} lançamento{importedCount === 1 ? "" : "s"} {importedCount === 1 ? "foi" : "foram"} importado{importedCount === 1 ? "" : "s"} até o momento.
          </Txt>
          {importedCount > 0 && <Btn onClick={onViewEntries} variant="primary" full color={T.green}>Ver lançamentos</Btn>}
          <Btn onClick={onClose} variant="secondary" full sm>Fechar</Btn>
        </div>
      )}

    </Sheet>
  );
}

// ─── CALENDAR SHEET ───────────────────────────────────────────────────────────
/**
 * CalendarSheet — Calendário Inteligente.
 *
 * Views: "month" (monthly grid, like a native calendar app) → "day" (day
 * detail: notes + financial summary) → "noteForm" (create/edit a note).
 * Same single-Sheet, internal-step-machine pattern as ImportSheet — avoids
 * fighting the store's one-sheet-at-a-time architecture and needs no new
 * global sheet ids beyond SHEETS.CALENDAR.
 *
 * Day notes are diary-style entries, fully independent from "Notas rápidas"
 * (which stays a single free-text blob — see NotesDrawer).
 * The financial summary only aggregates existing transactions — it never
 * creates, edits, or lists individual lançamentos.
 */
export function CalendarSheet({ open, onClose, calendarNotes = [], transactions = [], addCalendarNote, updateCalendarNote, removeCalendarNote }) {
  const [view,         setView]         = useState("month"); // month|day|noteForm
  const [viewYear,     setViewYear]     = useState(now.getFullYear());
  const [viewMonth,    setViewMonth]    = useState(now.getMonth());
  const [selectedDate, setSelectedDate] = useState(null);
  const [editingNote,  setEditingNote]  = useState(null); // null = creating new

  const [title, setTitle] = useState("");
  const [desc,  setDesc]  = useState("");
  const [time,  setTime]  = useState("");

  useEffect(() => {
    if (open) {
      setView("month");
      setViewYear(now.getFullYear());
      setViewMonth(now.getMonth());
      setSelectedDate(null);
      setEditingNote(null);
      setTitle(""); setDesc(""); setTime("");
    }
  }, [open]);

  const grid       = useMemo(() => buildMonthGrid(viewYear, viewMonth), [viewYear, viewMonth]);
  const noteDates  = useMemo(() => new Set(calendarNotes.map(n => n.date)), [calendarNotes]);
  const dayNotes   = useMemo(() => selectedDate ? notesOnDate(calendarNotes, selectedDate) : [], [calendarNotes, selectedDate]);
  const movement   = useMemo(() => selectedDate ? calcDayMovement(transactions, selectedDate) : { inc: 0, exp: 0, inv: 0 }, [transactions, selectedDate]);

  const goPrevMonth = () => { let m = viewMonth - 1, y = viewYear; if (m < 0) { m = 11; y--; } setViewMonth(m); setViewYear(y); };
  const goNextMonth = () => { let m = viewMonth + 1, y = viewYear; if (m > 11) { m = 0; y++; } setViewMonth(m); setViewYear(y); };

  const openDay = (dateStr) => { setSelectedDate(dateStr); setView("day"); };
  const openNewNote = () => { setEditingNote(null); setTitle(""); setDesc(""); setTime(""); setView("noteForm"); };
  const openEditNote = (note) => { setEditingNote(note); setTitle(note.title); setDesc(note.desc || ""); setTime(note.time || ""); setView("noteForm"); };

  const saveNote = () => {
    const t = title.trim();
    if (!t) return;
    if (editingNote) {
      updateCalendarNote({ ...editingNote, title: t, desc: desc.trim(), time });
    } else {
      addCalendarNote({ id: Date.now(), date: selectedDate, title: t, desc: desc.trim(), time });
    }
    setView("day");
  };
  const deleteNote = () => {
    if (editingNote) removeCalendarNote(editingNote.id);
    setView("day");
  };

  const sheetTitle =
    view === "month"    ? "📅 Calendário" :
    view === "day"       ? fullDateLabel(selectedDate) :
    editingNote ? "Editar anotação" : "Nova anotação";

  return (
    <Sheet open={open} onClose={onClose} title={sheetTitle}>

      {/* ── MONTH VIEW ── */}
      {view === "month" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
            <button onClick={goPrevMonth} style={{ width: 34, height: 34, borderRadius: 10, background: T.canvas, border: `1px solid ${T.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, color: T.sub }}>‹</button>
            <Txt sz={15} w={700}>{monthYearLabel(viewYear, viewMonth)}</Txt>
            <button onClick={goNextMonth} style={{ width: 34, height: 34, borderRadius: 10, background: T.canvas, border: `1px solid ${T.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, color: T.sub }}>›</button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2, marginBottom: 2 }}>
            {WEEKDAYS_SHORT.map((w, i) => (
              <div key={i} style={{ textAlign: "center", padding: "4px 0" }}>
                <Txt sz={11} w={600} c={T.faint}>{w}</Txt>
              </div>
            ))}
          </div>

          {grid.map((week, wi) => (
            <div key={wi} style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2 }}>
              {week.map(cell => {
                const hasNotes = noteDates.has(cell.date);
                return (
                  <Press key={cell.date} onClick={() => openDay(cell.date)}
                    sx={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", aspectRatio: "1", borderRadius: 12 }}>
                    <div style={{
                      width: 30, height: 30, borderRadius: "50%", boxSizing: "border-box",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      border: cell.isToday ? `1.5px solid ${T.blue}` : "1.5px solid transparent",
                    }}>
                      <Txt sz={13} w={cell.isToday ? 700 : 400} c={cell.isToday ? T.blue : cell.inMonth ? T.text : T.faint}>
                        {cell.day}
                      </Txt>
                    </div>
                    <div style={{ height: 5, marginTop: 3, display: "flex", justifyContent: "center" }}>
                      {hasNotes && <div style={{ width: 14, height: 3, borderRadius: 2, background: T.brand }} />}
                    </div>
                  </Press>
                );
              })}
            </div>
          ))}
        </div>
      )}

      {/* ── DAY VIEW ── */}
      {view === "day" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <button onClick={() => setView("month")} style={{ alignSelf: "flex-start", fontSize: 13, fontWeight: 600, color: T.sub, background: "transparent", border: "none", cursor: "pointer", padding: "2px 0" }}>
            ‹ Voltar ao mês
          </button>

          {/* Anotações */}
          <div>
            <SH title="Anotações" sx={{ marginBottom: 8 }} />
            <Btn onClick={openNewNote} variant="secondary" full sm icon="➕" sx={{ marginBottom: 10 }}>Nova anotação</Btn>

            {dayNotes.length === 0 ? (
              <EmptyState icon="🗒️" title="Nenhuma anotação" sub="Toque em Nova anotação para registrar algo sobre este dia." />
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {dayNotes.map(n => (
                  <Press key={n.id} onClick={() => openEditNote(n)}
                    sx={{ background: T.subtle, border: `1px solid ${T.border}`, borderRadius: 14, padding: "12px 14px", textAlign: "left" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: n.desc ? 3 : 0 }}>
                      {n.time && (
                        <span style={{ fontSize: 10, fontWeight: 700, color: T.blue, background: T.blueBg, border: `1px solid ${T.blueBd}`, borderRadius: 99, padding: "2px 7px", flexShrink: 0 }}>{n.time}</span>
                      )}
                      <Txt sz={14} w={600} sx={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{n.title}</Txt>
                    </div>
                    {n.desc && <Txt sz={12} c={T.sub} sx={{ display: "block", lineHeight: 1.5 }}>{n.desc}</Txt>}
                  </Press>
                ))}
              </div>
            )}
          </div>

          <Div />

          {/* Movimentação do dia — resumo apenas, nunca lista lançamentos */}
          <div>
            <SH title="Movimentação do dia" sx={{ marginBottom: 8 }} />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
              <div style={{ background: T.subtle, borderRadius: 12, padding: "10px 8px", textAlign: "center" }}>
                <Txt sz={16} sx={{ display: "block", marginBottom: 3 }}>🟢</Txt>
                <Lbl sx={{ marginBottom: 4, justifyContent: "center", display: "flex" }}>Entradas</Lbl>
                <Mon v={BRL(movement.inc)} sz={12} c={T.green} />
              </div>
              <div style={{ background: T.subtle, borderRadius: 12, padding: "10px 8px", textAlign: "center" }}>
                <Txt sz={16} sx={{ display: "block", marginBottom: 3 }}>🔴</Txt>
                <Lbl sx={{ marginBottom: 4, justifyContent: "center", display: "flex" }}>Saídas</Lbl>
                <Mon v={BRL(movement.exp)} sz={12} c={T.red} />
              </div>
              <div style={{ background: T.subtle, borderRadius: 12, padding: "10px 8px", textAlign: "center" }}>
                <Txt sz={16} sx={{ display: "block", marginBottom: 3 }}>🔵</Txt>
                <Lbl sx={{ marginBottom: 4, justifyContent: "center", display: "flex" }}>Investimentos</Lbl>
                <Mon v={BRL(movement.inv)} sz={12} c={T.blue} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── NOTE FORM (create / edit) ── */}
      {view === "noteForm" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <button onClick={() => setView("day")} style={{ alignSelf: "flex-start", fontSize: 13, fontWeight: 600, color: T.sub, background: "transparent", border: "none", cursor: "pointer", padding: "2px 0" }}>
            ‹ Voltar
          </button>

          <Input label="Título" value={title} onChange={setTitle} placeholder="Ex: Reunião com cliente" autoFocus />

          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <label style={{ fontSize: 12, fontWeight: 500, color: T.sub }}>Descrição (opcional)</label>
            <textarea value={desc} onChange={e => setDesc(e.target.value)}
              placeholder="Detalhes sobre essa anotação..."
              style={{ width: "100%", minHeight: 90, padding: "12px", fontSize: 14, fontFamily: F.sans, lineHeight: 1.6, background: T.subtle, border: `1.5px solid ${T.border}`, borderRadius: 12, color: T.text, outline: "none", resize: "none" }} />
          </div>

          <Input label="Hora (opcional)" value={time} onChange={setTime} type="time" />

          <Btn onClick={saveNote} disabled={!title.trim()} variant="primary" full color={T.blue}>Salvar</Btn>
          <Btn onClick={() => setView("day")} variant="ghost" full sm>Cancelar</Btn>
          {editingNote && (
            <Btn onClick={deleteNote} variant="danger" full sm>Excluir anotação</Btn>
          )}
        </div>
      )}

    </Sheet>
  );
}

// ─── TEAM SHEET (Equipe) ──────────────────────────────────────────────────────
/**
 * TeamSheet — Funcionário / Assinaturas contratadas.
 *
 * Same "click → form opens immediately, no list before it" behaviour as
 * Precificação. Both record kinds live in the same `team` array/reducer
 * (mirrors how the existing `catalog` array already works), discriminated
 * by `kind`, so future features can query the whole team list at once while
 * still telling employees and subscriptions apart.
 *
 * Accepts an optional `editItem` (same shape as CatalogSheet) so a future
 * list/browse screen can reuse this exact sheet for editing — not built
 * yet, per spec ("não implementar funcionalidades futuras"), but the data
 * layer and this component are already ready for it.
 */
export function TeamSheet({ open, onClose, onSave, editItem = null, transactions = [], defaultKind = "employee" }) {
  const emptyEmployee     = { kind: "employee",     name: "", role: "", salary: "", phone: "", notes: "", costLines: [] };
  const emptySubscription = { kind: "subscription", name: "", value: "", cat: "Software" };

  const [kind, setKind] = useState("employee");
  const [form, setForm] = useState(emptyEmployee);
  const [err,  setErr]  = useState("");
  const [customCats, setCustomCats] = useState(() => storage.getCustomCats());
  const costLinesRef = useRef(null);

  useEffect(() => {
    if (open) {
      if (editItem) {
        setKind(editItem.kind);
        setForm({ ...editItem });
      } else {
        setKind(defaultKind);
        setForm(defaultKind === "subscription" ? emptySubscription : emptyEmployee);
      }
      setCustomCats(storage.getCustomCats());
      setErr("");
    }
  }, [open, editItem, defaultKind]);

  // Same merged category list EntrySheet uses (base CATS + custom cats + "Outros" last)
  const allCats = useMemo(() => {
    const base = CATS.filter(c => c !== "Outros");
    const merged = [...base];
    customCats.forEach(c => { if (!merged.includes(c)) merged.push(c); });
    merged.push("Outros");
    return merged;
  }, [customCats]);

  const switchKind = (k) => {
    setKind(k);
    setForm(k === "employee" ? emptyEmployee : { ...emptySubscription, cat: allCats[0] || "Outros" });
    setErr("");
  };

  const costTotal   = (form.costLines || []).reduce((s, l) => s + (parseFloat(l.value) || 0), 0);
  const monthlyCost = (parseFloat(form.salary) || 0) + costTotal; // Salário base + Benefícios/Custos

  // "Resumo da contratação" / "Situação da empresa" — pure derived state,
  // recomputed on every render from real data. Never included in the
  // object passed to onSave, so it is never persisted.
  const hiring = useHiringAnalysis(transactions, monthlyCost);
  const statusCopy = {
    green:  { icon: "🟢", title: "Sua empresa pode contratar este funcionário.",       text: `Mesmo somando esse custo, sua margem de lucro no mês seguiria em ${hiring.newMargin.toFixed(0)}%.` },
    yellow: { icon: "🟡", title: "Esta contratação merece atenção.",                    text: `Com esse custo somado, sua margem cairia para ${hiring.newMargin.toFixed(0)}%. Vale revisar o orçamento antes de confirmar.` },
    red:    { icon: "🔴", title: "No cenário atual, esta contratação não é recomendada.", text: `Com esse custo somado, sua margem ficaria em ${hiring.newMargin.toFixed(0)}%, o que pode comprometer as finanças do mês.` },
  }[hiring.status];
  const statusColor = { green: T.green, yellow: T.amber, red: T.red }[hiring.status];
  const statusBg     = { green: T.greenBg, yellow: T.amberBg, red: T.redBg }[hiring.status];
  const statusBd     = { green: T.greenBd, yellow: T.amberBd, red: T.redBd }[hiring.status];

  const save = () => {
    if (!form.name.trim()) { setErr(kind === "employee" ? "Informe o nome." : "Informe o nome do serviço."); return; }
    costLinesRef.current?.commitPending(); // flush an unblurred benefício/custo line, same safety net as Itens de custo
    onSave({ ...form, kind, id: editItem?.id || Date.now() });
    onClose();
  };

  return (
    <Sheet open={open} onClose={onClose} title={editItem ? "Editar" : "Novo cadastro"}>
      <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>

        <TypeToggle value={kind} onChange={switchKind}
          opts={[{ val: "employee", label: "Funcionário" }, { val: "subscription", label: "Assinaturas contratadas" }]} />

        {kind === "employee" ? (
          <>
            <Input label="Nome *" value={form.name} onChange={v => { setForm(f => ({ ...f, name: v })); setErr(""); }} placeholder="Nome completo" />
            {err && <Txt sz={12} c={T.red} sx={{ display: "block", marginTop: -8 }}>{err}</Txt>}
            <Input label="Cargo/Função" value={form.role} onChange={v => setForm(f => ({ ...f, role: v }))} placeholder="Ex: Designer, Vendedor" />
            <MoneyInput label="Salário base" value={form.salary} onChange={v => setForm(f => ({ ...f, salary: v }))} />
            <Input label="Telefone/Contato" value={form.phone} onChange={v => setForm(f => ({ ...f, phone: v }))} placeholder="(00) 00000-0000" />
            <Input label="Observações (opcional)" value={form.notes} onChange={v => setForm(f => ({ ...f, notes: v }))} placeholder="Detalhes adicionais" />

            <CostLinesEditor
              ref={costLinesRef}
              label="Benefícios / Custos"
              tooltip="Custos adicionais associados a este funcionário. Ex: vale transporte, vale alimentação, plano de saúde, auxílio combustível, bônus."
              namePlaceholder="Nome (ex: Vale Alimentação)"
              lines={form.costLines}
              onChange={ls => setForm(f => ({ ...f, costLines: ls }))}
            />

            {/* Resumo da contratação — recalculado a cada alteração, nunca salvo */}
            {monthlyCost > 0 && (
              <>
                <div style={{ background: T.subtle, borderRadius: 14, padding: "14px 16px", border: `1px solid ${T.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <Txt sz={14} w={600}>Custo mensal total</Txt>
                  <Mon v={`R$ ${monthlyCost.toFixed(2)}`} sz={18} c={T.blue} />
                </div>

                <div style={{ background: statusBg, border: `1px solid ${statusBd}`, borderRadius: 14, padding: "14px 16px", display: "flex", flexDirection: "column", gap: 4 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                    <span style={{ fontSize: 16 }}>{statusCopy.icon}</span>
                    <Txt sz={13} w={700} c={statusColor}>{statusCopy.title}</Txt>
                  </div>
                  <Txt sz={12} c={T.sub} sx={{ display: "block", lineHeight: 1.5 }}>{statusCopy.text}</Txt>
                </div>
              </>
            )}
          </>
        ) : (
          <>
            <Input label="Nome do serviço *" value={form.name} onChange={v => { setForm(f => ({ ...f, name: v })); setErr(""); }} placeholder="Ex: Notion, Adobe Creative Cloud" />
            {err && <Txt sz={12} c={T.red} sx={{ display: "block", marginTop: -8 }}>{err}</Txt>}
            <MoneyInput label="Valor mensal" value={form.value} onChange={v => setForm(f => ({ ...f, value: v }))} />
            <Sel label="Categoria" value={form.cat} onChange={v => setForm(f => ({ ...f, cat: v }))} options={allCats} />
          </>
        )}

        <Btn onClick={save} variant="primary" full color={T.blue}>{editItem ? "Salvar alterações" : "Salvar"}</Btn>
      </div>
    </Sheet>
  );
}

// ─── CALCULATOR SHEET ─────────────────────────────────────────────────────────
/**
 * CalculatorSheet — a standalone basic calculator.
 *
 * Completely independent: no props besides open/onClose, no store coupling,
 * no data ever leaves this component. State always resets to a clean
 * calculator when the sheet opens — nothing is ever persisted or reused
 * between sessions.
 */
const CALC_ROWS = [
  ["CE", "C", "⌫", "÷"],
  ["7", "8", "9", "×"],
  ["4", "5", "6", "−"],
  ["1", "2", "3", "+"],
  ["%", "0", ",", "="],
];

export function CalculatorSheet({ open, onClose }) {
  const [state, setState]   = useState(initialCalcState);
  const [tokens, setTokens] = useState(initialTokens); // display-only — never affects state/calculation

  useEffect(() => {
    if (open) { setState(initialCalcState); setTokens(initialTokens); } // sempre abre limpa — nenhum histórico é salvo
  }, [open]);

  const handlePress = (label) => {
    const wasError = state.error;
    // Only "true" right after "=": the one case where waitingForOperand means
    // "the next digit starts a brand new expression", not "continue this one".
    const startFresh = wasError || (state.waitingForOperand && state.operator === null);

    if (/^[0-9]$/.test(label)) {
      setState(inputDigit(state, label));
      setTokens(t => tokensAppendDigit(wasError ? initialTokens : t, label, startFresh));
      return;
    }
    if (label === ",") {
      setState(inputDecimal(state));
      setTokens(t => tokensAppendDecimal(wasError ? initialTokens : t, startFresh));
      return;
    }
    if (label === "+" || label === "−" || label === "×" || label === "÷") {
      setState(inputOperator(state, label === "−" ? "-" : label));
      if (!wasError) setTokens(t => tokensAppendOperator(t, label));
      return;
    }
    if (label === "%") {
      const next = inputPercent(state);
      setState(next);
      if (!wasError) setTokens(t => tokensApplyPercent(t, next.display));
      return;
    }
    if (label === "=") {
      const hadPending = !wasError && state.operator != null && state.prevValue != null;
      const next = calcEquals(state);
      setState(next);
      if (hadPending) setTokens(tokensEquals(next.display));
      return;
    }
    if (label === "C") {
      setState(clearAll());
      setTokens(tokensClearAll());
      return;
    }
    if (label === "CE") {
      setState(clearEntry);
      setTokens(t => tokensClearEntry(wasError ? initialTokens : t));
      return;
    }
    if (label === "⌫") {
      if (wasError) { setState(clearAll()); setTokens(tokensClearAll()); return; }
      setState(s => backspace(s));
      setTokens(t => tokensBackspace(t));
      return;
    }
  };

  const displayText = state.error ? state.display : (tokens.length > 0 ? tokensToDisplay(tokens) : state.display);

  return (
    <Sheet open={open} onClose={onClose} title="Calculadora">
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

        {/* Display */}
        <div style={{ background: T.subtle, borderRadius: 18, padding: "28px 20px", textAlign: "right", border: `1px solid ${T.border}` }}>
          <div style={{
            fontSize: displayText.length > 8 ? 28 : 44, fontWeight: 300,
            color: state.error ? T.red : T.text, letterSpacing: "-0.01em",
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>
            {displayText}
          </div>
        </div>

        {/* Buttons */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {CALC_ROWS.map((row, ri) => (
            <div key={ri} style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
              {row.map(label => {
                const isEquals   = label === "=";
                const isOperator = label === "÷" || label === "×" || label === "−" || label === "+";
                const isClear    = label === "C" || label === "CE" || label === "⌫";
                const isPlain    = !isEquals && !isOperator && !isClear;
                return (
                  <button key={label} className="calc-btn" onClick={() => handlePress(label)}
                    aria-label={label}
                    style={{
                      aspectRatio: "1", borderRadius: 16,
                      border: isPlain ? `1px solid ${T.border}` : "none",
                      fontSize: label === "⌫" ? 17 : 19, fontWeight: 600, fontFamily: F.sans,
                      background: isEquals ? T.brand : (isOperator || isClear) ? T.subtle : T.canvas,
                      color: isEquals ? "#fff" : isClear ? T.sub : T.text,
                      boxShadow: isPlain ? "0 1px 2px rgba(0,0,0,0.05)" : "none",
                    }}>
                    {label}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </Sheet>
  );
}
