import type { EditorState } from '@tiptap/pm/state';

/**
 * True when the caret sits between an opening and a closing `$` in the current
 * text block — i.e. inside an inline formula. Inline maths is plain text, so
 * counting delimiters before the caret is all it takes.
 */
export function isInsideInlineMath(state: EditorState) {
  const { $from, empty } = state.selection;
  if (!empty || !$from.parent.isTextblock) return false;
  if ($from.parent.type.name === 'codeBlock') return false;
  const before = $from.parent.textBetween(0, $from.parentOffset, undefined, ' ');
  return (before.split('$').length - 1) % 2 === 1;
}
