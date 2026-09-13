import test from "node:test";
import assert from "node:assert/strict";
import { calcularLucro } from "../js/tools/lucro.js";

test("calcularLucro - Operação com lucro positivo (exemplo oficial: custo 50 e venda 80)", () => {
  const res = calcularLucro({ custo: 50, preco: 80 });

  assert.equal(res.valido, true);
  assert.equal(res.custo, 50);
  assert.equal(res.preco, 80);
  assert.equal(res.lucro, 30);
  assert.equal(res.margem, 37.5);
  assert.equal(res.ehPrejuizo, false);
  assert.equal(res.corResultado, "#008080");
  assert.equal(res.textoHtml, "Lucro Bruto: R$ 30.00<br>Margem de Lucro: 37.50%");
});

test("calcularLucro - Operação com prejuízo (custo maior que preço de venda)", () => {
  const res = calcularLucro({ custo: 100, preco: 70 });

  assert.equal(res.valido, true);
  assert.equal(res.lucro, -30);
  // Margem sobre preço: (-30 / 70) * 100 ≈ -42.857...
  assert.equal(res.margem.toFixed(2), "-42.86");
  assert.equal(res.ehPrejuizo, true);
  assert.equal(res.corResultado, "#d9534f");
  assert.equal(res.textoHtml, "Lucro Bruto: R$ -30.00<br>Margem de Lucro: -42.86%");
});

test("calcularLucro - Ponto de equilíbrio (custo igual ao preço de venda)", () => {
  const res = calcularLucro({ custo: 60, preco: 60 });

  assert.equal(res.valido, true);
  assert.equal(res.lucro, 0);
  assert.equal(res.margem, 0);
  assert.equal(res.ehPrejuizo, false);
  assert.equal(res.corResultado, "#008080");
});

test("calcularLucro - Preço de venda zero ou negativo deve falhar com erro específico", () => {
  const resZero = calcularLucro({ custo: 50, preco: 0 });
  assert.equal(resZero.valido, false);
  assert.match(resZero.erro, /preço de venda deve ser maior que zero/i);

  const resNeg = calcularLucro({ custo: 50, preco: -10 });
  assert.equal(resNeg.valido, false);
  assert.match(resNeg.erro, /preço de venda deve ser maior que zero/i);
});

test("calcularLucro - Entradas inválidas ou custo negativo", () => {
  assert.equal(calcularLucro({ custo: -20, preco: 100 }).valido, false);
  assert.equal(calcularLucro({ custo: "abc", preco: 100 }).valido, false);
  assert.equal(calcularLucro({ custo: 50, preco: "xyz" }).valido, false);
  assert.equal(calcularLucro({}).valido, false);
});
