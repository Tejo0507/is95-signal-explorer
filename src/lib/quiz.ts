/**
 * quiz.ts — knowledge checks, one set per module.
 *
 * These test whether a reader has understood a distinction, not whether they
 * can recall a number. Where a numerical answer is asked for (the 128 ratio),
 * the explanation still has to say what the number means. Every explanation
 * names where in the deck the answer comes from.
 */

export interface QuizOption {
  id: string;
  text: string;
}

export interface QuizQuestion {
  id: string;
  prompt: string;
  options: QuizOption[];
  correctId: string;
  /** Shown after answering, right or wrong. */
  explanation: string;
}

export const QUIZZES: Record<string, QuizQuestion[]> = {
  rf: [
    {
      id: 'rf-1',
      prompt:
        'An operator holds the full 869–894 MHz forward band. How many 1.25 MHz CDMA carriers does that 25 MHz block represent?',
      options: [
        { id: 'a', text: 'One — the whole 25 MHz is a single CDMA carrier' },
        { id: 'b', text: 'Many — the band holds multiple 1.25 MHz carriers' },
        { id: 'c', text: 'None — 1.25 MHz is a chip rate, not a bandwidth' },
      ],
      correctId: 'b',
      explanation:
        'The licensed band and the channel are different things. 1.25 MHz is the nominal width of ' +
        'one carrier; a 25 MHz band accommodates many of them. The deck keeps these separate on ' +
        'slide 10: "BAND ALLOCATION 824–849 · 869–894 MHz" versus "CHANNEL BANDWIDTH 1.25 MHz — ' +
        'one carrier, one direction".',
    },
    {
      id: 'rf-2',
      prompt: 'What is the chip-to-bit ratio for 1.2288 Mchip/s and 9.6 kb/s?',
      options: [
        { id: 'a', text: '64' },
        { id: 'b', text: '128' },
        { id: 'c', text: '1.25' },
        { id: 'd', text: '19 200' },
      ],
      correctId: 'b',
      explanation:
        '1 228 800 ÷ 9 600 = 128 chips per information bit — the deck’s "total spreading" figure ' +
        'on slide 05. It is the overall bandwidth-expansion ratio, not the gain of any single ' +
        'processing block: module 04 shows the rate changing in stages (rate 1/2 coding to 19.2 ' +
        'ks/s, then 64 chips per symbol).',
    },
    {
      id: 'rf-3',
      prompt: 'A handset is tuned to a forward channel at 880.00 MHz. Where is its paired reverse channel?',
      options: [
        { id: 'a', text: '925.00 MHz — 45 MHz above' },
        { id: 'b', text: '835.00 MHz — 45 MHz below' },
        { id: 'c', text: '878.75 MHz — 1.25 MHz below' },
      ],
      correctId: 'b',
      explanation:
        'Duplex separation is 45 MHz, and the reverse band (824–849 MHz) sits BELOW the forward ' +
        'band (869–894 MHz). 880 − 45 = 835 MHz, which is inside the reverse band. 925 MHz would ' +
        'be outside the licensed allocation altogether.',
    },
    {
      id: 'rf-4',
      prompt: 'Which of these is a rate rather than a bandwidth?',
      options: [
        { id: 'a', text: '1.25 MHz' },
        { id: 'b', text: '45 MHz' },
        { id: 'c', text: '1.2288 Mchip/s' },
        { id: 'd', text: '25 MHz' },
      ],
      correctId: 'c',
      explanation:
        'The deck is pointed about this on slide 10: the chip rate is "a rate inside the channel — ' +
        'not a width". The other three are all frequency measurements: channel bandwidth, duplex ' +
        'spacing and band span. The units tell you which is which — chip/s against Hz.',
    },
  ],

  channels: [
    {
      id: 'ch-1',
      prompt: 'Which forward-link logical channel uses W32 in the course reference?',
      options: [
        { id: 'a', text: 'The pilot channel' },
        { id: 'b', text: 'The synchronisation channel' },
        { id: 'c', text: 'The first paging channel' },
        { id: 'd', text: 'A traffic channel' },
      ],
      correctId: 'b',
      explanation:
        'W32 is the synchronisation channel, at 1200 b/s, carrying system time, long-code state ' +
        'and protocol revision. The pilot is W0, paging takes W1–W7, and traffic fills W8–W31 and ' +
        'W33–W63 — the gap at 32 is exactly where sync sits.',
    },
    {
      id: 'ch-2',
      prompt:
        'Does selecting a Walsh function alone guarantee orthogonal separation between asynchronous reverse-link mobile users?',
      options: [
        { id: 'a', text: 'Yes — Walsh functions are orthogonal by construction' },
        { id: 'b', text: 'No — orthogonality needs chip alignment, which asynchronous mobiles do not have' },
        { id: 'c', text: 'Yes, provided every mobile uses a different Walsh index' },
      ],
      correctId: 'b',
      explanation:
        'No. Walsh functions are orthogonal only when aligned over equal durations. On the forward ' +
        'link one transmitter and one clock guarantee that; on the reverse link mobiles transmit ' +
        'asynchronously over different paths, so the deck records orthogonality as "not guaranteed ' +
        '→ tight power control". Reverse-link users are separated by their long codes, and Walsh ' +
        'functions there are the modulation, not a channel number.',
    },
    {
      id: 'ch-3',
      prompt: 'An operator reduces its configuration from 7 paging channels to 3. What happens to the Walsh allocation?',
      options: [
        { id: 'a', text: 'Nothing — the allocation is fixed by the standard' },
        { id: 'b', text: 'Four more Walsh indices become available for traffic' },
        { id: 'c', text: 'The sync channel moves from W32 to W28' },
      ],
      correctId: 'b',
      explanation:
        'Pilot (W0) and sync (W32) are fixed, so the freed paging codes W4–W7 become traffic ' +
        'capacity: 55 traffic channels becomes 59. This is the deck’s own caveat on slide 12 — ' +
        '"the usable allocation depends on how many paging channels an operator configures".',
    },
    {
      id: 'ch-4',
      prompt: 'A handset has just been powered on and needs to register on the network. Which channel does it use?',
      options: [
        { id: 'a', text: 'The reverse traffic channel' },
        { id: 'b', text: 'The access channel' },
        { id: 'c', text: 'The paging channel' },
      ],
      correctId: 'b',
      explanation:
        'The access channel, at a fixed 4800 b/s, carries registration, call set-up and page ' +
        'responses — everything a mobile needs to say before it has been assigned a traffic ' +
        'channel. The paging channel is the forward-link counterpart: the network’s way of ' +
        'calling the handset.',
    },
  ],

  codes: [
    {
      id: 'code-1',
      prompt: 'Two distinct 64-chip Walsh functions are correlated over one full period while perfectly aligned. What is the inner product?',
      options: [
        { id: 'a', text: '64' },
        { id: 'b', text: '0' },
        { id: 'c', text: '−1' },
        { id: 'd', text: 'It depends which two' },
      ],
      correctId: 'b',
      explanation:
        'Exactly zero, for every distinct pair — that is what orthogonality means, and the ' +
        'explorer verifies it across all 2 016 pairs rather than asserting it. Note the contrast ' +
        'with an m-sequence, whose off-peak autocorrelation is −1 rather than 0: PN sequences are ' +
        'chosen for a sharp timing peak, Walsh functions for exact cancellation.',
    },
    {
      id: 'code-2',
      prompt: 'What distinguishes the pilot PN sequences from the long code in IS-95?',
      options: [
        { id: 'a', text: 'Nothing — they are two names for the same sequence' },
        {
          id: 'b',
          text: 'Short PN sequences spread I and Q and identify cells by offset; the long code is per-user, period 2⁴² − 1',
        },
        { id: 'c', text: 'The long code is used on the forward link only' },
      ],
      correctId: 'b',
      explanation:
        'They do different jobs. The pilot PN sequences perform quadrature spreading on both ' +
        'links, and a cell is identified by which OFFSET of them it uses. The long code comes ' +
        'from a 42-stage generator with period 2⁴² − 1 and a per-user 42-bit mask: it scrambles ' +
        'one user’s symbols on the forward link, and on the reverse link it is what tells one ' +
        'mobile from another.',
    },
    {
      id: 'code-3',
      prompt:
        'In the deck’s 8-chip example, two orthogonal codes correlate to 0 when aligned. One user then arrives a single chip late. What leaks into the other user’s correlator?',
      options: [
        { id: 'a', text: 'Still 0 — orthogonality is a property of the codes' },
        { id: 'b', text: '4 out of a possible 8' },
        { id: 'c', text: 'The full 8 — the signals become identical' },
      ],
      correctId: 'b',
      explanation:
        'Slide 07: one chip of delay leaves a residue of 4 out of a possible 8. Orthogonality is ' +
        'a property of codes IN ALIGNMENT, not of the codes alone. This is self-jamming, and it is ' +
        'a timing problem — distinct from the near-far problem, which is a power problem.',
    },
    {
      id: 'code-4',
      prompt: 'Changing the mask on a masked long-code generator produces what?',
      options: [
        { id: 'a', text: 'A completely different sequence with a different period' },
        { id: 'b', text: 'The same maximal-length sequence, starting at a different phase' },
        { id: 'c', text: 'A shorter sequence' },
      ],
      correctId: 'b',
      explanation:
        'For any non-zero mask the output is the same m-sequence at a different phase offset — the ' +
        'explorer finds and reports that offset from the generated bits. This is why one generator ' +
        'polynomial can serve every user in the system: the mask, not the polynomial, is what is ' +
        'per-user.',
    },
  ],

  physical: [
    {
      id: 'phy-1',
      prompt: 'Why does the reverse link use rate 1/3 convolutional coding where the forward link uses rate 1/2?',
      options: [
        { id: 'a', text: 'Because the reverse link has a higher information rate' },
        { id: 'b', text: 'Because it has no per-mobile pilot and must detect non-coherently, so it needs more redundancy' },
        { id: 'c', text: 'Because the reverse band is narrower' },
      ],
      correctId: 'b',
      explanation:
        'The forward link’s continuous pilot gives a carrier phase reference, so it can detect ' +
        'coherently. The reverse link has no per-mobile pilot and detects non-coherently, which ' +
        'costs link margin — so it spends the extra coding. Both links are 1.25 MHz wide and both ' +
        'carry up to 9.6 kb/s, so neither of the other explanations holds.',
    },
    {
      id: 'phy-2',
      prompt: 'On the reverse link, 28.8 ks/s enters the 64-ary Walsh modulator. What comes out, and why?',
      options: [
        { id: 'a', text: '1.8432 Mc/s — 28.8 × 64' },
        { id: 'b', text: '307.2 kc/s — 28.8 × 64 ÷ 6, because six symbols select one 64-chip function' },
        { id: 'c', text: '28.8 kc/s — the modulator does not change the rate' },
      ],
      correctId: 'b',
      explanation:
        '28 800 × 64 ÷ 6 = 307 200 chip/s, the deck’s own arithmetic on slide 14. The ÷ 6 is the ' +
        'whole point: six coded symbols are consumed to choose ONE of 64 Walsh functions, so six ' +
        'symbols become 64 chips. Long-code spreading then multiplies by a further 4 to reach ' +
        '1.2288 Mc/s.',
    },
    {
      id: 'phy-3',
      prompt: 'A forward traffic channel is assigned W19. What does W19 mean at the physical layer?',
      options: [
        { id: 'a', text: 'The 64-chip sequence each of this channel’s symbols is multiplied by' },
        { id: 'b', text: 'A frequency offset of 19 × 1.25 MHz' },
        { id: 'c', text: 'The 19th time slot in the 20 ms frame' },
      ],
      correctId: 'a',
      explanation:
        'Logical channel naming and physical processing are related but not the same thing. "W19 ' +
        'is a traffic channel" is a logical statement; physically, W19 is the specific 64-chip ' +
        'Walsh sequence that covers each of that channel’s 19.2 ks/s symbols, turning them into ' +
        '1.2288 Mc/s of chips. CDMA has no time slots and no per-channel frequency offset — every ' +
        'channel uses the whole carrier all of the time.',
    },
    {
      id: 'phy-4',
      prompt: 'Why does the reverse link use OQPSK rather than the forward link’s QPSK?',
      options: [
        { id: 'a', text: 'It doubles the data rate' },
        { id: 'b', text: 'Delaying Q by half a chip avoids 180° phase jumps, easing the handset’s power amplifier' },
        { id: 'c', text: 'It is required for non-coherent detection' },
      ],
      correctId: 'b',
      explanation:
        'Offsetting the Q branch by half a chip (406.901 ns) means I and Q never change at the ' +
        'same instant, so the phase never jumps 180° and the envelope varies less. A ' +
        'battery-powered amplifier can then run closer to saturation. The forward link, ' +
        'mains-powered at the base station, has no such pressure and uses plain QPSK.',
    },
  ],

  trace: [
    {
      id: 'tr-1',
      prompt: 'Which of these is shared between the forward and reverse links?',
      options: [
        { id: 'a', text: 'The convolutional code rate' },
        { id: 'b', text: 'The chip rate and the channel bandwidth' },
        { id: 'c', text: 'The role Walsh functions play' },
        { id: 'd', text: 'The modulation scheme' },
      ],
      correctId: 'b',
      explanation:
        'Both links run at 1.2288 Mchip/s in a nominal 1.25 MHz channel, with 20 ms frames. ' +
        'Almost everything else differs: rate 1/2 against rate 1/3 coding, Walsh channelisation ' +
        'against 64-ary Walsh modulation, QPSK against OQPSK, coherent against non-coherent ' +
        'detection, 24 × 16 against 32 × 18 interleaving.',
    },
    {
      id: 'tr-2',
      prompt: 'Power control sends one bit every 1.25 ms. On which link does that bit travel, and what does it do?',
      options: [
        { id: 'a', text: 'On the reverse link, telling the base station to adjust its power' },
        { id: 'b', text: 'On the forward traffic channel, telling the mobile to move ±1 dB' },
        { id: 'c', text: 'On the sync channel, broadcasting a power level to all mobiles' },
      ],
      correctId: 'b',
      explanation:
        'The bit is multiplexed into the forward traffic channel and commands that one mobile up ' +
        'or down by 1 dB. The loop is closed: the base station measures the mobile’s received ' +
        'power, compares it against a target, and sends a correction every 1.25 ms. It equalises ' +
        'received power — it does not remove the interference floor other users create.',
    },
    {
      id: 'tr-3',
      prompt: 'Is spreading a form of encryption?',
      options: [
        { id: 'a', text: 'Yes — without the code the signal cannot be read' },
        { id: 'b', text: 'No — it gives a measure of privacy but is not cryptographic protection' },
      ],
      correctId: 'b',
      explanation:
        'The deck is explicit on slide 06 that this is a claim it does not make. Spreading gives a ' +
        'measure of privacy — you need the code to despread — but the codes are public, ' +
        'specified, and derivable, so it is not cryptographic protection. The same slide also ' +
        'declines the claim that CDMA capacity is unlimited.',
    },
  ],
};

export function quizFor(moduleId: string): QuizQuestion[] {
  return QUIZZES[moduleId] ?? [];
}
