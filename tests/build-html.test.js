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
  DEFAULT_PAGES,
  COMMON_ASSETS,
  FINANCEIRO_ASSETS,
  SAUDE_ASSETS,
  TRABALHISTA_ASSETS,
  UTILIDADES_ASSETS,
  TOOL_ASSETS,
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
 * TESTES - SSG MULTIPÁGINA (7 FERRAMENTAS FINANCEIRAS)
 * ================================================== */

test('SSG Multipage - buildPages compila com sucesso as 14 ferramentas (Lote Financeiro, Saúde, Trabalhista e Utilidades)', () => {
  const results = buildPages();
  assert.equal(results.length, 14, 'Devem ser geradas exatamente 14 páginas de ferramentas no total');

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
    'tools/utilidades/whatsapp.html'
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
  assert.equal(utilResults.length, 4, 'UTILIDADES_PAGES deve gerar 4 páginas');

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

test('SSG Multipage - Ausência de placeholders {{...}} em todas as 14 páginas geradas', () => {
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
    'tools/utilidades/whatsapp.html'
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

test('SSG Multipage - Todos os 24 assets obrigatórios são copiados para dist-pilot', () => {
  assert.equal(DEFAULT_ASSETS.length, 24, 'Devem existir exatamente 24 assets declarados no lote de ferramentas');
  assert.equal(FINANCEIRO_ASSETS.length, 17, 'FINANCEIRO_ASSETS deve conter 17 assets');
  assert.equal(SAUDE_ASSETS.length, 2, 'SAUDE_ASSETS deve conter 2 assets');
  assert.equal(TRABALHISTA_ASSETS.length, 1, 'TRABALHISTA_ASSETS deve conter 1 asset');
  assert.equal(UTILIDADES_ASSETS.length, 4, 'UTILIDADES_ASSETS deve conter 4 assets');
  assert.equal(TOOL_ASSETS.length, 24, 'TOOL_ASSETS deve conter 24 assets');

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
    'tools/utilidades/whatsapp.html'
  ];

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
