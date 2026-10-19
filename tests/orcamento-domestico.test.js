import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import {
  calculateBudget,
  formatBudgetResult,
  parseMoneyInput,
  EXPENSE_CATEGORIES
} from '../js/tools/orcamento-domestico.js';
import {
  VALID_TOOL_IDS,
  STORAGE_KEY,
  addFavorite,
  removeFavorite,
  getFavorites,
  _resetMemoryForTesting
} from '../js/core/favorites.js';

const require = createRequire(import.meta.url);
const { TOOLS_CATALOG } = require('../js/tools-catalog.js');
const pagina = fs.readFileSync(new URL('../src/pages/tools/financas/orcamento-domestico.page.html', import.meta.url), 'utf8');
const script = fs.readFileSync(new URL('../js/tools/orcamento-domestico.js', import.meta.url), 'utf8');

const income = { rendaPrincipal: '4.500,00', rendasAdicionais: '350,00', outrasReceitas: '200,00' };
const expenses = [
  { category: 'Moradia', description: 'Aluguel', amount: '1.500,00' },
  { category: 'Alimentação e supermercado', description: 'Supermercado', amount: '800,00' },
  { category: 'Água, energia elétrica e gás', description: 'Contas da casa', amount: '300,00' },
  { category: 'Internet e telefone', description: 'Internet', amount: '150,00' },
  { category: 'Transporte e combustível', description: 'Transporte', amount: '500,00' },
  { category: 'Saúde e medicamentos', description: 'Farmácia', amount: '100,00' },
  { category: 'Educação', description: 'Material escolar', amount: '0,00' },
  { category: 'Lazer e assinaturas', description: 'Assinaturas', amount: '200,00' },
  { category: 'Empréstimos e outras dívidas', description: 'Parcela', amount: '300,00' },
  { category: 'Outras despesas', description: 'Outros', amount: '50,00' }
];

test('cálculo mensal soma receitas e despesas, saldo e percentuais com exemplo conferido', () => {
  const result = calculateBudget({ incomes: income, expenses });
  assert.equal(result.valido, true);
  assert.equal(result.totalReceitas, 5050);
  assert.equal(result.totalDespesas, 3900);
  assert.equal(result.saldoMensal, 1150);
  assert.equal(result.percentualComprometido, 77.23);
  assert.equal(result.percentualRestante, 22.77);
  assert.equal(result.situacao, 'positivo');
  assert.equal(result.resumoCategorias[0].categoria, 'Moradia');
  assert.equal(result.resumoCategorias[0].total, 1500);
});

test('detecta orçamento equilibrado e déficit sem limitar saldo negativo', () => {
  const balanced = calculateBudget({ incomes: { rendaPrincipal: '1.000,00' }, expenses: [
    { category: 'Moradia', description: 'Aluguel', amount: '1.000,00' }
  ] });
  assert.equal(balanced.saldoMensal, 0);
  assert.equal(balanced.percentualComprometido, 100);
  assert.equal(balanced.percentualRestante, null);
  assert.equal(balanced.situacao, 'equilibrado');

  const deficit = calculateBudget({ incomes: { rendaPrincipal: '1.000,00' }, expenses: [
    { category: 'Moradia', description: 'Aluguel', amount: '1.200,00' }
  ] });
  assert.equal(deficit.saldoMensal, -200);
  assert.equal(deficit.percentualComprometido, 120);
  assert.equal(deficit.percentualRestante, null);
  assert.equal(deficit.situacao, 'deficit');
});

test('receita zero não divide por zero e os campos de receita vazios têm total zero', () => {
  const zero = calculateBudget({ incomes: {}, expenses: [] });
  assert.equal(zero.valido, true);
  assert.equal(zero.totalReceitas, 0);
  assert.equal(zero.totalDespesas, 0);
  assert.equal(zero.percentualComprometido, null);
  assert.equal(zero.percentualRestante, null);
  assert.match(formatBudgetResult(zero), /Indisponível \(sem receitas\)/);

  const noIncome = calculateBudget({ incomes: {}, expenses: [
    { category: 'Educação', description: 'Curso', amount: '50,00' }
  ] });
  assert.equal(noIncome.saldoMensal, -50);
  assert.equal(noIncome.percentualComprometido, null);
});

test('valores decimais pt-BR, zero válido, campos vazios e linhas vazias são tratados corretamente', () => {
  assert.equal(parseMoneyInput('R$ 1.234,56'), 1234.56);
  assert.equal(parseMoneyInput('0,05'), 0.05);
  assert.equal(parseMoneyInput('1234.56'), 1234.56);
  assert.equal(parseMoneyInput('1.234'), 1234);
  assert.ok(Number.isNaN(parseMoneyInput('1,234.56')));
  assert.ok(Number.isNaN(parseMoneyInput('abc')));

  const result = calculateBudget({ incomes: { rendaPrincipal: '1.234,56' }, expenses: [
    { category: 'Educação', description: 'Bolsa integral', amount: '0,00' },
    { category: '', description: '', amount: '' }
  ] });
  assert.equal(result.totalReceitas, 1234.56);
  assert.equal(result.totalDespesas, 0);
  assert.equal(result.saldoMensal, 1234.56);
});

test('rejeita renda e despesa negativas, valores inválidos e linhas de despesa incompletas', () => {
  assert.match(calculateBudget({ incomes: { rendaPrincipal: '-1,00' } }).erro, /igual ou maior que zero/);
  assert.match(calculateBudget({ incomes: { rendaPrincipal: 'abc' } }).erro, /valor válido/);
  assert.match(calculateBudget({ incomes: { rendaPrincipal: '1e999' } }).erro, /valor válido/);
  assert.match(calculateBudget({ incomes: {}, expenses: [
    { category: 'Moradia', description: 'Aluguel', amount: '-1,00' }
  ] }).erro, /valor válido/);
  assert.match(calculateBudget({ incomes: {}, expenses: [
    { category: 'Moradia', description: '', amount: '100,00' }
  ] }).erro, /informe uma descrição/);
  assert.match(calculateBudget({ incomes: {}, expenses: [
    { category: 'Moradia', description: 'Aluguel', amount: '' }
  ] }).erro, /informe o valor/);
  assert.equal(calculateBudget({ incomes: {}, expenses: [
    { category: 'Inválida', description: 'Item', amount: '1,00' }
  ] }).valido, false);
});

test('categoria de despesas cobre as dez áreas domésticas solicitadas', () => {
  assert.equal(EXPENSE_CATEGORIES.length, 10);
  for (const category of ['Moradia', 'Alimentação e supermercado', 'Água, energia elétrica e gás', 'Internet e telefone', 'Transporte e combustível', 'Saúde e medicamentos', 'Educação', 'Lazer e assinaturas', 'Empréstimos e outras dívidas', 'Outras despesas']) {
    assert.ok(EXPENSE_CATEGORIES.includes(category));
  }
});

test('favoritar e desfavoritar usa o ID compartilhado e persiste no localStorage', () => {
  const values = new Map();
  globalThis.localStorage = {
    getItem(key) { return values.get(key) ?? null; },
    setItem(key, value) { values.set(key, String(value)); }
  };
  _resetMemoryForTesting();
  try {
    assert.ok(VALID_TOOL_IDS.has('orcamento-domestico'));
    assert.equal(addFavorite('orcamento-domestico'), true);
    assert.deepEqual(JSON.parse(values.get(STORAGE_KEY)), ['orcamento-domestico']);
    assert.deepEqual(getFavorites(), ['orcamento-domestico']);
    assert.equal(removeFavorite('orcamento-domestico'), true);
    assert.deepEqual(JSON.parse(values.get(STORAGE_KEY)), []);
  } finally {
    delete globalThis.localStorage;
    _resetMemoryForTesting();
  }
});

test('página registra URL, categoria e ações compartilhadas no padrão do site', () => {
  const tool = TOOLS_CATALOG.find(item => item.id === 'orcamento-domestico');
  assert.ok(tool);
  assert.equal(tool.url, 'tools/financas/orcamento-domestico.html');
  assert.equal(tool.categorySlug, 'financas');
  assert.match(pagina, /id="copiarOrcamentoDomestico"/);
  assert.match(pagina, /id="compartilharOrcamentoDomestico"/);
  assert.match(pagina, /id="imprimirOrcamentoDomestico"/);
  assert.match(script, /createResultActions/);
  assert.match(script, /actions\.share\(shareUrl\)/);
  assert.match(script, /tools\/financas\/orcamento-domestico\.html/);
  assert.match(script, /actions\.print\(\)/);
  assert.match(script, /result-actions/);
  assert.match(pagina, /name="rendaPrincipal"/);
  assert.doesNotMatch(script, /localStorage|sessionStorage/);
});

class MockElement {
  constructor(tagName = 'div') {
    this.tagName = tagName.toUpperCase();
    this.children = [];
    this.listeners = {};
    this.attributes = {};
    this.parentNode = null;
    this.className = '';
    this.textContent = '';
    this.value = '';
    this.hidden = false;
  }
  append(...children) { children.forEach(child => { child.parentNode = this; this.children.push(child); }); }
  replaceChildren(...children) { this.children.forEach(child => { child.parentNode = null; }); this.children = []; this.append(...children); }
  remove() { if (this.parentNode) this.parentNode.children = this.parentNode.children.filter(child => child !== this); this.parentNode = null; }
  setAttribute(name, value) { this.attributes[name] = String(value); }
  getAttribute(name) { return this.attributes[name] ?? null; }
  addEventListener(name, fn) { (this.listeners[name] ||= []).push(fn); }
  async emit(name, event = {}) { for (const fn of this.listeners[name] || []) await fn({ preventDefault() {}, currentTarget: this, ...event }); }
  async click() { await this.emit('click'); }
  focus() { globalThis.document.activeElement = this; }
  querySelectorAll(selector) {
    const match = node => selector === '.budget-expense-row'
      ? node.className.split(' ').includes('budget-expense-row')
      : selector.startsWith('[name=') && node.name === selector.slice(7, -2);
    const found = [];
    const visit = node => node.children.forEach(child => { if (match(child)) found.push(child); visit(child); });
    visit(this);
    return found;
  }
  querySelector(selector) {
    if (selector.startsWith('.')) return this.querySelectorAll(selector)[0] || null;
    if (selector === 'button') {
      const found = [];
      const visit = node => node.children.forEach(child => { if (child.tagName === 'BUTTON') found.push(child); visit(child); });
      visit(this);
      return found[0] || null;
    }
    return this.querySelectorAll(selector)[0] || null;
  }
  reset() {
    const visit = node => node.children.forEach(child => { if (['INPUT', 'SELECT', 'TEXTAREA'].includes(child.tagName)) child.value = ''; visit(child); });
    visit(this);
  }
}

test('interface adiciona e remove despesas, valida, limpa e permite calcular novamente', async () => {
  const ids = [
    'formOrcamentoDomestico', 'linhasDespesasOrcamento', 'erroOrcamentoDomestico', 'resultadoOrcamentoDomestico',
    'copiarOrcamentoDomestico', 'compartilharOrcamentoDomestico', 'imprimirOrcamentoDomestico', 'statusOrcamentoDomestico',
    'resumoCategoriasOrcamento', 'semDespesasPorCategoria', 'adicionarDespesaOrcamento', 'limparOrcamentoDomestico',
    'rendaPrincipalOrcamento', 'rendasAdicionaisOrcamento', 'outrasReceitasOrcamento', 'totalReceitasOrcamento',
    'totalDespesasOrcamento', 'saldoOrcamento', 'percentualComprometidoOrcamento', 'percentualRestanteOrcamento', 'situacaoOrcamento'
  ];
  const incomeInputIds = new Set(['rendaPrincipalOrcamento', 'rendasAdicionaisOrcamento', 'outrasReceitasOrcamento']);
  const elements = Object.fromEntries(ids.map(id => [id, new MockElement(id === 'formOrcamentoDomestico' ? 'form' : incomeInputIds.has(id) ? 'input' : 'div')]));
  elements.formOrcamentoDomestico.append(
    elements.rendaPrincipalOrcamento,
    elements.rendasAdicionaisOrcamento,
    elements.outrasReceitasOrcamento
  );
  const windowListeners = {};
  const originalWindow = globalThis.window;
  const originalDocument = globalThis.document;
  const originalNavigator = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  let sharedPayload = null;
  let printCalls = 0;
  globalThis.document = {
    readyState: 'complete',
    activeElement: null,
    getElementById: id => elements[id] || null,
    createElement: tag => new MockElement(tag),
    addEventListener(name, fn) { (windowListeners[name] ||= []).push(fn); if (name === 'DOMContentLoaded') fn(); }
  };
  globalThis.window = { location: { origin: 'https://www.calculadoramaster.com' }, print() { printCalls += 1; } };
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { share: async payload => { sharedPayload = payload; } } });
  try {
    const moduleUrl = new URL('../js/tools/orcamento-domestico.js', import.meta.url);
    moduleUrl.searchParams.set('ui-test', String(Date.now()));
    await import(moduleUrl.href);

    elements.rendaPrincipalOrcamento.value = '1.000,00';
    await elements.adicionarDespesaOrcamento.click();
    const row = elements.linhasDespesasOrcamento.querySelector('.budget-expense-row');
    row.querySelector('[name="categoriaDespesa"]').value = 'Moradia';
    row.querySelector('[name="descricaoDespesa"]').value = 'Aluguel';
    row.querySelector('[name="valorDespesa"]').value = '250,00';
    await elements.formOrcamentoDomestico.emit('submit');
    assert.equal(elements.resultadoOrcamentoDomestico.hidden, false);
    assert.equal(elements.totalReceitasOrcamento.textContent, 'R$ 1.000,00');
    assert.equal(elements.saldoOrcamento.textContent, 'R$ 750,00');
    assert.equal(elements.resumoCategoriasOrcamento.children[0].children[0].textContent, 'Moradia');

    await elements.compartilharOrcamentoDomestico.click();
    assert.equal(sharedPayload.title, 'Calculadora de Orçamento Doméstico — Calculadora Master');
    assert.equal(sharedPayload.url, 'https://www.calculadoramaster.com/tools/financas/orcamento-domestico.html');
    assert.doesNotMatch(sharedPayload.url, /1\.000|250|receita|despesa/i);
    assert.match(sharedPayload.text, /Total de receitas/);
    assert.match(pagina, /não são salvos nem enviados automaticamente/);
    await elements.imprimirOrcamentoDomestico.click();
    assert.equal(printCalls, 1);

    await elements.limparOrcamentoDomestico.click();
    assert.equal(elements.rendaPrincipalOrcamento.value, '');
    assert.equal(elements.resultadoOrcamentoDomestico.hidden, true);
    assert.equal(elements.linhasDespesasOrcamento.querySelectorAll('.budget-expense-row').length, 0);
    assert.equal(elements.erroOrcamentoDomestico.textContent, '');

    await elements.adicionarDespesaOrcamento.click();
    const invalidRow = elements.linhasDespesasOrcamento.querySelector('.budget-expense-row');
    invalidRow.querySelector('[name="categoriaDespesa"]').value = 'Moradia';
    await elements.formOrcamentoDomestico.emit('submit');
    assert.equal(elements.erroOrcamentoDomestico.hidden, false);
    assert.match(elements.erroOrcamentoDomestico.textContent, /informe uma descrição/);

    await invalidRow.querySelector('button').click();
    await elements.formOrcamentoDomestico.emit('submit');
    assert.equal(elements.resultadoOrcamentoDomestico.hidden, false);
    assert.match(elements.percentualComprometidoOrcamento.textContent, /Indisponível/);
  } finally {
    if (originalWindow === undefined) delete globalThis.window; else globalThis.window = originalWindow;
    if (originalDocument === undefined) delete globalThis.document; else globalThis.document = originalDocument;
    if (originalNavigator) Object.defineProperty(globalThis, 'navigator', originalNavigator); else delete globalThis.navigator;
  }
});
