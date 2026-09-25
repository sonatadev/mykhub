import { useState } from 'react';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import { NodeViewContent, NodeViewWrapper, ReactNodeViewRenderer } from '@tiptap/react';
import type { NodeViewProps } from '@tiptap/react';
import { Check, Copy, Trash2 } from 'lucide-react';
import { createLowlight } from 'lowlight';
import c from 'highlight.js/lib/languages/c';
import cpp from 'highlight.js/lib/languages/cpp';
import python from 'highlight.js/lib/languages/python';
import java from 'highlight.js/lib/languages/java';
import javascript from 'highlight.js/lib/languages/javascript';
import typescript from 'highlight.js/lib/languages/typescript';
import bash from 'highlight.js/lib/languages/bash';
import sql from 'highlight.js/lib/languages/sql';
import json from 'highlight.js/lib/languages/json';
import xml from 'highlight.js/lib/languages/xml';
import css from 'highlight.js/lib/languages/css';
import plaintext from 'highlight.js/lib/languages/plaintext';

/**
 * Only the languages a first-year course actually needs: the full highlight.js
 * bundle is megabytes, this handful is a few kilobytes.
 */
const lowlight = createLowlight({
  c,
  cpp,
  python,
  java,
  javascript,
  typescript,
  bash,
  sql,
  json,
  xml,
  css,
  plaintext,
});

const LANGUAGES: Array<[string, string]> = [
  ['c', 'C'],
  ['cpp', 'C++'],
  ['python', 'Python'],
  ['java', 'Java'],
  ['javascript', 'JavaScript'],
  ['typescript', 'TypeScript'],
  ['bash', 'Shell'],
  ['sql', 'SQL'],
  ['json', 'JSON'],
  ['xml', 'HTML / XML'],
  ['css', 'CSS'],
  ['plaintext', 'Testo semplice'],
];

function labelOf(language: string) {
  return LANGUAGES.find(([value]) => value === language)?.[1] ?? 'Testo semplice';
}

function CodeBlockView({ node, updateAttributes, editor, deleteNode }: NodeViewProps) {
  const language = (node.attrs.language as string) || 'plaintext';
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(node.textContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // Clipboard blocked (http, or permission denied): nothing to do but
      // leave the code on screen for a manual selection.
    }
  }

  return (
    <NodeViewWrapper as="div" className="code-block" data-language={language}>
      {/* The bar is chrome: keep the caret out of it, or typing would land here. */}
      <div className="code-block__bar" contentEditable={false}>
        {editor.isEditable ? (
          <select
            className="code-block__lang"
            value={language}
            aria-label="Linguaggio del blocco di codice"
            onChange={(event) => updateAttributes({ language: event.target.value })}
          >
            {LANGUAGES.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        ) : (
          <span className="code-block__lang code-block__lang--static">{labelOf(language)}</span>
        )}
        <div className="code-block__actions">
          <button type="button" className="code-block__action" onClick={copy} title="Copia il codice">
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            <span>{copied ? 'Copiato' : 'Copia'}</span>
          </button>
          {editor.isEditable && (
            <button
              type="button"
              className="code-block__action code-block__action--danger"
              onClick={() => deleteNode()}
              title="Elimina il blocco"
              aria-label="Elimina il blocco di codice"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
      <pre className="code-block__pre">
        <NodeViewContent as="code" className={`language-${language}`} />
      </pre>
    </NodeViewWrapper>
  );
}

export const CodeBlock = CodeBlockLowlight.extend({
  addKeyboardShortcuts() {
    return {
      ...this.parent?.(),
      // Inside code, Tab means indentation — not "leave the editor".
      Tab: () => {
        if (!this.editor.isActive(this.name)) return false;
        return this.editor.commands.insertContent('    ');
      },
    };
  },

  addNodeView() {
    return ReactNodeViewRenderer(CodeBlockView, {
      // The language picker and the buttons are React's business; without
      // this ProseMirror swallows the clicks to select the node instead.
      stopEvent: ({ event }) => {
        const target = event.target as HTMLElement | null;
        return !!target?.closest?.('.code-block__bar');
      },
    });
  },
}).configure({
  lowlight,
  // C is what the course uses, so a fresh block is ready for it.
  defaultLanguage: 'c',
});

export default CodeBlock;
