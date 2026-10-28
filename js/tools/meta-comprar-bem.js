/**
 * Calculadora de Meta para Comprar um Bem — Calculadora Master
 *
 * Módulo puro e desacoplado para planejamento financeiro de metas de aquisição.
 * Suporta dois modos de cálculo:
 * - Modo A: "Quanto preciso guardar por mês?" (Prazo fixo em meses -> calcula aporte necessário)
 * - Modo B: "Em quanto tempo atingirei a meta?" (Aporte mensal fixo -> simula prazo em meses até 600)
 *
 * Premissas:
 * - Operações monetárias estritamente em centavos inteiros com arredondamento consistente;
 * - Conversão da rentabilidade anual efetiva para taxa mensal equivalente: i = (1 + r)^(1/12) - 1;
 * - Rendimento incide sobre o saldo acumulado no início de cada mês;
 * - Aporte ocorre no final de cada mês;
 * - Limite de simulação de 600 meses;
 * - Valores nominais na data base (sem projeção inflacionária automática).
 */

import { createResultActions } from '../core/result-actions.js';

export const MODOS_CALCULO = Object.freeze({
  APORTE_NECESSARIO: 'aporte_necessario', // Modo A: Quanto guardar por mês dado um prazo
  PRAZO_NECESSARIO: 'prazo_necessario'     // Modo B: Em quanto tempo atinjo a meta dado um aporte
});

export const LIMITE_MAXIMO_MESES = 600;

/* ==========================================================================
 * Funções Utilitárias Monetárias e de Porcentagem
 * ========================================================================== */

/**
 * Converte qualquer entrada monetária flexível (R$ 1.500,00 ou 1500.00) diretamente em centavos inteiros
 * por meio de análise textual exata, sem depender de operações de ponto flutuante para determinação dos centavos.
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
 * Converte entrada de porcentagem (ex: "10,5%", "10.5", 10.5) para número de ponto flutuante.
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
 * Converte taxa anual efetiva (em porcentagem) para taxa mensal efetiva equivalente:
 * i = (1 + r)^(1/12) - 1
 *
 * @param {number} annualRatePercent Taxa anual em percentual (ex: 12 para 12% a.a.)
 * @returns {number} Taxa mensal decimal equivalente (ex: ~0.009488...)
 */
export function calculateEffectiveMonthlyRate(annualRatePercent) {
  if (!Number.isFinite(annualRatePercent) || annualRatePercent <= 0) {
    return 0;
  }
  const rDecimal = annualRatePercent / 100;
  return Math.pow(1 + rDecimal, 1 / 12) - 1;
}

/**
 * Formata uma quantidade de meses em texto amigável de anos e meses.
 *
 * @param {number} meses
 * @returns {string}
 */
export function formatPeriodoAmigavel(meses) {
  if (!Number.isFinite(meses) || meses <= 0) return '0 meses';
  if (meses < 12) {
    return `${meses} ${meses === 1 ? 'mês' : 'meses'}`;
  }
  const anos = Math.floor(meses / 12);
  const mesesRest = meses % 12;

  if (mesesRest === 0) {
    return `${anos} ${anos === 1 ? 'ano' : 'anos'} (${meses} meses)`;
  }
  const textoAnos = `${anos} ${anos === 1 ? 'ano' : 'anos'}`;
  const textoMeses = `${mesesRest} ${mesesRest === 1 ? 'mês' : 'meses'}`;
  return `${textoAnos} e ${textoMeses} (${meses} meses)`;
}

/**
 * Calcula a data estimada de conclusão da meta somando meses à data de referência.
 *
 * @param {number} mesesAdicionar
 * @param {Date} [baseDate=new Date()]
 * @returns {{ dataFormatada: string, mesAnoExtenso: string }}
 */
export function estimateCompletionDate(mesesAdicionar, baseDate = new Date()) {
  if (!Number.isFinite(mesesAdicionar) || mesesAdicionar <= 0) {
    const mesAtual = baseDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    const curto = `${String(baseDate.getMonth() + 1).padStart(2, '0')}/${baseDate.getFullYear()}`;
    return { dataFormatada: curto, mesAnoExtenso: mesAtual };
  }

  const d = new Date(baseDate.getTime());
  d.setDate(1); // normaliza para início do mês
  d.setMonth(d.getMonth() + Math.round(mesesAdicionar));

  const mesAnoExtenso = d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  const mesFormatado = String(d.getMonth() + 1).padStart(2, '0');
  const dataFormatada = `${mesFormatado}/${d.getFullYear()}`;

  return { dataFormatada, mesAnoExtenso };
}

/**
 * Simula a evolução patrimonial mês a mês com rendimentos arredondados para centavos inteiros.
 * Segue exatamente a mesma regra de arredondamento e capitalização do simulador mensal de produção.
 *
 * @param {number} economizadoCentavos Saldo inicial em centavos
 * @param {number} taxaMensalDecimal Taxa mensal equivalente decimal
 * @param {number} prazoMeses Prazo em meses
 * @param {number} aporteCentavos Aporte mensal no fim de cada mês em centavos
 * @returns {number} Saldo final acumulado em centavos
 */
export function simulateAccumulationBalance(economizadoCentavos, taxaMensalDecimal, prazoMeses, aporteCentavos) {
  let saldo = economizadoCentavos;
  for (let m = 1; m <= prazoMeses; m++) {
    const juros = taxaMensalDecimal > 0 ? Math.round(saldo * taxaMensalDecimal) : 0;
    saldo = saldo + juros + aporteCentavos;
  }
  return saldo;
}

/* ==========================================================================
 * Motor Principal de Cálculo
 * ========================================================================== */

/**
 * Executa o cálculo da meta financeira.
 *
 * @param {Object} input
 * @param {string} [input.modo=MODOS_CALCULO.APORTE_NECESSARIO]
 * @param {string|number} input.precoBem
 * @param {string|number} [input.valorEconomizado=0]
 * @param {string|number} [input.rentabilidadeAnual=0]
 * @param {string|number} [input.prazoMeses=12] (Usado no Modo A)
 * @param {string|number} [input.aporteMensal=0] (Usado no Modo B)
 * @param {Date} [input.baseDate] Data de referência para cálculo da data da meta
 * @returns {Object}
 */
export function calculateGoal(input = {}) {
  const warnings = [];
  const memoriaCalculo = [];

  const modo = input.modo === MODOS_CALCULO.PRAZO_NECESSARIO
    ? MODOS_CALCULO.PRAZO_NECESSARIO
    : MODOS_CALCULO.APORTE_NECESSARIO;

  // 1. Validação do Preço do Bem
  const precoBemCentavos = parseMoneyToCents(input.precoBem);
  if (isNaN(precoBemCentavos)) {
    return {
      ok: false,
      error: 'Informe um preço válido para o bem desejado.',
      data: null,
      warnings: [],
      memoriaCalculo: []
    };
  }

  if (precoBemCentavos <= 0) {
    return {
      ok: false,
      error: 'O preço estimado do bem deve ser maior que zero (R$ 0,00).',
      data: null,
      warnings: [],
      memoriaCalculo: []
    };
  }

  // 2. Validação do Valor Já Economizado
  const economizadoCentavos = parseMoneyToCents(input.valorEconomizado ?? 0);
  if (isNaN(economizadoCentavos)) {
    return {
      ok: false,
      error: 'O valor já economizado informado é inválido.',
      data: null,
      warnings: [],
      memoriaCalculo: []
    };
  }

  if (economizadoCentavos < 0) {
    return {
      ok: false,
      error: 'O valor já economizado não pode ser negativo.',
      data: null,
      warnings: [],
      memoriaCalculo: []
    };
  }

  // 3. Validação da Rentabilidade Anual
  const rentabilidadeAnualPerc = parsePercent(input.rentabilidadeAnual ?? 0);
  if (isNaN(rentabilidadeAnualPerc)) {
    return {
      ok: false,
      error: 'Informe uma taxa de rentabilidade válida.',
      data: null,
      warnings: [],
      memoriaCalculo: []
    };
  }

  if (rentabilidadeAnualPerc < 0) {
    return {
      ok: false,
      error: 'A rentabilidade anual estimada não pode ser negativa.',
      data: null,
      warnings: [],
      memoriaCalculo: []
    };
  }

  if (rentabilidadeAnualPerc > 500) {
    return {
      ok: false,
      error: 'A taxa de rentabilidade anual máxima permitida é de 500% a.a.',
      data: null,
      warnings: [],
      memoriaCalculo: []
    };
  }

  const taxaMensalDecimal = calculateEffectiveMonthlyRate(rentabilidadeAnualPerc);
  const taxaMensalPerc = taxaMensalDecimal * 100;

  const precoBem = precoBemCentavos / 100;
  const economizado = economizadoCentavos / 100;
  const faltaAcumularNominalCentavos = Math.max(0, precoBemCentavos - economizadoCentavos);
  const faltaAcumularNominal = faltaAcumularNominalCentavos / 100;

  // 4. Verificação de Meta Já Atingida
  const metaJaAtingida = economizadoCentavos >= precoBemCentavos;

  // =========================================================================
  // MODO A: Quanto preciso guardar por mês?
  // =========================================================================
  if (modo === MODOS_CALCULO.APORTE_NECESSARIO) {
    const rawPrazo = input.prazoMeses;
    const prazoMeses = typeof rawPrazo === 'number' ? rawPrazo : parseInt(String(rawPrazo || '').trim(), 10);

    if (isNaN(prazoMeses) || !Number.isInteger(prazoMeses) || prazoMeses <= 0) {
      return {
        ok: false,
        error: 'O prazo desejado deve ser um número inteiro de meses maior que zero.',
        data: null,
        warnings: [],
        memoriaCalculo: []
      };
    }

    if (prazoMeses > LIMITE_MAXIMO_MESES) {
      return {
        ok: false,
        error: `O prazo máximo permitido para a simulação é de ${LIMITE_MAXIMO_MESES} meses (50 anos).`,
        data: null,
        warnings: [],
        memoriaCalculo: []
      };
    }

    memoriaCalculo.push(`Preço da meta (bem): ${formatCurrency(precoBem)}.`);
    memoriaCalculo.push(`Capital inicial já economizado: ${formatCurrency(economizado)}.`);
    memoriaCalculo.push(`Prazo estabelecido: ${formatPeriodoAmigavel(prazoMeses)}.`);
    memoriaCalculo.push(
      rentabilidadeAnualPerc > 0
        ? `Rentabilidade anual informada: ${formatPercent(rentabilidadeAnualPerc, 2)} a.a. (Taxa mensal equivalente: ${formatPercent(taxaMensalPerc, 4)} a.m.).`
        : 'Rentabilidade considerada: 0% a.a. (poupança nominal pura sem juros).'
    );

    if (metaJaAtingida) {
      memoriaCalculo.push('A meta já foi alcançada com o valor que você já possui!');

      return {
        ok: true,
        error: null,
        data: {
          modo,
          metaJaAtingida: true,
          metaAtingidaNoLimite: true,
          precoBemCentavos,
          precoBem,
          economizadoCentavos,
          economizado,
          faltaAcumularNominalCentavos: 0,
          faltaAcumularNominal: 0,
          prazoMeses,
          prazoMesesAtingido: 0,
          rentabilidadeAnualPerc,
          taxaMensalDecimal,
          taxaMensalPerc,
          aporteMensalNecessarioCentavos: 0,
          aporteMensalNecessario: 0,
          saldoInicialProjetadoCentavos: economizadoCentavos,
          saldoInicialProjetado: economizado,
          montanteFinalCentavos: economizadoCentavos,
          montanteFinal: economizado,
          totalAportesPropriosCentavos: 0,
          totalAportesProprios: 0,
          rendimentoEstimadoCentavos: 0,
          rendimentoEstimado: 0,
          cronogramaResumo: []
        },
        warnings: ['O valor economizado já cobre integralmente o preço da meta. Nenhum aporte adicional é necessário.'],
        memoriaCalculo
      };
    }

    // Projeção do saldo inicial isolado com rendimento após n meses
    const fatorCapitalInicial = Math.pow(1 + taxaMensalDecimal, prazoMeses);
    const saldoInicialProjetadoCentavos = Math.round(economizadoCentavos * fatorCapitalInicial);
    const saldoInicialProjetado = saldoInicialProjetadoCentavos / 100;

    memoriaCalculo.push(
      rentabilidadeAnualPerc > 0 && economizadoCentavos > 0
        ? `Projeção do capital inicial com rentabilidade ao fim de ${prazoMeses} meses: ${formatCurrency(saldoInicialProjetado)}.`
        : `Capital inicial sem rendimentos: ${formatCurrency(economizado)}.`
    );

    let aporteMensalCentavos = 0;

    // Estimativa teórica inicial do aporte necessário
    if (saldoInicialProjetadoCentavos < precoBemCentavos) {
      const montanteNecessarioAportes = precoBemCentavos - saldoInicialProjetadoCentavos;

      if (taxaMensalDecimal === 0) {
        aporteMensalCentavos = Math.ceil(montanteNecessarioAportes / prazoMeses);
      } else {
        const fatorSomaPG = (Math.pow(1 + taxaMensalDecimal, prazoMeses) - 1) / taxaMensalDecimal;
        const aporteReal = montanteNecessarioAportes / fatorSomaPG;
        aporteMensalCentavos = Math.ceil(aporteReal);
      }
    }

    // Ajuste fino do aporte pelo simulador discreto de produção:
    // Garante que o saldo final projetado com arredondamento em centavos seja >= meta
    while (simulateAccumulationBalance(economizadoCentavos, taxaMensalDecimal, prazoMeses, aporteMensalCentavos) < precoBemCentavos) {
      aporteMensalCentavos++;
    }

    // Validação da precisão do menor aporte: se reduzir 1 centavo ainda atingir a meta, reduz para o valor mínimo estritamente necessário
    while (
      aporteMensalCentavos > 0 &&
      simulateAccumulationBalance(economizadoCentavos, taxaMensalDecimal, prazoMeses, aporteMensalCentavos - 1) >= precoBemCentavos
    ) {
      aporteMensalCentavos--;
    }

    if (aporteMensalCentavos === 0) {
      memoriaCalculo.push('O rendimento sobre o capital inicial já acumulado é suficiente para atingir o valor do bem sem aportes adicionais!');
    }

    const aporteMensalNecessarioCentavos = aporteMensalCentavos;
    const aporteMensalNecessario = aporteMensalCentavos / 100;
    memoriaCalculo.push(`Aporte mensal necessário calculado: ${formatCurrency(aporteMensalNecessario)}.`);

    // Simulação mês a mês da evolução patrimonial
    let saldoAtualCentavos = economizadoCentavos;
    let totalRendimentosCentavos = 0;
    const cronograma = [];

    for (let m = 1; m <= prazoMeses; m++) {
      const saldoInicio = saldoAtualCentavos;
      const jurosMesCentavos = taxaMensalDecimal > 0 ? Math.round(saldoInicio * taxaMensalDecimal) : 0;
      const aporteMesCentavos = aporteMensalCentavos;
      const saldoFimCentavos = saldoInicio + jurosMesCentavos + aporteMesCentavos;

      totalRendimentosCentavos += jurosMesCentavos;
      saldoAtualCentavos = saldoFimCentavos;

      cronograma.push({
        mes: m,
        saldoInicial: saldoInicio / 100,
        rendimentoMes: jurosMesCentavos / 100,
        aporteMes: aporteMesCentavos / 100,
        saldoFinal: saldoFimCentavos / 100
      });
    }

    const montanteFinalCentavos = saldoAtualCentavos;
    const montanteFinal = montanteFinalCentavos / 100;
    const totalAportesPropriosCentavos = aporteMensalCentavos * prazoMeses;
    const totalAportesProprios = totalAportesPropriosCentavos / 100;
    const rendimentoEstimadoCentavos = totalRendimentosCentavos;
    const rendimentoEstimado = rendimentoEstimadoCentavos / 100;

    memoriaCalculo.push(`Total de aportes próprios acumulados em ${prazoMeses} meses: ${formatCurrency(totalAportesProprios)}.`);
    memoriaCalculo.push(`Total de rendimentos estimados gerados: ${formatCurrency(rendimentoEstimado)}.`);
    memoriaCalculo.push(`Montante final acumulado previsto: ${formatCurrency(montanteFinal)}.`);

    warnings.push('Simulação baseada em taxas constantes. Rentabilidades passadas e taxas hipotéticas não representam garantia de rentabilidade futura.');
    warnings.push('Esta versão não corrige a meta pela inflação nem por reajustes de preço do bem no período.');

    return {
      ok: true,
      error: null,
      data: {
        modo,
        metaJaAtingida: false,
        metaAtingidaNoLimite: true,
        precoBemCentavos,
        precoBem,
        economizadoCentavos,
        economizado,
        faltaAcumularNominalCentavos,
        faltaAcumularNominal,
        prazoMeses,
        prazoMesesAtingido: prazoMeses,
        rentabilidadeAnualPerc,
        taxaMensalDecimal,
        taxaMensalPerc,
        aporteMensalNecessarioCentavos,
        aporteMensalNecessario,
        saldoInicialProjetadoCentavos,
        saldoInicialProjetado,
        montanteFinalCentavos,
        montanteFinal,
        totalAportesPropriosCentavos,
        totalAportesProprios,
        rendimentoEstimadoCentavos,
        rendimentoEstimado,
        cronogramaResumo: cronograma
      },
      warnings,
      memoriaCalculo
    };
  }

  // =========================================================================
  // MODO B: Em quanto tempo atingirei a meta?
  // =========================================================================
  const rawAporte = input.aporteMensal;
  const aporteMensalCentavos = parseMoneyToCents(rawAporte ?? 0);

  if (isNaN(aporteMensalCentavos)) {
    return {
      ok: false,
      error: 'Informe um valor de aporte mensal válido.',
      data: null,
      warnings: [],
      memoriaCalculo: []
    };
  }

  if (aporteMensalCentavos < 0) {
    return {
      ok: false,
      error: 'O valor do aporte mensal não pode ser negativo.',
      data: null,
      warnings: [],
      memoriaCalculo: []
    };
  }

  const aporteMensal = aporteMensalCentavos / 100;
  const baseDate = input.baseDate instanceof Date ? input.baseDate : new Date();

  memoriaCalculo.push(`Preço da meta (bem): ${formatCurrency(precoBem)}.`);
  memoriaCalculo.push(`Capital inicial já economizado: ${formatCurrency(economizado)}.`);
  memoriaCalculo.push(`Capacidade de aporte mensal: ${formatCurrency(aporteMensal)}.`);
  memoriaCalculo.push(
    rentabilidadeAnualPerc > 0
      ? `Rentabilidade anual informada: ${formatPercent(rentabilidadeAnualPerc, 2)} a.a. (Taxa mensal equivalente: ${formatPercent(taxaMensalPerc, 4)} a.m.).`
      : 'Rentabilidade considerada: 0% a.a. (poupança nominal pura sem juros).'
  );

  if (metaJaAtingida) {
    memoriaCalculo.push('A meta já foi alcançada com o valor que você já possui!');
    const dataEstimada = estimateCompletionDate(0, baseDate);

    return {
      ok: true,
      error: null,
      data: {
        modo,
        metaJaAtingida: true,
        metaAtingidaNoLimite: true,
        precoBemCentavos,
        precoBem,
        economizadoCentavos,
        economizado,
        faltaAcumularNominalCentavos: 0,
        faltaAcumularNominal: 0,
        prazoMeses: 0,
        prazoMesesAtingido: 0,
        prazoAmigavel: '0 meses (meta já atingida)',
        rentabilidadeAnualPerc,
        taxaMensalDecimal,
        taxaMensalPerc,
        aporteMensalCentavos,
        aporteMensal,
        montanteFinalCentavos: economizadoCentavos,
        montanteFinal: economizado,
        totalAportesPropriosCentavos: 0,
        totalAportesProprios: 0,
        rendimentoEstimadoCentavos: 0,
        rendimentoEstimado: 0,
        dataEstimada,
        cronogramaResumo: []
      },
      warnings: ['O valor economizado já cobre integralmente o preço da meta.'],
      memoriaCalculo
    };
  }

  // Se aporte é zero e taxa mensal é zero, o saldo nunca cresce
  if (aporteMensalCentavos === 0 && taxaMensalDecimal === 0) {
    return {
      ok: false,
      error: 'Com aporte mensal de R$ 0,00 e sem rentabilidade (0% a.a.), a meta nunca será alcançada. Informe um aporte mensal maior que zero ou uma taxa de rentabilidade estimada.',
      data: null,
      warnings: [],
      memoriaCalculo: []
    };
  }

  // Se aporte é zero e capital inicial é zero, saldo nunca cresce mesmo com rentabilidade
  if (aporteMensalCentavos === 0 && economizadoCentavos === 0) {
    return {
      ok: false,
      error: 'Sem valor inicial economizado e com aporte mensal de R$ 0,00, a meta não pode ser iniciada.',
      data: null,
      warnings: [],
      memoriaCalculo: []
    };
  }

  // Simulação mês a mês até atingir a meta ou limite de 600 meses
  let saldoAtualCentavos = economizadoCentavos;
  let totalRendimentosCentavos = 0;
  let totalAportesCentavos = 0;
  let mesAtingido = 0;
  const cronograma = [];

  for (let m = 1; m <= LIMITE_MAXIMO_MESES; m++) {
    const saldoInicio = saldoAtualCentavos;
    const jurosMesCentavos = taxaMensalDecimal > 0 ? Math.round(saldoInicio * taxaMensalDecimal) : 0;
    const aporteMesCentavos = aporteMensalCentavos;
    const saldoFimCentavos = saldoInicio + jurosMesCentavos + aporteMesCentavos;

    totalRendimentosCentavos += jurosMesCentavos;
    totalAportesCentavos += aporteMesCentavos;
    saldoAtualCentavos = saldoFimCentavos;

    cronograma.push({
      mes: m,
      saldoInicial: saldoInicio / 100,
      rendimentoMes: jurosMesCentavos / 100,
      aporteMes: aporteMesCentavos / 100,
      saldoFinal: saldoFimCentavos / 100
    });

    if (saldoFimCentavos >= precoBemCentavos) {
      mesAtingido = m;
      break;
    }
  }

  // Caso: Limite de 600 meses excedido sem atingir a meta
  if (mesAtingido === 0) {
    memoriaCalculo.push(`A meta de ${formatCurrency(precoBem)} não foi atingida dentro do teto de ${LIMITE_MAXIMO_MESES} meses.`);
    memoriaCalculo.push(`Saldo alcançado ao final de 600 meses: ${formatCurrency(saldoAtualCentavos / 100)}.`);

    const totalAportesPropriosCentavos = totalAportesCentavos;
    return {
      ok: true,
      error: null,
      data: {
        modo,
        metaJaAtingida: false,
        metaAtingidaNoLimite: false,
        precoBemCentavos,
        precoBem,
        economizadoCentavos,
        economizado,
        faltaAcumularNominalCentavos,
        faltaAcumularNominal,
        prazoMeses: LIMITE_MAXIMO_MESES,
        prazoMesesAtingido: LIMITE_MAXIMO_MESES,
        prazoAmigavel: `Mais de ${LIMITE_MAXIMO_MESES} meses (50 anos)`,
        rentabilidadeAnualPerc,
        taxaMensalDecimal,
        taxaMensalPerc,
        aporteMensalCentavos,
        aporteMensal,
        montanteFinalCentavos: saldoAtualCentavos,
        montanteFinal: saldoAtualCentavos / 100,
        totalAportesPropriosCentavos,
        totalAportesProprios: totalAportesCentavos / 100,
        rendimentoEstimadoCentavos: totalRendimentosCentavos,
        rendimentoEstimado: totalRendimentosCentavos / 100,
        dataEstimada: null,
        cronogramaResumo: cronograma.slice(0, 12) // amostra inicial
      },
      warnings: [
        `Com o aporte de ${formatCurrency(aporteMensal)}, a meta não será atingida dentro do horizonte de 600 meses (50 anos).`,
        'Recomendamos aumentar o aporte mensal ou reavaliar o valor estimado do bem para alcançar seu objetivo em tempo hábil.'
      ],
      memoriaCalculo
    };
  }

  // Meta atingida dentro de 600 meses
  const prazoAmigavel = formatPeriodoAmigavel(mesAtingido);
  const dataEstimada = estimateCompletionDate(mesAtingido, baseDate);
  const totalAportesPropriosCentavos = totalAportesCentavos;
  const montanteFinalCentavos = saldoAtualCentavos;
  const montanteFinal = montanteFinalCentavos / 100;
  const totalAportesProprios = totalAportesCentavos / 100;
  const rendimentoEstimado = totalRendimentosCentavos / 100;

  memoriaCalculo.push(`Meta alcançada no mês ${mesAtingido} (${prazoAmigavel}).`);
  memoriaCalculo.push(`Data estimada de conquista: ${dataEstimada.mesAnoExtenso} (${dataEstimada.dataFormatada}).`);
  memoriaCalculo.push(`Total aportado pelo poupador: ${formatCurrency(totalAportesProprios)}.`);
  memoriaCalculo.push(`Total de juros/rendimentos gerados: ${formatCurrency(rendimentoEstimado)}.`);
  memoriaCalculo.push(`Saldo final acumulado: ${formatCurrency(montanteFinal)}.`);

  warnings.push('A data de conclusão é uma estimativa baseada no mês corrente e pressupõe pontualidade ininterrupta nos aportes mensais.');
  warnings.push('Simulação baseada em taxas constantes. Rentabilidades passadas e taxas hipotéticas não representam garantia de rentabilidade futura.');
  warnings.push('Esta versão não corrige a meta pela inflação nem por reajustes de preço do bem no período.');

  return {
    ok: true,
    error: null,
    data: {
      modo,
      metaJaAtingida: false,
      metaAtingidaNoLimite: true,
      precoBemCentavos,
      precoBem,
      economizadoCentavos,
      economizado,
      faltaAcumularNominalCentavos,
      faltaAcumularNominal,
      prazoMeses: mesAtingido,
      prazoMesesAtingido: mesAtingido,
      prazoAmigavel,
      rentabilidadeAnualPerc,
      taxaMensalDecimal,
      taxaMensalPerc,
      aporteMensalCentavos,
      aporteMensal,
      montanteFinalCentavos,
      montanteFinal,
      totalAportesPropriosCentavos,
      totalAportesProprios,
      rendimentoEstimadoCentavos: totalRendimentosCentavos,
      rendimentoEstimado,
      dataEstimada,
      cronogramaResumo: cronograma
    },
    warnings,
    memoriaCalculo
  };
}

/* ==========================================================================
 * Funções de Formatação de Saída e Texto de Cópia
 * ========================================================================== */

/**
 * Prepara resumo visual e textual estruturado a partir dos dados calculados.
 *
 * @param {Object} data
 * @returns {Object}
 */
export function formatResult(data) {
  if (!data) return {};

  const {
    modo,
    metaJaAtingida,
    metaAtingidaNoLimite,
    precoBem,
    economizado,
    faltaAcumularNominal,
    prazoMesesAtingido,
    prazoAmigavel,
    aporteMensalNecessario,
    aporteMensal,
    montanteFinal,
    totalAportesProprios,
    rendimentoEstimado,
    dataEstimada,
    rentabilidadeAnualPerc
  } = data;

  const isModoA = modo === MODOS_CALCULO.APORTE_NECESSARIO;

  let badgeDestaque = '';
  let valorPrincipalFormatado = '';
  let labelPrincipal = '';

  if (metaJaAtingida) {
    labelPrincipal = 'Situação da Meta:';
    valorPrincipalFormatado = 'Meta Já Alcançada!';
    badgeDestaque = 'Saldo Suficiente';
  } else if (!metaAtingidaNoLimite) {
    labelPrincipal = 'Prazo Estimado:';
    valorPrincipalFormatado = `Mais de ${LIMITE_MAXIMO_MESES} meses`;
    badgeDestaque = 'Prazo Excedido';
  } else if (isModoA) {
    labelPrincipal = 'Aporte Mensal Necessário:';
    valorPrincipalFormatado = formatCurrency(aporteMensalNecessario);
    badgeDestaque = `${prazoMesesAtingido} meses`;
  } else {
    labelPrincipal = 'Prazo Estimado:';
    valorPrincipalFormatado = prazoAmigavel || `${prazoMesesAtingido} meses`;
    badgeDestaque = dataEstimada ? dataEstimada.dataFormatada : 'Previsão';
  }

  return {
    isModoA,
    metaJaAtingida,
    metaAtingidaNoLimite,
    labelPrincipal,
    valorPrincipalFormatado,
    badgeDestaque,
    precoBemFormatado: formatCurrency(precoBem),
    economizadoFormatado: formatCurrency(economizado),
    faltaAcumularNominalFormatado: formatCurrency(faltaAcumularNominal),
    montanteFinalFormatado: formatCurrency(montanteFinal),
    totalAportesPropriosFormatado: formatCurrency(totalAportesProprios),
    rendimentoEstimadoFormatado: formatCurrency(rendimentoEstimado),
    aporteMensalFormatado: formatCurrency(isModoA ? aporteMensalNecessario : aporteMensal),
    prazoTexto: prazoAmigavel || formatPeriodoAmigavel(prazoMesesAtingido),
    dataEstimadaTexto: dataEstimada ? `${dataEstimada.mesAnoExtenso} (${dataEstimada.dataFormatada})` : '—',
    rentabilidadeTexto: rentabilidadeAnualPerc > 0 ? formatPercent(rentabilidadeAnualPerc, 2) + ' a.a.' : '0% (sem juros)'
  };
}

/**
 * Gera texto estruturado otimizado para o botão de copiar resumo.
 *
 * @param {Object} calculationResult
 * @returns {string}
 */
export function buildCopyText(calculationResult) {
  if (!calculationResult || !calculationResult.data) return '';

  const { data, memoriaCalculo, warnings } = calculationResult;
  const formatted = formatResult(data);

  const lines = [
    'Planejamento de Meta para Comprar um Bem — Calculadora Master',
    '--------------------------------------------------',
    `Modo: ${data.modo === MODOS_CALCULO.APORTE_NECESSARIO ? 'Quanto guardar por mês' : 'Em quanto tempo atingirei a meta'}`,
    `Preço do Bem: ${formatted.precoBemFormatado}`,
    `Valor Já Economizado: ${formatted.economizadoFormatado}`,
    `Valor Faltante Inicial: ${formatted.faltaAcumularNominalFormatado}`,
    `Rentabilidade Considerada: ${formatted.rentabilidadeTexto}`,
    '--------------------------------------------------'
  ];

  if (data.metaJaAtingida) {
    lines.push('Resultado: Meta Já Atingida!');
    lines.push('O valor economizado cobre integralmente o preço da meta.');
  } else if (!data.metaAtingidaNoLimite) {
    lines.push('Resultado: Meta não alcançada dentro do limite de 600 meses (50 anos).');
    lines.push(`Saldo ao final de 600 meses: ${formatted.montanteFinalFormatado}`);
  } else if (data.modo === MODOS_CALCULO.APORTE_NECESSARIO) {
    lines.push(`Aporte Mensal Necessário: ${formatted.valorPrincipalFormatado}`);
    lines.push(`Prazo Estipulado: ${formatted.prazoTexto}`);
    lines.push(`Total de Aportes Próprios: ${formatted.totalAportesPropriosFormatado}`);
    lines.push(`Rendimentos Estimados: ${formatted.rendimentoEstimadoFormatado}`);
    lines.push(`Montante Final Previsto: ${formatted.montanteFinalFormatado}`);
  } else {
    lines.push(`Prazo Estimado: ${formatted.valorPrincipalFormatado}`);
    lines.push(`Data Estimada da Conquista: ${formatted.dataEstimadaTexto}`);
    lines.push(`Aporte Mensal: ${formatted.aporteMensalFormatado}`);
    lines.push(`Total de Aportes Próprios: ${formatted.totalAportesPropriosFormatado}`);
    lines.push(`Rendimentos Estimados: ${formatted.rendimentoEstimadoFormatado}`);
    lines.push(`Montante Final Previsto: ${formatted.montanteFinalFormatado}`);
  }

  if (warnings && warnings.length > 0) {
    lines.push('--------------------------------------------------');
    lines.push('Avisos e Premissas:');
    warnings.forEach(w => lines.push(`* ${w}`));
  }

  lines.push('--------------------------------------------------');
  lines.push('Simulação realizada em: https://www.calculadoramaster.com/tools/financas/meta-comprar-bem.html');

  return lines.join('\n');
}

/* ==========================================================================
 * Conexão com o DOM (Interface do Usuário)
 * ========================================================================== */

/**
 * Conecta o formulário e elementos da página ao módulo de cálculo.
 *
 * @param {Document|HTMLElement} [root=document]
 * @returns {Object|null}
 */
export function setupTool(root = document) {
  if (!root) return null;

  const form = root.querySelector('#formMetaComprarBem');
  if (!form) return null;

  // Seletores e Grupos Condicionais
  const selModo = root.querySelector('#modoCalculoMetaBem');
  const grupoPrazo = root.querySelector('#grupoPrazoMetaBem');
  const grupoAporte = root.querySelector('#grupoAporteMetaBem');

  // Inputs
  const inputPrecoBem = root.querySelector('#precoBemMeta');
  const inputValorEconomizado = root.querySelector('#valorEconomizadoMeta');
  const inputRentabilidade = root.querySelector('#rentabilidadeAnualMeta');
  const inputPrazoMeses = root.querySelector('#prazoMesesMeta');
  const inputAporteMensal = root.querySelector('#aporteMensalMeta');

  // Botões e Feedback
  const btnLimpar = root.querySelector('#btnLimparMetaBem');
  const painelErro = root.querySelector('#erroMetaComprarBem');
  const painelResultado = root.querySelector('#resultadoMetaComprarBem');
  const painelStatus = root.querySelector('#statusAcoesMetaBem');
  const btnCopiar = root.querySelector('#btnCopiarMetaBem');
  const btnCompartilhar = root.querySelector('#btnCompartilharMetaBem');
  const btnImprimir = root.querySelector('#btnImprimirMetaBem');

  // Elementos do Demonstrativo de Resultado
  const elDestaqueLabel = root.querySelector('#resLabelDestaqueMeta');
  const elDestaqueValor = root.querySelector('#resValorDestaqueMeta');
  const elDestaqueBadge = root.querySelector('#resBadgeDestaqueMeta');

  const elSubDestaqueLabel = root.querySelector('#resLabelSubDestaqueMeta');
  const elSubDestaqueValor = root.querySelector('#resValorSubDestaqueMeta');
  const elSubDestaqueBadge = root.querySelector('#resBadgeSubDestaqueMeta');

  const elResPrecoBem = root.querySelector('#resPrecoBemMeta');
  const elResEconomizado = root.querySelector('#resValorEconomizadoMeta');
  const elResFaltaAcumular = root.querySelector('#resFaltaAcumularMeta');
  const elResTotalAportes = root.querySelector('#resTotalAportesMeta');
  const elResRendimentoEstimado = root.querySelector('#resRendimentoEstimadoMeta');
  const elResMontanteFinal = root.querySelector('#resMontanteFinalMeta');
  const elResRentabilidadeAplicada = root.querySelector('#resRentabilidadeAplicadaMeta');

  const containerAvisos = root.querySelector('#avisosMetaComprarBem');
  const containerMemoria = root.querySelector('#memoriaCalculoMetaBem');
  const containerCronogramaWrapper = root.querySelector('#wrapperCronogramaMetaBem');
  const tabelaCronograma = root.querySelector('#tabelaCronogramaMetaBem');

  let currentCalculation = null;

  // Alterna a exibição dos campos de acordo com o modo
  function atualizarModoInterface() {
    const modo = selModo ? selModo.value : MODOS_CALCULO.APORTE_NECESSARIO;
    const isModoA = modo === MODOS_CALCULO.APORTE_NECESSARIO;

    if (grupoPrazo) grupoPrazo.hidden = !isModoA;
    if (grupoAporte) grupoAporte.hidden = isModoA;

    if (painelErro) {
      painelErro.hidden = true;
      painelErro.textContent = '';
    }
  }

  // Execução do cálculo
  function executarCalculo() {
    if (painelErro) {
      painelErro.hidden = true;
      painelErro.textContent = '';
    }

    const modo = selModo ? selModo.value : MODOS_CALCULO.APORTE_NECESSARIO;
    const precoBem = inputPrecoBem ? inputPrecoBem.value : '';
    const valorEconomizado = inputValorEconomizado ? inputValorEconomizado.value : '0';
    const rentabilidadeAnual = inputRentabilidade ? inputRentabilidade.value : '0';
    const prazoMeses = inputPrazoMeses ? inputPrazoMeses.value : '12';
    const aporteMensal = inputAporteMensal ? inputAporteMensal.value : '0';

    const result = calculateGoal({
      modo,
      precoBem,
      valorEconomizado,
      rentabilidadeAnual,
      prazoMeses,
      aporteMensal
    });

    if (!result.ok) {
      if (painelErro) {
        painelErro.textContent = result.error || 'Ocorreu um erro ao calcular.';
        painelErro.hidden = false;
        painelErro.focus();
      }
      if (painelResultado) painelResultado.hidden = true;
      return result;
    }

    currentCalculation = result;
    const formatted = formatResult(result.data);

    // Preenche cards de destaque
    if (elDestaqueLabel) elDestaqueLabel.textContent = formatted.labelPrincipal;
    if (elDestaqueValor) elDestaqueValor.textContent = formatted.valorPrincipalFormatado;
    if (elDestaqueBadge) elDestaqueBadge.textContent = formatted.badgeDestaque;

    if (elSubDestaqueLabel && elSubDestaqueValor && elSubDestaqueBadge) {
      if (result.data.metaJaAtingida) {
        elSubDestaqueLabel.textContent = 'Montante Disponível:';
        elSubDestaqueValor.textContent = formatted.economizadoFormatado;
        elSubDestaqueBadge.textContent = '100% da Meta';
      } else if (!result.data.metaAtingidaNoLimite) {
        elSubDestaqueLabel.textContent = 'Saldo em 600 Meses:';
        elSubDestaqueValor.textContent = formatted.montanteFinalFormatado;
        elSubDestaqueBadge.textContent = 'Teto 50 anos';
      } else if (result.data.modo === MODOS_CALCULO.APORTE_NECESSARIO) {
        elSubDestaqueLabel.textContent = 'Montante Final Projetado:';
        elSubDestaqueValor.textContent = formatted.montanteFinalFormatado;
        elSubDestaqueBadge.textContent = 'Meta Atingida';
      } else {
        elSubDestaqueLabel.textContent = 'Previsão de Conquista:';
        elSubDestaqueValor.textContent = formatted.dataEstimadaTexto;
        elSubDestaqueBadge.textContent = 'Data Estimada';
      }
    }

    // Preenche grade de métricas
    if (elResPrecoBem) elResPrecoBem.textContent = formatted.precoBemFormatado;
    if (elResEconomizado) elResEconomizado.textContent = formatted.economizadoFormatado;
    if (elResFaltaAcumular) elResFaltaAcumular.textContent = formatted.faltaAcumularNominalFormatado;
    if (elResTotalAportes) elResTotalAportes.textContent = formatted.totalAportesPropriosFormatado;
    if (elResRendimentoEstimado) elResRendimentoEstimado.textContent = formatted.rendimentoEstimadoFormatado;
    if (elResMontanteFinal) elResMontanteFinal.textContent = formatted.montanteFinalFormatado;
    if (elResRentabilidadeAplicada) elResRentabilidadeAplicada.textContent = formatted.rentabilidadeTexto;

    // Preenche avisos
    if (containerAvisos) {
      containerAvisos.innerHTML = '';
      if (result.warnings && result.warnings.length > 0) {
        result.warnings.forEach(w => {
          const p = document.createElement('p');
          p.className = 'mei-limit-alert';
          p.textContent = w;
          containerAvisos.appendChild(p);
        });
      }
    }

    // Preenche memória de cálculo
    if (containerMemoria) {
      containerMemoria.innerHTML = '';
      if (result.memoriaCalculo && result.memoriaCalculo.length > 0) {
        result.memoriaCalculo.forEach(item => {
          const li = document.createElement('li');
          li.textContent = item;
          containerMemoria.appendChild(li);
        });
      }
    }

    // Cronograma resumido / demonstrativo
    if (tabelaCronograma && containerCronogramaWrapper) {
      let tbody = tabelaCronograma.querySelector('tbody');
      if (!tbody) {
        tbody = document.createElement('tbody');
        tabelaCronograma.appendChild(tbody);
      }
      tbody.innerHTML = '';

      const cronograma = result.data.cronogramaResumo || [];
      if (cronograma.length > 0) {
        containerCronogramaWrapper.hidden = false;
        // Exibe meses iniciais e finais de forma amigável se forem muitos
        const amostra = cronograma.length <= 12
          ? cronograma
          : [...cronograma.slice(0, 6), ...cronograma.slice(-6)];

        amostra.forEach((linha, idx) => {
          // Linha divisória se houver salto
          if (cronograma.length > 12 && idx === 6) {
            const trSalto = document.createElement('tr');
            const tdSalto = document.createElement('td');
            tdSalto.setAttribute('colspan', '5');
            tdSalto.style.textAlign = 'center';
            tdSalto.style.fontStyle = 'italic';
            tdSalto.textContent = `... meses intermediários acumulando aportes e juros ...`;
            trSalto.appendChild(tdSalto);
            tbody.appendChild(trSalto);
          }

          const tr = document.createElement('tr');
          const tdMes = document.createElement('td');
          tdMes.textContent = `Mês ${linha.mes}`;

          const tdSaldoIni = document.createElement('td');
          tdSaldoIni.textContent = formatCurrency(linha.saldoInicial);

          const tdRend = document.createElement('td');
          tdRend.textContent = formatCurrency(linha.rendimentoMes);

          const tdAporte = document.createElement('td');
          tdAporte.textContent = formatCurrency(linha.aporteMes);

          const tdSaldoFim = document.createElement('td');
          tdSaldoFim.textContent = formatCurrency(linha.saldoFinal);

          tr.append(tdMes, tdSaldoIni, tdRend, tdAporte, tdSaldoFim);
          tbody.appendChild(tr);
        });
      } else {
        containerCronogramaWrapper.hidden = true;
      }
    }

    if (painelResultado) {
      painelResultado.hidden = false;
    }

    // Inicializa botões de ação
    createResultActions({
      container: root.querySelector('.result-actions') || painelResultado,
      copyBtn: btnCopiar,
      shareBtn: btnCompartilhar,
      printBtn: btnImprimir,
      statusEl: painelStatus,
      onCopy: () => buildCopyText(currentCalculation),
      shareData: () => ({
        title: 'Meta para Comprar um Bem — Calculadora Master',
        text: buildCopyText(currentCalculation),
        url: window.location.href
      })
    });

    return result;
  }

  // Event Listeners
  if (selModo) {
    selModo.addEventListener('change', atualizarModoInterface);
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    executarCalculo();
  });

  if (btnLimpar) {
    btnLimpar.addEventListener('click', () => {
      if (form && typeof form.reset === 'function') {
        form.reset();
      }
      if (selModo) selModo.value = MODOS_CALCULO.APORTE_NECESSARIO;
      if (inputValorEconomizado) inputValorEconomizado.value = '0';
      if (inputRentabilidade) inputRentabilidade.value = '0';
      if (inputPrazoMeses) inputPrazoMeses.value = '12';
      if (inputAporteMensal) inputAporteMensal.value = '';
      if (painelErro) {
        painelErro.hidden = true;
        painelErro.textContent = '';
      }
      if (painelResultado) painelResultado.hidden = true;
      if (containerAvisos) containerAvisos.innerHTML = '';
      if (containerMemoria) containerMemoria.innerHTML = '';
      if (containerCronogramaWrapper) containerCronogramaWrapper.hidden = true;
      atualizarModoInterface();
    });
  }

  // Inicialização padrão da interface
  atualizarModoInterface();

  return {
    executarCalculo,
    getCurrentCalculation: () => currentCalculation
  };
}

if (typeof document !== 'undefined') {
  setupTool(document);
}
