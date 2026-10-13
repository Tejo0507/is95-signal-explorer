/**
 * trace.ts — the end-to-end trace that connects all four earlier modules.
 *
 * Given a link direction, an information rate and a code configuration, this
 * builds the seven-stage path:
 *
 *   1 RF allocation
 *   2 Channel bandwidth
 *   3 Logical channel
 *   4 Code assignment / code-processing role
 *   5 Physical-layer processing
 *   6 Modulated signal representation
 *   7 Receiver processing
 *
 * Every figure comes from lib/spec.ts, lib/channels.ts or lib/pipelines.ts, so
 * the trace cannot drift out of agreement with the modules it summarises. The
 * two directions produce genuinely different text at every stage except the
 * two the links actually share (bandwidth and chip rate).
 */

import { FORWARD_BAND, REVERSE_BAND, RF, FRAME_MS, CODES, POWER_CONTROL } from './spec';
import type { TrafficRateBps } from './spec';
import { forwardAllocation } from './channels';
import { pipelineFor, repetitionFactor, type LinkDirection } from './pipelines';

export interface TraceStage {
  id: string;
  num: number;
  name: string;
  /** The headline value for this stage, shown on the path. */
  value: string;
  /** One-line answer to "what is happening here?". */
  summary: string;
  /** The fuller explanation in the detail panel. */
  detail: string;
  /** Which module this stage draws on, for cross-referencing. */
  source: string;
  /** True when this stage is identical on both links. */
  shared: boolean;
}

export interface TraceConfig {
  link: LinkDirection;
  rate: TrafficRateBps;
  /** Forward: the Walsh index assigned to this traffic channel. */
  walshIndex: number;
  /** Reverse: which illustrative user mask is in use. */
  userLabel: string;
  /** Carrier centre frequency on the forward link, in MHz. */
  forwardCentreMHz: number;
}

export const DEFAULT_TRACE: TraceConfig = {
  link: 'forward',
  rate: 9600,
  walshIndex: 19,
  userLabel: 'User B',
  forwardCentreMHz: 880,
};

export function buildTrace(cfg: TraceConfig): TraceStage[] {
  const isForward = cfg.link === 'forward';
  const band = isForward ? FORWARD_BAND : REVERSE_BAND;
  const centre = isForward
    ? cfg.forwardCentreMHz
    : cfg.forwardCentreMHz - RF.duplexSeparationMHz;
  const pairCentre = isForward ? centre - RF.duplexSeparationMHz : centre + RF.duplexSeparationMHz;

  const stages = pipelineFor(cfg.link, cfg.rate);
  const repeat = repetitionFactor(cfg.rate);
  const allocation = forwardAllocation(7);
  const slot = allocation[cfg.walshIndex];

  const fmt = (n: number) => n.toLocaleString('en-US');

  return [
    {
      id: 'rf',
      num: 1,
      name: 'RF allocation',
      value: `${band.lowMHz}–${band.highMHz} MHz`,
      summary: `${band.label} — ${band.direction}.`,
      detail:
        `This signal lives in the ${band.lowMHz}–${band.highMHz} MHz band, ${RF.bandSpanMHz} MHz ` +
        `wide, carrying traffic ${band.direction}. Its carrier sits at ${centre.toFixed(2)} MHz, and ` +
        `the paired channel in the other direction is at ${pairCentre.toFixed(2)} MHz — the fixed ` +
        `${RF.duplexSeparationMHz} MHz duplex separation, which is what lets the handset transmit ` +
        `and receive simultaneously without deafening itself.`,
      source: '01 — RF & Spreading',
      shared: false,
    },
    {
      id: 'bandwidth',
      num: 2,
      name: 'Channel bandwidth',
      value: `${RF.nominalChannelBandwidthMHz} MHz · ${(RF.chipRateCps / 1e6).toFixed(4)} Mc/s`,
      summary: 'Identical on both links — one of the few things that is.',
      detail:
        `The carrier occupies a nominal ${RF.nominalChannelBandwidthMHz} MHz, and chips run at ` +
        `${(RF.chipRateCps / 1e6).toFixed(4)} Mchip/s. Both figures are the same in both ` +
        `directions. Note that ${RF.bandSpanMHz} MHz of licensed band is not one carrier: at ` +
        `${RF.nominalChannelBandwidthMHz} MHz each, it nominally accommodates ` +
        `${RF.bandSpanMHz / RF.nominalChannelBandwidthMHz} of them. And the chip rate is a rate, ` +
        `not a width — it describes what happens inside the channel.`,
      source: '01 — RF & Spreading',
      shared: true,
    },
    {
      id: 'logical',
      num: 3,
      name: 'Logical channel',
      value: isForward ? `Forward traffic · W${cfg.walshIndex}` : 'Reverse traffic channel',
      summary: isForward
        ? `${slot.label} on this carrier, one of up to 64 logical channels.`
        : 'One of many mobiles sharing the carrier, identified by long code.',
      detail: isForward
        ? `Up to 64 logical channels share this carrier, and Walsh code n is channel n. W0 is the ` +
          `pilot, W32 is sync, W1–W7 are paging, and this channel — W${cfg.walshIndex} — is one of ` +
          `the 55 traffic channels in the reference layout. It carries user voice or data at ` +
          `${fmt(cfg.rate)} b/s in ${FRAME_MS} ms frames, plus the power-control subchannel: one ` +
          `bit every ${POWER_CONTROL.updateIntervalMs} ms commanding that mobile ±${POWER_CONTROL.stepDb} dB.`
        : `There is no Walsh index identifying this channel. Every mobile on the carrier runs the ` +
          `same processing chain, and the base station tells them apart by their long codes — ` +
          `here, ${cfg.userLabel}'s ${CODES.longCodeRegisterStages}-bit mask. The channel carries ` +
          `voice or data at ${fmt(cfg.rate)} b/s in ${FRAME_MS} ms frames. The companion access ` +
          `channel, fixed at 4800 b/s, is what the mobile used to get here in the first place.`,
      source: '02 — Logical Channels',
      shared: false,
    },
    {
      id: 'code',
      num: 4,
      name: isForward ? 'Code assignment' : 'Code-processing role',
      value: isForward ? `Walsh W${cfg.walshIndex} channelises` : 'Walsh modulates · long code identifies',
      summary: isForward
        ? 'Walsh functions separate channels; the long code scrambles one user.'
        : 'Walsh functions carry data; the long code separates users.',
      detail: isForward
        ? `Two codes act here, doing different jobs. W${cfg.walshIndex} CHANNELISES: each symbol ` +
          `is multiplied by its 64 chips, and because the base station transmits every channel ` +
          `from one clock they arrive chip-aligned, so their mutual correlation really is zero. ` +
          `The long code, decimated 1:64 to 19 200 s/s, SCRAMBLES this user's symbols — privacy, ` +
          `not separation. The pilot PN sequences then spread I and Q and identify the cell by ` +
          `their offset.`
        : `The roles swap. Walsh functions here are the MODULATION: six coded symbols select ` +
          `which one of 64 functions to transmit, so the index is data, not a channel name — and ` +
          `the receiver can correlate against all 64 without needing a phase reference. ` +
          `Separation between mobiles comes from the long code (period ` +
          `${CODES.longCodePeriodExpression}, ${cfg.userLabel}'s mask). Those codes are only ` +
          `quasi-orthogonal on arrival because the mobiles are asynchronous, which is why power ` +
          `control is mandatory rather than merely helpful.`,
      source: '03 — Code Explorer',
      shared: false,
    },
    {
      id: 'physical',
      num: 5,
      name: 'Physical-layer processing',
      value: `${stages.length} stages · ${isForward ? 'r = 1/2' : 'r = 1/3'}, K = 9`,
      summary: isForward
        ? 'Vocoder → rate 1/2 coding → repetition → 24 × 16 interleaving → MUX → Walsh covering.'
        : 'Source → rate 1/3 coding → repetition → 32 × 18 interleaving → 64-ary Walsh → burst randomiser → long code.',
      detail: isForward
        ? `QCELP at ${fmt(cfg.rate)} b/s, rate 1/2 convolutional coding to ${fmt(cfg.rate * 2)} ` +
          `sym/s, ${repeat === 1 ? 'no repetition at full rate' : `repetition ×${repeat}`} to a ` +
          `constant 19 200 sym/s, a 24 × 16 block interleaver over the ${FRAME_MS} ms frame, then ` +
          `the MUX adds long-code scrambling and the power-control bit. Walsh covering turns each ` +
          `symbol into 64 chips, reaching ${(RF.chipRateCps / 1e6).toFixed(4)} Mc/s.`
        : `Source at ${fmt(cfg.rate)} b/s, rate 1/3 coding to ${fmt(cfg.rate * 3)} sym/s — more ` +
          `redundancy than the forward link, because there is no pilot to detect coherently ` +
          `against. ${repeat === 1 ? 'No repetition at full rate' : `Repetition ×${repeat}`} to ` +
          `28 800 sym/s, a 32 × 18 interleaver, then 64-ary Walsh modulation at 28 800 × 64 ÷ 6 = ` +
          `307 200 c/s. The burst randomiser gates repeated copies off the air, and long-code ` +
          `spreading multiplies by four to ${(RF.chipRateCps / 1e6).toFixed(4)} Mc/s.`,
      source: '04 — Physical Allocation',
      shared: false,
    },
    {
      id: 'modulation',
      num: 6,
      name: 'Modulated signal',
      value: isForward ? 'QPSK quadrature spreading' : `OQPSK · Q delayed ${CODES.halfChipDelayNs} ns`,
      summary: isForward
        ? 'Pilot PN on I and Q, plain QPSK, transmitted from mains power.'
        : 'Pilot PN on I and Q, Q offset half a chip to spare the handset amplifier.',
      detail: isForward
        ? `The chip stream is spread by the pilot PN sequences on I and Q and QPSK modulated onto ` +
          `a carrier at ${centre.toFixed(2)} MHz. The base station is mains-powered, so there is ` +
          `no pressure to keep the envelope flat. All 64 channels of the cell are summed into this ` +
          `one signal.`
        : `The chip stream is spread by the pilot PN sequences on I and Q, then offset-QPSK: the Q ` +
          `branch is delayed half a chip, ${CODES.halfChipDelayNs} ns. I and Q therefore never ` +
          `change at the same instant, the phase never jumps 180°, and the envelope varies less — ` +
          `so a battery-powered amplifier can run closer to saturation. Transmit power follows the ` +
          `power-control bits arriving every ${POWER_CONTROL.updateIntervalMs} ms.`,
      source: '04 — Physical Allocation',
      shared: false,
    },
    {
      id: 'receiver',
      num: 7,
      name: 'Receiver processing',
      value: isForward ? 'Coherent · pilot phase reference' : 'Non-coherent · correlate all 64',
      summary: isForward
        ? 'The mobile despreads on pilot timing, correlates for its Walsh code, decodes coherently.'
        : 'The base station correlates for each long code and picks the largest of 64 Walsh outputs.',
      detail: isForward
        ? `The mobile correlates for the pilot PN sequence to get chip timing and the cell's ` +
          `offset, correlates against W${cfg.walshIndex} to pull out this channel and reject the ` +
          `other 63, demodulates coherently using the pilot's phase, descrambles the long code, ` +
          `deinterleaves 24 × 16, Viterbi-decodes the rate 1/2 K = 9 code, and hands ` +
          `${fmt(cfg.rate)} b/s to the vocoder. The chain is the transmitter's, undone.`
        : `The base station despreads with ${cfg.userLabel}'s long code, correlates the result ` +
          `against all 64 Walsh functions and takes the largest — that index is the six recovered ` +
          `symbols, and no phase reference was needed to find it. It then deinterleaves 32 × 18 ` +
          `and Viterbi-decodes the rate 1/3 code. Every other mobile on the carrier contributes ` +
          `residual interference to this decision, which is what power control exists to bound.`,
      source: '04 — Physical Allocation',
      shared: false,
    },
  ];
}

/* ------------------------------------------------------------------ *
 * Compact shared/changed comparison for the trace footer.
 * ------------------------------------------------------------------ */

export interface TraceComparison {
  property: string;
  forward: string;
  reverse: string;
  shared: boolean;
}

export function traceComparison(rate: TrafficRateBps): TraceComparison[] {
  const repeat = repetitionFactor(rate);
  return [
    { property: 'Band', forward: '869–894 MHz', reverse: '824–849 MHz', shared: false },
    { property: 'Channel bandwidth', forward: '1.25 MHz', reverse: '1.25 MHz', shared: true },
    { property: 'Chip rate', forward: '1.2288 Mchip/s', reverse: '1.2288 Mchip/s', shared: true },
    { property: 'Frame length', forward: `${FRAME_MS} ms`, reverse: `${FRAME_MS} ms`, shared: true },
    { property: 'Information rate', forward: `${rate.toLocaleString('en-US')} b/s`, reverse: `${rate.toLocaleString('en-US')} b/s`, shared: true },
    { property: 'Repetition factor', forward: repeat === 1 ? 'none' : `×${repeat}`, reverse: repeat === 1 ? 'none' : `×${repeat}`, shared: true },
    { property: 'Convolutional code', forward: 'r = 1/2, K = 9', reverse: 'r = 1/3, K = 9', shared: false },
    { property: 'Symbol rate after repetition', forward: '19 200 sym/s', reverse: '28 800 sym/s', shared: false },
    { property: 'Interleaver', forward: '24 × 16', reverse: '32 × 18', shared: false },
    { property: 'Walsh functions do', forward: 'Channelisation', reverse: '64-ary modulation', shared: false },
    { property: 'Users separated by', forward: 'Walsh index', reverse: 'Long code', shared: false },
    { property: 'Long code runs at', forward: '1.2288 Mc/s, decimated 1:64', reverse: '1.2288 Mc/s, full rate', shared: false },
    { property: 'Modulation', forward: 'QPSK', reverse: 'OQPSK, Q delayed ½ Tc', shared: false },
    { property: 'Detection', forward: 'Coherent (pilot)', reverse: 'Non-coherent', shared: false },
    { property: 'Orthogonality', forward: 'Preserved in cell', reverse: 'Not guaranteed', shared: false },
    { property: 'Power control', forward: 'Sends the command', reverse: 'Obeys it — mandatory', shared: false },
  ];
}
