/**
 * Gerador do Catálogo JS - Calculadora Master
 * Compila data/tools.json no arquivo JavaScript consumido pelo frontend e pelos testes: js/tools-catalog.js.
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const TOOLS_JSON_PATH = path.join(ROOT_DIR, 'data', 'tools.json');
const OUTPUT_JS_PATH = path.join(ROOT_DIR, 'js', 'tools-catalog.js');

function generateCatalog() {
  if (!fs.existsSync(TOOLS_JSON_PATH)) {
    console.error(`ERRO: Arquivo ${TOOLS_JSON_PATH} não encontrado.`);
    process.exit(1);
  }

  const raw = fs.readFileSync(TOOLS_JSON_PATH, 'utf-8');
  const tools = JSON.parse(raw);

  // Mapeia para o formato compatível com o catálogo JS e a Home
  const catalogItems = tools
    .filter(tool => tool.status === 'published')
    .map(tool => ({
      id: tool.id,
      slug: tool.slug || tool.id,
      nome: tool.name,
      name: tool.name,
      categoria: tool.category,
      category: tool.category,
      categorySlug: tool.categorySlug,
      descricao: tool.description,
      description: tool.description,
      url: tool.url.replace(/^\/+/, ''),
      termos: tool.keywords || [],
      keywords: tool.keywords || [],
      destaque: Boolean(tool.featured),
      featured: Boolean(tool.featured),
      related: tool.related || [],
      status: tool.status
    }));

  const itemsJson = JSON.stringify(catalogItems, null, 2)
    .split('\n')
    .map((line, idx) => (idx === 0 ? line : '  ' + line))
    .join('\n');

  const fileContent = `/**
 * Catálogo Central de Ferramentas - Calculadora Master
 * ATENÇÃO: Arquivo gerado automaticamente a partir de data/tools.json.
 * NÃO edite este arquivo manualmente. Utilize o script "npm run generate:catalog".
 */

const TOOLS_CATALOG = ${itemsJson};

/**
 * Remove acentos e normaliza texto para busca case-insensitive e insensível a acentos.
 */
function normalizeSearchText(text) {
  if (!text) return "";
  return text
    .toString()
    .normalize("NFD")
    .replace(/[\\u0300-\\u036f]/g, "")
    .toLowerCase()
    .trim();
}

/**
 * Verifica se um token casa com o início de alguma palavra no texto-fonte.
 */
function matchesWordBoundary(sourceText, token) {
  if (!sourceText || !token) return false;
  const escaped = token.replace(/[-\\/\\\\^$*+?.()|[\\]{}]/g, "\\\\$&");
  const regex = new RegExp("(?:^|[^a-z0-9])" + escaped, "i");
  return regex.test(sourceText);
}

/**
 * Pesquisa no catálogo considerando nome, categoria, descrição e termos alternativos.
 */
function searchToolsCatalog(query) {
  const cleanQuery = normalizeSearchText(query);
  if (!cleanQuery) return [];

  const tokens = cleanQuery.split(/\\s+/).filter(Boolean);
  const scored = [];

  for (const tool of TOOLS_CATALOG) {
    const nomeNorm = normalizeSearchText(tool.nome || tool.name);
    const catNorm = normalizeSearchText(tool.categoria || tool.category);
    const descNorm = normalizeSearchText(tool.descricao || tool.description);
    const termosNorm = (tool.termos || tool.keywords || []).map(normalizeSearchText);

    // Todos os tokens da busca devem dar match em alguma palavra do nome, categoria, descrição ou termos
    const matchesAll = tokens.every(token => {
      return (
        matchesWordBoundary(nomeNorm, token) ||
        matchesWordBoundary(catNorm, token) ||
        matchesWordBoundary(descNorm, token) ||
        termosNorm.some(t => matchesWordBoundary(t, token))
      );
    });

    if (matchesAll) {
      let score = 0;

      // Correspondência exata no nome
      if (nomeNorm === cleanQuery) score += 500;
      else if (matchesWordBoundary(nomeNorm, cleanQuery)) score += 300;
      else if (nomeNorm.includes(cleanQuery)) score += 150;

      // Correspondência em termos-chave
      if (termosNorm.some(t => t === cleanQuery)) score += 400;
      else if (termosNorm.some(t => matchesWordBoundary(t, cleanQuery))) score += 250;

      // Correspondência de categoria
      if (catNorm === cleanQuery) score += 200;
      else if (matchesWordBoundary(catNorm, cleanQuery)) score += 100;

      // Correspondência na descrição
      if (matchesWordBoundary(descNorm, cleanQuery)) score += 50;

      // Tokens individuais
      for (const token of tokens) {
        if (matchesWordBoundary(nomeNorm, token)) score += 60;
        if (termosNorm.some(t => matchesWordBoundary(t, token))) score += 40;
      }

      // Bônus sutil para ferramentas em destaque para desempate
      if (tool.destaque || tool.featured) score += 5;

      scored.push({ tool, score });
    }
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.map(item => item.tool);
}

/**
 * Retorna uma ferramenta do catálogo pelo seu ID.
 */
function getToolById(id) {
  return TOOLS_CATALOG.find(tool => tool.id === id) || null;
}

/**
 * Retorna as ferramentas relacionadas de uma ferramenta pelo seu ID.
 */
function getRelatedTools(toolId) {
  const current = getToolById(toolId);
  if (!current || !Array.isArray(current.related)) return [];
  return current.related
    .map(relId => getToolById(relId))
    .filter(Boolean);
}

/**
 * Preparação de arquitetura de eventos analíticos (sem acionar GA4 diretamente nesta etapa)
 */
function trackToolSearch(query, resultCount) {
  // Hook reservado para futura integração com GA4:
  // gtag("event", "tool_search", { search_term: query, results_count: resultCount });
}

function trackToolResultClick(toolName, url) {
  // Hook reservado para futura integração com GA4:
  // gtag("event", "tool_search_result_click", { tool_name: toolName, tool_url: url });
}

// Exportação segura para ambiente de browser e Node.js
if (typeof window !== "undefined") {
  window.TOOLS_CATALOG = TOOLS_CATALOG;
  window.normalizeSearchText = normalizeSearchText;
  window.searchToolsCatalog = searchToolsCatalog;
  window.getToolById = getToolById;
  window.getRelatedTools = getRelatedTools;
  window.trackToolSearch = trackToolSearch;
  window.trackToolResultClick = trackToolResultClick;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    TOOLS_CATALOG,
    normalizeSearchText,
    searchToolsCatalog,
    getToolById,
    getRelatedTools,
    trackToolSearch,
    trackToolResultClick
  };
}
`;

  // Salva preservando estritamente CRLF
  const crlfContent = fileContent.replace(/\r\n/g, '\n').replace(/\n/g, '\r\n');
  fs.writeFileSync(OUTPUT_JS_PATH, crlfContent, 'utf-8');

  console.log(`✓ js/tools-catalog.js gerado com sucesso a partir de ${tools.length} ferramentas (${catalogItems.length} publicadas).`);
}

generateCatalog();
