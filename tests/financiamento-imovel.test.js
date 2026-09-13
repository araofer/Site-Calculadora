import test from "node:test";
import assert from "node:assert/strict";
import { calcularFinanciamentoSAC } from "../js/tools/financiamento-imovel.js";
import { formatBRL } from "../js/core/currency.js";

test("calcularFinanciamentoSAC - Caso padrão de financiamento imobiliário SAC", () => {
  const res = calcularFinanciamentoSAC({
    valorImovel: "300.000,00",
    valorEntrada: "60.000,00",
    taxaAnual: "9,5",
    prazoAnos: "30"
  });

  assert.equal(res.valido, true);
  assert.equal(res.valorImovel, 300000);
  assert.equal(res.valorEntrada, 60000);
  assert.equal(res.valorFinanciado, 240000);
  assert.equal(res.prazoAnos, 30);
  assert.equal(res.prazoMeses, 360);

  // Amortização mensal constante: 240.000 / 360 = 666.67
  assert.equal(formatBRL(res.amortizacaoMensal), "666,67");

  // Primeira parcela é mais alta que a última (sistema SAC decrescente)
  assert.ok(res.primeiraParcela > res.ultimaParcela);
  assert.equal(formatBRL(res.primeiraParcela), "2.488,63");
  assert.equal(formatBRL(res.ultimaParcela), "671,73");

  // Juros totais e custo global
  assert.ok(res.totalJuros > 0);
  assert.equal(formatBRL(res.totalFinanciamento), formatBRL(res.valorFinanciado + res.totalJuros));
  assert.equal(formatBRL(res.custoTotalImovel), formatBRL(res.totalFinanciamento + res.valorEntrada));
});

test("calcularFinanciamentoSAC - Taxa anual 0% (parcelas constantes sem juros)", () => {
  const res = calcularFinanciamentoSAC({
    valorImovel: 120000,
    valorEntrada: 20000,
    taxaAnual: 0,
    prazoAnos: 10
  });

  assert.equal(res.valido, true);
  assert.equal(res.valorFinanciado, 100000);
  assert.equal(res.prazoMeses, 120);
  assert.equal(res.totalJuros, 0);
  assert.equal(formatBRL(res.primeiraParcela), formatBRL(res.ultimaParcela));
  assert.equal(formatBRL(res.totalFinanciamento), "100.000,00");
  assert.equal(formatBRL(res.custoTotalImovel), "120.000,00");
});

test("calcularFinanciamentoSAC - Entrada igual ao valor do imóvel", () => {
  const res = calcularFinanciamentoSAC({
    valorImovel: 300000,
    valorEntrada: 300000,
    taxaAnual: 9.5,
    prazoAnos: 30
  });

  assert.equal(res.valido, false);
  assert.match(res.erro, /não pode ser maior ou igual/i);
});

test("calcularFinanciamentoSAC - Entrada maior que o valor do imóvel", () => {
  const res = calcularFinanciamentoSAC({
    valorImovel: 300000,
    valorEntrada: 350000,
    taxaAnual: 9.5,
    prazoAnos: 30
  });

  assert.equal(res.valido, false);
  assert.match(res.erro, /não pode ser maior ou igual/i);
});

test("calcularFinanciamentoSAC - Prazo em anos inválido ou negativo", () => {
  const resZero = calcularFinanciamentoSAC({
    valorImovel: 300000,
    valorEntrada: 60000,
    taxaAnual: 9.5,
    prazoAnos: 0
  });
  assert.equal(resZero.valido, false);

  const resNeg = calcularFinanciamentoSAC({
    valorImovel: 300000,
    valorEntrada: 60000,
    taxaAnual: 9.5,
    prazoAnos: -10
  });
  assert.equal(resNeg.valido, false);
});

test("calcularFinanciamentoSAC - Campos vazios, nulos ou não numéricos", () => {
  assert.equal(calcularFinanciamentoSAC({}).valido, false);
  assert.equal(calcularFinanciamentoSAC({ valorImovel: "abc", taxaAnual: 10, prazoAnos: 20 }).valido, false);
  assert.equal(calcularFinanciamentoSAC({ valorImovel: 100000, taxaAnual: "xyz", prazoAnos: 20 }).valido, false);
});
