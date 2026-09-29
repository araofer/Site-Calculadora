import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

import toolSchema from '../scripts/lib/tool-schema.js';
const {
  ID_REGEX,
  VALID_STATUSES,
  VALID_FORMULA_STATUSES,
  VALID_AUDIENCES,
  VALID_UPDATE_POLICIES,
  DEFAULT_FEATURES,
  isFactoryTool,
  normalizeFeatures,
  validateToolSchema
} = toolSchema;

import toolRegistry from '../scripts/lib/tool-registry.js';
const {
  loadCategories,
  resolveCategory,
  loadTools,
  isPublicTool,
  deriveToolPaths,
  getPublicTools
} = toolRegistry;

import toolDiscovery from '../scripts/lib/tool-discovery.js';
const {
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
} = toolDiscovery;

import scaffolder from '../scripts/create-tool.js';
const { createTool } = scaffolder;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

// =============================================================================
// 1. SCHEMA TESTS
// =============================================================================
test('Factory Schema - aceita ferramenta factory válida e completa', () => {
  const validTool = {
    id: 'teste-calculadora',
    slug: 'teste-calculadora',
    name: 'Calculadora de Teste',
    category: 'Finanças',
    categorySlug: 'financas',
    audience: 'universal',
    description: 'Calculadora de teste unitário online grátis.',
    url: '/tools/financas/teste-calculadora.html',
    status: 'draft',
    formulaStatus: 'draft',
    implementation: 'factory',
    features: {
      chart: false,
      table: false,
      pdf: true,
      copy: true,
      share: true,
      print: true,
      favorite: true,
      article: false
    },
    updatePolicy: 'none',
    keywords: ['teste', 'calculadora'],
    related: []
  };

  const result = validateToolSchema(validTool);
  assert.equal(result.valid, true);
  assert.deepEqual(result.errors, []);
});

test('Factory Schema - regex ID_REGEX aceita apenas kebab-case estrito', () => {
  assert.equal(ID_REGEX.test('juros-compostos'), true);
  assert.equal(ID_REGEX.test('regra-de-tres'), true);
  assert.equal(ID_REGEX.test('roi'), true);
  assert.equal(ID_REGEX.test('calc-123-abc'), true);

  // Inválidos
  assert.equal(ID_REGEX.test('Juros-Compostos'), false);
  assert.equal(ID_REGEX.test('juros_compostos'), false);
  assert.equal(ID_REGEX.test('juros compostos'), false);
  assert.equal(ID_REGEX.test('juros--compostos'), false);
  assert.equal(ID_REGEX.test('-juros'), false);
  assert.equal(ID_REGEX.test('juros-'), false);
  assert.equal(ID_REGEX.test('juros@compostos'), false);
});

test('Factory Schema - rejeita ID inválido com erro explícito', () => {
  const invalidIdTool = {
    id: 'Calculadora_Invalida!',
    slug: 'Calculadora_Invalida!',
    name: 'Nome',
    category: 'financas',
    audience: 'universal',
    description: 'Desc',
    url: '/tools/financas/Calculadora_Invalida!.html',
    status: 'draft',
    formulaStatus: 'draft',
    implementation: 'factory',
    updatePolicy: 'none'
  };

  const result = validateToolSchema(invalidIdTool);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some(err => err.includes('ID inválido')));
});

test('Factory Schema - rejeita categoria inexistente', () => {
  const tool = {
    id: 'teste-calc',
    name: 'Teste',
    category: 'categoria-inexistente',
    categorySlug: 'categoria-inexistente',
    audience: 'universal',
    description: 'Desc',
    url: '/tools/categoria-inexistente/teste-calc.html',
    status: 'draft',
    formulaStatus: 'draft',
    implementation: 'factory',
    updatePolicy: 'none'
  };

  const result = validateToolSchema(tool, { validCategories: ['financas', 'saude'] });
  assert.equal(result.valid, false);
  assert.ok(result.errors.some(err => err.includes('Categoria inválida')));
});

test('Factory Schema - rejeita status, formulaStatus e audience inválidos', () => {
  const base = {
    id: 'teste-calc',
    name: 'Teste',
    category: 'financas',
    categorySlug: 'financas',
    description: 'Desc',
    url: '/tools/financas/teste-calc.html',
    implementation: 'factory',
    updatePolicy: 'none'
  };

  // Status inválido
  const res1 = validateToolSchema({ ...base, status: 'ativo', formulaStatus: 'draft', audience: 'universal' });
  assert.equal(res1.valid, false);
  assert.ok(res1.errors.some(e => /status inválido/i.test(e)));

  // formulaStatus inválido
  const res2 = validateToolSchema({ ...base, status: 'draft', formulaStatus: 'approved', audience: 'universal' });
  assert.equal(res2.valid, false);
  assert.ok(res2.errors.some(e => /formulaStatus inválido/i.test(e)));

  // audience inválido
  const res3 = validateToolSchema({ ...base, status: 'draft', formulaStatus: 'draft', audience: 'global' });
  assert.equal(res3.valid, false);
  assert.ok(res3.errors.some(e => /audience inválid/i.test(e)));
});

test('Factory Schema - rejeita ausência de campos obrigatórios da factory', () => {
  const missingFields = {
    id: 'teste-calc'
  };

  const res = validateToolSchema(missingFields);
  assert.equal(res.valid, false);
  assert.ok(res.errors.some(e => /name/i.test(e)));
  assert.ok(res.errors.some(e => /categoria/i.test(e)));
});

test('Factory Schema - valida ferramentas legadas sem exigir campos exclusivos da factory', () => {
  const legacyTool = {
    id: 'juros',
    slug: 'juros',
    name: 'Calculadora de Juros',
    category: 'Financeiro',
    categorySlug: 'financas',
    description: 'Calcule juros simples e compostos online.',
    url: '/tools/financas/juros.html',
    status: 'published',
    keywords: ['juros'],
    related: ['desconto', 'porcentagem']
  };

  const res = validateToolSchema(legacyTool);
  assert.equal(res.valid, true);
  assert.equal(isFactoryTool(legacyTool), false);
});

// =============================================================================
// 2. REGISTRY TESTS
// =============================================================================
test('Registry - distingue confiavelmente ferramentas legadas vs factory', () => {
  const legacy = { id: 'desconto', status: 'published' };
  const factory = { id: 'emprestimo', status: 'draft', implementation: 'factory' };

  assert.equal(isFactoryTool(legacy), false);
  assert.equal(isFactoryTool(factory), true);
  assert.equal(isFactoryTool(null), false);
  assert.equal(isFactoryTool({}), false);
});

test('Registry - deriva URLs e caminhos de arquivo corretamente para factory', () => {
  const factory = {
    id: 'regra-de-tres',
    category: 'Matemática',
    categorySlug: 'matematica',
    implementation: 'factory'
  };

  const paths = deriveToolPaths(factory);
  assert.equal(paths.categorySlug, 'matematica');
  assert.equal(paths.url, '/tools/matematica/regra-de-tres.html');
  assert.equal(paths.relativeOutputPath, 'tools/matematica/regra-de-tres.html');
  assert.equal(paths.relativeSourcePath, 'tools/matematica/regra-de-tres.page.html');
  assert.equal(paths.canonical, 'https://www.calculadoramaster.com/tools/matematica/regra-de-tres.html');
  assert.equal(paths.jsPath, 'js/tools/regra-de-tres.js');
  assert.equal(paths.testPath, 'tests/regra-de-tres.test.js');
});

test('Registry - resolve categorias por slug e apelidos legados', () => {
  const catFinancas = resolveCategory('financas');
  assert.equal(catFinancas.slug, 'financas');
  assert.equal(catFinancas.name, 'Financeiro');

  const catAlias = resolveCategory('financeiro');
  assert.equal(catAlias.slug, 'financas');

  const catMatematica = resolveCategory('matematica');
  assert.equal(catMatematica.slug, 'matematica');
  assert.equal(catMatematica.name, 'Matemática');

  assert.equal(resolveCategory('inexistente'), null);
  assert.equal(resolveCategory(''), null);
});

// =============================================================================
// 3. PUBLICAÇÃO & IS_PUBLIC_TOOL TESTS
// =============================================================================
test('Publicação - ferramentas em draft, review e deprecated NUNCA são públicas', () => {
  assert.equal(isPublicTool({ id: 'a', status: 'draft', implementation: 'factory' }), false);
  assert.equal(isPublicTool({ id: 'b', status: 'review', implementation: 'factory' }), false);
  assert.equal(isPublicTool({ id: 'c', status: 'deprecated', implementation: 'factory' }), false);

  assert.equal(isPublicTool({ id: 'd', status: 'draft' }), false);
  assert.equal(isPublicTool({ id: 'e', status: 'review' }), false);
});

test('Publicação - factory published COM formulaStatus draft ou needs-review NÃO é pública', () => {
  const toolDraftFormula = {
    id: 'calc-1',
    status: 'published',
    formulaStatus: 'draft',
    implementation: 'factory'
  };
  assert.equal(isPublicTool(toolDraftFormula), false);

  const toolNeedsReview = {
    id: 'calc-2',
    status: 'published',
    formulaStatus: 'needs-review',
    implementation: 'factory'
  };
  assert.equal(isPublicTool(toolNeedsReview), false);
});

test('Publicação - factory published COM formulaStatus verified É pública', () => {
  const toolVerified = {
    id: 'calc-3',
    status: 'published',
    formulaStatus: 'verified',
    implementation: 'factory'
  };
  assert.equal(isPublicTool(toolVerified), true);
});

// =============================================================================
// 4. SCAFFOLDER (create-tool.js) TESTS
// =============================================================================
test('Scaffolder - --dry-run gera plano sem escrever nada no disco', () => {
  const result = createTool({
    id: 'ferramenta-dryrun-teste',
    category: 'financas',
    name: 'Ferramenta Dry Run',
    dryRun: true
  });

  assert.equal(result.success, true);
  assert.equal(result.dryRun, true);
  assert.ok(result.createdFiles.length >= 3);

  // Confirma que nenhum arquivo foi criado no disco
  for (const relPath of result.createdFiles) {
    const absPath = path.join(ROOT_DIR, relPath);
    assert.equal(fs.existsSync(absPath), false, `Arquivo não deveria existir no disco: ${relPath}`);
  }
});

test('Scaffolder - aborta com erro se ID já existir no catálogo', () => {
  assert.throws(() => {
    createTool({
      id: 'juros', // Já existe no catálogo oficial
      category: 'financas',
      name: 'Novo Juros',
      dryRun: true
    });
  }, /Conflito: Já existe uma ferramenta com o ID "juros"/);
});

test('Scaffolder - aborta com erro se arquivo já existir no disco', () => {
  assert.throws(() => {
    createTool({
      id: 'imc', // js/tools/imc.js já existe
      category: 'saude',
      name: 'Novo IMC',
      dryRun: true
    });
  }, /Conflito/);
});

test('Scaffolder - aborta se categoria for inválida', () => {
  assert.throws(() => {
    createTool({
      id: 'teste-cat-invalida',
      category: 'categoria-inexistente-xyz',
      name: 'Teste',
      dryRun: true
    });
  }, /Categoria inválida/);
});

test('Scaffolder - rollback atômico desfaz alterações se ocorrer erro na gravação', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'scaffolder-rollback-test-'));
  const tempToolsJson = path.join(tempDir, 'tools.json');
  fs.writeFileSync(tempToolsJson, '[]', 'utf-8');

  // Copia categories.json para o sandbox
  const catSource = path.join(ROOT_DIR, 'data', 'categories.json');
  const catDest = path.join(tempDir, 'data', 'categories.json');
  fs.mkdirSync(path.dirname(catDest), { recursive: true });
  fs.copyFileSync(catSource, catDest);

  // Força simulação de erro criando um diretório colidente no caminho do JS
  const blockedJsDir = path.join(tempDir, 'js', 'tools', 'teste-rollback.js');
  fs.mkdirSync(blockedJsDir, { recursive: true });

  assert.throws(() => {
    createTool({
      id: 'teste-rollback',
      category: 'financas',
      name: 'Teste Rollback',
      rootDir: tempDir,
      toolsJsonPath: tempToolsJson
    });
  });

  // O arquivo de página fonte não deve restar após o rollback
  const sourcePage = path.join(tempDir, 'src', 'pages', 'tools', 'financas', 'teste-rollback.page.html');
  assert.equal(fs.existsSync(sourcePage), false, 'Página fonte deveria ter sido removida no rollback');

  // Limpeza do diretório temporário
  fs.rmSync(tempDir, { recursive: true, force: true });
});

test('Scaffolder - cria com sucesso os 4 arquivos em sandbox e registra no tools.json', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'scaffolder-sandbox-'));
  const tempToolsJson = path.join(tempDir, 'tools.json');
  fs.writeFileSync(tempToolsJson, '[]', 'utf-8');

  // Copia categories.json para o sandbox
  const catSource = path.join(ROOT_DIR, 'data', 'categories.json');
  const catDest = path.join(tempDir, 'data', 'categories.json');
  fs.mkdirSync(path.dirname(catDest), { recursive: true });
  fs.copyFileSync(catSource, catDest);

  const res = createTool({
    id: 'teste-sandbox',
    category: 'financas',
    name: 'Calculadora Sandbox',
    withArticle: true,
    rootDir: tempDir,
    toolsJsonPath: tempToolsJson
  });

  assert.equal(res.success, true);
  assert.equal(res.createdFiles.length, 4);

  // Verifica existência dos 4 arquivos
  for (const relPath of res.createdFiles) {
    const absPath = path.join(tempDir, relPath);
    assert.ok(fs.existsSync(absPath), `Arquivo deveria existir: ${relPath}`);
  }

  // Verifica registro em tools.json
  const tools = JSON.parse(fs.readFileSync(tempToolsJson, 'utf-8'));
  assert.equal(tools.length, 1);
  assert.equal(tools[0].id, 'teste-sandbox');
  assert.equal(tools[0].implementation, 'factory');
  assert.equal(tools[0].status, 'draft');
  assert.equal(tools[0].formulaStatus, 'draft');

  // Limpeza
  fs.rmSync(tempDir, { recursive: true, force: true });
});

test('Scaffolder - rejeita path traversal e slugs inválidos em --article-slug', () => {
  const maliciousSlugs = [
    '../artigo',
    'foo/bar',
    '/tmp/artigo',
    'foo\\bar',
    '..',
    '.',
    'Artigo',
    'artigo_invalido',
    'artigo--invalido',
    '-artigo',
    'artigo-'
  ];

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'scaffolder-traversal-'));
  const tempToolsJson = path.join(tempDir, 'tools.json');
  fs.writeFileSync(tempToolsJson, '[]', 'utf-8');

  const catSource = path.join(ROOT_DIR, 'data', 'categories.json');
  const catDest = path.join(tempDir, 'data', 'categories.json');
  fs.mkdirSync(path.dirname(catDest), { recursive: true });
  fs.copyFileSync(catSource, catDest);

  try {
    for (const badSlug of maliciousSlugs) {
      assert.throws(() => {
        createTool({
          id: 'teste-traversal',
          category: 'financas',
          name: 'Teste Traversal',
          withArticle: true,
          articleSlug: badSlug,
          rootDir: tempDir,
          toolsJsonPath: tempToolsJson
        });
      }, /(Slug de artigo inválido|Violação de segurança|Path Traversal)/i);

      // Confirma que nenhum arquivo foi criado no sandbox nem fora dele
      assert.equal(fs.existsSync(path.join(tempDir, 'src')), false);
      assert.equal(fs.existsSync(path.join(tempDir, 'js')), false);
      assert.equal(fs.existsSync(path.join(tempDir, 'tests')), false);

      // Confirma que tools.json permaneceu intocado
      const tools = JSON.parse(fs.readFileSync(tempToolsJson, 'utf-8'));
      assert.equal(tools.length, 0);
    }
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test('Scaffolder - aceita --article-slug válido e cria o artigo corretamente', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'scaffolder-valid-article-'));
  const tempToolsJson = path.join(tempDir, 'tools.json');
  fs.writeFileSync(tempToolsJson, '[]', 'utf-8');

  const catSource = path.join(ROOT_DIR, 'data', 'categories.json');
  const catDest = path.join(tempDir, 'data', 'categories.json');
  fs.mkdirSync(path.dirname(catDest), { recursive: true });
  fs.copyFileSync(catSource, catDest);

  try {
    const res = createTool({
      id: 'teste-artigo-valido',
      category: 'financas',
      name: 'Teste Artigo Válido',
      withArticle: true,
      articleSlug: 'artigo-valido',
      rootDir: tempDir,
      toolsJsonPath: tempToolsJson
    });

    assert.equal(res.success, true);
    assert.equal(res.createdFiles.length, 4);

    const expectedArticle = path.join(tempDir, 'src', 'pages', 'blog', 'artigos', 'artigo-valido.page.html');
    assert.ok(fs.existsSync(expectedArticle), 'Artigo válido deveria ter sido criado');

    const content = fs.readFileSync(expectedArticle, 'utf-8');
    assert.match(content, /canonical: https:\/\/www\.calculadoramaster\.com\/blog\/artigos\/artigo-valido\.html/);

    const tools = JSON.parse(fs.readFileSync(tempToolsJson, 'utf-8'));
    assert.equal(tools.length, 1);
    assert.equal(tools[0].id, 'teste-artigo-valido');
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test('Factory Schema & Scaffolder - validação estrita de --features', () => {
  // 1. Chave não suportada rejeitada no schema
  const res1 = validateToolSchema({
    id: 'teste-feat',
    name: 'Teste',
    category: 'financas',
    audience: 'universal',
    description: 'Desc',
    url: '/tools/financas/teste-feat.html',
    status: 'draft',
    formulaStatus: 'draft',
    implementation: 'factory',
    updatePolicy: 'none',
    features: { featureInexistente: true }
  });
  assert.equal(res1.valid, false);
  assert.ok(res1.errors.some(e => /Features não suportadas/i.test(e)));

  // 2. Valor não booleano rejeitado no schema
  const res2 = validateToolSchema({
    id: 'teste-feat',
    name: 'Teste',
    category: 'financas',
    audience: 'universal',
    description: 'Desc',
    url: '/tools/financas/teste-feat.html',
    status: 'draft',
    formulaStatus: 'draft',
    implementation: 'factory',
    updatePolicy: 'none',
    features: { chart: 'sim' }
  });
  assert.equal(res2.valid, false);
  assert.ok(res2.errors.some(e => /deve ser booleano/i.test(e)));

  // 3. Objeto malformado rejeitado em normalizeFeatures
  assert.throws(() => {
    normalizeFeatures('não-é-objeto');
  }, /objeto declarativo/i);

  assert.throws(() => {
    normalizeFeatures({ chaveDesconhecida: true });
  }, /Features não suportadas/i);

  assert.throws(() => {
    normalizeFeatures({ pdf: 'yes' });
  }, /deve ser booleano/i);
});

// =============================================================================
// 5. DISCOVERY TESTS
// =============================================================================
test('Discovery - factory tools em draft/review são ignoradas pelo SSG', () => {
  const mockTools = [
    {
      id: 'mock-draft',
      category: 'Finanças',
      categorySlug: 'financas',
      status: 'draft',
      formulaStatus: 'draft',
      implementation: 'factory'
    },
    {
      id: 'mock-review',
      category: 'Finanças',
      categorySlug: 'financas',
      status: 'review',
      formulaStatus: 'needs-review',
      implementation: 'factory'
    }
  ];

  const discovery = discoverPublicFactoryTools({ tools: mockTools });
  assert.equal(discovery.pages.length, 0);
  assert.equal(discovery.assets.length, 0);
});

test('Discovery - factory tool published com formulaStatus draft lança erro ao validar integridade', () => {
  const mockTool = {
    id: 'mock-invalid-status',
    name: 'Mock',
    category: 'Finanças',
    categorySlug: 'financas',
    audience: 'universal',
    description: 'Desc',
    url: '/tools/financas/mock-invalid-status.html',
    status: 'published',
    formulaStatus: 'draft', // Inválido para publicação
    implementation: 'factory',
    updatePolicy: 'none'
  };

  assert.throws(() => {
    assertPublicFactoryIntegrity(mockTool);
  }, /formulaStatus/);
});

test('Discovery - factory tool published sem arquivo .page.html ou sem .js lança erro', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'discovery-integrity-'));
  const mockTool = {
    id: 'mock-missing-files',
    name: 'Mock',
    category: 'Finanças',
    categorySlug: 'financas',
    audience: 'universal',
    description: 'Desc',
    url: '/tools/financas/mock-missing-files.html',
    status: 'published',
    formulaStatus: 'verified',
    implementation: 'factory',
    updatePolicy: 'none'
  };

  // Sem arquivos criados, deve falhar
  assert.throws(() => {
    assertPublicFactoryIntegrity(mockTool, { rootDir: tempDir });
  }, /Página fonte obrigatória não encontrada/);

  // Cria a página, mas sem JS, ainda deve falhar
  const pageFile = path.join(tempDir, 'src', 'pages', 'tools', 'financas', 'mock-missing-files.page.html');
  fs.mkdirSync(path.dirname(pageFile), { recursive: true });
  fs.writeFileSync(pageFile, '---\nlayout: tool\n---\n<p>x</p>', 'utf-8');

  assert.throws(() => {
    assertPublicFactoryIntegrity(mockTool, { rootDir: tempDir });
  }, /Módulo JavaScript obrigatório não encontrado/);

  // Cria o JS, agora deve passar
  const jsFile = path.join(tempDir, 'js', 'tools', 'mock-missing-files.js');
  fs.mkdirSync(path.dirname(jsFile), { recursive: true });
  fs.writeFileSync(jsFile, '// JS', 'utf-8');

  assert.doesNotThrow(() => {
    assertPublicFactoryIntegrity(mockTool, { rootDir: tempDir });
  });

  fs.rmSync(tempDir, { recursive: true, force: true });
});

// =============================================================================
// 6. TEMPLATES TESTS
// =============================================================================
test('Templates - todos os templates base existem e contêm os placeholders necessários', () => {
  const pageTemplate = path.join(ROOT_DIR, 'templates', 'tool', 'page.html');
  const jsTemplate = path.join(ROOT_DIR, 'templates', 'tool', 'calculator.js');
  const testTemplate = path.join(ROOT_DIR, 'templates', 'tool', 'calculator.test.js');
  const articleTemplate = path.join(ROOT_DIR, 'templates', 'tool', 'article.page.html');

  assert.ok(fs.existsSync(pageTemplate), 'page.html deve existir');
  assert.ok(fs.existsSync(jsTemplate), 'calculator.js deve existir');
  assert.ok(fs.existsSync(testTemplate), 'calculator.test.js deve existir');
  assert.ok(fs.existsSync(articleTemplate), 'article.page.html deve existir');

  const pageContent = fs.readFileSync(pageTemplate, 'utf-8');
  assert.match(pageContent, /{{ID}}/);
  assert.match(pageContent, /{{NAME}}/);
  assert.match(pageContent, /{{DESCRIPTION}}/);

  const jsContent = fs.readFileSync(jsTemplate, 'utf-8');
  assert.match(jsContent, /normalizeInput/);
  assert.match(jsContent, /validateInput/);
  assert.match(jsContent, /calculate/);
  assert.match(jsContent, /formatResult/);
  assert.match(jsContent, /setupTool/);

  const testContent = fs.readFileSync(testTemplate, 'utf-8');
  assert.match(testContent, /test\.todo/);

  const articleContent = fs.readFileSync(articleTemplate, 'utf-8');
  assert.match(articleContent, /layout: blog/);
  assert.match(articleContent, /robots: noindex, nofollow/);
});

// =============================================================================
// 7. CATEGORY DISCOVERY & LISTING TESTS
// =============================================================================
test('Category Discovery - retorna apenas ferramentas Factory published+verified da categoria', () => {
  const mockTools = [
    {
      id: 'tool-pub-financas',
      name: 'Ferramenta Finanças',
      category: 'Financeiro',
      categorySlug: 'financas',
      url: '/tools/financas/tool-pub-financas.html',
      status: 'published',
      formulaStatus: 'verified',
      implementation: 'factory'
    },
    {
      id: 'tool-draft-financas',
      name: 'Draft Finanças',
      category: 'Financeiro',
      categorySlug: 'financas',
      url: '/tools/financas/tool-draft-financas.html',
      status: 'draft',
      formulaStatus: 'verified',
      implementation: 'factory'
    },
    {
      id: 'tool-review-financas',
      name: 'Review Finanças',
      category: 'Financeiro',
      categorySlug: 'financas',
      url: '/tools/financas/tool-review-financas.html',
      status: 'review',
      formulaStatus: 'verified',
      implementation: 'factory'
    },
    {
      id: 'tool-deprec-financas',
      name: 'Deprecated Finanças',
      category: 'Financeiro',
      categorySlug: 'financas',
      url: '/tools/financas/tool-deprec-financas.html',
      status: 'deprecated',
      formulaStatus: 'verified',
      implementation: 'factory'
    },
    {
      id: 'tool-unverified-financas',
      name: 'Unverified Finanças',
      category: 'Financeiro',
      categorySlug: 'financas',
      url: '/tools/financas/tool-unverified-financas.html',
      status: 'published',
      formulaStatus: 'draft',
      implementation: 'factory'
    },
    {
      id: 'tool-pub-matematica',
      name: 'Ferramenta Matemática',
      category: 'Matemática',
      categorySlug: 'matematica',
      url: '/tools/matematica/tool-pub-matematica.html',
      status: 'published',
      formulaStatus: 'verified',
      implementation: 'factory'
    },
    {
      id: 'tool-legacy-financas',
      name: 'Legada Finanças',
      category: 'Financeiro',
      categorySlug: 'financas',
      url: '/tools/financas/desconto.html',
      status: 'published'
    }
  ];

  // Busca para financeira.html
  const finTools = getPublicFactoryToolsForCategory('financeira.html', { tools: mockTools });
  assert.equal(finTools.length, 1);
  assert.equal(finTools[0].id, 'tool-pub-financas');

  // Busca para matematica.html
  const matTools = getPublicFactoryToolsForCategory('matematica.html', { tools: mockTools });
  assert.equal(matTools.length, 1);
  assert.equal(matTools[0].id, 'tool-pub-matematica');

  // Busca para saude.html (nenhuma ferramenta)
  const sauTools = getPublicFactoryToolsForCategory('saude.html', { tools: mockTools });
  assert.equal(sauTools.length, 0);
});

test('Category Listing - injectCategoryToolCards injeta no grid, preserva legados e não duplica', () => {
  const initialHtml = `
    <div class="grid">
      <a href="{{ROOT_PREFIX}}tools/financas/desconto.html" class="card">Calculadora de Desconto</a>
    </div>
  `;

  const factoryTools = [
    {
      name: 'Calculadora de Empréstimo',
      url: '/tools/financas/emprestimo.html'
    },
    {
      name: 'Tabela de Amortização',
      url: '/tools/financas/amortizacao.html'
    }
  ];

  const updated = injectCategoryToolCards(initialHtml, factoryTools);
  assert.ok(updated.includes('Calculadora de Desconto'), 'Deve preservar card legado');
  assert.ok(updated.includes('href="{{ROOT_PREFIX}}tools/financas/emprestimo.html"'), 'Deve conter card de empréstimo');
  assert.ok(updated.includes('href="{{ROOT_PREFIX}}tools/financas/amortizacao.html"'), 'Deve conter card de amortização');

  // Segunda chamada não deve duplicar cards
  const reUpdated = injectCategoryToolCards(updated, factoryTools);
  const countEmprestimo = (reUpdated.match(/tools\/financas\/emprestimo\.html/g) || []).length;
  const countAmortizacao = (reUpdated.match(/tools\/financas\/amortizacao\.html/g) || []).length;
  assert.equal(countEmprestimo, 1, 'Não deve duplicar card de empréstimo');
  assert.equal(countAmortizacao, 1, 'Não deve duplicar card de amortização');
});

test('Home Listing - getAllPublicFactoryTools retorna somente ferramentas factory públicas (published + verified)', () => {
  const mockTools = [
    {
      id: 'tool-pub-1',
      name: 'Ferramenta Pública 1',
      category: 'Financeiro',
      url: '/tools/financas/tool-pub-1.html',
      status: 'published',
      formulaStatus: 'verified',
      implementation: 'factory'
    },
    {
      id: 'tool-draft',
      name: 'Ferramenta Draft',
      category: 'Financeiro',
      url: '/tools/financas/tool-draft.html',
      status: 'draft',
      formulaStatus: 'verified',
      implementation: 'factory'
    },
    {
      id: 'tool-review',
      name: 'Ferramenta Review',
      category: 'Financeiro',
      url: '/tools/financas/tool-review.html',
      status: 'review',
      formulaStatus: 'verified',
      implementation: 'factory'
    },
    {
      id: 'tool-deprecated',
      name: 'Ferramenta Deprecated',
      category: 'Financeiro',
      url: '/tools/financas/tool-deprecated.html',
      status: 'deprecated',
      formulaStatus: 'verified',
      implementation: 'factory'
    },
    {
      id: 'tool-unverified',
      name: 'Ferramenta Unverified',
      category: 'Financeiro',
      url: '/tools/financas/tool-unverified.html',
      status: 'published',
      formulaStatus: 'draft',
      implementation: 'factory'
    },
    {
      id: 'tool-pub-2',
      name: 'Ferramenta Pública 2',
      category: 'Matemática',
      url: '/tools/matematica/tool-pub-2.html',
      status: 'published',
      formulaStatus: 'verified',
      implementation: 'factory'
    },
    {
      id: 'tool-legacy',
      name: 'Ferramenta Legada',
      category: 'Financeiro',
      url: '/tools/financas/desconto.html',
      status: 'published'
    }
  ];

  const tools = getAllPublicFactoryTools({ tools: mockTools });
  assert.equal(tools.length, 2);
  assert.equal(tools[0].id, 'tool-pub-1');
  assert.equal(tools[1].id, 'tool-pub-2');
});

test('Home Listing - injectHomeToolCards injeta no container de cards, preserva legados e não duplica', () => {
  const initialHtml = `
      <div class="tools-cards-grid" data-tools-grid="all">
        <article class="tool-card">
          <div class="tool-card-header">
            <span class="tool-card-category">Trabalhista</span>
          </div>
          <h3 class="tool-card-title">Calculadora de Horas Extras</h3>
          <p class="tool-card-desc">Calcule o valor da hora normal.</p>
          <div class="tool-card-footer">
            <a href="{{ROOT_PREFIX}}tools/trabalhista/horas-extras.html" class="tool-card-btn">Calcular agora &rarr;</a>
          </div>
        </article>
      </div>
  `;

  const factoryTools = [
    {
      name: 'Calculadora de Empréstimo',
      category: 'Financeiro',
      description: 'Calcule parcelas e juros.',
      url: '/tools/financas/emprestimo.html'
    },
    {
      name: 'Tabela de Amortização',
      category: 'Financeiro',
      description: 'Gere a tabela Price.',
      url: '/tools/financas/amortizacao.html'
    }
  ];

  const updated = injectHomeToolCards(initialHtml, factoryTools);
  assert.ok(updated.includes('Calculadora de Horas Extras'), 'Deve preservar card legado');
  assert.ok(updated.includes('href="{{ROOT_PREFIX}}tools/financas/emprestimo.html"'), 'Deve conter card de empréstimo');
  assert.ok(updated.includes('href="{{ROOT_PREFIX}}tools/financas/amortizacao.html"'), 'Deve conter card de amortização');
  assert.ok(updated.includes('class="tool-card-category"'), 'Deve conter categoria no cabeçalho');

  // Segunda chamada não deve duplicar cards
  const reUpdated = injectHomeToolCards(updated, factoryTools);
  const countEmprestimo = (reUpdated.match(/tools\/financas\/emprestimo\.html/g) || []).length;
  const countAmortizacao = (reUpdated.match(/tools\/financas\/amortizacao\.html/g) || []).length;
  assert.equal(countEmprestimo, 1, 'Não deve duplicar card de empréstimo');
  assert.equal(countAmortizacao, 1, 'Não deve duplicar card de amortização');

  // Teste de fallback caso não tenha data-tools-grid="all", mas tenha classe tools-cards-grid
  const fallbackHtml = `
      <div class="tools-cards-grid">
        <article class="tool-card">
          <h3 class="tool-card-title">Card Legado</h3>
        </article>
      </div>
  `;
  const fallbackUpdated = injectHomeToolCards(fallbackHtml, factoryTools);
  assert.ok(fallbackUpdated.includes('href="{{ROOT_PREFIX}}tools/financas/emprestimo.html"'), 'Deve injetar mesmo sem data-tools-grid explícito via classe tools-cards-grid');

  // Teste defensivo com lista vazia ou nula
  assert.equal(injectHomeToolCards(initialHtml, []), initialHtml);
  assert.equal(injectHomeToolCards(initialHtml, null), initialHtml);
});

test('Security - escapeHtml escapa caracteres &, <, >, ", e apostrofos', () => {
  assert.equal(escapeHtml(null), '');
  assert.equal(escapeHtml(undefined), '');
  assert.equal(escapeHtml('Texto Simples'), 'Texto Simples');
  assert.equal(
    escapeHtml('Cálculo & Economia <script>alert("xss")</script> \'aspas\''),
    'Cálculo &amp; Economia &lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt; &#39;aspas&#39;'
  );
});

test('Security - sanitizeToolUrl aceita caminhos relativos válidos e rejeita esquemas maliciosos', () => {
  // URLs relativas válidas
  assert.equal(sanitizeToolUrl('/tools/financas/emprestimo.html'), 'tools/financas/emprestimo.html');
  assert.equal(sanitizeToolUrl('tools/financas/amortizacao.html'), 'tools/financas/amortizacao.html');
  assert.equal(sanitizeToolUrl('tools/matematica/regra-de-tres.html'), 'tools/matematica/regra-de-tres.html');

  // Esquemas perigosos rejeitados
  assert.equal(sanitizeToolUrl('javascript:alert(1)'), null);
  assert.equal(sanitizeToolUrl('JAVASCRIPT:alert(1)'), null);
  assert.equal(sanitizeToolUrl('javascript://%0aalert(1)'), null);
  assert.equal(sanitizeToolUrl('data:text/html,<script>alert(1)</script>'), null);
  assert.equal(sanitizeToolUrl('vbscript:msgbox(1)'), null);
  assert.equal(sanitizeToolUrl('file:///etc/passwd'), null);
  assert.equal(sanitizeToolUrl('http://evil.com'), null);
  assert.equal(sanitizeToolUrl('https://evil.com'), null);

  // Tentativas de evasão via entidades HTML (XSS bypass)
  assert.equal(sanitizeToolUrl('javascript&#58;alert(1)'), null);
  assert.equal(sanitizeToolUrl('javascript&colon;alert(1)'), null);
  assert.equal(sanitizeToolUrl('tools/calc.html&quot;/onmouseover=alert(1)'), null);
  assert.equal(sanitizeToolUrl('tools/calc.html&#34;/onmouseover=alert(1)'), null);

  // Tentativas de evasão via percent-encoding
  assert.equal(sanitizeToolUrl('tools/calc.html%22onmouseover=alert(1)'), null);
  assert.equal(sanitizeToolUrl('tools/calc.html%3Cscript%3E'), null);

  // URLs relativas a protocolo e caminhos com backslash
  assert.equal(sanitizeToolUrl('//evil.com/phishing'), null);
  assert.equal(sanitizeToolUrl('\\\\evil.com\\share'), null);

  // Caracteres que quebram atributos ou tentam XSS
  assert.equal(sanitizeToolUrl('tools/calc.html" onclick="alert(1)'), null);
  assert.equal(sanitizeToolUrl('tools/calc.html\'><script>'), null);
  assert.equal(sanitizeToolUrl('tools/calc.html`'), null);
  assert.equal(sanitizeToolUrl('tools/calc.html\n'), null);
  assert.equal(sanitizeToolUrl('tools/calc:foo.html'), null);
  assert.equal(sanitizeToolUrl('tools/calc.html?param=1'), null);
  assert.equal(sanitizeToolUrl('tools/calc.html#hash'), null);
  assert.equal(sanitizeToolUrl(''), null);
  assert.equal(sanitizeToolUrl(null), null);
});

test('Security CSS - hasCssClass previne falsos positivos com sufixos hifenizados', () => {
  assert.equal(hasCssClass('<div class="grid">', 'grid'), true);
  assert.equal(hasCssClass('<div class="header-grid">', 'grid'), false);
  assert.equal(hasCssClass('<div class="categories-grid">', 'grid'), false);
  assert.equal(hasCssClass('<div class="tools-cards-grid">', 'grid'), false);
  assert.equal(hasCssClass('<div class="featured-grid">', 'grid'), false);
  assert.equal(hasCssClass('<div class="main grid secondary">', 'grid'), true);
  assert.equal(hasCssClass('<div class="tools-cards-grid">', 'tools-cards-grid'), true);
  assert.equal(hasCssClass('<div class="sub-tools-cards-grid">', 'tools-cards-grid'), false);
  assert.equal(hasCssClass('<div>', 'grid'), false);
});

test('Security XSS - injectHomeToolCards escapa dados dinamicos e rejeita URLs maliciosas', () => {
  const initialHtml = `
    <div class="tools-cards-grid" data-tools-grid="all">
      <article class="tool-card">
        <h3 class="tool-card-title">Card Legado</h3>
      </article>
    </div>
  `;

  const maliciousTools = [
    {
      name: '<script>alert("XSS-NAME")</script>',
      category: '<b>Categoria<script></b>',
      description: '<img src=x onerror=alert("XSS-DESC")> & "aspas" \'simples\'',
      url: '/tools/financas/teste-xss.html'
    },
    {
      name: 'Ferramenta Esquema Malicioso',
      category: 'Financeiro',
      description: 'Tentativa de javascript:',
      url: 'javascript:alert("XSS-URL")'
    },
    {
      name: 'Ferramenta Entidade Maliciosa',
      category: 'Financeiro',
      description: 'Tentativa de entidade:',
      url: 'tools/calc.html&quot;/onmouseover=alert(1)'
    },
    {
      name: 'Ferramenta Data URL',
      category: 'Financeiro',
      description: 'Tentativa de data:',
      url: 'data:text/html,<script>alert(1)</script>'
    }
  ];

  const result = injectHomeToolCards(initialHtml, maliciousTools);

  // 1. Tags HTML maliciosas não devem estar presentes de forma não-escapada
  assert.equal(result.includes('<script>'), false, 'Não deve conter tag <script> não escapada');
  assert.equal(result.includes('<img src=x'), false, 'Não deve conter tag <img> maliciosa');
  assert.equal(result.includes('<b>Categoria'), false, 'Não deve conter tag <b> não escapada');

  // 2. Valores devem aparecer devidamente escapados
  assert.ok(result.includes('&lt;script&gt;alert(&quot;XSS-NAME&quot;)&lt;/script&gt;'), 'Nome deve estar escapado');
  assert.ok(result.includes('&lt;b&gt;Categoria&lt;script&gt;&lt;/b&gt;'), 'Categoria deve estar escapada');
  assert.ok(result.includes('&lt;img src=x onerror=alert(&quot;XSS-DESC&quot;)&gt; &amp; &quot;aspas&quot; &#39;simples&#39;'), 'Descrição deve estar escapada');

  // 3. URLs maliciosas e tentativas de quebra de atributo não são injetadas
  assert.equal(result.includes('javascript:'), false, 'URL com javascript: não deve ser injetada');
  assert.equal(result.includes('&quot;/onmouseover'), false, 'Tentativa de quebra de atributo não deve ser injetada');
  assert.equal(result.includes('data:text/html'), false, 'URL com data: não deve ser injetada');
  assert.equal(result.includes('Ferramenta Esquema Malicioso'), false, 'Ferramenta com URL maliciosa não deve gerar card');
  assert.equal(result.includes('Ferramenta Entidade Maliciosa'), false, 'Ferramenta com entidade na URL não deve gerar card');
  assert.equal(result.includes('Ferramenta Data URL'), false, 'Ferramenta com data URL não deve gerar card');

  // 4. Ferramenta válida com payload sanitizado foi injetada com URL segura
  assert.ok(result.includes('href="{{ROOT_PREFIX}}tools/financas/teste-xss.html"'), 'URL segura deve ser preservada');
});

test('Security XSS - injectCategoryToolCards escapa nome da ferramenta e rejeita URLs maliciosas', () => {
  const initialHtml = `
    <div class="grid">
      <a href="{{ROOT_PREFIX}}tools/financas/desconto.html" class="card">Desconto</a>
    </div>
  `;

  const maliciousTools = [
    {
      name: '<script>alert("XSS")</script> & "Lucro"',
      url: '/tools/financas/calc-segura.html'
    },
    {
      name: 'Tentativa Javascript',
      url: 'javascript:alert(1)'
    },
    {
      name: 'Tentativa Breakout',
      url: 'tools/calc.html&quot;/onmouseover=alert(1)'
    }
  ];

  const result = injectCategoryToolCards(initialHtml, maliciousTools);
  assert.equal(result.includes('<script>'), false, 'Não deve conter script não escapado');
  assert.ok(result.includes('&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt; &amp; &quot;Lucro&quot;'), 'Nome deve estar escapado');
  assert.equal(result.includes('javascript:'), false, 'URL com javascript: deve ser rejeitada');
  assert.equal(result.includes('&quot;/onmouseover'), false, 'Breakout deve ser rejeitado');
  assert.equal(result.includes('Tentativa Javascript'), false, 'Card com javascript: não deve ser criado');
  assert.equal(result.includes('Tentativa Breakout'), false, 'Card com breakout não deve ser criado');
  assert.ok(result.includes('href="{{ROOT_PREFIX}}tools/financas/calc-segura.html"'), 'Card seguro deve ser inserido');
});

test('HTML Parser - findContainerBounds ignora comentarios HTML com divs ficticias, blocos script/style e rastreia aninhamento', () => {
  const htmlWithComments = `
    <!-- <div class="tools-cards-grid" data-tools-grid="all">fake comment grid with "quotes" and <tags> and > inside</div> -->
    <!-- comment 2 --!>
    <script>
      const fake = '<div class="tools-cards-grid"></div>';
      // <!-- <div>
    </script>
    <style>
      div.tools-cards-grid { color: red; }
    </style>
    <div class="header-grid">Not target</div>
    <div class="tools-cards-grid" data-tools-grid="all" data-title="hello > world">
      <!-- <div> nested comment </div> -->
      <!-- </div> stray close inside -->
      <article class="tool-card">
        <div class="tool-card-header">
          <div class="inner-badge"><span>Cat</span></div>
        </div>
        <p>Texto com <span data-info="a > b">conteudo</span></p>
      </article>
      <!-- <div> final comment </div> -->
    </div>
    <!-- <div> after container </div> -->
    <div class="after-grid">Done</div>
  `;

  const bounds = findContainerBounds(htmlWithComments, tag => /data-tools-grid="all"/i.test(tag) || hasCssClass(tag, 'tools-cards-grid'));
  assert.ok(bounds, 'Deve encontrar limites do contêiner');

  const openTag = htmlWithComments.slice(bounds.openTagStart, bounds.openTagEnd);
  const closeTag = htmlWithComments.slice(bounds.closeTagStart, bounds.closeTagEnd);
  const inner = htmlWithComments.slice(bounds.openTagEnd, bounds.closeTagStart);

  assert.equal(openTag, '<div class="tools-cards-grid" data-tools-grid="all" data-title="hello > world">');
  assert.equal(closeTag, '</div>');
  assert.ok(inner.includes('nested comment'), 'Conteúdo interno deve conter o comentário interno preservado');
  assert.ok(inner.includes('inner-badge'), 'Conteúdo interno deve conter as divs aninhadas');
  assert.ok(!inner.includes('Not target'), 'Conteúdo interno não deve conter elementos anteriores');
  assert.ok(!inner.includes('Done'), 'Conteúdo interno não deve ultrapassar o contêiner');
});

test('Home Listing - injectHomeToolCards lida com comentarios e divs aninhadas sem corromper layout', () => {
  const complexHtml = `
    <!-- <div class="tools-cards-grid" data-tools-grid="all">comentada</div> -->
    <div class="tools-cards-grid" data-tools-grid="all">
      <!-- <div> comentario antes </div> -->
      <article class="tool-card">
        <div class="tool-card-header">
          <span class="tool-card-category">Trabalhista</span>
        </div>
        <h3 class="tool-card-title">Horas Extras</h3>
        <p class="tool-card-desc">Calculo de horas.</p>
        <div class="tool-card-footer">
          <a href="{{ROOT_PREFIX}}tools/trabalhista/horas-extras.html" class="tool-card-btn">Calcular</a>
        </div>
      </article>
      <!-- <div> comentario depois </div> -->
    </div>
    <div class="outra-secao">
      <p>Conteudo fora da grade</p>
    </div>
  `;

  const factoryTools = [
    {
      name: 'Calculadora de Empréstimo',
      category: 'Financeiro',
      description: 'Parcelas e juros.',
      url: '/tools/financas/emprestimo.html'
    }
  ];

  const updated = injectHomeToolCards(complexHtml, factoryTools);
  assert.ok(updated.includes('<!-- <div class="tools-cards-grid" data-tools-grid="all">comentada</div> -->'), 'Preserva comentário anterior');
  assert.ok(updated.includes('<!-- <div> comentario antes </div> -->'), 'Preserva comentário antes do card');
  assert.ok(updated.includes('<!-- <div> comentario depois </div> -->'), 'Preserva comentário depois do card');
  assert.ok(updated.includes('Horas Extras'), 'Preserva card legado com suas divs aninhadas');
  assert.ok(updated.includes('Calculadora de Empréstimo'), 'Insere novo card da Factory');
  assert.ok(updated.includes('<div class="outra-secao">'), 'Preserva elementos após o container');

  // Assegura que o novo card está dentro do contêiner e antes da outra seção
  const cardIndex = updated.indexOf('Calculadora de Empréstimo');
  const outraSecaoIndex = updated.indexOf('<div class="outra-secao">');
  assert.ok(cardIndex < outraSecaoIndex, 'Card inserido deve estar antes da outra seção');
});

test('Category Listing - injectCategoryToolCards com comentarios, divs aninhadas e preservacao estrutural', () => {
  const categoryHtml = `
    <!-- <div class="grid">comentada</div> -->
    <section class="tools category-tools">
      <div class="container">
        <!-- <div> antes da grid </div> -->
        <div class="grid">
          <!-- <div> dentro da grid </div> -->
          <a href="{{ROOT_PREFIX}}tools/financas/desconto.html" class="card">Calculadora de Desconto</a>
          <div class="sub-bloco"><span>Informação extra</span></div>
          <!-- </div> stray no comentario -->
        </div>
      </div>
    </section>
    <footer>Rodape</footer>
  `;

  const factoryTools = [
    {
      name: 'Calculadora de Empréstimo',
      url: '/tools/financas/emprestimo.html'
    }
  ];

  const updated = injectCategoryToolCards(categoryHtml, factoryTools);

  // Preservação estrutural completa
  assert.ok(updated.includes('<section class="tools category-tools">'), 'Preserva section category-tools');
  assert.ok(updated.includes('<div class="container">'), 'Preserva container');
  assert.ok(updated.includes('<!-- <div> dentro da grid </div> -->'), 'Preserva comentário interno');
  assert.ok(updated.includes('<div class="sub-bloco"><span>Informação extra</span></div>'), 'Preserva div aninhada');
  assert.ok(updated.includes('Calculadora de Desconto'), 'Preserva card legado');
  assert.ok(updated.includes('href="{{ROOT_PREFIX}}tools/financas/emprestimo.html"'), 'Injeta card da Factory');
  assert.ok(updated.includes('<footer>Rodape</footer>'), 'Preserva footer');

  // Inserção no local correto: antes do fechamento de <div class="grid">
  const emprestimoIdx = updated.indexOf('href="{{ROOT_PREFIX}}tools/financas/emprestimo.html"');
  const footerIdx = updated.indexOf('<footer>Rodape</footer>');
  assert.ok(emprestimoIdx < footerIdx, 'Card de empréstimo deve estar antes do footer');
});
