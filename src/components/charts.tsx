/**
 * charts.tsx, the technical plots.
 *
 * All of these take real computed arrays from src/lib and draw them to scale.
 * Nothing here invents a shape: a waveform is the samples it was given, and a
 * stem plot's heights are the correlation values. Axes always carry units.
 *
 * SVG is used throughout rather than Canvas because every plot on this site is
 * a few hundred line segments at most, and SVG keeps the labels selectable,
 * the output crisp at any zoom, and the markup inspectable by a student
 * reading the page source.
 */

import type { ReactNode } from 'react';
import { PLOT_COLOURS } from './theme';

const { INK, BRICK, OLIVE, GREY } = PLOT_COLOURS;

/* ------------------------------------------------------------------ *
 * Step waveform, a chip or bit stream held at each sample.
 * ------------------------------------------------------------------ */

export function Waveform({
  samples,
  samplesPerBit,
  height = 68,
  colour = BRICK,
  yMax,
  label,
  xUnit = 'chip',
  showBitBoundaries = true,
  highlightIndex,
}: {
  samples: number[];
  samplesPerBit?: number;
  height?: number;
  colour?: string;
  /** Vertical full-scale. Defaults to the largest magnitude present (min 1). */
  yMax?: number;
  label?: string;
  xUnit?: string;
  showBitBoundaries?: boolean;
  /** Draw a marker at this sample index. */
  highlightIndex?: number;
}) {
  const n = samples.length;
  if (n === 0) return null;

  const padL = 30;
  const padR = 8;
  const padT = 10;
  const padB = 18;
  const plotW = 620;
  const w = padL + plotW + padR;
  const h = padT + height + padB;

  const peak = yMax ?? Math.max(1, ...samples.map((s) => Math.abs(s)));
  const dx = plotW / n;
  const mid = padT + height / 2;
  const yOf = (v: number) => mid - (v / peak) * (height / 2);

  // Step path: horizontal run across each sample, vertical jump between.
  let path = '';
  for (let i = 0; i < n; i += 1) {
    const x0 = padL + i * dx;
    const x1 = padL + (i + 1) * dx;
    const y = yOf(samples[i]);
    path += i === 0 ? `M ${x0} ${y}` : ` L ${x0} ${y}`;
    path += ` L ${x1} ${y}`;
  }

  const boundaries: number[] = [];
  if (showBitBoundaries && samplesPerBit && samplesPerBit < n) {
    for (let i = samplesPerBit; i < n; i += samplesPerBit) boundaries.push(i);
  }

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      style={{ width: '100%', height: 'auto' }}
      role="img"
      aria-label={label ? `${label} waveform` : 'waveform'}
    >
      {/* bit-interval shading, so Tb is visible against Tc */}
      {samplesPerBit && samplesPerBit < n
        ? Array.from({ length: Math.ceil(n / samplesPerBit) }, (_, b) =>
            b % 2 === 1 ? (
              <rect
                key={`band-${b}`}
                x={padL + b * samplesPerBit * dx}
                y={padT}
                width={Math.min(samplesPerBit * dx, plotW - b * samplesPerBit * dx)}
                height={height}
                fill={INK}
                opacity={0.035}
              />
            ) : null,
          )
        : null}

      {/* zero line */}
      <line x1={padL} y1={mid} x2={padL + plotW} y2={mid} stroke={INK} strokeWidth={0.6} />

      {/* bit boundaries */}
      {boundaries.map((i) => (
        <line
          key={`b-${i}`}
          x1={padL + i * dx}
          y1={padT}
          x2={padL + i * dx}
          y2={padT + height}
          stroke={GREY}
          strokeWidth={0.6}
          strokeDasharray="2 2"
        />
      ))}

      {/* y axis */}
      <line x1={padL} y1={padT} x2={padL} y2={padT + height} stroke={INK} strokeWidth={0.8} />
      <text x={padL - 4} y={yOf(peak) + 3.5} textAnchor="end" fontSize={8} fontFamily="'Source Sans 3', sans-serif" fill={INK}>
        {peak === 1 ? '+1' : `+${peak}`}
      </text>
      <text x={padL - 4} y={mid + 3.5} textAnchor="end" fontSize={8} fontFamily="'Source Sans 3', sans-serif" fill={GREY}>
        0
      </text>
      <text x={padL - 4} y={yOf(-peak) + 3.5} textAnchor="end" fontSize={8} fontFamily="'Source Sans 3', sans-serif" fill={INK}>
        {peak === 1 ? '−1' : `−${peak}`}
      </text>

      {/* the waveform itself */}
      <path d={path} fill="none" stroke={colour} strokeWidth={1.6} strokeLinejoin="miter" />

      {/* sample marker */}
      {highlightIndex !== undefined && highlightIndex >= 0 && highlightIndex < n ? (
        <>
          <line
            x1={padL + (highlightIndex + 0.5) * dx}
            y1={padT}
            x2={padL + (highlightIndex + 0.5) * dx}
            y2={padT + height}
            stroke={INK}
            strokeWidth={0.9}
          />
          <circle
            cx={padL + (highlightIndex + 0.5) * dx}
            cy={yOf(samples[highlightIndex])}
            r={2.6}
            fill={INK}
          />
        </>
      ) : null}

      {/* x axis label */}
      <text x={padL + plotW} y={h - 5} textAnchor="end" fontSize={8} fontFamily="'Source Sans 3', sans-serif" fill={GREY}>
        {n} {xUnit}
        {n === 1 ? '' : 's'} →
      </text>
      {samplesPerBit && samplesPerBit < n ? (
        <text x={padL} y={h - 5} fontSize={8} fontFamily="'Source Sans 3', sans-serif" fill={GREY}>
          Tb = {samplesPerBit} Tc
        </text>
      ) : null}
    </svg>
  );
}

/* ------------------------------------------------------------------ *
 * Stem plot, correlation against shift, or against code index.
 * ------------------------------------------------------------------ */

export function StemPlot({
  values,
  height = 110,
  xLabel,
  yLabel,
  colour = INK,
  highlightIndex,
  onPick,
  thresholdLabel,
}: {
  values: number[];
  height?: number;
  xLabel: string;
  yLabel: string;
  colour?: string;
  highlightIndex?: number;
  /** Makes the plot interactive, click a stem to select that shift/index. */
  onPick?: (index: number) => void;
  /** Annotation drawn at the peak, e.g. "peak = 63". */
  thresholdLabel?: string;
}) {
  const n = values.length;
  if (n === 0) return null;

  const padL = 40;
  const padR = 12;
  const padT = 14;
  const padB = 26;
  const plotW = 620;
  const w = padL + plotW + padR;
  const h = padT + height + padB;

  const peak = Math.max(1, ...values.map((v) => Math.abs(v)));
  const dx = plotW / n;
  const mid = padT + height / 2;
  const yOf = (v: number) => mid - (v / peak) * (height / 2 - 4);

  const maxIndex = values.indexOf(Math.max(...values));

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      style={{ width: '100%', height: 'auto' }}
      role="img"
      aria-label={`${yLabel} against ${xLabel}`}
    >
      {/* zero line */}
      <line x1={padL} y1={mid} x2={padL + plotW} y2={mid} stroke={INK} strokeWidth={0.6} />
      {/* y axis */}
      <line x1={padL} y1={padT} x2={padL} y2={padT + height} stroke={INK} strokeWidth={0.8} />

      <text x={padL - 5} y={yOf(peak) + 3.5} textAnchor="end" fontSize={8} fontFamily="'Source Sans 3', sans-serif" fill={INK}>
        +{peak}
      </text>
      <text x={padL - 5} y={mid + 3.5} textAnchor="end" fontSize={8} fontFamily="'Source Sans 3', sans-serif" fill={GREY}>
        0
      </text>
      <text x={padL - 5} y={yOf(-peak) + 3.5} textAnchor="end" fontSize={8} fontFamily="'Source Sans 3', sans-serif" fill={INK}>
        −{peak}
      </text>

      {values.map((v, i) => {
        const x = padL + (i + 0.5) * dx;
        const isHi = highlightIndex === i;
        const stroke = isHi ? BRICK : v === 0 ? GREY : colour;
        return (
          <g key={i}>
            <line x1={x} y1={mid} x2={x} y2={yOf(v)} stroke={stroke} strokeWidth={isHi ? 2 : Math.min(2, Math.max(0.7, dx * 0.4))} />
            {Math.abs(v) > 0 ? <circle cx={x} cy={yOf(v)} r={isHi ? 2.4 : Math.min(2, dx * 0.3)} fill={stroke} /> : null}
            {onPick ? (
              <rect
                x={padL + i * dx}
                y={padT}
                width={dx}
                height={height}
                fill="transparent"
                style={{ cursor: 'pointer' }}
                onClick={() => onPick(i)}
              >
                <title>{`${xLabel} ${i}: ${v}`}</title>
              </rect>
            ) : null}
          </g>
        );
      })}

      {thresholdLabel ? (
        <text
          x={padL + (maxIndex + 0.5) * dx + 6}
          y={yOf(values[maxIndex]) + 3}
          fontSize={8}
          fontFamily="'Source Sans 3', sans-serif"
          fill={BRICK}
        >
          {thresholdLabel}
        </text>
      ) : null}

      <text x={padL} y={h - 6} fontSize={8} fontFamily="'Source Sans 3', sans-serif" fill={GREY}>
        {xLabel} 0
      </text>
      <text x={padL + plotW} y={h - 6} textAnchor="end" fontSize={8} fontFamily="'Source Sans 3', sans-serif" fill={GREY}>
        {n - 1} →
      </text>
      <text
        x={10}
        y={mid}
        fontSize={8}
        fontFamily="'Source Sans 3', sans-serif"
        fill={GREY}
        transform={`rotate(-90 10 ${mid})`}
        textAnchor="middle"
      >
        {yLabel}
      </text>
    </svg>
  );
}

/* ------------------------------------------------------------------ *
 * Chip-by-chip comparison strip, rows of ±1 aligned in a grid.
 * ------------------------------------------------------------------ */

export interface ChipRow {
  label: string;
  values: number[];
  /** Render as a running sum instead of ±: used for the correlator row. */
  numeric?: boolean;
}

export function ChipStrip({ rows, maxChips = 64 }: { rows: ChipRow[]; maxChips?: number }) {
  const n = Math.min(maxChips, Math.max(...rows.map((r) => r.values.length)));
  const template = `minmax(4.5rem, auto) repeat(${n}, minmax(0.85rem, 1fr))`;

  return (
    <div className="chipstrip scroll-x" style={{ minWidth: `${n * 0.95 + 5}rem` }}>
      {rows.map((row) => (
        <div className="chipstrip__row" key={row.label} style={{ gridTemplateColumns: template }}>
          <span className="chipstrip__label">{row.label}</span>
          {Array.from({ length: n }, (_, i) => {
            const v = row.values[i];
            if (row.numeric) {
              return (
                <span className="chipstrip__cell chipstrip__cell--sum" key={i}>
                  {v}
                </span>
              );
            }
            return (
              <span className="chipstrip__cell" data-v={v === 1 ? '1' : v === -1 ? '-1' : '0'} key={i}>
                {v === 1 ? '+' : v === -1 ? '−' : '0'}
              </span>
            );
          })}
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * A compact orthogonality strip: one Walsh row correlated against all
 * 64 others. Every bar except the self-correlation should be flat zero.
 * ------------------------------------------------------------------ */

export function OrthogonalityStrip({
  values,
  selfIndex,
  onPick,
}: {
  values: number[];
  selfIndex: number;
  onPick?: (i: number) => void;
}) {
  const n = values.length;
  const padL = 26;
  const padT = 10;
  const padB = 20;
  const height = 72;
  const plotW = 620;
  const w = padL + plotW + 10;
  const h = padT + height + padB;
  const peak = Math.max(1, ...values.map((v) => Math.abs(v)));
  const dx = plotW / n;
  const base = padT + height;
  const yOf = (v: number) => base - (Math.abs(v) / peak) * height;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', height: 'auto' }} role="img"
      aria-label={`Inner product of W${selfIndex} against all ${n} Walsh functions`}>
      <line x1={padL} y1={base} x2={padL + plotW} y2={base} stroke={INK} strokeWidth={0.8} />
      <line x1={padL} y1={padT} x2={padL} y2={base} stroke={INK} strokeWidth={0.8} />
      <text x={padL - 4} y={padT + 4} textAnchor="end" fontSize={8} fontFamily="'Source Sans 3', sans-serif" fill={INK}>
        {peak}
      </text>
      <text x={padL - 4} y={base + 3} textAnchor="end" fontSize={8} fontFamily="'Source Sans 3', sans-serif" fill={GREY}>
        0
      </text>

      {values.map((v, i) => {
        const isSelf = i === selfIndex;
        const x = padL + i * dx;
        const barH = base - yOf(v);
        return (
          <g key={i}>
            {/* A zero result draws a visible tick on the axis so "nothing here"
                is distinguishable from "not plotted". */}
            {v === 0 ? (
              <line x1={x + dx / 2} y1={base} x2={x + dx / 2} y2={base - 1.5} stroke={OLIVE} strokeWidth={Math.max(0.6, dx * 0.5)} />
            ) : (
              <rect x={x + dx * 0.15} y={yOf(v)} width={dx * 0.7} height={barH} fill={isSelf ? BRICK : INK} />
            )}
            {onPick ? (
              <rect x={x} y={padT} width={dx} height={height} fill="transparent" style={{ cursor: 'pointer' }} onClick={() => onPick(i)}>
                <title>{`W${i} · inner product ${v}`}</title>
              </rect>
            ) : null}
          </g>
        );
      })}

      <text x={padL} y={h - 5} fontSize={8} fontFamily="'Source Sans 3', sans-serif" fill={GREY}>
        W0
      </text>
      <text x={padL + plotW} y={h - 5} textAnchor="end" fontSize={8} fontFamily="'Source Sans 3', sans-serif" fill={GREY}>
        W{n - 1} · |inner product| →
      </text>
    </svg>
  );
}

/* ------------------------------------------------------------------ *
 * Shared axis helper used by the spectrum plot.
 * ------------------------------------------------------------------ */

export function PlotFrame({
  width,
  height,
  children,
  label,
}: {
  width: number;
  height: number;
  children: ReactNode;
  label: string;
}) {
  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      style={{ width: '100%', height: 'auto' }}
      role="img"
      aria-label={label}
    >
      {children}
    </svg>
  );
}
