import test from "node:test";
import assert from "node:assert/strict";
import { calcularIMC } from "../js/tools/imc.js";

test("calcularIMC - Peso normal (exemplo: 70kg, 1.75m)", () => {
  const res = calcularIMC({ peso: 70, altura: 1.75 });

  assert.equal(res.valido, true);
  assert.equal(res.imc.toFixed(2), "22.86");
  assert.equal(res.classificacao, "Peso normal");
  assert.equal(res.texto, "Seu IMC é 22.86 | Peso normal");
});

test("calcularIMC - Abaixo do peso (IMC < 18.5)", () => {
  const res = calcularIMC({ peso: 50, altura: 1.75 });

  assert.equal(res.valido, true);
  assert.equal(res.imc.toFixed(2), "16.33");
  assert.equal(res.classificacao, "Abaixo do peso");
});

test("calcularIMC - Sobrepeso (25 <= IMC < 30)", () => {
  const res = calcularIMC({ peso: 80, altura: 1.75 });

  assert.equal(res.valido, true);
  assert.equal(res.imc.toFixed(2), "26.12");
  assert.equal(res.classificacao, "Sobrepeso");
});

test("calcularIMC - Obesidade Grau I (30 <= IMC < 35)", () => {
  const res = calcularIMC({ peso: 95, altura: 1.75 });

  assert.equal(res.valido, true);
  assert.equal(res.imc.toFixed(2), "31.02");
  assert.equal(res.classificacao, "Obesidade Grau I");
});

test("calcularIMC - Obesidade Grau II (35 <= IMC < 40)", () => {
  const res = calcularIMC({ peso: 110, altura: 1.75 });

  assert.equal(res.valido, true);
  assert.equal(res.imc.toFixed(2), "35.92");
  assert.equal(res.classificacao, "Obesidade Grau II");
});

test("calcularIMC - Obesidade Grau III (Mórbida) (IMC >= 40)", () => {
  const res = calcularIMC({ peso: 130, altura: 1.75 });

  assert.equal(res.valido, true);
  assert.equal(res.imc.toFixed(2), "42.45");
  assert.equal(res.classificacao, "Obesidade Grau III (Mórbida)");
});

test("calcularIMC - Ajuste automático de altura digitada em centímetros (ex: 175 cm -> 1.75 m)", () => {
  const res = calcularIMC({ peso: 70, altura: 175 });

  assert.equal(res.valido, true);
  assert.equal(res.altura, 1.75);
  assert.equal(res.imc.toFixed(2), "22.86");
  assert.equal(res.classificacao, "Peso normal");
});

test("calcularIMC - Entradas com vírgula e ponto decimal (regressão 70.5 vs 70,5)", () => {
  const resPonto = calcularIMC({ peso: "70.5", altura: "1.75" });
  const resVirgula = calcularIMC({ peso: "70,5", altura: "1,75" });

  assert.equal(resPonto.valido, true);
  assert.equal(resVirgula.valido, true);
  assert.equal(resPonto.peso, 70.5);
  assert.equal(resVirgula.peso, 70.5);
  assert.equal(resPonto.altura, 1.75);
  assert.equal(resVirgula.altura, 1.75);
  assert.equal(resPonto.imc, resVirgula.imc);
  assert.equal(resPonto.imc.toFixed(2), "23.02");
  assert.equal(resPonto.classificacao, "Peso normal");
  assert.equal(resVirgula.classificacao, "Peso normal");
});

test("calcularIMC - Entradas inválidas, negativas ou zero", () => {
  assert.equal(calcularIMC({ peso: 0, altura: 1.75 }).valido, false);
  assert.equal(calcularIMC({ peso: 70, altura: 0 }).valido, false);
  assert.equal(calcularIMC({ peso: -70, altura: 1.75 }).valido, false);
  assert.equal(calcularIMC({ peso: 70, altura: -1.75 }).valido, false);
  assert.equal(calcularIMC({ peso: "abc", altura: 1.75 }).valido, false);
  assert.equal(calcularIMC({}).valido, false);
});
