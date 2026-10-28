/**
 * Calculadora MEI ou Autônomo? - Calculadora Master
 *
 * Simulador financeiro comparativo entre o Cenário A (MEI convencional) e o
 * Cenário B (Autônomo pessoa física / Contribuinte Individual), utilizando
 * parâmetros oficiais de referência de 2026.
 *
 * Esta ferramenta tem finalidade exclusivamente informativa e financeira:
 * não emite guias, não determina enquadramento jurídico definitivo, não recomenda
 * automaticamente um regime como "o melhor" e não substitui orientação contábil.
 */

import { createResultActions } from '../core/result-actions.js';

export const ANO_REFERENCIA = 2026;

export const FONTES_OFICIAIS = Object.freeze({
  perguntasFrequentesMei:
    'https://www.gov.br/empresas-e-negocios/pt-br/empreendedor/perguntas-frequentes',
  ocupacoesPermitidasMei:
    'https://www.gov.br/empresas-e-negocios/pt-br/empreendedor/quero-ser-mei/quais-as-ocupacoes-que-podem-ser-mei',
  valoresDasMei2026:
    'https://www8.receita.fazenda.gov.br/SIMPLESNACIONAL/noticias/NoticiaCompleta.aspx?id=c3b2044c-ff97-432a-b33c-ecf2a3df6dc3',
  tabelaContribuicaoInss:
    'https://www.gov.br/inss/pt-br/direitos-e-deveres/inscricao-e-contribuicao/tabela-de-contribuicao-mensal'
});

export const TIPOS_ATIVIDADE = Object.freeze({
  COMERCIO_INDUSTRIA: 'comercio_industria',
  SERVICOS: 'servicos',
  COMERCIO_SERVICOS: 'comercio_servicos'
});

export const ROTULOS_ATIVIDADE = Object.freeze({
  [TIPOS_ATIVIDADE.COMERCIO_INDUSTRIA]: 'Comércio ou Indústria',
  [TIPOS_ATIVIDADE.SERVICOS]: 'Prestação de Serviços',
  [TIPOS_ATIVIDADE.COMERCIO_SERVICOS]: 'Comércio e Serviços'
});

export const PLANOS_AUTONOMO = Object.freeze({
  SIMPLIFICADO_11: 'simplificado_11',
  NORMAL_20: 'normal_20'
});

export const ROTULOS_PLANO_AUTONOMO = Object.freeze({
  [PLANOS_AUTONOMO.SIMPLIFICADO_11]:
    'Plano simplificado (11% sobre o salário mínimo de referência)',
  [PLANOS_AUTONOMO.NORMAL_20]:
    'Plano normal (20% sobre a base de contribuição respeitando piso e teto)'
});

export const PARAMETROS_REFERENCIA_2026 = Object.freeze({
  anoReferencia: ANO_REFERENCIA,
  salarioMinimo: 1621.0,
  tetoPrevidenciario: 8475.55,
  mei: Object.freeze({
    inssBase5PorCento: 81.05,
    adicionalIcms: 1.0,
    adicionalIss: 5.0,
    dasPorAtividade: Object.freeze({
      [TIPOS_ATIVIDADE.COMERCIO_INDUSTRIA]: 82.05,
      [TIPOS_ATIVIDADE.SERVICOS]: 86.05,
      [TIPOS_ATIVIDADE.COMERCIO_SERVICOS]: 87.05
    }),
    limiteAnualGeral: 81000.0,
    limiteProporcionalMensal: 6750.0,
    fonteDas: FONTES_OFICIAIS.valoresDasMei2026,
    fonteFaq: FONTES_OFICIAIS.perguntasFrequentesMei,
    fonteOcupacoes: FONTES_OFICIAIS.ocupacoesPermitidasMei
  }),
  autonomo: Object.freeze({
    aliquotaSimplificada: 0.11,
    contribuicaoSimplificadaMensal: 178.31,
    aliquotaNormal: 0.2,
    baseMinimaNormal: 1621.0,
    baseMaximaNormal: 8475.55,
    contribuicaoMinimaNormal: 324.2,
    contribuicaoMaximaNormal: 1695.11,
    fonteInss: FONTES_OFICIAIS.tabelaContribuicaoInss
  })
});

export const DEFAULTS = Object.freeze({
  mesesAtividade: 12,
  tipoAtividade: TIPOS_ATIVIDADE.SERVICOS,
  dasMensal: PARAMETROS_REFERENCIA_2026.mei.dasPorAtividade[TIPOS_ATIVIDADE.SERVICOS],
  planoAutonomo: PLANOS_AUTONOMO.SIMPLIFICADO_11,
  baseContribuicao: PARAMETROS_REFERENCIA_2026.salarioMinimo
});

export const LIMITS = Object.freeze({
  maxValorMonetario: 100000000,
  minMesesAtividade: 1,
  maxMesesAtividade: 12
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

function roundCurrency(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function roundDecimal(value, decimals = 2) {
  const factor = 10 ** decimals;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

function isBlank(value) {
  return value === undefined || value === null || String(value).trim() === '';
}

/**
 * Converte números aceitando vírgula ou ponto decimal e prefixo R$.
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

  const commaCount = (normalized.match(/,/g) || []).length;
  const dotCount = (normalized.match(/\./g) || []).length;

  if (commaCount > 0 && dotCount > 0) {
    const lastComma = normalized.lastIndexOf(',');
    const lastDot = normalized.lastIndexOf('.');
    if (lastComma > lastDot) {
      const [integerPart, fractionalPart] = normalized.split(',');
      const validInteger = /^[+-]?\d+$/.test(integerPart) || /^[+-]?\d{1,3}(?:\.\d{3})+$/.test(integerPart);
      if (!validInteger || !/^\d+$/.test(fractionalPart)) return Number.NaN;
      normalized = normalized.replace(/\./g, '').replace(',', '.');
    } else {
      const [integerPart, fractionalPart] = normalized.split('.');
      const validInteger = /^[+-]?\d+$/.test(integerPart) || /^[+-]?\d{1,3}(?:,\d{3})+$/.test(integerPart);
      if (!validInteger || !/^\d+$/.test(fractionalPart)) return Number.NaN;
      normalized = normalized.replace(/,/g, '');
    }
  } else if (commaCount > 1) {
    if (!/^[+-]?\d{1,3}(?:,\d{3})+$/.test(normalized)) return Number.NaN;
    normalized = normalized.replace(/,/g, '');
  } else if (commaCount === 1) {
    normalized = normalized.replace(',', '.');
  } else if (dotCount > 1) {
    if (!/^[+-]?\d{1,3}(?:\.\d{3})+$/.test(normalized)) return Number.NaN;
    normalized = normalized.replace(/\./g, '');
  } else if (dotCount === 1 && /^[+-]?[1-9]\d{0,2}\.\d{3}$/.test(normalized)) {
    normalized = normalized.replace('.', '');
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

export function getDasReferenciaPorAtividade(tipoAtividade) {
  return (
    PARAMETROS_REFERENCIA_2026.mei.dasPorAtividade[tipoAtividade] ??
    PARAMETROS_REFERENCIA_2026.mei.dasPorAtividade[TIPOS_ATIVIDADE.SERVICOS]
  );
}

function normalizeTipoAtividade(raw) {
  if (isBlank(raw)) return null;
  const val = String(raw).trim().toLowerCase();
  if (
    val === TIPOS_ATIVIDADE.COMERCIO_INDUSTRIA ||
    val === 'comercio' ||
    val === 'industria' ||
    val === 'comercio-industria'
  ) {
    return TIPOS_ATIVIDADE.COMERCIO_INDUSTRIA;
  }
  if (val === TIPOS_ATIVIDADE.SERVICOS || val === 'servico') {
    return TIPOS_ATIVIDADE.SERVICOS;
  }
  if (
    val === TIPOS_ATIVIDADE.COMERCIO_SERVICOS ||
    val === 'comercio-servicos' ||
    val === 'ambos'
  ) {
    return TIPOS_ATIVIDADE.COMERCIO_SERVICOS;
  }
  return val;
}

function normalizePlanoAutonomo(raw) {
  if (isBlank(raw)) return null;
  const val = String(raw).trim().toLowerCase();
  if (
    val === PLANOS_AUTONOMO.SIMPLIFICADO_11 ||
    val === 'simplificado' ||
    val === '11' ||
    val === '11%'
  ) {
    return PLANOS_AUTONOMO.SIMPLIFICADO_11;
  }
  if (
    val === PLANOS_AUTONOMO.NORMAL_20 ||
    val === 'normal' ||
    val === '20' ||
    val === '20%'
  ) {
    return PLANOS_AUTONOMO.NORMAL_20;
  }
  return val;
}

/**
 * Normaliza as entradas da Calculadora MEI ou Autônomo.
 *
 * @param {Record<string, unknown>} rawInput
 */
export function normalizeInput(rawInput = {}) {
  const rawFaturamento = rawInput.faturamentoMensal ?? rawInput.faturamento;
  const rawDespesas = rawInput.despesasMensais ?? rawInput.despesas;
  const hasMesesKey = 'mesesAtividade' in rawInput || 'meses' in rawInput;
  const rawMeses = hasMesesKey ? (rawInput.mesesAtividade ?? rawInput.meses) : DEFAULTS.mesesAtividade;

  const hasTipoKey = 'tipoAtividade' in rawInput || 'atividade' in rawInput;
  const rawTipo = hasTipoKey ? (rawInput.tipoAtividade ?? rawInput.atividade) : DEFAULTS.tipoAtividade;
  const tipoAtividade = normalizeTipoAtividade(rawTipo);

  const hasDasKey = 'dasMensal' in rawInput || 'das' in rawInput;
  const rawDas = hasDasKey ? (rawInput.dasMensal ?? rawInput.das) : undefined;
  const dasPadraoAtividade =
    tipoAtividade && PARAMETROS_REFERENCIA_2026.mei.dasPorAtividade[tipoAtividade]
      ? PARAMETROS_REFERENCIA_2026.mei.dasPorAtividade[tipoAtividade]
      : DEFAULTS.dasMensal;

  const hasPlanoKey = 'planoAutonomo' in rawInput || 'planoInss' in rawInput || 'plano' in rawInput;
  const rawPlano = hasPlanoKey
    ? (rawInput.planoAutonomo ?? rawInput.planoInss ?? rawInput.plano)
    : DEFAULTS.planoAutonomo;
  const planoAutonomo = normalizePlanoAutonomo(rawPlano);

  const hasBaseKey = 'baseContribuicao' in rawInput || 'baseInss' in rawInput;
  const rawBase = hasBaseKey
    ? (rawInput.baseContribuicao ?? rawInput.baseInss)
    : DEFAULTS.baseContribuicao;

  const rawIrpf =
    rawInput.irpfMensal ??
    rawInput.irpfCarneLeaoMensal ??
    rawInput.irpf ??
    rawInput.carneLeao;

  const parsedFaturamento = parseFlexibleNumber(rawFaturamento);
  const parsedDespesas = parseFlexibleNumber(rawDespesas);
  const parsedMeses = parseFlexibleNumber(rawMeses);
  const parsedDas = rawDas === undefined ? dasPadraoAtividade : parseFlexibleNumber(rawDas);
  const parsedBase = parseFlexibleNumber(rawBase);
  const parsedIrpf = parseFlexibleNumber(rawIrpf);

  return {
    faturamentoInformado: !isBlank(rawFaturamento),
    despesasInformadas: !isBlank(rawDespesas),
    mesesInformado: !isBlank(rawMeses),
    tipoInformado: !isBlank(rawTipo),
    dasInformado: rawDas === undefined ? true : !isBlank(rawDas),
    planoInformado: !isBlank(rawPlano),
    baseInformada: !isBlank(rawBase),
    irpfInformado: !isBlank(rawIrpf),
    faturamentoMensal: parsedFaturamento,
    despesasMensais: parsedDespesas,
    mesesAtividade: parsedMeses,
    tipoAtividade,
    dasMensal: parsedDas,
    planoAutonomo,
    baseContribuicao: parsedBase,
    irpfMensal: parsedIrpf
  };
}

/**
 * Valida os parâmetros normalizados da Calculadora MEI ou Autônomo.
 *
 * @param {ReturnType<typeof normalizeInput>} input
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateInput(input) {
  const errors = [];

  if (!input || typeof input !== 'object') {
    return {
      valid: false,
      errors: ['Informe os dados de faturamento, despesas e contribuições para comparar os cenários.']
    };
  }

  if (
    !input.faturamentoInformado ||
    input.faturamentoMensal === null ||
    Number.isNaN(input.faturamentoMensal)
  ) {
    errors.push('Informe o faturamento bruto mensal esperado em reais (use 0 se não houver faturamento).');
  } else if (input.faturamentoMensal < 0) {
    errors.push('O faturamento bruto mensal esperado não pode ser negativo.');
  } else if (input.faturamentoMensal > LIMITS.maxValorMonetario) {
    errors.push('O faturamento bruto mensal informado excede o limite máximo permitido para simulação.');
  }

  if (
    !input.despesasInformadas ||
    input.despesasMensais === null ||
    Number.isNaN(input.despesasMensais)
  ) {
    errors.push('Informe as despesas operacionais mensais estimadas em reais (use 0 se não houver despesas).');
  } else if (input.despesasMensais < 0) {
    errors.push('As despesas operacionais mensais não podem ser negativas.');
  } else if (input.despesasMensais > LIMITS.maxValorMonetario) {
    errors.push('As despesas operacionais mensais informadas excedem o limite máximo permitido.');
  }

  if (
    !input.mesesInformado ||
    input.mesesAtividade === null ||
    Number.isNaN(input.mesesAtividade) ||
    !Number.isInteger(input.mesesAtividade)
  ) {
    errors.push('Informe a quantidade de meses de atividade no ano-calendário como um número inteiro de 1 a 12.');
  } else if (
    input.mesesAtividade < LIMITS.minMesesAtividade ||
    input.mesesAtividade > LIMITS.maxMesesAtividade
  ) {
    errors.push(
      `A quantidade de meses de atividade deve estar entre ${LIMITS.minMesesAtividade} e ${LIMITS.maxMesesAtividade}.`
    );
  }

  if (
    !input.tipoInformado ||
    !input.tipoAtividade ||
    !Object.values(TIPOS_ATIVIDADE).includes(input.tipoAtividade)
  ) {
    errors.push('Selecione um tipo de atividade válido (comércio/indústria, serviços ou comércio e serviços).');
  }

  if (!input.dasInformado || input.dasMensal === null || Number.isNaN(input.dasMensal)) {
    errors.push('Informe um valor mensal válido para o DAS-MEI em reais.');
  } else if (input.dasMensal < 0) {
    errors.push('O valor mensal do DAS-MEI não pode ser negativo.');
  } else if (input.dasMensal === 0) {
    errors.push('O valor mensal do DAS-MEI deve ser maior que zero.');
  } else if (input.dasMensal > LIMITS.maxValorMonetario) {
    errors.push('O valor mensal do DAS-MEI informado excede o limite máximo permitido.');
  }

  if (
    !input.planoInformado ||
    !input.planoAutonomo ||
    !Object.values(PLANOS_AUTONOMO).includes(input.planoAutonomo)
  ) {
    errors.push('Selecione uma opção válida de estimativa previdenciária para o cenário Autônomo (11% ou 20%).');
  }

  if (input.planoAutonomo === PLANOS_AUTONOMO.NORMAL_20) {
    if (
      !input.baseInformada ||
      input.baseContribuicao === null ||
      Number.isNaN(input.baseContribuicao)
    ) {
      errors.push('Informe uma base de contribuição mensal válida em reais para o plano normal de 20%.');
    } else if (input.baseContribuicao < 0) {
      errors.push('A base de contribuição mensal do INSS não pode ser negativa.');
    } else if (input.baseContribuicao === 0) {
      errors.push('A base de contribuição mensal do INSS para o plano de 20% deve ser maior que zero.');
    } else if (input.baseContribuicao > LIMITS.maxValorMonetario) {
      errors.push('A base de contribuição mensal informada excede o limite máximo permitido.');
    }
  }

  if (input.irpfInformado) {
    if (input.irpfMensal === null || Number.isNaN(input.irpfMensal)) {
      errors.push(
        'Informe um valor numérico válido para a estimativa mensal de IRPF/Carnê-Leão ou deixe o campo em branco.'
      );
    } else if (input.irpfMensal < 0) {
      errors.push('A estimativa mensal de IRPF/Carnê-Leão não pode ser negativa.');
    } else if (input.irpfMensal > LIMITS.maxValorMonetario) {
      errors.push('A estimativa mensal de IRPF/Carnê-Leão excede o limite máximo permitido.');
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Executa a simulação comparativa entre MEI convencional e Autônomo pessoa física.
 *
 * @param {Record<string, unknown>} rawInput
 */
export function calculate(rawInput = {}) {
  const normalized =
    rawInput &&
    typeof rawInput === 'object' &&
    'faturamentoInformado' in rawInput &&
    'despesasInformadas' in rawInput
      ? rawInput
      : normalizeInput(rawInput);

  const validation = validateInput(normalized);
  if (!validation.valid) {
    return {
      ok: false,
      valid: false,
      errors: validation.errors,
      error: validation.errors[0]
    };
  }

  const faturamentoMensal = roundCurrency(normalized.faturamentoMensal);
  const despesasMensais = roundCurrency(normalized.despesasMensais);
  const mesesAtividade = normalized.mesesAtividade;
  const tipoAtividade = normalized.tipoAtividade;
  const tipoAtividadeRotulo = ROTULOS_ATIVIDADE[tipoAtividade];

  const faturamentoProjetado = roundCurrency(faturamentoMensal * mesesAtividade);
  const despesasProjetadas = roundCurrency(despesasMensais * mesesAtividade);

  // Cenário A — MEI Convencional (Referência 2026)
  const dasReferencia2026 = getDasReferenciaPorAtividade(tipoAtividade);
  const dasMensal = roundCurrency(normalized.dasMensal);
  const dasAlteradoPeloUsuario = Math.abs(dasMensal - dasReferencia2026) > 0.001;
  const dasProjetado = roundCurrency(dasMensal * mesesAtividade);

  const saldoMensalMei = roundCurrency(faturamentoMensal - despesasMensais - dasMensal);
  const saldoPeriodoMei = roundCurrency(
    faturamentoProjetado - despesasProjetadas - dasProjetado
  );

  const percentualContribuicaoMei =
    faturamentoProjetado > 0
      ? roundDecimal((dasProjetado / faturamentoProjetado) * 100, 2)
      : null;

  const limiteAnualGeralMei = PARAMETROS_REFERENCIA_2026.mei.limiteAnualGeral;
  const limiteProporcionalMensalMei = PARAMETROS_REFERENCIA_2026.mei.limiteProporcionalMensal;
  const limiteAplicavelPeriodoMei =
    mesesAtividade === 12
      ? limiteAnualGeralMei
      : roundCurrency(limiteProporcionalMensalMei * mesesAtividade);

  const ultrapassaLimitePeriodoMei = faturamentoProjetado > limiteAplicavelPeriodoMei;
  const excedenteLimitePeriodoMei = ultrapassaLimitePeriodoMei
    ? roundCurrency(faturamentoProjetado - limiteAplicavelPeriodoMei)
    : 0;
  const margemRestanteLimitePeriodoMei = !ultrapassaLimitePeriodoMei
    ? roundCurrency(limiteAplicavelPeriodoMei - faturamentoProjetado)
    : 0;
  const percentualLimiteUtilizadoMei = roundDecimal(
    (faturamentoProjetado / limiteAplicavelPeriodoMei) * 100,
    2
  );

  const baseCalculoSaldoMei =
    'Faturamento bruto projetado menos despesas operacionais projetadas e DAS-MEI projetado no período (não deduz eventual IRPF da pessoa física sobre parcela tributável do lucro).';

  const indicadorLimiteMeiRotulo = ultrapassaLimitePeriodoMei
    ? 'Atenção: faturamento projetado ultrapassa o limite de referência do MEI para o período'
    : 'Dentro do limite de faturamento de referência do MEI para o período informado';

  const avisoLimiteMei = ultrapassaLimitePeriodoMei
    ? `O faturamento projetado de ${formatCurrency(faturamentoProjetado)} em ${mesesAtividade} ${mesesAtividade === 1 ? 'mês' : 'meses'} ultrapassa em ${formatCurrency(excedenteLimitePeriodoMei)} o limite de referência aplicável ao período (${formatCurrency(limiteAplicavelPeriodoMei)}, equivalente a ${formatPercent(percentualLimiteUtilizadoMei)} do limite). Isso indica possível extrapolação do teto de referência do MEI convencional, mas não determina isoladamente sua aptidão ou inaptidão jurídica sem avaliação contábil.`
    : `O faturamento projetado de ${formatCurrency(faturamentoProjetado)} em ${mesesAtividade} ${mesesAtividade === 1 ? 'mês' : 'meses'} corresponde a ${formatPercent(percentualLimiteUtilizadoMei)} do limite de referência aplicável ao período (${formatCurrency(limiteAplicavelPeriodoMei)}), restando ${formatCurrency(margemRestanteLimitePeriodoMei)} até o teto de referência. Estar dentro do limite de faturamento não garante enquadramento automático no MEI: confirme também a ocupação permitida e os demais requisitos legais.`;

  // Cenário B — Autônomo Pessoa Física (Referência 2026)
  const planoAutonomo = normalized.planoAutonomo;
  const planoAutonomoRotulo = ROTULOS_PLANO_AUTONOMO[planoAutonomo];
  const salarioMinimoRef = PARAMETROS_REFERENCIA_2026.salarioMinimo;
  const tetoPrevidenciarioRef = PARAMETROS_REFERENCIA_2026.tetoPrevidenciario;

  let aliquotaInssAutonomo;
  let baseContribuicaoInformada = null;
  let baseContribuicaoEfetiva;
  let ajusteBaseInss = 'nenhum';
  let inssMensal;

  if (planoAutonomo === PLANOS_AUTONOMO.SIMPLIFICADO_11) {
    aliquotaInssAutonomo = PARAMETROS_REFERENCIA_2026.autonomo.aliquotaSimplificada;
    baseContribuicaoEfetiva = salarioMinimoRef;
    inssMensal = PARAMETROS_REFERENCIA_2026.autonomo.contribuicaoSimplificadaMensal;
  } else {
    aliquotaInssAutonomo = PARAMETROS_REFERENCIA_2026.autonomo.aliquotaNormal;
    baseContribuicaoInformada = roundCurrency(normalized.baseContribuicao);
    if (baseContribuicaoInformada < salarioMinimoRef) {
      baseContribuicaoEfetiva = salarioMinimoRef;
      ajusteBaseInss = 'piso';
    } else if (baseContribuicaoInformada > tetoPrevidenciarioRef) {
      baseContribuicaoEfetiva = tetoPrevidenciarioRef;
      ajusteBaseInss = 'teto';
    } else {
      baseContribuicaoEfetiva = baseContribuicaoInformada;
    }
    inssMensal = roundCurrency(baseContribuicaoEfetiva * aliquotaInssAutonomo);
  }

  const inssProjetado = roundCurrency(inssMensal * mesesAtividade);
  const percentualInssSobreFaturamento =
    faturamentoProjetado > 0
      ? roundDecimal((inssProjetado / faturamentoProjetado) * 100, 2)
      : null;

  const saldoMensalAntesIrpf = roundCurrency(
    faturamentoMensal - despesasMensais - inssMensal
  );
  const saldoPeriodoAntesIrpf = roundCurrency(
    faturamentoProjetado - despesasProjetadas - inssProjetado
  );

  const irpfInformado = normalized.irpfInformado;
  const irpfMensal = irpfInformado ? roundCurrency(normalized.irpfMensal) : null;
  const irpfProjetado = irpfInformado ? roundCurrency(irpfMensal * mesesAtividade) : null;

  const encargosMensaisAutonomo = irpfInformado
    ? roundCurrency(inssMensal + irpfMensal)
    : inssMensal;
  const encargosPeriodoAutonomo = irpfInformado
    ? roundCurrency(inssProjetado + irpfProjetado)
    : inssProjetado;

  const percentualEncargosAutonomoSobreFaturamento =
    faturamentoProjetado > 0
      ? roundDecimal((encargosPeriodoAutonomo / faturamentoProjetado) * 100, 2)
      : null;

  const saldoMensalAposIrpf = irpfInformado
    ? roundCurrency(saldoMensalAntesIrpf - irpfMensal)
    : null;
  const saldoPeriodoAposIrpf = irpfInformado
    ? roundCurrency(saldoPeriodoAntesIrpf - irpfProjetado)
    : null;

  const saldoComparacaoMensalAutonomo = irpfInformado
    ? saldoMensalAposIrpf
    : saldoMensalAntesIrpf;
  const saldoComparacaoPeriodoAutonomo = irpfInformado
    ? saldoPeriodoAposIrpf
    : saldoPeriodoAntesIrpf;

  const baseCalculoSaldoAutonomo = irpfInformado
    ? 'Faturamento bruto projetado menos despesas operacionais projetadas, INSS projetado e estimativa informada de IRPF/Carnê-Leão no período (não inclui eventual ISS municipal não informado).'
    : 'Saldo estimado antes do IRPF/Carnê-Leão (faturamento bruto projetado menos despesas operacionais projetadas e INSS projetado). Como a estimativa de IRPF/Carnê-Leão não foi informada, o imposto não é tratado como zero e este valor não representa saldo líquido após todos os tributos.';

  // Comparação entre Cenário A (MEI) e Cenário B (Autônomo)
  const diferencaSaldoMensal = roundCurrency(
    saldoMensalMei - saldoComparacaoMensalAutonomo
  );
  const diferencaSaldoPeriodo = roundCurrency(
    saldoPeriodoMei - saldoComparacaoPeriodoAutonomo
  );
  const diferencaSaldoAbsolutaMensal = roundCurrency(Math.abs(diferencaSaldoMensal));
  const diferencaSaldoAbsolutaPeriodo = roundCurrency(Math.abs(diferencaSaldoPeriodo));

  const diferencaSaldoAntesIrpfPeriodo = roundCurrency(
    saldoPeriodoMei - saldoPeriodoAntesIrpf
  );
  const diferencaSaldoAposIrpfPeriodo = irpfInformado
    ? roundCurrency(saldoPeriodoMei - saldoPeriodoAposIrpf)
    : null;

  const baseComparacaoSaldos = irpfInformado
    ? 'Comparação entre o saldo estimado do Cenário A (após despesas e DAS-MEI) e o saldo estimado do Cenário B após INSS e a estimativa informada de IRPF/Carnê-Leão.'
    : 'Comparação entre o saldo estimado do Cenário A (após despesas e DAS-MEI) e o saldo estimado do Cenário B apenas antes do IRPF/Carnê-Leão (pois nenhuma estimativa de IRPF/Carnê-Leão foi informada).';

  return {
    ok: true,
    valid: true,
    errors: [],
    anoReferencia: ANO_REFERENCIA,
    fontesOficiais: FONTES_OFICIAIS,
    value: diferencaSaldoPeriodo,
    unit: 'BRL',
    data: {
      anoReferencia: ANO_REFERENCIA,
      faturamentoMensal,
      faturamentoProjetado,
      despesasMensais,
      despesasProjetadas,
      mesesAtividade,
      tipoAtividade,
      tipoAtividadeRotulo,
      mei: {
        tipoAtividade,
        tipoAtividadeRotulo,
        dasReferencia2026,
        dasMensal,
        dasAlteradoPeloUsuario,
        dasProjetado,
        saldoMensal: saldoMensalMei,
        saldoPeriodo: saldoPeriodoMei,
        percentualContribuicaoSobreFaturamento: percentualContribuicaoMei,
        limiteAnualGeral: limiteAnualGeralMei,
        limiteProporcionalMensal: limiteProporcionalMensalMei,
        limiteAplicavelPeriodo: limiteAplicavelPeriodoMei,
        ultrapassaLimitePeriodo: ultrapassaLimitePeriodoMei,
        excedenteLimitePeriodo: excedenteLimitePeriodoMei,
        margemRestanteLimitePeriodo: margemRestanteLimitePeriodoMei,
        percentualLimiteUtilizado: percentualLimiteUtilizadoMei,
        indicadorLimiteRotulo: indicadorLimiteMeiRotulo,
        avisoLimite: avisoLimiteMei,
        baseCalculoSaldo: baseCalculoSaldoMei
      },
      autonomo: {
        planoAutonomo,
        planoAutonomoRotulo,
        aliquotaInss: roundDecimal(aliquotaInssAutonomo * 100, 2),
        baseContribuicaoInformada,
        baseContribuicaoEfetiva,
        ajusteBaseInss,
        inssMensal,
        inssProjetado,
        percentualInssSobreFaturamento,
        saldoMensalAntesIrpf,
        saldoPeriodoAntesIrpf,
        irpfInformado,
        irpfMensal,
        irpfProjetado,
        encargosMensais: encargosMensaisAutonomo,
        encargosPeriodo: encargosPeriodoAutonomo,
        percentualEncargosSobreFaturamento: percentualEncargosAutonomoSobreFaturamento,
        saldoMensalAposIrpf,
        saldoPeriodoAposIrpf,
        saldoComparacaoMensal: saldoComparacaoMensalAutonomo,
        saldoComparacaoPeriodo: saldoComparacaoPeriodoAutonomo,
        baseCalculoSaldo: baseCalculoSaldoAutonomo
      },
      comparacao: {
        diferencaSaldoMensal,
        diferencaSaldoPeriodo,
        diferencaSaldoAbsolutaMensal,
        diferencaSaldoAbsolutaPeriodo,
        diferencaSaldoAntesIrpfPeriodo,
        diferencaSaldoAposIrpfPeriodo,
        baseComparacaoSaldos
      }
    }
  };
}

export const compareMeiOrAutonomo = calculate;

function formatPercentOrNa(percentValue) {
  if (percentValue === null || percentValue === undefined) {
    return 'Não aplicável (faturamento igual a R$ 0,00)';
  }
  return formatPercent(percentValue);
}

function formatBaseInssTexto(autonomoData) {
  if (autonomoData.planoAutonomo === PLANOS_AUTONOMO.SIMPLIFICADO_11) {
    return `${formatCurrency(autonomoData.baseContribuicaoEfetiva)} (salário mínimo de referência 2026 — alíquota de 11%)`;
  }
  if (autonomoData.ajusteBaseInss === 'piso') {
    return `${formatCurrency(autonomoData.baseContribuicaoEfetiva)} (ajustada ao piso salarial de 2026 a partir de ${formatCurrency(autonomoData.baseContribuicaoInformada)})`;
  }
  if (autonomoData.ajusteBaseInss === 'teto') {
    return `${formatCurrency(autonomoData.baseContribuicaoEfetiva)} (limitada ao teto previdenciário de 2026 a partir de ${formatCurrency(autonomoData.baseContribuicaoInformada)})`;
  }
  return `${formatCurrency(autonomoData.baseContribuicaoEfetiva)} (alíquota de 20% dentro da faixa entre piso e teto de 2026)`;
}

function formatDiferencaTexto(valorDiferenca, valorAbsoluto) {
  if (Math.abs(valorDiferenca) < 0.005) {
    return 'R$ 0,00 (saldos estimados equivalentes nas bases informadas)';
  }
  if (valorDiferenca > 0) {
    return `${formatCurrency(valorAbsoluto)} (saldo estimado maior no Cenário A — MEI em relação ao Cenário B, conforme as bases informadas)`;
  }
  return `${formatCurrency(valorAbsoluto)} (saldo estimado maior no Cenário B — Autônomo em relação ao Cenário A, conforme as bases informadas)`;
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
  const periodoTexto = `${d.mesesAtividade} ${d.mesesAtividade === 1 ? 'mês' : 'meses'} (ano-calendário — referência ${d.anoReferencia})`;

  const autonomoItems = [
    { label: 'Plano previdenciário selecionado', value: d.autonomo.planoAutonomoRotulo },
    { label: 'Base de contribuição INSS considerada', value: formatBaseInssTexto(d.autonomo) },
    { label: 'INSS mensal estimado', value: formatCurrency(d.autonomo.inssMensal) },
    { label: 'INSS projetado no período', value: formatCurrency(d.autonomo.inssProjetado) },
    {
      label: 'Percentual do INSS em relação ao faturamento',
      value: formatPercentOrNa(d.autonomo.percentualInssSobreFaturamento)
    },
    {
      label: 'Saldo mensal antes do IRPF/Carnê-Leão',
      value: formatCurrency(d.autonomo.saldoMensalAntesIrpf)
    },
    {
      label: 'Saldo no período antes do IRPF/Carnê-Leão',
      value: formatCurrency(d.autonomo.saldoPeriodoAntesIrpf)
    }
  ];

  if (d.autonomo.irpfInformado) {
    autonomoItems.push(
      {
        label: 'Estimativa de IRPF/Carnê-Leão informada',
        value: `${formatCurrency(d.autonomo.irpfMensal)}/mês (${formatCurrency(d.autonomo.irpfProjetado)} no período)`
      },
      {
        label: 'Total de encargos no período (INSS + IRPF estimado)',
        value: formatCurrency(d.autonomo.encargosPeriodo)
      },
      {
        label: 'Percentual de INSS + IRPF estimado sobre o faturamento',
        value: formatPercentOrNa(d.autonomo.percentualEncargosSobreFaturamento)
      },
      {
        label: 'Saldo mensal após estimativa de IRPF/Carnê-Leão',
        value: formatCurrency(d.autonomo.saldoMensalAposIrpf)
      },
      {
        label: 'Saldo no período após estimativa de IRPF/Carnê-Leão',
        value: formatCurrency(d.autonomo.saldoPeriodoAposIrpf)
      }
    );
  } else {
    autonomoItems.push({
      label: 'Estimativa de IRPF/Carnê-Leão',
      value:
        'Não informada pelo usuário (não tratada como zero; saldo exibido apenas antes do IRPF/Carnê-Leão)'
    });
  }

  autonomoItems.push({
    label: 'Base de cálculo do saldo Autônomo',
    value: d.autonomo.baseCalculoSaldo
  });

  return [
    {
      title: 'Dados comuns informados',
      items: [
        { label: 'Período analisado', value: periodoTexto },
        { label: 'Tipo de atividade', value: d.tipoAtividadeRotulo },
        { label: 'Faturamento bruto mensal', value: formatCurrency(d.faturamentoMensal) },
        { label: 'Faturamento bruto projetado no período', value: formatCurrency(d.faturamentoProjetado) },
        { label: 'Despesas operacionais mensais', value: formatCurrency(d.despesasMensais) },
        { label: 'Despesas operacionais projetadas no período', value: formatCurrency(d.despesasProjetadas) }
      ]
    },
    {
      title: 'Cenário A — MEI (Convencional — Referência 2026)',
      items: [
        { label: 'DAS-MEI mensal considerado', value: formatCurrency(d.mei.dasMensal) },
        { label: 'DAS-MEI projetado no período', value: formatCurrency(d.mei.dasProjetado) },
        {
          label: 'Percentual do DAS em relação ao faturamento',
          value: formatPercentOrNa(d.mei.percentualContribuicaoSobreFaturamento)
        },
        { label: 'Saldo mensal estimado (após despesas e DAS)', value: formatCurrency(d.mei.saldoMensal) },
        { label: 'Saldo estimado no período (após despesas e DAS)', value: formatCurrency(d.mei.saldoPeriodo) },
        { label: 'Limite de faturamento de referência no período', value: formatCurrency(d.mei.limiteAplicavelPeriodo) },
        { label: 'Situação em relação ao limite do MEI', value: d.mei.indicadorLimiteRotulo },
        { label: 'Base de cálculo do saldo MEI', value: d.mei.baseCalculoSaldo }
      ]
    },
    {
      title: 'Cenário B — Autônomo Pessoa Física (Referência 2026)',
      items: autonomoItems
    },
    {
      title: 'Comparação entre os cenários',
      items: [
        {
          label: 'Diferença mensal entre os saldos',
          value: formatDiferencaTexto(
            d.comparacao.diferencaSaldoMensal,
            d.comparacao.diferencaSaldoAbsolutaMensal
          )
        },
        {
          label: 'Diferença entre os saldos no período',
          value: formatDiferencaTexto(
            d.comparacao.diferencaSaldoPeriodo,
            d.comparacao.diferencaSaldoAbsolutaPeriodo
          )
        },
        { label: 'Base da comparação', value: d.comparacao.baseComparacaoSaldos },
        {
          label: 'Aviso importante',
          value:
            'Simulação exclusivamente financeira baseada nos parâmetros de referência de 2026. Não recomenda automaticamente um regime como o melhor nem substitui orientação contábil.'
        }
      ]
    }
  ];
}

/**
 * Formata o resultado para exibição no DOM e texto de cópia.
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
  const lines = ['Calculadora MEI ou Autônomo — Calculadora Master', ''];
  for (const sec of sections) {
    if (sec.title) lines.push(sec.title);
    for (const item of sec.items || []) {
      lines.push(`${item.label}: ${item.value}`);
    }
    lines.push('');
  }

  const comparacaoLimiteTexto = d.mei.ultrapassaLimitePeriodo
    ? `Ultrapassa em ${formatCurrency(d.mei.excedenteLimitePeriodo)} (${formatPercent(d.mei.percentualLimiteUtilizado)} do limite de ${formatCurrency(d.mei.limiteAplicavelPeriodo)})`
    : `Dentro do limite de referência (${formatPercent(d.mei.percentualLimiteUtilizado)} utilizado; margem restante de ${formatCurrency(d.mei.margemRestanteLimitePeriodo)})`;

  const irpfInformadoTexto = d.autonomo.irpfInformado
    ? `${formatCurrency(d.autonomo.irpfMensal)}/mês (${formatCurrency(d.autonomo.irpfProjetado)} no período)`
    : 'Não informada (não tratada como R$ 0,00; saldo exibido apenas antes do IRPF/Carnê-Leão)';

  return {
    text: formatDiferencaTexto(
      d.comparacao.diferencaSaldoPeriodo,
      d.comparacao.diferencaSaldoAbsolutaPeriodo
    ),
    summary: lines.join('\n').trim(),
    periodoMeses: `${d.mesesAtividade} ${d.mesesAtividade === 1 ? 'mês' : 'meses'}`,
    faturamentoMensal: formatCurrency(d.faturamentoMensal),
    faturamentoProjetado: formatCurrency(d.faturamentoProjetado),
    despesasMensais: formatCurrency(d.despesasMensais),
    despesasProjetadas: formatCurrency(d.despesasProjetadas),
    diferencaSaldosPeriodo: formatDiferencaTexto(
      d.comparacao.diferencaSaldoPeriodo,
      d.comparacao.diferencaSaldoAbsolutaPeriodo
    ),
    diferencaSaldosMensal: formatDiferencaTexto(
      d.comparacao.diferencaSaldoMensal,
      d.comparacao.diferencaSaldoAbsolutaMensal
    ),
    baseComparacaoSaldos: d.comparacao.baseComparacaoSaldos,
    indicadorLimiteMei: d.mei.indicadorLimiteRotulo,
    avisoLimiteMei: d.mei.avisoLimite,
    tipoAtividadeMei: d.mei.tipoAtividadeRotulo,
    faturamentoMeiResumo: `${formatCurrency(d.faturamentoMensal)} / ${formatCurrency(d.faturamentoProjetado)}`,
    despesasMeiResumo: `${formatCurrency(d.despesasMensais)} / ${formatCurrency(d.despesasProjetadas)}`,
    dasMensalMei: d.mei.dasAlteradoPeloUsuario
      ? `${formatCurrency(d.mei.dasMensal)} (ajustado pelo usuário; ref. 2026: ${formatCurrency(d.mei.dasReferencia2026)})`
      : `${formatCurrency(d.mei.dasMensal)} (referência oficial 2026)`,
    dasPeriodoMei: formatCurrency(d.mei.dasProjetado),
    percentualContribuicaoMei: formatPercentOrNa(d.mei.percentualContribuicaoSobreFaturamento),
    limiteAplicavelMei: `${formatCurrency(d.mei.limiteAplicavelPeriodo)} (${d.mesesAtividade === 12 ? 'limite anual geral de R$ 81.000,00' : `limite proporcional: ${d.mesesAtividade} × R$ 6.750,00`})`,
    comparacaoLimiteMei: comparacaoLimiteTexto,
    saldoMensalMei: formatCurrency(d.mei.saldoMensal),
    saldoPeriodoMei: formatCurrency(d.mei.saldoPeriodo),
    baseCalculoSaldoMei: d.mei.baseCalculoSaldo,
    planoAutonomo: d.autonomo.planoAutonomoRotulo,
    baseInssAutonomo: formatBaseInssTexto(d.autonomo),
    faturamentoAutonomoResumo: `${formatCurrency(d.faturamentoMensal)} / ${formatCurrency(d.faturamentoProjetado)}`,
    despesasAutonomoResumo: `${formatCurrency(d.despesasMensais)} / ${formatCurrency(d.despesasProjetadas)}`,
    inssMensalAutonomo: formatCurrency(d.autonomo.inssMensal),
    inssPeriodoAutonomo: formatCurrency(d.autonomo.inssProjetado),
    percentualInssAutonomo: formatPercentOrNa(d.autonomo.percentualInssSobreFaturamento),
    saldoAntesIrpfMensalAutonomo: formatCurrency(d.autonomo.saldoMensalAntesIrpf),
    saldoAntesIrpfPeriodoAutonomo: formatCurrency(d.autonomo.saldoPeriodoAntesIrpf),
    irpfInformadoAutonomo: irpfInformadoTexto,
    encargosTotaisAutonomo: formatCurrency(d.autonomo.encargosPeriodo),
    percentualTotalEncargosAutonomo: formatPercentOrNa(
      d.autonomo.percentualEncargosSobreFaturamento
    ),
    saldoAposIrpfMensalAutonomo:
      d.autonomo.saldoMensalAposIrpf !== null
        ? formatCurrency(d.autonomo.saldoMensalAposIrpf)
        : '—',
    saldoAposIrpfPeriodoAutonomo:
      d.autonomo.saldoPeriodoAposIrpf !== null
        ? formatCurrency(d.autonomo.saldoPeriodoAposIrpf)
        : '—',
    baseCalculoSaldoAutonomo: d.autonomo.baseCalculoSaldo
  };
}

export function buildCopyText(calculation) {
  return formatResult(calculation).summary;
}

/**
 * Conecta o módulo ao DOM da página Calculadora MEI ou Autônomo.
 */
export function setupTool(root = document) {
  if (!root || typeof root.querySelector !== 'function') return null;
  const form = root.querySelector('#formMeiOuAutonomo');
  if (!form) return null;

  const inputFaturamento = root.querySelector('#faturamentoMensalMeiAutonomo');
  const inputDespesas = root.querySelector('#despesasMensaisMeiAutonomo');
  const inputMeses = root.querySelector('#mesesAtividadeMeiAutonomo');
  const selectTipoAtividade = root.querySelector('#tipoAtividadeMeiAutonomo');
  const inputDasMensal = root.querySelector('#dasMensalMei');
  const selectPlanoAutonomo = root.querySelector('#planoInssAutonomo');
  const inputBaseContribuicao = root.querySelector('#baseContribuicaoAutonomo');
  const ajudaBaseContribuicao = root.querySelector('#ajudaBaseContribuicaoAutonomo');
  const inputIrpfMensal = root.querySelector('#irpfCarneLeaoMensalAutonomo');
  const btnLimpar = root.querySelector('#btnLimparMeiAutonomo');

  const erroEl = root.querySelector('#erroMeiOuAutonomo');
  const resultadoSection = root.querySelector('#resultadoMeiAutonomo');
  const statusEl = root.querySelector('#statusMeiAutonomo');

  const resPeriodoMeses = root.querySelector('#resPeriodoMesesMeiAutonomo');
  const resFaturamentoMensalComum = root.querySelector('#resFaturamentoMensalComum');
  const resFaturamentoPeriodoComum = root.querySelector('#resFaturamentoPeriodoComum');
  const resDespesasMensaisComum = root.querySelector('#resDespesasMensaisComum');
  const resDespesasPeriodoComum = root.querySelector('#resDespesasPeriodoComum');
  const resDiferencaSaldosPeriodo = root.querySelector('#resDiferencaSaldosPeriodo');
  const resDiferencaSaldosMensal = root.querySelector('#resDiferencaSaldosMensal');
  const resBaseComparacaoSaldos = root.querySelector('#resBaseComparacaoSaldos');
  const resIndicadorLimiteMei = root.querySelector('#resIndicadorLimiteMei');
  const resAvisoLimiteMeiAutonomo = root.querySelector('#resAvisoLimiteMeiAutonomo');

  const resTipoAtividadeMei = root.querySelector('#resTipoAtividadeMei');
  const resFaturamentoMeiResumo = root.querySelector('#resFaturamentoMeiResumo');
  const resDespesasMeiResumo = root.querySelector('#resDespesasMeiResumo');
  const resDasMensalMei = root.querySelector('#resDasMensalMei');
  const resDasPeriodoMei = root.querySelector('#resDasPeriodoMei');
  const resPercentualContribuicaoMei = root.querySelector('#resPercentualContribuicaoMei');
  const resLimiteAplicavelMei = root.querySelector('#resLimiteAplicavelMei');
  const resComparacaoLimiteMei = root.querySelector('#resComparacaoLimiteMei');
  const resSaldoMensalMei = root.querySelector('#resSaldoMensalMei');
  const resSaldoPeriodoMei = root.querySelector('#resSaldoPeriodoMei');
  const resBaseCalculoSaldoMei = root.querySelector('#resBaseCalculoSaldoMei');

  const resPlanoAutonomo = root.querySelector('#resPlanoAutonomo');
  const resBaseInssAutonomo = root.querySelector('#resBaseInssAutonomo');
  const resFaturamentoAutonomoResumo = root.querySelector('#resFaturamentoAutonomoResumo');
  const resDespesasAutonomoResumo = root.querySelector('#resDespesasAutonomoResumo');
  const resInssMensalAutonomo = root.querySelector('#resInssMensalAutonomo');
  const resInssPeriodoAutonomo = root.querySelector('#resInssPeriodoAutonomo');
  const resPercentualInssAutonomo = root.querySelector('#resPercentualInssAutonomo');
  const resSaldoAntesIrpfMensalAutonomo = root.querySelector('#resSaldoAntesIrpfMensalAutonomo');
  const resSaldoAntesIrpfPeriodoAutonomo = root.querySelector('#resSaldoAntesIrpfPeriodoAutonomo');
  const resIrpfInformadoAutonomo = root.querySelector('#resIrpfInformadoAutonomo');
  const blocoSaldoAposIrpfAutonomo = root.querySelector('#blocoSaldoAposIrpfAutonomo');
  const resEncargosTotaisAutonomo = root.querySelector('#resEncargosTotaisAutonomo');
  const resPercentualTotalEncargosAutonomo = root.querySelector(
    '#resPercentualTotalEncargosAutonomo'
  );
  const resSaldoAposIrpfMensalAutonomo = root.querySelector('#resSaldoAposIrpfMensalAutonomo');
  const resSaldoAposIrpfPeriodoAutonomo = root.querySelector('#resSaldoAposIrpfPeriodoAutonomo');
  const resBaseCalculoSaldoAutonomo = root.querySelector('#resBaseCalculoSaldoAutonomo');

  const btnCopiar = root.querySelector('#btnCopiarMeiAutonomo');
  const btnCompartilhar = root.querySelector('#btnCompartilharMeiAutonomo');
  const btnImprimir = root.querySelector('#btnImprimirMeiAutonomo');

  let ultimoResultado = null;

  const actions = createResultActions({
    title: 'Calculadora MEI ou Autônomo — Calculadora Master',
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

  function invalidateResult() {
    ultimoResultado = null;
    clearError();
    if (resultadoSection) {
      resultadoSection.hidden = true;
    }
    if (blocoSaldoAposIrpfAutonomo) {
      blocoSaldoAposIrpfAutonomo.hidden = true;
    }
    setActionButtonsVisibility(false);
    if (statusEl) {
      statusEl.textContent = '';
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
    if (blocoSaldoAposIrpfAutonomo) {
      blocoSaldoAposIrpfAutonomo.hidden = true;
    }
    setActionButtonsVisibility(false);
    if (statusEl) {
      statusEl.textContent = '';
    }
  }

  function formatDasInputSuggestion(valor) {
    return valor.toFixed(2).replace('.', ',');
  }

  function updateBaseContribuicaoState() {
    const usesCustomBase =
      selectPlanoAutonomo && selectPlanoAutonomo.value === PLANOS_AUTONOMO.NORMAL_20;

    if (inputBaseContribuicao) {
      inputBaseContribuicao.disabled = !usesCustomBase;
    }
    if (ajudaBaseContribuicao) {
      const nextMessage = usesCustomBase
        ? 'No plano normal de 20%, o valor personalizado deste campo é utilizado no cálculo, respeitando os limites de referência apresentados acima.'
        : 'No plano simplificado de 11%, o valor personalizado deste campo não é utilizado no cálculo. Ele será mantido se você selecionar o plano normal de 20%.';
      if (ajudaBaseContribuicao.textContent !== nextMessage) {
        ajudaBaseContribuicao.textContent = nextMessage;
      }
    }
  }

  updateBaseContribuicaoState();

  if (selectPlanoAutonomo && typeof selectPlanoAutonomo.addEventListener === 'function') {
    selectPlanoAutonomo.addEventListener('change', () => {
      updateBaseContribuicaoState();
      invalidateResult();
    });
  }

  if (selectTipoAtividade && inputDasMensal) {
    selectTipoAtividade.addEventListener('change', () => {
      const refVal = getDasReferenciaPorAtividade(selectTipoAtividade.value);
      inputDasMensal.value = formatDasInputSuggestion(refVal);
      invalidateResult();
    });
  }

  if (typeof form.addEventListener === 'function') {
    form.addEventListener('input', (event) => {
      if (event?.target === selectPlanoAutonomo || event?.target === selectTipoAtividade) {
        return;
      }
      invalidateResult();
    });
    form.addEventListener('change', (event) => {
      if (event?.target === selectPlanoAutonomo || event?.target === selectTipoAtividade) {
        return;
      }
      invalidateResult();
    });
  }

  function renderResult(calculation) {
    ultimoResultado = calculation;
    const formatted = formatResult(calculation);
    const d = calculation.data;

    if (resPeriodoMeses) resPeriodoMeses.textContent = formatted.periodoMeses;
    if (resFaturamentoMensalComum) resFaturamentoMensalComum.textContent = formatted.faturamentoMensal;
    if (resFaturamentoPeriodoComum) {
      resFaturamentoPeriodoComum.textContent = formatted.faturamentoProjetado;
    }
    if (resDespesasMensaisComum) resDespesasMensaisComum.textContent = formatted.despesasMensais;
    if (resDespesasPeriodoComum) resDespesasPeriodoComum.textContent = formatted.despesasProjetadas;
    if (resDiferencaSaldosPeriodo) {
      resDiferencaSaldosPeriodo.textContent = formatted.diferencaSaldosPeriodo;
    }
    if (resDiferencaSaldosMensal) {
      resDiferencaSaldosMensal.textContent = formatted.diferencaSaldosMensal;
    }
    if (resBaseComparacaoSaldos) {
      resBaseComparacaoSaldos.textContent = formatted.baseComparacaoSaldos;
    }

    if (resIndicadorLimiteMei) {
      resIndicadorLimiteMei.textContent = formatted.indicadorLimiteMei;
      resIndicadorLimiteMei.className = d.mei.ultrapassaLimitePeriodo
        ? 'budget-status-negative'
        : 'budget-status-positive';
    }
    if (resAvisoLimiteMeiAutonomo) {
      resAvisoLimiteMeiAutonomo.textContent = formatted.avisoLimiteMei;
    }

    if (resTipoAtividadeMei) resTipoAtividadeMei.textContent = formatted.tipoAtividadeMei;
    if (resFaturamentoMeiResumo) resFaturamentoMeiResumo.textContent = formatted.faturamentoMeiResumo;
    if (resDespesasMeiResumo) resDespesasMeiResumo.textContent = formatted.despesasMeiResumo;
    if (resDasMensalMei) resDasMensalMei.textContent = formatted.dasMensalMei;
    if (resDasPeriodoMei) resDasPeriodoMei.textContent = formatted.dasPeriodoMei;
    if (resPercentualContribuicaoMei) {
      resPercentualContribuicaoMei.textContent = formatted.percentualContribuicaoMei;
    }
    if (resLimiteAplicavelMei) resLimiteAplicavelMei.textContent = formatted.limiteAplicavelMei;
    if (resComparacaoLimiteMei) resComparacaoLimiteMei.textContent = formatted.comparacaoLimiteMei;
    if (resSaldoMensalMei) resSaldoMensalMei.textContent = formatted.saldoMensalMei;
    if (resSaldoPeriodoMei) resSaldoPeriodoMei.textContent = formatted.saldoPeriodoMei;
    if (resBaseCalculoSaldoMei) resBaseCalculoSaldoMei.textContent = formatted.baseCalculoSaldoMei;

    if (resPlanoAutonomo) resPlanoAutonomo.textContent = formatted.planoAutonomo;
    if (resBaseInssAutonomo) resBaseInssAutonomo.textContent = formatted.baseInssAutonomo;
    if (resFaturamentoAutonomoResumo) {
      resFaturamentoAutonomoResumo.textContent = formatted.faturamentoAutonomoResumo;
    }
    if (resDespesasAutonomoResumo) {
      resDespesasAutonomoResumo.textContent = formatted.despesasAutonomoResumo;
    }
    if (resInssMensalAutonomo) resInssMensalAutonomo.textContent = formatted.inssMensalAutonomo;
    if (resInssPeriodoAutonomo) resInssPeriodoAutonomo.textContent = formatted.inssPeriodoAutonomo;
    if (resPercentualInssAutonomo) {
      resPercentualInssAutonomo.textContent = formatted.percentualInssAutonomo;
    }
    if (resSaldoAntesIrpfMensalAutonomo) {
      resSaldoAntesIrpfMensalAutonomo.textContent = formatted.saldoAntesIrpfMensalAutonomo;
    }
    if (resSaldoAntesIrpfPeriodoAutonomo) {
      resSaldoAntesIrpfPeriodoAutonomo.textContent = formatted.saldoAntesIrpfPeriodoAutonomo;
    }
    if (resIrpfInformadoAutonomo) {
      resIrpfInformadoAutonomo.textContent = formatted.irpfInformadoAutonomo;
    }

    if (blocoSaldoAposIrpfAutonomo) {
      blocoSaldoAposIrpfAutonomo.hidden = !d.autonomo.irpfInformado;
    }
    if (d.autonomo.irpfInformado) {
      if (resEncargosTotaisAutonomo) {
        resEncargosTotaisAutonomo.textContent = formatted.encargosTotaisAutonomo;
      }
      if (resPercentualTotalEncargosAutonomo) {
        resPercentualTotalEncargosAutonomo.textContent = formatted.percentualTotalEncargosAutonomo;
      }
      if (resSaldoAposIrpfMensalAutonomo) {
        resSaldoAposIrpfMensalAutonomo.textContent = formatted.saldoAposIrpfMensalAutonomo;
      }
      if (resSaldoAposIrpfPeriodoAutonomo) {
        resSaldoAposIrpfPeriodoAutonomo.textContent = formatted.saldoAposIrpfPeriodoAutonomo;
      }
    }

    if (resBaseCalculoSaldoAutonomo) {
      resBaseCalculoSaldoAutonomo.textContent = formatted.baseCalculoSaldoAutonomo;
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
      faturamentoMensal: inputFaturamento ? inputFaturamento.value : '',
      despesasMensais: inputDespesas ? inputDespesas.value : '',
      mesesAtividade: inputMeses ? inputMeses.value : '',
      tipoAtividade: selectTipoAtividade ? selectTipoAtividade.value : '',
      dasMensal: inputDasMensal ? inputDasMensal.value : '',
      planoAutonomo: selectPlanoAutonomo ? selectPlanoAutonomo.value : '',
      baseContribuicao: inputBaseContribuicao ? inputBaseContribuicao.value : '',
      irpfMensal: inputIrpfMensal ? inputIrpfMensal.value : ''
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
      if (typeof form.reset === 'function') {
        form.reset();
      }
      if (inputFaturamento) inputFaturamento.value = '';
      if (inputDespesas) inputDespesas.value = '';
      if (inputMeses) inputMeses.value = String(DEFAULTS.mesesAtividade);
      if (selectTipoAtividade) selectTipoAtividade.value = DEFAULTS.tipoAtividade;
      if (inputDasMensal) {
        inputDasMensal.value = formatDasInputSuggestion(DEFAULTS.dasMensal);
      }
      if (selectPlanoAutonomo) selectPlanoAutonomo.value = DEFAULTS.planoAutonomo;
      if (inputBaseContribuicao) {
        inputBaseContribuicao.value = formatDasInputSuggestion(DEFAULTS.baseContribuicao);
      }
      updateBaseContribuicaoState();
      if (inputIrpfMensal) inputIrpfMensal.value = '';
      invalidateResult();
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
          ? `${window.location.origin}/tools/financas/mei-ou-autonomo.html`
          : 'https://www.calculadoramaster.com/tools/financas/mei-ou-autonomo.html';
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
