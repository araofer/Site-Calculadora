import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import seo from '../src/utils/seo.js';
import ssg from '../scripts/build-html.js';

const {
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
} = seo;

const {
  buildPages,
  TOOL_PAGES,
  SITE_PAGES,
  SITE_ASSETS,
  DEFAULT_OUTPUT_DIR
} = ssg;

const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TOOLS_JSON_PATH = path.join(ROOT_DIR, 'data', 'tools.json');
const toolsData = JSON.parse(fs.readFileSync(TOOLS_JSON_PATH, 'utf-8'));

// ----------------------------------------------------
// 1. TESTES UNITÁRIOS DO HELPER (src/utils/seo.js)
// ----------------------------------------------------

test('SEO Helper - buildToolJsonLd gera schema WebApplication com campos obrigatórios e válidos', () => {
  const tool = toolsData.find(t => t.id === 'juros');
  const schema = buildToolJsonLd(tool, 'https://www.calculadoramaster.com/tools/financas/juros.html');

  assert.equal(schema['@context'], 'https://schema.org');
  assert.equal(schema['@type'], 'WebApplication');
  assert.equal(schema.name, 'Calculadora de Juros');
  assert.ok(schema.description.length > 10, 'Descrição deve ser substancial');
  assert.equal(schema.url, 'https://www.calculadoramaster.com/tools/financas/juros.html');
  assert.equal(schema.applicationCategory, 'Financeiro');
  assert.equal(schema.operatingSystem, 'Any');

  // Ausência de dados fictícios
  assert.equal('aggregateRating' in schema, false);
  assert.equal('review' in schema, false);
  assert.equal('offers' in schema, false);
  assert.equal('author' in schema, false);
});

test('SEO Helper - buildToolJsonLd retorna null para dados ausentes ou incompletos', () => {
  assert.equal(buildToolJsonLd(null), null);
  assert.equal(buildToolJsonLd({}), null);
  assert.equal(buildToolJsonLd({ name: 'Incompleto' }), null);
});

test('SEO Helper - buildBreadcrumbJsonLd gera BreadcrumbList válida com posições 1, 2, 3 sequenciais', () => {
  const crumbs = [
    { name: 'Calculadora Master', url: 'https://www.calculadoramaster.com/' },
    { name: 'Financeira', url: 'https://www.calculadoramaster.com/financeira.html' },
    { name: 'Calculadora de Juros', url: 'https://www.calculadoramaster.com/tools/financas/juros.html' }
  ];
  const schema = buildBreadcrumbJsonLd(crumbs);

  assert.equal(schema['@context'], 'https://schema.org');
  assert.equal(schema['@type'], 'BreadcrumbList');
  assert.equal(schema.itemListElement.length, 3);

  assert.deepEqual(schema.itemListElement[0], {
    '@type': 'ListItem',
    position: 1,
    name: 'Calculadora Master',
    item: 'https://www.calculadoramaster.com/'
  });
  assert.deepEqual(schema.itemListElement[1], {
    '@type': 'ListItem',
    position: 2,
    name: 'Financeira',
    item: 'https://www.calculadoramaster.com/financeira.html'
  });
  assert.deepEqual(schema.itemListElement[2], {
    '@type': 'ListItem',
    position: 3,
    name: 'Calculadora de Juros',
    item: 'https://www.calculadoramaster.com/tools/financas/juros.html'
  });
});

test('SEO Helper - buildToolPageJsonLd agrupa WebApplication e BreadcrumbList em @graph com @context na raiz', () => {
  const tool = toolsData.find(t => t.id === 'desconto');
  const graphObj = buildToolPageJsonLd(tool, 'https://www.calculadoramaster.com/tools/financas/desconto.html');

  assert.equal(graphObj['@context'], 'https://schema.org');
  assert.ok(Array.isArray(graphObj['@graph']), '@graph deve ser um array');
  assert.equal(graphObj['@graph'].length, 2);

  const webApp = graphObj['@graph'].find(item => item['@type'] === 'WebApplication');
  const breadcrumb = graphObj['@graph'].find(item => item['@type'] === 'BreadcrumbList');

  assert.ok(webApp, 'Deve conter nó WebApplication');
  assert.ok(breadcrumb, 'Deve conter nó BreadcrumbList');
  assert.equal(webApp.name, 'Calculadora de Desconto');
  assert.equal(webApp.url, 'https://www.calculadoramaster.com/tools/financas/desconto.html');
  assert.equal(breadcrumb.itemListElement[1].name, 'Financeira');
});

test('SEO Helper - buildHomeJsonLd gera WebSite sem SearchAction fictícia', () => {
  const schema = buildHomeJsonLd();
  assert.equal(schema['@context'], 'https://schema.org');
  assert.equal(schema['@type'], 'WebSite');
  assert.equal(schema.name, 'Calculadora Master');
  assert.equal(schema.url, 'https://www.calculadoramaster.com/');
  assert.equal('potentialAction' in schema, false, 'Não deve conter SearchAction fictícia');
});

test('SEO Helper - buildCategoryJsonLd gera CollectionPage + BreadcrumbList', () => {
  const schema = buildCategoryJsonLd('financas', {
    title: 'Calculadoras Financeiras Online Grátis | Calculadora Master',
    description: 'Calcule juros, descontos, financiamentos e lucros.'
  });

  assert.equal(schema['@context'], 'https://schema.org');
  assert.equal(schema['@graph'].length, 2);
  assert.equal(schema['@graph'][0]['@type'], 'CollectionPage');
  assert.equal(schema['@graph'][0].url, 'https://www.calculadoramaster.com/financeira.html');
  assert.equal(schema['@graph'][1]['@type'], 'BreadcrumbList');
  assert.equal(schema['@graph'][1].itemListElement.length, 2);
});

test('SEO Helper - serializeJsonLd protege contra encerramento prematuro de </script>', () => {
  const malicious = {
    name: 'Calculadora </script><script>alert("xss")</script>',
    description: 'Teste seguro'
  };
  const serialized = serializeJsonLd(malicious);

  assert.ok(!serialized.includes('</script>'), 'Não deve conter literal </script>');
  assert.ok(serialized.includes('\\u003c/script>'), 'Deve escapar < como \\u003c');

  // JSON.parse deve reconstruir perfeitamente o texto original
  const parsed = JSON.parse(serialized);
  assert.equal(parsed.name, 'Calculadora </script><script>alert("xss")</script>');
});

test('SEO Helper - buildBlogPostJsonLd gera BlogPosting com headline, imagem, mainEntityOfPage, autor confirmado Arão Ferreira (Person) e breadcrumb', () => {
  const meta = {
    title: 'Como Calcular Juros Simples e Compostos | Calculadora Master',
    description: 'Guia completo sobre juros.',
    canonical: 'https://www.calculadoramaster.com/blog/artigos/como-calcular-juros.html',
    ogImage: 'https://www.calculadoramaster.com/blog/img/juros.png'
  };
  const schema = buildBlogPostJsonLd(meta);

  assert.equal(schema['@context'], 'https://schema.org');
  assert.equal(schema['@graph'].length, 2);

  const post = schema['@graph'].find(e => e['@type'] === 'BlogPosting');
  const breadcrumb = schema['@graph'].find(e => e['@type'] === 'BreadcrumbList');

  assert.ok(post, 'Deve conter nó BlogPosting');
  assert.equal(post.headline, 'Como Calcular Juros Simples e Compostos');
  assert.equal(post.description, 'Guia completo sobre juros.');
  assert.equal(post.url, 'https://www.calculadoramaster.com/blog/artigos/como-calcular-juros.html');
  assert.deepEqual(post.mainEntityOfPage, {
    '@type': 'WebPage',
    '@id': 'https://www.calculadoramaster.com/blog/artigos/como-calcular-juros.html'
  });
  assert.equal(post.image, 'https://www.calculadoramaster.com/blog/img/juros.png');

  // Autor público confirmado (Person, sem url, bio ou cargo inventados)
  assert.deepEqual(post.author, {
    '@type': 'Person',
    name: 'Arão Ferreira'
  });
  assert.equal('datePublished' in post, false, 'Não deve inventar datePublished');
  assert.equal('dateModified' in post, false, 'Não deve inventar dateModified');

  // Breadcrumb: Home -> Blog -> Artigo
  assert.equal(breadcrumb.itemListElement.length, 3);
  assert.equal(breadcrumb.itemListElement[0].name, 'Calculadora Master');
  assert.equal(breadcrumb.itemListElement[0].item, 'https://www.calculadoramaster.com/');
  assert.equal(breadcrumb.itemListElement[1].name, 'Blog');
  assert.equal(breadcrumb.itemListElement[1].item, 'https://www.calculadoramaster.com/blog/index.html');
  assert.equal(breadcrumb.itemListElement[2].name, 'Como Calcular Juros Simples e Compostos');
  assert.equal(breadcrumb.itemListElement[2].item, 'https://www.calculadoramaster.com/blog/artigos/como-calcular-juros.html');
});

test('SEO Helper - buildBlogPostJsonLd inclui author (Person) explícito e datas ISO quando fornecidos', () => {
  const meta = {
    title: 'Artigo com Autor | Calculadora Master',
    description: 'Descrição do artigo.',
    canonical: 'https://www.calculadoramaster.com/blog/artigos/exemplo.html',
    ogImage: 'https://www.calculadoramaster.com/blog/img/exemplo.png',
    author: 'Arão Ferreira',
    datePublished: '2025-01-10T12:00:00Z',
    dateModified: '2025-01-15T15:30:00Z'
  };
  const schema = buildBlogPostJsonLd(meta);
  const post = schema['@graph'].find(e => e['@type'] === 'BlogPosting');

  assert.deepEqual(post.author, {
    '@type': 'Person',
    name: 'Arão Ferreira'
  });
  assert.equal(post.datePublished, '2025-01-10T12:00:00Z');
  assert.equal(post.dateModified, '2025-01-15T15:30:00Z');
});

test('SEO Helper - buildBlogIndexJsonLd gera CollectionPage + BreadcrumbList para o blog', () => {
  const meta = {
    title: 'Blog Calculadora Master | Artigos',
    description: 'Dicas e guias.',
    canonical: 'https://www.calculadoramaster.com/blog/index.html'
  };
  const schema = buildBlogIndexJsonLd(meta);

  assert.equal(schema['@context'], 'https://schema.org');
  assert.equal(schema['@graph'].length, 2);
  assert.equal(schema['@graph'][0]['@type'], 'CollectionPage');
  assert.equal(schema['@graph'][0].url, 'https://www.calculadoramaster.com/blog/index.html');
  assert.equal(schema['@graph'][1]['@type'], 'BreadcrumbList');
  assert.equal(schema['@graph'][1].itemListElement.length, 2);
});

test('SEO Helper - getPageJsonLd retorna null para noindex, login, cadastro e 404', () => {
  assert.equal(getPageJsonLd({ relativeOutputPath: 'login.html', meta: { robots: 'noindex, nofollow' } }), null);
  assert.equal(getPageJsonLd({ relativeOutputPath: 'cadastro.html', meta: { robots: 'noindex, nofollow' } }), null);
  assert.equal(getPageJsonLd({ relativeOutputPath: '404.html', meta: { robots: 'noindex, nofollow' } }), null);
});

// ----------------------------------------------------
// 2. TESTES DE INTEGRAÇÃO COM AS 15 CALCULADORAS E SSG
// ----------------------------------------------------

test('SEO SSG - Exatamente as 15 calculadoras geradas contêm JSON-LD válido no HTML', () => {
  // Compila todas as páginas do site no dist-pilot
  buildPages(SITE_PAGES, { outputDir: DEFAULT_OUTPUT_DIR, assets: SITE_ASSETS });

  let toolSchemaCount = 0;

  for (const page of TOOL_PAGES) {
    const filePath = path.join(DEFAULT_OUTPUT_DIR, page.relativeOutputPath);
    assert.ok(fs.existsSync(filePath), `Arquivo deve existir: ${page.relativeOutputPath}`);
    const html = fs.readFileSync(filePath, 'utf-8');

    // Exatamente 1 bloco <script type="application/ld+json"> por ferramenta
    const scriptMatches = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g);
    assert.ok(scriptMatches, `${page.relativeOutputPath} deve conter script ld+json`);
    assert.equal(scriptMatches.length, 1, `${page.relativeOutputPath} deve conter exatamente 1 bloco ld+json`);

    const singleMatch = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
    const jsonContent = singleMatch[1].trim();

    let parsed;
    assert.doesNotThrow(() => {
      parsed = JSON.parse(jsonContent);
    }, `${page.relativeOutputPath} deve conter JSON parseável`);

    assert.equal(parsed['@context'], 'https://schema.org', `${page.relativeOutputPath}: @context deve ser schema.org`);
    assert.ok(Array.isArray(parsed['@graph']), `${page.relativeOutputPath}: @graph deve ser array`);

    const webApp = parsed['@graph'].find(e => e['@type'] === 'WebApplication');
    const breadcrumb = parsed['@graph'].find(e => e['@type'] === 'BreadcrumbList');

    assert.ok(webApp, `${page.relativeOutputPath} deve conter WebApplication no @graph`);
    assert.ok(breadcrumb, `${page.relativeOutputPath} deve conter BreadcrumbList no @graph`);

    // Validações contratuais de WebApplication
    assert.ok(webApp.name && webApp.name.trim().length > 0, `${page.relativeOutputPath}: name não pode ser vazio`);
    assert.ok(webApp.description && webApp.description.trim().length > 0, `${page.relativeOutputPath}: description não pode ser vazia`);
    assert.ok(webApp.url.startsWith('https://www.calculadoramaster.com/tools/'), `${page.relativeOutputPath}: url deve ser absoluta e canônica`);
    assert.equal(webApp.operatingSystem, 'Any', `${page.relativeOutputPath}: operatingSystem deve ser Any`);
    assert.ok(webApp.applicationCategory && webApp.applicationCategory.length > 0);

    // Validação estrita de ausência de dados fictícios
    assert.equal('aggregateRating' in webApp, false, 'Não deve conter aggregateRating');
    assert.equal('review' in webApp, false, 'Não deve conter review');
    assert.equal('offers' in webApp, false, 'Não deve conter offers');
    assert.equal('author' in webApp, false, 'Não deve conter author');

    // Validações de BreadcrumbList
    assert.equal(breadcrumb.itemListElement.length, 3, `${page.relativeOutputPath}: breadcrumb deve ter 3 itens`);
    assert.equal(breadcrumb.itemListElement[0].position, 1);
    assert.equal(breadcrumb.itemListElement[0].name, 'Calculadora Master');
    assert.equal(breadcrumb.itemListElement[0].item, 'https://www.calculadoramaster.com/');

    assert.equal(breadcrumb.itemListElement[1].position, 2);
    assert.ok(breadcrumb.itemListElement[1].name.length > 0);
    assert.ok(breadcrumb.itemListElement[1].item.startsWith('https://www.calculadoramaster.com/'));

    assert.equal(breadcrumb.itemListElement[2].position, 3);
    assert.equal(breadcrumb.itemListElement[2].name, webApp.name);
    assert.equal(breadcrumb.itemListElement[2].item, webApp.url);

    // Canonical da página deve bater exatamente com a URL do schema
    const canonicalMatch = html.match(/<link rel="canonical" href="([^"]+)">/);
    assert.ok(canonicalMatch, `${page.relativeOutputPath} deve ter tag canonical`);
    assert.equal(webApp.url, canonicalMatch[1], `${page.relativeOutputPath}: schema url deve bater com canonical`);

    // Ausência de placeholders não resolvidos
    const leftover = html.match(/\{\{([A-Z0-9_]+)\}\}/);
    assert.equal(leftover, null, `${page.relativeOutputPath} não deve conter placeholders não resolvidos`);

    toolSchemaCount++;
  }

  assert.equal(toolSchemaCount, 15, 'Exatamente 15 calculadoras devem receber o schema WebApplication');
});

test('SEO SSG - Home, Categorias e Institucionais recebem schemas adequados', () => {
  // Home
  const homeHtml = fs.readFileSync(path.join(DEFAULT_OUTPUT_DIR, 'index.html'), 'utf-8');
  const homeMatch = homeHtml.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  assert.ok(homeMatch, 'Home deve ter JSON-LD');
  const homeJson = JSON.parse(homeMatch[1]);
  assert.equal(homeJson['@type'], 'WebSite');
  assert.equal(homeJson.name, 'Calculadora Master');

  // Categorias
  const catHtml = fs.readFileSync(path.join(DEFAULT_OUTPUT_DIR, 'financeira.html'), 'utf-8');
  const catMatch = catHtml.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  assert.ok(catMatch, 'financeira.html deve ter JSON-LD');
  const catJson = JSON.parse(catMatch[1]);
  assert.ok(catJson['@graph'].some(e => e['@type'] === 'CollectionPage'));

  // Sobre
  const sobreHtml = fs.readFileSync(path.join(DEFAULT_OUTPUT_DIR, 'sobre.html'), 'utf-8');
  const sobreMatch = sobreHtml.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  assert.ok(sobreMatch, 'sobre.html deve ter JSON-LD');
  const sobreJson = JSON.parse(sobreMatch[1]);
  assert.equal(sobreJson['@type'], 'AboutPage');

  // Contato
  const contatoHtml = fs.readFileSync(path.join(DEFAULT_OUTPUT_DIR, 'contato.html'), 'utf-8');
  const contatoMatch = contatoHtml.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  assert.ok(contatoMatch, 'contato.html deve ter JSON-LD');
  const contatoJson = JSON.parse(contatoMatch[1]);
  assert.equal(contatoJson['@type'], 'ContactPage');

  // Política e Termos
  const politicaHtml = fs.readFileSync(path.join(DEFAULT_OUTPUT_DIR, 'politica.html'), 'utf-8');
  assert.ok(politicaHtml.includes('<script type="application/ld+json">'), 'politica.html deve ter JSON-LD');
});

test('SEO SSG - Artigos do Blog contêm schema BlogPosting e BreadcrumbList sem dados inventados', () => {
  const blogArticleFiles = fs.readdirSync(path.join(ROOT_DIR, 'src', 'pages', 'blog', 'artigos'))
    .filter(f => f.endsWith('.page.html'));

  assert.equal(blogArticleFiles.length, 14, 'Devem existir 14 artigos de blog');

  for (const file of blogArticleFiles) {
    const htmlName = file.replace('.page.html', '.html');
    const articlePath = path.join(DEFAULT_OUTPUT_DIR, 'blog', 'artigos', htmlName);
    assert.ok(fs.existsSync(articlePath), `Artigo deve existir compilado: ${htmlName}`);

    const html = fs.readFileSync(articlePath, 'utf-8');
    const matches = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g);
    assert.ok(matches, `${htmlName} deve conter script ld+json`);
    assert.equal(matches.length, 1, `${htmlName} deve conter exatamente 1 bloco ld+json`);

    const singleMatch = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
    const parsed = JSON.parse(singleMatch[1].trim());

    assert.equal(parsed['@context'], 'https://schema.org');
    assert.ok(Array.isArray(parsed['@graph']));

    const post = parsed['@graph'].find(e => e['@type'] === 'BlogPosting');
    const breadcrumb = parsed['@graph'].find(e => e['@type'] === 'BreadcrumbList');

    assert.ok(post, `${htmlName} deve conter BlogPosting`);
    assert.ok(breadcrumb, `${htmlName} deve conter BreadcrumbList`);

    // Headline e URL válidos
    assert.ok(post.headline && post.headline.trim().length > 0, `${htmlName} deve ter headline`);
    assert.ok(post.url.startsWith('https://www.calculadoramaster.com/blog/artigos/'));
    assert.deepEqual(post.mainEntityOfPage, {
      '@type': 'WebPage',
      '@id': post.url
    });

    // Imagem real associada
    assert.ok(post.image && post.image.startsWith('https://www.calculadoramaster.com/blog/img/'));

    // Autor: estritamente Person com o nome público confirmado "Arão Ferreira"
    assert.deepEqual(post.author, {
      '@type': 'Person',
      name: 'Arão Ferreira'
    }, `${htmlName} deve conter autor Arão Ferreira como Person`);
    assert.equal('url' in post.author, false, `${htmlName} não deve conter url de autor`);
    assert.equal('jobTitle' in post.author, false, `${htmlName} não deve conter cargo de autor`);
    assert.equal('description' in post.author, false, `${htmlName} não deve conter biografia de autor`);

    // Não inventar datas se não estiverem no frontmatter
    assert.equal('datePublished' in post, false, `${htmlName} não deve inventar datePublished`);
    assert.equal('dateModified' in post, false, `${htmlName} não deve inventar dateModified`);

    // Breadcrumb: Calculadora Master -> Blog -> Artigo
    assert.equal(breadcrumb.itemListElement.length, 3);
    assert.equal(breadcrumb.itemListElement[0].name, 'Calculadora Master');
    assert.equal(breadcrumb.itemListElement[0].item, 'https://www.calculadoramaster.com/');
    assert.equal(breadcrumb.itemListElement[1].name, 'Blog');
    assert.equal(breadcrumb.itemListElement[1].item, 'https://www.calculadoramaster.com/blog/index.html');
    assert.equal(breadcrumb.itemListElement[2].name, post.headline);
    assert.equal(breadcrumb.itemListElement[2].item, post.url);
  }
});

test('SEO SSG - Blog Index contém CollectionPage e BreadcrumbList', () => {
  const blogIndexHtml = fs.readFileSync(path.join(DEFAULT_OUTPUT_DIR, 'blog', 'index.html'), 'utf-8');
  const match = blogIndexHtml.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  assert.ok(match, 'blog/index.html deve conter JSON-LD');

  const parsed = JSON.parse(match[1].trim());
  assert.equal(parsed['@context'], 'https://schema.org');
  assert.ok(parsed['@graph'].some(e => e['@type'] === 'CollectionPage'));
  assert.ok(parsed['@graph'].some(e => e['@type'] === 'BreadcrumbList'));
});

test('SEO SSG - Páginas noindex (login, cadastro, 404) NÃO recebem JSON-LD e preservam robots noindex', () => {
  const noindexPages = ['login.html', 'cadastro.html', '404.html'];
  for (const pageRel of noindexPages) {
    const html = fs.readFileSync(path.join(DEFAULT_OUTPUT_DIR, pageRel), 'utf-8');
    assert.ok(!html.includes('<script type="application/ld+json">'), `${pageRel} NÃO deve conter JSON-LD`);
    assert.ok(html.includes('noindex'), `${pageRel} deve preservar meta robots noindex`);
  }
});

test('SEO SSG - Build produz exatamente 43 páginas e 62 assets', () => {
  assert.equal(SITE_PAGES.length, 43, 'SITE_PAGES deve continuar tendo 43 páginas');
  assert.equal(SITE_ASSETS.length, 62, 'SITE_ASSETS deve continuar tendo 62 assets');
});
