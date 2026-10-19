import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import tools from '../data/tools.json' with { type: 'json' };
import { calculateEnergyBill, parseEnergyNumber } from '../js/tools/conta-luz.js';
import { VALID_TOOL_IDS, STORAGE_KEY, addFavorite, removeFavorite, getFavorites, _resetMemoryForTesting } from '../js/core/favorites.js';

test('consumo mensal calcula energia, adicionais e total em valores decimais brasileiros', () => {
  const result = calculateEnergyBill({ mode: 'monthly', consumption: '250,5', rate: '0,92', charges: '8,50' });
  assert.deepEqual([result.valid, result.consumptionKWh, result.energyCost, result.charges, result.total], [true, 250.5, 230.46, 8.5, 238.96]);
});

test('leituras calculam custo real do período e médias diárias e mensais separadas', () => {
  const result = calculateEnergyBill({ mode: 'readings', previous: '12.450', current: '12.700', days: '25', rate: '0,8', charges: '' });
  assert.equal(result.consumptionKWh, 250);
  assert.equal(result.energyCost, 200);
  assert.equal(result.total, 200);
  assert.equal(result.dailyAverage, 10);
  assert.equal(result.monthlyEstimate, 300);
});

test('zero de consumo, tarifa e adicionais são valores válidos', () => {
  const monthly = calculateEnergyBill({ mode: 'monthly', consumption: '0', rate: '0', charges: '0' });
  const readings = calculateEnergyBill({ mode: 'readings', previous: '5', current: '5', days: '1', rate: '0', charges: '' });
  assert.equal(monthly.total, 0);
  assert.equal(readings.dailyAverage, 0);
  assert.equal(readings.monthlyEstimate, 0);
});

test('rejeita campos vazios, negativos, inválidos, período zero e leitura atual menor', () => {
  assert.match(calculateEnergyBill({ consumption: '', rate: '1' }).error, /Consumo mensal/);
  assert.match(calculateEnergyBill({ consumption: '-1', rate: '1' }).error, /Consumo mensal/);
  assert.match(calculateEnergyBill({ consumption: 'abc', rate: '1' }).error, /Consumo mensal/);
  assert.match(calculateEnergyBill({ consumption: '10', rate: '' }).error, /Tarifa efetiva/);
  assert.match(calculateEnergyBill({ consumption: '10', rate: '1', charges: '-1' }).error, /Custos adicionais/);
  assert.match(calculateEnergyBill({ mode: 'readings', previous: '10', current: '9', days: '30', rate: '1' }).error, /maior ou igual/);
  assert.match(calculateEnergyBill({ mode: 'readings', previous: '1', current: '2', days: '0', rate: '1' }).error, /inteiro/);
  assert.match(calculateEnergyBill({ mode: 'readings', previous: '', current: '2', days: '30', rate: '1' }).error, /Leitura anterior/);
});

test('parser entende vírgula decimal e agrupamento brasileiro sem aceitar notação inválida', () => {
  assert.equal(parseEnergyNumber('1.234,56'), 1234.56);
  assert.equal(parseEnergyNumber('0,0005'), 0.0005);
  assert.equal(parseEnergyNumber('1234.56'), 1234.56);
  assert.ok(Number.isNaN(parseEnergyNumber('1,234.56')));
  assert.ok(Number.isNaN(parseEnergyNumber('Infinity')));
});

test('catálogo, favoritos, modo condicional, ações compartilhadas e links de impressão estão integrados', () => {
  const record = tools.find(tool => tool.id === 'conta-luz');
  assert.ok(record);
  assert.equal(record.url, '/tools/utilidades/conta-luz.html');
  assert.equal(record.categorySlug, 'utilidades');
  assert.equal(record.status, 'published');
  assert.equal(tools.filter(tool => tool.url === record.url).length, 1);
  const page = fs.readFileSync(new URL('../src/pages/tools/utilidades/conta-luz.page.html', import.meta.url), 'utf8');
  const script = fs.readFileSync(new URL('../js/tools/conta-luz.js', import.meta.url), 'utf8');
  const favorites = fs.readFileSync(new URL('../js/core/favorites.js', import.meta.url), 'utf8');
  assert.match(page, /id="camposConsumoMensalLuz"/);
  assert.match(page, /id="camposLeiturasLuz"[^>]*hidden/);
  assert.match(page, /id="imprimirContaLuz"/);
  assert.match(script, /createResultActions/);
  assert.match(script, /camposConsumoMensalLuz/);
  assert.match(script, /camposLeiturasLuz/);
  assert.match(script, /conta-luz\.html/);
  assert.match(favorites, /'conta-luz'/);
});

test('o ID da Conta de Luz pode ser favoritado, removido e persistido no formato compartilhado', () => {
  const storage = new Map();
  globalThis.localStorage = { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, String(value)) };
  _resetMemoryForTesting();
  try {
    assert.ok(VALID_TOOL_IDS.has('conta-luz'));
    assert.equal(addFavorite('conta-luz'), true);
    assert.deepEqual(getFavorites(), ['conta-luz']);
    assert.deepEqual(JSON.parse(storage.get(STORAGE_KEY)), ['conta-luz']);
    _resetMemoryForTesting();
    assert.deepEqual(getFavorites(), ['conta-luz']);
    assert.equal(removeFavorite('conta-luz'), true);
    assert.deepEqual(JSON.parse(storage.get(STORAGE_KEY)), []);
  } finally {
    delete globalThis.localStorage;
    _resetMemoryForTesting();
  }
});

test('compartilhamento mantém a URL canônica sem parâmetros pessoais e impressão usa ação compartilhada', () => {
  const script = fs.readFileSync(new URL('../js/tools/conta-luz.js', import.meta.url), 'utf8');
  assert.match(script, /actions\.share\(`\$\{window\.location\.origin\}\/tools\/utilidades\/conta-luz\.html`\)/);
  assert.match(script, /actions\.print\(\)/);
  assert.doesNotMatch(script, /URLSearchParams|searchParams\.set/);
});
