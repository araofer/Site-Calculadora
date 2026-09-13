import test from "node:test";
import assert from "node:assert/strict";
import { parseBRLCurrency, formatBRLCurrencyInput, formatBRL } from "../js/core/currency.js";

test("parseBRLCurrency - conversão de formatos brasileiros para número", () => {
  assert.equal(parseBRLCurrency("50.000,00"), 50000);
  assert.equal(parseBRLCurrency("1.234,56"), 1234.56);
  assert.equal(parseBRLCurrency("1.000"), 1000);
  assert.equal(parseBRLCurrency("100"), 100);
  assert.equal(parseBRLCurrency("0,50"), 0.5);
  assert.equal(parseBRLCurrency("R$ 15.000,99"), 15000.99);
  assert.equal(parseBRLCurrency(2500), 2500);
});

test("parseBRLCurrency - entradas vazias ou inválidas retornam 0", () => {
  assert.equal(parseBRLCurrency(""), 0);
  assert.equal(parseBRLCurrency("   "), 0);
  assert.equal(parseBRLCurrency(null), 0);
  assert.equal(parseBRLCurrency(undefined), 0);
  assert.equal(parseBRLCurrency("abc"), 0);
  assert.equal(parseBRLCurrency(NaN), 0);
  assert.equal(parseBRLCurrency(Infinity), 0);
  assert.equal(parseBRLCurrency(-Infinity), 0);
});

test("parseBRLCurrency - controle de valores negativos", () => {
  // Padrão: allowNegative = false
  assert.equal(parseBRLCurrency("-50,00"), 0);
  assert.equal(parseBRLCurrency("-1.000,50"), 0);
  assert.equal(parseBRLCurrency(-500), 0);

  // Com allowNegative = true
  assert.equal(parseBRLCurrency("-50,00", { allowNegative: true }), -50);
  assert.equal(parseBRLCurrency("-1.000,50", { allowNegative: true }), -1000.5);
  assert.equal(parseBRLCurrency(-500, { allowNegative: true }), -500);
  assert.equal(parseBRLCurrency("50,00", { allowNegative: true }), 50);
});

test("formatBRL - formatação numérica para padrão moeda brasileiro", () => {
  assert.equal(formatBRL(50000), "50.000,00");
  assert.equal(formatBRL(1234.56), "1.234,56");
  assert.equal(formatBRL(0), "0,00");
  assert.equal(formatBRL(0.05), "0,05");
  assert.equal(formatBRL(-1500.25), "-1.500,25");
});

test("formatBRL - tratamento defensivo para valores não finitos", () => {
  assert.equal(formatBRL(NaN), "0,00");
  assert.equal(formatBRL(Infinity), "0,00");
  assert.equal(formatBRL(-Infinity), "0,00");
  assert.equal(formatBRL(null), "0,00");
  assert.equal(formatBRL(undefined), "0,00");
});

test("formatBRLCurrencyInput - formatação em tempo real de elemento input", () => {
  const mockInput = { value: "123456" };
  formatBRLCurrencyInput(mockInput);
  assert.equal(mockInput.value, "1.234,56");

  mockInput.value = "100";
  formatBRLCurrencyInput(mockInput);
  assert.equal(mockInput.value, "1,00");

  mockInput.value = "5";
  formatBRLCurrencyInput(mockInput);
  assert.equal(mockInput.value, "0,05");

  mockInput.value = "";
  formatBRLCurrencyInput(mockInput);
  assert.equal(mockInput.value, "");

  mockInput.value = "0";
  formatBRLCurrencyInput(mockInput);
  assert.equal(mockInput.value, "0,00");
});

test("formatBRLCurrencyInput - formatação em tempo real com allowNegative", () => {
  const mockInput = { value: "-123456" };
  formatBRLCurrencyInput(mockInput, { allowNegative: true });
  assert.equal(mockInput.value, "-1.234,56");
});
