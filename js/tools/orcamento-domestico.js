import { createResultActions } from '../core/result-actions.js';

export const EXPENSE_CATEGORIES = Object.freeze([
  'Moradia',
  'Alimentação e supermercado',
  'Água, energia elétrica e gás',
  'Internet e telefone',
  'Transporte e combustível',
  'Saúde e medicamentos',
  'Educação',
  'Lazer e assinaturas',
  'Empréstimos e outras dívidas',
  'Outras despesas'
]);

const INCOME_FIELDS = Object.freeze([
  ['rendaPrincipal', 'Salário ou renda principal'],
  ['rendasAdicionais', 'Rendas adicionais'],
  ['outrasReceitas', 'Outras receitas mensais']
]);
const MAX_AMOUNT = 1_000_000_000_000;
const MAX_CENTS = Math.round(MAX_AMOUNT * 100);
let expenseRowSequence = 0;

function roundMoney(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/** Lê valores monetários digitados em pt-BR e também decimais com ponto. */
export function parseMoneyInput(input) {
  if (typeof input === 'number') return Number.isFinite(input) ? input : NaN;

  let text = String(input ?? '').trim().replace(/^R\$\s*/i, '').replace(/\s/g, '');
  if (!text) return NaN;

  if (text.includes(',')) {
    if (!/^-?(?:\d+|\d{1,3}(?:\.\d{3})+),\d{1,2}$/.test(text)) return NaN;
    text = text.replace(/\./g, '').replace(',', '.');
  } else if (/^-?\d{1,3}(?:\.\d{3})+$/.test(text)) {
    text = text.replace(/\./g, '');
  } else if (!/^-?\d+(?:\.\d{1,2})?$/.test(text)) {
    return NaN;
  }

  const value = Number(text);
  return Number.isFinite(value) ? value : NaN;
}

function toCents(value) {
  if (!Number.isFinite(value) || Math.abs(value) > MAX_AMOUNT) return null;
  const cents = Math.round((value + Math.sign(value || 1) * Number.EPSILON) * 100);
  return Number.isSafeInteger(cents) ? cents : null;
}

function invalid(message) {
  return { valido: false, erro: message };
}

/** Calcula os totais em centavos para evitar erros de soma de ponto flutuante. */
export function calculateBudget(input = {}) {
  const incomes = input && typeof input.incomes === 'object' && input.incomes ? input.incomes : {};
  const expenses = Array.isArray(input?.expenses) ? input.expenses : [];

  const incomeCents = {};
  for (const [key, label] of INCOME_FIELDS) {
    const raw = incomes[key];
    const empty = raw == null || String(raw).trim() === '';
    const value = empty ? 0 : parseMoneyInput(raw);
    const cents = toCents(value);
    if (cents === null || cents < 0) {
      return invalid(`${label}: informe um valor válido, igual ou maior que zero.`);
    }
    incomeCents[key] = cents;
  }

  const categoryCents = Object.fromEntries(EXPENSE_CATEGORIES.map(category => [category, 0]));
  const normalizedExpenses = [];
  for (let index = 0; index < expenses.length; index += 1) {
    const expense = expenses[index] && typeof expenses[index] === 'object' ? expenses[index] : {};
    const category = String(expense.category ?? '').trim();
    const description = String(expense.description ?? '').trim();
    const rawAmount = expense.amount ?? expense.value;
    const amountText = String(rawAmount ?? '').trim();
    if (!category && !description && !amountText) continue;

    const line = index + 1;
    if (!EXPENSE_CATEGORIES.includes(category)) {
      return invalid(`Despesa ${line}: selecione uma categoria válida.`);
    }
    if (!description) {
      return invalid(`Despesa ${line}: informe uma descrição.`);
    }
    if (!amountText) {
      return invalid(`Despesa ${line}: informe o valor.`);
    }

    const amount = parseMoneyInput(rawAmount);
    const cents = toCents(amount);
    if (cents === null || cents < 0) {
      return invalid(`Despesa ${line}: informe um valor válido, igual ou maior que zero.`);
    }
    if (categoryCents[category] + cents > MAX_CENTS) {
      return invalid('O total informado excede o limite numérico suportado.');
    }
    categoryCents[category] += cents;
    normalizedExpenses.push({ category, description, amount: cents / 100 });
  }

  const totalReceitasCents = Object.values(incomeCents).reduce((sum, cents) => sum + cents, 0);
  const totalDespesasCents = Object.values(categoryCents).reduce((sum, cents) => sum + cents, 0);
  if (totalReceitasCents > MAX_CENTS || totalDespesasCents > MAX_CENTS) {
    return invalid('O total informado excede o limite numérico suportado.');
  }

  const saldoCents = totalReceitasCents - totalDespesasCents;
  const percentualComprometido = totalReceitasCents > 0
    ? roundMoney((totalDespesasCents / totalReceitasCents) * 100)
    : null;
  const percentualRestante = totalReceitasCents > 0 && saldoCents > 0
    ? roundMoney((saldoCents / totalReceitasCents) * 100)
    : null;
  const situacao = saldoCents > 0
    ? 'positivo'
    : saldoCents < 0
      ? 'deficit'
      : 'equilibrado';

  const resumoCategorias = Object.entries(categoryCents)
    .filter(([, cents]) => cents > 0)
    .map(([category, cents]) => ({ categoria: category, total: cents / 100 }))
    .sort((a, b) => b.total - a.total || EXPENSE_CATEGORIES.indexOf(a.categoria) - EXPENSE_CATEGORIES.indexOf(b.categoria));

  return {
    valido: true,
    receitas: Object.fromEntries(Object.entries(incomeCents).map(([key, cents]) => [key, cents / 100])),
    despesas: normalizedExpenses,
    totalReceitas: totalReceitasCents / 100,
    totalDespesas: totalDespesasCents / 100,
    saldoMensal: saldoCents / 100,
    percentualComprometido,
    percentualRestante,
    situacao,
    resumoCategorias
  };
}

const formatMoney = value => new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL'
}).format(value);

const formatPercent = value => `${new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
}).format(value)}%`;

export function formatBudgetResult(result) {
  if (!result?.valido) return result?.erro || 'Não foi possível calcular o orçamento.';

  const lines = [
    'Calculadora de Orçamento Doméstico — Calculadora Master',
    `Total de receitas: ${formatMoney(result.totalReceitas)}`,
    `Total de despesas: ${formatMoney(result.totalDespesas)}`,
    `Saldo mensal: ${formatMoney(result.saldoMensal)}`,
    `Renda comprometida: ${result.percentualComprometido === null ? 'Indisponível (sem receitas)' : formatPercent(result.percentualComprometido)}`,
    `Renda restante: ${result.percentualRestante === null ? 'Indisponível' : formatPercent(result.percentualRestante)}`,
    `Situação: ${result.situacao}`,
    'Despesas por categoria:'
  ];

  if (result.resumoCategorias.length === 0) lines.push('Nenhuma despesa informada.');
  else result.resumoCategorias.forEach(item => lines.push(`${item.categoria}: ${formatMoney(item.total)}`));
  return lines.join('\n');
}

function setHidden(element, hidden) {
  if (element) element.hidden = hidden;
}

function setText(id, value) {
  const element = document.getElementById(id);
  if (element) element.textContent = value;
}

function addExpenseRow(container) {
  const emptyMessage = container.querySelector('.budget-empty-expenses');
  if (emptyMessage) emptyMessage.remove();

  const row = document.createElement('div');
  row.className = 'budget-expense-row';
  const rowId = ++expenseRowSequence;

  const categoryGroup = document.createElement('div');
  categoryGroup.className = 'form-group';
  const categoryLabel = document.createElement('label');
  categoryLabel.setAttribute('for', `categoriaDespesaOrcamento${rowId}`);
  categoryLabel.textContent = 'Categoria';
  const categorySelect = document.createElement('select');
  categorySelect.id = `categoriaDespesaOrcamento${rowId}`;
  categorySelect.name = 'categoriaDespesa';
  categorySelect.setAttribute('aria-label', 'Categoria da despesa');
  const categoryPlaceholder = document.createElement('option');
  categoryPlaceholder.value = '';
  categoryPlaceholder.textContent = 'Selecione uma categoria';
  categorySelect.append(categoryPlaceholder);
  EXPENSE_CATEGORIES.forEach(category => {
    const option = document.createElement('option');
    option.value = category;
    option.textContent = category;
    categorySelect.append(option);
  });
  categoryGroup.append(categoryLabel, categorySelect);

  const descriptionGroup = document.createElement('div');
  descriptionGroup.className = 'form-group';
  const descriptionLabel = document.createElement('label');
  descriptionLabel.setAttribute('for', `descricaoDespesaOrcamento${rowId}`);
  descriptionLabel.textContent = 'Descrição';
  const descriptionInput = document.createElement('input');
  descriptionInput.type = 'text';
  descriptionInput.id = `descricaoDespesaOrcamento${rowId}`;
  descriptionInput.name = 'descricaoDespesa';
  descriptionInput.autocomplete = 'off';
  descriptionInput.placeholder = 'Ex.: Aluguel';
  descriptionInput.setAttribute('aria-label', 'Descrição da despesa');
  descriptionGroup.append(descriptionLabel, descriptionInput);

  const amountGroup = document.createElement('div');
  amountGroup.className = 'form-group';
  const amountLabel = document.createElement('label');
  amountLabel.setAttribute('for', `valorDespesaOrcamento${rowId}`);
  amountLabel.textContent = 'Valor mensal (R$)';
  const amountInput = document.createElement('input');
  amountInput.type = 'text';
  amountInput.id = `valorDespesaOrcamento${rowId}`;
  amountInput.name = 'valorDespesa';
  amountInput.inputMode = 'decimal';
  amountInput.autocomplete = 'off';
  amountInput.placeholder = '0,00';
  amountInput.setAttribute('aria-label', 'Valor mensal da despesa em reais');
  amountGroup.append(amountLabel, amountInput);

  const removeButton = document.createElement('button');
  removeButton.type = 'button';
  removeButton.className = 'tool-btn tool-btn-secondary budget-remove-expense';
  removeButton.textContent = 'Remover';
  removeButton.setAttribute('aria-label', 'Remover esta despesa');
  removeButton.addEventListener('click', () => {
    row.remove();
    if (container.querySelectorAll('.budget-expense-row').length === 0) {
      const message = document.createElement('p');
      message.className = 'budget-empty-expenses';
      message.textContent = 'Nenhuma despesa adicionada.';
      container.append(message);
    }
  });

  row.append(categoryGroup, descriptionGroup, amountGroup, removeButton);
  container.append(row);
  categorySelect.focus();
}

export function setupTool() {
  if (typeof document === 'undefined') return;
  const form = document.getElementById('formOrcamentoDomestico');
  if (!form) return;

  const container = document.getElementById('linhasDespesasOrcamento');
  const error = document.getElementById('erroOrcamentoDomestico');
  const panel = document.getElementById('resultadoOrcamentoDomestico');
  const copyButton = document.getElementById('copiarOrcamentoDomestico');
  const shareButton = document.getElementById('compartilharOrcamentoDomestico');
  const printButton = document.getElementById('imprimirOrcamentoDomestico');
  const status = document.getElementById('statusOrcamentoDomestico');
  const categoryList = document.getElementById('resumoCategoriasOrcamento');
  const emptyExpenses = document.createElement('p');
  emptyExpenses.className = 'budget-empty-expenses';
  emptyExpenses.textContent = 'Nenhuma despesa adicionada.';
  container.append(emptyExpenses);

  let lastResult = null;
  const actions = createResultActions({
    title: 'Calculadora de Orçamento Doméstico — Calculadora Master',
    statusElement: status,
    getSections: () => lastResult ? [
      { label: 'Total de receitas', value: formatMoney(lastResult.totalReceitas) },
      { label: 'Total de despesas', value: formatMoney(lastResult.totalDespesas) },
      { label: 'Saldo mensal', value: formatMoney(lastResult.saldoMensal) },
      { label: 'Renda comprometida', value: lastResult.percentualComprometido === null ? 'Indisponível (sem receitas)' : formatPercent(lastResult.percentualComprometido) },
      { label: 'Renda restante', value: lastResult.percentualRestante === null ? 'Indisponível' : formatPercent(lastResult.percentualRestante) },
      { label: 'Situação', value: lastResult.situacao },
      ...lastResult.resumoCategorias.map(item => ({ label: `Categoria: ${item.categoria}`, value: formatMoney(item.total) }))
    ] : []
  });

  document.getElementById('adicionarDespesaOrcamento')?.addEventListener('click', () => addExpenseRow(container));

  form.addEventListener('submit', event => {
    event.preventDefault();
    if (status) status.textContent = '';

    const expenses = [...container.querySelectorAll('.budget-expense-row')].map(row => ({
      category: row.querySelector('[name="categoriaDespesa"]')?.value,
      description: row.querySelector('[name="descricaoDespesa"]')?.value,
      amount: row.querySelector('[name="valorDespesa"]')?.value
    }));
    const result = calculateBudget({
      incomes: {
        rendaPrincipal: document.getElementById('rendaPrincipalOrcamento').value,
        rendasAdicionais: document.getElementById('rendasAdicionaisOrcamento').value,
        outrasReceitas: document.getElementById('outrasReceitasOrcamento').value
      },
      expenses
    });

    if (!result.valido) {
      error.textContent = result.erro;
      error.hidden = false;
      panel.hidden = true;
      setHidden(copyButton, true);
      setHidden(shareButton, true);
      setHidden(printButton, true);
      lastResult = null;
      return;
    }

    error.textContent = '';
    error.hidden = true;
    setText('totalReceitasOrcamento', formatMoney(result.totalReceitas));
    setText('totalDespesasOrcamento', formatMoney(result.totalDespesas));
    setText('saldoOrcamento', formatMoney(result.saldoMensal));
    setText('percentualComprometidoOrcamento', result.percentualComprometido === null ? 'Indisponível (sem receitas)' : formatPercent(result.percentualComprometido));
    setText('percentualRestanteOrcamento', result.percentualRestante === null ? 'Indisponível' : formatPercent(result.percentualRestante));

    const situation = document.getElementById('situacaoOrcamento');
    const situationText = result.situacao === 'positivo'
      ? 'Saldo positivo: há valor disponível para economizar ou direcionar a outros objetivos.'
      : result.situacao === 'deficit'
        ? 'Despesas superiores às receitas: o orçamento fecha com déficit.'
        : 'Orçamento equilibrado: receitas e despesas têm o mesmo valor.';
    situation.textContent = situationText;
    situation.className = result.situacao === 'positivo'
      ? 'budget-status-positive'
      : result.situacao === 'deficit'
        ? 'budget-status-negative'
        : 'budget-status-balanced';

    categoryList.replaceChildren();
    const noCategoryExpenses = document.getElementById('semDespesasPorCategoria');
    noCategoryExpenses.hidden = result.resumoCategorias.length > 0;
    result.resumoCategorias.forEach((item, index) => {
      const line = document.createElement('li');
      if (index < 3) line.className = 'budget-largest-category';
      const label = document.createElement('span');
      label.textContent = item.categoria;
      const value = document.createElement('strong');
      value.textContent = formatMoney(item.total);
      line.append(label, value);
      categoryList.append(line);
    });

    lastResult = result;
    panel.hidden = false;
    setHidden(copyButton, false);
    setHidden(shareButton, false);
    setHidden(printButton, false);
  });

  document.getElementById('limparOrcamentoDomestico')?.addEventListener('click', () => {
    form.reset();
    container.replaceChildren();
    const message = document.createElement('p');
    message.className = 'budget-empty-expenses';
    message.textContent = 'Nenhuma despesa adicionada.';
    container.append(message);
    error.textContent = '';
    error.hidden = true;
    panel.hidden = true;
    setHidden(copyButton, true);
    setHidden(shareButton, true);
    setHidden(printButton, true);
    if (status) status.textContent = '';
    lastResult = null;
  });

  copyButton?.addEventListener('click', async () => {
    if (lastResult) await actions.copy();
  });
  shareButton?.addEventListener('click', async () => {
    if (!lastResult) return;
    const shareUrl = typeof window !== 'undefined' && window.location?.origin
      ? `${window.location.origin}/tools/financas/orcamento-domestico.html`
      : undefined;
    await actions.share(shareUrl);
  });
  printButton?.addEventListener('click', () => {
    if (lastResult) actions.print();
  });
}

if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', setupTool);
}
