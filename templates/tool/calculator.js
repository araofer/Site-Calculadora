/**
 * Ferramenta: {{NAME}} - Calculadora Master
 * Módulo gerado via Tool Factory.
 * Funções puras desacopladas de DOM e de window.
 */

/**
 * Normaliza os parâmetros brutos de entrada.
 *
 * @param {Object} rawInput
 * @returns {Object}
 */
export function normalizeInput(rawInput = {}) {
  const valor = typeof rawInput.valor === 'string'
    ? rawInput.valor.replace(',', '.').trim()
    : rawInput.valor;

  return {
    valor: Number(valor)
  };
}

/**
 * Valida os dados de entrada normalizados.
 *
 * @param {Object} params
 * @returns {{valido: boolean, erro?: string}}
 */
export function validateInput(params = {}) {
  if (!Number.isFinite(params.valor)) {
    return {
      valido: false,
      erro: 'Por favor, informe um valor numérico válido.'
    };
  }

  if (params.valor < 0) {
    return {
      valido: false,
      erro: 'O valor informado não pode ser negativo.'
    };
  }

  return { valido: true };
}

/**
 * Executa o cálculo da ferramenta (função pura).
 * REGRA INVIOLÁVEL: Não acessa window nem DOM.
 *
 * @param {Object} input
 * @returns {Object}
 */
export function calculate(input = {}) {
  const normalized = normalizeInput(input);
  const validation = validateInput(normalized);

  if (!validation.valido) {
    return {
      valido: false,
      erro: validation.erro
    };
  }

  // Ponto de extensão para fórmula específica
  const resultado = normalized.valor;

  return {
    valido: true,
    valorOriginal: normalized.valor,
    resultado
  };
}

/**
 * Formata o resultado do cálculo para exibição legível.
 *
 * @param {Object} calculationResult
 * @returns {string}
 */
export function formatResult(calculationResult) {
  if (!calculationResult || !calculationResult.valido) {
    return calculationResult?.erro || 'Erro no cálculo.';
  }

  return `Resultado apurado: ${calculationResult.resultado}`;
}

/**
 * Inicializa a interface no navegador vinculando eventos de DOM.
 */
export function setupTool() {
  if (typeof document === 'undefined') return;

  const elValor = document.getElementById('valor');
  const elResultado = document.getElementById('resultado');
  const btnCalcular = document.querySelector('[data-action="calculate"]');
  const btnLimpar = document.querySelector('[data-action="clear"]');

  function executarCalculo() {
    if (!elValor || !elResultado) return;
    const res = calculate({ valor: elValor.value });
    elResultado.textContent = formatResult(res);
    elResultado.style.color = res.valido ? '#008080' : '#d9534f';
  }

  function limparCampos() {
    if (elValor) elValor.value = '';
    if (elResultado) {
      elResultado.textContent = '';
      elResultado.style.color = '';
    }
  }

  if (btnCalcular) btnCalcular.addEventListener('click', executarCalculo);
  if (btnLimpar) btnLimpar.addEventListener('click', limparCampos);

  if (elValor) {
    elValor.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') executarCalculo();
    });
  }
}

if (typeof window !== 'undefined') {
  document.addEventListener('DOMContentLoaded', setupTool);
}
