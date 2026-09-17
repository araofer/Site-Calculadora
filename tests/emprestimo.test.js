import test from 'node:test';
import assert from 'node:assert/strict';

import {
  parseNumberPtBr,
  normalizeEmprestimoInput,
  validateEmprestimoInput,
  calculateEmprestimo,
  formatEmprestimoResult,
  getEmprestimoChartData,
  getEmprestimoPdfPayload
} from '../js/tools/emprestimo.js';

const EPSILON = 1e-4;

test('Empréstimo - parseNumberPtBr aceita formatos com ponto e vírgula e trata 1.000 como milhar', () => {
  assert.equal(parseNumberPtBr('10.000,50'), 10000.5);
  assert.equal(parseNumberPtBr('10000,50'), 10000.5);
  assert.equal(parseNumberPtBr('10000.50'), 10000.5);
  assert.equal(parseNumberPtBr('1.000'), 1000, '1.000 deve ser interpretado como 1000');
  assert.notEqual(parseNumberPtBr('1.000'), 1, '1.000 não pode ser interpretado como 1');
  assert.equal(parseNumberPtBr('1,75'), 1.75);
  assert.equal(parseNumberPtBr('1.75'), 1.75);
  assert.equal(parseNumberPtBr(5000), 5000);
  assert.ok(Number.isNaN(parseNumberPtBr('')));
  assert.ok(Number.isNaN(parseNumberPtBr(null)));
  assert.ok(Number.isNaN(parseNumberPtBr('abc')));
  assert.ok(Number.isNaN(parseNumberPtBr('1..000')));
});

test('Empréstimo - normalizeEmprestimoInput normaliza campos brutos', () => {
  const norm = normalizeEmprestimoInput({
    valor: '15.000,00',
    taxa: '2,5',
    prazo: '36'
  });

  assert.equal(norm.valor, 15000);
  assert.equal(norm.taxa, 2.5);
  assert.equal(norm.prazo, 36);
});

test('Empréstimo - validateEmprestimoInput valida campos obrigatórios e limites', () => {
  // Entradas válidas
  assert.equal(validateEmprestimoInput({ valor: 1000, taxa: 1.5, prazo: 12 }).valido, true);
  assert.equal(validateEmprestimoInput({ valor: 1000, taxa: 0, prazo: 1 }).valido, true);

  // Valor inválido
  assert.equal(validateEmprestimoInput({ valor: 0, taxa: 1.5, prazo: 12 }).valido, false);
  assert.equal(validateEmprestimoInput({ valor: -100, taxa: 1.5, prazo: 12 }).valido, false);
  assert.equal(validateEmprestimoInput({ valor: NaN, taxa: 1.5, prazo: 12 }).valido, false);

  // Taxa inválida
  assert.equal(validateEmprestimoInput({ valor: 1000, taxa: -1, prazo: 12 }).valido, false);
  assert.equal(validateEmprestimoInput({ valor: 1000, taxa: NaN, prazo: 12 }).valido, false);

  // Prazo inválido
  assert.equal(validateEmprestimoInput({ valor: 1000, taxa: 1.5, prazo: 0 }).valido, false);
  assert.equal(validateEmprestimoInput({ valor: 1000, taxa: 1.5, prazo: -6 }).valido, false);
  assert.equal(validateEmprestimoInput({ valor: 1000, taxa: 1.5, prazo: 700 }).valido, false); // Limite 600 meses
});

test('Empréstimo - caso conhecido no Sistema Price', () => {
  // Empréstimo de R$ 10.000 em 12x a 2% ao mês
  // Fórmula Price: 10000 * (0.02 * 1.02^12) / (1.02^12 - 1) ≈ 945.595966...
  const res = calculateEmprestimo({
    valor: '10.000,00',
    taxa: '2,0',
    prazo: '12'
  });

  assert.equal(res.valido, true);
  assert.ok(Math.abs(res.valorParcela - 945.596) < 0.01);
  assert.equal(res.prazoMeses, 12);
  assert.equal(res.valorEmprestimo, 10000);
  assert.ok(res.totalPago > 10000);
  assert.ok(res.jurosTotais > 0);
  assert.ok(Math.abs(res.totalPago - (res.valorEmprestimo + res.jurosTotais)) < EPSILON);
  assert.equal(res.schedule.length, 12);
});

test('Empréstimo - caso com taxa zero (empréstimo sem juros)', () => {
  const res = calculateEmprestimo({
    valor: '6000',
    taxa: '0',
    prazo: '6'
  });

  assert.equal(res.valido, true);
  assert.equal(res.valorParcela, 1000);
  assert.equal(res.totalPago, 6000);
  assert.equal(res.jurosTotais, 0);
  assert.equal(res.percentualPrincipal, 100);
  assert.equal(res.percentualJuros, 0);
});

test('Empréstimo - resultado não contém NaN nem Infinity em nenhum campo', () => {
  const res = calculateEmprestimo({
    valor: '25450.75',
    taxa: '1.89',
    prazo: '48'
  });

  assert.equal(res.valido, true);
  assert.ok(Number.isFinite(res.valorParcela));
  assert.ok(Number.isFinite(res.totalPago));
  assert.ok(Number.isFinite(res.jurosTotais));
  assert.ok(Number.isFinite(res.percentualPrincipal));
  assert.ok(Number.isFinite(res.percentualJuros));

  res.schedule.forEach((row, i) => {
    assert.ok(Number.isFinite(row.openingBalance), `Linha ${i}: openingBalance`);
    assert.ok(Number.isFinite(row.payment), `Linha ${i}: payment`);
    assert.ok(Number.isFinite(row.interest), `Linha ${i}: interest`);
    assert.ok(Number.isFinite(row.amortization), `Linha ${i}: amortization`);
    assert.ok(Number.isFinite(row.closingBalance), `Linha ${i}: closingBalance`);
  });
});

test('Empréstimo - formatEmprestimoResult formata moeda e porcentagem em pt-BR', () => {
  const res = calculateEmprestimo({
    valor: 10000,
    taxa: 1.5,
    prazo: 12
  });

  const fmt = formatEmprestimoResult(res);
  assert.match(fmt.valorParcelaFmt, /R\$\s?916,80/);
  assert.match(fmt.valorEmprestimoFmt, /R\$\s?10\.000,00/);
  assert.match(fmt.taxaMensalFmt, /1,50%/);
  assert.ok(fmt.totalPagoFmt.includes('R$'));
  assert.ok(fmt.jurosTotaisFmt.includes('R$'));
});

test('Empréstimo - getEmprestimoChartData monta dados para Chart.js sem depender do DOM', () => {
  const res = calculateEmprestimo({
    valor: 10000,
    taxa: 2.0,
    prazo: 12
  });

  const chartData = getEmprestimoChartData(res);
  assert.ok(chartData);
  assert.equal(Array.isArray(chartData.labels), true);
  assert.equal(chartData.labels.length, 2);
  assert.equal(chartData.labels[0], 'Principal (Valor Solicitado)');
  assert.equal(chartData.labels[1], 'Juros Totais');

  assert.equal(chartData.datasets.length, 1);
  const dataset = chartData.datasets[0];
  assert.equal(dataset.data[0], 10000);
  assert.ok(dataset.data[1] > 0);
  assert.equal(Array.isArray(dataset.backgroundColor), true);
  assert.equal(dataset.backgroundColor.length, 2);
});

test('Empréstimo - getEmprestimoPdfPayload gera estrutura completa para exportResultPdf', () => {
  const res = calculateEmprestimo({
    valor: '10.000,00',
    taxa: '1,50',
    prazo: '24'
  });

  const payload = getEmprestimoPdfPayload(res);
  assert.ok(payload);
  assert.equal(payload.filename, 'calculadora-master-emprestimo.pdf');
  assert.equal(payload.title, 'Simulação de Empréstimo (Sistema Price)');

  assert.ok(Array.isArray(payload.inputs));
  assert.equal(payload.inputs.length, 3);
  assert.equal(payload.inputs[0].label, 'Valor Solicitado');
  assert.match(payload.inputs[0].value, /R\$\s?10\.000,00/);

  assert.ok(Array.isArray(payload.results));
  assert.ok(payload.results.length >= 5);
  const highlighted = payload.results.filter(r => r.highlight);
  assert.ok(highlighted.length >= 2, 'Pelo menos parcela e custo total devem ter destaque');

  assert.ok(Array.isArray(payload.notes));
  assert.ok(payload.notes.length > 0);
});
