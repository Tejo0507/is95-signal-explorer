/**
 * longcode.ts — simplified model of a masked long-code generator.
 *
 * WHAT THE COURSE REFERENCE ACTUALLY STATES
 *   · the long code comes from a 42-stage generator      (slides 13, 14)
 *   · its period is 2^42 − 1                             (slides 11, 14)
 *   · each user has its own 42-bit mask                  (slides 13, 14)
 *   · on the forward link the long code runs at 1.2288 Mc/s and is decimated
 *     1:64 down to 19.2 ks/s to scramble the data        (slide 13)
 *   · on the reverse link it runs at 1.2288 Mc/s, four times the 307.2 kc/s
 *     Walsh-modulator output                             (slide 14)
 *
 * WHAT IT DOES NOT STATE — and what this module therefore does not claim
 * The 42-stage polynomial, its tap positions and the initial register state are
 * not in the reference. This module runs the SAME ARCHITECTURE on a
 * register short enough to draw (4-14 stages) using primitive polynomials from
 * a standard table. The mask behaviour, the decimation and the structure are
 * faithful; the particular taps are illustrative. The UI says so on the page.
 *
 * THE ARCHITECTURE, AND THE ONE PROPERTY THAT MATTERS
 * A masked LFSR generator is an ordinary maximal-length shift register whose
 * output is not the last stage but
 *
 *     output = parity( state AND mask )
 *
 * i.e. XOR of the stages the mask selects. The useful theorem: for any non-zero
 * mask, that output is the SAME m-sequence as the unmasked one, merely started
 * at a different phase. So every user's long code is one sequence seen at a
 * different offset — which is exactly why masks give per-user scrambling
 * without needing a different polynomial per user, and why those codes are only
 * quasi-orthogonal when they arrive unaligned.
 *
 * `detectPhaseOffset` verifies that claim at runtime against the generated
 * sequences, so the page demonstrates the theorem rather than asserting it.
 */

import { normalizeSeed, polynomialForDegree, type PnPolynomial } from './pn';

/** Register lengths small enough to render stage-by-stage. */
export const MODEL_DEGREES = [4, 5, 6, 7, 8, 9] as const;

export interface LongCodeStep {
  /** Register contents before the clock, stage 1 first. */
  state: number[];
  /** Stages selected by the mask, for highlighting. */
  selected: boolean[];
  /** parity(state AND mask) — the generator output for this clock. */
  output: number;
  /** Bit fed back into stage 1. */
  feedback: number;
}

/** Coerce a mask to exactly `degree` bits. An all-zero mask outputs only zeros, so fall back to stage 1. */
export function normalizeMask(mask: number[], degree: number): number[] {
  const bits = new Array<number>(degree);
  for (let i = 0; i < degree; i += 1) bits[i] = mask[i] ? 1 : 0;
  // `some` rather than `every` on purpose: `every` with an equality callback
  // narrows `bits` to 0[], which then rejects the assignment below.
  const allZero = !bits.some((b) => b !== 0);
  if (allZero) bits[0] = 1;
  return bits;
}

/**
 * Clock the masked generator `steps` times.
 * Returns the full history so the UI can scrub through it.
 */
export function runLongCode(
  poly: PnPolynomial,
  seed: number[],
  mask: number[],
  steps: number,
): LongCodeStep[] {
  const state = normalizeSeed(seed, poly.degree);
  const m = normalizeMask(mask, poly.degree);
  const history: LongCodeStep[] = [];

  for (let i = 0; i < steps; i += 1) {
    // Output is the XOR of the masked stages, not simply the last stage.
    let output = 0;
    for (let s = 0; s < poly.degree; s += 1) output ^= state[s] & m[s];

    let feedback = 0;
    for (const tap of poly.taps) feedback ^= state[tap - 1];

    history.push({
      state: [...state],
      selected: m.map((b) => b === 1),
      output,
      feedback,
    });

    state.pop();
    state.unshift(feedback);
  }

  return history;
}

/** Masked generator output in binary form. */
export function longCodeBinary(
  degree: number,
  seed: number[],
  mask: number[],
  length: number,
): number[] {
  return runLongCode(polynomialForDegree(degree), seed, mask, length).map((s) => s.output);
}

/** Masked generator output in bipolar form, where 0 ↦ +1 and 1 ↦ -1. */
export function longCodeBipolar(
  degree: number,
  seed: number[],
  mask: number[],
  length: number,
): number[] {
  return longCodeBinary(degree, seed, mask, length).map((b) => (b === 0 ? 1 : -1));
}

/**
 * Find the phase offset between a masked output and the reference (mask =
 * stage 1 only) sequence, searching one full period. Returns null if no offset
 * matches — which, for a primitive polynomial and a non-zero mask, should never
 * happen; the UI reports whichever answer it actually gets.
 */
export function detectPhaseOffset(degree: number, seed: number[], mask: number[]): number | null {
  const poly = polynomialForDegree(degree);
  const period = poly.period;

  const referenceMask = new Array<number>(degree).fill(0);
  referenceMask[0] = 1;

  // Two full periods of the reference so any offset can be read off directly.
  const reference = longCodeBinary(degree, seed, referenceMask, period * 2);
  const masked = longCodeBinary(degree, seed, mask, period);

  for (let offset = 0; offset < period; offset += 1) {
    let match = true;
    for (let i = 0; i < period; i += 1) {
      if (reference[offset + i] !== masked[i]) {
        match = false;
        break;
      }
    }
    if (match) return offset;
  }
  return null;
}

/**
 * Decimate a sequence by taking every `factor`-th element.
 * This is the forward link's 1:64 decimator from slide 13, which turns the
 * 1.2288 Mc/s long code into the 19.2 ks/s scrambling sequence.
 */
export function decimate(sequence: number[], factor: number): number[] {
  const out: number[] = [];
  for (let i = 0; i < sequence.length; i += factor) out.push(sequence[i]);
  return out;
}

/** Mask as a readable bit string, stage 1 on the left. */
export function maskToString(mask: number[]): string {
  return mask.map((b) => (b ? '1' : '0')).join('');
}

/** Build a mask from a bit string, ignoring anything that is not 0 or 1. */
export function maskFromString(text: string, degree: number): number[] {
  const bits = text
    .split('')
    .filter((c) => c === '0' || c === '1')
    .map((c) => (c === '1' ? 1 : 0));
  return normalizeMask(bits, degree);
}
