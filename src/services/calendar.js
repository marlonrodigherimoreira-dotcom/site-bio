/**
 * services/calendar.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Pure logic for the Calendário Inteligente's day notes (diary entries).
 *
 * This is a completely separate concept from "Notas rápidas" (a single free
 * text blob, stored in state.notes) — calendar notes are structured,
 * per-day entries: { id, date, title, desc, time }.
 *
 * No React, no side effects — easy to test and reuse.
 */

import { diffD } from "../utils/date";

/** Notes for a given day, sorted: untimed notes first (in creation order),
 *  then timed notes in ascending time order. */
export function notesOnDate(notes, dateStr) {
  return notes
    .filter(n => n.date === dateStr)
    .sort((a, b) => {
      if (a.time && b.time) return a.time.localeCompare(b.time);
      if (a.time) return 1;
      if (b.time) return -1;
      return 0;
    });
}

/** Set of "YYYY-MM-DD" strings that have at least one note — O(1) lookup
 *  for month-grid dot indicators. */
export function noteDatesSet(notes) {
  return new Set(notes.map(n => n.date));
}

/** The next upcoming note from today onward (today included), used for the
 *  Home widget preview. Returns null when there are none. */
export function findNextNote(notes, todayStr) {
  const upcoming = notes
    .filter(n => n.date >= todayStr)
    .sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      if (a.time && b.time) return a.time.localeCompare(b.time);
      if (a.time) return -1;
      if (b.time) return 1;
      return 0;
    });
  return upcoming[0] || null;
}

/** Short relative label for a date: "Hoje", "Amanhã", or "24 jul". */
export function relativeDayLabel(dateStr) {
  const d = diffD(dateStr);
  if (d === 0) return "Hoje";
  if (d === 1) return "Amanhã";
  const dt = new Date(dateStr + "T12:00:00");
  return dt.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}
