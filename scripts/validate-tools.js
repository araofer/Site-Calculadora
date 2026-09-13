/**
 * Validador do Catálogo de Ferramentas - Calculadora Master
 * Executa checagens de integridade estrutural, relacional e semântica sobre data/tools.json.
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const TOOLS_JSON_PATH = path.join(ROOT_DIR, 'data', 'tools.json');

const VALID_CATEGORIES = [
  'Financeiro',
  'Trabalhista',
  'Matemática',
  'Saúde',
  'Conversores',
  'Utilidades'
];

const VALID_STATUSES = ['published', 'draft', 'deprecated'];

const REQUIRED_FIELDS = [
  'id',
  'slug',
  'name',
  'category',
  'categorySlug',
  'description',
  'url',
  'keywords',
  'related',
  'status'
];

function validateTools() {
  const errors = [];

  if (!fs.existsSync(TOOLS_JSON_PATH)) {
    console.error(`ERRO CRÍTICO: Arquivo não encontrado: ${TOOLS_JSON_PATH}`);
    process.exit(1);
  }

  let tools;
  try {
    const rawContent = fs.readFileSync(TOOLS_JSON_PATH, 'utf-8');
    tools = JSON.parse(rawContent);
  } catch (err) {
    console.error(`ERRO CRÍTICO: Falha ao ler ou analisar ${TOOLS_JSON_PATH}: ${err.message}`);
    process.exit(1);
  }

  if (!Array.isArray(tools)) {
    console.error('ERRO CRÍTICO: data/tools.json deve conter um array de ferramentas.');
    process.exit(1);
  }

  const seenIds = new Set();
  const seenSlugs = new Set();
  const seenUrls = new Set();
  const allIds = new Set(tools.map(t => t.id).filter(Boolean));

  tools.forEach((tool, index) => {
    const prefix = `Ferramenta #${index + 1} (${tool.id || 'sem ID'}):`;

    // 1. Campos obrigatórios
    REQUIRED_FIELDS.forEach(field => {
      if (tool[field] === undefined || tool[field] === null || tool[field] === '') {
        errors.push(`${prefix} Campo obrigatório ausente ou vazio: "${field}".`);
      }
    });

    // 2. Unicidade de ID
    if (tool.id) {
      if (seenIds.has(tool.id)) {
        errors.push(`${prefix} ID duplicado detectado: "${tool.id}".`);
      }
      seenIds.add(tool.id);
    }

    // 3. Unicidade de Slug
    if (tool.slug) {
      if (seenSlugs.has(tool.slug)) {
        errors.push(`${prefix} Slug duplicado detectado: "${tool.slug}".`);
      }
      seenSlugs.add(tool.slug);
    }

    // 4. Categoria válida
    if (tool.category && !VALID_CATEGORIES.includes(tool.category)) {
      errors.push(`${prefix} Categoria inválida: "${tool.category}". Categorias permitidas: ${VALID_CATEGORIES.join(', ')}.`);
    }

    // 5. Status válido
    if (tool.status && !VALID_STATUSES.includes(tool.status)) {
      errors.push(`${prefix} Status inválido: "${tool.status}". Status permitidos: ${VALID_STATUSES.join(', ')}.`);
    }

    // 6. Keywords
    if (!Array.isArray(tool.keywords) || tool.keywords.length === 0) {
      errors.push(`${prefix} O campo "keywords" deve ser um array com ao menos 1 termo.`);
    }

    // 7. Unicidade e existência de URL
    if (tool.url) {
      const normalizedUrl = tool.url.toLowerCase();
      if (seenUrls.has(normalizedUrl)) {
        errors.push(`${prefix} URL duplicada detectada: "${tool.url}".`);
      }
      seenUrls.add(normalizedUrl);

      // Checa existência do arquivo físico no repositório
      const relativeFilePath = tool.url.replace(/^\/+/, '');
      const absoluteFilePath = path.join(ROOT_DIR, relativeFilePath);

      if (!fs.existsSync(absoluteFilePath)) {
        errors.push(`${prefix} Arquivo HTML não encontrado no disco: "${relativeFilePath}".`);
      }
    }

    // 8. Relacionamentos
    if (Array.isArray(tool.related)) {
      if (tool.related.length > 4) {
        errors.push(`${prefix} Excesso de ferramentas relacionadas: possui ${tool.related.length} (máximo permitido é 4).`);
      }

      if (tool.related.includes(tool.id)) {
        errors.push(`${prefix} Auto-recomendação proibida: a ferramenta não pode recomendar a si mesma.`);
      }

      tool.related.forEach(relId => {
        if (!allIds.has(relId)) {
          errors.push(`${prefix} Relacionamento aponta para ID inexistente: "${relId}".`);
        }
      });
    } else {
      errors.push(`${prefix} O campo "related" deve ser um array de IDs.`);
    }
  });

  if (errors.length > 0) {
    console.error(`\n❌ Falha na validação do catálogo (${errors.length} erro(s) encontrado(s)):\n`);
    errors.forEach(err => console.error(`  - ${err}`));
    process.exit(1);
  }

  console.log(`\n✓ ${tools.length} ferramentas validadas com sucesso`);
  console.log('✓ URLs válidas e arquivos existentes no disco');
  console.log('✓ IDs e slugs únicos');
  console.log('✓ Relacionamentos válidos (sem auto-recomendações, máx 4)');
  console.log('✓ Categorias e campos obrigatórios válidos\n');
  process.exit(0);
}

validateTools();
