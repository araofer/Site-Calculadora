import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Importa funções do motor SSG CommonJS
import ssg from '../scripts/build-html.js';
const {
  calculateRootPrefix,
  parsePageSource,
  renderPage,
  buildPilot,
  buildPages,
  DEFAULT_PAGES,
  DEFAULT_ASSETS,
  copyPilotAssets
} = ssg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

test('SSG - calculateRootPrefix calcula caminhos relativos para diferentes profundidades', () => {
  assert.equal(calculateRootPrefix('tools/financas/desconto.html'), '../../');
  assert.equal(calculateRootPrefix('tools/saude/imc.html'), '../../');
  assert.equal(calculateRootPrefix('categorias/financas.html'), '../');
  assert.equal(calculateRootPrefix('blog/index.html'), '../');
  assert.equal(calculateRootPrefix('index.html'), './');
});

test('SSG - parsePageSource extrai metadados frontmatter e conteúdo bruto', () => {
  const sample = `---
title: Minha Página
description: Descrição de teste
canonical: https://example.com/teste
layout: tool
---
<h1>Conteúdo</h1>`;

  const parsed = parsePageSource(sample);
  assert.equal(parsed.meta.title, 'Minha Página');
  assert.equal(parsed.meta.description, 'Descrição de teste');
  assert.equal(parsed.meta.canonical, 'https://example.com/teste');
  assert.equal(parsed.meta.layout, 'tool');
  assert.match(parsed.content, /<h1>Conteúdo<\/h1>/);
});

test('SSG - parsePageSource falha defensivamente se frontmatter não existir', () => {
  assert.throws(() => {
    parsePageSource('<h1>Sem frontmatter</h1>');
  }, /frontmatter/i);
});

test('SSG - renderPage falha se campo obrigatório estiver ausente', () => {
  const tempPage = path.join(ROOT_DIR, 'tests', '_temp_invalid.page.html');
  fs.writeFileSync(tempPage, `---
title: Teste
description: Teste sem canonical
layout: tool
---
<p>Incompleto</p>`, 'utf-8');

  try {
    assert.throws(() => {
      renderPage({
        sourceFile: tempPage,
        relativeOutputPath: 'tools/teste.html'
      });
    }, /canonical/i);
  } finally {
    if (fs.existsSync(tempPage)) {
      fs.unlinkSync(tempPage);
    }
  }
});

test('SSG Piloto - Execução do build gera arquivo HTML na saída esperada', () => {
  const result = buildPilot();
  assert.ok(fs.existsSync(result.targetFile), 'Arquivo gerado deve existir no disco');
  assert.ok(result.html.length > 500, 'HTML gerado deve ter tamanho substancial');
  assert.equal(result.relativeOutputPath, 'tools/financas/desconto.html');
});

test('SSG Piloto - HTML gerado contém title correto e preservado', () => {
  const filePath = path.join(ROOT_DIR, 'dist-pilot', 'tools', 'financas', 'desconto.html');
  const html = fs.readFileSync(filePath, 'utf-8');
  assert.match(html, /<title>Calculadora de Desconto Online Grátis \| Calculadora Master<\/title>/);
});

test('SSG Piloto - HTML gerado contém canonical exata', () => {
  const filePath = path.join(ROOT_DIR, 'dist-pilot', 'tools', 'financas', 'desconto.html');
  const html = fs.readFileSync(filePath, 'utf-8');
  assert.match(html, /<link rel="canonical" href="https:\/\/www\.calculadoramaster\.com\/tools\/financas\/desconto\.html">/);
});

test('SSG Piloto - HTML gerado contém H1 e estrutura da ferramenta', () => {
  const filePath = path.join(ROOT_DIR, 'dist-pilot', 'tools', 'financas', 'desconto.html');
  const html = fs.readFileSync(filePath, 'utf-8');
  assert.match(html, /<h1>Calculadora de Desconto<\/h1>/);
  assert.match(html, /id="preco"/);
  assert.match(html, /id="desconto"/);
  assert.match(html, /id="resultado"/);
});

test('SSG Piloto - HTML gerado contém módulo ESM de desconto', () => {
  const filePath = path.join(ROOT_DIR, 'dist-pilot', 'tools', 'financas', 'desconto.html');
  const html = fs.readFileSync(filePath, 'utf-8');
  assert.match(html, /<script type="module" src="\.\.\/\.\.\/js\/tools\/desconto\.js"><\/script>/);
});

test('SSG Piloto - HTML gerado preserva botões semânticos com data-action', () => {
  const filePath = path.join(ROOT_DIR, 'dist-pilot', 'tools', 'financas', 'desconto.html');
  const html = fs.readFileSync(filePath, 'utf-8');
  assert.match(html, /data-action="calculate"/);
  assert.match(html, /data-action="clear"/);
});

test('SSG Piloto - HTML gerado contém componente de Header com links corretos', () => {
  const filePath = path.join(ROOT_DIR, 'dist-pilot', 'tools', 'financas', 'desconto.html');
  const html = fs.readFileSync(filePath, 'utf-8');
  assert.match(html, /<header class="header">/);
  assert.match(html, /<a href="\.\.\/\.\.\/index\.html">/);
  assert.match(html, /<img src="\.\.\/\.\.\/logo\/logo\.png"/);
  assert.match(html, /<a href="\.\.\/\.\.\/blog\/index\.html">Blog<\/a>/);
});

test('SSG Piloto - HTML gerado contém componente de Footer e scripts de encerramento', () => {
  const filePath = path.join(ROOT_DIR, 'dist-pilot', 'tools', 'financas', 'desconto.html');
  const html = fs.readFileSync(filePath, 'utf-8');
  assert.match(html, /<footer class="footer">/);
  assert.match(html, /<a href="\.\.\/\.\.\/politica\.html">Política de Privacidade<\/a>/);
  assert.match(html, /<a href="\.\.\/\.\.\/termos\.html">Termos de Uso<\/a>/);
  assert.match(html, /<script type="module" src="\.\.\/\.\.\/js\/header-auth\.js"><\/script>/);
  assert.match(html, /<script src="\.\.\/\.\.\/js\/cookie-consent\.js"><\/script>/);
});

test('SSG Piloto - Ausência absoluta de placeholders {{...}} não resolvidos no HTML', () => {
  const filePath = path.join(ROOT_DIR, 'dist-pilot', 'tools', 'financas', 'desconto.html');
  const html = fs.readFileSync(filePath, 'utf-8');
  const leftover = html.match(/\{\{([A-Z0-9_]+)\}\}/);
  assert.equal(leftover, null, `Nenhum placeholder não resolvido deve restar no HTML final: ${leftover?.[0]}`);
});

test('SSG Piloto - Caminhos relativos de CSS, JS e imagens estão consistentes', () => {
  const filePath = path.join(ROOT_DIR, 'dist-pilot', 'tools', 'financas', 'desconto.html');
  const html = fs.readFileSync(filePath, 'utf-8');
  assert.match(html, /href="\.\.\/\.\.\/css\/style\.css"/);
  assert.match(html, /href="\.\.\/\.\.\/css\/cookie-consent\.css"/);
  assert.doesNotMatch(html, /href="undefined"/);
  assert.doesNotMatch(html, /src="undefined"/);
  assert.doesNotMatch(html, /file:\/\/\//);
});

/* ==================================================
 * NOVOS TESTES - SSG MULTIPÁGINA (LOTE 1 FINANCEIRO)
 * ================================================== */

test('SSG Multipage - buildPages compila com sucesso as 4 ferramentas financeiras do Lote 1', () => {
  const results = buildPages();
  assert.equal(results.length, 4, 'Devem ser geradas exatamente 4 páginas no Lote 1');

  const expectedPaths = [
    'tools/financas/desconto.html',
    'tools/financas/juros.html',
    'tools/financas/lucro.html',
    'tools/financas/porcentagem.html'
  ];

  expectedPaths.forEach(expectedRel => {
    const fullPath = path.join(ROOT_DIR, 'dist-pilot', expectedRel);
    assert.ok(fs.existsSync(fullPath), `Arquivo ${expectedRel} deve existir em dist-pilot`);
    const content = fs.readFileSync(fullPath, 'utf-8');
    assert.ok(content.length > 500, `Arquivo ${expectedRel} deve ter conteúdo substancial`);
  });
});

test('SSG Multipage - Juros: title, canonical, H1, módulo ESM e elementos do formulário', () => {
  const filePath = path.join(ROOT_DIR, 'dist-pilot', 'tools', 'financas', 'juros.html');
  const html = fs.readFileSync(filePath, 'utf-8');

  assert.match(html, /<title>Calculadora de Juros Simples e Compostos Online \| Calculadora Master<\/title>/);
  assert.match(html, /<link rel="canonical" href="https:\/\/www\.calculadoramaster\.com\/tools\/financas\/juros\.html">/);
  assert.match(html, /<h1>Calculadora de Juros<\/h1>/);
  assert.match(html, /<script type="module" src="\.\.\/\.\.\/js\/tools\/juros\.js"><\/script>/);

  // Elementos do formulário e botões semânticos
  assert.match(html, /id="capitalSimples"/);
  assert.match(html, /id="taxaSimples"/);
  assert.match(html, /id="tempoSimples"/);
  assert.match(html, /data-action="calculate-simple"/);
  assert.match(html, /id="resultadoSimples"/);

  assert.match(html, /id="capitalComposto"/);
  assert.match(html, /id="taxaComposta"/);
  assert.match(html, /id="tempoComposto"/);
  assert.match(html, /data-action="calculate-compound"/);
  assert.match(html, /id="resultadoComposto"/);
});

test('SSG Multipage - Lucro: title, canonical, H1, módulo ESM e elementos do formulário', () => {
  const filePath = path.join(ROOT_DIR, 'dist-pilot', 'tools', 'financas', 'lucro.html');
  const html = fs.readFileSync(filePath, 'utf-8');

  assert.match(html, /<title>Calculadora de Lucro e Margem Online \| Calcule seu Ganho<\/title>/);
  assert.match(html, /<link rel="canonical" href="https:\/\/www\.calculadoramaster\.com\/tools\/financas\/lucro\.html">/);
  assert.match(html, /<h1>Calculadora de Lucro e Margem<\/h1>/);
  assert.match(html, /<script type="module" src="\.\.\/\.\.\/js\/tools\/lucro\.js"><\/script>/);

  // Elementos do formulário e botões semânticos
  assert.match(html, /id="custo"/);
  assert.match(html, /id="preco"/);
  assert.match(html, /data-action="calculate"/);
  assert.match(html, /data-action="clear"/);
  assert.match(html, /id="resultado"/);
});

test('SSG Multipage - Porcentagem: title, canonical, H1, módulo ESM e elementos do formulário', () => {
  const filePath = path.join(ROOT_DIR, 'dist-pilot', 'tools', 'financas', 'porcentagem.html');
  const html = fs.readFileSync(filePath, 'utf-8');

  assert.match(html, /<title>Calculadora de Porcentagem Online Grátis \| Calculadora Master<\/title>/);
  assert.match(html, /<link rel="canonical" href="https:\/\/www\.calculadoramaster\.com\/tools\/financas\/porcentagem\.html">/);
  assert.match(html, /<h1>Calculadora de Porcentagem<\/h1>/);
  assert.match(html, /<script type="module" src="\.\.\/\.\.\/js\/tools\/porcentagem\.js"><\/script>/);

  // Elementos do formulário e botões semânticos
  assert.match(html, /id="percentual"/);
  assert.match(html, /id="valor"/);
  assert.match(html, /data-action="calculate"/);
  assert.match(html, /data-action="clear"/);
  assert.match(html, /id="resultado"/);
  assert.match(html, /id="detalhes"/);
});

test('SSG Multipage - Ausência de placeholders {{...}} em todas as páginas geradas', () => {
  const pages = [
    'tools/financas/desconto.html',
    'tools/financas/juros.html',
    'tools/financas/lucro.html',
    'tools/financas/porcentagem.html'
  ];

  for (const pageRel of pages) {
    const filePath = path.join(ROOT_DIR, 'dist-pilot', pageRel);
    const html = fs.readFileSync(filePath, 'utf-8');
    const leftover = html.match(/\{\{([A-Z0-9_]+)\}\}/);
    assert.equal(leftover, null, `Nenhum placeholder não resolvido deve restar em ${pageRel}: ${leftover?.[0]}`);
    assert.doesNotMatch(html, /href="undefined"/, `${pageRel} não deve conter href="undefined"`);
    assert.doesNotMatch(html, /src="undefined"/, `${pageRel} não deve conter src="undefined"`);
  }
});

test('SSG Multipage - Todos os 11 assets obrigatórios são copiados para dist-pilot', () => {
  for (const item of DEFAULT_ASSETS) {
    const destPath = path.join(ROOT_DIR, 'dist-pilot', item.dest);
    assert.ok(fs.existsSync(destPath), `Asset copiado deve existir em dist-pilot: ${item.dest}`);
  }
});

test('SSG Multipage - copyPilotAssets lança erro explícito se um asset obrigatório não existir', () => {
  const mockAssets = [
    { src: 'arquivo-que-nao-existe-jamais.xyz', dest: 'arquivo.xyz' }
  ];

  assert.throws(() => {
    copyPilotAssets(path.join(ROOT_DIR, 'dist-pilot'), mockAssets);
  }, /Asset obrigatório não encontrado no disco/);
});
