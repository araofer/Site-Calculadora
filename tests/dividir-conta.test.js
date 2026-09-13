import test from "node:test";
import assert from "node:assert/strict";
import { validarQuantidadePessoas, calcularDivisaoConta } from "../js/tools/dividir-conta.js";

test("validarQuantidadePessoas - Validações de limites e valores inteiros", () => {
  assert.equal(validarQuantidadePessoas(4).valido, true);
  assert.equal(validarQuantidadePessoas("10").pessoas, 10);
  assert.equal(validarQuantidadePessoas(50).valido, true);

  // Limite máximo de 50
  const acimaDoLimite = validarQuantidadePessoas(51);
  assert.equal(acimaDoLimite.valido, false);
  assert.match(acimaDoLimite.erro, /Limite máximo de 50 pessoas/i);

  // Valores inválidos ou menores/iguais a zero
  assert.equal(validarQuantidadePessoas(0).valido, false);
  assert.equal(validarQuantidadePessoas(-5).valido, false);
  assert.equal(validarQuantidadePessoas("abc").valido, false);
  assert.equal(validarQuantidadePessoas("").valido, false);
});

test("calcularDivisaoConta - Conta fecha perfeitamente (status: correto)", () => {
  const res = calcularDivisaoConta({
    total: 200,
    valores: [50, 50, 50, 50]
  });

  assert.equal(res.valido, true);
  assert.equal(res.soma, 200);
  assert.equal(res.diferenca, 0);
  assert.equal(res.status, "correto");
  assert.equal(res.cor, "green");
  assert.match(res.mensagem, /Tudo certo!/i);
});

test("calcularDivisaoConta - Ainda falta dinheiro para fechar a conta (status: falta)", () => {
  const res = calcularDivisaoConta({
    total: 200,
    valores: [40, 50, 50]
  });

  assert.equal(res.valido, true);
  assert.equal(res.soma, 140);
  assert.equal(res.diferenca, 60);
  assert.equal(res.status, "falta");
  assert.equal(res.cor, "orange");
  assert.match(res.mensagem, /Ainda faltam R\$ 60\.00/i);
});

test("calcularDivisaoConta - Somatório passou do total da conta (status: passou)", () => {
  const res = calcularDivisaoConta({
    total: 200,
    valores: [70, 70, 70]
  });

  assert.equal(res.valido, true);
  assert.equal(res.soma, 210);
  assert.equal(res.diferenca, -10);
  assert.equal(res.status, "passou");
  assert.equal(res.cor, "red");
  assert.match(res.mensagem, /passou em R\$ 10\.00/i);
});

test("calcularDivisaoConta - Fechamento com centavos e tolerância flutuante", () => {
  const res = calcularDivisaoConta({
    total: "100.00",
    valores: ["33.33", "33.33", "33.34"]
  });

  assert.equal(res.valido, true);
  assert.equal(res.status, "correto");
  assert.equal(res.cor, "green");
});

test("calcularDivisaoConta - Entradas inválidas ou total zero/negativo", () => {
  assert.equal(calcularDivisaoConta({ total: 0, valores: [10] }).valido, false);
  assert.equal(calcularDivisaoConta({ total: -50, valores: [10] }).valido, false);
  assert.equal(calcularDivisaoConta({ total: "abc", valores: [10] }).valido, false);
  assert.equal(calcularDivisaoConta({ total: 100, valores: [] }).valido, false);
});
