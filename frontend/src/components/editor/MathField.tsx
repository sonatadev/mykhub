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
}

/** The virtual keyboard lives outside the field, so focus may legitimately
 *  land there without meaning the user has finished the formula. */
function focusIsInVirtualKeyboard() {
  const active = document.activeElement;
  return !!active && !!active.closest?.('.ML__keyboard, [part="virtual-keyboard"]');
}

export default function MathField({ value, onChange, onLeave }: Props) {
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

      mf.addEventListener('keydown', (event) => {
        const done =
          event.key === 'Escape' ||
          // Enter finishes the formula and moves on, the way it does in the
          // rest of the editor — except inside a matrix or a system, where
          // MathLive needs it to start the next row.
          (event.key === 'Enter' &&
            !event.shiftKey &&
            (event.metaKey || event.ctrlKey || !mf!.value.includes('\\begin{')));
        if (!done) return;
        event.preventDefault();
        event.stopPropagation();
        handlers.current.onLeave(true);
      });

      // Arrowing or tabbing past the last character walks out of the formula
      // and back into the prose, the way it does inside the text editor.
      mf.addEventListener('move-out', (event) => {
        const direction = (event as CustomEvent<{ direction: string }>).detail?.direction;
        handlers.current.onLeave(direction === 'forward' || direction === 'downward');
      });

      mf.addEventListener('focusout', () => {
        // Give the browser a tick to settle: clicking the virtual keyboard or
        // a symbol key blurs the field for a moment without ending the edit.
        window.setTimeout(() => {
          if (cancelled || !mf) return;
          if (document.activeElement === mf || focusIsInVirtualKeyboard() || mathfieldHeld()) return;
          handlers.current.onLeave(false);
        }, 0);
      });

      mf.focus();
      // A formula opened on a skeleton starts in its first hole; one being
      // revisited starts at the end, where typing continues naturally.
      if (mf.value.includes('\\placeholder')) {
        mf.executeCommand('moveToMathfieldStart');
        // The caret sits visibly inside the first hole; Tab walks the rest.
        mf.executeCommand('moveToNextPlaceholder');
      } else {
        mf.executeCommand('moveToMathfieldEnd');
      }
      setField(mf);
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
