/**
 * theme.ts, the colour constants and the site-wide legend.
 *
 * These live apart from the components that use them so every component file
 * exports components only, which is what React Fast Refresh needs in order to
 * hot-reload a module instead of reloading the page.
 *
 * The hex values duplicate the CSS custom properties in styles/globals.css
 * because SVG attributes such as `fill` and `stroke` cannot read a CSS
 * variable in every browser path this site needs to work in (notably when an
 * SVG is rasterised). CSS is the source of truth for the page chrome; these
 * five are the source of truth for plot geometry.
 */

export const PLOT_COLOURS = {
  INK: '#22221f',
  BRICK: '#b74432',
  OLIVE: '#71806a',
  GREY: '#b8b0a2',
  PAPER: '#faf8f3',
} as const;

export interface LegendEntry {
  colour: string;
  label: string;
  /** Draw the swatch as a filled box rather than a rule. */
  box?: boolean;
}

/** The convention used by most figures on the site. */
export const SIGNAL_LEGEND: LegendEntry[] = [
  { colour: 'var(--brick)', label: 'Signal under study / +1' },
  { colour: 'var(--olive)', label: 'Secondary signal / −1' },
  { colour: 'var(--charcoal)', label: 'Axes, structure, correlator output' },
  { colour: 'var(--warm-grey)', label: 'Reference / inactive' },
];
