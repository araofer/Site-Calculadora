import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const root = new URL('../', import.meta.url);
const pages = [
  'src/pages/tools/financas/valor-hora.page.html',
  'src/pages/tools/financas/preco-servico.page.html',
  'src/pages/tools/financas/margem-markup.page.html',
  'src/pages/tools/utilidades/pisos-revestimentos.page.html'
].map((path) => ({ path, html: readFileSync(new URL(path, root), 'utf8') }));

test('calculadoras seguem estrutura comum de campos e resultados acessíveis', () => {
  for (const { path, html } of pages) {
    assert.match(html, /class="card tool-calculator-card"/, `${path}: card do formulário`);
    assert.match(html, /class="form-group"/, `${path}: grupo de formulário`);
    assert.match(html, /aria-live="polite"/, `${path}: região de resultado/status`);
    assert.doesNotMatch(html, /<br\s*\/?\s*>|style="/, `${path}: sem espaçamento de apresentação inline`);

    const ids = new Set([...html.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]));
    for (const [, target] of html.matchAll(/\bfor="([^"]+)"/g)) {
      assert.ok(ids.has(target), `${path}: label aponta para #${target}`);
    }
    for (const [, references] of html.matchAll(/\baria-describedby="([^"]+)"/g)) {
      for (const target of references.split(/\s+/)) {
        assert.ok(ids.has(target), `${path}: aria-describedby aponta para #${target}`);
      }
    }
  }
});

test('estilos partilhados limitam campos e banner sem ocultar overflow', () => {
  const style = readFileSync(new URL('css/style.css', root), 'utf8');
  const cookies = readFileSync(new URL('css/cookie-consent.css', root), 'utf8');

  assert.match(style, /\.form-group select[\s\S]*?width:\s*100%[\s\S]*?max-width:\s*100%[\s\S]*?min-width:\s*0[\s\S]*?box-sizing:\s*border-box/);
  assert.match(cookies, /\.cm-cookie-banner\s*\{[^}]*width:\s*auto;[^}]*max-width:\s*100vw;/);
  assert.match(cookies, /\.cm-cookie-container\s*\{[^}]*min-width:\s*0;/);
  assert.doesNotMatch(style, /overflow-x:\s*hidden/);
});
