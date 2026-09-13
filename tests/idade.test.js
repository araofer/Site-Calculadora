import test from "node:test";
import assert from "node:assert/strict";
import { calcularIdadePrecisa } from "../js/tools/idade.js";

test("calcularIdadePrecisa - cálculo de idade exata em anos, meses e dias", () => {
  const ref = new Date(2025, 4, 15); // 15 de maio de 2025
  const res = calcularIdadePrecisa("2000-05-15", ref);

  assert.equal(res.valido, true);
  assert.equal(res.anos, 25);
  assert.equal(res.meses, 0);
  assert.equal(res.dias, 0);
  assert.equal(res.texto, "Você tem 25 anos, 0 meses e 0 dias.");
});

test("calcularIdadePrecisa - aniversário hoje", () => {
  const ref = new Date(2026, 8, 13); // 13 de setembro de 2026
  const res = calcularIdadePrecisa("1996-09-13", ref);

  assert.equal(res.valido, true);
  assert.equal(res.anos, 30);
  assert.equal(res.meses, 0);
  assert.equal(res.dias, 0);
  assert.equal(res.texto, "Você tem 30 anos, 0 meses e 0 dias.");
});

test("calcularIdadePrecisa - aniversário ontem (1 dia vivido no novo ano de vida)", () => {
  const ref = new Date(2026, 8, 14); // 14 de setembro de 2026
  const res = calcularIdadePrecisa("1996-09-13", ref);

  assert.equal(res.valido, true);
  assert.equal(res.anos, 30);
  assert.equal(res.meses, 0);
  assert.equal(res.dias, 1);
  assert.equal(res.texto, "Você tem 30 anos, 0 meses e 1 dia.");
});

test("calcularIdadePrecisa - aniversário amanhã (ainda não completou o novo ano)", () => {
  const ref = new Date(2026, 8, 12); // 12 de setembro de 2026
  const res = calcularIdadePrecisa("1996-09-13", ref);

  assert.equal(res.valido, true);
  assert.equal(res.anos, 29);
  assert.equal(res.meses, 11);
  // Agosto tem 31 dias: 12 - 13 + 31 = 30 dias
  assert.equal(res.dias, 30);
  assert.equal(res.texto, "Você tem 29 anos, 11 meses e 30 dias.");
});

test("calcularIdadePrecisa - ano bissexto (29 de fevereiro)", () => {
  // Nascido em 29/02/2020
  const ref2021 = new Date(2021, 1, 28); // 28/02/2021
  const res2021 = calcularIdadePrecisa("2020-02-29", ref2021);

  assert.equal(res2021.valido, true);
  assert.equal(res2021.anos, 0);
  assert.equal(res2021.meses, 11);
  assert.equal(res2021.dias, 30); // 31 dias em janeiro - 1 = 30

  // Em ano bissexto seguinte: 29/02/2024
  const ref2024 = new Date(2024, 1, 29);
  const res2024 = calcularIdadePrecisa("2020-02-29", ref2024);
  assert.equal(res2024.valido, true);
  assert.equal(res2024.anos, 4);
  assert.equal(res2024.meses, 0);
  assert.equal(res2024.dias, 0);
});

test("calcularIdadePrecisa - validações de datas inválidas", () => {
  // 29 de fevereiro em ano não bissexto
  assert.equal(calcularIdadePrecisa("2021-02-29").valido, false);
  // 31 de abril
  assert.equal(calcularIdadePrecisa("2023-04-31").valido, false);
  // Mês inválido
  assert.equal(calcularIdadePrecisa("2023-13-10").valido, false);
  // Dia inválido
  assert.equal(calcularIdadePrecisa("2023-05-32").valido, false);
  // Vazio ou string nula
  assert.equal(calcularIdadePrecisa("").valido, false);
  assert.equal(calcularIdadePrecisa(null).valido, false);
});

test("calcularIdadePrecisa - validação de data futura", () => {
  const ref = new Date(2025, 0, 1);
  const res = calcularIdadePrecisa("2025-06-01", ref);

  assert.equal(res.valido, false);
  assert.match(res.erro, /não pode ser no futuro/i);
});

test("calcularIdadePrecisa - formatação correta de singular e plural", () => {
  const ref = new Date(2025, 1, 2); // 02 de fevereiro de 2025
  const res = calcularIdadePrecisa("2024-01-01", ref);

  assert.equal(res.valido, true);
  assert.equal(res.anos, 1);
  assert.equal(res.meses, 1);
  assert.equal(res.dias, 1);
  assert.equal(res.texto, "Você tem 1 ano, 1 mês e 1 dia.");
});
