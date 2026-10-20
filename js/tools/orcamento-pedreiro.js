/**
 * Calculadora de Orçamento de Pedreiro - Calculadora Master
 *
 * Estima o custo de mão de obra por m² ou por diária, somando custos adicionais
 * e materiais separadamente, aplicando reserva para imprevistos sobre a base
 * antes do desconto e detalhando todos os componentes do orçamento.
 */

import { createResultActions } from '../core/result-actions.js';

export const MODES = Object.freeze({
  M2: 'm2',
  DIARIA: 'diaria'
});

export const DEFAULTS = Object.freeze({
  modoCalculo: MODES.M2,
  custoTransporte: 0,
  custoFerramentas: 0,
  custoEntulho: 0,
  outrosCustosAdicionais: 0,
  custoMateriais: 0,
  reservaPercentual: 10,
  desconto: 0
});

export const LIMITS = Object.freeze({
  maxArea: 100000,
  maxDiarias: 3650,
  maxValorUnitario: 1000000,
  maxCustoOpcional: 10000000,
  minReservaPercentual: 0,
  maxReservaPercentual: 100
});

const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});

const numberFormatter = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2
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
 * Converte números aceitando vírgula ou ponto decimal e símbolos monetários/unidades.
 *
 * @param {unknown} value
 * @returns {number|null} null quando em branco; NaN quando inválido
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
    .replace(/(?:m²|m2|%)$/i, '');

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

export function formatArea(value) {
  return `${numberFormatter.format(value)} m²`;
}

export function formatPercent(value) {
  return `${numberFormatter.format(value)}%`;
}

/**
 * Normaliza os dados de entrada da Calculadora de Orçamento de Pedreiro.
 * Campos do modo inativo são descartados para nunca interferirem no cálculo.
 *
 * @param {Record<string, unknown>} rawInput
 */
export function normalizeInput(rawInput = {}) {
  const rawModo = String(rawInput.modoCalculo ?? rawInput.tipoCalculo ?? DEFAULTS.modoCalculo)
    .trim()
    .toLowerCase();

  const modoCalculo = rawModo === MODES.M2 || rawModo === MODES.DIARIA ? rawModo : rawModo;

  const rawArea = rawInput.areaServico ?? rawInput.area;
  const rawPrecoM2 = rawInput.precoPorM2 ?? rawInput.precoM2;
  const rawDiarias = rawInput.quantidadeDiarias ?? rawInput.diarias;
  const rawPrecoDiaria = rawInput.precoDiaria ?? rawInput.valorDiaria;

  const parsedTransporte = parseFlexibleNumber(rawInput.custoTransporte);
  const parsedFerramentas = parseFlexibleNumber(rawInput.custoFerramentas);
  const parsedEntulho = parseFlexibleNumber(rawInput.custoEntulho);
  const parsedOutros = parseFlexibleNumber(rawInput.outrosCustosAdicionais);
  const parsedCustosDiretos = parseFlexibleNumber(rawInput.custosAdicionais);
  const parsedMateriais = parseFlexibleNumber(rawInput.custoMateriais ?? rawInput.materiais);
  const parsedReserva = parseFlexibleNumber(
    rawInput.reservaPercentual ?? rawInput.percentualImprevistos ?? rawInput.reserva
  );
  const parsedDesconto = parseFlexibleNumber(rawInput.desconto ?? rawInput.descontoValor);

  return {
    modoCalculo,
    areaInformada: modoCalculo === MODES.M2 ? !isBlank(rawArea) : false,
    precoM2Informado: modoCalculo === MODES.M2 ? !isBlank(rawPrecoM2) : false,
    diariasInformada: modoCalculo === MODES.DIARIA ? !isBlank(rawDiarias) : false,
    precoDiariaInformado: modoCalculo === MODES.DIARIA ? !isBlank(rawPrecoDiaria) : false,
    areaServico: modoCalculo === MODES.M2 ? parseFlexibleNumber(rawArea) : null,
    precoPorM2: modoCalculo === MODES.M2 ? parseFlexibleNumber(rawPrecoM2) : null,
    quantidadeDiarias: modoCalculo === MODES.DIARIA ? parseFlexibleNumber(rawDiarias) : null,
    precoDiaria: modoCalculo === MODES.DIARIA ? parseFlexibleNumber(rawPrecoDiaria) : null,
    custoTransporte: parsedTransporte === null ? DEFAULTS.custoTransporte : parsedTransporte,
    custoFerramentas: parsedFerramentas === null ? DEFAULTS.custoFerramentas : parsedFerramentas,
    custoEntulho: parsedEntulho === null ? DEFAULTS.custoEntulho : parsedEntulho,
    outrosCustosAdicionais: parsedOutros === null ? DEFAULTS.outrosCustosAdicionais : parsedOutros,
    custosAdicionaisDireto: parsedCustosDiretos === null ? 0 : parsedCustosDiretos,
    custoMateriais: parsedMateriais === null ? DEFAULTS.custoMateriais : parsedMateriais,
    reservaPercentual: parsedReserva === null ? DEFAULTS.reservaPercentual : parsedReserva,
    desconto: parsedDesconto === null ? DEFAULTS.desconto : parsedDesconto
  };
}

/**
 * Valida os dados normalizados do orçamento de pedreiro.
 *
 * @param {ReturnType<typeof normalizeInput>} input
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateInput(input) {
  const errors = [];

  if (!input || typeof input !== 'object') {
    return {
      valid: false,
      errors: ['Informe os dados do serviço para calcular o orçamento.']
    };
  }

  if (input.modoCalculo !== MODES.M2 && input.modoCalculo !== MODES.DIARIA) {
    errors.push('Selecione um tipo de cálculo válido: preço por m² ou por diária.');
    return { valid: false, errors };
  }

  if (input.modoCalculo === MODES.M2) {
    if (!input.areaInformada || input.areaServico === null || Number.isNaN(input.areaServico)) {
      errors.push('Informe a área do serviço em m².');
    } else if (input.areaServico <= 0) {
      errors.push('A área do serviço deve ser maior que zero.');
    } else if (input.areaServico > LIMITS.maxArea) {
      errors.push(`A área do serviço deve ser de no máximo ${numberFormatter.format(LIMITS.maxArea)} m².`);
    }

    if (!input.precoM2Informado || input.precoPorM2 === null || Number.isNaN(input.precoPorM2)) {
      errors.push('Informe o preço da mão de obra por m² em reais.');
    } else if (input.precoPorM2 <= 0) {
      errors.push('O preço da mão de obra por m² deve ser maior que zero.');
    } else if (input.precoPorM2 > LIMITS.maxValorUnitario) {
      errors.push(`O preço por m² não pode exceder ${formatCurrency(LIMITS.maxValorUnitario)}.`);
    }
  } else {
    if (
      !input.diariasInformada ||
      input.quantidadeDiarias === null ||
      Number.isNaN(input.quantidadeDiarias)
    ) {
      errors.push('Informe a quantidade estimada de diárias.');
    } else if (input.quantidadeDiarias <= 0) {
      errors.push('A quantidade de diárias deve ser maior que zero.');
    } else if (input.quantidadeDiarias > LIMITS.maxDiarias) {
      errors.push(
        `A quantidade de diárias deve ser de no máximo ${numberFormatter.format(LIMITS.maxDiarias)}.`
      );
    }

    if (
      !input.precoDiariaInformado ||
      input.precoDiaria === null ||
      Number.isNaN(input.precoDiaria)
    ) {
      errors.push('Informe o preço de cada diária em reais.');
    } else if (input.precoDiaria <= 0) {
      errors.push('O preço da diária deve ser maior que zero.');
    } else if (input.precoDiaria > LIMITS.maxValorUnitario) {
      errors.push(`O preço da diária não pode exceder ${formatCurrency(LIMITS.maxValorUnitario)}.`);
    }
  }

  const optionalFields = [
    { value: input.custoTransporte, label: 'O custo de transporte' },
    { value: input.custoFerramentas, label: 'O custo com ferramentas e equipamentos' },
    { value: input.custoEntulho, label: 'O custo de retirada de entulho' },
    { value: input.outrosCustosAdicionais, label: 'O valor de outros serviços adicionais' },
    { value: input.custosAdicionaisDireto, label: 'O total de custos adicionais' },
    { value: input.custoMateriais, label: 'O custo de materiais' }
  ];

  for (const field of optionalFields) {
    if (field.value === null || Number.isNaN(field.value)) {
      errors.push(`${field.label} informado é inválido.`);
    } else if (field.value < 0) {
      errors.push(`${field.label} não pode ser negativo.`);
    } else if (field.value > LIMITS.maxCustoOpcional) {
      errors.push(`${field.label} excede o limite máximo permitido.`);
    }
  }

  if (input.reservaPercentual === null || Number.isNaN(input.reservaPercentual)) {
    errors.push('Informe um percentual válido para a reserva de imprevistos.');
  } else if (
    input.reservaPercentual < LIMITS.minReservaPercentual ||
    input.reservaPercentual > LIMITS.maxReservaPercentual
  ) {
    errors.push(
      `O percentual de reserva para imprevistos deve estar entre ${LIMITS.minReservaPercentual}% e ${LIMITS.maxReservaPercentual}%.`
    );
  }

  if (input.desconto === null || Number.isNaN(input.desconto)) {
    errors.push('Informe um valor de desconto válido em reais.');
  } else if (input.desconto < 0) {
    errors.push('O desconto não pode ser negativo.');
  }

  if (errors.length === 0) {
    const maoDeObra =
      input.modoCalculo === MODES.M2
        ? roundCurrency(input.areaServico * input.precoPorM2)
        : roundCurrency(input.quantidadeDiarias * input.precoDiaria);

    const custosAdicionais = roundCurrency(
      input.custoTransporte +
        input.custoFerramentas +
        input.custoEntulho +
        input.outrosCustosAdicionais +
        input.custosAdicionaisDireto
    );
    const custoMateriais = roundCurrency(input.custoMateriais);
    const baseReserva = roundCurrency(maoDeObra + custosAdicionais + custoMateriais);
    const reservaImprevistos = roundCurrency(baseReserva * (input.reservaPercentual / 100));
    const subtotalComReserva = roundCurrency(baseReserva + reservaImprevistos);

    if (input.desconto > subtotalComReserva) {
      errors.push(
        `O desconto (${formatCurrency(input.desconto)}) não pode ser maior que o subtotal com reserva (${formatCurrency(subtotalComReserva)}).`
      );
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Executa o cálculo completo do Orçamento de Pedreiro.
 *
 * Ordem reproduzível das operações:
 * 1. Mão de obra = (área × preço por m²) ou (quantidade de diárias × preço da diária)
 * 2. Custos adicionais = transporte + ferramentas + entulho + outros
 * 3. Materiais = valor informado separadamente da mão de obra
 * 4. Base da reserva = mão de obra + custos adicionais + materiais (antes do desconto)
 * 5. Reserva para imprevistos = base da reserva × (percentual de reserva ÷ 100)
 * 6. Subtotal antes do desconto = base da reserva + reserva para imprevistos
 * 7. Total estimado = subtotal antes do desconto − desconto aplicado
 * 8. Custo médio por m² = total estimado ÷ área (somente quando área é aplicável e > 0)
 *
 * @param {Record<string, unknown>} rawInput
 */
export function calculate(rawInput = {}) {
  const normalized =
    rawInput &&
    typeof rawInput === 'object' &&
    'areaInformada' in rawInput &&
    'diariasInformada' in rawInput
      ? rawInput
      : normalizeInput(rawInput);

  const validation = validateInput(normalized);
  if (!validation.valid) {
    return {
      ok: false,
      errors: validation.errors
    };
  }

  const modoCalculo = normalized.modoCalculo;
  const areaServico =
    modoCalculo === MODES.M2 ? roundDecimal(normalized.areaServico) : null;
  const precoPorM2 =
    modoCalculo === MODES.M2 ? roundCurrency(normalized.precoPorM2) : null;
  const quantidadeDiarias =
    modoCalculo === MODES.DIARIA ? roundDecimal(normalized.quantidadeDiarias) : null;
  const precoDiaria =
    modoCalculo === MODES.DIARIA ? roundCurrency(normalized.precoDiaria) : null;

  const custoMaoDeObra =
    modoCalculo === MODES.M2
      ? roundCurrency(areaServico * precoPorM2)
      : roundCurrency(quantidadeDiarias * precoDiaria);

  const custoTransporte = roundCurrency(normalized.custoTransporte);
  const custoFerramentas = roundCurrency(normalized.custoFerramentas);
  const custoEntulho = roundCurrency(normalized.custoEntulho);
  const outrosCustosAdicionais = roundCurrency(
    normalized.outrosCustosAdicionais + normalized.custosAdicionaisDireto
  );

  const custosAdicionais = roundCurrency(
    custoTransporte + custoFerramentas + custoEntulho + outrosCustosAdicionais
  );

  const custoMateriais = roundCurrency(normalized.custoMateriais);
  const baseCalculoReserva = roundCurrency(custoMaoDeObra + custosAdicionais + custoMateriais);
  const reservaPercentual = roundDecimal(normalized.reservaPercentual);
  const reservaImprevistos = roundCurrency(baseCalculoReserva * (reservaPercentual / 100));
  const subtotalAntesDesconto = roundCurrency(baseCalculoReserva + reservaImprevistos);
  const descontoAplicado = roundCurrency(normalized.desconto);
  const totalEstimado = roundCurrency(subtotalAntesDesconto - descontoAplicado);

  const areaValida = modoCalculo === MODES.M2 && areaServico !== null && areaServico > 0;
  const custoMedioPorM2 = areaValida ? roundCurrency(totalEstimado / areaServico) : null;

  return {
    ok: true,
    errors: [],
    value: totalEstimado,
    unit: 'BRL',
    data: {
      modoCalculo,
      areaServico,
      precoPorM2,
      quantidadeDiarias,
      precoDiaria,
      custoMaoDeObra,
      custoTransporte,
      custoFerramentas,
      custoEntulho,
      outrosCustosAdicionais,
      custosAdicionais,
      custoMateriais,
      baseCalculoReserva,
      reservaPercentual,
      reservaImprevistos,
      subtotalAntesDesconto,
      descontoAplicado,
      totalEstimado,
      custoMedioPorM2
    }
  };
}

export const calculateMasonBudget = calculate;

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
  const metodoTexto =
    d.modoCalculo === MODES.M2
      ? `Por área (${formatArea(d.areaServico)} × ${formatCurrency(d.precoPorM2)}/m²)`
      : `Por diária (${numberFormatter.format(d.quantidadeDiarias)} ${d.quantidadeDiarias === 1 ? 'diária' : 'diárias'} × ${formatCurrency(d.precoDiaria)})`;

  const sections = [
    { label: 'Modalidade de cálculo', value: metodoTexto },
    { label: 'Custo da mão de obra', value: formatCurrency(d.custoMaoDeObra) },
    { label: 'Custos adicionais de serviço', value: formatCurrency(d.custosAdicionais) },
    { label: 'Custo estimado de materiais (separado da mão de obra)', value: formatCurrency(d.custoMateriais) },
    { label: 'Base antes da reserva', value: formatCurrency(d.baseCalculoReserva) },
    { label: `Reserva para imprevistos (${formatPercent(d.reservaPercentual)})`, value: formatCurrency(d.reservaImprevistos) },
    { label: 'Desconto aplicado', value: `-${formatCurrency(d.descontoAplicado)}` },
    { label: 'Total estimado do orçamento', value: formatCurrency(d.totalEstimado) }
  ];

  if (d.custoMedioPorM2 !== null) {
    sections.push({
      label: 'Custo médio total por m²',
      value: `${formatCurrency(d.custoMedioPorM2)}/m²`
    });
  }

  sections.push({
    label: 'Observação',
    value: 'Estimativa baseada nos valores informados pelo usuário; não substitui medição presencial ou proposta formal.'
  });

  return sections;
}

/**
 * Formata o resultado para exibição no DOM e geração de resumo.
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
  const metodoTexto =
    d.modoCalculo === MODES.M2
      ? `Por área (${formatArea(d.areaServico)} × ${formatCurrency(d.precoPorM2)}/m²)`
      : `Por diária (${numberFormatter.format(d.quantidadeDiarias)} ${d.quantidadeDiarias === 1 ? 'diária' : 'diárias'} × ${formatCurrency(d.precoDiaria)})`;

  const sections = getResultSections(calculation);
  const lines = [
    'Calculadora de Orçamento de Pedreiro — Calculadora Master',
    ...sections.map((s) => `${s.label}: ${s.value}`)
  ];

  return {
    text: formatCurrency(d.totalEstimado),
    summary: lines.join('\n'),
    metodoTexto,
    custoMaoDeObra: formatCurrency(d.custoMaoDeObra),
    custosAdicionais: formatCurrency(d.custosAdicionais),
    custoMateriais: formatCurrency(d.custoMateriais),
    baseCalculoReserva: formatCurrency(d.baseCalculoReserva),
    reservaImprevistos: `${formatCurrency(d.reservaImprevistos)} (${formatPercent(d.reservaPercentual)})`,
    descontoAplicado: formatCurrency(d.descontoAplicado),
    totalEstimado: formatCurrency(d.totalEstimado),
    custoMedioPorM2: d.custoMedioPorM2 !== null ? `${formatCurrency(d.custoMedioPorM2)}/m²` : null
  };
}

export function buildCopyText(calculation) {
  return formatResult(calculation).summary;
}

/**
 * Inicializa a Calculadora de Orçamento de Pedreiro no DOM.
 */
export function setupTool(root = document) {
  const form = root.querySelector('#formOrcamentoPedreiro');
  if (!form) return null;

  const selectModo = root.querySelector('#modoCalculoPedreiro');
  const blocoModoM2 = root.querySelector('#camposModoM2');
  const blocoModoDiaria = root.querySelector('#camposModoDiaria');

  const inputArea = root.querySelector('#areaServico');
  const inputPrecoM2 = root.querySelector('#precoPorM2');
  const inputDiarias = root.querySelector('#quantidadeDiarias');
  const inputPrecoDiaria = root.querySelector('#precoDiaria');

  const inputTransporte = root.querySelector('#custoTransporte');
  const inputFerramentas = root.querySelector('#custoFerramentas');
  const inputEntulho = root.querySelector('#custoEntulho');
  const inputOutros = root.querySelector('#outrosCustosAdicionais');
  const inputMateriais = root.querySelector('#custoMateriais');
  const inputReserva = root.querySelector('#reservaPercentual');
  const inputDesconto = root.querySelector('#descontoOrcamento');
  const btnLimpar = root.querySelector('#btnLimparOrcamentoPedreiro');

  const erroEl = root.querySelector('#erroOrcamentoPedreiro');
  const resultadoSection = root.querySelector('#resultadoOrcamentoPedreiro');
  const statusEl = root.querySelector('#statusOrcamentoPedreiro');

  const resMetodo = root.querySelector('#resMetodoPedreiro');
  const resMaoDeObra = root.querySelector('#resMaoDeObraPedreiro');
  const resCustosAdicionais = root.querySelector('#resCustosAdicionaisPedreiro');
  const resMateriais = root.querySelector('#resMateriaisPedreiro');
  const resBaseReserva = root.querySelector('#resBaseReservaPedreiro');
  const resReserva = root.querySelector('#resReservaPedreiro');
  const resDesconto = root.querySelector('#resDescontoPedreiro');
  const resTotal = root.querySelector('#resTotalPedreiro');
  const linhaCustoM2 = root.querySelector('#linhaCustoMedioM2Pedreiro');
  const resCustoMedioM2 = root.querySelector('#resCustoMedioM2Pedreiro');

  const btnCopiar = root.querySelector('#btnCopiarOrcamentoPedreiro');
  const btnCompartilhar = root.querySelector('#btnCompartilharOrcamentoPedreiro');
  const btnImprimir = root.querySelector('#btnImprimirOrcamentoPedreiro');

  let ultimoResultado = null;

  const actions = createResultActions({
    title: 'Calculadora de Orçamento de Pedreiro — Calculadora Master',
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

  function syncModeVisibility() {
    const modo = selectModo ? selectModo.value : MODES.M2;
    const isM2 = modo === MODES.M2;

    if (blocoModoM2) blocoModoM2.hidden = !isM2;
    if (blocoModoDiaria) blocoModoDiaria.hidden = isM2;

    if (isM2) {
      if (inputDiarias) inputDiarias.value = '';
      if (inputPrecoDiaria) inputPrecoDiaria.value = '';
    } else {
      if (inputArea) inputArea.value = '';
      if (inputPrecoM2) inputPrecoM2.value = '';
    }
  }

  function renderResult(calculation) {
    ultimoResultado = calculation;
    const formatted = formatResult(calculation);

    if (resMetodo) resMetodo.textContent = formatted.metodoTexto;
    if (resMaoDeObra) resMaoDeObra.textContent = formatted.custoMaoDeObra;
    if (resCustosAdicionais) resCustosAdicionais.textContent = formatted.custosAdicionais;
    if (resMateriais) resMateriais.textContent = formatted.custoMateriais;
    if (resBaseReserva) resBaseReserva.textContent = formatted.baseCalculoReserva;
    if (resReserva) resReserva.textContent = formatted.reservaImprevistos;
    if (resDesconto) resDesconto.textContent = formatted.descontoAplicado;
    if (resTotal) resTotal.textContent = formatted.totalEstimado;

    if (linhaCustoM2) {
      linhaCustoM2.hidden = formatted.custoMedioPorM2 === null;
    }
    if (resCustoMedioM2) {
      resCustoMedioM2.textContent = formatted.custoMedioPorM2 || '—';
    }

    if (resultadoSection) {
      resultadoSection.hidden = false;
    }
    setActionButtonsVisibility(true);
  }

  if (selectModo) {
    selectModo.addEventListener('change', () => {
      syncModeVisibility();
      clearError();
      ultimoResultado = null;
      if (resultadoSection) resultadoSection.hidden = true;
      setActionButtonsVisibility(false);
      if (statusEl) statusEl.textContent = '';
    });
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    clearError();
    if (statusEl) {
      statusEl.textContent = '';
    }

    const modo = selectModo ? selectModo.value : MODES.M2;
    const rawInput = {
      modoCalculo: modo,
      areaServico: modo === MODES.M2 && inputArea ? inputArea.value : '',
      precoPorM2: modo === MODES.M2 && inputPrecoM2 ? inputPrecoM2.value : '',
      quantidadeDiarias: modo === MODES.DIARIA && inputDiarias ? inputDiarias.value : '',
      precoDiaria: modo === MODES.DIARIA && inputPrecoDiaria ? inputPrecoDiaria.value : '',
      custoTransporte: inputTransporte ? inputTransporte.value : '',
      custoFerramentas: inputFerramentas ? inputFerramentas.value : '',
      custoEntulho: inputEntulho ? inputEntulho.value : '',
      outrosCustosAdicionais: inputOutros ? inputOutros.value : '',
      custoMateriais: inputMateriais ? inputMateriais.value : '',
      reservaPercentual: inputReserva ? inputReserva.value : '',
      desconto: inputDesconto ? inputDesconto.value : ''
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
      if (selectModo) selectModo.value = MODES.M2;
      if (inputReserva) inputReserva.value = String(DEFAULTS.reservaPercentual);
      syncModeVisibility();
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
          ? `${window.location.origin}/tools/utilidades/orcamento-pedreiro.html`
          : 'https://www.calculadoramaster.com/tools/utilidades/orcamento-pedreiro.html';
      await actions.share(shareUrl);
    });
  }

  if (btnImprimir) {
    btnImprimir.addEventListener('click', () => {
      if (!ultimoResultado) return;
      actions.print();
    });
  }

  syncModeVisibility();
  return { form, actions };
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setupTool(document));
  } else {
    setupTool(document);
  }
}
