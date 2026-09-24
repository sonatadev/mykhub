import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';

/**
 * Keeps an empty paragraph at the end of the document.
 *
 * Without it a note that ends in an atom — a formula block — leaves nowhere to
 * put the caret: tapping below the formula yields a gap cursor, and every
 * command that needs a text block (wrapping in an environment, lists,
 * headings) silently fails from there.
 */
export const TrailingNode = Extension.create({
  name: 'trailingNode',

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey(this.name),
        appendTransaction: (transactions, _oldState, newState) => {
          if (!transactions.some((tr) => tr.docChanged)) return null;
          const { doc, tr, schema } = newState;
          const last = doc.lastChild;
          if (last && last.type.isTextblock) return null;
          const paragraph = schema.nodes.paragraph;
          if (!paragraph) return null;
          return tr.insert(doc.content.size, paragraph.create());
        },
      }),
    ];
  },
});

export default TrailingNode;
