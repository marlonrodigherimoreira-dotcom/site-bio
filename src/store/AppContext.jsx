/**
 * store/AppContext.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Lightweight global store using Context + useReducer.
 * Eliminates prop-drilling for transactions, bills, notes, setup, and UI state.
 * Ready to swap for Zustand/Redux without touching pages or components.
 */

import { createContext, useContext, useReducer, useEffect, useCallback } from "react";
import { storage } from "../services/storage";
import { exportBackup, importBackup } from "../services/backup";

// ─── SEED DATA ────────────────────────────────────────────────────────────────
import { dAgo, dAhd } from "../utils/date";

const SEED_TX = [
  {id:1, type:"income",  desc:"Gestão de tráfego", amount:3500,client:"Loja Bella",        cat:"Serviço",    date:dAgo(2), rec:true },
  {id:2, type:"income",  desc:"Gestão de tráfego", amount:2800,client:"Studio Fit",        cat:"Serviço",    date:dAgo(3), rec:true },
  {id:3, type:"expense", desc:"Meta Ads",           amount:900, client:"",                  cat:"Marketing",  date:dAgo(4), rec:false},
  {id:4, type:"income",  desc:"Edição de vídeo",   amount:1200,client:"Canal Receitas",    cat:"Serviço",    date:dAgo(5), rec:false},
  {id:5, type:"expense", desc:"Google Workspace",  amount:89,  client:"",                  cat:"Software",   date:dAgo(6), rec:true },
  {id:6, type:"income",  desc:"Consultoria SEO",   amount:1800,client:"Imobiliária Norte", cat:"Consultoria",date:dAgo(7), rec:false},
  {id:7, type:"expense", desc:"Notion + Figma",    amount:120, client:"",                  cat:"Software",   date:dAgo(8), rec:true },
  {id:8, type:"income",  desc:"Social media",      amount:2200,client:"Dra. Carla Ramos",  cat:"Serviço",    date:dAgo(10),rec:true },
  {id:9, type:"expense", desc:"Freelancer design", amount:450, client:"",                  cat:"Pessoal",    date:dAgo(12),rec:false},
  {id:10,type:"income",  desc:"Gestão de tráfego", amount:3500,client:"Loja Bella",        cat:"Serviço",    date:dAgo(14),rec:true },
  {id:11,type:"income",  desc:"Gestão de tráfego", amount:2200,client:"Studio Fit",        cat:"Serviço",    date:dAgo(32),rec:true },
  {id:12,type:"income",  desc:"Social media",      amount:2200,client:"Dra. Carla Ramos",  cat:"Serviço",    date:dAgo(33),rec:true },
  {id:13,type:"expense", desc:"Meta Ads",           amount:800, client:"",                  cat:"Marketing",  date:dAgo(34),rec:false},
  {id:14,type:"income",  desc:"Consultoria SEO",   amount:1200,client:"Imobiliária Norte", cat:"Consultoria",date:dAgo(35),rec:false},
  {id:15,type:"expense", desc:"Contador",           amount:350, client:"",                  cat:"Pessoal",    date:dAgo(36),rec:true },
];

const SEED_BILLS = [
  {id:1,type:"payable",   desc:"Aluguel coworking",amount:800, dueDate:dAhd(1), paid:false},
  {id:2,type:"receivable",desc:"Fatura Studio Fit", amount:2800,dueDate:dAhd(2), paid:false},
  {id:3,type:"payable",   desc:"Internet fibra",   amount:180, dueDate:dAhd(0), paid:false},
  {id:4,type:"receivable",desc:"Fatura Dra. Carla", amount:2200,dueDate:dAhd(5), paid:false},
  {id:5,type:"payable",   desc:"Contador",          amount:350, dueDate:dAgo(1), paid:false},
  {id:6,type:"receivable",desc:"Fatura Canal Rec.",  amount:1200,dueDate:dAhd(8), paid:false},
];

export { SEED_TX, SEED_BILLS };

// ─── STATE SHAPE ─────────────────────────────────────────────────────────────
const initialState = {
  setup:        storage.getSetup(),
  transactions: storage.getTransactions([]),
  bills:        storage.getBills([]),
  notes:        storage.getNotes(),
  catalog:      storage.getCatalog(),
  calendarNotes: storage.getCalendarNotes([]),
  team:          storage.getTeam([]),
  // UI
  tab:          "home",
  sheet:        null,
  entryType:    "income",
};

// ─── REDUCER ─────────────────────────────────────────────────────────────────
function reducer(state, action) {
  switch (action.type) {
    // Data mutations
    case "SET_SETUP": {
      if (action.payload?._demo) {
        return { ...state, setup: action.payload, transactions: SEED_TX, bills: SEED_BILLS };
      }
      return { ...state, setup: action.payload };
    }
    // Patch individual setup fields (caixa, fundos, rendimento)
    case "PATCH_SETUP":      return { ...state, setup: { ...state.setup, ...action.payload } };
    case "ADD_TX":           return { ...state, transactions: [action.payload, ...state.transactions] };
    case "ADD_TX_BULK":      return { ...state, transactions: [...action.payload, ...state.transactions] };
    case "REMOVE_TX":        return { ...state, transactions: state.transactions.filter(t => t.id !== action.payload) };
    case "SET_TRANSACTIONS": return { ...state, transactions: action.payload };
    case "ADD_BILL":         return { ...state, bills: [...state.bills, action.payload] };
    case "UPDATE_BILL":      return { ...state, bills: state.bills.map(b => b.id === action.payload.id ? action.payload : b) };
    case "REMOVE_BILL":      return { ...state, bills: state.bills.filter(b => b.id !== action.payload) };
    case "SET_NOTES":        return { ...state, notes: action.payload };
    // Catalog
    case "ADD_CATALOG":      return { ...state, catalog: [...state.catalog, action.payload] };
    case "UPDATE_CATALOG":   return { ...state, catalog: state.catalog.map(c => c.id === action.payload.id ? action.payload : c) };
    case "REMOVE_CATALOG":   return { ...state, catalog: state.catalog.filter(c => c.id !== action.payload) };
    // Calendário — day notes
    case "ADD_CAL_NOTE":     return { ...state, calendarNotes: [...state.calendarNotes, action.payload] };
    case "UPDATE_CAL_NOTE":  return { ...state, calendarNotes: state.calendarNotes.map(n => n.id === action.payload.id ? action.payload : n) };
    case "REMOVE_CAL_NOTE":  return { ...state, calendarNotes: state.calendarNotes.filter(n => n.id !== action.payload) };
    // Equipe — Funcionário / Assinaturas contratadas
    case "ADD_TEAM":         return { ...state, team: [...state.team, action.payload] };
    case "UPDATE_TEAM":      return { ...state, team: state.team.map(m => m.id === action.payload.id ? action.payload : m) };
    case "REMOVE_TEAM":      return { ...state, team: state.team.filter(m => m.id !== action.payload) };
    // UI
    case "SET_TAB":          return { ...state, tab: action.payload };
    case "OPEN_SHEET":       return { ...state, sheet: action.payload.sheet, entryType: action.payload.entryType || state.entryType };
    case "CLOSE_SHEET":      return { ...state, sheet: null };
    // Restore from backup — replaces all data
    case "RESTORE":          return { ...state, setup: action.payload.setup, transactions: action.payload.transactions, bills: action.payload.bills, notes: action.payload.notes, sheet: null };
    // Reset
    case "RESET":            return { ...initialState, setup: null, transactions: [], bills: [], notes: "" };
    default:                 return state;
  }
}

// ─── CONTEXT ─────────────────────────────────────────────────────────────────
const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  // ── Debounced persistence ──────────────────────────────────────────────────
  useEffect(() => {
    const t = setTimeout(() => storage.saveTransactions(state.transactions), 600);
    return () => clearTimeout(t);
  }, [state.transactions]);

  useEffect(() => {
    const t = setTimeout(() => storage.saveBills(state.bills), 600);
    return () => clearTimeout(t);
  }, [state.bills]);

  useEffect(() => {
    const t = setTimeout(() => storage.saveNotes(state.notes), 800);
    return () => clearTimeout(t);
  }, [state.notes]);

  useEffect(() => {
    const t = setTimeout(() => storage.saveCatalog(state.catalog), 600);
    return () => clearTimeout(t);
  }, [state.catalog]);

  useEffect(() => {
    const t = setTimeout(() => storage.saveCalendarNotes(state.calendarNotes), 600);
    return () => clearTimeout(t);
  }, [state.calendarNotes]);

  useEffect(() => {
    const t = setTimeout(() => storage.saveTeam(state.team), 600);
    return () => clearTimeout(t);
  }, [state.team]);

  useEffect(() => {
    if (state.setup) storage.saveSetup(state.setup);
  }, [state.setup]);

  // ── Action creators ────────────────────────────────────────────────────────
  const actions = {
    completeSetup:  useCallback((data) => dispatch({ type:"SET_SETUP", payload:data }), []),
    patchSetup:     useCallback((patch) => dispatch({ type:"PATCH_SETUP", payload:patch }), []),
    addTransaction: useCallback((tx)   => dispatch({ type:"ADD_TX",    payload:tx   }), []),
    addTransactionsBulk: useCallback((txs) => dispatch({ type:"ADD_TX_BULK", payload:txs }), []),
    removeTx:       useCallback((id)   => dispatch({ type:"REMOVE_TX", payload:id   }), []),
    addBill:        useCallback((bill) => dispatch({ type:"ADD_BILL",  payload:bill }), []),
    updateBill:     useCallback((bill) => dispatch({ type:"UPDATE_BILL",payload:bill}), []),
    removeBill:     useCallback((id)   => dispatch({ type:"REMOVE_BILL",payload:id  }), []),
    setNotes:       useCallback((n)    => dispatch({ type:"SET_NOTES", payload:n    }), []),
    setTab:         useCallback((tab)  => dispatch({ type:"SET_TAB",   payload:tab  }), []),
    openSheet:      useCallback((sheet, entryType) => dispatch({ type:"OPEN_SHEET", payload:{ sheet, entryType } }), []),
    closeSheet:     useCallback(()     => dispatch({ type:"CLOSE_SHEET" }),              []),
    // Catalog
    addCatalogItem:    useCallback((item) => dispatch({ type:"ADD_CATALOG",    payload:item }), []),
    updateCatalogItem: useCallback((item) => dispatch({ type:"UPDATE_CATALOG", payload:item }), []),
    removeCatalogItem: useCallback((id)   => dispatch({ type:"REMOVE_CATALOG", payload:id   }), []),
    // Calendário — day notes
    addCalendarNote:    useCallback((note) => dispatch({ type:"ADD_CAL_NOTE",    payload:note }), []),
    updateCalendarNote: useCallback((note) => dispatch({ type:"UPDATE_CAL_NOTE", payload:note }), []),
    removeCalendarNote: useCallback((id)   => dispatch({ type:"REMOVE_CAL_NOTE", payload:id   }), []),
    // Equipe — Funcionário / Assinaturas contratadas
    addTeamItem:    useCallback((item) => dispatch({ type:"ADD_TEAM",    payload:item }), []),
    updateTeamItem: useCallback((item) => dispatch({ type:"UPDATE_TEAM", payload:item }), []),
    removeTeamItem: useCallback((id)   => dispatch({ type:"REMOVE_TEAM", payload:id   }), []),
    /** Pay a bill: mark as paid + auto-create matching transaction */
    payBill: useCallback((bill) => {
      dispatch({ type:"UPDATE_BILL", payload:{ ...bill, paid:true } });
      dispatch({
        type: "ADD_TX",
        payload: {
          id: Date.now(),
          type:   bill.type === "payable" ? "expense" : "income",
          desc:   bill.desc,
          amount: bill.amount,
          client: "",
          cat:    "Outros",
          date:   new Date().toISOString().split("T")[0],
          rec:    false,
        },
      });
    }, []),
    reset: useCallback(() => {
      storage.clearAll();
      dispatch({ type:"RESET" });
    }, []),

    /** Export all current data as a downloadable .json backup */
    exportBackup: useCallback(() => {
      exportBackup({
        setup:        state.setup,
        transactions: state.transactions,
        bills:        state.bills,
        notes:        state.notes,
      });
    }, [state]),

    /** Import and restore a backup File object.
     *  Returns a Promise — caller handles confirmation UX. */
    restoreBackup: useCallback((file) => {
      return importBackup(file).then((data) => {
        // Write everything to localStorage first
        if (data.setup)        storage.saveSetup(data.setup);
        storage.saveTransactions(data.transactions);
        storage.saveBills(data.bills);
        storage.saveNotes(data.notes);
        // Then update in-memory state
        dispatch({ type: "RESTORE", payload: data });
      });
    }, []),
  };

  return (
    <AppContext.Provider value={{ state, ...actions }}>
      {children}
    </AppContext.Provider>
  );
}

/** Typed hook — throws if used outside provider */
export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside <AppProvider>");
  return ctx;
};
