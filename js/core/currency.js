/**
 * Core Currency Utilities - Calculadora Master
 * Utilitários padronizados para manipulação, parsing e máscara de moeda brasileira (BRL).
 */

(function (root, factory) {
  if (typeof module !== "undefined" && module.exports) {
    module.exports = factory();
  } else {
    const exports = factory();
    root.CurrencyUtils = exports;
    // Atalhos globais para máxima compatibilidade com scripts legados
    root.parseBRLCurrency = exports.parseBRLCurrency;
    root.formatBRLCurrencyInput = exports.formatBRLCurrencyInput;
    root.formatBRL = exports.formatBRL;
    root.parseMoeda = exports.parseMoeda;
    root.mascaraMoeda = exports.mascaraMoeda;
  }
})(typeof globalThis !== "undefined" ? globalThis : typeof window !== "undefined" ? window : this, function () {
  /**
   * Converte string de moeda brasileira ou número para valor numérico puro.
   * Exemplos:
   * "50.000,00" -> 50000
   * "15.000,00" -> 15000
   * "1.250,50"  -> 1250.5
   * "" ou nulo  -> 0
   *
   * @param {string|number} valor
   * @returns {number}
   */
  function parseBRLCurrency(valor) {
    if (valor === undefined || valor === null) return 0;
    if (typeof valor === "number") return isNaN(valor) ? 0 : valor;

    const limpo = valor.toString().trim();
    if (!limpo) return 0;

    const normalizado = limpo.replace(/\./g, "").replace(",", ".");
    const num = Number(normalizado);
    return isNaN(num) ? 0 : num;
  }

  /**
   * Aplica máscara de moeda BRL em tempo real a um elemento input ou string.
   * Quando o campo for completamente apagado, permanece vazio.
   * Exemplo: "5000000" -> "50.000,00"
   *
   * @param {HTMLInputElement|{value: string}} campo
   */
  function formatBRLCurrencyInput(campo) {
    if (!campo) return;
    const rawValue = typeof campo === "string" ? campo : campo.value || "";
    const digitos = rawValue.replace(/\D/g, "");

    if (!digitos) {
      if (typeof campo !== "string") {
        campo.value = "";
      }
      return "";
    }

    let valor = (Number(digitos) / 100).toFixed(2) + "";
    valor = valor.replace(".", ",");
    valor = valor.replace(/(\d)(?=(\d{3})+(?!\d))/g, "$1.");

    if (typeof campo !== "string") {
      campo.value = valor;
    }
    return valor;
  }

  /**
   * Formata número no padrão monetário brasileiro (com 2 casas decimais).
   *
   * @param {number} valor
   * @param {boolean} [incluirSimbolo=false] Se verdadeiro, prefixa "R$ "
   * @returns {string}
   */
  function formatBRL(valor, incluirSimbolo = false) {
    const num = typeof valor === "number" ? valor : parseBRLCurrency(valor);
    const formatado = num.toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
    return incluirSimbolo ? `R$ ${formatado}` : formatado;
  }

  return {
    parseBRLCurrency,
    formatBRLCurrencyInput,
    formatBRL,
    // Aliases compatíveis com o código existente
    parseMoeda: parseBRLCurrency,
    mascaraMoeda: formatBRLCurrencyInput
  };
});
