import test from "node:test";
import assert from "node:assert/strict";
import { calcularFinanciamentoPrice } from "../js/tools/financiamento-carro.js";
import { formatBRL } from "../js/core/currency.js";

test("calcularFinanciamentoPrice - Caso A: cálculo padrão tabela Price", () => {
  const res = calcularFinanciamentoPrice({
    valorVeiculo: 50000,
    valorEntrada: 10000,
    taxaMensal: 1.5,
    prazoMeses: 48
  });

  assert.equal(res.valido, true);
  assert.equal(res.valorFinanciado, 40000);
  assert.equal(res.prazoMeses, 48);

  // Parcela aproximada de R$ 1.175,00
  const parcelaFormatada = formatBRL(res.valorParcela);
  assert.equal(parcelaFormatada, "1.175,00");

  const totalPagoFormatado = formatBRL(res.totalPago);
  assert.equal(totalPagoFormatado, "56.400,00");

  const jurosFormatado = formatBRL(res.jurosPagos);
  assert.equal(jurosFormatado, "16.400,00");

  const custoTotalFormatado = formatBRL(res.custoTotalComEntrada);
  assert.equal(custoTotalFormatado, "66.400,00");
});

test("calcularFinanciamentoPrice - Caso B: taxa de juros 0% (divisão linear)", () => {
  const res = calcularFinanciamentoPrice({
    valorVeiculo: 30000,
    valorEntrada: 6000,
    taxaMensal: 0,
    prazoMeses: 24
  });

  assert.equal(res.valido, true);
  assert.equal(res.valorFinanciado, 24000);
  assert.equal(res.valorParcela, 1000);
  assert.equal(res.totalPago, 24000);
  assert.equal(res.jurosPagos, 0);
  assert.equal(res.custoTotalComEntrada, 30000);
});

test("calcularFinanciamentoPrice - Caso C: sem entrada (entrada = 0 ou omitida)", () => {
  const res = calcularFinanciamentoPrice({
    valorVeiculo: 20000,
    valorEntrada: 0,
    taxaMensal: 1.0,
    prazoMeses: 12
  });

  assert.equal(res.valido, true);
  assert.equal(res.valorFinanciado, 20000);
  assert.ok(res.valorParcela > 0);
  assert.equal(res.custoTotalComEntrada, res.totalPago);
});

test("calcularFinanciamentoPrice - Caso D: entrada igual ao valor do veículo", () => {
  const res = calcularFinanciamentoPrice({
    valorVeiculo: 50000,
    valorEntrada: 50000,
    taxaMensal: 1.5,
    prazoMeses: 48
  });

  assert.equal(res.valido, false);
  assert.match(res.erro, /entrada não pode ser maior ou igual/i);
});

test("calcularFinanciamentoPrice - Caso E: entrada maior que o valor do veículo", () => {
  const res = calcularFinanciamentoPrice({
    valorVeiculo: 50000,
    valorEntrada: 60000,
    taxaMensal: 1.5,
    prazoMeses: 48
  });

  assert.equal(res.valido, false);
  assert.match(res.erro, /entrada não pode ser maior ou igual/i);
});

test("calcularFinanciamentoPrice - Caso F: validações de campos inválidos ou negativos", () => {
  // Veículo <= 0
  assert.equal(calcularFinanciamentoPrice({ valorVeiculo: 0, taxaMensal: 1, prazoMeses: 12 }).valido, false);
  assert.equal(calcularFinanciamentoPrice({ valorVeiculo: -1000, taxaMensal: 1, prazoMeses: 12 }).valido, false);

  // Taxa < 0 ou NaN
  assert.equal(calcularFinanciamentoPrice({ valorVeiculo: 50000, taxaMensal: -1, prazoMeses: 12 }).valido, false);
  assert.equal(calcularFinanciamentoPrice({ valorVeiculo: 50000, taxaMensal: NaN, prazoMeses: 12 }).valido, false);

  // Prazo <= 0 ou NaN
  assert.equal(calcularFinanciamentoPrice({ valorVeiculo: 50000, taxaMensal: 1.5, prazoMeses: 0 }).valido, false);
  assert.equal(calcularFinanciamentoPrice({ valorVeiculo: 50000, taxaMensal: 1.5, prazoMeses: -12 }).valido, false);
  assert.equal(calcularFinanciamentoPrice({ valorVeiculo: 50000, taxaMensal: 1.5, prazoMeses: NaN }).valido, false);
});
