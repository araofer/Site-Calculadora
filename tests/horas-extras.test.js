import test from "node:test";
import assert from "node:assert/strict";
import { parseNumero, calcularHorasExtras } from "../js/tools/horas-extras.js";

test("parseNumero - Conversão de formatos numéricos brasileiros e internacionais", () => {
  assert.equal(parseNumero("2.500,50"), 2500.5);
  assert.equal(parseNumero("2500,50"), 2500.5);
  assert.equal(parseNumero("2500.50"), 2500.5);
  assert.equal(parseNumero("2500"), 2500);
  assert.equal(parseNumero(1500), 1500);
  assert.ok(Number.isNaN(parseNumero("abc")));
  assert.ok(Number.isNaN(parseNumero("")));
  assert.ok(Number.isNaN(parseNumero(null)));
});

test("calcularHorasExtras - Caso didático oficial da página (salário 2200, jornada 220, 10h, adicional 50%)", () => {
  const res = calcularHorasExtras({
    salario: "2.200,00",
    jornada: "220",
    horasExtras: "10",
    adicional: "50"
  });

  assert.equal(res.valido, true);
  assert.equal(res.salario, 2200);
  assert.equal(res.jornada, 220);
  assert.equal(res.horasExtras, 10);
  assert.equal(res.adicional, 50);

  // Valor hora normal = 2200 / 220 = 10.00
  assert.equal(res.valorHora, 10);

  // Valor hora extra = 10 * (1 + 50/100) = 15.00
  assert.equal(res.valorHoraExtra, 15);

  // Total horas extras = 15 * 10 = 150.00
  assert.equal(res.totalHorasExtras, 150);
});

test("calcularHorasExtras - Adicional de 100% (domingos e feriados)", () => {
  const res = calcularHorasExtras({
    salario: 3000,
    jornada: 200,
    horasExtras: 8,
    adicional: 100
  });

  assert.equal(res.valido, true);
  // Valor hora normal: 3000 / 200 = 15.00
  assert.equal(res.valorHora, 15);
  // Valor hora extra: 15 * 2.0 = 30.00
  assert.equal(res.valorHoraExtra, 30);
  // Total: 30 * 8 = 240.00
  assert.equal(res.totalHorasExtras, 240);
});

test("calcularHorasExtras - Quantidade de horas extras zero", () => {
  const res = calcularHorasExtras({
    salario: 2500,
    jornada: 220,
    horasExtras: 0,
    adicional: 50
  });

  assert.equal(res.valido, true);
  assert.equal(res.totalHorasExtras, 0);
});

test("calcularHorasExtras - Adicional de 0% (hora extra igual à hora normal)", () => {
  const res = calcularHorasExtras({
    salario: 2200,
    jornada: 220,
    horasExtras: 5,
    adicional: 0
  });

  assert.equal(res.valido, true);
  assert.equal(res.valorHoraExtra, res.valorHora);
  assert.equal(res.totalHorasExtras, 50);
});

test("calcularHorasExtras - Validações de limites e erros específicos", () => {
  // Salário <= 0
  const resSalario = calcularHorasExtras({ salario: 0, jornada: 220, horasExtras: 10, adicional: 50 });
  assert.equal(resSalario.valido, false);
  assert.match(resSalario.erro, /salário mensal deve ser maior que zero/i);

  // Jornada <= 0
  const resJornada = calcularHorasExtras({ salario: 2000, jornada: 0, horasExtras: 10, adicional: 50 });
  assert.equal(resJornada.valido, false);
  assert.match(resJornada.erro, /jornada mensal em horas deve ser maior que zero/i);

  // Horas extras negativas
  const resHorasNeg = calcularHorasExtras({ salario: 2000, jornada: 220, horasExtras: -5, adicional: 50 });
  assert.equal(resHorasNeg.valido, false);
  assert.match(resHorasNeg.erro, /horas extras não pode ser negativa/i);

  // Adicional negativo
  const resAdicNeg = calcularHorasExtras({ salario: 2000, jornada: 220, horasExtras: 10, adicional: -10 });
  assert.equal(resAdicNeg.valido, false);
  assert.match(resAdicNeg.erro, /adicional de hora extra não pode ser negativo/i);

  // Campos obrigatórios vazios
  const resVazio = calcularHorasExtras({ salario: "", jornada: 220, horasExtras: 10, adicional: 50 });
  assert.equal(resVazio.valido, false);
  assert.match(resVazio.erro, /preencha todos os campos/i);
});
