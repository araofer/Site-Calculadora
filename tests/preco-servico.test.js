import test from "node:test";
import assert from "node:assert/strict";
import { calcularPrecoServico, formatarEntradaMonetaria } from "../js/tools/preco-servico.js";

test("calcula o preço sugerido considerando todos os custos", () => {
  const resultado = calcularPrecoServico({
    materiais: 120,
    maoDeObra: 200,
    deslocamento: 30,
    outrasDespesas: 50,
    margemDesejada: 25
  });

  assert.equal(resultado.valido, true);
  assert.equal(resultado.custoTotal, 400);
  assert.equal(resultado.precoSugerido, 533.33);
  assert.equal(resultado.lucroEstimado, 133.33);
  assert.equal(resultado.margemDesejada, 25);
  assert.equal(resultado.margemEfetiva, 25);
  assert.equal(resultado.markup, 33.33);
});

test("calcula corretamente uma margem desejada de 30%", () => {
  const resultado = calcularPrecoServico({
    materiais: 100,
    margemDesejada: 30
  });

  assert.equal(resultado.valido, true);
  assert.equal(resultado.custoTotal, 100);
  assert.equal(resultado.precoSugerido, 142.86);
  assert.equal(resultado.lucroEstimado, 42.86);
  assert.equal(resultado.margemEfetiva, 30);
});

test("margem zero resulta em preço igual ao custo", () => {
  const resultado = calcularPrecoServico({
    materiais: 150,
    margemDesejada: 0
  });

  assert.equal(resultado.valido, true);
  assert.equal(resultado.precoSugerido, 150);
  assert.equal(resultado.lucroEstimado, 0);
  assert.equal(resultado.margemEfetiva, 0);
});

test("custos não informados são considerados zero", () => {
  const resultado = calcularPrecoServico({
    materiais: 80,
    maoDeObra: 20,
    margemDesejada: 20
  });

  assert.equal(resultado.valido, true);
  assert.equal(resultado.custoTotal, 100);
  assert.equal(resultado.precoSugerido, 125);
});

test("rejeita custos negativos ou inválidos", () => {
  assert.equal(
    calcularPrecoServico({
      materiais: -10,
      margemDesejada: 20
    }).valido,
    false
  );

  assert.equal(
    calcularPrecoServico({
      materiais: "abc",
      margemDesejada: 20
    }).valido,
    false
  );
});

test("rejeita margem negativa, igual ou superior a 100%", () => {
  for (const margem of [-1, 100, 120]) {
    assert.equal(
      calcularPrecoServico({
        materiais: 100,
        margemDesejada: margem
      }).valido,
      false
    );
  }
});

test("rejeita margem ausente ou inválida", () => {
  assert.equal(
    calcularPrecoServico({ materiais: 100 }).valido,
    false
  );

  assert.equal(
    calcularPrecoServico({
      materiais: 100,
      margemDesejada: "abc"
    }).valido,
    false
  );
});

test("rejeita orçamento sem nenhum custo positivo", () => {
  const resultado = calcularPrecoServico({
    materiais: 0,
    maoDeObra: 0,
    deslocamento: 0,
    outrasDespesas: 0,
    margemDesejada: 30
  });

  assert.equal(resultado.valido, false);
});


test("formata valores digitados com vírgula e separador de milhar", () => {
  assert.equal(formatarEntradaMonetaria("10000"), "100,00");
  assert.equal(formatarEntradaMonetaria("1234567"), "12.345,67");
  assert.equal(formatarEntradaMonetaria(""), "");
});

test("calcula custos informados no formato monetário brasileiro", () => {
  const resultado = calcularPrecoServico({
    materiais: "100,00",
    maoDeObra: "200,00",
    deslocamento: "20,00",
    outrasDespesas: "30,00",
    margemDesejada: 30
  });

  assert.equal(resultado.valido, true);
  assert.equal(resultado.custoTotal, 350);
  assert.equal(resultado.precoSugerido, 500);
  assert.equal(resultado.lucroEstimado, 150);
});
