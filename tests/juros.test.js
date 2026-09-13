import test from "node:test";
import assert from "node:assert/strict";
import { calcularJurosSimples, calcularJurosCompostos } from "../js/tools/juros.js";

test("calcularJurosSimples - Caso padrão de juros simples", () => {
  const res = calcularJurosSimples({ capital: 1000, taxa: 5, tempo: 12 });

  assert.equal(res.valido, true);
  assert.equal(res.capital, 1000);
  assert.equal(res.taxa, 5);
  assert.equal(res.tempo, 12);
  assert.equal(res.juros, 600);
  assert.equal(res.total, 1600);
  assert.equal(res.juros.toFixed(2), "600.00");
  assert.equal(res.total.toFixed(2), "1600.00");
});

test("calcularJurosSimples - Taxa ou tempo zero", () => {
  const resTaxaZero = calcularJurosSimples({ capital: 5000, taxa: 0, tempo: 10 });
  assert.equal(resTaxaZero.valido, true);
  assert.equal(resTaxaZero.juros, 0);
  assert.equal(resTaxaZero.total, 5000);

  const resTempoZero = calcularJurosSimples({ capital: 5000, taxa: 10, tempo: 0 });
  assert.equal(resTempoZero.valido, true);
  assert.equal(resTempoZero.juros, 0);
  assert.equal(resTempoZero.total, 5000);
});

test("calcularJurosSimples - Entradas inválidas ou negativas", () => {
  assert.equal(calcularJurosSimples({ capital: -100, taxa: 5, tempo: 12 }).valido, false);
  assert.equal(calcularJurosSimples({ capital: 1000, taxa: -5, tempo: 12 }).valido, false);
  assert.equal(calcularJurosSimples({ capital: 1000, taxa: 5, tempo: -1 }).valido, false);
  assert.equal(calcularJurosSimples({ capital: "abc", taxa: 5, tempo: 12 }).valido, false);
  assert.equal(calcularJurosSimples({}).valido, false);
});

test("calcularJurosCompostos - Caso padrão de juros compostos", () => {
  const res = calcularJurosCompostos({ capital: 1000, taxa: 5, tempo: 12 });

  assert.equal(res.valido, true);
  assert.equal(res.capital, 1000);
  assert.equal(res.taxa, 5);
  assert.equal(res.tempo, 12);

  // M = 1000 * (1.05)^12 = 1795.8563...
  assert.equal(res.total.toFixed(2), "1795.86");
  assert.equal(res.juros.toFixed(2), "795.86");
});

test("calcularJurosCompostos - Taxa ou tempo zero", () => {
  const resTaxaZero = calcularJurosCompostos({ capital: 2500, taxa: 0, tempo: 6 });
  assert.equal(resTaxaZero.valido, true);
  assert.equal(resTaxaZero.juros, 0);
  assert.equal(resTaxaZero.total, 2500);

  const resTempoZero = calcularJurosCompostos({ capital: 2500, taxa: 8, tempo: 0 });
  assert.equal(resTempoZero.valido, true);
  assert.equal(resTempoZero.juros, 0);
  assert.equal(resTempoZero.total, 2500);
});

test("calcularJurosCompostos - Comparação simples vs compostos", () => {
  const simples = calcularJurosSimples({ capital: 10000, taxa: 10, tempo: 24 });
  const composto = calcularJurosCompostos({ capital: 10000, taxa: 10, tempo: 24 });

  assert.equal(simples.valido, true);
  assert.equal(composto.valido, true);
  // Em 24 meses, juros compostos geram montante superior a juros simples
  assert.ok(composto.total > simples.total);
});

test("calcularJurosCompostos - Entradas inválidas", () => {
  assert.equal(calcularJurosCompostos({ capital: "x", taxa: 5, tempo: 12 }).valido, false);
  assert.equal(calcularJurosCompostos({ capital: 1000, taxa: "y", tempo: 12 }).valido, false);
  assert.equal(calcularJurosCompostos({ capital: 1000, taxa: 5, tempo: NaN }).valido, false);
});
