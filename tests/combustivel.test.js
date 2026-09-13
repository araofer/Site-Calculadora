import test from "node:test";
import assert from "node:assert/strict";
import { calcularConsumoCombustivel } from "../js/tools/combustivel.js";

test("calcularConsumoCombustivel - Exemplo prático oficial da página (300 km, 12 km/l, R$ 5,50)", () => {
  const res = calcularConsumoCombustivel({
    distancia: 300,
    consumo: 12,
    preco: 5.5
  });

  assert.equal(res.valido, true);
  assert.equal(res.litros, 25);
  assert.equal(res.custo, 137.5);
  assert.equal(res.texto, "Você irá gastar 25.00 litros | Custo total: R$ 137.50");
});

test("calcularConsumoCombustivel - Entradas em string com vírgula decimal", () => {
  const res = calcularConsumoCombustivel({
    distancia: "150,5",
    consumo: "10",
    preco: "6,20"
  });

  assert.equal(res.valido, true);
  assert.equal(res.litros, 15.05);
  assert.equal(res.custo.toFixed(2), "93.31");
  assert.equal(res.texto, "Você irá gastar 15.05 litros | Custo total: R$ 93.31");
});

test("calcularConsumoCombustivel - Preço zero (combustível gratuito / cortesia)", () => {
  const res = calcularConsumoCombustivel({
    distancia: 100,
    consumo: 10,
    preco: 0
  });

  assert.equal(res.valido, true);
  assert.equal(res.litros, 10);
  assert.equal(res.custo, 0);
  assert.equal(res.texto, "Você irá gastar 10.00 litros | Custo total: R$ 0.00");
});

test("calcularConsumoCombustivel - Campos vazios ou nulos disparam erro obrigatório", () => {
  const res1 = calcularConsumoCombustivel({ distancia: "", consumo: "12", preco: "5.5" });
  assert.equal(res1.valido, false);
  assert.equal(res1.erro, "Preencha todos os campos!");

  const res2 = calcularConsumoCombustivel({ distancia: "300", consumo: "", preco: "5.5" });
  assert.equal(res2.valido, false);
  assert.equal(res2.erro, "Preencha todos os campos!");

  const res3 = calcularConsumoCombustivel({ distancia: "300", consumo: "12", preco: "" });
  assert.equal(res3.valido, false);
  assert.equal(res3.erro, "Preencha todos os campos!");

  const resVazio = calcularConsumoCombustivel({});
  assert.equal(resVazio.valido, false);
  assert.equal(resVazio.erro, "Preencha todos os campos!");
});

test("calcularConsumoCombustivel - Consumo zero ou negativo deve falhar (divisão por zero)", () => {
  const resZero = calcularConsumoCombustivel({ distancia: 300, consumo: 0, preco: 5.5 });
  assert.equal(resZero.valido, false);

  const resNeg = calcularConsumoCombustivel({ distancia: 300, consumo: -10, preco: 5.5 });
  assert.equal(resNeg.valido, false);
});

test("calcularConsumoCombustivel - Distância negativa ou preço negativo deve falhar", () => {
  const resDist = calcularConsumoCombustivel({ distancia: -100, consumo: 10, preco: 5.5 });
  assert.equal(resDist.valido, false);

  const resPreco = calcularConsumoCombustivel({ distancia: 100, consumo: 10, preco: -5.5 });
  assert.equal(resPreco.valido, false);
});

test("calcularConsumoCombustivel - Entradas alfanuméricas / NaN devem falhar", () => {
  const res = calcularConsumoCombustivel({ distancia: "abc", consumo: "12", preco: "5.5" });
  assert.equal(res.valido, false);
  assert.equal(res.erro, "Informe valores numéricos válidos!");
});
