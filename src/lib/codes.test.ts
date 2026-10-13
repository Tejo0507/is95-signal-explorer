/**
 * codes.test.ts — tests for the claims the site makes on screen.
 *
 * These are not coverage exercises. Each one checks a specific statement a
 * student will read in the interface, so that if the maths ever drifts the
 * failure is named rather than silent. Run with `npm test`.
 */

import { describe, expect, it } from 'vitest';

import { CHIP_DEMO, CODES, RF, SELF_JAMMING_DEMO } from './spec';
import {
  correlationVsShift,
  cyclicShift,
  familyIsOrthogonal,
  innerProduct,
  walshChip,
  misalignmentSurvey,
  walshIndexFromSixBits,
  walshSequence,
} from './walsh';
import {
  PN_POLYNOMIALS,
  hasIdealAutocorrelation,
  normalizeSeed,
  periodicAutocorrelation,
  pnBinary,
  pnPeriod,
  balance,
} from './pn';
import { detectPhaseOffset, longCodeBinary, normalizeMask, decimate } from './longcode';
import { buildSpreadingStages, misalignmentProfile, spreadingFactor } from './spreading';
import { allocationCounts, forwardAllocation } from './channels';
import { forwardPipeline, repetitionFactor, reversePipeline } from './pipelines';

/* ================================================================== *
 * Walsh functions — the forward link's channelisation codes
 * ================================================================== */

describe('Walsh functions', () => {
  it('generates W0 as all +1 — the deck’s "all zeros, always on" pilot', () => {
    expect(walshSequence(0, 64)).toEqual(new Array(64).fill(1));
  });

  it('generates W32 as the half-period square wave the sync channel uses', () => {
    const w32 = walshSequence(32, 64);
    // Row 32 of H(64) has bit 5 set, so the sign flips exactly at chip 32.
    expect(w32.slice(0, 32)).toEqual(new Array(32).fill(1));
    expect(w32.slice(32)).toEqual(new Array(32).fill(-1));
  });

  it('is symmetric: chip j of code i equals chip i of code j', () => {
    for (let i = 0; i < 64; i += 4) {
      for (let j = 0; j < 64; j += 4) {
        expect(walshChip(i, j)).toBe(walshChip(j, i));
      }
    }
  });

  it('self-correlates to the full code length', () => {
    for (const i of [0, 1, 19, 32, 41, 63]) {
      const seq = walshSequence(i, 64);
      expect(innerProduct(seq, seq)).toBe(64);
    }
  });

  it('has zero inner product for every one of the 2 016 distinct aligned pairs', () => {
    // This is the claim the orthogonality strip in the UI reports as verified.
    expect(familyIsOrthogonal(CODES.walshOrder)).toBe(true);

    let pairs = 0;
    for (let i = 0; i < 64; i += 1) {
      for (let j = i + 1; j < 64; j += 1) {
        expect(innerProduct(walshSequence(i, 64), walshSequence(j, 64))).toBe(0);
        pairs += 1;
      }
    }
    expect(pairs).toBe((64 * 63) / 2);
  });

  it('can lose orthogonality under misalignment — but only for some pairs', () => {
    // W4/W5 leak once shifted; W1/W2 do not. Both facts matter: the first is
    // why alignment is load-bearing, the second is why the UI must not promise
    // that every misaligned pair misbehaves.
    const leaky = correlationVsShift(walshSequence(4, 64), walshSequence(5, 64));
    expect(leaky[0]).toBe(0);
    expect(leaky.some((v) => v !== 0)).toBe(true);

    const robust = correlationVsShift(walshSequence(1, 64), walshSequence(2, 64));
    expect(robust.every((v) => v === 0)).toBe(true);
  });

  it('surveys the family: 651 of 2 016 pairs leak at some cyclic shift', () => {
    // The figure the Walsh explorer reports. Pinned here so that if the
    // construction or the shift convention ever changes, the claim on screen
    // cannot silently become wrong.
    const survey = misalignmentSurvey(64);
    expect(survey.total).toBe((64 * 63) / 2);
    expect(survey.total).toBe(2016);
    expect(survey.leaky).toBe(651);
    expect(survey.clean).toBe(1365);
  });

  it('reproduces the deck’s 8-chip self-jamming figures: 0 aligned, 4 of 8 one chip late', () => {
    // Deck slide 07 shows an 8-chip pair that cancels exactly when aligned and
    // leaves 4 of a possible 8 at one chip of delay. W4/W5 of the 8-chip Walsh
    // family behave exactly so — which is why they are the demo's default.
    const a = walshSequence(4, CHIP_DEMO.codeLength);
    const b = walshSequence(5, CHIP_DEMO.codeLength);

    expect(innerProduct(a, b)).toBe(SELF_JAMMING_DEMO.alignedSum);
    expect(Math.abs(innerProduct(a, cyclicShift(b, 1)))).toBe(SELF_JAMMING_DEMO.oneChipLateSum);
    expect(CHIP_DEMO.codeLength).toBe(SELF_JAMMING_DEMO.outOf);
  });

  it('maps six bits to a Walsh index for 64-ary reverse-link modulation', () => {
    expect(walshIndexFromSixBits([0, 0, 0, 0, 0, 0])).toBe(0);
    expect(walshIndexFromSixBits([1, 1, 1, 1, 1, 1])).toBe(63);
    expect(walshIndexFromSixBits([1, 0, 0, 1, 1, 0])).toBe(0b100110);
  });
});

/* ================================================================== *
 * PN sequences
 * ================================================================== */

describe('maximal-length PN sequences', () => {
  it('has period 2^n − 1 for every tabulated polynomial', () => {
    for (const poly of PN_POLYNOMIALS) {
      expect(poly.period).toBe(2 ** poly.degree - 1);
    }
  });

  it('actually repeats after exactly one period', () => {
    for (const poly of PN_POLYNOMIALS) {
      const seed = normalizeSeed([1], poly.degree);
      const bits = pnBinary(poly, seed, poly.period * 2);
      expect(bits.slice(0, poly.period)).toEqual(bits.slice(poly.period));
    }
  });

  it('has the ideal autocorrelation signature: peak = period, −1 everywhere else', () => {
    // This is what the stem plot in the PN explorer shows, and the claim the
    // readout labels "verified from the generated bits".
    for (const poly of PN_POLYNOMIALS) {
      const seq = pnPeriod(poly, normalizeSeed([1], poly.degree));
      const ac = periodicAutocorrelation(seq);

      expect(ac[0]).toBe(poly.period);
      expect(ac.slice(1).every((v) => v === -1)).toBe(true);
      expect(hasIdealAutocorrelation(seq)).toBe(true);
    }
  });

  it('is balanced to within one bit', () => {
    for (const poly of PN_POLYNOMIALS) {
      const { ones, zeros } = balance(pnBinary(poly, normalizeSeed([1], poly.degree), poly.period));
      expect(Math.abs(ones - zeros)).toBe(1);
      expect(ones + zeros).toBe(poly.period);
    }
  });

  it('never leaves an all-zero register, which would be a dead generator', () => {
    expect(normalizeSeed([0, 0, 0, 0, 0], 5)).toEqual([1, 1, 1, 1, 1]);
    expect(normalizeSeed([0, 1, 0], 3)).toEqual([0, 1, 0]);
  });
});

/* ================================================================== *
 * Long codes — the masked generator
 * ================================================================== */

describe('masked long-code generator', () => {
  it('produces the same m-sequence at a different phase for every non-zero mask', () => {
    // The claim the UI makes: a mask is a phase offset, not a different code.
    const degree = 6;
    const seed = normalizeMask([1], degree);
    const period = 2 ** degree - 1;

    const reference = longCodeBinary(degree, seed, normalizeMask([1], degree), period * 2);

    // Walk every non-zero mask for this register length.
    for (let m = 1; m < 2 ** degree; m += 1) {
      const mask = Array.from({ length: degree }, (_, i) => (m >> i) & 1);
      const offset = detectPhaseOffset(degree, seed, mask);

      expect(offset).not.toBeNull();

      const masked = longCodeBinary(degree, seed, mask, period);
      expect(masked).toEqual(reference.slice(offset!, offset! + period));
    }
  });

  it('keeps the period at 2^n − 1 whatever the mask', () => {
    const degree = 5;
    const period = 2 ** degree - 1;
    const seed = normalizeMask([1, 1], degree);

    for (const mask of [[1, 0, 0, 0, 0], [1, 0, 1, 1, 0], [0, 1, 1, 0, 1]]) {
      const bits = longCodeBinary(degree, seed, normalizeMask(mask, degree), period * 2);
      expect(bits.slice(0, period)).toEqual(bits.slice(period));
    }
  });

  it('falls back to stage 1 for an all-zero mask, which would otherwise emit only zeros', () => {
    expect(normalizeMask([0, 0, 0, 0], 4)).toEqual([1, 0, 0, 0]);
  });

  it('decimates by taking every Nth element, as the forward link’s 1:64 decimator does', () => {
    expect(decimate([1, 2, 3, 4, 5, 6, 7, 8], 4)).toEqual([1, 5]);
    expect(decimate(new Array(640).fill(1), 64)).toHaveLength(10);
  });
});

/* ================================================================== *
 * Spreading arithmetic — the headline 128
 * ================================================================== */

describe('spreading factor', () => {
  it('gives 128 for the deck’s 1.2288 Mchip/s and 9.6 kb/s example', () => {
    const r = spreadingFactor(RF.exampleInfoRateBps);
    expect(r.factor).toBe(128);
    expect(r.factor).toBe(RF.exampleSpreadingFactor);
    expect(r.exact).toBe(true);
    expect(RF.chipRateCps).toBe(1_228_800);
  });

  it('gives the processing gain in dB', () => {
    expect(spreadingFactor(9600).gainDb).toBeCloseTo(21.07, 2);
  });

  it('scales inversely with the information rate across all four vocoder rates', () => {
    expect(spreadingFactor(4800).factor).toBe(256);
    expect(spreadingFactor(2400).factor).toBe(512);
    expect(spreadingFactor(1200).factor).toBe(1024);
  });

  it('reports a non-integer ratio honestly rather than rounding it', () => {
    const r = spreadingFactor(7000);
    expect(r.exact).toBe(false);
    expect(r.factor).toBeCloseTo(175.54, 2);
  });

  it('derives Tb and Tc as reciprocals of their rates', () => {
    const r = spreadingFactor(9600);
    expect(r.bitDurationS).toBeCloseTo(1 / 9600, 12);
    expect(r.chipDurationS).toBeCloseTo(1 / 1_228_800, 12);
    expect(r.bitDurationS / r.chipDurationS).toBeCloseTo(128, 9);
  });
});

describe('spread and recover cycle', () => {
  it('recovers every transmitted bit on a clean channel', () => {
    const stages = buildSpreadingStages({
      bits: [1, -1, -1, 1],
      codeIndex: 3,
      codeLength: 8,
      interfererIndex: null,
      interfererDelayChips: 0,
    });
    const decide = stages.find((s) => s.id === 'decide')!;
    const readout = decide.readouts!.find((r) => r.label === 'Correct')!;
    expect(readout.value).toContain('all bits recovered');
  });

  it('recovers every bit despite an aligned orthogonal interferer', () => {
    // The property the whole scheme rests on: an aligned orthogonal user
    // contributes exactly zero to the correlator.
    const stages = buildSpreadingStages({
      bits: [1, -1],
      codeIndex: 3,
      codeLength: 8,
      interfererIndex: 5,
      interfererDelayChips: 0,
    });
    const decide = stages.find((s) => s.id === 'decide')!;
    expect(decide.readouts!.find((r) => r.label === 'Correct')!.value).toContain('all bits recovered');

    const integrate = stages.find((s) => s.id === 'integrate')!;
    expect(integrate.readouts!.find((r) => r.label === 'Interferer adds')!.value).toBe('0 of 8');
  });

  it('reaches the full ±codeLength correlator peak', () => {
    const stages = buildSpreadingStages({
      bits: [1, -1],
      codeIndex: 3,
      codeLength: 8,
      interfererIndex: null,
      interfererDelayChips: 0,
    });
    const integrate = stages.find((s) => s.id === 'integrate')!;
    expect(integrate.readouts!.find((r) => r.label === 'Σ per bit')!.value).toBe('+8, -8');
  });

  it('builds all seven stages with waveforms of the right length', () => {
    const stages = buildSpreadingStages({
      bits: [1, -1],
      codeIndex: 3,
      codeLength: 8,
      interfererIndex: null,
      interfererDelayChips: 0,
    });
    expect(stages).toHaveLength(7);
    for (const s of stages) expect(s.waveform).toHaveLength(16);
  });

  it('shows zero leak at alignment and non-zero leak off it', () => {
    // W4/W5 again: the pair the demo defaults to, precisely because it leaks.
    const profile = misalignmentProfile(4, 5, 8);
    expect(profile[0]).toEqual({ delayChips: 0, correlation: 0 });
    expect(profile.some((p) => p.correlation !== 0)).toBe(true);
    expect(Math.abs(profile[1].correlation)).toBe(4);
  });
});

/* ================================================================== *
 * Forward-link Walsh allocation
 * ================================================================== */

describe('forward-link Walsh allocation', () => {
  it('matches the course reference exactly with seven paging channels', () => {
    const a = forwardAllocation(7);

    expect(a).toHaveLength(64);
    expect(a[0].kind).toBe('pilot');
    expect(a[32].kind).toBe('sync');

    // Paging W1–W7
    for (let i = 1; i <= 7; i += 1) expect(a[i].kind).toBe('paging');

    // Traffic W8–W31 and W33–W63
    for (let i = 8; i <= 31; i += 1) expect(a[i].kind).toBe('traffic');
    for (let i = 33; i <= 63; i += 1) expect(a[i].kind).toBe('traffic');
  });

  it('gives the deck’s 55 traffic channels in the reference layout', () => {
    const counts = allocationCounts(7);
    expect(counts).toEqual({ pilot: 1, sync: 1, paging: 7, traffic: 55 });
    // 24 indices in W8–W31 plus 31 in W33–W63.
    expect(counts.traffic).toBe(24 + 31);
  });

  it('moves only the paging/traffic boundary as the configuration changes', () => {
    for (let paging = 1; paging <= 7; paging += 1) {
      const counts = allocationCounts(paging);
      expect(counts.pilot).toBe(1);
      expect(counts.sync).toBe(1);
      expect(counts.paging).toBe(paging);
      expect(counts.traffic).toBe(62 - paging);

      const a = forwardAllocation(paging);
      expect(a[0].kind).toBe('pilot');
      expect(a[32].kind).toBe('sync');
    }
  });

  it('clamps an out-of-range paging count rather than producing a broken map', () => {
    expect(allocationCounts(0).paging).toBe(1);
    expect(allocationCounts(99).paging).toBe(7);
  });
});

/* ================================================================== *
 * Pipelines — rate arithmetic and the links' asymmetry
 * ================================================================== */

describe('pipeline rate arithmetic', () => {
  it('derives repetition factors that hold the symbol rate constant', () => {
    expect(repetitionFactor(9600)).toBe(1);
    expect(repetitionFactor(4800)).toBe(2);
    expect(repetitionFactor(2400)).toBe(4);
    expect(repetitionFactor(1200)).toBe(8);
  });

  it('reaches 19 200 sym/s on the forward link from every vocoder rate', () => {
    // rate 1/2 coding then repetition: R × 2 × (9600/R) = 19 200.
    for (const rate of [9600, 4800, 2400, 1200] as const) {
      expect(rate * 2 * repetitionFactor(rate)).toBe(19_200);
    }
  });

  it('reaches 28 800 sym/s on the reverse link from every vocoder rate', () => {
    // rate 1/3 coding then repetition: R × 3 × (9600/R) = 28 800.
    for (const rate of [9600, 4800, 2400, 1200] as const) {
      expect(rate * 3 * repetitionFactor(rate)).toBe(28_800);
    }
  });

  it('closes the deck’s reverse-link chain: 28 800 × 64 ÷ 6 × 4 = 1.2288 Mc/s', () => {
    const afterWalsh = (28_800 * 64) / 6;
    expect(afterWalsh).toBe(307_200);
    expect(afterWalsh * 4).toBe(RF.chipRateCps);
  });

  it('closes the forward-link chain: 19 200 × 64 = 1.2288 Mc/s', () => {
    expect(19_200 * CODES.walshChipsPerSymbol).toBe(RF.chipRateCps);
  });

  it('keeps the two pipelines structurally different', () => {
    const fwd = forwardPipeline(9600);
    const rev = reversePipeline(9600);

    // Different lengths, and different block identities — not one chain relabelled.
    expect(fwd.length).not.toBe(rev.length);
    expect(fwd.map((s) => s.id)).not.toEqual(rev.map((s) => s.id));

    // Each has the blocks only it has.
    expect(fwd.some((s) => s.id === 'mux')).toBe(true);
    expect(fwd.some((s) => s.id === 'walsh')).toBe(true);
    expect(rev.some((s) => s.id === 'walsh64')).toBe(true);
    expect(rev.some((s) => s.id === 'burst')).toBe(true);
    expect(fwd.some((s) => s.id === 'burst')).toBe(false);
    expect(rev.some((s) => s.id === 'mux')).toBe(false);

    // The coding rates the deck distinguishes.
    expect(fwd.find((s) => s.id === 'conv')!.param).toContain('1/2');
    expect(rev.find((s) => s.id === 'conv')!.param).toContain('1/3');
  });

  it('gives every stage all the fields the detail panel renders', () => {
    for (const stages of [forwardPipeline(9600), reversePipeline(4800)]) {
      for (const s of stages) {
        expect(s.name.length).toBeGreaterThan(0);
        expect(s.purpose.length).toBeGreaterThan(0);
        expect(s.input.length).toBeGreaterThan(0);
        expect(s.operation.length).toBeGreaterThan(0);
        expect(s.output.length).toBeGreaterThan(0);
        expect(s.rate.length).toBeGreaterThan(0);
        expect(s.next.length).toBeGreaterThan(0);
      }
    }
  });
});

/* ================================================================== *
 * The specification constants themselves
 * ================================================================== */

describe('specification constants', () => {
  it('holds the RF figures from the course reference', () => {
    expect(RF.duplexSeparationMHz).toBe(45);
    expect(RF.nominalChannelBandwidthMHz).toBe(1.25);
    expect(RF.bandSpanMHz).toBe(25);
    expect(RF.chipRateCps).toBe(1_228_800);
    expect(RF.exampleInfoRateBps).toBe(9_600);
  });

  it('keeps the duplex separation consistent with the two band edges', () => {
    // 869 − 824 = 45, and 894 − 849 = 45.
    expect(869 - 824).toBe(RF.duplexSeparationMHz);
    expect(894 - 849).toBe(RF.duplexSeparationMHz);
  });

  it('nominally fits 20 carriers in a 25 MHz band — so the band is not one carrier', () => {
    expect(RF.bandSpanMHz / RF.nominalChannelBandwidthMHz).toBe(20);
  });
});
