/**
 * LongCodeExplorer.tsx
 *
 * A masked long-code generator, at a register length you can actually read.
 *
 * SCOPE, STATED PLAINLY AND ON THE PAGE
 * The course reference states that the IS-95 long code comes from a 42-stage
 * generator with period 2^42 − 1 and a 42-bit per-user mask. It does not give
 * the polynomial taps or the initial state. So this page runs the SAME
 * ARCHITECTURE — masked LFSR, output = parity(state AND mask) — on a 4-to-9
 * stage register with a standard primitive polynomial. Structure and mask
 * behaviour are faithful; the taps are illustrative, and the page says so.
 *
 * THE PROPERTY WORTH SEEING
 * Changing the mask does not give a different sequence. It gives the SAME
 * m-sequence starting at a different phase — which is exactly why one
 * polynomial can serve every user in the system. The page finds that phase
 * offset from the generated bits and reports it, so the claim is demonstrated
 * rather than asserted.
 */

import { useMemo, useState } from 'react';
import { CODES, RF } from '../lib/spec';
import { PN_POLYNOMIALS, polynomialForDegree } from '../lib/pn';
import {
  decimate,
  detectPhaseOffset,
  longCodeBinary,
  longCodeBipolar,
  maskToString,
  normalizeMask,
  runLongCode,
} from '../lib/longcode';
import { ChipStrip, Waveform } from './charts';
import { Disclosure, Figure, Legend, Panel, Readouts, ResetButton, SelectField, Term, Why } from './ui';

const DEFAULT_DEGREE = 6;
const DEFAULT_MASK = [1, 0, 1, 1, 0, 0, 0, 0, 0];
const DEFAULT_SEED = [1, 0, 0, 0, 0, 0, 0, 0, 0];

/** Three illustrative "users", each with a different mask on the same generator. */
const USER_MASKS: Record<string, number[]> = {
  'User A': [1, 0, 0, 0, 0, 0, 0, 0, 0],
  'User B': [1, 0, 1, 1, 0, 0, 0, 0, 0],
  'User C': [0, 1, 1, 0, 1, 0, 0, 0, 0],
};

export function LongCodeExplorer() {
  const [degree, setDegree] = useState(DEFAULT_DEGREE);
  const [maskBits, setMaskBits] = useState<number[]>(DEFAULT_MASK);
  const [seedBits, setSeedBits] = useState<number[]>(DEFAULT_SEED);

  const poly = polynomialForDegree(degree);
  const mask = useMemo(() => normalizeMask(maskBits, degree), [maskBits, degree]);
  const seed = useMemo(() => normalizeMask(seedBits, degree), [seedBits, degree]);

  const period = poly.period;
  const bipolar = useMemo(() => longCodeBipolar(degree, seed, mask, period), [degree, seed, mask, period]);
  const binary = useMemo(() => longCodeBinary(degree, seed, mask, period), [degree, seed, mask, period]);
  const offset = useMemo(() => detectPhaseOffset(degree, seed, mask), [degree, seed, mask]);
  const steps = useMemo(() => runLongCode(poly, seed, mask, Math.min(10, period)), [poly, seed, mask, period]);

  // Each illustrative user's sequence, to show they are phases of one sequence.
  const userSequences = useMemo(
    () =>
      Object.entries(USER_MASKS).map(([name, m]) => ({
        name,
        mask: normalizeMask(m, degree),
        bits: longCodeBipolar(degree, seed, normalizeMask(m, degree), Math.min(32, period)),
        offset: detectPhaseOffset(degree, seed, normalizeMask(m, degree)),
      })),
    [degree, seed, period],
  );

  // The forward link's 1:64 decimation, shown at the model's scale.
  const decimated = useMemo(() => decimate(bipolar, 8), [bipolar]);

  const reset = () => {
    setDegree(DEFAULT_DEGREE);
    setMaskBits(DEFAULT_MASK);
    setSeedBits(DEFAULT_SEED);
  };

  return (
    <div className="stack">
      <Disclosure id="long-code-model" />

      <div className="controls">
        <SelectField
          label="Model register length"
          value={degree}
          options={PN_POLYNOMIALS.map((p) => ({
            value: p.degree,
            label: `${p.degree} stages · period ${p.period}`,
          }))}
          onChange={setDegree}
          width="15rem"
        />
        <div className="control" style={{ flex: '0 0 auto' }}>
          <span className="control__label">
            Mask <span className="control__value">{maskToString(mask)}</span>
          </span>
          <div className="btn-row">
            {Array.from({ length: degree }, (_, i) => (
              <button
                key={i}
                type="button"
                className={`btn${mask[i] === 1 ? ' btn--primary' : ''}`}
                style={{ padding: '0.4rem 0.6rem' }}
                aria-label={`Mask bit for stage ${i + 1} is ${mask[i] === 1 ? 'selected' : 'not selected'}`}
                onClick={() =>
                  setMaskBits((prev) => {
                    const next = normalizeMask(prev, degree);
                    next[i] = next[i] === 1 ? 0 : 1;
                    return next;
                  })
                }
              >
                {mask[i]}
              </button>
            ))}
          </div>
        </div>
        <div className="control" style={{ flex: '0 0 auto' }}>
          <span className="control__label">Initial state</span>
          <div className="btn-row">
            {Array.from({ length: degree }, (_, i) => (
              <button
                key={i}
                type="button"
                className={`btn${seed[i] === 1 ? ' btn--primary' : ''}`}
                style={{ padding: '0.4rem 0.6rem' }}
                aria-label={`Initial state of stage ${i + 1} is ${seed[i]}`}
                onClick={() =>
                  setSeedBits((prev) => {
                    const next = normalizeMask(prev, degree);
                    next[i] = next[i] === 1 ? 0 : 1;
                    return next;
                  })
                }
              >
                {seed[i]}
              </button>
            ))}
            <ResetButton onReset={reset} />
          </div>
        </div>
        <div className="control" style={{ flex: '0 0 auto' }}>
          <span className="control__label">Load an illustrative user</span>
          <div className="btn-row">
            {Object.entries(USER_MASKS).map(([name, m]) => (
              <button key={name} type="button" className="btn" onClick={() => setMaskBits(m)}>
                {name}
              </button>
            ))}
          </div>
        </div>
      </div>

      <Readouts
        items={[
          { label: 'Model stages', value: degree, note: poly.label },
          { label: 'Model period', value: period, unit: 'chips', note: `2^${degree} − 1` },
          {
            label: 'IS-95 stages',
            value: CODES.longCodeRegisterStages,
            note: `Period ${CODES.longCodePeriodExpression} — stated in the course reference`,
          },
          {
            label: 'Mask',
            value: maskToString(mask),
            emphasis: true,
            note: `Output = parity(state AND mask) = ${mask
              .map((b, i) => (b ? `s${i + 1}` : null))
              .filter(Boolean)
              .join(' ⊕ ')}`,
          },
          {
            label: 'Phase offset',
            value: offset === null ? 'not found' : offset,
            unit: offset === null ? undefined : 'chips',
            emphasis: true,
            note:
              offset === null
                ? 'No matching offset — unexpected for a primitive polynomial'
                : 'Against the reference mask 100…0 — same sequence, different starting point',
          },
          {
            label: 'Ones / zeros',
            value: `${binary.filter((b) => b === 1).length} / ${binary.filter((b) => b === 0).length}`,
            note: 'Over one model period',
          },
        ]}
      />

      {/* ---------------- the generator ---------------- */}

      <Figure
        label="Fig. 3.9"
        caption={
          <>
            The masked generator, first {steps.length} clocks. Brick columns are the feedback taps
            ({poly.taps.map((t) => `s${t}`).join(' ⊕ ')}); shaded cells are the stages this mask
            selects. The output is the XOR of the shaded cells — not simply the last stage, which
            is what makes the mask the per-user parameter.
          </>
        }
      >
        <div className="scroll-x">
          <table className="spec-table" style={{ minWidth: '30rem' }}>
            <thead>
              <tr>
                <th>Clock</th>
                {Array.from({ length: degree }, (_, i) => (
                  <th key={i} style={{ textAlign: 'center' }}>
                    s{i + 1}
                    {poly.taps.includes(i + 1) ? <span style={{ color: 'var(--brick)' }}> ⊕</span> : null}
                  </th>
                ))}
                <th style={{ textAlign: 'center' }}>Feedback</th>
                <th style={{ textAlign: 'center' }}>Output</th>
              </tr>
            </thead>
            <tbody>
              {steps.map((s, i) => (
                <tr key={i}>
                  <td className="is-value">{i}</td>
                  {s.state.map((bit, j) => (
                    <td
                      key={j}
                      className="is-value"
                      style={{
                        textAlign: 'center',
                        background: s.selected[j] ? 'var(--brick-wash-strong)' : undefined,
                        color: poly.taps.includes(j + 1) ? 'var(--brick)' : undefined,
                      }}
                    >
                      {bit}
                    </td>
                  ))}
                  <td className="is-value" style={{ textAlign: 'center', color: 'var(--olive)' }}>
                    {s.feedback}
                  </td>
                  <td className="is-value" style={{ textAlign: 'center', fontWeight: 600 }}>
                    {s.output}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Figure>

      <Figure
        label="Fig. 3.10"
        caption={<>One model period of this user's long code, bipolar.</>}
      >
        <Waveform samples={bipolar} colour="var(--brick)" label="long code" showBitBoundaries={false} />
      </Figure>

      {/* ---------------- three users, one sequence ---------------- */}

      <Figure
        label="Fig. 3.11"
        caption={
          <>
            Three masks on the same generator and the same initial state. The sequences look
            unrelated chip by chip, but each is the same m-sequence at a different phase — the
            offsets are measured from the generated bits, not asserted. This is how one generator
            polynomial serves every user in the system.
          </>
        }
      >
        <ChipStrip
          maxChips={Math.min(32, period)}
          rows={userSequences.map((u) => ({
            label: `${u.name} · ${maskToString(u.mask)}${u.offset === null ? '' : ` · +${u.offset}`}`,
            values: u.bits,
          }))}
        />
      </Figure>

      <Figure
        label="Fig. 3.12"
        caption={
          <>
            Decimation, at the model’s scale. The forward link runs the long code at{' '}
            {(RF.chipRateCps / 1e6).toFixed(4)} Mc/s and takes every 64th bit to get 19 200 s/s for
            scrambling the symbol stream. Shown here as 1:8 so the relationship is visible on a{' '}
            {period}-chip period — the ratio is illustrative, the mechanism is the deck’s.
          </>
        }
      >
        <Waveform samples={bipolar.slice(0, 64)} colour="var(--warm-grey)" label="full-rate long code" height={48} showBitBoundaries={false} />
        <div style={{ marginTop: '0.5rem' }}>
          <Waveform samples={decimated.slice(0, 8)} colour="var(--brick)" label="decimated long code" height={48} showBitBoundaries={false} />
        </div>
      </Figure>

      <Legend
        entries={[
          { colour: 'var(--brick)', label: 'This user’s long code' },
          { colour: 'var(--olive)', label: 'Feedback bit' },
          { colour: 'var(--warm-grey)', label: 'Full-rate sequence before decimation' },
        ]}
      />

      <div className="split--even split">
        <Panel variant="sunk" title="Forward link — the long code scrambles">
          <p className="small" style={{ margin: 0 }}>
            Run at 1.2288 Mc/s, decimated 1:64 to 19 200 s/s, and used in the MUX to scramble one
            user’s symbol stream before Walsh covering. Separation between channels here is done by
            the <Term k="walsh">Walsh functions</Term>; the long code adds privacy, not
            channelisation.
          </p>
        </Panel>
        <Panel variant="sunk" title="Reverse link — the long code identifies">
          <p className="small" style={{ margin: 0 }}>
            Run at the full 1.2288 Mc/s, four times the 307.2 kc/s Walsh-modulator output. Here the
            long code is what tells one mobile from another. Because mobiles are asynchronous these
            codes are only quasi-orthogonal on arrival, which is precisely why{' '}
            <Term k="power control">power control</Term> is mandatory.
          </p>
        </Panel>
      </div>

      <Why>
        A mask is not a different code — it is a different <em>phase</em> of one code. Toggle a mask
        bit and watch the measured phase offset change while the period stays at 2ⁿ − 1. That single
        design choice is what makes per-user scrambling cheap enough to put in a 1995 handset.
      </Why>

      <Disclosure>
        What is faithful here: the architecture (masked LFSR, output = parity of masked stages), the
        mask-as-phase-offset property, and the decimation mechanism. What is not: the register is 4
        to 9 stages rather than 42, the taps come from a standard primitive-polynomial table rather
        than from IS-95, and the initial state is whatever you set. The course reference supplies
        the stage count, the period and the existence of the mask — not the polynomial — so nothing
        on this page is presented as standard-compliant.
      </Disclosure>
    </div>
  );
}
