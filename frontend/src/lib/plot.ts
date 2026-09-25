/**
 * A small, safe expression evaluator and sampler for function graphs.
 *
 * Deliberately not `eval`: notes are shared, and a shared page must never be
 * able to run code. The grammar is the one a maths student writes by hand —
 * `3x^2 - 2x`, `sin(2x)/x`, `sqrt(x+1)` — including implicit multiplication.
 */

export type PlotFn = (x: number) => number;

const FUNCTIONS: Record<string, (v: number) => number> = {
  sin: Math.sin,
  cos: Math.cos,
  tan: Math.tan,
  asin: Math.asin,
  acos: Math.acos,
  atan: Math.atan,
  sinh: Math.sinh,
  cosh: Math.cosh,
  tanh: Math.tanh,
  ln: Math.log,
  log: Math.log10,
  sqrt: Math.sqrt,
  abs: Math.abs,
  exp: Math.exp,
  floor: Math.floor,
  ceil: Math.ceil,
  sign: Math.sign,
};

const CONSTANTS: Record<string, number> = { pi: Math.PI, e: Math.E };

type Token =
  | { kind: 'number'; value: number }
  | { kind: 'x' }
  | { kind: 'const'; value: number }
  | { kind: 'fn'; name: string }
  | { kind: 'op'; op: string }
  | { kind: 'open' }
  | { kind: 'close' };

const BINARY: Record<string, { precedence: number; rightAssoc?: boolean; apply: (a: number, b: number) => number }> = {
  '+': { precedence: 1, apply: (a, b) => a + b },
  '-': { precedence: 1, apply: (a, b) => a - b },
  '*': { precedence: 2, apply: (a, b) => a * b },
  '/': { precedence: 2, apply: (a, b) => a / b },
  '^': { precedence: 4, rightAssoc: true, apply: (a, b) => Math.pow(a, b) },
};

function tokenize(input: string): Token[] | null {
  const tokens: Token[] = [];
  const source = input.replace(/\s+/g, '').replace(/−/g, '-').replace(/·|×/g, '*').replace(/÷/g, '/');
  let i = 0;

  const needsImplicitTimes = () => {
    const last = tokens[tokens.length - 1];
    return !!last && (last.kind === 'number' || last.kind === 'x' || last.kind === 'const' || last.kind === 'close');
  };

  while (i < source.length) {
    const char = source[i];

    if (/[0-9.]/.test(char)) {
      const match = /^[0-9]*\.?[0-9]+/.exec(source.slice(i));
      if (!match) return null;
      if (needsImplicitTimes()) tokens.push({ kind: 'op', op: '*' });
      tokens.push({ kind: 'number', value: Number(match[0]) });
      i += match[0].length;
      continue;
    }

    if (/[a-zA-Z]/.test(char)) {
      const name = /^[a-zA-Z]+/.exec(source.slice(i))![0];
      // "2x", "xsin(x)" and "3(x+1)" all mean a product.
      if (needsImplicitTimes()) tokens.push({ kind: 'op', op: '*' });
      if (name in FUNCTIONS) tokens.push({ kind: 'fn', name });
      else if (name in CONSTANTS) tokens.push({ kind: 'const', value: CONSTANTS[name] });
      else if (name === 'x') tokens.push({ kind: 'x' });
      else return null;
      i += name.length;
      continue;
    }

    if (char in BINARY) {
      tokens.push({ kind: 'op', op: char });
      i += 1;
      continue;
    }

    if (char === '(') {
      if (needsImplicitTimes()) tokens.push({ kind: 'op', op: '*' });
      tokens.push({ kind: 'open' });
      i += 1;
      continue;
    }

    if (char === ')') {
      tokens.push({ kind: 'close' });
      i += 1;
      continue;
    }

    return null;
  }

  return tokens;
}

/** Shunting-yard: infix tokens to a reverse-polish program. */
function toRpn(tokens: Token[]): Token[] | null {
  const output: Token[] = [];
  const stack: Token[] = [];
  let previous: Token | null = null;

  for (const token of tokens) {
    if (token.kind === 'number' || token.kind === 'x' || token.kind === 'const') {
      output.push(token);
    } else if (token.kind === 'fn') {
      stack.push(token);
    } else if (token.kind === 'op') {
      // A minus with nothing usable before it negates what follows.
      const unary =
        token.op === '-' &&
        (previous === null || previous.kind === 'open' || previous.kind === 'op' || previous.kind === 'fn');
      if (unary) {
        output.push({ kind: 'number', value: -1 });
        stack.push({ kind: 'op', op: '*' });
      } else {
        const here = BINARY[token.op];
        while (stack.length) {
          const top = stack[stack.length - 1];
          if (top.kind === 'fn') {
            output.push(stack.pop()!);
            continue;
          }
          if (top.kind !== 'op') break;
          const other = BINARY[top.op];
          const takes = here.rightAssoc ? other.precedence > here.precedence : other.precedence >= here.precedence;
          if (!takes) break;
          output.push(stack.pop()!);
        }
        stack.push(token);
      }
    } else if (token.kind === 'open') {
      stack.push(token);
    } else {
      let balanced = false;
      while (stack.length) {
        const top = stack.pop()!;
        if (top.kind === 'open') {
          balanced = true;
          break;
        }
        output.push(top);
      }
      if (!balanced) return null;
      if (stack.length && stack[stack.length - 1].kind === 'fn') output.push(stack.pop()!);
    }
    previous = token;
  }

  while (stack.length) {
    const top = stack.pop()!;
    if (top.kind === 'open') return null;
    output.push(top);
  }
  return output;
}

/** Strips the `f(x) =` a student writes in front of the expression. */
export function stripLabel(expression: string) {
  return expression.replace(/^\s*(?:[a-zA-Z][a-zA-Z0-9]*\s*\(\s*x\s*\)|y)\s*=\s*/i, '').trim();
}

/** Compiles an expression to a function of x, or null if it is not one. */
export function compile(expression: string): PlotFn | null {
  const body = stripLabel(expression);
  if (!body) return null;
  const tokens = tokenize(body);
  if (!tokens || tokens.length === 0) return null;
  const rpn = toRpn(tokens);
  if (!rpn) return null;

  return (x: number) => {
    const stack: number[] = [];
    for (const token of rpn) {
      if (token.kind === 'number') stack.push(token.value);
      else if (token.kind === 'const') stack.push(token.value);
      else if (token.kind === 'x') stack.push(x);
      else if (token.kind === 'fn') {
        const value = stack.pop();
        if (value === undefined) return NaN;
        stack.push(FUNCTIONS[token.name](value));
      } else if (token.kind === 'op') {
        const b = stack.pop();
        const a = stack.pop();
        if (a === undefined || b === undefined) return NaN;
        stack.push(BINARY[token.op].apply(a, b));
      }
    }
    return stack.length === 1 ? stack[0] : NaN;
  };
}

export interface View {
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
}

/**
 * Samples the curve into SVG path data. The path is broken wherever the
 * function is undefined or jumps — so tan(x) and 1/x get their asymptotes
 * instead of a vertical line joining the branches.
 */
export function pathFor(fn: PlotFn, view: View, width: number, height: number, samples = 900) {
  const toX = (x: number) => ((x - view.xMin) / (view.xMax - view.xMin)) * width;
  const toY = (y: number) => height - ((y - view.yMin) / (view.yMax - view.yMin)) * height;
  const span = view.yMax - view.yMin;

  let d = '';
  let pen = false;
  let previous: number | null = null;

  for (let i = 0; i <= samples; i++) {
    const x = view.xMin + ((view.xMax - view.xMin) * i) / samples;
    const y = fn(x);
    const usable = Number.isFinite(y);
    // A jump of more than the whole window between two neighbouring samples
    // is an asymptote, not a line.
    const jumped = usable && previous !== null && Math.abs(y - previous) > span * 2;

    if (!usable || jumped) {
      pen = false;
      previous = usable ? y : null;
      continue;
    }
    // Keep the path short: points far outside the window are clamped, not
    // drawn at absurd coordinates.
    const clamped = Math.min(Math.max(y, view.yMin - span), view.yMax + span);
    d += `${pen ? 'L' : 'M'}${toX(x).toFixed(2)},${toY(clamped).toFixed(2)}`;
    pen = true;
    previous = y;
  }
  return d;
}

/** Grid spacing that lands on 1, 2 or 5 times a power of ten. */
export function niceStep(span: number, target = 8) {
  const raw = span / target;
  const magnitude = Math.pow(10, Math.floor(Math.log10(raw)));
  const normalised = raw / magnitude;
  const step = normalised >= 5 ? 5 : normalised >= 2 ? 2 : 1;
  return step * magnitude;
}

/** Tick labels without floating-point dust: 0.30000000004 → 0.3 */
export function formatTick(value: number, step: number) {
  const decimals = Math.max(0, -Math.floor(Math.log10(step)));
  return value.toFixed(Math.min(decimals, 6)).replace(/\.0+$/, '').replace(/(\.\d*?)0+$/, '$1');
}

const SUPERSCRIPTS: Record<string, string> = {
  '0': '\u2070', '1': '\u00b9', '2': '\u00b2', '3': '\u00b3', '4': '\u2074',
  '5': '\u2075', '6': '\u2076', '7': '\u2077', '8': '\u2078', '9': '\u2079',
  '-': '\u207b',
};

/** How the expression is written on the graph: `x^3-3x` reads as `x\u00b3 - 3x`. */
export function prettyExpression(expression: string) {
  return stripLabel(expression)
    .replace(/\^\(?(-?\d+)\)?/g, (_, digits: string) =>
      [...digits].map((c) => SUPERSCRIPTS[c] ?? c).join('')
    )
    .replace(/\*/g, '\u00b7')
    .replace(/([+\-])/g, ' $1 ')
    .replace(/\s+/g, ' ')
    .replace(/\( /g, '(')
    .replace(/ \)/g, ')')
    .trim();
}

/**
 * Turns what the maths field produces into something `compile` understands:
 * `\frac{x}{2}` into `((x)/(2))`, `x^{2}` into `x^(2)`, `\sin` into `sin`.
 * Plain text written without a field passes through untouched.
 */

/** Reads a `{…}` group starting at `open`, respecting nesting. */
function readGroup(source: string, open: number): { body: string; end: number } | null {
  if (source[open] !== '{') return null;
  let depth = 0;
  for (let i = open; i < source.length; i++) {
    if (source[i] === '{') depth += 1;
    else if (source[i] === '}') {
      depth -= 1;
      if (depth === 0) return { body: source.slice(open + 1, i), end: i + 1 };
    }
  }
  return null;
}

/** Rewrites `\name{a}{b}` (or one argument) wherever it appears, innermost last. */
function expandCommand(source: string, name: string, args: number, build: (parts: string[]) => string) {
  let out = source;
  for (let guard = 0; guard < 20; guard++) {
    const at = out.indexOf(`\\${name}`);
    if (at < 0) break;
    let cursor = at + name.length + 1;
    const parts: string[] = [];
    let ok = true;
    for (let i = 0; i < args; i++) {
      while (out[cursor] === ' ') cursor += 1;
      const group = readGroup(out, cursor);
      if (!group) {
        ok = false;
        break;
      }
      parts.push(group.body);
      cursor = group.end;
    }
    if (!ok) break;
    out = out.slice(0, at) + build(parts) + out.slice(cursor);
  }
  return out;
}

export function latexToExpression(latex: string): string {
  let out = latex;

  out = expandCommand(out, 'dfrac', 2, ([a, b]) => `((${a})/(${b}))`);
  out = expandCommand(out, 'tfrac', 2, ([a, b]) => `((${a})/(${b}))`);
  out = expandCommand(out, 'frac', 2, ([a, b]) => `((${a})/(${b}))`);
  out = expandCommand(out, 'sqrt', 1, ([a]) => `sqrt(${a})`);
  out = expandCommand(out, 'operatorname', 1, ([a]) => a);
  out = expandCommand(out, 'mathrm', 1, ([a]) => a);
  out = expandCommand(out, 'placeholder', 1, () => '');
  out = expandCommand(out, 'abs', 1, ([a]) => `abs(${a})`);

  out = out
    .replace(/\\left\s*/g, '')
    .replace(/\\right\s*/g, '')
    .replace(/\\cdot|\\times/g, '*')
    .replace(/\\div/g, '/')
    .replace(/\\pi\b/g, 'pi')
    .replace(/\\exponentialE\b/g, 'e')
    .replace(/\\arcsin\b/g, 'asin')
    .replace(/\\arccos\b/g, 'acos')
    .replace(/\\arctan\b/g, 'atan')
    .replace(/\\(sin|cos|tan|sinh|cosh|tanh|ln|log|exp|max|min|abs|floor|ceil)\b/g, '$1')
    .replace(/\\,|\;|\\!|\\:|\\ /g, '')
    .replace(/\\placeholder/g, '');

  // Superscripts become bracketed powers, innermost first.
  for (let guard = 0; guard < 20; guard++) {
    const at = out.indexOf('^{');
    if (at < 0) break;
    const group = readGroup(out, at + 1);
    if (!group) break;
    out = out.slice(0, at) + `^(${group.body})` + out.slice(group.end);
  }

  return out.replace(/[{}]/g, '').trim();
}
