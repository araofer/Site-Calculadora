import test from "node:test";
import assert from "node:assert/strict";
import { validarDadosQRCode } from "../js/tools/qr-code.js";

test("validarDadosQRCode - URL válida padrão", () => {
  const res = validarDadosQRCode("https://www.calculadoramaster.com");

  assert.equal(res.valido, true);
  assert.equal(res.texto, "https://www.calculadoramaster.com");
  assert.equal(res.config.width, 256);
  assert.equal(res.config.height, 256);
  assert.equal(res.config.colorDark, "#000000");
  assert.equal(res.config.colorLight, "#ffffff");
  assert.equal(res.config.correctLevel, "H");
});

test("validarDadosQRCode - Preserva espaços originais no payload (regressão '  TESTE  ')", () => {
  const res = validarDadosQRCode("  TESTE  ");

  assert.equal(res.valido, true);
  assert.equal(res.texto, "  TESTE  ");
});

test("validarDadosQRCode - Chave PIX ou payload de pagamento", () => {
  const pixPayload = "00020126580014BR.GOV.BCB.PIX0136123e4567-e89b-12d3-a456-426614174000520400005303986540510.005802BR";
  const res = validarDadosQRCode(pixPayload);

  assert.equal(res.valido, true);
  assert.equal(res.texto, pixPayload);
});

test("validarDadosQRCode - String vazia deve falhar com mensagem exata", () => {
  const res = validarDadosQRCode("");

  assert.equal(res.valido, false);
  assert.equal(res.erro, "Por favor, digite um link ou texto!");
});

test("validarDadosQRCode - String contendo apenas espaços em branco", () => {
  const res = validarDadosQRCode("     ");

  assert.equal(res.valido, false);
  assert.equal(res.erro, "Por favor, digite um link ou texto!");
});

test("validarDadosQRCode - Tipos não string tratados defensivamente", () => {
  assert.equal(validarDadosQRCode(null).valido, false);
  assert.equal(validarDadosQRCode(undefined).valido, false);
  assert.equal(validarDadosQRCode(12345).valido, false);
  assert.equal(validarDadosQRCode({}).valido, false);
});
