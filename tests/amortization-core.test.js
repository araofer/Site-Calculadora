import test from 'node:test';
import assert from 'node:assert/strict';

import {
  calculatePricePayment,
  buildPriceSchedule
} from '../js/core/calculations/amortization.js';

const EPSILON = 1e-6;

test('Amortization Core - Cálculo normal da Tabela Price (PMT padrão)', () => {
  // Principal R$ 10.000, 1% ao mês, 12 meses
  const input = {
    principal: 10000,
    periodicRate: 0.01,
    periods: 12
  };

  const payment = calculatePricePayment(input);
  // Valor teórico: 10000 * (0.01 * 1.01^12) / (1.01^12 - 1) ≈ 888.487886...
  assert.ok(Math.abs(payment - 888.487886) < 0.01);
});

test('Amortization Core - Taxa zero (periodicRate === 0)', () => {
  const input = {
    principal: 12000,
    periodicRate: 0,
    periods: 12
  };

  const payment = calculatePricePayment(input);
  assert.equal(payment, 1000);

  const scheduleResult = buildPriceSchedule(input);
  assert.equal(scheduleResult.payment, 1000);
  assert.equal(scheduleResult.totalPaid, 12000);
  assert.equal(scheduleResult.totalInterest, 0);

  scheduleResult.schedule.forEach(item => {
    assert.equal(item.interest, 0);
    assert.equal(item.payment, 1000);
    assert.equal(item.amortization, 1000);
  });
  assert.equal(scheduleResult.schedule[11].closingBalance, 0);
});

test('Amortization Core - Uma única parcela (periods === 1)', () => {
  const input = {
    principal: 5000,
    periodicRate: 0.05,
    periods: 1
  };

  const payment = calculatePricePayment(input);
  assert.ok(Math.abs(payment - 5250) < EPSILON); // 5000 + 5% = 5250

  const result = buildPriceSchedule(input);
  assert.equal(result.schedule.length, 1);
  assert.equal(result.schedule[0].openingBalance, 5000);
  assert.equal(result.schedule[0].interest, 250);
  assert.equal(result.schedule[0].amortization, 5000);
  assert.equal(result.schedule[0].payment, 5250);
  assert.equal(result.schedule[0].closingBalance, 0);
  assert.equal(result.totalPaid, 5250);
  assert.equal(result.totalInterest, 250);
});

test('Amortization Core - Prazo longo (360 meses / financiamento imobiliário)', () => {
  const input = {
    principal: 300000,
    periodicRate: 0.008, // 0.8% a.m.
    periods: 360
  };

  const payment = calculatePricePayment(input);
  assert.ok(Number.isFinite(payment));
  assert.ok(payment > 2400);

  const result = buildPriceSchedule(input);
  assert.equal(result.schedule.length, 360);
  assert.equal(result.schedule[359].closingBalance, 0);

  const sumAmortization = result.schedule.reduce((acc, row) => acc + row.amortization, 0);
  assert.ok(Math.abs(sumAmortization - 300000) < EPSILON);
});

test('Amortization Core - Principal decimal e taxa decimal', () => {
  const input = {
    principal: 12345.67,
    periodicRate: 0.01456,
    periods: 24
  };

  const payment = calculatePricePayment(input);
  assert.ok(Number.isFinite(payment));

  const result = buildPriceSchedule(input);
  assert.equal(result.schedule.length, 24);
  assert.equal(result.schedule[23].closingBalance, 0);

  const sumAmortization = result.schedule.reduce((acc, row) => acc + row.amortization, 0);
  assert.ok(Math.abs(sumAmortization - 12345.67) < EPSILON);
});

test('Amortization Core - Validação de entradas rejeita valores inválidos com erros explícitos', () => {
  // Principal <= 0 ou ausente
  assert.throws(() => calculatePricePayment({ principal: 0, periodicRate: 0.01, periods: 12 }), /principal/i);
  assert.throws(() => calculatePricePayment({ principal: -100, periodicRate: 0.01, periods: 12 }), /principal/i);
  assert.throws(() => calculatePricePayment({ periodicRate: 0.01, periods: 12 }), /principal/i);
  assert.throws(() => calculatePricePayment({ principal: NaN, periodicRate: 0.01, periods: 12 }), /principal/i);
  assert.throws(() => calculatePricePayment({ principal: Infinity, periodicRate: 0.01, periods: 12 }), /principal/i);

  // Taxa < 0 ou ausente
  assert.throws(() => calculatePricePayment({ principal: 1000, periodicRate: -0.01, periods: 12 }), /taxa/i);
  assert.throws(() => calculatePricePayment({ principal: 1000, periods: 12 }), /taxa/i);
  assert.throws(() => calculatePricePayment({ principal: 1000, periodicRate: NaN, periods: 12 }), /taxa/i);

  // Periods <= 0, não inteiro ou ausente
  assert.throws(() => calculatePricePayment({ principal: 1000, periodicRate: 0.01, periods: 0 }), /períodos/i);
  assert.throws(() => calculatePricePayment({ principal: 1000, periodicRate: 0.01, periods: -5 }), /períodos/i);
  assert.throws(() => calculatePricePayment({ principal: 1000, periodicRate: 0.01, periods: 12.5 }), /períodos/i);
  assert.throws(() => calculatePricePayment({ principal: 1000, periodicRate: 0.01 }), /períodos/i);
  assert.throws(() => calculatePricePayment({ principal: 1000, periodicRate: 0.01, periods: Infinity }), /períodos/i);

  // Objeto ausente ou inválido
  assert.throws(() => calculatePricePayment(null), /parâmetros/i);
  assert.throws(() => calculatePricePayment(undefined), /parâmetros/i);
  assert.throws(() => calculatePricePayment('invalido'), /parâmetros/i);
});

test('Amortization Core - Invariantes do cronograma Price (buildPriceSchedule)', () => {
  const input = {
    principal: 25000,
    periodicRate: 0.0199,
    periods: 48
  };

  const scheduleData = buildPriceSchedule(input);
  const { principal, schedule, totalPaid, totalInterest, payment } = scheduleData;

  // 1. Quantidade de linhas
  assert.equal(schedule.length, 48);

  // 2. Consistência com calculatePricePayment
  assert.ok(Math.abs(payment - calculatePricePayment(input)) < EPSILON);

  // 3. Saldo inicial da primeira parcela é o principal
  assert.equal(schedule[0].openingBalance, principal);

  // 4. Saldo final da última parcela é estritamente zero
  assert.equal(schedule[47].closingBalance, 0);

  // 5. Soma das amortizações é igual ao principal
  const sumAmortization = schedule.reduce((sum, r) => sum + r.amortization, 0);
  assert.ok(Math.abs(sumAmortization - principal) < EPSILON);

  // 6. Soma das parcelas é igual a totalPaid
  const sumPayments = schedule.reduce((sum, r) => sum + r.payment, 0);
  assert.ok(Math.abs(sumPayments - totalPaid) < EPSILON);

  // 7. Soma dos juros é igual a totalInterest
  const sumInterest = schedule.reduce((sum, r) => sum + r.interest, 0);
  assert.ok(Math.abs(sumInterest - totalInterest) < EPSILON);

  // 8. totalPaid = principal + totalInterest
  assert.ok(Math.abs(totalPaid - (principal + totalInterest)) < EPSILON);

  // 9. Nenhum NaN ou Infinity em nenhuma linha
  schedule.forEach((row, idx) => {
    assert.ok(Number.isFinite(row.openingBalance), `Linha ${idx + 1}: openingBalance inválido`);
    assert.ok(Number.isFinite(row.payment), `Linha ${idx + 1}: payment inválido`);
    assert.ok(Number.isFinite(row.interest), `Linha ${idx + 1}: interest inválido`);
    assert.ok(Number.isFinite(row.amortization), `Linha ${idx + 1}: amortization inválido`);
    assert.ok(Number.isFinite(row.closingBalance), `Linha ${idx + 1}: closingBalance inválido`);
  });
});
