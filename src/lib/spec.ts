/**
 * spec.ts — every numerical specification used anywhere in this site.
 *
 * SINGLE SOURCE OF TRUTH. Each value below is taken from the course deck
 * "SIGNAL_LAB_CDMA_IS95" (21ECO103T Modern Wireless Communication System,
 * Unit 4 — Code Division Multiple Access), which in turn cites the Unit-4
 * course reference "3G and Beyond", CDMA / IS-95 section, slides 26-58.
 *
 * The `slide` field on each group records where the figure comes from so a
 * reader can check it. Nothing in this file is invented: if the deck does not
 * state a number, it is not here, and the component that would have needed it
 * carries a visible disclosure instead (see `DISCLOSURES`).
 */

export const SOURCE = {
  deck: 'SIGNAL_LAB_CDMA_IS95',
  course: '21ECO103T — Modern Wireless Communication System',
  unit: 'Unit 4 · Code Division Multiple Access',
  reference: 'Unit-4: 3G and Beyond — course deck, CDMA / IS-95 section (slides 26–58)',
} as const;

/* ------------------------------------------------------------------ *
 * RF and spreading  (deck slides 05, 10)
 * ------------------------------------------------------------------ */

export interface Band {
  id: 'reverse' | 'forward';
  label: string;
  lowMHz: number;
  highMHz: number;
  direction: string;
  short: string;
}

export const REVERSE_BAND: Band = {
  id: 'reverse',
  label: 'Reverse link',
  lowMHz: 824,
  highMHz: 849,
  direction: 'mobile station → base station',
  short: 'MS → BS',
};

export const FORWARD_BAND: Band = {
  id: 'forward',
  label: 'Forward link',
  lowMHz: 869,
  highMHz: 894,
  direction: 'base station → mobile station',
  short: 'BS → MS',
};

export const BANDS: Band[] = [REVERSE_BAND, FORWARD_BAND];

export const RF = {
  /** Deck slide 10: "45 MHz between a reverse channel and its forward pair". */
  duplexSeparationMHz: 45,
  /** Deck slides 05 & 10: "Channel bandwidth 1.25 MHz — one carrier, one direction". */
  nominalChannelBandwidthMHz: 1.25,
  /** Deck slide 10: each licensed band is 25 MHz wide. */
  bandSpanMHz: 25,
  /** Deck slide 05: "Chip rate 1.2288 Mchip/s — fixed for every channel". */
  chipRateCps: 1_228_800,
  /** Deck slide 05: "Peak user rate 9.6 kb/s — per traffic channel". */
  exampleInfoRateBps: 9_600,
  /** Deck slide 05: "Total spreading 128 = 1.2288 Mchip/s ÷ 9.6 kb/s". */
  exampleSpreadingFactor: 128,
  /** Axis limits for the spectrum plot — presentation choice, matches slide 10. */
  axisLowMHz: 820,
  axisHighMHz: 900,
} as const;

/** Deck slide 05 — the standard at a glance. */
export const STANDARD_FACTS: { label: string; value: string; note: string }[] = [
  { label: 'Standard', value: 'IS-95', note: 'cdmaOne · TIA Interim Standard 95 · 2G' },
  { label: 'Access method', value: 'DS-CDMA', note: 'Direct-sequence spread spectrum' },
  { label: 'Channel bandwidth', value: '1.25 MHz', note: 'On each one-way link' },
  { label: 'Chip rate', value: '1.2288 Mchip/s', note: 'Fixed for every channel' },
  { label: 'Peak user rate', value: '9.6 kb/s', note: 'Per traffic channel' },
  { label: 'Total spreading', value: '128', note: '1.2288 Mchip/s ÷ 9.6 kb/s' },
  { label: 'Speech coder', value: 'QCELP', note: '9600 b/s, falling to 1200 b/s in silence' },
  { label: 'Spectrum', value: 'AMPS bands', note: 'Built for dual-mode handsets during migration' },
];

/**
 * Deck slide 05, "NOT TO BE CONFUSED WITH". Kept as data so the warning can be
 * rendered wherever a chip rate is shown.
 */
export const NOT_WCDMA =
  'W-CDMA, the 3G UMTS air interface at 3.84 Mchip/s, is a different and later standard. ' +
  'Every figure on this site is IS-95 (cdmaOne).';

/** Information rates the deck names for a traffic channel (b/s). */
export const TRAFFIC_RATES_BPS = [9600, 4800, 2400, 1200] as const;
export type TrafficRateBps = (typeof TRAFFIC_RATES_BPS)[number];

/** Deck slide 12: paging channel rates. */
export const PAGING_RATES_BPS = [9600, 4800, 2400] as const;

/** Deck slide 12: sync channel rate. */
export const SYNC_RATE_BPS = 1200;

/** Deck slide 14: access channel rate, fixed. */
export const ACCESS_RATE_BPS = 4800;

/** Deck slides 12-14: both links use 20 ms frames. */
export const FRAME_MS = 20;

/* ------------------------------------------------------------------ *
 * Power control  (deck slide 09)
 * ------------------------------------------------------------------ */

export const POWER_CONTROL = {
  updateIntervalMs: 1.25,
  stepDb: 1,
  bitsPerCommand: 1,
  commandLink: 'forward link',
} as const;

/* ------------------------------------------------------------------ *
 * Codes  (deck slides 11-14)
 * ------------------------------------------------------------------ */

export const CODES = {
  /** Deck slides 11, 12: 64 Walsh functions, "Walsh code n is channel n". */
  walshOrder: 64,
  /** Deck slide 13: Walsh covering on the forward link, 64 chips per symbol. */
  walshChipsPerSymbol: 64,
  /** Deck slides 11, 14: long-code period 2^42 − 1. */
  longCodeRegisterStages: 42,
  longCodePeriodExpression: '2^42 − 1',
  /** Deck slide 14: Q branch delayed half a chip on the reverse link. */
  halfChipDelayNs: 406.901,
} as const;

/** The eight-chip teaching example the deck uses on slide 04. */
export const CHIP_DEMO = {
  codeLength: 8,
  /** Deck slide 04: "Tb ÷ Tc. Eight in this example; 128 in total for IS-95." */
  note: 'Tb = 8 Tc in the deck’s worked example; the full IS-95 figure is 128.',
  correlationPeak: 8,
} as const;

/** Deck slide 07: aligned vs. one-chip-late correlation of the 8-chip example. */
export const SELF_JAMMING_DEMO = {
  alignedSum: 0,
  oneChipLateSum: 4,
  outOf: 8,
} as const;

/* ------------------------------------------------------------------ *
 * Honest disclosure of every simplification on this site.
 * Rendered by <Disclosure/> and collected on the overview page, so that
 * acceptance criterion 12 ("every simplification is disclosed") is met in
 * one place rather than scattered through prose.
 * ------------------------------------------------------------------ */

export interface DisclosureItem {
  id: string;
  where: string;
  text: string;
}

export const DISCLOSURES: DisclosureItem[] = [
  {
    id: 'not-a-modem',
    where: 'Whole site',
    text:
      'This is a teaching instrument, not an IS-95 modem. It implements the Walsh family and ' +
      'LFSR mathematics exactly, and models everything else — vocoding, convolutional coding, ' +
      'interleaving, RF — as labelled block diagrams rather than running signal processing.',
  },
  {
    id: 'spectrum-shape',
    where: '01 — RF & Spreading',
    text:
      'Spectral shapes in the plots are schematic. The deck marks its own spectrum figures ' +
      '"shape is schematic"; no power spectral density has been measured or simulated here.',
  },
  {
    id: 'spreading-factor',
    where: '01 — RF & Spreading',
    text:
      'Chip rate ÷ information rate is one ratio, not the whole story. The deck calls 128 the ' +
      '"total spreading" for 9.6 kb/s, and the pipelines in module 04 show where the rate ' +
      'actually changes: convolutional coding, repetition and Walsh covering each contribute.',
  },
  {
    id: 'pn-polynomials',
    where: '03 — Code Explorer · PN sequences',
    text:
      'The generator polynomials of the IS-95 pilot PN sequences are not given in the course ' +
      'reference, so this explorer generates short maximal-length sequences from standard ' +
      'primitive polynomials instead. The sequences are mathematically genuine m-sequences; ' +
      'they are not the IS-95 I and Q pilot sequences and are not labelled as such.',
  },
  {
    id: 'long-code-model',
    where: '03 — Code Explorer · Long codes',
    text:
      'The IS-95 long code uses a 42-stage register with period 2^42 − 1 and a 42-bit user ' +
      'mask. The course reference states those facts but not the polynomial taps or initial ' +
      'state, so this page runs a scaled-down register of the same architecture. Structure and ' +
      'mask behaviour are faithful; the specific taps are illustrative, not standard-compliant.',
  },
  {
    id: 'walsh-alignment',
    where: '03 — Code Explorer · Walsh functions',
    text:
      'Correlation results assume perfectly aligned codes of equal duration over one full ' +
      'period. That assumption holds on the synchronous forward link and does not hold between ' +
      'asynchronous reverse-link mobiles — the misalignment control shows what breaks.',
  },
  {
    id: 'paging-config',
    where: '02 & 04 — Channel allocation',
    text:
      'The deck’s numbering (pilot W0, sync W32, paging W1–W7, traffic W8–W31 and W33–W63) is ' +
      'the reference layout. How many paging channels an operator actually configures moves the ' +
      'paging/traffic boundary, which is why that control exists.',
  },
  {
    id: 'trace-rates',
    where: '05 — Trace a Signal',
    text:
      'The trace reports the rates the deck prints on its own signal paths. Intermediate rates ' +
      'for the 4800, 2400 and 1200 b/s cases are derived from the deck’s repetition rule ' +
      '(symbol repetition holds the output rate constant), not read off a measurement.',
  },
];
