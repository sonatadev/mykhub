import { Node, mergeAttributes, findParentNode } from '@tiptap/core';
import { Trash2 } from 'lucide-react';
import { TextSelection } from '@tiptap/pm/state';
import { NodeViewContent, NodeViewWrapper, ReactNodeViewRenderer } from '@tiptap/react';
import type { NodeViewProps } from '@tiptap/react';

export type TheoremVariant =
  | 'definizione'
  | 'teorema'
  | 'lemma'
  | 'proposizione'
  | 'corollario'
  | 'esempio'
  | 'dimostrazione'
  | 'osservazione';

/**
 * Numbered environments share a single counter (Definizione 1, Teorema 2, …),
 * the convention most analysis textbooks follow. Numbering itself is done by
 * CSS counters, so the document never stores a number that could drift.
 */
export const THEOREM_VARIANTS: Record<TheoremVariant, { label: string; numbered: boolean }> = {
  definizione: { label: 'Definizione', numbered: true },
  teorema: { label: 'Teorema', numbered: true },
  lemma: { label: 'Lemma', numbered: true },
  proposizione: { label: 'Proposizione', numbered: true },
  corollario: { label: 'Corollario', numbered: true },
  esempio: { label: 'Esempio', numbered: true },
  dimostrazione: { label: 'Dimostrazione', numbered: false },
  osservazione: { label: 'Osservazione', numbered: false },
};

export const THEOREM_ORDER: TheoremVariant[] = [
  'definizione',
  'teorema',
  'lemma',
  'proposizione',
  'corollario',
  'dimostrazione',
  'esempio',
  'osservazione',
];

function variantOf(value: unknown): TheoremVariant {
  return typeof value === 'string' && value in THEOREM_VARIANTS ? (value as TheoremVariant) : 'teorema';
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    theoremBlock: {
      setTheoremBlock: (variant: TheoremVariant) => ReturnType;
      toggleTheoremBlock: (variant: TheoremVariant) => ReturnType;
      unsetTheoremBlock: () => ReturnType;
      /** Removes the environment together with everything inside it. */
      deleteTheoremBlock: () => ReturnType;
    };
  }
}

function TheoremView({ node, updateAttributes, editor, deleteNode }: NodeViewProps) {
  const variant = variantOf(node.attrs.variant);
  const { label, numbered } = THEOREM_VARIANTS[variant];
  const title = (node.attrs.title as string) ?? '';
  const editable = editor.isEditable;

  return (
    <NodeViewWrapper
      as="div"
      className="theorem-block"
      data-type="theorem-block"
      data-variant={variant}
      data-numbered={numbered ? '' : undefined}
    >
      {/* The heading is chrome, not content: the number comes from a CSS
          counter and the name is a plain field stored in the node. */}
      <div className="theorem-block__head" contentEditable={false}>
        <span className="theorem-block__label" data-label={label} />
        {(editable || title) && (
          <span className="theorem-block__name">
            {title && <span className="theorem-block__paren">(</span>}
            <span className="theorem-block__sizer" data-value={title || 'nome…'}>
              {editable ? (
                <input
                  className="theorem-block__title"
                  // An input is intrinsically 20 characters wide, which would
                  // stretch the sizing grid well past the text.
                  size={1}
                  value={title}
                  placeholder="nome…"
                  aria-label={`Nome: ${label.toLowerCase()}`}
                  spellCheck={false}
                  onChange={(e) => updateAttributes({ title: e.target.value })}
                />
              ) : (
                <span className="theorem-block__title">{title}</span>
              )}
            </span>
            {title && <span className="theorem-block__paren">)</span>}
          </span>
        )}
        {editable && (
          <button
            type="button"
            className="theorem-block__delete"
            aria-label={`Elimina: ${label.toLowerCase()}`}
            title="Elimina l'ambiente e il suo contenuto"
            // Keep the caret where it is: a blur here would move the
            // selection before the click lands.
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => deleteNode()}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      <NodeViewContent className="theorem-block__body" />
    </NodeViewWrapper>
  );
}

export const TheoremBlock = Node.create({
  name: 'theoremBlock',
  group: 'block',
  content: 'block+',
  defining: true,

  addAttributes() {
    return {
      variant: {
        default: 'teorema' as TheoremVariant,
        parseHTML: (element) => variantOf(element.getAttribute('data-variant')),
        renderHTML: (attributes) => ({ 'data-variant': variantOf(attributes.variant) }),
      },
      title: {
        default: '',
        parseHTML: (element) => element.getAttribute('data-title') ?? '',
        renderHTML: (attributes) => (attributes.title ? { 'data-title': attributes.title } : {}),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="theorem-block"]' }];
  },

  renderHTML({ node, HTMLAttributes }) {
    const { label, numbered } = THEOREM_VARIANTS[variantOf(node.attrs.variant)];
    return [
      'div',
      mergeAttributes(HTMLAttributes, {
        'data-type': 'theorem-block',
        'data-label': label,
        ...(numbered ? { 'data-numbered': '' } : {}),
        class: 'theorem-block',
      }),
      0,
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(TheoremView, {
      // The heading is chrome, not text: its name field and delete button
      // handle their own clicks, and ProseMirror should keep out of them.
      stopEvent: ({ event }) => {
        const target = event.target as HTMLElement | null;
        return !!target?.closest?.('.theorem-block__head');
      },
    });
  },

  addCommands() {
    return {
      setTheoremBlock:
        (variant) =>
        ({ commands }) =>
          commands.wrapIn(this.name, { variant }),

      toggleTheoremBlock:
        (variant) =>
        ({ editor, commands, chain }) => {
          if (editor.isActive(this.name, { variant })) return commands.unsetTheoremBlock();
          if (editor.isActive(this.name)) return commands.updateAttributes(this.name, { variant });

          const wrapped = chain()
            .wrapIn(this.name, { variant })
            // Wrapping a lone formula would leave an environment with nowhere
            // to write: give it a paragraph and put the caret there.
            .command(({ tr, dispatch }) => {
              const $from = tr.selection.$from;
              for (let depth = $from.depth; depth > 0; depth--) {
                const node = $from.node(depth);
                if (node.type.name !== this.name) continue;
                let hasTextblock = false;
                node.forEach((child) => {
                  hasTextblock = hasTextblock || child.isTextblock;
                });
                if (!hasTextblock && dispatch) {
                  const end = $from.after(depth) - 1;
                  tr.insert(end, tr.doc.type.schema.nodes.paragraph.create());
                  tr.setSelection(TextSelection.near(tr.doc.resolve(end + 1)));
                }
                break;
              }
              return true;
            })
            .focus()
            .run();
          if (wrapped) return true;

          // Nothing wrappable under the caret — a gap cursor next to a formula,
          // say. Drop in an empty environment rather than doing nothing.
          return chain()
            .insertContent({ type: this.name, attrs: { variant }, content: [{ type: 'paragraph' }] })
            .focus()
            .run();
        },

      deleteTheoremBlock:
        () =>
        ({ tr, state, dispatch }) => {
          const found = findParentNode((node) => node.type.name === this.name)(state.selection);
          if (!found) return false;
          if (dispatch) tr.delete(found.pos, found.pos + found.node.nodeSize);
          return true;
        },

      unsetTheoremBlock:
        () =>
        ({ tr, state, dispatch }) => {
          const found = findParentNode((node) => node.type.name === this.name)(state.selection);
          if (!found) return false;
          // `lift` would only pull the block under the caret out, leaving the
          // environment behind around whatever else it held. Unwrapping means
          // replacing the whole node with its contents.
          if (dispatch) tr.replaceWith(found.pos, found.pos + found.node.nodeSize, found.node.content);
          return true;
        },
    };
  },

  addKeyboardShortcuts() {
    return {
      // Inside a theorem every Enter adds a paragraph to the environment;
      // Mod-Enter is the way out of it.
      'Mod-Enter': () => {
        const { state } = this.editor;
        const parent = findParentNode((node) => node.type.name === this.name)(state.selection);
        if (!parent) return false;
        const after = parent.pos + parent.node.nodeSize;
        return this.editor
          .chain()
          .insertContentAt(after, { type: 'paragraph' })
          .focus(after + 1)
          .run();
      },
    };
  },
});

export default TheoremBlock;
