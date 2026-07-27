/**
 * pages/index.jsx
 * The three main tab pages + Setup onboarding.
 * Each page reads from the store via useApp() — no prop drilling.
 *
 * CHANGELOG:
 *  - InsightsPage removed (replaced by PDF export on Home)
 *  - HomePage: PDF report card added between Fluxo Previsto and Ações Rápidas
 */

import { useState, useEffect, useMemo, useRef } from "react";
import { useApp }            from "../store/AppContext";
import {
  Txt, Mon, Lbl, Div, Dot, Btn, Card, SH, EmptyState, RowItem,
  StatusBadge, DueBadge, Press, Input, MoneyInput, Tooltip, TypeToggle, CalculatorIcon,
} from "../components";
import { T, CAT_CLR, SHEETS, statusOf } from "../constants";
import { BRL, BRLk } from "../utils/currency";
import { diffD, monthLabel, now, fmt } from "../utils/date";
import {
  useDashboardStats,
  useBillGroups, useEntriesFilter, useDebounce, useDayMovement, useUnifiedCatalogFilter,
} from "../hooks";
import { exportPDF } from "../services/pdfExport";
import { importBackup } from "../services/backup";
import { findNextNote, relativeDayLabel } from "../services/calendar";
import { CatalogSheet as CatalogSheetInline, TeamSheet as TeamSheetInline } from "../sheets";

// ─── SETUP / ONBOARDING ──────────────────────────────────────────────────────
export function SetupPage() {
  const { completeSetup, restoreBackup } = useApp();
  const [step, setStep] = useState(0);
  const [f, sF]         = useState({ revenue: "", expenses: "", investment: "", caixa: "", temFundos: null, fundos: "", rendimento: "" });
  const [err, sE]       = useState("");
  const [backupErr, setBackupErr] = useState("");
  const [backupOk,  setBackupOk]  = useState(false);
  const backupRef = useRef(null);

  const handleBackupFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBackupErr("");
    restoreBackup(file)
      .then(() => setBackupOk(true))
      .catch((msg) => { setBackupErr(msg); e.target.value = ""; });
  };

  const submit = () => {
    if (!f.revenue || !f.expenses) { sE("Preencha receita e gastos."); return; }
    sE("");
    completeSetup({
      revenue:    parseFloat(f.revenue)    || 0,
      expenses:   parseFloat(f.expenses)   || 0,
      investment: parseFloat(f.investment) || 0,
      caixa:      parseFloat(f.caixa)      || 0,
      fundos:     f.temFundos ? (parseFloat(f.fundos) || 0) : 0,
      rendimento: f.temFundos ? (parseFloat(f.rendimento) || 0) : 0,
    });
  };

  // ── STEP 0: welcome ──────────────────────────────────────────────────────
  if (step === 0) return (
    <div style={{ minHeight: "100vh", background: T.bg, display: "flex", flexDirection: "column", justifyContent: "center", padding: "40px 24px", maxWidth: 400, margin: "0 auto" }}>
      <div style={{ marginBottom: 48 }}>
        <div style={{ width: 48, height: 48, background: T.text, borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 24 }}>
          <span style={{ color: "#fff", fontSize: 22 }}>◈</span>
        </div>
        <div className="fluxy-brand" style={{ marginBottom: 12, fontSize: 36 }}>NOZIL</div>
        <Txt sz={16} c={T.sub} sx={{ display: "block", lineHeight: 1.7 }}>Painel financeiro para pequenos negócios. Simples, rápido e focado no que importa.</Txt>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <Btn onClick={() => setStep(1)} variant="primary" full>Começar agora →</Btn>
        <Btn onClick={() => completeSetup({ revenue: 45000, expenses: 12000, investment: 8000, months: 6, caixa: 8000, fundos: 25000, rendimento: 0.8, _demo: true })} variant="secondary" full>Ver com dados de exemplo</Btn>

        {/* Backup option */}
        <div style={{ borderTop: `1px solid ${T.border}`, paddingTop: 10, display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
          <Txt sz={12} c={T.faint}>Já possui um backup?</Txt>
          <input ref={backupRef} type="file" accept=".json" onChange={handleBackupFile} style={{ display: "none" }} />
          <button onClick={() => { setBackupErr(""); backupRef.current?.click(); }}
            style={{ fontSize: 13, fontWeight: 600, color: T.blue, background: "none", border: "none", cursor: "pointer", textDecoration: "underline", textDecorationColor: T.blueBd }}>
            📂 Importar Backup
          </button>
          {backupOk  && <Txt sz={12} c={T.green}>✓ Backup restaurado com sucesso!</Txt>}
          {backupErr && <Txt sz={12} c={T.red}>⚠ {backupErr}</Txt>}
        </div>
      </div>
    </div>
  );

  // ── STEP 1: unified setup — base data + caixa/fundos, single screen ──────
  return (
    <div style={{ minHeight: "100vh", background: T.bg, display: "flex", flexDirection: "column", justifyContent: "center", padding: "32px 24px", maxWidth: 420, margin: "0 auto" }}>
      <div style={{ marginBottom: 24 }}>
        <button onClick={() => setStep(0)} style={{ fontSize: 13, color: T.sub, marginBottom: 16, display: "flex", alignItems: "center", gap: 4 }}>← Voltar</button>
        <Txt sz={22} w={700} sx={{ display: "block", letterSpacing: "-0.03em", marginBottom: 6 }}>Configure sua base</Txt>
        <Txt sz={14} c={T.sub} sx={{ display: "block", lineHeight: 1.6 }}>Leva menos de um minuto. Você poderá editar tudo depois nas configurações.</Txt>
      </div>

      {/* Dica */}
      <div style={{ background: T.blueBg, border: `1px solid ${T.blueBd}`, borderRadius: 12, padding: "11px 14px", marginBottom: 18 }}>
        <Txt sz={12} c={T.blue} sx={{ display: "block", lineHeight: 1.6 }}>
          💡 <strong>Dica:</strong> Você pode utilizar valores aproximados. Não é necessário cadastrar todo o histórico da empresa. O mais importante é registrar corretamente os lançamentos daqui para frente.
        </Txt>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 13, marginBottom: 16 }}>
        <MoneyInput label="Receita mensal média *" value={f.revenue}    onChange={v => sF({ ...f, revenue: v })}    hint="Uma média do que entra por mês" />
        <MoneyInput label="Gastos mensais médios *" value={f.expenses}   onChange={v => sF({ ...f, expenses: v })}   hint="Uma média do que sai por mês" />
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 5 }}>
            <span style={{ fontSize: 12, fontWeight: 500, color: T.sub }}>Capital investido</span>
            <Tooltip text="Valor que você investiu para iniciar ou desenvolver o negócio. Não inclua faturamento, vendas ou dinheiro em caixa." />
          </div>
          <MoneyInput value={f.investment} onChange={v => sF({ ...f, investment: v })} hint="Investimento inicial ou capital em risco" />
        </div>
      </div>

      {/* Caixa e Fundos — same screen now */}
      <div style={{ borderTop: `1px solid ${T.border}`, paddingTop: 16, marginBottom: 16, display: "flex", flexDirection: "column", gap: 13 }}>
        <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: T.faint }}>
          Caixa e Fundos Guardados
        </div>

        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 5 }}>
            <span style={{ fontSize: 12, fontWeight: 500, color: T.sub }}>Caixa disponível</span>
            <Tooltip text="Dinheiro disponível para usar hoje na operação da empresa. Pode incluir saldo em conta, dinheiro em caixa ou recursos para pagar despesas." />
          </div>
          <MoneyInput value={f.caixa} onChange={v => sF({ ...f, caixa: v })} hint="Dinheiro disponível para uso imediato" />
        </div>

        {/* Possui dinheiro guardado? */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <label style={{ fontSize: 12, fontWeight: 500, color: T.sub }}>Possui dinheiro guardado / investido?</label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {[{ val: true, l: "Sim" }, { val: false, l: "Não" }].map(o => (
              <button key={String(o.val)} onClick={() => sF({ ...f, temFundos: o.val })}
                style={{ padding: "11px", borderRadius: 12, border: `1.5px solid ${f.temFundos === o.val ? T.blue : T.border}`, background: f.temFundos === o.val ? T.blueBg : T.subtle, color: f.temFundos === o.val ? T.blue : T.sub, fontSize: 14, fontWeight: f.temFundos === o.val ? 600 : 400, cursor: "pointer", transition: "all 0.13s" }}>
                {o.l}
              </button>
            ))}
          </div>
        </div>

        {f.temFundos === true && (
          <>
            <MoneyInput label="Fundos guardados" value={f.fundos} onChange={v => sF({ ...f, fundos: v })} />
            <Input label="Rendimento mensal (%)" value={f.rendimento} onChange={v => sF({ ...f, rendimento: v })}
              type="number" inputMode="decimal" placeholder="Ex: 0,8" hint="Em %. Ex: 0,8 para 0,8% ao mês" />
          </>
        )}
      </div>

      {err && <div style={{ background: T.redBg, border: `1px solid ${T.redBd}`, borderRadius: 10, padding: "10px 12px", marginBottom: 14 }}><Txt sz={13} c={T.red}>{err}</Txt></div>}
      <Btn onClick={submit} variant="primary" full>Entrar no dashboard →</Btn>
    </div>
  );
}

// ─── HOME ────────────────────────────────────────────────────────────────────
export function HomePage() {
  const { state, openSheet, setTab } = useApp();
  const { transactions, bills, setup, calendarNotes } = state;

  const ds     = useDashboardStats(transactions, bills, setup);
  const recent = useMemo(() => transactions.slice(0, 6), [transactions]);
  const nextNote = useMemo(() => findNextNote(calendarNotes, fmt(now)), [calendarNotes]);
  const todayMovement = useDayMovement(transactions, fmt(now));

  const [billsExpanded, setBillsExpanded] = useState(false);
  const [pdfLoading, setPdfLoading]       = useState(false);
  const billsToShow = billsExpanded ? ds.urgentBills : ds.urgentBills.slice(0, 1);
  const ml = monthLabel(0);

  const handleGeneratePDF = () => {
    exportPDF(
      transactions,
      bills,
      setup,
      () => setPdfLoading(true),
      () => setPdfLoading(false),
    );
  };

  return (
    <div className="page-shell" style={{ paddingBottom: 88, background: T.bg, minHeight: "100vh" }}>

      {/* Header */}
      <div style={{ padding: "20px 18px 0", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div className="fluxy-brand">NOZIL</div>
          <Txt sz={12} c={T.faint} sx={{ display: "block", marginBottom: 2 }}>{ml} · {now.getFullYear()}</Txt>
          <Txt sz={22} w={700} sx={{ display: "block", letterSpacing: "-0.03em" }}>Dashboard</Txt>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => openSheet(SHEETS.NOTES)} style={{ width: 34, height: 34, borderRadius: 10, background: T.canvas, border: `1px solid ${T.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>📒</button>
          <button onClick={() => openSheet(SHEETS.CALCULATOR)} style={{ width: 34, height: 34, borderRadius: 10, background: T.canvas, border: `1px solid ${T.border}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <CalculatorIcon size={17} />
          </button>
          <button onClick={() => openSheet(SHEETS.SETTINGS)} style={{ width: 34, height: 34, borderRadius: 10, background: T.canvas, border: `1px solid ${T.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15 }}>⚙</button>
        </div>
      </div>

      <div className="home-content">

        {/* Orientação para usuários novos — aparece apenas quando há poucos lançamentos.
            Não usa nenhum indicador calculado; conta apenas a quantidade de lançamentos. */}
        {transactions.length < 3 && (
          <div style={{ background: T.blueBg, border: `1px solid ${T.blueBd}`, borderRadius: 14, padding: "13px 15px", display: "flex", alignItems: "flex-start", gap: 10 }}>
            <span style={{ fontSize: 16, flexShrink: 0, lineHeight: 1 }}>💡</span>
            <Txt sz={12} c={T.blue} sx={{ display: "block", lineHeight: 1.6 }}>
              <strong>Seus indicadores ainda estão se formando.</strong> Cadastre suas receitas e gastos para começar a acompanhar a evolução do seu negócio aqui.
            </Txt>
          </div>
        )}

        {ds.urgentBills.length > 0 && (
          <div className="hg-urgent" style={{ background: T.amberBg, border: `1px solid ${T.amberBd}`, borderLeft: `3px solid ${T.amber}`, borderRadius: 16, overflow: "hidden" }}>
            <div style={{ padding: "10px 14px 6px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 12 }}>⚠</span>
                <Lbl c={T.amber}>Vencendo em breve</Lbl>
              </div>
              {ds.urgentBills.length > 1 && (
                <button onClick={() => setBillsExpanded(e => !e)} style={{ fontSize: 12, color: T.amber, fontWeight: 600, display: "flex", alignItems: "center", gap: 3 }}>
                  {billsExpanded ? "▲ ocultar" : `▾ ver todas (${ds.urgentBills.length})`}
                </button>
              )}
            </div>
            {billsToShow.map((b, i) => (
              <RowItem key={b.id} last={i === billsToShow.length - 1} pad="9px 14px">
                <Dot color={b.type === "payable" ? T.red : T.green} />
                <Txt sz={13} sx={{ flex: 1 }}>{b.desc}</Txt>
                <DueBadge days={diffD(b.dueDate)} />
                <Mon v={BRL(b.amount)} sz={13} c={b.type === "payable" ? T.red : T.green} />
              </RowItem>
            ))}
          </div>
        )}

        {/* 2. Lucro Líquido + Fluxo Previsto — lado a lado em tablet/desktop */}
        <div className="hg-row">
        <Card pad={false} anim="hg-kpi">
          <div className="kpi-head">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 4 }}><Lbl>Lucro líquido — {ml}</Lbl><Tooltip text="Diferença entre receita e gastos. Representa quanto o negócio realmente gerou de resultado." /></div>
                <Mon v={BRL(ds.profit)} sz={28} c={ds.profit >= 0 ? T.green : T.red} />
              </div>
              {/* Badge + phrase stacked in its own column, aligned top-right */}
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 5, maxWidth: 180 }}>
                <StatusBadge margin={ds.margin} profit={ds.profit} />
                {(() => {
                  const phrases = {
                    "Excelente": "Suas receitas estão cobrindo seus gastos com folga e o caixa permanece saudável.",
                    "Boa":       "O negócio está saudável, mas existe espaço para melhorar seus resultados.",
                    "Aceitável": "O negócio está gerando lucro, mas ainda há espaço para aumentar a margem.",
                    "Atenção":   "A margem está abaixo de 10%. Acompanhe de perto os gastos operacionais.",
                    "Crítica":   "O negócio está operando com prejuízo e requer atenção imediata.",
                  };
                  const s = statusOf(ds.margin, ds.profit);
                  const phrase = phrases[s.label];
                  return phrase ? (
                    <Txt sz={10} c={T.sub} sx={{ display: "block", lineHeight: 1.5, textAlign: "right" }}>
                      {phrase}
                    </Txt>
                  ) : null;
                })()}
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 1, background: T.border, borderRadius: 12 }}>
              {[{ l: "Receita", v: BRLk(ds.inc), c: T.green, tip: "Total recebido em vendas e serviços no período analisado." }, { l: "Gastos", v: BRLk(ds.exp), c: T.red, tip: "Total gasto para manter e operar o negócio no período.", dir: "down-center" }, { l: "MRR", v: BRLk(ds.mrr), c: T.blue, tip: "Receita recorrente mensal. Representa quanto entra todos os meses de forma previsível.", flip: true }].map((k, i) => (
                <div key={i} className="kpi-cell" style={{ background: T.canvas }}><Lbl sx={{ marginBottom: 4 }}><span style={{ display: "flex", alignItems: "center" }}>{k.l}{k.tip && <Tooltip text={k.tip} flip={k.flip} dir={k.dir} />}</span></Lbl><Mon v={k.v} sz={13} c={k.c} /></div>
              ))}
            </div>
          </div>
          <Div />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 1, background: T.border }}>
            {[
              { l: "Margem",   v: `${ds.margin.toFixed(0)}%`,  c: ds.margin >= 25 ? T.green : ds.margin >= 10 ? T.amber : T.red },
              { l: "ROI",      v: `${ds.roi.toFixed(0)}%`,     c: ds.roi >= 15 ? T.green : ds.roi >= 5 ? T.amber : T.red, tip: "Retorno sobre o capital investido. Mostra quanto o negócio retornou em relação ao valor investido.", dir: "up-center" },
              { l: "Previsão", v: BRLk(ds.forecast),           c: T.blue },
            ].map((k, i) => (
              <div key={i} className="kpi-cell" style={{ background: T.canvas }}><Lbl sx={{ marginBottom: 4 }}><span style={{ display: "flex", alignItems: "center" }}>{k.l}{k.tip && <Tooltip text={k.tip} dir={k.dir} />}</span></Lbl><Mon v={k.v} sz={13} c={k.c} /></div>
            ))}
          </div>
        </Card>

        {/* right column: Fluxo Previsto + Caixa e Fundos stacked */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <Card pad={false} anim="b-fluxo">
          <div className="fluxo-card-inner">
            <Lbl sx={{ marginBottom: 10 }}>Fluxo previsto</Lbl>
            <div className="fluxo-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr" }}>
              {[{ l: "A receber", v: ds.pendIn, c: T.green }, { l: "A pagar", v: ds.pendOut, c: T.red }, { l: "Saldo prev.", v: ds.profit + ds.pendIn - ds.pendOut, c: T.blue }].map(k => (
                <div key={k.l} className="fluxo-cell" style={{ background: T.subtle, borderRadius: 10 }}>
                  <Lbl sx={{ marginBottom: 4, fontSize: 9 }}>{k.l}</Lbl>
                  <Mon v={BRLk(k.v)} sz={12} c={k.c} />
                </div>
              ))}
            </div>
          </div>
        </Card>

        {/* 3b. Caixa disponível — informativo, sempre visível */}
        <Card sx={{ padding: "12px 16px" }}>
            <Lbl sx={{ marginBottom: 10 }}>Caixa e Fundos</Lbl>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}><Txt sz={13} c={T.sub}>Caixa disponível</Txt><Tooltip text="Dinheiro disponível para uso imediato na empresa." /></div>
                <Mon v={BRLk(setup.caixa || 0)} sz={14} c={T.green} />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Txt sz={13} c={T.sub}>Fundos guardados</Txt>
                <Mon v={BRLk(setup.fundos || 0)} sz={14} c={T.blue} />
              </div>
              {(setup.rendimento || 0) > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <Txt sz={13} c={T.sub}>Rendimento mensal</Txt>
                  <Mon v={`${setup.rendimento}%`} sz={14} c={T.blue} />
                </div>
              )}
            </div>
          </Card>
        </div>
        </div>

        {/* 3. Alerta crítico de margem */}
        {ds.alert && (
          <div className="b-alert" style={{ background: T.canvas, border: `1px solid ${T.border}`, borderLeft: `3px solid ${ds.alert.color}`, borderRadius: 12, padding: "9px 13px", display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 14, flexShrink: 0 }}>{ds.alert.icon}</span>
            <Txt sz={12} sx={{ lineHeight: 1.5 }}>{ds.alert.text}</Txt>
          </div>
        )}

        {/* 4. Relatório PDF */}
        <div className="pdf-card" style={{
          background: T.canvas,
          border: `1px solid ${T.border}`,
          borderRadius: 20,
          display: "flex",
          alignItems: "center",
          boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
        }}>
          {/* Icon */}
          <div style={{
            width: 44, height: 44, borderRadius: 12,
            background: T.blueBg,
            border: `1px solid ${T.blueBd}`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 20, flexShrink: 0,
          }}>
            📄
          </div>

          {/* Text */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <Txt sz={14} w={600} sx={{ display: "block", marginBottom: 2 }}>Relatório Financeiro</Txt>
            <Txt sz={11} c={T.sub} sx={{ display: "block", lineHeight: 1.5 }}>
              Gere um relatório executivo com os principais indicadores do negócio.
            </Txt>
          </div>

          {/* Button */}
          <button
            onClick={handleGeneratePDF}
            disabled={pdfLoading}
            style={{
              flexShrink: 0,
              background: pdfLoading ? T.subtle : T.blue,
              color: pdfLoading ? T.sub : "#fff",
              border: "none",
              borderRadius: 12,
              padding: "9px 14px",
              fontSize: 12,
              fontWeight: 600,
              cursor: pdfLoading ? "not-allowed" : "pointer",
              fontFamily: "inherit",
              transition: "all 0.15s ease",
              whiteSpace: "nowrap",
            }}
          >
            {pdfLoading ? "..." : "Gerar PDF"}
          </button>
        </div>

        {/* 4b. Widget do Calendário — abre o Calendário Inteligente */}
        <Press onClick={() => openSheet(SHEETS.CALENDAR)} className="pdf-card" sx={{
          background: T.canvas,
          border: `1px solid ${T.border}`,
          borderRadius: 20,
          display: "flex",
          alignItems: "center",
          boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
        }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12,
            background: T.blueBg,
            border: `1px solid ${T.blueBd}`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 20, flexShrink: 0,
          }}>
            📅
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <Txt sz={14} w={600} sx={{ display: "block", marginBottom: 2 }}>
              Hoje · {now.getDate()} de {monthLabel(0).toLowerCase()}
            </Txt>
            <Txt sz={11} c={T.sub} sx={{ display: "block", lineHeight: 1.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {nextNote
                ? `📌 ${nextNote.title} · ${relativeDayLabel(nextNote.date)}${nextNote.time ? ` às ${nextNote.time}` : ""}`
                : "Nenhuma anotação agendada"}
            </Txt>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 4 }}>
              <span style={{ display: "flex", alignItems: "center", gap: 3 }}>
                <span style={{ fontSize: 9 }}>🟢</span>
                <Mon v={BRL(todayMovement.inc)} sz={11} c={T.green} />
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: 3 }}>
                <span style={{ fontSize: 9 }}>🔴</span>
                <Mon v={BRL(todayMovement.exp)} sz={11} c={T.red} />
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: 3 }}>
                <span style={{ fontSize: 9 }}>🔵</span>
                <Mon v={BRL(todayMovement.inv)} sz={11} c={T.blue} />
              </span>
            </div>
          </div>
        </Press>

        {/* 5. Ações rápidas */}
        <div className="b-quick">
          <SH title="Ações rápidas" sx={{ marginBottom: 8 }} />
          <div className="qa-primary-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", marginBottom: 7 }}>
            {[
              { type: "income",     icon: "+", label: "Nova venda",   bg: T.greenBg, bd: T.greenBd, c: T.green },
              { type: "expense",    icon: "−", label: "Novo gasto",   bg: T.redBg,   bd: T.redBd,   c: T.red   },
              { type: "investment", icon: "↗", label: "Investimento", bg: T.blueBg,  bd: T.blueBd,  c: T.blue  },
            ].map(a => (
              <Press key={a.type} onClick={() => openSheet(SHEETS.ENTRY, a.type)} className="qa-item"
                sx={{ background: a.bg, border: `1px solid ${a.bd}`, borderRadius: 14, textAlign: "center" }}>
                <div style={{ fontSize: 20, color: a.c, marginBottom: 5, fontWeight: 300 }}>{a.icon}</div>
                <Txt sz={11} w={600} c={a.c} sx={{ display: "block", lineHeight: 1.3 }}>{a.label}</Txt>
              </Press>
            ))}
          </div>
          <div className="qa-secondary-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr" }}>
            <Btn onClick={() => openSheet(SHEETS.BILL)}    variant="secondary" full sm icon="📋">Nova conta</Btn>
            <Btn onClick={() => { setTab("catalog"); openSheet(SHEETS.PRICING); }} variant="secondary" full sm icon="🧮">Precificação</Btn>
          </div>
          <Btn onClick={() => openSheet(SHEETS.CAIXA)} variant="secondary" full sm icon="💰">Gestão de Caixa</Btn>
          <Btn onClick={() => openSheet(SHEETS.IMPORT)} variant="secondary" full sm icon="📥">Importar</Btn>
          <Btn onClick={() => { setTab("catalog"); openSheet(SHEETS.TEAM); }} variant="secondary" full sm icon="👥">Equipe</Btn>
        </div>

        {/* 6. Lançamentos recentes */}
        <div className="b-recent">
          <SH title="Lançamentos recentes" />
          <Card pad={false}>
            {recent.length === 0
              ? <EmptyState icon="📋" title="Nenhum lançamento" sub="Use as ações acima para começar" />
              : recent.map((t, i) => (
                  <RowItem key={t.id} last={i === recent.length - 1}>
                    <Dot color={CAT_CLR[t.cat] || T.faint} size={7} radius="2px" />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                        <Txt sz={13} w={500} sx={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.desc}</Txt>
                        {t.rec && (
                          <span style={{ fontSize: 9, fontWeight: 700, color: t.type === "income" ? T.green : T.red, background: t.type === "income" ? T.greenBg : T.redBg, border: `1px solid ${t.type === "income" ? T.greenBd : T.redBd}`, borderRadius: 99, padding: "1px 6px", whiteSpace: "nowrap", letterSpacing: "0.04em" }}>Recorrente</span>
                        )}
                      </div>
                      <Txt sz={11} c={T.faint} sx={{ display: "block", marginTop: 1 }}>{t.client || t.cat} · {t.date.slice(5).replace("-", "/")}</Txt>
                    </div>
                    <Mon v={`${t.type === "income" ? "+" : "-"}${BRL(t.amount)}`} sz={13} c={t.type === "income" ? T.green : t.type === "investment" ? T.blue : T.red} />
                  </RowItem>
                ))
            }
          </Card>
        </div>
      </div>
    </div>
  );
}

// ─── ENTRIES ─────────────────────────────────────────────────────────────────
export function EntriesPage() {
  const { state, removeTx, openSheet } = useApp();
  const { transactions } = state;

  const [search, sSearch]         = useState("");
  const [filter, sFilter]         = useState("todos");
  const [sort, setSort]           = useState("date");
  const [confirmId, setConfirmId] = useState(null); // id awaiting delete confirmation
  const [expandedId, setExpandedId] = useState(null); // id showing its product breakdown
  const dSearch = useDebounce(search, 250);

  const { grouped, totInc, totExp, filtered } = useEntriesFilter(transactions, filter, dSearch, sort);

  const handleDelete = (id) => setConfirmId(id);
  const confirmDelete = () => { removeTx(confirmId); setConfirmId(null); };

  // MRR badge component (inline)
  const MrrBadge = ({ t }) => {
    if (!t.rec) return null;
    const c = t.type === "income" ? T.green : T.red;
    const bg = t.type === "income" ? T.greenBg : T.redBg;
    const bd = t.type === "income" ? T.greenBd : T.redBd;
    return (
      <span style={{ fontSize: 9, fontWeight: 700, color: c, background: bg, border: `1px solid ${bd}`, borderRadius: 99, padding: "1px 6px", whiteSpace: "nowrap", letterSpacing: "0.04em" }}>
        MRR
      </span>
    );
  };

  return (
    <div className="page-shell" style={{ paddingBottom: 88, background: T.bg, minHeight: "100vh" }}>
      <div style={{ padding: "20px 18px 0", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div className="fluxy-brand" style={{ fontSize: 14, marginBottom: 2 }}>NOZIL</div>
          <Txt sz={22} w={700} sx={{ display: "block", letterSpacing: "-0.03em" }}>Lançamentos</Txt>
        </div>
        <Btn onClick={() => openSheet(SHEETS.ENTRY, "income")} variant="primary" sm color={T.green}>+ Novo</Btn>
      </div>

      <div style={{ padding: "12px 14px 0", display: "flex", flexDirection: "column", gap: 10 }}>
        {/* Search */}
        <div style={{ position: "relative" }}>
          <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontSize: 13, color: T.faint, pointerEvents: "none" }}>⌕</span>
          <input value={search} onChange={e => sSearch(e.target.value)} placeholder="Buscar por descrição, cliente ou categoria..."
            style={{ width: "100%", padding: "10px 12px 10px 30px", fontSize: 14, background: T.canvas, border: `1px solid ${T.border}`, borderRadius: 12, color: T.text, outline: "none" }} />
        </div>

        {/* Filters + sort */}
        <div style={{ display: "flex", gap: 5, overflowX: "auto", paddingBottom: 2 }}>
          {[
            { id: "todos",      l: "Todos"      },
            { id: "income",     l: "Receitas"   },
            { id: "expense",    l: "Gastos"     },
            { id: "investment", l: "Invest."    },
            { id: "mrr",        l: "MRR"        },
            { id: "caixa",      l: "Mov. Caixa" },
          ].map(f => (
            <button key={f.id} onClick={() => sFilter(f.id)} style={{
              flexShrink: 0, padding: "6px 12px", borderRadius: 99,
              border: `1px solid ${filter === f.id ? (f.id === "mrr" ? T.purple : f.id === "caixa" ? T.green : T.text) : T.border}`,
              background: filter === f.id ? (f.id === "mrr" ? T.purpleBg : f.id === "caixa" ? T.greenBg : T.text) : "transparent",
              color: filter === f.id ? (f.id === "mrr" ? T.purple : f.id === "caixa" ? T.green : "#fff") : T.sub,
              fontSize: 11, fontWeight: filter === f.id ? 600 : 400, transition: "all 0.14s", whiteSpace: "nowrap",
            }}>{f.l}</button>
          ))}
          <div style={{ width: 1, background: T.border, flexShrink: 0, margin: "0 2px" }} />
          {[{ id: "date", l: "Data" }, { id: "amount", l: "Valor" }].map(s => (
            <button key={s.id} onClick={() => setSort(s.id)} style={{
              flexShrink: 0, padding: "6px 12px", borderRadius: 99,
              border: `1px solid ${sort === s.id ? T.blue : T.border}`,
              background: sort === s.id ? T.blueBg : "transparent",
              color: sort === s.id ? T.blue : T.sub,
              fontSize: 11, fontWeight: sort === s.id ? 600 : 400, transition: "all 0.14s", whiteSpace: "nowrap",
            }}>{s.l}</button>
          ))}
        </div>

        {/* Summary bar */}
        {filtered.length > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 12px", background: T.canvas, borderRadius: 10, border: `1px solid ${T.border}` }}>
            <Mon v={BRLk(totInc)} sz={12} c={T.green} />
            <Txt sz={11} c={T.faint}>entradas</Txt>
            <div style={{ width: 1, height: 12, background: T.border }} />
            <Mon v={BRLk(totExp)} sz={12} c={T.red} />
            <Txt sz={11} c={T.faint}>saídas</Txt>
            <div style={{ flex: 1 }} />
            <Mon v={BRLk(totInc - totExp)} sz={12} c={totInc >= totExp ? T.green : T.red} />
          </div>
        )}

        {/* Delete confirmation modal */}
        {confirmId !== null && (
          <div style={{ background: T.redBg, border: `1px solid ${T.redBd}`, borderRadius: 14, padding: "14px 16px", display: "flex", flexDirection: "column", gap: 12 }}>
            <Txt sz={13} w={600} c={T.red} sx={{ display: "block" }}>Excluir este lançamento?</Txt>
            <Txt sz={12} c={T.sub} sx={{ display: "block" }}>Esta ação não pode ser desfeita.</Txt>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setConfirmId(null)} style={{ flex: 1, padding: "9px", borderRadius: 10, background: T.subtle, border: `1px solid ${T.border}`, fontSize: 13, fontWeight: 600, color: T.sub, cursor: "pointer" }}>Cancelar</button>
              <button onClick={confirmDelete} style={{ flex: 1, padding: "9px", borderRadius: 10, background: T.red, border: "none", fontSize: 13, fontWeight: 600, color: "#fff", cursor: "pointer" }}>Excluir</button>
            </div>
          </div>
        )}

        {/* List */}
        {filtered.length === 0
          ? <Card><EmptyState icon="🔍" title="Nenhum resultado" sub="Tente outro filtro ou busca" /></Card>
          : <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {grouped.map((g, gi) => (
                <div key={gi}>
                  {sort === "date" && <Txt sz={11} w={600} c={T.faint} sx={{ display: "block", marginBottom: 5, paddingLeft: 2 }}>{g.label}</Txt>}
                  <Card pad={false}>
                    {g.items.map((t, i) => {
                      const isLast = i === g.items.length - 1;
                      const hasItems = t.items && t.items.length > 0;
                      const isExpanded = expandedId === t.id;
                      return (
                        <div key={t.id}>
                          <RowItem last={isLast || isExpanded}>
                            <Dot color={CAT_CLR[t.cat] || T.faint} size={7} radius="2px" />
                            <div style={{ flex: 1, minWidth: 0, cursor: hasItems ? "pointer" : "default" }}
                              onClick={() => hasItems && setExpandedId(isExpanded ? null : t.id)}>
                              <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                                <Txt sz={13} w={500} sx={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.desc}</Txt>
                                <MrrBadge t={t} />
                                {t.isCaixaMov && (
                                  <span style={{ fontSize: 9, fontWeight: 700, color: T.green, background: T.greenBg, border: `1px solid ${T.greenBd}`, borderRadius: 99, padding: "1px 6px", whiteSpace: "nowrap", letterSpacing: "0.04em" }}>Caixa</span>
                                )}
                                {hasItems && <span style={{ fontSize: 9, color: T.faint }}>{isExpanded ? "▾" : "▸"} {t.items.length} {t.items.length === 1 ? "item" : "itens"}</span>}
                              </div>
                              <Txt sz={11} c={T.faint} sx={{ display: "block", marginTop: 1 }}>{t.client || t.cat} · {t.date.slice(5).replace("-", "/")}</Txt>
                            </div>
                            <Mon v={`${t.type === "income" ? "+" : "-"}${BRL(t.amount)}`} sz={13} c={t.type === "income" ? T.green : t.type === "investment" ? T.blue : T.red} />
                            <button onClick={() => handleDelete(t.id)} title="Excluir lançamento"
                              style={{ width: 26, height: 26, borderRadius: 8, background: T.subtle, border: `1px solid ${T.border}`, fontSize: 13, color: T.faint, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}>
                              ✕
                            </button>
                          </RowItem>
                          {isExpanded && hasItems && (
                            <div style={{ padding: "2px 16px 12px 27px", background: T.canvas, borderBottom: isLast ? "none" : `1px solid ${T.borderLight}` }}>
                              {t.items.map(it => (
                                <div key={it.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "4px 0" }}>
                                  <Txt sz={12} c={T.sub}>{it.name} <span style={{ color: T.faint }}>· {it.qty} × {BRL(it.unitPrice)}</span></Txt>
                                  <Mon v={BRL(it.total)} sz={12} c={T.text} />
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </Card>
                </div>
              ))}
            </div>
        }
      </div>
    </div>
  );
}

// ─── BILLS ───────────────────────────────────────────────────────────────────
export function BillsPage() {
  const { state, removeBill, payBill, openSheet } = useApp();
  const { bills } = state;

  const [filterType, sFilterType] = useState("todos");
  const { groups, totalPay, totalRec } = useBillGroups(bills, filterType);
  const done = useMemo(() => bills.filter(b => b.paid), [bills]);

  /**
   * Juros simples: Valor Atualizado = Original + (Original × Taxa × Períodos de atraso)
   * Taxa em %, Períodos = dias ou meses de atraso.
   * Só aplica em contas vencidas (dias < 0) com juros > 0.
   * Contas antigas sem campo juros retornam o valor original.
   */
  const calcUpdatedAmount = (b) => {
    const rate = parseFloat(b.juros) || 0;
    if (rate === 0) return { updated: b.amount, hasJuros: false };

    const daysLate = -diffD(b.dueDate); // positive when overdue
    if (daysLate <= 0) return { updated: b.amount, hasJuros: false };

    const periods = b.periodJuros === "dia" ? daysLate : daysLate / 30;
    const updated = b.amount + b.amount * (rate / 100) * periods;
    return { updated: Math.round(updated * 100) / 100, hasJuros: true };
  };

  return (
    <div className="page-shell" style={{ paddingBottom: 88, background: T.bg, minHeight: "100vh" }}>
      <div style={{ padding: "20px 18px 0", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div className="fluxy-brand" style={{ fontSize: 14, marginBottom: 2 }}>NOZIL</div>
          <Txt sz={22} w={700} sx={{ display: "block", letterSpacing: "-0.03em" }}>Contas</Txt>
        </div>
        <Btn onClick={() => openSheet(SHEETS.BILL)} variant="primary" sm color={T.purple}>+ Nova</Btn>
      </div>

      <div style={{ padding: "12px 14px 0", display: "flex", flexDirection: "column", gap: 10 }}>
        {/* Sumário */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7 }}>
          {[{ l: "A pagar", v: totalPay, c: T.red, bg: T.redBg, bd: T.redBd }, { l: "A receber", v: totalRec, c: T.green, bg: T.greenBg, bd: T.greenBd }].map(k => (
            <div key={k.l} style={{ background: k.bg, border: `1px solid ${k.bd}`, borderRadius: 12, padding: "10px 13px" }}>
              <Lbl sx={{ marginBottom: 4, fontSize: 9 }}>{k.l}</Lbl>
              <Mon v={BRLk(k.v)} sz={15} c={k.c} />
            </div>
          ))}
        </div>

        {/* Filter */}
        <div style={{ display: "flex", gap: 6 }}>
          {[{ id: "todos", l: "Todas" }, { id: "payable", l: "A pagar" }, { id: "receivable", l: "A receber" }].map(f => (
            <button key={f.id} onClick={() => sFilterType(f.id)} style={{ flex: 1, padding: "7px 0", borderRadius: 99, border: `1px solid ${filterType === f.id ? T.purple : T.border}`, background: filterType === f.id ? T.purpleBg : "transparent", color: filterType === f.id ? T.purple : T.sub, fontSize: 11, fontWeight: filterType === f.id ? 600 : 400, transition: "all 0.14s" }}>{f.l}</button>
          ))}
        </div>

        {/* Grouped by urgency */}
        {groups.length === 0
          ? <Card><EmptyState icon="✓" title="Nenhuma conta pendente" sub="Tudo em dia!" /></Card>
          : <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {groups.map(g => (
                <div key={g.label}>
                  <Txt sz={11} w={600} c={g.color} sx={{ display: "block", marginBottom: 6, paddingLeft: 2 }}>{g.label}</Txt>
                  <Card pad={false}>
                    {g.items.map((b, i) => {
                      const { updated, hasJuros } = calcUpdatedAmount(b);
                      return (
                        <RowItem key={b.id} last={i === g.items.length - 1} onDelete={() => removeBill(b.id)} onCheck={() => payBill(b)}>
                          <Dot color={b.type === "payable" ? T.red : T.green} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <Txt sz={13} w={500} sx={{ display: "block" }}>{b.desc}</Txt>
                            <div style={{ display: "flex", gap: 5, marginTop: 3, flexWrap: "wrap" }}>
                              <span style={{ fontSize: 10, fontWeight: 600, color: b.type === "payable" ? T.red : T.green, background: b.type === "payable" ? T.redBg : T.greenBg, border: `1px solid ${b.type === "payable" ? T.redBd : T.greenBd}`, borderRadius: 99, padding: "1px 7px" }}>{b.type === "payable" ? "pagar" : "receber"}</span>
                              <DueBadge days={diffD(b.dueDate)} />
                              {hasJuros && (
                                <span style={{ fontSize: 10, fontWeight: 600, color: T.amber, background: T.amberBg, border: `1px solid ${T.amberBd}`, borderRadius: 99, padding: "1px 7px" }}>
                                  +juros {parseFloat(b.juros)}% /{b.periodJuros === "dia" ? "dia" : "mês"}
                                </span>
                              )}
                            </div>
                            {hasJuros && (
                              <Txt sz={11} c={T.faint} sx={{ display: "block", marginTop: 3 }}>
                                Original: {BRL(b.amount)}
                              </Txt>
                            )}
                          </div>
                          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2 }}>
                            <Mon v={BRL(hasJuros ? updated : b.amount)} sz={13} c={b.type === "payable" ? T.red : T.green} />
                            {hasJuros && (
                              <Txt sz={10} c={T.amber} sx={{ display: "block" }}>c/ juros</Txt>
                            )}
                          </div>
                          <Btn onClick={() => payBill(b)} variant="secondary" sm>Baixar</Btn>
                        </RowItem>
                      );
                    })}
                  </Card>
                </div>
              ))}
            </div>
        }

        {/* Done */}
        {done.length > 0 && (
          <div>
            <SH title={`Concluídas (${done.length})`} />
            <Card pad={false}>
              {done.map((b, i) => (
                <RowItem key={b.id} last={i === done.length - 1}>
                  <Dot color={T.faint} />
                  <Txt sz={13} c={T.faint} sx={{ flex: 1, textDecoration: "line-through" }}>{b.desc}</Txt>
                  <Mon v={BRL(b.amount)} sz={13} c={T.faint} />
                  <button onClick={() => removeBill(b.id)} style={{ width: 22, height: 22, borderRadius: 99, background: T.subtle, border: `1px solid ${T.border}`, fontSize: 12, color: T.faint, display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
                </RowItem>
              ))}
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── CATALOG PAGE (Catálogos — Produtos + Funcionário + Assinaturas) ──────────
export function CatalogPage() {
  const {
    state, addCatalogItem, updateCatalogItem, removeCatalogItem,
    addTeamItem, updateTeamItem, removeTeamItem,
    openSheet, closeSheet,
  } = useApp();
  const { catalog, team, transactions, sheet } = state;

  const [search, setSearch]       = useState("");
  const [filter, setFilter]       = useState("todos"); // todos|product|employee|subscription
  const [confirmItem, setConfirmItem] = useState(null); // { id, kind } | null
  const dSearch = useDebounce(search, 250);

  const [editItem, setEditItem]   = useState(null);
  const [sheetOpen, setSheetOpen] = useState(false);       // CatalogSheet (Produto/Serviço)
  const [teamEditItem, setTeamEditItem]   = useState(null);
  const [teamSheetOpen, setTeamSheetOpen] = useState(false); // TeamSheet (Funcionário/Assinatura)

  const { filtered } = useUnifiedCatalogFilter(catalog, team, filter, dSearch);

  const handleSave = (item) => {
    if (catalog.find(c => c.id === item.id)) updateCatalogItem(item);
    else addCatalogItem(item);
    setSheetOpen(false);
    setEditItem(null);
  };
  const handleTeamSave = (item) => {
    if (team.find(m => m.id === item.id)) updateTeamItem(item);
    else addTeamItem(item);
    setTeamSheetOpen(false);
    setTeamEditItem(null);
  };

  const openNew      = () => { setEditItem(null); setSheetOpen(true); };
  const openNewTeam  = () => { setTeamEditItem(null); setTeamSheetOpen(true); };

  // Routes to the correct existing form based on the tapped item's kind —
  // exactly the same edit flows as before, just reached from one list.
  const openEditUnified = (item) => {
    if (item.kind === "product") { setEditItem(item); setSheetOpen(true); }
    else                          { setTeamEditItem(item); setTeamSheetOpen(true); }
  };
  const confirmDeleteUnified = () => {
    if (!confirmItem) return;
    if (confirmItem.kind === "product") removeCatalogItem(confirmItem.id);
    else removeTeamItem(confirmItem.id);
    setConfirmItem(null);
  };

  // "Precificação" shortcut from the Home screen: signals SHEETS.PRICING.
  // "Equipe" shortcut: signals SHEETS.TEAM. Both still just open the exact
  // same forms as before, no list shown first.
  useEffect(() => {
    if (sheet === SHEETS.PRICING) { openNew(); closeSheet(); }
  }, [sheet]);
  useEffect(() => {
    if (sheet === SHEETS.TEAM) { openNewTeam(); closeSheet(); }
  }, [sheet]);

  const teamMonthlyCost = (m) =>
    m.kind === "employee"
      ? (parseFloat(m.salary) || 0) + (m.costLines || []).reduce((s, l) => s + (parseFloat(l.value) || 0), 0)
      : (parseFloat(m.value) || 0);

  const nothingAtAll = catalog.length === 0 && team.length === 0;

  return (
    <div className="page-shell" style={{ paddingBottom: 88, background: T.bg, minHeight: "100vh" }}>
      <div style={{ padding: "20px 18px 0" }}>
        <div style={{ marginBottom: 14 }}>
          <div className="fluxy-brand" style={{ fontSize: 14, marginBottom: 2 }}>NOZIL</div>
          <Txt sz={22} w={700} sx={{ display: "block", letterSpacing: "-0.03em" }}>Catálogos</Txt>
        </div>

        {/* Botões de ação — criam diretamente, não são abas/seletor */}
        <div style={{ display: "flex", gap: 10 }}>
          <Btn onClick={openNew} variant="primary" color={T.blue} sx={{ flex: 1 }}>+ Produto</Btn>
          <Btn onClick={openNewTeam} variant="primary" color={T.blue} sx={{ flex: 1 }}>+ Equipe</Btn>
        </div>
      </div>

      <div style={{ padding: "12px 14px 0", display: "flex", flexDirection: "column", gap: 10 }}>

        {/* Busca única — em todos os registros */}
        <div style={{ position: "relative" }}>
          <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontSize: 13, color: T.faint, pointerEvents: "none" }}>⌕</span>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nome, tipo, cargo ou telefone…"
            style={{ width: "100%", padding: "10px 12px 10px 30px", fontSize: 14, background: T.canvas, border: `1px solid ${T.border}`, borderRadius: 12, color: T.text, outline: "none" }} />
        </div>

        {/* Filtro único — só filtra a lista abaixo, nunca troca de tela */}
        <div style={{ display: "flex", gap: 5, overflowX: "auto", paddingBottom: 2 }}>
          {[
            { id: "todos",        l: "Todos"        },
            { id: "product",      l: "Produtos"     },
            { id: "employee",     l: "Funcionários" },
            { id: "subscription", l: "Assinaturas"  },
          ].map(f => (
            <button key={f.id} onClick={() => setFilter(f.id)} style={{
              flexShrink: 0, padding: "6px 12px", borderRadius: 99,
              border: `1px solid ${filter === f.id ? T.text : T.border}`,
              background: filter === f.id ? T.text : "transparent",
              color: filter === f.id ? "#fff" : T.sub,
              fontSize: 11, fontWeight: filter === f.id ? 600 : 400, transition: "all 0.14s", whiteSpace: "nowrap",
            }}>{f.l}</button>
          ))}
        </div>

        {/* Delete confirmation — único, para qualquer tipo de registro */}
        {confirmItem !== null && (
          <div style={{ background: T.redBg, border: `1px solid ${T.redBd}`, borderRadius: 14, padding: "14px 16px", display: "flex", flexDirection: "column", gap: 12 }}>
            <Txt sz={13} w={600} c={T.red} sx={{ display: "block" }}>Excluir este item?</Txt>
            <Txt sz={12} c={T.sub} sx={{ display: "block" }}>Esta ação não pode ser desfeita.</Txt>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setConfirmItem(null)}
                style={{ flex: 1, padding: "9px", borderRadius: 10, background: T.subtle, border: `1px solid ${T.border}`, fontSize: 13, fontWeight: 600, color: T.sub, cursor: "pointer" }}>Cancelar</button>
              <button onClick={confirmDeleteUnified}
                style={{ flex: 1, padding: "9px", borderRadius: 10, background: T.red, border: "none", fontSize: 13, fontWeight: 600, color: "#fff", cursor: "pointer" }}>Excluir</button>
            </div>
          </div>
        )}

        {/* Lista única — Produtos + Funcionários + Assinaturas, mesmo Card/RowItem de sempre */}
        {filtered.length === 0 ? (
          <Card><EmptyState icon="◧" title={nothingAtAll ? "Nenhum item cadastrado" : "Nenhum resultado"} sub={nothingAtAll ? "Clique em + Novo para começar" : "Tente outra busca ou filtro"} /></Card>
        ) : (
          <Card pad={false}>
            {filtered.map((item, i) => (
              <RowItem key={`${item.kind}-${item.id}`} last={i === filtered.length - 1}>
                {item.kind === "product" ? (
                  <>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 2 }}>
                        <Txt sz={13} w={600} sx={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.name}</Txt>
                        <span style={{ fontSize: 9, fontWeight: 600, color: T.blue, background: T.blueBg, border: `1px solid ${T.blueBd}`, borderRadius: 99, padding: "1px 7px", whiteSpace: "nowrap" }}>{item.type}</span>
                      </div>
                      {item.desc ? <Txt sz={11} c={T.faint} sx={{ display: "block" }}>{item.desc}</Txt> : null}
                      {item.finalPrice > 0 && <Txt sz={11} c={T.sub} sx={{ display: "block", marginTop: 2 }}>Preço final: <span style={{ color: T.green, fontWeight: 600 }}>R$ {item.finalPrice.toFixed(2).replace(".", ",")}</span></Txt>}
                    </div>
                  </>
                ) : (
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 2 }}>
                      <Txt sz={13} w={600} sx={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.name}</Txt>
                      <span style={{
                        fontSize: 9, fontWeight: 600, borderRadius: 99, padding: "1px 7px", whiteSpace: "nowrap",
                        color: item.kind === "employee" ? T.blue : T.purple,
                        background: item.kind === "employee" ? T.blueBg : T.purpleBg,
                        border: `1px solid ${item.kind === "employee" ? T.blueBd : T.purpleBd}`,
                      }}>
                        {item.kind === "employee" ? "Funcionário" : "Assinatura"}
                      </span>
                    </div>
                    <Txt sz={11} c={T.faint} sx={{ display: "block" }}>
                      {item.kind === "employee" ? (item.role || "Sem cargo definido") : item.cat}
                      {item.kind === "employee" && item.phone ? ` · ${item.phone}` : ""}
                    </Txt>
                  </div>
                )}
                {item.kind !== "product" && <Mon v={`R$ ${teamMonthlyCost(item).toFixed(2)}`} sz={12} c={T.text} />}
                <button onClick={() => openEditUnified(item)}
                  style={{ width: 26, height: 26, borderRadius: 8, background: T.subtle, border: `1px solid ${T.border}`, fontSize: 13, color: T.sub, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>✎</button>
                <button onClick={() => setConfirmItem({ id: item.id, kind: item.kind })}
                  style={{ width: 26, height: 26, borderRadius: 8, background: T.subtle, border: `1px solid ${T.border}`, fontSize: 13, color: T.faint, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>✕</button>
              </RowItem>
            ))}
          </Card>
        )}
      </div>

      {/* Both sheets rendered here locally since they need editItem state — exact same forms as before */}
      <CatalogSheetInline open={sheetOpen} onClose={() => { setSheetOpen(false); setEditItem(null); }} onSave={handleSave} editItem={editItem} />
      <TeamSheetInline
        open={teamSheetOpen}
        onClose={() => { setTeamSheetOpen(false); setTeamEditItem(null); }}
        onSave={handleTeamSave}
        editItem={teamEditItem}
        transactions={transactions}
      />
    </div>
  );
}

