import test from "node:test";
import assert from "node:assert/strict";
import { CHAR_SETS, gerarSenhaSegura } from "../js/tools/senha.js";

test("gerarSenhaSegura - gera senha com comprimento padrão e caracteres válidos", () => {
  const res = gerarSenhaSegura();
  assert.equal(res.valido, true);
  assert.equal(res.senha.length, 12);
});

test("gerarSenhaSegura - comprimentos variados", () => {
  [6, 16, 20, 32].forEach(tam => {
    const res = gerarSenhaSegura({ tamanho: tam });
    assert.equal(res.valido, true);
    assert.equal(res.senha.length, tam);
  });
});

test("gerarSenhaSegura - filtros de conjunto de caracteres", () => {
  // Apenas números
  const resNums = gerarSenhaSegura({
    tamanho: 20,
    maiusculas: false,
    minusculas: false,
    numeros: true,
    especiais: false
  });
  assert.equal(resNums.valido, true);
  for (const c of resNums.senha) {
    assert.ok(CHAR_SETS.numeros.includes(c), `Esperado número mas encontrou ${c}`);
  }

  // Apenas maiúsculas
  const resMaiusc = gerarSenhaSegura({
    tamanho: 20,
    maiusculas: true,
    minusculas: false,
    numeros: false,
    especiais: false
  });
  assert.equal(resMaiusc.valido, true);
  for (const c of resMaiusc.senha) {
    assert.ok(CHAR_SETS.maiusculas.includes(c), `Esperado maiúscula mas encontrou ${c}`);
  }

  // Apenas minúsculas
  const resMinusc = gerarSenhaSegura({
    tamanho: 20,
    maiusculas: false,
    minusculas: true,
    numeros: false,
    especiais: false
  });
  assert.equal(resMinusc.valido, true);
  for (const c of resMinusc.senha) {
    assert.ok(CHAR_SETS.minusculas.includes(c), `Esperado minúscula mas encontrou ${c}`);
  }

  // Apenas especiais
  const resEspec = gerarSenhaSegura({
    tamanho: 20,
    maiusculas: false,
    minusculas: false,
    numeros: false,
    especiais: true
  });
  assert.equal(resEspec.valido, true);
  for (const c of resEspec.senha) {
    assert.ok(CHAR_SETS.especiais.includes(c), `Esperado especial mas encontrou ${c}`);
  }
});

test("gerarSenhaSegura - erro quando nenhuma opção é selecionada", () => {
  const res = gerarSenhaSegura({
    maiusculas: false,
    minusculas: false,
    numeros: false,
    especiais: false
  });

  assert.equal(res.valido, false);
  assert.match(res.erro, /pelo menos um tipo de caractere/i);
});

test("gerarSenhaSegura - uso exclusivo de Web Crypto API e rejeição de Math.random", () => {
  // Garantir que Math.random não é chamado
  const originalMathRandom = Math.random;
  let mathRandomCalled = false;
  Math.random = () => {
    mathRandomCalled = true;
    return 0.5;
  };

  try {
    const res = gerarSenhaSegura({ tamanho: 15 });
    assert.equal(res.valido, true);
    assert.equal(mathRandomCalled, false, "Math.random() NUNCA deve ser invocado em gerarSenhaSegura");
  } finally {
    Math.random = originalMathRandom;
  }
});

test("gerarSenhaSegura - comportamento defensivo na ausência de Web Crypto API", () => {
  const res = gerarSenhaSegura({ cryptoOverride: {} });
  assert.equal(res.valido, false);
  assert.match(res.erro, /Web Crypto API não disponível/i);
});
