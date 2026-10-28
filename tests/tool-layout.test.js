import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const root = new URL('../', import.meta.url);
const pages = [
  'src/pages/tools/financas/valor-hora.page.html',
  'src/pages/tools/financas/preco-servico.page.html',
  'src/pages/tools/financas/margem-markup.page.html',
  'src/pages/tools/utilidades/pisos-revestimentos.page.html',
  'src/pages/tools/utilidades/tinta.page.html',
  'src/pages/tools/utilidades/orcamento-pedreiro.page.html',
  'src/pages/tools/financas/projecao-faturamento-mei.page.html',
  'src/pages/tools/financas/mei-ou-autonomo.page.html',
  'src/pages/tools/financas/carne-leao-autonomo.page.html',
  'src/pages/tools/financas/inss-contribuinte-individual.page.html',
  'src/pages/tools/financas/simples-nacional.page.html',
  'src/pages/tools/financas/fator-r.page.html'
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

test('página inicial destaca Porcentagem e Desconto sem duplicar cards em cada grade e com links corretos', () => {
  const indexHtml = readFileSync(new URL('src/pages/index.page.html', root), 'utf8');
  const featuredMatch = indexHtml.match(/<div class="featured-grid">([\s\S]*?)<\/div>\s*<\/div>\s*<\/section>/);
  const allToolsMatch = indexHtml.match(/<div class="tools-cards-grid"[^>]*>([\s\S]*?)<\/div>\s*<\/div>\s*<\/section>/);

  assert.ok(featuredMatch, 'Seção de ferramentas em destaque presente na home');
  assert.ok(allToolsMatch, 'Seção de todas as ferramentas presente na home');

  const featuredHtml = featuredMatch[1];
  const allToolsHtml = allToolsMatch[1];

  // Exatamente 1 card de Porcentagem e 1 card de Desconto em #destaques e em #ferramentas
  assert.equal((featuredHtml.match(/tools\/financas\/porcentagem\.html/g) || []).length, 1);
  assert.equal((featuredHtml.match(/tools\/financas\/desconto\.html/g) || []).length, 1);
  assert.equal((allToolsHtml.match(/tools\/financas\/porcentagem\.html/g) || []).length, 1);
  assert.equal((allToolsHtml.match(/tools\/financas\/desconto\.html/g) || []).length, 1);

  // Destaque prioritário consistente nas primeiras posições de #destaques
  assert.match(featuredHtml, /data-featured-tool="porcentagem"/);
  assert.match(featuredHtml, /data-featured-tool="desconto"/);
  const idxPorcentagem = featuredHtml.indexOf('tools/financas/porcentagem.html');
  const idxDesconto = featuredHtml.indexOf('tools/financas/desconto.html');
  const idxHorasExtras = featuredHtml.indexOf('tools/trabalhista/horas-extras.html');
  assert.ok(idxPorcentagem > -1 && idxDesconto > -1 && idxHorasExtras > -1);
  assert.ok(idxPorcentagem < idxHorasExtras, 'Porcentagem posicionada antes dos demais cards em destaque');
  assert.ok(idxDesconto < idxHorasExtras, 'Desconto posicionado antes dos demais cards em destaque');
});
