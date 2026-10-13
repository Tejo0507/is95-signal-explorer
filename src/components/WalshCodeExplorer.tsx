/**
 * WalshCodeExplorer.tsx
 *
 * Pick any two of the 64 IS-95 Walsh functions and compare them chip by chip.
 * Every number shown is computed from the Hadamard construction in lib/walsh.ts
 *, these are the actual order-64 Walsh functions, indexed the way the course
 * deck indexes them (W0 all zeros for the pilot, W32 the half-period square
 * wave for sync), not arbitrary sequences relabelled.
 *
 * The misalignment control is the educational core: at zero shift the inner
 * product of any distinct pair is exactly 0, and at any other shift it
 * generally is not. That single control separates "these codes are orthogonal"
 * from "these codes are orthogonal WHEN ALIGNED", which is the distinction the
 * forward and reverse links turn on.
 */

import { useMemo, useState } from 'react';
import { CODES } from '../lib/spec';
import {
  correlationAgainstFamily,
  correlationVsShift,
  cyclicShift,
  elementwiseProduct,
  familyIsOrthogonal,
  innerProduct,
  misalignmentSurvey,
  normalizedCorrelation,
  runningCorrelation,
  toBinaryString,
  toSignString,
  walshSequence,
} from '../lib/walsh';
import { forwardAllocation } from '../lib/channels';
import { ChipStrip, OrthogonalityStrip, StemPlot, Waveform } from './charts';
import { Disclosure, Figure, Legend, NumberField, Panel, Readouts, ResetButton, Slider, Term, Why } from './ui';

const ORDER = CODES.walshOrder;
// W4 and W5 are the default pair because they are one of the 651 pairs that
// actually leak under misalignment. Starting on a pair that stays at zero for
// every shift (W0/W32 and W19/W41 both do) would quietly teach the opposite of
// what this explorer exists to show.
const DEFAULT_A = 4;
const DEFAULT_B = 5;

/** Verified once at module load: all 2 016 distinct pairs have zero inner product. */
const FAMILY_ORTHOGONAL = familyIsOrthogonal(ORDER);

export function WalshCodeExplorer() {
  const [a, setA] = useState(DEFAULT_A);
  const [b, setB] = useState(DEFAULT_B);
  const [shift, setShift] = useState(0);

  const allocation = useMemo(() => forwardAllocation(7), []);

  const seqA = useMemo(() => walshSequence(a, ORDER), [a]);
  const seqBAligned = useMemo(() => walshSequence(b, ORDER), [b]);
  const seqB = useMemo(() => cyclicShift(seqBAligned, shift), [seqBAligned, shift]);

  const product = useMemo(() => elementwiseProduct(seqA, seqB), [seqA, seqB]);
  const running = useMemo(() => runningCorrelation(seqA, seqB), [seqA, seqB]);
  const dot = innerProduct(seqA, seqB);
  const normalized = normalizedCorrelation(seqA, seqB);

  const vsShift = useMemo(() => correlationVsShift(seqA, seqBAligned), [seqA, seqBAligned]);
  const vsFamily = useMemo(() => correlationAgainstFamily(a, ORDER), [a]);
  const survey = useMemo(() => misalignmentSurvey(ORDER), []);

  // Does this particular pair leak at any shift? 651 of the 2 016 pairs do.
  const worstLeak = Math.max(...vsShift.map(Math.abs));
  const pairLeaks = worstLeak > 0;

  const same = a === b;
  const reset = () => {
    setA(DEFAULT_A);
    setB(DEFAULT_B);
    setShift(0);
  };

  const roleOf = (index: number) => allocation[index].label;

  return (
    <div className="stack">
      <div className="controls">
        <Slider label="Walsh A" value={a} min={0} max={ORDER - 1} unit={`· ${roleOf(a)}`} onChange={setA} />
        <NumberField label="A index" value={a} min={0} max={ORDER - 1} onCommit={setA} width="6rem" />
        <Slider label="Walsh B" value={b} min={0} max={ORDER - 1} unit={`· ${roleOf(b)}`} onChange={setB} />
        <NumberField label="B index" value={b} min={0} max={ORDER - 1} onCommit={setB} width="6rem" />
        <Slider
          label="Misalignment of B"
          value={shift}
          min={0}
          max={ORDER - 1}
          unit="Tc"
          onChange={setShift}
          grow={false}
        />
        <div className="control" style={{ flex: '0 0 auto' }}>
          <span className="control__label">&nbsp;</span>
          <div className="btn-row">
            <button type="button" className="btn" onClick={() => { setA(4); setB(5); setShift(1); }}>
              Leaks when shifted
            </button>
            <button type="button" className="btn" onClick={() => { setA(0); setB(32); setShift(1); }}>
              Pilot vs sync, robust
            </button>
            <button type="button" className="btn" onClick={() => { setA(19); setB(41); setShift(1); }}>
              Two traffic, robust
            </button>
            <ResetButton onReset={reset} />
          </div>
        </div>
      </div>

      <Readouts
        items={[
          { label: 'Code A', value: `W${a}`, note: roleOf(a) },
          { label: 'Code B', value: `W${b}`, note: `${roleOf(b)}${shift > 0 ? ` · shifted ${shift} Tc` : ''}` },
          { label: 'Code length', value: ORDER, unit: 'chips', note: 'One per Walsh symbol' },
          {
            label: 'Inner product',
            value: dot > 0 ? `+${dot}` : String(dot),
            emphasis: true,
            note: same ? 'Same code, full self-correlation' : shift === 0 ? 'Aligned, distinct codes' : `Misaligned by ${shift} Tc`,
          },
          {
            label: 'Normalised',
            value: normalized.toFixed(4),
            note: '+1 identical · 0 orthogonal · −1 inverted',
          },
          {
            label: 'Orthogonal?',
            value: same ? 'n/a, same code' : dot === 0 ? 'Yes' : 'No',
            emphasis: !same && dot !== 0,
            note: same
              ? undefined
              : dot === 0
                ? 'Products cancel exactly over the period'
                : `${Math.abs(dot)} of ${ORDER} leaks through`,
          },
        ]}
      />

      {/* ---------------- waveforms ---------------- */}

      <div className="stack stack--tight">
        <Figure
          label="Fig. 3.1a"
          caption={<>W{a} as a chip waveform, {ORDER} chips, one Walsh symbol.</>}
        >
          <Waveform samples={seqA} colour="var(--brick)" label={`W${a}`} showBitBoundaries={false} />
        </Figure>
        <Figure
          label="Fig. 3.1b"
          caption={
            <>
              W{b} {shift > 0 ? `cyclically shifted by ${shift} chips` : 'aligned with W' + a}.
            </>
          }
        >
          <Waveform samples={seqB} colour="var(--olive)" label={`W${b}`} showBitBoundaries={false} />
        </Figure>
        <Figure
          label="Fig. 3.1c"
          caption={
            <>
              Chip-by-chip product, and the correlator’s running sum. The sum’s final value is the
              inner product: {dot > 0 ? `+${dot}` : dot}.
            </>
          }
        >
          <Waveform samples={product} colour="var(--charcoal)" label="product" showBitBoundaries={false} />
          <div style={{ marginTop: '0.5rem' }}>
            <Waveform
              samples={running}
              colour="var(--charcoal)"
              label="running correlation"
              yMax={ORDER}
              height={84}
              showBitBoundaries={false}
            />
          </div>
        </Figure>
      </div>

      <Legend
        entries={[
          { colour: 'var(--brick)', label: `Code A, W${a}` },
          { colour: 'var(--olive)', label: `Code B, W${b}` },
          { colour: 'var(--charcoal)', label: 'Product and running correlation' },
          { colour: 'var(--warm-grey)', label: 'Axes and zero line' },
        ]}
      />

      {/* ---------------- chip-by-chip table ---------------- */}

      <Figure
        label="Fig. 3.2"
        caption={
          <>
            First 32 chips, chip by chip. The bottom row is the running sum, watch where it
            returns to zero (orthogonal) or walks away from it (not).
          </>
        }
      >
        <ChipStrip
          maxChips={32}
          rows={[
            { label: `W${a}`, values: seqA },
            { label: `W${b}${shift > 0 ? ` +${shift}Tc` : ''}`, values: seqB },
            { label: 'product', values: product },
            { label: 'Σ running', values: running, numeric: true },
          ]}
        />
      </Figure>

      {/* ---------------- sequence forms ---------------- */}

      <div className="split--even split">
        <Panel title={`W${a}, sequence forms`}>
          <p className="control__label" style={{ marginBottom: '0.3rem' }}>Binary (0 ↦ +1, 1 ↦ −1)</p>
          <pre className="seq">{toBinaryString(seqA)}</pre>
          <p className="control__label" style={{ margin: '0.75rem 0 0.3rem' }}>Bipolar</p>
          <pre className="seq seq--signs">{toSignString(seqA)}</pre>
        </Panel>
        <Panel title={`W${b}, sequence forms`}>
          <p className="control__label" style={{ marginBottom: '0.3rem' }}>Binary (0 ↦ +1, 1 ↦ −1)</p>
          <pre className="seq">{toBinaryString(seqBAligned)}</pre>
          <p className="control__label" style={{ margin: '0.75rem 0 0.3rem' }}>Bipolar</p>
          <pre className="seq seq--signs">{toSignString(seqBAligned)}</pre>
        </Panel>
      </div>

      {/* ---------------- orthogonality demonstrations ---------------- */}

      <Figure
        label="Fig. 3.3"
        caption={
          <>
            W{a} correlated against all {ORDER} Walsh functions, aligned. Every bar is zero except
            the self-correlation at W{a}, the olive ticks on the axis are genuine zeros, drawn so
            that "nothing here" is distinguishable from "not plotted". Click a bar to load it as
            code B.
          </>
        }
      >
        <OrthogonalityStrip values={vsFamily} selfIndex={a} onPick={setB} />
      </Figure>

      <Figure
        label="Fig. 3.4"
        caption={
          <>
            The same pair, W{a} against W{b}, at every possible misalignment. Zero shift always
            gives exactly 0.{' '}
            {pairLeaks ? (
              <>
                This pair <strong>leaks once misaligned</strong>, by up to {worstLeak} of {ORDER}.
              </>
            ) : (
              <>
                This particular pair happens to stay at zero for <strong>every</strong> shift. Not
                all pairs do, the presets above load one of each kind.
              </>
            )}{' '}
            Click a stem to set the misalignment.
          </>
        }
      >
        <StemPlot
          values={vsShift}
          xLabel="shift / Tc"
          yLabel="inner product"
          highlightIndex={shift}
          onPick={setShift}
        />
      </Figure>

      <Readouts
        items={[
          {
            label: 'Family check',
            value: FAMILY_ORTHOGONAL ? 'All pairs orthogonal' : 'Failed',
            emphasis: true,
            note: `Verified live at load: all ${(ORDER * (ORDER - 1)) / 2} distinct pairs of the order-${ORDER} family have inner product 0`,
          },
          {
            label: 'Worst misalignment',
            value: worstLeak,
            emphasis: pairLeaks,
            note: `Largest |inner product| over all ${ORDER} shifts of W${b} against W${a}`,
          },
          {
            label: 'Shifts giving zero',
            value: `${vsShift.filter((v) => v === 0).length} of ${ORDER}`,
            note: pairLeaks
              ? 'This pair loses orthogonality at the other shifts'
              : 'This pair stays orthogonal at every shift',
          },
          {
            label: 'Pairs that leak when shifted',
            value: `${survey.leaky} of ${survey.total}`,
            note: `Surveyed across the whole order-${ORDER} family: ${survey.clean} pairs stay at zero for every cyclic shift, ${survey.leaky} do not. Alignment matters more for some pairs than others.`,
          },
        ]}
      />

      <div className="panel panel--sunk">
        <h3 className="panel__title">Three statements, kept apart</h3>
        <ol className="small" style={{ marginBottom: 0 }}>
          <li>
            <strong>These sequences are orthogonal.</strong> True of any distinct pair of the
            order-64 family, over one full period, perfectly aligned, Fig. 3.3 shows it for all 64
            at once.
          </li>
          <li>
            <strong>Forward-link channelisation uses that.</strong> The base station transmits
            every channel from one clock, so the alignment assumption holds and{' '}
            <Term k="channelisation">channelisation</Term> genuinely separates the channels.
          </li>
          <li>
            <strong>Misalignment can break it, and does so unevenly.</strong> {survey.leaky} of
            the {survey.total} distinct pairs leak at some shift; the other {survey.clean} happen
            to stay at zero throughout. So "Walsh codes are orthogonal" is not a safe thing to
            lean on once alignment is lost, even though some pairs survive it. Reverse-link
            mobiles arrive unaligned, which is why they are separated by long codes and policed by
            power control instead.
          </li>
        </ol>
      </div>

      <Why>
        Orthogonality is a property of codes <em>in alignment</em>, not an intrinsic property of
        the codes. Dragging the misalignment slider off zero is the whole of{' '}
        <Term k="self-jamming">self-jamming</Term> in one gesture, and the fact that the result
        depends on <em>which</em> pair you picked is why a system cannot be designed to rely on
        getting lucky.
      </Why>

      <Disclosure id="walsh-alignment" />
      <Disclosure>
        Misalignment is modelled here as a cyclic shift of one code within a single symbol period.
        That keeps the arithmetic exact and the figure readable, but it is optimistic: a genuinely
        late arrival brings in chips from the <em>previous</em> symbol, which generally carries
        different data, so a real reverse-link interferer is not limited to the values plotted in
        Fig. 3.4. The direction of the lesson is right; treat the magnitudes as a floor rather
        than a worst case.
      </Disclosure>
    </div>
  );
}
