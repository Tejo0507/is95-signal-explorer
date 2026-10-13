/**
 * storage.ts — the one piece of browser state this site keeps.
 *
 * Only whether the first-run guide has been dismissed. Every access is wrapped
 * in try/catch: a private-mode browser, blocked site data or a sandboxed iframe
 * can make localStorage throw on read as well as write, and the guide showing
 * once more is a far better failure than a blank page.
 */

const WALKTHROUGH_KEY = 'is95-explorer:walkthrough-seen';

export function walkthroughSeen(): boolean {
  try {
    return window.localStorage.getItem(WALKTHROUGH_KEY) === '1';
  } catch {
    return false;
  }
}

export function markWalkthroughSeen(): void {
  try {
    window.localStorage.setItem(WALKTHROUGH_KEY, '1');
  } catch {
    // Storage unavailable — the guide simply shows again next visit.
  }
}
