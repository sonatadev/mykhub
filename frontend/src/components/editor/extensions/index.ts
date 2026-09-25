import { Mathematics, defaultShouldRender } from '@tiptap/extension-mathematics';
import { MathBlock, KATEX_OPTIONS } from './MathBlock';
import { MathInline } from './MathInline';
import { TheoremBlock } from './TheoremBlock';
import { FunctionGraph } from './FunctionGraph';
import { TrailingNode } from './TrailingNode';

/**
 * Everything the maths note-taking needs, in one place: the editor and the
 * read-only renderer used by public shares both spread this list, so a shared
 * page never falls back to raw `$…$`.
 */
export const mathExtensions = [
  Mathematics.configure({
    katexOptions: KATEX_OPTIONS,
    // Leave `$` alone inside code blocks and inline code.
    shouldRender: (state, pos, node) =>
      defaultShouldRender(state, pos) && !node.marks.some((mark) => mark.type.name === 'code'),
  }),
  MathBlock,
  MathInline,
  TheoremBlock,
  FunctionGraph,
];

/**
 * What the editable editor adds on top: a trailing paragraph is pointless in
 * the read-only renderer and would only mutate a document nobody can edit.
 */
export const editorExtensions = [...mathExtensions, TrailingNode];

export { MathBlock, MathInline, TheoremBlock, FunctionGraph, TrailingNode, KATEX_OPTIONS };
export { THEOREM_ORDER, THEOREM_VARIANTS } from './TheoremBlock';
export type { TheoremVariant } from './TheoremBlock';
export { SlashCommands } from './SlashCommands';
