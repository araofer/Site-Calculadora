/**
 * Scaffolder de Novas Ferramentas (Tool Factory) - Calculadora Master
 * Cria a estrutura física e contratual de uma nova ferramenta de forma atômica e segura.
 * Suporta modo --dry-run e nunca sobrescreve arquivos preexistentes.
 * Zero dependências externas.
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const TEMPLATES_DIR = path.join(ROOT_DIR, 'templates', 'tool');
const TOOLS_JSON_PATH = path.join(ROOT_DIR, 'data', 'tools.json');

const {
  loadCategories,
  resolveCategory,
  loadTools,
  BASE_CANONICAL_DOMAIN
} = require('./lib/tool-registry.js');

const {
  ID_REGEX,
  normalizeFeatures,
  validateToolSchema
} = require('./lib/tool-schema.js');

/**
 * Faz o parsing de argumentos CLI no formato --chave=valor ou --chave valor.
 *
 * @param {string[]} args
 * @returns {Record<string, any>}
 */
function parseArgs(args) {
  const result = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (!arg.startsWith('--')) continue;

    const cleanArg = arg.slice(2);
    const equalIdx = cleanArg.indexOf('=');

    if (equalIdx !== -1) {
      const key = cleanArg.slice(0, equalIdx);
      const val = cleanArg.slice(equalIdx + 1);
      result[key] = val;
    } else {
      const nextArg = args[i + 1];
      if (nextArg && !nextArg.startsWith('--')) {
        result[cleanArg] = nextArg;
        i++;
      } else {
        result[cleanArg] = true;
      }
    }
  }

  return result;
}

/**
 * Valida se um caminho está estritamente contido no diretório base esperado.
 * Defesa em profundidade contra tentativas de Path Traversal.
 *
 * @param {string} targetPath Caminho absoluto de destino
 * @param {string} baseDir Diretório base permitido
 * @param {string} label Identificador do tipo de arquivo
 */
function assertPathContained(targetPath, baseDir, label) {
  const resolvedTarget = path.resolve(targetPath);
  const resolvedBase = path.resolve(baseDir);

  if (resolvedTarget !== resolvedBase && !resolvedTarget.startsWith(resolvedBase + path.sep)) {
    throw new Error(
      `Violação de segurança (Path Traversal): o caminho de ${label} ("${targetPath}") está fora do diretório permitido ("${baseDir}").`
    );
  }
}

/**
 * Cria uma nova ferramenta no repositório de forma atômica e segura.
 *
 * @param {Object} options
 * @param {string} options.id Identificador kebab-case da ferramenta
 * @param {string} options.category Categoria da ferramenta
 * @param {string} options.name Nome amigável da ferramenta
 * @param {string} [options.shortName] Nome curto opcional
 * @param {string} [options.audience] 'universal' | 'brasil'
 * @param {string} [options.description] Descrição sucinta
 * @param {string[]|string} [options.keywords] Lista de palavras-chave
 * @param {boolean} [options.withArticle] Se deve criar scaffold de artigo
 * @param {string} [options.articleSlug] Slug do artigo associado
 * @param {string} [options.status] 'draft' | 'review'
 * @param {Object} [options.features] Mapa de features declaradas
 * @param {string} [options.updatePolicy] Política de atualização
 * @param {boolean} [options.dryRun] Se verdadeiro, não escreve nada no disco
 * @param {string} [options.rootDir] Diretório raiz do projeto (para testes)
 * @param {string} [options.toolsJsonPath] Caminho alternativo de tools.json (para testes)
 * @returns {{success: boolean, createdFiles: string[], toolEntry: Object}}
 */
function createTool(options = {}) {
  const rootDir = options.rootDir || ROOT_DIR;
  const toolsJsonPath = options.toolsJsonPath || TOOLS_JSON_PATH;
  const dryRun = Boolean(options.dryRun);

  // 1. Validação de argumentos obrigatórios
  const id = (options.id || '').trim();
  const categoryInput = (options.category || '').trim();
  const name = (options.name || '').trim();

  if (!id) {
    throw new Error('Parâmetro obrigatório ausente: --id');
  }
  if (!categoryInput) {
    throw new Error('Parâmetro obrigatório ausente: --category');
  }
  if (!name) {
    throw new Error('Parâmetro obrigatório ausente: --name');
  }

  // 2. Validação sintática do ID
  if (!ID_REGEX.test(id)) {
    throw new Error(
      `ID inválido: "${id}". O ID deve ser kebab-case minúsculo correspondendo a ^[a-z0-9]+(?:-[a-z0-9]+)*$`
    );
  }

  // 3. Resolução da categoria
  const categoriesPath = path.join(rootDir, 'data', 'categories.json');
  const categories = loadCategories(categoriesPath);
  const category = resolveCategory(categoryInput, categories);

  if (!category) {
    const validNames = Object.keys(categories).join(', ');
    throw new Error(
      `Categoria inválida: "${categoryInput}". Categorias permitidas: ${validNames}`
    );
  }

  // 4. Parâmetros com defaults conservadores
  const audience = options.audience === 'brasil' ? 'brasil' : 'universal';
  const status = options.status === 'review' ? 'review' : 'draft';
  const formulaStatus = 'draft';
  const description = (options.description || `Calculadora de ${name} online grátis.`).trim();

  let keywords = [];
  if (Array.isArray(options.keywords)) {
    keywords = options.keywords.map(k => String(k).trim()).filter(Boolean);
  } else if (typeof options.keywords === 'string') {
    keywords = options.keywords.split(',').map(k => k.trim()).filter(Boolean);
  }
  if (keywords.length === 0) {
    keywords = [id.replace(/-/g, ' '), name.toLowerCase()];
  }

  let inputFeatures = options.features || {};
  if (typeof inputFeatures === 'string') {
    try {
      inputFeatures = JSON.parse(inputFeatures);
    } catch (_) {
      throw new Error('Formato inválido para --features: deve ser um JSON válido contendo pares chave-booleano.');
    }
  }
  const features = normalizeFeatures(inputFeatures);

  const withArticle = Boolean(options.withArticle);
  const articleSlug = options.articleSlug !== undefined && options.articleSlug !== null && String(options.articleSlug).trim() !== ''
    ? String(options.articleSlug).trim()
    : `como-calcular-${id}`;

  if (!ID_REGEX.test(articleSlug)) {
    throw new Error(
      `Slug de artigo inválido: "${articleSlug}". O slug deve ser kebab-case minúsculo correspondendo a ^[a-z0-9]+(?:-[a-z0-9]+)*$`
    );
  }

  // 5. Validação de duplicidade no catálogo
  let existingTools = [];
  if (fs.existsSync(toolsJsonPath)) {
    existingTools = loadTools(toolsJsonPath);
  }

  const idConflict = existingTools.find(t => t.id === id);
  if (idConflict) {
    throw new Error(`Conflito: Já existe uma ferramenta com o ID "${id}" no catálogo.`);
  }

  const urlConflict = existingTools.find(t => t.url === `/tools/${category.slug}/${id}.html`);
  if (urlConflict) {
    throw new Error(`Conflito: A URL "/tools/${category.slug}/${id}.html" já está em uso pela ferramenta "${urlConflict.id}".`);
  }

  // 6. Definição e validação de existência de arquivos no disco com verificação de contenção (Path Traversal)
  const sourcePageBase = path.resolve(rootDir, 'src', 'pages', 'tools', category.slug);
  const jsBase = path.resolve(rootDir, 'js', 'tools');
  const testBase = path.resolve(rootDir, 'tests');
  const articleBase = path.resolve(rootDir, 'src', 'pages', 'blog', 'artigos');

  const sourcePageAbs = path.resolve(sourcePageBase, `${id}.page.html`);
  const jsFileAbs = path.resolve(jsBase, `${id}.js`);
  const testFileAbs = path.resolve(testBase, `${id}.test.js`);
  const articlePageAbs = path.resolve(articleBase, `${articleSlug}.page.html`);

  assertPathContained(sourcePageAbs, sourcePageBase, 'página fonte');
  assertPathContained(jsFileAbs, jsBase, 'módulo JavaScript');
  assertPathContained(testFileAbs, testBase, 'arquivo de teste');
  if (withArticle) {
    assertPathContained(articlePageAbs, articleBase, 'artigo do blog');
  }

  const sourcePageRel = path.relative(rootDir, sourcePageAbs).replace(/\\/g, '/');
  const jsFileRel = path.relative(rootDir, jsFileAbs).replace(/\\/g, '/');
  const testFileRel = path.relative(rootDir, testFileAbs).replace(/\\/g, '/');
  const articlePageRel = path.relative(rootDir, articlePageAbs).replace(/\\/g, '/');

  const filesToCheck = [
    { abs: sourcePageAbs, rel: sourcePageRel },
    { abs: jsFileAbs, rel: jsFileRel },
    { abs: testFileAbs, rel: testFileRel }
  ];
  if (withArticle) {
    filesToCheck.push({ abs: articlePageAbs, rel: articlePageRel });
  }

  for (const file of filesToCheck) {
    if (fs.existsSync(file.abs)) {
      throw new Error(
        `Conflito: Arquivo já existente no disco: "${file.rel}". O Scaffolder nunca sobrescreve arquivos.`
      );
    }
  }

  // 7. Preparação do registro para data/tools.json
  const toolEntry = {
    id,
    slug: id,
    name,
    category: category.name,
    categorySlug: category.slug,
    audience,
    description,
    url: `/tools/${category.slug}/${id}.html`,
    status,
    formulaStatus,
    implementation: 'factory',
    features,
    keywords,
    related: []
  };

  if (options.shortName) toolEntry.shortName = options.shortName.trim();
  if (options.updatePolicy) toolEntry.updatePolicy = options.updatePolicy.trim();
  if (withArticle) toolEntry.article = `/blog/artigos/${articleSlug}.html`;

  // Validação do schema da nova entrada antes de qualquer escrita
  const schemaValidation = validateToolSchema(toolEntry, {
    validCategories: Object.keys(categories)
  });
  if (!schemaValidation.valid) {
    throw new Error(`Validação de esquema da nova ferramenta falhou: ${schemaValidation.errors.join('; ')}`);
  }

  // 8. Preparação dos conteúdos a partir dos templates
  const templatePagePath = path.join(TEMPLATES_DIR, 'page.html');
  const templateJsPath = path.join(TEMPLATES_DIR, 'calculator.js');
  const templateTestPath = path.join(TEMPLATES_DIR, 'calculator.test.js');
  const templateArticlePath = path.join(TEMPLATES_DIR, 'article.page.html');

  if (!fs.existsSync(templatePagePath) || !fs.existsSync(templateJsPath) || !fs.existsSync(templateTestPath)) {
    throw new Error(`Templates da Factory ausentes em: ${TEMPLATES_DIR}`);
  }

  const rawPageTpl = fs.readFileSync(templatePagePath, 'utf-8');
  const rawJsTpl = fs.readFileSync(templateJsPath, 'utf-8');
  const rawTestTpl = fs.readFileSync(templateTestPath, 'utf-8');

  const pageContent = rawPageTpl
    .replace(/\{\{ID\}\}/g, id)
    .replace(/\{\{NAME\}\}/g, name)
    .replace(/\{\{DESCRIPTION\}\}/g, description)
    .replace(/\{\{KEYWORDS\}\}/g, keywords.join(', '))
    .replace(/\{\{CANONICAL\}\}/g, `${BASE_CANONICAL_DOMAIN}/tools/${category.slug}/${id}.html`)
    .replace(/\{\{RELATED_TOOLS_LINKS\}\}/g, '<!-- Adicione links de ferramentas relacionadas quando disponíveis -->');

  const jsContent = rawJsTpl
    .replace(/\{\{ID\}\}/g, id)
    .replace(/\{\{NAME\}\}/g, name);

  const testContent = rawTestTpl
    .replace(/\{\{ID\}\}/g, id)
    .replace(/\{\{NAME\}\}/g, name);

  let articleContent = null;
  if (withArticle) {
    if (!fs.existsSync(templateArticlePath)) {
      throw new Error(`Template de artigo ausente: ${templateArticlePath}`);
    }
    const rawArticleTpl = fs.readFileSync(templateArticlePath, 'utf-8');
    articleContent = rawArticleTpl
      .replace(/\{\{ID\}\}/g, id)
      .replace(/\{\{NAME\}\}/g, name)
      .replace(/\{\{ARTICLE_SLUG\}\}/g, articleSlug)
      .replace(/\{\{TOOL_URL\}\}/g, `/tools/${category.slug}/${id}.html`);
  }

  // 9. Modo DRY-RUN
  if (dryRun) {
    console.log('\n[DRY-RUN] Nenhuma gravação efetuada no disco.');
    console.log('Arquivos que seriam criados:');
    console.log(`  - ${sourcePageRel}`);
    console.log(`  - ${jsFileRel}`);
    console.log(`  - ${testFileRel}`);
    if (withArticle) console.log(`  - ${articlePageRel}`);
    console.log('\nEntrada que seria adicionada em data/tools.json:');
    console.log(JSON.stringify(toolEntry, null, 2));
    return {
      success: true,
      dryRun: true,
      createdFiles: filesToCheck.map(f => f.rel),
      toolEntry
    };
  }

  // 10. Operação Atômica: escrita com rollback defensivo em caso de qualquer falha
  const createdFiles = [];
  let originalToolsJsonContent = null;

  try {
    // 10.1 Cria arquivo de página
    fs.mkdirSync(path.dirname(sourcePageAbs), { recursive: true });
    fs.writeFileSync(sourcePageAbs, pageContent, 'utf-8');
    createdFiles.push(sourcePageAbs);

    // 10.2 Cria arquivo JS
    fs.mkdirSync(path.dirname(jsFileAbs), { recursive: true });
    fs.writeFileSync(jsFileAbs, jsContent, 'utf-8');
    createdFiles.push(jsFileAbs);

    // 10.3 Cria arquivo de teste
    fs.mkdirSync(path.dirname(testFileAbs), { recursive: true });
    fs.writeFileSync(testFileAbs, testContent, 'utf-8');
    createdFiles.push(testFileAbs);

    // 10.4 Cria arquivo de artigo se solicitado
    if (withArticle && articleContent) {
      fs.mkdirSync(path.dirname(articlePageAbs), { recursive: true });
      fs.writeFileSync(articlePageAbs, articleContent, 'utf-8');
      createdFiles.push(articlePageAbs);
    }

    // 10.5 Atualização atômica de data/tools.json
    if (fs.existsSync(toolsJsonPath)) {
      originalToolsJsonContent = fs.readFileSync(toolsJsonPath, 'utf-8');
    }

    const updatedTools = [...existingTools, toolEntry];
    const updatedToolsJson = JSON.stringify(updatedTools, null, 2) + '\n';

    const tempToolsJsonPath = `${toolsJsonPath}.tmp.${Date.now()}`;
    fs.writeFileSync(tempToolsJsonPath, updatedToolsJson, 'utf-8');
    fs.renameSync(tempToolsJsonPath, toolsJsonPath);

    return {
      success: true,
      createdFiles: createdFiles.map(f => path.relative(rootDir, f).replace(/\\/g, '/')),
      toolEntry
    };
  } catch (err) {
    // Rollback atômico: remove arquivos recém-criados e restaura tools.json
    for (const file of createdFiles) {
      if (fs.existsSync(file)) {
        try { fs.unlinkSync(file); } catch (_) {}
      }
    }

    if (originalToolsJsonContent !== null) {
      try { fs.writeFileSync(toolsJsonPath, originalToolsJsonContent, 'utf-8'); } catch (_) {}
    }

    throw new Error(`Falha atômica durante o scaffolding da ferramenta. Rollback executado: ${err.message}`);
  }
}

if (require.main === module) {
  try {
    const rawArgs = process.argv.slice(2);
    const parsed = parseArgs(rawArgs);

    const result = createTool({
      id: parsed.id,
      category: parsed.category,
      name: parsed.name,
      shortName: parsed['short-name'],
      audience: parsed.audience,
      description: parsed.description,
      keywords: parsed.keywords,
      withArticle: Boolean(parsed['with-article']),
      articleSlug: parsed['article-slug'],
      status: parsed.status,
      features: parsed.features,
      updatePolicy: parsed['update-policy'],
      dryRun: Boolean(parsed['dry-run'])
    });

    if (!result.dryRun) {
      console.log(`\n✓ Ferramenta "${result.toolEntry.name}" (${result.toolEntry.id}) criada com sucesso!`);
      console.log('Arquivos gerados:');
      result.createdFiles.forEach(f => console.log(`  - ${f}`));
      console.log('Status inicial: draft (não público).');
    }
  } catch (err) {
    console.error(`\n❌ Erro no Scaffolder de Ferramentas: ${err.message}\n`);
    process.exit(1);
  }
}

module.exports = {
  parseArgs,
  createTool
};
