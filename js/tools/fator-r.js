/**
 * Calculadora Fator R do Simples Nacional (Anos-Calendário 2026 e 2027) - Calculadora Master
 *
 * Apura o Fator R (razão entre a folha de salários com encargos e a receita bruta acumulada)
 * para definir o enquadramento tributário entre o Anexo III (alíquotas a partir de 6%) e o
 * Anexo V (alíquotas a partir de 15,5%) para as atividades de prestação de serviços
 * legalmente sujeitas a essa regra, nos termos da Lei Complementar nº 123/2006, da
 * Resolução CGSN nº 140/2018 (art. 26), da Solução de Consulta Cosit nº 17/2021 e da
 * Resolução CGSN nº 190/2026 (vigência a partir de 1º de janeiro de 2027).
 *
 * Fórmula Geral:
 *   Fator R = FS12 / RBT12r × 100
 *
 * Onde:
 *   - FS12: Folha de salários, incluídos os encargos legalmente admitidos, nos 12 meses
 *     anteriores ao período de apuração, obrigatoriamente apurada sob o REGIME DE CAIXA
 *     (valores efetivamente pagos), conforme Solução de Consulta Cosit nº 17/2021.
 *   - RBT12r: Receita bruta total acumulada nos 12 meses anteriores ao período de apuração,
 *     computando conjuntamente o mercado interno e as exportações.
 *
 * Critério de Enquadramento:
 *   - Fator R >= 28,00%: Anexo III (alíquotas mais favoráveis).
 *   - Fator R < 28,00%: Anexo V.
 *   - A decisão de enquadramento baseia-se no valor matemático real, sem arredondamento visual prévio.
 *
 * Empresas em Início de Atividade (menos de 13 meses):
 *   - Competências de 2026 (Resolução CGSN nº 140/2018, art. 26 e Perguntas & Respostas do Simples Nacional):
 *     * 1º mês: proporcionalização da folha e da receita do próprio mês por 12 (FS_mês / Rec_mês).
 *       Se FS = 0 e Receita > 0: Fator R fixado em 1,00% (Anexo V).
 *       Se FS > 0 e Receita = 0: Fator R fixado em 28,00% (Anexo III).
 *     * 2º ao 12º mês: média aritmética da folha e das receitas dos meses anteriores decorridos multiplicada por 12.
 *   - Competências de 2027 (Resolução CGSN nº 190/2026, efeitos a partir de 01/01/2027):
 *     * 1º e 2º meses: Fator R fixado por presunção legal em 28,00% (0,28), garantindo diretamente
 *       o enquadramento no Anexo III para empresas recém-abertas.
 *     * 3º ao 12º mês: apuração baseada no histórico real dos meses anteriores.
 *
 * Ferramenta exclusivamente orientativa: não calcula o valor total do DAS nem substitui o PGDAS-D.
 */

import { createResultActions } from '../core/result-actions.js';

export const ANO_REFERENCIA_PADRAO = 2026;
export const ANOS_REFERENCIA_VALIDOS = Object.freeze([2026, 2027]);
export const DATA_CONSULTA_OFICIAL = '2026-10-23';

export const PERCENTUAL_CORTE_FATOR_R = 0.28; // 28,00%
export const FATOR_R_PISO_INICIO_SEM_FOLHA = 0.01; // 1,00% (Resolução CGSN nº 140/2018: art. 26, § 6º, inciso II para 1º mês de atividade; art. 26, § 7º, incisos I e IV para períodos posteriores)
export const FATOR_R_FIXO_FOLHA_ZERO = 0.01; // 1,00% (Resolução CGSN nº 140/2018: art. 26, § 6º, inciso II para 1º mês; art. 26, § 7º, incisos I e IV para períodos posteriores)
export const FATOR_R_FIXO_RECEITA_ZERO = 0.28; // 28,00% (Resolução CGSN nº 140/2018: art. 26, § 6º, inciso I para 1º mês; art. 26, § 7º, inciso II para períodos posteriores)
export const FATOR_R_PRESUMIDO_INICIO_2027 = 0.28; // 28,00% (Resolução CGSN nº 190/2026, art. 26, § 6º)

export const FONTES_OFICIAIS = Object.freeze({
  leiComplementar123: 'https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp123.htm',
  resolucaoCgsn140: 'https://normas.receita.fazenda.gov.br/sijut2consulta/link.action?idAto=92278',
  resolucaoCgsn140Compilada: 'https://normas.receita.fazenda.gov.br/sijut2consulta/normas.receisulta/link.action?idAto=92278&visao=compilado',
  solucaoConsultaCosit17: 'https://normas.receita.fazenda.gov.br/sijut2consulta/link.action?idAto=116177',
  perguntaoSimplesNacional: 'https://www8.receita.fazenda.gov.br/SimplesNacional/Arquivos/manual/PerguntaoSN.pdf',
  resolucaoCgsn190: 'https://normas.receita.fazenda.gov.br/sijut2consulta/link.action?idAto=142980'
});

export const ANEXOS_FATOR_R = Object.freeze({
  ANEXO_III: 'anexo_3',
  ANEXO_V: 'anexo_5'
});

export const ROTULOS_ANEXO = Object.freeze({
  [ANEXOS_FATOR_R.ANEXO_III]: 'Anexo III — Serviços (Alíquotas a partir de 6,00%)',
  [ANEXOS_FATOR_R.ANEXO_V]: 'Anexo V — Serviços (Alíquotas a partir de 15,50%)'
});

export const MODOS_APURACAO = Object.freeze({
  REGRA_GERAL: 'regra_geral',
  INICIO_MES_1: 'inicio_mes_1',
  INICIO_MES_2: 'inicio_mes_2',
  INICIO_MESES_3_12: 'inicio_meses_3_12',
  INICIO_MESES_3_13: 'inicio_meses_3_13'
});

export const ROTULOS_MODO_APURACAO = Object.freeze({
  [MODOS_APURACAO.REGRA_GERAL]: 'Empresa em atividade regular (mais de 12 meses em 2026 / a partir do 14º mês em 2027)',
  [MODOS_APURACAO.INICIO_MES_1]: 'Início de atividade — 1º mês de funcionamento',
  [MODOS_APURACAO.INICIO_MES_2]: 'Início de atividade — 2º mês de funcionamento',
  [MODOS_APURACAO.INICIO_MESES_3_12]: 'Início de atividade — 3º ao 12º mês de funcionamento (2026)',
  [MODOS_APURACAO.INICIO_MESES_3_13]: 'Início de atividade — 3º ao 13º mês de funcionamento (2027)'
});

export const MODOS_ENTRADA_FOLHA = Object.freeze({
  CONSOLIDADA: 'consolidada',
  DETALHADA: 'detalhada'
});

export const MODOS_ENTRADA_RECEITA = Object.freeze({
  CONSOLIDADA: 'consolidada',
  DETALHADA: 'detalhada'
});

/**
 * Converte entradas para número de forma flexível (aceita '1.250,50', '1250.50' ou numéricos).
 *
 * @param {string|number} value
 * @returns {number}
 */
export function parseFlexibleNumber(value) {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0;
  }
  if (!value || typeof value !== 'string') {
    return 0;
  }
  const clean = value.trim();
  if (!clean) return 0;

  // Formato brasileiro com ponto de milhar e vírgula decimal (ex: 1.250,50)
  if (clean.includes(',') && clean.includes('.')) {
    return parseFloat(clean.replace(/\./g, '').replace(',', '.')) || 0;
  }
  // Formato brasileiro somente com vírgula (ex: 1250,50)
  if (clean.includes(',')) {
    return parseFloat(clean.replace(',', '.')) || 0;
  }
  // Formato padrão decimal (ex: 1250.50)
  return parseFloat(clean) || 0;
}

/**
 * Arredonda um valor decimal com precisão especificada.
 *
 * @param {number} value
 * @param {number} decimals
 * @returns {number}
 */
export function roundDecimal(value, decimals = 4) {
  const factor = Math.pow(10, decimals);
  return Math.round((Number(value) || 0) * factor) / factor;
}

/**
 * Arredonda valores monetários para duas casas decimais.
 *
 * @param {number} value
 * @returns {number}
 */
export function roundCurrency(value) {
  return Math.round((Number(value) || 0) * 100) / 100;
}

/**
 * Formata um valor monetário no padrão pt-BR (R$ 0,00).
 *
 * @param {number} value
 * @returns {string}
 */
export function formatCurrency(value) {
  const num = Number(value) || 0;
  return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

/**
 * Formata um percentual no padrão pt-BR (ex: 28,00%).
 *
 * @param {number} value Valor em decimal (0.28) ou percentual (28)
 * @param {number} decimals Casas decimais
 * @returns {string}
 */
export function formatPercent(value, decimals = 2) {
  const num = Number(value) || 0;
  // Se for maior que 1, assume já estar em escala percentual (ex: 28)
  const val = num > 1.0 ? num : num * 100;
  return `${val.toLocaleString('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  })}%`;
}

/**
 * Calcula a composição da folha de salários garantindo o regime de caixa
 * e prevenindo duplas contagens.
 *
 * @param {object} params
 * @returns {object} Detalhamento dos componentes e total consolidado
 */
export function calcularComposicaoFolha(params = {}) {
  const modo = params.modoEntradaFolha || MODOS_ENTRADA_FOLHA.CONSOLIDADA;

  if (modo === MODOS_ENTRADA_FOLHA.CONSOLIDADA) {
    const total = Math.max(0, parseFlexibleNumber(params.folhaConsolidada));
    return {
      modo,
      total,
      salarios: total,
      proLabore: 0,
      decimoTerceiro: 0,
      cppPatronal: 0,
      fgts: 0,
      itensDetalhados: false
    };
  }

  // Preenchimento detalhado por componentes individuais
  const salarios = Math.max(0, parseFlexibleNumber(params.salarios));
  const proLabore = Math.max(0, parseFlexibleNumber(params.proLabore));
  const decimoTerceiro = Math.max(0, parseFlexibleNumber(params.decimoTerceiro));
  const cppPatronal = Math.max(0, parseFlexibleNumber(params.cppPatronal));
  const fgts = Math.max(0, parseFlexibleNumber(params.fgts));

  const total = roundCurrency(salarios + proLabore + decimoTerceiro + cppPatronal + fgts);

  return {
    modo,
    total,
    salarios,
    proLabore,
    decimoTerceiro,
    cppPatronal,
    fgts,
    itensDetalhados: true
  };
}

/**
 * Calcula a composição da receita bruta total acumulada considerando
 * conjuntamente o mercado interno e as exportações.
 *
 * @param {object} params
 * @returns {object} Detalhamento dos componentes de receita e total consolidado
 */
export function calcularComposicaoReceita(params = {}) {
  const modo = params.modoEntradaReceita || MODOS_ENTRADA_RECEITA.CONSOLIDADA;

  if (modo === MODOS_ENTRADA_RECEITA.CONSOLIDADA) {
    const total = Math.max(0, parseFlexibleNumber(params.receitaConsolidada));
    return {
      modo,
      total,
      mercadoInterno: total,
      exportacoes: 0,
      itensDetalhados: false
    };
  }

  // Preenchimento detalhado: mercado interno + exportações
  const mercadoInterno = Math.max(0, parseFlexibleNumber(params.mercadoInterno));
  const exportacoes = Math.max(0, parseFlexibleNumber(params.exportacoes));
  const total = roundCurrency(mercadoInterno + exportacoes);

  return {
    modo,
    total,
    mercadoInterno,
    exportacoes,
    itensDetalhados: true
  };
}

/**
 * Normaliza e sanitiza os parâmetros de entrada da calculadora.
 *
 * @param {object} raw
 * @returns {object}
 */
export function normalizeInput(raw = {}) {
  const anoReferencia = parseInt(raw.anoReferencia, 10) || ANO_REFERENCIA_PADRAO;
  let modoApuracao = raw.modoApuracao || MODOS_APURACAO.REGRA_GERAL;
  const modoEntradaFolha = raw.modoEntradaFolha || MODOS_ENTRADA_FOLHA.CONSOLIDADA;
  const modoEntradaReceita = raw.modoEntradaReceita || MODOS_ENTRADA_RECEITA.CONSOLIDADA;

  const mesAtividade = raw.mesAtividade !== undefined && raw.mesAtividade !== null && raw.mesAtividade !== ''
    ? parseInt(raw.mesAtividade, 10)
    : undefined;

  const mesesInicio = raw.mesesInicio !== undefined && raw.mesesInicio !== null && raw.mesesInicio !== ''
    ? parseInt(raw.mesesInicio, 10)
    : (mesAtividade !== undefined ? mesAtividade : 1);

  // Mapeamento automático caso mesAtividade tenha sido fornecido diretamente
  if (mesAtividade !== undefined && !raw.modoApuracao) {
    if (mesAtividade === 1) {
      modoApuracao = MODOS_APURACAO.INICIO_MES_1;
    } else if (mesAtividade === 2) {
      modoApuracao = MODOS_APURACAO.INICIO_MES_2;
    } else if (anoReferencia === 2026) {
      if (mesAtividade >= 3 && mesAtividade <= 12) {
        modoApuracao = MODOS_APURACAO.INICIO_MESES_3_12;
      } else {
        modoApuracao = MODOS_APURACAO.REGRA_GERAL;
      }
    } else if (anoReferencia === 2027) {
      if (mesAtividade >= 3 && mesAtividade <= 13) {
        modoApuracao = MODOS_APURACAO.INICIO_MESES_3_13;
      } else {
        modoApuracao = MODOS_APURACAO.REGRA_GERAL;
      }
    }
  }

  // Folha
  const folhaConsolidada = raw.folhaConsolidada !== undefined ? raw.folhaConsolidada : raw.folha12;
  const salarios = raw.salarios;
  const proLabore = raw.proLabore;
  const decimoTerceiro = raw.decimoTerceiro;
  const cppPatronal = raw.cppPatronal;
  const fgts = raw.fgts;

  // Receita
  const receitaConsolidada = raw.receitaConsolidada !== undefined ? raw.receitaConsolidada : raw.rbt12r;
  const mercadoInterno = raw.mercadoInterno;
  const exportacoes = raw.exportacoes;

  // Início de atividade
  const folhaMesAtual = raw.folhaMesAtual;
  const receitaMesAtual = raw.receitaMesAtual;
  const folhaAcumuladaAnterior = raw.folhaAcumuladaAnterior;
  const receitaAcumuladaAnterior = raw.receitaAcumuladaAnterior;

  return {
    anoReferencia,
    modoApuracao,
    modoEntradaFolha,
    modoEntradaReceita,
    mesAtividade,
    mesesInicio,
    folhaConsolidada,
    salarios,
    proLabore,
    decimoTerceiro,
    cppPatronal,
    fgts,
    receitaConsolidada,
    mercadoInterno,
    exportacoes,
    folhaMesAtual,
    receitaMesAtual,
    folhaAcumuladaAnterior,
    receitaAcumuladaAnterior
  };
}

/**
 * Valida os parâmetros de entrada, retornando mensagens descritivas de erro.
 *
 * @param {object} input
 * @returns {{ valid: boolean, error: string|null }}
 */
export function validateInput(input = {}) {
  if (!ANOS_REFERENCIA_VALIDOS.includes(input.anoReferencia)) {
    return {
      valid: false,
      error: `Ano de referência inválido (${input.anoReferencia}). Esta ferramenta calcula exclusivamente os anos de 2026 (Resolução CGSN nº 140/2018) e 2027 (Resolução CGSN nº 190/2026).`
    };
  }

  const validModos = Object.values(MODOS_APURACAO);
  if (!validModos.includes(input.modoApuracao)) {
    return {
      valid: false,
      error: 'Modo de apuração inválido. Selecione entre regra geral ou início de atividade.'
    };
  }

  // Checagem de valores negativos
  const camposNumericos = [
    { nome: 'Folha consolidada', val: input.folhaConsolidada },
    { nome: 'Salários', val: input.salarios },
    { nome: 'Pró-labore', val: input.proLabore },
    { nome: '13º Salário', val: input.decimoTerceiro },
    { nome: 'CPP Patronal', val: input.cppPatronal },
    { nome: 'FGTS', val: input.fgts },
    { nome: 'Receita consolidada', val: input.receitaConsolidada },
    { nome: 'Receita de mercado interno', val: input.mercadoInterno },
    { nome: 'Receita de exportações', val: input.exportacoes },
    { nome: 'Folha do mês atual', val: input.folhaMesAtual },
    { nome: 'Receita do mês atual', val: input.receitaMesAtual },
    { nome: 'Folha acumulada anterior', val: input.folhaAcumuladaAnterior },
    { nome: 'Receita acumulada anterior', val: input.receitaAcumuladaAnterior }
  ];

  for (const c of camposNumericos) {
    if (c.val !== undefined && c.val !== null && c.val !== '') {
      const num = parseFlexibleNumber(c.val);
      if (Number.isNaN(num) || num < 0) {
        return {
          valid: false,
          error: `O campo "${c.nome}" não pode ser negativo nem conter formato inválido.`
        };
      }
    }
  }

  // Validação de meses em início de atividade
  if (input.modoApuracao === MODOS_APURACAO.INICIO_MESES_3_12 || input.modoApuracao === MODOS_APURACAO.INICIO_MESES_3_13) {
    const m = input.mesesInicio;
    const mesAtiv = input.mesAtividade;

    if (input.anoReferencia === 2026) {
      if (mesAtiv !== undefined && (mesAtiv < 3 || mesAtiv > 12)) {
        return {
          valid: false,
          error: 'Para o ano de 2026, o início de atividade do 3º ao 12º mês aceita apenas competências entre o 3º e o 12º mês de atividade.'
        };
      }
      if (mesAtiv === undefined && (Number.isNaN(m) || m < 2 || m > 12)) {
        return {
          valid: false,
          error: 'Para apuração do 3º ao 12º mês em início de atividade, informe uma quantidade de meses decorridos entre 2 e 11 (ou mês de atividade entre 3 e 12).'
        };
      }
    } else if (input.anoReferencia === 2027) {
      if (mesAtiv !== undefined && (mesAtiv < 3 || mesAtiv > 13)) {
        return {
          valid: false,
          error: 'Para o ano de 2027, as regras para empresas em início de atividade com mais de 2 e menos de 14 meses aplicam-se do 3º ao 13º mês de atividade.'
        };
      }
      if (mesAtiv === undefined && (Number.isNaN(m) || m < 1 || m > 13)) {
        return {
          valid: false,
          error: 'Para apuração de empresa com mais de 2 e menos de 14 meses em 2027, informe mês de atividade entre 3 e 13 (ou janela entre 1 e 11 meses antecedentes).'
        };
      }
    }
  }

  return { valid: true, error: null };
}

/**
 * Realiza o cálculo completo do Fator R, enquadramento e memória de cálculo.
 *
 * @param {object} rawInput
 * @returns {object} Resultado estruturado do cálculo
 */
export function calculate(rawInput = {}) {
  const input = normalizeInput(rawInput);
  const validation = validateInput(input);
  if (!validation.valid) {
    return {
      ok: false,
      error: validation.error,
      data: null,
      warnings: [],
      memoriaCalculo: []
    };
  }

  const { anoReferencia, modoApuracao } = input;
  const warnings = [];
  const memoriaCalculo = [];

  let fsConsiderada = 0;
  let rbtConsiderada = 0;
  let fatorRReal = 0;
  let fatorRPercentual = 0;
  let atingiuCorte = false;
  let anexoEnquadrado = ANEXOS_FATOR_R.ANEXO_V;
  let regraAplicadaDescricao = '';
  let casoEspecial = 'normal';
  let mesesJanelaReferencia = 12;
  let janelaReferenciaDescricao = '';

  // Alerta conceitual permanente sobre a abrangência do Fator R
  warnings.push(
    'ENQUADRAMENTO DE ATIVIDADE: o Fator R não é aplicável indistintamente a qualquer empresa optante pelo Simples Nacional. Ele incide estritamente sobre as atividades de prestação de serviços elencadas no art. 18, § 5º-J da Lei Complementar nº 123/2006 (como engenharia, tecnologia da informação, medicina, odontologia, psicologia, perícias, publicidade, entre outras). Se a sua atividade pertencer originariamente ao Anexo I (comércio), Anexo II (indústria) ou aos Anexos III ou IV puros, a tributação ocorre de forma direta independentemente do Fator R.'
  );

  // -------------------------------------------------------------------------
  // CENÁRIO 1: ANO-CALENDÁRIO 2026 (Resolução CGSN nº 140/2018, art. 26)
  // -------------------------------------------------------------------------
  if (anoReferencia === 2026) {
    if (modoApuracao === MODOS_APURACAO.REGRA_GERAL) {
      // Regra geral de 12 meses anteriores (para empresas com mais de 12 meses de funcionamento)
      const compFolha = calcularComposicaoFolha(input);
      const compReceita = calcularComposicaoReceita(input);

      fsConsiderada = compFolha.total;
      rbtConsiderada = compReceita.total;
      mesesJanelaReferencia = 12;
      janelaReferenciaDescricao = '12 meses anteriores ao período de apuração (Resolução CGSN nº 140/2018, art. 26)';

      memoriaCalculo.push(`Ano de competência da apuração: ${anoReferencia} (Regulamentação: Resolução CGSN nº 140/2018, art. 26).`);
      memoriaCalculo.push('Tempo de atividade: Empresa em funcionamento regular (mais de 12 meses de atividade).');
      memoriaCalculo.push(`Janela temporal de referência: ${janelaReferenciaDescricao}.`);
      memoriaCalculo.push(`Folha de salários e encargos nos 12 meses anteriores (FS12, regime de caixa): ${formatCurrency(fsConsiderada)}.`);
      if (compFolha.itensDetalhados) {
        memoriaCalculo.push(`Detalhamento da folha: Salários (${formatCurrency(compFolha.salarios)}) + Pró-labore (${formatCurrency(compFolha.proLabore)}) + 13º (${formatCurrency(compFolha.decimoTerceiro)}) + CPP (${formatCurrency(compFolha.cppPatronal)}) + FGTS (${formatCurrency(compFolha.fgts)}).`);
      }
      memoriaCalculo.push(`Receita bruta acumulada nos 12 meses anteriores (RBT12r): ${formatCurrency(rbtConsiderada)}.`);
      if (compReceita.itensDetalhados) {
        memoriaCalculo.push(`Detalhamento da receita: Mercado interno (${formatCurrency(compReceita.mercadoInterno)}) + Exportações (${formatCurrency(compReceita.exportacoes)}).`);
      }

      // Casos especiais de zero conforme art. 26, § 7º da Resolução CGSN nº 140/2018
      if (rbtConsiderada === 0 && fsConsiderada === 0) {
        casoEspecial = 'ambos_zero';
        fatorRReal = FATOR_R_FIXO_FOLHA_ZERO; // 0,01 (1,00%)
        fatorRPercentual = 1.0;
        atingiuCorte = false;
        anexoEnquadrado = ANEXOS_FATOR_R.ANEXO_V;
        regraAplicadaDescricao = 'FS12 = 0 e RBT12r = 0: Fator R fixado em 1,00% (Resolução CGSN nº 140/2018, art. 26, § 7º, inciso I)';
        memoriaCalculo.push('Caso especial (art. 26, § 7º, inciso I da Resolução CGSN nº 140/2018): se FS12 e RBT12r forem iguais a 0 (zero), o fator "r" será igual a 0,01 (1,00%), resultando no enquadramento no Anexo V.');
      } else if (rbtConsiderada === 0 && fsConsiderada > 0) {
        casoEspecial = 'receita_zero_folha_positiva';
        fatorRReal = FATOR_R_FIXO_RECEITA_ZERO; // 0,28 (28,00%)
        fatorRPercentual = 28.0;
        atingiuCorte = true;
        anexoEnquadrado = ANEXOS_FATOR_R.ANEXO_III;
        regraAplicadaDescricao = 'FS12 > 0 e RBT12r = 0: Fator R fixado em 28,00% (Resolução CGSN nº 140/2018, art. 26, § 7º, inciso II)';
        memoriaCalculo.push('Caso especial (art. 26, § 7º, inciso II da Resolução CGSN nº 140/2018): se a FS12 for maior do que 0 (zero) e a RBT12r for igual a 0 (zero), o fator "r" será igual a 0,28 (28,00%), enquadrando a atividade no Anexo III.');
      } else if (rbtConsiderada > 0 && fsConsiderada === 0) {
        casoEspecial = 'folha_zero_receita_positiva';
        fatorRReal = FATOR_R_FIXO_FOLHA_ZERO; // 0,01 (1,00%)
        fatorRPercentual = 1.0;
        atingiuCorte = false;
        anexoEnquadrado = ANEXOS_FATOR_R.ANEXO_V;
        regraAplicadaDescricao = 'FS12 = 0 e RBT12r > 0: Fator R fixado em 1,00% (Resolução CGSN nº 140/2018, art. 26, § 7º, inciso IV)';
        memoriaCalculo.push('Caso especial (art. 26, § 7º, inciso IV da Resolução CGSN nº 140/2018): se a FS12 for igual a 0 (zero) e a RBT12r for maior do que 0 (zero), o fator "r" será igual a 0,01 (1,00%), resultando no enquadramento no Anexo V.');
      } else {
        // Cálculo normal
        fatorRReal = fsConsiderada / rbtConsiderada;
        fatorRPercentual = roundDecimal(fatorRReal * 100, 4);
        atingiuCorte = fatorRReal >= PERCENTUAL_CORTE_FATOR_R;
        anexoEnquadrado = atingiuCorte ? ANEXOS_FATOR_R.ANEXO_III : ANEXOS_FATOR_R.ANEXO_V;
        regraAplicadaDescricao = 'Fórmula geral da LC nº 123/2006 (FS12 ÷ RBT12r, Resolução CGSN nº 140/2018, art. 26, § 7º, inciso III)';

        memoriaCalculo.push(`Cálculo da razão: FS12 (${formatCurrency(fsConsiderada)}) ÷ RBT12r (${formatCurrency(rbtConsiderada)}) = ${roundDecimal(fatorRReal, 6)} (${formatPercent(fatorRReal, 4)}).`);
        memoriaCalculo.push(`Critério de corte: ${fatorRReal >= PERCENTUAL_CORTE_FATOR_R ? 'Fator R ≥ 28,00% ➔ Enquadramento no ANEXO III' : 'Fator R < 28,00% ➔ Enquadramento no ANEXO V'}.`);
      }
    } else if (modoApuracao === MODOS_APURACAO.INICIO_MES_1) {
      // Início de atividade — 1º mês (próprio mês de início: FSPA e RPAr proporcionalizados por 12)
      const folhaMes = Math.max(0, parseFlexibleNumber(input.folhaMesAtual !== undefined ? input.folhaMesAtual : input.folhaConsolidada));
      const receitaMes = Math.max(0, parseFlexibleNumber(input.receitaMesAtual !== undefined ? input.receitaMesAtual : input.receitaConsolidada));

      fsConsiderada = roundCurrency(folhaMes * 12);
      rbtConsiderada = roundCurrency(receitaMes * 12);
      mesesJanelaReferencia = 1;
      janelaReferenciaDescricao = 'Próprio mês de início de atividade (FSPA e RPAr anualizados por 12)';

      memoriaCalculo.push(`Ano de competência: ${anoReferencia} — Início de atividade (1º mês de funcionamento).`);
      memoriaCalculo.push(`Valores apurados na primeira competência: Folha no mês (FSPA) = ${formatCurrency(folhaMes)} | Receita no mês (RPAr) = ${formatCurrency(receitaMes)}.`);
      memoriaCalculo.push(`Proporcionalização por 12 (Resolução CGSN nº 140/2018, art. 26): FS12 proporcional = ${formatCurrency(fsConsiderada)} | RBT12r proporcional = ${formatCurrency(rbtConsiderada)}.`);

      if (receitaMes === 0 && folhaMes === 0) {
        // FSPA = 0 e RPAr = 0: ausência de regra oficial expressa para atribuir percentual ou anexo
        casoEspecial = 'inicio_mes_1_ambos_zero';
        fatorRReal = null;
        fatorRPercentual = null;
        atingiuCorte = null;
        anexoEnquadrado = null;
        regraAplicadaDescricao = '1º mês de atividade sem receita e sem folha (enquadramento não determinado automaticamente)';
        memoriaCalculo.push('Situação de indefinição: Na primeira competência de atividade com receita zero e folha zero (FSPA = 0 e RPAr = 0), a legislação do Simples Nacional não prevê regra expressa de atribuição de percentual ou anexo fictício.');
        memoriaCalculo.push('Orientação: O enquadramento tributário não pode ser determinado automaticamente nessa situação. Recomenda-se a conferência direta no PGDAS-D ou junto a um profissional contábil.');
        warnings.push('No 1º mês de funcionamento sem folha e sem faturamento (FSPA = 0 e RPAr = 0), o enquadramento no Anexo III ou Anexo V não pode ser determinado automaticamente pela legislação do Simples Nacional (ausência de regra expressa no art. 26, § 6º da Resolução CGSN nº 140/2018). Consulte o PGDAS-D no momento da apuração ou confirme com seu contador.');
      } else if (receitaMes === 0 && folhaMes > 0) {
        casoEspecial = 'inicio_sem_receita';
        fatorRReal = FATOR_R_FIXO_RECEITA_ZERO; // 28%
        fatorRPercentual = 28.0;
        atingiuCorte = true;
        anexoEnquadrado = ANEXOS_FATOR_R.ANEXO_III;
        regraAplicadaDescricao = 'FSPA > 0 e RPAr = 0: Fator R fixado em 28,00% (Resolução CGSN nº 140/2018, art. 26, § 6º, inciso I)';
        memoriaCalculo.push('Regra específica do Simples Nacional (art. 26, § 6º, inciso I da Resolução CGSN nº 140/2018): empresa no 1º mês com folha paga e sem receita no período tem o Fator R fixado em 28,00% (Anexo III).');
      } else if (receitaMes > 0 && folhaMes === 0) {
        casoEspecial = 'inicio_sem_folha';
        fatorRReal = FATOR_R_FIXO_FOLHA_ZERO; // 1%
        fatorRPercentual = 1.0;
        atingiuCorte = false;
        anexoEnquadrado = ANEXOS_FATOR_R.ANEXO_V;
        regraAplicadaDescricao = 'FSPA = 0 e RPAr > 0: Fator R fixado em 1,00% (Resolução CGSN nº 140/2018, art. 26, § 6º, inciso II)';
        memoriaCalculo.push('Regra específica do Simples Nacional (art. 26, § 6º, inciso II da Resolução CGSN nº 140/2018): quando a empresa em início de atividade aufere receita no mês mas não registra folha de pagamento, o Fator R é fixado em 1,00% (Anexo V).');
      } else {
        fatorRReal = folhaMes / receitaMes;
        fatorRPercentual = roundDecimal(fatorRReal * 100, 4);
        atingiuCorte = fatorRReal >= PERCENTUAL_CORTE_FATOR_R;
        anexoEnquadrado = atingiuCorte ? ANEXOS_FATOR_R.ANEXO_III : ANEXOS_FATOR_R.ANEXO_V;
        regraAplicadaDescricao = 'Início de atividade no 1º mês proporcionalizado por 12 (FSPA ÷ RPAr, Resolução CGSN nº 140/2018, art. 26, § 6º)';
        memoriaCalculo.push(`Cálculo da razão proporcional: ${formatCurrency(fsConsiderada)} ÷ ${formatCurrency(rbtConsiderada)} = ${formatPercent(fatorRReal, 4)}.`);
      }
    } else {
      // Início de atividade — 2º ao 12º mês (proporcionalização pela média dos meses anteriores decorridos)
      let mesesDecorridos = 1;
      if (input.modoApuracao === MODOS_APURACAO.INICIO_MES_2 || input.mesAtividade === 2) {
        mesesDecorridos = 1;
      } else if (input.mesAtividade !== undefined && input.mesAtividade >= 3) {
        mesesDecorridos = input.mesAtividade - 1;
      } else if (input.mesesInicio >= 3 && input.mesesInicio <= 12) {
        // Se informado número do mês de funcionamento
        mesesDecorridos = input.mesesInicio - 1;
      } else {
        mesesDecorridos = Math.max(1, input.mesesInicio);
      }

      mesesJanelaReferencia = mesesDecorridos;
      janelaReferenciaDescricao = `${mesesDecorridos} mês(es) anterior(es) ao período de apuração (Resolução CGSN nº 140/2018, art. 26, § 4º)`;

      const folhaAcum = Math.max(0, parseFlexibleNumber(input.folhaAcumuladaAnterior !== undefined ? input.folhaAcumuladaAnterior : input.folhaConsolidada));
      const receitaAcum = Math.max(0, parseFlexibleNumber(input.receitaAcumuladaAnterior !== undefined ? input.receitaAcumuladaAnterior : input.receitaConsolidada));

      const mediaFolha = folhaAcum / mesesDecorridos;
      const mediaReceita = receitaAcum / mesesDecorridos;

      fsConsiderada = roundCurrency(mediaFolha * 12);
      rbtConsiderada = roundCurrency(mediaReceita * 12);

      memoriaCalculo.push(`Ano de competência: ${anoReferencia} — Início de atividade com ${mesesDecorridos} mês(es) anterior(es) decorrido(s).`);
      memoriaCalculo.push(`Janela temporal de referência: ${janelaReferenciaDescricao}.`);
      memoriaCalculo.push(`Acumulado nos meses anteriores: Folha acumulada = ${formatCurrency(folhaAcum)} | Receita acumulada = ${formatCurrency(receitaAcum)}.`);
      memoriaCalculo.push(`Média aritmética proporcionalizada por 12 (Resolução CGSN nº 140/2018): FS12 proporcional = ${formatCurrency(fsConsiderada)} | RBT12r proporcional = ${formatCurrency(rbtConsiderada)}.`);

      if (receitaAcum === 0 && folhaAcum === 0) {
        casoEspecial = 'ambos_zero';
        fatorRReal = FATOR_R_FIXO_FOLHA_ZERO; // 1%
        fatorRPercentual = 1.0;
        atingiuCorte = false;
        anexoEnquadrado = ANEXOS_FATOR_R.ANEXO_V;
        regraAplicadaDescricao = `Início de atividade (${mesesDecorridos} meses anteriores) com FS = 0 e RBT = 0: Fator R fixado em 1,00% (Resolução CGSN nº 140/2018, art. 26, § 7º, inciso I)`;
        memoriaCalculo.push('Sem movimentação de receita e folha nos meses anteriores decorridos: aplica-se Fator R de 1,00% (Anexo V).');
      } else if (receitaAcum === 0 && folhaAcum > 0) {
        casoEspecial = 'inicio_sem_receita';
        fatorRReal = FATOR_R_FIXO_RECEITA_ZERO; // 28%
        fatorRPercentual = 28.0;
        atingiuCorte = true;
        anexoEnquadrado = ANEXOS_FATOR_R.ANEXO_III;
        regraAplicadaDescricao = `Início de atividade (${mesesDecorridos} meses) com folha positiva e receita zero: Fator R fixado em 28,00% (Resolução CGSN nº 140/2018, art. 26, § 7º, inciso II)`;
        memoriaCalculo.push('Regra específica do Simples Nacional: folha paga nos meses anteriores com receita zero considera Fator R de 28,00% (Anexo III).');
      } else if (receitaAcum > 0 && folhaAcum === 0) {
        casoEspecial = 'inicio_sem_folha';
        fatorRReal = FATOR_R_FIXO_FOLHA_ZERO; // 1%
        fatorRPercentual = 1.0;
        atingiuCorte = false;
        anexoEnquadrado = ANEXOS_FATOR_R.ANEXO_V;
        regraAplicadaDescricao = `Início de atividade (${mesesDecorridos} meses) com faturamento e sem folha: Fator R fixado em 1,00% (Resolução CGSN nº 140/2018, art. 26, § 7º, inciso IV)`;
        memoriaCalculo.push('Regra específica do Simples Nacional: empresa em início de atividade sem histórico de folha nos meses anteriores é tributada pelo Anexo V (Fator R = 1,00%).');
      } else {
        fatorRReal = fsConsiderada / rbtConsiderada;
        fatorRPercentual = roundDecimal(fatorRReal * 100, 4);
        atingiuCorte = fatorRReal >= PERCENTUAL_CORTE_FATOR_R;
        anexoEnquadrado = atingiuCorte ? ANEXOS_FATOR_R.ANEXO_III : ANEXOS_FATOR_R.ANEXO_V;
        regraAplicadaDescricao = `Início de atividade (${mesesDecorridos} meses anteriores) pela média aritmética proporcionalizada`;
        memoriaCalculo.push(`Cálculo da razão: ${formatCurrency(fsConsiderada)} ÷ ${formatCurrency(rbtConsiderada)} = ${formatPercent(fatorRReal, 4)}.`);
      }
    }
  }

  // -------------------------------------------------------------------------
  // CENÁRIO 2: ANO-CALENDÁRIO 2027 EM DIANTE (Resolução CGSN nº 190/2026)
  // -------------------------------------------------------------------------
  else if (anoReferencia === 2027) {
    memoriaCalculo.push(`Ano de competência da apuração: ${anoReferencia} (Regulamentação: Resolução CGSN nº 190/2026, com efeitos a partir de 01/01/2027).`);

    const isDoisPrimeirosMeses =
      modoApuracao === MODOS_APURACAO.INICIO_MES_1 ||
      modoApuracao === MODOS_APURACAO.INICIO_MES_2 ||
      input.mesAtividade === 1 ||
      input.mesAtividade === 2;

    const isInicioMais2Menos14 =
      !isDoisPrimeirosMeses &&
      (modoApuracao === MODOS_APURACAO.INICIO_MESES_3_12 ||
        modoApuracao === MODOS_APURACAO.INICIO_MESES_3_13 ||
        (input.mesAtividade !== undefined && input.mesAtividade >= 3 && input.mesAtividade <= 13));

    if (isDoisPrimeirosMeses) {
      // REGRA INOVADORA DA RESOLUÇÃO CGSN Nº 190/2026 (art. 26, § 6º):
      // Para os dois primeiros meses de início de atividade, o Fator R é fixado por presunção legal em 28% (0,28),
      // garantindo o enquadramento direto no Anexo III sem exigir histórico retroativo de folha de pagamento.
      casoEspecial = 'inicio_2027_dois_primeiros_meses';
      fatorRReal = FATOR_R_PRESUMIDO_INICIO_2027; // 28,00%
      fatorRPercentual = 28.0;
      atingiuCorte = true;
      anexoEnquadrado = ANEXOS_FATOR_R.ANEXO_III;
      mesesJanelaReferencia = 0;
      janelaReferenciaDescricao = 'Dois primeiros meses de atividade (presunção legal da Resolução CGSN nº 190/2026, art. 26, § 6º)';
      regraAplicadaDescricao = 'Início de atividade em 2027 nos dois primeiros meses — Presunção legal de Fator R = 28,00% (Resolução CGSN nº 190/2026, art. 26, § 6º)';

      const compFolha = calcularComposicaoFolha(input);
      const compReceita = calcularComposicaoReceita(input);
      fsConsiderada = compFolha.total;
      rbtConsiderada = compReceita.total;

      memoriaCalculo.push('Tempo de atividade: Empresa nos dois primeiros meses de início de funcionamento.');
      memoriaCalculo.push(`Janela de apuração: ${janelaReferenciaDescricao}.`);
      memoriaCalculo.push('Critério normativo (Resolução CGSN nº 190/2026, art. 26, § 6º): o fator "r" referente aos 2 (dois) primeiros meses de início de atividade da empresa é considerado fixo em 0,28 (28,00%).');
      memoriaCalculo.push('Enquadramento garantido no ANEXO III para empresas recém-abertas nas competências correspondentes aos dois primeiros meses.');
      warnings.push(
        'VIGÊNCIA 2027 (RESOLUÇÃO CGSN Nº 190/2026): Para os dois primeiros meses de início de atividade a partir de 01/01/2027, o Fator R é fixado em 28,00%, enquadrando a empresa diretamente no Anexo III. A partir do terceiro mês, a apuração considerará a nova janela antecedente ao mês anterior.'
      );
    } else if (isInicioMais2Menos14) {
      // 3º ao 13º mês em 2027: empresa com mais de 2 e menos de 14 meses de atividade
      // Nova janela da Resolução CGSN nº 190/2026: meses antecedentes ao mês anterior ao período de apuração
      let mesAtividade = 3;
      let mesesNaJanela = 1;

      if (input.mesAtividade !== undefined) {
        mesAtividade = input.mesAtividade;
        mesesNaJanela = Math.max(1, mesAtividade - 2);
      } else if (input.mesesInicio >= 3 && input.mesesInicio <= 13) {
        mesAtividade = input.mesesInicio;
        mesesNaJanela = Math.max(1, mesAtividade - 2);
      } else if (input.mesesInicio >= 1 && input.mesesInicio <= 11) {
        mesesNaJanela = input.mesesInicio;
        mesAtividade = mesesNaJanela + 2;
      }

      mesesJanelaReferencia = mesesNaJanela;
      janelaReferenciaDescricao = `${mesesNaJanela} mês(es) antecedente(s) ao mês anterior ao período de apuração (Resolução CGSN nº 190/2026)`;

      const folhaAcum = Math.max(0, parseFlexibleNumber(input.folhaAcumuladaAnterior !== undefined ? input.folhaAcumuladaAnterior : input.folhaConsolidada));
      const receitaAcum = Math.max(0, parseFlexibleNumber(input.receitaAcumuladaAnterior !== undefined ? input.receitaAcumuladaAnterior : input.receitaConsolidada));

      const mediaFolha = folhaAcum / mesesNaJanela;
      const mediaReceita = receitaAcum / mesesNaJanela;

      fsConsiderada = roundCurrency(mediaFolha * 12);
      rbtConsiderada = roundCurrency(mediaReceita * 12);

      memoriaCalculo.push(`Tempo de atividade: ${mesAtividade}º mês de funcionamento (empresa com mais de 2 e menos de 14 meses de atividade).`);
      memoriaCalculo.push(`Janela de referência temporal (Resolução CGSN nº 190/2026): ${janelaReferenciaDescricao}.`);
      memoriaCalculo.push(`Explicação da janela para o ${mesAtividade}º mês: o mês anterior ao PA é o ${mesAtividade - 1}º mês; portanto, a janela antecedente contempla ${mesesNaJanela} mês(es) (do 1º ao ${mesesNaJanela}º mês).`);
      memoriaCalculo.push(`Acumulado na janela antecedente: Folha acumulada = ${formatCurrency(folhaAcum)} | Receita acumulada = ${formatCurrency(receitaAcum)}.`);
      memoriaCalculo.push(`Anualização por 12: FS12 proporcional = ${formatCurrency(fsConsiderada)} | RBT12r proporcional = ${formatCurrency(rbtConsiderada)}.`);

      if (receitaAcum === 0 && folhaAcum === 0) {
        casoEspecial = 'ambos_zero';
        fatorRReal = FATOR_R_FIXO_FOLHA_ZERO; // 1%
        fatorRPercentual = 1.0;
        atingiuCorte = false;
        anexoEnquadrado = ANEXOS_FATOR_R.ANEXO_V;
        regraAplicadaDescricao = `Início de atividade em 2027 (${mesAtividade}º mês) com FS = 0 e RBT = 0: Fator R fixado em 1,00% (Resolução CGSN nº 140/2018, art. 26, § 7º, inciso I)`;
        memoriaCalculo.push('Sem movimentação na janela antecedente: Fator R fixado em 1,00% (Anexo V).');
      } else if (receitaAcum === 0 && folhaAcum > 0) {
        casoEspecial = 'inicio_sem_receita';
        fatorRReal = FATOR_R_FIXO_RECEITA_ZERO; // 28%
        fatorRPercentual = 28.0;
        atingiuCorte = true;
        anexoEnquadrado = ANEXOS_FATOR_R.ANEXO_III;
        regraAplicadaDescricao = `Início de atividade em 2027 (${mesAtividade}º mês) com folha positiva e receita zero: Fator R fixado em 28,00% (Resolução CGSN nº 140/2018, art. 26, § 7º, inciso II)`;
        memoriaCalculo.push('Folha positiva e receita zero na janela antecedente: Fator R considerado em 28,00% (Anexo III).');
      } else if (receitaAcum > 0 && folhaAcum === 0) {
        casoEspecial = 'inicio_sem_folha';
        fatorRReal = FATOR_R_FIXO_FOLHA_ZERO; // 1%
        fatorRPercentual = 1.0;
        atingiuCorte = false;
        anexoEnquadrado = ANEXOS_FATOR_R.ANEXO_V;
        regraAplicadaDescricao = `Início de atividade em 2027 (${mesAtividade}º mês) com faturamento e sem folha: Fator R fixado em 1,00% (Resolução CGSN nº 140/2018, art. 26, § 7º, inciso IV)`;
        memoriaCalculo.push('Receita positiva e folha zero na janela antecedente: Fator R fixado em 1,00% (Anexo V).');
      } else {
        fatorRReal = fsConsiderada / rbtConsiderada;
        fatorRPercentual = roundDecimal(fatorRReal * 100, 4);
        atingiuCorte = fatorRReal >= PERCENTUAL_CORTE_FATOR_R;
        anexoEnquadrado = atingiuCorte ? ANEXOS_FATOR_R.ANEXO_III : ANEXOS_FATOR_R.ANEXO_V;
        regraAplicadaDescricao = `Início de atividade em 2027 (${mesAtividade}º mês, ${mesesNaJanela} mês(es) na janela antecedente) — histórico anualizado por 12 (Resolução CGSN nº 140/2018, art. 26, § 7º)`;
        memoriaCalculo.push(`Cálculo da razão: ${formatCurrency(fsConsiderada)} ÷ ${formatCurrency(rbtConsiderada)} = ${formatPercent(fatorRReal, 4)} ➔ ${atingiuCorte ? 'ANEXO III' : 'ANEXO V'}.`);
      }
    } else {
      // Regra geral em 2027 (empresa com mais de 13 meses de atividade, ou seja, 14º mês em diante)
      // Janela da nova redação da Resolução CGSN nº 190/2026: os 12 meses antecedentes ao mês anterior ao período de apuração
      const compFolha = calcularComposicaoFolha(input);
      const compReceita = calcularComposicaoReceita(input);
      fsConsiderada = compFolha.total;
      rbtConsiderada = compReceita.total;
      mesesJanelaReferencia = 12;
      janelaReferenciaDescricao = '12 meses antecedentes ao mês anterior ao período de apuração (Resolução CGSN nº 140/2018, art. 26, § 7º, alterada pela Resolução CGSN nº 190/2026)';

      memoriaCalculo.push('Tempo de atividade: Empresa em funcionamento regular (mais de 13 meses de atividade; 14º mês em diante).');
      memoriaCalculo.push(`Janela temporal de referência: ${janelaReferenciaDescricao}.`);
      memoriaCalculo.push(`FS12 considerada (regime de caixa, janela antecedente ao mês anterior): ${formatCurrency(fsConsiderada)}.`);
      memoriaCalculo.push(`RBT12r considerada (janela antecedente ao mês anterior): ${formatCurrency(rbtConsiderada)}.`);

      if (rbtConsiderada === 0 && fsConsiderada === 0) {
        casoEspecial = 'ambos_zero';
        fatorRReal = FATOR_R_FIXO_FOLHA_ZERO; // 1%
        fatorRPercentual = 1.0;
        atingiuCorte = false;
        anexoEnquadrado = ANEXOS_FATOR_R.ANEXO_V;
        regraAplicadaDescricao = 'Regra geral de 2027 com FS12 = 0 e RBT12r = 0: Fator R fixado em 1,00% (Resolução CGSN nº 140/2018, art. 26, § 7º, inciso I)';
        memoriaCalculo.push('Sem receita bruta e sem folha nos 12 meses antecedentes ao mês anterior: Fator R fixado em 1,00% (Anexo V).');
      } else if (rbtConsiderada === 0 && fsConsiderada > 0) {
        casoEspecial = 'receita_zero_folha_positiva';
        fatorRReal = FATOR_R_FIXO_RECEITA_ZERO; // 28%
        fatorRPercentual = 28.0;
        atingiuCorte = true;
        anexoEnquadrado = ANEXOS_FATOR_R.ANEXO_III;
        regraAplicadaDescricao = 'Regra geral de 2027 com folha positiva e receita zero: Fator R fixado em 28,00% (Resolução CGSN nº 140/2018, art. 26, § 7º, inciso II)';
        memoriaCalculo.push('Folha positiva e receita zero nos 12 meses antecedentes ao mês anterior: Fator R fixado em 28,00% (Anexo III).');
      } else if (rbtConsiderada > 0 && fsConsiderada === 0) {
        casoEspecial = 'folha_zero_receita_positiva';
        fatorRReal = FATOR_R_FIXO_FOLHA_ZERO; // 1%
        fatorRPercentual = 1.0;
        atingiuCorte = false;
        anexoEnquadrado = ANEXOS_FATOR_R.ANEXO_V;
        regraAplicadaDescricao = 'Regra geral de 2027 com folha zero e receita positiva: Fator R fixado em 1,00% (Resolução CGSN nº 140/2018, art. 26, § 7º, inciso IV)';
        memoriaCalculo.push('Receita positiva e folha zero nos 12 meses antecedentes ao mês anterior: Fator R fixado em 1,00% (Anexo V).');
      } else {
        fatorRReal = fsConsiderada / rbtConsiderada;
        fatorRPercentual = roundDecimal(fatorRReal * 100, 4);
        atingiuCorte = fatorRReal >= PERCENTUAL_CORTE_FATOR_R;
        anexoEnquadrado = atingiuCorte ? ANEXOS_FATOR_R.ANEXO_III : ANEXOS_FATOR_R.ANEXO_V;
        regraAplicadaDescricao = 'Regra geral de 2027 — 12 meses antecedentes ao mês anterior ao período de apuração (Resolução CGSN nº 140/2018, art. 26, § 7º, alterada pela Resolução CGSN nº 190/2026)';
        memoriaCalculo.push(`Cálculo da razão: ${formatCurrency(fsConsiderada)} ÷ ${formatCurrency(rbtConsiderada)} = ${formatPercent(fatorRReal, 4)}.`);
        memoriaCalculo.push(`Enquadramento resultante: ${atingiuCorte ? 'ANEXO III (Fator R ≥ 28,00%)' : 'ANEXO V (Fator R < 28,00%)'}.`);
      }
    }
  }

  // Alertas sobre despesas não computáveis e regime de caixa
  warnings.push(
    'REGIME DE CAIXA DA FOLHA: O valor da folha de salários (FS12) deve computar estritamente os valores efetivamente pagos nos 12 meses da janela de referência, independentemente de a empresa optar pelo regime de competência para tributação do faturamento (Solução de Consulta Cosit nº 17/2021).'
  );
  warnings.push(
    'EXCLUSÕES VEDADAS NA FOLHA: Não integram a FS12: aluguéis pagos, lucros distribuídos a sócios/titular, valores pagos a estagiários e serviços pagos a Microempreendedores Individuais (MEI).'
  );

  return {
    ok: true,
    error: null,
    data: {
      anoReferencia,
      modoApuracao,
      mesAtividade: input.mesAtividade,
      mesesJanelaReferencia,
      janelaReferenciaDescricao,
      fsConsiderada,
      rbtConsiderada,
      fatorRReal,
      fatorRPercentual,
      atingiuCorte,
      anexoEnquadrado,
      nomeAnexo: anexoEnquadrado ? ROTULOS_ANEXO[anexoEnquadrado] : 'Indeterminado',
      regraAplicadaDescricao,
      casoEspecial,
      dataConsultaOficial: DATA_CONSULTA_OFICIAL
    },
    warnings,
    memoriaCalculo
  };
}

/**
 * Formata os dados de resultado para renderização amigável na interface.
 *
 * @param {object} data
 * @returns {object}
 */
export function formatResult(data) {
  if (!data) return {};

  const {
    anoReferencia,
    fsConsiderada,
    rbtConsiderada,
    fatorRReal,
    fatorRPercentual,
    atingiuCorte,
    anexoEnquadrado,
    nomeAnexo,
    regraAplicadaDescricao,
    casoEspecial
  } = data;

  if (casoEspecial === 'inicio_mes_1_ambos_zero' || fatorRReal === null || anexoEnquadrado === null) {
    return {
      anoReferencia,
      fsFormatada: formatCurrency(fsConsiderada),
      rbtFormatada: formatCurrency(rbtConsiderada),
      fatorRPercentualFormatado: 'Não determinado',
      fatorRPercentualDetalhado: 'Não determinado',
      atingiuCorte: null,
      anexoId: 'indeterminado',
      anexoNome: 'Indeterminado (sem regra expressa na legislação)',
      regraAplicada: regraAplicadaDescricao,
      anexoBadge: 'Indeterminado',
      anexoStatusClass: 'badge-secondary',
      resumoMensagem: 'No próprio mês de início de atividade com receita zero e folha zero, o enquadramento não pode ser determinado automaticamente pela legislação do Simples Nacional (art. 26, § 6º da Resolução CGSN nº 140/2018). Consulte o PGDAS-D ou um profissional contábil.'
    };
  }

  return {
    anoReferencia,
    fsFormatada: formatCurrency(fsConsiderada),
    rbtFormatada: formatCurrency(rbtConsiderada),
    fatorRPercentualFormatado: formatPercent(fatorRReal, 2),
    fatorRPercentualDetalhado: formatPercent(fatorRReal, 4),
    atingiuCorte,
    anexoId: anexoEnquadrado,
    anexoNome: nomeAnexo,
    regraAplicada: regraAplicadaDescricao,
    anexoBadge: atingiuCorte ? 'Anexo III' : 'Anexo V',
    anexoStatusClass: atingiuCorte ? 'badge-success' : 'badge-warning',
    resumoMensagem: atingiuCorte
      ? `Fator R apurado em ${formatPercent(fatorRReal, 2)} (≥ 28,00%): sua atividade tributará pelo ANEXO III (alíquotas a partir de 6,00%).`
      : `Fator R apurado em ${formatPercent(fatorRReal, 2)} (< 28,00%): sua atividade tributará pelo ANEXO V (alíquotas a partir de 15,50%).`
  };
}

/**
 * Constrói o texto formatado para a funcionalidade de cópia rápida.
 *
 * @param {object} calculationResult
 * @returns {string}
 */
export function buildCopyText(calculationResult) {
  if (!calculationResult || !calculationResult.data) return '';

  const { data, warnings, memoriaCalculo } = calculationResult;

  const lines = [
    `Calculadora Fator R Simples Nacional (${data.anoReferencia}) — Calculadora Master`,
    `Data da consulta: ${data.dataConsultaOficial}`,
    '--------------------------------------------------',
    `Janela de Referência: ${data.janelaReferenciaDescricao}`,
    `Folha de Salários Considerada (FS12): ${formatCurrency(data.fsConsiderada)} (Regime de Caixa)`,
    `Receita Bruta Total Considerada (RBT12r): ${formatCurrency(data.rbtConsiderada)}`,
    `Fator R Apurado: ${data.fatorRReal !== null ? formatPercent(data.fatorRReal, 4) : 'Não determinado automaticamente'}`,
    `Enquadramento Tributário: ${data.nomeAnexo}`,
    `Regra Aplicada: ${data.regraAplicadaDescricao}`,
    '--------------------------------------------------',
    'Memória de Cálculo:'
  ];

  memoriaCalculo.forEach((m) => lines.push(`• ${m}`));

  if (warnings && warnings.length > 0) {
    lines.push('--------------------------------------------------');
    lines.push('Avisos Legais Importantes:');
    warnings.forEach((w) => lines.push(`* ${w}`));
  }

  lines.push('--------------------------------------------------');
  lines.push('Simulação baseada na LC 123/2006, Res. CGSN 140/2018, SC Cosit 17/2021 e Res. CGSN 190/2026.');
  lines.push('https://www.calculadoramaster.com/tools/financas/fator-r.html');

  return lines.join('\n');
}

/**
 * Conecta a interface DOM aos cálculos, validações e ações de usuário.
 *
 * @param {HTMLElement|Document} root
 * @returns {object|null}
 */
export function setupTool(root) {
  if (!root) return null;

  const form = root.querySelector('#formFatorR');
  if (!form) return null;

  // Seletores principais
  const selAnoReferencia = root.querySelector('#anoReferenciaFR');
  const selModoApuracao = root.querySelector('#modoApuracaoFR');
  const selModoFolha = root.querySelector('#modoEntradaFolhaFR');
  const selModoReceita = root.querySelector('#modoEntradaReceitaFR');

  // Grupos condicionais
  const grupoRegraGeral = root.querySelector('#grupoRegraGeralFR');
  const grupoInicioAtividade = root.querySelector('#grupoInicioAtividadeFR');
  const grupoMesesInicio = root.querySelector('#grupoMesesInicioFR');

  // Campos de Folha
  const grupoFolhaConsolidada = root.querySelector('#grupoFolhaConsolidadaFR');
  const grupoFolhaDetalhada = root.querySelector('#grupoFolhaDetalhadaFR');
  const inFolhaConsolidada = root.querySelector('#folhaConsolidadaFR');
  const inSalarios = root.querySelector('#salariosFR');
  const inProLabore = root.querySelector('#proLaboreFR');
  const inDecimoTerceiro = root.querySelector('#decimoTerceiroFR');
  const inCppPatronal = root.querySelector('#cppPatronalFR');
  const inFgts = root.querySelector('#fgtsFR');

  // Campos de Receita
  const grupoReceitaConsolidada = root.querySelector('#grupoReceitaConsolidadaFR');
  const grupoReceitaDetalhada = root.querySelector('#grupoReceitaDetalhadaFR');
  const inReceitaConsolidada = root.querySelector('#receitaConsolidadaFR');
  const inMercadoInterno = root.querySelector('#mercadoInternoFR');
  const inExportacoes = root.querySelector('#exportacoesFR');

  // Campos de Início de Atividade
  const inMesesInicio = root.querySelector('#mesesInicioFR');
  const inFolhaMesAtual = root.querySelector('#folhaMesAtualFR');
  const inReceitaMesAtual = root.querySelector('#receitaMesAtualFR');
  const inFolhaAcumuladaAnterior = root.querySelector('#folhaAcumuladaAnteriorFR');
  const inReceitaAcumuladaAnterior = root.querySelector('#receitaAcumuladaAnteriorFR');
  const grupoInicioMes1 = root.querySelector('#grupoInicioMes1FR');
  const grupoInicioMesesAnteriores = root.querySelector('#grupoInicioMesesAnterioresFR');
  const avisoRegra2027Inicio = root.querySelector('#avisoRegra2027InicioFR');

  // Botões
  const btnLimpar = root.querySelector('#btnLimparFR');
  const btnCopiar = root.querySelector('#btnCopiarFR');
  const btnCompartilhar = root.querySelector('#btnCompartilharFR');
  const btnImprimir = root.querySelector('#btnImprimirFR');

  // Painéis de saída
  const painelResultado = root.querySelector('#resultadoFatorR');
  const painelErro = root.querySelector('#erroFatorR');
  const painelStatus = root.querySelector('#statusFatorR');

  // Elementos do resultado
  const resFatorRPercentual = root.querySelector('#resFatorRPercentualFR');
  const resAnexoEnquadrado = root.querySelector('#resAnexoEnquadradoFR');
  const resBadgeAnexo = root.querySelector('#resBadgeAnexoFR');
  const resMensagemResumo = root.querySelector('#resMensagemResumoFR');
  const resFsConsiderada = root.querySelector('#resFsConsideradaFR');
  const resRbtConsiderada = root.querySelector('#resRbtConsideradaFR');
  const resRegraAplicada = root.querySelector('#resRegraAplicadaFR');
  const listaMemoria = root.querySelector('#listaMemoriaCalculoFR');
  const listaAvisos = root.querySelector('#listaAvisosFR');

  let currentCalculation = null;

  // Atualiza visibilidade dos grupos de entrada conforme seletores
  function atualizarVisibilidade() {
    const modo = selModoApuracao ? selModoApuracao.value : MODOS_APURACAO.REGRA_GERAL;
    const ano = selAnoReferencia ? parseInt(selAnoReferencia.value, 10) : 2026;
    const modoFolha = selModoFolha ? selModoFolha.value : MODOS_ENTRADA_FOLHA.CONSOLIDADA;
    const modoReceita = selModoReceita ? selModoReceita.value : MODOS_ENTRADA_RECEITA.CONSOLIDADA;

    const isInicio = modo !== MODOS_APURACAO.REGRA_GERAL;

    if (grupoRegraGeral) grupoRegraGeral.hidden = isInicio;
    if (grupoInicioAtividade) grupoInicioAtividade.hidden = !isInicio;

    if (!isInicio) {
      if (grupoFolhaConsolidada) grupoFolhaConsolidada.hidden = modoFolha !== MODOS_ENTRADA_FOLHA.CONSOLIDADA;
      if (grupoFolhaDetalhada) grupoFolhaDetalhada.hidden = modoFolha !== MODOS_ENTRADA_FOLHA.DETALHADA;
      if (grupoReceitaConsolidada) grupoReceitaConsolidada.hidden = modoReceita !== MODOS_ENTRADA_RECEITA.CONSOLIDADA;
      if (grupoReceitaDetalhada) grupoReceitaDetalhada.hidden = modoReceita !== MODOS_ENTRADA_RECEITA.DETALHADA;
    } else {
      const isMes1 = modo === MODOS_APURACAO.INICIO_MES_1;
      const isMes2 = modo === MODOS_APURACAO.INICIO_MES_2;
      const isMeses3a12 = modo === MODOS_APURACAO.INICIO_MESES_3_12 || modo === MODOS_APURACAO.INICIO_MESES_3_13;

      if (grupoInicioMes1) grupoInicioMes1.hidden = !isMes1;
      if (grupoInicioMesesAnteriores) grupoInicioMesesAnteriores.hidden = isMes1;
      if (grupoMesesInicio) grupoMesesInicio.hidden = !isMeses3a12;

      // Alerta de 2027 para os 2 primeiros meses
      if (avisoRegra2027Inicio) {
        avisoRegra2027Inicio.hidden = !(ano === 2027 && (isMes1 || isMes2));
      }
    }
  }

  if (selAnoReferencia) selAnoReferencia.addEventListener('change', atualizarVisibilidade);
  if (selModoApuracao) selModoApuracao.addEventListener('change', atualizarVisibilidade);
  if (selModoFolha) selModoFolha.addEventListener('change', atualizarVisibilidade);
  if (selModoReceita) selModoReceita.addEventListener('change', atualizarVisibilidade);

  atualizarVisibilidade();

  // Executa o cálculo a partir do estado da tela
  function executarCalculo() {
    if (painelErro) {
      painelErro.hidden = true;
      painelErro.textContent = '';
    }

    const payload = {
      anoReferencia: selAnoReferencia ? selAnoReferencia.value : '2026',
      modoApuracao: selModoApuracao ? selModoApuracao.value : 'regra_geral',
      modoEntradaFolha: selModoFolha ? selModoFolha.value : 'consolidada',
      modoEntradaReceita: selModoReceita ? selModoReceita.value : 'consolidada',
      mesesInicio: inMesesInicio ? inMesesInicio.value : '2',
      folhaConsolidada: inFolhaConsolidada ? inFolhaConsolidada.value : '',
      salarios: inSalarios ? inSalarios.value : '',
      proLabore: inProLabore ? inProLabore.value : '',
      decimoTerceiro: inDecimoTerceiro ? inDecimoTerceiro.value : '',
      cppPatronal: inCppPatronal ? inCppPatronal.value : '',
      fgts: inFgts ? inFgts.value : '',
      receitaConsolidada: inReceitaConsolidada ? inReceitaConsolidada.value : '',
      mercadoInterno: inMercadoInterno ? inMercadoInterno.value : '',
      exportacoes: inExportacoes ? inExportacoes.value : '',
      folhaMesAtual: inFolhaMesAtual ? inFolhaMesAtual.value : '',
      receitaMesAtual: inReceitaMesAtual ? inReceitaMesAtual.value : '',
      folhaAcumuladaAnterior: inFolhaAcumuladaAnterior ? inFolhaAcumuladaAnterior.value : '',
      receitaAcumuladaAnterior: inReceitaAcumuladaAnterior ? inReceitaAcumuladaAnterior.value : ''
    };

    const result = calculate(payload);

    if (!result.ok) {
      if (painelErro) {
        painelErro.textContent = result.error;
        painelErro.hidden = false;
      }
      if (painelResultado) painelResultado.hidden = true;
      return null;
    }

    currentCalculation = result;
    const formatted = formatResult(result.data);

    if (resFatorRPercentual) resFatorRPercentual.textContent = formatted.fatorRPercentualFormatado;
    if (resAnexoEnquadrado) resAnexoEnquadrado.textContent = formatted.anexoNome;
    if (resBadgeAnexo) {
      resBadgeAnexo.textContent = formatted.anexoBadge;
      resBadgeAnexo.className = `tool-badge ${formatted.anexoStatusClass}`;
    }
    if (resMensagemResumo) resMensagemResumo.textContent = formatted.resumoMensagem;
    if (resFsConsiderada) resFsConsiderada.textContent = formatted.fsFormatada;
    if (resRbtConsiderada) resRbtConsiderada.textContent = formatted.rbtFormatada;
    if (resRegraAplicada) resRegraAplicada.textContent = formatted.regraAplicada;

    // Renderiza memória de cálculo
    if (listaMemoria) {
      listaMemoria.innerHTML = '';
      result.memoriaCalculo.forEach((item) => {
        const li = document.createElement('li');
        li.textContent = item;
        listaMemoria.appendChild(li);
      });
    }

    // Renderiza avisos
    if (listaAvisos) {
      listaAvisos.innerHTML = '';
      result.warnings.forEach((w) => {
        const li = document.createElement('li');
        li.textContent = w;
        listaAvisos.appendChild(li);
      });
    }

    if (painelResultado) painelResultado.hidden = false;

    // Inicializa botões de ação (copiar, compartilhar, imprimir)
    createResultActions({
      container: root.querySelector('.result-actions') || painelResultado,
      copyBtn: btnCopiar,
      shareBtn: btnCompartilhar,
      printBtn: btnImprimir,
      statusEl: painelStatus,
      onCopy: () => buildCopyText(currentCalculation),
      shareData: () => ({
        title: 'Cálculo do Fator R do Simples Nacional',
        text: formatted.anexoBadge === 'Indeterminado'
          ? 'Fator R Simples Nacional: enquadramento não determinado no 1º mês sem folha e sem receita.'
          : `Fator R apurado em ${formatted.fatorRPercentualFormatado}: enquadrado no ${formatted.anexoBadge}.`,
        url: window.location.href
      }),
      printOptions: {
        title: 'Cálculo do Fator R Simples Nacional'
      }
    });

    return result;
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    executarCalculo();
  });

  if (btnLimpar) {
    btnLimpar.addEventListener('click', () => {
      form.reset();
      if (selAnoReferencia) selAnoReferencia.value = '2026';
      if (selModoApuracao) selModoApuracao.value = MODOS_APURACAO.REGRA_GERAL;
      if (selModoFolha) selModoFolha.value = MODOS_ENTRADA_FOLHA.CONSOLIDADA;
      if (selModoReceita) selModoReceita.value = MODOS_ENTRADA_RECEITA.CONSOLIDADA;
      atualizarVisibilidade();
      if (painelResultado) painelResultado.hidden = true;
      if (painelErro) {
        painelErro.hidden = true;
        painelErro.textContent = '';
      }
      if (painelStatus) {
        painelStatus.textContent = '';
      }
      currentCalculation = null;
    });
  }

  return {
    executarCalculo,
    getCurrentCalculation: () => currentCalculation
  };
}

if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    setupTool(document);
  });
}
