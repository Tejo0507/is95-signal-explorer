/**
 * FrequencySpectrumExplorer.tsx
 *
 * Draws both licensed bands on one frequency axis, marks the 45 MHz duplex
 * separation, and lets a marker be moved by slider or typed in directly. The
 * readout says whether the marker is inside either band and, if so, where its
 * duplex pair sits.
 *
 * The point the plot is built to make: the 25 MHz band is NOT one carrier. The
 * lower panel zooms in on a single nominal 1.25 MHz channel, drawn to scale
 * against the band it sits in, with the simple arithmetic (25 ÷ 1.25 = 20
 * nominal carriers) spelled out beside it.
 */

import { useMemo, useState } from 'react';
import { FORWARD_BAND, REVERSE_BAND, RF } from '../lib/spec';
import { Disclosure, Figure, NumberField, Readouts, ResetButton, Slider, Term, Why } from './ui';
import { PlotFrame } from './charts';
import { PLOT_COLOURS } from './theme';

const { INK, BRICK, OLIVE, GREY, PAPER } = PLOT_COLOURS;

const DEFAULT_MARKER = 880.0;

/** Which band, if any, contains this frequency? */
function bandAt(mhz: number) {
  if (mhz >= REVERSE_BAND.lowMHz && mhz <= REVERSE_BAND.highMHz) return REVERSE_BAND;
  if (mhz >= FORWARD_BAND.lowMHz && mhz <= FORWARD_BAND.highMHz) return FORWARD_BAND;
  return null;
}

export function FrequencySpectrumExplorer() {
  const [marker, setMarker] = useState(DEFAULT_MARKER);

  const band = bandAt(marker);
  const pair = useMemo(() => {
    if (!band) return null;
    // Reverse channels pair 45 MHz above; forward channels 45 MHz below.
    return band.id === 'reverse' ? marker + RF.duplexSeparationMHz : marker - RF.duplexSeparationMHz;
  }, [band, marker]);

  const nominalCarriers = RF.bandSpanMHz / RF.nominalChannelBandwidthMHz;

  /* -------------------- wide spectrum plot -------------------- */

  const W = 760;
  const H = 240;
  const padL = 18;
  const padR = 18;
  const plotW = W - padL - padR;
  const xOf = (mhz: number) =>
    padL + ((mhz - RF.axisLowMHz) / (RF.axisHighMHz - RF.axisLowMHz)) * plotW;

  const axisY = 196;
  const revY = 128;
  const fwdY = 60;
  const bandH = 40;

  const ticks: number[] = [];
  for (let f = RF.axisLowMHz; f <= RF.axisHighMHz; f += 10) ticks.push(f);
  const minorTicks: number[] = [];
  for (let f = RF.axisLowMHz; f <= RF.axisHighMHz; f += 5) {
    if (f % 10 !== 0) minorTicks.push(f);
  }

  return (
    <div className="stack">
      <div className="controls">
        <Slider
          label="Frequency marker"
          value={marker}
          min={RF.axisLowMHz}
          max={RF.axisHighMHz}
          step={0.05}
          unit="MHz"
          onChange={setMarker}
          format={(v) => v.toFixed(2)}
        />
        <NumberField
          label="Exact"
          value={marker}
          min={RF.axisLowMHz}
          max={RF.axisHighMHz}
          step={0.05}
          unit="MHz"
          onCommit={setMarker}
          width="8rem"
        />
        <div className="control" style={{ flex: '0 0 auto' }}>
          <span className="control__label">Jump to</span>
          <div className="btn-row">
            <button type="button" className="btn" onClick={() => setMarker(REVERSE_BAND.lowMHz)}>
              824
            </button>
            <button type="button" className="btn" onClick={() => setMarker(FORWARD_BAND.lowMHz)}>
              869
            </button>
            <button type="button" className="btn" onClick={() => setMarker(859)}>
              Gap
            </button>
            <ResetButton onReset={() => setMarker(DEFAULT_MARKER)} />
          </div>
        </div>
      </div>

      <Figure
        label="Fig. 1.1"
        caption={
          <>
            The two licensed bands on one axis. Each is 25 MHz wide and holds many 1.25 MHz
            carriers — the shaded block is the allocation, not a channel. Drag the marker; the
            dashed tie-line shows its duplex pair 45 MHz away.
          </>
        }
      >
        <PlotFrame width={W} height={H} label="IS-95 forward and reverse band allocation">
          {/* --- forward band --- */}
          <rect
            x={xOf(FORWARD_BAND.lowMHz)}
            y={fwdY}
            width={xOf(FORWARD_BAND.highMHz) - xOf(FORWARD_BAND.lowMHz)}
            height={bandH}
            fill={BRICK}
            opacity={0.1}
            stroke={BRICK}
            strokeWidth={1}
          />
          <text x={xOf(FORWARD_BAND.lowMHz) + 6} y={fwdY + 15} fontSize={9} fontFamily="monospace" fill={BRICK}>
            FORWARD LINK · {FORWARD_BAND.short}
          </text>
          <text x={xOf(FORWARD_BAND.lowMHz) + 6} y={fwdY + 28} fontSize={8.5} fontFamily="monospace" fill={INK}>
            {FORWARD_BAND.lowMHz}–{FORWARD_BAND.highMHz} MHz · {RF.bandSpanMHz} MHz
          </text>
          {/* tick marks at the band edges, so the limits are readable off the axis */}
          {[FORWARD_BAND.lowMHz, FORWARD_BAND.highMHz].map((f) => (
            <g key={`fwd-${f}`}>
              <line x1={xOf(f)} y1={fwdY} x2={xOf(f)} y2={axisY} stroke={BRICK} strokeWidth={0.5} strokeDasharray="2 3" />
              <text x={xOf(f)} y={fwdY - 5} fontSize={8} fontFamily="monospace" fill={BRICK} textAnchor="middle">
                {f}
              </text>
            </g>
          ))}

          {/* --- reverse band --- */}
          <rect
            x={xOf(REVERSE_BAND.lowMHz)}
            y={revY}
            width={xOf(REVERSE_BAND.highMHz) - xOf(REVERSE_BAND.lowMHz)}
            height={bandH}
            fill={OLIVE}
            opacity={0.14}
            stroke={OLIVE}
            strokeWidth={1}
          />
          <text x={xOf(REVERSE_BAND.lowMHz) + 6} y={revY + 15} fontSize={9} fontFamily="monospace" fill={OLIVE}>
            REVERSE LINK · {REVERSE_BAND.short}
          </text>
          <text x={xOf(REVERSE_BAND.lowMHz) + 6} y={revY + 28} fontSize={8.5} fontFamily="monospace" fill={INK}>
            {REVERSE_BAND.lowMHz}–{REVERSE_BAND.highMHz} MHz · {RF.bandSpanMHz} MHz
          </text>
          {[REVERSE_BAND.lowMHz, REVERSE_BAND.highMHz].map((f) => (
            <g key={`rev-${f}`}>
              <line x1={xOf(f)} y1={revY + bandH} x2={xOf(f)} y2={axisY} stroke={OLIVE} strokeWidth={0.5} strokeDasharray="2 3" />
              <text x={xOf(f)} y={revY - 5} fontSize={8} fontFamily="monospace" fill={OLIVE} textAnchor="middle">
                {f}
              </text>
            </g>
          ))}

          {/* --- 45 MHz duplex separation, measured between the band edges --- */}
          <g>
            <line
              x1={xOf(REVERSE_BAND.lowMHz)}
              y1={revY + bandH + 12}
              x2={xOf(FORWARD_BAND.lowMHz)}
              y2={revY + bandH + 12}
              stroke={INK}
              strokeWidth={0.8}
            />
            <line x1={xOf(REVERSE_BAND.lowMHz)} y1={revY + bandH + 8} x2={xOf(REVERSE_BAND.lowMHz)} y2={revY + bandH + 16} stroke={INK} strokeWidth={0.8} />
            <line x1={xOf(FORWARD_BAND.lowMHz)} y1={revY + bandH + 8} x2={xOf(FORWARD_BAND.lowMHz)} y2={revY + bandH + 16} stroke={INK} strokeWidth={0.8} />
            <rect
              x={(xOf(REVERSE_BAND.lowMHz) + xOf(FORWARD_BAND.lowMHz)) / 2 - 36}
              y={revY + bandH + 5}
              width={72}
              height={14}
              fill={PAPER}
            />
            <text
              x={(xOf(REVERSE_BAND.lowMHz) + xOf(FORWARD_BAND.lowMHz)) / 2}
              y={revY + bandH + 15.5}
              fontSize={8.5}
              fontFamily="monospace"
              fill={INK}
              textAnchor="middle"
            >
              {RF.duplexSeparationMHz} MHz duplex
            </text>
          </g>

          {/* --- marker and its duplex pair --- */}
          <line x1={xOf(marker)} y1={34} x2={xOf(marker)} y2={axisY} stroke={BRICK} strokeWidth={1.6} />
          <circle cx={xOf(marker)} cy={34} r={3} fill={BRICK} />
          <text
            x={xOf(marker)}
            y={28}
            fontSize={9}
            fontFamily="monospace"
            fill={BRICK}
            textAnchor={marker > 880 ? 'end' : 'start'}
            dx={marker > 880 ? -5 : 5}
          >
            {marker.toFixed(2)} MHz
          </text>

          {pair !== null ? (
            <>
              <line
                x1={xOf(marker)}
                y1={band?.id === 'reverse' ? revY + bandH / 2 : fwdY + bandH / 2}
                x2={xOf(pair)}
                y2={band?.id === 'reverse' ? fwdY + bandH / 2 : revY + bandH / 2}
                stroke={INK}
                strokeWidth={0.9}
                strokeDasharray="3 3"
              />
              <circle
                cx={xOf(pair)}
                cy={band?.id === 'reverse' ? fwdY + bandH / 2 : revY + bandH / 2}
                r={3.2}
                fill="none"
                stroke={INK}
                strokeWidth={1.2}
              />
              <text
                x={xOf(pair)}
                y={(band?.id === 'reverse' ? fwdY + bandH / 2 : revY + bandH / 2) - 7}
                fontSize={8}
                fontFamily="monospace"
                fill={INK}
                textAnchor="middle"
              >
                pair {pair.toFixed(2)}
              </text>
            </>
          ) : null}

          {/* --- frequency axis --- */}
          <line x1={padL} y1={axisY} x2={W - padR} y2={axisY} stroke={INK} strokeWidth={1} />
          {minorTicks.map((f) => (
            <line key={`m-${f}`} x1={xOf(f)} y1={axisY} x2={xOf(f)} y2={axisY + 3} stroke={GREY} strokeWidth={0.7} />
          ))}
          {ticks.map((f) => (
            <g key={f}>
              <line x1={xOf(f)} y1={axisY} x2={xOf(f)} y2={axisY + 6} stroke={INK} strokeWidth={0.9} />
              <text x={xOf(f)} y={axisY + 18} fontSize={8.5} fontFamily="monospace" fill={INK} textAnchor="middle">
                {f}
              </text>
            </g>
          ))}
          <text x={W - padR} y={axisY + 31} fontSize={8} fontFamily="monospace" fill={GREY} textAnchor="end">
            frequency / MHz →
          </text>
        </PlotFrame>
      </Figure>

      <Readouts
        items={[
          {
            label: 'Marker',
            value: marker.toFixed(2),
            unit: 'MHz',
            emphasis: true,
          },
          {
            label: 'Inside a band?',
            value: band ? band.label : 'No',
            note: band ? band.direction : `Between ${REVERSE_BAND.highMHz} and ${FORWARD_BAND.lowMHz} MHz — not allocated to either link`,
          },
          {
            label: 'Duplex pair',
            value: pair !== null ? pair.toFixed(2) : '—',
            unit: pair !== null ? 'MHz' : undefined,
            note:
              pair !== null
                ? `${band?.id === 'reverse' ? '+' : '−'}${RF.duplexSeparationMHz} MHz`
                : 'Only defined for a frequency inside a band',
          },
          {
            label: 'Offset from band edge',
            value: band ? (marker - band.lowMHz).toFixed(2) : '—',
            unit: band ? 'MHz' : undefined,
            note: band ? `of ${RF.bandSpanMHz} MHz available` : undefined,
          },
        ]}
      />

      {/* ---------------- one nominal channel, to scale ---------------- */}

      <ChannelZoom centre={marker} inBand={band !== null} />

      <Readouts
        items={[
          {
            label: 'Nominal channel bandwidth',
            value: RF.nominalChannelBandwidthMHz,
            unit: 'MHz',
            note: 'One carrier, one direction',
          },
          {
            label: 'Band span',
            value: RF.bandSpanMHz,
            unit: 'MHz',
            note: 'Per link, per operator allocation',
          },
          {
            label: 'Nominal carriers per band',
            value: nominalCarriers,
            note: `${RF.bandSpanMHz} ÷ ${RF.nominalChannelBandwidthMHz} — simple arithmetic, before guard bands or real-world channel plans`,
            emphasis: true,
          },
          {
            label: 'Chip rate',
            value: '1.2288',
            unit: 'Mchip/s',
            note: 'A rate inside the channel, not a width',
          },
        ]}
      />

      <Why>
        Students routinely collapse three different quantities into one: the 25 MHz{' '}
        <Term k="licensed band">licensed band</Term>, the 1.25 MHz{' '}
        <Term k="bandwidth">nominal channel bandwidth</Term>, and the 1.2288 Mchip/s{' '}
        <Term k="chip rate">chip rate</Term>. The first is spectrum an operator owns, the second is
        how much of it one carrier occupies, and the third is a rate measured in chips per second —
        it is not a bandwidth at all.
      </Why>

      <Disclosure id="spectrum-shape" />
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * The 1.25 MHz channel, drawn to scale inside a 5 MHz window.
 * ------------------------------------------------------------------ */

function ChannelZoom({ centre, inBand }: { centre: number; inBand: boolean }) {
  const span = 5; // MHz of context either side
  const W = 760;
  const H = 150;
  const padL = 18;
  const padR = 18;
  const plotW = W - padL - padR;
  const lo = centre - span / 2;
  const hi = centre + span / 2;
  const xOf = (mhz: number) => padL + ((mhz - lo) / (hi - lo)) * plotW;
  const axisY = 118;
  const bw = RF.nominalChannelBandwidthMHz;

  // Neighbouring nominal channels at 1.25 MHz spacing, for context.
  const neighbours = [-2, -1, 1, 2].map((k) => centre + k * bw);

  // A schematic raised-cosine-ish envelope. Explicitly labelled schematic: the
  // deck marks its own spectrum figures the same way, and no PSD is measured here.
  const envelope = (() => {
    const pts: string[] = [];
    const steps = 60;
    for (let i = 0; i <= steps; i += 1) {
      const t = i / steps; // 0..1 across the channel
      const f = centre - bw / 2 + t * bw;
      // flat top with rolled edges
      const roll = 0.12;
      let a = 1;
      if (t < roll) a = 0.5 * (1 - Math.cos((Math.PI * t) / roll));
      else if (t > 1 - roll) a = 0.5 * (1 - Math.cos((Math.PI * (1 - t)) / roll));
      pts.push(`${xOf(f)},${axisY - a * 56}`);
    }
    return `M ${xOf(centre - bw / 2)},${axisY} L ${pts.join(' L ')} L ${xOf(centre + bw / 2)},${axisY} Z`;
  })();

  const ticks: number[] = [];
  for (let f = Math.ceil(lo * 2) / 2; f <= hi; f += 0.5) ticks.push(Number(f.toFixed(2)));

  return (
    <Figure
      label="Fig. 1.2"
      caption={
        <>
          One nominal {bw} MHz channel centred on the marker, drawn to scale in a {span} MHz window,
          with adjacent nominal channel positions in grey. The envelope shape is schematic — no
          power spectral density is measured or simulated. Every user on this carrier occupies all
          of it, all of the time.
        </>
      }
    >
      <PlotFrame width={W} height={H} label={`A ${bw} MHz CDMA channel centred on ${centre.toFixed(2)} MHz`}>
        {/* neighbouring channels */}
        {neighbours.map((c) => (
          <rect
            key={c}
            x={xOf(c - bw / 2)}
            y={axisY - 56}
            width={xOf(c + bw / 2) - xOf(c - bw / 2)}
            height={56}
            fill={GREY}
            opacity={0.14}
            stroke={GREY}
            strokeWidth={0.6}
            strokeDasharray="2 2"
          />
        ))}

        {/* the channel under study */}
        <path d={envelope} fill={inBand ? BRICK : GREY} opacity={0.18} />
        <path d={envelope} fill="none" stroke={inBand ? BRICK : GREY} strokeWidth={1.4} />

        {/* bandwidth measure */}
        <line x1={xOf(centre - bw / 2)} y1={axisY - 68} x2={xOf(centre + bw / 2)} y2={axisY - 68} stroke={INK} strokeWidth={0.9} />
        <line x1={xOf(centre - bw / 2)} y1={axisY - 72} x2={xOf(centre - bw / 2)} y2={axisY - 64} stroke={INK} strokeWidth={0.9} />
        <line x1={xOf(centre + bw / 2)} y1={axisY - 72} x2={xOf(centre + bw / 2)} y2={axisY - 64} stroke={INK} strokeWidth={0.9} />
        <text x={xOf(centre)} y={axisY - 74} fontSize={9} fontFamily="monospace" fill={INK} textAnchor="middle">
          {bw} MHz nominal
        </text>

        {/* centre frequency */}
        <line x1={xOf(centre)} y1={axisY - 56} x2={xOf(centre)} y2={axisY + 6} stroke={INK} strokeWidth={0.8} strokeDasharray="2 2" />
        <text x={xOf(centre)} y={axisY - 30} fontSize={8.5} fontFamily="monospace" fill={INK} textAnchor="middle">
          fc
        </text>

        <text x={padL + 4} y={axisY - 48} fontSize={8} fontFamily="monospace" fill={GREY}>
          PSD (schematic)
        </text>

        {/* axis */}
        <line x1={padL} y1={axisY} x2={W - padR} y2={axisY} stroke={INK} strokeWidth={1} />
        {ticks.map((f) => (
          <g key={f}>
            <line x1={xOf(f)} y1={axisY} x2={xOf(f)} y2={axisY + 5} stroke={INK} strokeWidth={0.8} />
            <text x={xOf(f)} y={axisY + 17} fontSize={8} fontFamily="monospace" fill={INK} textAnchor="middle">
              {f.toFixed(2)}
            </text>
          </g>
        ))}
        <text x={W - padR} y={axisY + 29} fontSize={8} fontFamily="monospace" fill={GREY} textAnchor="end">
          frequency / MHz →
        </text>
      </PlotFrame>
    </Figure>
  );
}
