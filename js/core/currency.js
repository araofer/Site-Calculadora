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
