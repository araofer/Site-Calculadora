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
  assertPublicFactoryIntegrity,
  discoverPublicFactoryTools
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
