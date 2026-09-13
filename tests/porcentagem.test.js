import test from "node:test";
import assert from "node:assert/strict";
import { calcularPorcentagem } from "../js/tools/porcentagem.js";

test("calcularPorcentagem - Caso padrão (exemplo da página: 20% de 500 = 100)", () => {
  const res = calcularPorcentagem({ valor: 500, percentual: 20 });

  assert.equal(res.valido, true);
  assert.equal(res.valor, 500);
  assert.equal(res.percentual, 20);
  assert.equal(res.parte, 100);
  assert.equal(res.comDesconto, 400);
  assert.equal(res.comAumento, 600);
  assert.equal(res.parte.toFixed(2), "100.00");
  assert.equal(res.comDesconto.toFixed(2), "400.00");
  assert.equal(res.comAumento.toFixed(2), "600.00");
});

test("calcularPorcentagem - Percentual de 0%", () => {
  const res = calcularPorcentagem({ valor: 250, percentual: 0 });

  assert.equal(res.valido, true);
  assert.equal(res.parte, 0);
  assert.equal(res.comDesconto, 250);
  assert.equal(res.comAumento, 250);
});

test("calcularPorcentagem - Percentual de 100%", () => {
  const res = calcularPorcentagem({ valor: 350, percentual: 100 });

  assert.equal(res.valido, true);
  assert.equal(res.parte, 350);
  assert.equal(res.comDesconto, 0);
  assert.equal(res.comAumento, 700);
});

test("calcularPorcentagem - Percentual acima de 100%", () => {
  const res = calcularPorcentagem({ valor: 100, percentual: 150 });

  assert.equal(res.valido, true);
  assert.equal(res.parte, 150);
  assert.equal(res.comDesconto, -50);
  assert.equal(res.comAumento, 250);
});

test("calcularPorcentagem - Entradas em string com vírgula e ponto", () => {
  const res = calcularPorcentagem({ valor: "1.000,00", percentual: "10,5" });

  assert.equal(res.valido, true);
  assert.equal(res.valor, 1000);
  assert.equal(res.percentual, 10.5);
  assert.equal(res.parte, 105);
  assert.equal(res.comDesconto, 895);
  assert.equal(res.comAumento, 1105);
});

test("calcularPorcentagem - Entradas inválidas ou vazias", () => {
  assert.equal(calcularPorcentagem({ valor: "abc", percentual: 10 }).valido, false);
  assert.equal(calcularPorcentagem({ valor: 100, percentual: "xyz" }).valido, false);
  assert.equal(calcularPorcentagem({ valor: "", percentual: 10 }).valido, false);
  assert.equal(calcularPorcentagem({}).valido, false);
});
