import test from 'node:test';
import assert from 'node:assert/strict';

import {
  normalizeInput,
  validateInput,
  calculate,
  formatResult
} from '../js/tools/{{ID}}.js';

test('{{NAME}} - normalizeInput converte strings numéricas com vírgula', () => {
  assert.deepEqual(normalizeInput({ valor: ' 100,50 ' }), { valor: 100.5 });
  assert.deepEqual(normalizeInput({ valor: 250 }), { valor: 250 });
});

test('{{NAME}} - validateInput rejeita entradas inválidas ou negativas', () => {
  assert.equal(validateInput({ valor: NaN }).valido, false);
  assert.equal(validateInput({ valor: -1 }).valido, false);
  assert.equal(validateInput({ valor: 50 }).valido, true);
});

test('{{NAME}} - calculate retorna erro defensivo em entrada inválida', () => {
  const invalid = calculate({ valor: 'nao-numerico' });
  assert.equal(invalid.valido, false);
  assert.ok(invalid.erro);
});

test('{{NAME}} - formatResult formata mensagem de sucesso ou erro', () => {
  const erroMsg = formatResult({ valido: false, erro: 'Valor inválido' });
  assert.match(erroMsg, /Valor inválido/);

  const okMsg = formatResult({ valido: true, resultado: 100 });
  assert.match(okMsg, /100/);
});

test.todo('{{NAME}} - homologação matemática da fórmula com casos de teste certificados (PENDENTE)');
