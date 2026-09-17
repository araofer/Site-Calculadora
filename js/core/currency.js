/**
 * Core Currency Utilities - Calculadora Master
 * Módulo ES nativo para manipulação, parsing e máscara de moeda brasileira (BRL).
 * Zero APIs globais.
 */

/**
 * Converte string de moeda brasileira ou número para valor numérico puro.
 * Suporta defensivamente NaN, Infinity, strings vazias e opção de números negativos.
 *
 * @param {string|number} valor Valor de entrada a ser convertido
 * @param {Object} [opcoes={}] Opções de parsing
 * @param {boolean} [opcoes.allowNegative=false] Permitir valores negativos
 * @returns {number} Valor numérico convertido ou 0
 */
export function parseBRLCurrency(valor, opcoes = {}) {
  const allowNegative = Boolean(opcoes && opcoes.allowNegative);

  if (valor === undefined || valor === null) return 0;
  if (typeof valor === "number") {
    if (!Number.isFinite(valor)) return 0;
    if (!allowNegative && valor < 0) return 0;
    return valor;
  }

  const texto = valor.toString().trim();
  if (!texto) return 0;

  const isNegativeInput = texto.startsWith("-") || (texto.startsWith("(") && texto.endsWith(")"));
  if (isNegativeInput && !allowNegative) return 0;

  const isNegativo = isNegativeInput && allowNegative;

  // Remove pontos de milhares e substitui vírgula decimal por ponto
  const limpo = texto.replace(/\./g, "").replace(",", ".");
  const apenasNumeros = limpo.replace(/[^0-9.]/g, "");
  const num = Number(apenasNumeros);

  if (!Number.isFinite(num) || isNaN(num)) return 0;

  const resultado = isNegativo ? -num : num;
  if (!allowNegative && resultado < 0) return 0;

  return resultado;
}

/**
 * Aplica máscara de moeda BRL em tempo real a um elemento input ou objeto com propriedade value.
 * Campo vazio permanece vazio. Suporta arquiteturalmente números negativos quando explicitamente habilitado.
 *
 * @param {HTMLInputElement|{value: string}} campo Elemento ou objeto com propriedade value
 * @param {Object} [opcoes={}] Opções de formatação
 * @param {boolean} [opcoes.allowNegative=false] Permitir prefixo negativo "-"
 * @returns {string} String formatada
 */
export function formatBRLCurrencyInput(campo, opcoes = {}) {
  if (!campo) return "";
  const allowNegative = Boolean(opcoes && opcoes.allowNegative);

  const rawValue = typeof campo === "string" ? campo : campo.value || "";
  const textoLimpo = rawValue.toString().trim();
  const isNegativo = allowNegative && textoLimpo.startsWith("-");

  const digitos = textoLimpo.replace(/\D/g, "");

  if (!digitos) {
    if (typeof campo !== "string") {
      campo.value = "";
    }
    return "";
  }

  let valor = (Number(digitos) / 100).toFixed(2) + "";
  valor = valor.replace(".", ",");
  valor = valor.replace(/(\d)(?=(\d{3})+(?!\d))/g, "$1.");

  if (isNegativo && Number(digitos) > 0) {
    valor = "-" + valor;
  }

  if (typeof campo !== "string") {
    campo.value = valor;
  }
  return valor;
}

/**
 * Formata número no padrão monetário brasileiro (com 2 casas decimais).
 *
 * @param {number|string} valor Valor numérico
 * @param {boolean|Object} [opcoes=false] Se boolean, define incluirSimbolo. Se objeto, opções { includeSymbol, allowNegative }
 * @returns {string} String formatada (ex: "1.250,00" ou "R$ 1.250,00")
 */
export function formatBRL(valor, opcoes = false) {
  let includeSymbol = false;
  let allowNegative = true;

  if (typeof opcoes === "boolean") {
    includeSymbol = opcoes;
  } else if (typeof opcoes === "object" && opcoes !== null) {
    includeSymbol = Boolean(opcoes.includeSymbol);
    if (opcoes.allowNegative !== undefined) {
      allowNegative = Boolean(opcoes.allowNegative);
    }
  }

  let num = 0;
  if (typeof valor === "number") {
    num = Number.isFinite(valor) ? valor : 0;
  } else {
    num = parseBRLCurrency(valor, { allowNegative });
  }

  if (!allowNegative && num < 0) {
    num = 0;
  }

  const formatado = num.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

  return includeSymbol ? `R$ ${formatado}` : formatado;
}

// Aliases para compatibilidade de nomenclatura
export const parseMoeda = parseBRLCurrency;
export const mascaraMoeda = formatBRLCurrencyInput;

/**
 * Converte string ou número em formato financeiro (PT-BR ou padrão internacional)
 * para número float de forma estrita, segura e determinística.
 *
 * Aceita:
 * - 1000 -> 1000
 * - 1000.50 -> 1000.50
 * - 1000,50 -> 1000.50
 * - 1.000 -> 1000
 * - 1.000,50 -> 1000.50
 * - 1.234.567,89 -> 1234567.89
 * - 1,234.56 -> 1234.56
 * - R$ 1.000,50 -> 1000.50
 * - 1,5% ou 1.5% -> 1.5
 *
 * Rejeita (retorna NaN):
 * - 1..000
 * - 1,,000
 * - 1.00.0
 * - 1,00,0
 * - abc
 * - números negativos quando allowNegative for false
 * - caracteres inválidos, pontuações consecutivas ou malformadas
 *
 * @param {string|number} raw Entrada bruta a ser parseada
 * @param {Object} [options={}] Opções de parsing e validação
 * @param {boolean} [options.allowNegative=false] Permitir números negativos
 * @param {boolean} [options.integer=false] Exigir número inteiro
 * @param {number} [options.min] Limite mínimo permitido (inclusivo)
 * @param {number} [options.max] Limite máximo permitido (inclusivo)
 * @returns {number} Número parseado ou NaN se inválido
 */
export function parseFinancialNumberPtBr(raw, options = {}) {
  const allowNegative = Boolean(options && options.allowNegative);
  const integer = Boolean(options && options.integer);
  const min = options && typeof options.min === 'number' ? options.min : undefined;
  const max = options && typeof options.max === 'number' ? options.max : undefined;

  if (raw === undefined || raw === null) return NaN;

  if (typeof raw === 'number') {
    if (!Number.isFinite(raw)) return NaN;
    if (!allowNegative && raw < 0) return NaN;
    if (integer && !Number.isInteger(raw)) return NaN;
    if (min !== undefined && raw < min) return NaN;
    if (max !== undefined && raw > max) return NaN;
    return raw === 0 ? 0 : raw;
  }

  if (typeof raw !== 'string') return NaN;

  let str = raw.trim();
  if (!str) return NaN;

  let isNegative = false;
  if (str.startsWith('-')) {
    isNegative = true;
    str = str.slice(1).trim();
  } else if (str.startsWith('(') && str.endsWith(')')) {
    isNegative = true;
    str = str.slice(1, -1).trim();
  }

  // Remove prefixo de moeda BRL (ex: "R$", "r$")
  str = str.replace(/^R\$\s*/i, '').trim();

  // Verifica se o sinal negativo veio após o prefixo de moeda (ex: "R$ -100")
  if (str.startsWith('-')) {
    if (isNegative) return NaN;
    isNegative = true;
    str = str.slice(1).trim();
  }

  if (isNegative && !allowNegative) return NaN;

  // Remove sufixo percentual opcional (ex: "1,5%", "1.5 %")
  str = str.replace(/%\s*$/, '').trim();

  // A string deve conter exclusivamente dígitos e os separadores '.' ou ','
  // Não pode começar nem terminar com separador, nem ter separadores adjacentes
  if (!/^\d+(?:[.,]\d+)*$/.test(str)) {
    return NaN;
  }

  const hasComma = str.includes(',');
  const hasDot = str.includes('.');
  let cleanStr = str;

  if (hasComma && hasDot) {
    // Formato brasileiro padrão: milhares com '.' e decimais com ',' (ex: 1.234.567,89 ou 1.000,50)
    const isBrPattern = /^\d{1,3}(\.\d{3})+,\d+$/.test(str);
    // Formato internacional: milhares com ',' e decimais com '.' (ex: 1,234,567.89 ou 1,234.56)
    const isIntlPattern = /^\d{1,3}(,\d{3})+\.\d+$/.test(str);

    if (isBrPattern) {
      cleanStr = str.replace(/\./g, '').replace(',', '.');
    } else if (isIntlPattern) {
      cleanStr = str.replace(/,/g, '');
    } else {
      return NaN;
    }
  } else if (hasComma) {
    // Se só tem vírgula, em PT-BR aceita-se apenas 1 vírgula decimal (ex: 1000,50 ou 1,5)
    // Se tiver mais de uma vírgula (ex: 1,00,0 ou 1,000,000 sem ponto), é inválido em PT-BR
    const commaCount = (str.match(/,/g) || []).length;
    if (commaCount !== 1) {
      return NaN;
    }
    cleanStr = str.replace(',', '.');
  } else if (hasDot) {
    // Se só tem ponto:
    // 1. Caso milhar brasileiro: grupos de 3 dígitos (ex: 1.000, 10.000, 1.000.000)
    const isThousandsGroup = /^\d{1,3}(\.\d{3})+$/.test(str);
    if (isThousandsGroup) {
      cleanStr = str.replace(/\./g, '');
    } else {
      // 2. Se não é agrupamento de milhares válido, só pode ser decimal com exatamente 1 ponto
      const dotCount = (str.match(/\./g) || []).length;
      if (dotCount !== 1) {
        // Múltiplos pontos malformados (ex: 1.00.0, 1.2.3)
        return NaN;
      }
      // Ponto único decimal (ex: 1000.50, 1.5, 0.99)
      cleanStr = str;
    }
  }

  const num = Number(cleanStr);
  if (!Number.isFinite(num) || Number.isNaN(num)) return NaN;

  const finalVal = isNegative ? -num : num;

  if (!allowNegative && finalVal < 0) return NaN;
  if (integer && !Number.isInteger(finalVal)) return NaN;
  if (min !== undefined && finalVal < min) return NaN;
  if (max !== undefined && finalVal > max) return NaN;

  return finalVal === 0 ? 0 : finalVal;
}

/**
 * Converte string ou número em número inteiro positivo de forma estrita.
 *
 * @param {string|number} raw Entrada bruta
 * @param {Object} [options={}] Opções
 * @returns {number} Inteiro ou NaN
 */
export function parseFinancialIntegerPtBr(raw, options = {}) {
  return parseFinancialNumberPtBr(raw, {
    min: 1,
    ...options,
    integer: true
  });
}
