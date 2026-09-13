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
  FINANCEIRO_LOTE1_PAGES,
  FINANCEIRO_LOTE2_PAGES,
  FINANCEIRO_PAGES,
  SAUDE_PAGES,
  TRABALHISTA_PAGES,
  UTILIDADES_PAGES,
  TOOL_PAGES,
  HOME_PAGE,
  CATEGORIA_PAGES,
  BLOG_INDEX_PAGE,
  BLOG_ARTIGOS_PAGES,
  BLOG_PAGES,
  INSTITUCIONAL_PAGES,
  SITE_PAGES,
  DEFAULT_PAGES,
  COMMON_ASSETS,
  FINANCEIRO_ASSETS,
  SAUDE_ASSETS,
  TRABALHISTA_ASSETS,
  UTILIDADES_ASSETS,
  TOOL_ASSETS,
  SITE_SPECIFIC_ASSETS,
  BLOG_ASSETS,
  SITE_ASSETS,
  DEFAULT_ASSETS,
  copyPilotAssets,
  PROD_OUTPUT_DIR
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
 * TESTES - SSG MULTIPÁGINA (7 FERRAMENTAS FINANCEIRAS)
 * ================================================== */

test('SSG Multipage - buildPages compila com sucesso as 15 ferramentas do catálogo oficial', () => {
  const results = buildPages();
  assert.equal(results.length, 15, 'Devem ser geradas exatamente 15 páginas de ferramentas no total');

  const expectedPaths = [
    'tools/financas/desconto.html',
    'tools/financas/juros.html',
    'tools/financas/lucro.html',
    'tools/financas/porcentagem.html',
    'tools/financas/financiamento-carro.html',
    'tools/financas/financiamento-imovel.html',
    'tools/financas/dividir-conta.html',
    'tools/saude/imc.html',
    'tools/saude/idade.html',
    'tools/trabalhista/horas-extras.html',
    'tools/utilidades/combustivel.html',
    'tools/utilidades/contador.html',
    'tools/utilidades/senha.html',
    'tools/utilidades/whatsapp.html',
    'tools/utilidades/qr-code.html'
  ];

  expectedPaths.forEach(expectedRel => {
    const fullPath = path.join(ROOT_DIR, 'dist-pilot', expectedRel);
    assert.ok(fs.existsSync(fullPath), `Arquivo ${expectedRel} deve existir em dist-pilot`);
    const content = fs.readFileSync(fullPath, 'utf-8');
    assert.ok(content.length > 500, `Arquivo ${expectedRel} deve ter conteúdo substancial`);
  });
});

test('SSG Multipage - buildPages com escopo específico compila subconjuntos de páginas corretamente', () => {
  const finResults = buildPages(FINANCEIRO_PAGES);
  assert.equal(finResults.length, 7, 'FINANCEIRO_PAGES deve gerar 7 páginas');

  const saudeResults = buildPages(SAUDE_PAGES);
  assert.equal(saudeResults.length, 2, 'SAUDE_PAGES deve gerar 2 páginas');

  const trabResults = buildPages(TRABALHISTA_PAGES);
  assert.equal(trabResults.length, 1, 'TRABALHISTA_PAGES deve gerar 1 página');

  const utilResults = buildPages(UTILIDADES_PAGES);
  assert.equal(utilResults.length, 5, 'UTILIDADES_PAGES deve gerar 5 páginas');

  // Restaura compilação completa para testes subsequentes
  buildPages();
});

test('SSG Multipage - Juros: title, canonical, H1, módulo ESM e elementos do formulário', () => {
  const filePath = path.join(ROOT_DIR, 'dist-pilot', 'tools', 'financas', 'juros.html');
  const html = fs.readFileSync(filePath, 'utf-8');

  assert.match(html, /<title>Calculadora de Juros Simples e Compostos Online \| Calculadora Master<\/title>/);
  assert.match(html, /<link rel="canonical" href="https:\/\/www\.calculadoramaster\.com\/tools\/financas\/juros\.html">/);
  assert.match(html, /<h1>Calculadora de Juros<\/h1>/);
  assert.match(html, /<script type="module" src="\.\.\/\.\.\/js\/tools\/juros\.js"><\/script>/);

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

  assert.match(html, /id="percentual"/);
  assert.match(html, /id="valor"/);
  assert.match(html, /data-action="calculate"/);
  assert.match(html, /data-action="clear"/);
  assert.match(html, /id="resultado"/);
  assert.match(html, /id="detalhes"/);
});

test('SSG Multipage - Financiamento de Carro: title, canonical, H1, módulo ESM e formulário', () => {
  const filePath = path.join(ROOT_DIR, 'dist-pilot', 'tools', 'financas', 'financiamento-carro.html');
  const html = fs.readFileSync(filePath, 'utf-8');

  assert.match(html, /<title>Simulador de Financiamento de Carro Online \| Calculadora Master<\/title>/);
  assert.match(html, /<link rel="canonical" href="https:\/\/www\.calculadoramaster\.com\/tools\/financas\/financiamento-carro\.html">/);
  assert.match(html, /<h1>Simulador de Financiamento de Carro<\/h1>/);
  assert.match(html, /<script type="module" src="\.\.\/\.\.\/js\/tools\/financiamento-carro\.js"><\/script>/);

  assert.match(html, /id="valorVeiculo"/);
  assert.match(html, /id="valorEntrada"/);
  assert.match(html, /id="taxaMensal"/);
  assert.match(html, /id="prazoMeses"/);
  assert.match(html, /data-action="calculate"/);
  assert.match(html, /data-action="clear"/);
  assert.match(html, /id="resultadoFinanciamento"/);
});

test('SSG Multipage - Financiamento Imobiliário: title, canonical, H1, módulo ESM e formulário', () => {
  const filePath = path.join(ROOT_DIR, 'dist-pilot', 'tools', 'financas', 'financiamento-imovel.html');
  const html = fs.readFileSync(filePath, 'utf-8');

  assert.match(html, /<title>Simulador de Financiamento Imobiliário Online \| Calculadora Master<\/title>/);
  assert.match(html, /<link rel="canonical" href="https:\/\/www\.calculadoramaster\.com\/tools\/financas\/financiamento-imovel\.html">/);
  assert.match(html, /<h1>Simulador de Financiamento Imobiliário \(SAC\)<\/h1>/);
  assert.match(html, /<script type="module" src="\.\.\/\.\.\/js\/tools\/financiamento-imovel\.js"><\/script>/);

  assert.match(html, /id="valorImovel"/);
  assert.match(html, /id="valorEntrada"/);
  assert.match(html, /id="taxaAnual"/);
  assert.match(html, /id="prazoAnos"/);
  assert.match(html, /data-action="calculate"/);
  assert.match(html, /data-action="clear"/);
  assert.match(html, /id="resultadoImovel"/);
});

test('SSG Multipage - Dividir Conta: title, canonical, H1, módulo ESM, formulário e container dinâmico', () => {
  const filePath = path.join(ROOT_DIR, 'dist-pilot', 'tools', 'financas', 'dividir-conta.html');
  const html = fs.readFileSync(filePath, 'utf-8');

  assert.match(html, /<title>Dividir Conta Online \| Calculadora por Pessoa<\/title>/);
  assert.match(html, /<link rel="canonical" href="https:\/\/www\.calculadoramaster\.com\/tools\/financas\/dividir-conta\.html">/);
  assert.match(html, /<h1>Dividir Conta<\/h1>/);
  assert.match(html, /<script type="module" src="\.\.\/\.\.\/js\/tools\/dividir-conta\.js"><\/script>/);

  assert.match(html, /id="total"/);
  assert.match(html, /id="pessoas"/);
  assert.match(html, /data-action="generate-fields"/);
  assert.match(html, /id="camposPessoas"/);
  assert.match(html, /data-action="calculate"/);
  assert.match(html, /data-action="clear"/);
  assert.match(html, /id="resultado"/);
});

test('SSG Multipage - IMC: title, canonical, H1, módulo ESM e elementos do formulário', () => {
  const filePath = path.join(ROOT_DIR, 'dist-pilot', 'tools', 'saude', 'imc.html');
  const html = fs.readFileSync(filePath, 'utf-8');

  assert.match(html, /<title>Calculadora de IMC Online \| Índice de Massa Corporal e Peso Ideal<\/title>/);
  assert.match(html, /<link rel="canonical" href="https:\/\/www\.calculadoramaster\.com\/tools\/saude\/imc\.html">/);
  assert.match(html, /<h1>Calculadora de IMC<\/h1>/);
  assert.match(html, /<script type="module" src="\.\.\/\.\.\/js\/tools\/imc\.js"><\/script>/);

  assert.match(html, /id="peso"/);
  assert.match(html, /id="altura"/);
  assert.match(html, /data-action="calculate"/);
  assert.match(html, /data-action="clear"/);
  assert.match(html, /id="resultado"/);
});

test('SSG Multipage - Idade: title, canonical, H1, módulo ESM e elementos do formulário', () => {
  const filePath = path.join(ROOT_DIR, 'dist-pilot', 'tools', 'saude', 'idade.html');
  const html = fs.readFileSync(filePath, 'utf-8');

  assert.match(html, /<title>Calculadora de Idade Online \| Anos, Meses e Dias<\/title>/);
  assert.match(html, /<link rel="canonical" href="https:\/\/www\.calculadoramaster\.com\/tools\/saude\/idade\.html">/);
  assert.match(html, /<h1>Calculadora de Idade<\/h1>/);
  assert.match(html, /<script type="module" src="\.\.\/\.\.\/js\/tools\/idade\.js"><\/script>/);

  assert.match(html, /id="dataNascimento"/);
  assert.match(html, /data-action="calculate"/);
  assert.match(html, /data-action="clear"/);
  assert.match(html, /id="resultado"/);
});

test('SSG Multipage - Horas Extras: title, canonical, H1, módulo ESM e elementos do formulário', () => {
  const filePath = path.join(ROOT_DIR, 'dist-pilot', 'tools', 'trabalhista', 'horas-extras.html');
  const html = fs.readFileSync(filePath, 'utf-8');

  assert.match(html, /<title>Calculadora de Horas Extras Online Grátis \| Calculadora Master<\/title>/);
  assert.match(html, /<link rel="canonical" href="https:\/\/www\.calculadoramaster\.com\/tools\/trabalhista\/horas-extras\.html">/);
  assert.match(html, /<h1>Calculadora de Horas Extras<\/h1>/);
  assert.match(html, /<script type="module" src="\.\.\/\.\.\/js\/tools\/horas-extras\.js"><\/script>/);

  assert.match(html, /id="salario"/);
  assert.match(html, /id="jornada"/);
  assert.match(html, /id="horas-extras"/);
  assert.match(html, /id="adicional"/);
  assert.match(html, /data-action="calculate"/);
  assert.match(html, /data-action="clear"/);
  assert.match(html, /id="resultado"/);
});

test('SSG Multipage - Combustível: title, canonical, H1, módulo ESM e elementos do formulário', () => {
  const filePath = path.join(ROOT_DIR, 'dist-pilot', 'tools', 'utilidades', 'combustivel.html');
  const html = fs.readFileSync(filePath, 'utf-8');

  assert.match(html, /<title>Calculadora de Consumo de Combustível \| Km por Litro e Custo<\/title>/);
  assert.match(html, /<link rel="canonical" href="https:\/\/www\.calculadoramaster\.com\/tools\/utilidades\/combustivel\.html">/);
  assert.match(html, /<h1>Calculadora de Consumo de Combustível<\/h1>/);
  assert.match(html, /<script type="module" src="\.\.\/\.\.\/js\/tools\/combustivel\.js"><\/script>/);

  assert.match(html, /id="distancia"/);
  assert.match(html, /id="consumo"/);
  assert.match(html, /id="preco"/);
  assert.match(html, /data-action="calculate"/);
  assert.match(html, /data-action="clear"/);
  assert.match(html, /id="resultado"/);
});

test('SSG Multipage - Contador: title, canonical, H1, módulo ESM e elementos do formulário', () => {
  const filePath = path.join(ROOT_DIR, 'dist-pilot', 'tools', 'utilidades', 'contador.html');
  const html = fs.readFileSync(filePath, 'utf-8');

  assert.match(html, /<title>Contador de Caracteres Online \| Texto e Palavras<\/title>/);
  assert.match(html, /<link rel="canonical" href="https:\/\/www\.calculadoramaster\.com\/tools\/utilidades\/contador\.html">/);
  assert.match(html, /<h1>Contador de Caracteres<\/h1>/);
  assert.match(html, /<script type="module" src="\.\.\/\.\.\/js\/tools\/contador\.js"><\/script>/);

  assert.match(html, /id="texto"/);
  assert.match(html, /data-action="clear"/);
  assert.match(html, /id="resultado"/);
});

test('SSG Multipage - Senha: title, canonical, H1, módulo ESM e elementos do formulário', () => {
  const filePath = path.join(ROOT_DIR, 'dist-pilot', 'tools', 'utilidades', 'senha.html');
  const html = fs.readFileSync(filePath, 'utf-8');

  assert.match(html, /<title>Gerador de Senha Segura Online \| Criar Senhas Fortes e Aleatórias<\/title>/);
  assert.match(html, /<link rel="canonical" href="https:\/\/www\.calculadoramaster\.com\/tools\/utilidades\/senha\.html">/);
  assert.match(html, /<h1>Gerador de Senha Segura<\/h1>/);
  assert.match(html, /<script type="module" src="\.\.\/\.\.\/js\/tools\/senha\.js"><\/script>/);

  assert.match(html, /id="tamanho"/);
  assert.match(html, /id="maiusculas"/);
  assert.match(html, /id="minusculas"/);
  assert.match(html, /id="numeros"/);
  assert.match(html, /id="especiais"/);
  assert.match(html, /data-action="generate"/);
  assert.match(html, /data-action="clear"/);
  assert.match(html, /id="senha-gerada"/);
  assert.match(html, /data-action="copy"/);
});

test('SSG Multipage - WhatsApp: title, canonical, H1, módulo ESM e elementos do formulário', () => {
  const filePath = path.join(ROOT_DIR, 'dist-pilot', 'tools', 'utilidades', 'whatsapp.html');
  const html = fs.readFileSync(filePath, 'utf-8');

  assert.match(html, /<title>Gerador de Link para WhatsApp Online \| Criar Link wa\.me Grátis<\/title>/);
  assert.match(html, /<link rel="canonical" href="https:\/\/www\.calculadoramaster\.com\/tools\/utilidades\/whatsapp\.html">/);
  assert.match(html, /<h1>Gerador de Link para WhatsApp<\/h1>/);
  assert.match(html, /<script type="module" src="\.\.\/\.\.\/js\/tools\/whatsapp\.js"><\/script>/);

  assert.match(html, /id="numero"/);
  assert.match(html, /id="mensagem"/);
  assert.match(html, /data-action="generate"/);
  assert.match(html, /data-action="clear"/);
  assert.match(html, /id="link-box"/);
  assert.match(html, /data-action="copy"/);
});

test('SSG Multipage - QR Code: title, canonical, H1, módulo ESM, CDN qrcodejs e elementos do formulário', () => {
  const filePath = path.join(ROOT_DIR, 'dist-pilot', 'tools', 'utilidades', 'qr-code.html');
  const html = fs.readFileSync(filePath, 'utf-8');

  assert.match(html, /<title>Gerador de QR Code Online Grátis \| Criar QR Code para Links<\/title>/);
  assert.match(html, /<link rel="canonical" href="https:\/\/www\.calculadoramaster\.com\/tools\/utilidades\/qr-code\.html">/);
  assert.match(html, /<h1>Gerador de QR Code<\/h1>/);
  assert.match(html, /<script src="https:\/\/cdnjs\.cloudflare\.com\/ajax\/libs\/qrcodejs\/1\.0\.0\/qrcode\.min\.js"><\/script>/);
  assert.match(html, /<script type="module" src="\.\.\/\.\.\/js\/tools\/qr-code\.js"><\/script>/);

  assert.match(html, /id="textoQR"/);
  assert.match(html, /data-action="generate"/);
  assert.match(html, /data-action="clear"/);
  assert.match(html, /id="qrcode"/);
  assert.match(html, /id="btnDownload"/);
  assert.match(html, /data-action="download"/);
});

test('SSG Multipage - Ausência de placeholders {{...}} em todas as 15 páginas geradas', () => {
  const pages = [
    'tools/financas/desconto.html',
    'tools/financas/juros.html',
    'tools/financas/lucro.html',
    'tools/financas/porcentagem.html',
    'tools/financas/financiamento-carro.html',
    'tools/financas/financiamento-imovel.html',
    'tools/financas/dividir-conta.html',
    'tools/saude/imc.html',
    'tools/saude/idade.html',
    'tools/trabalhista/horas-extras.html',
    'tools/utilidades/combustivel.html',
    'tools/utilidades/contador.html',
    'tools/utilidades/senha.html',
    'tools/utilidades/whatsapp.html',
    'tools/utilidades/qr-code.html'
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

test('SSG Multipage - Todos os 25 assets obrigatórios são copiados para dist-pilot', () => {
  assert.equal(DEFAULT_ASSETS.length, 25, 'Devem existir exatamente 25 assets declarados no lote de ferramentas');
  assert.equal(FINANCEIRO_ASSETS.length, 17, 'FINANCEIRO_ASSETS deve conter 17 assets');
  assert.equal(SAUDE_ASSETS.length, 2, 'SAUDE_ASSETS deve conter 2 assets');
  assert.equal(TRABALHISTA_ASSETS.length, 1, 'TRABALHISTA_ASSETS deve conter 1 asset');
  assert.equal(UTILIDADES_ASSETS.length, 5, 'UTILIDADES_ASSETS deve conter 5 assets');
  assert.equal(TOOL_ASSETS.length, 25, 'TOOL_ASSETS deve conter 25 assets');

  for (const item of DEFAULT_ASSETS) {
    const destPath = path.join(ROOT_DIR, 'dist-pilot', item.dest);
    assert.ok(fs.existsSync(destPath), `Asset copiado deve existir em dist-pilot: ${item.dest}`);
  }
});

test('SSG Multipage - Dependência compartilhada js/core/currency.js está presente e válida em dist-pilot', () => {
  const currencyDest = path.join(ROOT_DIR, 'dist-pilot', 'js', 'core', 'currency.js');
  assert.ok(fs.existsSync(currencyDest), 'js/core/currency.js deve existir em dist-pilot');
  const content = fs.readFileSync(currencyDest, 'utf-8');
  assert.ok(content.includes('export function parseBRLCurrency'), 'currency.js deve conter exports essenciais');
});

test('SSG Multipage - Dependências transitivas de autenticação (auth.js e firebase-config.js) existem em dist-pilot', () => {
  const authDest = path.join(ROOT_DIR, 'dist-pilot', 'js', 'auth.js');
  assert.ok(fs.existsSync(authDest), 'js/auth.js deve existir em dist-pilot');
  const authContent = fs.readFileSync(authDest, 'utf-8');
  assert.ok(authContent.includes('./firebase-config.js'), 'auth.js deve referenciar ./firebase-config.js');
  assert.ok(authContent.includes('export async function logoutUsuario'), 'auth.js deve exportar logoutUsuario');
  assert.ok(authContent.includes('export function observarLogin'), 'auth.js deve exportar observarLogin');

  const fbDest = path.join(ROOT_DIR, 'dist-pilot', 'js', 'firebase-config.js');
  assert.ok(fs.existsSync(fbDest), 'js/firebase-config.js deve existir em dist-pilot');
  const fbContent = fs.readFileSync(fbDest, 'utf-8');
  assert.ok(fbContent.includes('initializeApp'), 'firebase-config.js deve inicializar Firebase');
  assert.ok(fbContent.includes('export const auth'), 'firebase-config.js deve exportar auth');
  assert.ok(fbContent.includes('export const db'), 'firebase-config.js deve exportar db');
});

test('SSG Multipage - Todos os imports ESM locais de scripts copiados resolvem para arquivos existentes em dist-pilot', () => {
  function collectJsFiles(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    const results = [];
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        results.push(...collectJsFiles(fullPath));
      } else if (entry.isFile() && entry.name.endsWith('.js')) {
        results.push(fullPath);
      }
    }
    return results;
  }

  const jsDir = path.join(ROOT_DIR, 'dist-pilot', 'js');
  const jsFiles = collectJsFiles(jsDir);
  assert.ok(jsFiles.length > 0, 'Devem existir arquivos JS compilados em dist-pilot/js');

  const localImportRegex = /(?:(?:import|export)\s+(?:[\w*\s{},]*\s+from\s+)?|import\s*\()\s*['"](\.[^'"]+)['"]/g;
  let totalLocalImportsVerified = 0;

  for (const filePath of jsFiles) {
    const content = fs.readFileSync(filePath, 'utf-8');
    let match;
    while ((match = localImportRegex.exec(content)) !== null) {
      const importSpecifier = match[1];
      const targetPath = path.resolve(path.dirname(filePath), importSpecifier);
      const relSource = path.relative(ROOT_DIR, filePath);
      const relTarget = path.relative(ROOT_DIR, targetPath);

      assert.ok(
        fs.existsSync(targetPath),
        `Dependência ESM transitiva não encontrada: "${importSpecifier}" importada em "${relSource}" não existe em "${relTarget}"`
      );
      totalLocalImportsVerified++;
    }
  }

  assert.ok(
    totalLocalImportsVerified >= 4,
    `Esperado verificar ao menos 4 dependências locais no lote financeiro, verificadas: ${totalLocalImportsVerified}`
  );
});

test('SSG Multipage - copyPilotAssets lança erro explícito se um asset obrigatório não existir', () => {
  const mockAssets = [
    { src: 'arquivo-que-nao-existe-jamais.xyz', dest: 'arquivo.xyz' }
  ];

  assert.throws(() => {
    copyPilotAssets(path.join(ROOT_DIR, 'dist-pilot'), mockAssets);
  }, /Asset obrigatório não encontrado no disco/);
});

test('SSG Multipage - Contrato estrutural e ordem dos elementos em .nav-container do Header', () => {
  const pages = SITE_PAGES.map(p => p.relativeOutputPath);

  for (const pageRel of pages) {
    const filePath = path.join(ROOT_DIR, 'dist-pilot', pageRel);
    const html = fs.readFileSync(filePath, 'utf-8');

    // 1. Presença obrigatória dos 4 elementos da barra de navegação
    assert.match(html, /<div class="logo">[\s\S]*?<\/div>/, `${pageRel} deve conter .logo`);
    assert.match(html, /<nav class="nav" id="nav-menu">[\s\S]*?<\/nav>/, `${pageRel} deve conter .nav#nav-menu`);
    assert.match(html, /<div class="menu-toggle" id="mobile-menu">[\s\S]*?<\/div>/, `${pageRel} deve conter .menu-toggle#mobile-menu`);
    assert.match(html, /<div class="nav-actions">[\s\S]*?<\/div>/, `${pageRel} deve conter .nav-actions`);

    // 2. Extração de índices para validação da ordem sequencial no DOM
    const navContainerMatch = html.match(/<div class="container nav-container">([\s\S]*?)<\/header>/);
    assert.ok(navContainerMatch, `${pageRel} deve conter .container.nav-container dentro de <header>`);

    const headerContent = navContainerMatch[1];
    const logoIndex = headerContent.indexOf('class="logo"');
    const navIndex = headerContent.indexOf('class="nav"');
    const toggleIndex = headerContent.indexOf('class="menu-toggle"');
    const actionsIndex = headerContent.indexOf('class="nav-actions"');

    assert.ok(logoIndex !== -1, `${pageRel} deve conter class="logo"`);
    assert.ok(navIndex !== -1, `${pageRel} deve conter class="nav"`);
    assert.ok(toggleIndex !== -1, `${pageRel} deve conter class="menu-toggle"`);
    assert.ok(actionsIndex !== -1, `${pageRel} deve conter class="nav-actions"`);

    // Ordem contratual garantida: logo -> nav -> menu-toggle -> nav-actions
    assert.ok(
      logoIndex < navIndex && navIndex < toggleIndex && toggleIndex < actionsIndex,
      `${pageRel} deve respeitar a ordem contratual do header: logo (${logoIndex}) < nav (${navIndex}) < menu-toggle (${toggleIndex}) < nav-actions (${actionsIndex})`
    );
  }
});

test('SSG Site - buildPages(SITE_PAGES) compila 43 páginas e copia 58 assets', () => {
  const results = buildPages(SITE_PAGES, { assets: SITE_ASSETS });
  assert.equal(results.length, 43, 'SITE_PAGES deve gerar exatamente 43 páginas (15 ferramentas + Home + 5 categorias + 15 blog + 7 institucionais)');
  assert.equal(SITE_ASSETS.length, 58, 'SITE_ASSETS deve conter exatamente 58 assets');

  for (const page of SITE_PAGES) {
    const fullPath = path.join(ROOT_DIR, 'dist-pilot', page.relativeOutputPath);
    assert.ok(fs.existsSync(fullPath), `Página ${page.relativeOutputPath} deve existir no output`);
    const content = fs.readFileSync(fullPath, 'utf-8');
    assert.ok(content.length > 500, `Página ${page.relativeOutputPath} deve ter tamanho substancial`);
    assert.equal(content.match(/\{\{([A-Z0-9_]+)\}\}/), null, `Página ${page.relativeOutputPath} não deve ter placeholders`);
    assert.ok(!content.includes('href="undefined"'), `Página ${page.relativeOutputPath} não deve ter href undefined`);
    assert.ok(!content.includes('src="undefined"'), `Página ${page.relativeOutputPath} não deve ter src undefined`);
  }

  for (const asset of SITE_ASSETS) {
    const assetPath = path.join(ROOT_DIR, 'dist-pilot', asset.dest);
    assert.ok(fs.existsSync(assetPath), `Asset ${asset.dest} deve existir em dist-pilot`);
  }
});

test('SSG Site - Home (index.html): metadados, H1, busca, catálogo, destaques e scripts', () => {
  const filePath = path.join(ROOT_DIR, 'dist-pilot', 'index.html');
  const html = fs.readFileSync(filePath, 'utf-8');

  // Metadados SEO
  assert.match(html, /<title>Calculadora Master - Ferramentas Online Grátis<\/title>/);
  assert.match(html, /<meta name="description" content="Calculadoras online grátis de IMC, combustível, lucro, juros e muito mais\. Rápido, fácil e preciso\.">/);
  assert.match(html, /<link rel="canonical" href="https:\/\/www\.calculadoramaster\.com\/">/);

  // H1 e estrutura principal
  assert.match(html, /<h1>Calculadoras Online Grátis<\/h1>/);
  assert.match(html, /id="busca"/);
  assert.match(html, /id="search-input"/);
  assert.match(html, /id="search-results"/);
  assert.match(html, /id="search-count"/);
  assert.match(html, /id="search-clear-btn"/);

  // Seções principais
  assert.match(html, /id="destaques"/);
  assert.match(html, /id="categorias"/);
  assert.match(html, /id="ferramentas"/);
  assert.match(html, /class="blog-section"/);
  assert.match(html, /class="newsletter"/);

  // Scripts da Home
  assert.match(html, /<script src="\.\/js\/tools-catalog\.js"><\/script>/);
  assert.match(html, /<script src="\.\/js\/home-search\.js"><\/script>/);
  assert.match(html, /<script type="module" src="\.\/js\/header-auth\.js"><\/script>/);
  assert.match(html, /<script src="\.\/js\/cookie-consent\.js"><\/script>/);

  // Links de navegação do site
  assert.match(html, /href="\.\/financeira\.html"/);
  assert.match(html, /href="\.\/matematica\.html"/);
  assert.match(html, /href="\.\/saude\.html"/);
  assert.match(html, /href="\.\/conversores\.html"/);
  assert.match(html, /href="\.\/trabalhista\.html"/);
  assert.match(html, /href="\.\/blog\/index\.html"/);
});

test('SSG Site - Páginas de categorias: testes parametrizados de integridade, metadados e cards', () => {
  const categorySpecs = [
    {
      file: 'financeira.html',
      title: 'Calculadoras Financeiras Online Grátis | Calculadora Master',
      canonical: 'https://www.calculadoramaster.com/financeira.html',
      h1: 'Calculadoras Financeiras',
      expectedCards: [
        'tools/financas/desconto.html',
        'tools/financas/lucro.html',
        'tools/financas/juros.html',
        'tools/financas/financiamento-carro.html',
        'tools/financas/financiamento-imovel.html'
      ]
    },
    {
      file: 'matematica.html',
      title: 'Calculadoras e Ferramentas de Matemática Online | Calculadora Master',
      canonical: 'https://www.calculadoramaster.com/matematica.html',
      h1: 'Calculadoras de Matemática e Utilidades',
      expectedCards: [
        'tools/utilidades/contador.html',
        'tools/financas/porcentagem.html',
        'tools/utilidades/qr-code.html',
        'tools/utilidades/senha.html'
      ]
    },
    {
      file: 'saude.html',
      title: 'Calculadoras de Saúde Online Grátis | Calculadora Master',
      canonical: 'https://www.calculadoramaster.com/saude.html',
      h1: 'Calculadoras de Saúde',
      expectedCards: [
        'tools/saude/imc.html'
      ]
    },
    {
      file: 'conversores.html',
      title: 'Conversores e Utilidades Online Grátis | Calculadora Master',
      canonical: 'https://www.calculadoramaster.com/conversores.html',
      h1: 'Conversores e Utilidades',
      expectedCards: [
        'tools/utilidades/combustivel.html',
        'tools/financas/dividir-conta.html',
        'tools/saude/idade.html',
        'tools/utilidades/whatsapp.html'
      ]
    },
    {
      file: 'trabalhista.html',
      title: 'Calculadoras Trabalhistas Online Grátis | Calculadora Master',
      canonical: 'https://www.calculadoramaster.com/trabalhista.html',
      h1: 'Calculadoras Trabalhistas',
      expectedCards: [
        'tools/trabalhista/horas-extras.html'
      ]
    }
  ];

  for (const spec of categorySpecs) {
    const filePath = path.join(ROOT_DIR, 'dist-pilot', spec.file);
    assert.ok(fs.existsSync(filePath), `Página de categoria ${spec.file} deve existir em dist-pilot`);

    const html = fs.readFileSync(filePath, 'utf-8');
    assert.ok(html.length > 500, `${spec.file} deve ter tamanho substancial`);

    // Title
    assert.match(html, new RegExp(`<title>${spec.title.replace(/\|/g, '\\|')}<\/title>`), `${spec.file} deve ter title correto`);

    // Canonical
    assert.match(html, new RegExp(`<link rel="canonical" href="${spec.canonical}">`), `${spec.file} deve ter canonical correta`);

    // H1
    assert.match(html, new RegExp(`<h1>${spec.h1}<\/h1>`), `${spec.file} deve ter H1 correto`);

    // Scripts essenciais
    assert.match(html, /<script type="module" src="\.\/js\/header-auth\.js"><\/script>/, `${spec.file} deve carregar header-auth.js`);
    assert.match(html, /<script src="\.\/js\/cookie-consent\.js"><\/script>/, `${spec.file} deve carregar cookie-consent.js`);

    // Cards esperados na categoria
    for (const cardRel of spec.expectedCards) {
      assert.match(html, new RegExp(`href="\\.\\/${cardRel.replace(/\//g, '\\/')}"`), `${spec.file} deve conter card apontando para ${cardRel}`);
    }

    // Ausência de placeholders e undefined
    assert.equal(html.match(/\{\{([A-Z0-9_]+)\}\}/), null, `${spec.file} não deve conter placeholders não resolvidos`);
    assert.ok(!html.includes('href="undefined"'), `${spec.file} não deve conter href undefined`);
    assert.ok(!html.includes('src="undefined"'), `${spec.file} não deve conter src undefined`);

    // Footer institucional de 3 colunas
    assert.match(html, /<div class="container footer-columns">/, `${spec.file} deve conter footer estruturado`);
    assert.match(html, /<div class="footer-bottom">/, `${spec.file} deve conter footer-bottom`);
  }
});

test('SSG Blog - buildPages(BLOG_PAGES) compila 15 páginas e copia assets do blog', () => {
  const results = buildPages(BLOG_PAGES, { assets: [...COMMON_ASSETS, ...BLOG_ASSETS] });
  assert.equal(results.length, 15, 'BLOG_PAGES deve gerar exatamente 15 páginas (1 index + 14 artigos)');
  assert.equal(BLOG_ARTIGOS_PAGES.length, 14, 'BLOG_ARTIGOS_PAGES deve conter 14 artigos');
  assert.equal(BLOG_ASSETS.length, 30, 'BLOG_ASSETS deve conter exatamente 30 imagens');

  for (const page of BLOG_PAGES) {
    const fullPath = path.join(ROOT_DIR, 'dist-pilot', page.relativeOutputPath);
    assert.ok(fs.existsSync(fullPath), `Página ${page.relativeOutputPath} deve existir no output`);
    const content = fs.readFileSync(fullPath, 'utf-8');
    assert.ok(content.length > 500, `Página ${page.relativeOutputPath} deve ter tamanho substancial`);
    assert.equal(content.match(/\{\{([A-Z0-9_]+)\}\}/), null, `Página ${page.relativeOutputPath} não deve conter placeholders não resolvidos`);
    assert.ok(!content.includes('href="undefined"'), `Página ${page.relativeOutputPath} não deve conter href undefined`);
    assert.ok(!content.includes('src="undefined"'), `Página ${page.relativeOutputPath} não deve conter src undefined`);
  }
});

test('SSG Blog - blog/index.html: metadados, H1, cards de artigos, footer e scripts', () => {
  const filePath = path.join(ROOT_DIR, 'dist-pilot', 'blog', 'index.html');
  assert.ok(fs.existsSync(filePath), 'blog/index.html deve existir em dist-pilot');

  const html = fs.readFileSync(filePath, 'utf-8');

  // Metadados
  assert.match(html, /<title>Blog Calculadora Master \| Artigos, Dicas e Guias Práticos<\/title>/);
  assert.match(html, /<link rel="canonical" href="https:\/\/www\.calculadoramaster\.com\/blog\/index\.html">/);
  assert.match(html, /<meta property="og:type" content="website">/);
  assert.match(html, /<meta property="og:image" content="https:\/\/www\.calculadoramaster\.com\/blog\/img\/blog-calculadora\.png">/);

  // H1
  assert.match(html, /<h1>Blog Calculadora Master<\/h1>/);

  // Links para todos os 14 artigos
  const expectedArticleSlugs = [
    'como-calcular-combustivel',
    'como-calcular-contador',
    'como-calcular-desconto',
    'como-calcular-financiamento-carro',
    'como-calcular-financiamento-imovel',
    'como-calcular-idade',
    'como-calcular-imc',
    'como-calcular-juros',
    'como-calcular-lucro',
    'como-calcular-porcentagem',
    'como-dividir-conta',
    'como-gerar-link-whatsapp',
    'como-gerar-qr',
    'como-gerar-senha'
  ];

  for (const slug of expectedArticleSlugs) {
    assert.match(html, new RegExp(`href="\\.\\.\/blog\/artigos\/${slug}\\.html"`), `blog/index.html deve conter link para artigo ${slug}`);
  }

  // Footer institucional de 3 colunas
  assert.match(html, /<div class="container footer-columns">/, 'blog/index.html deve utilizar site-footer com 3 colunas');
  assert.match(html, /<div class="footer-bottom">/, 'blog/index.html deve conter footer-bottom');

  // Scripts essenciais
  assert.match(html, /<script type="module" src="\.\.\/js\/header-auth\.js"><\/script>/);
  assert.match(html, /<script src="\.\.\/js\/cookie-consent\.js"><\/script>/);
});

test('SSG Blog - 14 artigos: metadados, canonical, H1, og:type=article, og:image e scripts', () => {
  const articleSpecs = [
    {
      file: 'blog/artigos/como-calcular-combustivel.html',
      title: 'Como Calcular Consumo de Combustível por Km | Calculadora Master',
      canonical: 'https://www.calculadoramaster.com/blog/artigos/como-calcular-combustivel.html',
      image: 'combustivel.png',
      hasMathJax: false
    },
    {
      file: 'blog/artigos/como-calcular-contador.html',
      title: 'Como Contar Caracteres e Palavras de um Texto | Calculadora Master',
      canonical: 'https://www.calculadoramaster.com/blog/artigos/como-calcular-contador.html',
      image: 'contador.png',
      hasMathJax: false
    },
    {
      file: 'blog/artigos/como-calcular-desconto.html',
      title: 'Como Calcular Desconto em Compras e Promoções | Calculadora Master',
      canonical: 'https://www.calculadoramaster.com/blog/artigos/como-calcular-desconto.html',
      image: 'desconto.png',
      hasMathJax: false
    },
    {
      file: 'blog/artigos/como-calcular-financiamento-carro.html',
      title: 'Como Calcular Financiamento de Carros e Parcelas | Calculadora Master',
      canonical: 'https://www.calculadoramaster.com/blog/artigos/como-calcular-financiamento-carro.html',
      image: 'carro.png',
      hasMathJax: false
    },
    {
      file: 'blog/artigos/como-calcular-financiamento-imovel.html',
      title: 'Como Calcular Financiamento Imobiliário e Parcelas | Calculadora Master',
      canonical: 'https://www.calculadoramaster.com/blog/artigos/como-calcular-financiamento-imovel.html',
      image: 'imovel.png',
      hasMathJax: false
    },
    {
      file: 'blog/artigos/como-calcular-idade.html',
      title: 'Como Calcular Idade Exata em Anos, Meses e Dias | Calculadora Master',
      canonical: 'https://www.calculadoramaster.com/blog/artigos/como-calcular-idade.html',
      image: 'idade.png',
      hasMathJax: false
    },
    {
      file: 'blog/artigos/como-calcular-imc.html',
      title: 'Como Calcular o IMC e Classificação de Peso | Calculadora Master',
      canonical: 'https://www.calculadoramaster.com/blog/artigos/como-calcular-imc.html',
      image: 'imc.png',
      hasMathJax: true
    },
    {
      file: 'blog/artigos/como-calcular-juros.html',
      title: 'Como Calcular Juros Simples e Compostos | Calculadora Master',
      canonical: 'https://www.calculadoramaster.com/blog/artigos/como-calcular-juros.html',
      image: 'juros.png',
      hasMathJax: false
    },
    {
      file: 'blog/artigos/como-calcular-lucro.html',
      title: 'Como Calcular Margem de Lucro e Preço de Venda | Calculadora Master',
      canonical: 'https://www.calculadoramaster.com/blog/artigos/como-calcular-lucro.html',
      image: 'lucro.png',
      hasMathJax: false
    },
    {
      file: 'blog/artigos/como-calcular-porcentagem.html',
      title: 'Como Calcular Porcentagem Passo a Passo | Calculadora Master',
      canonical: 'https://www.calculadoramaster.com/blog/artigos/como-calcular-porcentagem.html',
      image: 'porcentagem.png',
      hasMathJax: true
    },
    {
      file: 'blog/artigos/como-dividir-conta.html',
      title: 'Como Dividir a Conta do Restaurante por Pessoa | Calculadora Master',
      canonical: 'https://www.calculadoramaster.com/blog/artigos/como-dividir-conta.html',
      image: 'dividir.png',
      hasMathJax: false
    },
    {
      file: 'blog/artigos/como-gerar-link-whatsapp.html',
      title: 'Como Criar Link para WhatsApp com Mensagem Personalizada | Calculadora Master',
      canonical: 'https://www.calculadoramaster.com/blog/artigos/como-gerar-link-whatsapp.html',
      image: 'whatsapp.png',
      hasMathJax: false
    },
    {
      file: 'blog/artigos/como-gerar-qr.html',
      title: 'Como Criar QR Code Personalizado Online Grátis | Calculadora Master',
      canonical: 'https://www.calculadoramaster.com/blog/artigos/como-gerar-qr.html',
      image: 'qr-code.png',
      hasMathJax: false
    },
    {
      file: 'blog/artigos/como-gerar-senha.html',
      title: 'Como Criar Senhas Fortes e Seguras Online | Calculadora Master',
      canonical: 'https://www.calculadoramaster.com/blog/artigos/como-gerar-senha.html',
      image: 'senha.png',
      hasMathJax: false
    }
  ];

  for (const spec of articleSpecs) {
    const filePath = path.join(ROOT_DIR, 'dist-pilot', spec.file);
    assert.ok(fs.existsSync(filePath), `Artigo ${spec.file} deve existir em dist-pilot`);

    const html = fs.readFileSync(filePath, 'utf-8');
    assert.ok(html.length > 500, `${spec.file} deve ter tamanho substancial`);

    // Title
    assert.match(html, new RegExp(`<title>${spec.title.replace(/\|/g, '\\|')}<\/title>`), `${spec.file} deve ter title correto`);

    // Canonical
    assert.match(html, new RegExp(`<link rel="canonical" href="${spec.canonical}">`), `${spec.file} deve ter canonical correta`);

    // OG Tags
    assert.match(html, /<meta property="og:type" content="article">/, `${spec.file} deve ter og:type=article`);
    assert.match(html, new RegExp(`<meta property="og:image" content="https:\/\/www\\.calculadoramaster\\.com\/blog\/img\/${spec.image}">`), `${spec.file} deve ter og:image correspondente`);

    // Scripts essenciais
    assert.match(html, /<script type="module" src="\.\.\/\.\.\/js\/header-auth\.js"><\/script>/, `${spec.file} deve carregar header-auth.js com prefixo correto`);
    assert.match(html, /<script src="\.\.\/\.\.\/js\/cookie-consent\.js"><\/script>/, `${spec.file} deve carregar cookie-consent.js com prefixo correto`);

    // MathJax condicional
    if (spec.hasMathJax) {
      assert.match(html, /mathjax/, `${spec.file} deve conter script MathJax`);
    }

    // Ausência de placeholders e undefined
    assert.equal(html.match(/\{\{([A-Z0-9_]+)\}\}/), null, `${spec.file} não deve conter placeholders não resolvidos`);
    assert.ok(!html.includes('href="undefined"'), `${spec.file} não deve conter href undefined`);
    assert.ok(!html.includes('src="undefined"'), `${spec.file} não deve conter src undefined`);
  }
});

test('SSG Institucional - buildPages(INSTITUCIONAL_PAGES) compila 7 páginas institucionais', () => {
  const results = buildPages(INSTITUCIONAL_PAGES, { assets: SITE_ASSETS });
  assert.equal(results.length, 7, 'INSTITUCIONAL_PAGES deve gerar exatamente 7 páginas');

  for (const page of INSTITUCIONAL_PAGES) {
    const fullPath = path.join(ROOT_DIR, 'dist-pilot', page.relativeOutputPath);
    assert.ok(fs.existsSync(fullPath), `Página institucional ${page.relativeOutputPath} deve existir no output`);
    const content = fs.readFileSync(fullPath, 'utf-8');
    assert.ok(content.length > 500, `Página ${page.relativeOutputPath} deve ter tamanho substancial`);
    assert.equal(content.match(/\{\{([A-Z0-9_]+)\}\}/), null, `Página ${page.relativeOutputPath} não deve ter placeholders`);
    assert.ok(!content.includes('href="undefined"'), `Página ${page.relativeOutputPath} não deve ter href undefined`);
    assert.ok(!content.includes('src="undefined"'), `Página ${page.relativeOutputPath} não deve ter src undefined`);
  }
});

test('SSG Institucional - Validação detalhada das 7 páginas: metadados, canonical, H1, auth e scripts', () => {
  const institutionalSpecs = [
    {
      file: 'sobre.html',
      title: 'Sobre | Calculadora Master',
      canonical: 'https://www.calculadoramaster.com/sobre.html',
      h1: 'Sobre o Calculadora Master',
      robots: 'index, follow',
      hasSiteFooter: true,
      hasAuthFooter: false,
      is404: false
    },
    {
      file: 'contato.html',
      title: 'Contato | Calculadora Master',
      canonical: 'https://www.calculadoramaster.com/contato.html',
      h1: 'Fale Conosco',
      robots: 'index, follow',
      hasSiteFooter: true,
      hasAuthFooter: false,
      is404: false
    },
    {
      file: 'politica.html',
      title: 'Política de Privacidade | Calculadora Master',
      canonical: 'https://www.calculadoramaster.com/politica.html',
      h1: 'Política de Privacidade',
      robots: 'index, follow',
      hasSiteFooter: true,
      hasAuthFooter: false,
      is404: false
    },
    {
      file: 'termos.html',
      title: 'Termos de Uso | Calculadora Master',
      canonical: 'https://www.calculadoramaster.com/termos.html',
      h1: 'Termos de Uso',
      robots: 'index, follow',
      hasSiteFooter: true,
      hasAuthFooter: false,
      is404: false
    },
    {
      file: 'login.html',
      title: 'Entrar - Calculadora Master',
      canonical: 'https://www.calculadoramaster.com/login.html',
      h1: 'Entrar na sua conta',
      robots: 'noindex, follow',
      hasSiteFooter: false,
      hasAuthFooter: true,
      is404: false
    },
    {
      file: 'cadastro.html',
      title: 'Cadastrar-se - Calculadora Master',
      canonical: 'https://www.calculadoramaster.com/cadastro.html',
      h1: 'Criar sua conta',
      robots: 'noindex, follow',
      hasSiteFooter: false,
      hasAuthFooter: true,
      is404: false
    },
    {
      file: '404.html',
      title: 'Página não encontrada | Calculadora Master',
      canonical: null,
      h1: 'Página não encontrada',
      robots: 'noindex, follow',
      hasSiteFooter: true,
      hasAuthFooter: false,
      is404: true
    }
  ];

  for (const spec of institutionalSpecs) {
    const filePath = path.join(ROOT_DIR, 'dist-pilot', spec.file);
    assert.ok(fs.existsSync(filePath), `Página institucional ${spec.file} deve existir em dist-pilot`);

    const html = fs.readFileSync(filePath, 'utf-8');
    assert.ok(html.length > 500, `${spec.file} deve ter tamanho substancial`);

    // Title
    assert.match(html, new RegExp(`<title>${spec.title.replace(/\|/g, '\\|')}<\/title>`), `${spec.file} deve ter title correto`);

    // Robots
    assert.match(html, new RegExp(`<meta name="robots" content="${spec.robots}">`), `${spec.file} deve ter robots correto`);

    // Canonical
    if (spec.canonical) {
      assert.match(html, new RegExp(`<link rel="canonical" href="${spec.canonical}">`), `${spec.file} deve ter canonical correta`);
    } else {
      assert.ok(!html.includes('rel="canonical"'), `${spec.file} não deve ter canonical`);
    }

    // H1
    assert.match(html, new RegExp(`<h1>${spec.h1}<\/h1>|<h1 class="error-title">${spec.h1}<\/h1>`), `${spec.file} deve ter H1 correto`);

    // Header institucional
    assert.match(html, /<header class="header">/, `${spec.file} deve conter header`);
    assert.match(html, /financeira\.html/, `${spec.file} deve conter link para financeira`);

    // Footer
    if (spec.hasSiteFooter) {
      assert.match(html, /<div class="container footer-columns">/, `${spec.file} deve conter footer estruturado com 3 colunas`);
    }
    if (spec.hasAuthFooter) {
      assert.ok(!html.includes('footer-columns'), `${spec.file} não deve conter footer de 3 colunas`);
      assert.match(html, /<div class="footer-bottom">/, `${spec.file} deve conter footer-bottom`);
    }

    // Scripts essenciais
    assert.match(html, /header-auth\.js/, `${spec.file} deve carregar header-auth.js`);
    assert.match(html, /cookie-consent\.js/, `${spec.file} deve carregar cookie-consent.js`);

    // 404 classes
    if (spec.is404) {
      assert.match(html, /<body class="error-page-body">/, '404.html deve ter classe error-page-body');
      assert.match(html, /<main class="error-main">/, '404.html deve ter classe error-main');
    }

    // Ausência de placeholders e undefined
    assert.equal(html.match(/\{\{([A-Z0-9_]+)\}\}/), null, `${spec.file} não deve conter placeholders não resolvidos`);
    assert.ok(!html.includes('href="undefined"'), `${spec.file} não deve conter href undefined`);
    assert.ok(!html.includes('src="undefined"'), `${spec.file} não deve conter src undefined`);
  }
});

test('PROD - buildPages com PROD_OUTPUT_DIR gera todas as 43 páginas e 58 assets em dist/', () => {
  const result = buildPages(SITE_PAGES, { outputDir: PROD_OUTPUT_DIR, assets: SITE_ASSETS });
  assert.equal(result.length, 43, 'build:prod deve compilar exatamente 43 páginas');

  for (const page of SITE_PAGES) {
    const pagePath = path.join(PROD_OUTPUT_DIR, page.relativeOutputPath);
    assert.ok(fs.existsSync(pagePath), `Página de produção deve existir: ${page.relativeOutputPath}`);
    const html = fs.readFileSync(pagePath, 'utf-8');
    assert.equal(html.match(/\{\{([A-Z0-9_]+)\}\}/), null, `Página ${page.relativeOutputPath} não deve conter placeholders`);
    assert.ok(!html.includes('href="undefined"'), `Página ${page.relativeOutputPath} não deve conter href="undefined"`);
  }

  for (const asset of SITE_ASSETS) {
    const assetPath = path.join(PROD_OUTPUT_DIR, asset.dest);
    assert.ok(fs.existsSync(assetPath), `Asset de produção deve existir: ${asset.dest}`);
  }
});

test('PROD - Todas as 43 páginas e 58 assets em dist/ são idênticos a dist-pilot/', () => {
  const pilotDir = path.join(ROOT_DIR, 'dist-pilot');
  // Assegura que dist-pilot está compilado
  buildPages(SITE_PAGES, { outputDir: pilotDir, assets: SITE_ASSETS });

  for (const page of SITE_PAGES) {
    const prodFile = path.join(PROD_OUTPUT_DIR, page.relativeOutputPath);
    const pilotFile = path.join(pilotDir, page.relativeOutputPath);
    assert.ok(fs.existsSync(prodFile), `Arquivo prod deve existir: ${page.relativeOutputPath}`);
    assert.ok(fs.existsSync(pilotFile), `Arquivo pilot deve existir: ${page.relativeOutputPath}`);
    const prodHtml = fs.readFileSync(prodFile, 'utf-8');
    const pilotHtml = fs.readFileSync(pilotFile, 'utf-8');
    assert.equal(prodHtml, pilotHtml, `Conteúdo divergente entre dist/ e dist-pilot/ em: ${page.relativeOutputPath}`);
  }

  for (const asset of SITE_ASSETS) {
    const prodAsset = path.join(PROD_OUTPUT_DIR, asset.dest);
    const pilotAsset = path.join(pilotDir, asset.dest);
    assert.ok(fs.existsSync(prodAsset), `Asset prod deve existir: ${asset.dest}`);
    assert.ok(fs.existsSync(pilotAsset), `Asset pilot deve existir: ${asset.dest}`);
    const prodBuffer = fs.readFileSync(prodAsset);
    const pilotBuffer = fs.readFileSync(pilotAsset);
    assert.ok(prodBuffer.equals(pilotBuffer), `Asset divergente entre dist/ e dist-pilot/: ${asset.dest}`);
  }
});
