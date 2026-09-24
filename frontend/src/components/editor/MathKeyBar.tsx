import { useEffect, useRef, useState } from 'react';
import type { Editor } from '@tiptap/react';
import { isInsideInlineMath } from './extensions/mathContext';

/**
 * A row of LaTeX keys shown above the on-screen keyboard while an inline
 * `$…$` formula is being written. Phone keyboards bury `\`, `$`, `{` and `^`
 * behind a symbol layout, which is the main thing that makes maths notes
 * painful on mobile. Display formulas do not need it: those are edited in a
 * MathLive field, which brings its own maths keyboard.
 */

interface MathKey {
  label: string;
  insert: string;
  /** Characters to step back after inserting, to land inside `{}`. */
  back?: number;
  wide?: boolean;
}

const KEYS: MathKey[] = [
  { label: '\\', insert: '\\' },
  { label: '^', insert: '^{}', back: 1 },
  { label: '_', insert: '_{}', back: 1 },
  { label: '{ }', insert: '{}', back: 1 },
  { label: '( )', insert: '()', back: 1 },
  { label: 'frac', insert: '\\frac{}{}', back: 3, wide: true },
  { label: '√', insert: '\\sqrt{}', back: 1 },
  { label: '∫', insert: '\\int_{}^{}', back: 4 },
  { label: '∑', insert: '\\sum_{}^{}', back: 4 },
  { label: 'lim', insert: '\\lim_{}', back: 1, wide: true },
  { label: '→', insert: '\\to ' },
  { label: '∞', insert: '\\infty ' },
  { label: '∂', insert: '\\partial ' },
  { label: '≤', insert: '\\leq ' },
  { label: '≥', insert: '\\geq ' },
  { label: '≠', insert: '\\neq ' },
  { label: '∈', insert: '\\in ' },
  { label: '⊂', insert: '\\subset ' },
  { label: '∀', insert: '\\forall ' },
  { label: '∃', insert: '\\exists ' },
  { label: '⇒', insert: '\\Rightarrow ' },
  { label: 'ℝ', insert: '\\mathbb{R} ' },
  { label: '·', insert: '\\cdot ' },
  { label: '±', insert: '\\pm ' },
  { label: 'α', insert: '\\alpha ' },
  { label: 'β', insert: '\\beta ' },
  { label: 'γ', insert: '\\gamma ' },
  { label: 'δ', insert: '\\delta ' },
  { label: 'ε', insert: '\\varepsilon ' },
  { label: 'θ', insert: '\\theta ' },
  { label: 'λ', insert: '\\lambda ' },
  { label: 'μ', insert: '\\mu ' },
  { label: 'π', insert: '\\pi ' },
  { label: 'σ', insert: '\\sigma ' },
  { label: 'φ', insert: '\\varphi ' },
  { label: 'ω', insert: '\\omega ' },
];

export default function MathKeyBar({ editor }: { editor: Editor }) {
  const [visible, setVisible] = useState(false);
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Only where there is no physical keyboard to type a backslash on.
    if (!window.matchMedia('(pointer: coarse)').matches) return;

    const update = () => setVisible(editor.isFocused && isInsideInlineMath(editor.state));
    const updateSoon = () => window.setTimeout(update, 0);

    update();
    editor.on('transaction', update);
    editor.on('focus', update);
    editor.on('blur', updateSoon);
    document.addEventListener('focusin', update);
    document.addEventListener('focusout', updateSoon);
    return () => {
      editor.off('transaction', update);
      editor.off('focus', update);
      editor.off('blur', updateSoon);
      document.removeEventListener('focusin', update);
      document.removeEventListener('focusout', updateSoon);
    };
  }, [editor]);

  useEffect(() => {
    const view = window.visualViewport;
    document.body.style.setProperty('--math-keys-h', visible ? '52px' : '0px');
    if (!visible || !view) return;

    // `position: fixed` follows the layout viewport, which the on-screen
    // keyboard does not shrink — the visual viewport is what is really seen.
    const place = () => {
      const bar = barRef.current;
      if (!bar) return;
      // Pinning top *and* bottom on an auto-height element stretches it down
      // behind the keyboard, so the CSS fallback is released first.
      bar.style.bottom = 'auto';
      bar.style.top = `${view.offsetTop + view.height - bar.offsetHeight}px`;
    };
    place();
    view.addEventListener('resize', place);
    view.addEventListener('scroll', place);
    return () => {
      view.removeEventListener('resize', place);
      view.removeEventListener('scroll', place);
    };
  }, [visible]);

  useEffect(() => {
    return () => {
      document.body.style.removeProperty('--math-keys-h');
    };
  }, []);

  if (!visible) return null;

  function press(key: MathKey) {
    const { from } = editor.state.selection;
    editor
      .chain()
      .focus()
      .insertContent(key.insert)
      .setTextSelection(from + key.insert.length - (key.back ?? 0))
      .run();
  }

  return (
    <div ref={barRef} className="math-keys" role="toolbar" aria-label="Simboli matematici">
      {KEYS.map((key) => (
        <button
          key={key.label}
          type="button"
          className={key.wide ? 'math-keys__key math-keys__key--wide' : 'math-keys__key'}
          // Keep the keyboard up and the caret where it is.
          onPointerDown={(e) => e.preventDefault()}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => press(key)}
        >
          {key.label}
        </button>
      ))}
    </div>
  );
}
