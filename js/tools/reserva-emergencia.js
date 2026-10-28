/**
 * Calculadora de Reserva de Emergência — Calculadora Master
 *
 * Módulo puro e desacoplado para planejamento e formação da reserva de emergência financeira.
 *
 * Princípios e Invariantes:
 * - Operações monetárias internas estritamente em centavos inteiros com arredondamento consistente;
 * - Reserva de emergência calculada como o custo de sobrevivência essencial mensal multiplicado pelos meses de cobertura;
 * - Separação categórica entre a meta nominal de segurança e o rendimento hipotético de investimentos;
 * - Avaliação do saldo atual: meses de cobertura imediatos proporcionados e percentual da meta alcançado;
 * - Apuração de rota de acumulação: prazo estimado com base em aportes regulares (com ou sem rendimento);
 * - Cenários integrados de cobertura (3, 6, 9 e 12 meses) adequados a diferentes perfis de estabilidade profissional.
 */

import { createResultActions } from '../core/result-actions.js';

export const CENARIOS_COBERTURA = Object.freeze([
  {
    meses: 3,
    perfil: 'Servidor Público / Alta Estabilidade',
    descricao: 'Indicado para concursados estatutários ou famílias com estabilidade comprovada e baixo risco de demissão.'
  },
  {
    meses: 6,
    perfil: 'Trabalhador CLT / Estabilidade Moderada',
    descricao: 'Padrão recomendado para profissionais contratados via CLT com direito a FGTS, seguro-desemprego e aviso prévio.'
  },
  {
    meses: 9,
    perfil: 'Família de Renda Única / CLT Variável',
    descricao: 'Recomendado para lares onde apenas uma pessoa provê a renda ou onde grande parte do salário é composta por comissões.'
  },
  {
    meses: 12,
    perfil: 'Autônomo, MEI, Freelancer ou PJ',
    descricao: 'Imprescindível para quem não tem estabilidade formal, benefício rescisório ou vivencia forte sazonalidade de renda.'
  }
]);

export const LIMITE_MAXIMO_MESES_COBERTURA = 36;
export const LIMITE_MAXIMO_SIMULACAO_MESES = 600;

/* ==========================================================================
 * Utilitários de Parsing e Formatação
 * ========================================================================== */

/**
 * Converte qualquer entrada monetária flexível (R$ 3.500,00 ou 3500.00) diretamente
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
 * Converte entrada de porcentagem para número de ponto flutuante decimal.
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
 * @param {number} [decimals=1]
 * @returns {string}
 */
export function formatPercent(value, decimals = 1) {
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
 * @param {number} annualRatePercent
 * @returns {number}
 */
export function calculateEffectiveMonthlyRate(annualRatePercent) {
  if (!Number.isFinite(annualRatePercent) || annualRatePercent <= 0) {
    return 0;
  }
  const rDecimal = annualRatePercent / 100;
  return Math.pow(1 + rDecimal, 1 / 12) - 1;
}

/* ==========================================================================
 * Motor de Cálculo da Reserva de Emergência
 * ========================================================================== */

/**
 * Executa o cálculo da Reserva de Emergência e projeção de metas.
 *
 * @param {Object} input
 * @param {string|number} input.despesasEssenciais Custo mensal essencial de sobrevivência
 * @param {string|number} [input.mesesDesejados=6] Quantidade de meses de cobertura almejada
 * @param {string|number} [input.reservaAtual=0] Dinheiro já acumulado para emergências
 * @param {string|number} [input.aporteMensal=0] Aporte mensal que consegue guardar
 * @param {string|number} [input.rentabilidadeAnual=0] Rentabilidade anual líquida estimada (% a.a.)
 * @returns {Object}
 */
export function calculateEmergencyFund(input = {}) {
  const warnings = [];
  const memoriaCalculo = [];

  // 1. Validação das Despesas Essenciais
  const despesasCentavos = parseMoneyToCents(input.despesasEssenciais);
  if (isNaN(despesasCentavos) || despesasCentavos <= 0) {
    return {
      ok: false,
      error: 'Informe um valor válido e maior que zero para suas despesas essenciais mensais.',
      data: null,
      warnings: [],
      memoriaCalculo: []
    };
  }

  // 2. Validação dos Meses de Cobertura Desejados
  const rawMeses = input.mesesDesejados ?? 6;
  const mesesDesejados = typeof rawMeses === 'number' ? rawMeses : parseInt(String(rawMeses).trim(), 10);
  if (isNaN(mesesDesejados) || mesesDesejados < 1 || mesesDesejados > LIMITE_MAXIMO_MESES_COBERTURA) {
    return {
      ok: false,
      error: `A quantidade de meses de cobertura deve ser um número inteiro entre 1 e ${LIMITE_MAXIMO_MESES_COBERTURA} meses.`,
      data: null,
      warnings: [],
      memoriaCalculo: []
    };
  }

  // 3. Validação da Reserva Atual
  let reservaAtualCentavos = 0;
  if (input.reservaAtual !== undefined && input.reservaAtual !== null && String(input.reservaAtual).trim() !== '') {
    reservaAtualCentavos = parseMoneyToCents(input.reservaAtual);
  }
  if (isNaN(reservaAtualCentavos) || reservaAtualCentavos < 0) {
    return {
      ok: false,
      error: 'O valor da reserva financeira atual não pode ser negativo.',
      data: null,
      warnings: [],
      memoriaCalculo: []
    };
  }

  // 4. Validação do Aporte Mensal
  let aporteMensalCentavos = 0;
  if (input.aporteMensal !== undefined && input.aporteMensal !== null && String(input.aporteMensal).trim() !== '') {
    aporteMensalCentavos = parseMoneyToCents(input.aporteMensal);
  }
  if (isNaN(aporteMensalCentavos) || aporteMensalCentavos < 0) {
    return {
      ok: false,
      error: 'O valor do aporte mensal não pode ser negativo.',
      data: null,
      warnings: [],
      memoriaCalculo: []
    };
  }

  // 5. Validação da Rentabilidade Anual
  let rentabilidadeAnual = 0;
  if (input.rentabilidadeAnual !== undefined && input.rentabilidadeAnual !== null && String(input.rentabilidadeAnual).trim() !== '') {
    rentabilidadeAnual = parsePercent(input.rentabilidadeAnual);
  }
  if (isNaN(rentabilidadeAnual) || rentabilidadeAnual < 0 || rentabilidadeAnual > 100) {
    return {
      ok: false,
      error: 'A rentabilidade anual líquida estimada deve estar entre 0% e 100% a.a.',
      data: null,
      warnings: [],
      memoriaCalculo: []
    };
  }

  // =========================================================================
  // Cálculos da Meta e Situação Atual
  // =========================================================================
  const reservaMetaCentavos = despesasCentavos * mesesDesejados;
  const mesesCoberturaAtual = despesasCentavos > 0 ? (reservaAtualCentavos / despesasCentavos) : 0;
  const percentualAtingido = reservaMetaCentavos > 0 ? ((reservaAtualCentavos / reservaMetaCentavos) * 100) : 100;
  const faltaCentavos = Math.max(0, reservaMetaCentavos - reservaAtualCentavos);
  const metaAtingida = reservaAtualCentavos >= reservaMetaCentavos;

  let statusMeta = 'nao_iniciada';
  let statusTexto = 'Sem reserva de emergência';
  if (metaAtingida) {
    statusMeta = 'concluida';
    statusTexto = reservaAtualCentavos > reservaMetaCentavos ? 'Meta superada com folga' : 'Meta 100% atingida';
  } else if (reservaAtualCentavos > 0) {
    statusMeta = 'em_formacao';
    statusTexto = 'Reserva em formação';
  }

  // =========================================================================
  // Estimativa de Tempo e Projeção de Aportes
  // =========================================================================
  const iMensal = calculateEffectiveMonthlyRate(rentabilidadeAnual);
  let mesesNecessarios = null;
  let totalAportesCentavos = 0;
  let totalRendimentosCentavos = 0;
  let dataEstimadaConquista = null;

  if (metaAtingida) {
    mesesNecessarios = 0;
    totalAportesCentavos = 0;
    totalRendimentosCentavos = 0;
    dataEstimadaConquista = 'Meta já alcançada';
  } else if (aporteMensalCentavos > 0) {
    if (iMensal === 0) {
      mesesNecessarios = Math.ceil(faltaCentavos / aporteMensalCentavos);
      totalAportesCentavos = mesesNecessarios * aporteMensalCentavos;
      totalRendimentosCentavos = 0;
    } else {
      let saldoCentavos = reservaAtualCentavos;
      let m = 0;
      let rendimentoAcumuladoCentavos = 0;
      let aportesAcumuladosCentavos = 0;

      while (saldoCentavos < reservaMetaCentavos && m < LIMITE_MAXIMO_SIMULACAO_MESES) {
        m++;
        const rendimentoMes = Math.round(saldoCentavos * iMensal);
        saldoCentavos += rendimentoMes;
        rendimentoAcumuladoCentavos += rendimentoMes;

        saldoCentavos += aporteMensalCentavos;
        aportesAcumuladosCentavos += aporteMensalCentavos;
      }

      mesesNecessarios = m;
      totalAportesCentavos = aportesAcumuladosCentavos;
      totalRendimentosCentavos = rendimentoAcumuladoCentavos;
    }

    if (mesesNecessarios > 0 && mesesNecessarios <= LIMITE_MAXIMO_SIMULACAO_MESES) {
      const dataAlvo = new Date();
      dataAlvo.setMonth(dataAlvo.getMonth() + mesesNecessarios);
      const mesesNomes = [
        'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
        'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'
      ];
      dataEstimadaConquista = `${mesesNomes[dataAlvo.getMonth()]} de ${dataAlvo.getFullYear()}`;
    }
  }

  // Sugestões de aportes para quem ainda não definiu aporte mensal
  const sugestoesAporte = [
    { prazoMeses: 6, aporte: Math.ceil(faltaCentavos / 6) },
    { prazoMeses: 12, aporte: Math.ceil(faltaCentavos / 12) },
    { prazoMeses: 18, aporte: Math.ceil(faltaCentavos / 18) },
    { prazoMeses: 24, aporte: Math.ceil(faltaCentavos / 24) }
  ];

  // =========================================================================
  // Cenários Comparativos de Cobertura Multi-Perfil (3, 6, 9 e 12 meses)
  // =========================================================================
  const cenarios = CENARIOS_COBERTURA.map(cenario => {
    const metaCenarioCentavos = despesasCentavos * cenario.meses;
    const faltaCenarioCentavos = Math.max(0, metaCenarioCentavos - reservaAtualCentavos);
    const percCenario = metaCenarioCentavos > 0 ? (reservaAtualCentavos / metaCenarioCentavos) * 100 : 100;
    let tempoCenarioMeses = null;

    if (reservaAtualCentavos >= metaCenarioCentavos) {
      tempoCenarioMeses = 0;
    } else if (aporteMensalCentavos > 0) {
      if (iMensal === 0) {
        tempoCenarioMeses = Math.ceil(faltaCenarioCentavos / aporteMensalCentavos);
      } else {
        let saldo = reservaAtualCentavos;
        let mesContador = 0;
        while (saldo < metaCenarioCentavos && mesContador < LIMITE_MAXIMO_SIMULACAO_MESES) {
          mesContador++;
          saldo += Math.round(saldo * iMensal);
          saldo += aporteMensalCentavos;
        }
        tempoCenarioMeses = mesContador;
      }
    }

    return {
      meses: cenario.meses,
      perfil: cenario.perfil,
      descricao: cenario.descricao,
      metaCentavos: metaCenarioCentavos,
      meta: metaCenarioCentavos / 100,
      faltaCentavos: faltaCenarioCentavos,
      falta: faltaCenarioCentavos / 100,
      percentualCoberto: percCenario,
      atingido: reservaAtualCentavos >= metaCenarioCentavos,
      tempoEstimadoMeses: tempoCenarioMeses
    };
  });

  // =========================================================================
  // Avisos Educacionais e Memória de Cálculo
  // =========================================================================
  memoriaCalculo.push(`Despesas essenciais mensais: ${formatCurrency(despesasCentavos / 100)}.`);
  memoriaCalculo.push(`Cobertura almejada: ${mesesDesejados} meses de sobrevivência financeira.`);
  memoriaCalculo.push(`Meta total da reserva recomendada: ${formatCurrency(reservaMetaCentavos / 100)}.`);
  memoriaCalculo.push(`Reserva atual disponível: ${formatCurrency(reservaAtualCentavos / 100)} (${formatPercent(percentualAtingido, 1)} da meta).`);
  memoriaCalculo.push(`Meses de cobertura proporcionados pelo saldo atual: ${new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(mesesCoberturaAtual)} meses.`);

  if (metaAtingida) {
    memoriaCalculo.push('Parabéns! Sua reserva de emergência está integralmente constituída para a meta selecionada.');
  } else {
    memoriaCalculo.push(`Valor restante a acumular: ${formatCurrency(faltaCentavos / 100)}.`);
    if (aporteMensalCentavos > 0) {
      memoriaCalculo.push(`Com aportes de ${formatCurrency(aporteMensalCentavos / 100)}/mês, a meta será alcançada em aproximadamente ${mesesNecessarios} meses${dataEstimadaConquista ? ` (${dataEstimadaConquista})` : ''}.`);
      if (rentabilidadeAnual > 0) {
        memoriaCalculo.push(`Rentabilidade anual considerada: ${formatPercent(rentabilidadeAnual, 2)} a.a. Rendimentos acumulados estimados: ${formatCurrency(totalRendimentosCentavos / 100)}.`);
      }
    } else {
      memoriaCalculo.push('Defina um aporte mensal para calcular o prazo exato de conclusão da sua reserva.');
    }
  }

  warnings.push('A reserva de emergência tem como prioridade máxima a segurança patrimonial e a liquidez diária imediata. Mantenha os recursos em instrumentos de baixo risco garantidos pelo FGC ou Tesouro Direto (ex: Tesouro Selic, CDBs com liquidez diária).');

  if (rentabilidadeAnual > 0) {
    warnings.push('Atenção: A rentabilidade dos investimentos é tratada como rendimento secundário hipotético. O cálculo principal da meta é rigorosamente nominal para garantir sua cobertura real de sobrevivência em qualquer cenário econômico.');
  }

  return {
    ok: true,
    error: null,
    data: {
      despesasCentavos,
      despesas: despesasCentavos / 100,
      mesesDesejados,
      reservaAtualCentavos,
      reservaAtual: reservaAtualCentavos / 100,
      aporteMensalCentavos,
      aporteMensal: aporteMensalCentavos / 100,
      rentabilidadeAnual,
      taxaMensalDecimal: iMensal,
      reservaMetaCentavos,
      reservaMeta: reservaMetaCentavos / 100,
      mesesCoberturaAtual,
      percentualAtingido,
      faltaCentavos,
      falta: faltaCentavos / 100,
      metaAtingida,
      statusMeta,
      statusTexto,
      mesesNecessarios,
      totalAportesCentavos,
      totalAportes: totalAportesCentavos / 100,
      totalRendimentosCentavos,
      totalRendimentos: totalRendimentosCentavos / 100,
      dataEstimadaConquista,
      sugestoesAporte,
      cenarios
    },
    warnings,
    memoriaCalculo
  };
}

/* ==========================================================================
 * Formatação Estruturada e Texto de Compartilhamento
 * ========================================================================== */

/**
 * Constrói o texto formatado para cópia em clipboard.
 *
 * @param {Object} result Retorno de calculateEmergencyFund
 * @returns {string}
 */
export function buildCopyText(result) {
  if (!result || !result.ok || !result.data) {
    return 'Calculadora de Reserva de Emergência — Calculadora Master\nNenhum resultado calculado.';
  }

  const d = result.data;
  const mesesFormatado = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(d.mesesCoberturaAtual);

  const linhas = [
    '=====================================================',
    'PLANEJAMENTO DE RESERVA DE EMERGÊNCIA — CALCULADORA MASTER',
    '=====================================================',
    `Situação atual: ${d.statusTexto}`,
    `Meta recomendada (${d.mesesDesejados} meses de despesas): ${formatCurrency(d.reservaMeta)}`,
    `Saldo atual acumulado: ${formatCurrency(d.reservaAtual)} (${formatPercent(d.percentualAtingido, 1)} da meta)`,
    `Cobertura atual proporcionada: ${mesesFormatado} meses de sobrevivência`,
    `Valor restante para a meta: ${formatCurrency(d.falta)}`,
    ''
  ];

  if (!d.metaAtingida && d.aporteMensal > 0 && d.mesesNecessarios !== null) {
    linhas.push('--- ROTA DE ACUMULAÇÃO ---');
    linhas.push(`Aporte mensal informado: ${formatCurrency(d.aporteMensal)}`);
    linhas.push(`Tempo estimado para atingir a meta: ${d.mesesNecessarios} meses${d.dataEstimadaConquista ? ` (${d.dataEstimadaConquista})` : ''}`);
    if (d.rentabilidadeAnual > 0) {
      linhas.push(`Rentabilidade líquida considerada: ${formatPercent(d.rentabilidadeAnual, 2)} a.a.`);
      linhas.push(`Rendimentos estimados no período: ${formatCurrency(d.totalRendimentos)}`);
    }
    linhas.push('');
  }

  linhas.push('--- CENÁRIOS POR PERFIL PROFISSIONAL ---');
  for (const c of d.cenarios) {
    linhas.push(`• ${c.meses} meses (${c.perfil}): ${formatCurrency(c.meta)} [Faltam: ${formatCurrency(c.falta)}]`);
  }

  linhas.push('');
  linhas.push('Simule sua reserva em: https://www.calculadoramaster.com/tools/financas/reserva-emergencia.html');

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
  const mesesFormatado = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(d.mesesCoberturaAtual);

  const secoes = [
    { label: 'Situação da reserva', value: d.statusTexto },
    { label: 'Meta de reserva recomendada', value: formatCurrency(d.reservaMeta) },
    { label: 'Reserva atual disponível', value: formatCurrency(d.reservaAtual) },
    { label: 'Cobertura atual em meses', value: `${mesesFormatado} meses` },
    { label: 'Percentual da meta atingido', value: formatPercent(d.percentualAtingido, 1) },
    { label: 'Valor restante para a meta', value: formatCurrency(d.falta) }
  ];

  if (!d.metaAtingida && d.mesesNecessarios !== null && d.mesesNecessarios > 0) {
    secoes.push({ label: 'Prazo estimado para a meta', value: `${d.mesesNecessarios} meses${d.dataEstimadaConquista ? ` (${d.dataEstimadaConquista})` : ''}` });
  }

  return secoes;
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

  const form = root.querySelector('#formReservaEmergencia');
  if (!form) return null;

  // Campos de entrada
  const inputDespesas = root.querySelector('#despesasEssenciais');
  const selectMeses = root.querySelector('#mesesDesejados');
  const inputReservaAtual = root.querySelector('#reservaAtual');
  const inputAporteMensal = root.querySelector('#aporteMensal');
  const inputRentabilidade = root.querySelector('#rentabilidadeAnual');

  const btnCalcular = root.querySelector('#btnCalcularReserva');
  const btnLimpar = root.querySelector('#btnLimparReserva');
  const erroPainel = root.querySelector('#erroReservaEmergencia');
  const resultadoSecao = root.querySelector('#resultadoReservaEmergencia');

  // Elementos do Card Principal de Destaque
  const resBadgeStatus = root.querySelector('#resBadgeStatus');
  const resMetaTotal = root.querySelector('#resMetaTotal');
  const resMesesDesejados = root.querySelector('#resMesesDesejados');
  const resCoberturaAtual = root.querySelector('#resCoberturaAtual');
  const resPercAtingido = root.querySelector('#resPercAtingido');
  const resFaltaValor = root.querySelector('#resFaltaValor');
  const resBarraProgresso = root.querySelector('#resBarraProgresso');

  // Elementos de Prazo e Aporte
  const resCardPrazo = root.querySelector('#resCardPrazo');
  const resTempoEstimado = root.querySelector('#resTempoEstimado');
  const resDataConquista = root.querySelector('#resDataConquista');
  const resRendimentosEstimados = root.querySelector('#resRendimentosEstimados');

  // Tabela de Cenários
  const corpoTabelaCenarios = root.querySelector('#tabelaCenariosReserva tbody');

  // Memória de cálculo e avisos
  const listaMemoria = root.querySelector('#memoriaCalculoReserva');
  const painelAvisos = root.querySelector('#avisosReservaEmergencia');
  const statusAcoes = root.querySelector('#statusAcoesReserva');

  // Inicializa Result Actions (Copiar, Compartilhar, Imprimir)
  const containerAcoes = root.querySelector('#acoesResultadoReserva');
  let resultActionsController = null;
  if (containerAcoes) {
    resultActionsController = createResultActions(containerAcoes, {
      toolName: 'Calculadora de Reserva de Emergência',
      canonicalUrl: 'https://www.calculadoramaster.com/tools/financas/reserva-emergencia.html',
      statusElement: statusAcoes,
      buildCopyText: () => {
        if (!ultimoResultado) return '';
        return buildCopyText(ultimoResultado);
      },
      formatResult: () => {
        if (!ultimoResultado) return [];
        return formatResult(ultimoResultado);
      }
    });
  }

  let ultimoResultado = null;

  function aplicarMascaraMonetaria(input) {
    if (!input) return;
    input.addEventListener('input', () => {
      let digits = input.value.replace(/\D/g, '');
      if (!digits) {
        input.value = '';
        return;
      }
      const cents = parseInt(digits, 10);
      input.value = new Intl.NumberFormat('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(cents / 100);
    });
  }

  aplicarMascaraMonetaria(inputDespesas);
  aplicarMascaraMonetaria(inputReservaAtual);
  aplicarMascaraMonetaria(inputAporteMensal);

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
    }
    if (resultadoSecao) {
      resultadoSecao.hidden = true;
    }
  }

  function executarCalculo() {
    limparErros();

    const dados = {
      despesasEssenciais: inputDespesas ? inputDespesas.value : '',
      mesesDesejados: selectMeses ? selectMeses.value : 6,
      reservaAtual: inputReservaAtual ? inputReservaAtual.value : '',
      aporteMensal: inputAporteMensal ? inputAporteMensal.value : '',
      rentabilidadeAnual: inputRentabilidade ? inputRentabilidade.value : ''
    };

    const resultado = calculateEmergencyFund(dados);
    ultimoResultado = resultado;

    if (!resultado.ok) {
      mostrarErro(resultado.error);
      return resultado;
    }

    const d = resultado.data;

    // Atualiza Destaque Principal
    if (resBadgeStatus) {
      resBadgeStatus.textContent = d.statusTexto;
      resBadgeStatus.className = `status-badge ${d.statusMeta}`;
    }

    if (resMetaTotal) resMetaTotal.textContent = formatCurrency(d.reservaMeta);
    if (resMesesDesejados) resMesesDesejados.textContent = `${d.mesesDesejados} meses de despesas`;

    const mesesFmt = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(d.mesesCoberturaAtual);
    if (resCoberturaAtual) resCoberturaAtual.textContent = `${mesesFmt} meses`;
    if (resPercAtingido) resPercAtingido.textContent = formatPercent(d.percentualAtingido, 1);
    if (resFaltaValor) resFaltaValor.textContent = formatCurrency(d.falta);

    if (resBarraProgresso) {
      const progressoClamped = Math.min(100, Math.max(0, d.percentualAtingido));
      resBarraProgresso.style.width = `${progressoClamped}%`;
      resBarraProgresso.setAttribute('aria-valuenow', String(Math.round(progressoClamped)));
    }

    // Atualiza Rota de Acumulação / Prazo
    if (resCardPrazo) {
      if (d.metaAtingida) {
        resCardPrazo.hidden = false;
        if (resTempoEstimado) resTempoEstimado.textContent = 'Meta Concluída';
        if (resDataConquista) resDataConquista.textContent = 'Sua reserva recomendada já está integralmente acumulada.';
        if (resRendimentosEstimados) resRendimentosEstimados.textContent = 'R$ 0,00';
      } else if (d.aporteMensalCentavos > 0 && d.mesesNecessarios !== null) {
        resCardPrazo.hidden = false;
        if (resTempoEstimado) resTempoEstimado.textContent = `${d.mesesNecessarios} meses`;
        if (resDataConquista) resDataConquista.textContent = d.dataEstimadaConquista ? `Previsão: ${d.dataEstimadaConquista}` : '';
        if (resRendimentosEstimados) {
          resRendimentosEstimados.textContent = d.rentabilidadeAnual > 0 ? formatCurrency(d.totalRendimentos) : 'R$ 0,00 (sem rentabilidade simulada)';
        }
      } else {
        resCardPrazo.hidden = true;
      }
    }

    // Preenche Tabela de Cenários
    if (corpoTabelaCenarios) {
      corpoTabelaCenarios.innerHTML = '';
      for (const c of d.cenarios) {
        const tr = document.createElement('tr');
        if (c.meses === d.mesesDesejados) {
          tr.className = 'cenario-destacado';
        }

        const tdMeses = document.createElement('td');
        tdMeses.innerHTML = `<strong>${c.meses} meses</strong><br><small class="text-muted">${c.perfil}</small>`;

        const tdMeta = document.createElement('td');
        tdMeta.textContent = formatCurrency(c.meta);

        const tdCobertura = document.createElement('td');
        tdCobertura.textContent = formatPercent(c.percentualCoberto, 1);

        const tdFalta = document.createElement('td');
        tdFalta.textContent = formatCurrency(c.falta);

        const tdPrazo = document.createElement('td');
        if (c.atingido) {
          tdPrazo.innerHTML = '<span class="tag-concluido">Alcançado</span>';
        } else if (c.tempoEstimadoMeses !== null) {
          tdPrazo.textContent = `${c.tempoEstimadoMeses} meses`;
        } else {
          tdPrazo.textContent = '—';
        }

        tr.appendChild(tdMeses);
        tr.appendChild(tdMeta);
        tr.appendChild(tdCobertura);
        tr.appendChild(tdFalta);
        tr.appendChild(tdPrazo);
        corpoTabelaCenarios.appendChild(tr);
      }
    }

    // Preenche Memória de Cálculo
    if (listaMemoria) {
      listaMemoria.innerHTML = '';
      for (const item of resultado.memoriaCalculo) {
        const li = document.createElement('li');
        li.textContent = item;
        listaMemoria.appendChild(li);
      }
    }

    // Preenche Avisos
    if (painelAvisos) {
      painelAvisos.innerHTML = '';
      for (const aviso of resultado.warnings) {
        const p = document.createElement('p');
        p.className = 'aviso-educativo';
        p.textContent = aviso;
        painelAvisos.appendChild(p);
      }
    }

    if (resultadoSecao) {
      resultadoSecao.hidden = false;
    }

    return resultado;
  }

  function limparTudo() {
    if (form) form.reset();
    if (inputDespesas) inputDespesas.value = '';
    if (selectMeses) selectMeses.value = '6';
    if (inputReservaAtual) inputReservaAtual.value = '';
    if (inputAporteMensal) inputAporteMensal.value = '';
    if (inputRentabilidade) inputRentabilidade.value = '';

    limparErros();
    if (resultadoSecao) resultadoSecao.hidden = true;
    ultimoResultado = null;

    if (inputDespesas) inputDespesas.focus();
  }

  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      executarCalculo();
    });
  }

  if (btnCalcular) {
    btnCalcular.addEventListener('click', (e) => {
      e.preventDefault();
      executarCalculo();
    });
  }

  if (btnLimpar) {
    btnLimpar.addEventListener('click', (e) => {
      e.preventDefault();
      limparTudo();
    });
  }

  return {
    executarCalculo,
    limparTudo,
    getUltimoResultado: () => ultimoResultado,
    getResultActionsController: () => resultActionsController
  };
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setupTool());
  } else {
    setupTool();
  }
}
