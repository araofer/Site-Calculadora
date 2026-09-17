/**
 * Gerador de Sitemap - Calculadora Master
 * Gera sitemap.xml a partir de data/tools.json, páginas institucionais e artigos do blog.
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const TOOLS_JSON_PATH = path.join(ROOT_DIR, 'data', 'tools.json');
const SITEMAP_PATH = path.join(ROOT_DIR, 'sitemap.xml');
const BASE_DOMAIN = 'https://www.calculadoramaster.com';

const STATIC_PAGES = [
  '/',
  '/financeira.html',
  '/matematica.html',
  '/saude.html',
  '/conversores.html',
  '/trabalhista.html',
  '/sobre.html',
  '/contato.html',
  '/politica.html',
  '/termos.html'
];

const { isPublicTool } = require('./lib/tool-registry.js');

function generateSitemap() {
  if (!fs.existsSync(TOOLS_JSON_PATH)) {
    console.error(`ERRO: ${TOOLS_JSON_PATH} não encontrado.`);
    process.exit(1);
  }

  const rawTools = fs.readFileSync(TOOLS_JSON_PATH, 'utf-8');
  const tools = JSON.parse(rawTools);

  const toolUrls = tools
    .filter(isPublicTool)
    .map(tool => (tool.url.startsWith('/') ? tool.url : `/${tool.url}`));

  const blogPages = ['/blog/index.html'];

  const articlesDir = path.join(ROOT_DIR, 'blog', 'artigos');
  if (fs.existsSync(articlesDir)) {
    const articles = fs.readdirSync(articlesDir)
      .filter(file => file.endsWith('.html'))
      .sort()
      .map(file => `/blog/artigos/${file}`);
    blogPages.push(...articles);
  }

  // Artigos de ferramentas Factory públicas
  const factoryArticles = tools
    .filter(isPublicTool)
    .filter(tool => tool.article)
    .map(tool => (tool.article.startsWith('/') ? tool.article : `/${tool.article}`));

  for (const artUrl of factoryArticles) {
    if (!blogPages.includes(artUrl)) {
      blogPages.push(artUrl);
    }
  }

  const allUrls = [
    ...STATIC_PAGES,
    ...toolUrls,
    ...blogPages
  ];

  const urlEntries = allUrls.map(urlPath => {
    const fullLoc = urlPath === '/' ? `${BASE_DOMAIN}/` : `${BASE_DOMAIN}${urlPath}`;
    return `  <url>\n    <loc>${fullLoc}</loc>\n  </url>`;
  });

  const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urlEntries.join('\n')}\n</urlset>\n`;

  fs.writeFileSync(SITEMAP_PATH, xmlContent, 'utf-8');
  console.log(`✓ sitemap.xml gerado com sucesso contendo ${allUrls.length} URLs.`);
}

generateSitemap();
