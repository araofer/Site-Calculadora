/**
 * Calculadora Master - Static Site Generation (SSG) Piloto
 * Motor de geração estática de HTML em tempo de build (Node.js Vanilla).
 * Zero dependências externas e 100% estático.
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const SRC_DIR = path.join(ROOT_DIR, 'src');
const COMPONENTS_DIR = path.join(SRC_DIR, 'components');
const LAYOUTS_DIR = path.join(SRC_DIR, 'layouts');
const PAGES_DIR = path.join(SRC_DIR, 'pages');
const DEFAULT_OUTPUT_DIR = path.join(ROOT_DIR, 'dist-pilot');

const FINANCEIRO_LOTE1_PAGES = [
  {
    sourceFile: path.join(PAGES_DIR, 'tools', 'financas', 'desconto.page.html'),
    relativeOutputPath: 'tools/financas/desconto.html'
  },
  {
    sourceFile: path.join(PAGES_DIR, 'tools', 'financas', 'juros.page.html'),
    relativeOutputPath: 'tools/financas/juros.html'
  },
  {
    sourceFile: path.join(PAGES_DIR, 'tools', 'financas', 'lucro.page.html'),
    relativeOutputPath: 'tools/financas/lucro.html'
  },
  {
    sourceFile: path.join(PAGES_DIR, 'tools', 'financas', 'porcentagem.page.html'),
    relativeOutputPath: 'tools/financas/porcentagem.html'
  }
];

const FINANCEIRO_LOTE2_PAGES = [
  {
    sourceFile: path.join(PAGES_DIR, 'tools', 'financas', 'financiamento-carro.page.html'),
    relativeOutputPath: 'tools/financas/financiamento-carro.html'
  },
  {
    sourceFile: path.join(PAGES_DIR, 'tools', 'financas', 'financiamento-imovel.page.html'),
    relativeOutputPath: 'tools/financas/financiamento-imovel.html'
  },
  {
    sourceFile: path.join(PAGES_DIR, 'tools', 'financas', 'dividir-conta.page.html'),
    relativeOutputPath: 'tools/financas/dividir-conta.html'
  }
];

const FINANCEIRO_PAGES = [
  ...FINANCEIRO_LOTE1_PAGES,
  ...FINANCEIRO_LOTE2_PAGES
];

const SAUDE_PAGES = [
  {
    sourceFile: path.join(PAGES_DIR, 'tools', 'saude', 'imc.page.html'),
    relativeOutputPath: 'tools/saude/imc.html'
  },
  {
    sourceFile: path.join(PAGES_DIR, 'tools', 'saude', 'idade.page.html'),
    relativeOutputPath: 'tools/saude/idade.html'
  }
];

const TRABALHISTA_PAGES = [
  {
    sourceFile: path.join(PAGES_DIR, 'tools', 'trabalhista', 'horas-extras.page.html'),
    relativeOutputPath: 'tools/trabalhista/horas-extras.html'
  }
];

const TOOL_PAGES = [
  ...FINANCEIRO_PAGES,
  ...SAUDE_PAGES,
  ...TRABALHISTA_PAGES
];

const DEFAULT_PAGES = TOOL_PAGES;

const COMMON_ASSETS = [
  { src: 'css/style.css', dest: 'css/style.css' },
  { src: 'css/cookie-consent.css', dest: 'css/cookie-consent.css' },
  { src: 'js/header-auth.js', dest: 'js/header-auth.js' },
  { src: 'js/auth.js', dest: 'js/auth.js' },
  { src: 'js/firebase-config.js', dest: 'js/firebase-config.js' },
  { src: 'js/cookie-consent.js', dest: 'js/cookie-consent.js' },
  { src: 'logo/logo.png', dest: 'logo/logo.png' },
  { src: 'logo/favicon.png', dest: 'logo/favicon.png' },
  { src: 'logo/banner.png', dest: 'logo/banner.png' }
];

const FINANCEIRO_ASSETS = [
  ...COMMON_ASSETS,
  { src: 'js/tools/desconto.js', dest: 'js/tools/desconto.js' },
  { src: 'js/tools/juros.js', dest: 'js/tools/juros.js' },
  { src: 'js/tools/lucro.js', dest: 'js/tools/lucro.js' },
  { src: 'js/tools/porcentagem.js', dest: 'js/tools/porcentagem.js' },
  { src: 'js/tools/financiamento-carro.js', dest: 'js/tools/financiamento-carro.js' },
  { src: 'js/tools/financiamento-imovel.js', dest: 'js/tools/financiamento-imovel.js' },
  { src: 'js/tools/dividir-conta.js', dest: 'js/tools/dividir-conta.js' },
  { src: 'js/core/currency.js', dest: 'js/core/currency.js' }
];

const SAUDE_ASSETS = [
  { src: 'js/tools/imc.js', dest: 'js/tools/imc.js' },
  { src: 'js/tools/idade.js', dest: 'js/tools/idade.js' }
];

const TRABALHISTA_ASSETS = [
  { src: 'js/tools/horas-extras.js', dest: 'js/tools/horas-extras.js' }
];

const TOOL_ASSETS = [
  ...FINANCEIRO_ASSETS,
  ...SAUDE_ASSETS,
  ...TRABALHISTA_ASSETS
];

const DEFAULT_ASSETS = TOOL_ASSETS;

/**
 * Calcula o prefixo de caminho relativo até a raiz do projeto baseado na profundidade do arquivo.
 * Ex: 'tools/financas/desconto.html' -> '../../'
 *     'categorias/financas.html'   -> '../'
 *     'index.html'                 -> './'
 *
 * @param {string} relativePath Caminho relativo do arquivo de saída
 * @returns {string} Prefixo relativo
 */
function calculateRootPrefix(relativePath) {
  const dir = path.dirname(relativePath);
  if (dir === '.' || dir === '') {
    return './';
  }
  const segments = dir.split(/[\\/]/).filter(Boolean);
  return segments.map(() => '..').join('/') + '/';
}

/**
 * Faz o parsing simples de metadados no topo do arquivo (formato frontmatter ---).
 *
 * @param {string} fileContent Conteúdo bruto do arquivo
 * @returns {{meta: Object, content: string}}
 */
function parsePageSource(fileContent) {
  const normalized = fileContent.replace(/\r\n/g, '\n');
  const match = normalized.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) {
    throw new Error('Metadados (frontmatter delimitado por ---) ausentes no arquivo de página.');
  }

  const metaBlock = match[1];
  const content = match[2];

  const meta = {};
  metaBlock.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const colonIndex = line.indexOf(':');
    if (colonIndex !== -1) {
      const key = line.slice(0, colonIndex).trim();
      const val = line.slice(colonIndex + 1).trim();
      if (key) meta[key] = val;
    }
  });

  return { meta, content };
}

/**
 * Compõe o HTML completo a partir de componentes, layout e conteúdo da página.
 *
 * @param {Object} options
 * @param {string} options.sourceFile Caminho absoluto do arquivo fonte .page.html
 * @param {string} options.relativeOutputPath Caminho relativo do HTML de saída
 * @param {string} [options.componentsDir] Diretório de componentes
 * @param {string} [options.layoutsDir] Diretório de layouts
 * @returns {string} HTML renderizado completo
 */
function renderPage({ sourceFile, relativeOutputPath, componentsDir = COMPONENTS_DIR, layoutsDir = LAYOUTS_DIR }) {
  if (!fs.existsSync(sourceFile)) {
    throw new Error(`Arquivo fonte de página não encontrado: ${sourceFile}`);
  }

  const rawSource = fs.readFileSync(sourceFile, 'utf-8');
  const { meta, content } = parsePageSource(rawSource);

  // Validação de campos obrigatórios
  const requiredMeta = ['title', 'description', 'canonical', 'layout'];
  for (const field of requiredMeta) {
    if (!meta[field]) {
      throw new Error(`Campo obrigatório ausente nos metadados: "${field}" em ${sourceFile}`);
    }
  }

  const layoutPath = path.join(layoutsDir, `${meta.layout}.html`);
  if (!fs.existsSync(layoutPath)) {
    throw new Error(`Layout "${meta.layout}.html" não encontrado em: ${layoutsDir}`);
  }
  let template = fs.readFileSync(layoutPath, 'utf-8');

  // Carregamento de componentes essenciais
  const headerPath = path.join(componentsDir, 'header.html');
  const footerPath = path.join(componentsDir, 'footer.html');

  if (!fs.existsSync(headerPath)) {
    throw new Error(`Componente de cabeçalho não encontrado: ${headerPath}`);
  }
  if (!fs.existsSync(footerPath)) {
    throw new Error(`Componente de rodapé não encontrado: ${footerPath}`);
  }

  const headerHtml = fs.readFileSync(headerPath, 'utf-8');
  const footerHtml = fs.readFileSync(footerPath, 'utf-8');

  const rootPrefix = calculateRootPrefix(relativeOutputPath);

  // Mapeamento e substituição de placeholders
  template = template.replace(/\{\{HEADER\}\}/g, headerHtml);
  template = template.replace(/\{\{FOOTER\}\}/g, footerHtml);
  template = template.replace(/\{\{CONTENT\}\}/g, content);
  template = template.replace(/\{\{PAGE_SCRIPTS\}\}/g, meta.pageScripts || '');

  // Substituição de metadados SEO e caminhos
  template = template.replace(/\{\{TITLE\}\}/g, meta.title);
  template = template.replace(/\{\{META_DESCRIPTION\}\}/g, meta.description);
  template = template.replace(/\{\{META_KEYWORDS\}\}/g, meta.keywords || '');
  template = template.replace(/\{\{CANONICAL\}\}/g, meta.canonical);
  template = template.replace(/\{\{ROOT_PREFIX\}\}/g, rootPrefix);

  // Validação defensiva: falha se houver qualquer placeholder não resolvido
  const leftover = template.match(/\{\{([A-Z0-9_]+)\}\}/);
  if (leftover) {
    throw new Error(`Placeholder obrigatório não resolvido: {{${leftover[1]}}} na página ${relativeOutputPath}`);
  }

  // Normalização de quebra de linha para CRLF padrão do projeto
  const crlfOutput = template.replace(/\r?\n/g, '\r\n');
  return crlfOutput;
}

/**
 * Copia os assets mínimos necessários para que as páginas geradas sejam testáveis via HTTP
 * sem erros 404 e sem copiar o repositório inteiro.
 * Falha defensivamente se algum asset declarado/obrigatório não existir no disco.
 *
 * @param {string} [outputDir] Diretório raiz de saída do piloto
 * @param {Array<{src: string, dest: string}>} [assets] Lista de assets a copiar
 */
function copyPilotAssets(outputDir = DEFAULT_OUTPUT_DIR, assets = DEFAULT_ASSETS) {
  for (const item of assets) {
    const srcPath = path.join(ROOT_DIR, item.src);
    const destPath = path.join(outputDir, item.dest);

    if (!fs.existsSync(srcPath)) {
      throw new Error(`Asset obrigatório não encontrado no disco: ${item.src} (${srcPath})`);
    }

    fs.mkdirSync(path.dirname(destPath), { recursive: true });
    fs.copyFileSync(srcPath, destPath);
  }
}

/**
 * Executa o build de uma coleção de páginas e copia os assets necessários.
 *
 * @param {Array<{sourceFile: string, relativeOutputPath: string}>} [pages] Lista de páginas a compilar
 * @param {Object} [options]
 * @param {string} [options.outputDir] Diretório raiz de saída
 * @param {Array<{src: string, dest: string}>} [options.assets] Lista de assets a copiar
 * @returns {Array<{targetFile: string, relativeOutputPath: string, html: string}>}
 */
function buildPages(pages = DEFAULT_PAGES, { outputDir = DEFAULT_OUTPUT_DIR, assets = DEFAULT_ASSETS } = {}) {
  const results = [];

  for (const page of pages) {
    const targetFile = path.join(outputDir, page.relativeOutputPath);
    const html = renderPage({
      sourceFile: page.sourceFile,
      relativeOutputPath: page.relativeOutputPath
    });

    fs.mkdirSync(path.dirname(targetFile), { recursive: true });
    fs.writeFileSync(targetFile, html, 'utf-8');
    results.push({ targetFile, relativeOutputPath: page.relativeOutputPath, html });
    console.log(`✓ Página gerada com sucesso: ${page.relativeOutputPath}`);
  }

  copyPilotAssets(outputDir, assets);
  console.log(`✓ ${assets.length} assets copiados para: ${outputDir}`);

  return results;
}

/**
 * Executa o build da página piloto de Desconto e copia os assets necessários.
 * Mantido para compatibilidade retroativa com a suite de testes inicial.
 *
 * @param {Object} [options]
 * @param {string} [options.outputDir] Diretório de saída
 * @returns {{targetFile: string, relativeOutputPath: string, html: string}}
 */
function buildPilot({ outputDir = DEFAULT_OUTPUT_DIR } = {}) {
  const results = buildPages([DEFAULT_PAGES[0]], { outputDir });
  return results[0];
}

if (require.main === module) {
  try {
    const scopeArg = process.argv.find(arg => arg.startsWith('--scope='));
    const scope = scopeArg ? scopeArg.split('=')[1] : (process.env.SSG_SCOPE || 'all');

    let pagesToBuild = DEFAULT_PAGES;
    let assetsToCopy = DEFAULT_ASSETS;

    if (scope === 'pilot') {
      pagesToBuild = [FINANCEIRO_LOTE1_PAGES[0]];
      assetsToCopy = DEFAULT_ASSETS;
    } else if (scope === 'financeiro') {
      pagesToBuild = FINANCEIRO_PAGES;
      assetsToCopy = FINANCEIRO_ASSETS;
    }

    const results = buildPages(pagesToBuild, { assets: assetsToCopy });
    console.log(`\nBuild SSG concluído com sucesso: ${results.length} página(s) gerada(s).`);
  } catch (err) {
    console.error('Falha na execução do build SSG multipágina:', err.message);
    process.exit(1);
  }
}

module.exports = {
  FINANCEIRO_LOTE1_PAGES,
  FINANCEIRO_LOTE2_PAGES,
  FINANCEIRO_PAGES,
  SAUDE_PAGES,
  TRABALHISTA_PAGES,
  TOOL_PAGES,
  DEFAULT_PAGES,
  COMMON_ASSETS,
  FINANCEIRO_ASSETS,
  SAUDE_ASSETS,
  TRABALHISTA_ASSETS,
  TOOL_ASSETS,
  DEFAULT_ASSETS,
  calculateRootPrefix,
  parsePageSource,
  renderPage,
  copyPilotAssets,
  buildPilot,
  buildPages
};
