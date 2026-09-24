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

      mf.addEventListener('input', () => handlers.current.onChange(mf!.value));

      mf.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' || (event.key === 'Enter' && (event.metaKey || event.ctrlKey))) {
          event.preventDefault();
          event.stopPropagation();
          handlers.current.onLeave(true);
        }
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
      mf.executeCommand('moveToMathfieldEnd');
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
    if (field && field.value !== value) field.setValue(value, { silenceNotifications: true });
  }, [field, value]);

  return <div ref={hostRef} className="math-field-host" />;
}
