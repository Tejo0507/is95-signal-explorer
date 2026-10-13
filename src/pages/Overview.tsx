/**
 * Overview.tsx, the front page and table of contents.
 *
 * Also the one place where every disclosed simplification on the site is
 * collected, so a reader (or an examiner) can see the whole list without
 * hunting through five modules.
 */

import { DISCLOSURES, NOT_WCDMA, RF, SOURCE, STANDARD_FACTS } from '../lib/spec';
import { Figure, Panel, Readouts, Term } from '../components/ui';
import { PlotFrame } from '../components/charts';
import { PLOT_COLOURS } from '../components/theme';
import { walshSequence } from '../lib/walsh';
import type { Route } from '../routes';
import { ROUTES } from '../routes';

const { INK, BRICK, OLIVE, GREY } = PLOT_COLOURS;

export function Overview({ onNavigate }: { onNavigate: (r: Route) => void }) {
  const modules = ROUTES.filter((r) => r.id !== 'overview');

  return (
    <div className="page">
      {/* ---------------- hero ---------------- */}
      <header className="hero">
        <div>
          <div className="hero__kicker">
            <span className="hero__rule" />
            <p className="eyebrow">{SOURCE.unit}</p>
          </div>
          <h1 className="display">
            IS-95 Signal
            <br />
            Explorer
          </h1>
          <p className="lede">
            An interactive laboratory for CDMA radio specifications, spreading codes, logical
            channels and physical channel allocation, built from the Unit-4 course reference and
            computed live rather than illustrated.
          </p>
          <div className="hero__meta">
            <span>{SOURCE.course}</span>
            <span>Five modules</span>
            <span>Every figure sourced</span>
          </div>
        </div>

        <ThreeUsersFigure />
      </header>

      {/* ---------------- the standard at a glance ---------------- */}
      <section className="section" style={{ marginTop: 'var(--s7)' }}>
        <div className="section__head">
          <p className="eyebrow eyebrow--brick">00</p>
          <h2>The standard, at a glance</h2>
          <span className="section__head-spacer" />
          <p className="eyebrow">Course reference</p>
        </div>

        <div className="split">
          <Figure
            label="Table 0.1"
            caption={
              <>
                The figures every module on this site is built from. They are stored in one module,{' '}
                <span className="mono">src/lib/spec.ts</span>, so no page can quietly disagree with
                another.
              </>
            }
          >
            <table className="spec-table">
              <thead>
                <tr>
                  <th>Property</th>
                  <th>Value</th>
                  <th>Note</th>
                </tr>
              </thead>
              <tbody>
                {STANDARD_FACTS.map((f) => (
                  <tr key={f.label}>
                    <td>{f.label}</td>
                    <td className="is-value" style={{ color: 'var(--brick)' }}>
                      {f.value}
                    </td>
                    <td className="is-note">{f.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Figure>

          <div className="stack">
            <Panel variant="sunk" title="Not to be confused with">
              <p className="small" style={{ margin: 0 }}>
                {NOT_WCDMA}
              </p>
            </Panel>
            <Readouts
              items={[
                { label: 'Reverse band', value: '824–849', unit: 'MHz', note: 'mobile → base' },
                { label: 'Forward band', value: '869–894', unit: 'MHz', note: 'base → mobile' },
                { label: 'Duplex spacing', value: RF.duplexSeparationMHz, unit: 'MHz' },
                { label: 'Channel bandwidth', value: RF.nominalChannelBandwidthMHz, unit: 'MHz' },
                { label: 'Chip rate', value: '1.2288', unit: 'Mchip/s', emphasis: true },
                { label: 'Spreading at 9.6 kb/s', value: RF.exampleSpreadingFactor, note: '1 228 800 ÷ 9 600' },
              ]}
            />
          </div>
        </div>
      </section>

      {/* ---------------- contents ---------------- */}
      <section className="section">
        <div className="section__head">
          <p className="eyebrow eyebrow--brick">Contents</p>
          <h2>Five modules</h2>
        </div>

        <nav className="contents">
          {modules.map((m) => (
            <button key={m.id} type="button" className="contents__item" onClick={() => onNavigate(m)}>
              <span className="contents__num">{m.num}</span>
              <span className="contents__title">{m.title}</span>
              <span className="contents__desc">{m.blurb}</span>
              <span className="contents__arrow" aria-hidden="true">
                →
              </span>
            </button>
          ))}
        </nav>
      </section>

      {/* ---------------- how to read this site ---------------- */}
      <section className="section">
        <div className="section__head">
          <p className="eyebrow eyebrow--brick">Method</p>
          <h2>How to read this site</h2>
        </div>

        <div className="split--even split">
          <div className="stack">
            <Panel title="What is computed">
              <ul className="small" style={{ marginBottom: 0 }}>
                <li>
                  The order-64 <Term k="walsh">Walsh functions</Term>, from the Hadamard recursion,
                  every correlation figure on the site is their actual inner product, including the
                  live check that all 2 016 distinct pairs are orthogonal.
                </li>
                <li>
                  <Term k="m-sequence">Maximal-length sequences</Term> from real shift registers,
                  with their autocorrelation measured from the generated bits.
                </li>
                <li>
                  A masked long-code generator, including the measured phase offset that each mask
                  produces.
                </li>
                <li>
                  Spreading, correlation and integration arithmetic for the full spread-and-recover
                  cycle.
                </li>
              </ul>
            </Panel>
            <Panel title="What is a diagram">
              <p className="small" style={{ margin: 0 }}>
                Vocoding, convolutional coding, interleaving and RF are drawn as labelled blocks
                with the rates the course reference prints on them. They are not running signal
                processing, and the site never presents a number as a measurement.
              </p>
            </Panel>
          </div>

          <Panel variant="sunk" title={`Every simplification on this site · ${DISCLOSURES.length}`}>
            <p className="small">
              Each of these also appears in a dashed olive box at the place it applies. They are
              collected here so the list can be read in one go.
            </p>
            <table className="spec-table">
              <tbody>
                {DISCLOSURES.map((d) => (
                  <tr key={d.id}>
                    <td style={{ whiteSpace: 'nowrap', verticalAlign: 'top' }}>
                      <span className="mono" style={{ fontSize: '0.625rem', color: 'var(--olive)' }}>
                        {d.where}
                      </span>
                    </td>
                    <td className="is-note">{d.text}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Panel>
        </div>
      </section>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * The deck's opening figure: three spread transmissions summing to one
 * received voltage. Drawn from actual Walsh sequences so the sum is the
 * real sum, not a sketch.
 * ------------------------------------------------------------------ */

function ThreeUsersFigure() {
  const LEN = 32;
  const users = [
    { label: 'u1 · W8', seq: walshSequence(8, LEN), colour: BRICK },
    { label: 'u2 · W19', seq: walshSequence(19, LEN), colour: OLIVE },
    { label: 'u3 · W41', seq: walshSequence(41, LEN), colour: GREY },
  ];
  const sum = Array.from({ length: LEN }, (_, i) => users.reduce((acc, u) => acc + u.seq[i], 0));

  const W = 420;
  const H = 300;
  const padL = 46;
  const plotW = W - padL - 14;
  const dx = plotW / LEN;
  const rowH = 46;

  const step = (seq: number[], y: number, amp: number) => {
    let d = '';
    for (let i = 0; i < seq.length; i += 1) {
      const yy = y - (seq[i] / 3) * amp;
      d += i === 0 ? `M ${padL + i * dx} ${yy}` : ` L ${padL + i * dx} ${yy}`;
      d += ` L ${padL + (i + 1) * dx} ${yy}`;
    }
    return d;
  };

  return (
    <Figure
      label="Fig. 0.1"
      caption={
        <>
          Three spread transmissions on one carrier arrive as a single sum. The bottom trace is the
          actual sum of the three traces above it, the receiver gets only this, and recovers one
          user by correlating for that user’s code.
        </>
      }
    >
      <PlotFrame width={W} height={H} label="Three spread transmissions summing to one received signal">
        {users.map((u, i) => {
          const y = 34 + i * rowH;
          return (
            <g key={u.label}>
              <text x={8} y={y + 3} fontSize={8} fontFamily="'Source Sans 3', sans-serif" fill={u.colour}>
                {u.label}
              </text>
              <line x1={padL} y1={y} x2={padL + plotW} y2={y} stroke={INK} strokeWidth={0.4} opacity={0.4} />
              <path d={step(u.seq, y, 42)} fill="none" stroke={u.colour} strokeWidth={1.4} />
            </g>
          );
        })}

        {/* summing node */}
        <circle cx={padL + plotW / 2} cy={34 + 2.55 * rowH} r={11} fill="none" stroke={INK} strokeWidth={1.1} />
        <text x={padL + plotW / 2} y={34 + 2.55 * rowH + 4} fontSize={12} fontFamily="'Source Sans 3', sans-serif" fill={INK} textAnchor="middle">
          +
        </text>

        {/* the sum */}
        <text x={8} y={34 + 3.4 * rowH + 3} fontSize={8} fontFamily="'Source Sans 3', sans-serif" fill={INK}>
          r(t)
        </text>
        <line
          x1={padL}
          y1={34 + 3.4 * rowH}
          x2={padL + plotW}
          y2={34 + 3.4 * rowH}
          stroke={INK}
          strokeWidth={0.6}
        />
        <path d={step(sum, 34 + 3.4 * rowH, 42)} fill="none" stroke={INK} strokeWidth={1.8} />

        <text x={8} y={H - 36} fontSize={8} fontFamily="'Source Sans 3', sans-serif" fill={GREY}>
          r(t) = s₁(t) + s₂(t) + s₃(t) + n(t)
        </text>
        <text x={8} y={H - 24} fontSize={8} fontFamily="'Source Sans 3', sans-serif" fill={GREY}>
          No filter splits them, they share the band.
        </text>
        <text x={8} y={H - 12} fontSize={8} fontFamily="'Source Sans 3', sans-serif" fill={GREY}>
          No time gate splits them, they overlap in time.
        </text>
        <text x={padL + plotW} y={H - 12} fontSize={8} fontFamily="'Source Sans 3', sans-serif" fill={GREY} textAnchor="end">
          {LEN} chips →
        </text>
      </PlotFrame>
    </Figure>
  );
}
