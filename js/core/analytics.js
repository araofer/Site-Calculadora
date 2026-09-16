/**
 * Helper ESM: Rastreamento Seguro de Ações em Calculadoras (GA4) - Calculadora Master
 * Módulo puro, defensivo, seguro para SSR e zero dependências externas.
 * Nunca lança exceções para os chamadores e nunca envia PII ou dados financeiros.
 */

const ALLOWED_ACTIONS = new Set(['calculate', 'pdf', 'copy', 'share', 'print', 'clear']);

/**
 * Dispara o evento 'calculator_action' no GA4 com metadados seguros.
 *
 * @param {Object} params
 * @param {string} params.calculatorId Identificador da calculadora (ex: 'juros', 'lucro')
 * @param {string} params.calculatorCategory Categoria da calculadora (ex: 'financas')
 * @param {string} [params.calculationType] Subtipo opcional (ex: 'simple', 'compound')
 * @param {string} params.action Ação executada ('calculate', 'pdf', 'copy', 'share', 'print', 'clear')
 * @returns {boolean} true se o evento foi despachado para o gtag, false caso contrário
 */
export function trackCalculatorAction(params = {}) {
  try {
    if (typeof window === 'undefined') {
      return false;
    }

    if (typeof window.gtag !== 'function') {
      return false;
    }

    // Verificar se o rastreamento do GA4 está desabilitado via ga-disable
    const isGaDisabled = Object.keys(window).some(
      key => key.startsWith('ga-disable-') && window[key] === true
    );
    if (isGaDisabled) {
      return false;
    }

    if (!params || typeof params !== 'object') {
      return false;
    }

    const { calculatorId, calculatorCategory, calculationType, action } = params;

    // Validação estrita de campos obrigatórios
    if (typeof calculatorId !== 'string' || !calculatorId.trim()) {
      return false;
    }
    if (typeof calculatorCategory !== 'string' || !calculatorCategory.trim()) {
      return false;
    }
    if (typeof action !== 'string' || !ALLOWED_ACTIONS.has(action.trim())) {
      return false;
    }
    if (calculationType !== undefined && (typeof calculationType !== 'string' || !calculationType.trim())) {
      return false;
    }

    const payload = {
      calculator_id: calculatorId.trim(),
      calculator_category: calculatorCategory.trim(),
      action: action.trim()
    };

    if (typeof calculationType === 'string' && calculationType.trim()) {
      payload.calculation_type = calculationType.trim();
    }

    window.gtag('event', 'calculator_action', payload);
    return true;
  } catch (_) {
    return false;
  }
}
