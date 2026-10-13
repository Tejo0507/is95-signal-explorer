/**
 * walsh.ts — the Walsh/Hadamard code family and correlation maths.
 *
 * ALGORITHM
 * The order-N Hadamard matrix (N a power of two) obeys the Sylvester recursion
 *
 *     H(1)  = [ +1 ]
 *     H(2n) = [ H(n)   H(n) ]
 *             [ H(n)  -H(n) ]
 *
 * Expanding that recursion gives a closed form for any single entry: the sign
 * at row i, column j is (-1) raised to the number of bit positions where i and
 * j are BOTH one. So
 *
 *     H[i][j] = +1 if popcount(i AND j) is even
 *               -1 if popcount(i AND j) is odd
 *
 * which is what `walshChip` computes. Working from the closed form rather than
 * materialising a 64x64 matrix means any chip of any code is O(1), and the
 * row index is the natural Hadamard index — the same numbering the course deck
 * uses when it says "Walsh code n is channel n".
 *
 * Sanity check on that numbering: row 32 of H(64) has bit 5 set, so its sign
 * flips exactly when bit 5 of the column flips, i.e. +1 for the first 32 chips
 * and -1 for the last 32. That is the half-period square wave the deck assigns
 * to the synchronisation channel (W32), and row 0 is all +1 — the deck's
 * "all zeros, always on" pilot. The construction therefore reproduces the
 * course reference's assignments rather than approximating them.
 *
 * CONVENTIONS
 *   binary form  : 0 / 1   (0 means +1, 1 means -1 — the usual mapping)
 *   bipolar form : +1 / -1 (what you multiply a signal by)
 */

/** Number of 1 bits in a non-negative integer. */
function popcount(n: number): number {
  let count = 0;
  let v = n;
  while (v !== 0) {
    v &= v - 1; // clears the lowest set bit
    count += 1;
  }
  return count;
}

/** Bipolar value (+1 or -1) of chip `chip` of Walsh function `index`. */
export function walshChip(index: number, chip: number): 1 | -1 {
  return popcount(index & chip) % 2 === 0 ? 1 : -1;
}

/** Walsh function `index` as a bipolar sequence of `length` chips. */
export function walshSequence(index: number, length = 64): number[] {
  const out = new Array<number>(length);
  for (let chip = 0; chip < length; chip += 1) out[chip] = walshChip(index, chip);
  return out;
}

/** Walsh function `index` in binary (0/1) form, where 0 ↦ +1 and 1 ↦ -1. */
export function walshBinary(index: number, length = 64): number[] {
  const out = new Array<number>(length);
  for (let chip = 0; chip < length; chip += 1) out[chip] = walshChip(index, chip) === 1 ? 0 : 1;
  return out;
}

/** Bipolar sequence rendered as a compact binary string, e.g. "0011...". */
export function toBinaryString(bipolar: number[]): string {
  return bipolar.map((v) => (v === 1 ? '0' : '1')).join('');
}

/** Bipolar sequence rendered with explicit signs, e.g. "+ + − − ...". */
export function toSignString(bipolar: number[], separator = ' '): string {
  return bipolar.map((v) => (v === 1 ? '+' : '−')).join(separator);
}

/* ------------------------------------------------------------------ *
 * Correlation
 * ------------------------------------------------------------------ */

/** Sum of element-wise products. Equal lengths are required. */
export function innerProduct(a: number[], b: number[]): number {
  const n = Math.min(a.length, b.length);
  let sum = 0;
  for (let i = 0; i < n; i += 1) sum += a[i] * b[i];
  return sum;
}

/** Element-wise product — the chip-by-chip comparison row in the UI. */
export function elementwiseProduct(a: number[], b: number[]): number[] {
  const n = Math.min(a.length, b.length);
  const out = new Array<number>(n);
  for (let i = 0; i < n; i += 1) out[i] = a[i] * b[i];
  return out;
}

/**
 * Running sum of the element-wise product. This is what an integrate-and-dump
 * correlator actually accumulates, so plotting it shows *when* during the
 * symbol the two codes cancel, not just the final total.
 */
export function runningCorrelation(a: number[], b: number[]): number[] {
  const product = elementwiseProduct(a, b);
  const out = new Array<number>(product.length);
  let sum = 0;
  for (let i = 0; i < product.length; i += 1) {
    sum += product[i];
    out[i] = sum;
  }
  return out;
}

/** Inner product divided by length: +1 identical, 0 orthogonal, -1 inverted. */
export function normalizedCorrelation(a: number[], b: number[]): number {
  const n = Math.min(a.length, b.length);
  return n === 0 ? 0 : innerProduct(a, b) / n;
}

/**
 * Cyclic left shift by `shift` chips. Cyclic (rather than zero-padded) shift is
 * the right model for a periodic code observed over one full period, which is
 * the assumption the correlation panels state.
 */
export function cyclicShift(seq: number[], shift: number): number[] {
  const n = seq.length;
  if (n === 0) return [];
  const k = ((shift % n) + n) % n;
  return seq.map((_, i) => seq[(i + k) % n]);
}

/**
 * Correlation of `a` against `b` for every cyclic shift of `b`.
 * Returns one entry per shift, 0 .. b.length-1.
 */
export function correlationVsShift(a: number[], b: number[]): number[] {
  const n = b.length;
  const out = new Array<number>(n);
  for (let shift = 0; shift < n; shift += 1) {
    out[shift] = innerProduct(a, cyclicShift(b, shift));
  }
  return out;
}

/**
 * Walsh index that 64-ary reverse-link modulation would select for a group of
 * six coded bits. The deck (slide 14) states "6 symbols → 1 of 64": six bits
 * form a six-bit number, and that number is the Walsh index transmitted.
 * `bits` is most-significant first.
 */
export function walshIndexFromSixBits(bits: number[]): number {
  return bits.slice(0, 6).reduce((acc, bit) => (acc << 1) | (bit ? 1 : 0), 0);
}

/* ------------------------------------------------------------------ *
 * Self-test helpers — used by the orthogonality demonstration so the page
 * proves the property live instead of asserting it in prose.
 * ------------------------------------------------------------------ */

/** True when every distinct pair in the order-N family has zero inner product. */
export function familyIsOrthogonal(order: number): boolean {
  for (let i = 0; i < order; i += 1) {
    for (let j = i + 1; j < order; j += 1) {
      if (innerProduct(walshSequence(i, order), walshSequence(j, order)) !== 0) return false;
    }
  }
  return true;
}

/**
 * How many distinct pairs of the order-N family stay orthogonal at EVERY cyclic
 * shift, and how many leak at some shift.
 *
 * This is a more interesting result than it first looks. Orthogonality under
 * misalignment is not uniform across the family: for order 64, 651 of the 2 016
 * distinct pairs leak at some shift while 1 365 happen to stay at zero
 * throughout. Pairs differing only in their low-order index bits (W4/W5,
 * W2/W3) are the leaky ones, because a shift turns one into something
 * correlated with the other.
 *
 * The survey is computed once and cached, because it is O(N³) — about 8 million
 * multiply-accumulates at order 64, fine once but not on every render.
 */
const surveyCache = new Map<number, { leaky: number; clean: number; total: number }>();

export function misalignmentSurvey(order: number): { leaky: number; clean: number; total: number } {
  const cached = surveyCache.get(order);
  if (cached) return cached;

  let leaky = 0;
  let clean = 0;

  for (let i = 0; i < order; i += 1) {
    const a = walshSequence(i, order);
    for (let j = i + 1; j < order; j += 1) {
      const b = walshSequence(j, order);
      const leaks = correlationVsShift(a, b).some((v) => v !== 0);
      if (leaks) leaky += 1;
      else clean += 1;
    }
  }

  const result = { leaky, clean, total: leaky + clean };
  surveyCache.set(order, result);
  return result;
}

/**
 * Inner product of one Walsh function against every other in the family.
 * Used for the "one row against all 64" orthogonality strip.
 */
export function correlationAgainstFamily(index: number, order: number): number[] {
  const reference = walshSequence(index, order);
  const out = new Array<number>(order);
  for (let other = 0; other < order; other += 1) {
    out[other] = innerProduct(reference, walshSequence(other, order));
  }
  return out;
}
