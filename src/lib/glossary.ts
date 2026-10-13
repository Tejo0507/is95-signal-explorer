/**
 * glossary.ts, terminology shown in <Term> tooltips.
 *
 * Each entry answers one question in one or two sentences. Definitions follow
 * the course deck's usage; several exist specifically to separate terms that
 * students routinely conflate (bandwidth vs. chip rate, channelisation vs.
 * modulation, short PN vs. long code).
 */

export interface GlossaryEntry {
  term: string;
  definition: string;
}

export const GLOSSARY: Record<string, GlossaryEntry> = {
  'licensed band': {
    term: 'Licensed frequency band',
    definition:
      'The whole block of spectrum an operator is allowed to use, 824-849 MHz reverse and ' +
      '869-894 MHz forward, 25 MHz each. It holds many CDMA carriers; it is not one carrier.',
  },
  'centre frequency': {
    term: 'Carrier centre frequency',
    definition:
      'The frequency a single CDMA carrier is tuned to, somewhere inside the licensed band. The ' +
      'nominal 1.25 MHz channel sits centred on it.',
  },
  bandwidth: {
    term: 'Nominal channel bandwidth',
    definition:
      '1.25 MHz, the width of spectrum one IS-95 carrier occupies, on each one-way link. A ' +
      'width, measured in Hz.',
  },
  duplex: {
    term: 'Duplex frequency separation',
    definition:
      '45 MHz, the fixed gap between a reverse channel and its paired forward channel, so a ' +
      'handset can transmit and receive at the same time without deafening itself.',
  },
  'info rate': {
    term: 'Information bit rate',
    definition:
      'The rate of the bits that actually carry meaning: 9600, 4800, 2400 or 1200 b/s out of the ' +
      'QCELP vocoder. Measured in bits per second.',
  },
  'chip rate': {
    term: 'Chip rate',
    definition:
      '1.2288 Mchip/s, fixed for every IS-95 channel. A rate inside the channel, not a width: ' +
      'chips are the fast ±1 values the data is multiplied by, and a single chip carries no ' +
      'information on its own.',
  },
  'spreading factor': {
    term: 'Spreading factor',
    definition:
      'Chip rate ÷ information rate, 128 for the 9.6 kb/s example. Equivalently Tb ÷ Tc: how ' +
      'many chips one information bit is spread across.',
  },
  walsh: {
    term: 'Walsh function',
    definition:
      'A row of a 64 × 64 Hadamard matrix: a ±1 sequence 64 chips long. Any two distinct rows of ' +
      'the same matrix have zero inner product when they are aligned.',
  },
  channelisation: {
    term: 'Channelisation',
    definition:
      'Using a code to keep separate channels apart. On the IS-95 forward link, Walsh function n ' +
      'identifies logical channel n, and because the base station transmits all of them from one ' +
      'clock they stay orthogonal.',
  },
  'orthogonal modulation': {
    term: '64-ary orthogonal modulation',
    definition:
      'The reverse-link use of Walsh functions: six coded symbols choose WHICH of the 64 ' +
      'functions to send, so the index is the data. The receiver correlates against all 64 and ' +
      'takes the biggest, no phase reference required.',
  },
  orthogonal: {
    term: 'Orthogonal',
    definition:
      'Two sequences whose element-wise products sum to zero. Orthogonality is a property of ' +
      'aligned sequences over equal durations, shift one and it generally disappears.',
  },
  'pn sequence': {
    term: 'PN sequence',
    definition:
      'A pseudo-noise sequence from a shift register: deterministic, repeatable, but noise-like. ' +
      'Its periodic autocorrelation is a single sharp peak against a flat floor, which is what ' +
      'lets a receiver find chip timing.',
  },
  'short pn': {
    term: 'Pilot PN sequence (short)',
    definition:
      'The I and Q sequences used for quadrature spreading on both links. Different cells use ' +
      'different OFFSETS of the same sequence, which is how a handset tells base stations apart.',
  },
  'long code': {
    term: 'Long code',
    definition:
      'A sequence from a 42-stage generator, period 2⁴² − 1, with a 42-bit per-user mask. On the ' +
      'forward link it scrambles one user’s symbols; on the reverse link it is what identifies ' +
      'one mobile among many.',
  },
  'm-sequence': {
    term: 'Maximal-length sequence',
    definition:
      'The output of an n-stage shift register whose feedback polynomial is primitive: it visits ' +
      'all 2ⁿ − 1 non-zero states before repeating, giving period 2ⁿ − 1 and ideal periodic ' +
      'autocorrelation.',
  },
  lfsr: {
    term: 'Linear feedback shift register',
    definition:
      'A register that shifts each clock and feeds back the XOR of selected stages. Simple ' +
      'enough to build in a handset, long enough to look random.',
  },
  mask: {
    term: 'User mask',
    definition:
      'A bit pattern selecting which register stages are XORed to form the output. A different ' +
      'mask gives the same sequence starting at a different phase, which is how every user gets ' +
      'their own long code from one generator.',
  },
  correlation: {
    term: 'Correlation',
    definition:
      'Multiply two sequences chip by chip and add up the results. Large positive means they ' +
      'match, zero means orthogonal, large negative means one is the other inverted.',
  },
  'processing gain': {
    term: 'Processing gain',
    definition:
      'The spreading factor expressed in dB, 10·log₁₀(128) ≈ 21.1 dB. Roughly how much the ' +
      'despreading correlator favours the wanted signal over wideband interference.',
  },
  'self-jamming': {
    term: 'Self-jamming',
    definition:
      'A timing problem. Codes that cancel perfectly when aligned stop cancelling when one ' +
      'arrives late, the deck’s 8-chip pair leaks 4 out of 8 at one chip of delay.',
  },
  'near-far': {
    term: 'Near-far problem',
    definition:
      'A power problem. A nearby mobile arrives far stronger than a distant one, so even a small ' +
      'correlation leak from the near signal can swamp the whole wanted signal. No choice of code ' +
      'fixes it.',
  },
  'power control': {
    term: 'Power control',
    definition:
      'IS-95 drives every mobile to arrive at the base station at the same received power. One ' +
      'bit every 1.25 ms on the forward link commands ±1 dB. It equalises received power; it does ' +
      'not remove interference.',
  },
  qcelp: {
    term: 'QCELP',
    definition:
      'The IS-95 variable-rate speech coder: 9600 b/s for active speech, dropping to 1200 b/s in ' +
      'silence. Lower rate means less transmitted energy and less interference for everyone else.',
  },
  viterbi: {
    term: 'Viterbi decoding',
    definition:
      'Maximum-likelihood decoding of a convolutional code: find the path through the code’s ' +
      'trellis closest to what was received. K = 9 means a 256-state trellis.',
  },
  interleaver: {
    term: 'Block interleaver',
    definition:
      'Writes symbols into an array one way and reads them out another, so symbols that were ' +
      'adjacent are transmitted far apart. A fade then damages scattered coded symbols rather ' +
      'than a run of them, which is what the decoder can repair.',
  },
  oqpsk: {
    term: 'OQPSK',
    definition:
      'Offset QPSK: the Q branch is delayed half a chip so I and Q never switch simultaneously. ' +
      'Phase never jumps 180°, the envelope varies less, and a handset amplifier can run closer to ' +
      'saturation. Used on the reverse link; the forward link uses plain QPSK.',
  },
  coherent: {
    term: 'Coherent detection',
    definition:
      'Demodulating with a known carrier phase. The forward link’s continuous pilot supplies one; ' +
      'the reverse link has no per-mobile pilot and must detect non-coherently, which is why it ' +
      'spends rate 1/3 coding instead of rate 1/2.',
  },
  'burst randomiser': {
    term: 'Burst randomiser',
    definition:
      'At reduced vocoder rates the reverse link repeats symbols, then gates all but one copy off ' +
      'the air. Which copy is kept comes from the long code, so different mobiles go quiet at ' +
      'different instants instead of all at once.',
  },
  decimator: {
    term: 'Decimator',
    definition:
      'Takes every Nth sample. The forward link decimates the 1.2288 Mc/s long code 1:64 to get ' +
      'the 19.2 ks/s sequence that scrambles the symbol stream.',
  },
};

export function lookupTerm(key: string): GlossaryEntry | undefined {
  return GLOSSARY[key.toLowerCase()];
}
