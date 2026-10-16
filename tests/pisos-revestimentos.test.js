import test from 'node:test';
import assert from 'node:assert/strict';
import { calculate, normalizeInput, formatResult } from '../js/tools/pisos-revestimentos.js';

const exemplo = {
  superficie: 'piso',
  medidaPrincipal: 4,
  largura: 3,
  comprimentoPeca: 60,
  larguraPeca: 60,
  desperdicio: 10,
  rendimentoCaixa: 2,
  precoCaixa: 80
};

test('calcula área, peças, caixas e custo corretamente', () => {
  const r = calculate(exemplo);
  assert.equal(r.valido, true);
  assert.equal(r.area, 12);
  assert.equal(r.areaComDesperdicio, 13.2);
  assert.equal(r.areaPorPeca, 0.36);
  assert.equal(r.quantidadePecas, 37);
  assert.equal(r.quantidadeCaixas, 7);
  assert.equal(r.custoEstimado, 560);
});

test('usa desperdício de 10% quando não informado', () => {
  const semDesperdicio = { ...exemplo };
  delete semDesperdicio.desperdicio;

  assert.equal(normalizeInput(semDesperdicio).desperdicio, 10);
});

test('calcula sem custo quando o preço por caixa fica em branco', () => {
  const r = calculate({ ...exemplo, precoCaixa: '' });
  assert.equal(r.valido, true);
  assert.equal(r.custoEstimado, null);
});

test('aceita parede e desperdício zero', () => {
  const r = calculate({ ...exemplo, superficie: 'parede', desperdicio: 0 });
  assert.equal(r.valido, true);
  assert.equal(r.superficie, 'parede');
  assert.equal(r.area, 12);
  assert.equal(r.quantidadePecas, 34);
  assert.equal(r.quantidadeCaixas, 6);
});

test('rejeita dimensões, desperdício e rendimento inválidos', () => {
  for (const alteracao of [
    { medidaPrincipal: 0 },
    { largura: -1 },
    { comprimentoPeca: 0 },
    { desperdicio: -1 },
    { desperdicio: 101 },
    { rendimentoCaixa: 0 },
    { precoCaixa: -10 }
  ]) {
    assert.equal(calculate({ ...exemplo, ...alteracao }).valido, false);
  }
});

test('formata um resumo com as quantidades calculadas', () => {
  const texto = formatResult(calculate(exemplo));
  assert.match(texto, /13,20 m²/);
  assert.match(texto, /Quantidade de peças: 37/);
  assert.match(texto, /Quantidade de caixas: 7/);
  assert.match(texto, /R\$ 560,00/);
});
