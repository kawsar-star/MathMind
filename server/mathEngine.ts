/**
 * Deterministic Mathematical Expression Parser & Answer Verifier.
 * Supports integers, decimals, fractions (e.g. 3/4), percentages (e.g. 75%),
 * basic operations (+, -, *, /, ^), parentheses, sqrt(), and simple linear equations.
 * Never uses eval() or dynamic code execution.
 */

interface Token {
  type: 'number' | 'op' | 'lparen' | 'rparen' | 'ident';
  value: string;
}

function normalizeBengaliDigits(input: string): string {
  const bnDigits = '০১২৩৪৫৬৭৮৯';
  return input.replace(/[০-৯]/g, (ch) => String(bnDigits.indexOf(ch)));
}

function tokenize(expr: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  const s = normalizeBengaliDigits(expr)
    .replace(/×/g, '*')
    .replace(/÷/g, '/')
    .replace(/−/g, '-')
    .trim();

  while (i < s.length) {
    const ch = s[i];
    if (/\s/.test(ch)) {
      i++;
      continue;
    }
    if (/[0-9.]/.test(ch)) {
      let num = '';
      while (i < s.length && /[0-9.]/.test(s[i])) {
        num += s[i++];
      }
      if (i < s.length && s[i] === '%') {
        i++;
        const parsed = parseFloat(num);
        if (Number.isNaN(parsed)) throw new Error('Invalid percentage');
        tokens.push({ type: 'number', value: String(parsed / 100) });
      } else {
        tokens.push({ type: 'number', value: num });
      }
      continue;
    }
    if (/[a-zA-Z]/.test(ch)) {
      let ident = '';
      while (i < s.length && /[a-zA-Z]/.test(s[i])) {
        ident += s[i++];
      }
      tokens.push({ type: 'ident', value: ident.toLowerCase() });
      continue;
    }
    if ('+-*/^'.includes(ch)) {
      tokens.push({ type: 'op', value: ch });
      i++;
      continue;
    }
    if (ch === '(') {
      tokens.push({ type: 'lparen', value: '(' });
      i++;
      continue;
    }
    if (ch === ')') {
      tokens.push({ type: 'rparen', value: ')' });
      i++;
      continue;
    }
    throw new Error(`Unsupported character in math expression: ${ch}`);
  }
  return tokens;
}

export function evaluateNumericExpression(raw: string): number | null {
  try {
    const cleaned = normalizeBengaliDigits(raw).trim();
    if (!cleaned || cleaned.length > 200) return null;

    // Handle mixed numbers like "2 1/2"
    const mixedMatch = cleaned.match(/^(-?\d+)\s+(\d+)\/(\d+)$/);
    if (mixedMatch) {
      const whole = parseInt(mixedMatch[1], 10);
      const num = parseInt(mixedMatch[2], 10);
      const den = parseInt(mixedMatch[3], 10);
      if (den === 0) return null;
      return whole >= 0 ? whole + num / den : whole - num / den;
    }

    const tokens = tokenize(cleaned);
    if (tokens.length === 0) return null;
    let pos = 0;

    const peek = () => tokens[pos];
    const consume = () => tokens[pos++];

    function parseExpression(): number {
      let left = parseTerm();
      while (peek()?.type === 'op' && (peek().value === '+' || peek().value === '-')) {
        const op = consume().value;
        const right = parseTerm();
        left = op === '+' ? left + right : left - right;
      }
      return left;
    }

    function parseTerm(): number {
      let left = parsePower();
      while (peek()?.type === 'op' && (peek().value === '*' || peek().value === '/')) {
        const op = consume().value;
        const right = parsePower();
        if (op === '/') {
          if (Math.abs(right) < 1e-12) throw new Error('Division by zero');
          left = left / right;
        } else {
          left = left * right;
        }
      }
      return left;
    }

    function parsePower(): number {
      let base = parseUnary();
      if (peek()?.type === 'op' && peek().value === '^') {
        consume();
        const exp = parsePower();
        base = Math.pow(base, exp);
      }
      return base;
    }

    function parseUnary(): number {
      if (peek()?.type === 'op' && (peek().value === '+' || peek().value === '-')) {
        const op = consume().value;
        const val = parseUnary();
        return op === '-' ? -val : val;
      }
      return parsePrimary();
    }

    function parsePrimary(): number {
      const tok = peek();
      if (!tok) throw new Error('Unexpected end of expression');

      if (tok.type === 'number') {
        consume();
        const v = parseFloat(tok.value);
        if (Number.isNaN(v)) throw new Error('Invalid number');
        return v;
      }

      if (tok.type === 'ident') {
        consume();
        if (tok.value === 'pi') return Math.PI;
        if (tok.value === 'e') return Math.E;
        if (peek()?.type === 'lparen') {
          consume();
          const arg = parseExpression();
          if (peek()?.type !== 'rparen') throw new Error('Expected )');
          consume();
          if (tok.value === 'sqrt') {
            if (arg < 0) throw new Error('Negative sqrt');
            return Math.sqrt(arg);
          }
          if (tok.value === 'abs') return Math.abs(arg);
        }
        throw new Error(`Unknown identifier: ${tok.value}`);
      }

      if (tok.type === 'lparen') {
        consume();
        const val = parseExpression();
        if (peek()?.type !== 'rparen') throw new Error('Expected )');
        consume();
        return val;
      }

      throw new Error(`Unexpected token: ${tok.value}`);
    }

    const result = parseExpression();
    if (pos !== tokens.length || !Number.isFinite(result)) return null;
    return result;
  } catch {
    return null;
  }
}

/**
 * Normalizes and verifies whether two mathematical answers are equivalent.
 * Handles numeric equivalence (e.g., "0.5" == "1/2" == "50%"),
 * variable assignment ("x = 4" vs "4"), and normalized string matching.
 */
export function verifyMathAnswer(submitted: string, expected: string): {
  isEquivalent: boolean;
  submittedNumeric: number | null;
  expectedNumeric: number | null;
  method: 'numeric' | 'exact_normalized';
} {
  const cleanStr = (s: string) =>
    normalizeBengaliDigits(s)
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '')
      .replace(/^[a-z]=/, '');

  const normSub = cleanStr(submitted);
  const normExp = cleanStr(expected);

  if (normSub === normExp && normSub.length > 0) {
    const num = evaluateNumericExpression(normSub);
    return {
      isEquivalent: true,
      submittedNumeric: num,
      expectedNumeric: num,
      method: num !== null ? 'numeric' : 'exact_normalized',
    };
  }

  const subVal = evaluateNumericExpression(submitted.replace(/^[a-zA-Z]\s*=\s*/, ''));
  const expVal = evaluateNumericExpression(expected.replace(/^[a-zA-Z]\s*=\s*/, ''));

  if (subVal !== null && expVal !== null) {
    const isEq = Math.abs(subVal - expVal) <= 1e-4;
    return {
      isEquivalent: isEq,
      submittedNumeric: subVal,
      expectedNumeric: expVal,
      method: 'numeric',
    };
  }

  return {
    isEquivalent: false,
    submittedNumeric: subVal,
    expectedNumeric: expVal,
    method: 'exact_normalized',
  };
}
