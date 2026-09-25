import { useEffect, useMemo, useRef, useState } from 'react';
import { Node, mergeAttributes } from '@tiptap/core';
import { NodeViewWrapper, ReactNodeViewRenderer } from '@tiptap/react';
import type { NodeViewProps } from '@tiptap/react';
import MathField from '../MathField';
import { renderMath } from './MathBlock';
import { stripPlaceholders, toPlaceholders } from '@/lib/mathfield';
import { cn } from '@/lib/utils';

/**
 * A formula the size of the words around it: a fraction, a limit or an index
 * written in the middle of a sentence. Same field and same keys as a display
 * formula — it simply sits on the line instead of taking one of its own.
 */

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    mathInline: {
      /** Write a formula inside the line, optionally on a skeleton. */
      setMathInline: (latex?: string) => ReturnType;
    };
  }
}

function MathInlineView({ node, updateAttributes, editor, getPos, selected, deleteNode }: NodeViewProps) {
  const latex = (node.attrs.latex as string) ?? '';
  const [editing, setEditing] = useState(() => editor.isEditable && latex.trim() === '');
  const [draft, setDraft] = useState(latex);
  const openedWith = useRef(latex);

  useEffect(() => {
    if (editing) openedWith.current = draft;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing]);

  useEffect(() => {
    const storage = editor.storage.mathInline as { autoFocus?: boolean } | undefined;
    if (storage?.autoFocus) {
      storage.autoFocus = false;
      setEditing(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!editing) setDraft(latex);
  }, [latex, editing]);

  const source = stripPlaceholders(draft).trim();
  const html = useMemo(
    () => (source ? renderMath(source, false) : editor.isEditable ? renderMath('\\square', false) : ''),
    [source, editor.isEditable]
  );

  function commit(next: string) {
    setDraft(next);
    updateAttributes({ latex: next });
  }

  function leave(placeCursorAfter: boolean) {
    setEditing(false);
    const untouched = draft === openedWith.current && draft.includes('\\placeholder');
    if (!source || untouched) {
      deleteNode();
      if (placeCursorAfter) editor.commands.focus();
      return;
    }
    const cleaned = stripPlaceholders(draft);
    if (cleaned !== draft) {
      setDraft(cleaned);
      updateAttributes({ latex: cleaned });
    }
    if (!placeCursorAfter) return;
    const pos = typeof getPos === 'function' ? getPos() : null;
    if (pos == null) {
      editor.commands.focus();
      return;
    }
    // Back into the sentence, just after the formula.
    editor.chain().focus().setTextSelection(pos + node.nodeSize).run();
  }

  return (
    <NodeViewWrapper
      as="span"
      className={cn('math-inline', selected && 'math-inline--selected', editing && 'math-inline--editing')}
      data-type="math-inline"
    >
      {!editing && (
        <span
          className="math-inline__render"
          role={editor.isEditable ? 'button' : undefined}
          tabIndex={editor.isEditable ? 0 : -1}
          onClick={() => editor.isEditable && setEditing(true)}
          onKeyDown={(event) => {
            if (editor.isEditable && (event.key === 'Enter' || event.key === ' ')) {
              event.preventDefault();
              setEditing(true);
            }
          }}
          dangerouslySetInnerHTML={{ __html: html }}
        />
      )}
      {editing && (
        <span className="math-inline__editor">
          <MathField value={draft} onChange={commit} onLeave={leave} />
        </span>
      )}
    </NodeViewWrapper>
  );
}

export const MathInline = Node.create({
  name: 'mathInline',
  group: 'inline',
  inline: true,
  atom: true,
  selectable: true,

  addStorage() {
    return { autoFocus: false };
  },

  addAttributes() {
    return {
      latex: {
        default: '',
        parseHTML: (element) => element.getAttribute('data-latex') ?? element.textContent ?? '',
        renderHTML: (attributes) => ({ 'data-latex': attributes.latex }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'span[data-type="math-inline"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes(HTMLAttributes, { 'data-type': 'math-inline' })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(MathInlineView, {
      stopEvent: ({ event }) => {
        const target = event.target as HTMLElement | null;
        return !!target?.closest?.('.math-inline__editor');
      },
    });
  },

  addCommands() {
    return {
      setMathInline:
        (latex = '') =>
        ({ chain }) => {
          this.storage.autoFocus = true;
          return chain()
            .insertContent({ type: this.name, attrs: { latex: toPlaceholders(latex) } })
            .run();
        },
    };
  },

  addKeyboardShortcuts() {
    return {
      'Mod-m': () => this.editor.commands.setMathInline(),
    };
  },
});

export default MathInline;
