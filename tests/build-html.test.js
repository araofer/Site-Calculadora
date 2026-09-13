import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Importa funções do motor SSG CommonJS
import ssg from '../scripts/build-html.js';
const { calculateRootPrefix, parsePageSource, renderPage, buildPilot } = ssg;

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
