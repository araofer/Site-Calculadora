/**
 * Calculadora Carnê-Leão para Autônomos - Calculadora Master
 *
 * Estima o recolhimento mensal obrigatório (Carnê-Leão — código DARF 0190) para
 * profissionais autônomos e liberais que recebem rendimentos de pessoas físicas
 * ou do exterior no ano-calendário de 2026, respeitando:
 * - Tabela progressiva mensal do IRPF vigente em 2026 (Receita Federal / Lei nº 9.250/1995);
 * - Regra de redução mensal do imposto (Art. 3º-A da Lei nº 9.250/1995, incluído pela Lei nº 15.270/2025):
 *   isenção total até R$ 5.000,00 (redução de até R$ 312,89) e redução linear decrescente de
 *   R$ 5.000,01 até R$ 7.350,00 pela fórmula R$ 978,62 - (0,133145 × rendimentos tributáveis mensais);
 * - Deduções legais elegíveis (Livro-Caixa limitado à receita da atividade não assalariada no mês,
 *   contribuição previdenciária oficial, dependentes a R$ 189,59 cada e pensão alimentícia judicial/escritura);
 * - Alternativa mutuamente exclusiva do desconto simplificado mensal (R$ 607,20 = 25% de R$ 2.428,80).
 *
 * Ferramenta exclusivamente informativa: não substitui o sistema Carnê-Leão Web (e-CAC),
 * não emite DARF, não realiza apuração de ajuste anual (DIRPF) e não constitui consultoria contábil ou fiscal.
 */

import { createResultActions } from '../core/result-actions.js';

export const ANO_REFERENCIA = 2026;
export const DATA_CONSULTA_OFICIAL = '2026-10-21';

export const FONTES_OFICIAIS = Object.freeze({
  carneLeaoReceitaFederal:
    'https://www.gov.br/receitafederal/pt-br/assuntos/meu-imposto-de-renda/pagamento/carne-leao',
  tabelasIrpf2026:
    'https://www.gov.br/receitafederal/pt-br/assuntos/meu-imposto-de-renda/tabelas/2026',
  lei9250Planalto:
    'https://www.planalto.gov.br/ccivil_03/leis/L9250.htm',
  lei15270Planalto:
    'https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2025/lei/l15270.htm',
  inRfb1500:
    'http://normas.receita.fazenda.gov.br/sijut2consulta/link.action?idAto=57670'
});

export const MESES_ANO = Object.freeze({
  1: 'Janeiro',
  2: 'Fevereiro',
  3: 'Março',
  4: 'Abril',
  5: 'Maio',
  6: 'Junho',
  7: 'Julho',
  8: 'Agosto',
  9: 'Setembro',
  10: 'Outubro',
  11: 'Novembro',
  12: 'Dezembro'
});

export const MODOS_DEDUCAO = Object.freeze({
  AUTOMATICO: 'automatico',
  LEGAIS: 'legais',
  SIMPLIFICADO: 'simplificado'
});

export const ROTULOS_MODO_DEDUCAO = Object.freeze({
  [MODOS_DEDUCAO.AUTOMATICO]:
    'Automático (compara Deduções Legais e Desconto Simplificado de R$ 607,20 e aplica o mais vantajoso)',
  [MODOS_DEDUCAO.LEGAIS]:
    'Deduções Legais (Livro-Caixa, INSS, dependentes e pensão alimentícia)',
  [MODOS_DEDUCAO.SIMPLIFICADO]:
    'Desconto Simplificado Mensal (R$ 607,20 em substituição às deduções legais)'
});

export const TABELA_PROGRESSIVA_MENSAL_2026 = Object.freeze([
  Object.freeze({
    faixa: 1,
    limiteInferior: 0,
    limiteSuperior: 2428.8,
    aliquota: 0,
    parcelaADeduzir: 0,
    rotuloFaixa: '1ª faixa — Até R$ 2.428,80 (Isento — 0%)'
  }),
  Object.freeze({
    faixa: 2,
    limiteInferior: 2428.81,
    limiteSuperior: 2826.65,
    aliquota: 7.5,
    parcelaADeduzir: 182.16,
    rotuloFaixa: '2ª faixa — De R$ 2.428,81 até R$ 2.826,65 (7,5%)'
  }),
  Object.freeze({
    faixa: 3,
    limiteInferior: 2826.66,
    limiteSuperior: 3751.05,
    aliquota: 15.0,
    parcelaADeduzir: 394.16,
    rotuloFaixa: '3ª faixa — De R$ 2.826,66 até R$ 3.751,05 (15,0%)'
  }),
  Object.freeze({
    faixa: 4,
    limiteInferior: 3751.06,
    limiteSuperior: 4664.68,
    aliquota: 22.5,
    parcelaADeduzir: 675.49,
    rotuloFaixa: '4ª faixa — De R$ 3.751,06 até R$ 4.664,68 (22,5%)'
  }),
  Object.freeze({
    faixa: 5,
    limiteInferior: 4664.69,
    limiteSuperior: Number.POSITIVE_INFINITY,
    aliquota: 27.5,
    parcelaADeduzir: 908.73,
    rotuloFaixa: '5ª faixa — Acima de R$ 4.664,68 (27,5%)'
  })
]);

export const PARAMETROS_CARNE_LEAO_2026 = Object.freeze({
  anoReferencia: ANO_REFERENCIA,
  dataConsultaOficial: DATA_CONSULTA_OFICIAL,
  codigoDarf: '0190',
  minimoDarf: 10.0,
  deducaoPorDependente: 189.59,
  descontoSimplificadoMensal: 607.2,
  percentualDescontoSimplificadoSobreFaixaZero: 25,
  limiteFaixaZero: 2428.8,
  reducaoMensalArt3A: Object.freeze({
    limiteIsencaoTotal: 5000.0,
    reducaoMaximaAte5000: 312.89,
    limiteSuperiorTransicao: 7350.0,
    constanteLinear: 978.62,
    coeficienteLinear: 0.133145
  }),
  tabelaProgressivaMensal: TABELA_PROGRESSIVA_MENSAL_2026,
  fontesOficiais: FONTES_OFICIAIS
});

export const DEFAULTS = Object.freeze({
  mesReferencia: 1,
  anoReferencia: ANO_REFERENCIA,
  rendimentosExterior: 0,
  rendimentosPessoaJuridica: 0,
  despesasLivroCaixa: 0,
  excedenteLivroCaixaMesAnterior: 0,
  contribuicaoPrevidenciaria: 0,
  numeroDependentes: 0,
  pensaoAlimenticia: 0,
  modoDeducao: MODOS_DEDUCAO.AUTOMATICO,
  deducoesJaUtilizadasNaFonte: false,
  inssOuDependentesNoLivroCaixa: false
});

export const LIMITS = Object.freeze({
  maxValorMonetario: 100000000,
  minMesReferencia: 1,
  maxMesReferencia: 12,
  maxDependentes: 50
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

export function roundCurrency(value) {
  const cleaned = Number(Number(value).toPrecision(12));
  return Math.round((cleaned + Number.EPSILON) * 100) / 100;
}

export function roundDecimal(value, decimals = 2) {
  const factor = 10 ** decimals;
  const cleaned = Number(Number(value).toPrecision(12));
  return Math.round((cleaned + Number.EPSILON) * factor) / factor;
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
      const validInteger =
        /^[+-]?\d+$/.test(integerPart) || /^[+-]?\d{1,3}(?:\.\d{3})+$/.test(integerPart);
      if (!validInteger || !/^\d+$/.test(fractionalPart)) return Number.NaN;
      normalized = normalized.replace(/\./g, '').replace(',', '.');
    } else {
      const [integerPart, fractionalPart] = normalized.split('.');
      const validInteger =
        /^[+-]?\d+$/.test(integerPart) || /^[+-]?\d{1,3}(?:,\d{3})+$/.test(integerPart);
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

function normalizeModoDeducao(raw) {
  if (isBlank(raw)) return null;
  const val = String(raw).trim().toLowerCase();
  if (val === MODOS_DEDUCAO.AUTOMATICO || val === 'auto' || val === 'mais_vantajoso') {
    return MODOS_DEDUCAO.AUTOMATICO;
  }
  if (val === MODOS_DEDUCAO.LEGAIS || val === 'legal' || val === 'deducoes_legais') {
    return MODOS_DEDUCAO.LEGAIS;
  }
  if (
    val === MODOS_DEDUCAO.SIMPLIFICADO ||
    val === 'simplificada' ||
    val === 'desconto_simplificado'
  ) {
    return MODOS_DEDUCAO.SIMPLIFICADO;
  }
  return val;
}

/**
 * Enquadra a base de cálculo mensal na tabela progressiva mensal de 2026.
 *
 * @param {number} baseCalculo
 */
export function enquadrarFaixaProgressiva(baseCalculo) {
  const base = Math.max(0, roundCurrency(baseCalculo));
  for (const item of TABELA_PROGRESSIVA_MENSAL_2026) {
    if (base <= item.limiteSuperior) {
      return item;
    }
  }
  return TABELA_PROGRESSIVA_MENSAL_2026[TABELA_PROGRESSIVA_MENSAL_2026.length - 1];
}

/**
 * Calcula o imposto mensal pela tabela progressiva antes da redução do Art. 3º-A.
 *
 * @param {number} baseCalculo
 */
export function calcularImpostoProgressivo(baseCalculo) {
  const base = Math.max(0, roundCurrency(baseCalculo));
  const faixa = enquadrarFaixaProgressiva(base);
  if (faixa.aliquota === 0) {
    return {
      faixa: faixa.faixa,
      aliquota: 0,
      parcelaADeduzir: 0,
      rotuloFaixa: faixa.rotuloFaixa,
      impostoBruto: 0
    };
  }
  const impostoCalculado = roundCurrency(base * (faixa.aliquota / 100) - faixa.parcelaADeduzir);
  return {
    faixa: faixa.faixa,
    aliquota: faixa.aliquota,
    parcelaADeduzir: faixa.parcelaADeduzir,
    rotuloFaixa: faixa.rotuloFaixa,
    impostoBruto: Math.max(0, impostoCalculado)
  };
}

/**
 * Calcula a redução mensal do imposto prevista no Art. 3º-A da Lei nº 9.250/1995
 * (incluído pela Lei nº 15.270/2025, vigente a partir de janeiro de 2026).
 *
 * @param {number} rendimentosTributaveisMensais
 * @param {number} impostoAntesReducao
 */
export function calcularReducaoMensal2026(rendimentosTributaveisMensais, impostoAntesReducao) {
  const rendimentos = Math.max(0, roundCurrency(rendimentosTributaveisMensais));
  const impostoBruto = Math.max(0, roundCurrency(impostoAntesReducao));
  const {
    limiteIsencaoTotal,
    reducaoMaximaAte5000,
    limiteSuperiorTransicao,
    constanteLinear,
    coeficienteLinear
  } = PARAMETROS_CARNE_LEAO_2026.reducaoMensalArt3A;

  if (rendimentos <= limiteIsencaoTotal) {
    const reducaoTabela = reducaoMaximaAte5000;
    const reducaoAplicada = roundCurrency(Math.min(impostoBruto, reducaoTabela));
    return {
      faixaReducao: 'ate_5000',
      descricaoRegraReducao:
        'Rendimentos tributáveis até R$ 5.000,00: redução legal de até R$ 312,89, limitada ao imposto apurado (isenção efetiva na regra padrão).',
      reducaoMaximaCalculada: reducaoTabela,
      reducaoAplicada,
      impostoAposReducao: roundCurrency(Math.max(0, impostoBruto - reducaoAplicada))
    };
  }

  if (rendimentos <= limiteSuperiorTransicao) {
    const formulaBruta = constanteLinear - coeficienteLinear * rendimentos;
    const reducaoTabela = Math.max(0, roundCurrency(formulaBruta));
    const reducaoAplicada = roundCurrency(Math.min(impostoBruto, reducaoTabela));
    return {
      faixaReducao: 'transicao_5000_a_7350',
      descricaoRegraReducao:
        'Rendimentos tributáveis de R$ 5.000,01 até R$ 7.350,00: redução linear decrescente R$ 978,62 − (0,133145 × rendimentos tributáveis mensais), limitada ao imposto apurado.',
      reducaoMaximaCalculada: reducaoTabela,
      reducaoAplicada,
      impostoAposReducao: roundCurrency(Math.max(0, impostoBruto - reducaoAplicada))
    };
  }

  return {
    faixaReducao: 'acima_7350',
    descricaoRegraReducao:
      'Rendimentos tributáveis acima de R$ 7.350,00: sem redução adicional pelo Art. 3º-A da Lei nº 9.250/1995 (aplica-se integralmente a tabela progressiva mensal).',
    reducaoMaximaCalculada: 0,
    reducaoAplicada: 0,
    impostoAposReducao: impostoBruto
  };
}

/**
 * Normaliza as entradas da Calculadora Carnê-Leão para Autônomos.
 *
 * @param {Record<string, unknown>} rawInput
 */
export function normalizeInput(rawInput = {}) {
  const hasMesKey = 'mesReferencia' in rawInput || 'mes' in rawInput;
  const rawMes = hasMesKey ? (rawInput.mesReferencia ?? rawInput.mes) : DEFAULTS.mesReferencia;

  const hasAnoKey = 'anoReferencia' in rawInput || 'ano' in rawInput;
  const rawAno = hasAnoKey ? (rawInput.anoReferencia ?? rawInput.ano) : DEFAULTS.anoReferencia;

  const rawRendPF =
    rawInput.rendimentosPessoaFisica ??
    rawInput.rendimentosPF ??
    rawInput.receitaPessoaFisica;
  const rawRendExt =
    rawInput.rendimentosExterior ??
    rawInput.receitaExterior ??
    rawInput.exterior;
  const rawRendPJ =
    rawInput.rendimentosPessoaJuridica ??
    rawInput.rendimentosPJ ??
    rawInput.receitaPessoaJuridica;

  const rawLivroCaixa =
    rawInput.despesasLivroCaixa ??
    rawInput.livroCaixa ??
    rawInput.despesasDedutiveis;
  const rawInss =
    rawInput.contribuicaoPrevidenciaria ??
    rawInput.inssPago ??
    rawInput.inss;
  const rawDependentes =
    rawInput.numeroDependentes ??
    rawInput.dependentes ??
    rawInput.qtdDependentes;
  const rawPensao =
    rawInput.pensaoAlimenticia ??
    rawInput.pensao;

  const rawExcedenteAnterior =
    rawInput.excedenteLivroCaixaMesAnterior ??
    rawInput.excedenteAnterior ??
    rawInput.excessoLivroCaixaAnterior ??
    rawInput.excedenteMesAnterior;

  const hasModoKey = 'modoDeducao' in rawInput || 'tipoDeducao' in rawInput;
  const rawModo = hasModoKey
    ? (rawInput.modoDeducao ?? rawInput.tipoDeducao)
    : DEFAULTS.modoDeducao;
  const modoDeducao = normalizeModoDeducao(rawModo);

  const pfInformado = !isBlank(rawRendPF);
  const extInformado = !isBlank(rawRendExt);
  const pjInformado = !isBlank(rawRendPJ);
  const algumRendimentoInformado = pfInformado || extInformado || pjInformado;

  const parsedMes = parseFlexibleNumber(rawMes);
  const parsedAno = parseFlexibleNumber(rawAno);
  const parsedPF = pfInformado ? parseFlexibleNumber(rawRendPF) : (algumRendimentoInformado ? 0 : null);
  const parsedExt = extInformado ? parseFlexibleNumber(rawRendExt) : 0;
  const parsedPJ = pjInformado ? parseFlexibleNumber(rawRendPJ) : 0;

  const livroCaixaInformado = !isBlank(rawLivroCaixa);
  const excedenteAnteriorInformado = !isBlank(rawExcedenteAnterior);
  const inssInformado = !isBlank(rawInss);
  const dependentesInformado = !isBlank(rawDependentes);
  const pensaoInformada = !isBlank(rawPensao);

  const parsedLivroCaixa = livroCaixaInformado ? parseFlexibleNumber(rawLivroCaixa) : 0;
  const parsedExcedenteAnterior = excedenteAnteriorInformado
    ? parseFlexibleNumber(rawExcedenteAnterior)
    : 0;
  const parsedInss = inssInformado ? parseFlexibleNumber(rawInss) : 0;
  const parsedDependentes = dependentesInformado ? parseFlexibleNumber(rawDependentes) : 0;
  const parsedPensao = pensaoInformada ? parseFlexibleNumber(rawPensao) : 0;

  const deducoesJaUtilizadasNaFonte = Boolean(
    rawInput.deducoesJaUtilizadasNaFonte ?? rawInput.deducoesJaUsadasNaFonte ?? false
  );
  const inssOuDependentesNoLivroCaixa = Boolean(
    rawInput.inssOuDependentesNoLivroCaixa ?? rawInput.duplicidadeLivroCaixa ?? false
  );
  const somarSimplificadoComLegais = Boolean(rawInput.somarSimplificadoComLegais ?? false);
  const despesasNaoDedutiveisIncluidas = Boolean(
    rawInput.despesasNaoDedutiveisIncluidas ?? false
  );

  return {
    mesInformado: !isBlank(rawMes),
    anoInformado: !isBlank(rawAno),
    pfInformado,
    extInformado,
    pjInformado,
    algumRendimentoInformado,
    livroCaixaInformado,
    excedenteAnteriorInformado,
    inssInformado,
    dependentesInformado,
    pensaoInformada,
    modoInformado: !isBlank(rawModo),
    mesReferencia: parsedMes,
    anoReferencia: parsedAno,
    rendimentosPessoaFisica: parsedPF,
    rendimentosExterior: parsedExt,
    rendimentosPessoaJuridica: parsedPJ,
    despesasLivroCaixa: parsedLivroCaixa,
    excedenteLivroCaixaMesAnterior: parsedExcedenteAnterior,
    contribuicaoPrevidenciaria: parsedInss,
    numeroDependentes: parsedDependentes,
    pensaoAlimenticia: parsedPensao,
    modoDeducao,
    deducoesJaUtilizadasNaFonte,
    inssOuDependentesNoLivroCaixa,
    somarSimplificadoComLegais,
    despesasNaoDedutiveisIncluidas
  };
}

/**
 * Valida os parâmetros normalizados da Calculadora Carnê-Leão para Autônomos.
 *
 * @param {ReturnType<typeof normalizeInput>} input
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateInput(input) {
  const errors = [];

  if (!input || typeof input !== 'object') {
    return {
      valid: false,
      errors: ['Informe os rendimentos e deduções mensais para calcular o Carnê-Leão.']
    };
  }

  if (
    !input.mesInformado ||
    input.mesReferencia === null ||
    Number.isNaN(input.mesReferencia) ||
    !Number.isInteger(input.mesReferencia) ||
    input.mesReferencia < LIMITS.minMesReferencia ||
    input.mesReferencia > LIMITS.maxMesReferencia
  ) {
    errors.push('Selecione um mês de referência válido (de 1 — Janeiro a 12 — Dezembro).');
  }

  if (
    !input.anoInformado ||
    input.anoReferencia === null ||
    Number.isNaN(input.anoReferencia) ||
    !Number.isInteger(input.anoReferencia)
  ) {
    errors.push('Informe um ano de referência válido.');
  } else if (input.anoReferencia !== ANO_REFERENCIA) {
    errors.push(
      `Esta calculadora atende exclusivamente o ano-calendário de ${ANO_REFERENCIA} (regras vigentes a partir de janeiro de 2026 conforme Lei nº 15.270/2025). Para outros anos-calendário, consulte as tabelas históricas no portal da Receita Federal.`
    );
  }

  if (!input.algumRendimentoInformado && (!input.despesasLivroCaixa || input.despesasLivroCaixa === 0) && (!input.excedenteLivroCaixaMesAnterior || input.excedenteLivroCaixaMesAnterior === 0)) {
    errors.push(
      'Informe ao menos um valor de rendimento da atividade profissional (de pessoas físicas, do exterior ou de pessoas jurídicas) ou despesas de Livro-Caixa.'
    );
  }

  if (input.pfInformado) {
    if (input.rendimentosPessoaFisica === null || Number.isNaN(input.rendimentosPessoaFisica)) {
      errors.push('Informe um valor numérico válido para os rendimentos recebidos de pessoas físicas.');
    } else if (input.rendimentosPessoaFisica < 0) {
      errors.push('Os rendimentos recebidos de pessoas físicas não podem ser negativos.');
    } else if (input.rendimentosPessoaFisica > LIMITS.maxValorMonetario) {
      errors.push('Os rendimentos recebidos de pessoas físicas excedem o limite máximo permitido para simulação.');
    }
  }

  if (input.extInformado) {
    if (input.rendimentosExterior === null || Number.isNaN(input.rendimentosExterior)) {
      errors.push('Informe um valor numérico válido em reais para os rendimentos recebidos do exterior.');
    } else if (input.rendimentosExterior < 0) {
      errors.push('Os rendimentos recebidos do exterior não podem ser negativos.');
    } else if (input.rendimentosExterior > LIMITS.maxValorMonetario) {
      errors.push('Os rendimentos recebidos do exterior excedem o limite máximo permitido para simulação.');
    }
  }

  if (input.pjInformado) {
    if (input.rendimentosPessoaJuridica === null || Number.isNaN(input.rendimentosPessoaJuridica)) {
      errors.push('Informe um valor numérico válido para os rendimentos recebidos de pessoas jurídicas.');
    } else if (input.rendimentosPessoaJuridica < 0) {
      errors.push('Os rendimentos recebidos de pessoas jurídicas não podem ser negativos.');
    } else if (input.rendimentosPessoaJuridica > LIMITS.maxValorMonetario) {
      errors.push('Os rendimentos recebidos de pessoas jurídicas excedem o limite máximo permitido.');
    }
  }

  if (input.livroCaixaInformado) {
    if (input.despesasLivroCaixa === null || Number.isNaN(input.despesasLivroCaixa)) {
      errors.push('Informe um valor numérico válido para as despesas dedutíveis de Livro-Caixa.');
    } else if (input.despesasLivroCaixa < 0) {
      errors.push('As despesas de Livro-Caixa não podem ser negativas.');
    } else if (input.despesasLivroCaixa > LIMITS.maxValorMonetario) {
      errors.push('As despesas de Livro-Caixa informadas excedem o limite máximo permitido.');
    }
  }

  if (input.excedenteAnteriorInformado) {
    if (
      input.excedenteLivroCaixaMesAnterior === null ||
      Number.isNaN(input.excedenteLivroCaixaMesAnterior)
    ) {
      errors.push('Informe um valor numérico válido para o excedente de Livro-Caixa do mês anterior.');
    } else if (input.excedenteLivroCaixaMesAnterior < 0) {
      errors.push('O excedente de despesas do Livro-Caixa do mês anterior não pode ser negativo.');
    } else if (input.excedenteLivroCaixaMesAnterior > LIMITS.maxValorMonetario) {
      errors.push('O excedente de despesas do mês anterior excede o limite máximo permitido.');
    } else if (input.mesReferencia === 1 && input.excedenteLivroCaixaMesAnterior > 0) {
      errors.push(
        'Para o mês de Janeiro, não é permitido transportar excedente de despesas de Livro-Caixa do ano anterior (IN RFB nº 1.500/2014, art. 104, § 2º). Informe 0 para janeiro ou selecione um mês de fevereiro a dezembro.'
      );
    }
  }

  if (input.inssInformado) {
    if (
      input.contribuicaoPrevidenciaria === null ||
      Number.isNaN(input.contribuicaoPrevidenciaria)
    ) {
      errors.push('Informe um valor numérico válido para a contribuição previdenciária oficial (INSS).');
    } else if (input.contribuicaoPrevidenciaria < 0) {
      errors.push('A contribuição previdenciária oficial (INSS) não pode ser negativa.');
    } else if (input.contribuicaoPrevidenciaria > LIMITS.maxValorMonetario) {
      errors.push('A contribuição previdenciária informada excede o limite máximo permitido.');
    }
  }

  if (input.dependentesInformado) {
    if (
      input.numeroDependentes === null ||
      Number.isNaN(input.numeroDependentes) ||
      !Number.isInteger(input.numeroDependentes)
    ) {
      errors.push('Informe a quantidade de dependentes como um número inteiro (0 ou mais).');
    } else if (input.numeroDependentes < 0) {
      errors.push('A quantidade de dependentes não pode ser negativa.');
    } else if (input.numeroDependentes > LIMITS.maxDependentes) {
      errors.push(`A quantidade de dependentes não pode exceder ${LIMITS.maxDependentes}.`);
    }
  }

  if (input.pensaoInformada) {
    if (input.pensaoAlimenticia === null || Number.isNaN(input.pensaoAlimenticia)) {
      errors.push('Informe um valor numérico válido para a pensão alimentícia dedutível.');
    } else if (input.pensaoAlimenticia < 0) {
      errors.push('O valor da pensão alimentícia não pode ser negativo.');
    } else if (input.pensaoAlimenticia > LIMITS.maxValorMonetario) {
      errors.push('O valor da pensão alimentícia informado excede o limite máximo permitido.');
    }
  }

  if (
    !input.modoInformado ||
    !input.modoDeducao ||
    !Object.values(MODOS_DEDUCAO).includes(input.modoDeducao)
  ) {
    errors.push(
      'Selecione um modo de dedução válido (automático, deduções legais ou desconto simplificado mensal).',
      'O desconto simplificado mensal (R$ 607,20) e as deduções legais são mutuamente exclusivos e não podem ser somados.'
    );
  }

  if (input.somarSimplificadoComLegais) {
    errors.push(
      'Prevenção de dupla dedução: o desconto simplificado mensal (R$ 607,20) substitui as deduções legais (Art. 4º, § 2º da Lei nº 9.250/1995) e não pode ser somado a Livro-Caixa, INSS, dependentes ou pensão alimentícia.'
    );
  }

  if (
    input.deducoesJaUtilizadasNaFonte &&
    ((input.contribuicaoPrevidenciaria && input.contribuicaoPrevidenciaria > 0) ||
      (input.numeroDependentes && input.numeroDependentes > 0) ||
      (input.pensaoAlimenticia && input.pensaoAlimenticia > 0))
  ) {
    errors.push(
      'Prevenção de dupla dedução: contribuições previdenciárias, dependentes ou pensão alimentícia já utilizados para deduzir rendimentos sujeitos à retenção na fonte (IRRF) no mesmo mês não podem ser deduzidos novamente no Carnê-Leão (IN RFB nº 1.500/2014, art. 56, parágrafo único).'
    );
  }

  if (input.inssOuDependentesNoLivroCaixa) {
    errors.push(
      'Prevenção de dupla dedução: não inclua contribuição previdenciária própria, dependentes ou pensão alimentícia dentro das despesas de Livro-Caixa. Informe cada rubrica apenas no seu campo específico.'
    );
  }

  if (input.despesasNaoDedutiveisIncluidas) {
    errors.push(
      'Despesas não dedutíveis no Livro-Caixa: bens de capital/equipamentos permanentes, gastos pessoais ou despesas sem comprovação fiscal idônea não podem ser deduzidos como custeio no Livro-Caixa (IN RFB nº 1.500/2014, art. 104).'
    );
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Calcula um cenário completo de apuração mensal dada a dedução escolhida.
 *
 * @param {number} rendimentosSujeitos
 * @param {number} deducaoEscolhida
 */
function apurarCenarioMensal(rendimentosSujeitos, deducaoEscolhida) {
  const deducaoEfetiva = roundCurrency(Math.min(rendimentosSujeitos, Math.max(0, deducaoEscolhida)));
  const baseCalculo = roundCurrency(Math.max(0, rendimentosSujeitos - deducaoEfetiva));
  const progressivo = calcularImpostoProgressivo(baseCalculo);
  const reducao = calcularReducaoMensal2026(rendimentosSujeitos, progressivo.impostoBruto);
  return {
    deducaoConsiderada: roundCurrency(deducaoEscolhida),
    deducaoEfetivaNaBase: deducaoEfetiva,
    baseCalculo,
    faixa: progressivo.faixa,
    rotuloFaixa: progressivo.rotuloFaixa,
    aliquotaNominal: progressivo.aliquota,
    parcelaADeduzir: progressivo.parcelaADeduzir,
    impostoAntesReducao: progressivo.impostoBruto,
    faixaReducao: reducao.faixaReducao,
    descricaoRegraReducao: reducao.descricaoRegraReducao,
    reducaoMaximaCalculada: reducao.reducaoMaximaCalculada,
    reducaoAplicada: reducao.reducaoAplicada,
    impostoDevido: reducao.impostoAposReducao
  };
}

/**
 * Executa o cálculo mensal estimado do Carnê-Leão para Autônomos (ano-base 2026).
 *
 * @param {Record<string, unknown>} rawInput
 */
export function calculate(rawInput = {}) {
  const normalized =
    rawInput &&
    typeof rawInput === 'object' &&
    'algumRendimentoInformado' in rawInput &&
    'mesInformado' in rawInput
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

  const mesReferencia = normalized.mesReferencia;
  const mesNome = MESES_ANO[mesReferencia];
  const anoReferencia = normalized.anoReferencia;
  const periodoRotulo = `${mesNome}/${anoReferencia}`;

  const rendimentosPessoaFisica = roundCurrency(normalized.rendimentosPessoaFisica);
  const rendimentosExterior = roundCurrency(normalized.rendimentosExterior);
  const rendimentosSujeitosCarneLeao = roundCurrency(
    rendimentosPessoaFisica + rendimentosExterior
  );

  const rendimentosPessoaJuridica = roundCurrency(normalized.rendimentosPessoaJuridica);
  const possuiRendimentosPJ = rendimentosPessoaJuridica > 0;

  // Limite legal de Livro-Caixa: receita total decorrente da prestação de serviços sem vínculo
  // da respectiva atividade profissional no mês, inclusive recebida de pessoa jurídica
  // (IN RFB nº 1.500/2014, art. 104, § 1º)
  const receitaElegivelLivroCaixa = roundCurrency(
    rendimentosSujeitosCarneLeao + rendimentosPessoaJuridica
  );
  const totalRendimentosInformados = receitaElegivelLivroCaixa;

  // Despesas de Livro-Caixa pagas no mês e excedente de despesas transportado do mês anterior
  const despesasLivroCaixaPagasMes = roundCurrency(normalized.despesasLivroCaixa);
  const excedenteLivroCaixaAnterior =
    mesReferencia === 1 ? 0 : roundCurrency(normalized.excedenteLivroCaixaMesAnterior);
  const despesasLivroCaixaDisponiveis = roundCurrency(
    despesasLivroCaixaPagasMes + excedenteLivroCaixaAnterior
  );

  // Despesas aceitas na atividade profissional (limitadas à receita total da atividade no mês)
  const limiteDeducaoLivroCaixa = receitaElegivelLivroCaixa;
  const despesasLivroCaixaAceitasNaAtividade = roundCurrency(
    Math.min(despesasLivroCaixaDisponiveis, limiteDeducaoLivroCaixa)
  );
  const excedenteLivroCaixaRemanescente = roundCurrency(
    Math.max(0, despesasLivroCaixaDisponiveis - despesasLivroCaixaAceitasNaAtividade)
  );
  const livroCaixaLimitadoPelaReceita = excedenteLivroCaixaRemanescente > 0;
  const excedenteTransponivelMesSeguinte = livroCaixaLimitadoPelaReceita && mesReferencia < 12;
  const excedenteNaoAproveitadoDezembro = livroCaixaLimitadoPelaReceita && mesReferencia === 12;

  // Dedução das despesas aceitas na base mensal do Carnê-Leão (que incide sobre PF + Exterior)
  const despesasLivroCaixaAceitas = despesasLivroCaixaAceitasNaAtividade;
  const deducaoLivroCaixaNaBaseCarneLeao = roundCurrency(
    Math.min(despesasLivroCaixaAceitasNaAtividade, rendimentosSujeitosCarneLeao)
  );
  const livroCaixaAbsorvidoPelaPJ = roundCurrency(
    Math.max(0, despesasLivroCaixaAceitasNaAtividade - deducaoLivroCaixaNaBaseCarneLeao)
  );

  const contribuicaoPrevidenciaria = roundCurrency(normalized.contribuicaoPrevidenciaria);
  const numeroDependentes = normalized.numeroDependentes;
  const deducaoDependentes = roundCurrency(
    numeroDependentes * PARAMETROS_CARNE_LEAO_2026.deducaoPorDependente
  );
  const pensaoAlimenticia = roundCurrency(normalized.pensaoAlimenticia);

  const deducoesLegaisTotal = roundCurrency(
    despesasLivroCaixaAceitasNaAtividade +
      contribuicaoPrevidenciaria +
      deducaoDependentes +
      pensaoAlimenticia
  );

  const descontoSimplificadoMensal = PARAMETROS_CARNE_LEAO_2026.descontoSimplificadoMensal;

  // Comparação entre as duas alternativas mutuamente exclusivas (Deduções Legais vs. Desconto Simplificado)
  const cenarioLegais = apurarCenarioMensal(rendimentosSujeitosCarneLeao, deducoesLegaisTotal);
  const cenarioSimplificado = apurarCenarioMensal(
    rendimentosSujeitosCarneLeao,
    descontoSimplificadoMensal
  );

  const modoDeducao = normalized.modoDeducao;
  let tipoDeducaoAplicada;
  let cenarioEscolhido;

  if (modoDeducao === MODOS_DEDUCAO.LEGAIS) {
    tipoDeducaoAplicada = MODOS_DEDUCAO.LEGAIS;
    cenarioEscolhido = cenarioLegais;
  } else if (modoDeducao === MODOS_DEDUCAO.SIMPLIFICADO) {
    tipoDeducaoAplicada = MODOS_DEDUCAO.SIMPLIFICADO;
    cenarioEscolhido = cenarioSimplificado;
  } else {
    // Modo automático: escolhe a alternativa legalmente permitida que resulta em maior dedução / menor base
    if (deducoesLegaisTotal >= descontoSimplificadoMensal || rendimentosSujeitosCarneLeao === 0) {
      tipoDeducaoAplicada = MODOS_DEDUCAO.LEGAIS;
      cenarioEscolhido = cenarioLegais;
    } else {
      tipoDeducaoAplicada = MODOS_DEDUCAO.SIMPLIFICADO;
      cenarioEscolhido = cenarioSimplificado;
    }
  }

  const tipoDeducaoAplicadaRotulo =
    tipoDeducaoAplicada === MODOS_DEDUCAO.SIMPLIFICADO
      ? 'Desconto Simplificado Mensal (R$ 607,20 — 25% do limite da faixa de alíquota zero, em substituição às deduções legais)'
      : 'Deduções Legais (soma de Livro-Caixa aceito + INSS + dependentes + pensão alimentícia)';

  const baseCalculoMensal = cenarioEscolhido.baseCalculo;
  const faixaAplicavel = cenarioEscolhido.faixa;
  const faixaRotulo = cenarioEscolhido.rotuloFaixa;
  const aliquotaNominal = cenarioEscolhido.aliquotaNominal;
  const parcelaADeduzir = cenarioEscolhido.parcelaADeduzir;
  const impostoAntesReducao = cenarioEscolhido.impostoAntesReducao;
  const reducaoMaximaCalculada = cenarioEscolhido.reducaoMaximaCalculada;
  const reducaoAplicada = cenarioEscolhido.reducaoAplicada;
  const descricaoRegraReducao = cenarioEscolhido.descricaoRegraReducao;
  const impostoDevido = cenarioEscolhido.impostoDevido;

  const aliquotaEfetiva =
    rendimentosSujeitosCarneLeao > 0
      ? roundDecimal((impostoDevido / rendimentosSujeitosCarneLeao) * 100, 2)
      : 0;

  const abaixoMinimoDarf =
    impostoDevido > 0 && impostoDevido < PARAMETROS_CARNE_LEAO_2026.minimoDarf;

  // Valores estimados após o imposto (claramente identificados como estimativa)
  const valorEstimadoAposImposto = roundCurrency(
    rendimentosSujeitosCarneLeao - impostoDevido
  );
  const desembolsosDedutiveisInformados = roundCurrency(
    despesasLivroCaixaPagasMes + contribuicaoPrevidenciaria + pensaoAlimenticia
  );
  const saldoEstimadoAposImpostoEDesembolsos = roundCurrency(
    rendimentosSujeitosCarneLeao - desembolsosDedutiveisInformados - impostoDevido
  );

  const avisoRendimentosPJ = possuiRendimentosPJ
    ? rendimentosSujeitosCarneLeao === 0
      ? `Rendimentos recebidos exclusivamente de pessoas jurídicas sofrem retenção de IRRF na fonte pela empresa pagadora (exceto serventuários da Justiça) e NÃO estão sujeitos ao recolhimento mensal de Carnê-Leão (imposto devido = R$ 0,00). O valor de ${formatCurrency(rendimentosPessoaJuridica)} foi utilizado para estabelecer o teto de dedução do Livro-Caixa da sua atividade profissional no mês (IN RFB nº 1.500/2014, art. 104, § 1º).`
      : `Você informou ${formatCurrency(rendimentosPessoaJuridica)} recebidos de pessoa jurídica na prestação de serviços sem vínculo. Conforme o art. 104, § 1º da IN RFB nº 1.500/2014, essa receita integra o limite de dedução mensal do Livro-Caixa da atividade (${formatCurrency(receitaElegivelLivroCaixa)}). No entanto, por sofrer retenção de IRRF na fonte pela empresa pagadora, ela NÃO entra na base do Carnê-Leão, que incide apenas sobre os ${formatCurrency(rendimentosSujeitosCarneLeao)} recebidos de pessoas físicas e do exterior.`
    : null;

  const avisoLivroCaixa = livroCaixaLimitadoPelaReceita
    ? mesReferencia < 12
      ? `O total de despesas de Livro-Caixa disponíveis no mês (${formatCurrency(despesasLivroCaixaDisponiveis)}) superou a receita da atividade profissional (${formatCurrency(receitaElegivelLivroCaixa)}). Foram aproveitados ${formatCurrency(despesasLivroCaixaAceitasNaAtividade)} na atividade, e o excedente de ${formatCurrency(excedenteLivroCaixaRemanescente)} pode ser transportado para dedução nos meses seguintes até dezembro de ${anoReferencia} (IN RFB nº 1.500/2014, art. 104, § 1º).`
      : `O total de despesas de Livro-Caixa disponíveis em dezembro (${formatCurrency(despesasLivroCaixaDisponiveis)}) superou a receita da atividade profissional (${formatCurrency(receitaElegivelLivroCaixa)}). Foram aproveitados ${formatCurrency(despesasLivroCaixaAceitasNaAtividade)} na atividade neste mês. Como a competência é dezembro, o excedente de ${formatCurrency(excedenteLivroCaixaRemanescente)} NÃO pode ser transportado para o ano-calendário seguinte (IN RFB nº 1.500/2014, art. 104, § 2º).`
    : null;

  const avisoDarfMinimo = abaixoMinimoDarf
    ? `O Carnê-Leão apurado no mês (${formatCurrency(impostoDevido)}) é inferior ao limite mínimo de R$ 10,00 para emissão de DARF (Lei nº 9.430/1996, art. 68). Esse valor não deve ser recolhido em DARF isolado neste mês, devendo ser somado ao imposto que vier a ser apurado nos meses subsequentes até atingir R$ 10,00 ou mais.`
    : impostoDevido === 0
      ? 'Não há valor de Carnê-Leão a recolher em DARF (código 0190) para a competência e os dados informados.'
      : `Estimativa sujeita a recolhimento via DARF (código 0190) até o último dia útil do mês subsequente ao do recebimento (${mesReferencia === 12 ? `janeiro de ${anoReferencia + 1}` : `${MESES_ANO[mesReferencia + 1].toLowerCase()} de ${anoReferencia}`}).`;

  const memoriaCalculo = [
    `1. Receitas da atividade profissional (${periodoRotulo}): ${formatCurrency(rendimentosPessoaFisica)} (PF) + ${formatCurrency(rendimentosExterior)} (Exterior) + ${formatCurrency(rendimentosPessoaJuridica)} (PJ sem vínculo) = ${formatCurrency(receitaElegivelLivroCaixa)} (teto legal para apuração do Livro-Caixa no mês, conforme Art. 104, § 1º da IN RFB nº 1.500/2014).`,
    `2. Rendimentos sujeitos ao Carnê-Leão: ${formatCurrency(rendimentosPessoaFisica)} (PF) + ${formatCurrency(rendimentosExterior)} (Exterior) = ${formatCurrency(rendimentosSujeitosCarneLeao)}${possuiRendimentosPJ ? ` (receitas de PJ de ${formatCurrency(rendimentosPessoaJuridica)} excluídas por sofrerem retenção de IRRF na fonte)` : ''}.`,
    `3. Apuração do Livro-Caixa: ${formatCurrency(despesasLivroCaixaPagasMes)} pagas no mês${excedenteLivroCaixaAnterior > 0 ? ` + ${formatCurrency(excedenteLivroCaixaAnterior)} de excedente do mês anterior` : ''} = ${formatCurrency(despesasLivroCaixaDisponiveis)} disponíveis → despesas aceitas = ${formatCurrency(despesasLivroCaixaAceitasNaAtividade)} (limitadas à receita da atividade de ${formatCurrency(receitaElegivelLivroCaixa)})${livroCaixaLimitadoPelaReceita ? `; excedente remanescente de ${formatCurrency(excedenteLivroCaixaRemanescente)}${mesReferencia < 12 ? ' (transportável até dezembro)' : ' (não transferível para o ano seguinte)'}` : ''}.`,
    `4. Deduções Legais elegíveis: Livro-Caixa aceito ${formatCurrency(despesasLivroCaixaAceitasNaAtividade)} + INSS ${formatCurrency(contribuicaoPrevidenciaria)} + Dependentes (${numeroDependentes} × ${formatCurrency(PARAMETROS_CARNE_LEAO_2026.deducaoPorDependente)} = ${formatCurrency(deducaoDependentes)}) + Pensão alimentícia ${formatCurrency(pensaoAlimenticia)} = ${formatCurrency(deducoesLegaisTotal)}.`,
    `5. Comparação com o Desconto Simplificado Mensal (${formatCurrency(descontoSimplificadoMensal)} — mutuamente exclusivo): selecionado "${tipoDeducaoAplicada === MODOS_DEDUCAO.SIMPLIFICADO ? 'Desconto Simplificado Mensal' : 'Deduções Legais'}" com dedução considerada de ${formatCurrency(cenarioEscolhido.deducaoConsiderada)} (${formatCurrency(cenarioEscolhido.deducaoEfetivaNaBase)} abatidos da base do Carnê-Leão).`,
    `6. Base de cálculo mensal do Carnê-Leão: ${formatCurrency(rendimentosSujeitosCarneLeao)} − ${formatCurrency(cenarioEscolhido.deducaoEfetivaNaBase)} = ${formatCurrency(baseCalculoMensal)}.`,
    `7. Enquadramento na tabela progressiva mensal (${anoReferencia}): ${faixaRotulo}, parcela a deduzir de ${formatCurrency(parcelaADeduzir)} → Imposto antes da redução = ${formatCurrency(baseCalculoMensal)} × ${formatPercent(aliquotaNominal)} − ${formatCurrency(parcelaADeduzir)} = ${formatCurrency(impostoAntesReducao)}.`,
    `8. Redução mensal (Art. 3º-A da Lei nº 9.250/1995, Lei nº 15.270/2025): para rendimentos tributáveis de ${formatCurrency(rendimentosSujeitosCarneLeao)}, redução máxima da faixa = ${formatCurrency(reducaoMaximaCalculada)} → redução aplicada = ${formatCurrency(reducaoAplicada)}.`,
    `9. Carnê-Leão mensal estimado: ${formatCurrency(impostoAntesReducao)} − ${formatCurrency(reducaoAplicada)} = ${formatCurrency(impostoDevido)} (alíquota efetiva estimada de ${formatPercent(aliquotaEfetiva)} sobre os rendimentos sujeitos ao Carnê-Leão).`
  ];

  return {
    ok: true,
    valid: true,
    errors: [],
    anoReferencia,
    dataConsultaOficial: DATA_CONSULTA_OFICIAL,
    fontesOficiais: FONTES_OFICIAIS,
    value: impostoDevido,
    unit: 'BRL',
    data: {
      mesReferencia,
      mesNome,
      anoReferencia,
      periodoRotulo,
      rendimentos: {
        pessoaFisica: rendimentosPessoaFisica,
        exterior: rendimentosExterior,
        sujeitosCarneLeao: rendimentosSujeitosCarneLeao,
        pessoaJuridicaNaoSujeito: rendimentosPessoaJuridica,
        possuiRendimentosPJ,
        receitaElegivelLivroCaixa,
        totalInformado: totalRendimentosInformados
      },
      deducoes: {
        modoSelecionado: modoDeducao,
        modoSelecionadoRotulo: ROTULOS_MODO_DEDUCAO[modoDeducao],
        tipoDeducaoAplicada,
        tipoDeducaoAplicadaRotulo,
        receitaElegivelLivroCaixa,
        limiteDeducaoLivroCaixa,
        despesasLivroCaixaPagasMes,
        excedenteLivroCaixaAnterior,
        despesasLivroCaixaDisponiveis,
        livroCaixaAceitoNaAtividade: despesasLivroCaixaAceitasNaAtividade,
        livroCaixaDeduzidoNaBaseCarneLeao: deducaoLivroCaixaNaBaseCarneLeao,
        livroCaixaAbsorvidoPelaPJ,
        livroCaixaInformado: despesasLivroCaixaPagasMes,
        livroCaixaAceito: despesasLivroCaixaAceitasNaAtividade,
        excedenteLivroCaixa: excedenteLivroCaixaRemanescente,
        excedenteLivroCaixaRemanescente,
        livroCaixaLimitadoPelaReceita,
        excedenteTransponivelMesSeguinte,
        excedenteNaoAproveitadoDezembro,
        contribuicaoPrevidenciaria,
        numeroDependentes,
        valorPorDependente: PARAMETROS_CARNE_LEAO_2026.deducaoPorDependente,
        deducaoDependentes,
        pensaoAlimenticia,
        deducoesLegaisTotal,
        descontoSimplificadoMensal,
        deducaoConsiderada: cenarioEscolhido.deducaoConsiderada,
        deducaoEfetivaNaBase: cenarioEscolhido.deducaoEfetivaNaBase
      },
      comparacaoDeducoes: {
        legais: cenarioLegais,
        simplificado: cenarioSimplificado,
        diferencaImposto: roundCurrency(
          cenarioLegais.impostoDevido - cenarioSimplificado.impostoDevido
        )
      },
      apuracao: {
        baseCalculoMensal,
        faixa: faixaAplicavel,
        faixaRotulo,
        aliquotaNominal,
        parcelaADeduzir,
        impostoAntesReducao,
        faixaReducao: cenarioEscolhido.faixaReducao,
        descricaoRegraReducao,
        reducaoMaximaCalculada,
        reducaoAplicada,
        impostoDevido,
        aliquotaEfetiva,
        codigoDarf: PARAMETROS_CARNE_LEAO_2026.codigoDarf,
        abaixoMinimoDarf,
        valorEstimadoAposImposto,
        desembolsosDedutiveisInformados,
        saldoEstimadoAposImpostoEDesembolsos
      },
      avisos: {
        avisoRendimentosPJ,
        avisoLivroCaixa,
        avisoDarfMinimo
      },
      memoriaCalculo
    }
  };
}

export const calculateCarneLeao = calculate;

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
  const rendimentosItems = [
    { label: 'Competência (mês/ano)', value: d.periodoRotulo },
    {
      label: 'Rendimentos recebidos de Pessoas Físicas',
      value: formatCurrency(d.rendimentos.pessoaFisica)
    },
    {
      label: 'Rendimentos recebidos do Exterior',
      value: formatCurrency(d.rendimentos.exterior)
    },
    {
      label: 'Total de rendimentos sujeitos ao Carnê-Leão',
      value: formatCurrency(d.rendimentos.sujeitosCarneLeao)
    }
  ];

  if (d.rendimentos.possuiRendimentosPJ) {
    rendimentosItems.push(
      {
        label: 'Rendimentos de Pessoa Jurídica (não sujeitos ao Carnê-Leão)',
        value: `${formatCurrency(d.rendimentos.pessoaJuridicaNaoSujeito)} (excluídos da base do Carnê-Leão)`
      },
      {
        label: 'Total geral de rendimentos informados',
        value: formatCurrency(d.rendimentos.totalInformado)
      }
    );
  }

  const deducoesItems = [
    { label: 'Modo de dedução selecionado', value: d.deducoes.modoSelecionadoRotulo },
    { label: 'Dedução efetivamente aplicada na base', value: d.deducoes.tipoDeducaoAplicadaRotulo },
    {
      label: 'Receitas da atividade profissional (teto do Livro-Caixa)',
      value: formatCurrency(d.deducoes.receitaElegivelLivroCaixa)
    },
    {
      label: 'Despesas de Livro-Caixa pagas no mês',
      value: formatCurrency(d.deducoes.despesasLivroCaixaPagasMes)
    }
  ];

  if (d.deducoes.excedenteLivroCaixaAnterior > 0) {
    deducoesItems.push({
      label: 'Excedente de Livro-Caixa trazido do mês anterior',
      value: formatCurrency(d.deducoes.excedenteLivroCaixaAnterior)
    });
  }

  deducoesItems.push(
    {
      label: 'Total de despesas de Livro-Caixa disponíveis',
      value: formatCurrency(d.deducoes.despesasLivroCaixaDisponiveis)
    },
    {
      label: 'Despesas de Livro-Caixa aceitas no mês',
      value: `${formatCurrency(d.deducoes.livroCaixaAceitoNaAtividade)} (limitadas ao teto de ${formatCurrency(d.deducoes.limiteDeducaoLivroCaixa)})`
    }
  );

  if (d.deducoes.livroCaixaLimitadoPelaReceita) {
    deducoesItems.push({
      label: 'Excedente de Livro-Caixa remanescente',
      value: `${formatCurrency(d.deducoes.excedenteLivroCaixaRemanescente)} (${d.deducoes.excedenteTransponivelMesSeguinte ? 'transportável para os meses seguintes até dezembro' : 'não transferível para o ano seguinte'})`
    });
  }

  deducoesItems.push(
    {
      label: 'Contribuição previdenciária oficial (INSS)',
      value: formatCurrency(d.deducoes.contribuicaoPrevidenciaria)
    },
    {
      label: 'Dependentes elegíveis',
      value: `${d.deducoes.numeroDependentes} (${formatCurrency(d.deducoes.deducaoDependentes)})`
    },
    {
      label: 'Pensão alimentícia dedutível',
      value: formatCurrency(d.deducoes.pensaoAlimenticia)
    },
    {
      label: 'Soma das Deduções Legais elegíveis',
      value: formatCurrency(d.deducoes.deducoesLegaisTotal)
    },
    {
      label: 'Desconto Simplificado Mensal (alternativo)',
      value: formatCurrency(d.deducoes.descontoSimplificadoMensal)
    },
    {
      label: 'Valor de dedução abatido da base de cálculo do Carnê-Leão',
      value: formatCurrency(d.deducoes.deducaoEfetivaNaBase)
    }
  );

  return [
    {
      title: `Rendimentos Informados (${d.periodoRotulo})`,
      items: rendimentosItems
    },
    {
      title: 'Deduções e Alternativa Simplificada (Mutuamente Exclusivas)',
      items: deducoesItems
    },
    {
      title: 'Apuração Mensal do Carnê-Leão (Referência 2026)',
      items: [
        { label: 'Base de cálculo mensal do Carnê-Leão', value: formatCurrency(d.apuracao.baseCalculoMensal) },
        { label: 'Faixa e alíquota nominal', value: d.apuracao.faixaRotulo },
        { label: 'Parcela a deduzir da faixa', value: formatCurrency(d.apuracao.parcelaADeduzir) },
        {
          label: 'Imposto pela tabela progressiva (antes da redução)',
          value: formatCurrency(d.apuracao.impostoAntesReducao)
        },
        {
          label: 'Redução mensal aplicável (Art. 3º-A da Lei nº 9.250/1995)',
          value: `${formatCurrency(d.apuracao.reducaoAplicada)} (limite calculado na faixa: ${formatCurrency(d.apuracao.reducaoMaximaCalculada)})`
        },
        {
          label: 'Valor estimado do Carnê-Leão devido',
          value: formatCurrency(d.apuracao.impostoDevido)
        },
        {
          label: 'Alíquota efetiva estimada',
          value: formatPercent(d.apuracao.aliquotaEfetiva)
        },
        {
          label: 'Valor estimado dos rendimentos após o Carnê-Leão',
          value: `${formatCurrency(d.apuracao.valorEstimadoAposImposto)} (estimativa mensal antes de outras despesas)`
        },
        {
          label: 'Saldo estimado após Carnê-Leão e desembolsos informados',
          value: `${formatCurrency(d.apuracao.saldoEstimadoAposImpostoEDesembolsos)} (estimativa mensal líquida de Livro-Caixa, INSS, pensão e Carnê-Leão)`
        },
        { label: 'Situação do DARF (código 0190)', value: d.avisos.avisoDarfMinimo }
      ]
    },
    {
      title: 'Memória de Cálculo Passo a Passo',
      items: d.memoriaCalculo.map((passo, idx) => ({
        label: `Passo ${idx + 1}`,
        value: passo.replace(/^\d+\.\s*/, '')
      }))
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
  const lines = ['Calculadora Carnê-Leão para Autônomos — Calculadora Master', ''];
  for (const sec of sections) {
    if (sec.title) lines.push(sec.title);
    for (const item of sec.items || []) {
      lines.push(`${item.label}: ${item.value}`);
    }
    lines.push('');
  }

  const livroCaixaResumo = d.deducoes.excedenteLivroCaixaAnterior > 0
    ? `${formatCurrency(d.deducoes.livroCaixaAceito)} aceitos de ${formatCurrency(d.deducoes.despesasLivroCaixaDisponiveis)} disponíveis (${formatCurrency(d.deducoes.despesasLivroCaixaPagasMes)} no mês + ${formatCurrency(d.deducoes.excedenteLivroCaixaAnterior)} do mês anterior; teto da atividade: ${formatCurrency(d.deducoes.receitaElegivelLivroCaixa)})`
    : d.deducoes.livroCaixaLimitadoPelaReceita
      ? `${formatCurrency(d.deducoes.livroCaixaAceito)} aceitos de ${formatCurrency(d.deducoes.despesasLivroCaixaDisponiveis)} informados (teto da atividade: ${formatCurrency(d.deducoes.receitaElegivelLivroCaixa)}; excedente remanescente: ${formatCurrency(d.deducoes.excedenteLivroCaixaRemanescente)})`
      : `${formatCurrency(d.deducoes.livroCaixaAceito)} (teto da atividade: ${formatCurrency(d.deducoes.receitaElegivelLivroCaixa)})`;

  return {
    text: formatCurrency(d.apuracao.impostoDevido),
    summary: lines.join('\n').trim(),
    periodoRotulo: d.periodoRotulo,
    totalRendimentosInformados: formatCurrency(d.rendimentos.totalInformado),
    rendimentosSujeitosCarneLeao: formatCurrency(d.rendimentos.sujeitosCarneLeao),
    rendimentosPF: formatCurrency(d.rendimentos.pessoaFisica),
    rendimentosExterior: formatCurrency(d.rendimentos.exterior),
    rendimentosPJNaoSujeito: formatCurrency(d.rendimentos.pessoaJuridicaNaoSujeito),
    receitaElegivelLivroCaixa: formatCurrency(d.deducoes.receitaElegivelLivroCaixa),
    limiteDeducaoLivroCaixa: formatCurrency(d.deducoes.limiteDeducaoLivroCaixa),
    despesasLivroCaixaPagasMes: formatCurrency(d.deducoes.despesasLivroCaixaPagasMes),
    excedenteLivroCaixaAnterior: formatCurrency(d.deducoes.excedenteLivroCaixaAnterior),
    despesasLivroCaixaDisponiveis: formatCurrency(d.deducoes.despesasLivroCaixaDisponiveis),
    excedenteLivroCaixaRemanescente: formatCurrency(d.deducoes.excedenteLivroCaixaRemanescente),
    tipoDeducaoAplicada: d.deducoes.tipoDeducaoAplicadaRotulo,
    deducoesLegaisTotal: formatCurrency(d.deducoes.deducoesLegaisTotal),
    descontoSimplificadoMensal: formatCurrency(d.deducoes.descontoSimplificadoMensal),
    deducaoAceitaNoCalculo: `${formatCurrency(d.deducoes.deducaoEfetivaNaBase)} (${d.deducoes.tipoDeducaoAplicada === MODOS_DEDUCAO.SIMPLIFICADO ? 'Desconto Simplificado Mensal de R$ 607,20' : 'Deduções Legais'})`,
    livroCaixaResumo,
    inssResumo: formatCurrency(d.deducoes.contribuicaoPrevidenciaria),
    dependentesResumo: `${d.deducoes.numeroDependentes} dependente(s) — ${formatCurrency(d.deducoes.deducaoDependentes)}`,
    pensaoResumo: formatCurrency(d.deducoes.pensaoAlimenticia),
    baseCalculoMensal: formatCurrency(d.apuracao.baseCalculoMensal),
    faixaEAliquota: `${d.apuracao.faixaRotulo} | Parcela a deduzir: ${formatCurrency(d.apuracao.parcelaADeduzir)}`,
    impostoAntesReducao: formatCurrency(d.apuracao.impostoAntesReducao),
    reducaoLegalAplicada: `${formatCurrency(d.apuracao.reducaoAplicada)} (${d.apuracao.descricaoRegraReducao})`,
    impostoDevido: formatCurrency(d.apuracao.impostoDevido),
    aliquotaEfetiva: formatPercent(d.apuracao.aliquotaEfetiva),
    valorEstimadoAposImposto: `${formatCurrency(d.apuracao.valorEstimadoAposImposto)} (estimativa dos rendimentos sujeitos após descontar o Carnê-Leão)`,
    saldoEstimadoAposDesembolsos: `${formatCurrency(d.apuracao.saldoEstimadoAposImpostoEDesembolsos)} (estimativa após Livro-Caixa, INSS, pensão e Carnê-Leão)`,
    comparacaoLegaisImposto: formatCurrency(d.comparacaoDeducoes.legais.impostoDevido),
    comparacaoSimplificadoImposto: formatCurrency(
      d.comparacaoDeducoes.simplificado.impostoDevido
    ),
    avisoDarfMinimo: d.avisos.avisoDarfMinimo,
    avisoRendimentosPJ: d.avisos.avisoRendimentosPJ || '',
    avisoLivroCaixa: d.avisos.avisoLivroCaixa || '',
    memoriaCalculo: d.memoriaCalculo
  };
}

export function buildCopyText(calculation) {
  return formatResult(calculation).summary;
}

/**
 * Conecta o módulo ao DOM da página Calculadora Carnê-Leão para Autônomos.
 */
export function setupTool(root = document) {
  if (!root || typeof root.querySelector !== 'function') return null;
  const form = root.querySelector('#formCarneLeaoAutonomo');
  if (!form) return null;

  const selectMes = root.querySelector('#mesReferenciaCarneLeao');
  const selectAno = root.querySelector('#anoReferenciaCarneLeao');
  const inputRendPF = root.querySelector('#rendimentosPFCarneLeao');
  const inputRendExterior = root.querySelector('#rendimentosExteriorCarneLeao');
  const inputRendPJ = root.querySelector('#rendimentosPJCarneLeao');

  const selectModoDeducao = root.querySelector('#modoDeducaoCarneLeao');
  const ajudaModoDeducaoDinamica = root.querySelector('#ajudaModoDeducaoDinamicaCarneLeao');
  const inputLivroCaixa = root.querySelector('#despesasLivroCaixaCarneLeao');
  const inputExcedenteAnterior = root.querySelector('#excedenteLivroCaixaMesAnteriorCarneLeao');
  const avisoJaneiroSemExcedente = root.querySelector('#avisoJaneiroSemExcedenteCarneLeao');
  const inputInss = root.querySelector('#contribuicaoPrevidenciariaCarneLeao');
  const inputDependentes = root.querySelector('#numeroDependentesCarneLeao');
  const inputPensao = root.querySelector('#pensaoAlimenticiaCarneLeao');

  const btnLimpar = root.querySelector('#btnLimparCarneLeao');
  const erroEl = root.querySelector('#erroCarneLeaoAutonomo');
  const resultadoSection = root.querySelector('#resultadoCarneLeaoAutonomo');
  const statusEl = root.querySelector('#statusCarneLeaoAutonomo');

  const resCompetencia = root.querySelector('#resCompetenciaCarneLeao');
  const resTotalRendimentosInformados = root.querySelector('#resTotalRendimentosInformados');
  const resRendimentosSujeitos = root.querySelector('#resRendimentosSujeitosCarneLeao');
  const resRendimentosPF = root.querySelector('#resRendimentosPFCarneLeao');
  const resRendimentosExterior = root.querySelector('#resRendimentosExteriorCarneLeao');
  const blocoAvisoRendimentosPJ = root.querySelector('#blocoAvisoRendimentosPJCarneLeao');
  const resAvisoRendimentosPJ = root.querySelector('#resAvisoRendimentosPJCarneLeao');

  const resDeducaoAceita = root.querySelector('#resDeducaoAceitaCarneLeao');
  const resSomaDeducoesLegais = root.querySelector('#resSomaDeducoesLegaisCarneLeao');
  const resDescontoSimplificado = root.querySelector('#resDescontoSimplificadoCarneLeao');
  const resLivroCaixaResumo = root.querySelector('#resLivroCaixaResumoCarneLeao');
  const resLimiteDeducaoLivroCaixa = root.querySelector('#resLimiteDeducaoLivroCaixaCarneLeao');
  const blocoExcedenteAnterior = root.querySelector('#blocoExcedenteAnteriorCarneLeao');
  const resExcedenteAnterior = root.querySelector('#resExcedenteAnteriorCarneLeao');
  const blocoExcedenteRemanescente = root.querySelector('#blocoExcedenteRemanescenteCarneLeao');
  const resExcedenteRemanescente = root.querySelector('#resExcedenteRemanescenteCarneLeao');
  const blocoAvisoLivroCaixa = root.querySelector('#blocoAvisoLivroCaixaCarneLeao');
  const resAvisoLivroCaixa = root.querySelector('#resAvisoLivroCaixaCarneLeao');
  const resInssResumo = root.querySelector('#resInssResumoCarneLeao');
  const resDependentesResumo = root.querySelector('#resDependentesResumoCarneLeao');
  const resPensaoResumo = root.querySelector('#resPensaoResumoCarneLeao');
  const resComparacaoModalidades = root.querySelector('#resComparacaoModalidadesCarneLeao');

  const resBaseCalculoMensal = root.querySelector('#resBaseCalculoMensalCarneLeao');
  const resFaixaEAliquota = root.querySelector('#resFaixaEAliquotaCarneLeao');
  const resImpostoAntesReducao = root.querySelector('#resImpostoAntesReducaoCarneLeao');
  const resReducaoLegalAplicada = root.querySelector('#resReducaoLegalAplicadaCarneLeao');
  const resValorCarneLeaoDevido = root.querySelector('#resValorCarneLeaoDevido');
  const resAliquotaEfetiva = root.querySelector('#resAliquotaEfetivaCarneLeao');
  const resValorAposImposto = root.querySelector('#resValorAposImpostoCarneLeao');
  const resSaldoAposDesembolsos = root.querySelector('#resSaldoAposDesembolsosCarneLeao');
  const resOrientacaoDarf = root.querySelector('#resOrientacaoDarfCarneLeao');
  const listaMemoriaCalculo = root.querySelector('#listaMemoriaCalculoCarneLeao');

  const btnCopiar = root.querySelector('#btnCopiarCarneLeao');
  const btnCompartilhar = root.querySelector('#btnCompartilharCarneLeao');
  const btnImprimir = root.querySelector('#btnImprimirCarneLeao');

  let ultimoResultado = null;

  const actions = createResultActions({
    title: 'Calculadora Carnê-Leão para Autônomos — Calculadora Master',
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
    if (blocoAvisoRendimentosPJ) {
      blocoAvisoRendimentosPJ.hidden = true;
    }
    if (blocoAvisoLivroCaixa) {
      blocoAvisoLivroCaixa.hidden = true;
    }
    if (blocoExcedenteAnterior) {
      blocoExcedenteAnterior.hidden = true;
    }
    if (blocoExcedenteRemanescente) {
      blocoExcedenteRemanescente.hidden = true;
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
    if (blocoAvisoRendimentosPJ) {
      blocoAvisoRendimentosPJ.hidden = true;
    }
    if (blocoAvisoLivroCaixa) {
      blocoAvisoLivroCaixa.hidden = true;
    }
    if (blocoExcedenteAnterior) {
      blocoExcedenteAnterior.hidden = true;
    }
    if (blocoExcedenteRemanescente) {
      blocoExcedenteRemanescente.hidden = true;
    }
    setActionButtonsVisibility(false);
    if (statusEl) {
      statusEl.textContent = '';
    }
  }

  function updateModoDeducaoHelperState() {
    if (!ajudaModoDeducaoDinamica || !selectModoDeducao) return;
    let nextMessage =
      'No modo automático, a calculadora compara a soma das suas Deduções Legais com o Desconto Simplificado Mensal de R$ 607,20 e aplica a alternativa mais benéfica (sem nunca somar as duas opções).';
    if (selectModoDeducao.value === MODOS_DEDUCAO.LEGAIS) {
      nextMessage =
        'No modo Deduções Legais, o cálculo utiliza exclusivamente a soma de Livro-Caixa elegível, INSS, dependentes e pensão alimentícia informados abaixo.';
    } else if (selectModoDeducao.value === MODOS_DEDUCAO.SIMPLIFICADO) {
      nextMessage =
        'No modo Desconto Simplificado Mensal, aplica-se o desconto fixo de R$ 607,20 em substituição às deduções legais (os valores abaixo serão usados apenas para comparação).';
    }
    if (ajudaModoDeducaoDinamica.textContent !== nextMessage) {
      ajudaModoDeducaoDinamica.textContent = nextMessage;
    }
  }

  function updateExcedenteAnteriorState() {
    if (!selectMes || !inputExcedenteAnterior) return;
    const isJaneiro = selectMes.value === '1';
    if (isJaneiro) {
      inputExcedenteAnterior.value = '0';
      inputExcedenteAnterior.disabled = true;
      if (avisoJaneiroSemExcedente) {
        avisoJaneiroSemExcedente.textContent =
          'Para o mês de Janeiro, não há transporte de excedente do ano anterior (IN RFB nº 1.500/2014, art. 104, § 2º).';
        avisoJaneiroSemExcedente.hidden = false;
      }
    } else {
      inputExcedenteAnterior.disabled = false;
      if (avisoJaneiroSemExcedente) {
        avisoJaneiroSemExcedente.textContent = '';
        avisoJaneiroSemExcedente.hidden = true;
      }
    }
  }

  updateModoDeducaoHelperState();
  updateExcedenteAnteriorState();

  if (selectModoDeducao && typeof selectModoDeducao.addEventListener === 'function') {
    selectModoDeducao.addEventListener('change', () => {
      updateModoDeducaoHelperState();
      invalidateResult();
    });
  }

  if (selectMes && typeof selectMes.addEventListener === 'function') {
    selectMes.addEventListener('change', () => {
      updateExcedenteAnteriorState();
      invalidateResult();
    });
  }

  if (typeof form.addEventListener === 'function') {
    form.addEventListener('input', (event) => {
      if (event?.target === selectModoDeducao) return;
      if (event?.target === selectMes) return;
      invalidateResult();
    });
    form.addEventListener('change', (event) => {
      if (event?.target === selectModoDeducao) return;
      if (event?.target === selectMes) return;
      invalidateResult();
    });
  }

  function renderMemoriaCalculoList(passos) {
    if (!listaMemoriaCalculo) return;
    if (typeof listaMemoriaCalculo.replaceChildren === 'function') {
      listaMemoriaCalculo.replaceChildren();
    } else {
      listaMemoriaCalculo.textContent = '';
    }
    if (typeof document !== 'undefined' && typeof document.createElement === 'function') {
      for (const passo of passos) {
        const li = document.createElement('li');
        li.textContent = passo;
        if (typeof listaMemoriaCalculo.appendChild === 'function') {
          listaMemoriaCalculo.appendChild(li);
        }
      }
    } else {
      listaMemoriaCalculo.textContent = passos.join('\n');
    }
  }

  function renderResult(calculation) {
    ultimoResultado = calculation;
    const formatted = formatResult(calculation);
    const d = calculation.data;

    if (resCompetencia) resCompetencia.textContent = formatted.periodoRotulo;
    if (resTotalRendimentosInformados) {
      resTotalRendimentosInformados.textContent = formatted.totalRendimentosInformados;
    }
    if (resRendimentosSujeitos) {
      resRendimentosSujeitos.textContent = formatted.rendimentosSujeitosCarneLeao;
    }
    if (resRendimentosPF) resRendimentosPF.textContent = formatted.rendimentosPF;
    if (resRendimentosExterior) resRendimentosExterior.textContent = formatted.rendimentosExterior;

    if (blocoAvisoRendimentosPJ) {
      blocoAvisoRendimentosPJ.hidden = !d.rendimentos.possuiRendimentosPJ;
    }
    if (resAvisoRendimentosPJ) {
      resAvisoRendimentosPJ.textContent = formatted.avisoRendimentosPJ;
    }

    if (resDeducaoAceita) resDeducaoAceita.textContent = formatted.deducaoAceitaNoCalculo;
    if (resSomaDeducoesLegais) resSomaDeducoesLegais.textContent = formatted.deducoesLegaisTotal;
    if (resDescontoSimplificado) {
      resDescontoSimplificado.textContent = formatted.descontoSimplificadoMensal;
    }
    if (resLivroCaixaResumo) resLivroCaixaResumo.textContent = formatted.livroCaixaResumo;
    if (resLimiteDeducaoLivroCaixa) {
      resLimiteDeducaoLivroCaixa.textContent = formatted.limiteDeducaoLivroCaixa;
    }

    if (blocoExcedenteAnterior) {
      blocoExcedenteAnterior.hidden = !(d.deducoes.excedenteLivroCaixaAnterior > 0);
    }
    if (resExcedenteAnterior) {
      resExcedenteAnterior.textContent = formatted.excedenteLivroCaixaAnterior;
    }

    if (blocoExcedenteRemanescente) {
      blocoExcedenteRemanescente.hidden = !d.deducoes.livroCaixaLimitadoPelaReceita;
    }
    if (resExcedenteRemanescente) {
      resExcedenteRemanescente.textContent = `${formatted.excedenteLivroCaixaRemanescente} (${d.deducoes.excedenteTransponivelMesSeguinte ? 'transportável até dezembro' : 'não transferível para o ano seguinte'})`;
    }

    if (blocoAvisoLivroCaixa) {
      blocoAvisoLivroCaixa.hidden = !d.deducoes.livroCaixaLimitadoPelaReceita;
    }
    if (resAvisoLivroCaixa) {
      resAvisoLivroCaixa.textContent = formatted.avisoLivroCaixa;
    }

    if (resInssResumo) resInssResumo.textContent = formatted.inssResumo;
    if (resDependentesResumo) resDependentesResumo.textContent = formatted.dependentesResumo;
    if (resPensaoResumo) resPensaoResumo.textContent = formatted.pensaoResumo;

    if (resComparacaoModalidades) {
      resComparacaoModalidades.textContent = `Imposto com Deduções Legais: ${formatted.comparacaoLegaisImposto} | Imposto com Desconto Simplificado (R$ 607,20): ${formatted.comparacaoSimplificadoImposto}`;
    }

    if (resBaseCalculoMensal) resBaseCalculoMensal.textContent = formatted.baseCalculoMensal;
    if (resFaixaEAliquota) resFaixaEAliquota.textContent = formatted.faixaEAliquota;
    if (resImpostoAntesReducao) resImpostoAntesReducao.textContent = formatted.impostoAntesReducao;
    if (resReducaoLegalAplicada) {
      resReducaoLegalAplicada.textContent = formatted.reducaoLegalAplicada;
    }
    if (resValorCarneLeaoDevido) resValorCarneLeaoDevido.textContent = formatted.impostoDevido;
    if (resAliquotaEfetiva) resAliquotaEfetiva.textContent = formatted.aliquotaEfetiva;
    if (resValorAposImposto) resValorAposImposto.textContent = formatted.valorEstimadoAposImposto;
    if (resSaldoAposDesembolsos) {
      resSaldoAposDesembolsos.textContent = formatted.saldoEstimadoAposDesembolsos;
    }
    if (resOrientacaoDarf) resOrientacaoDarf.textContent = formatted.avisoDarfMinimo;

    renderMemoriaCalculoList(formatted.memoriaCalculo);

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
      mesReferencia: selectMes ? selectMes.value : String(DEFAULTS.mesReferencia),
      anoReferencia: selectAno ? selectAno.value : String(DEFAULTS.anoReferencia),
      rendimentosPessoaFisica: inputRendPF ? inputRendPF.value : '',
      rendimentosExterior: inputRendExterior ? inputRendExterior.value : '',
      rendimentosPessoaJuridica: inputRendPJ ? inputRendPJ.value : '',
      modoDeducao: selectModoDeducao ? selectModoDeducao.value : DEFAULTS.modoDeducao,
      despesasLivroCaixa: inputLivroCaixa ? inputLivroCaixa.value : '',
      excedenteLivroCaixaMesAnterior:
        selectMes && selectMes.value === '1'
          ? '0'
          : (inputExcedenteAnterior ? inputExcedenteAnterior.value : '0'),
      contribuicaoPrevidenciaria: inputInss ? inputInss.value : '',
      numeroDependentes: inputDependentes ? inputDependentes.value : '',
      pensaoAlimenticia: inputPensao ? inputPensao.value : ''
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
      if (selectMes) selectMes.value = String(DEFAULTS.mesReferencia);
      if (selectAno) selectAno.value = String(DEFAULTS.anoReferencia);
      if (inputRendPF) inputRendPF.value = '';
      if (inputRendExterior) inputRendExterior.value = '0';
      if (inputRendPJ) inputRendPJ.value = '';
      if (selectModoDeducao) selectModoDeducao.value = DEFAULTS.modoDeducao;
      if (inputLivroCaixa) inputLivroCaixa.value = '0';
      if (inputExcedenteAnterior) {
        inputExcedenteAnterior.value = '0';
      }
      if (inputInss) inputInss.value = '0';
      if (inputDependentes) inputDependentes.value = '0';
      if (inputPensao) inputPensao.value = '0';
      updateModoDeducaoHelperState();
      updateExcedenteAnteriorState();
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
          ? `${window.location.origin}/tools/financas/carne-leao-autonomo.html`
          : 'https://www.calculadoramaster.com/tools/financas/carne-leao-autonomo.html';
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
