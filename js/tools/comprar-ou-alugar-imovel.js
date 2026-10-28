/**
 * Calculadora Comprar ou Alugar Imóvel — Calculadora Master
 *
 * Módulo puro e desacoplado para simulação financeira comparativa entre:
 * 1. Comprar um imóvel (à vista ou financiado via Price ou SAC);
 * 2. Alugar e investir o capital inicial (entrada + custos de aquisição) e as diferenças mensais de fluxo de caixa.
 *
 * Princípios e Invariantes:
 * - Operações monetárias internas estritamente em centavos inteiros com arredondamento consistente;
 * - Conversão de taxa anual efetiva para taxa mensal equivalente: i = (1 + r)^(1/12) - 1;
 * - Custo habitacional do comprador = Prestação (amortização + juros + custos bancários) + Despesas do proprietário (condomínio, IPTU, manutenção);
 * - Custo habitacional do locatário = Aluguel + Despesas do inquilino;
 * - Desembolso inicial do comprador = Entrada + Custos de aquisição (ITBI, escritura, registro);
 * - O locatário inicia com o exato mesmo desembolso inicial alocado em sua carteira de investimentos;
 * - Em cada mês, quem tiver o menor custo habitacional investe a diferença no fim do mês;
 * - Ambos os cenários desembolsam rigorosamente a mesma quantia de caixa em todos os meses;
 * - Ao final do período, o patrimônio do comprador é o valor de mercado do imóvel deduzido dos custos de corretagem/venda e do saldo devedor restante, somado aos investimentos acumulados;
 * - O patrimônio do locatário é o saldo de sua carteira de investimentos acumulada;
 * - Não declara vencedor absoluto: o resultado depende estritamente das premissas informadas.
 */

import { createResultActions } from '../core/result-actions.js';

export const SISTEMAS_AMORTIZACAO = Object.freeze({
  SAC: 'sac',
  PRICE: 'price'
});

export const LIMITE_MAXIMO_ANOS_FINANCIAMENTO = 40;
export const LIMITE_MAXIMO_ANOS_COMPARACAO = 50;

/* ==========================================================================
 * Utilitários de Parsing e Formatação Monetária / Percentual
 * ========================================================================== */

/**
 * Converte qualquer entrada monetária flexível (R$ 500.000,00 ou 500000.00) diretamente
 * em centavos inteiros através de análise textual exata, sem erro de ponto flutuante.
 *
 * @param {string|number} raw
 * @returns {number} Centavos inteiros ou NaN se for inválido
 */
export function parseMoneyToCents(raw) {
  if (raw === null || raw === undefined) return 0;

  if (typeof raw === 'number') {
    if (!Number.isFinite(raw)) return NaN;
    if (Number.isInteger(raw)) return raw * 100;
    raw = raw.toString();
  }

  if (typeof raw !== 'string') return 0;

  let cleaned = raw.trim();
  if (!cleaned) return 0;

  cleaned = cleaned.replace(/^R\$\s*/i, '').trim();
  if (!cleaned) return 0;

  let isNegative = false;
  if (cleaned.startsWith('-')) {
    isNegative = true;
    cleaned = cleaned.slice(1).trim();
  } else if (cleaned.endsWith('-')) {
    isNegative = true;
    cleaned = cleaned.slice(0, -1).trim();
  }

  if (!cleaned) return 0;

  let intPart = '';
  let decPart = '';

  if (cleaned.includes(',') && cleaned.includes('.')) {
    const lastComma = cleaned.lastIndexOf(',');
    const lastDot = cleaned.lastIndexOf('.');
    if (lastComma > lastDot) {
      intPart = cleaned.slice(0, lastComma).replace(/\./g, '');
      decPart = cleaned.slice(lastComma + 1);
    } else {
      intPart = cleaned.slice(0, lastDot).replace(/,/g, '');
      decPart = cleaned.slice(lastDot + 1);
    }
  } else if (cleaned.includes(',')) {
    const parts = cleaned.split(',');
    intPart = parts[0];
    decPart = parts.slice(1).join('');
  } else if (cleaned.includes('.')) {
    const dotCount = (cleaned.match(/\./g) || []).length;
    if (dotCount > 1) {
      intPart = cleaned.replace(/\./g, '');
      decPart = '';
    } else {
      const parts = cleaned.split('.');
      intPart = parts[0];
      decPart = parts[1];
    }
  } else {
    intPart = cleaned;
    decPart = '';
  }

  intPart = intPart.replace(/\s+/g, '');
  decPart = decPart.replace(/\s+/g, '');

  if (intPart === '') intPart = '0';

  if (!/^\d+$/.test(intPart) || (decPart !== '' && !/^\d+$/.test(decPart))) {
    return NaN;
  }

  let cents = 0;
  if (decPart.length === 0) {
    cents = 0;
  } else if (decPart.length === 1) {
    cents = parseInt(decPart, 10) * 10;
  } else if (decPart.length === 2) {
    cents = parseInt(decPart, 10);
  } else {
    const baseCents = parseInt(decPart.slice(0, 2), 10);
    const thirdDigit = parseInt(decPart[2], 10);
    cents = baseCents + (thirdDigit >= 5 ? 1 : 0);
  }

  const intVal = parseInt(intPart, 10);
  if (!Number.isSafeInteger(intVal)) return NaN;

  const totalCents = (intVal * 100) + cents;
  return isNegative ? -totalCents : totalCents;
}

/**
 * Converte entrada de porcentagem (ex: "9,5%", "9.5", 9.5) para número de ponto flutuante.
 *
 * @param {string|number} raw
 * @returns {number}
 */
export function parsePercent(raw) {
  if (raw === null || raw === undefined) return 0;
  if (typeof raw === 'number') {
    return Number.isFinite(raw) ? raw : NaN;
  }
  if (typeof raw !== 'string') return 0;

  let cleaned = raw.trim().replace(/%/g, '').trim();
  if (!cleaned) return 0;

  let isNegative = false;
  if (cleaned.startsWith('-')) {
    isNegative = true;
    cleaned = cleaned.slice(1).trim();
  }

  if (cleaned.includes(',') && cleaned.includes('.')) {
    cleaned = cleaned.replace(/\./g, '').replace(',', '.');
  } else if (cleaned.includes(',')) {
    cleaned = cleaned.replace(',', '.');
  }

  const val = parseFloat(cleaned);
  if (isNaN(val)) return NaN;
  return isNegative ? -val : val;
}

/**
 * Formata um valor numérico em reais (R$) no padrão pt-BR.
 *
 * @param {number} value
 * @returns {string}
 */
export function formatCurrency(value) {
  if (!Number.isFinite(value)) return 'R$ 0,00';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
}

/**
 * Formata uma porcentagem para exibição em pt-BR.
 *
 * @param {number} value
 * @param {number} [decimals=2]
 * @returns {string}
 */
export function formatPercent(value, decimals = 2) {
  if (!Number.isFinite(value)) return '0%';
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(value) + '%';
}

/**
 * Converte taxa anual efetiva percentual em taxa mensal efetiva equivalente:
 * i = (1 + r)^(1/12) - 1
 *
 * @param {number} annualRatePercent Taxa anual em percentual (ex: 9.5 para 9,5% a.a.)
 * @returns {number} Taxa mensal decimal equivalente
 */
export function calculateEffectiveMonthlyRate(annualRatePercent) {
  if (!Number.isFinite(annualRatePercent) || annualRatePercent <= 0) {
    return 0;
  }
  const rDecimal = annualRatePercent / 100;
  return Math.pow(1 + rDecimal, 1 / 12) - 1;
}

/* ==========================================================================
 * Motor Principal de Simulação Comparativa
 * ========================================================================== */

/**
 * Executa a simulação comparativa entre Comprar e Alugar um Imóvel.
 *
 * @param {Object} input
 * @param {string|number} input.precoImovel Preço atual do imóvel
 * @param {string|number} [input.valorEntrada] Valor da entrada em reais (ou inferido via percEntrada)
 * @param {string|number} [input.percEntrada] Percentual de entrada (opcional se valorEntrada informado)
 * @param {string|number} [input.custosAquisicaoPerc=4] Custos de aquisição (ITBI, registro, escritura) em %
 * @param {string|number} [input.custoVendaPerc=5] Custos de corretagem/venda futura em %
 * @param {string|number} [input.prazoFinanciamentoAnos=30] Prazo do financiamento em anos
 * @param {string|number} [input.taxaJurosAnual=9.5] Taxa efetiva de juros anual do financiamento em %
 * @param {string} [input.sistemaAmortizacao=SISTEMAS_AMORTIZACAO.SAC] 'sac' ou 'price'
 * @param {string|number} [input.custoMensalFinanciamento=50] Seguros MIP/DFI e taxas mensais do financiamento
 * @param {string|number} input.aluguelMensal Aluguel mensal inicial
 * @param {string|number} [input.reajusteAluguelAnual=5] Reajuste anual estimado do aluguel em %
 * @param {string|number} [input.despesasInquilino=0] Despesas mensais adicionais do inquilino
 * @param {string|number} [input.despesasProprietario=800] Despesas mensais do proprietário (condomínio, IPTU, manutenção)
 * @param {string|number} [input.reajusteDespesasAnual=5] Reajuste anual estimado dessas despesas em %
 * @param {string|number} [input.periodoAnos=10] Período de comparação em anos
 * @param {string|number} [input.valorizacaoImovelAnual=5] Valorização anual estimada do imóvel em %
 * @param {string|number} [input.rentabilidadeInvestimentosAnual=10] Rentabilidade líquida anual dos investimentos em %
 * @returns {Object} Resultado detalhado da comparação ou objeto de erro
 */
export function calculateRentVsBuy(input = {}) {
  const warnings = [];
  const memoriaCalculo = [];

  // 1. Validação do Preço do Imóvel
  const precoImovelCentavos = parseMoneyToCents(input.precoImovel);
  if (isNaN(precoImovelCentavos) || precoImovelCentavos <= 0) {
    return {
      ok: false,
      error: 'Informe um preço válido e maior que zero para o imóvel.',
      data: null,
      warnings: [],
      memoriaCalculo: []
    };
  }

  // 2. Validação da Entrada
  let entradaCentavos = 0;
  if (input.valorEntrada !== undefined && input.valorEntrada !== null && String(input.valorEntrada).trim() !== '') {
    entradaCentavos = parseMoneyToCents(input.valorEntrada);
  } else if (input.percEntrada !== undefined && input.percEntrada !== null && String(input.percEntrada).trim() !== '') {
    const perc = parsePercent(input.percEntrada);
    if (!isNaN(perc) && perc >= 0) {
      entradaCentavos = Math.round(precoImovelCentavos * (perc / 100));
    }
  }

  if (isNaN(entradaCentavos) || entradaCentavos < 0) {
    return {
      ok: false,
      error: 'O valor da entrada não pode ser negativo.',
      data: null,
      warnings: [],
      memoriaCalculo: []
    };
  }

  // Limita entrada ao valor total do imóvel (se for maior, considera compra à vista com entrada = 100%)
  if (entradaCentavos > precoImovelCentavos) {
    entradaCentavos = precoImovelCentavos;
    warnings.push('O valor da entrada foi ajustado para 100% do valor do imóvel (compra integral à vista).');
  }

  const financiadoCentavos = precoImovelCentavos - entradaCentavos;
  const compraAVista = financiadoCentavos === 0;

  // 3. Custos de Aquisição e Venda
  const custosAquisicaoPerc = parsePercent(input.custosAquisicaoPerc ?? 4);
  if (isNaN(custosAquisicaoPerc) || custosAquisicaoPerc < 0 || custosAquisicaoPerc > 50) {
    return {
      ok: false,
      error: 'Informe um percentual válido para custos de aquisição (ITBI, registro e escritura), entre 0% e 50%.',
      data: null,
      warnings: [],
      memoriaCalculo: []
    };
  }

  const custoVendaPerc = parsePercent(input.custoVendaPerc ?? 5);
  if (isNaN(custoVendaPerc) || custoVendaPerc < 0 || custoVendaPerc > 50) {
    return {
      ok: false,
      error: 'Informe um percentual válido para custos de corretagem/venda futura, entre 0% e 50%.',
      data: null,
      warnings: [],
      memoriaCalculo: []
    };
  }

  // 4. Financiamento: Prazo, Taxa e Amortização
  const rawPrazoFin = input.prazoFinanciamentoAnos ?? 30;
  const prazoFinAnos = typeof rawPrazoFin === 'number' ? rawPrazoFin : parseInt(String(rawPrazoFin).trim(), 10);
  if (isNaN(prazoFinAnos) || prazoFinAnos <= 0 || prazoFinAnos > LIMITE_MAXIMO_ANOS_FINANCIAMENTO) {
    return {
      ok: false,
      error: `O prazo do financiamento deve ser um número inteiro entre 1 e ${LIMITE_MAXIMO_ANOS_FINANCIAMENTO} anos.`,
      data: null,
      warnings: [],
      memoriaCalculo: []
    };
  }

  const taxaJurosAnual = parsePercent(input.taxaJurosAnual ?? 9.5);
  if (isNaN(taxaJurosAnual) || taxaJurosAnual < 0 || taxaJurosAnual > 100) {
    return {
      ok: false,
      error: 'A taxa de juros anual do financiamento deve estar entre 0% e 100% a.a.',
      data: null,
      warnings: [],
      memoriaCalculo: []
    };
  }

  const sistemaAmortizacao = input.sistemaAmortizacao === SISTEMAS_AMORTIZACAO.PRICE
    ? SISTEMAS_AMORTIZACAO.PRICE
    : SISTEMAS_AMORTIZACAO.SAC;

  const custoMensalFinanciamentoCentavos = parseMoneyToCents(input.custoMensalFinanciamento ?? 50);
  if (isNaN(custoMensalFinanciamentoCentavos) || custoMensalFinanciamentoCentavos < 0) {
    return {
      ok: false,
      error: 'Custos mensais adicionais do financiamento não podem ser negativos.',
      data: null,
      warnings: [],
      memoriaCalculo: []
    };
  }

  // 5. Aluguel e Despesas do Inquilino
  const aluguelMensalCentavos = parseMoneyToCents(input.aluguelMensal);
  if (isNaN(aluguelMensalCentavos) || aluguelMensalCentavos < 0) {
    return {
      ok: false,
      error: 'Informe um valor válido e não negativo para o aluguel mensal.',
      data: null,
      warnings: [],
      memoriaCalculo: []
    };
  }

  const reajusteAluguelAnual = parsePercent(input.reajusteAluguelAnual ?? 5);
  if (isNaN(reajusteAluguelAnual) || reajusteAluguelAnual < 0 || reajusteAluguelAnual > 100) {
    return {
      ok: false,
      error: 'A taxa de reajuste anual do aluguel deve estar entre 0% e 100% a.a.',
      data: null,
      warnings: [],
      memoriaCalculo: []
    };
  }

  const despesasInquilinoCentavos = parseMoneyToCents(input.despesasInquilino ?? 0);
  if (isNaN(despesasInquilinoCentavos) || despesasInquilinoCentavos < 0) {
    return {
      ok: false,
      error: 'Despesas adicionais do inquilino não podem ser negativas.',
      data: null,
      warnings: [],
      memoriaCalculo: []
    };
  }

  // 6. Custos de Propriedade
  const despesasProprietarioCentavos = parseMoneyToCents(input.despesasProprietario ?? 800);
  if (isNaN(despesasProprietarioCentavos) || despesasProprietarioCentavos < 0) {
    return {
      ok: false,
      error: 'Despesas do proprietário não podem ser negativas.',
      data: null,
      warnings: [],
      memoriaCalculo: []
    };
  }

  const reajusteDespesasAnual = parsePercent(input.reajusteDespesasAnual ?? 5);
  if (isNaN(reajusteDespesasAnual) || reajusteDespesasAnual < 0 || reajusteDespesasAnual > 100) {
    return {
      ok: false,
      error: 'A taxa de reajuste anual de despesas deve estar entre 0% e 100% a.a.',
      data: null,
      warnings: [],
      memoriaCalculo: []
    };
  }

  // 7. Premissas da Comparação: Período, Valorização e Rentabilidade
  const rawPeriodo = input.periodoAnos ?? 10;
  const periodoAnos = typeof rawPeriodo === 'number' ? rawPeriodo : parseInt(String(rawPeriodo).trim(), 10);
  if (isNaN(periodoAnos) || periodoAnos <= 0 || periodoAnos > LIMITE_MAXIMO_ANOS_COMPARACAO) {
    return {
      ok: false,
      error: `O período de comparação deve ser um número inteiro entre 1 e ${LIMITE_MAXIMO_ANOS_COMPARACAO} anos.`,
      data: null,
      warnings: [],
      memoriaCalculo: []
    };
  }

  const valorizacaoImovelAnual = parsePercent(input.valorizacaoImovelAnual ?? 5);
  if (isNaN(valorizacaoImovelAnual) || valorizacaoImovelAnual < -50 || valorizacaoImovelAnual > 100) {
    return {
      ok: false,
      error: 'A valorização anual estimada do imóvel deve estar entre -50% e 100% a.a.',
      data: null,
      warnings: [],
      memoriaCalculo: []
    };
  }

  const rentabilidadeInvestimentosAnual = parsePercent(input.rentabilidadeInvestimentosAnual ?? 10);
  if (isNaN(rentabilidadeInvestimentosAnual) || rentabilidadeInvestimentosAnual < 0 || rentabilidadeInvestimentosAnual > 100) {
    return {
      ok: false,
      error: 'A rentabilidade anual dos investimentos deve estar entre 0% e 100% a.a.',
      data: null,
      warnings: [],
      memoriaCalculo: []
    };
  }

  // =========================================================================
  // Inicialização dos Parâmetros e Variáveis de Estado
  // =========================================================================
  const prazoFinMeses = prazoFinAnos * 12;
  const periodoMeses = periodoAnos * 12;

  const custosAquisicaoCentavos = Math.round(precoImovelCentavos * (custosAquisicaoPerc / 100));
  const desembolsoInicialCompradorCentavos = entradaCentavos + custosAquisicaoCentavos;

  // No cenário de aluguel, investe-se o exato mesmo desembolso inicial
  let saldoInvestimentoCompradorCentavos = 0;
  let saldoInvestimentoLocatarioCentavos = desembolsoInicialCompradorCentavos;

  const iFin = calculateEffectiveMonthlyRate(taxaJurosAnual);
  const iInv = calculateEffectiveMonthlyRate(rentabilidadeInvestimentosAnual);

  // Parâmetros do Financiamento
  let saldoDevedorCentavos = financiadoCentavos;
  let pmtPriceCentavos = 0;
  let amortizacaoSacBaseCentavos = 0;

  if (financiadoCentavos > 0 && prazoFinMeses > 0) {
    if (sistemaAmortizacao === SISTEMAS_AMORTIZACAO.PRICE) {
      if (iFin === 0) {
        pmtPriceCentavos = Math.ceil(financiadoCentavos / prazoFinMeses);
      } else {
        const fator = (iFin * Math.pow(1 + iFin, prazoFinMeses)) / (Math.pow(1 + iFin, prazoFinMeses) - 1);
        pmtPriceCentavos = Math.round(financiadoCentavos * fator);
      }
    } else {
      amortizacaoSacBaseCentavos = Math.floor(financiadoCentavos / prazoFinMeses);
    }
  }

  let primeiraPrestacaoCentavos = 0;
  let ultimaPrestacaoFinanciamentoCentavos = 0;
  let totalJurosCentavos = 0;
  let totalAmortizacaoCentavos = 0;
  let totalPrestacoesCentavos = 0;
  let totalAluguelCentavos = 0;
  let totalDespesasProprietarioCentavos = 0;
  let totalDespesasInquilinoCentavos = 0;
  let totalAportesCompradorCentavos = 0;
  let totalAportesLocatarioCentavos = desembolsoInicialCompradorCentavos; // inclui o capital inicial
  let totalRendimentosCompradorCentavos = 0;
  let totalRendimentosLocatarioCentavos = 0;

  const cronogramaAnual = [];

  // =========================================================================
  // Simulação Mês a Mês (de 1 até periodoMeses)
  // =========================================================================
  for (let m = 1; m <= periodoMeses; m++) {
    // 1. Prestação do financiamento
    let prestacaoCentavos = 0;
    let amortizacaoMesCentavos = 0;
    let jurosMesCentavos = 0;

    if (m <= prazoFinMeses && saldoDevedorCentavos > 0) {
      jurosMesCentavos = iFin > 0 ? Math.round(saldoDevedorCentavos * iFin) : 0;

      if (sistemaAmortizacao === SISTEMAS_AMORTIZACAO.PRICE) {
        const amortizacaoTeorica = Math.max(0, pmtPriceCentavos - jurosMesCentavos);
        if (m === prazoFinMeses || amortizacaoTeorica >= saldoDevedorCentavos) {
          amortizacaoMesCentavos = saldoDevedorCentavos;
          prestacaoCentavos = amortizacaoMesCentavos + jurosMesCentavos;
        } else {
          prestacaoCentavos = pmtPriceCentavos;
          amortizacaoMesCentavos = amortizacaoTeorica;
        }
      } else {
        // SAC
        if (m === prazoFinMeses) {
          amortizacaoMesCentavos = saldoDevedorCentavos;
        } else {
          amortizacaoMesCentavos = Math.min(saldoDevedorCentavos, amortizacaoSacBaseCentavos);
        }
        prestacaoCentavos = amortizacaoMesCentavos + jurosMesCentavos;
      }

      saldoDevedorCentavos = Math.max(0, saldoDevedorCentavos - amortizacaoMesCentavos);
      prestacaoCentavos += custoMensalFinanciamentoCentavos;

      if (m === 1) primeiraPrestacaoCentavos = prestacaoCentavos;
      ultimaPrestacaoFinanciamentoCentavos = prestacaoCentavos;
    }

    totalJurosCentavos += jurosMesCentavos;
    totalAmortizacaoCentavos += amortizacaoMesCentavos;
    totalPrestacoesCentavos += prestacaoCentavos;

    // 2. Reajustes contratuais anuais (aplicados a cada 12 meses completos)
    const anoIndex = Math.floor((m - 1) / 12);
    const fatorReajusteAluguel = Math.pow(1 + (reajusteAluguelAnual / 100), anoIndex);
    const fatorReajusteDespesas = Math.pow(1 + (reajusteDespesasAnual / 100), anoIndex);

    const aluguelMesCentavos = Math.round(aluguelMensalCentavos * fatorReajusteAluguel);
    const despInqMesCentavos = Math.round(despesasInquilinoCentavos * fatorReajusteDespesas);
    const despPropMesCentavos = Math.round(despesasProprietarioCentavos * fatorReajusteDespesas);

    totalAluguelCentavos += aluguelMesCentavos;
    totalDespesasProprietarioCentavos += despPropMesCentavos;
    totalDespesasInquilinoCentavos += despInqMesCentavos;

    const custoHabitacionalCompradorMes = prestacaoCentavos + despPropMesCentavos;
    const custoHabitacionalLocatarioMes = aluguelMesCentavos + despInqMesCentavos;

    // 3. Rendimento mensal sobre o saldo investido no início do mês
    const rendimentoCompCentavos = iInv > 0 ? Math.round(saldoInvestimentoCompradorCentavos * iInv) : 0;
    const rendimentoLocCentavos = iInv > 0 ? Math.round(saldoInvestimentoLocatarioCentavos * iInv) : 0;

    totalRendimentosCompradorCentavos += rendimentoCompCentavos;
    totalRendimentosLocatarioCentavos += rendimentoLocCentavos;

    saldoInvestimentoCompradorCentavos += rendimentoCompCentavos;
    saldoInvestimentoLocatarioCentavos += rendimentoLocCentavos;

    // 4. Fluxo de caixa comparativo: quem teve menor custo habitacional aporta a diferença no fim do mês
    const delta = custoHabitacionalCompradorMes - custoHabitacionalLocatarioMes;
    if (delta > 0) {
      // Comprar foi mais caro: locatário investe a diferença
      saldoInvestimentoLocatarioCentavos += delta;
      totalAportesLocatarioCentavos += delta;
    } else if (delta < 0) {
      // Alugar foi mais caro: comprador investe a economia
      const economiaComprador = Math.abs(delta);
      saldoInvestimentoCompradorCentavos += economiaComprador;
      totalAportesCompradorCentavos += economiaComprador;
    }

    // 5. Registro anual no cronograma resumo
    if (m % 12 === 0 || m === periodoMeses) {
      const anoNum = Math.ceil(m / 12);
      const fatorValAno = Math.pow(1 + valorizacaoImovelAnual / 100, m / 12);
      const valorImovelAnoCentavos = Math.round(precoImovelCentavos * fatorValAno);
      const custoVendaAnoCentavos = Math.round(valorImovelAnoCentavos * (custoVendaPerc / 100));
      const plCompAno = (valorImovelAnoCentavos - custoVendaAnoCentavos - saldoDevedorCentavos) + saldoInvestimentoCompradorCentavos;
      const plLocAno = saldoInvestimentoLocatarioCentavos;

      cronogramaAnual.push({
        ano: anoNum,
        mes: m,
        saldoDevedor: saldoDevedorCentavos / 100,
        valorImovel: valorImovelAnoCentavos / 100,
        investimentosComprador: saldoInvestimentoCompradorCentavos / 100,
        investimentosLocatario: saldoInvestimentoLocatarioCentavos / 100,
        patrimonioLiquidoComprador: plCompAno / 100,
        patrimonioLiquidoLocatario: plLocAno / 100,
        prestacaoMes: prestacaoCentavos / 100,
        aluguelMes: aluguelMesCentavos / 100
      });
    }
  }

  // =========================================================================
  // Apuração do Patrimônio Líquido Final
  // =========================================================================
  const fatorValorizacaoFinal = Math.pow(1 + valorizacaoImovelAnual / 100, periodoAnos);
  const valorImovelFinalCentavos = Math.round(precoImovelCentavos * fatorValorizacaoFinal);
  const custoVendaFinalCentavos = Math.round(valorImovelFinalCentavos * (custoVendaPerc / 100));

  // Patrimônio líquido proveniente do imóvel: valor de venda estimado - custos de transação - dívida remanescente
  const patrimonioLiquidoImobiliarioCentavos = valorImovelFinalCentavos - custoVendaFinalCentavos - saldoDevedorCentavos;

  // Patrimônio total do Comprador
  const patrimonioLiquidoCompradorCentavos = patrimonioLiquidoImobiliarioCentavos + saldoInvestimentoCompradorCentavos;

  // Patrimônio total do Locatário
  const patrimonioLiquidoLocatarioCentavos = saldoInvestimentoLocatarioCentavos;

  const diferencaCentavos = Math.abs(patrimonioLiquidoCompradorCentavos - patrimonioLiquidoLocatarioCentavos);

  let melhorOpcao = 'empate';
  if (patrimonioLiquidoCompradorCentavos > patrimonioLiquidoLocatarioCentavos) {
    melhorOpcao = 'comprar';
  } else if (patrimonioLiquidoLocatarioCentavos > patrimonioLiquidoCompradorCentavos) {
    melhorOpcao = 'alugar';
  }

  // Geração de Avisos e Memória de Cálculo
  memoriaCalculo.push(`Preço de compra do imóvel: ${formatCurrency(precoImovelCentavos / 100)}.`);
  memoriaCalculo.push(
    compraAVista
      ? 'Compra simulada à vista (entrada de 100%, sem financiamento).'
      : `Financiamento: Entrada de ${formatCurrency(entradaCentavos / 100)} (${formatPercent((entradaCentavos / precoImovelCentavos) * 100, 1)}) e Principal Financiado de ${formatCurrency(financiadoCentavos / 100)} via sistema ${sistemaAmortizacao.toUpperCase()} em ${prazoFinAnos} anos a ${formatPercent(taxaJurosAnual, 2)} a.a.`
  );
  memoriaCalculo.push(`Custos de aquisição (ITBI/cartório): ${formatCurrency(custosAquisicaoCentavos / 100)} (${formatPercent(custosAquisicaoPerc, 1)}).`);
  memoriaCalculo.push(`Desembolso inicial total do comprador (e capital inicial do locatário): ${formatCurrency(desembolsoInicialCompradorCentavos / 100)}.`);
  memoriaCalculo.push(`Aluguel inicial mensal: ${formatCurrency(aluguelMensalCentavos / 100)} com reajuste de ${formatPercent(reajusteAluguelAnual, 2)} a.a.`);
  memoriaCalculo.push(`Período de comparação: ${periodoAnos} anos (${periodoMeses} meses).`);
  memoriaCalculo.push(`Valor projetado do imóvel ao final de ${periodoAnos} anos: ${formatCurrency(valorImovelFinalCentavos / 100)} (apreciação de ${formatPercent(valorizacaoImovelAnual, 2)} a.a.).`);
  if (!compraAVista) {
    if (periodoMeses >= prazoFinMeses) {
      memoriaCalculo.push(`Financiamento: Quitação integral realizada no prazo contratado (${prazoFinMeses} meses), com saldo devedor final de R$ 0,00. Parcela inicial: ${formatCurrency(primeiraPrestacaoCentavos / 100)}; última parcela paga: ${formatCurrency(ultimaPrestacaoFinanciamentoCentavos / 100)} (ajustada para liquidação exata do principal restante).`);
    } else {
      memoriaCalculo.push(`Saldo devedor restante do financiamento no mês ${periodoMeses}: ${formatCurrency(saldoDevedorCentavos / 100)} (prazo total contratado de ${prazoFinMeses} meses em andamento).`);
    }
  } else {
    memoriaCalculo.push('Saldo devedor: R$ 0,00 (imóvel adquirido integralmente à vista, sem financiamento).');
  }
  memoriaCalculo.push(`Patrimônio Líquido estimado do Comprador: ${formatCurrency(patrimonioLiquidoCompradorCentavos / 100)}.`);
  memoriaCalculo.push(`Patrimônio Líquido estimado do Locatário: ${formatCurrency(patrimonioLiquidoLocatarioCentavos / 100)}.`);

  warnings.push('Simulação baseada em taxas constantes. Rentabilidades passadas e premissas de valorização imobiliária não representam garantia de resultados futuros.');
  warnings.push('Os custos de cartório, impostos municipais (ITBI) e comissão de corretagem podem variar de acordo com o município e a negociação.');

  if (diferencaCentavos / Math.max(patrimonioLiquidoCompradorCentavos, patrimonioLiquidoLocatarioCentavos, 1) < 0.05) {
    warnings.push('Atenção: A diferença entre comprar e alugar ficou abaixo de 5% neste cenário. Pequenas alterações na rentabilidade dos investimentos, na valorização do imóvel ou no reajuste do aluguel podem inverter a alternativa recomendada.');
  }

  return {
    ok: true,
    error: null,
    data: {
      precoImovelCentavos,
      precoImovel: precoImovelCentavos / 100,
      entradaCentavos,
      entrada: entradaCentavos / 100,
      percEntrada: (entradaCentavos / precoImovelCentavos) * 100,
      financiadoCentavos,
      financiado: financiadoCentavos / 100,
      compraAVista,
      custosAquisicaoPerc,
      custosAquisicaoCentavos,
      custosAquisicao: custosAquisicaoCentavos / 100,
      custoVendaPerc,
      custoVendaFinalCentavos,
      custoVendaFinal: custoVendaFinalCentavos / 100,
      desembolsoInicialCompradorCentavos,
      desembolsoInicialComprador: desembolsoInicialCompradorCentavos / 100,
      prazoFinAnos,
      prazoFinMeses,
      taxaJurosAnual,
      taxaJurosMensalDecimal: iFin,
      sistemaAmortizacao,
      custoMensalFinanciamentoCentavos,
      custoMensalFinanciamento: custoMensalFinanciamentoCentavos / 100,
      primeiraPrestacaoCentavos,
      primeiraPrestacao: primeiraPrestacaoCentavos / 100,
      ultimaPrestacaoFinanciamentoCentavos,
      ultimaPrestacaoFinanciamento: ultimaPrestacaoFinanciamentoCentavos / 100,
      aluguelMensalCentavos,
      aluguelMensal: aluguelMensalCentavos / 100,
      reajusteAluguelAnual,
      despesasInquilinoCentavos,
      despesasInquilino: despesasInquilinoCentavos / 100,
      despesasProprietarioCentavos,
      despesasProprietario: despesasProprietarioCentavos / 100,
      reajusteDespesasAnual,
      periodoAnos,
      periodoMeses,
      valorizacaoImovelAnual,
      rentabilidadeInvestimentosAnual,
      rentabilidadeInvestimentosMensalDecimal: iInv,
      valorImovelFinalCentavos,
      valorImovelFinal: valorImovelFinalCentavos / 100,
      saldoDevedorCentavos,
      saldoDevedor: saldoDevedorCentavos / 100,
      patrimonioLiquidoImobiliarioCentavos,
      patrimonioLiquidoImobiliario: patrimonioLiquidoImobiliarioCentavos / 100,
      saldoInvestimentoCompradorCentavos,
      saldoInvestimentoComprador: saldoInvestimentoCompradorCentavos / 100,
      saldoInvestimentoLocatarioCentavos,
      saldoInvestimentoLocatario: saldoInvestimentoLocatarioCentavos / 100,
      patrimonioLiquidoCompradorCentavos,
      patrimonioLiquidoComprador: patrimonioLiquidoCompradorCentavos / 100,
      patrimonioLiquidoLocatarioCentavos,
      patrimonioLiquidoLocatario: patrimonioLiquidoLocatarioCentavos / 100,
      diferencaCentavos,
      diferenca: diferencaCentavos / 100,
      melhorOpcao,
      totalJurosCentavos,
      totalJuros: totalJurosCentavos / 100,
      totalAmortizacaoCentavos,
      totalAmortizacao: totalAmortizacaoCentavos / 100,
      totalPrestacoesCentavos,
      totalPrestacoes: totalPrestacoesCentavos / 100,
      totalAluguelCentavos,
      totalAluguel: totalAluguelCentavos / 100,
      totalDespesasProprietarioCentavos,
      totalDespesasProprietario: totalDespesasProprietarioCentavos / 100,
      totalDespesasInquilinoCentavos,
      totalDespesasInquilino: totalDespesasInquilinoCentavos / 100,
      totalAportesCompradorCentavos,
      totalAportesComprador: totalAportesCompradorCentavos / 100,
      totalAportesLocatarioCentavos,
      totalAportesLocatario: totalAportesLocatarioCentavos / 100,
      totalRendimentosCompradorCentavos,
      totalRendimentosComprador: totalRendimentosCompradorCentavos / 100,
      totalRendimentosLocatarioCentavos,
      totalRendimentosLocatario: totalRendimentosLocatarioCentavos / 100,
      cronogramaAnual
    },
    warnings,
    memoriaCalculo
  };
}

/* ==========================================================================
 * Formatação de Resultados e Texto de Compartilhamento
 * ========================================================================== */

/**
 * Constrói o texto formatado para cópia em clipboard.
 *
 * @param {Object} result Retorno de calculateRentVsBuy
 * @returns {string}
 */
export function buildCopyText(result) {
  if (!result || !result.ok || !result.data) {
    return 'Simulação Comprar ou Alugar Imóvel — Calculadora Master\nNenhum resultado calculado.';
  }

  const d = result.data;
  const linhas = [
    '=====================================================',
    'SIMULAÇÃO: COMPRAR OU ALUGAR IMÓVEL — CALCULADORA MASTER',
    '=====================================================',
    `Opção com maior patrimônio sob as premissas: ${d.melhorOpcao === 'comprar' ? 'COMPRAR O IMÓVEL' : (d.melhorOpcao === 'alugar' ? 'ALUGAR E INVESTIR' : 'EMPATE TÉCNICO')}`,
    `Diferença patrimonial estimada: ${formatCurrency(d.diferenca)}`,
    '',
    '--- RESULTADOS AO FINAL DE ' + d.periodoAnos + ' ANOS ---',
    `Patrimônio Líquido do Comprador: ${formatCurrency(d.patrimonioLiquidoComprador)}`,
    `  • Valor do imóvel projetado: ${formatCurrency(d.valorImovelFinal)}`,
    `  • Custos de venda futuros (${formatPercent(d.custoVendaPerc, 1)}): -${formatCurrency(d.custoVendaFinal)}`,
    `  • Saldo devedor restante: -${formatCurrency(d.saldoDevedor)}`,
    `  • Investimentos acumulados pelo comprador: +${formatCurrency(d.saldoInvestimentoComprador)}`,
    '',
    `Patrimônio Líquido do Locatário: ${formatCurrency(d.patrimonioLiquidoLocatario)}`,
    `  • Carteira de investimentos acumulada: ${formatCurrency(d.saldoInvestimentoLocatario)}`,
    `  • Capital inicial investido: ${formatCurrency(d.desembolsoInicialComprador)}`,
    '',
    '--- PREMISSAS E FINANCIAMENTO ---',
    `Preço do imóvel: ${formatCurrency(d.precoImovel)}`,
    `Entrada: ${formatCurrency(d.entrada)} (${formatPercent(d.percEntrada, 1)})`,
    `Financiado: ${formatCurrency(d.financiado)} (${d.sistemaAmortizacao.toUpperCase()}, ${d.prazoFinAnos} anos a ${formatPercent(d.taxaJurosAnual, 2)} a.a.)`,
    `Primeira prestação: ${formatCurrency(d.primeiraPrestacao)}`,
    `Aluguel mensal inicial: ${formatCurrency(d.aluguelMensal)} (reajuste ${formatPercent(d.reajusteAluguelAnual, 2)} a.a.)`,
    `Valorização do imóvel estimada: ${formatPercent(d.valorizacaoImovelAnual, 2)} a.a.`,
    `Rentabilidade dos investimentos: ${formatPercent(d.rentabilidadeInvestimentosAnual, 2)} a.a.`,
    '',
    'Simule outros cenários em: https://www.calculadoramaster.com/tools/financas/comprar-ou-alugar-imovel.html'
  ];

  return linhas.join('\n');
}

/**
 * Constrói as seções de resultado estruturadas para o createResultActions.
 *
 * @param {Object} result
 * @returns {Array<{ label: string, value: string }>}
 */
export function formatResult(result) {
  if (!result || !result.ok || !result.data) return [];
  const d = result.data;
  return [
    { label: 'Melhor opção estimada', value: d.melhorOpcao === 'comprar' ? 'Comprar Imóvel' : (d.melhorOpcao === 'alugar' ? 'Alugar e Investir' : 'Empate Técnico') },
    { label: 'Diferença estimada', value: formatCurrency(d.diferenca) },
    { label: 'Patrimônio final Comprador', value: formatCurrency(d.patrimonioLiquidoComprador) },
    { label: 'Patrimônio final Locatário', value: formatCurrency(d.patrimonioLiquidoLocatario) },
    { label: 'Valor futuro do imóvel', value: formatCurrency(d.valorImovelFinal) },
    { label: 'Saldo devedor restante', value: formatCurrency(d.saldoDevedor) },
    { label: 'Investimentos do Comprador', value: formatCurrency(d.saldoInvestimentoComprador) },
    { label: 'Investimentos do Locatário', value: formatCurrency(d.saldoInvestimentoLocatario) },
    { label: 'Primeira prestação', value: formatCurrency(d.primeiraPrestacao) },
    { label: 'Total pago em juros', value: formatCurrency(d.totalJuros) },
    { label: 'Total pago em aluguéis', value: formatCurrency(d.totalAluguel) }
  ];
}

/* ==========================================================================
 * Conexão com a Interface DOM
 * ========================================================================== */

/**
 * Inicializa os ouvintes de evento, máscaras e gerenciamento da interface.
 *
 * @param {HTMLElement|Document} [root=document]
 * @returns {Object|null}
 */
export function setupTool(root = (typeof document !== 'undefined' ? document : null)) {
  if (!root) return null;

  const form = root.querySelector('#formComprarOuAlugar');
  if (!form) return null;

  // Campos de entrada
  const inputPrecoImovel = root.querySelector('#precoImovel');
  const inputValorEntrada = root.querySelector('#valorEntrada');
  const inputPercEntrada = root.querySelector('#percEntrada');
  const inputCustosAquisicao = root.querySelector('#custosAquisicaoPerc');
  const inputCustoVenda = root.querySelector('#custoVendaPerc');

  const inputPrazoFin = root.querySelector('#prazoFinanciamentoAnos');
  const inputTaxaJuros = root.querySelector('#taxaJurosAnual');
  const selectSistemaAmortizacao = root.querySelector('#sistemaAmortizacao');
  const inputCustoMensalFin = root.querySelector('#custoMensalFinanciamento');

  const inputAluguel = root.querySelector('#aluguelMensal');
  const inputReajusteAluguel = root.querySelector('#reajusteAluguelAnual');
  const inputDespesasInq = root.querySelector('#despesasInquilino');

  const inputDespesasProp = root.querySelector('#despesasProprietario');
  const inputReajusteDesp = root.querySelector('#reajusteDespesasAnual');

  const inputPeriodo = root.querySelector('#periodoAnos');
  const inputValorizacao = root.querySelector('#valorizacaoImovelAnual');
  const inputRentabilidade = root.querySelector('#rentabilidadeInvestimentosAnual');

  const btnCalcular = root.querySelector('#btnCalcularComprarAlugar');
  const btnLimpar = root.querySelector('#btnLimparComprarAlugar');
  const erroPainel = root.querySelector('#erroComprarOuAlugar');
  const resultadoSecao = root.querySelector('#resultadoComprarOuAlugar');

  // Elementos do Card de Destaque
  const resBadgeOpcao = root.querySelector('#resBadgeOpcao');
  const resTituloVencedor = root.querySelector('#resTituloVencedor');
  const resDiferenca = root.querySelector('#resDiferenca');
  const resPlCompradorDestaque = root.querySelector('#resPlCompradorDestaque');
  const resPlLocatarioDestaque = root.querySelector('#resPlLocatarioDestaque');

  // Métricas detalhadas
  const resValorImovelFinal = root.querySelector('#resValorImovelFinal');
  const resCustoVenda = root.querySelector('#resCustoVenda');
  const resSaldoDevedor = root.querySelector('#resSaldoDevedor');
  const resPatrimonioImobiliario = root.querySelector('#resPatrimonioImobiliario');
  const resInvestimentosComprador = root.querySelector('#resInvestimentosComprador');
  const resDesembolsoInicial = root.querySelector('#resDesembolsoInicial');
  const resInvestimentosLocatario = root.querySelector('#resInvestimentosLocatario');
  const resPrimeiraPrestacao = root.querySelector('#resPrimeiraPrestacao');
  const resTotalJuros = root.querySelector('#resTotalJuros');
  const resTotalAluguel = root.querySelector('#resTotalAluguel');

  // Tabela de Cronograma
  const wrapperCronograma = root.querySelector('#wrapperCronogramaComprarAlugar');
  const tabelaCronograma = root.querySelector('#tabelaCronogramaComprarAlugar');

  // Memória de cálculo e Avisos
  const memoriaUl = root.querySelector('#memoriaCalculoComprarAlugar');
  const avisosDiv = root.querySelector('#avisosComprarAlugar');
  const statusAcoes = root.querySelector('#statusAcoesComprarAlugar');

  let ultimoResultado = null;

  // Sincronização entre Entrada em Reais e Percentual
  function syncEntradaFromCents() {
    if (!inputPrecoImovel || !inputValorEntrada || !inputPercEntrada) return;
    const precoCentavos = parseMoneyToCents(inputPrecoImovel.value);
    const entradaCentavos = parseMoneyToCents(inputValorEntrada.value);
    if (!isNaN(precoCentavos) && precoCentavos > 0 && !isNaN(entradaCentavos)) {
      const perc = (entradaCentavos / precoCentavos) * 100;
      inputPercEntrada.value = perc.toFixed(1).replace('.', ',');
    }
  }

  function syncEntradaFromPerc() {
    if (!inputPrecoImovel || !inputValorEntrada || !inputPercEntrada) return;
    const precoCentavos = parseMoneyToCents(inputPrecoImovel.value);
    const perc = parsePercent(inputPercEntrada.value);
    if (!isNaN(precoCentavos) && precoCentavos > 0 && !isNaN(perc)) {
      const entradaCentavos = Math.round(precoCentavos * (perc / 100));
      inputValorEntrada.value = (entradaCentavos / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
  }

  if (inputValorEntrada) {
    inputValorEntrada.addEventListener('blur', syncEntradaFromCents);
  }
  if (inputPercEntrada) {
    inputPercEntrada.addEventListener('blur', syncEntradaFromPerc);
  }
  if (inputPrecoImovel) {
    inputPrecoImovel.addEventListener('blur', () => {
      if (inputPercEntrada && inputPercEntrada.value) {
        syncEntradaFromPerc();
      } else {
        syncEntradaFromCents();
      }
    });
  }

  // Ações compartilhadas (Copiar, Compartilhar, Imprimir)
  const actions = createResultActions({
    title: 'Calculadora Comprar ou Alugar Imóvel — Calculadora Master',
    text: () => buildCopyText(ultimoResultado),
    shareUrl: typeof window !== 'undefined' ? window.location?.href : '',
    getSections: () => formatResult(ultimoResultado),
    statusElement: () => statusAcoes
  });

  const btnCopy = root.querySelector('[data-action="copy"]');
  const btnShare = root.querySelector('[data-action="share"]');
  const btnPrint = root.querySelector('[data-action="print"]');

  if (btnCopy) btnCopy.addEventListener('click', () => actions.copy());
  if (btnShare) btnShare.addEventListener('click', () => actions.share());
  if (btnPrint) btnPrint.addEventListener('click', () => actions.print());

  function limparErros() {
    if (erroPainel) {
      erroPainel.textContent = '';
      erroPainel.hidden = true;
    }
  }

  function mostrarErro(mensagem) {
    if (erroPainel) {
      erroPainel.textContent = mensagem;
      erroPainel.hidden = false;
      erroPainel.focus?.();
    }
    if (resultadoSecao) {
      resultadoSecao.hidden = true;
    }
  }

  function renderizarResultado(resultado) {
    limparErros();
    if (!resultadoSecao) return;

    ultimoResultado = resultado;
    const d = resultado.data;

    if (resBadgeOpcao) {
      resBadgeOpcao.textContent = d.melhorOpcao === 'comprar'
        ? 'Comprar é mais vantajoso'
        : (d.melhorOpcao === 'alugar' ? 'Alugar é mais vantajoso' : 'Empate Financeiro');
      resBadgeOpcao.className = `tool-result-badge ${d.melhorOpcao === 'comprar' ? 'badge-comprar' : (d.melhorOpcao === 'alugar' ? 'badge-alugar' : 'badge-empate')}`;
    }

    if (resTituloVencedor) {
      resTituloVencedor.textContent = d.melhorOpcao === 'comprar'
        ? 'Comprar o imóvel gerou maior patrimônio líquido final'
        : (d.melhorOpcao === 'alugar' ? 'Alugar e investir gerou maior patrimônio líquido final' : 'Ambas as opções geraram patrimônio equivalente');
    }

    if (resDiferenca) {
      resDiferenca.textContent = formatCurrency(d.diferenca);
    }

    if (resPlCompradorDestaque) {
      resPlCompradorDestaque.textContent = formatCurrency(d.patrimonioLiquidoComprador);
    }
    if (resPlLocatarioDestaque) {
      resPlLocatarioDestaque.textContent = formatCurrency(d.patrimonioLiquidoLocatario);
    }

    if (resValorImovelFinal) resValorImovelFinal.textContent = formatCurrency(d.valorImovelFinal);
    if (resCustoVenda) resCustoVenda.textContent = formatCurrency(d.custoVendaFinal);
    if (resSaldoDevedor) resSaldoDevedor.textContent = formatCurrency(d.saldoDevedor);
    if (resPatrimonioImobiliario) resPatrimonioImobiliario.textContent = formatCurrency(d.patrimonioLiquidoImobiliario);
    if (resInvestimentosComprador) resInvestimentosComprador.textContent = formatCurrency(d.saldoInvestimentoComprador);
    if (resDesembolsoInicial) resDesembolsoInicial.textContent = formatCurrency(d.desembolsoInicialComprador);
    if (resInvestimentosLocatario) resInvestimentosLocatario.textContent = formatCurrency(d.saldoInvestimentoLocatario);
    if (resPrimeiraPrestacao) resPrimeiraPrestacao.textContent = d.compraAVista ? 'R$ 0,00 (À vista)' : formatCurrency(d.primeiraPrestacao);
    if (resTotalJuros) resTotalJuros.textContent = formatCurrency(d.totalJuros);
    if (resTotalAluguel) resTotalAluguel.textContent = formatCurrency(d.totalAluguel);

    // Tabela de Cronograma Anual
    if (tabelaCronograma && wrapperCronograma) {
      const tbody = tabelaCronograma.querySelector('tbody') || tabelaCronograma;
      tbody.innerHTML = '';

      d.cronogramaAnual.forEach(item => {
        const tr = document.createElement('tr');

        const tdAno = document.createElement('td');
        tdAno.textContent = `${item.ano}º ano`;

        const tdPlComp = document.createElement('td');
        tdPlComp.textContent = formatCurrency(item.patrimonioLiquidoComprador);

        const tdPlLoc = document.createElement('td');
        tdPlLoc.textContent = formatCurrency(item.patrimonioLiquidoLocatario);

        const tdImovel = document.createElement('td');
        tdImovel.textContent = formatCurrency(item.valorImovel);

        const tdDivida = document.createElement('td');
        tdDivida.textContent = formatCurrency(item.saldoDevedor);

        const tdInvLoc = document.createElement('td');
        tdInvLoc.textContent = formatCurrency(item.investimentosLocatario);

        tr.append(tdAno, tdPlComp, tdPlLoc, tdImovel, tdDivida, tdInvLoc);
        tbody.append(tr);
      });
      wrapperCronograma.hidden = false;
    }

    // Memória de Cálculo
    if (memoriaUl) {
      memoriaUl.innerHTML = '';
      resultado.memoriaCalculo.forEach(item => {
        const li = document.createElement('li');
        li.textContent = item;
        memoriaUl.append(li);
      });
    }

    // Avisos e Notas
    if (avisosDiv) {
      avisosDiv.innerHTML = '';
      resultado.warnings.forEach(aviso => {
        const p = document.createElement('p');
        p.className = 'tool-note';
        p.textContent = aviso;
        avisosDiv.append(p);
      });
    }

    resultadoSecao.hidden = false;
  }

  function executarCalculo() {
    const input = {
      precoImovel: inputPrecoImovel?.value,
      valorEntrada: inputValorEntrada?.value,
      percEntrada: inputPercEntrada?.value,
      custosAquisicaoPerc: inputCustosAquisicao?.value,
      custoVendaPerc: inputCustoVenda?.value,
      prazoFinanciamentoAnos: inputPrazoFin?.value,
      taxaJurosAnual: inputTaxaJuros?.value,
      sistemaAmortizacao: selectSistemaAmortizacao?.value,
      custoMensalFinanciamento: inputCustoMensalFin?.value,
      aluguelMensal: inputAluguel?.value,
      reajusteAluguelAnual: inputReajusteAluguel?.value,
      despesasInquilino: inputDespesasInq?.value,
      despesasProprietario: inputDespesasProp?.value,
      reajusteDespesasAnual: inputReajusteDesp?.value,
      periodoAnos: inputPeriodo?.value,
      valorizacaoImovelAnual: inputValorizacao?.value,
      rentabilidadeInvestimentosAnual: inputRentabilidade?.value
    };

    const resultado = calculateRentVsBuy(input);

    if (!resultado.ok) {
      mostrarErro(resultado.error);
      return resultado;
    }

    renderizarResultado(resultado);
    return resultado;
  }

  function limparCampos() {
    limparErros();
    if (form) form.reset();
    if (resultadoSecao) resultadoSecao.hidden = true;
    if (inputPrecoImovel) inputPrecoImovel.focus();
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    executarCalculo();
  });

  if (btnCalcular) {
    btnCalcular.addEventListener('click', (e) => {
      e.preventDefault();
      executarCalculo();
    });
  }

  if (btnLimpar) {
    btnLimpar.addEventListener('click', () => {
      limparCampos();
    });
  }

  return {
    executarCalculo,
    limparCampos
  };
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setupTool(document));
  } else {
    setupTool(document);
  }
}
