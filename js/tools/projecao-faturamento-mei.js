/**
 * Calculadora de Projeção de Faturamento MEI - Calculadora Master
 *
 * Projeta o faturamento bruto dos meses restantes do ano de forma composta,
 * soma ao faturamento bruto já acumulado (sem contagem duplicada) e compara
 * com o limite anual configurável informado pelo usuário.
 */

import { createResultActions } from '../core/result-actions.js';

export const DEFAULTS = Object.freeze({
  faturamentoAcumulado: 0,
  mesesRestantes: 6,
  crescimentoMensal: 0,
  limiteAnual: 81000
});

export const LIMITS = Object.freeze({
  maxFaturamento: 100000000,
  minMesesRestantes: 1,
  maxMesesRestantes: 12,
  minCrescimentoMensal: -100,
  maxCrescimentoMensal: 500,
  minLimiteAnual: 1,
  maxLimiteAnual: 100000000,
  faixaAlertaPercentual: 80
});

export const STATUS_LIMITE = Object.freeze({
  ABAIXO: 'abaixo',
  PROXIMO: 'proximo',
  ACIMA: 'acima'
});

const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});

const percentFormatter = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});

const integerFormatter = new Intl.NumberFormat('pt-BR', {
  maximumFractionDigits: 0
});

function roundCurrency(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function roundDecimal(value, decimals = 6) {
  const factor = 10 ** decimals;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

function isBlank(value) {
  return value === undefined || value === null || String(value).trim() === '';
}

/**
 * Converte números aceitando vírgula ou ponto decimal e símbolos R$/%.
 *
 * @param {unknown} value
 * @returns {number|null} null quando vazio; NaN quando inválido
 */
export function parseFlexibleNumber(value) {
  if (isBlank(value)) return null;
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : Number.NaN;
  }

  let normalized = String(value)
    .trim()
    .replace(/\s+/g, '')
    .replace(/^R\$/i, '')
    .replace(/%$/i, '');

  if (!normalized) return null;

  if (normalized.includes(',') && normalized.includes('.')) {
    const lastComma = normalized.lastIndexOf(',');
    const lastDot = normalized.lastIndexOf('.');
    if (lastComma > lastDot) {
      normalized = normalized.replace(/\./g, '').replace(',', '.');
    } else {
      normalized = normalized.replace(/,/g, '');
    }
  } else if (normalized.includes(',')) {
    normalized = normalized.replace(',', '.');
  }

  if (!/^[+-]?(?:\d+\.?\d*|\.\d+)$/.test(normalized)) {
    return Number.NaN;
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

export function formatCurrency(value) {
  return currencyFormatter.format(value);
}

export function formatPercent(value) {
  return `${percentFormatter.format(value)}%`;
}

/**
 * Normaliza as entradas da Calculadora de Projeção de Faturamento MEI.
 *
 * @param {Record<string, unknown>} rawInput
 */
export function normalizeInput(rawInput = {}) {
  const rawAcumulado = rawInput.faturamentoAcumulado ?? rawInput.acumuladoAno;
  const rawReferencia =
    rawInput.faturamentoMensalReferencia ??
    rawInput.faturamentoMensal ??
    rawInput.mensalReferencia;
  const rawMeses = rawInput.mesesRestantes ?? rawInput.meses;
  const rawCrescimento = rawInput.crescimentoMensal ?? rawInput.crescimento;
  const rawLimite = rawInput.limiteAnual ?? rawInput.limite;

  const parsedAcumulado = parseFlexibleNumber(rawAcumulado);
  const parsedReferencia = parseFlexibleNumber(rawReferencia);
  const parsedMeses = parseFlexibleNumber(rawMeses);
  const parsedCrescimento = parseFlexibleNumber(rawCrescimento);
  const parsedLimite = parseFlexibleNumber(rawLimite);

  return {
    acumuladoInformado: !isBlank(rawAcumulado),
    referenciaInformada: !isBlank(rawReferencia),
    mesesInformado: !isBlank(rawMeses),
    crescimentoInformado: !isBlank(rawCrescimento),
    limiteInformado: !isBlank(rawLimite),
    faturamentoAcumulado:
      parsedAcumulado === null ? DEFAULTS.faturamentoAcumulado : parsedAcumulado,
    faturamentoMensalReferencia: parsedReferencia,
    mesesRestantes: parsedMeses,
    crescimentoMensal:
      parsedCrescimento === null ? DEFAULTS.crescimentoMensal : parsedCrescimento,
    limiteAnual: parsedLimite === null ? DEFAULTS.limiteAnual : parsedLimite
  };
}

/**
 * Valida os parâmetros normalizados da Projeção de Faturamento MEI.
 *
 * @param {ReturnType<typeof normalizeInput>} input
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateInput(input) {
  const errors = [];

  if (!input || typeof input !== 'object') {
    return {
      valid: false,
      errors: ['Informe os dados de faturamento bruto para projetar o período.']
    };
  }

  if (input.faturamentoAcumulado === null || Number.isNaN(input.faturamentoAcumulado)) {
    errors.push('Informe um valor válido para o faturamento bruto já acumulado no ano.');
  } else if (input.faturamentoAcumulado < 0) {
    errors.push('O faturamento bruto acumulado no ano não pode ser negativo.');
  } else if (input.faturamentoAcumulado > LIMITS.maxFaturamento) {
    errors.push('O faturamento acumulado informado excede o limite máximo permitido.');
  }

  if (
    !input.referenciaInformada ||
    input.faturamentoMensalReferencia === null ||
    Number.isNaN(input.faturamentoMensalReferencia)
  ) {
    errors.push('Informe o faturamento mensal de referência em reais.');
  } else if (input.faturamentoMensalReferencia < 0) {
    errors.push('O faturamento mensal de referência não pode ser negativo.');
  } else if (input.faturamentoMensalReferencia > LIMITS.maxFaturamento) {
    errors.push('O faturamento mensal de referência excede o limite máximo permitido.');
  }

  if (
    !input.mesesInformado ||
    input.mesesRestantes === null ||
    Number.isNaN(input.mesesRestantes) ||
    !Number.isInteger(input.mesesRestantes)
  ) {
    errors.push('Informe a quantidade de meses restantes como um número inteiro entre 1 e 12.');
  } else if (
    input.mesesRestantes < LIMITS.minMesesRestantes ||
    input.mesesRestantes > LIMITS.maxMesesRestantes
  ) {
    errors.push(
      `A quantidade de meses restantes deve estar entre ${LIMITS.minMesesRestantes} e ${LIMITS.maxMesesRestantes}.`
    );
  }

  if (input.crescimentoMensal === null || Number.isNaN(input.crescimentoMensal)) {
    errors.push('Informe um percentual válido para o crescimento mensal esperado.');
  } else if (
    input.crescimentoMensal < LIMITS.minCrescimentoMensal ||
    input.crescimentoMensal > LIMITS.maxCrescimentoMensal
  ) {
    errors.push(
      `O crescimento mensal esperado deve estar entre ${LIMITS.minCrescimentoMensal}% e ${LIMITS.maxCrescimentoMensal}%.`
    );
  }

  if (input.limiteAnual === null || Number.isNaN(input.limiteAnual)) {
    errors.push('Informe um limite anual de faturamento válido em reais.');
  } else if (input.limiteAnual <= 0) {
    errors.push('O limite anual de faturamento deve ser maior que zero.');
  } else if (input.limiteAnual > LIMITS.maxLimiteAnual) {
    errors.push('O limite anual informado excede o valor máximo permitido.');
  }

  if (
    errors.length === 0 &&
    input.faturamentoAcumulado === 0 &&
    input.faturamentoMensalReferencia === 0
  ) {
    errors.push(
      'Informe um faturamento acumulado ou um faturamento mensal de referência maior que zero para projetar.'
    );
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Executa o cálculo composto da Projeção de Faturamento MEI.
 *
 * Para cada mês futuro (m = 1 ... mesesRestantes):
 *   faturamentoProjetado = faturamentoDoMesAnterior × (1 + crescimentoMensal ÷ 100)
 * Onde o mês anterior ao 1º mês futuro é o faturamento mensal de referência.
 * Quando o crescimento é zero, cada mês futuro permanece igual ao faturamento mensal de referência.
 *
 * @param {Record<string, unknown>} rawInput
 */
export function calculate(rawInput = {}) {
  const normalized =
    rawInput &&
    typeof rawInput === 'object' &&
    'referenciaInformada' in rawInput &&
    'mesesInformado' in rawInput
      ? rawInput
      : normalizeInput(rawInput);

  const validation = validateInput(normalized);
  if (!validation.valid) {
    return {
      ok: false,
      errors: validation.errors
    };
  }

  const faturamentoAcumulado = roundCurrency(normalized.faturamentoAcumulado);
  const faturamentoMensalReferencia = roundCurrency(normalized.faturamentoMensalReferencia);
  const mesesRestantes = normalized.mesesRestantes;
  const crescimentoMensal = roundDecimal(normalized.crescimentoMensal, 4);
  const limiteAnual = roundCurrency(normalized.limiteAnual);

  const fatorCrescimento = 1 + crescimentoMensal / 100;
  const projecaoMensal = [];

  let faturamentoMesAnterior = faturamentoMensalReferencia;
  let totalProjetadoMesesRestantes = 0;

  for (let mes = 1; mes <= mesesRestantes; mes++) {
    const faturamentoProjetado =
      crescimentoMensal === 0
        ? faturamentoMensalReferencia
        : roundCurrency(faturamentoMesAnterior * fatorCrescimento);

    totalProjetadoMesesRestantes = roundCurrency(
      totalProjetadoMesesRestantes + faturamentoProjetado
    );

    const acumuladoAteMes = roundCurrency(faturamentoAcumulado + totalProjetadoMesesRestantes);
    const percentualLimiteAteMes = roundDecimal((acumuladoAteMes / limiteAnual) * 100, 2);

    projecaoMensal.push({
      mes,
      rotuloMes: `${mes}º mês futuro`,
      faturamentoProjetado,
      acumuladoAteMes,
      percentualLimiteAteMes,
      ultrapassouLimiteNoMes: acumuladoAteMes > limiteAnual
    });

    faturamentoMesAnterior = faturamentoProjetado;
  }

  const faturamentoAnualProjetado = roundCurrency(
    faturamentoAcumulado + totalProjetadoMesesRestantes
  );
  const percentualLimiteUtilizado = roundDecimal(
    (faturamentoAnualProjetado / limiteAnual) * 100,
    2
  );

  const valorRestanteLimite =
    faturamentoAnualProjetado < limiteAnual
      ? roundCurrency(limiteAnual - faturamentoAnualProjetado)
      : 0;

  const valorExcedenteLimite =
    faturamentoAnualProjetado > limiteAnual
      ? roundCurrency(faturamentoAnualProjetado - limiteAnual)
      : 0;

  const mediaMensalProjetada = roundCurrency(totalProjetadoMesesRestantes / mesesRestantes);

  const saldoLimiteAntesProjecao = roundCurrency(limiteAnual - faturamentoAcumulado);
  const faturamentoMensalCompativelLimite =
    saldoLimiteAntesProjecao > 0
      ? roundCurrency(saldoLimiteAntesProjecao / mesesRestantes)
      : 0;

  let situacaoLimite = STATUS_LIMITE.ABAIXO;
  let situacaoRotulo = 'Abaixo do limite';
  let avisoLimite =
    'A projeção anual permanece abaixo de 80% do limite informado, mantendo margem de segurança no período projetado.';

  if (faturamentoAnualProjetado > limiteAnual) {
    situacaoLimite = STATUS_LIMITE.ACIMA;
    situacaoRotulo = 'Acima do limite';
    avisoLimite = `Atenção: o faturamento anual projetado ultrapassa o limite informado em ${formatCurrency(valorExcedenteLimite)} (${formatPercent(percentualLimiteUtilizado)} do limite). Recomenda-se consultar um contador para avaliar regras de desenquadramento e tributação aplicáveis.`;
  } else if (percentualLimiteUtilizado >= LIMITS.faixaAlertaPercentual) {
    situacaoLimite = STATUS_LIMITE.PROXIMO;
    situacaoRotulo = 'Próxima do limite';
    avisoLimite = `Alerta de proximidade: a projeção atinge ${formatPercent(percentualLimiteUtilizado)} do limite anual informado, restando apenas ${formatCurrency(valorRestanteLimite)} de margem no ano.`;
  }

  return {
    ok: true,
    errors: [],
    value: faturamentoAnualProjetado,
    unit: 'BRL',
    data: {
      faturamentoAcumulado,
      faturamentoMensalReferencia,
      mesesRestantes,
      crescimentoMensal,
      limiteAnual,
      projecaoMensal,
      totalProjetadoMesesRestantes,
      faturamentoAnualProjetado,
      percentualLimiteUtilizado,
      valorRestanteLimite,
      valorExcedenteLimite,
      mediaMensalProjetada,
      saldoLimiteAntesProjecao,
      faturamentoMensalCompativelLimite,
      situacaoLimite,
      situacaoRotulo,
      avisoLimite
    }
  };
}

export const calculateMeiProjection = calculate;

/**
 * Monta as seções estruturadas de resultado para cópia e compartilhamento.
 *
 * @param {ReturnType<typeof calculate>} calculation
 */
export function getResultSections(calculation) {
  if (!calculation || !calculation.ok || !calculation.data) {
    return [];
  }

  const d = calculation.data;
  const mensalCompativelTexto =
    d.saldoLimiteAntesProjecao > 0
      ? `${formatCurrency(d.faturamentoMensalCompativelLimite)}/mês`
      : 'Limite já atingido ou ultrapassado no acumulado realizado (R$ 0,00/mês)';

  return [
    {
      label: 'Faturamento bruto acumulado informado (meses já realizados)',
      value: formatCurrency(d.faturamentoAcumulado)
    },
    { label: 'Faturamento mensal de referência', value: formatCurrency(d.faturamentoMensalReferencia) },
    { label: 'Meses futuros projetados', value: integerFormatter.format(d.mesesRestantes) },
    { label: 'Crescimento mensal composto aplicado', value: formatPercent(d.crescimentoMensal) },
    { label: 'Total projetado para os meses restantes', value: formatCurrency(d.totalProjetadoMesesRestantes) },
    { label: 'Faturamento bruto anual projetado', value: formatCurrency(d.faturamentoAnualProjetado) },
    { label: 'Limite anual considerado na comparação', value: formatCurrency(d.limiteAnual) },
    { label: 'Percentual do limite anual utilizado', value: formatPercent(d.percentualLimiteUtilizado) },
    { label: 'Situação em relação ao limite', value: d.situacaoRotulo },
    { label: 'Valor restante até o limite', value: formatCurrency(d.valorRestanteLimite) },
    { label: 'Valor que ultrapassa o limite', value: formatCurrency(d.valorExcedenteLimite) },
    { label: 'Média mensal projetada nos meses restantes', value: formatCurrency(d.mediaMensalProjetada) },
    { label: 'Faturamento mensal médio compatível com o limite restante', value: mensalCompativelTexto },
    'Projeção mês a mês:',
    ...d.projecaoMensal.map((item) => ({
      label: `- ${item.rotuloMes}`,
      value: `${formatCurrency(item.faturamentoProjetado)} (Acumulado no ano: ${formatCurrency(item.acumuladoAteMes)} | ${formatPercent(item.percentualLimiteAteMes)} do limite)`
    }))
  ];
}

/**
 * Formata o resultado da projeção MEI para exibição e cópia.
 *
 * @param {ReturnType<typeof calculate>} calculation
 */
export function formatResult(calculation) {
  if (!calculation || !calculation.ok || !calculation.data) {
    return {
      text: '',
      summary: ''
    };
  }

  const d = calculation.data;
  const sections = getResultSections(calculation);
  const lines = [
    'Calculadora de Projeção de Faturamento MEI — Calculadora Master',
    ...sections.map((s) => (typeof s === 'string' ? s : `${s.label}: ${s.value}`))
  ];

  return {
    text: formatCurrency(d.faturamentoAnualProjetado),
    summary: lines.join('\n'),
    faturamentoAcumulado: formatCurrency(d.faturamentoAcumulado),
    totalProjetadoMesesRestantes: formatCurrency(d.totalProjetadoMesesRestantes),
    faturamentoAnualProjetado: formatCurrency(d.faturamentoAnualProjetado),
    limiteAnual: formatCurrency(d.limiteAnual),
    percentualLimiteUtilizado: formatPercent(d.percentualLimiteUtilizado),
    valorRestanteLimite: formatCurrency(d.valorRestanteLimite),
    valorExcedenteLimite: formatCurrency(d.valorExcedenteLimite),
    mediaMensalProjetada: formatCurrency(d.mediaMensalProjetada),
    faturamentoMensalCompativelLimite:
      d.saldoLimiteAntesProjecao > 0
        ? `${formatCurrency(d.faturamentoMensalCompativelLimite)}/mês`
        : 'R$ 0,00/mês (limite já atingido no acumulado)',
    situacaoRotulo: d.situacaoRotulo,
    avisoLimite: d.avisoLimite
  };
}

export function buildCopyText(calculation) {
  return formatResult(calculation).summary;
}

/**
 * Conecta o módulo ao DOM da página Projeção de Faturamento MEI.
 */
export function setupTool(root = document) {
  const form = root.querySelector('#formProjecaoMei');
  if (!form) return null;

  const inputAcumulado = root.querySelector('#faturamentoAcumuladoMei');
  const inputReferencia = root.querySelector('#faturamentoMensalReferenciaMei');
  const inputMeses = root.querySelector('#mesesRestantesMei');
  const inputCrescimento = root.querySelector('#crescimentoMensalMei');
  const inputLimite = root.querySelector('#limiteAnualMei');
  const btnLimpar = root.querySelector('#btnLimparProjecaoMei');

  const erroEl = root.querySelector('#erroProjecaoMei');
  const resultadoSection = root.querySelector('#resultadoProjecaoMei');
  const statusEl = root.querySelector('#statusProjecaoMei');

  const resSituacao = root.querySelector('#resSituacaoLimiteMei');
  const resAviso = root.querySelector('#resAvisoLimiteMei');
  const resAcumulado = root.querySelector('#resFaturamentoAcumuladoMei');
  const resTotalRestante = root.querySelector('#resTotalProjetadoRestanteMei');
  const resAnualProjetado = root.querySelector('#resFaturamentoAnualProjetadoMei');
  const resLimiteConsiderado = root.querySelector('#resLimiteAnualMei');
  const resPercentualUtilizado = root.querySelector('#resPercentualLimiteMei');
  const resValorRestante = root.querySelector('#resValorRestanteLimiteMei');
  const resValorExcedente = root.querySelector('#resValorExcedenteLimiteMei');
  const resMediaMensal = root.querySelector('#resMediaMensalProjetadaMei');
  const resMensalCompativel = root.querySelector('#resMensalCompativelLimiteMei');
  const tabelaBody = root.querySelector('#tabelaProjecaoMeiBody');

  const btnCopiar = root.querySelector('#btnCopiarProjecaoMei');
  const btnCompartilhar = root.querySelector('#btnCompartilharProjecaoMei');
  const btnImprimir = root.querySelector('#btnImprimirProjecaoMei');

  let ultimoResultado = null;

  const actions = createResultActions({
    title: 'Calculadora de Projeção de Faturamento MEI — Calculadora Master',
    statusElement: statusEl,
    getSections: () => (ultimoResultado ? getResultSections(ultimoResultado) : [])
  });

  function setActionButtonsVisibility(visible) {
    [btnCopiar, btnCompartilhar, btnImprimir].forEach((btn) => {
      if (btn) btn.hidden = !visible;
    });
  }

  function clearError() {
    if (erroEl) {
      erroEl.textContent = '';
      erroEl.hidden = true;
    }
  }

  function showError(message) {
    ultimoResultado = null;
    if (erroEl) {
      erroEl.textContent = message;
      erroEl.hidden = false;
    }
    if (resultadoSection) {
      resultadoSection.hidden = true;
    }
    setActionButtonsVisibility(false);
    if (statusEl) {
      statusEl.textContent = '';
    }
  }

  function renderTableRows(projecaoMensal) {
    if (!tabelaBody) return;
    if (typeof tabelaBody.replaceChildren === 'function' && typeof document !== 'undefined') {
      const fragment = document.createDocumentFragment();
      for (const item of projecaoMensal) {
        const tr = document.createElement('tr');
        if (item.ultrapassouLimiteNoMes) {
          tr.className = 'mei-row-over-limit';
        }

        const tdMes = document.createElement('td');
        tdMes.textContent = item.rotuloMes;

        const tdProjetado = document.createElement('td');
        tdProjetado.textContent = formatCurrency(item.faturamentoProjetado);

        const tdAcumulado = document.createElement('td');
        tdAcumulado.textContent = formatCurrency(item.acumuladoAteMes);

        const tdPercentual = document.createElement('td');
        tdPercentual.textContent = formatPercent(item.percentualLimiteAteMes);

        tr.appendChild(tdMes);
        tr.appendChild(tdProjetado);
        tr.appendChild(tdAcumulado);
        tr.appendChild(tdPercentual);
        fragment.appendChild(tr);
      }
      tabelaBody.replaceChildren(fragment);
    } else {
      tabelaBody.rowsData = projecaoMensal;
    }
  }

  function renderResult(calculation) {
    ultimoResultado = calculation;
    const formatted = formatResult(calculation);
    const d = calculation.data;

    if (resSituacao) {
      resSituacao.textContent = formatted.situacaoRotulo;
      resSituacao.className =
        d.situacaoLimite === STATUS_LIMITE.ACIMA
          ? 'budget-status-negative'
          : d.situacaoLimite === STATUS_LIMITE.PROXIMO
            ? 'budget-status-balanced'
            : 'budget-status-positive';
    }
    if (resAviso) {
      resAviso.textContent = formatted.avisoLimite;
    }
    if (resAcumulado) resAcumulado.textContent = formatted.faturamentoAcumulado;
    if (resTotalRestante) resTotalRestante.textContent = formatted.totalProjetadoMesesRestantes;
    if (resAnualProjetado) resAnualProjetado.textContent = formatted.faturamentoAnualProjetado;
    if (resLimiteConsiderado) resLimiteConsiderado.textContent = formatted.limiteAnual;
    if (resPercentualUtilizado) resPercentualUtilizado.textContent = formatted.percentualLimiteUtilizado;
    if (resValorRestante) resValorRestante.textContent = formatted.valorRestanteLimite;
    if (resValorExcedente) resValorExcedente.textContent = formatted.valorExcedenteLimite;
    if (resMediaMensal) resMediaMensal.textContent = formatted.mediaMensalProjetada;
    if (resMensalCompativel) resMensalCompativel.textContent = formatted.faturamentoMensalCompativelLimite;

    renderTableRows(d.projecaoMensal);

    if (resultadoSection) {
      resultadoSection.hidden = false;
    }
    setActionButtonsVisibility(true);
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    clearError();
    if (statusEl) {
      statusEl.textContent = '';
    }

    const rawInput = {
      faturamentoAcumulado: inputAcumulado ? inputAcumulado.value : '',
      faturamentoMensalReferencia: inputReferencia ? inputReferencia.value : '',
      mesesRestantes: inputMeses ? inputMeses.value : '',
      crescimentoMensal: inputCrescimento ? inputCrescimento.value : '',
      limiteAnual: inputLimite ? inputLimite.value : ''
    };

    const calculation = calculate(rawInput);
    if (!calculation.ok) {
      showError(calculation.errors[0]);
      return;
    }

    renderResult(calculation);
  });

  if (btnLimpar) {
    btnLimpar.addEventListener('click', () => {
      form.reset();
      if (inputAcumulado) inputAcumulado.value = '0';
      if (inputMeses) inputMeses.value = String(DEFAULTS.mesesRestantes);
      if (inputCrescimento) inputCrescimento.value = String(DEFAULTS.crescimentoMensal);
      if (inputLimite) inputLimite.value = '81000,00';
      if (tabelaBody && typeof tabelaBody.replaceChildren === 'function') {
        tabelaBody.replaceChildren();
      }
      clearError();
      ultimoResultado = null;
      if (resultadoSection) resultadoSection.hidden = true;
      setActionButtonsVisibility(false);
      if (statusEl) statusEl.textContent = '';
    });
  }

  if (btnCopiar) {
    btnCopiar.addEventListener('click', async () => {
      if (!ultimoResultado) return;
      await actions.copy();
    });
  }

  if (btnCompartilhar) {
    btnCompartilhar.addEventListener('click', async () => {
      if (!ultimoResultado) return;
      const shareUrl =
        typeof window !== 'undefined' && window.location?.origin
          ? `${window.location.origin}/tools/financas/projecao-faturamento-mei.html`
          : 'https://www.calculadoramaster.com/tools/financas/projecao-faturamento-mei.html';
      await actions.share(shareUrl);
    });
  }

  if (btnImprimir) {
    btnImprimir.addEventListener('click', () => {
      if (!ultimoResultado) return;
      actions.print();
    });
  }

  return { form, actions };
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setupTool(document));
  } else {
    setupTool(document);
  }
}
