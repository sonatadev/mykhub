import type { MathfieldElement } from 'mathlive';

/**
 * MathLive lives behind a lazy import: it is a big bundle and only matters
 * once someone actually edits a formula, so neither the first paint of the
 * app nor the read-only share pages should pay for it.
 */

let loader: Promise<typeof MathfieldElement> | null = null;

export function loadMathfield() {
  if (!loader) {
    loader = Promise.all([import('mathlive'), import('mathlive/fonts.css')]).then(([mathlive]) => {
      const El = mathlive.MathfieldElement;
      // The fonts are the KaTeX ones the app already ships, pulled in by the
      // stylesheet above; null stops MathLive fetching a second copy from a
      // path that does not exist in this build.
      El.fontsDirectory = null;
      El.soundsDirectory = null;
      return El;
    });
  }
  return loader;
}

/** True when `el` is a MathLive field, without importing MathLive to ask. */
export function isMathfield(el: Element | null): el is MathfieldElement {
  return !!el && el.tagName === 'MATH-FIELD';
}

/** The formula being edited right now, if the caret sits in one. */
export function activeMathfield(): MathfieldElement | null {
  return isMathfield(document.activeElement) ? document.activeElement : null;
}

/**
 * Inserts LaTeX at the caret. Empty groups written for the plain-text editor
 * (`\frac{}{}`) become MathLive placeholders, so the caret lands in the first
 * hole and Tab walks to the next one.
 */
export function insertLatex(field: MathfieldElement, latex: string) {
  field.focus();
  field.insert(latex.replace(/\{\}/g, '{#?}'), {
    focus: true,
    feedback: false,
    selectionMode: 'placeholder',
  });
}

/**
 * While a helper UI (the command palette) is open, focus legitimately sits
 * outside the formula. Holding keeps the field from treating that as "done".
 */
let holds = 0;

export function holdMathfield() {
  holds += 1;
  let released = false;
  return () => {
    if (released) return;
    released = true;
    holds -= 1;
  };
}

export function mathfieldHeld() {
  return holds > 0;
}
