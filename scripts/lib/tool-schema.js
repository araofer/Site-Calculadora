/**
 * Tool Schema Validator - Calculadora Master
 * Validador estrito de esquemas para ferramentas da Calculadora Master.
 * Diferencia ferramentas legadas de ferramentas gerenciadas pela Factory.
 * Zero dependências externas.
 */

const ID_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const VALID_STATUSES = Object.freeze(['draft', 'review', 'published', 'deprecated']);
const VALID_FORMULA_STATUSES = Object.freeze(['draft', 'verified', 'needs-review']);
const VALID_AUDIENCES = Object.freeze(['universal', 'brasil']);

const SUPPORTED_FEATURES = Object.freeze([
  'chart',
  'table',
  'pdf',
  'copy',
  'share',
  'print',
  'favorite',
  'article'
]);

const DEFAULT_FEATURES = Object.freeze({
  chart: false,
  table: false,
  pdf: false,
  copy: true,
  share: true,
  print: true,
  favorite: true,
  article: false
});

/**
 * Verifica se um objeto representa uma ferramenta Factory.
 *
 * @param {Object} tool
 * @returns {boolean}
 */
function isFactoryTool(tool) {
  return Boolean(tool && tool.implementation === 'factory');
}

/**
 * Normaliza o mapa de features aplicando defaults conservadores.
 *
 * @param {Object} [features]
 * @returns {Object}
 */
function normalizeFeatures(features = {}) {
  if (!features || typeof features !== 'object' || Array.isArray(features)) {
    throw new Error('Campo "features" deve ser um objeto declarativo válido.');
  }

  const unknownKeys = Object.keys(features).filter(k => !SUPPORTED_FEATURES.includes(k));
  if (unknownKeys.length > 0) {
    throw new Error(`Features não suportadas: ${unknownKeys.join(', ')}. Permitidas: ${SUPPORTED_FEATURES.join(', ')}.`);
  }

  const normalized = { ...DEFAULT_FEATURES };
  for (const [key, value] of Object.entries(features)) {
    if (typeof value !== 'boolean') {
      throw new Error(`Valor da feature "${key}" deve ser booleano (true ou false). Recebido: ${typeof value}.`);
    }
    normalized[key] = value;
  }
  return normalized;
}

/**
 * Valida o esquema de uma ferramenta.
 * Suporta ferramentas Factory (estrito) e ferramentas legadas (permissivo).
 *
 * @param {Object} tool Objeto da ferramenta
 * @param {Object} [options]
 * @param {Set<string>|Array<string>} [options.validCategories] Lista/Set de slugs de categoria válidos
 * @returns {{valid: boolean, errors: string[]}}
 */
function validateToolSchema(tool, { validCategories } = {}) {
  const errors = [];

  if (!tool || typeof tool !== 'object' || Array.isArray(tool)) {
    return { valid: false, errors: ['A ferramenta deve ser um objeto JSON válido.'] };
  }

  const prefix = `[${tool.id || 'sem ID'}]`;

  // 1. Validação de ID
  if (!tool.id || typeof tool.id !== 'string') {
    errors.push(`${prefix} Campo "id" é obrigatório e deve ser uma string.`);
  } else if (!ID_REGEX.test(tool.id)) {
    errors.push(`${prefix} ID inválido: "${tool.id}". Deve corresponder ao padrão ^[a-z0-9]+(?:-[a-z0-9]+)*$.`);
  }

  // 2. Validação de Nome
  if (!tool.name || typeof tool.name !== 'string' || tool.name.trim() === '') {
    errors.push(`${prefix} Campo "name" é obrigatório e não pode ser vazio.`);
  }

  // 3. Validação de Descrição
  if (!tool.description || typeof tool.description !== 'string' || tool.description.trim() === '') {
    errors.push(`${prefix} Campo "description" é obrigatório e não pode ser vazio.`);
  }

  // 4. Validação de Status
  if (!tool.status || typeof tool.status !== 'string') {
    errors.push(`${prefix} Campo "status" é obrigatório.`);
  } else if (!VALID_STATUSES.includes(tool.status)) {
    errors.push(`${prefix} Status inválido: "${tool.status}". Permitidos: ${VALID_STATUSES.join(', ')}.`);
  }

  // 5. Validação de Categoria
  const catKey = tool.categorySlug || tool.category;
  if (!catKey || typeof catKey !== 'string') {
    errors.push(`${prefix} Categoria é obrigatória.`);
  } else if (validCategories) {
    const validCatList = Array.isArray(validCategories)
      ? validCategories
      : Array.from(validCategories);

    const normCat = catKey.toLowerCase().trim();
    const isCatValid = validCatList.some(c => c.toLowerCase() === normCat);
    if (!isCatValid) {
      errors.push(`${prefix} Categoria inválida: "${catKey}". Categorias permitidas: ${validCatList.join(', ')}.`);
    }
  }

  // Se for ferramenta Factory, aplica contrato estrito da Factory
  if (isFactoryTool(tool)) {
    // Audience obrigatório
    if (!tool.audience || typeof tool.audience !== 'string') {
      errors.push(`${prefix} Campo "audience" é obrigatório para ferramentas factory.`);
    } else if (!VALID_AUDIENCES.includes(tool.audience)) {
      errors.push(`${prefix} Audience inválido: "${tool.audience}". Permitidos: ${VALID_AUDIENCES.join(', ')}.`);
    }

    // FormulaStatus obrigatório
    if (!tool.formulaStatus || typeof tool.formulaStatus !== 'string') {
      errors.push(`${prefix} Campo "formulaStatus" é obrigatório para ferramentas factory.`);
    } else if (!VALID_FORMULA_STATUSES.includes(tool.formulaStatus)) {
      errors.push(`${prefix} formulaStatus inválido: "${tool.formulaStatus}". Permitidos: ${VALID_FORMULA_STATUSES.join(', ')}.`);
    }

    // REGRA DE OURO: published exige formulaStatus === 'verified'
    if (tool.status === 'published' && tool.formulaStatus !== 'verified') {
      errors.push(`${prefix} Ferramenta com status "published" exige formulaStatus "verified" (atual: "${tool.formulaStatus}").`);
    }

    // Features
    if (tool.features !== undefined) {
      if (typeof tool.features !== 'object' || tool.features === null || Array.isArray(tool.features)) {
        errors.push(`${prefix} Campo "features" deve ser um objeto declarativo.`);
      } else {
        const unknownKeys = Object.keys(tool.features).filter(k => !SUPPORTED_FEATURES.includes(k));
        if (unknownKeys.length > 0) {
          errors.push(`${prefix} Features não suportadas: ${unknownKeys.join(', ')}. Permitidas: ${SUPPORTED_FEATURES.join(', ')}.`);
        }
        for (const [key, val] of Object.entries(tool.features)) {
          if (SUPPORTED_FEATURES.includes(key) && typeof val !== 'boolean') {
            errors.push(`${prefix} Valor da feature "${key}" deve ser booleano.`);
          }
        }
      }
    }

    // sourceReferences opcional
    if (tool.sourceReferences !== undefined) {
      if (!Array.isArray(tool.sourceReferences)) {
        errors.push(`${prefix} Campo "sourceReferences" deve ser um array.`);
      }
    }
  } else {
    // Ferramentas legadas: checagens básicas existentes para não quebrar compatibilidade
    if (tool.status === 'published' && !tool.url) {
      errors.push(`${prefix} Ferramenta legada publicada deve possuir "url".`);
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

module.exports = {
  ID_REGEX,
  VALID_STATUSES,
  VALID_FORMULA_STATUSES,
  VALID_AUDIENCES,
  SUPPORTED_FEATURES,
  DEFAULT_FEATURES,
  isFactoryTool,
  normalizeFeatures,
  validateToolSchema
};
