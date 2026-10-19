import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import tools from '../data/tools.json' with { type: 'json' };
import { calculatePortionCost, INGREDIENT_LIMIT } from '../js/tools/custo-por-porcao.js';
import { COMPARISON_UNITS } from '../js/tools/comparador-precos.js';
import { VALID_TOOL_IDS, STORAGE_KEY, addFavorite, removeFavorite, getFavorites, _resetMemoryForTesting } from '../js/core/favorites.js';

const item = (name, packagePrice, packageQuantity, packageUnit, usedQuantity, usedUnit) => ({ name, packagePrice, packageQuantity, packageUnit, usedQuantity, usedUnit });

test('exemplo obrigatório calcula custos proporcionais e custo por porção', () => {
  const result = calculatePortionCost({
    recipeName: 'Arroz com molho', portions: '4',
    ingredients: [item('Arroz', '8,00', '1', 'kg', '300', 'g'), item('Molho', '4,00', '300', 'g', '150', 'g')]
  });
  assert.equal(result.valid, true);
  assert.deepEqual(result.ingredients.map(value => value.cost), [2.4, 2]);
  assert.equal(result.totalCost, 4.4);
  assert.equal(result.costPerPortion, 1.1);
  assert.equal(result.recipeName, 'Arroz com molho');
});

test('calcula proporção individual para mg/g e para embalagem com quantidades diferentes', () => {
  const result = calculatePortionCost({ portions: '2', ingredients: [item('tempero', '10,00', '100', 'g', '500', 'mg')] });
  assert.equal(result.valid, true);
  assert.ok(Math.abs(result.ingredients[0].cost - 0.05) < 1e-12);
});

test('converte volume de L para mL sem supor equivalência entre massa e volume', () => {
  const result = calculatePortionCost({ portions: '3', ingredients: [item('óleo', '12,50', '1', 'L', '250', 'mL')] });
  assert.equal(result.valid, true);
  assert.equal(result.totalCost, 3.125);
  assert.equal(result.costPerPortion, 3.125 / 3);
  assert.match(calculatePortionCost({ portions: '1', ingredients: [item('leite', '5', '1', 'L', '100', 'g')] }).error, /incompatíveis/);
});

test('calcula contagem por unidade e aceita decimais em moeda, quantidades e porções', () => {
  const result = calculatePortionCost({ portions: '2,5', ingredients: [item('ovos', '9,50', '10', 'unidade', '3', 'unidade')] });
  assert.equal(result.valid, true);
  assert.equal(result.totalCost, 2.85);
  assert.ok(Math.abs(result.costPerPortion - 1.14) < 1e-12);
});

test('aceita preço zero para ingrediente sem custo e evita NaN/Infinity', () => {
  const result = calculatePortionCost({ portions: '4', ingredients: [item('sal da despensa', '0,00', '1', 'kg', '10', 'g')] });
  assert.equal(result.valid, true);
  assert.equal(result.totalCost, 0);
  assert.doesNotMatch(JSON.stringify(result), /NaN|Infinity/);
});

test('valida porções, ingredientes obrigatórios, preços e quantidades inválidos', () => {
  const one = item('arroz', '8,00', '1', 'kg', '300', 'g');
  assert.match(calculatePortionCost({ portions: '', ingredients: [one] }).error, /porções/);
  assert.match(calculatePortionCost({ portions: '0', ingredients: [one] }).error, /porções/);
  assert.match(calculatePortionCost({ portions: '-2', ingredients: [one] }).error, /porções/);
  assert.match(calculatePortionCost({ portions: '4', ingredients: [] }).error, /pelo menos um ingrediente/);
  assert.match(calculatePortionCost({ portions: '4', ingredients: [{ ...one, name: '' }] }).error, /nome do ingrediente/);
  assert.match(calculatePortionCost({ portions: '4', ingredients: [{ ...one, packagePrice: '' }] }).error, /preço da embalagem/);
  assert.match(calculatePortionCost({ portions: '4', ingredients: [{ ...one, packagePrice: '-1,00' }] }).error, /preço válido/);
  assert.match(calculatePortionCost({ portions: '4', ingredients: [{ ...one, packagePrice: 'inválido' }] }).error, /preço válido/);
  assert.match(calculatePortionCost({ portions: '4', ingredients: [{ ...one, packageQuantity: '0' }] }).error, /embalagem.*maior que zero/);
  assert.match(calculatePortionCost({ portions: '4', ingredients: [{ ...one, packageQuantity: '-1' }] }).error, /embalagem.*maior que zero/);
  assert.match(calculatePortionCost({ portions: '4', ingredients: [{ ...one, usedQuantity: '0' }] }).error, /utilizada.*maior que zero/);
  assert.match(calculatePortionCost({ portions: '4', ingredients: [{ ...one, usedQuantity: '-1' }] }).error, /utilizada.*maior que zero/);
  assert.match(calculatePortionCost({ portions: '4', ingredients: [{ ...one, usedUnit: 'L' }] }).error, /incompatíveis/);
  assert.match(calculatePortionCost({ portions: '4', ingredients: [{ ...one, usedUnit: 'medida caseira' }] }).error, /unidades.*válidas/);
  assert.match(calculatePortionCost({ portions: '4', ingredients: Array.from({ length: INGREDIENT_LIMIT + 1 }, (_, i) => ({ ...one, name: `Item ${i}` })) }).error, /no máximo 20/);
});

test('reutiliza as unidades normalizadas pelo comparador sem duplicar fatores', () => {
  assert.deepEqual(Object.keys(COMPARISON_UNITS), ['mg', 'g', 'kg', 'mL', 'L', 'mm', 'cm', 'm', 'unidade']);
  assert.equal(COMPARISON_UNITS.kg.factor, 1);
  assert.equal(COMPARISON_UNITS.g.factor, 0.001);
  assert.equal(COMPARISON_UNITS.L.factor, 1);
  assert.equal(COMPARISON_UNITS.mL.factor, 0.001);
});

test('registra uma única ferramenta Factory em Utilidades, favoritos, catálogo e sitemap', () => {
  const entries = tools.filter(value => value.id === 'custo-por-porcao');
  assert.equal(entries.length, 1);
  assert.equal(entries[0].name, 'Calculadora de Custo por Porção');
  assert.equal(entries[0].url, '/tools/utilidades/custo-por-porcao.html');
  assert.equal(entries[0].categorySlug, 'utilidades');
  assert.equal(entries[0].formulaStatus, 'verified');
  assert.ok(VALID_TOOL_IDS.has('custo-por-porcao'));
  assert.match(fs.readFileSync(new URL('../js/tools-catalog.js', import.meta.url), 'utf8'), /"id": "custo-por-porcao"/);
  assert.match(fs.readFileSync(new URL('../sitemap.xml', import.meta.url), 'utf8'), /tools\/utilidades\/custo-por-porcao\.html/);
});

test('favoritar e desfavoritar custo-por-porcao persiste sem remover favoritos existentes', () => {
  const originalWindow = globalThis.window;
  const values = new Map([[STORAGE_KEY, JSON.stringify(['juros'])]]);
  globalThis.window = { localStorage: {
    getItem: key => values.has(key) ? values.get(key) : null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: key => values.delete(key)
  } };
  try {
    _resetMemoryForTesting();
    assert.equal(addFavorite('custo-por-porcao'), true);
    assert.deepEqual(JSON.parse(values.get(STORAGE_KEY)), ['juros', 'custo-por-porcao']);
    _resetMemoryForTesting();
    assert.deepEqual(getFavorites(), ['juros', 'custo-por-porcao']);
    assert.equal(removeFavorite('custo-por-porcao'), true);
    assert.deepEqual(JSON.parse(values.get(STORAGE_KEY)), ['juros']);
  } finally {
    if (originalWindow === undefined) delete globalThis.window;
    else globalThis.window = originalWindow;
    _resetMemoryForTesting();
  }
});

test('usa os mecanismos compartilhados e compartilhar não recebe conteúdo privado', () => {
  const source = fs.readFileSync(new URL('../js/tools/custo-por-porcao.js', import.meta.url), 'utf8');
  const page = fs.readFileSync(new URL('../src/pages/tools/utilidades/custo-por-porcao.page.html', import.meta.url), 'utf8');
  assert.match(source, /createResultActions/);
  assert.match(source, /actions\.print\(\)/);
  assert.match(source, /actions\.copy\(\)/);
  assert.match(source, /shareResult\(\{ title, text: url, url \}/);
  assert.doesNotMatch(source, /shareResult\(\{[^}]*text:\s*(?:actions\.getText|formatResultText|sections\()/s);
  assert.match(source, /tools\/utilidades\/custo-por-porcao\.html/);
  assert.match(page, /id="listaIngredientesResultadoCusto"/);
  assert.match(page, /id="limparCustoPorPorcao"/);
  assert.match(page, /id="adicionarIngredienteCusto"/);
});
