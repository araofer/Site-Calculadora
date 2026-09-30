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
 * Escapa caracteres especiais HTML para prevenir XSS.
 * Trata rigorosamente: &, <, >, ", '
 *
 * @param {string|null|undefined} str
 * @returns {string}
 */
function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Sanitiza e valida URLs de ferramentas para inclusão segura em atributos href.
 * Rejeita esquemas perigosos (javascript:, data:, vbscript:, file:, etc.),
 * URLs relativas a protocolo (//), entidades HTML (&), percent-encoding (%),
 * aspas, delimitadores, quebras de linha e caracteres maliciosos.
 *
 * Preserva exclusivamente caminhos relativos válidos compatíveis com ROOT_PREFIX.
 *
 * @param {string|null|undefined} url
 * @returns {string|null} Caminho relativo sanitizado (sem barra inicial) ou null se inválido
 */
function sanitizeToolUrl(url) {
  if (!url || typeof url !== 'string') return null;

  // Rejeita espaços ou caracteres de controle em qualquer posição
  if (/[\x00-\x20\x7F-\x9F]/.test(url)) {
    return null;
  }

  // Rejeita entidades HTML (&), percent-encoding (%), aspas, delimitadores e caracteres de esquema
  if (/[&%"'<>`\\:]/.test(url)) {
    return null;
  }

  // Rejeita URLs relativas a protocolo (//)
  if (url.startsWith('//')) {
    return null;
  }

  // Remove barras iniciais para integração correta com ROOT_PREFIX
  const relPath = url.replace(/^\/+/, '');

  // Caminho resultante não pode ser vazio, nem iniciar com barra ou ponto
  if (!relPath || relPath.startsWith('/') || relPath.startsWith('.')) {
    return null;
  }

  // Validação estrita de caminho seguro: segmentos alfanuméricos com hífens/underscores e extensão opcional
  if (!/^[a-zA-Z0-9_-]+(?:\/[a-zA-Z0-9_-]+)*(?:\.[a-zA-Z0-9]+)?$/.test(relPath)) {
    return null;
  }

  return relPath;
}

/**
 * Verifica se uma tag HTML contém uma classe CSS específica como token isolado (separado por espaços).
 * Evita falsos positivos com sufixos/prefixos hifenizados (ex: 'header-grid' não casa com 'grid').
 *
 * @param {string} tagString Texto da tag HTML
 * @param {string} className Nome da classe CSS a localizar
 * @returns {boolean}
 */
function hasCssClass(tagString, className) {
  if (!tagString || !className) return false;
  const match = tagString.match(/class\s*=\s*(?:"([^"]*)"|'([^']*)')/i);
  if (!match) return false;
  const classes = (match[1] || match[2] || '').trim().split(/\s+/);
  return classes.includes(className);
}

/**
 * Localiza os limites (início e fim das tags de abertura e fechamento)
 * de um contêiner <div> no documento HTML via máquina de estados linear (O(N)),
 * rastreando aninhamento (depth) e ignorando rigorosamente comentários HTML
 * (incluindo HTML5 <!-- ... --!>), blocos CDATA, DOCTYPE e blocos <script>/<style>.
 *
 * @param {string} html Conteúdo HTML completo
 * @param {function(string): boolean} isTargetOpenTag Predicado que identifica a tag de abertura desejada
 * @returns {{ openTagStart: number, openTagEnd: number, closeTagStart: number, closeTagEnd: number } | null}
 */
function findContainerBounds(html, isTargetOpenTag) {
  if (!html || typeof html !== 'string' || typeof isTargetOpenTag !== 'function') {
    return null;
  }

  let i = 0;
  const n = html.length;
  let inside = false;
  let depth = 0;
  let openTagStart = -1;
  let openTagEnd = -1;

  while (i < n) {
    // 1. Comentários HTML: <!-- ... --> e HTML5 <!-- ... --!>
    if (html.startsWith('<!--', i)) {
      let endIdx = html.indexOf('-->', i + 4);
      const endBangIdx = html.indexOf('--!>', i + 4);
      if (endBangIdx !== -1 && (endIdx === -1 || endBangIdx < endIdx)) {
        endIdx = endBangIdx + 1; // --!> tem 4 caracteres, endIdx + 3 torna-se endBangIdx + 4
      }
      if (endIdx === -1) {
        break; // Comentário não-fechado estende-se até o fim do documento
      }
      i = endIdx + 3;
      continue;
    }

    // 2. Blocos CDATA: <![CDATA[ ... ]]>
    if (html.startsWith('<![CDATA[', i)) {
      const endCdata = html.indexOf(']]>', i + 9);
      i = (endCdata === -1) ? n : endCdata + 3;
      continue;
    }

    // 3. Comentários bogus / declarações DOCTYPE: <! ... > ou <? ... >
    if (html.startsWith('<!', i) || html.startsWith('<?', i)) {
      const endBogus = html.indexOf('>', i + 2);
      i = (endBogus === -1) ? n : endBogus + 1;
      continue;
    }

    // 4. Elementos HTML: < ... >
    if (html[i] === '<') {
      const tagStart = i;
      i++;

      const isClose = (i < n && html[i] === '/');
      if (isClose) i++;

      // Nome da tag
      const nameStart = i;
      while (i < n && /[a-zA-Z0-9-]/.test(html[i])) {
        i++;
      }
      const tagName = html.slice(nameStart, i).toLowerCase();

      // Ignora blocos de texto bruto de <script> ou <style> (não processa HTML interno)
      if (!isClose && (tagName === 'script' || tagName === 'style')) {
        while (i < n && html[i] !== '>') i++;
        if (i < n) i++;
        const closeTagStr = '</' + tagName + '>';
        const closeIdx = html.toLowerCase().indexOf(closeTagStr, i);
        i = (closeIdx !== -1) ? closeIdx + closeTagStr.length : n;
        continue;
      }

      // Lê atributos até o fechamento > (respeitando aspas simples e duplas)
      let inQuote = null;
      let selfClosing = false;
      while (i < n) {
        const c = html[i];
        if (inQuote) {
          if (c === inQuote) inQuote = null;
        } else {
          if (c === '"' || c === "'") {
            inQuote = c;
          } else if (c === '>') {
            if (i > 0 && html[i - 1] === '/') selfClosing = true;
            i++;
            break;
          }
        }
        i++;
      }
      const tagEnd = i;
      const fullTag = html.slice(tagStart, tagEnd);

      if (tagName !== 'div') {
        continue;
      }

      if (!inside) {
        if (!isClose && isTargetOpenTag(fullTag)) {
          inside = true;
          depth = 1;
          openTagStart = tagStart;
          openTagEnd = tagEnd;
        }
      } else {
        if (isClose) {
          depth--;
          if (depth === 0) {
            return {
              openTagStart,
              openTagEnd,
              closeTagStart: tagStart,
              closeTagEnd: tagEnd
            };
          }
        } else if (!selfClosing) {
          depth++;
        }
      }
      continue;
    }

    i++;
  }

  return null;
}

/**
 * Injeta os cards das ferramentas Factory na seção grid da página de categoria,
 * preservando a ordem, ferramentas legadas, escapando valores e garantindo que não existam duplicatas.
 *
 * @param {string} content Conteúdo HTML da página de categoria
 * @param {Array<Object>} factoryTools Lista de ferramentas Factory a injetar
 * @returns {string}
 */
function injectCategoryToolCards(content, factoryTools) {
  if (!content || !Array.isArray(factoryTools) || factoryTools.length === 0) {
    return content;
  }

  const bounds = findContainerBounds(content, tag => /data-category-grid/i.test(tag) || hasCssClass(tag, 'grid'));
  if (!bounds) {
    return content;
  }

  const existingInside = content.slice(bounds.openTagEnd, bounds.closeTagStart);

  // Deduplicação e sanitização: filtra ferramentas com URL segura e não presente
  const toolsToAdd = factoryTools.filter(tool => {
    if (!tool || !tool.url) return false;
    const safeUrl = sanitizeToolUrl(tool.url);
    if (!safeUrl) return false;
    return !existingInside.includes(safeUrl);
  });

  if (toolsToAdd.length === 0) {
    return content;
  }

  const cardsHtml = toolsToAdd.map(tool => {
    const safeUrl = escapeHtml(sanitizeToolUrl(tool.url));
    const escapedName = escapeHtml(tool.name);
    const escapedDesc = escapeHtml(tool.description || '');
    const titleAttr = escapedDesc ? ` title="${escapedDesc}"` : '';
    return `        <a href="{{ROOT_PREFIX}}${safeUrl}" class="card"${titleAttr}>${escapedName}</a>`;
  }).join('\n');

  const trimmedInside = existingInside.replace(/\s+$/, '');
  const updatedInside = trimmedInside ? `${trimmedInside}\n${cardsHtml}` : `\n${cardsHtml}`;
  return content.slice(0, bounds.openTagEnd) + updatedInside + '\n      ' + content.slice(bounds.closeTagStart);
}

/**
 * Retorna todas as ferramentas Factory públicas (published + verified).
 * Ferramentas em draft, review ou deprecated NUNCA são retornadas.
 * Ferramentas legadas NUNCA são retornadas.
 *
 * @param {Object} [options]
 * @param {Array<Object>} [options.tools]
 * @param {string} [options.toolsPath]
 * @returns {Array<Object>}
 */
function getAllPublicFactoryTools({
  tools = null,
  toolsPath = undefined
} = {}) {
  const toolList = tools || loadTools(toolsPath);

  return toolList.filter(tool => {
    if (!isFactoryTool(tool)) return false;
    return isPublicTool(tool);
  });
}

/**
 * Injeta os cards das ferramentas Factory na seção "Todas as Ferramentas" da Home,
 * preservando a ordem, ferramentas legadas, escapando valores contra XSS e garantindo ausência de duplicatas.
 *
 * @param {string} content Conteúdo HTML da página inicial
 * @param {Array<Object>} factoryTools Lista de ferramentas Factory a injetar
 * @returns {string}
 */
function injectHomeToolCards(content, factoryTools) {
  if (!content || !Array.isArray(factoryTools) || factoryTools.length === 0) {
    return content;
  }

  // Localiza o container da grade "Todas as Ferramentas"
  // Prioridade: data-tools-grid="all" ou classe tools-cards-grid
  const bounds = findContainerBounds(content, tag => /data-tools-grid="all"/i.test(tag) || hasCssClass(tag, 'tools-cards-grid'));
  if (!bounds) {
    return content;
  }

  const existingInside = content.slice(bounds.openTagEnd, bounds.closeTagStart);

  // Deduplicação e sanitização: filtra ferramentas com URL segura e não presente
  const toolsToAdd = factoryTools.filter(tool => {
    if (!tool || !tool.url) return false;
    const safeUrl = sanitizeToolUrl(tool.url);
    if (!safeUrl) return false;
    return !existingInside.includes(safeUrl);
  });

  if (toolsToAdd.length === 0) {
    return content;
  }

  const cardsHtml = toolsToAdd.map(tool => {
    const safeUrl = escapeHtml(sanitizeToolUrl(tool.url));
    const escapedCategory = escapeHtml(tool.category || 'Geral');
    const escapedName = escapeHtml(tool.name);
    const escapedDesc = escapeHtml(tool.description || '');
    return `        <article class="tool-card">
          <div class="tool-card-header">
            <span class="tool-card-category">${escapedCategory}</span>
          </div>
          <h3 class="tool-card-title">${escapedName}</h3>
          <p class="tool-card-desc">${escapedDesc}</p>
          <div class="tool-card-footer">
            <a href="{{ROOT_PREFIX}}${safeUrl}" class="tool-card-btn">Calcular agora &rarr;</a>
          </div>
        </article>`;
  }).join('\n\n');

  const trimmedInside = existingInside.replace(/\s+$/, '');
  const updatedInside = trimmedInside ? `${trimmedInside}\n\n${cardsHtml}` : `\n\n${cardsHtml}`;
  return content.slice(0, bounds.openTagEnd) + updatedInside + '\n      ' + content.slice(bounds.closeTagStart);
}

module.exports = {
  escapeHtml,
  sanitizeToolUrl,
  hasCssClass,
  findContainerBounds,
  assertPublicFactoryIntegrity,
  discoverPublicFactoryTools,
  getPublicFactoryToolsForCategory,
  injectCategoryToolCards,
  getAllPublicFactoryTools,
  injectHomeToolCards
};
