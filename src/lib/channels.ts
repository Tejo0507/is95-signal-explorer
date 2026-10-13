/**
 * channels.ts, IS-95 logical channel definitions and forward-link Walsh
 * allocation, exactly as numbered in the course deck (slides 12 and 14).
 *
 * The deck's reference layout is: pilot W0, sync W32, paging W1-W7, traffic
 * W8-W31 and W33-W63 (55 channels). It also notes that "the usable allocation
 * depends on how many paging channels an operator configures", so
 * `forwardAllocation` takes the paging count as a parameter instead of
 * hard-coding seven. Pilot and sync stay fixed at W0 and W32 in every
 * configuration; the paging/traffic boundary is what moves.
 */

import { ACCESS_RATE_BPS, FRAME_MS, PAGING_RATES_BPS, SYNC_RATE_BPS } from './spec';

export type ForwardChannelKind = 'pilot' | 'sync' | 'paging' | 'traffic';
export type ReverseChannelKind = 'access' | 'reverse-traffic';

export interface ForwardChannelType {
  kind: ForwardChannelKind;
  name: string;
  /** Walsh assignment as the deck prints it. */
  walshLabel: string;
  rateLabel: string;
  /** One-line answer to "what is this channel for?". */
  purpose: string;
  /** The fuller explanation shown in the detail panel. */
  detail: string;
  /** Why a student should care, kept to one sentence. */
  whyItMatters: string;
}

export const FORWARD_CHANNEL_TYPES: ForwardChannelType[] = [
  {
    kind: 'pilot',
    name: 'Pilot channel',
    walshLabel: 'W0',
    rateLabel: 'continuous · unmodulated',
    purpose: 'Timing acquisition, phase reference, signal-strength comparison.',
    detail:
      'All zeros, always on. A handset finds the cell by correlating for the pilot, locks its ' +
      'chip timing to it, and then uses the recovered carrier phase as the reference for ' +
      'coherent demodulation of every other forward channel. Comparing pilot strengths from ' +
      'neighbouring cells is also how the network decides when to hand off.',
    whyItMatters:
      'Everything else on the forward link is demodulated against the pilot, lose it and no ' +
      'other channel can be read.',
  },
  {
    kind: 'sync',
    name: 'Synchronisation channel',
    walshLabel: 'W32',
    rateLabel: `${SYNC_RATE_BPS} b/s`,
    purpose: 'System time, long-code state and protocol revision.',
    detail:
      'Carries what a handset needs in order to join the system: system time, the current state ' +
      'of the long-code generator, and the protocol revision level. Once the pilot has given ' +
      'the mobile chip timing, the sync channel gives it system-level timing and identity.',
    whyItMatters:
      'The long code has a period of 2^42 − 1 chips; without being told its current state, a ' +
      'mobile could never find its place in the sequence.',
  },
  {
    kind: 'paging',
    name: 'Paging channel',
    walshLabel: 'W1 – W7',
    rateLabel: `${PAGING_RATES_BPS.map((r) => r.toLocaleString('en-US')).join(' / ')} b/s`,
    purpose: 'Control information and paging messages.',
    detail:
      'Carries control information and paging messages for one or more mobile stations, ' +
      'incoming-call notifications, channel assignments and system parameter messages. An ' +
      'operator configures how many of W1-W7 are actually used; whatever is left over becomes ' +
      'traffic capacity.',
    whyItMatters:
      'Every paging channel an operator turns on is one fewer Walsh code available to carry a ' +
      'call, control capacity is bought directly out of traffic capacity.',
  },
  {
    kind: 'traffic',
    name: 'Forward traffic channel',
    walshLabel: 'W8 – W31, W33 – W63',
    rateLabel: `9600 / 4800 / 2400 / 1200 b/s · ${FRAME_MS} ms frames`,
    purpose: 'User voice and data.',
    detail:
      'Carries one user’s voice or data, vocoded by QCELP at 9600, 4800, 2400 or 1200 b/s in ' +
      `${FRAME_MS} ms frames. The deck's reference layout leaves 55 of these. Each one also ` +
      'carries the power-control subchannel: one bit every 1.25 ms telling that mobile to raise ' +
      'or lower its transmit power by 1 dB.',
    whyItMatters:
      'This is the channel a call actually occupies, and the one whose power-control bits keep ' +
      'the reverse link alive.',
  },
];

export interface ReverseChannelType {
  kind: ReverseChannelKind;
  name: string;
  rateLabel: string;
  purpose: string;
  detail: string;
  whyItMatters: string;
}

export const REVERSE_CHANNEL_TYPES: ReverseChannelType[] = [
  {
    kind: 'access',
    name: 'Access channel',
    rateLabel: `${ACCESS_RATE_BPS} b/s · fixed`,
    purpose: 'Registration, call set-up and responses to paging.',
    detail:
      'The mobile’s way of speaking to a base station before it has a traffic channel: ' +
      'registration, call origination, and answering a page. Fixed at 4800 b/s, there is no ' +
      'variable-rate vocoder involved. The deck notes up to 32 access channels per paging ' +
      'channel. Because a mobile transmits here without being power-controlled yet, access is ' +
      'the one moment the reverse link has to tolerate uncontrolled arrival power.',
    whyItMatters:
      'A handset cannot be assigned a traffic channel until it has successfully used the access ' +
      'channel, this is where every call begins.',
  },
  {
    kind: 'reverse-traffic',
    name: 'Reverse traffic channel',
    rateLabel: `9600 / 4800 / 2400 / 1200 b/s · ${FRAME_MS} ms frames`,
    purpose: 'User voice and data.',
    detail:
      'Carries the user’s voice or data back to the base station. Every mobile runs the same ' +
      'processing chain but with its own long code, and the base station tells each one apart by ' +
      'that long code, not by a Walsh index. Rate 1/3 convolutional coding and 64-ary Walsh ' +
      'modulation replace the forward link’s rate 1/2 coding and Walsh channelisation.',
    whyItMatters:
      'This is where the near-far problem bites: the long codes are only quasi-orthogonal when ' +
      'they arrive unaligned, so closed-loop power control is not optional.',
  },
];

/* ------------------------------------------------------------------ *
 * Forward-link Walsh allocation
 * ------------------------------------------------------------------ */

export interface WalshAllocation {
  index: number;
  kind: ForwardChannelKind;
  /** e.g. "Paging 3 of 7", "Traffic", "Pilot". */
  label: string;
}

/**
 * Allocation of all 64 Walsh indices for a given number of configured paging
 * channels (1-7). W0 is always pilot and W32 is always sync; paging takes
 * W1..W{pagingChannels}; everything else is traffic.
 */
export function forwardAllocation(pagingChannels: number): WalshAllocation[] {
  const paging = Math.max(1, Math.min(7, Math.round(pagingChannels)));
  const out: WalshAllocation[] = [];

  for (let index = 0; index < 64; index += 1) {
    if (index === 0) {
      out.push({ index, kind: 'pilot', label: 'Pilot' });
    } else if (index === 32) {
      out.push({ index, kind: 'sync', label: 'Sync' });
    } else if (index >= 1 && index <= paging) {
      out.push({ index, kind: 'paging', label: `Paging ${index} of ${paging}` });
    } else {
      out.push({ index, kind: 'traffic', label: 'Traffic' });
    }
  }

  return out;
}

/** How many indices of each kind a given paging configuration produces. */
export function allocationCounts(pagingChannels: number): Record<ForwardChannelKind, number> {
  const counts: Record<ForwardChannelKind, number> = { pilot: 0, sync: 0, paging: 0, traffic: 0 };
  for (const slot of forwardAllocation(pagingChannels)) counts[slot.kind] += 1;
  return counts;
}

/** The deck's reference layout, seven paging channels, 55 traffic channels. */
export const REFERENCE_PAGING_CHANNELS = 7;

export const KIND_LABEL: Record<ForwardChannelKind, string> = {
  pilot: 'Pilot',
  sync: 'Synchronisation',
  paging: 'Paging',
  traffic: 'Traffic',
};

/* ------------------------------------------------------------------ *
 * The distinction the site must not blur (deck slide 11).
 * ------------------------------------------------------------------ */

export const WALSH_ROLE_CONTRAST = {
  forward: {
    heading: 'Forward link: Walsh functions channelise',
    body:
      'One transmitter, one clock. The base station covers each logical channel with a different ' +
      'Walsh function and transmits them all synchronously, so they arrive chip-aligned at every ' +
      'mobile and their mutual correlation really is zero. Walsh index n IS logical channel n.',
  },
  reverse: {
    heading: 'Reverse link: Walsh functions modulate',
    body:
      'Many transmitters, each with its own path and clock. Here six coded symbols select one of ' +
      '64 Walsh functions, the Walsh function is the symbol being sent, not a channel number. ' +
      'Mobiles are told apart by their long codes, which are only quasi-orthogonal on arrival.',
  },
  warning:
    'Choosing a Walsh function does not by itself separate asynchronous reverse-link users. ' +
    'Orthogonality is a property of aligned codes, and reverse-link arrivals are not aligned, ' +
    'which is why IS-95 makes closed-loop power control mandatory rather than optional.',
} as const;
