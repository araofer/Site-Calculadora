import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import tools from '../data/tools.json' with { type: 'json' };
import { calculateWaterConsumption } from '../js/tools/consumo-agua.js';
import { VALID_TOOL_IDS, STORAGE_KEY, addFavorite, removeFavorite, getFavorites, _resetMemoryForTesting } from '../js/core/favorites.js';

test('consumo mensal calcula água, cobranças e total com decimais brasileiros', () => {
  const result = calculateWaterConsumption({ consumption: '250,5', rate: '5,20', charges: '12,00' });
  assert.deepEqual([result.valid, result.consumptionM3, result.waterCost, result.charges, result.total], [true, 250.5, 1302.6, 12, 1314.6]);
});

test('leituras calculam consumo e custo efetivo do período separados da projeção mensal', () => {
  const result = calculateWaterConsumption({ mode: 'readings', previous: '1.245,5', current: '1.258', days: '25', rate: '5,20', charges: '8,50' });
  assert.deepEqual([result.consumptionM3, result.waterCost, result.total, result.dailyAverage, result.monthlyEstimate, result.monthlyCostEstimate], [12.5, 65, 73.5, 0.5, 15, 78]);
});

test('consumo zero e tarifa zero são válidos e não produzem valores não finitos', () => {
  const monthly = calculateWaterConsumption({ consumption: '0', rate: '0' });
  const readings = calculateWaterConsumption({ mode: 'readings', previous: '5', current: '5', days: '1', rate: '0' });
  assert.equal(monthly.total, 0);
  assert.equal(readings.dailyAverage, 0);
  assert.equal(readings.monthlyEstimate, 0);
  assert.equal(readings.monthlyCostEstimate, 0);
  assert.doesNotMatch(JSON.stringify([monthly, readings]), /NaN|Infinity/);
});

test('aceita casas decimais e arredonda custos para centavos', () => {
  const result = calculateWaterConsumption({ consumption: '0,125', rate: '0,80', charges: '0,05' });
  assert.deepEqual([result.waterCost, result.total], [0.1, 0.15]);
});

test('rejeita obrigatórios vazios, negativos, leituras regressivas e períodos inválidos', () => {
  assert.match(calculateWaterConsumption({ consumption: '', rate: '1' }).error, /Consumo de água/);
  assert.match(calculateWaterConsumption({ consumption: '-1', rate: '1' }).error, /Consumo de água/);
  assert.match(calculateWaterConsumption({ consumption: '1', rate: '' }).error, /Tarifa efetiva/);
  assert.match(calculateWaterConsumption({ consumption: '1', rate: '1', charges: '-1' }).error, /Cobranças adicionais/);
  assert.match(calculateWaterConsumption({ mode: 'readings', previous: '-1', current: '2', days: '30', rate: '1' }).error, /Leitura anterior/);
  assert.match(calculateWaterConsumption({ mode: 'readings', previous: '2', current: '1', days: '30', rate: '1' }).error, /inferior/);
  assert.match(calculateWaterConsumption({ mode: 'readings', previous: '1', current: '2', days: '0', rate: '1' }).error, /inteiro/);
  assert.match(calculateWaterConsumption({ mode: 'readings', previous: '1', current: '2', days: '1,5', rate: '1' }).error, /inteiro/);
  assert.match(calculateWaterConsumption({ mode: 'readings', previous: '', current: '2', days: '30', rate: '1' }).error, /Leitura anterior/);
});

test('registro publicado tem URL única em Utilidades e favorito usa o mecanismo compartilhado', () => {
  const record = tools.find(tool => tool.id === 'consumo-agua');
  assert.ok(record);
  assert.equal(record.name, 'Calculadora de Consumo de Água');
  assert.equal(record.url, '/tools/utilidades/consumo-agua.html');
  assert.equal(record.categorySlug, 'utilidades');
  assert.equal(record.status, 'published');
  assert.equal(tools.filter(tool => tool.url === record.url).length, 1);
  const generatedCatalog = fs.readFileSync(new URL('../js/tools-catalog.js', import.meta.url), 'utf8');
  const sitemap = fs.readFileSync(new URL('../sitemap.xml', import.meta.url), 'utf8');
  assert.match(generatedCatalog, /"id": "consumo-agua"/);
  assert.match(generatedCatalog, /tools\/utilidades\/consumo-agua\.html/);
  assert.equal((sitemap.match(/tools\/utilidades\/consumo-agua\.html/g) || []).length, 1);
  assert.ok(VALID_TOOL_IDS.has('consumo-agua'));
  const storage = new Map();
  globalThis.localStorage = { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, String(value)) };
  _resetMemoryForTesting();
  try {
    assert.equal(addFavorite('consumo-agua'), true);
    assert.deepEqual(JSON.parse(storage.get(STORAGE_KEY)), ['consumo-agua']);
    _resetMemoryForTesting();
    assert.deepEqual(getFavorites(), ['consumo-agua']);
    assert.equal(removeFavorite('consumo-agua'), true);
    assert.deepEqual(JSON.parse(storage.get(STORAGE_KEY)), []);
  } finally {
    delete globalThis.localStorage;
    _resetMemoryForTesting();
  }
});

test('modos ocultam campos inativos, alternar invalida resultado antigo, limpar restaura e permite recalcular', () => {
  const page = fs.readFileSync(new URL('../src/pages/tools/utilidades/consumo-agua.page.html', import.meta.url), 'utf8');
  const script = fs.readFileSync(new URL('../js/tools/consumo-agua.js', import.meta.url), 'utf8');
  assert.match(page, /id="camposLeiturasAgua"[^>]*hidden/);
  assert.match(script, /monthlyFields\.hidden = mode !== 'monthly'/);
  assert.match(script, /readingFields\.hidden = mode !== 'readings'/);
  assert.match(script, /querySelectorAll\('input'\)\.forEach\(input => \{ input\.value = ''; \}\)/);
  assert.match(script, /form\.reset\(\); toggleMode\(\)/);
  assert.match(script, /form\.addEventListener\('submit'/);
});

test('compartilhar usa URL e título da ferramenta sem incluir dados pessoais; impressão compartilha ação existente', () => {
  const script = fs.readFileSync(new URL('../js/tools/consumo-agua.js', import.meta.url), 'utf8');
  assert.match(script, /title: 'Calculadora de Consumo de Água — Calculadora Master'/);
  assert.match(script, /actions\.share\(`\$\{window\.location\.origin\}\/tools\/utilidades\/consumo-agua\.html`\)/);
  assert.match(script, /actions\.print\(\)/);
  assert.doesNotMatch(script, /URLSearchParams|searchParams\.set/);
  const page = fs.readFileSync(new URL('../src/pages/tools/utilidades/consumo-agua.page.html', import.meta.url), 'utf8');
  assert.match(page, /id="imprimirConsumoAgua"/);
  assert.match(page, /id="compartilharConsumoAgua"/);
});
