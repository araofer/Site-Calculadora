import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import tools from '../data/tools.json' with { type: 'json' };
import { compareProducts, COMPARISON_UNITS, PRODUCT_LIMITS } from '../js/tools/comparador-precos.js';
import { VALID_TOOL_IDS, STORAGE_KEY, addFavorite, removeFavorite, getFavorites, _resetMemoryForTesting } from '../js/core/favorites.js';

const product = (id, price, quantity, unit, packages = '1', name = id) => ({ id, name, price, quantity, unit, packages });

test('exemplo conhecido compara 500 g a R$ 8,00 com 1 kg a R$ 14,00 sem arredondar o ranking', () => {
  const result = compareProducts([
    product('a', '8,00', '500', 'g', '1', 'Produto A'),
    product('b', '14,00', '1', 'kg', '1', 'Produto B')
  ]);
  assert.equal(result.valid, true);
  assert.deepEqual(result.products.map(item => [item.totalPrice, item.totalQuantity, item.unitPrice]), [[8, 0.5, 16], [14, 1, 14]]);
  assert.equal(result.cheapest[0].name, 'Produto B');
  assert.equal(result.unitPriceDifference, 2);
  assert.equal(result.savingsPercent, 12.5);
  assert.equal(result.equivalentQuantity, 1);
  assert.equal(result.equivalentSavings, 2);
  assert.equal(result.lowestOutlay, 8);
  assert.equal(result.lowestOutlayProducts[0].name, 'Produto A');
});

test('normaliza mg, g e kg e considera várias embalagens e quantidade distinta', () => {
  const result = compareProducts([
    product('mg', '7,50', '500000', 'mg'),
    product('bulk', '4,00', '250', 'g', '2'),
    product('kg', '14,00', '1', 'kg')
  ]);
  assert.deepEqual(result.products.map(item => [item.totalPrice, item.totalQuantity, item.unitPrice]), [[7.5, 0.5, 15], [8, 0.5, 16], [14, 1, 14]]);
  assert.equal(result.cheapest[0].id, 'kg');
});

test('converte mL e L para preço por litro', () => {
  const result = compareProducts([product('ml', '4,00', '500', 'mL'), product('litre', '7,50', '1', 'L')]);
  assert.equal(result.unitPriceLabel, 'R$/L');
  assert.deepEqual(result.products.map(item => item.unitPrice), [8, 7.5]);
  assert.equal(result.cheapest[0].id, 'litre');
});

test('converte mm, cm e m para preço por metro', () => {
  const result = compareProducts([product('mm', '2,00', '400', 'mm'), product('cm', '3,00', '50', 'cm'), product('m', '10,00', '2', 'm')]);
  assert.equal(result.unitPriceLabel, 'R$/m');
  assert.deepEqual(result.products.map(item => item.unitPrice), [5, 6, 5]);
  assert.deepEqual(result.cheapest.map(item => item.id), ['mm', 'm']);
});

test('compara unidades contáveis e separa menor preço unitário de menor desembolso', () => {
  const result = compareProducts([product('six', '9,00', '6', 'unidade'), product('four', '8,00', '4', 'unidade')]);
  assert.equal(result.unitPriceLabel, 'R$/unidade');
  assert.deepEqual(result.products.map(item => item.unitPrice), [1.5, 2]);
  assert.equal(result.cheapest[0].id, 'six');
  assert.equal(result.lowestOutlayProducts[0].id, 'four');
});

test('empate não inventa percentual de economia e mantém os empatados', () => {
  const result = compareProducts([product('a', '8,00', '500', 'g'), product('b', '16,00', '1', 'kg')]);
  assert.deepEqual(result.cheapest.map(item => item.id), ['a', 'b']);
  assert.equal(result.unitPriceDifference, 0);
  assert.equal(result.savingsPercent, null);
  assert.equal(result.equivalentSavings, 0);
});

test('identifica a melhor opção pela precisão completa, antes da formatação arredondada', () => {
  const result = compareProducts([product('more-expensive', '0,01', '1000', 'kg'), product('slightly-cheaper', '0,01', '1001', 'kg')]);
  assert.ok(result.products[1].unitPrice < result.products[0].unitPrice);
  assert.equal(result.cheapest[0].id, 'slightly-cheaper');
  assert.ok(result.unitPriceDifference > 0);
});

test('preços zero e quantidades decimais são aceitos sem NaN ou Infinity', () => {
  const result = compareProducts([product('fraction', '0,00', '0,125', 'kg'), product('zero', '0,00', '250', 'g')]);
  assert.equal(result.valid, true);
  assert.equal(result.savingsPercent, null);
  assert.doesNotMatch(JSON.stringify(result), /NaN|Infinity/);
});

test('rejeita dimensões incompatíveis e unidades inválidas', () => {
  assert.match(compareProducts([product('mass', '1', '1', 'kg'), product('volume', '1', '1', 'L')]).error, /incompatíveis/);
  assert.match(compareProducts([product('length', '1', '1', 'm'), product('count', '1', '1', 'unidade')]).error, /incompatíveis/);
  assert.match(compareProducts([product('a', '1', '1', 'kg'), product('b', '1', '1', 'nonsense')]).error, /unidade de medida válida/);
});

test('valida quantidade de produtos, IDs únicos, campos obrigatórios e valores negativos ou inválidos', () => {
  assert.match(compareProducts([product('one', '1', '1', 'kg')]).error, /pelo menos dois/);
  assert.match(compareProducts(Array.from({ length: 6 }, (_, i) => product(String(i), '1', '1', 'g'))).error, /no máximo cinco/);
  assert.match(compareProducts([product('same', '1', '1', 'g'), product('same', '1', '1', 'g')]).error, /identificador único/);
  assert.match(compareProducts([product('a', '', '1', 'g'), product('b', '1', '1', 'g')]).error, /preço total/);
  assert.match(compareProducts([product('a', '-1,00', '1', 'g'), product('b', '1', '1', 'g')]).error, /preço válido/);
  assert.match(compareProducts([product('a', 'abc', '1', 'g'), product('b', '1', '1', 'g')]).error, /preço válido/);
  assert.match(compareProducts([product('a', '1', '0', 'g'), product('b', '1', '1', 'g')]).error, /quantidade.*maior que zero/);
  assert.match(compareProducts([product('a', '1', '-1', 'g'), product('b', '1', '1', 'g')]).error, /quantidade.*maior que zero/);
  assert.match(compareProducts([product('a', '1', '1', 'g', '0'), product('b', '1', '1', 'g')]).error, /número inteiro.*maior que zero/);
  assert.match(compareProducts([product('a', '1', '1', 'g', '1,5'), product('b', '1', '1', 'g')]).error, /número inteiro/);
});

test('catálogo Factory, navegação, sitemap e IDs de favoritos são únicos e integrados', () => {
  const record = tools.find(item => item.id === 'comparador-precos');
  assert.ok(record);
  assert.equal(record.name, 'Comparador de Preços por Unidade');
  assert.equal(record.categorySlug, 'utilidades');
  assert.equal(record.url, '/tools/utilidades/comparador-precos.html');
  assert.equal(record.status, 'published');
  assert.equal(tools.filter(item => item.url === record.url).length, 1);
  assert.ok(VALID_TOOL_IDS.has('comparador-precos'));
  const page = fs.readFileSync(new URL('../src/pages/tools/utilidades/comparador-precos.page.html', import.meta.url), 'utf8');
  const script = fs.readFileSync(new URL('../js/tools/comparador-precos.js', import.meta.url), 'utf8');
  const catalog = fs.readFileSync(new URL('../js/tools-catalog.js', import.meta.url), 'utf8');
  const sitemap = fs.readFileSync(new URL('../sitemap.xml', import.meta.url), 'utf8');
  const css = fs.readFileSync(new URL('../css/style.css', import.meta.url), 'utf8');
  assert.match(catalog, /"id": "comparador-precos"/);
  assert.equal((sitemap.match(/tools\/utilidades\/comparador-precos\.html/g) || []).length, 1);
  assert.match(page, /id="formComparadorPrecos"/);
  assert.match(script, /createResultActions/);
  assert.match(script, /dataset\.productId/);
  assert.match(script, /PRODUCT_LIMITS\.max/);
  assert.match(css, /#formComparadorPrecos[\s\S]*unit-comparator-explanatory-content/);
});

test('adicionar, remover, limpar e editar linhas preservam IDs de produtos e invalidam resultados antigos', () => {
  const script = fs.readFileSync(new URL('../js/tools/comparador-precos.js', import.meta.url), 'utf8');
  const page = fs.readFileSync(new URL('../src/pages/tools/utilidades/comparador-precos.page.html', import.meta.url), 'utf8');
  assert.deepEqual(PRODUCT_LIMITS, { min: 2, max: 5 });
  assert.match(script, /const productId = `comparador-produto-\$\{\+\+productSequence\}`/);
  assert.match(script, /row\.dataset\.productId = productId/);
  assert.match(script, /row\.remove\(\)/);
  assert.match(script, /onChange\?\.\(\)/);
  assert.match(script, /container\.replaceChildren\(\)/);
  assert.match(script, /form\.addEventListener\('input', invalidate\)/);
  assert.match(script, /form\.addEventListener\('change', invalidate\)/);
  assert.match(page, /id="adicionarProdutoComparador"/);
  assert.match(page, /id="limparComparadorPrecos"/);
});

test('favoritar e desfavoritar usa storage compartilhado, sem criar armazenamento de produtos', () => {
  const store = new Map();
  globalThis.localStorage = { getItem: key => store.get(key) ?? null, setItem: (key, value) => store.set(key, String(value)) };
  _resetMemoryForTesting();
  try {
    assert.equal(addFavorite('comparador-precos'), true);
    assert.deepEqual(JSON.parse(store.get(STORAGE_KEY)), ['comparador-precos']);
    _resetMemoryForTesting();
    assert.deepEqual(getFavorites(), ['comparador-precos']);
    assert.equal(removeFavorite('comparador-precos'), true);
    assert.deepEqual(JSON.parse(store.get(STORAGE_KEY)), []);
  } finally {
    delete globalThis.localStorage;
    _resetMemoryForTesting();
  }
});

test('compartilhamento usa título e URL canônicos sem dados nos parâmetros; impressão conserva o resultado', () => {
  const script = fs.readFileSync(new URL('../js/tools/comparador-precos.js', import.meta.url), 'utf8');
  const page = fs.readFileSync(new URL('../src/pages/tools/utilidades/comparador-precos.page.html', import.meta.url), 'utf8');
  assert.match(script, /title: 'Comparador de Preços por Unidade — Calculadora Master'/);
  assert.match(script, /actions\.share\(`\$\{window\.location\.origin\}\/tools\/utilidades\/comparador-precos\.html`\)/);
  assert.doesNotMatch(script, /URLSearchParams|searchParams\.set/);
  assert.match(script, /actions\.print\(\)/);
  assert.match(page, /id="compartilharComparadorPrecos"/);
  assert.match(page, /id="imprimirComparadorPrecos"/);
});

test('a lista de dimensões contém somente os grupos previstos', () => {
  assert.deepEqual([...new Set(Object.values(COMPARISON_UNITS).map(unit => unit.dimension))], ['massa', 'volume', 'comprimento', 'quantidade']);
});
