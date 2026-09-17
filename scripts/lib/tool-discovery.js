/**
 * Tool Discovery - Calculadora Master
 * Localiza, valida e expõe ferramentas Factory para o motor SSG e pipeline de build.
 * Garante que ferramentas em draft/review/deprecated NUNCA entrem no build público,
 * e que ferramentas publicadas possuam rigorosamente todos os artefatos obrigatórios.
 * Zero dependências externas.
 */

const fs = require('fs');
const path = require('path');

const {
  ROOT_DIR,
  loadTools,
  loadCategories,
  resolveCategory,
  isFactoryTool,
  isPublicTool,
  deriveToolPaths
} = require('./tool-registry.js');

const { validateToolSchema } = require('./tool-schema.js');

/**
 * Valida os artefatos físicos de uma ferramenta factory pública.
 * Lança erro explícito se faltar algum componente obrigatório no disco.
 *
 * @param {Object} tool
 * @param {Object} options
 * @param {string} [options.rootDir]
 * @param {Record<string, Object>} [options.categories]
 */
function assertPublicFactoryIntegrity(tool, { rootDir = ROOT_DIR, categories = null } = {}) {
  const paths = deriveToolPaths(tool, categories);

  // 1. Validação de esquema estrito
  const schemaResult = validateToolSchema(tool, {
    validCategories: categories ? Object.keys(categories) : undefined
  });
  if (!schemaResult.valid) {
    throw new Error(`Integridade Factory violada para "${tool.id}": ${schemaResult.errors.join('; ')}`);
  }

  // 2. formulaStatus deve ser verified para publicação
  if (tool.formulaStatus !== 'verified') {
    throw new Error(
      `Ferramenta factory publicada "${tool.id}" possui formulaStatus inválido: "${tool.formulaStatus}". Exige "verified".`
    );
  }

  // 3. Existência da página fonte .page.html
  const absoluteSource = path.join(rootDir, 'src', 'pages', paths.relativeSourcePath);

  if (!fs.existsSync(absoluteSource)) {
    throw new Error(
      `Página fonte obrigatória não encontrada para ferramenta factory publicada "${tool.id}": ${absoluteSource}`
    );
  }

  // 4. Existência do módulo JS da ferramenta
  const absoluteJs = path.join(rootDir, paths.jsPath);
  if (!fs.existsSync(absoluteJs)) {
    throw new Error(
      `Módulo JavaScript obrigatório não encontrado para ferramenta factory publicada "${tool.id}": ${absoluteJs}`
    );
  }

  // 5. Existência do artigo fonte quando declarado
  if (tool.article) {
    const articleRel = tool.article.replace(/^\//, '');
    const articleSource = path.join(rootDir, 'src', 'pages', articleRel.replace(/\.html$/, '.page.html'));
    if (!fs.existsSync(articleSource)) {
      throw new Error(
        `Artigo fonte obrigatório não encontrado para ferramenta factory publicada "${tool.id}": ${articleSource}`
      );
    }
  }
}

/**
 * Descobre todas as páginas e assets de ferramentas Factory que estão aprovadas para build público.
 * Ferramentas em draft, review ou deprecated são sumariamente ignoradas do build público.
 *
 * @param {Object} [options]
 * @param {string} [options.rootDir]
 * @param {Array<Object>} [options.tools]
 * @param {string} [options.toolsPath]
 * @param {Record<string, Object>} [options.categories]
 * @param {string} [options.categoriesPath]
 * @returns {{pages: Array<{sourceFile: string, relativeOutputPath: string, tool: Object}>, assets: Array<{src: string, dest: string}>, articlePages: Array<{sourceFile: string, relativeOutputPath: string}>}}
 */
function discoverPublicFactoryTools({
  rootDir = ROOT_DIR,
  tools = null,
  toolsPath = undefined,
  categories = null,
  categoriesPath = undefined
} = {}) {
  const toolList = tools || loadTools(toolsPath);
  const catMap = categories || loadCategories(categoriesPath);

  const factoryTools = toolList.filter(isFactoryTool);

  const pages = [];
  const assets = [];
  const articlePages = [];

  for (const tool of factoryTools) {
    // Draft, review e deprecated NUNCA entram no build público
    if (!isPublicTool(tool)) {
      continue;
    }

    // Ferramentas published DEVEM ser estritamente válidas
    assertPublicFactoryIntegrity(tool, { rootDir, categories: catMap });

    const paths = deriveToolPaths(tool, catMap);
    const sourceFile = path.join(rootDir, 'src', 'pages', paths.relativeSourcePath);

    pages.push({
      sourceFile,
      relativeOutputPath: paths.relativeOutputPath,
      tool
    });

    assets.push({
      src: paths.jsPath,
      dest: paths.jsPath
    });

    // Artigo editorial vinculado
    if (tool.article) {
      const articleRel = tool.article.replace(/^\//, '');
      const articleSource = path.join(rootDir, 'src', 'pages', articleRel.replace(/\.html$/, '.page.html'));
      if (fs.existsSync(articleSource)) {
        articlePages.push({
          sourceFile: articleSource,
          relativeOutputPath: articleRel
        });
      }
    }
  }

  // Descoberta de cálculos compartilhados utilizados por ferramentas públicas
  const calcDir = path.join(rootDir, 'js', 'core', 'calculations');
  if (fs.existsSync(calcDir) && factoryTools.some(isPublicTool)) {
    const calcFiles = fs.readdirSync(calcDir).filter(f => f.endsWith('.js')).sort();
    for (const f of calcFiles) {
      const relPath = path.join('js', 'core', 'calculations', f).replace(/\\/g, '/');
      assets.push({
        src: relPath,
        dest: relPath
      });
    }
  }

  return { pages, assets, articlePages };
}

/**
 * Retorna as ferramentas Factory públicas (published + verified) que pertencem a uma categoria específica.
 * Ferramentas em draft, review ou deprecated NUNCA são retornadas.
 * Ferramentas de outras categorias NUNCA são retornadas.
 * Ferramentas legadas NUNCA são retornadas.
 *
 * @param {string} categoryIdentifier Slug da categoria, nome ou caminho relativo da página (ex: 'financas', 'financeira.html', 'matematica')
 * @param {Object} [options]
 * @param {Array<Object>} [options.tools]
 * @param {string} [options.toolsPath]
 * @param {Record<string, Object>} [options.categories]
 * @param {string} [options.categoriesPath]
 * @param {Object} [options.meta] Metadados frontmatter opcionais da página
 * @returns {Array<Object>}
 */
function getPublicFactoryToolsForCategory(categoryIdentifier, {
  tools = null,
  toolsPath = undefined,
  categories = null,
  categoriesPath = undefined,
  meta = null
} = {}) {
  const catMap = categories || loadCategories(categoriesPath);
  const toolList = tools || loadTools(toolsPath);

  // 1. Identifica a categoria alvo
  let targetCat = null;

  // Frontmatter explícito tem prioridade quando fornecido
  if (meta) {
    if (meta.categorySlug && catMap[meta.categorySlug]) {
      targetCat = catMap[meta.categorySlug];
    } else if (meta.category) {
      targetCat = resolveCategory(meta.category, catMap);
    }
  }

  if (!targetCat && categoryIdentifier) {
    const cleanId = String(categoryIdentifier).trim().replace(/^\/+/, '').replace(/\.html$/, '');

    // Tentativa 1: resolve por slug ou alias
    targetCat = resolveCategory(cleanId, catMap);

    // Tentativa 2: busca por publicUrl exata
    if (!targetCat) {
      const normUrl = '/' + String(categoryIdentifier).trim().replace(/^\/+/, '');
      for (const cat of Object.values(catMap)) {
        if (cat.publicUrl === normUrl) {
          targetCat = cat;
          break;
        }
      }
    }
  }

  if (!targetCat) {
    return [];
  }

  // 2. Filtra ferramentas da Factory estritamente públicas que correspondam à categoria
  return toolList.filter(tool => {
    // Apenas Factory
    if (!isFactoryTool(tool)) return false;

    // Regra estrita: status === 'published' E formulaStatus === 'verified'
    // draft, review e deprecated NUNCA passam
    if (!isPublicTool(tool)) return false;

    // Resolução da categoria da ferramenta
    const toolCatSlug = tool.categorySlug ? tool.categorySlug.toLowerCase().trim() : '';
    const toolResolvedCat = resolveCategory(toolCatSlug || tool.category, catMap);
    if (!toolResolvedCat) return false;

    // Correspondência por slug ou por publicUrl da categoria
    return toolResolvedCat.slug === targetCat.slug || toolResolvedCat.publicUrl === targetCat.publicUrl;
  });
}

/**
 * Injeta os cards das ferramentas Factory na seção grid da página de categoria,
 * preservando a ordem, ferramentas legadas e garantindo que não existam duplicatas.
 *
 * @param {string} content Conteúdo HTML da página de categoria
 * @param {Array<Object>} factoryTools Lista de ferramentas Factory a injetar
 * @returns {string}
 */
function injectCategoryToolCards(content, factoryTools) {
  if (!content || !Array.isArray(factoryTools) || factoryTools.length === 0) {
    return content;
  }

  // Deduplicação: filtra ferramentas cujo link ou URL relativa já esteja no conteúdo
  const toolsToAdd = factoryTools.filter(tool => {
    if (!tool || !tool.url) return false;
    const relUrl = tool.url.replace(/^\/+/, '');
    return !content.includes(relUrl);
  });

  if (toolsToAdd.length === 0) {
    return content;
  }

  const cardsHtml = toolsToAdd.map(tool => {
    const relUrl = tool.url.replace(/^\/+/, '');
    return `        <a href="{{ROOT_PREFIX}}${relUrl}" class="card">${tool.name}</a>`;
  }).join('\n');

  // Insere antes do fechamento de <div class="grid">
  const gridRegex = /(<div\s+class="grid">)([\s\S]*?)(<\/div>)/;
  const match = content.match(gridRegex);
  if (match) {
    const existingContent = match[2].replace(/\s+$/, '');
    const updatedGrid = `${match[1]}${existingContent}\n${cardsHtml}\n      ${match[3]}`;
    return content.replace(gridRegex, updatedGrid);
  }

  return content;
}

module.exports = {
  assertPublicFactoryIntegrity,
  discoverPublicFactoryTools,
  getPublicFactoryToolsForCategory,
  injectCategoryToolCards
};
