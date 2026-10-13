/**
 * pn.ts — maximal-length shift-register (m-sequence) generation.
 *
 * HONEST SCOPE
 * The course reference names the IS-95 pilot PN sequences ("pilot PN (I)",
 * "pilot PN (Q)") and the long-code period (2^42 − 1) but does NOT give any
 * generator polynomial, tap set or initial state. This module therefore does
 * not attempt to reproduce the IS-95 sequences. It generates genuine
 * maximal-length sequences from textbook primitive polynomials so that the
 * *properties* a PN sequence is chosen for can be demonstrated and verified
 * live. The UI labels these as illustrative throughout.
 *
 * ALGORITHM — Fibonacci LFSR
 * A register of `degree` stages holds bits s[1..degree]. On each clock the
 * output is the last stage; the new first stage is the XOR of the stages named
 * by the tap list. If the tap polynomial is primitive over GF(2), the state
 * cycles through all 2^degree − 1 non-zero states before repeating, so the
 * output has period 2^degree − 1 — a maximal-length sequence.
 *
 * The property that makes m-sequences useful for spreading is their periodic
 * autocorrelation: over one full period, correlating the bipolar sequence with
 * a cyclic shift of itself gives
 *
 *     N      at zero shift        (N = 2^degree − 1)
 *     -1     at every other shift
 *
 * a single sharp peak against a flat floor. `periodicAutocorrelation` computes
 * this from the generated sequence, so the plot in the UI is measured from the
 * running generator rather than drawn to look right.
 */

export interface PnPolynomial {
  degree: number;
  /** Tap exponents, highest first, e.g. [5, 2] for x^5 + x^2 + 1. */
  taps: number[];
  /** Human-readable polynomial. */
  label: string;
  /** 2^degree − 1. */
  period: number;
}

/**
 * Primitive polynomials over GF(2), from standard tables. These are
 * mathematical facts about finite fields — they are NOT IS-95 specifications,
 * and nothing in the UI claims otherwise.
 */
export const PN_POLYNOMIALS: PnPolynomial[] = [
  { degree: 4, taps: [4, 1], label: 'x⁴ + x + 1', period: 15 },
  { degree: 5, taps: [5, 2], label: 'x⁵ + x² + 1', period: 31 },
  { degree: 6, taps: [6, 1], label: 'x⁶ + x + 1', period: 63 },
  { degree: 7, taps: [7, 3], label: 'x⁷ + x³ + 1', period: 127 },
  { degree: 8, taps: [8, 4, 3, 2], label: 'x⁸ + x⁴ + x³ + x² + 1', period: 255 },
  { degree: 9, taps: [9, 4], label: 'x⁹ + x⁴ + 1', period: 511 },
];

export function polynomialForDegree(degree: number): PnPolynomial {
  return PN_POLYNOMIALS.find((p) => p.degree === degree) ?? PN_POLYNOMIALS[1];
}

/** One clocking step of a Fibonacci LFSR held as an array of bits. */
export interface LfsrStep {
  /** Register contents BEFORE the clock, stage 1 first. */
  state: number[];
  /** Bit shifted out — the sequence output for this step. */
  output: number;
  /** Bit fed back into stage 1. */
  feedback: number;
}

/**
 * Run a Fibonacci LFSR for `steps` clocks and return every intermediate state.
 * `seed` must contain at least one 1; an all-zero register is a fixed point and
 * is replaced by the all-ones state so the UI can never show a dead generator.
 */
export function runLfsr(poly: PnPolynomial, seed: number[], steps: number): LfsrStep[] {
  const state = normalizeSeed(seed, poly.degree);
  const history: LfsrStep[] = [];

  for (let i = 0; i < steps; i += 1) {
    const output = state[poly.degree - 1];
    // Feedback = XOR of the tapped stages. Tap exponent k means stage k,
    // which is index k-1 in the array.
    let feedback = 0;
    for (const tap of poly.taps) feedback ^= state[tap - 1];

    history.push({ state: [...state], output, feedback });

    state.pop();
    state.unshift(feedback);
  }

  return history;
}

/** Coerce a seed to exactly `degree` bits, never all zero. */
export function normalizeSeed(seed: number[], degree: number): number[] {
  const bits = new Array<number>(degree);
  for (let i = 0; i < degree; i += 1) bits[i] = seed[i] ? 1 : 0;
  // `some` rather than `every`: `every` with an equality callback narrows
  // `bits` to 0[], which then rejects `fill(1)`.
  const allZero = !bits.some((b) => b !== 0);
  if (allZero) bits.fill(1);
  return bits;
}

/** Output sequence of the LFSR in binary (0/1) form. */
export function pnBinary(poly: PnPolynomial, seed: number[], length: number): number[] {
  return runLfsr(poly, seed, length).map((s) => s.output);
}

/** Output sequence in bipolar form, where 0 ↦ +1 and 1 ↦ -1. */
export function pnBipolar(poly: PnPolynomial, seed: number[], length: number): number[] {
  return pnBinary(poly, seed, length).map((b) => (b === 0 ? 1 : -1));
}

/** One full period of the sequence, bipolar. */
export function pnPeriod(poly: PnPolynomial, seed: number[]): number[] {
  return pnBipolar(poly, seed, poly.period);
}

/**
 * Periodic autocorrelation over one full period, for shifts 0 .. period-1.
 * Computed from the generated sequence — if the polynomial were not primitive
 * the plot would visibly lose its single clean peak.
 */
export function periodicAutocorrelation(sequence: number[]): number[] {
  const n = sequence.length;
  const out = new Array<number>(n);
  for (let shift = 0; shift < n; shift += 1) {
    let sum = 0;
    for (let i = 0; i < n; i += 1) sum += sequence[i] * sequence[(i + shift) % n];
    out[shift] = sum;
  }
  return out;
}

/** Does the sequence have the maximal-length autocorrelation signature? */
export function hasIdealAutocorrelation(sequence: number[]): boolean {
  const ac = periodicAutocorrelation(sequence);
  if (ac[0] !== sequence.length) return false;
  return ac.slice(1).every((v) => v === -1);
}

/** Count of 1s and 0s — an m-sequence is balanced to within one bit. */
export function balance(binary: number[]): { ones: number; zeros: number } {
  const ones = binary.reduce((acc, b) => acc + (b === 1 ? 1 : 0), 0);
  return { ones, zeros: binary.length - ones };
}
