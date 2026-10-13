/**
 * pipelines.ts — the forward and reverse physical-layer processing chains.
 *
 * Stage order, block names and the rates printed on the signal paths all come
 * from the course deck: slide 13 for the forward link, slide 14 for the
 * reverse. The two chains are deliberately NOT the same shape — the forward
 * link convolutionally codes at rate 1/2, interleaves 24x16, multiplexes in the
 * power-control subchannel and decimated long code, then covers with one Walsh
 * function; the reverse link codes at rate 1/3, interleaves 32x18, uses 64-ary
 * Walsh modulation, randomises bursts and spreads with the full-rate long code.
 *
 * RATE ARITHMETIC
 * The deck prints rates for the 9.6 kb/s case. For 4800, 2400 and 1200 b/s it
 * states the rule instead of the numbers: symbol repetition is applied "if rate
 * < 9.6 k", which holds the post-repetition rate constant. So
 *
 *   forward:  R b/s --(r=1/2)--> 2R  --(repeat x 9600/R)--> 19 200 sym/s
 *   reverse:  R b/s --(r=1/3)--> 3R  --(repeat x 9600/R)--> 28 800 sym/s
 *
 * and the deck's own reverse-link arithmetic closes the chain:
 *
 *   28 800 sym/s x 64 / 6 = 307 200 chip/s      (64-ary Walsh modulation)
 *   307 200 chip/s x 4     = 1 228 800 chip/s   (long-code spreading)
 *
 * Values derived by that rule rather than read off the deck are flagged with
 * `derived: true` so the UI can mark them.
 */

import { CODES, FRAME_MS, POWER_CONTROL, RF, type TrafficRateBps } from './spec';

export type LinkDirection = 'forward' | 'reverse';

export interface PipelineStage {
  id: string;
  /** Short label for the block in the diagram. */
  name: string;
  /** Parameter printed inside the block, e.g. "r = 1/2, K = 9". */
  param?: string;
  purpose: string;
  input: string;
  operation: string;
  output: string;
  /** Rate on the output path, already formatted with units. */
  rate: string;
  /** True when `rate` follows from the deck's repetition rule, not printed in it. */
  derived?: boolean;
  /** What the following stage does with this output. */
  next: string;
}

const fmt = (n: number) => n.toLocaleString('en-US');

/** Symbol repetition factor needed to reach the full-rate symbol rate. */
export function repetitionFactor(rateBps: number): number {
  return Math.round(RF.exampleInfoRateBps / rateBps);
}

/* ------------------------------------------------------------------ *
 * Forward link — deck slide 13
 * ------------------------------------------------------------------ */

export function forwardPipeline(rateBps: TrafficRateBps): PipelineStage[] {
  const repeat = repetitionFactor(rateBps);
  const encoded = rateBps * 2; // rate 1/2 convolutional code
  const isFullRate = rateBps === RF.exampleInfoRateBps;

  return [
    {
      id: 'vocoder',
      name: 'Vocoder',
      param: 'QCELP',
      purpose: 'Turn speech into as few bits as the required quality allows.',
      input: 'Analogue speech from the microphone.',
      operation:
        'QCELP variable-rate speech coding, in 20 ms frames. The coder drops to a lower rate ' +
        'during silence — the deck notes 9600 b/s falling to 1200 b/s.',
      output: `A ${FRAME_MS} ms frame of vocoder bits at ${fmt(rateBps)} b/s.`,
      rate: `${fmt(rateBps)} b/s`,
      derived: !isFullRate,
      next: 'The convolutional encoder adds redundancy so the receiver can correct errors.',
    },
    {
      id: 'conv',
      name: 'Convolutional encoder',
      param: 'r = 1/2, K = 9',
      purpose: 'Add forward error correction before the channel damages the bits.',
      input: `Vocoder bits at ${fmt(rateBps)} b/s.`,
      operation:
        'Rate 1/2 convolutional coding with constraint length K = 9: two output symbols per ' +
        'input bit, each a function of the current bit and the eight before it.',
      output: `Two coded symbols per input bit — ${fmt(encoded)} symbols/s.`,
      rate: `${fmt(encoded)} sym/s`,
      derived: !isFullRate,
      next:
        isFullRate
          ? 'At full rate the symbol rate already matches 19.2 ks/s, so repetition passes it through.'
          : `Symbol repetition raises this to the common 19.2 ks/s by repeating each symbol ${repeat}x.`,
    },
    {
      id: 'repetition',
      name: 'Symbol repetition',
      param: 'if rate < 9.6 k',
      purpose:
        'Hold the symbol rate constant so every lower-rate frame fills the same interleaver and ' +
        'the same Walsh symbol slots.',
      input: `${fmt(encoded)} coded symbols/s.`,
      operation: isFullRate
        ? 'No repetition at full rate — the block passes symbols straight through.'
        : `Each coded symbol is repeated ${repeat}x. Transmit power per symbol is reduced in ` +
          'proportion, so the energy per information bit stays the same.',
      output: `A constant ${fmt(19_200)} symbols/s regardless of the vocoder rate.`,
      rate: `${fmt(19_200)} sym/s`,
      next: 'The block interleaver spreads these symbols out in time.',
    },
    {
      id: 'interleaver',
      name: 'Block interleaver',
      param: `24 × 16 · ${FRAME_MS} ms`,
      purpose: 'Break up error bursts so the Viterbi decoder sees scattered errors it can fix.',
      input: `${fmt(19_200)} symbols/s, one ${FRAME_MS} ms block at a time.`,
      operation:
        'Symbols are written into a 24 × 16 array and read out in the other order, so symbols ' +
        'that were adjacent leave the block far apart. A fade that wipes out consecutive ' +
        'transmitted symbols therefore damages non-adjacent coded symbols.',
      output: 'The same symbols, reordered within the frame.',
      rate: `${fmt(19_200)} sym/s`,
      next: 'The multiplexer scrambles them with the long code and inserts power-control bits.',
    },
    {
      id: 'mux',
      name: 'MUX + long-code scrambling',
      param: `PC bit every ${POWER_CONTROL.updateIntervalMs} ms`,
      purpose:
        'Give this user a private scrambling sequence, and carry the power-control command that ' +
        'keeps the reverse link usable.',
      input:
        `Interleaved symbols at ${fmt(19_200)} sym/s, plus the long code decimated 1:64 from ` +
        `${(RF.chipRateCps / 1e6).toFixed(4)} Mc/s down to ${fmt(19_200)} s/s.`,
      operation:
        `The 42-stage long-code generator, masked with this user's 42-bit mask, runs at ` +
        `${(RF.chipRateCps / 1e6).toFixed(4)} Mc/s. A 1:64 decimator takes every 64th bit, giving ` +
        `${fmt(19_200)} s/s, which scrambles the symbol stream. One power-control bit is ` +
        `multiplexed in every ${POWER_CONTROL.updateIntervalMs} ms — ${POWER_CONTROL.bitsPerCommand} ` +
        `bit saying "up" or "down" by ${POWER_CONTROL.stepDb} dB.`,
      output: 'A scrambled symbol stream carrying the power-control subchannel.',
      rate: `${fmt(19_200)} sym/s`,
      next: 'Walsh covering turns each symbol into 64 chips and makes this channel orthogonal to the others.',
    },
    {
      id: 'walsh',
      name: 'Walsh channelisation',
      param: `W n · ${CODES.walshChipsPerSymbol} chips/symbol`,
      purpose:
        'Separate this logical channel from every other channel in the cell, by code rather than ' +
        'by frequency or time.',
      input: `Scrambled symbols at ${fmt(19_200)} sym/s.`,
      operation:
        'Each symbol is multiplied by the whole 64-chip Walsh function assigned to this channel — ' +
        'W0 for the pilot, W32 for sync, W1-W7 for paging, the rest for traffic. Because the base ' +
        'station transmits every channel from one clock, the Walsh functions arrive chip-aligned ' +
        'and their mutual correlation is genuinely zero.',
      output: `${CODES.walshChipsPerSymbol} chips per symbol.`,
      rate: `${fmt(19_200)} × ${CODES.walshChipsPerSymbol} = ${(RF.chipRateCps / 1e6).toFixed(4)} Mc/s`,
      next: 'The quadrature modulator spreads the chips onto I and Q with the pilot PN sequences.',
    },
    {
      id: 'quadmod',
      name: 'Quadrature modulator',
      param: 'QPSK · pilot PN I & Q',
      purpose: 'Put the chip stream on the carrier, and identify the cell by its pilot PN offset.',
      input: `${(RF.chipRateCps / 1e6).toFixed(4)} Mc/s of Walsh-covered chips.`,
      operation:
        'The chip stream is spread by the pilot PN sequences on the I and Q branches and QPSK ' +
        'modulated. Different cells use different offsets of the same pilot PN sequence, which is ' +
        'how a handset tells one base station from another.',
      output: `A QPSK signal occupying the nominal ${RF.nominalChannelBandwidthMHz} MHz channel.`,
      rate: `${(RF.chipRateCps / 1e6).toFixed(4)} Mc/s`,
      next: 'The RF stage upconverts into the forward band and transmits.',
    },
    {
      id: 'rf',
      name: 'RF transmission',
      param: '869 – 894 MHz',
      purpose: 'Radiate the carrier in the forward band.',
      input: 'QPSK baseband signal.',
      operation:
        `Upconversion to a carrier in the 869-894 MHz forward band, in a nominal ` +
        `${RF.nominalChannelBandwidthMHz} MHz channel. The paired reverse channel sits ` +
        `${RF.duplexSeparationMHz} MHz below.`,
      output: 'Radiated forward-link signal carrying up to 64 Walsh-separated channels at once.',
      rate: `${RF.nominalChannelBandwidthMHz} MHz channel`,
      next: 'Every mobile in the cell receives this same composite and correlates for its own Walsh code.',
    },
  ];
}

/** Deck slide 13: "the same chain, undone" — the mobile receiver. */
export function forwardReceiverChain(): PipelineStage[] {
  return [
    {
      id: 'rx-pn',
      name: 'PN despread',
      param: 'pilot timing',
      purpose: 'Lock to the cell and strip the pilot PN spreading.',
      input: 'Composite received signal.',
      operation:
        'Correlate against the pilot PN sequence to find chip timing and the cell’s PN offset, ' +
        'then despread I and Q.',
      output: 'A chip stream aligned to the base station’s clock.',
      rate: `${(RF.chipRateCps / 1e6).toFixed(4)} Mc/s`,
      next: 'The Walsh correlator picks out this mobile’s channel from the 64 being transmitted.',
    },
    {
      id: 'rx-walsh',
      name: 'Walsh correlate',
      param: 'W n',
      purpose: 'Select one logical channel and reject the other 63.',
      input: 'Chip-aligned composite of all forward channels.',
      operation:
        'Multiply by this channel’s 64-chip Walsh function and integrate over the symbol. ' +
        'Aligned orthogonal codes integrate to zero, so the other channels contribute nothing.',
      output: 'One soft symbol per 64 chips.',
      rate: `${fmt(19_200)} sym/s`,
      next: 'Coherent demodulation uses the pilot phase to resolve the symbol.',
    },
    {
      id: 'rx-demod',
      name: 'Coherent demod',
      param: 'pilot phase',
      purpose: 'Resolve symbol phase using the pilot as a reference.',
      input: 'Soft symbols with unknown absolute phase.',
      operation:
        'The continuous pilot supplies a carrier phase reference, so the forward link can detect ' +
        'coherently — a roughly 3 dB advantage over the reverse link’s non-coherent detection.',
      output: 'Phase-resolved soft symbols.',
      rate: `${fmt(19_200)} sym/s`,
      next: 'Descrambling removes this user’s long-code sequence.',
    },
    {
      id: 'rx-descramble',
      name: 'Descramble',
      param: 'long code',
      purpose: 'Undo the user-specific scrambling applied in the MUX.',
      input: 'Phase-resolved symbols.',
      operation:
        'Regenerate the decimated long code from the state the sync channel supplied, and XOR it ' +
        'back out.',
      output: 'Interleaved coded symbols.',
      rate: `${fmt(19_200)} sym/s`,
      next: 'The deinterleaver restores the original symbol order.',
    },
    {
      id: 'rx-deint',
      name: 'Deinterleave',
      param: '24 × 16',
      purpose: 'Restore symbol order, scattering any burst errors.',
      input: 'Reordered symbols.',
      operation: 'Write and read the 24 × 16 array in the inverse order.',
      output: 'Coded symbols in transmission order, with errors now isolated.',
      rate: `${fmt(19_200)} sym/s`,
      next: 'The Viterbi decoder corrects what the channel damaged.',
    },
    {
      id: 'rx-viterbi',
      name: 'Viterbi decode',
      param: 'r = 1/2, K = 9',
      purpose: 'Recover the vocoder bits, correcting errors.',
      input: 'Soft coded symbols.',
      operation:
        'Maximum-likelihood sequence decoding over the 256-state trellis of the K = 9 code.',
      output: 'Vocoder bits.',
      rate: `${fmt(RF.exampleInfoRateBps)} b/s`,
      next: 'The vocoder synthesises speech.',
    },
    {
      id: 'rx-vocoder',
      name: 'Vocoder',
      param: 'speech out',
      purpose: 'Reconstruct audible speech.',
      input: 'QCELP parameter frames.',
      operation: 'QCELP synthesis, 20 ms at a time.',
      output: 'Speech to the earpiece.',
      rate: 'audio',
      next: 'End of chain.',
    },
  ];
}

/* ------------------------------------------------------------------ *
 * Reverse link — deck slide 14
 * ------------------------------------------------------------------ */

export function reversePipeline(rateBps: TrafficRateBps): PipelineStage[] {
  const repeat = repetitionFactor(rateBps);
  const encoded = rateBps * 3; // rate 1/3 convolutional code
  const isFullRate = rateBps === RF.exampleInfoRateBps;
  const walshChipRate = (28_800 * 64) / 6; // 307 200 — the deck's own arithmetic

  return [
    {
      id: 'source',
      name: 'Information source',
      param: '9600 / 4800 / 2400 / 1200 b/s',
      purpose: 'Produce the user’s voice or data bits.',
      input: 'Speech or data from the handset.',
      operation: `Variable-rate vocoding in ${FRAME_MS} ms frames, as on the forward link.`,
      output: `${fmt(rateBps)} b/s.`,
      rate: `${fmt(rateBps)} b/s`,
      next: 'The rate 1/3 convolutional encoder adds error correction — more than the forward link uses.',
    },
    {
      id: 'conv',
      name: 'Convolutional encoder',
      param: 'r = 1/3, K = 9',
      purpose:
        'Add stronger error correction, because the reverse link has no pilot and must be ' +
        'detected non-coherently.',
      input: `${fmt(rateBps)} b/s.`,
      operation:
        'Rate 1/3 convolutional coding, K = 9: three output symbols per input bit. The forward ' +
        'link only needs rate 1/2 — the reverse link spends the extra redundancy to make up for ' +
        'non-coherent detection.',
      output: `${fmt(encoded)} symbols/s.`,
      rate: `${fmt(encoded)} sym/s ${isFullRate ? '(≤ 28 800)' : ''}`.trim(),
      derived: !isFullRate,
      next: isFullRate
        ? 'Already at 28.8 ks/s, so repetition passes it through.'
        : `Repetition raises this to 28.8 ks/s by repeating each symbol ${repeat}x.`,
    },
    {
      id: 'repetition',
      name: 'Repetition',
      param: 'if rate < 9.6 k',
      purpose: 'Bring every vocoder rate up to the same 28.8 ks/s symbol rate.',
      input: `${fmt(encoded)} symbols/s.`,
      operation: isFullRate
        ? 'No repetition at full rate.'
        : `Each coded symbol repeated ${repeat}x. The burst randomiser later gates the duplicates ` +
          'off the air, so the mobile transmits less of the time instead of transmitting louder.',
      output: `${fmt(28_800)} symbols/s.`,
      rate: `${fmt(28_800)} sym/s`,
      next: 'The block interleaver spreads them in time — on a 32 × 18 array, not the forward link’s 24 × 16.',
    },
    {
      id: 'interleaver',
      name: 'Block interleaver',
      param: `32 × 18 · ${FRAME_MS} ms`,
      purpose: 'Break up error bursts.',
      input: `${fmt(28_800)} symbols/s.`,
      operation:
        'Write into a 32 × 18 array, read out transposed. The array shape differs from the ' +
        'forward link because the symbol rate and frame content differ.',
      output: 'Reordered symbols.',
      rate: `${fmt(28_800)} sym/s`,
      next: 'The 64-ary Walsh modulator maps six symbols at a time onto one of 64 Walsh functions.',
    },
    {
      id: 'walsh64',
      name: '64-ary Walsh modulator',
      param: '6 symbols → 1 of 64',
      purpose:
        'Carry six bits of information in the CHOICE of Walsh function — orthogonal modulation, ' +
        'not channelisation.',
      input: `${fmt(28_800)} coded symbols/s.`,
      operation:
        'Six consecutive coded symbols form a six-bit number, 0-63, and that number selects which ' +
        'of the 64 Walsh functions is transmitted. The receiver correlates against all 64 and ' +
        'picks the largest — no phase reference needed, which is what makes non-coherent ' +
        'detection possible. The Walsh index here is DATA, not a channel identity.',
      output: `64 chips per group of 6 symbols.`,
      rate: `${fmt(28_800)} × 64 ÷ 6 = ${fmt(walshChipRate)} c/s`,
      next: 'The burst randomiser gates off the repeated copies so the mobile does not transmit redundantly.',
    },
    {
      id: 'burst',
      name: 'Burst randomiser',
      param: 'gates repeats',
      purpose:
        'At reduced rates, transmit only one copy of each repeated group — chosen pseudo-randomly ' +
        'so that different mobiles do not all go quiet at the same instants.',
      input: `${fmt(walshChipRate)} c/s including repeated groups.`,
      operation: isFullRate
        ? 'At full rate there are no repeats to gate, so the randomiser passes everything.'
        : `With repetition factor ${repeat}, only 1 in ${repeat} copies is actually transmitted. ` +
          'Which one is chosen from the long code, so the gating pattern differs per mobile.',
      output: 'A gated chip stream — lower average transmit power, same information.',
      rate: `${fmt(walshChipRate)} c/s`,
      next: 'The long code spreads the stream by a further factor of four and identifies this mobile.',
    },
    {
      id: 'longcode',
      name: 'Long-code spreading',
      param: `user mask · period ${CODES.longCodePeriodExpression}`,
      purpose: 'Identify this particular mobile — this is what separates reverse-link users.',
      input: `${fmt(walshChipRate)} c/s.`,
      operation:
        `The ${CODES.longCodeRegisterStages}-stage long-code generator, masked with this mobile's ` +
        `${CODES.longCodeRegisterStages}-bit mask, runs at the full ` +
        `${(RF.chipRateCps / 1e6).toFixed(4)} Mc/s — four times the Walsh-modulator output. The ` +
        'base station distinguishes mobiles by these long codes, not by Walsh index. Because the ' +
        'mobiles are asynchronous, the codes are only quasi-orthogonal on arrival.',
      output: `${(RF.chipRateCps / 1e6).toFixed(4)} Mc/s chip stream unique to this mobile.`,
      rate: `${fmt(walshChipRate)} × 4 = ${(RF.chipRateCps / 1e6).toFixed(4)} Mc/s`,
      next: 'PN spreading and OQPSK put the chips on the carrier.',
    },
    {
      id: 'oqpsk',
      name: 'PN spreading + OQPSK',
      param: `Q delayed ½ Tc = ${CODES.halfChipDelayNs} ns`,
      purpose:
        'Modulate the carrier while keeping the envelope kind to a battery-powered power ' +
        'amplifier.',
      input: `${(RF.chipRateCps / 1e6).toFixed(4)} Mc/s chip stream.`,
      operation:
        `Spread by the pilot PN sequences on I and Q, then offset-QPSK: the Q branch is delayed by ` +
        `half a chip, ${CODES.halfChipDelayNs} ns. Offsetting the branches means I and Q never ` +
        'change at the same instant, so the phase never jumps 180° and the envelope varies less — ' +
        'the handset’s amplifier can run closer to saturation. The forward link, mains-powered, ' +
        'uses plain QPSK.',
      output: `OQPSK signal in a nominal ${RF.nominalChannelBandwidthMHz} MHz channel.`,
      rate: `${(RF.chipRateCps / 1e6).toFixed(4)} Mc/s`,
      next: 'The RF stage transmits in the reverse band.',
    },
    {
      id: 'rf',
      name: 'RF transmission',
      param: '824 – 849 MHz',
      purpose: 'Radiate towards the base station at the power the network commands.',
      input: 'OQPSK baseband signal.',
      operation:
        `Upconversion to a carrier in the 824-849 MHz reverse band, ${RF.duplexSeparationMHz} MHz ` +
        `below the paired forward channel. Transmit power follows the power-control bits arriving ` +
        `on the forward traffic channel every ${POWER_CONTROL.updateIntervalMs} ms, ` +
        `${POWER_CONTROL.stepDb} dB per step.`,
      output: 'One of many reverse-link signals summing at the base-station antenna.',
      rate: `${RF.nominalChannelBandwidthMHz} MHz channel`,
      next:
        'The base station correlates for this mobile’s long code. Every other mobile contributes ' +
        'residual interference, which is why power control is mandatory.',
    },
  ];
}

export function pipelineFor(link: LinkDirection, rateBps: TrafficRateBps): PipelineStage[] {
  return link === 'forward' ? forwardPipeline(rateBps) : reversePipeline(rateBps);
}

/* ------------------------------------------------------------------ *
 * Link comparison — deck slide 11, verbatim rows.
 * ------------------------------------------------------------------ */

export interface LinkComparisonRow {
  property: string;
  forward: string;
  reverse: string;
  /** True when the two links share this property. */
  shared: boolean;
}

export const LINK_COMPARISON: LinkComparisonRow[] = [
  { property: 'Band', forward: '869 – 894 MHz', reverse: '824 – 849 MHz', shared: false },
  { property: 'Direction', forward: 'base station → mobile', reverse: 'mobile → base station', shared: false },
  { property: 'Channel bandwidth', forward: '1.25 MHz', reverse: '1.25 MHz', shared: true },
  { property: 'Chip rate', forward: '1.2288 Mchip/s', reverse: '1.2288 Mchip/s', shared: true },
  { property: 'Frame length', forward: '20 ms', reverse: '20 ms', shared: true },
  { property: 'Timing', forward: 'One transmitter, one clock: synchronous', reverse: 'Many transmitters, own paths: asynchronous', shared: false },
  { property: 'Users separated by', forward: '64 orthogonal Walsh codes', reverse: 'User-specific long code, period 2⁴² − 1', shared: false },
  { property: 'Walsh functions do', forward: 'Channelisation', reverse: '64-ary orthogonal modulation', shared: false },
  { property: 'Convolutional code', forward: 'Rate 1/2, K = 9', reverse: 'Rate 1/3, K = 9', shared: false },
  { property: 'Interleaver', forward: '24 × 16', reverse: '32 × 18', shared: false },
  { property: 'Pilot', forward: 'Continuous pilot → coherent detection', reverse: 'No per-mobile pilot → non-coherent detection', shared: false },
  { property: 'Modulation', forward: 'QPSK quadrature spreading', reverse: 'OQPSK, Q branch delayed ½ chip', shared: false },
  { property: 'Orthogonality', forward: 'Preserved within the cell', reverse: 'Not guaranteed → tight power control', shared: false },
];
