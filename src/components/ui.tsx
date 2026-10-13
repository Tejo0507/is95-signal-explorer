/**
 * ui.tsx — small presentational primitives shared by every module.
 *
 * None of these compute anything. All signal processing lives in src/lib so it
 * can be read, tested and reused without touching React.
 */

import { useEffect, useId, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { DISCLOSURES, type DisclosureItem } from '../lib/spec';
import { lookupTerm } from '../lib/glossary';
import type { LegendEntry } from './theme';

/* ------------------------------------------------------------------ *
 * Section heading with a running number, like a journal subsection.
 * ------------------------------------------------------------------ */

export function SectionHead({
  num,
  title,
  aside,
}: {
  num: string;
  title: string;
  aside?: ReactNode;
}) {
  return (
    <div className="section__head">
      <p className="eyebrow eyebrow--brick">{num}</p>
      <h2>{title}</h2>
      <span className="section__head-spacer" />
      {aside ? <p className="eyebrow">{aside}</p> : null}
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Glossary tooltip. Opens on hover and on focus, closes on Escape, and
 * is a real <button> so it is reachable by keyboard.
 * ------------------------------------------------------------------ */

export function Term({ k, children }: { k: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const entry = lookupTerm(k);
  const id = useId();

  if (!entry) return <>{children}</>;

  return (
    <button
      type="button"
      className="term"
      aria-describedby={open ? id : undefined}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
      onClick={(e) => {
        e.preventDefault();
        setOpen((v) => !v);
      }}
      onKeyDown={(e) => {
        if (e.key === 'Escape') setOpen(false);
      }}
    >
      {children}
      {open ? (
        <span className="term__pop" id={id} role="tooltip">
          <strong>{entry.term}</strong>
          {entry.definition}
        </span>
      ) : null}
    </button>
  );
}

/* ------------------------------------------------------------------ *
 * "Why this matters" — one sentence, never a paragraph.
 * ------------------------------------------------------------------ */

export function Why({ children }: { children: ReactNode }) {
  return (
    <aside className="why">
      <span className="why__label">Why this matters</span>
      <p>{children}</p>
    </aside>
  );
}

/* ------------------------------------------------------------------ *
 * Disclosure of a simplification. Either pass an id from spec.ts or
 * supply the text directly.
 * ------------------------------------------------------------------ */

export function Disclosure({ id, children }: { id?: string; children?: ReactNode }) {
  const item: DisclosureItem | undefined = id ? DISCLOSURES.find((d) => d.id === id) : undefined;
  return (
    <div className="disclosure">
      <span className="disclosure__tag">Simplified</span>
      <p>{children ?? item?.text ?? ''}</p>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Figure with a numbered caption.
 * ------------------------------------------------------------------ */

export function Figure({
  label,
  caption,
  children,
}: {
  label: string;
  caption: ReactNode;
  children: ReactNode;
}) {
  return (
    <figure className="figure">
      <div className="figure__frame">{children}</div>
      <figcaption>
        <b>{label}</b>
        {caption}
      </figcaption>
    </figure>
  );
}

/* ------------------------------------------------------------------ *
 * Panel
 * ------------------------------------------------------------------ */

export function Panel({
  title,
  variant,
  children,
}: {
  title?: string;
  variant?: 'sunk' | 'plain';
  children: ReactNode;
}) {
  const cls = ['panel', variant ? `panel--${variant}` : ''].filter(Boolean).join(' ');
  return (
    <section className={cls}>
      {title ? <h3 className="panel__title">{title}</h3> : null}
      {children}
    </section>
  );
}

/* ------------------------------------------------------------------ *
 * Readout grid — numbers with their units attached.
 * ------------------------------------------------------------------ */

export interface ReadoutItem {
  label: string;
  value: ReactNode;
  unit?: string;
  note?: string;
  emphasis?: boolean;
}

export function Readouts({ items }: { items: ReadoutItem[] }) {
  return (
    <div className="readouts">
      {items.map((item) => (
        <div className="readout" key={item.label}>
          <span className="readout__label">{item.label}</span>
          <span
            className={`readout__value${item.emphasis ? ' readout__value--brick' : ''}`}
          >
            {item.value}
            {item.unit ? <span className="unit">{item.unit}</span> : null}
          </span>
          {item.note ? <span className="readout__note">{item.note}</span> : null}
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Segmented control — used for every forward/reverse switch so the
 * interaction is identical in all five modules.
 * ------------------------------------------------------------------ */

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  brick,
  label,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  brick?: boolean;
  label?: string;
}) {
  return (
    <div className="control">
      {label ? <span className="control__label">{label}</span> : null}
      <div className={`segmented${brick ? ' segmented--brick' : ''}`} role="group" aria-label={label}>
        {options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            aria-pressed={value === opt.value}
            onClick={() => onChange(opt.value)}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Slider with a live value readout, optionally paired with a number box.
 * ------------------------------------------------------------------ */

export function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  unit,
  onChange,
  grow = true,
  format,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onChange: (v: number) => void;
  grow?: boolean;
  format?: (v: number) => string;
}) {
  const id = useId();
  const shown = format ? format(value) : String(value);
  return (
    <div className={`control${grow ? ' control--grow' : ''}`}>
      <label className="control__label" htmlFor={id}>
        {label}
        <span className="control__value">
          {shown}
          {unit ? <span className="unit">{unit}</span> : null}
        </span>
      </label>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  );
}

export function NumberField({
  label,
  value,
  min,
  max,
  step = 1,
  unit,
  onCommit,
  width = '7rem',
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onCommit: (v: number) => void;
  width?: string;
}) {
  const id = useId();
  // Local draft so the user can clear the box and retype without the value
  // snapping back on every keystroke.
  const [draft, setDraft] = useState(String(value));
  const lastExternal = useRef(value);

  useEffect(() => {
    if (lastExternal.current !== value) {
      lastExternal.current = value;
      setDraft(String(value));
    }
  }, [value]);

  const commit = () => {
    const n = Number(draft);
    if (!Number.isFinite(n)) {
      setDraft(String(value));
      return;
    }
    const clamped = Math.min(max, Math.max(min, n));
    lastExternal.current = clamped;
    setDraft(String(clamped));
    onCommit(clamped);
  };

  return (
    <div className="control" style={{ flex: `0 0 ${width}` }}>
      <label className="control__label" htmlFor={id}>
        {label}
        {unit ? <span className="unit">{unit}</span> : null}
      </label>
      <input
        id={id}
        type="number"
        inputMode="decimal"
        min={min}
        max={max}
        step={step}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit();
        }}
      />
    </div>
  );
}

export function SelectField<T extends string | number>({
  label,
  value,
  options,
  onChange,
  width = '11rem',
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  width?: string;
}) {
  const id = useId();
  const isNumeric = typeof value === 'number';
  return (
    <div className="control" style={{ flex: `0 0 ${width}` }}>
      <label className="control__label" htmlFor={id}>
        {label}
      </label>
      <select
        id={id}
        value={String(value)}
        onChange={(e) => onChange((isNumeric ? Number(e.target.value) : e.target.value) as T)}
      >
        {options.map((o) => (
          <option key={String(o.value)} value={String(o.value)}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Reset — every experiment on the site has one.
 * ------------------------------------------------------------------ */

export function ResetButton({ onReset, label = 'Reset' }: { onReset: () => void; label?: string }) {
  return (
    <button type="button" className="btn btn--ghost" onClick={onReset}>
      ↺ {label}
    </button>
  );
}

/* ------------------------------------------------------------------ *
 * Legend for signal and code colours.
 * ------------------------------------------------------------------ */

export function Legend({ entries }: { entries: LegendEntry[] }) {
  return (
    <div className="legend">
      {entries.map((e) => (
        <span className="legend__item" key={e.label}>
          <span
            className={`legend__swatch${e.box ? ' legend__swatch--box' : ''}`}
            style={{ background: e.colour }}
            aria-hidden="true"
          />
          {e.label}
        </span>
      ))}
    </div>
  );
}
