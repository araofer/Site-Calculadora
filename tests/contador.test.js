import test from "node:test";
import assert from "node:assert/strict";
import { contarTexto } from "../js/tools/contador.js";

test("contarTexto - String vazia retorna zeros", () => {
  const res = contarTexto("");

  assert.equal(res.caracteres, 0);
  assert.equal(res.caracteresSemEspaco, 0);
  assert.equal(res.palavras, 0);
  assert.equal(res.textoFormatado, "Caracteres: 0 | Sem espaços: 0 | Palavras: 0");
});

test("contarTexto - Uma única palavra simples", () => {
  const res = contarTexto("Calculadora");

  assert.equal(res.caracteres, 11);
  assert.equal(res.caracteresSemEspaco, 11);
  assert.equal(res.palavras, 1);
  assert.equal(res.textoFormatado, "Caracteres: 11 | Sem espaços: 11 | Palavras: 1");
});

test("contarTexto - Frase comum com várias palavras e espaços simples", () => {
  const res = contarTexto("Calculadora Master 2026");

  assert.equal(res.caracteres, 23);
  assert.equal(res.caracteresSemEspaco, 21);
  assert.equal(res.palavras, 3);
});

test("contarTexto - Múltiplos espaços no início, meio e fim", () => {
  const res = contarTexto("   Olá    mundo   ");

  assert.equal(res.caracteres, 18);
  assert.equal(res.caracteresSemEspaco, 8);
  assert.equal(res.palavras, 2);
});

test("contarTexto - Texto com quebras de linha e tabulações", () => {
  const texto = "Primeira linha\nSegunda linha\r\nTerceira\tlinha";
  const res = contarTexto(texto);

  assert.equal(res.palavras, 6);
  assert.equal(res.caracteresSemEspaco, "PrimeiralinhaSegundalinhaTerceiralinha".length);
});

test("contarTexto - Caracteres acentuados, pontuações e símbolos especiais", () => {
  const texto = "Atenção: juros de 10% & taxas aplicáveis!";
  const res = contarTexto(texto);

  assert.equal(res.caracteres, texto.length);
  assert.equal(res.palavras, 7);
});

test("contarTexto - Parâmetros nulos ou indefinidos tratados defensivamente", () => {
  const resNull = contarTexto(null);
  assert.equal(resNull.caracteres, 0);
  assert.equal(resNull.palavras, 0);

  const resUndefined = contarTexto(undefined);
  assert.equal(resUndefined.caracteres, 0);
  assert.equal(resUndefined.palavras, 0);
});
