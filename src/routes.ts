/**
 * routes.ts — the site's five modules plus the overview.
 *
 * Routing is hash-based (`#/rf`, `#/codes`, …) and hand-rolled rather than
 * pulled in from a router library. Hash routing means the built site works from
 * any static host — GitHub Pages included — with no server rewrite rules, and
 * a deep link survives a page refresh.
 */

export type RouteId = 'overview' | 'rf' | 'channels' | 'codes' | 'physical' | 'trace';

export interface Route {
  id: RouteId;
  /** Display number in the navigation, e.g. "01". */
  num: string;
  /** Short label for the nav bar. */
  nav: string;
  /** Full title for the page head. */
  title: string;
  /** One line for the table of contents. */
  blurb: string;
  /** URL hash fragment. */
  hash: string;
}

export const ROUTES: Route[] = [
  {
    id: 'overview',
    num: '00',
    nav: 'Overview',
    title: 'IS-95 Signal Explorer',
    blurb: 'The standard at a glance, and how to read this site.',
    hash: '#/',
  },
  {
    id: 'rf',
    num: '01',
    nav: 'RF & Spreading',
    title: 'RF and spreading specifications',
    blurb:
      'Where IS-95 lives on the spectrum, what 1.25 MHz and 1.2288 Mchip/s each mean, and what the 128 ratio does and does not describe.',
    hash: '#/rf',
  },
  {
    id: 'channels',
    num: '02',
    nav: 'Logical Channels',
    title: 'Logical channel architecture',
    blurb:
      'Four forward channel types across 64 Walsh codes, two reverse channels, and why Walsh functions do a different job in each direction.',
    hash: '#/channels',
  },
  {
    id: 'codes',
    num: '03',
    nav: 'Code Explorer',
    title: 'Code distribution',
    blurb:
      'The real order-64 Walsh family, genuine maximal-length PN sequences, and a masked long-code generator — with the alignment assumption made visible.',
    hash: '#/codes',
  },
  {
    id: 'physical',
    num: '04',
    nav: 'Physical Allocation',
    title: 'Physical channel allocation',
    blurb:
      'Both processing chains block by block, deliberately different in shape, plus the 64-channel forward allocation map.',
    hash: '#/physical',
  },
  {
    id: 'trace',
    num: '05',
    nav: 'Trace a Signal',
    title: 'Trace a signal',
    blurb:
      'Pick a channel and follow one signal through all seven stages, then compare what changes between the links against what they share.',
    hash: '#/trace',
  },
];

export const OVERVIEW = ROUTES[0];

export function routeFromHash(hash: string): Route {
  const clean = hash.replace(/^#/, '').replace(/\/+$/, '') || '/';
  const found = ROUTES.find((r) => r.hash.replace(/^#/, '').replace(/\/+$/, '') === clean);
  return found ?? OVERVIEW;
}

export function routeById(id: RouteId): Route {
  return ROUTES.find((r) => r.id === id) ?? OVERVIEW;
}
