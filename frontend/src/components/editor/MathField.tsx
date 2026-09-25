import { useEffect, useRef, useState } from 'react';
import type { MathfieldElement } from 'mathlive';
import { loadMathfield, mathfieldHeld } from '@/lib/mathfield';

/**
 * A GeoGebra-style formula field: you edit the rendered maths itself — a real
 * fraction bar, real bounds on the integral — instead of typing `\frac{}{}`
 * into a box. The value stays LaTeX, so storage, export and the read-only
 * KaTeX renderer are untouched.
 */

interface Props {
  value: string;
  onChange: (latex: string) => void;
  /** Called when the caret leaves the formula; `true` when the user is done. */
  onLeave: (placeCursorAfter: boolean) => void;
  /** Whether to take the focus on mount. A page full of fields must not. */
  autoFocus?: boolean;
}

/** The virtual keyboard lives outside the field, so focus may legitimately
 *  land there without meaning the user has finished the formula. */
function focusIsInVirtualKeyboard() {
  const active = document.activeElement;
  return !!active && !!active.closest?.('.ML__keyboard, [part="virtual-keyboard"]');
}

export default function MathField({ value, onChange, onLeave, autoFocus = true }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [field, setField] = useState<MathfieldElement | null>(null);

  // The element is built once; these keep it talking to the current props.
  const handlers = useRef({ onChange, onLeave });
  handlers.current = { onChange, onLeave };
  const initial = useRef(value);
  // The last LaTeX the field and the props agreed on. Anything else in the
  // props is a change from outside (a collaborator) worth pushing in; without
  // this, the field's own edits would be echoed straight back at it, a render
  // behind, and wipe what was just typed.
  const settled = useRef(value);

  useEffect(() => {
    let mf: MathfieldElement | null = null;
    let cancelled = false;
    // Raised while the field is being walked on purpose: MathLive announces a
    // "move-out" when a movement command runs past the end, and that must not
    // be mistaken for the user arrowing out of the formula.
    let navigating = false;

    loadMathfield().then((MathfieldElement) => {
      if (cancelled || !hostRef.current) return;

      mf = new MathfieldElement();
      // Settings and value talk to the mathfield's internals, which only come
      // into being once the element is in the document.
      hostRef.current.appendChild(mf);
      // On a phone MathLive's own maths keyboard replaces the OS one, which
      // is the whole point: no backslashes to hunt for.
      mf.mathVirtualKeyboardPolicy = 'auto';
      mf.smartMode = false;
      mf.menuItems = [];
      mf.value = initial.current;

      mf.addEventListener('input', () => {
        settled.current = mf!.value;
        handlers.current.onChange(mf!.value);
      });

      // Capture phase: MathLive handles keys on a sink inside its shadow root,
      // which is deeper than this listener would otherwise reach.
      mf.addEventListener('keydown', (event) => {
        // While a `\command` is being typed, MathLive owns the keyboard:
        // space completes the command and Enter accepts it.
        const typingCommand = mf!.mode === 'latex';

        if (
          event.key === ' ' &&
          !typingCommand &&
          mf!.mode !== 'text' &&
          !event.metaKey &&
          !event.ctrlKey &&
          !event.altKey
        ) {
          // Maths ignores ordinary spaces, so the space bar would otherwise do
          // nothing at all. It inserts the thin space that belongs between a
          // term and its differential: 3x^2 \, dx.
          event.preventDefault();
          event.stopPropagation();
          mf!.insert('\\,', { focus: true, feedback: false });
          return;
        }

        if (event.key === 'Tab' && !event.metaKey && !event.ctrlKey) {
          // Tab walks the holes. Asking MathLive to step past the last one
          // makes it leave the field — and drop the next keystroke on the way
          // out — so every case is decided here instead.
          const back = event.shiftKey;
          event.preventDefault();
          event.stopPropagation();
          navigating = true;
          if (!mf!.value.includes('\\placeholder')) {
            // Nothing left to fill in: carry on at the end of the formula,
            // which is where the rest of it gets written.
            mf!.executeCommand(back ? 'moveToMathfieldStart' : 'moveToMathfieldEnd');
          } else {
            // MathLive's own order does not always run left to right — an
            // exponent comes before its index — so there can be no hole
            // "ahead" while holes remain. Then the walk starts again.
            const ahead = back
              ? mf!.getValue(0, mf!.position)
              : mf!.getValue(mf!.position, mf!.lastOffset);
            if (!ahead.includes('\\placeholder')) {
              mf!.executeCommand(back ? 'moveToMathfieldEnd' : 'moveToMathfieldStart');
            }
            mf!.executeCommand(back ? 'moveToPreviousPlaceholder' : 'moveToNextPlaceholder');
          }
          // Released a tick later: a movement command that finds nothing to
          // move to can blur the field for a moment on its way nowhere.
          mf!.focus();
          window.setTimeout(() => {
            navigating = false;
          }, 0);
          return;
        }
        const done =
          !typingCommand &&
          (event.key === 'Escape' ||
            // Enter finishes the formula and moves on, the way it does in the
            // rest of the editor — except inside a matrix or a system, where
            // MathLive needs it to start the next row.
            (event.key === 'Enter' &&
              !event.shiftKey &&
              (event.metaKey || event.ctrlKey || !mf!.value.includes('\\begin{'))));
        if (!done) return;
        event.preventDefault();
        event.stopPropagation();
        handlers.current.onLeave(true);
      }, true);

      // Arrowing or tabbing past the last character walks out of the formula
      // and back into the prose, the way it does inside the text editor.
      mf.addEventListener('move-out', (event) => {
        if (navigating) return;
        const direction = (event as CustomEvent<{ direction: string }>).detail?.direction;
        handlers.current.onLeave(direction === 'forward' || direction === 'downward');
      });

      mf.addEventListener('focusout', () => {
        // Give the browser a tick to settle: clicking the virtual keyboard or
        // a symbol key blurs the field for a moment without ending the edit.
        window.setTimeout(() => {
          if (cancelled || !mf || navigating) return;
          if (document.activeElement === mf || focusIsInVirtualKeyboard() || mathfieldHeld()) return;
          handlers.current.onLeave(false);
        }, 0);
      });

      if (!autoFocus) {
        setField(mf);
        return;
      }
      mf.focus();
      // A formula opened on a skeleton starts in its first hole; one being
      // revisited starts at the end, where typing continues naturally.
      navigating = true;
      if (mf.value.includes('\\placeholder')) {
        mf.executeCommand('moveToMathfieldStart');
        mf.executeCommand('moveToNextPlaceholder');
        // MathLive walks a big operator's exponent before its index, but an
        // integral or a sum is written from its lower bound up.
        if (/_\{\\placeholder\{\}\}\^\{\\placeholder\{\}\}/.test(mf.value)) {
          mf.executeCommand('moveToNextPlaceholder');
        }
      } else {
        mf.executeCommand('moveToMathfieldEnd');
      }
      window.setTimeout(() => {
        navigating = false;
      }, 0);
      setField(mf);

      // A dropdown that closes right after opening the formula can pull the
      // focus away a frame later; take it back once the dust has settled.
      requestAnimationFrame(() => {
        if (!cancelled && mf && document.activeElement !== mf) mf.focus();
      });
      window.setTimeout(() => {
        if (!cancelled && mf && document.activeElement !== mf) mf.focus();
      }, 60);
    });

    return () => {
      cancelled = true;
      mf?.remove();
    };
  }, []);

  useEffect(() => {
    // Edits arriving from another collaborator land in the node attributes;
    // mirror them without echoing an `input` event back out.
    if (!field || value === settled.current) return;
    settled.current = value;
    if (field.value !== value) field.setValue(value, { silenceNotifications: true });
  }, [field, value]);

  return <div ref={hostRef} className="math-field-host" />;
}
