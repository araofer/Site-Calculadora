import test from "node:test";
import assert from "node:assert/strict";
import { calcularDesconto } from "../js/tools/desconto.js";

test("calcularDesconto - Percentual intermediário (exemplo prático: 200 com 10%)", () => {
  const res = calcularDesconto({ preco: 200, desconto: 10 });

  assert.equal(res.valido, true);
  assert.equal(res.preco, 200);
  assert.equal(res.desconto, 10);
  assert.equal(res.valorDesconto, 20);
  assert.equal(res.precoFinal, 180);
  assert.equal(res.texto, "Você economiza R$ 20.00 | Preço final: R$ 180.00");
});

test("calcularDesconto - Desconto de 0% (preço final permanece inalterado)", () => {
  const res = calcularDesconto({ preco: 150, desconto: 0 });

  assert.equal(res.valido, true);
  assert.equal(res.valorDesconto, 0);
  assert.equal(res.precoFinal, 150);
  assert.equal(res.texto, "Você economiza R$ 0.00 | Preço final: R$ 150.00");
});

test("calcularDesconto - Desconto de 100% (produto gratuito / gratuidade total)", () => {
  const res = calcularDesconto({ preco: 350, desconto: 100 });

  assert.equal(res.valido, true);
  assert.equal(res.valorDesconto, 350);
  assert.equal(res.precoFinal, 0);
  assert.equal(res.texto, "Você economiza R$ 350.00 | Preço final: R$ 0.00");
});

test("calcularDesconto - Cálculo com valores fracionados / decimais", () => {
  const res = calcularDesconto({ preco: "199.90", desconto: "10" });

  assert.equal(res.valido, true);
  assert.equal(res.valorDesconto.toFixed(2), "19.99");
  assert.equal(res.precoFinal.toFixed(2), "179.91");
  assert.equal(res.texto, "Você economiza R$ 19.99 | Preço final: R$ 179.91");
});

test("calcularDesconto - Entradas inválidas ou valores negativos", () => {
  assert.equal(calcularDesconto({ preco: -50, desconto: 10 }).valido, false);
  assert.equal(calcularDesconto({ preco: 100, desconto: -10 }).valido, false);
  assert.equal(calcularDesconto({ preco: "abc", desconto: 10 }).valido, false);
  assert.equal(calcularDesconto({ preco: 100, desconto: "xyz" }).valido, false);
  assert.equal(calcularDesconto({}).valido, false);
});
