/**
 * Tool Registry - Calculadora Master
 * Centraliza o carregamento, resolução de categorias, derivação de caminhos
 * e filtragem de visibilidade pública de ferramentas (Factory e Legadas).
 * Zero dependências externas.
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..', '..');
const DEFAULT_TOOLS_JSON = path.join(ROOT_DIR, 'data', 'tools.json');
const DEFAULT_CATEGORIES_JSON = path.join(ROOT_DIR, 'data', 'categories.json');
const BASE_CANONICAL_DOMAIN = 'https://www.calculadoramaster.com';

const { isFactoryTool } = require('./tool-schema.js');

/**
 * Carrega e normaliza o catálogo de categorias de data/categories.json.
 *
 * @param {string} [categoriesPath]
 * @returns {Record<string, {slug: string, name: string, publicUrl: string, directory: string}>}
 */
function loadCategories(categoriesPath = DEFAULT_CATEGORIES_JSON) {
  if (!fs.existsSync(categoriesPath)) {
    throw new Error(`Arquivo de categorias não encontrado: ${categoriesPath}`);
  }

  const raw = fs.readFileSync(categoriesPath, 'utf-8');
  const parsed = JSON.parse(raw);

  const categories = {};

  if (Array.isArray(parsed)) {
    parsed.forEach(item => {
      if (item && item.slug) {
        categories[item.slug] = {
          slug: item.slug,
          name: item.name || item.slug,
          publicUrl: item.publicUrl || `/${item.slug}.html`,
          directory: item.directory || `tools/${item.slug}`
        };
      }
    });
  } else if (parsed && typeof parsed === 'object') {
    Object.entries(parsed).forEach(([slug, item]) => {
      categories[slug] = {
        slug,
        name: item.name || slug,
        publicUrl: item.publicUrl || `/${slug}.html`,
        directory: item.directory || `tools/${slug}`
      };
    });
  }

  return categories;
}

/**
 * Resolve uma categoria por slug ou nome de exibição.
 *
 * @param {string} categoryInput
 * @param {Record<string, Object>} [categories]
 * @returns {{slug: string, name: string, publicUrl: string, directory: string}|null}
 */
function resolveCategory(categoryInput, categories = null) {
  if (!categoryInput || typeof categoryInput !== 'string') return null;

  const cats = categories || loadCategories();
  const inputNorm = categoryInput.toLowerCase().trim();

  // 1. Busca direta por slug
  if (cats[inputNorm]) {
    return cats[inputNorm];
  }

  // 2. Mapeamentos legados e variações conhecidas
  const legacyAliases = {
    financeiro: 'financas',
    financeira: 'financas',
    trabalho: 'trabalhista',
    saude: 'saude',
    saúde: 'saude',
    matematica: 'matematica',
    matemática: 'matematica',
    utilidade: 'utilidades',
    utilidades: 'utilidades',
    conversor: 'conversores',
    conversores: 'conversores'
  };

  if (legacyAliases[inputNorm] && cats[legacyAliases[inputNorm]]) {
    return cats[legacyAliases[inputNorm]];
  }

  // 3. Busca por nome de exibição insensível a acento/caso
  for (const cat of Object.values(cats)) {
    if (cat.name.toLowerCase() === inputNorm) {
      return cat;
    }
  }

  return null;
}

/**
 * Carrega a lista de ferramentas de data/tools.json.
 *
 * @param {string} [toolsPath]
 * @returns {Array<Object>}
 */
function loadTools(toolsPath = DEFAULT_TOOLS_JSON) {
  if (!fs.existsSync(toolsPath)) {
    throw new Error(`Arquivo de ferramentas não encontrado: ${toolsPath}`);
  }

  const raw = fs.readFileSync(toolsPath, 'utf-8');
  const tools = JSON.parse(raw);

  if (!Array.isArray(tools)) {
    throw new Error(`Conteúdo de ${toolsPath} deve ser um array JSON.`);
  }

  return tools;
}

/**
 * Verifica se uma ferramenta é considerada pública (habilitada para SSG, sitemap, catálogo).
 *
 * Regras:
 * - Legada: status === 'published'
 * - Factory: status === 'published' E formulaStatus === 'verified'
 * - Draft / Review / Deprecated: NUNCA públicas
 *
 * @param {Object} tool
 * @returns {boolean}
 */
function isPublicTool(tool) {
  if (!tool) return false;

  if (isFactoryTool(tool)) {
    return tool.status === 'published' && tool.formulaStatus === 'verified';
  }

  return tool.status === 'published';
}

/**
 * Deriva com segurança URLs e caminhos de arquivo no disco para ferramentas.
 *
 * @param {Object} tool
 * @param {Record<string, Object>} [categories]
 * @returns {Object}
 */
function deriveToolPaths(tool, categories = null) {
  const cats = categories || loadCategories();

  if (isFactoryTool(tool)) {
    const cat = resolveCategory(tool.categorySlug || tool.category, cats);
    const categorySlug = cat ? cat.slug : (tool.categorySlug || tool.category || 'utilidades');
    const relativeUrl = `/tools/${categorySlug}/${tool.id}.html`;
    const relativeOutputPath = `tools/${categorySlug}/${tool.id}.html`;
    const relativeSourcePath = `tools/${categorySlug}/${tool.id}.page.html`;
    const canonical = `${BASE_CANONICAL_DOMAIN}${relativeUrl}`;
    const jsPath = `js/tools/${tool.id}.js`;
    const testPath = `tests/${tool.id}.test.js`;

    return {
      categorySlug,
      categoryName: cat ? cat.name : categorySlug,
      url: relativeUrl,
      relativeOutputPath,
      relativeSourcePath,
      sourceFile: path.join(ROOT_DIR, 'src', 'pages', relativeSourcePath),
      outputFile: path.join(ROOT_DIR, 'dist', relativeOutputPath),
      canonical,
      jsPath,
      testPath
    };
  }

  // Ferramentas legadas
  const cleanUrl = tool.url ? (tool.url.startsWith('/') ? tool.url : `/${tool.url}`) : `/tools/${tool.id}.html`;
  const relativeOutputPath = cleanUrl.replace(/^\/+/, '');
  const canonical = `${BASE_CANONICAL_DOMAIN}${cleanUrl}`;

  return {
    categorySlug: tool.categorySlug || 'utilidades',
    categoryName: tool.category || 'Utilidades',
    url: cleanUrl,
    relativeOutputPath,
    relativeSourcePath: relativeOutputPath.replace(/\.html$/, '.page.html'),
    sourceFile: path.join(ROOT_DIR, 'src', 'pages', relativeOutputPath.replace(/\.html$/, '.page.html')),
    outputFile: path.join(ROOT_DIR, 'dist', relativeOutputPath),
    canonical,
    jsPath: `js/tools/${tool.id}.js`,
    testPath: `tests/${tool.id}.test.js`
  };
}

/**
 * Detecta IDs duplicados na lista de ferramentas.
 *
 * @param {Array<Object>} tools
 * @returns {string[]} Lista de IDs duplicados
 */
function checkDuplicateIds(tools) {
  const seen = new Set();
  const duplicates = new Set();

  for (const tool of tools) {
    if (tool && tool.id) {
      if (seen.has(tool.id)) {
        duplicates.add(tool.id);
      }
      seen.add(tool.id);
    }
  }

  return Array.from(duplicates);
}

/**
 * Retorna somente as ferramentas públicas com caminhos resolvidos.
 * Lança erro defensivo se houver IDs duplicados.
 *
 * @param {Object} [options]
 * @param {string} [options.toolsPath]
 * @param {string} [options.categoriesPath]
 * @returns {Array<Object>}
 */
function getPublicTools({ toolsPath = DEFAULT_TOOLS_JSON, categoriesPath = DEFAULT_CATEGORIES_JSON } = {}) {
  const tools = loadTools(toolsPath);
  const duplicates = checkDuplicateIds(tools);
  if (duplicates.length > 0) {
    throw new Error(`IDs duplicados detectados no catálogo de ferramentas: ${duplicates.join(', ')}`);
  }

  const categories = loadCategories(categoriesPath);

  return tools
    .filter(isPublicTool)
    .map(tool => ({
      ...tool,
      ...deriveToolPaths(tool, categories)
    }));
}

/**
 * Retorna todas as ferramentas com metadados resolvidos.
 *
 * @param {Object} [options]
 * @param {string} [options.toolsPath]
 * @param {string} [options.categoriesPath]
 * @returns {Array<Object>}
 */
function getAllTools({ toolsPath = DEFAULT_TOOLS_JSON, categoriesPath = DEFAULT_CATEGORIES_JSON } = {}) {
  const tools = loadTools(toolsPath);
  const categories = loadCategories(categoriesPath);

  return tools.map(tool => ({
    ...tool,
    ...deriveToolPaths(tool, categories)
  }));
}

module.exports = {
  ROOT_DIR,
  DEFAULT_TOOLS_JSON,
  DEFAULT_CATEGORIES_JSON,
  BASE_CANONICAL_DOMAIN,
  loadCategories,
  resolveCategory,
  loadTools,
  isFactoryTool,
  isPublicTool,
  deriveToolPaths,
  checkDuplicateIds,
  getPublicTools,
  getAllTools
};
