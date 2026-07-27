/**
 * services/backup.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Backup and Restore functionality.
 * Pure functions — no React, no side effects beyond file I/O.
 *
 * Responsibilities:
 *   - exportBackup(state)  → generates and downloads a .json file
 *   - importBackup(file)   → parses, validates, returns data or throws
 *
 * The store (AppContext) calls these and handles the state update.
 * Nothing here touches localStorage directly — that's storage.js's job.
 */

// ─── SCHEMA VERSION ──────────────────────────────────────────────────────────
// Increment this if the backup shape changes incompatibly in the future.
const BACKUP_VERSION = 1;
const BACKUP_SIGNATURE = "fluxo-backup";

// ─── EXPORT ──────────────────────────────────────────────────────────────────

/**
 * Serialise current app state into a timestamped JSON file and trigger download.
 *
 * @param {{ transactions, bills, notes, setup }} state
 */
export function exportBackup({ transactions, bills, notes, setup }) {
  const d    = new Date();
  const yyyy = d.getFullYear();
  const mm   = String(d.getMonth() + 1).padStart(2, "0");
  const dd   = String(d.getDate()).padStart(2, "0");

  const payload = {
    _signature: BACKUP_SIGNATURE,
    _version:   BACKUP_VERSION,
    _exportedAt: d.toISOString(),
    setup,
    transactions,
    bills,
    notes,
  };

  const blob     = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url      = URL.createObjectURL(blob);
  const filename = `backup-financeiro-${yyyy}-${mm}-${dd}.json`;

  const a    = document.createElement("a");
  a.href     = url;
  a.download = filename;
  a.click();

  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

// ─── IMPORT ──────────────────────────────────────────────────────────────────

/**
 * Read and validate a backup File object.
 * Returns a Promise that resolves with the parsed data payload or
 * rejects with a human-readable error message.
 *
 * @param {File} file
 * @returns {Promise<{ setup, transactions, bills, notes }>}
 */
export function importBackup(file) {
  return new Promise((resolve, reject) => {
    if (!file) {
      reject("Nenhum arquivo selecionado.");
      return;
    }
    if (!file.name.endsWith(".json")) {
      reject("O arquivo deve ser um .json gerado pelo NOZIL.");
      return;
    }

    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const raw = JSON.parse(e.target.result);
        const err = validateBackup(raw);
        if (err) { reject(err); return; }
        resolve({
          setup:        raw.setup        ?? null,
          transactions: raw.transactions ?? [],
          bills:        raw.bills        ?? [],
          notes:        raw.notes        ?? "",
        });
      } catch {
        reject("O arquivo está corrompido ou não é um backup válido.");
      }
    };

    reader.onerror = () => reject("Erro ao ler o arquivo. Tente novamente.");
    reader.readAsText(file);
  });
}

// ─── VALIDATION ──────────────────────────────────────────────────────────────

/**
 * Returns an error string if invalid, or null if valid.
 * @param {*} data  parsed JSON
 * @returns {string|null}
 */
function validateBackup(data) {
  if (!data || typeof data !== "object") {
    return "Arquivo inválido — não é um objeto JSON.";
  }
  if (data._signature !== BACKUP_SIGNATURE) {
    return "Este arquivo não é um backup do NOZIL.";
  }
  if (typeof data._version !== "number" || data._version > BACKUP_VERSION) {
    return `Versão do backup (${data._version}) não suportada. Atualize o app.`;
  }
  if (data.transactions !== undefined && !Array.isArray(data.transactions)) {
    return "Campo 'transactions' inválido no backup.";
  }
  if (data.bills !== undefined && !Array.isArray(data.bills)) {
    return "Campo 'bills' inválido no backup.";
  }
  return null;
}
