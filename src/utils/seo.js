/**
 * Utilitário de SEO e Geração de Dados Estruturados (JSON-LD) - Calculadora Master
 * Executado estritamente em tempo de build (zero JavaScript de runtime).
 * Padrão Schema.org com serialização segura e sem dados fictícios.
 */

const fs = require('fs');
const path = require('path');

const BASE_URL = 'https://www.calculadoramaster.com';

const CATEGORY_MAP = {
  financas: {
    name: 'Financeira',
    slug: 'financas',
    url: `${BASE_URL}/financeira.html`
  },
  matematica: {
    name: 'Matemática',
    slug: 'matematica',
    url: `${BASE_URL}/matematica.html`
  },
  saude: {
    name: 'Saúde',
    slug: 'saude',
    url: `${BASE_URL}/saude.html`
  },
  trabalhista: {
    name: 'Trabalhista',
    slug: 'trabalhista',
    url: `${BASE_URL}/trabalhista.html`
  },
  utilidades: {
    name: 'Utilidades',
    slug: 'utilidades',
    url: `${BASE_URL}/conversores.html`
  }
};

/**
 * Constrói o schema WebApplication para uma ferramenta individual.
 *
 * @param {Object} tool Objeto da ferramenta em data/tools.json
 * @param {string} [canonicalUrl] URL canônica exata da página
 * @returns {Object|null}
 */
function buildToolJsonLd(tool, canonicalUrl) {
  if (!tool || !tool.name || !tool.description) return null;

  const url = canonicalUrl || (tool.url ? (tool.url.startsWith('http') ? tool.url : `${BASE_URL}${tool.url.startsWith('/') ? '' : '/'}${tool.url}`) : '');

  return {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: tool.name.trim(),
    description: tool.description.trim(),
    url,
    applicationCategory: tool.category || 'UtilitiesApplication',
    operatingSystem: 'Any'
  };
}

/**
 * Constrói a lista de Breadcrumbs conforme Schema.org BreadcrumbList.
 *
 * @param {Array<{name: string, url: string}>} items Lista ordenada de itens
 * @returns {Object|null}
 */
function buildBreadcrumbJsonLd(items) {
  if (!Array.isArray(items) || items.length === 0) return null;

  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url
    }))
  };
}

/**
 * Constrói o grafo completo de JSON-LD para uma página de calculadora (WebApplication + BreadcrumbList).
 *
 * @param {Object} tool Objeto da ferramenta em data/tools.json
 * @param {string} [canonicalUrl] URL canônica exata da página
 * @returns {Object|null}
 */
function buildToolPageJsonLd(tool, canonicalUrl) {
  const toolObj = buildToolJsonLd(tool, canonicalUrl);
  if (!toolObj) return null;

  const cat = CATEGORY_MAP[tool.categorySlug] || { name: tool.category || 'Ferramentas', url: `${BASE_URL}/` };
  const toolUrl = canonicalUrl || toolObj.url;

  const breadcrumbObj = buildBreadcrumbJsonLd([
    { name: 'Calculadora Master', url: `${BASE_URL}/` },
    { name: cat.name, url: cat.url },
    { name: tool.name.trim(), url: toolUrl }
  ]);

  const toolNode = { ...toolObj };
  delete toolNode['@context'];

  const breadcrumbNode = { ...breadcrumbObj };
  delete breadcrumbNode['@context'];

  return {
    '@context': 'https://schema.org',
    '@graph': [
      toolNode,
      breadcrumbNode
    ]
  };
}

/**
 * Constrói o schema WebSite para a Home Page.
 *
 * @returns {Object}
 */
function buildHomeJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Calculadora Master',
    url: `${BASE_URL}/`,
    description: 'Calculadoras e ferramentas online gratuitas para finanças, saúde, matemática, trabalho e conversões no dia a dia.'
  };
}

/**
 * Constrói o schema de página de categoria (CollectionPage + BreadcrumbList).
 *
 * @param {string} catSlug Slug da categoria
 * @param {Object} meta Metadados frontmatter da página
 * @returns {Object|null}
 */
function buildCategoryJsonLd(catSlug, meta = {}) {
  const cat = CATEGORY_MAP[catSlug];
  if (!cat) return null;

  const pageUrl = cat.url;
  const pageName = meta.title ? meta.title.split('|')[0].trim() : cat.name;

  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'CollectionPage',
        name: pageName,
        description: meta.description || '',
        url: pageUrl
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          {
            '@type': 'ListItem',
            position: 1,
            name: 'Calculadora Master',
            item: `${BASE_URL}/`
          },
          {
            '@type': 'ListItem',
            position: 2,
            name: cat.name,
            item: pageUrl
          }
        ]
      }
    ]
  };
}

/**
 * Constrói o schema AboutPage para a página Sobre.
 *
 * @param {Object} meta
 * @returns {Object}
 */
function buildAboutJsonLd(meta = {}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'AboutPage',
    name: meta.title ? meta.title.split('|')[0].trim() : 'Sobre Nós',
    description: meta.description || '',
    url: meta.canonical || `${BASE_URL}/sobre.html`
  };
}

/**
 * Constrói o schema ContactPage para a página de Contato.
 *
 * @param {Object} meta
 * @returns {Object}
 */
function buildContactJsonLd(meta = {}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ContactPage',
    name: meta.title ? meta.title.split('|')[0].trim() : 'Contato',
    description: meta.description || '',
    url: meta.canonical || `${BASE_URL}/contato.html`
  };
}

/**
 * Constrói o schema WebPage genérico para páginas institucionais indexáveis.
 *
 * @param {Object} meta
 * @returns {Object}
 */
function buildWebPageJsonLd(meta = {}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: meta.title ? meta.title.split('|')[0].trim() : 'Institucional',
    description: meta.description || '',
    url: meta.canonical || ''
  };
}

/**
 * Constrói o schema BlogPosting para artigos do blog acompanhado de BreadcrumbList.
 * Suporta headline, description, url, mainEntityOfPage, image, author (Person), datePublished e dateModified.
 * Nunca inventa datas ou autores não declarados.
 *
 * @param {Object} meta Metadados do artigo
 * @returns {Object|null}
 */
function buildBlogPostJsonLd(meta = {}) {
  if (!meta || !meta.canonical) return null;

  const headline = meta.headline || (meta.title ? meta.title.split('|')[0].trim() : '');
  const url = meta.canonical;
  const rawImage = meta.image || meta.ogImage || '';
  const imageUrl = rawImage ? (rawImage.startsWith('http') ? rawImage : `${BASE_URL}${rawImage.startsWith('/') ? '' : '/'}${rawImage}`) : '';

  const postNode = {
    '@type': 'BlogPosting',
    headline,
    description: meta.description || '',
    url,
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': url
    }
  };

  if (imageUrl) {
    postNode.image = imageUrl;
  }

  // Autor: estritamente como Person com nome público confirmado (Arão Ferreira)
  const authorName = (meta.author && typeof meta.author === 'string' && meta.author.trim())
    ? meta.author.trim()
    : 'Arão Ferreira';

  postNode.author = {
    '@type': 'Person',
    name: authorName
  };

  // Datas: estritamente em ISO 8601 quando fornecidas explicitamente no frontmatter
  if (meta.datePublished && typeof meta.datePublished === 'string' && meta.datePublished.trim()) {
    postNode.datePublished = meta.datePublished.trim();
  }
  if (meta.dateModified && typeof meta.dateModified === 'string' && meta.dateModified.trim()) {
    postNode.dateModified = meta.dateModified.trim();
  }

  // Breadcrumb: Calculadora Master -> Blog -> Artigo
  const breadcrumbObj = buildBreadcrumbJsonLd([
    { name: 'Calculadora Master', url: `${BASE_URL}/` },
    { name: 'Blog', url: `${BASE_URL}/blog/index.html` },
    { name: headline, url }
  ]);

  const breadcrumbNode = { ...breadcrumbObj };
  delete breadcrumbNode['@context'];

  return {
    '@context': 'https://schema.org',
    '@graph': [
      postNode,
      breadcrumbNode
    ]
  };
}

/**
 * Constrói o schema CollectionPage para o índice do blog com BreadcrumbList.
 *
 * @param {Object} meta
 * @returns {Object}
 */
function buildBlogIndexJsonLd(meta = {}) {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'CollectionPage',
        name: meta.title ? meta.title.split('|')[0].trim() : 'Blog Calculadora Master',
        description: meta.description || '',
        url: `${BASE_URL}/blog/index.html`
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          {
            '@type': 'ListItem',
            position: 1,
            name: 'Calculadora Master',
            item: `${BASE_URL}/`
          },
          {
            '@type': 'ListItem',
            position: 2,
            name: 'Blog',
            item: `${BASE_URL}/blog/index.html`
          }
        ]
      }
    ]
  };
}

/**
 * Resolve o objeto de dados estruturados apropriado para qualquer página do SSG.
 * Retorna null para páginas que não devem receber JSON-LD (login, cadastro, 404, etc).
 *
 * @param {Object} options
 * @param {string} options.relativeOutputPath Caminho de saída (ex: 'tools/financas/juros.html')
 * @param {Object} options.meta Metadados frontmatter
 * @param {Array<Object>} [options.tools] Lista de ferramentas de data/tools.json
 * @returns {Object|null}
 */
function getPageJsonLd({ relativeOutputPath, meta = {}, tools = [] }) {
  // Páginas noindex ou páginas de autenticação/erro não recebem JSON-LD
  if (meta.robots && meta.robots.includes('noindex')) {
    return null;
  }
  if (
    relativeOutputPath === 'login.html' ||
    relativeOutputPath === 'cadastro.html' ||
    relativeOutputPath === '404.html'
  ) {
    return null;
  }

  // Blog Index
  if (relativeOutputPath === 'blog/index.html') {
    return buildBlogIndexJsonLd(meta);
  }

  // Artigos do Blog
  if (relativeOutputPath.startsWith('blog/artigos/')) {
    return buildBlogPostJsonLd(meta);
  }

  // Home Page
  if (relativeOutputPath === 'index.html') {
    return buildHomeJsonLd();
  }

  // Calculadoras / Ferramentas
  if (relativeOutputPath.startsWith('tools/')) {
    const normRel = '/' + relativeOutputPath.replace(/\\/g, '/');
    const slug = path.basename(relativeOutputPath, '.html');
    const tool = tools.find(t => t.url === normRel || t.slug === slug || t.id === slug);
    if (tool) {
      return buildToolPageJsonLd(tool, meta.canonical);
    }
    return null;
  }

  // Páginas de Categorias
  const categoryRoutes = {
    'financeira.html': 'financas',
    'matematica.html': 'matematica',
    'saude.html': 'saude',
    'conversores.html': 'utilidades',
    'trabalhista.html': 'trabalhista'
  };
  if (categoryRoutes[relativeOutputPath]) {
    return buildCategoryJsonLd(categoryRoutes[relativeOutputPath], meta);
  }

  // Páginas Institucionais
  if (relativeOutputPath === 'sobre.html') {
    return buildAboutJsonLd(meta);
  }
  if (relativeOutputPath === 'contato.html') {
    return buildContactJsonLd(meta);
  }
  if (relativeOutputPath === 'politica.html' || relativeOutputPath === 'termos.html') {
    return buildWebPageJsonLd(meta);
  }

  return null;
}

/**
 * Serializa com segurança o objeto JSON-LD para inclusão no HTML.
 * Escapa '<' como '\\u003c' para evitar encerramento prematuro da tag </script>.
 *
 * @param {Object} data Objeto JSON-LD a ser serializado
 * @returns {string} String JSON segura
 */
function serializeJsonLd(data) {
  if (!data) return '';
  const jsonString = JSON.stringify(data, null, 2);
  return jsonString.replace(/</g, '\\u003c');
}

/**
 * Gera a tag <script type="application/ld+json"> contendo os dados estruturados serializados.
 * Retorna string vazia se os dados forem nulos ou vazios.
 *
 * @param {Object} data Objeto JSON-LD
 * @returns {string} Tag HTML completa ou vazia
 */
function renderJsonLdScript(data) {
  if (!data) return '';
  const safeJson = serializeJsonLd(data);
  return `<script type="application/ld+json">\n${safeJson}\n</script>`;
}

module.exports = {
  BASE_URL,
  CATEGORY_MAP,
  buildToolJsonLd,
  buildBreadcrumbJsonLd,
  buildToolPageJsonLd,
  buildHomeJsonLd,
  buildCategoryJsonLd,
  buildAboutJsonLd,
  buildContactJsonLd,
  buildWebPageJsonLd,
  buildBlogPostJsonLd,
  buildBlogIndexJsonLd,
  getPageJsonLd,
  serializeJsonLd,
  renderJsonLdScript
};
