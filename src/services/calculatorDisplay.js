/**
 * services/calculatorDisplay.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Purely cosmetic "what the user is typing" expression builder for the
 * Calculadora's display (e.g. "25 × 4 + 8" while mid-expression).
 *
 * This NEVER influences the actual calculation — calculatorLogic.js remains
 * the single source of truth for every computed value, completely untouched.
 * This module only tracks the literal sequence of operands/operators the
 * user pressed, as an array of tokens, so the full expression stays visible
 * while typing, exactly like a normal calculator display.
 *
 * Each function here is driven by the same button press as the real engine,
 * and mirrors the exact same edge cases (backspace only edits the trailing
 * operand, "%" replaces the trailing operand in place, etc.) so the display
 * never shows something inconsistent with what was actually calculated.
 */

const OPERATORS = new Set(["+", "−", "×", "÷"]);
const isOperatorToken = (t) => OPERATORS.has(t);

export const initialTokens = [];

/** startFresh: true only right after "=" (a finished result on screen) —
 *  mirrors the one case where the engine's own waitingForOperand flag means
 *  "start a brand new expression" rather than "continue this one". */
export function tokensAppendDigit(tokens, digit, startFresh) {
  if (startFresh || tokens.length === 0) return [digit];
  const last = tokens[tokens.length - 1];
  if (isOperatorToken(last)) return [...tokens, digit];
  return [...tokens.slice(0, -1), last + digit];
}

export function tokensAppendDecimal(tokens, startFresh) {
  if (startFresh || tokens.length === 0) return ["0,"];
  const last = tokens[tokens.length - 1];
  if (isOperatorToken(last)) return [...tokens, "0,"];
  if (last.includes(",")) return tokens;
  return [...tokens.slice(0, -1), last + ","];
}

export function tokensAppendOperator(tokens, opSymbol) {
  if (tokens.length === 0) return ["0", opSymbol];
  const last = tokens[tokens.length - 1];
  if (isOperatorToken(last)) return [...tokens.slice(0, -1), opSymbol]; // replaces the pending operator
  return [...tokens, opSymbol];
}

/** "%" recomputes the trailing operand in place (same operand, new value) —
 *  never adds a token, mirrors the engine only updating `display`. */
export function tokensApplyPercent(tokens, newDisplay) {
  if (tokens.length === 0) return tokens;
  const last = tokens[tokens.length - 1];
  if (isOperatorToken(last)) return tokens;
  return [...tokens.slice(0, -1), newDisplay];
}

/** Collapses the whole expression down to the finished result — a normal
 *  calculator shows just the answer after "=", not the full equation. */
export function tokensEquals(resultDisplay) {
  return [resultDisplay];
}

export function tokensClearAll() {
  return [];
}

export function tokensClearEntry(tokens) {
  if (tokens.length === 0) return ["0"];
  const last = tokens[tokens.length - 1];
  if (isOperatorToken(last)) return [...tokens, "0"];
  return [...tokens.slice(0, -1), "0"];
}

/** Only ever edits the trailing operand — mirrors the engine, which never
 *  un-commits a pending operator on backspace either. */
export function tokensBackspace(tokens) {
  if (tokens.length === 0) return tokens;
  const last = tokens[tokens.length - 1];
  if (isOperatorToken(last)) return tokens; // no-op, same as the engine while waiting for an operand
  if (last.length > 1) return [...tokens.slice(0, -1), last.slice(0, -1)];
  return [...tokens.slice(0, -1), "0"];
}

export function tokensToDisplay(tokens) {
  return tokens.join(" ");
}
