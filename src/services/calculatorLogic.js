/**
 * services/calculatorLogic.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Pure logic for the standalone Calculadora — basic four-operation calculator.
 *
 * Completely independent from the rest of NOZIL: no store, no persistence,
 * no imports from any other domain module. Nothing here is ever saved —
 * CalculatorSheet just holds this state in memory and discards it on close.
 *
 * Operators are evaluated left-to-right as typed (no scientific precedence),
 * exactly like a basic pocket calculator.
 */

const OPS = {
  "+": (a, b) => a + b,
  "-": (a, b) => a - b,
  "×": (a, b) => a * b,
  "÷": (a, b) => (b === 0 ? null : a / b), // null signals division by zero
};

export const initialCalcState = {
  display: "0",
  prevValue: null,
  operator: null,
  waitingForOperand: false,
  error: false,
};

const toNumber  = (display) => parseFloat(display.replace(",", "."));
const toDisplay = (n) => {
  if (!isFinite(n)) return "Erro";
  const rounded = Math.round(n * 1e10) / 1e10; // trims float noise (0.1+0.2 etc.)
  return String(rounded).replace(".", ",");
};

export function inputDigit(state, digit) {
  if (state.error) return inputDigit(initialCalcState, digit);
  if (state.waitingForOperand) return { ...state, display: digit, waitingForOperand: false };
  if (state.display === "0") return { ...state, display: digit };
  if (state.display.replace("-", "").length >= 12) return state; // sane cap, avoids overflow
  return { ...state, display: state.display + digit };
}

export function inputDecimal(state) {
  if (state.error) return inputDecimal(initialCalcState);
  if (state.waitingForOperand) return { ...state, display: "0,", waitingForOperand: false };
  if (state.display.includes(",")) return state;
  return { ...state, display: state.display + "," };
}

export function inputOperator(state, op) {
  if (state.error) return state;
  const current = toNumber(state.display);
  if (state.operator && !state.waitingForOperand) {
    const result = OPS[state.operator](state.prevValue, current);
    if (result === null) return { ...initialCalcState, display: "Erro", error: true };
    return { display: toDisplay(result), prevValue: result, operator: op, waitingForOperand: true, error: false };
  }
  return { ...state, prevValue: current, operator: op, waitingForOperand: true };
}

/** Quick-discount-friendly %: with a pending operator, treats the value as a
 *  percentage of the stored operand (200 + 10% -> 20); standalone, just /100. */
export function inputPercent(state) {
  if (state.error) return state;
  const current = toNumber(state.display);
  const result = state.operator && state.prevValue != null
    ? state.prevValue * (current / 100)
    : current / 100;
  return { ...state, display: toDisplay(result), waitingForOperand: false };
}

export function calcEquals(state) {
  if (state.error || state.operator == null || state.prevValue == null) return state;
  const current = toNumber(state.display);
  const result = OPS[state.operator](state.prevValue, current);
  if (result === null) return { ...initialCalcState, display: "Erro", error: true };
  return { display: toDisplay(result), prevValue: null, operator: null, waitingForOperand: true, error: false };
}

export function clearAll() {
  return { ...initialCalcState };
}

export function clearEntry(state) {
  return { ...state, display: "0", waitingForOperand: false, error: false };
}

export function backspace(state) {
  if (state.error) return { ...initialCalcState };
  if (state.waitingForOperand) return state;
  const next = state.display.length > 1 ? state.display.slice(0, -1) : "0";
  return { ...state, display: next === "-" ? "0" : next };
}
