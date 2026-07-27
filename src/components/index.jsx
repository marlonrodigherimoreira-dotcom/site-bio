/**
 * components/index.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * All shared UI primitives. Import from here in any page/sheet.
 */

import { useState, useEffect, useRef, memo, forwardRef, useImperativeHandle } from "react";
import { T, Sh, F, statusOf } from "../constants";
import { clamp } from "../utils/currency";
import { diffD } from "../utils/date";

// ─── TYPOGRAPHY ──────────────────────────────────────────────────────────────
export const Txt = memo(({ sz = 14, w = 400, c = T.text, children, sx = {} }) => (
  <span style={{ fontSize: sz, fontWeight: w, color: c, fontFamily: F.sans, lineHeight: 1.45, ...sx }}>
    {children}
  </span>
));

export const Mon = memo(({ v, sz = 16, c = T.text, sx = {} }) => (
  <span style={{ fontFamily: F.mono, fontSize: sz, fontWeight: 600, color: c, letterSpacing: "-0.025em", ...sx }}>
    {v}
  </span>
));

export const Lbl = memo(({ children, c = T.faint, sx = {} }) => (
  <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: c, ...sx }}>
    {children}
  </div>
));

export const Div = memo(() => <div style={{ height: 1, background: T.border }} />);

export const Dot = memo(({ color, size = 8, radius = "50%" }) => (
  <div style={{ width: size, height: size, borderRadius: radius, background: color, flexShrink: 0 }} />
));

// ─── BADGES ──────────────────────────────────────────────────────────────────
export const StatusBadge = memo(({ margin, profit }) => {
  const s = statusOf(margin, profit);
  return (
    <span style={{ fontSize: 11, fontWeight: 600, color: s.c, background: s.bg, border: `1px solid ${s.bd}`, borderRadius: 99, padding: "2px 8px", whiteSpace: "nowrap" }}>
      {s.label}
    </span>
  );
});

export const TrendChip = memo(({ value }) => {
  if (value == null) return null;
  const up = value >= 0;
  return (
    <span style={{ fontSize: 11, fontWeight: 600, color: up ? T.green : T.red, display: "inline-flex", alignItems: "center", gap: 2, background: up ? T.greenBg : T.redBg, border: `1px solid ${up ? T.greenBd : T.redBd}`, borderRadius: 99, padding: "1px 6px" }}>
      {up ? "↑" : "↓"}{Math.abs(value).toFixed(0)}%
    </span>
  );
});

export const DueBadge = memo(({ days }) => {
  let c = T.faint, bg = T.subtle, bd = T.border, lbl = `em ${days}d`;
  if (days < 0)      { c = T.red;   bg = T.redBg;   bd = T.redBd;   lbl = `${Math.abs(days)}d atrasado`; }
  else if (days === 0){ c = T.red;   bg = T.redBg;   bd = T.redBd;   lbl = "hoje"; }
  else if (days <= 2) { c = T.amber; bg = T.amberBg; bd = T.amberBd; lbl = `em ${days}d`; }
  return (
    <span style={{ fontSize: 10, fontWeight: 600, color: c, background: bg, border: `1px solid ${bd}`, borderRadius: 99, padding: "2px 8px", whiteSpace: "nowrap" }}>
      {lbl}
    </span>
  );
});

// ─── INTERACTIVE ─────────────────────────────────────────────────────────────
export const Press = memo(({ onClick, children, sx = {}, className }) => {
  const [p, sP] = useState(false);
  return (
    <div onClick={onClick} className={className}
      onMouseDown={() => sP(true)} onMouseUp={() => sP(false)} onMouseLeave={() => sP(false)}
      onTouchStart={() => sP(true)} onTouchEnd={() => sP(false)}
      style={{ cursor: "pointer", transform: p ? "scale(0.97)" : "scale(1)", transition: "transform 0.11s ease", ...sx }}>
      {children}
    </div>
  );
});

// ─── BUTTON ──────────────────────────────────────────────────────────────────
export const Btn = memo(({ children, onClick, variant = "primary", color, full = false, sm = false, icon, disabled = false, sx = {} }) => {
  const [p, sP] = useState(false);
  const base = {
    display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6,
    fontWeight: 600, borderRadius: 13, cursor: disabled ? "not-allowed" : "pointer",
    fontSize: sm ? 13 : 15, padding: sm ? "8px 14px" : "13px 20px",
    fontFamily: F.sans, letterSpacing: "-0.01em",
    transition: "all 0.11s ease",
    width: full ? "100%" : undefined,
    opacity: disabled ? 0.5 : 1,
    transform: p && !disabled ? "scale(0.97) translateY(0.5px)" : "scale(1)",
  };
  const vars = {
    primary:   { background: color || T.text, color: "#fff", boxShadow: p ? Sh.xs : Sh.sm },
    secondary: { background: T.subtle, color: T.text, border: `1px solid ${T.border}` },
    ghost:     { background: "transparent", color: T.sub },
    danger:    { background: T.redBg, color: T.red, border: `1px solid ${T.redBd}` },
  };
  return (
    <button onClick={disabled ? undefined : onClick} disabled={disabled}
      onMouseDown={() => !disabled && sP(true)} onMouseUp={() => sP(false)} onMouseLeave={() => sP(false)}
      onTouchStart={() => !disabled && sP(true)} onTouchEnd={() => sP(false)}
      style={{ ...base, ...vars[variant], ...sx }}>
      {icon && <span>{icon}</span>}
      {children}
    </button>
  );
});

// ─── INPUTS ──────────────────────────────────────────────────────────────────
export const Input = memo(({ label, value, onChange, type = "text", placeholder, prefix, inputMode, list, mono, autoFocus, hint, onBlur, sx = {} }) => {
  const [f, sF] = useState(false);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5, ...sx }}>
      {label && <label style={{ fontSize: 12, fontWeight: 500, color: T.sub }}>{label}</label>}
      <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
        {prefix && <span style={{ position: "absolute", left: 12, fontSize: 14, color: T.faint, fontFamily: mono ? F.mono : F.sans, pointerEvents: "none" }}>{prefix}</span>}
        <input autoFocus={autoFocus} type={type} inputMode={inputMode} list={list}
          placeholder={placeholder} value={value} onChange={e => onChange(e.target.value)}
          onFocus={() => sF(true)} onBlur={() => { sF(false); onBlur?.(); }}
          style={{ width: "100%", padding: prefix ? "12px 12px 12px 30px" : "12px", fontSize: mono ? 18 : 15, fontFamily: mono ? F.mono : F.sans, fontWeight: mono ? 600 : 400, background: T.subtle, border: `1.5px solid ${f ? T.blue : T.border}`, borderRadius: 12, color: T.text, outline: "none", transition: "border-color 0.15s, box-shadow 0.15s", letterSpacing: mono ? "-0.025em" : "normal", boxShadow: f ? `0 0 0 3px ${T.blue}1a` : "none" }} />
      </div>
      {hint && <Txt sz={11} c={T.faint}>{hint}</Txt>}
    </div>
  );
});

/**
 * MoneyInput — monetary field with automatic BRL formatting on blur.
 *
 * While focused: shows the raw number the user is typing (e.g. "2300").
 * While blurred: shows formatted BRL (e.g. "2.300,00") with R$ prefix.
 *
 * `value`    : plain numeric string stored by the parent (e.g. "2300" or "2300.50")
 * `onChange` : receives the same plain string — NO change to save logic needed
 */
export const MoneyInput = memo(({ label, value = "", onChange, hint, autoFocus, onBlur, sx = {} }) => {
  const [focused, setFocused] = useState(false);

  const formatted = (() => {
    const n = parseFloat(value);
    if (!value || isNaN(n)) return "";
    return new Intl.NumberFormat("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(n);
  })();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5, ...sx }}>
      {label && <label style={{ fontSize: 12, fontWeight: 500, color: T.sub }}>{label}</label>}
      <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
        <span style={{ position: "absolute", left: 12, fontSize: 14, color: T.faint, fontFamily: F.mono, pointerEvents: "none" }}>R$</span>
        <input
          autoFocus={autoFocus}
          type={focused ? "number" : "text"}
          inputMode="decimal"
          value={focused ? value : formatted}
          onChange={e => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => { setFocused(false); onBlur?.(); }}
          placeholder="0,00"
          style={{
            width: "100%", padding: "12px 12px 12px 30px",
            fontSize: 18, fontFamily: F.mono, fontWeight: 600,
            background: T.subtle,
            border: `1.5px solid ${focused ? T.blue : T.border}`,
            borderRadius: 12, color: T.text, outline: "none",
            transition: "border-color 0.15s, box-shadow 0.15s",
            letterSpacing: "-0.025em",
            boxShadow: focused ? `0 0 0 3px ${T.blue}1a` : "none",
          }}
        />
      </div>
      {hint && <Txt sz={11} c={T.faint}>{hint}</Txt>}
    </div>
  );
});


export const Sel = memo(({ label, value, onChange, options }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
    {label && <label style={{ fontSize: 12, fontWeight: 500, color: T.sub }}>{label}</label>}
    <select value={value} onChange={e => onChange(e.target.value)}
      style={{ width: "100%", padding: "12px", fontSize: 15, background: T.subtle, border: `1.5px solid ${T.border}`, borderRadius: 12, color: T.text, outline: "none", appearance: "none", WebkitAppearance: "none" }}>
      {options.map(o => <option key={o.value || o} value={o.value || o}>{o.label || o}</option>)}
    </select>
  </div>
));

export const TypeToggle = memo(({ value, onChange, opts }) => (
  <div style={{ display: "flex", background: T.subtle, borderRadius: 12, padding: 3, gap: 3, border: `1px solid ${T.border}` }}>
    {opts.map(o => {
      const a = value === o.val;
      return (
        <button key={o.val} onClick={() => onChange(o.val)}
          style={{ flex: 1, padding: "9px 0", borderRadius: 9, fontSize: 14, fontWeight: a ? 600 : 400, background: a ? T.canvas : T.subtle, color: a ? T.text : T.sub, border: a ? `1px solid ${T.border}` : "1px solid transparent", boxShadow: a ? Sh.xs : "none", transition: "all 0.13s ease" }}>
          {o.label}
        </button>
      );
    })}
  </div>
));

// ─── LAYOUT BLOCKS ───────────────────────────────────────────────────────────
export const Card = memo(({ children, sx = {}, pad = true, anim }) => (
  <div className={anim} style={{ background: T.canvas, border: `1px solid ${T.border}`, borderRadius: 20, boxShadow: Sh.sm, overflow: "hidden", ...(pad ? { padding: "16px" } : {}), ...sx }}>
    {children}
  </div>
));

export const SH = memo(({ title, action, sx = {} }) => (
  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, ...sx }}>
    <Txt sz={12} w={600} c={T.sub}>{title}</Txt>
    {action}
  </div>
));

export const EmptyState = memo(({ icon, title, sub }) => (
  <div style={{ padding: "36px 20px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
    <div style={{ fontSize: 28, marginBottom: 4 }}>{icon}</div>
    <Txt sz={14} w={600}>{title}</Txt>
    {sub && <Txt sz={13} c={T.sub}>{sub}</Txt>}
  </div>
));

// ─── SWIPEABLE ROW ────────────────────────────────────────────────────────────
export function RowItem({ children, last = false, pad = "12px 16px", sx = {}, onDelete, onCheck }) {
  const startX = useRef(null);
  const [offset, setOffset] = useState(0);
  const [revealed, setRevealed] = useState(false);

  const onTS = e => { startX.current = e.touches[0].clientX; };
  const onTM = e => {
    if (startX.current === null) return;
    const dx = e.touches[0].clientX - startX.current;
    if (onDelete && dx < 0) setOffset(clamp(dx, -80, 0));
    if (onCheck  && dx > 0) setOffset(clamp(dx, 0, 64));
  };
  const onTE = () => {
    if (offset < -48)        { setRevealed(true); setOffset(-72); }
    else if (offset > 40 && onCheck) { onCheck(); setOffset(0); }
    else setOffset(0);
    startX.current = null;
  };
  const reset = () => { setOffset(0); setRevealed(false); };

  return (
    <div className="swipe-container" style={{ borderBottom: last ? "none" : `1px solid ${T.borderLight}`, ...sx }}>
      {onDelete && revealed && (
        <div style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: 72, background: T.red, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
          onClick={() => { reset(); onDelete(); }}>
          <span style={{ color: "#fff", fontSize: 18 }}>✕</span>
        </div>
      )}
      {onCheck && (
        <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 64, background: T.green, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{ color: "#fff", fontSize: 18 }}>✓</span>
        </div>
      )}
      <div className="swipe-content" onTouchStart={onTS} onTouchMove={onTM} onTouchEnd={onTE}
        style={{ display: "flex", alignItems: "center", gap: 10, padding: pad, background: T.canvas, transform: `translateX(${offset}px)`, transition: startX.current === null ? "transform 0.22s cubic-bezier(0.16,1,0.3,1)" : "none" }}>
        {children}
      </div>
    </div>
  );
}

// ─── BOTTOM SHEET ────────────────────────────────────────────────────────────
export function Sheet({ open, onClose, title, children }) {
  if (!open) return null;
  return (
    <div className="fade-in" onClick={onClose}
      style={{ position: "fixed", inset: 0, zIndex: 500, background: "rgba(0,0,0,0.3)", backdropFilter: "blur(4px)", WebkitBackdropFilter: "blur(4px)", display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
      <div className="sheet-up" onClick={e => e.stopPropagation()}
        style={{ background: T.canvas, borderRadius: "22px 22px 0 0", boxShadow: Sh.sheet, maxWidth: 480, width: "100%", margin: "0 auto", maxHeight: "92vh", display: "flex", flexDirection: "column", border: `1px solid ${T.border}`, borderBottom: "none" }}>
        <div style={{ display: "flex", justifyContent: "center", padding: "10px 0 4px" }}>
          <div style={{ width: 32, height: 3.5, borderRadius: 99, background: T.border }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 20px 14px" }}>
          <Txt sz={17} w={600}>{title}</Txt>
          <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: 99, background: T.subtle, border: `1px solid ${T.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, color: T.sub }}>✕</button>
        </div>
        <div style={{ padding: "0 20px 32px", overflow: "auto", flex: 1 }}>{children}</div>
      </div>
    </div>
  );
}

// ─── TOOLTIP ─────────────────────────────────────────────────────────────────
/**
 * Tooltip — a small "?" button that shows a short explanation inline.
 * Clicking toggles the tip; clicking outside closes it.
 * No portals, no z-index fights, no external deps.
 */
export const Tooltip = memo(({ text, flip = false, dir }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    document.addEventListener("touchstart", handler);
    return () => { document.removeEventListener("mousedown", handler); document.removeEventListener("touchstart", handler); };
  }, [open]);

  // dir="down-center": opens below, centered (Gastos on mobile)
  // dir="up-center":   opens above, centered (ROI on mobile)
  // flip=true:         opens leftward (MRR on desktop)
  // default:           opens rightward
  const getStyle = () => {
    if (dir === "down-center") return {
      position: "absolute", top: "calc(100% + 8px)",
      left: "50%", transform: "translateX(-50%)",
      background: T.text, color: "#fff",
      fontSize: 11, lineHeight: 1.55, fontWeight: 400,
      padding: "7px 11px", borderRadius: 10,
      whiteSpace: "normal", width: 190,
      boxShadow: "0 4px 16px rgba(0,0,0,0.18)",
      zIndex: 600, pointerEvents: "none",
    };
    if (dir === "up-center") return {
      position: "absolute", bottom: "calc(100% + 8px)",
      left: "50%", transform: "translateX(-50%)",
      background: T.text, color: "#fff",
      fontSize: 11, lineHeight: 1.55, fontWeight: 400,
      padding: "7px 11px", borderRadius: 10,
      whiteSpace: "normal", width: 190,
      boxShadow: "0 4px 16px rgba(0,0,0,0.18)",
      zIndex: 600, pointerEvents: "none",
    };
    return {
      position: "absolute",
      ...(flip ? { right: 22, left: "auto" } : { left: 22 }),
      top: "50%", transform: "translateY(-50%)",
      background: T.text, color: "#fff",
      fontSize: 11, lineHeight: 1.55, fontWeight: 400,
      padding: "7px 11px", borderRadius: 10,
      whiteSpace: "normal", width: 220,
      boxShadow: "0 4px 16px rgba(0,0,0,0.18)",
      zIndex: 600, pointerEvents: "none",
    };
  };

  return (
    <span ref={ref} style={{ position: "relative", display: "inline-flex", alignItems: "center", verticalAlign: "middle" }}>
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(o => !o); }}
        style={{
          width: 16, height: 16, borderRadius: "50%",
          background: open ? T.blue : T.subtle,
          border: `1px solid ${open ? T.blue : T.border}`,
          color: open ? "#fff" : T.sub,
          fontSize: 10, fontWeight: 700, lineHeight: 1,
          cursor: "pointer", display: "inline-flex",
          alignItems: "center", justifyContent: "center",
          flexShrink: 0, transition: "all 0.13s",
          marginLeft: 5,
        }}
        title={text}
      >?</button>
      {open && (
        <span style={getStyle()}>
          {text}
        </span>
      )}
    </span>
  );
});


// ─── BOTTOM NAV ──────────────────────────────────────────────────────────────
import { NAV_ITEMS } from "../constants";

export const BottomNav = memo(({ tab, setTab, billAlerts = 0 }) => (
  <nav style={{ position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", zIndex: 300, background: "rgba(247,247,245,0.96)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", borderTop: `1px solid ${T.border}`, display: "flex", width: "100%", maxWidth: 480, paddingBottom: "env(safe-area-inset-bottom,6px)" }}>
    {NAV_ITEMS.map(({ id, label, icon }) => {
      const a = tab === id;
      return (
        <button key={id} onClick={() => setTab(id)}
          style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", padding: "10px 0 8px", gap: 3, position: "relative" }}>
          <div style={{ width: 36, height: 26, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", background: a ? `${T.text}0f` : "transparent", transition: "background 0.15s" }}>
            <span style={{ fontSize: 16, color: a ? T.text : T.faint, lineHeight: 1, transition: "color 0.15s" }}>{icon}</span>
          </div>
          <span style={{ fontSize: 10, fontWeight: a ? 600 : 400, color: a ? T.text : T.faint, letterSpacing: "0.01em", transition: "color 0.15s" }}>{label}</span>
          {id === "bills" && billAlerts > 0 && (
            <div style={{ position: "absolute", top: 8, right: "calc(50% - 18px)", background: T.red, borderRadius: 99, minWidth: 14, height: 14, display: "flex", alignItems: "center", justifyContent: "center", border: `2px solid ${T.bg}`, boxShadow: Sh.xs }}>
              <span style={{ fontSize: 8, color: "#fff", fontWeight: 700, lineHeight: 1, padding: "0 2px" }}>{billAlerts}</span>
            </div>
          )}
        </button>
      );
    })}
  </nav>
));

// ─── COST LINES EDITOR ────────────────────────────────────────────────────────
/**
 * Reusable "dynamic name+value list" editor — same pattern as the "Itens de
 * custo" block in CatalogSheet (add as many lines as needed, remove any of
 * them individually, auto-commits on blur so nothing typed gets lost).
 *
 * Built as its own component so new features (like Equipe's "Benefícios /
 * Custos") can reuse this exact interaction instead of re-implementing it.
 * CatalogSheet's own inline implementation is left untouched to avoid any
 * risk to its already-shipped real-time cost/margin preview.
 *
 * Exposes commitPending() via ref so a parent's save() can flush a still
 * unblurred line before persisting — same safety net CatalogSheet has.
 */
export const CostLinesEditor = forwardRef(function CostLinesEditor(
  { lines, onChange, label = "Itens de custo", tooltip, namePlaceholder = "Nome", addLabel = "+ Adicionar", showDesc = true },
  ref
) {
  const [name, setName]   = useState("");
  const [value, setValue] = useState("");
  const [desc, setDesc]   = useState("");

  const hasPending = name.trim() !== "" && value !== "" && !isNaN(parseFloat(value));

  const commit = () => {
    if (!hasPending) return;
    onChange([...lines, { id: Date.now(), name: name.trim(), value, desc }]);
    setName(""); setValue(""); setDesc("");
  };

  useImperativeHandle(ref, () => ({
    commitPending: () => {
      if (hasPending) onChange([...lines, { id: Date.now(), name: name.trim(), value, desc }]);
    },
  }), [hasPending, name, value, desc, lines, onChange]);

  const remove = (id) => onChange(lines.filter(l => l.id !== id));

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 8 }}>
        <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: T.faint }}>{label}</div>
        {tooltip && <Tooltip text={tooltip} />}
      </div>
      {lines.map(l => (
        <div key={l.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 10px", background: T.subtle, borderRadius: 10, marginBottom: 6, border: `1px solid ${T.border}` }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <Txt sz={13} w={500} sx={{ display: "block" }}>{l.name}</Txt>
            {l.desc ? <Txt sz={11} c={T.faint} sx={{ display: "block" }}>{l.desc}</Txt> : null}
          </div>
          <Mon v={`R$${parseFloat(l.value || 0).toFixed(2)}`} sz={13} c={T.text} />
          <button onClick={() => remove(l.id)}
            style={{ width: 22, height: 22, borderRadius: 99, background: T.redBg, border: `1px solid ${T.redBd}`, fontSize: 11, color: T.red, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
        </div>
      ))}
      <div style={{ background: T.subtle, borderRadius: 12, padding: "10px 12px", border: `1px solid ${T.border}`, display: "flex", flexDirection: "column", gap: 7 }}>
        <Txt sz={11} c={T.sub} sx={{ display: "block" }}>Adicionar {label.toLowerCase()}</Txt>
        <Input value={name} onChange={setName} onBlur={commit} placeholder={namePlaceholder} />
        <MoneyInput value={value} onChange={setValue} onBlur={commit} />
        {showDesc && <Input value={desc} onChange={setDesc} onBlur={commit} placeholder="Descrição (opcional)" />}
        <Btn onClick={commit} variant="secondary" sm full>{addLabel}</Btn>
      </div>
    </div>
  );
});

// ─── PRODUCT LINES EDITOR ───────────────────────────────────────────────────────
/**
 * Reusable "Produtos adicionais" editor — used alongside (never instead of)
 * an entry's main product fields. Each line: Produto / Quantidade / Valor
 * unitário / Total (computed live), with its own "Selecionar do Catálogo"
 * picker — same behaviour as the main product's catalog picker, just scoped
 * to that one row. Lines can also start blank and be typed manually.
 *
 * Everything here is a snapshot (name/price copied at the moment of
 * selection or typing, never a live catalog reference) — editing the
 * catalog item later never changes past entries.
 *
 * Built as its own component so it's easy to extend later with per-item
 * fields — discount, tax, cost, margin, stock, kits, commission — without
 * touching the entry form around it.
 */
function ProductLineRow({ item, onChange, onRemove, catalog }) {
  const [showPicker, setShowPicker] = useState(false);
  const total = (parseFloat(item.qty) || 0) * (parseFloat(item.unitPrice) || 0);

  return (
    <div style={{ background: T.subtle, border: `1px solid ${T.border}`, borderRadius: 12, padding: "10px 12px", display: "flex", flexDirection: "column", gap: 7 }}>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 8 }}>
        <div style={{ flex: 1 }}>
          <Input label="Produto" value={item.name} onChange={v => onChange({ ...item, name: v })} placeholder="Nome do produto" />
        </div>
        <button onClick={onRemove}
          style={{ width: 30, height: 30, borderRadius: 8, background: T.redBg, border: `1px solid ${T.redBd}`, color: T.red, fontSize: 12, cursor: "pointer", flexShrink: 0 }}>✕</button>
      </div>

      {catalog.length > 0 && (
        <div>
          <button onClick={() => setShowPicker(s => !s)}
            style={{ fontSize: 11, fontWeight: 600, color: T.blue, background: T.blueBg, border: `1px solid ${T.blueBd}`, borderRadius: 99, padding: "4px 10px", cursor: "pointer" }}>
            {showPicker ? "▲ Fechar catálogo" : "◧ Selecionar do Catálogo"}
          </button>
          {showPicker && (
            <div style={{ marginTop: 6, background: T.canvas, borderRadius: 10, border: `1px solid ${T.border}`, overflow: "hidden" }}>
              {catalog.map((c, i) => (
                <button key={c.id} onClick={() => { onChange({ ...item, catalogItemId: c.id, name: c.name, unitPrice: String(c.finalPrice || "") }); setShowPicker(false); }}
                  style={{ width: "100%", textAlign: "left", padding: "9px 12px", background: "transparent", border: "none", borderBottom: i < catalog.length - 1 ? `1px solid ${T.borderLight}` : "none", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 13, fontWeight: 500, color: T.text }}>{c.name}</span>
                  {c.finalPrice > 0 && <span style={{ fontSize: 12, color: T.green, fontFamily: "monospace", fontWeight: 600 }}>R$ {c.finalPrice.toFixed(2).replace(".", ",")}</span>}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <Input label="Quantidade" value={String(item.qty)} onChange={v => onChange({ ...item, qty: v })} type="number" inputMode="numeric" />
        <MoneyInput label="Valor unitário" value={item.unitPrice} onChange={v => onChange({ ...item, unitPrice: v })} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 5, borderTop: `1px solid ${T.borderLight}` }}>
        <Txt sz={11} c={T.faint}>Total do item</Txt>
        <Mon v={`R$${total.toFixed(2)}`} sz={13} c={T.text} />
      </div>
    </div>
  );
}

export const ProductLinesEditor = memo(({ items, onChange, catalog = [], label = "Produtos adicionais (opcional)" }) => {
  const updateItem = (id, patch) => onChange(items.map(it => it.id === id ? patch : it));
  const removeItem  = (id) => onChange(items.filter(it => it.id !== id));
  const addBlank    = () => onChange([...items, { id: Date.now() + Math.random(), catalogItemId: null, name: "", qty: "1", unitPrice: "" }]);

  return (
    <div>
      <Lbl sx={{ marginBottom: 8 }}>{label}</Lbl>

      {items.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 8 }}>
          {items.map(it => (
            <ProductLineRow key={it.id} item={it} catalog={catalog}
              onChange={patch => updateItem(it.id, patch)}
              onRemove={() => removeItem(it.id)} />
          ))}
        </div>
      )}

      <Btn onClick={addBlank} variant="secondary" full sm icon="➕">Adicionar produto</Btn>
    </div>
  );
});

// ─── CALCULATOR ICON ─────────────────────────────────────────────────────────
/**
 * Small custom SVG icon for the Calculadora — a 2×2 grid of basic operator
 * glyphs (×, −, %, =), inspired by (not copied from) the Samsung calculator
 * app icon language. No emoji, no external image. "=" uses the brand color;
 * the rest use dark gray, per spec.
 */
export const CalculatorIcon = memo(({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* × — top-left */}
    <line x1="4" y1="4.5" x2="9" y2="9.5" stroke="#374151" strokeWidth="1.6" strokeLinecap="round" />
    <line x1="9" y1="4.5" x2="4" y2="9.5" stroke="#374151" strokeWidth="1.6" strokeLinecap="round" />
    {/* − — top-right */}
    <line x1="15" y1="7" x2="20" y2="7" stroke="#374151" strokeWidth="1.6" strokeLinecap="round" />
    {/* % — bottom-left */}
    <circle cx="5.3" cy="15.3" r="1.35" stroke="#374151" strokeWidth="1.2" />
    <line x1="4" y1="20" x2="10" y2="14" stroke="#374151" strokeWidth="1.2" strokeLinecap="round" />
    <circle cx="8.7" cy="18.7" r="1.35" stroke="#374151" strokeWidth="1.2" />
    {/* = — bottom-right, brand color */}
    <line x1="15" y1="15.7" x2="20" y2="15.7" stroke="#E60023" strokeWidth="1.6" strokeLinecap="round" />
    <line x1="15" y1="18.7" x2="20" y2="18.7" stroke="#E60023" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
));
