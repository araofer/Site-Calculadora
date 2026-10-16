import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const pagina = readFileSync(
  new URL("../src/pages/tools/financas/preco-servico.page.html", import.meta.url),
  "utf8"
);
const script = readFileSync(
  new URL("../js/tools/preco-servico.js", import.meta.url),
  "utf8"
);

test("página declara os botões de copiar, compartilhar e imprimir", () => {
  assert.match(pagina, /id="copiarPrecoServico"/);
  assert.match(pagina, /id="compartilharPrecoServico"/);
  assert.match(pagina, /id="imprimirPrecoServico"/);
});

test("JavaScript conecta as três ações ao módulo compartilhado", () => {
  assert.match(script, /createResultActions/);
  assert.match(script, /await acoes\.copy\(\)/);
  assert.match(script, /await acoes\.share\(\)/);
  assert.match(script, /acoes\.print\(\)/);
  assert.match(script, /botaoCompartilhar\.hidden = false/);
  assert.match(script, /botaoImprimir\.hidden = false/);
});
