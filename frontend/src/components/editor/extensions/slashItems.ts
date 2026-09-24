import type { Editor, Range } from '@tiptap/core';
import {
  Braces,
  Brackets,
  Code2,
  FunctionSquare,
  Grid3x3,
  Heading1,
  Heading2,
  Heading3,
  Image as ImageIcon,
  List,
  ListChecks,
  ListOrdered,
  Minus,
  Quote,
  Radical,
  Sigma,
  Table as TableIcon,
  TrendingUp,
  type LucideIcon,
} from 'lucide-react';
import { THEOREM_ORDER, THEOREM_VARIANTS } from './TheoremBlock';

export interface SlashItem {
  title: string;
  hint: string;
  group: string;
  keywords: string[];
  icon: LucideIcon;
  run: (editor: Editor, range: Range, helpers: { pickImage: () => void }) => void;
}

/**
 * Insert a display formula pre-filled with a skeleton. Empty `{}` groups
 * become holes the caret lands in and Tab walks between.
 */
function mathTemplate(title: string, hint: string, latex: string, keywords: string[], icon: LucideIcon): SlashItem {
  return {
    title,
    hint,
    group: 'Matematica',
    keywords,
    icon,
    run: (editor, range) => editor.chain().focus().deleteRange(range).insertMathTemplate(latex).run(),
  };
}

export const SLASH_ITEMS: SlashItem[] = [
  {
    title: 'Titolo 1',
    hint: 'Intestazione di sezione',
    group: 'Base',
    keywords: ['h1', 'titolo', 'heading'],
    icon: Heading1,
    run: (editor, range) => editor.chain().focus().deleteRange(range).setNode('heading', { level: 1 }).run(),
  },
  {
    title: 'Titolo 2',
    hint: 'Sottosezione',
    group: 'Base',
    keywords: ['h2', 'titolo', 'heading'],
    icon: Heading2,
    run: (editor, range) => editor.chain().focus().deleteRange(range).setNode('heading', { level: 2 }).run(),
  },
  {
    title: 'Titolo 3',
    hint: 'Sotto-sottosezione',
    group: 'Base',
    keywords: ['h3', 'titolo', 'heading'],
    icon: Heading3,
    run: (editor, range) => editor.chain().focus().deleteRange(range).setNode('heading', { level: 3 }).run(),
  },
  {
    title: 'Elenco puntato',
    hint: 'Lista non numerata',
    group: 'Base',
    keywords: ['lista', 'bullet', 'punti'],
    icon: List,
    run: (editor, range) => editor.chain().focus().deleteRange(range).toggleBulletList().run(),
  },
  {
    title: 'Elenco numerato',
    hint: 'Lista ordinata',
    group: 'Base',
    keywords: ['lista', 'numeri', 'ordered'],
    icon: ListOrdered,
    run: (editor, range) => editor.chain().focus().deleteRange(range).toggleOrderedList().run(),
  },
  {
    title: 'Checklist',
    hint: 'Cose da fare',
    group: 'Base',
    keywords: ['todo', 'task', 'spunta'],
    icon: ListChecks,
    run: (editor, range) => editor.chain().focus().deleteRange(range).toggleTaskList().run(),
  },
  {
    title: 'Citazione',
    hint: 'Blocco citato',
    group: 'Base',
    keywords: ['quote', 'citazione'],
    icon: Quote,
    run: (editor, range) => editor.chain().focus().deleteRange(range).toggleBlockquote().run(),
  },
  {
    title: 'Codice',
    hint: 'Blocco di codice',
    group: 'Base',
    keywords: ['code', 'codice', 'pre'],
    icon: Code2,
    run: (editor, range) => editor.chain().focus().deleteRange(range).toggleCodeBlock().run(),
  },
  {
    title: 'Tabella',
    hint: '3 × 3 con intestazione',
    group: 'Base',
    keywords: ['table', 'tabella', 'griglia'],
    icon: TableIcon,
    run: (editor, range) =>
      editor.chain().focus().deleteRange(range).insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(),
  },
  {
    title: 'Immagine',
    hint: 'Carica un file',
    group: 'Base',
    keywords: ['image', 'immagine', 'foto'],
    icon: ImageIcon,
    run: (editor, range, { pickImage }) => {
      editor.chain().focus().deleteRange(range).run();
      pickImage();
    },
  },
  {
    title: 'Divisore',
    hint: 'Linea orizzontale',
    group: 'Base',
    keywords: ['hr', 'linea', 'separatore'],
    icon: Minus,
    run: (editor, range) => editor.chain().focus().deleteRange(range).setHorizontalRule().run(),
  },

  {
    title: 'Formula inline',
    hint: 'Matematica dentro il testo — $…$',
    group: 'Matematica',
    keywords: ['math', 'formula', 'latex', 'katex', 'inline'],
    icon: FunctionSquare,
    run: (editor, range) => editor.chain().focus().deleteRange(range).insertInlineMath().run(),
  },
  {
    title: 'Formula in display',
    hint: 'Formula centrata su riga propria',
    group: 'Matematica',
    keywords: ['math', 'formula', 'latex', 'display', 'equazione'],
    icon: Sigma,
    run: (editor, range) => editor.chain().focus().deleteRange(range).setMathBlock().run(),
  },
  mathTemplate('Limite', 'lim per x → x₀', '\\lim_{{} \\to {}} {}', ['limite', 'lim'], TrendingUp),
  mathTemplate('Integrale', 'Integrale definito', '\\int_{}^{} {}\\,dx', ['integrale', 'int'], Radical),
  mathTemplate('Sommatoria', 'Serie o somma finita', '\\sum_{}^{} {}', ['somma', 'serie', 'sum'], Sigma),
  mathTemplate('Derivata', 'Rapporto incrementale', "f'(x) = \\lim_{h \\to 0} \\frac{f(x+h) - f(x)}{h}", ['derivata', 'diff'], FunctionSquare),
  mathTemplate('Frazione', 'a fratto b', '\\frac{}{}', ['frazione', 'frac'], Braces),
  mathTemplate(
    'Matrice',
    'Matrice 2 × 2',
    '\\begin{pmatrix} {} & {} \\\\ {} & {} \\end{pmatrix}',
    ['matrice', 'matrix', 'pmatrix'],
    Grid3x3
  ),
  mathTemplate(
    'Sistema',
    'Sistema di equazioni',
    '\\begin{cases} {} \\\\ {} \\end{cases}',
    ['sistema', 'cases', 'graffa'],
    Brackets
  ),
  mathTemplate(
    'Passaggi allineati',
    'Catena di uguaglianze',
    '\\begin{aligned} {} &= {} \\\\ &= {} \\end{aligned}',
    ['aligned', 'passaggi', 'allineato'],
    Brackets
  ),

  ...THEOREM_ORDER.map<SlashItem>((variant) => ({
    title: THEOREM_VARIANTS[variant].label,
    hint: THEOREM_VARIANTS[variant].numbered ? 'Ambiente numerato' : 'Ambiente non numerato',
    group: 'Ambienti',
    keywords: [variant, 'ambiente', 'teorema', 'environment'],
    icon: Quote,
    run: (editor, range) => editor.chain().focus().deleteRange(range).setTheoremBlock(variant).run(),
  })),
];

export function filterSlashItems(query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return SLASH_ITEMS;
  return SLASH_ITEMS.filter(
    (item) =>
      item.title.toLowerCase().includes(q) || item.keywords.some((k) => k.toLowerCase().includes(q))
  );
}
