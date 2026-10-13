/**
 * spreading.ts, the spread / transmit / despread chain the deck works through
 * on slides 04 and 07, computed rather than drawn.
 *
 * The deck uses an eight-chip code so the whole cycle fits on one page: Tb = 8
 * Tc, correlator output +8 for a transmitted +1 and -8 for a -1. It is explicit
 * that eight is the example and 128 is the real IS-95 figure, and this module
 * keeps that distinction: `SPREADING_STAGES` runs the short example, while the
 * spreading-factor arithmetic in `spreadingFactor` uses the real rates.
 *
 * Everything below is exact integer arithmetic on ±1 sequences. There is no
 * noise model, no pulse shaping and no carrier, those would be fabricated
 * simulation output, and the deck does not supply them.
 */

import { RF } from './spec';
import { innerProduct, walshSequence } from './walsh';

/* ------------------------------------------------------------------ *
 * Spreading factor
 * ------------------------------------------------------------------ */

export interface SpreadingResult {
  chipRateCps: number;
  infoRateBps: number;
  /** chip rate ÷ information rate. */
  factor: number;
  /** True when the division comes out whole. */
  exact: boolean;
  /** Processing gain in dB, 10·log10(factor). */
  gainDb: number;
  /** Chip duration, seconds. */
  chipDurationS: number;
  /** Bit duration, seconds. */
  bitDurationS: number;
}

/**
 * Spreading factor = chip rate / information bit rate.
 *
 * For the deck's example: 1 228 800 / 9 600 = 128 chips per information bit.
 * The ratio is a bandwidth-expansion figure, NOT a description of the whole
 * coding and modulation chain, module 04 shows where the rate really changes.
 */
export function spreadingFactor(infoRateBps: number, chipRateCps = RF.chipRateCps): SpreadingResult {
  const safeRate = infoRateBps > 0 ? infoRateBps : 1;
  const factor = chipRateCps / safeRate;
  return {
    chipRateCps,
    infoRateBps: safeRate,
    factor,
    exact: Number.isInteger(factor),
    gainDb: 10 * Math.log10(factor),
    chipDurationS: 1 / chipRateCps,
    bitDurationS: 1 / safeRate,
  };
}

/** Format a duration in seconds using whichever of ms / µs / ns reads best. */
export function formatDuration(seconds: number): string {
  if (seconds >= 1e-3) return `${(seconds * 1e3).toPrecision(4)} ms`;
  if (seconds >= 1e-6) return `${(seconds * 1e6).toPrecision(4)} µs`;
  return `${(seconds * 1e9).toPrecision(4)} ns`;
}

/* ------------------------------------------------------------------ *
 * The step-by-step spreading demonstration
 * ------------------------------------------------------------------ */

export type SpreadingStageId =
  | 'bit'
  | 'code'
  | 'chips'
  | 'channel'
  | 'correlate'
  | 'integrate'
  | 'decide';

export interface SpreadingStage {
  id: SpreadingStageId;
  title: string;
  /** What this stage is for, in one line. */
  caption: string;
  /** The waveform to draw: ±1 samples, one per chip (or per bit for 'bit'). */
  waveform: number[];
  /** Samples per bit, so the renderer can draw bit boundaries. */
  samplesPerBit: number;
  /** Optional scalar readouts shown beside the waveform. */
  readouts?: { label: string; value: string }[];
}

export interface SpreadingDemoInput {
  /** Data bits as ±1. */
  bits: number[];
  /** Walsh index used as the illustrative spreading code. */
  codeIndex: number;
  /** Code length in chips, 8 in the deck's worked example. */
  codeLength: number;
  /**
   * Walsh index of a second, interfering user. `null` means a clean channel.
   * Including one is how the demo shows that an orthogonal interferer
   * contributes exactly zero to the correlator.
   */
  interfererIndex: number | null;
  /** Chip misalignment applied to the interferer, as on deck slide 07. */
  interfererDelayChips: number;
}

/**
 * The default uses W4 rather than an arbitrary index because W4 is one of the
 * 8-chip codes whose partners (W5, W6, W7) actually leak under misalignment,
 * 4 of a possible 8 at one chip of delay, which is exactly the figure the deck
 * prints on slide 07. Pairs such as W1/W2 stay orthogonal at every cyclic
 * shift, so defaulting to one of those would let a reader drag the delay slider
 * and conclude misalignment is harmless.
 */
export const DEFAULT_DEMO: SpreadingDemoInput = {
  bits: [1, -1],
  codeIndex: 4,
  codeLength: 8,
  interfererIndex: null,
  interfererDelayChips: 0,
};

/** The deck's slide-07 configuration: an orthogonal pair, one chip apart. */
export const SELF_JAMMING_PRESET: SpreadingDemoInput = {
  bits: [1, -1],
  codeIndex: 4,
  codeLength: 8,
  interfererIndex: 5,
  interfererDelayChips: 1,
};

/** Repeat each bit across `codeLength` chips, the data waveform at chip rate. */
function holdBits(bits: number[], codeLength: number): number[] {
  const out: number[] = [];
  for (const bit of bits) for (let c = 0; c < codeLength; c += 1) out.push(bit);
  return out;
}

/** Tile a code across every bit interval. */
function tileCode(code: number[], bitCount: number): number[] {
  const out: number[] = [];
  for (let b = 0; b < bitCount; b += 1) out.push(...code);
  return out;
}

/**
 * Build every stage of the spread/despread chain for the given input.
 *
 * Stage by stage:
 *   bit        d(t), held for Tb
 *   code       c(t), one period per bit
 *   chips      d·c, the transmitted chip sequence
 *   channel    d·c (+ the interferer's own spread signal, if enabled)
 *   correlate  received × c, every wanted chip squares to +1
 *   integrate  running sum over each Tb
 *   decide     sign of the integral → recovered bit
 */
export function buildSpreadingStages(input: SpreadingDemoInput): SpreadingStage[] {
  const { bits, codeIndex, codeLength, interfererIndex, interfererDelayChips } = input;
  const n = bits.length * codeLength;

  const code = walshSequence(codeIndex, codeLength);
  const dataWave = holdBits(bits, codeLength);
  const codeWave = tileCode(code, bits.length);

  // Transmitted chips: data multiplied by the code, chip for chip.
  const transmitted = dataWave.map((d, i) => d * codeWave[i]);

  // Optional interferer: its own data spread by its own code, delayed. A delay
  // of zero keeps it chip-aligned (orthogonal); any other delay destroys that.
  let interference = new Array<number>(n).fill(0);
  if (interfererIndex !== null) {
    const iCode = walshSequence(interfererIndex, codeLength);
    const iBits = bits.map((_, k) => (k % 2 === 0 ? 1 : 1)); // constant +1: isolates the code effect
    const iWave = holdBits(iBits, codeLength).map((d, i) => d * tileCode(iCode, bits.length)[i]);
    const delay = ((interfererDelayChips % n) + n) % n;
    interference = iWave.map((_, i) => iWave[(i - delay + n) % n]);
  }

  const received = transmitted.map((v, i) => v + interference[i]);

  // Receiver multiplies by the same code. c(t)·c(t) = +1 for every chip, which
  // is the whole trick: the code cancels itself and the data reappears.
  const correlated = received.map((v, i) => v * codeWave[i]);

  // Integrate over each bit interval separately, restarting at each boundary.
  const integrated = new Array<number>(n);
  const decisions: number[] = [];
  for (let b = 0; b < bits.length; b += 1) {
    let sum = 0;
    for (let c = 0; c < codeLength; c += 1) {
      const i = b * codeLength + c;
      sum += correlated[i];
      integrated[i] = sum;
    }
    decisions.push(sum >= 0 ? 1 : -1);
  }

  const decisionWave = holdBits(decisions, codeLength);
  const peak = codeLength;

  const interfererContribution =
    interfererIndex === null
      ? 0
      : innerProduct(interference.slice(0, codeLength), codeWave.slice(0, codeLength));

  return [
    {
      id: 'bit',
      title: 'Information bit',
      caption: `d(t), each bit held for Tb. Carries the information; ${bits.length} bits here.`,
      waveform: dataWave,
      samplesPerBit: codeLength,
      readouts: [
        { label: 'Bits', value: bits.map((b) => (b === 1 ? '+1' : '−1')).join(', ') },
        { label: 'Tb', value: `${codeLength} Tc` },
      ],
    },
    {
      id: 'code',
      title: 'Spreading code',
      caption: `c(t), W${codeIndex} of the ${codeLength}-chip family, one full period per bit.`,
      waveform: codeWave,
      samplesPerBit: codeLength,
      readouts: [
        { label: 'Code', value: code.map((c) => (c === 1 ? '+' : '−')).join(' ') },
        { label: 'Length', value: `${codeLength} chips` },
      ],
    },
    {
      id: 'chips',
      title: 'Chip sequence',
      caption: 'd·c, the transmitted chips. One bit has become a pattern.',
      waveform: transmitted,
      samplesPerBit: codeLength,
      readouts: [
        { label: 'Chips sent', value: `${n}` },
        { label: 'Chip carries', value: 'no information on its own' },
      ],
    },
    {
      id: 'channel',
      title: 'Transmitted representation',
      caption:
        interfererIndex === null
          ? 'What reaches the receiver. Nothing else is on the air in this configuration.'
          : `Our signal plus a second user on W${interfererIndex}, delayed ${interfererDelayChips} Tc. ` +
            'The receiver sees only the sum.',
      waveform: received,
      samplesPerBit: codeLength,
      readouts:
        interfererIndex === null
          ? [{ label: 'Interferers', value: 'none' }]
          : [
              { label: 'Interferer', value: `W${interfererIndex}` },
              { label: 'Delay', value: `${interfererDelayChips} Tc` },
            ],
    },
    {
      id: 'correlate',
      title: 'Receiver correlation',
      caption:
        'received × c, every chip of our own signal squares to +1, so the code cancels itself ' +
        'and the data reappears.',
      waveform: correlated,
      samplesPerBit: codeLength,
      readouts: [{ label: 'c(t) · c(t)', value: '+1 for every chip' }],
    },
    {
      id: 'integrate',
      title: 'Integrate over Tb',
      caption: `Running sum, reset at each bit boundary. A clean bit reaches ±${peak}.`,
      waveform: integrated,
      samplesPerBit: codeLength,
      readouts: [
        { label: 'Σ per bit', value: decisions.map((_, b) => formatSum(integrated, b, codeLength)).join(', ') },
        {
          label: 'Interferer adds',
          value:
            interfererIndex === null
              ? 'n/a'
              : `${interfererContribution > 0 ? '+' : ''}${interfererContribution} of ${peak}`,
        },
      ],
    },
    {
      id: 'decide',
      title: 'Recovered bit',
      caption:
        'Sign of the integral. Σ > 0 → +1, Σ < 0 → −1. Compare against the first panel: the ' +
        'bits should match.',
      waveform: decisionWave,
      samplesPerBit: codeLength,
      readouts: [
        { label: 'Recovered', value: decisions.map((b) => (b === 1 ? '+1' : '−1')).join(', ') },
        {
          label: 'Correct',
          value: decisions.every((d, i) => d === bits[i]) ? 'yes, all bits recovered' : 'no, a bit flipped',
        },
      ],
    },
  ];
}

function formatSum(integrated: number[], bitIndex: number, codeLength: number): string {
  const v = integrated[(bitIndex + 1) * codeLength - 1];
  return `${v > 0 ? '+' : ''}${v}`;
}

/* ------------------------------------------------------------------ *
 * Self-jamming: correlation as a function of interferer delay.
 * Deck slide 07, aligned gives 0, one chip late gives 4 out of 8.
 * ------------------------------------------------------------------ */

export interface MisalignmentPoint {
  delayChips: number;
  correlation: number;
}

/**
 * Correlation leaked by an interfering Walsh code at each chip delay, for the
 * short code family. At zero delay the result is 0 for any distinct pair, that
 * is orthogonality. At non-zero delay it generally is not.
 */
export function misalignmentProfile(
  wantedIndex: number,
  interfererIndex: number,
  codeLength: number,
): MisalignmentPoint[] {
  const wanted = walshSequence(wantedIndex, codeLength);
  const other = walshSequence(interfererIndex, codeLength);
  const out: MisalignmentPoint[] = [];

  for (let delay = 0; delay < codeLength; delay += 1) {
    const shifted = other.map((_, i) => other[(i - delay + codeLength) % codeLength]);
    out.push({ delayChips: delay, correlation: innerProduct(wanted, shifted) });
  }
  return out;
}
