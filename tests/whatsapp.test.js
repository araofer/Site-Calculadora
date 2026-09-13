import test from "node:test";
import assert from "node:assert/strict";
import { gerarLinkWhatsApp } from "../js/tools/whatsapp.js";

test("gerarLinkWhatsApp - Número brasileiro com DDD sem DDI (11 dígitos adiciona 55)", () => {
  const res = gerarLinkWhatsApp({
    numero: "11999999999",
    mensagem: "Olá mundo"
  });

  assert.equal(res.valido, true);
  assert.equal(res.numero, "5511999999999");
  assert.equal(res.url, "https://wa.me/5511999999999?text=Ol%C3%A1%20mundo");
});

test("gerarLinkWhatsApp - Número com máscara de telefone (parênteses, traços e espaços)", () => {
  const res = gerarLinkWhatsApp({
    numero: "(21) 98765-4321",
    mensagem: "Quero fazer um orçamento"
  });

  assert.equal(res.valido, true);
  assert.equal(res.numero, "5521987654321");
  assert.equal(res.url, "https://wa.me/5521987654321?text=Quero%20fazer%20um%20or%C3%A7amento");
});

test("gerarLinkWhatsApp - Número que já inclui código internacional DDI 55", () => {
  const res = gerarLinkWhatsApp({
    numero: "+55 (31) 91234-5678",
    mensagem: "Teste DDI"
  });

  assert.equal(res.valido, true);
  assert.equal(res.numero, "5531912345678");
  assert.equal(res.url, "https://wa.me/5531912345678?text=Teste%20DDI");
});

test("gerarLinkWhatsApp - Mensagem com caracteres especiais, acentos e query delimiters (&, ?, #)", () => {
  const msg = "Promoção especial: 50% de desconto & frete grátis? Sim! #sucesso";
  const res = gerarLinkWhatsApp({
    numero: "11988887777",
    mensagem: msg
  });

  assert.equal(res.valido, true);
  assert.equal(res.url, `https://wa.me/5511988887777?text=${encodeURIComponent(msg)}`);
});

test("gerarLinkWhatsApp - Mensagem com emojis e quebras de linha", () => {
  const msg = "Olá! 👋\nTudo bem? 😊";
  const res = gerarLinkWhatsApp({
    numero: "11988887777",
    mensagem: msg
  });

  assert.equal(res.valido, true);
  assert.equal(res.url, `https://wa.me/5511988887777?text=${encodeURIComponent(msg)}`);
});

test("gerarLinkWhatsApp - Mensagem vazia ou omitida", () => {
  const res1 = gerarLinkWhatsApp({ numero: "11999999999", mensagem: "" });
  assert.equal(res1.valido, true);
  assert.equal(res1.url, "https://wa.me/5511999999999?text=");

  const res2 = gerarLinkWhatsApp({ numero: "11999999999" });
  assert.equal(res2.valido, true);
  assert.equal(res2.url, "https://wa.me/5511999999999?text=");
});

test("gerarLinkWhatsApp - Número com menos de 10 dígitos deve falhar", () => {
  const res1 = gerarLinkWhatsApp({ numero: "9999" });
  assert.equal(res1.valido, false);
  assert.equal(res1.erro, "Por favor, digite um número válido com DDD.");

  const res2 = gerarLinkWhatsApp({ numero: "" });
  assert.equal(res2.valido, false);
  assert.equal(res2.erro, "Por favor, digite um número válido com DDD.");

  const resNull = gerarLinkWhatsApp({});
  assert.equal(resNull.valido, false);
  assert.equal(resNull.erro, "Por favor, digite um número válido com DDD.");
});
