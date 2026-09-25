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
  { label: 'Parte intera', latex: '\\left\\lfloor\\right\\rfloor', group: 'Strutture', keywords: ['floor', 'parte intera', 'pavimento'], preview: '\\lfloor \\square \\rfloor' },
  { label: 'Parte intera superiore', latex: '\\left\\lceil\\right\\rceil', group: 'Strutture', keywords: ['ceil', 'soffitto', 'parte intera'], preview: '\\lceil \\square \\rceil' },
  { label: 'Sistema', latex: '\\begin{cases}  \\\\  \\end{cases}', group: 'Strutture', keywords: ['cases', 'sistema', 'graffa'], preview: '\\begin{cases}\\square\\\\\\square\\end{cases}' },
  { label: 'Matrice 2x2', latex: '\\begin{pmatrix}  &  \\\\  &  \\end{pmatrix}', group: 'Strutture', keywords: ['matrix', 'matrice', 'pmatrix'] },
  { label: 'Binomiale', latex: '\\binom{}{}', group: 'Strutture', keywords: ['binom', 'binomiale', 'coefficiente'] },

  // Logic and the shape of a statement
  { label: 'Per ogni', latex: '\\forall ', group: 'Logica', keywords: ['forall', 'per ogni', 'quantificatore', 'universale'] },
  { label: 'Esiste', latex: '\\exists ', group: 'Logica', keywords: ['exists', 'esiste', 'quantificatore'] },
  { label: 'Esiste ed è unico', latex: '\\exists! ', group: 'Logica', keywords: ['esiste unico', 'exists unique', 'unicita'] },
  { label: 'Non esiste', latex: '\\nexists ', group: 'Logica', keywords: ['non esiste', 'nexists', 'negazione'] },
  { label: 'Tale che ( : )', latex: ':', group: 'Logica', keywords: ['tale che', 'tc', 'such that', 'due punti'] },
  { label: 'Tale che ( | )', latex: '\\mid ', group: 'Logica', keywords: ['tale che', 'tc', 'such that', 'barra', 'divide'] },
  { label: 'Non', latex: '\\neg ', group: 'Logica', keywords: ['not', 'non', 'negazione', 'neg'] },
  { label: 'E (and)', latex: '\\land ', group: 'Logica', keywords: ['and', 'et', 'congiunzione', 'land'] },
  { label: 'O (or)', latex: '\\lor ', group: 'Logica', keywords: ['or', 'vel', 'disgiunzione', 'lor'] },
  { label: 'O esclusivo', latex: '\\veebar ', group: 'Logica', keywords: ['xor', 'aut', 'esclusivo'] },
  { label: 'Implica', latex: '\\Rightarrow ', group: 'Logica', keywords: ['implica', 'implies', '=>', 'freccia'] },
  { label: 'Non implica', latex: '\\nRightarrow ', group: 'Logica', keywords: ['non implica', 'not implies', 'negazione'] },
  { label: 'Implicato da', latex: '\\Leftarrow ', group: 'Logica', keywords: ['implicato', 'se', 'freccia sinistra'] },
  { label: 'Se e solo se', latex: '\\iff ', group: 'Logica', keywords: ['iff', 'sse', 'equivale', 'doppia implicazione'] },
  { label: 'Non equivale', latex: '\\nLeftrightarrow ', group: 'Logica', keywords: ['non equivale', 'non sse', 'negazione'] },
  { label: 'Quindi', latex: '\\therefore ', group: 'Logica', keywords: ['quindi', 'therefore', 'dunque'] },
  { label: 'Poiché', latex: '\\because ', group: 'Logica', keywords: ['poiche', 'because', 'siccome'] },
  { label: 'Deduce (turnstile)', latex: '\\vdash ', group: 'Logica', keywords: ['vdash', 'deduce', 'dimostra'] },
  { label: 'Non deduce', latex: '\\nvdash ', group: 'Logica', keywords: ['non deduce', 'nvdash', 'negazione'] },
  { label: 'Soddisfa', latex: '\\models ', group: 'Logica', keywords: ['models', 'soddisfa', 'modello'] },
  { label: 'Fine dimostrazione', latex: '\\blacksquare ', group: 'Logica', keywords: ['qed', 'cvd', 'fine dimostrazione', 'quadrato'] },

  // Sets
  { label: 'Appartiene', latex: '\\in ', group: 'Insiemi', keywords: ['in', 'appartiene', 'elemento'] },
  { label: 'Non appartiene', latex: '\\notin ', group: 'Insiemi', keywords: ['notin', 'non appartiene', 'negazione'] },
  { label: 'Contiene (elemento)', latex: '\\ni ', group: 'Insiemi', keywords: ['ni', 'contiene elemento'] },
  { label: 'Sottoinsieme', latex: '\\subseteq ', group: 'Insiemi', keywords: ['subset', 'sottoinsieme', 'incluso', 'contenuto'] },
  { label: 'Non è sottoinsieme', latex: '\\nsubseteq ', group: 'Insiemi', keywords: ['non sottoinsieme', 'nsubseteq', 'non incluso', 'negazione'] },
  { label: 'Sottoinsieme proprio', latex: '\\subsetneq ', group: 'Insiemi', keywords: ['sottoinsieme proprio', 'strettamente incluso'] },
  { label: 'Sovrainsieme', latex: '\\supseteq ', group: 'Insiemi', keywords: ['supset', 'sovrainsieme', 'contiene'] },
  { label: 'Non è sovrainsieme', latex: '\\nsupseteq ', group: 'Insiemi', keywords: ['non contiene', 'nsupseteq', 'negazione'] },
  { label: 'Unione', latex: '\\cup ', group: 'Insiemi', keywords: ['cup', 'unione', 'union'] },
  { label: 'Intersezione', latex: '\\cap ', group: 'Insiemi', keywords: ['cap', 'intersezione'] },
  { label: 'Unione grande', latex: '\\bigcup_{}^{} ', group: 'Insiemi', keywords: ['bigcup', 'unione', 'famiglia'] },
  { label: 'Intersezione grande', latex: '\\bigcap_{}^{} ', group: 'Insiemi', keywords: ['bigcap', 'intersezione', 'famiglia'] },
  { label: 'Differenza', latex: '\\setminus ', group: 'Insiemi', keywords: ['setminus', 'differenza', 'meno', 'privato di'] },
  { label: 'Complementare', latex: '\\complement ', group: 'Insiemi', keywords: ['complementare', 'complement'] },
  { label: 'Insieme vuoto', latex: '\\varnothing ', group: 'Insiemi', keywords: ['empty', 'vuoto', 'insieme vuoto'] },
  { label: 'Prodotto cartesiano', latex: '\\times ', group: 'Insiemi', keywords: ['cartesiano', 'times', 'prodotto'] },
  { label: 'Numeri naturali', latex: '\\mathbb{N}', group: 'Insiemi', keywords: ['naturali', 'N'] },
  { label: 'Numeri interi', latex: '\\mathbb{Z}', group: 'Insiemi', keywords: ['interi', 'Z'] },
  { label: 'Numeri razionali', latex: '\\mathbb{Q}', group: 'Insiemi', keywords: ['razionali', 'Q'] },
  { label: 'Numeri reali', latex: '\\mathbb{R}', group: 'Insiemi', keywords: ['reali', 'R'] },
  { label: 'Numeri complessi', latex: '\\mathbb{C}', group: 'Insiemi', keywords: ['complessi', 'C'] },
  { label: 'Aleph', latex: '\\aleph ', group: 'Insiemi', keywords: ['aleph', 'cardinalita', 'infinito'] },

  // Relations, each with its negation next to it
  { label: 'Uguale', latex: '=', group: 'Relazioni', keywords: ['uguale', 'equal', '='] },
  { label: 'Diverso', latex: '\\neq ', group: 'Relazioni', keywords: ['neq', 'diverso', 'non uguale', '!=', 'negazione'] },
  { label: 'Definito come', latex: '\\coloneqq ', group: 'Relazioni', keywords: ['definizione', 'coloneqq', ':=', 'def'] },
  { label: 'Minore', latex: '<', group: 'Relazioni', keywords: ['minore', 'less', '<'] },
  { label: 'Non minore', latex: '\\nless ', group: 'Relazioni', keywords: ['non minore', 'nless', 'negazione'] },
  { label: 'Maggiore', latex: '>', group: 'Relazioni', keywords: ['maggiore', 'greater', '>'] },
  { label: 'Non maggiore', latex: '\\ngtr ', group: 'Relazioni', keywords: ['non maggiore', 'ngtr', 'negazione'] },
  { label: 'Minore o uguale', latex: '\\leq ', group: 'Relazioni', keywords: ['leq', 'minore uguale', '<='] },
  { label: 'Non minore o uguale', latex: '\\nleq ', group: 'Relazioni', keywords: ['nleq', 'non minore uguale', 'negazione'] },
  { label: 'Maggiore o uguale', latex: '\\geq ', group: 'Relazioni', keywords: ['geq', 'maggiore uguale', '>='] },
  { label: 'Non maggiore o uguale', latex: '\\ngeq ', group: 'Relazioni', keywords: ['ngeq', 'non maggiore uguale', 'negazione'] },
  { label: 'Molto minore', latex: '\\ll ', group: 'Relazioni', keywords: ['molto minore', 'll'] },
  { label: 'Molto maggiore', latex: '\\gg ', group: 'Relazioni', keywords: ['molto maggiore', 'gg'] },
  { label: 'Circa uguale', latex: '\\approx ', group: 'Relazioni', keywords: ['approx', 'circa', '~'] },
  { label: 'Non circa uguale', latex: '\\not\\approx ', group: 'Relazioni', keywords: ['non circa', 'negazione'] },
  { label: 'Equivalente', latex: '\\equiv ', group: 'Relazioni', keywords: ['equiv', 'equivalente', 'congruo'] },
  { label: 'Non equivalente', latex: '\\not\\equiv ', group: 'Relazioni', keywords: ['non equivalente', 'negazione'] },
  { label: 'Simile', latex: '\\sim ', group: 'Relazioni', keywords: ['sim', 'simile', 'asintotico'] },
  { label: 'Non simile', latex: '\\nsim ', group: 'Relazioni', keywords: ['non simile', 'nsim', 'negazione'] },
  { label: 'Congruente', latex: '\\cong ', group: 'Relazioni', keywords: ['cong', 'congruente', 'isomorfo'] },
  { label: 'Non congruente', latex: '\\ncong ', group: 'Relazioni', keywords: ['non congruente', 'ncong', 'negazione'] },
  { label: 'Proporzionale', latex: '\\propto ', group: 'Relazioni', keywords: ['propto', 'proporzionale'] },
  { label: 'Tende a', latex: '\\to ', group: 'Relazioni', keywords: ['to', 'tende', 'freccia', '->'] },
  { label: 'Mappa in', latex: '\\mapsto ', group: 'Relazioni', keywords: ['mapsto', 'mappa', 'funzione'] },
  { label: 'Divide', latex: '\\mid ', group: 'Relazioni', keywords: ['divide', 'divisibile', 'mid'] },
  { label: 'Non divide', latex: '\\nmid ', group: 'Relazioni', keywords: ['non divide', 'nmid', 'negazione'] },
  { label: 'Parallelo', latex: '\\parallel ', group: 'Relazioni', keywords: ['parallel', 'parallelo'] },
  { label: 'Non parallelo', latex: '\\nparallel ', group: 'Relazioni', keywords: ['non parallelo', 'nparallel', 'negazione'] },
  { label: 'Perpendicolare', latex: '\\perp ', group: 'Relazioni', keywords: ['perp', 'perpendicolare', 'ortogonale'] },

  // Analysis
  { label: 'Integrale', latex: '\\int_{}^{}', group: 'Analisi', keywords: ['int', 'integrale', 'integral'] },
  { label: 'Integrale indefinito', latex: '\\int ', group: 'Analisi', keywords: ['int', 'integrale', 'indefinito'] },
  { label: 'Integrale doppio', latex: '\\iint_{}', group: 'Analisi', keywords: ['iint', 'doppio', 'double'] },
  { label: 'Integrale di linea', latex: '\\oint_{}', group: 'Analisi', keywords: ['oint', 'linea', 'circuitazione'] },
  { label: 'Sommatoria', latex: '\\sum_{}^{}', group: 'Analisi', keywords: ['sum', 'somma', 'sommatoria', 'serie', 'sigma'] },
  { label: 'Produttoria', latex: '\\prod_{}^{}', group: 'Analisi', keywords: ['prod', 'produttoria', 'product'] },
  { label: 'Limite', latex: '\\lim_{ \\to }', group: 'Analisi', keywords: ['lim', 'limite', 'limit'] },
  { label: 'Derivata', latex: '\\frac{d}{dx}', group: 'Analisi', keywords: ['der', 'derivata', 'derivative'] },
  { label: 'Derivata parziale', latex: '\\frac{\\partial }{\\partial }', group: 'Analisi', keywords: ['partial', 'parziale', 'derivata'] },
  { label: 'Nabla / gradiente', latex: '\\nabla ', group: 'Analisi', keywords: ['nabla', 'gradiente', 'grad'] },
  { label: 'Infinito', latex: '\\infty ', group: 'Analisi', keywords: ['inf', 'infinito', 'infinity'] },
  { label: 'Differenziale', latex: '\\,\\mathrm{d}', group: 'Analisi', keywords: ['dx', 'differenziale', 'd'], preview: '\\mathrm{d}x' },

  // Functions
  { label: 'Seno', latex: '\\sin', group: 'Funzioni', keywords: ['sin', 'seno'] },
  { label: 'Coseno', latex: '\\cos', group: 'Funzioni', keywords: ['cos', 'coseno'] },
  { label: 'Tangente', latex: '\\tan', group: 'Funzioni', keywords: ['tan', 'tangente'] },
  { label: 'Arcotangente', latex: '\\arctan', group: 'Funzioni', keywords: ['arctan', 'arcotangente'] },
  { label: 'Logaritmo', latex: '\\log_{}', group: 'Funzioni', keywords: ['log', 'logaritmo'], preview: '\\log_{\\square}' },
  { label: 'Logaritmo naturale', latex: '\\ln', group: 'Funzioni', keywords: ['ln', 'naturale', 'neperiano'] },
  { label: 'Esponenziale', latex: 'e^{}', group: 'Funzioni', keywords: ['exp', 'esponenziale', 'e'], preview: 'e^{\\square}' },
  { label: 'Composizione', latex: '\\circ ', group: 'Funzioni', keywords: ['composizione', 'circ', 'composta'] },
  { label: 'Massimo', latex: '\\max', group: 'Funzioni', keywords: ['max', 'massimo'] },
  { label: 'Minimo', latex: '\\min', group: 'Funzioni', keywords: ['min', 'minimo'] },
  { label: 'Estremo superiore', latex: '\\sup', group: 'Funzioni', keywords: ['sup', 'estremo superiore'] },
  { label: 'Estremo inferiore', latex: '\\inf', group: 'Funzioni', keywords: ['inf', 'estremo inferiore'] },

  // Operators and decorations
  { label: 'Per (·)', latex: '\\cdot ', group: 'Operatori', keywords: ['cdot', 'per', 'prodotto', '*'] },
  { label: 'Per (x)', latex: '\\times ', group: 'Operatori', keywords: ['times', 'per', 'croce'] },
  { label: 'Diviso', latex: '\\div ', group: 'Operatori', keywords: ['div', 'diviso'] },
  { label: 'Più o meno', latex: '\\pm ', group: 'Operatori', keywords: ['pm', 'piu meno', '+-'] },
  { label: 'Meno o più', latex: '\\mp ', group: 'Operatori', keywords: ['mp', 'meno piu'] },
  { label: 'Somma diretta', latex: '\\oplus ', group: 'Operatori', keywords: ['oplus', 'somma diretta'] },
  { label: 'Gradi', latex: '^{\\circ}', group: 'Operatori', keywords: ['gradi', 'degree', 'circ'], preview: '90^{\\circ}' },
  { label: 'Angolo', latex: '\\angle ', group: 'Operatori', keywords: ['angle', 'angolo'] },
  { label: 'Vettore', latex: '\\vec{}', group: 'Operatori', keywords: ['vec', 'vettore'], preview: '\\vec{v}' },
  { label: 'Cappello', latex: '\\hat{}', group: 'Operatori', keywords: ['hat', 'cappello', 'versore'], preview: '\\hat{u}' },
  { label: 'Media (barra)', latex: '\\overline{}', group: 'Operatori', keywords: ['bar', 'media', 'overline'], preview: '\\overline{x}' },
  { label: 'Tilde', latex: '\\tilde{}', group: 'Operatori', keywords: ['tilde', 'approssimato'], preview: '\\tilde{x}' },
  { label: 'Punti orizzontali', latex: '\\dots ', group: 'Operatori', keywords: ['dots', 'puntini', 'ellissi'] },

  // The Greek alphabet, lower case then the capitals that differ
  { label: 'alfa', latex: '\\alpha ', group: 'Greco', keywords: ['alfa', 'alpha', 'greco'] },
  { label: 'beta', latex: '\\beta ', group: 'Greco', keywords: ['beta', 'beta', 'greco'] },
  { label: 'gamma', latex: '\\gamma ', group: 'Greco', keywords: ['gamma', 'gamma', 'greco'] },
  { label: 'delta', latex: '\\delta ', group: 'Greco', keywords: ['delta', 'delta', 'greco'] },
  { label: 'epsilon', latex: '\\varepsilon ', group: 'Greco', keywords: ['epsilon', 'varepsilon', 'greco'] },
  { label: 'zeta', latex: '\\zeta ', group: 'Greco', keywords: ['zeta', 'zeta', 'greco'] },
  { label: 'eta', latex: '\\eta ', group: 'Greco', keywords: ['eta', 'eta', 'greco'] },
  { label: 'theta', latex: '\\theta ', group: 'Greco', keywords: ['theta', 'theta', 'greco'] },
  { label: 'iota', latex: '\\iota ', group: 'Greco', keywords: ['iota', 'iota', 'greco'] },
  { label: 'kappa', latex: '\\kappa ', group: 'Greco', keywords: ['kappa', 'kappa', 'greco'] },
  { label: 'lambda', latex: '\\lambda ', group: 'Greco', keywords: ['lambda', 'lambda', 'greco'] },
  { label: 'mu', latex: '\\mu ', group: 'Greco', keywords: ['mu', 'mu', 'greco'] },
  { label: 'nu', latex: '\\nu ', group: 'Greco', keywords: ['nu', 'nu', 'greco'] },
  { label: 'xi', latex: '\\xi ', group: 'Greco', keywords: ['xi', 'xi', 'greco'] },
  { label: 'pi', latex: '\\pi ', group: 'Greco', keywords: ['pi', 'pi', 'greco'] },
  { label: 'rho', latex: '\\rho ', group: 'Greco', keywords: ['rho', 'rho', 'greco'] },
  { label: 'sigma', latex: '\\sigma ', group: 'Greco', keywords: ['sigma', 'sigma', 'greco'] },
  { label: 'tau', latex: '\\tau ', group: 'Greco', keywords: ['tau', 'tau', 'greco'] },
  { label: 'upsilon', latex: '\\upsilon ', group: 'Greco', keywords: ['upsilon', 'upsilon', 'greco'] },
  { label: 'phi', latex: '\\varphi ', group: 'Greco', keywords: ['phi', 'varphi', 'greco'] },
  { label: 'chi', latex: '\\chi ', group: 'Greco', keywords: ['chi', 'chi', 'greco'] },
  { label: 'psi', latex: '\\psi ', group: 'Greco', keywords: ['psi', 'psi', 'greco'] },
  { label: 'omega', latex: '\\omega ', group: 'Greco', keywords: ['omega', 'omega', 'greco'] },
  { label: 'Gamma (maiuscolo)', latex: '\\Gamma ', group: 'Greco', keywords: ['Gamma', 'Gamma', 'greco', 'maiuscolo'] },
  { label: 'Delta (maiuscolo)', latex: '\\Delta ', group: 'Greco', keywords: ['Delta', 'Delta', 'greco', 'maiuscolo'] },
  { label: 'Theta (maiuscolo)', latex: '\\Theta ', group: 'Greco', keywords: ['Theta', 'Theta', 'greco', 'maiuscolo'] },
  { label: 'Lambda (maiuscolo)', latex: '\\Lambda ', group: 'Greco', keywords: ['Lambda', 'Lambda', 'greco', 'maiuscolo'] },
  { label: 'Xi (maiuscolo)', latex: '\\Xi ', group: 'Greco', keywords: ['Xi', 'Xi', 'greco', 'maiuscolo'] },
  { label: 'Pi (maiuscolo)', latex: '\\Pi ', group: 'Greco', keywords: ['Pi', 'Pi', 'greco', 'maiuscolo'] },
  { label: 'Sigma (maiuscolo)', latex: '\\Sigma ', group: 'Greco', keywords: ['Sigma', 'Sigma', 'greco', 'maiuscolo'] },
  { label: 'Upsilon (maiuscolo)', latex: '\\Upsilon ', group: 'Greco', keywords: ['Upsilon', 'Upsilon', 'greco', 'maiuscolo'] },
  { label: 'Phi (maiuscolo)', latex: '\\Phi ', group: 'Greco', keywords: ['Phi', 'Phi', 'greco', 'maiuscolo'] },
  { label: 'Psi (maiuscolo)', latex: '\\Psi ', group: 'Greco', keywords: ['Psi', 'Psi', 'greco', 'maiuscolo'] },
  { label: 'Omega (maiuscolo)', latex: '\\Omega ', group: 'Greco', keywords: ['Omega', 'Omega', 'greco', 'maiuscolo'] },
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
