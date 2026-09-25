import type { JSONContent } from '@tiptap/core';
import { THEOREM_VARIANTS, type TheoremVariant } from '@/components/editor/extensions';

/**
 * Serialises a TipTap document to a compilable LaTeX article.
 *
 * Inline maths lives in the document as literal `$…$` text, so those spans are
 * passed through untouched while everything around them is escaped.
 */

const ESCAPES: Record<string, string> = {
  '\\': '\\textbackslash{}',
  '{': '\\{',
  '}': '\\}',
  $: '\\$',
  '&': '\\&',
  '#': '\\#',
  '^': '\\textasciicircum{}',
  _: '\\_',
  '~': '\\textasciitilde{}',
  '%': '\\%',
};

function escapeLatex(text: string) {
  return text.replace(/[\\{}$&#^_~%]/g, (c) => ESCAPES[c]);
}

/** Escape prose but keep `$…$` maths verbatim. */
function escapeKeepingMath(text: string) {
  return text
    .split(/(\$[^$]*\$)/g)
    .map((part) => (part.startsWith('$') && part.endsWith('$') && part.length > 1 ? part : escapeLatex(part)))
    .join('');
}

const MARK_WRAPPERS: Record<string, (inner: string) => string> = {
  bold: (s) => `\\textbf{${s}}`,
  italic: (s) => `\\emph{${s}}`,
  underline: (s) => `\\underline{${s}}`,
  strike: (s) => `\\sout{${s}}`,
  code: (s) => `\\texttt{${s}}`,
};

function renderText(node: JSONContent) {
  const marks = node.marks ?? [];
  const isCode = marks.some((m) => m.type === 'code');
  let out = isCode ? escapeLatex(node.text ?? '') : escapeKeepingMath(node.text ?? '');

  for (const mark of marks) {
    if (mark.type === 'link') {
      const href = String(mark.attrs?.href ?? '');
      out = `\\href{${href.replace(/([%#\\])/g, '\\$1')}}{${out}}`;
      continue;
    }
    const wrap = MARK_WRAPPERS[mark.type ?? ''];
    if (wrap) out = wrap(out);
  }
  return out;
}

function renderInline(nodes: JSONContent[] | undefined): string {
  if (!nodes) return '';
  return nodes
    .map((node) => {
      if (node.type === 'text') return renderText(node);
      if (node.type === 'hardBreak') return '\\\\\n';
      if (node.type === 'mathInline') return `$${String(node.attrs?.latex ?? '').trim()}$`;
      if (node.type === 'image') return `\\texttt{[immagine: ${escapeLatex(String(node.attrs?.src ?? ''))}]}`;
      return renderInline(node.content);
    })
    .join('');
}

const HEADINGS = ['section', 'subsection', 'subsubsection', 'paragraph', 'subparagraph', 'subparagraph'];

function renderBlocks(nodes: JSONContent[] | undefined): string[] {
  if (!nodes) return [];
  const out: string[] = [];

  for (const node of nodes) {
    switch (node.type) {
      case 'heading': {
        const level = Math.min(Number(node.attrs?.level ?? 1), HEADINGS.length) - 1;
        out.push(`\\${HEADINGS[level]}{${renderInline(node.content)}}`, '');
        break;
      }
      case 'paragraph': {
        const body = renderInline(node.content);
        if (body.trim()) out.push(body, '');
        break;
      }
      case 'mathBlock':
        out.push('\\[', String(node.attrs?.latex ?? '').trim(), '\\]', '');
        break;
      case 'theoremBlock': {
        const variant = String(node.attrs?.variant ?? 'teorema') as TheoremVariant;
        const env = variant === 'dimostrazione' ? 'proof' : variant in THEOREM_VARIANTS ? variant : 'teorema';
        const name = String(node.attrs?.title ?? '').trim();
        // amsthm's optional argument. For `proof` it replaces the whole
        // heading, so the word "Dimostrazione" has to be repeated there.
        const arg = name
          ? env === 'proof'
            ? `[Dimostrazione (${escapeLatex(name)})]`
            : `[${escapeLatex(name)}]`
          : '';
        out.push(`\\begin{${env}}${arg}`, ...renderBlocks(node.content), `\\end{${env}}`, '');
        break;
      }
      case 'bulletList':
      case 'orderedList': {
        const env = node.type === 'bulletList' ? 'itemize' : 'enumerate';
        out.push(`\\begin{${env}}`);
        for (const item of node.content ?? []) {
          const [first = '', ...rest] = renderBlocks(item.content).filter((l) => l !== '');
          out.push(`  \\item ${first}`, ...rest.map((l) => `  ${l}`));
        }
        out.push(`\\end{${env}}`, '');
        break;
      }
      case 'taskList': {
        out.push('\\begin{itemize}');
        for (const item of node.content ?? []) {
          const box = item.attrs?.checked ? '$\\boxtimes$' : '$\\square$';
          const [first = '', ...rest] = renderBlocks(item.content).filter((l) => l !== '');
          out.push(`  \\item[${box}] ${first}`, ...rest.map((l) => `  ${l}`));
        }
        out.push('\\end{itemize}', '');
        break;
      }
      case 'blockquote':
        out.push('\\begin{quote}', ...renderBlocks(node.content), '\\end{quote}', '');
        break;
      case 'codeBlock':
        out.push('\\begin{verbatim}', node.content?.map((c) => c.text ?? '').join('') ?? '', '\\end{verbatim}', '');
        break;
      case 'horizontalRule':
        out.push('\\begin{center}\\rule{0.5\\linewidth}{0.4pt}\\end{center}', '');
        break;
      case 'image':
        // The file lives behind an authenticated URL, so it cannot be pulled
        // into the .tex; leave a visible marker and the address.
        out.push(
          `% immagine: ${String(node.attrs?.src ?? '')}`,
          `\\begin{center}\\framebox{\\texttt{immagine: ${escapeLatex(String(node.attrs?.alt || node.attrs?.src || ''))}}}\\end{center}`,
          ''
        );
        break;
      case 'table': {
        const rows = node.content ?? [];
        const cols = rows[0]?.content?.length ?? 1;
        out.push(`\\begin{center}`, `\\begin{tabular}{|${'l|'.repeat(cols)}}`, '\\hline');
        for (const row of rows) {
          const cells = (row.content ?? []).map((cell) => {
            const text = renderBlocks(cell.content).filter((l) => l !== '').join(' ');
            return cell.type === 'tableHeader' ? `\\textbf{${text}}` : text;
          });
          out.push(`${cells.join(' & ')} \\\\ \\hline`);
        }
        out.push('\\end{tabular}', '\\end{center}', '');
        break;
      }
      default:
        if (node.content) out.push(...renderBlocks(node.content));
    }
  }

  return out;
}

const PREAMBLE = `\\documentclass[a4paper,11pt]{article}
\\usepackage[utf8]{inputenc}
\\usepackage[T1]{fontenc}
\\usepackage[italian]{babel}
\\usepackage{amsmath,amssymb,amsthm}
\\usepackage{graphicx}
\\usepackage[normalem]{ulem}
\\usepackage[hidelinks]{hyperref}

\\theoremstyle{definition}
\\newtheorem{teorema}{Teorema}
\\newtheorem{definizione}[teorema]{Definizione}
\\newtheorem{lemma}[teorema]{Lemma}
\\newtheorem{proposizione}[teorema]{Proposizione}
\\newtheorem{corollario}[teorema]{Corollario}
\\newtheorem{esempio}[teorema]{Esempio}
\\theoremstyle{remark}
\\newtheorem*{osservazione}{Osservazione}
`;

export function pageToLatex(title: string, doc: unknown): string {
  const content = (doc as JSONContent)?.content;
  const body = renderBlocks(content).join('\n').replace(/\n{3,}/g, '\n\n').trim();

  return [
    PREAMBLE,
    `\\title{${escapeLatex(title)}}`,
    '\\date{\\today}',
    '',
    '\\begin{document}',
    '\\maketitle',
    '',
    body,
    '',
    '\\end{document}',
    '',
  ].join('\n');
}

export function downloadLatex(title: string, doc: unknown) {
  const slug = title.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'appunti';
  const blob = new Blob([pageToLatex(title, doc)], { type: 'application/x-tex;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${slug}.tex`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
