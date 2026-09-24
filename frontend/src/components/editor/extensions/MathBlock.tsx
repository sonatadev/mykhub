import { useEffect, useMemo, useState } from 'react';
import { Node, mergeAttributes, nodeInputRule } from '@tiptap/core';
import { NodeViewWrapper, ReactNodeViewRenderer } from '@tiptap/react';
import type { NodeViewProps } from '@tiptap/react';
import katex from 'katex';
import MathField from '../MathField';
import { stripPlaceholders, toPlaceholders } from '@/lib/mathfield';
import { cn } from '@/lib/utils';

export const KATEX_OPTIONS: katex.KatexOptions = {
  throwOnError: false,
  errorColor: 'hsl(var(--destructive))',
  strict: false,
  trust: false,
  maxSize: 400,
};

export function renderMath(latex: string, displayMode: boolean) {
  try {
    return katex.renderToString(stripPlaceholders(latex), { ...KATEX_OPTIONS, displayMode });
  } catch {
    // KaTeX only throws here for options errors; the formula itself is
    // rendered with errorColor thanks to throwOnError: false.
    return '';
  }
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    mathBlock: {
      /** Insert a display formula, optionally pre-filled with a template. */
      setMathBlock: (latex?: string) => ReturnType;
      /** Wrap the selection (or an empty spot) in inline `$…$` delimiters. */
      insertInlineMath: (latex?: string) => ReturnType;
      /** Open a fresh display formula on a skeleton, ready to be filled in. */
      insertMathTemplate: (latex: string) => ReturnType;
    };
  }
}

function MathBlockView({ node, updateAttributes, editor, getPos, selected, deleteNode }: NodeViewProps) {
  const latex = (node.attrs.latex as string) ?? '';
  // An empty block has nothing to show, so it opens straight in edit mode.
  const [editing, setEditing] = useState(() => editor.isEditable && latex.trim() === '');
  const [draft, setDraft] = useState(latex);

  useEffect(() => {
    // A block inserted from the toolbar or the slash menu opens for editing
    // too: its template placeholders are meant to be replaced right away.
    // The flag is raised by setMathBlock and consumed by the node view it
    // created, so blocks restored when a page loads stay rendered.
    const storage = editor.storage.mathBlock as { autoFocus?: boolean } | undefined;
    if (storage?.autoFocus) {
      storage.autoFocus = false;
      setEditing(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // Remote (Yjs) edits land in attrs; mirror them while we are not typing.
    if (!editing) setDraft(latex);
  }, [latex, editing]);

  const html = useMemo(() => renderMath(draft.trim() || '\\square', true), [draft]);

  function commit(next: string) {
    setDraft(next);
    updateAttributes({ latex: next });
  }

  function leave(placeCursorAfter: boolean) {
    setEditing(false);
    // Holes the user never filled are stored as empty groups: KaTeX renders
    // those, whereas MathLive's `\\placeholder{}` would be an error.
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
    const after = pos + node.nodeSize;
    const isLast = after >= editor.state.doc.content.size;
    if (isLast) editor.chain().insertContentAt(after, { type: 'paragraph' }).focus(after + 1).run();
    else editor.chain().focus().setTextSelection(after).run();
  }

  return (
    <NodeViewWrapper
      as="div"
      className={cn('math-block', selected && 'math-block--selected')}
      data-type="math-block"
    >
      {!editing && (
      <div
        className="math-block__render"
        role={editor.isEditable ? 'button' : undefined}
        tabIndex={editor.isEditable && !editing ? 0 : -1}
        onClick={() => editor.isEditable && setEditing(true)}
        onKeyDown={(e) => {
          if (editor.isEditable && !editing && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            setEditing(true);
          }
        }}
        dangerouslySetInnerHTML={{ __html: html }}
      />
      )}
      {editing && (
        <div className="math-block__editor" draggable={false} onDragStart={(e) => e.preventDefault()}>
          <MathField value={draft} onChange={commit} onLeave={leave} />
          <div className="math-block__footer">
            <span className="math-block__hint">
              Formula<span className="math-block__hint-key"> · Esc per chiudere</span>
            </span>
            <div className="math-block__actions">
            <button
              type="button"
              className="math-block__delete"
              aria-label="Elimina la formula"
              onPointerDown={(e) => e.preventDefault()}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => deleteNode()}
            >
              Elimina
            </button>
            <button
              type="button"
              className="math-block__done"
              // Keep the field focused so the click lands before the blur.
              onPointerDown={(e) => e.preventDefault()}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => leave(true)}
            >
              Fatto
            </button>
            </div>
          </div>
        </div>
      )}
    </NodeViewWrapper>
  );
}

export const MathBlock = Node.create({
  name: 'mathBlock',
  group: 'block',
  atom: true,
  selectable: true,
  draggable: true,

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
    return [{ tag: 'div[data-type="math-block"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'math-block' })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(MathBlockView, {
      // While a formula is open, every click inside it belongs to the maths
      // field — clicking a digit moves the caret there. Without this,
      // ProseMirror treats the click as "select this atom", pulls focus back
      // into the document and the formula snaps shut.
      stopEvent: ({ event }) => {
        const target = event.target as HTMLElement | null;
        return !!target?.closest?.('.math-block__editor');
      },
    });
  },

  addCommands() {
    return {
      setMathBlock:
        (latex = '') =>
        ({ chain }) => {
          this.storage.autoFocus = true;
          return chain().insertContent({ type: this.name, attrs: { latex } }).run();
        },

      insertMathTemplate:
        (latex) =>
        ({ chain }) => {
          // The skeleton goes straight into the node, holes and all: the field
          // then opens on it and puts the caret in the first one. Handing it
          // over after the fact raced with ProseMirror redrawing the node.
          this.storage.autoFocus = true;
          return chain().insertContent({ type: this.name, attrs: { latex: toPlaceholders(latex) } }).run();
        },

      insertInlineMath:
        (latex) =>
        ({ chain, state }) => {
          const { from, to, empty } = state.selection;
          const body = latex ?? (empty ? '' : state.doc.textBetween(from, to, ' '));
          return chain()
            .insertContent(`$${body}$`)
            .setTextSelection(from + 1 + body.length)
            .run();
        },
    };
  },

  addInputRules() {
    return [
      // "$$" followed by a space turns the paragraph into a display formula.
      nodeInputRule({ find: /^\$\$\s$/, type: this.type }),
    ];
  },

  addKeyboardShortcuts() {
    return {
      'Mod-m': () => this.editor.commands.insertInlineMath(),
      'Mod-Shift-m': () => this.editor.commands.setMathBlock(),
    };
  },
});

export default MathBlock;
