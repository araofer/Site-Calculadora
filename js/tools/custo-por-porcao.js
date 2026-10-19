import { createResultActions, shareResult } from '../core/result-actions.js';
import { COMPARISON_UNITS } from './comparador-precos.js';
import { parseMoneyInput } from './orcamento-domestico.js';
import { parseEnergyNumber } from './conta-luz.js';

export const INGREDIENT_LIMIT = 20;
const MAX_PRICE = 1_000_000_000_000;
const MAX_QUANTITY = 1_000_000_000_000;

function invalid(error) { return { valid: false, error }; }

/** Calcula custos proporcionais sem arredondar valores intermediários. */
export function calculatePortionCost(input = {}) {
  const portionsText = String(input.portions ?? '').trim();
  const portions = portionsText ? parseEnergyNumber(portionsText) : NaN;
  if (!Number.isFinite(portions) || portions <= 0 || portions > MAX_QUANTITY) {
    return invalid('Informe um número de porções válido e maior que zero.');
  }
  if (!Array.isArray(input.ingredients) || input.ingredients.length === 0) {
    return invalid('Adicione pelo menos um ingrediente completo.');
  }
  if (input.ingredients.length > INGREDIENT_LIMIT) return invalid(`É possível informar no máximo ${INGREDIENT_LIMIT} ingredientes.`);

  const ingredients = [];
  for (let index = 0; index < input.ingredients.length; index += 1) {
    const item = input.ingredients[index] && typeof input.ingredients[index] === 'object' ? input.ingredients[index] : {};
    const label = `Ingrediente ${index + 1}`;
    const name = String(item.name ?? '').trim();
    if (!name) return invalid(`${label}: informe o nome do ingrediente.`);
    if (name.length > 100) return invalid(`${label}: o nome deve ter até 100 caracteres.`);
    if (String(item.packagePrice ?? '').trim() === '') return invalid(`${label}: informe o preço da embalagem.`);
    const packagePrice = parseMoneyInput(item.packagePrice);
    if (!Number.isFinite(packagePrice) || packagePrice < 0 || packagePrice > MAX_PRICE) return invalid(`${label}: informe um preço válido, igual ou maior que zero.`);

    const packageQuantity = parseEnergyNumber(item.packageQuantity);
    if (!Number.isFinite(packageQuantity) || packageQuantity <= 0 || packageQuantity > MAX_QUANTITY) return invalid(`${label}: a quantidade da embalagem deve ser válida e maior que zero.`);
    const usedQuantity = parseEnergyNumber(item.usedQuantity);
    if (!Number.isFinite(usedQuantity) || usedQuantity <= 0 || usedQuantity > MAX_QUANTITY) return invalid(`${label}: a quantidade utilizada deve ser válida e maior que zero.`);

    const packageUnit = COMPARISON_UNITS[String(item.packageUnit ?? '')];
    const usedUnit = COMPARISON_UNITS[String(item.usedUnit ?? '')];
    if (!packageUnit || !usedUnit) return invalid(`${label}: selecione unidades de medida válidas.`);
    if (packageUnit.dimension !== usedUnit.dimension) return invalid(`${label}: as unidades da embalagem e do uso são incompatíveis. Use massa com massa, volume com volume ou unidade com unidade.`);
    if (!['massa', 'volume', 'quantidade'].includes(packageUnit.dimension)) return invalid(`${label}: dimensão de unidade não suportada.`);

    const packageQuantityNormalized = packageQuantity * packageUnit.factor;
    const usedQuantityNormalized = usedQuantity * usedUnit.factor;
    const cost = packagePrice * usedQuantityNormalized / packageQuantityNormalized;
    if (![packageQuantityNormalized, usedQuantityNormalized, cost].every(Number.isFinite) || packageQuantityNormalized <= 0 || usedQuantityNormalized <= 0 || cost < 0) {
      return invalid(`${label}: os valores excedem o limite numérico suportado.`);
    }
    ingredients.push({
      name, packagePrice, packageQuantity, packageUnit: String(item.packageUnit),
      usedQuantity, usedUnit: String(item.usedUnit), cost,
      packageQuantityNormalized, usedQuantityNormalized,
      dimension: packageUnit.dimension
    });
  }

  const totalCost = ingredients.reduce((sum, item) => sum + item.cost, 0);
  const costPerPortion = totalCost / portions;
  if (![totalCost, costPerPortion].every(Number.isFinite)) return invalid('Não foi possível calcular com esses valores. Confira os dados informados.');
  return { valid: true, recipeName: String(input.recipeName ?? '').trim(), portions, ingredients, totalCost, costPerPortion };
}

const money = value => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
const quantity = value => new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 6 }).format(value);
const unitLabel = unit => unit === 'unidade' ? 'unidade(s)' : unit;
const unitGroups = [['Massa', ['mg', 'g', 'kg']], ['Volume', ['mL', 'L']], ['Contagem', ['unidade']]];
let ingredientSequence = 0;

function createField(labelText, input, ingredientId, field) {
  const group = document.createElement('div'); group.className = 'form-group';
  const label = document.createElement('label'); label.htmlFor = `${field}-${ingredientId}`; label.textContent = labelText;
  input.id = `${field}-${ingredientId}`; input.dataset.field = field;
  group.append(label, input); return group;
}

function makeUnitSelect(id, field) {
  const select = document.createElement('select'); select.id = `${field}-${id}`; select.dataset.field = field;
  for (const [groupName, values] of unitGroups) {
    const group = document.createElement('optgroup'); group.label = groupName;
    values.forEach(value => { const option = document.createElement('option'); option.value = value; option.textContent = value; group.append(option); });
    select.append(group);
  }
  select.value = 'g';
  return select;
}

function addIngredientRow(container, addButton, onChange) {
  if (container.querySelectorAll('[data-ingredient-row]').length >= INGREDIENT_LIMIT) return null;
  const id = `custo-ingrediente-${++ingredientSequence}`;
  const row = document.createElement('article'); row.className = 'unit-comparator-product portion-ingredient-row';
  row.dataset.ingredientRow = ''; row.dataset.ingredientId = id;
  const heading = document.createElement('h3'); heading.textContent = `Ingrediente ${container.querySelectorAll('[data-ingredient-row]').length + 1}`; row.append(heading);

  const name = document.createElement('input'); name.type = 'text'; name.maxLength = 100; name.autocomplete = 'off'; name.placeholder = 'Ex.: Arroz';
  row.append(createField('Nome do ingrediente:', name, id, 'name'));
  const price = document.createElement('input'); price.type = 'text'; price.inputMode = 'decimal'; price.autocomplete = 'off'; price.placeholder = 'Ex.: 8,00';
  row.append(createField('Preço da embalagem (R$):', price, id, 'packagePrice'));
  const packQty = document.createElement('input'); packQty.type = 'text'; packQty.inputMode = 'decimal'; packQty.autocomplete = 'off'; packQty.placeholder = 'Ex.: 1';
  row.append(createField('Quantidade na embalagem:', packQty, id, 'packageQuantity'));
  row.append(createField('Unidade da embalagem:', makeUnitSelect(id, 'packageUnit'), id, 'packageUnit'));
  const usedQty = document.createElement('input'); usedQty.type = 'text'; usedQty.inputMode = 'decimal'; usedQty.autocomplete = 'off'; usedQty.placeholder = 'Ex.: 300';
  row.append(createField('Quantidade usada na receita:', usedQty, id, 'usedQuantity'));
  row.append(createField('Unidade utilizada:', makeUnitSelect(id, 'usedUnit'), id, 'usedUnit'));

  const remove = document.createElement('button'); remove.type = 'button'; remove.className = 'tool-btn tool-btn-secondary unit-comparator-remove'; remove.dataset.removeIngredient = ''; remove.textContent = 'Remover ingrediente';
  remove.addEventListener('click', () => { row.remove(); refreshRows(container, addButton); onChange(); });
  row.append(remove); container.append(row); refreshRows(container, addButton); return row;
}

function refreshRows(container, addButton) {
  const rows = [...container.querySelectorAll('[data-ingredient-row]')];
  addButton.disabled = rows.length >= INGREDIENT_LIMIT;
  document.getElementById('limiteIngredientesCusto').hidden = rows.length < INGREDIENT_LIMIT;
  rows.forEach((row, index) => {
    row.querySelector('h3').textContent = `Ingrediente ${index + 1}`;
    const remove = row.querySelector('[data-remove-ingredient]');
    remove.setAttribute('aria-label', `Remover Ingrediente ${index + 1}`);
  });
}

function sections(result) {
  return [
    { label: 'Receita', value: result.recipeName || 'Receita sem nome' },
    { label: 'Número de porções', value: quantity(result.portions) },
    { title: 'Ingredientes', items: result.ingredients.map(item => ({ label: item.name, value: `${quantity(item.usedQuantity)} ${unitLabel(item.usedUnit)} usados; custo ${money(item.cost)}` })) },
    { label: 'Custo total da receita', value: money(result.totalCost) },
    { label: 'Custo por porção', value: money(result.costPerPortion) }
  ];
}

function render(result) {
  document.getElementById('nomeReceitaResultadoCusto').textContent = result.recipeName || 'Receita sem nome';
  document.getElementById('porcoesResultadoCusto').textContent = quantity(result.portions);
  document.getElementById('totalResultadoCusto').textContent = money(result.totalCost);
  document.getElementById('porPorcaoResultadoCusto').textContent = money(result.costPerPortion);
  const list = document.getElementById('listaIngredientesResultadoCusto'); list.replaceChildren();
  result.ingredients.forEach(item => {
    const line = document.createElement('li'); const heading = document.createElement('h4'); heading.textContent = item.name;
    const detail = document.createElement('p');
    detail.textContent = `${quantity(item.usedQuantity)} ${unitLabel(item.usedUnit)} usados · embalagem: ${money(item.packagePrice)} por ${quantity(item.packageQuantity)} ${unitLabel(item.packageUnit)} · custo proporcional: ${money(item.cost)}`;
    line.append(heading, detail); list.append(line);
  });
}

export function setupTool() {
  if (typeof document === 'undefined') return;
  const form = document.getElementById('formCustoPorPorcao'); if (!form) return;
  const rows = document.getElementById('linhasIngredientesCusto');
  const addButton = document.getElementById('adicionarIngredienteCusto');
  const error = document.getElementById('erroCustoPorPorcao');
  const panel = document.getElementById('resultadoCustoPorPorcao');
  const status = document.getElementById('statusCustoPorPorcao');
  const copy = document.getElementById('copiarCustoPorPorcao');
  const share = document.getElementById('compartilharCustoPorPorcao');
  const print = document.getElementById('imprimirCustoPorPorcao');
  let last = null;
  const actions = createResultActions({ title: 'Calculadora de Custo por Porção — Calculadora Master', getSections: () => last ? sections(last) : [], statusElement: status });
  const title = 'Calculadora de Custo por Porção — Calculadora Master';
  const invalidate = () => { last = null; panel.hidden = true; error.hidden = true; error.textContent = ''; [copy, share, print].forEach(button => { button.hidden = true; }); };
  addIngredientRow(rows, addButton, invalidate);
  addButton.addEventListener('click', () => { if (addIngredientRow(rows, addButton, invalidate)) invalidate(); });
  form.addEventListener('input', invalidate); form.addEventListener('change', invalidate);
  form.addEventListener('submit', event => {
    event.preventDefault(); if (status) status.textContent = '';
    const ingredients = [...rows.querySelectorAll('[data-ingredient-row]')].map(row => {
      const read = field => row.querySelector(`[data-field="${field}"]`)?.value;
      return { id: row.dataset.ingredientId, name: read('name'), packagePrice: read('packagePrice'), packageQuantity: read('packageQuantity'), packageUnit: read('packageUnit'), usedQuantity: read('usedQuantity'), usedUnit: read('usedUnit') };
    });
    const result = calculatePortionCost({ recipeName: document.getElementById('nomeReceitaCusto').value, portions: document.getElementById('porcoesReceitaCusto').value, ingredients });
    if (!result.valid) { last = null; error.textContent = result.error; error.hidden = false; panel.hidden = true; [copy, share, print].forEach(button => { button.hidden = true; }); return; }
    error.hidden = true; error.textContent = ''; render(result); last = result; panel.hidden = false; [copy, share, print].forEach(button => { button.hidden = false; });
  });
  document.getElementById('limparCustoPorPorcao').addEventListener('click', () => {
    form.reset(); rows.replaceChildren(); addIngredientRow(rows, addButton, invalidate); invalidate(); refreshRows(rows, addButton);
    document.getElementById('limiteIngredientesCusto').hidden = true; if (status) status.textContent = '';
  });
  copy.addEventListener('click', () => last && actions.copy());
  share.addEventListener('click', () => {
    if (!last) return;
    const url = `${window.location.origin}/tools/utilidades/custo-por-porcao.html`;
    shareResult({ title, text: url, url }, status);
  });
  print.addEventListener('click', () => last && actions.print());
}

if (typeof document !== 'undefined') document.addEventListener('DOMContentLoaded', setupTool);
