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
const PROD_OUTPUT_DIR = path.join(ROOT_DIR, 'dist');
const TOOLS_JSON_PATH = path.join(ROOT_DIR, 'data', 'tools.json');
const STYLE_CSS_PATH = path.join(ROOT_DIR, 'css', 'style.css');

const crypto = require('node:crypto');

function getStyleVersion() {
  if (!fs.existsSync(STYLE_CSS_PATH)) {
    throw new Error(`Arquivo CSS obrigatório não encontrado: ${STYLE_CSS_PATH}`);
  }
  const cssContent = fs.readFileSync(STYLE_CSS_PATH, 'utf-8');
  return crypto.createHash('sha256').update(cssContent).digest('hex').slice(0, 8);
}

const STYLE_VERSION = getStyleVersion();

const { getPageJsonLd, renderJsonLdScript } = require('../src/utils/seo.js');
const { discoverPublicFactoryTools } = require('./lib/tool-discovery.js');

const factoryDiscovery = discoverPublicFactoryTools({
  rootDir: ROOT_DIR,
  toolsPath: TOOLS_JSON_PATH
});
const FACTORY_PAGES = factoryDiscovery.pages;
const FACTORY_ASSETS = factoryDiscovery.assets;
const FACTORY_BLOG_PAGES = factoryDiscovery.articlePages || [];

let cachedToolsData = null;
function getToolsData() {
  if (!cachedToolsData && fs.existsSync(TOOLS_JSON_PATH)) {
    try {
      cachedToolsData = JSON.parse(fs.readFileSync(TOOLS_JSON_PATH, 'utf-8'));
    } catch (_) {
      cachedToolsData = [];
    }
  }
  return cachedToolsData || [];
}

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

const UTILIDADES_PAGES = [
  {
    sourceFile: path.join(PAGES_DIR, 'tools', 'utilidades', 'combustivel.page.html'),
    relativeOutputPath: 'tools/utilidades/combustivel.html'
  },
  {
    sourceFile: path.join(PAGES_DIR, 'tools', 'utilidades', 'contador.page.html'),
    relativeOutputPath: 'tools/utilidades/contador.html'
  },
  {
    sourceFile: path.join(PAGES_DIR, 'tools', 'utilidades', 'senha.page.html'),
    relativeOutputPath: 'tools/utilidades/senha.html'
  },
  {
    sourceFile: path.join(PAGES_DIR, 'tools', 'utilidades', 'whatsapp.page.html'),
    relativeOutputPath: 'tools/utilidades/whatsapp.html'
  },
  {
    sourceFile: path.join(PAGES_DIR, 'tools', 'utilidades', 'qr-code.page.html'),
    relativeOutputPath: 'tools/utilidades/qr-code.html'
  }
];

const TOOL_PAGES = [
  ...FINANCEIRO_PAGES,
  ...SAUDE_PAGES,
  ...TRABALHISTA_PAGES,
  ...UTILIDADES_PAGES,
  ...FACTORY_PAGES
];

const HOME_PAGE = {
  sourceFile: path.join(PAGES_DIR, 'index.page.html'),
  relativeOutputPath: 'index.html'
};

const CATEGORIA_PAGES = [
  {
    sourceFile: path.join(PAGES_DIR, 'categorias', 'financeira.page.html'),
    relativeOutputPath: 'financeira.html'
  },
  {
    sourceFile: path.join(PAGES_DIR, 'categorias', 'matematica.page.html'),
    relativeOutputPath: 'matematica.html'
  },
  {
    sourceFile: path.join(PAGES_DIR, 'categorias', 'saude.page.html'),
    relativeOutputPath: 'saude.html'
  },
  {
    sourceFile: path.join(PAGES_DIR, 'categorias', 'conversores.page.html'),
    relativeOutputPath: 'conversores.html'
  },
  {
    sourceFile: path.join(PAGES_DIR, 'categorias', 'trabalhista.page.html'),
    relativeOutputPath: 'trabalhista.html'
  }
];

const BLOG_INDEX_PAGE = {
  sourceFile: path.join(PAGES_DIR, 'blog', 'index.page.html'),
  relativeOutputPath: 'blog/index.html'
};

const BLOG_ARTIGOS_PAGES = [
  {
    sourceFile: path.join(PAGES_DIR, 'blog', 'artigos', 'como-calcular-combustivel.page.html'),
    relativeOutputPath: 'blog/artigos/como-calcular-combustivel.html'
  },
  {
    sourceFile: path.join(PAGES_DIR, 'blog', 'artigos', 'como-calcular-contador.page.html'),
    relativeOutputPath: 'blog/artigos/como-calcular-contador.html'
  },
  {
    sourceFile: path.join(PAGES_DIR, 'blog', 'artigos', 'como-calcular-desconto.page.html'),
    relativeOutputPath: 'blog/artigos/como-calcular-desconto.html'
  },
  {
    sourceFile: path.join(PAGES_DIR, 'blog', 'artigos', 'como-calcular-financiamento-carro.page.html'),
    relativeOutputPath: 'blog/artigos/como-calcular-financiamento-carro.html'
  },
  {
    sourceFile: path.join(PAGES_DIR, 'blog', 'artigos', 'como-calcular-financiamento-imovel.page.html'),
    relativeOutputPath: 'blog/artigos/como-calcular-financiamento-imovel.html'
  },
  {
    sourceFile: path.join(PAGES_DIR, 'blog', 'artigos', 'como-calcular-idade.page.html'),
    relativeOutputPath: 'blog/artigos/como-calcular-idade.html'
  },
  {
    sourceFile: path.join(PAGES_DIR, 'blog', 'artigos', 'como-calcular-imc.page.html'),
    relativeOutputPath: 'blog/artigos/como-calcular-imc.html'
  },
  {
    sourceFile: path.join(PAGES_DIR, 'blog', 'artigos', 'como-calcular-juros.page.html'),
    relativeOutputPath: 'blog/artigos/como-calcular-juros.html'
  },
  {
    sourceFile: path.join(PAGES_DIR, 'blog', 'artigos', 'como-calcular-lucro.page.html'),
    relativeOutputPath: 'blog/artigos/como-calcular-lucro.html'
  },
  {
    sourceFile: path.join(PAGES_DIR, 'blog', 'artigos', 'como-calcular-porcentagem.page.html'),
    relativeOutputPath: 'blog/artigos/como-calcular-porcentagem.html'
  },
  {
    sourceFile: path.join(PAGES_DIR, 'blog', 'artigos', 'como-dividir-conta.page.html'),
    relativeOutputPath: 'blog/artigos/como-dividir-conta.html'
  },
  {
    sourceFile: path.join(PAGES_DIR, 'blog', 'artigos', 'como-gerar-link-whatsapp.page.html'),
    relativeOutputPath: 'blog/artigos/como-gerar-link-whatsapp.html'
  },
  {
    sourceFile: path.join(PAGES_DIR, 'blog', 'artigos', 'como-gerar-qr.page.html'),
    relativeOutputPath: 'blog/artigos/como-gerar-qr.html'
  },
  {
    sourceFile: path.join(PAGES_DIR, 'blog', 'artigos', 'como-gerar-senha.page.html'),
    relativeOutputPath: 'blog/artigos/como-gerar-senha.html'
  }
];

const BLOG_PAGES = [
  BLOG_INDEX_PAGE,
  ...BLOG_ARTIGOS_PAGES,
  ...FACTORY_BLOG_PAGES
];

const INSTITUCIONAL_PAGES = [
  {
    sourceFile: path.join(PAGES_DIR, 'institucional', 'sobre.page.html'),
    relativeOutputPath: 'sobre.html'
  },
  {
    sourceFile: path.join(PAGES_DIR, 'institucional', 'contato.page.html'),
    relativeOutputPath: 'contato.html'
  },
  {
    sourceFile: path.join(PAGES_DIR, 'institucional', 'politica.page.html'),
    relativeOutputPath: 'politica.html'
  },
  {
    sourceFile: path.join(PAGES_DIR, 'institucional', 'termos.page.html'),
    relativeOutputPath: 'termos.html'
  },
  {
    sourceFile: path.join(PAGES_DIR, 'institucional', 'login.page.html'),
    relativeOutputPath: 'login.html'
  },
  {
    sourceFile: path.join(PAGES_DIR, 'institucional', 'cadastro.page.html'),
    relativeOutputPath: 'cadastro.html'
  },
  {
    sourceFile: path.join(PAGES_DIR, 'institucional', '404.page.html'),
    relativeOutputPath: '404.html'
  }
];

const SITE_PAGES = [
  ...TOOL_PAGES,
  HOME_PAGE,
  ...CATEGORIA_PAGES,
  ...BLOG_PAGES,
  ...INSTITUCIONAL_PAGES
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
  { src: 'js/core/currency.js', dest: 'js/core/currency.js' },
  { src: 'js/core/pdf-export.js', dest: 'js/core/pdf-export.js' },
  { src: 'js/core/result-actions.js', dest: 'js/core/result-actions.js' },
  { src: 'js/core/analytics.js', dest: 'js/core/analytics.js' },
  { src: 'js/core/favorites.js', dest: 'js/core/favorites.js' }
];

const SAUDE_ASSETS = [
  { src: 'js/tools/imc.js', dest: 'js/tools/imc.js' },
  { src: 'js/tools/idade.js', dest: 'js/tools/idade.js' }
];

const TRABALHISTA_ASSETS = [
  { src: 'js/tools/horas-extras.js', dest: 'js/tools/horas-extras.js' }
];

const UTILIDADES_ASSETS = [
  { src: 'js/tools/combustivel.js', dest: 'js/tools/combustivel.js' },
  { src: 'js/tools/contador.js', dest: 'js/tools/contador.js' },
  { src: 'js/tools/senha.js', dest: 'js/tools/senha.js' },
  { src: 'js/tools/whatsapp.js', dest: 'js/tools/whatsapp.js' },
  { src: 'js/tools/qr-code.js', dest: 'js/tools/qr-code.js' }
];

const TOOL_ASSETS = [
  ...FINANCEIRO_ASSETS,
  ...SAUDE_ASSETS,
  ...TRABALHISTA_ASSETS,
  ...UTILIDADES_ASSETS,
  ...FACTORY_ASSETS
];

const SITE_SPECIFIC_ASSETS = [
  { src: 'logo/banner.webp', dest: 'logo/banner.webp' },
  { src: 'js/tools-catalog.js', dest: 'js/tools-catalog.js' },
  { src: 'js/home-search.js', dest: 'js/home-search.js' }
];

const BLOG_ASSETS = [
  { src: 'blog/img/blog-calculadora.png', dest: 'blog/img/blog-calculadora.png' },
  { src: 'blog/img/blog-calculadora.webp', dest: 'blog/img/blog-calculadora.webp' },
  { src: 'blog/img/carro.png', dest: 'blog/img/carro.png' },
  { src: 'blog/img/carro.webp', dest: 'blog/img/carro.webp' },
  { src: 'blog/img/combustivel.png', dest: 'blog/img/combustivel.png' },
  { src: 'blog/img/combustivel.webp', dest: 'blog/img/combustivel.webp' },
  { src: 'blog/img/contador.png', dest: 'blog/img/contador.png' },
  { src: 'blog/img/contador.webp', dest: 'blog/img/contador.webp' },
  { src: 'blog/img/desconto.png', dest: 'blog/img/desconto.png' },
  { src: 'blog/img/desconto.webp', dest: 'blog/img/desconto.webp' },
  { src: 'blog/img/dividir.png', dest: 'blog/img/dividir.png' },
  { src: 'blog/img/dividir.webp', dest: 'blog/img/dividir.webp' },
  { src: 'blog/img/idade.png', dest: 'blog/img/idade.png' },
  { src: 'blog/img/idade.webp', dest: 'blog/img/idade.webp' },
  { src: 'blog/img/imc.png', dest: 'blog/img/imc.png' },
  { src: 'blog/img/imc.webp', dest: 'blog/img/imc.webp' },
  { src: 'blog/img/imovel.png', dest: 'blog/img/imovel.png' },
  { src: 'blog/img/imovel.webp', dest: 'blog/img/imovel.webp' },
  { src: 'blog/img/juros.png', dest: 'blog/img/juros.png' },
  { src: 'blog/img/juros.webp', dest: 'blog/img/juros.webp' },
  { src: 'blog/img/lucro.png', dest: 'blog/img/lucro.png' },
  { src: 'blog/img/lucro.webp', dest: 'blog/img/lucro.webp' },
  { src: 'blog/img/porcentagem.png', dest: 'blog/img/porcentagem.png' },
  { src: 'blog/img/porcentagem.webp', dest: 'blog/img/porcentagem.webp' },
  { src: 'blog/img/qr-code.png', dest: 'blog/img/qr-code.png' },
  { src: 'blog/img/qr-code.webp', dest: 'blog/img/qr-code.webp' },
  { src: 'blog/img/senha.png', dest: 'blog/img/senha.png' },
  { src: 'blog/img/senha.webp', dest: 'blog/img/senha.webp' },
  { src: 'blog/img/whatsapp.png', dest: 'blog/img/whatsapp.png' },
  { src: 'blog/img/whatsapp.webp', dest: 'blog/img/whatsapp.webp' }
];

const SITE_ASSETS = [
  ...TOOL_ASSETS,
  ...SITE_SPECIFIC_ASSETS,
  ...BLOG_ASSETS
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
      if (key) meta[key] = val.replace(/\\n/g, '\n');
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
function renderPage({ sourceFile, relativeOutputPath, componentsDir = COMPONENTS_DIR, layoutsDir = LAYOUTS_DIR, styleVersion = STYLE_VERSION }) {
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
  const defaultHeader = meta.layout === 'site' ? 'site-header' : 'header';
  const defaultFooter = meta.layout === 'site' ? 'site-footer' : 'footer';
  const headerFile = `${meta.header || defaultHeader}.html`;
  const footerFile = `${meta.footer || defaultFooter}.html`;
  const headerPath = path.join(componentsDir, headerFile);
  const footerPath = path.join(componentsDir, footerFile);

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
  template = template.replace(/\{\{ROBOTS\}\}/g, meta.robots || 'index, follow');
  template = template.replace(/\{\{OG_TYPE\}\}/g, meta.ogType || 'website');
  template = template.replace(/\{\{OG_IMAGE\}\}/g, meta.ogImage || 'https://www.calculadoramaster.com/logo/banner.png');
  template = template.replace(/\{\{ROOT_PREFIX\}\}/g, rootPrefix);
  template = template.replace(/\{\{STYLE_VERSION\}\}/g, styleVersion);
  template = template.replace(/\{\{EXTRA_HEAD\}\}\n?/g, meta.extraHead ? `  ${meta.extraHead}\n` : '');

  // Dados estruturados JSON-LD
  const jsonLdData = getPageJsonLd({
    relativeOutputPath,
    meta,
    tools: getToolsData()
  });
  const jsonLdHtml = renderJsonLdScript(jsonLdData);
  template = template.replace(/\{\{JSON_LD\}\}\n?/g, jsonLdHtml ? `  ${jsonLdHtml}\n` : '');

  // Metadados da ferramenta para o botão de favoritos (layout: tool)
  let toolId = '';
  let toolCategory = '';
  let toolName = '';

  if (meta.layout === 'tool' || relativeOutputPath.startsWith('tools/')) {
    const normRel = '/' + relativeOutputPath.replace(/\\/g, '/');
    const slug = path.basename(relativeOutputPath, '.html');
    const tools = getToolsData();
    const tool = tools.find(t => t.url === normRel || t.slug === slug || t.id === slug);
    if (tool) {
      toolId = tool.id;
      toolCategory = tool.categorySlug || 'utilidades';
      toolName = tool.name;
    } else {
      toolId = slug;
      toolCategory = 'utilidades';
      toolName = meta.title ? meta.title.split('|')[0].trim() : slug;
    }
  }

  template = template.replace(/\{\{TOOL_ID\}\}/g, toolId);
  template = template.replace(/\{\{TOOL_CATEGORY\}\}/g, toolCategory);
  template = template.replace(/\{\{TOOL_NAME\}\}/g, toolName);

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

    const destArg = process.argv.find(arg => arg.startsWith('--dest=') || arg.startsWith('--output=') || arg.startsWith('--out='));
    const customOutputDir = destArg ? path.resolve(ROOT_DIR, destArg.split('=')[1]) : null;

    let pagesToBuild = DEFAULT_PAGES;
    let assetsToCopy = DEFAULT_ASSETS;
    let outputDir = customOutputDir || DEFAULT_OUTPUT_DIR;

    if (scope === 'pilot') {
      pagesToBuild = [FINANCEIRO_LOTE1_PAGES[0]];
      assetsToCopy = DEFAULT_ASSETS;
    } else if (scope === 'financeiro') {
      pagesToBuild = FINANCEIRO_PAGES;
      assetsToCopy = FINANCEIRO_ASSETS;
    } else if (scope === 'tools') {
      pagesToBuild = TOOL_PAGES;
      assetsToCopy = TOOL_ASSETS;
    } else if (scope === 'site') {
      pagesToBuild = SITE_PAGES;
      assetsToCopy = SITE_ASSETS;
    } else if (scope === 'categories') {
      pagesToBuild = CATEGORIA_PAGES;
      assetsToCopy = SITE_ASSETS;
    } else if (scope === 'blog') {
      pagesToBuild = BLOG_PAGES;
      assetsToCopy = [...COMMON_ASSETS, ...BLOG_ASSETS];
    } else if (scope === 'institucional') {
      pagesToBuild = INSTITUCIONAL_PAGES;
      assetsToCopy = SITE_ASSETS;
    } else if (scope === 'prod') {
      pagesToBuild = SITE_PAGES;
      assetsToCopy = SITE_ASSETS;
      outputDir = customOutputDir || PROD_OUTPUT_DIR;
    }

    const results = buildPages(pagesToBuild, { outputDir, assets: assetsToCopy });
    console.log(`\nBuild SSG concluído com sucesso: ${results.length} página(s) gerada(s).`);
  } catch (err) {
    console.error('Falha na execução do build SSG multipágina:', err.message);
    process.exit(1);
  }
}

module.exports = {
  STYLE_VERSION,
  getStyleVersion,
  DEFAULT_OUTPUT_DIR,
  PROD_OUTPUT_DIR,
  FINANCEIRO_LOTE1_PAGES,
  FINANCEIRO_LOTE2_PAGES,
  FINANCEIRO_PAGES,
  SAUDE_PAGES,
  TRABALHISTA_PAGES,
  UTILIDADES_PAGES,
  FACTORY_PAGES,
  FACTORY_BLOG_PAGES,
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
  FACTORY_ASSETS,
  TOOL_ASSETS,
  SITE_SPECIFIC_ASSETS,
  BLOG_ASSETS,
  SITE_ASSETS,
  DEFAULT_ASSETS,
  calculateRootPrefix,
  parsePageSource,
  renderPage,
  copyPilotAssets,
  buildPilot,
  buildPages
};
