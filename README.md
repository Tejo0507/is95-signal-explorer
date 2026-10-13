# IS-95 Signal Explorer

An interactive laboratory for CDMA (IS-95) radio specifications, spreading codes, logical channels
and physical channel allocation.

Built for a three-person team presentation on CDMA for **21ECO103T, Modern Wireless Communication
System, Unit 4: Code Division Multiple Access**. Every specification follows the course deck
`SIGNAL_LAB_CDMA_IS95`, which in turn cites the Unit-4 course reference *3G and Beyond*, CDMA /
IS-95 section (slides 26–58).

---

## What it is, and what it is not

**It is** a teaching instrument whose numbers are computed rather than illustrated. The order-64
Walsh family, the maximal-length shift-register sequences, the masked long-code generator and all
the correlation and spreading arithmetic run live in the browser.

**It is not** a standard-compliant IS-95 modem, and it does not claim to be. Vocoding,
convolutional coding, interleaving and RF are labelled block diagrams carrying the rates the course
reference prints on them. Where the reference supplies no value, the pilot PN and long-code
generator polynomials, for instance, nothing has been invented to fill the gap; the page says so
instead. All eight simplifications are listed on the overview page and repeated in a dashed olive
box at the point each one applies.

---

## The five modules

| # | Module | What you can do |
|---|---|---|
| 01 | **RF & Spreading** | Move a frequency marker across both licensed bands and see band membership and duplex pairing; vary the information rate and watch the spreading factor; step one bit through a full spread-and-recover cycle. |
| 02 | **Logical Channels** | Explore all 64 forward Walsh assignments, change how many paging channels are configured, and switch to the reverse link's access and traffic channels with a highlighting architecture diagram. |
| 03 | **Code Explorer** | Compare any two of the 64 Walsh functions chip by chip and misalign them; generate m-sequences and measure their autocorrelation; drive a masked long-code generator and see the phase offset each mask produces. |
| 04 | **Physical Allocation** | Walk both processing chains block by block, with input, operation, output and rate for every stage, plus the 64-channel allocation map. |
| 05 | **Trace a Signal** | Follow one signal through all seven stages from band allocation to receiver decision, and compare what changes between the links against what they share. |

Each module ends with a knowledge check that tests conceptual understanding rather than recall.

---

## Running it locally

Requires **Node.js 20.19+ or 22.12+** and npm.

```bash
npm install
npm run dev
```

Vite prints a local URL (usually `http://localhost:5173`). The site is entirely client-side, there
is no backend, no API key and no network dependency beyond the Google Fonts stylesheet, which
degrades to system serif/mono if unavailable.

### Other commands

```bash
npm run build       # type check, then production build into dist/
npm run preview     # serve the production build locally
npm test            # run the full test suite once
npm run test:watch  # re-run tests on change
npm run lint        # oxlint
npm run check       # type check + lint + tests, as CI runs it
```

---

## Tests

```
npm test
```

57 tests in two files, and they are worth reading before changing the maths:

- **`src/lib/codes.test.ts`** checks the claims the interface makes on screen. W0 is all `+1` and
  W32 is the half-period square wave the sync channel uses; all 2 016 distinct Walsh pairs are
  orthogonal when aligned; every tabulated PN polynomial produces the ideal autocorrelation
  signature (peak = period, −1 elsewhere); every non-zero long-code mask yields the same
  m-sequence at a measured phase offset; the forward allocation reproduces the deck's layout
  exactly, including its 55 traffic channels; and the rate arithmetic closes in both directions
  (`19 200 × 64 = 1.2288 Mc/s` and `28 800 × 64 ÷ 6 × 4 = 1.2288 Mc/s`).
- **`src/app.smoke.test.tsx`** renders every route, asserts every figure has a caption, and clicks
  **every button on every page** to confirm the brief's "no buttons that do nothing" requirement.

One test is worth singling out. Orthogonality under misalignment is not uniform across the Walsh
family: **651 of the 2 016 distinct pairs leak at some cyclic shift, and the other 1 365 stay at
zero throughout.** W0/W32 and W19/W41 are both in the clean set, so the obvious demonstration
pairs show nothing happening when you misalign them. The explorers therefore default to W4/W5,
which leaks 4 of a possible 8 at one chip of delay in the 8-chip family, exactly the figure the
deck prints on slide 07. The survey figure is pinned by a test so the number quoted on screen
cannot silently drift.

---

## Project layout

Signal processing is kept strictly separate from the UI. Everything in `src/lib` is plain
TypeScript with no React import, so it can be read, tested and reused on its own.

```
src/
├── lib/                      ← all computation and all data. No React.
│   ├── spec.ts               ← single source of truth: every sourced number,
│   │                           plus the list of disclosed simplifications
│   ├── walsh.ts              ← Hadamard construction, correlation, misalignment survey
│   ├── pn.ts                 ← LFSR m-sequences and autocorrelation
│   ├── longcode.ts           ← masked long-code generator, phase-offset detection
│   ├── spreading.ts          ← spreading factor and the spread/recover stages
│   ├── channels.ts           ← logical channel definitions, Walsh allocation
│   ├── pipelines.ts          ← forward and reverse processing stages
│   ├── trace.ts              ← the seven-stage end-to-end trace
│   ├── glossary.ts           ← tooltip definitions
│   ├── quiz.ts               ← knowledge-check questions
│   └── storage.ts            ← the one localStorage flag
├── components/
│   ├── ui.tsx                ← Term, Why, Disclosure, Figure, Panel, Readouts, controls
│   ├── charts.tsx            ← Waveform, StemPlot, ChipStrip, OrthogonalityStrip
│   ├── theme.ts              ← plot colours and the signal legend
│   ├── FrequencySpectrumExplorer.tsx
│   ├── SpreadingRateCalculator.tsx
│   ├── SpreadingVisualizer.tsx
│   ├── LogicalChannelMap.tsx
│   ├── WalshCodeExplorer.tsx
│   ├── PNSequenceExplorer.tsx
│   ├── LongCodeExplorer.tsx
│   ├── LinkPipeline.tsx      ← exports ForwardLinkPipeline and ReverseLinkPipeline
│   ├── WalshAllocationMap.tsx
│   ├── SignalTrace.tsx
│   ├── KnowledgeCheck.tsx
│   └── Walkthrough.tsx
├── pages/                    ← one file per module, composing the components
├── styles/globals.css        ← the whole design system
├── routes.ts                 ← the five modules and hash routing
└── App.tsx                   ← shell, masthead, colophon
```

### Extending it

- **To change a specification**, edit `src/lib/spec.ts`. Nothing else hard-codes a number, so no
  page can disagree with another.
- **To add a quiz question**, add to the relevant array in `src/lib/quiz.ts`. The UI picks it up
  with no other change.
- **To add a glossary tooltip**, add an entry to `src/lib/glossary.ts` and wrap the text in
  `<Term k="your-key">…</Term>`.
- **To add a pipeline stage**, add it to the array in `src/lib/pipelines.ts`. Every stage needs
  `purpose`, `input`, `operation`, `output`, `rate` and `next`, a test enforces that.
- **To disclose a new simplification**, add it to `DISCLOSURES` in `src/lib/spec.ts` and render
  `<Disclosure id="your-id" />`. It then appears both in place and in the overview's full list.

### Design system

Defined once in `src/styles/globals.css` as custom properties: ivory `#F4F0E7`, charcoal `#22221F`,
brick red `#B74432`, muted olive `#71806A`, warm grey `#B8B0A2`. Brick red is always the signal
under study, olive is always a secondary signal or a disclosed simplification, and charcoal is
always structure. Diagrams are inline SVG, no charting library, so they stay crisp at any zoom
and legible in page source. The layout is responsive down to 320 px.

---

## Deployment

The build output in `dist/` is plain static files. Routing is hash-based (`#/rf`, `#/codes`, …), so
**no server rewrite rules are needed anywhere** and deep links survive a refresh.

### GitHub Pages (configured)

`.github/workflows/deploy.yml` builds and publishes on every push to `main`. It runs `npm run
check` first, so a type error, lint error or failing test blocks the deploy.

A project site is served from `https://<user>.github.io/<repo>/`, so Vite's `base` must match. The
workflow sets `BASE_PATH=/<repo>/` from the repository name; `vite.config.ts` reads it and defaults
to `/` otherwise.

One-time setup: **Settings → Pages → Build and deployment → Source: GitHub Actions**.

### Vercel

No configuration file needed.

```bash
npm i -g vercel
vercel          # preview deployment
vercel --prod   # production
```

Or import the repository at vercel.com. Vercel detects Vite and uses `npm run build` with output
`dist`. Leave `BASE_PATH` unset, Vercel serves from the domain root, and the default `/` is
correct.

### Netlify, Cloudflare Pages or any static host

Build command `npm run build`, publish directory `dist`, and no redirect rules.

---

## Source and honesty

All specifications follow the course deck `SIGNAL_LAB_CDMA_IS95` (21ECO103T, Unit 4), which cites
the Unit-4 course reference *3G and Beyond*, CDMA / IS-95 section. Figures the deck marks
illustrative or schematic are reproduced as schematic.

Two claims this project deliberately does not make, following the deck's own slide 06: that CDMA
capacity is unlimited, and that spreading is encryption. Spreading gives a measure of privacy; it
is not cryptographic protection.

IS-95 (cdmaOne) should not be confused with W-CDMA, the 3G UMTS air interface at 3.84 Mchip/s,
a different and later standard. Every figure here is IS-95.
