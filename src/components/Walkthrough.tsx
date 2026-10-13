/**
 * Walkthrough.tsx — first-run guided tour.
 *
 * Shown automatically on a first visit (lib/storage.ts holds the remembered
 * flag), and re-openable at any time from the masthead. It explains the five
 * modules, the colour convention and the one claim the site is careful not to
 * make.
 */

import { useEffect } from 'react';

const STEPS: { num: string; text: string }[] = [
  {
    num: '01',
    text:
      'RF & SPREADING — where IS-95 sits on the spectrum, and what the 128 ratio does and does not mean. Drag the frequency marker; step the spreading animation through a full spread-and-recover cycle.',
  },
  {
    num: '02',
    text:
      'LOGICAL CHANNELS — the four forward channel types across 64 Walsh codes, and the two reverse channels. Switch direction to see why Walsh functions do a different job in each.',
  },
  {
    num: '03',
    text:
      'CODE EXPLORER — real order-64 Walsh functions, genuine m-sequences, and a masked long-code generator. The misalignment sliders are the point: orthogonality is a property of aligned codes.',
  },
  {
    num: '04',
    text:
      'PHYSICAL ALLOCATION — both processing chains, block by block. They have different shapes on purpose. Click any block for its input, operation, output and rate.',
  },
  {
    num: '05',
    text:
      'TRACE A SIGNAL — pick a channel and follow one signal through all seven stages, then compare what changes between the links against what they share.',
  },
];

export function Walkthrough({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="walkthrough"
      role="dialog"
      aria-modal="true"
      aria-labelledby="walkthrough-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="walkthrough__card">
        <p className="eyebrow eyebrow--brick">First time here</p>
        <h2 id="walkthrough-title">Five modules, one system</h2>
        <p className="small">
          This is an interactive laboratory, not a set of notes. Every slider, button and diagram
          does something, and every number is computed from the specifications in the course
          reference rather than hard-coded into the page.
        </p>

        <ol className="walkthrough__steps">
          {STEPS.map((s) => (
            <li key={s.num}>
              <b>{s.num}</b>
              <span>{s.text}</span>
            </li>
          ))}
        </ol>

        <p className="small">
          <strong>Colour convention.</strong> Brick red is the signal under study. Olive is a
          secondary signal, a shared property, or a disclosed simplification. Charcoal is
          structure: axes, correlator output, block diagrams. Dashed olive boxes are always a
          disclosure — a place where this site simplifies something and says so.
        </p>
        <p className="small">
          <strong>One claim this site does not make.</strong> It is not a standard-compliant IS-95
          modem. It implements the code mathematics exactly and models the rest as labelled block
          diagrams. Where the course reference does not supply a value — the PN and long-code
          polynomials, for instance — nothing is invented to fill the gap.
        </p>

        <div className="walkthrough__foot">
          <button type="button" className="btn btn--primary" onClick={onClose}>
            Start exploring
          </button>
          <span className="muted small">You can reopen this from “Guide” in the header.</span>
        </div>
      </div>
    </div>
  );
}
