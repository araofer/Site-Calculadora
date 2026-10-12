import test from 'node:test';
import assert from 'node:assert/strict';

import {
  parseValorMonetario,
  parsePercentual,
  normalizeInput,
  validateInput,
  calculate,
  formatResult
} from '../js/tools/margem-markup.js';

test('interpreta corretamente valores monetários brasileiros', () => {
  assert.equal(parseValorMonetario('1.250,50'), 1250.5);
  assert.equal(parseValorMonetario('R$ 2.500,00'), 2500);
  assert.equal(parseValorMonetario('1250.50'), 1250.5);
  assert.equal(parseValorMonetario('1.250'), 1250);
  assert.equal(parseValorMonetario(''), NaN);
});

test('interpreta percentuais com ponto ou vírgula decimal', () => {
  assert.equal(parsePercentual('30,5'), 30.5);
  assert.equal(parsePercentual('30.5'), 30.5);
  assert.equal(parsePercentual('30%'), 30);
  assert.equal(parsePercentual(''), NaN);
});

test('normalizeInput padroniza o modo e os campos', () => {
  assert.deepEqual(
    normalizeInput({
      modoCalculo: 'analisar',
      custo: '100,00',
      precoVenda: '150,00'
    }),
    {
      modo: 'analisar',
      custo: 100,
      precoVenda: 150,
      percentualDesejado: NaN
    }
  );
});

test('análise: custo de R$ 100 e venda de R$ 150 gera margem 33,33% e markup 50%', () => {
  const resultado = calculate({
    modo: 'analisar',
    custo: '100,00',
    precoVenda: '150,00'
  });

  assert.equal(resultado.valido, true);
  assert.equal(resultado.custo, 100);
  assert.equal(resultado.precoVenda, 150);
  assert.equal(resultado.lucro, 50);
  assert.equal(resultado.margemPercentual, 33.33);
  assert.equal(resultado.markupPercentual, 50);
});

test('análise identifica prejuízo quando o preço é menor que o custo', () => {
  const resultado = calculate({
    modo: 'analisar',
    custo: 100,
    precoVenda: 80
  });

  assert.equal(resultado.valido, true);
  assert.equal(resultado.lucro, -20);
  assert.equal(resultado.margemPercentual, -25);
  assert.equal(resultado.markupPercentual, -20);
});

test('preço por margem: custo de R$ 100 e margem de 30% sugere R$ 142,86', () => {
  const resultado = calculate({
    modo: 'margem',
    custo: 100,
    percentualDesejado: 30
  });

  assert.equal(resultado.valido, true);
  assert.equal(resultado.precoVenda, 142.86);
  assert.equal(resultado.lucro, 42.86);
  assert.equal(resultado.margemPercentual, 30);
  assert.equal(resultado.markupPercentual, 42.86);
});

test('preço por markup: custo de R$ 100 e markup de 50% sugere R$ 150', () => {
  const resultado = calculate({
    modo: 'markup',
    custo: 100,
    percentualDesejado: 50
  });

  assert.equal(resultado.valido, true);
  assert.equal(resultado.precoVenda, 150);
  assert.equal(resultado.lucro, 50);
  assert.equal(resultado.margemPercentual, 33.33);
  assert.equal(resultado.markupPercentual, 50);
});

test('margem de 0% e markup de 0% sugerem preço igual ao custo', () => {
  const porMargem = calculate({
    modo: 'margem',
    custo: 100,
    percentualDesejado: 0
  });
  const porMarkup = calculate({
    modo: 'markup',
    custo: 100,
    percentualDesejado: 0
  });

  assert.equal(porMargem.valido, true);
  assert.equal(porMargem.precoVenda, 100);
  assert.equal(porMarkup.valido, true);
  assert.equal(porMarkup.precoVenda, 100);
});

test('rejeita custo ausente, zero, negativo ou não numérico', () => {
  for (const custo of ['', 0, -1, 'inválido']) {
    const resultado = calculate({
      modo: 'analisar',
      custo,
      precoVenda: 150
    });
    assert.equal(resultado.valido, false);
    assert.match(resultado.erro, /custo/i);
  }
});

test('rejeita preço de venda ausente, zero ou negativo no modo de análise', () => {
  for (const precoVenda of ['', 0, -10]) {
    const resultado = calculate({
      modo: 'analisar',
      custo: 100,
      precoVenda
    });
    assert.equal(resultado.valido, false);
    assert.match(resultado.erro, /preço de venda/i);
  }
});

test('rejeita margem negativa ou igual/superior a 100%', () => {
  for (const percentualDesejado of [-1, 100, 150, 'inválido', '']) {
    const resultado = calculate({
      modo: 'margem',
      custo: 100,
      percentualDesejado
    });
    assert.equal(resultado.valido, false);
  }
});

test('rejeita markup negativo, ausente ou inválido', () => {
  for (const percentualDesejado of [-1, 'inválido', '']) {
    const resultado = calculate({
      modo: 'markup',
      custo: 100,
      percentualDesejado
    });
    assert.equal(resultado.valido, false);
  }
});

test('rejeita modo de cálculo desconhecido', () => {
  const resultado = calculate({
    modo: 'outro',
    custo: 100,
    precoVenda: 150
  });

  assert.equal(resultado.valido, false);
  assert.match(resultado.erro, /modo/i);
});

test('formatResult apresenta métricas principais e mensagens de erro', () => {
  const resultado = calculate({
    modo: 'analisar',
    custo: 100,
    precoVenda: 150
  });
  const texto = formatResult(resultado);

  assert.match(texto, /Margem sobre a venda: 33,33%/);
  assert.match(texto, /Markup sobre o custo: 50,00%/);
  assert.match(texto, /Lucro: R\$/);

  assert.match(
    formatResult({ valido: false, erro: 'Dados inválidos' }),
    /Dados inválidos/
  );
});
