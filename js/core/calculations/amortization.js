/**
 * Motor Matemático de Amortização - Calculadora Master
 * Implementação pura da fórmula Price (Sistema Francês de Amortização).
 * Zero dependências externas, zero DOM, zero efeitos colaterais.
 */

/**
 * Valida os parâmetros de entrada para cálculos do sistema Price.
 *
 * @param {Object} input
 * @param {number} input.principal Valor principal financiado (> 0)
 * @param {number} input.periodicRate Taxa de juros periódica em decimal (>= 0)
 * @param {number} input.periods Quantidade total de períodos (inteiro > 0)
 */
function validatePriceInput(input) {
  if (!input || typeof input !== 'object') {
    throw new Error('Parâmetros de entrada inválidos: deve ser fornecido um objeto.');
  }

  const { principal, periodicRate, periods } = input;

  if (principal === undefined || principal === null || !Number.isFinite(principal) || principal <= 0) {
    throw new Error('O valor do principal deve ser um número finito maior que zero.');
  }

  if (periodicRate === undefined || periodicRate === null || !Number.isFinite(periodicRate) || periodicRate < 0) {
    throw new Error('A taxa periódica deve ser um número finito maior ou igual a zero.');
  }

  if (
    periods === undefined ||
    periods === null ||
    !Number.isFinite(periods) ||
    !Number.isInteger(periods) ||
    periods <= 0
  ) {
    throw new Error('A quantidade de períodos deve ser um número inteiro finito maior que zero.');
  }
}

/**
 * Calcula o valor da prestação periódica constante no Sistema Price.
 *
 * Fórmula:
 * Quando periodicRate > 0:
 *   PMT = P * [ i * (1 + i)^n ] / [ (1 + i)^n - 1 ]
 * Quando periodicRate === 0:
 *   PMT = P / n
 *
 * @param {Object} input
 * @param {number} input.principal Valor principal do empréstimo (> 0)
 * @param {number} input.periodicRate Taxa periódica em formato decimal (ex: 0.015 para 1.5%)
 * @param {number} input.periods Número total de parcelas (inteiro > 0)
 * @returns {number} Valor da parcela periódica (precisão contínua de ponto flutuante)
 */
export function calculatePricePayment(input) {
  validatePriceInput(input);

  const { principal, periodicRate, periods } = input;

  if (periodicRate === 0) {
    return principal / periods;
  }

  // PMT = P * [ i * (1 + i)^n ] / [ (1 + i)^n - 1 ]
  const factor = Math.pow(1 + periodicRate, periods);
  const payment = (principal * (periodicRate * factor)) / (factor - 1);

  return payment;
}

/**
 * Constrói o cronograma completo de amortização (Tabela Price) período a período.
 *
 * Invariantes garantidos:
 * - Quantidade de linhas no cronograma igual a `periods`
 * - Soma de amortizações igual ao principal (ajuste residual de arredondamento no último período)
 * - Saldo devedor final estritamente zero
 * - Ausência de NaN ou Infinity
 *
 * @param {Object} input
 * @param {number} input.principal Valor financiado (> 0)
 * @param {number} input.periodicRate Taxa de juros periódica decimal (>= 0)
 * @param {number} input.periods Número de períodos (inteiro > 0)
 * @returns {{
 *   principal: number,
 *   periodicRate: number,
 *   periods: number,
 *   payment: number,
 *   totalPaid: number,
 *   totalInterest: number,
 *   schedule: Array<{
 *     period: number,
 *     openingBalance: number,
 *     payment: number,
 *     interest: number,
 *     amortization: number,
 *     closingBalance: number
 *   }>
 * }}
 */
export function buildPriceSchedule(input) {
  validatePriceInput(input);

  const { principal, periodicRate, periods } = input;
  const standardPayment = calculatePricePayment(input);

  const schedule = [];
  let currentBalance = principal;
  let totalAmortizationSum = 0;
  let totalInterestSum = 0;
  let totalPaidSum = 0;

  for (let p = 1; p <= periods; p++) {
    const openingBalance = currentBalance;
    const interest = openingBalance * periodicRate;

    let payment = standardPayment;
    let amortization = payment - interest;
    let closingBalance = openingBalance - amortization;

    // Ajuste residual na última parcela para eliminar resíduos de ponto flutuante IEEE 754
    if (p === periods) {
      amortization = openingBalance;
      payment = amortization + interest;
      closingBalance = 0;
    }

    currentBalance = closingBalance;
    totalAmortizationSum += amortization;
    totalInterestSum += interest;
    totalPaidSum += payment;

    schedule.push({
      period: p,
      openingBalance,
      payment,
      interest,
      amortization,
      closingBalance
    });
  }

  return {
    principal,
    periodicRate,
    periods,
    payment: standardPayment,
    totalPaid: totalPaidSum,
    totalInterest: totalInterestSum,
    schedule
  };
}
