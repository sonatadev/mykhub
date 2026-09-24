/**
 * The catalogue the command palette searches. Every entry is LaTeX: inserted
 * into a formula it becomes real maths, and `{}` marks a hole the caret jumps
 * into (MathLive placeholders) — so `frac` lands you on the numerator.
 */

import type { Editor } from '@tiptap/core';

export interface MathSymbol {
  label: string;
  latex: string;
  group: string;
  keywords: string[];
  /** Shown in the picker when the bare LaTeX would render as an empty shell. */
  preview?: string;
}

export const MATH_SYMBOLS: MathSymbol[] = [
  // Structures
  { label: 'Frazione', latex: '\\frac{}{}', group: 'Strutture', keywords: ['frac', 'frazione', 'divisione', '/'] },
  { label: 'Radice quadrata', latex: '\\sqrt{}', group: 'Strutture', keywords: ['sqrt', 'radice', 'root'] },
  { label: 'Radice n-esima', latex: '\\sqrt[]{}', group: 'Strutture', keywords: ['sqrt', 'radice', 'nth', 'root'] },
  { label: 'Potenza', latex: '^{}', group: 'Strutture', keywords: ['pow', 'potenza', 'esponente', 'apice', '^'], preview: 'x^{\\square}' },
  { label: 'Pedice', latex: '_{}', group: 'Strutture', keywords: ['sub', 'pedice', 'indice', '_'], preview: 'x_{\\square}' },
  { label: 'Parentesi tonde', latex: '\\left(\\right)', group: 'Strutture', keywords: ['paren', 'tonde', '('], preview: '(\\square)' },
  { label: 'Parentesi quadre', latex: '\\left[\\right]', group: 'Strutture', keywords: ['bracket', 'quadre', '['], preview: '[\\square]' },
  { label: 'Parentesi graffe', latex: '\\left\\{\\right\\}', group: 'Strutture', keywords: ['brace', 'graffe', '{'], preview: '\\{\\square\\}' },
  { label: 'Valore assoluto', latex: '\\left|\\right|', group: 'Strutture', keywords: ['abs', 'assoluto', 'modulo', '|'], preview: '|\\square|' },
  { label: 'Norma', latex: '\\left\\|\\right\\|', group: 'Strutture', keywords: ['norm', 'norma'], preview: '\\|\\square\\|' },
  { label: 'Sistema', latex: '\\begin{cases}  \\\\  \\end{cases}', group: 'Strutture', keywords: ['cases', 'sistema', 'graffa'], preview: '\\begin{cases}\\square\\\\\\square\\end{cases}' },
  { label: 'Matrice 2×2', latex: '\\begin{pmatrix}  &  \\\\  &  \\end{pmatrix}', group: 'Strutture', keywords: ['matrix', 'matrice', 'pmatrix'] },
  { label: 'Binomiale', latex: '\\binom{}{}', group: 'Strutture', keywords: ['binom', 'binomiale', 'coefficiente'] },

  // Analysis
  { label: 'Integrale', latex: '\\int_{}^{}', group: 'Analisi', keywords: ['int', 'integrale', 'integral'] },
  { label: 'Integrale indefinito', latex: '\\int', group: 'Analisi', keywords: ['int', 'integrale', 'indefinito'] },
  { label: 'Integrale doppio', latex: '\\iint_{}', group: 'Analisi', keywords: ['iint', 'doppio', 'double'] },
  { label: 'Integrale di linea', latex: '\\oint_{}', group: 'Analisi', keywords: ['oint', 'linea', 'circuitazione'] },
  { label: 'Sommatoria', latex: '\\sum_{}^{}', group: 'Analisi', keywords: ['sum', 'somma', 'sommatoria', 'serie', 'sigma'] },
  { label: 'Produttoria', latex: '\\prod_{}^{}', group: 'Analisi', keywords: ['prod', 'produttoria', 'product'] },
  { label: 'Limite', latex: '\\lim_{ \\to }', group: 'Analisi', keywords: ['lim', 'limite', 'limit'] },
  { label: 'Derivata', latex: '\\frac{d}{dx}', group: 'Analisi', keywords: ['der', 'derivata', 'derivative'] },
  { label: 'Derivata parziale', latex: '\\frac{\\partial }{\\partial }', group: 'Analisi', keywords: ['partial', 'parziale', 'derivata'] },
  { label: 'Nabla / gradiente', latex: '\\nabla ', group: 'Analisi', keywords: ['nabla', 'gradiente', 'grad'] },
  { label: 'Infinito', latex: '\\infty ', group: 'Analisi', keywords: ['inf', 'infinito', 'infinity'] },
  { label: 'Differenziale', latex: '\\,d', group: 'Analisi', keywords: ['dx', 'differenziale', 'd'], preview: 'dx' },

  // Functions
  { label: 'Seno', latex: '\\sin', group: 'Funzioni', keywords: ['sin', 'seno'] },
  { label: 'Coseno', latex: '\\cos', group: 'Funzioni', keywords: ['cos', 'coseno'] },
  { label: 'Tangente', latex: '\\tan', group: 'Funzioni', keywords: ['tan', 'tangente'] },
  { label: 'Arcotangente', latex: '\\arctan', group: 'Funzioni', keywords: ['arctan', 'arcotangente'] },
  { label: 'Logaritmo', latex: '\\log_{}', group: 'Funzioni', keywords: ['log', 'logaritmo'], preview: '\\log_{\\square}' },
  { label: 'Logaritmo naturale', latex: '\\ln', group: 'Funzioni', keywords: ['ln', 'naturale', 'neperiano'] },
  { label: 'Esponenziale', latex: 'e^{}', group: 'Funzioni', keywords: ['exp', 'esponenziale', 'e'], preview: 'e^{\\square}' },
  { label: 'Massimo', latex: '\\max', group: 'Funzioni', keywords: ['max', 'massimo'] },
  { label: 'Minimo', latex: '\\min', group: 'Funzioni', keywords: ['min', 'minimo'] },

  // Relations
  { label: 'Minore o uguale', latex: '\\leq ', group: 'Relazioni', keywords: ['leq', 'minore', '<='] },
  { label: 'Maggiore o uguale', latex: '\\geq ', group: 'Relazioni', keywords: ['geq', 'maggiore', '>='] },
  { label: 'Diverso', latex: '\\neq ', group: 'Relazioni', keywords: ['neq', 'diverso', '!='] },
  { label: 'Circa uguale', latex: '\\approx ', group: 'Relazioni', keywords: ['approx', 'circa', '~'] },
  { label: 'Equivalente', latex: '\\equiv ', group: 'Relazioni', keywords: ['equiv', 'equivalente', 'congruo'] },
  { label: 'Proporzionale', latex: '\\propto ', group: 'Relazioni', keywords: ['propto', 'proporzionale'] },
  { label: 'Implica', latex: '\\Rightarrow ', group: 'Relazioni', keywords: ['implica', 'implies', '=>'] },
  { label: 'Se e solo se', latex: '\\iff ', group: 'Relazioni', keywords: ['iff', 'sse', 'equivale'] },
  { label: 'Tende a', latex: '\\to ', group: 'Relazioni', keywords: ['to', 'tende', 'freccia', '->'] },

  // Sets and logic
  { label: 'Appartiene', latex: '\\in ', group: 'Insiemi', keywords: ['in', 'appartiene', 'elemento'] },
  { label: 'Non appartiene', latex: '\\notin ', group: 'Insiemi', keywords: ['notin', 'non appartiene'] },
  { label: 'Sottoinsieme', latex: '\\subseteq ', group: 'Insiemi', keywords: ['subset', 'sottoinsieme', 'incluso'] },
  { label: 'Unione', latex: '\\cup ', group: 'Insiemi', keywords: ['cup', 'unione', 'union'] },
  { label: 'Intersezione', latex: '\\cap ', group: 'Insiemi', keywords: ['cap', 'intersezione'] },
  { label: 'Insieme vuoto', latex: '\\emptyset ', group: 'Insiemi', keywords: ['empty', 'vuoto'] },
  { label: 'Per ogni', latex: '\\forall ', group: 'Insiemi', keywords: ['forall', 'per ogni', 'quantificatore'] },
  { label: 'Esiste', latex: '\\exists ', group: 'Insiemi', keywords: ['exists', 'esiste'] },
  { label: 'Numeri naturali', latex: '\\mathbb{N}', group: 'Insiemi', keywords: ['naturali', 'N'] },
  { label: 'Numeri interi', latex: '\\mathbb{Z}', group: 'Insiemi', keywords: ['interi', 'Z'] },
  { label: 'Numeri razionali', latex: '\\mathbb{Q}', group: 'Insiemi', keywords: ['razionali', 'Q'] },
  { label: 'Numeri reali', latex: '\\mathbb{R}', group: 'Insiemi', keywords: ['reali', 'R'] },
  { label: 'Numeri complessi', latex: '\\mathbb{C}', group: 'Insiemi', keywords: ['complessi', 'C'] },

  // Operators
  { label: 'Per (·)', latex: '\\cdot ', group: 'Operatori', keywords: ['cdot', 'per', 'prodotto', '*'] },
  { label: 'Per (×)', latex: '\\times ', group: 'Operatori', keywords: ['times', 'per', 'croce', 'x'] },
  { label: 'Diviso', latex: '\\div ', group: 'Operatori', keywords: ['div', 'diviso'] },
  { label: 'Più o meno', latex: '\\pm ', group: 'Operatori', keywords: ['pm', 'piu meno', '+-'] },
  { label: 'Gradi', latex: '^{\\circ}', group: 'Operatori', keywords: ['gradi', 'degree', 'circ'], preview: '90^{\\circ}' },
  { label: 'Angolo', latex: '\\angle ', group: 'Operatori', keywords: ['angle', 'angolo'] },
  { label: 'Perpendicolare', latex: '\\perp ', group: 'Operatori', keywords: ['perp', 'perpendicolare', 'ortogonale'] },
  { label: 'Parallelo', latex: '\\parallel ', group: 'Operatori', keywords: ['parallel', 'parallelo'] },
  { label: 'Vettore', latex: '\\vec{}', group: 'Operatori', keywords: ['vec', 'vettore'], preview: '\\vec{v}' },
  { label: 'Cappello', latex: '\\hat{}', group: 'Operatori', keywords: ['hat', 'cappello', 'versore'], preview: '\\hat{u}' },
  { label: 'Media (barra)', latex: '\\overline{}', group: 'Operatori', keywords: ['bar', 'media', 'overline'], preview: '\\overline{x}' },

  // Greek
  { label: 'alfa', latex: '\\alpha ', group: 'Greco', keywords: ['alpha', 'alfa'] },
  { label: 'beta', latex: '\\beta ', group: 'Greco', keywords: ['beta'] },
  { label: 'gamma', latex: '\\gamma ', group: 'Greco', keywords: ['gamma'] },
  { label: 'delta', latex: '\\delta ', group: 'Greco', keywords: ['delta'] },
  { label: 'Delta (maiuscolo)', latex: '\\Delta ', group: 'Greco', keywords: ['Delta', 'variazione'] },
  { label: 'epsilon', latex: '\\varepsilon ', group: 'Greco', keywords: ['epsilon', 'eps'] },
  { label: 'zeta', latex: '\\zeta ', group: 'Greco', keywords: ['zeta'] },
  { label: 'eta', latex: '\\eta ', group: 'Greco', keywords: ['eta'] },
  { label: 'theta', latex: '\\theta ', group: 'Greco', keywords: ['theta'] },
  { label: 'lambda', latex: '\\lambda ', group: 'Greco', keywords: ['lambda'] },
  { label: 'Lambda (maiuscolo)', latex: '\\Lambda ', group: 'Greco', keywords: ['Lambda'] },
  { label: 'mu', latex: '\\mu ', group: 'Greco', keywords: ['mu', 'mi'] },
  { label: 'nu', latex: '\\nu ', group: 'Greco', keywords: ['nu'] },
  { label: 'xi', latex: '\\xi ', group: 'Greco', keywords: ['xi'] },
  { label: 'pi', latex: '\\pi ', group: 'Greco', keywords: ['pi', 'pigreco'] },
  { label: 'rho', latex: '\\rho ', group: 'Greco', keywords: ['rho', 'ro'] },
  { label: 'sigma', latex: '\\sigma ', group: 'Greco', keywords: ['sigma'] },
  { label: 'Sigma (maiuscolo)', latex: '\\Sigma ', group: 'Greco', keywords: ['Sigma'] },
  { label: 'tau', latex: '\\tau ', group: 'Greco', keywords: ['tau'] },
  { label: 'phi', latex: '\\varphi ', group: 'Greco', keywords: ['phi', 'fi'] },
  { label: 'Phi (maiuscolo)', latex: '\\Phi ', group: 'Greco', keywords: ['Phi', 'flusso'] },
  { label: 'chi', latex: '\\chi ', group: 'Greco', keywords: ['chi'] },
  { label: 'psi', latex: '\\psi ', group: 'Greco', keywords: ['psi'] },
  { label: 'omega', latex: '\\omega ', group: 'Greco', keywords: ['omega'] },
  { label: 'Omega (maiuscolo)', latex: '\\Omega ', group: 'Greco', keywords: ['Omega', 'ohm'] },
];

/** What the picker renders: holes become visible squares. */
export function symbolPreview(symbol: MathSymbol) {
  if (symbol.preview) return symbol.preview;
  return symbol.latex.replace(/\{\}/g, '{\\square}').replace(/\[\]/g, '[\\square]');
}

/** Commands that build a structure around something, rather than a glyph. */
const STRUCTURES = /^\\(frac|sqrt|binom|begin|int|iint|oint|sum|prod|lim)\b/;

/** A skeleton to fill in, as opposed to a single glyph like α or ≤. */
export function isTemplate(latex: string) {
  return /\{\}|\[\]/.test(latex) || STRUCTURES.test(latex.trim());
}

/**
 * Puts a symbol into the document from outside a formula. Skeletons open a
 * display formula in the maths field, caret in the first hole; a lone glyph
 * goes inline, with the caret left after it so it renders straight away
 * rather than showing its source.
 */
export function insertSymbol(editor: Editor, latex: string) {
  if (isTemplate(latex)) return editor.chain().focus().insertMathTemplate(latex).run();
  // The trailing space matters: inline maths shows its own source while the
  // caret is still between the dollars, so the caret has to end up past them.
  return editor.chain().focus().insertContent(`$${latex.trim()}$ `).run();
}

/** The catalogue split into its groups, in catalogue order. */
export function symbolGroups(): Array<[string, MathSymbol[]]> {
  const groups = new Map<string, MathSymbol[]>();
  for (const symbol of MATH_SYMBOLS) {
    if (!groups.has(symbol.group)) groups.set(symbol.group, []);
    groups.get(symbol.group)!.push(symbol);
  }
  return [...groups.entries()];
}
