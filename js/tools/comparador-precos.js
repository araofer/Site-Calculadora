import { createResultActions } from '../core/result-actions.js';
import { parseMoneyInput } from './orcamento-domestico.js';
import { parseEnergyNumber } from './conta-luz.js';

export const PRODUCT_LIMITS = Object.freeze({ min: 2, max: 5 });
export const COMPARISON_UNITS = Object.freeze({
  mg: { dimension: 'massa', baseUnit: 'kg', factor: 0.000001, symbol: 'mg' },
  g: { dimension: 'massa', baseUnit: 'kg', factor: 0.001, symbol: 'g' },
  kg: { dimension: 'massa', baseUnit: 'kg', factor: 1, symbol: 'kg' },
  mL: { dimension: 'volume', baseUnit: 'L', factor: 0.001, symbol: 'mL' },
  L: { dimension: 'volume', baseUnit: 'L', factor: 1, symbol: 'L' },
  mm: { dimension: 'comprimento', baseUnit: 'm', factor: 0.001, symbol: 'mm' },
  cm: { dimension: 'comprimento', baseUnit: 'm', factor: 0.01, symbol: 'cm' },
  m: { dimension: 'comprimento', baseUnit: 'm', factor: 1, symbol: 'm' },
  unidade: { dimension: 'quantidade', baseUnit: 'unidade', factor: 1, symbol: 'unidade' }
});

const MAX_PRICE = 1_000_000_000_000;
const MAX_QUANTITY = 1_000_000_000_000;
const MAX_PACKAGES = 1_000_000;

function invalid(error) {
  return { valid: false, error };
}

function parseQuantity(raw) {
  if (String(raw ?? '').trim() === '') return NaN;
  return parseEnergyNumber(raw);
}

function closeEnough(a, b) {
  return Math.abs(a - b) <= Number.EPSILON * Math.max(1, Math.abs(a), Math.abs(b)) * 16;
}

/** Compara produtos somente depois de normalizar quantidades na mesma dimensão. */
export function compareProducts(products = []) {
  if (!Array.isArray(products) || products.length < PRODUCT_LIMITS.min) {
    return invalid('Informe pelo menos dois produtos completos para comparar.');
  }
  if (products.length > PRODUCT_LIMITS.max) return invalid('É possível comparar no máximo cinco produtos por vez.');

  const ids = new Set();
  const normalized = [];
  let dimension = null;
  let baseUnit = null;

  for (let index = 0; index < products.length; index += 1) {
    const product = products[index] && typeof products[index] === 'object' ? products[index] : {};
    const label = `Produto ${index + 1}`;
    const id = String(product.id ?? '').trim();
    if (!id) return invalid(`${label}: identificador do produto inválido.`);
    if (ids.has(id)) return invalid('Cada produto precisa ter um identificador único.');
    ids.add(id);

    const name = String(product.name ?? '').trim();
    if (String(product.price ?? '').trim() === '') return invalid(`${label}: informe o preço total da embalagem.`);
    const price = parseMoneyInput(product.price);
    if (!Number.isFinite(price) || price < 0 || price > MAX_PRICE) return invalid(`${label}: informe um preço válido, igual ou maior que zero.`);

    const quantity = parseQuantity(product.quantity);
    if (!Number.isFinite(quantity) || quantity <= 0 || quantity > MAX_QUANTITY) return invalid(`${label}: a quantidade deve ser válida e maior que zero.`);

    const packageCount = parseQuantity(product.packages);
    if (!Number.isInteger(packageCount) || packageCount <= 0 || packageCount > MAX_PACKAGES) return invalid(`${label}: informe um número inteiro de embalagens maior que zero.`);

    const unit = COMPARISON_UNITS[String(product.unit ?? '')];
    if (!unit) return invalid(`${label}: selecione uma unidade de medida válida.`);
    if (dimension && unit.dimension !== dimension) {
      return invalid('As unidades selecionadas são incompatíveis. Compare apenas produtos da mesma dimensão (massa, volume, comprimento ou quantidade).');
    }
    dimension = unit.dimension;
    baseUnit = unit.baseUnit;

    const totalPrice = price * packageCount;
    const totalQuantity = quantity * unit.factor * packageCount;
    const unitPrice = totalPrice / totalQuantity;
    if (![totalPrice, totalQuantity, unitPrice].every(Number.isFinite) || totalQuantity <= 0) {
      return invalid(`${label}: os valores excedem o limite numérico suportado.`);
    }
    normalized.push({
      id,
      name: name || label,
      unit: String(product.unit),
      dimension: unit.dimension,
      baseUnit: unit.baseUnit,
      originalQuantity: quantity,
      packages: packageCount,
      totalPrice,
      totalQuantity,
      unitPrice
    });
  }

  const minPrice = Math.min(...normalized.map(item => item.unitPrice));
  const maxPrice = Math.max(...normalized.map(item => item.unitPrice));
  const cheapest = normalized.filter(item => closeEnough(item.unitPrice, minPrice));
  const mostExpensive = normalized.filter(item => closeEnough(item.unitPrice, maxPrice));
  const lowestOutlay = Math.min(...normalized.map(item => item.totalPrice));
  const lowestOutlayProducts = normalized.filter(item => closeEnough(item.totalPrice, lowestOutlay));
  const difference = maxPrice - minPrice;
  const savingsPercent = difference > 0 && maxPrice > 0 ? difference / maxPrice * 100 : null;
  const equivalentQuantity = Math.max(...normalized.map(item => item.totalQuantity));
  const equivalentSavings = difference > 0 ? difference * equivalentQuantity : 0;

  return {
    valid: true,
    dimension,
    baseUnit,
    standardizedUnit: baseUnit === 'unidade' ? 'unidade' : baseUnit,
    unitPriceLabel: baseUnit === 'unidade' ? 'R$/unidade' : `R$/${baseUnit}`,
    products: normalized,
    cheapest,
    mostExpensive,
    lowestOutlay,
    lowestOutlayProducts,
    minUnitPrice: minPrice,
    maxUnitPrice: maxPrice,
    unitPriceDifference: difference,
    savingsPercent,
    equivalentQuantity,
    equivalentSavings
  };
}

const formatMoney = value => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
const formatUnitPrice = value => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 8 }).format(value);
const formatQuantity = value => new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 6 }).format(value);
const formatPercent = value => `${new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 6 }).format(value)}%`;
const dimensionNames = { massa: 'Massa', volume: 'Volume', comprimento: 'Comprimento', quantidade: 'Quantidade' };
let productSequence = 0;

function createField(labelText, input, productId, field) {
  const group = document.createElement('div');
  group.className = 'form-group';
  const label = document.createElement('label');
  label.htmlFor = `${field}-${productId}`;
  label.textContent = labelText;
  input.id = `${field}-${productId}`;
  input.dataset.field = field;
  group.append(label, input);
  return group;
}

function updateRowControls(container, addButton) {
  const rows = [...container.querySelectorAll('[data-product-row]')];
  addButton.disabled = rows.length >= PRODUCT_LIMITS.max;
  rows.forEach((row, index) => {
    const title = row.querySelector('h3');
    const remove = row.querySelector('[data-remove-product]');
    if (title) title.textContent = `Produto ${index + 1}`;
    if (remove) remove.setAttribute('aria-label', `Remover Produto ${index + 1}`);
    if (remove) remove.disabled = rows.length <= PRODUCT_LIMITS.min;
  });
}

function addProductRow(container, addButton, onChange = null) {
  const rowCount = container.querySelectorAll('[data-product-row]').length;
  if (rowCount >= PRODUCT_LIMITS.max) return null;
  const productId = `comparador-produto-${++productSequence}`;
  const row = document.createElement('article');
  row.className = 'unit-comparator-product';
  row.dataset.productRow = '';
  row.dataset.productId = productId;

  const heading = document.createElement('h3');
  heading.textContent = `Produto ${rowCount + 1}`;
  row.append(heading);

  const name = document.createElement('input');
  name.type = 'text'; name.autocomplete = 'off'; name.maxLength = 80;
  name.placeholder = 'Ex.: Marca ou descrição';
  row.append(createField('Nome ou descrição (opcional):', name, productId, 'name'));

  const price = document.createElement('input');
  price.type = 'text'; price.inputMode = 'decimal'; price.autocomplete = 'off'; price.placeholder = 'Ex.: 8,50';
  row.append(createField('Preço total da embalagem (R$):', price, productId, 'price'));

  const quantity = document.createElement('input');
  quantity.type = 'text'; quantity.inputMode = 'decimal'; quantity.autocomplete = 'off'; quantity.placeholder = 'Ex.: 500';
  row.append(createField('Quantidade por embalagem:', quantity, productId, 'quantity'));

  const unit = document.createElement('select');
  unit.dataset.field = 'unit'; unit.id = `unit-${productId}`;
  const groups = [
    ['Massa', ['mg', 'g', 'kg']],
    ['Volume', ['mL', 'L']],
    ['Comprimento', ['mm', 'cm', 'm']],
    ['Quantidade', ['unidade']]
  ];
  groups.forEach(([groupName, units]) => {
    const optgroup = document.createElement('optgroup'); optgroup.label = groupName;
    units.forEach(unitValue => {
      const option = document.createElement('option'); option.value = unitValue;
      option.textContent = unitValue === 'unidade' ? 'unidade' : unitValue;
      optgroup.append(option);
    });
    unit.append(optgroup);
  });
  unit.value = 'g';
  row.append(createField('Unidade de medida:', unit, productId, 'unit'));

  const packages = document.createElement('input');
  packages.type = 'text'; packages.inputMode = 'numeric'; packages.autocomplete = 'off'; packages.value = '1';
  row.append(createField('Número de embalagens:', packages, productId, 'packages'));

  const remove = document.createElement('button');
  remove.type = 'button'; remove.className = 'tool-btn tool-btn-secondary unit-comparator-remove';
  remove.dataset.removeProduct = ''; remove.textContent = 'Remover produto';
  remove.setAttribute('aria-label', `Remover ${heading.textContent}`);
  remove.addEventListener('click', () => {
    row.remove();
    updateRowControls(container, addButton);
    onChange?.();
  });
  row.append(remove);
  container.append(row);
  updateRowControls(container, addButton);
  return row;
}

function resultSections(result) {
  if (!result) return [];
  return [
    { label: 'Dimensão', value: dimensionNames[result.dimension] },
    { label: 'Melhor preço unitário', value: result.cheapest.map(item => item.name).join(', ') },
    { label: 'Diferença unitária', value: `${formatUnitPrice(result.unitPriceDifference)} por ${result.standardizedUnit}` },
    { label: 'Economia percentual', value: result.savingsPercent === null ? 'Sem diferença de preço unitário' : formatPercent(result.savingsPercent) },
    { label: 'Economia na maior quantidade informada', value: formatMoney(result.equivalentSavings) },
    { label: 'Menor desembolso total', value: result.lowestOutlayProducts.map(item => `${item.name} (${formatMoney(item.totalPrice)})`).join(', ') },
    ...result.products.map(item => ({ label: item.name, value: `${formatMoney(item.totalPrice)} por ${formatQuantity(item.totalQuantity)} ${result.standardizedUnit}; ${formatUnitPrice(item.unitPrice)} por ${result.standardizedUnit}` }))
  ];
}

function renderComparison(result) {
  document.getElementById('dimensaoComparadorResultado').textContent = dimensionNames[result.dimension];
  document.getElementById('melhorOpcaoComparadorResultado').textContent = result.cheapest.length > 1
    ? `Empate entre ${result.cheapest.map(item => item.name).join(', ')} (${formatUnitPrice(result.minUnitPrice)} por ${result.standardizedUnit})`
    : `${result.cheapest[0].name} (${formatUnitPrice(result.minUnitPrice)} por ${result.standardizedUnit})`;
  document.getElementById('diferencaComparadorResultado').textContent = `${formatUnitPrice(result.unitPriceDifference)} por ${result.standardizedUnit}`;
  document.getElementById('percentualComparadorResultado').textContent = result.savingsPercent === null ? 'Não há diferença de preço unitário.' : formatPercent(result.savingsPercent);
  document.getElementById('economiaEquivalenteComparadorResultado').textContent = `${formatMoney(result.equivalentSavings)} em ${formatQuantity(result.equivalentQuantity)} ${result.standardizedUnit}`;
  document.getElementById('menorDesembolsoComparadorResultado').textContent = result.lowestOutlayProducts.length > 1
    ? `Empate: ${result.lowestOutlayProducts.map(item => `${item.name} (${formatMoney(item.totalPrice)})`).join(', ')}`
    : `${result.lowestOutlayProducts[0].name} (${formatMoney(result.lowestOutlay)})`;

  const list = document.getElementById('listaResultadosComparador');
  list.replaceChildren();
  result.products.forEach(item => {
    const line = document.createElement('li');
    if (result.cheapest.some(best => best.id === item.id)) line.className = 'unit-comparator-best';
    const heading = document.createElement('h4'); heading.textContent = item.name;
    if (result.cheapest.some(best => best.id === item.id)) {
      const badge = document.createElement('span'); badge.className = 'unit-comparator-badge';
      badge.textContent = result.cheapest.length > 1 ? 'Menor preço unitário — empate' : 'Menor preço unitário';
      heading.append(' ', badge);
    }
    const details = document.createElement('p');
    details.textContent = `Preço total: ${formatMoney(item.totalPrice)} · Quantidade total: ${formatQuantity(item.totalQuantity)} ${result.standardizedUnit} · Preço unitário: ${formatUnitPrice(item.unitPrice)} por ${result.standardizedUnit}`;
    line.append(heading, details);
    list.append(line);
  });
}

export function setupTool() {
  if (typeof document === 'undefined') return;
  const form = document.getElementById('formComparadorPrecos');
  if (!form) return;
  const container = document.getElementById('linhasProdutosComparador');
  const addButton = document.getElementById('adicionarProdutoComparador');
  const error = document.getElementById('erroComparadorPrecos');
  const panel = document.getElementById('resultadoComparadorPrecos');
  const status = document.getElementById('statusComparadorPrecos');
  const copy = document.getElementById('copiarComparadorPrecos');
  const share = document.getElementById('compartilharComparadorPrecos');
  const print = document.getElementById('imprimirComparadorPrecos');
  let lastResult = null;
  const actions = createResultActions({
    title: 'Comparador de Preços por Unidade — Calculadora Master',
    statusElement: status,
    getSections: () => resultSections(lastResult)
  });
  const invalidate = () => {
    lastResult = null;
    panel.hidden = true;
    error.hidden = true;
    error.textContent = '';
    [copy, share, print].forEach(button => { button.hidden = true; });
    if (status) status.textContent = '';
  };
  for (let index = 0; index < PRODUCT_LIMITS.min; index += 1) addProductRow(container, addButton, invalidate);
  addButton.addEventListener('click', () => { if (addProductRow(container, addButton, invalidate)) invalidate(); });
  form.addEventListener('input', invalidate);
  form.addEventListener('change', invalidate);
  form.addEventListener('submit', event => {
    event.preventDefault();
    if (status) status.textContent = '';
    const products = [...container.querySelectorAll('[data-product-row]')].map(row => {
      const read = field => row.querySelector(`[data-field="${field}"]`)?.value;
      return { id: row.dataset.productId, name: read('name'), price: read('price'), quantity: read('quantity'), unit: read('unit'), packages: read('packages') };
    });
    const result = compareProducts(products);
    if (!result.valid) {
      lastResult = null;
      error.textContent = result.error; error.hidden = false; panel.hidden = true;
      [copy, share, print].forEach(button => { button.hidden = true; });
      return;
    }
    error.textContent = ''; error.hidden = true;
    renderComparison(result);
    lastResult = result;
    panel.hidden = false;
    [copy, share, print].forEach(button => { button.hidden = false; });
  });
  document.getElementById('limparComparadorPrecos').addEventListener('click', () => {
    form.reset(); container.replaceChildren();
    for (let index = 0; index < PRODUCT_LIMITS.min; index += 1) addProductRow(container, addButton, invalidate);
    invalidate(); updateRowControls(container, addButton);
  });
  copy.addEventListener('click', () => lastResult && actions.copy());
  share.addEventListener('click', () => lastResult && actions.share(`${window.location.origin}/tools/utilidades/comparador-precos.html`));
  print.addEventListener('click', () => lastResult && actions.print());
}

if (typeof document !== 'undefined') document.addEventListener('DOMContentLoaded', setupTool);
