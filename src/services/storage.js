/**
 * services/storage.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Thin, type-safe wrapper over localStorage.
 * All app persistence goes through here — easy to swap for
 * IndexedDB, remote API, or encrypted storage in the future.
 */

const KEYS = {
  SETUP:        "fluxo_setup",
  TRANSACTIONS: "fluxo_tx",
  BILLS:        "fluxo_bills",
  NOTES:        "fluxo_notes",
  CUSTOM_CATS:  "fluxo_custom_cats",
  CATALOG:      "fluxo_catalog",
  IMPORT_PREFS: "fluxo_import_prefs",
  CALENDAR_NOTES: "fluxo_calendar_notes",
  TEAM: "fluxo_team",
};

// ─── PRIMITIVES ───────────────────────────────────────────────────────────────

const read = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};

const write = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Quota exceeded or private-mode restriction — fail silently
  }
};

const remove = (key) => {
  try {
    localStorage.removeItem(key);
  } catch { /* */ }
};

// ─── DOMAIN METHODS ───────────────────────────────────────────────────────────

export const storage = {
  // Setup / onboarding
  getSetup:        ()    => read(KEYS.SETUP, null),
  saveSetup:       (v)   => write(KEYS.SETUP, v),
  clearSetup:      ()    => remove(KEYS.SETUP),

  // Transactions
  getTransactions: (fb)  => read(KEYS.TRANSACTIONS, fb),
  saveTransactions:(v)   => write(KEYS.TRANSACTIONS, v),

  // Bills
  getBills:        (fb)  => read(KEYS.BILLS, fb),
  saveBills:       (v)   => write(KEYS.BILLS, v),

  // Notes
  getNotes:        ()    => read(KEYS.NOTES, ""),
  saveNotes:       (v)   => write(KEYS.NOTES, v),

  // Custom categories (user-created)
  getCustomCats:   ()    => read(KEYS.CUSTOM_CATS, []),
  saveCustomCats:  (v)   => write(KEYS.CUSTOM_CATS, v),

  // Catalog items
  getCatalog:      ()    => read(KEYS.CATALOG, []),
  saveCatalog:     (v)   => write(KEYS.CATALOG, v),

  // Import preferences (e.g. "don't ask again about possible duplicates")
  getImportPrefs:  ()    => read(KEYS.IMPORT_PREFS, { skipDuplicateWarning: false }),
  saveImportPrefs: (v)   => write(KEYS.IMPORT_PREFS, v),

  // Calendário — day notes (diary entries), independent of "Notas rápidas"
  getCalendarNotes:  (fallback = []) => read(KEYS.CALENDAR_NOTES, fallback),
  saveCalendarNotes: (v)             => write(KEYS.CALENDAR_NOTES, v),

  // Equipe — Funcionário / Assinaturas contratadas (same array, discriminated by `kind`)
  getTeam:  (fallback = []) => read(KEYS.TEAM, fallback),
  saveTeam: (v)             => write(KEYS.TEAM, v),

  // Full reset
  clearAll: () => {
    remove(KEYS.SETUP);
    remove(KEYS.TRANSACTIONS);
    remove(KEYS.BILLS);
    remove(KEYS.NOTES);
    remove(KEYS.CUSTOM_CATS);
    remove(KEYS.CATALOG);
    remove(KEYS.IMPORT_PREFS);
    remove(KEYS.CALENDAR_NOTES);
    remove(KEYS.TEAM);
  },
};
