/**
 * Calculadora de Tinta - Calculadora Master
 *
 * Estima a quantidade de tinta necessária para pintar paredes e teto,
 * descontando aberturas na área das paredes, considerando número de demãos,
 * rendimento por litro por demão, margem de segurança e tamanho opcional
 * da embalagem.
 */

import { createResultActions } from '../core/result-actions.js';

export const DEFAULTS = Object.freeze({
  areaTeto: 0,
  areaAberturas: 0,
  demaos: 2,
  margem: 10
});

export const LIMITS = Object.freeze({
  maxArea: 100000,
  minDemaos: 1,
  maxDemaos: 20,
  minRendimento: 0.1,
  maxRendimento: 500,
  minMargem: 0,
  maxMargem: 100,
  minEmbalagem: 0.1,
  maxEmbalagem: 500
});

const numberFormatter = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2
});

const fixedTwoFormatter = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});

const integerFormatter = new Intl.NumberFormat('pt-BR', {
  maximumFractionDigits: 0
});

function roundDecimal(value, decimals = 6) {
  const factor = 10 ** decimals;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

function isBlank(value) {
  return value === undefined || value === null || String(value).trim() === '';
}

/**
 * Converte valores numéricos aceitando ponto ou vírgula como separador decimal.
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
    .replace(/^(?:R\$|m²|m2|L|l|%)/i, '')
    .replace(/(?:m²|m2|L|l|%)$/i, '');

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

/**
 * Normaliza os dados brutos de entrada da Calculadora de Tinta.
 *
 * @param {Record<string, unknown>} rawInput
 */
export function normalizeInput(rawInput = {}) {
  const rawParedes = rawInput.areaParedes;
  const rawTeto = rawInput.areaTeto;
  const rawAberturas = rawInput.areaAberturas;
  const rawDemaos = rawInput.demaos;
  const rawRendimento = rawInput.rendimento;
  const rawMargem = rawInput.margem;
  const rawEmbalagem = rawInput.tamanhoEmbalagem;

  const parsedParedes = parseFlexibleNumber(rawParedes);
  const parsedTeto = parseFlexibleNumber(rawTeto);
  const parsedAberturas = parseFlexibleNumber(rawAberturas);
  const parsedDemaos = parseFlexibleNumber(rawDemaos);
  const parsedRendimento = parseFlexibleNumber(rawRendimento);
  const parsedMargem = parseFlexibleNumber(rawMargem);
  const parsedEmbalagem = parseFlexibleNumber(rawEmbalagem);

  const paredesInformada = !isBlank(rawParedes);
  const tetoInformado = !isBlank(rawTeto);

  return {
    paredesInformada,
    tetoInformado,
    aberturasInformada: !isBlank(rawAberturas),
    demaosInformado: !isBlank(rawDemaos),
    rendimentoInformado: !isBlank(rawRendimento),
    margemInformada: !isBlank(rawMargem),
    embalagemInformada: !isBlank(rawEmbalagem),
    areaParedes: parsedParedes === null && tetoInformado ? 0 : parsedParedes,
    areaTeto: parsedTeto === null ? DEFAULTS.areaTeto : parsedTeto,
    areaAberturas: parsedAberturas === null ? DEFAULTS.areaAberturas : parsedAberturas,
    demaos: parsedDemaos === null ? DEFAULTS.demaos : parsedDemaos,
    rendimento: parsedRendimento,
    margem: parsedMargem === null ? DEFAULTS.margem : parsedMargem,
    tamanhoEmbalagem: parsedEmbalagem
  };
}

/**
 * Valida os parâmetros normalizados da Calculadora de Tinta.
 *
 * @param {ReturnType<typeof normalizeInput>} input
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateInput(input) {
  const errors = [];

  if (!input || typeof input !== 'object') {
    return {
      valid: false,
      errors: ['Informe os dados da superfície e da tinta para calcular.']
    };
  }

  if (!input.paredesInformada && !input.tetoInformado) {
    errors.push('Informe a área das paredes ou a área do teto em m².');
  }

  if (input.areaParedes === null || Number.isNaN(input.areaParedes)) {
    errors.push('Informe uma área das paredes válida em m².');
  } else if (input.areaParedes < 0) {
    errors.push('A área das paredes não pode ser negativa.');
  } else if (input.areaParedes > LIMITS.maxArea) {
    errors.push(`A área das paredes deve ser de no máximo ${integerFormatter.format(LIMITS.maxArea)} m².`);
  }

  if (input.areaTeto === null || Number.isNaN(input.areaTeto)) {
    errors.push('Informe uma área do teto válida em m².');
  } else if (input.areaTeto < 0) {
    errors.push('A área do teto não pode ser negativa.');
  } else if (input.areaTeto > LIMITS.maxArea) {
    errors.push(`A área do teto deve ser de no máximo ${integerFormatter.format(LIMITS.maxArea)} m².`);
  }

  if (input.areaAberturas === null || Number.isNaN(input.areaAberturas)) {
    errors.push('Informe uma área de aberturas (portas e janelas) válida em m².');
  } else if (input.areaAberturas < 0) {
    errors.push('A área das aberturas não pode ser negativa.');
  } else if (input.areaAberturas > LIMITS.maxArea) {
    errors.push(`A área das aberturas deve ser de no máximo ${integerFormatter.format(LIMITS.maxArea)} m².`);
  }

  if (
    errors.length === 0 &&
    Number.isFinite(input.areaParedes) &&
    Number.isFinite(input.areaTeto) &&
    Number.isFinite(input.areaAberturas)
  ) {
    const areaBruta = roundDecimal(input.areaParedes + input.areaTeto);
    if (areaBruta <= 0) {
      errors.push('A área bruta total (paredes + teto) deve ser maior que zero.');
    } else if (input.areaAberturas > input.areaParedes) {
      errors.push('A área das aberturas não pode exceder a área das paredes.');
    } else {
      const areaLiquida = roundDecimal(areaBruta - input.areaAberturas);
      if (areaLiquida <= 0) {
        errors.push('A área líquida a pintar deve ser maior que zero após descontar as aberturas.');
      }
    }
  }

  if (input.demaos === null || Number.isNaN(input.demaos) || !Number.isInteger(input.demaos)) {
    errors.push('O número de demãos deve ser um número inteiro.');
  } else if (input.demaos < LIMITS.minDemaos || input.demaos > LIMITS.maxDemaos) {
    errors.push(`O número de demãos deve estar entre ${LIMITS.minDemaos} e ${LIMITS.maxDemaos}.`);
  }

  if (!input.rendimentoInformado || input.rendimento === null || Number.isNaN(input.rendimento)) {
    errors.push('Informe o rendimento da tinta em m² por litro por demão.');
  } else if (input.rendimento <= 0) {
    errors.push('O rendimento da tinta deve ser maior que zero.');
  } else if (input.rendimento < LIMITS.minRendimento || input.rendimento > LIMITS.maxRendimento) {
    errors.push(
      `O rendimento da tinta deve estar entre ${numberFormatter.format(LIMITS.minRendimento)} e ${integerFormatter.format(LIMITS.maxRendimento)} m²/L.`
    );
  }

  if (input.margem === null || Number.isNaN(input.margem)) {
    errors.push('Informe um percentual de margem para perdas válido.');
  } else if (input.margem < LIMITS.minMargem || input.margem > LIMITS.maxMargem) {
    errors.push(`A margem para perdas deve estar entre ${LIMITS.minMargem}% e ${LIMITS.maxMargem}%.`);
  }

  if (input.embalagemInformada) {
    if (input.tamanhoEmbalagem === null || Number.isNaN(input.tamanhoEmbalagem)) {
      errors.push('Informe um tamanho de embalagem válido em litros.');
    } else if (input.tamanhoEmbalagem <= 0) {
      errors.push('O tamanho da embalagem deve ser maior que zero.');
    } else if (
      input.tamanhoEmbalagem < LIMITS.minEmbalagem ||
      input.tamanhoEmbalagem > LIMITS.maxEmbalagem
    ) {
      errors.push(
        `O tamanho da embalagem deve estar entre ${numberFormatter.format(LIMITS.minEmbalagem)} L e ${integerFormatter.format(LIMITS.maxEmbalagem)} L.`
      );
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Executa o cálculo puro de estimativa de tinta.
 *
 * @param {Record<string, unknown>} rawInput
 */
export function calculate(rawInput = {}) {
  const normalized =
    rawInput &&
    typeof rawInput === 'object' &&
    'paredesInformada' in rawInput &&
    'rendimentoInformado' in rawInput
      ? rawInput
      : normalizeInput(rawInput);

  const validation = validateInput(normalized);
  if (!validation.valid) {
    return {
      ok: false,
      errors: validation.errors
    };
  }

  const areaParedes = roundDecimal(normalized.areaParedes);
  const areaTeto = roundDecimal(normalized.areaTeto);
  const areaAberturas = roundDecimal(normalized.areaAberturas);
  const areaParedesLiquida = roundDecimal(areaParedes - areaAberturas);
  const areaBruta = roundDecimal(areaParedes + areaTeto);
  const areaLiquida = roundDecimal(areaBruta - areaAberturas);
  const demaos = normalized.demaos;
  const rendimento = roundDecimal(normalized.rendimento);
  const margemPercentual = roundDecimal(normalized.margem);

  const areaTotalDemaos = roundDecimal(areaLiquida * demaos);
  const litrosSemMargem = roundDecimal(areaTotalDemaos / rendimento);
  const fatorMargem = roundDecimal(1 + margemPercentual / 100, 8);
  const litrosNecessarios = roundDecimal(litrosSemMargem * fatorMargem);
  const litrosMargem = roundDecimal(litrosNecessarios - litrosSemMargem);

  const possuiEmbalagem =
    normalized.embalagemInformada &&
    normalized.tamanhoEmbalagem !== null &&
    normalized.tamanhoEmbalagem > 0;

  let tamanhoEmbalagem = null;
  let quantidadeEmbalagens = null;
  let volumeTotalComprado = null;
  let sobraEstimada = null;

  if (possuiEmbalagem) {
    tamanhoEmbalagem = roundDecimal(normalized.tamanhoEmbalagem);
    const quocienteExato = Number((litrosNecessarios / tamanhoEmbalagem).toFixed(9));
    quantidadeEmbalagens = Math.max(1, Math.ceil(quocienteExato));
    volumeTotalComprado = roundDecimal(quantidadeEmbalagens * tamanhoEmbalagem);
    sobraEstimada = Math.max(0, roundDecimal(volumeTotalComprado - litrosNecessarios));
  }

  return {
    ok: true,
    errors: [],
    value: litrosNecessarios,
    unit: 'L',
    data: {
      areaParedes,
      areaTeto,
      areaAberturas,
      areaParedesLiquida,
      areaBruta,
      areaLiquida,
      demaos,
      rendimento,
      margemPercentual,
      areaTotalDemaos,
      litrosSemMargem,
      litrosMargem,
      litrosNecessarios,
      possuiEmbalagem,
      tamanhoEmbalagem,
      quantidadeEmbalagens,
      volumeTotalComprado,
      sobraEstimada
    }
  };
}

export const calculatePaint = calculate;

export function formatArea(value) {
  return `${numberFormatter.format(value)} m²`;
}

export function formatLiters(value) {
  return `${fixedTwoFormatter.format(value)} L`;
}

export function formatPercent(value) {
  return `${numberFormatter.format(value)}%`;
}

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
  const sections = [
    { label: 'Área das paredes', value: formatArea(d.areaParedes) },
    { label: 'Área do teto', value: formatArea(d.areaTeto) },
    { label: 'Área bruta total', value: formatArea(d.areaBruta) },
    { label: 'Área de aberturas descontada', value: formatArea(d.areaAberturas) },
    { label: 'Área líquida para pintura', value: formatArea(d.areaLiquida) },
    { label: 'Número de demãos', value: integerFormatter.format(d.demaos) },
    { label: 'Área equivalente considerando as demãos', value: formatArea(d.areaTotalDemaos) },
    { label: 'Rendimento informado', value: `${numberFormatter.format(d.rendimento)} m²/L por demão` },
    { label: 'Consumo estimado sem margem', value: formatLiters(d.litrosSemMargem) },
    { label: `Margem de segurança (${formatPercent(d.margemPercentual)})`, value: `+${formatLiters(d.litrosMargem)}` },
    { label: 'Litros totais necessários', value: formatLiters(d.litrosNecessarios) }
  ];

  if (d.possuiEmbalagem) {
    const labelEmbalagem = d.quantidadeEmbalagens === 1 ? 'embalagem' : 'embalagens';
    sections.push(
      {
        label: `Embalagens necessárias (${numberFormatter.format(d.tamanhoEmbalagem)} L)`,
        value: `${integerFormatter.format(d.quantidadeEmbalagens)} ${labelEmbalagem}`
      },
      { label: 'Volume total comprado', value: formatLiters(d.volumeTotalComprado) },
      { label: 'Sobra estimada', value: formatLiters(d.sobraEstimada) }
    );
  }

  sections.push({
    label: 'Observação',
    value: 'O rendimento real varia conforme o fabricante, a superfície, a ferramenta utilizada e as condições de aplicação.'
  });

  return sections;
}

/**
 * Formata o resultado calculado para exibição e cópia.
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
    'Calculadora de Tinta — Calculadora Master',
    ...sections.map((s) => `${s.label}: ${s.value}`)
  ];

  return {
    text: formatLiters(d.litrosNecessarios),
    summary: lines.join('\n'),
    areaBruta: formatArea(d.areaBruta),
    areaLiquida: formatArea(d.areaLiquida),
    areaTotalDemaos: formatArea(d.areaTotalDemaos),
    litrosSemMargem: formatLiters(d.litrosSemMargem),
    margemAplicada: `${formatPercent(d.margemPercentual)} (+${formatLiters(d.litrosMargem)})`,
    litrosNecessarios: formatLiters(d.litrosNecessarios),
    quantidadeEmbalagens: d.possuiEmbalagem
      ? `${integerFormatter.format(d.quantidadeEmbalagens)} ${d.quantidadeEmbalagens === 1 ? 'embalagem' : 'embalagens'} de ${numberFormatter.format(d.tamanhoEmbalagem)} L`
      : 'Não informado',
    volumeTotalComprado: d.possuiEmbalagem ? formatLiters(d.volumeTotalComprado) : '—',
    sobraEstimada: d.possuiEmbalagem ? formatLiters(d.sobraEstimada) : '—'
  };
}

export function buildCopyText(calculation) {
  return formatResult(calculation).summary;
}

/**
 * Conecta o módulo puro ao DOM da página da ferramenta.
 */
export function setupTool(root = document) {
  const form = root.querySelector('#formTinta');
  if (!form) return null;

  const inputParedes = root.querySelector('#areaParedes');
  const inputTeto = root.querySelector('#areaTeto');
  const inputAberturas = root.querySelector('#areaAberturas');
  const inputDemaos = root.querySelector('#demaos');
  const inputRendimento = root.querySelector('#rendimento');
  const inputMargem = root.querySelector('#margem');
  const inputEmbalagem = root.querySelector('#tamanhoEmbalagem');
  const btnLimpar = root.querySelector('#btnLimparTinta');

  const erroEl = root.querySelector('#erroTinta');
  const resultadoSection = root.querySelector('#resultadoTinta');
  const statusEl = root.querySelector('#statusTinta');

  const resAreaBruta = root.querySelector('#resAreaBruta');
  const resAreaLiquida = root.querySelector('#resAreaLiquida');
  const resAreaTotalDemaos = root.querySelector('#resAreaTotalDemaos');
  const resLitrosSemMargem = root.querySelector('#resLitrosSemMargem');
  const resMargemAplicada = root.querySelector('#resMargemAplicada');
  const resLitrosNecessarios = root.querySelector('#resLitrosNecessarios');
  const blocoEmbalagem = root.querySelector('#blocoResultadoEmbalagem');
  const resQuantidadeEmbalagens = root.querySelector('#resQuantidadeEmbalagens');
  const resVolumeComprado = root.querySelector('#resVolumeComprado');
  const resSobraEstimada = root.querySelector('#resSobraEstimada');

  const btnCopiar = root.querySelector('#btnCopiarTinta');
  const btnCompartilhar = root.querySelector('#btnCompartilharTinta');
  const btnImprimir = root.querySelector('#btnImprimirTinta');

  let ultimoResultado = null;

  const actions = createResultActions({
    title: 'Calculadora de Tinta — Calculadora Master',
    statusElement: statusEl,
    getSections: () => (ultimoResultado ? getResultSections(ultimoResultado) : [])
  });

  function setActionButtonsVisibility(visible) {
    [btnCopiar, btnCompartilhar, btnImprimir].forEach((btn) => {
      if (btn) btn.hidden = !visible;
    });
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

  function clearError() {
    if (erroEl) {
      erroEl.textContent = '';
      erroEl.hidden = true;
    }
  }

  function renderResult(calculation) {
    ultimoResultado = calculation;
    const formatted = formatResult(calculation);

    if (resAreaBruta) resAreaBruta.textContent = formatted.areaBruta;
    if (resAreaLiquida) resAreaLiquida.textContent = formatted.areaLiquida;
    if (resAreaTotalDemaos) resAreaTotalDemaos.textContent = formatted.areaTotalDemaos;
    if (resLitrosSemMargem) resLitrosSemMargem.textContent = formatted.litrosSemMargem;
    if (resMargemAplicada) resMargemAplicada.textContent = formatted.margemAplicada;
    if (resLitrosNecessarios) resLitrosNecessarios.textContent = formatted.litrosNecessarios;

    if (blocoEmbalagem) {
      blocoEmbalagem.hidden = !calculation.data.possuiEmbalagem;
    }
    if (resQuantidadeEmbalagens) {
      resQuantidadeEmbalagens.textContent = formatted.quantidadeEmbalagens;
    }
    if (resVolumeComprado) {
      resVolumeComprado.textContent = formatted.volumeTotalComprado;
    }
    if (resSobraEstimada) {
      resSobraEstimada.textContent = formatted.sobraEstimada;
    }

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
      areaParedes: inputParedes ? inputParedes.value : '',
      areaTeto: inputTeto ? inputTeto.value : '',
      areaAberturas: inputAberturas ? inputAberturas.value : '',
      demaos: inputDemaos ? inputDemaos.value : '',
      rendimento: inputRendimento ? inputRendimento.value : '',
      margem: inputMargem ? inputMargem.value : '',
      tamanhoEmbalagem: inputEmbalagem ? inputEmbalagem.value : ''
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
      if (inputDemaos) inputDemaos.value = String(DEFAULTS.demaos);
      if (inputMargem) inputMargem.value = String(DEFAULTS.margem);
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
          ? `${window.location.origin}/tools/utilidades/tinta.html`
          : 'https://www.calculadoramaster.com/tools/utilidades/tinta.html';
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
