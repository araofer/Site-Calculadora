import test from 'node:test';
import assert from 'node:assert/strict';

import fs from 'node:fs';
import path from 'node:path';

import {
  parseNumberPtBr,
  normalizeAmortizacaoInput,
  validateAmortizacaoInput,
  calculateAmortizacao,
  formatAmortizacaoResult,
  getAmortizacaoChartData,
  getAmortizacaoPdfPayload,
  setupTabelaAmortizacao
} from '../js/tools/amortizacao.js';

import {
  isFavorite,
  addFavorite,
  toggleFavorite,
  removeFavorite,
  _resetMemoryForTesting
} from '../js/core/favorites.js';

const EPSILON = 1e-4;

test('Amortização - parseNumberPtBr aceita formatos válidos e trata 1.000 como milhar', () => {
  assert.equal(parseNumberPtBr('50.000,00'), 50000);
  assert.equal(parseNumberPtBr('1.000'), 1000, '1.000 deve ser interpretado como 1000');
  assert.notEqual(parseNumberPtBr('1.000'), 1, '1.000 não pode ser interpretado como 1');
  assert.equal(parseNumberPtBr('1,50'), 1.5);
  assert.equal(parseNumberPtBr('1.50'), 1.5);
  assert.ok(Number.isNaN(parseNumberPtBr('1..000')));
});

test('Amortização - normalização e validação de entradas', () => {
  const norm = normalizeAmortizacaoInput({
    valor: '50.000,00',
    taxa: '1,25',
    prazo: '24'
  });

  assert.equal(norm.valor, 50000);
  assert.equal(norm.taxa, 1.25);
  assert.equal(norm.prazo, 24);

  // Validação
  assert.equal(validateAmortizacaoInput(norm).valido, true);
  assert.equal(validateAmortizacaoInput({ valor: 0, taxa: 1, prazo: 12 }).valido, false);
  assert.equal(validateAmortizacaoInput({ valor: 1000, taxa: -0.5, prazo: 12 }).valido, false);
  assert.equal(validateAmortizacaoInput({ valor: 1000, taxa: 1, prazo: 0 }).valido, false);
  assert.equal(validateAmortizacaoInput({ valor: 1000, taxa: 1, prazo: 600 }).valido, false);
});

test('Amortização - tabela completa com quantidade de parcelas e primeira/última linha corretas', () => {
  // Financiamento de R$ 10.000 em 12x a 1,5% ao mês
  const res = calculateAmortizacao({
    valor: 10000,
    taxa: 1.5,
    prazo: 12
  });

  assert.equal(res.valido, true);
  assert.equal(res.schedule.length, 12);

  // Primeira parcela
  const first = res.schedule[0];
  assert.equal(first.period, 1);
  assert.equal(first.openingBalance, 10000);
  assert.equal(first.interest, 150); // 10.000 * 1.5% = 150
  assert.ok(first.amortization > 0);
  assert.ok(Math.abs(first.payment - (first.amortization + first.interest)) < EPSILON);

  // Última parcela
  const last = res.schedule[11];
  assert.equal(last.period, 12);
  assert.equal(last.closingBalance, 0); // Saldo final zerado

  // Invariantes da tabela
  const sumAmortization = res.schedule.reduce((acc, row) => acc + row.amortization, 0);
  assert.ok(Math.abs(sumAmortization - 10000) < EPSILON);

  const sumInterest = res.schedule.reduce((acc, row) => acc + row.interest, 0);
  assert.ok(Math.abs(sumInterest - res.jurosTotais) < EPSILON);

  const sumPayments = res.schedule.reduce((acc, row) => acc + row.payment, 0);
  assert.ok(Math.abs(sumPayments - res.totalPago) < EPSILON);

  assert.ok(Math.abs(res.totalPago - (res.valorFinanciado + res.jurosTotais)) < EPSILON);
});

test('Amortização - ausência absoluta de NaN e Infinity', () => {
  const res = calculateAmortizacao({
    valor: '85230.40',
    taxa: '1.45',
    prazo: '36'
  });

  assert.equal(res.valido, true);
  assert.ok(Number.isFinite(res.valorParcela));
  assert.ok(Number.isFinite(res.totalPago));
  assert.ok(Number.isFinite(res.jurosTotais));

  res.schedule.forEach(row => {
    assert.ok(Number.isFinite(row.openingBalance));
    assert.ok(Number.isFinite(row.payment));
    assert.ok(Number.isFinite(row.interest));
    assert.ok(Number.isFinite(row.amortization));
    assert.ok(Number.isFinite(row.closingBalance));
  });
});

test('Amortização - formatAmortizacaoResult formata corretamente o cronograma e cabeçalho', () => {
  const res = calculateAmortizacao({
    valor: 12000,
    taxa: 1.0,
    prazo: 6
  });

  const fmt = formatAmortizacaoResult(res);
  assert.match(fmt.valorFinanciadoFmt, /R\$\s?12\.000,00/);
  assert.match(fmt.taxaMensalFmt, /1,00%/);
  assert.equal(fmt.formattedSchedule.length, 6);
  assert.ok(fmt.formattedSchedule[0].paymentFmt.includes('R$'));
  assert.ok(fmt.formattedSchedule[5].closingBalanceFmt.includes('R$'));
  assert.ok(fmt.totalJurosFmt.includes('R$'));
});

test('Amortização - getAmortizacaoChartData monta labels e dataset com amostragem limpa', () => {
  const res = calculateAmortizacao({
    valor: 30000,
    taxa: 1.5,
    prazo: 24
  });

  const chartData = getAmortizacaoChartData(res.schedule, res.valorFinanciado);
  assert.ok(chartData);
  assert.ok(Array.isArray(chartData.labels));
  assert.equal(chartData.labels[0], 'Início');
  assert.equal(chartData.datasets.length, 1);

  const dataset = chartData.datasets[0];
  assert.equal(dataset.label, 'Saldo Devedor (R$)');
  assert.equal(dataset.data[0], 30000);
  assert.equal(dataset.data[dataset.data.length - 1], 0);
  assert.equal(dataset.data.length, chartData.labels.length);
});

test('Amortização - getAmortizacaoPdfPayload gera estrutura completa para exportResultPdf', () => {
  const res = calculateAmortizacao({
    valor: '50.000,00',
    taxa: '1,20',
    prazo: '36'
  });

  const payload = getAmortizacaoPdfPayload(res);
  assert.ok(payload);
  assert.equal(payload.filename, 'calculadora-master-amortizacao.pdf');
  assert.equal(payload.title, 'Tabela de Amortização (Sistema Price)');

  assert.ok(Array.isArray(payload.inputs));
  assert.equal(payload.inputs.length, 3);
  assert.match(payload.inputs[0].value, /R\$\s?50\.000,00/);

  assert.ok(Array.isArray(payload.results));
  assert.ok(payload.results.length >= 4);
  const highlighted = payload.results.filter(r => r.highlight);
  assert.ok(highlighted.length >= 2);

  assert.ok(Array.isArray(payload.notes));
  assert.ok(payload.notes.length > 0);
});

test('Amortização - HTML/renderização não produz "undefined" no campo "Total em Juros" e exibe valor calculado', () => {
  const valor = '10.000,00';
  const taxa = '1,50';
  const prazo = '12';

  const res = calculateAmortizacao({ valor, taxa, prazo });
  const fmt = formatAmortizacaoResult(res);

  assert.equal(res.valido, true);
  assert.ok(fmt.totalJurosFmt, 'Propriedade totalJurosFmt deve estar presente');
  assert.notEqual(fmt.totalJurosFmt, 'undefined');
  assert.ok(fmt.totalJurosFmt.includes('R$'));

  const elements = {
    valor: { value: valor, addEventListener: () => {} },
    taxa: { value: taxa, addEventListener: () => {} },
    prazo: { value: prazo, addEventListener: () => {} },
    resultado: { innerHTML: '' },
    amortizacaoStatus: { textContent: '' },
    graficoAmortizacao: {},
    containerGraficoAmortizacao: { style: {} }
  };

  const buttons = {};
  const querySelector = (sel) => {
    const match = sel.match(/\[data-action="([^"]+)"\]/);
    if (match) {
      const action = match[1];
      if (!buttons[action]) {
        buttons[action] = {
          _listeners: {},
          addEventListener(evt, fn) { this._listeners[evt] = fn; },
          click() { if (this._listeners['click']) this._listeners['click'](); }
        };
      }
      return buttons[action];
    }
    return null;
  };

  const prevDoc = globalThis.document;
  try {
    globalThis.document = {
      getElementById: (id) => elements[id] || null,
      querySelector
    };

    setupTabelaAmortizacao();
    buttons.calculate.click();

    const html = elements.resultado.innerHTML;
    assert.ok(html.length > 0, 'O resultado HTML deve ser renderizado');
    assert.ok(!html.includes('undefined'), 'HTML renderizado não deve conter "undefined"');

    // Garante que o card visual "Total em Juros" exibe o valor calculado e não undefined
    const cardMatch = html.match(/Total em Juros<\/span>\s*<strong[^>]*>([^<]+)<\/strong>/i);
    assert.ok(cardMatch, 'Card visual "Total em Juros" deve existir no HTML');
    assert.notEqual(cardMatch[1].trim(), 'undefined', 'Campo "Total em Juros" não pode ser "undefined"');
    assert.equal(cardMatch[1].trim(), fmt.totalJurosFmt, 'Campo "Total em Juros" deve conter o valor calculado formatado');
  } finally {
    if (prevDoc === undefined) {
      delete globalThis.document;
    } else {
      globalThis.document = prevDoc;
    }
  }
});

test('Amortização - favorito é reconhecido e gerenciado corretamente pelo core de favoritos', () => {
  _resetMemoryForTesting();
  try {
    assert.equal(isFavorite('amortizacao'), false);
    assert.equal(addFavorite('amortizacao'), true);
    assert.equal(isFavorite('amortizacao'), true);
    assert.equal(toggleFavorite('amortizacao'), false);
    assert.equal(isFavorite('amortizacao'), false);
    assert.equal(toggleFavorite('amortizacao'), true);
    assert.equal(isFavorite('amortizacao'), true);
    assert.equal(removeFavorite('amortizacao'), true);
    assert.equal(isFavorite('amortizacao'), false);
  } finally {
    _resetMemoryForTesting();
  }
});

test('Amortização - markup dos botões segue alinhamento e espaçamento de Lucro sem conflito inline', () => {
  const pagePath = path.join(process.cwd(), 'src', 'pages', 'tools', 'financas', 'amortizacao.page.html');
  const content = fs.readFileSync(pagePath, 'utf-8');

  // Botões principais usam container padrão .tool-actions
  assert.match(content, /<div class="tool-actions">\s*<button[^>]*data-action="calculate"/);
  assert.match(content, /<button[^>]*data-action="clear"/);

  // Ações secundárias usam .tool-actions.result-actions sem conflito de centralização ou gap restritivo
  assert.match(content, /<div class="tool-actions result-actions"/);
  assert.ok(!content.includes('justify-content: center'), 'Não deve conter centralização inline que desalinhe os botões');
  assert.ok(!content.includes('gap: 8px'), 'Não deve conter gap inline conflitante com padrão de 12px / responsivo');
});
