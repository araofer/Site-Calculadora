import test from 'node:test';
import assert from 'node:assert/strict';

import {
  parseRuleOfThreeNumber,
  normalizeRuleOfThreeInput,
  validateRuleOfThreeInput,
  calculateRuleOfThree,
  formatRuleOfThreeResult
} from '../js/tools/regra-de-tres.js';
import {
  VALID_TOOL_IDS,
  isFavorite,
  addFavorite,
  removeFavorite,
  toggleFavorite,
  _resetMemoryForTesting
} from '../js/core/favorites.js';

const EPSILON = 1e-6;

test('Regra de Três - parseRuleOfThreeNumber aceita inteiros e decimais com ponto e vírgula', () => {
  assert.equal(parseRuleOfThreeNumber(10), 10);
  assert.equal(parseRuleOfThreeNumber('10'), 10);
  assert.equal(parseRuleOfThreeNumber('10.5'), 10.5);
  assert.equal(parseRuleOfThreeNumber('10,5'), 10.5);
  assert.equal(parseRuleOfThreeNumber('0.5'), 0.5);
  assert.equal(parseRuleOfThreeNumber('0,5'), 0.5);
  assert.equal(parseRuleOfThreeNumber('1.000'), 1000, '1.000 deve ser interpretado como 1000 e não 1');
  assert.notEqual(parseRuleOfThreeNumber('1.000'), 1);
  assert.equal(parseRuleOfThreeNumber('1.000,50'), 1000.5);
  assert.equal(parseRuleOfThreeNumber('1,234.56'), 1234.56);
  assert.equal(parseRuleOfThreeNumber('0'), 0);
});

test('Regra de Três - parseRuleOfThreeNumber rejeita entradas malformadas, não-numéricas e negativas', () => {
  assert.ok(Number.isNaN(parseRuleOfThreeNumber('')));
  assert.ok(Number.isNaN(parseRuleOfThreeNumber('   ')));
  assert.ok(Number.isNaN(parseRuleOfThreeNumber(null)));
  assert.ok(Number.isNaN(parseRuleOfThreeNumber(undefined)));
  assert.ok(Number.isNaN(parseRuleOfThreeNumber('abc')));
  assert.ok(Number.isNaN(parseRuleOfThreeNumber('1..000')));
  assert.ok(Number.isNaN(parseRuleOfThreeNumber('1,,000')));
  assert.ok(Number.isNaN(parseRuleOfThreeNumber('1.00.0')));
  assert.ok(Number.isNaN(parseRuleOfThreeNumber('1,00,0')));
  assert.ok(Number.isNaN(parseRuleOfThreeNumber('-5')));
  assert.ok(Number.isNaN(parseRuleOfThreeNumber(-10)));
  assert.ok(Number.isNaN(parseRuleOfThreeNumber(NaN)));
  assert.ok(Number.isNaN(parseRuleOfThreeNumber(Infinity)));
});

test('Regra de Três - normalizeRuleOfThreeInput converte entradas brutas e define modo padrão', () => {
  const norm1 = normalizeRuleOfThreeInput({ a: ' 2,5 ', b: '10', c: '5', mode: 'DIRECT' });
  assert.equal(norm1.a, 2.5);
  assert.equal(norm1.b, 10);
  assert.equal(norm1.c, 5);
  assert.equal(norm1.mode, 'direct');

  const norm2 = normalizeRuleOfThreeInput({ a: '2', b: '10', c: '5', mode: 'inverse' });
  assert.equal(norm2.mode, 'inverse');

  // Modo padrão quando omitido é direct
  const norm3 = normalizeRuleOfThreeInput({ a: '2', b: '10', c: '5' });
  assert.equal(norm3.mode, 'direct');
});

test('Regra de Três - validateRuleOfThreeInput valida limites, divisão por zero e modos', () => {
  // Entradas válidas
  assert.equal(validateRuleOfThreeInput({ a: 2, b: 10, c: 5, mode: 'direct' }).valido, true);
  assert.equal(validateRuleOfThreeInput({ a: 2, b: 10, c: 5, mode: 'inverse' }).valido, true);
  assert.equal(validateRuleOfThreeInput({ a: 2, b: 0, c: 5, mode: 'direct' }).valido, true, 'b=0 é matematicamente válido');

  // Modo inválido
  assert.equal(validateRuleOfThreeInput({ a: 2, b: 10, c: 5, mode: 'composta' }).valido, false);
  assert.equal(validateRuleOfThreeInput({ a: 2, b: 10, c: 5, mode: '' }).valido, false);

  // Campos ausentes ou NaN
  assert.equal(validateRuleOfThreeInput({ a: NaN, b: 10, c: 5, mode: 'direct' }).valido, false);
  assert.equal(validateRuleOfThreeInput({ a: 2, b: NaN, c: 5, mode: 'direct' }).valido, false);
  assert.equal(validateRuleOfThreeInput({ a: 2, b: 10, c: NaN, mode: 'direct' }).valido, false);

  // Divisão por zero no modo direct: A = 0
  assert.equal(validateRuleOfThreeInput({ a: 0, b: 10, c: 5, mode: 'direct' }).valido, false);

  // Divisão por zero no modo inverse: C = 0
  assert.equal(validateRuleOfThreeInput({ a: 2, b: 10, c: 0, mode: 'inverse' }).valido, false);

  // Valores negativos
  assert.equal(validateRuleOfThreeInput({ a: -2, b: 10, c: 5, mode: 'direct' }).valido, false);
  assert.equal(validateRuleOfThreeInput({ a: 2, b: -10, c: 5, mode: 'direct' }).valido, false);
  assert.equal(validateRuleOfThreeInput({ a: 2, b: 10, c: -5, mode: 'direct' }).valido, false);
});

test('Regra de Três - caso conhecido DIRECT obrigatório (a=2, b=10, c=5 -> x=25)', () => {
  const res = calculateRuleOfThree({
    a: '2',
    b: '10',
    c: '5',
    mode: 'direct'
  });

  assert.equal(res.valido, true);
  assert.equal(res.mode, 'direct');
  assert.equal(res.a, 2);
  assert.equal(res.b, 10);
  assert.equal(res.c, 5);
  assert.equal(res.x, 25);
  assert.equal(res.formula, 'X = (B × C) ÷ A');
  assert.equal(res.formulaSubstituida, 'X = (10 × 5) ÷ 2');
});

test('Regra de Três - caso conhecido INVERSE obrigatório (a=2, b=10, c=5 -> x=4)', () => {
  const res = calculateRuleOfThree({
    a: '2',
    b: '10',
    c: '5',
    mode: 'inverse'
  });

  assert.equal(res.valido, true);
  assert.equal(res.mode, 'inverse');
  assert.equal(res.a, 2);
  assert.equal(res.b, 10);
  assert.equal(res.c, 5);
  assert.equal(res.x, 4);
  assert.equal(res.formula, 'X = (A × B) ÷ C');
  assert.equal(res.formulaSubstituida, 'X = (2 × 10) ÷ 5');
});

test('Regra de Três - valores decimais com vírgula e ponto', () => {
  // Direta: 2,5 -> 7,5 | 10 -> X => X = (7.5 * 10) / 2.5 = 30
  const resDirect = calculateRuleOfThree({
    a: '2,5',
    b: '7,5',
    c: '10',
    mode: 'direct'
  });
  assert.equal(resDirect.valido, true);
  assert.ok(Math.abs(resDirect.x - 30) < EPSILON);

  // Inversa: 1.5 -> 6 | 4.5 -> X => X = (1.5 * 6) / 4.5 = 2
  const resInverse = calculateRuleOfThree({
    a: '1.5',
    b: '6',
    c: '4.5',
    mode: 'inverse'
  });
  assert.equal(resInverse.valido, true);
  assert.ok(Math.abs(resInverse.x - 2) < EPSILON);
});

test('Regra de Três - caso onde B = 0 resulta em X = 0', () => {
  const res = calculateRuleOfThree({
    a: 4,
    b: 0,
    c: 8,
    mode: 'direct'
  });

  assert.equal(res.valido, true);
  assert.equal(res.x, 0);
});

test('Regra de Três - ausência de dependência de DOM e imunidade a NaN/Infinity', () => {
  const res = calculateRuleOfThree({
    a: '123.45',
    b: '678.90',
    c: '45.60',
    mode: 'direct'
  });

  assert.equal(res.valido, true);
  assert.ok(Number.isFinite(res.x));
  assert.ok(!Number.isNaN(res.x));
  assert.ok(typeof res.formula === 'string');
  assert.ok(typeof res.formulaSubstituida === 'string');
});

test('Regra de Três - formatRuleOfThreeResult formata números e rótulos para pt-BR', () => {
  const resDirect = calculateRuleOfThree({
    a: '2,5',
    b: '10',
    c: '5',
    mode: 'direct'
  });

  const fmt = formatRuleOfThreeResult(resDirect);
  assert.equal(fmt.modeLabel, 'Regra de Três Direta');
  assert.equal(fmt.aFmt, '2,5');
  assert.equal(fmt.bFmt, '10');
  assert.equal(fmt.cFmt, '5');
  assert.equal(fmt.xFmt, '20');
  assert.equal(fmt.substitutionFmt, 'X = (10 × 5) ÷ 2,5');
});

test('Regra de Três - favorito é reconhecido e gerenciado corretamente pelo core de favoritos', () => {
  _resetMemoryForTesting();
  try {
    assert.ok(VALID_TOOL_IDS.has('regra-de-tres'), 'regra-de-tres deve constar em VALID_TOOL_IDS');
    assert.equal(isFavorite('regra-de-tres'), false);
    assert.equal(addFavorite('regra-de-tres'), true);
    assert.equal(isFavorite('regra-de-tres'), true);
    assert.equal(toggleFavorite('regra-de-tres'), false);
    assert.equal(isFavorite('regra-de-tres'), false);
    assert.equal(toggleFavorite('regra-de-tres'), true);
    assert.equal(isFavorite('regra-de-tres'), true);
    assert.equal(removeFavorite('regra-de-tres'), true);
    assert.equal(isFavorite('regra-de-tres'), false);
  } finally {
    _resetMemoryForTesting();
  }
});

test('Regra de Três - overflow numérico (Infinity) retorna erro amigável', () => {
  const resDirect = calculateRuleOfThree({
    a: 1,
    b: 1e200,
    c: 1e200,
    mode: 'direct'
  });

  assert.equal(resDirect.valido, false);
  assert.equal(resDirect.erro, 'O resultado matemático é muito grande para ser calculado.');

  const resInverse = calculateRuleOfThree({
    a: 1e200,
    b: 1e200,
    c: 1,
    mode: 'inverse'
  });

  assert.equal(resInverse.valido, false);
  assert.equal(resInverse.erro, 'O resultado matemático é muito grande para ser calculado.');
});

test('Regra de Três - entrada com valores negativos em string retorna mensagem específica', () => {
  const resA = calculateRuleOfThree({ a: '-5', b: '10', c: '2', mode: 'direct' });
  assert.equal(resA.valido, false);
  assert.equal(resA.erro, 'Os valores de A, B e C devem ser números positivos.');

  const resB = calculateRuleOfThree({ a: '5', b: '-10', c: '2', mode: 'direct' });
  assert.equal(resB.valido, false);
  assert.equal(resB.erro, 'Os valores de A, B e C devem ser números positivos.');

  const resC = calculateRuleOfThree({ a: '5', b: '10', c: '-2', mode: 'direct' });
  assert.equal(resC.valido, false);
  assert.equal(resC.erro, 'Os valores de A, B e C devem ser números positivos.');

  const resInverse = calculateRuleOfThree({ a: '-2', b: '10', c: '5', mode: 'inverse' });
  assert.equal(resInverse.valido, false);
  assert.equal(resInverse.erro, 'Os valores de A, B e C devem ser números positivos.');
});
