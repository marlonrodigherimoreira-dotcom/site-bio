// ─── THEME TOKENS ─────────────────────────────────────────────────────────────
export const T = {
  bg:"#f7f7f5", canvas:"#ffffff", subtle:"#f4f4f2",
  border:"#e8e8e5", borderLight:"#f0f0ed",
  text:"#0f0f0e", sub:"#6b6b66", faint:"#ababA4",
  green:"#059669", greenBg:"#ecfdf5", greenBd:"#a7f3d0",
  red:"#dc2626",   redBg:"#fef2f2",   redBd:"#fecaca",
  blue:"#2563eb",  blueBg:"#eff6ff",  blueBd:"#bfdbfe",
  amber:"#d97706", amberBg:"#fffbeb", amberBd:"#fde68a",
  purple:"#7c3aed",purpleBg:"#f5f3ff",purpleBd:"#ddd6fe",
  brand:"#E60023",
};

// ─── SHADOWS ──────────────────────────────────────────────────────────────────
export const Sh = {
  xs:"0 1px 2px rgba(0,0,0,0.04)",
  sm:"0 1px 3px rgba(0,0,0,0.06),0 1px 2px rgba(0,0,0,0.04)",
  sheet:"0 -4px 32px rgba(0,0,0,0.09),0 -1px 4px rgba(0,0,0,0.04)",
};

// ─── FONTS ────────────────────────────────────────────────────────────────────
export const F = {
  sans:"-apple-system,BlinkMacSystemFont,'SF Pro Text','Inter','Segoe UI',sans-serif",
  mono:"'DM Mono','SF Mono','Fira Code','Courier New',monospace",
};

// ─── CATEGORIES ───────────────────────────────────────────────────────────────
export const CATS = ["Serviço","Produto","Consultoria","Marketing","Software","Pessoal","Outros"];

export const CAT_CLR = {
  Serviço:    T.green,
  Produto:    T.blue,
  Consultoria:T.purple,
  Marketing:  T.amber,
  Software:   "#06b6d4",
  Pessoal:    T.red,
  Outros:     T.faint,
};

// ─── TRANSACTION TYPES ────────────────────────────────────────────────────────
export const TX_TYPES = {
  INCOME:     "income",
  EXPENSE:    "expense",
  INVESTMENT: "investment",
};

// ─── BILL TYPES ───────────────────────────────────────────────────────────────
export const BILL_TYPES = {
  PAYABLE:    "payable",
  RECEIVABLE: "receivable",
};

// ─── NAVIGATION ───────────────────────────────────────────────────────────────
export const NAV_ITEMS = [
  { id:"home",     label:"Início",      icon:"⌂" },
  { id:"entries",  label:"Lançamentos", icon:"↕" },
  { id:"bills",    label:"Contas",      icon:"◷" },
  { id:"catalog",  label:"Catálogo",    icon:"◧" },
];

// ─── SHEET IDS ────────────────────────────────────────────────────────────────
export const SHEETS = {
  ENTRY:    "entry",
  BILL:     "bill",
  PRICING:  "pricing",
  SETTINGS: "settings",
  NOTES:    "notes",
  BACKUP:   "backup",
  CATALOG:  "catalog",
  CAIXA:    "caixa",
  IMPORT:   "import",
  CALENDAR: "calendar",
  TEAM:     "team",
  CALCULATOR: "calculator",
};

// ─── CALENDAR ─────────────────────────────────────────────────────────────────
export const WEEKDAYS_SHORT = ["D", "S", "T", "Q", "Q", "S", "S"]; // Domingo..Sábado

// ─── STATUS LABELS ────────────────────────────────────────────────────────────
export const statusOf = (margin, profit = 1) => {
  if (profit < 0)    return { label:"Crítica",   c:T.red,    bg:T.redBg,    bd:T.redBd    };
  if (margin >= 40)  return { label:"Excelente",  c:T.green,  bg:T.greenBg,  bd:T.greenBd  };
  if (margin >= 25)  return { label:"Boa",         c:T.green,  bg:T.greenBg,  bd:T.greenBd  };
  if (margin >= 10)  return { label:"Aceitável",   c:T.amber,  bg:T.amberBg,  bd:T.amberBd  };
  return                    { label:"Atenção",     c:T.amber,  bg:T.amberBg,  bd:T.amberBd  };
};

// ─── GLOBAL CSS ───────────────────────────────────────────────────────────────
export const GLOBAL_CSS = `
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
  html{-webkit-text-size-adjust:100%;font-size:16px;}
  body{background:${T.bg};font-family:${F.sans};color:${T.text};-webkit-font-smoothing:antialiased;}
  .fluxy-brand{font-family:'Rubik Spray Paint',cursive;color:#E60023;font-size:22px;letter-spacing:0.01em;line-height:1;}
  .calc-btn{transition:transform 0.08s ease, filter 0.08s ease; cursor:pointer;}
  .calc-btn:hover{filter:brightness(0.96);}
  .calc-btn:focus-visible{outline:2px solid #E60023; outline-offset:2px;}
  .calc-btn:active{transform:scale(0.94);}
  input,select,textarea,button{font-family:inherit;}
  input[type=number]::-webkit-inner-spin-button{-webkit-appearance:none;}
  input[type=range]{-webkit-appearance:none;appearance:none;height:3px;background:${T.border};border-radius:99px;outline:none;cursor:pointer;width:100%;}
  input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:18px;height:18px;border-radius:50%;background:${T.blue};box-shadow:0 1px 4px rgba(37,99,235,0.35);cursor:pointer;}
  ::-webkit-scrollbar{display:none;}
  *{-ms-overflow-style:none;scrollbar-width:none;}
  button{-webkit-tap-highlight-color:transparent;cursor:pointer;border:none;background:none;}
  @keyframes fadeUp{from{opacity:0;transform:translateY(10px);}to{opacity:1;transform:translateY(0);}}
  @keyframes fadeIn{from{opacity:0;}to{opacity:1;}}
  @keyframes sheetUp{from{transform:translateY(100%);}to{transform:translateY(0);}}
  @keyframes slideRight{from{opacity:0;transform:translateX(-10px);}to{opacity:1;transform:translateX(0);}}
  .fade-up{animation:fadeUp 0.22s cubic-bezier(0.16,1,0.3,1) both;}
  .fade-in{animation:fadeIn 0.16s ease both;}
  .sheet-up{animation:sheetUp 0.28s cubic-bezier(0.16,1,0.3,1) both;}
  .slide-right{animation:slideRight 0.18s ease both;}
  .swipe-container{position:relative;overflow:hidden;}
  .swipe-content{will-change:transform;}

  /* ── Responsive page shell (mobile unchanged; widens on tablet/desktop) ── */
  .page-shell{max-width:480px;margin:0 auto;}
  @media (min-width:768px){.page-shell{max-width:720px;}}
  @media (min-width:1024px){.page-shell{max-width:1140px;}}

  /* ── Home content wrapper ── */
  .home-content{padding:12px 14px 0;display:flex;flex-direction:column;gap:10px;}

  /* ── Tablet & Desktop (≥768px): pair Lucro Líquido + Fluxo Previsto ──
     Everything else (Vencendo em breve, Alerta, PDF, Ações Rápidas,
     Lançamentos Recentes) stays a single full-width column, stacked
     in priority order — no sidebar, no independent columns.        */
  .hg-row{display:flex;flex-direction:column;gap:10px;}
  @media (min-width:768px){
    .hg-row{display:grid;grid-template-columns:1fr 1fr;gap:10px;align-items:start;}
  }
  @media (min-width:1024px){
    /* Lucro Líquido keeps the larger share — it's the headline metric */
    .hg-row{grid-template-columns:1.3fr 1fr;gap:16px;}
  }

  /* ── Quick actions ── */
  .qa-primary-grid{gap:7px;}
  .qa-item{padding:13px 8px;}
  .qa-secondary-grid{gap:7px;}

  /* ── Fluxo Previsto card ── */
  .fluxo-card-inner{padding:12px 16px;}
  .fluxo-grid{gap:4px;}
  .fluxo-cell{padding:9px 10px;}

  /* ── KPI card (Lucro Líquido) ── */
  .kpi-head{padding:16px 18px 12px;}
  .kpi-cell{padding:9px 11px;}

  /* ── PDF card ── */
  .pdf-card{padding:16px 18px;gap:14px;}
`;
