/**
 * Calculadora INSS do Contribuinte Individual - Calculadora Master
 *
 * Estima a contribuição previdenciária mensal devida por contribuintes individuais
 * (autônomos por conta própria e prestadores de serviços) no ano-calendário de 2026, respeitando:
 * - Salário mínimo oficial de 2026: R$ 1.621,00;
 * - Teto previdenciário oficial do RGPS de 2026: R$ 8.475,55;
 * - Cenário A: Plano Normal (20% sobre o salário de contribuição, entre mínimo e teto);
 * - Cenário B: Plano Simplificado (11% exclusivamente sobre o salário mínimo para autônomo elegível que não presta serviços a empresas);
 * - Cenário C: Prestação de serviços a Pessoa Jurídica (retenção previdenciária de 11% na fonte pela empresa tomadora, art. 4º da Lei nº 10.666/2003);
 * - Regras de complementação para remunerações inferiores ao salário mínimo (EC nº 103/2019, art. 29; IN RFB nº 2.110/2022);
 * - Restrição expressa da alíquota de 5%, aplicável exclusivamente a MEI (DAS-MEI) e facultativo de baixa renda.
 *
 * Ferramenta exclusivamente informativa: não substitui o portal Meu INSS, o Sistema de Acréscimos Legais (SAL),
 * a DCTFWeb/eSocial e não constitui consultoria jurídica ou previdenciária individualizada.
 */

import { createResultActions } from '../core/result-actions.js';

export const ANO_REFERENCIA = 2026;
export const DATA_CONSULTA_OFICIAL = '2026-10-22';

export const SALARIO_MINIMO = 1621.0;
export const TETO_PREVIDENCIARIO = 8475.55;

export const ALIQUOTAS = Object.freeze({
  normal: 20.0,
  simplificado: 11.0,
  retencaoPJ: 11.0,
  meiOuBaixaRenda: 5.0
});

export const CODIGOS_PAGAMENTO = Object.freeze({
  normalMensal: '1007',
  simplificadoMensal: '1163',
  darfComplementacao: '1872'
});

export const FONTES_OFICIAIS = Object.freeze({
  tabelaContribuicaoMensal:
    'https://www.gov.br/inss/pt-br/direitos-e-deveres/inscricao-e-contribuicao/tabela-de-contribuicao-mensal',
  planoSimplificado:
    'https://www.gov.br/inss/pt-br/direitos-e-deveres/inscricao-e-contribuicao/plano-simplificado',
  contribuicaoSegurados:
    'https://www.gov.br/inss/pt-br/direitos-e-deveres/inscricao-e-contribuicao/contribuicao-dos-segurados-facultativo-e-contribuinte-individual',
  tabelaCodigosPagamento:
    'https://www.gov.br/inss/pt-br/direitos-e-deveres/inscricao-e-contribuicao/tabela-de-codigos-de-pagamento-de-contribuicao-previdenciaria',
  lei8212Planalto:
    'https://www.planalto.gov.br/ccivil_03/leis/l8212cons.htm',
  lei10666Planalto:
    'https://www.planalto.gov.br/ccivil_03/leis/2003/l10.666.htm',
  inRfb2110:
    'http://normas.receita.fazenda.gov.br/sijut2consulta/link.action?idAto=126484'
});

export const MODALIDADES = Object.freeze({
  PLANO_NORMAL: 'plano_normal',
  PLANO_SIMPLIFICADO: 'plano_simplificado',
  PRESTADOR_PJ: 'prestador_pj'
});

export const ROTULOS_MODALIDADE = Object.freeze({
  [MODALIDADES.PLANO_NORMAL]:
    'Autônomo por conta própria — Plano Normal (20% sobre salário de contribuição)',
  [MODALIDADES.PLANO_SIMPLIFICADO]:
    'Autônomo elegível — Plano Simplificado (11% exclusivamente sobre o salário mínimo)',
  [MODALIDADES.PRESTADOR_PJ]:
    'Prestador de serviços a Pessoa Jurídica (Regra geral: retenção de 11% pela empresa contratante)'
});

export const PARAMETROS_INSS_2026 = Object.freeze({
  anoReferencia: ANO_REFERENCIA,
  dataConsultaOficial: DATA_CONSULTA_OFICIAL,
  salarioMinimo: SALARIO_MINIMO,
  tetoPrevidenciario: TETO_PREVIDENCIARIO,
  aliquotas: ALIQUOTAS,
  codigosPagamento: CODIGOS_PAGAMENTO,
  fontesOficiais: FONTES_OFICIAIS
});

export const DEFAULTS = Object.freeze({
  anoReferencia: ANO_REFERENCIA,
  modalidade: MODALIDADES.PLANO_NORMAL,
  salarioContribuicao: SALARIO_MINIMO,
  remuneracaoPJ: 3000.0
});

export const LIMITS = Object.freeze({
  minSalarioContribuicao: 0,
  maxValorMonetario: 100000000
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

function normalizeModalidade(raw) {
  if (isBlank(raw)) return null;
  const val = String(raw).trim().toLowerCase();
  if (val === MODALIDADES.PLANO_NORMAL || val === 'normal' || val === '20%') {
    return MODALIDADES.PLANO_NORMAL;
  }
  if (val === MODALIDADES.PLANO_SIMPLIFICADO || val === 'simplificado' || val === '11%') {
    return MODALIDADES.PLANO_SIMPLIFICADO;
  }
  if (val === MODALIDADES.PRESTADOR_PJ || val === 'pj' || val === 'empresa' || val === 'retencao_pj') {
    return MODALIDADES.PRESTADOR_PJ;
  }
  return val;
}

/**
 * Normaliza as entradas da Calculadora INSS do Contribuinte Individual.
 *
 * @param {Record<string, unknown>} rawInput
 */
export function normalizeInput(rawInput = {}) {
  const hasAnoKey = 'anoReferencia' in rawInput || 'ano' in rawInput;
  const rawAno = hasAnoKey ? (rawInput.anoReferencia ?? rawInput.ano) : DEFAULTS.anoReferencia;

  const hasModalidadeKey = 'modalidade' in rawInput || 'cenario' in rawInput || 'plano' in rawInput;
  const rawModalidade = hasModalidadeKey
    ? (rawInput.modalidade ?? rawInput.cenario ?? rawInput.plano)
    : DEFAULTS.modalidade;
  const modalidade = normalizeModalidade(rawModalidade);

  const rawSalario =
    rawInput.salarioContribuicao ??
    rawInput.salario ??
    rawInput.baseContribuicao ??
    rawInput.valor;

  const rawRemuneracaoPJ =
    rawInput.remuneracaoPJ ??
    rawInput.remuneracaoPessoaJuridica ??
    rawInput.valorServicoPJ;

  const salarioInformado = !isBlank(rawSalario);
  const remuneracaoPJInformada = !isBlank(rawRemuneracaoPJ);

  const parsedAno = parseFlexibleNumber(rawAno);
  const parsedSalario = salarioInformado ? parseFlexibleNumber(rawSalario) : null;
  const parsedRemuneracaoPJ = remuneracaoPJInformada ? parseFlexibleNumber(rawRemuneracaoPJ) : null;

  return {
    anoInformado: !isBlank(rawAno),
    anoReferencia: parsedAno,
    modalidadeInformada: !isBlank(rawModalidade),
    modalidade,
    salarioInformado,
    salarioContribuicao: parsedSalario,
    remuneracaoPJInformada,
    remuneracaoPJ: parsedRemuneracaoPJ
  };
}

/**
 * Valida os parâmetros normalizados.
 *
 * @param {ReturnType<typeof normalizeInput>} input
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateInput(input) {
  const errors = [];

  if (!input || typeof input !== 'object') {
    return {
      valid: false,
      errors: ['Informe os parâmetros para calcular a contribuição previdenciária do Contribuinte Individual.']
    };
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
      `Esta calculadora atende exclusivamente a competência de ${ANO_REFERENCIA} (Salário Mínimo de R$ 1.621,00 e Teto do RGPS de R$ 8.475,55). Para outros anos, consulte as portarias interministeriais históricas no portal do INSS.`
    );
  }

  if (
    !input.modalidadeInformada ||
    !input.modalidade ||
    !Object.values(MODALIDADES).includes(input.modalidade)
  ) {
    errors.push(
      'Selecione uma modalidade de contribuição válida: Plano Normal (20%), Plano Simplificado (11%) ou Prestador de serviços a Pessoa Jurídica (Retenção 11%).'
    );
  }

  if (input.modalidade === MODALIDADES.PLANO_NORMAL) {
    if (!input.salarioInformado || input.salarioContribuicao === null || Number.isNaN(input.salarioContribuicao)) {
      errors.push('Informe o salário de contribuição mensal em reais (R$) para o Plano Normal.');
    } else if (input.salarioContribuicao < 0) {
      errors.push('O salário de contribuição não pode ser negativo.');
    } else if (input.salarioContribuicao > LIMITS.maxValorMonetario) {
      errors.push('O salário de contribuição informado excede o limite máximo permitido para simulação.');
    }
  }

  if (input.modalidade === MODALIDADES.PRESTADOR_PJ) {
    if (!input.remuneracaoPJInformada || input.remuneracaoPJ === null || Number.isNaN(input.remuneracaoPJ)) {
      errors.push('Informe a remuneração bruta recebida de Pessoa Jurídica no mês (R$).');
    } else if (input.remuneracaoPJ < 0) {
      errors.push('A remuneração de serviços prestados a Pessoa Jurídica não pode ser negativa.');
    } else if (input.remuneracaoPJ > LIMITS.maxValorMonetario) {
      errors.push('A remuneração informada excede o limite máximo permitido para simulação.');
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Executa o cálculo da contribuição do Contribuinte Individual (competência 2026).
 *
 * @param {Record<string, unknown>} rawInput
 */
export function calculate(rawInput = {}) {
  const normalized =
    rawInput &&
    typeof rawInput === 'object' &&
    'modalidadeInformada' in rawInput &&
    'anoInformado' in rawInput
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

  const { modalidade, anoReferencia } = normalized;
  const salarioMinimo = SALARIO_MINIMO;
  const tetoPrevidenciario = TETO_PREVIDENCIARIO;

  let baseCalculoInformada = 0;
  let baseCalculoConsiderada = 0;
  let aliquotaAplicada = 0;
  let valorContribuicao = 0;
  let responsabilidadeRecolhimento = '';
  let formaRecolhimentoRotulo = '';
  let codigoPagamentoGPS = null;
  let vencimentoDescricao = '';
  let alertaBaseAbaixoMinimo = false;
  let alertaBaseAcimaTeto = false;
  let mensagemAlertaLimite = null;
  let elegibilidade = '';
  let direitosPrevidenciarios = '';
  let restricoesPrevidenciarias = '';
  let orientacaoComplementacao = null;
  let memoriaCalculo = [];

  if (modalidade === MODALIDADES.PLANO_SIMPLIFICADO) {
    // Cenário B: Autônomo elegível - Plano Simplificado (11% sobre o salário mínimo)
    baseCalculoInformada = salarioMinimo;
    baseCalculoConsiderada = salarioMinimo;
    aliquotaAplicada = ALIQUOTAS.simplificado;
    valorContribuicao = roundCurrency(salarioMinimo * (aliquotaAplicada / 100)); // R$ 178,31

    responsabilidadeRecolhimento = 'proprio_segurado';
    formaRecolhimentoRotulo = 'Guia da Previdência Social (GPS) emitida pelo próprio contribuinte';
    codigoPagamentoGPS = CODIGOS_PAGAMENTO.simplificadoMensal; // 1163
    vencimentoDescricao =
      'Dia 15 do mês subsequente ao da competência (prorrogado para o primeiro dia útil seguinte caso recaia em fim de semana ou feriado bancário).';

    elegibilidade =
      'Elegível exclusivamente para o contribuinte individual que trabalha por conta própria (sem relação de emprego) e NÃO presta serviços a pessoas jurídicas nem a pessoas físicas a elas equiparadas (Lei nº 8.212/1991, art. 21, § 2º, I).';
    direitosPrevidenciarios =
      'Garante cobertura previdenciária pelo RGPS (Aposentadoria por Idade, benefícios por incapacidade temporária ou permanente, salário-maternidade e pensão por morte aos dependentes). O direito e o valor dos benefícios dependem do cumprimento dos requisitos legais de cada espécie previdenciária e do histórico contributivo do segurado.';
    restricoesPrevidenciarias =
      'A contribuição simplificada do contribuinte individual elegível corresponde a 11% do salário mínimo (R$ 1.621,00 em 2026). O plano NÃO contempla Aposentadoria por Tempo de Contribuição nem expedição de Certidão de Tempo de Contribuição (CTC) para contagem recíproca em RPPS (serviço público), salvo se o segurado complementar a contribuição com mais 9% sobre o salário mínimo acrescido de juros e encargos legais moratórios (Art. 21, § 3º da Lei nº 8.212/1991).';

    memoriaCalculo = [
      `1. Modalidade selecionada: Plano Simplificado de Previdência (Art. 21, § 2º, I da Lei nº 8.212/1991).`,
      `2. Base de cálculo obrigatória: Salário Mínimo vigente de 2026 = ${formatCurrency(salarioMinimo)} (a contribuição simplificada é fixada exclusivamente sobre 1 salário mínimo).`,
      `3. Alíquota aplicável: ${formatPercent(aliquotaAplicada)}.`,
      `4. Contribuição previdenciária mensal: ${formatCurrency(salarioMinimo)} × ${formatPercent(aliquotaAplicada)} = ${formatCurrency(valorContribuicao)}.`,
      `5. Recolhimento: GPS emitida pelo próprio autônomo com o código ${codigoPagamentoGPS} (Contribuinte Individual - Mensal - Plano Simplificado).`,
      `6. Vencimento: ${vencimentoDescricao}`
    ];
  } else if (modalidade === MODALIDADES.PLANO_NORMAL) {
    // Cenário A: Autônomo por conta própria - Plano Normal (20%)
    baseCalculoInformada = roundCurrency(normalized.salarioContribuicao);
    aliquotaAplicada = ALIQUOTAS.normal; // 20%

    if (baseCalculoInformada < salarioMinimo) {
      alertaBaseAbaixoMinimo = true;
      baseCalculoConsiderada = salarioMinimo;
      mensagemAlertaLimite = `O valor informado (${formatCurrency(baseCalculoInformada)}) é inferior ao salário mínimo de 2026 (${formatCurrency(salarioMinimo)}). Para fins previdenciários oficiais (EC nº 103/2019, art. 29; Lei nº 8.212/1991, art. 28, § 3º), a base mínima considerada para contagem de tempo e qualidade de segurado foi ajustada para o piso legal de ${formatCurrency(salarioMinimo)}.`;
    } else if (baseCalculoInformada > tetoPrevidenciario) {
      alertaBaseAcimaTeto = true;
      baseCalculoConsiderada = tetoPrevidenciario;
      mensagemAlertaLimite = `O valor informado (${formatCurrency(baseCalculoInformada)}) excede o teto previdenciário de 2026 (${formatCurrency(tetoPrevidenciario)}). Conforme a legislação previdenciária, a contribuição incide exclusivamente até o teto legal de ${formatCurrency(tetoPrevidenciario)}, não havendo desconto sobre o excedente.`;
    } else {
      baseCalculoConsiderada = baseCalculoInformada;
    }

    valorContribuicao = roundCurrency(baseCalculoConsiderada * (aliquotaAplicada / 100));
    responsabilidadeRecolhimento = 'proprio_segurado';
    formaRecolhimentoRotulo = 'Guia da Previdência Social (GPS) emitida pelo próprio contribuinte';
    codigoPagamentoGPS = CODIGOS_PAGAMENTO.normalMensal; // 1007
    vencimentoDescricao =
      'Dia 15 do mês subsequente ao da competência (prorrogado para o primeiro dia útil seguinte caso recaia em fim de semana ou feriado bancário).';

    elegibilidade =
      'Disponível para qualquer contribuinte individual que trabalhe por conta própria (autônomos, liberais, empresários com pró-labore sem retenção integral ou que recolhem por conta).';
    direitosPrevidenciarios =
      'Plano completo do RGPS: concede Aposentadoria por Idade, direito às regras de transição por Tempo de Contribuição (EC nº 103/2019), contagem recíproca em regime próprio (RPPS) e benefícios calculados sobre a média contributiva, permitindo valor de aposentadoria superior ao salário mínimo até o teto do RGPS.';
    restricoesPrevidenciarias =
      'Sem restrições de modalidades de benefício. As contribuições compõem integralmente o Período Básico de Cálculo do segurado.';

    memoriaCalculo = [
      `1. Modalidade selecionada: Plano Normal de Previdência (Art. 21, caput da Lei nº 8.212/1991).`,
      `2. Salário de contribuição informado: ${formatCurrency(baseCalculoInformada)}.`,
      alertaBaseAbaixoMinimo
        ? `3. Ajuste ao piso legal: valor abaixo do mínimo ajustado para o piso de ${formatCurrency(salarioMinimo)} (EC nº 103/2019).`
        : alertaBaseAcimaTeto
          ? `3. Limitação ao teto do RGPS: valor acima do teto limitado ao máximo legal de ${formatCurrency(tetoPrevidenciario)}.`
          : `3. Base de cálculo confirmada dentro dos limites legais de 2026: ${formatCurrency(baseCalculoConsiderada)} (entre ${formatCurrency(salarioMinimo)} e ${formatCurrency(tetoPrevidenciario)}).`,
      `4. Alíquota aplicável: ${formatPercent(aliquotaAplicada)}.`,
      `5. Contribuição previdenciária mensal: ${formatCurrency(baseCalculoConsiderada)} × ${formatPercent(aliquotaAplicada)} = ${formatCurrency(valorContribuicao)}.`,
      `6. Recolhimento: GPS emitida pelo próprio contribuinte com o código ${codigoPagamentoGPS} (Contribuinte Individual - Mensal).`,
      `7. Vencimento: ${vencimentoDescricao}`
    ];
  } else {
    // Cenário C: Prestador de serviços a Pessoa Jurídica (Retenção de 11% pela empresa contratante)
    baseCalculoInformada = roundCurrency(normalized.remuneracaoPJ);
    aliquotaAplicada = ALIQUOTAS.retencaoPJ; // 11%

    if (baseCalculoInformada < salarioMinimo) {
      alertaBaseAbaixoMinimo = true;
      baseCalculoConsiderada = baseCalculoInformada; // A empresa desconta 11% sobre o valor real do serviço
      const retencaoEfetiva = roundCurrency(baseCalculoConsiderada * (aliquotaAplicada / 100));
      valorContribuicao = retencaoEfetiva;

      const valorComplementoBase = roundCurrency(salarioMinimo - baseCalculoConsiderada);
      const valorComplementoContribuicao = roundCurrency(valorComplementoBase * 0.2); // Alíquota regular de complementação ou DARF 1872

      mensagemAlertaLimite = `Atenção: A remuneração informada (${formatCurrency(baseCalculoInformada)}) é inferior ao salário mínimo de 2026 (${formatCurrency(salarioMinimo)}). A empresa tomadora reterá ${formatCurrency(valorContribuicao)} (11% sobre o serviço prestado), mas essa competência NÃO será computada para tempo de contribuição nem para manutenção da qualidade de segurado a menos que você realize a complementação até o salário mínimo (via DARF código 1872 / Meu INSS) ou faça agrupamento/compensação de competências (EC nº 103/2019, art. 29; IN RFB nº 2.110/2022, art. 136-A).`;
      orientacaoComplementacao = {
        exigeComplementacao: true,
        diferencaBaseParaMinimo: valorComplementoBase,
        valorComplementoEstimado: valorComplementoContribuicao,
        codigoDarfComplementacao: CODIGOS_PAGAMENTO.darfComplementacao
      };
    } else if (baseCalculoInformada > tetoPrevidenciario) {
      alertaBaseAcimaTeto = true;
      baseCalculoConsiderada = tetoPrevidenciario;
      valorContribuicao = roundCurrency(tetoPrevidenciario * (aliquotaAplicada / 100)); // R$ 932,31
      mensagemAlertaLimite = `A remuneração bruta informada (${formatCurrency(baseCalculoInformada)}) excede o teto previdenciário de 2026 (${formatCurrency(tetoPrevidenciario)}). A retenção da empresa tomadora é limitada a 11% do teto legal (${formatCurrency(valorContribuicao)}). A parcela que exceder ${formatCurrency(tetoPrevidenciario)} fica isenta de retenção previdenciária.`;
    } else {
      baseCalculoConsiderada = baseCalculoInformada;
      valorContribuicao = roundCurrency(baseCalculoConsiderada * (aliquotaAplicada / 100));
    }

    responsabilidadeRecolhimento = 'empresa_contratante';
    formaRecolhimentoRotulo =
      'Regra geral: retenção na fonte e recolhimento pela empresa contratante (DCTFWeb / DARF Previdenciário). Não se aplica ao TAC optante pelo recolhimento direto (Art. 4º-A da Lei nº 10.666/2003).';
    codigoPagamentoGPS = null; // Não gera GPS para o autônomo na regra geral
    vencimentoDescricao =
      'Regra geral: recolhido pela empresa tomadora do serviço até o dia 20 do mês subsequente ao da competência (via DCTFWeb / Guia DARF da empresa).';

    elegibilidade =
      'Aplica-se à regra geral do contribuinte individual que presta serviços remunerados a pessoas jurídicas ou equiparadas (Lei nº 10.666/2003, art. 4º; IN RFB nº 2.110/2022). Exceção legal: NÃO se aplica ao Transportador Autônomo de Cargas (TAC) que esteja regular no RNTRC e tenha formalizado opção válida pelo recolhimento direto da sua contribuição (Art. 4º-A da Lei nº 10.666/2003, incluído pela Lei nº 15.485/2026). Nesses casos especiais, consulte os procedimentos oficiais da ANTT, Receita Federal e INSS.';
    direitosPrevidenciarios =
      'A retenção de 11% realizada na regra geral pela empresa contratante é comprovada pelo RPA (Recibo de Pagamento a Autônomo) e pelas informações prestadas no eSocial/DCTFWeb pela tomadora, integrando o Cadastro Nacional de Informações Sociais (CNIS) para fins de carência e cálculo de benefícios do RGPS.';
    restricoesPrevidenciarias =
      'Diferença em relação ao Plano Simplificado: na prestação a PJ, a retenção de 11% incide sobre o valor do serviço contratado até o teto do RGPS, não se confundindo com o Plano Simplificado por conta própria (que é restrito a 1 salário mínimo). Ressalva importante para TAC: a Lei nº 15.485/2026 acrescentou o art. 4º-A à Lei nº 10.666/2003, permitindo que o Transportador Autônomo de Cargas regular no RNTRC opte pelo recolhimento direto de sua contribuição previdenciária; esta calculadora abrange apenas a regra geral de retenção patronal e NÃO calcula nem emite guias para o regime especial do TAC optante pelo recolhimento direto.';

    memoriaCalculo = [
      `1. Modalidade selecionada: Prestação de serviços a Pessoa Jurídica (Regra geral do Art. 4º da Lei nº 10.666/2003).`,
      `2. Remuneração bruta informada: ${formatCurrency(baseCalculoInformada)}.`,
      alertaBaseAcimaTeto
        ? `3. Limitação ao teto do RGPS: retenção calculada até o teto de ${formatCurrency(tetoPrevidenciario)} (remuneração excedente não sofre retenção).`
        : alertaBaseAbaixoMinimo
          ? `3. Remuneração abaixo do mínimo: a empresa reterá 11% sobre ${formatCurrency(baseCalculoConsiderada)}, mas a contagem previdenciária depende de complementação até ${formatCurrency(salarioMinimo)} (EC nº 103/2019).`
          : `3. Base de retenção previdenciária: ${formatCurrency(baseCalculoConsiderada)} (entre ${formatCurrency(salarioMinimo)} e ${formatCurrency(tetoPrevidenciario)}).`,
      `4. Alíquota de retenção na fonte pela contratante: ${formatPercent(aliquotaAplicada)}.`,
      `5. Valor da retenção previdenciária estimada: ${formatCurrency(baseCalculoConsiderada)} × ${formatPercent(aliquotaAplicada)} = ${formatCurrency(valorContribuicao)}.`,
      `6. Responsabilidade de recolhimento: na regra geral, a contratante desconta e recolhe via DCTFWeb/DARF Previdenciário (não gera GPS para o autônomo).`,
      `7. Exceção do Transportador Autônomo de Cargas (TAC): a Lei nº 15.485/2026 incluiu o art. 4º-A na Lei nº 10.666/2003, facultando ao TAC regular a opção pelo recolhimento direto; esse regime especial não é calculado nesta ferramenta.`,
      `8. Múltiplas fontes pagadoras: caso preste serviços a mais de uma empresa no mesmo mês, apresente os comprovantes de pagamento e retenção anteriores para evitar que a soma das retenções ultrapasse o teto mensal de ${formatCurrency(roundCurrency(tetoPrevidenciario * 0.11))}. O caso exige apuração individualizada.`
    ];
  }

  const notaAliquota5 =
    'Nota sobre a alíquota de 5%: A alíquota reduzida de 5% NÃO é uma opção genérica ao contribuinte individual. Ela é reservada com exclusividade para o Microempreendedor Individual (MEI — recolhida no DAS-MEI) e para o Segurado Facultativo de Baixa Renda (inscrito no CadÚnico com renda familiar de até 2 salários mínimos, recolhida na GPS código 1929).';

  return {
    ok: true,
    valid: true,
    errors: [],
    anoReferencia,
    dataConsultaOficial: DATA_CONSULTA_OFICIAL,
    fontesOficiais: FONTES_OFICIAIS,
    value: valorContribuicao,
    unit: 'BRL',
    data: {
      anoReferencia,
      modalidade,
      modalidadeRotulo: ROTULOS_MODALIDADE[modalidade],
      salarioMinimo,
      tetoPrevidenciario,
      baseCalculoInformada,
      baseCalculoConsiderada,
      aliquotaAplicada,
      valorContribuicao,
      responsabilidadeRecolhimento,
      formaRecolhimentoRotulo,
      codigoPagamentoGPS,
      vencimentoDescricao,
      alertaBaseAbaixoMinimo,
      alertaBaseAcimaTeto,
      mensagemAlertaLimite,
      elegibilidade,
      direitosPrevidenciarios,
      restricoesPrevidenciarias,
      orientacaoComplementacao,
      notaAliquota5,
      memoriaCalculo
    }
  };
}

export const calculateInss = calculate;

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
    {
      title: `Dados da Simulação (Competência ${d.anoReferencia})`,
      items: [
        { label: 'Modalidade de contribuição', value: d.modalidadeRotulo },
        { label: 'Salário mínimo oficial (2026)', value: formatCurrency(d.salarioMinimo) },
        { label: 'Teto máximo do RGPS (2026)', value: formatCurrency(d.tetoPrevidenciario) },
        { label: 'Base de cálculo informada', value: formatCurrency(d.baseCalculoInformada) },
        { label: 'Base de cálculo considerada para contribuição', value: formatCurrency(d.baseCalculoConsiderada) }
      ]
    },
    {
      title: 'Contribuição Previdenciária Estimada',
      items: [
        { label: 'Alíquota aplicada', value: formatPercent(d.aliquotaAplicada) },
        { label: 'Valor da contribuição mensal', value: formatCurrency(d.valorContribuicao) },
        { label: 'Quem recolhe o valor', value: d.formaRecolhimentoRotulo },
        {
          label: 'Código de pagamento (GPS)',
          value: d.codigoPagamentoGPS ? `${d.codigoPagamentoGPS} (Guia GPS)` : 'Não se aplica (recolhido pela PJ via DCTFWeb)'
        },
        { label: 'Prazo de vencimento', value: d.vencimentoDescricao }
      ]
    },
    {
      title: 'Enquadramento, Direitos e Limitações',
      items: [
        { label: 'Condição de elegibilidade', value: d.elegibilidade },
        { label: 'Direitos e aposentadoria', value: d.direitosPrevidenciarios },
        { label: 'Restrições do plano', value: d.restricoesPrevidenciarias }
      ]
    }
  ];

  if (d.mensagemAlertaLimite) {
    sections.splice(1, 0, {
      title: 'Aviso sobre Limites e Regras Legais',
      items: [{ label: 'Aviso legal', value: d.mensagemAlertaLimite }]
    });
  }

  sections.push({
    title: 'Memória de Cálculo Passo a Passo',
    items: d.memoriaCalculo.map((passo, idx) => ({
      label: `Passo ${idx + 1}`,
      value: passo.replace(/^\d+\.\s*/, '')
    }))
  });

  return sections;
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
  const lines = ['Calculadora INSS do Contribuinte Individual — Calculadora Master', ''];
  for (const sec of sections) {
    if (sec.title) lines.push(sec.title);
    for (const item of sec.items || []) {
      lines.push(`${item.label}: ${item.value}`);
    }
    lines.push('');
  }

  return {
    text: formatCurrency(d.valorContribuicao),
    summary: lines.join('\n').trim(),
    modalidadeRotulo: d.modalidadeRotulo,
    baseCalculoConsiderada: formatCurrency(d.baseCalculoConsiderada),
    baseCalculoInformada: formatCurrency(d.baseCalculoInformada),
    aliquotaAplicada: formatPercent(d.aliquotaAplicada),
    valorContribuicao: formatCurrency(d.valorContribuicao),
    formaRecolhimentoRotulo: d.formaRecolhimentoRotulo,
    codigoPagamentoGPS: d.codigoPagamentoGPS ? d.codigoPagamentoGPS : 'Não se aplica (recolhido pela PJ)',
    vencimentoDescricao: d.vencimentoDescricao,
    alertaLimite: d.mensagemAlertaLimite || '',
    elegibilidade: d.elegibilidade,
    direitosPrevidenciarios: d.direitosPrevidenciarios,
    restricoesPrevidenciarias: d.restricoesPrevidenciarias,
    notaAliquota5: d.notaAliquota5,
    memoriaCalculo: d.memoriaCalculo
  };
}

export function buildCopyText(calculation) {
  return formatResult(calculation).summary;
}

/**
 * Conecta o módulo ao DOM da página Calculadora INSS do Contribuinte Individual.
 */
export function setupTool(root = document) {
  if (!root || typeof root.querySelector !== 'function') return null;
  const form = root.querySelector('#formInssContribuinteIndividual');
  if (!form) return null;

  const selectModalidade = root.querySelector('#modalidadeInssCI');
  const grupoSalarioNormal = root.querySelector('#grupoSalarioContribuicaoCI');
  const inputSalario = root.querySelector('#salarioContribuicaoCI');
  const grupoRemuneracaoPJ = root.querySelector('#grupoRemuneracaoPJCI');
  const inputRemuneracaoPJ = root.querySelector('#remuneracaoPJCI');
  const blocoInfoPlanoSimplificado = root.querySelector('#blocoInfoPlanoSimplificadoCI');

  const btnLimpar = root.querySelector('#btnLimparInssCI');
  const erroEl = root.querySelector('#erroInssContribuinteIndividual');
  const resultadoSection = root.querySelector('#resultadoInssContribuinteIndividual');
  const statusEl = root.querySelector('#statusInssContribuinteIndividual');

  const resValorContribuicao = root.querySelector('#resValorContribuicaoCI');
  const resModalidade = root.querySelector('#resModalidadeCI');
  const resBaseCalculo = root.querySelector('#resBaseCalculoCI');
  const resAliquota = root.querySelector('#resAliquotaCI');
  const resFormaRecolhimento = root.querySelector('#resFormaRecolhimentoCI');
  const resCodigoGPS = root.querySelector('#resCodigoGPSCI');
  const resVencimento = root.querySelector('#resVencimentoCI');
  const blocoAlertaLimite = root.querySelector('#blocoAlertaLimiteCI');
  const resAlertaLimite = root.querySelector('#resAlertaLimiteCI');
  const resElegibilidade = root.querySelector('#resElegibilidadeCI');
  const resDireitos = root.querySelector('#resDireitosCI');
  const resRestricoes = root.querySelector('#resRestricoesCI');
  const listaMemoriaCalculo = root.querySelector('#listaMemoriaCalculoCI');

  const btnCopiar = root.querySelector('#btnCopiarInssCI');
  const btnCompartilhar = root.querySelector('#btnCompartilharInssCI');
  const btnImprimir = root.querySelector('#btnImprimirInssCI');

  let ultimoResultado = null;

  const actions = createResultActions({
    title: 'Calculadora INSS do Contribuinte Individual — Calculadora Master',
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
    if (blocoAlertaLimite) {
      blocoAlertaLimite.hidden = true;
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
    if (blocoAlertaLimite) {
      blocoAlertaLimite.hidden = true;
    }
    setActionButtonsVisibility(false);
    if (statusEl) {
      statusEl.textContent = '';
    }
  }

  function updateModalidadeFields() {
    if (!selectModalidade) return;
    const mod = selectModalidade.value;

    if (mod === MODALIDADES.PLANO_SIMPLIFICADO) {
      if (grupoSalarioNormal) grupoSalarioNormal.hidden = true;
      if (grupoRemuneracaoPJ) grupoRemuneracaoPJ.hidden = true;
      if (blocoInfoPlanoSimplificado) blocoInfoPlanoSimplificado.hidden = false;
    } else if (mod === MODALIDADES.PRESTADOR_PJ) {
      if (grupoSalarioNormal) grupoSalarioNormal.hidden = true;
      if (grupoRemuneracaoPJ) grupoRemuneracaoPJ.hidden = false;
      if (blocoInfoPlanoSimplificado) blocoInfoPlanoSimplificado.hidden = true;
    } else {
      // Plano normal (default)
      if (grupoSalarioNormal) grupoSalarioNormal.hidden = false;
      if (grupoRemuneracaoPJ) grupoRemuneracaoPJ.hidden = true;
      if (blocoInfoPlanoSimplificado) blocoInfoPlanoSimplificado.hidden = true;
    }
  }

  updateModalidadeFields();

  if (selectModalidade && typeof selectModalidade.addEventListener === 'function') {
    selectModalidade.addEventListener('change', () => {
      updateModalidadeFields();
      invalidateResult();
    });
  }

  if (typeof form.addEventListener === 'function') {
    form.addEventListener('input', (event) => {
      if (event?.target === selectModalidade) return;
      invalidateResult();
    });
    form.addEventListener('change', (event) => {
      if (event?.target === selectModalidade) return;
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

    if (resValorContribuicao) resValorContribuicao.textContent = formatted.valorContribuicao;
    if (resModalidade) resModalidade.textContent = formatted.modalidadeRotulo;
    if (resBaseCalculo) resBaseCalculo.textContent = formatted.baseCalculoConsiderada;
    if (resAliquota) resAliquota.textContent = formatted.aliquotaAplicada;
    if (resFormaRecolhimento) resFormaRecolhimento.textContent = formatted.formaRecolhimentoRotulo;
    if (resCodigoGPS) resCodigoGPS.textContent = formatted.codigoPagamentoGPS;
    if (resVencimento) resVencimento.textContent = formatted.vencimentoDescricao;

    if (blocoAlertaLimite) {
      if (d.mensagemAlertaLimite) {
        blocoAlertaLimite.hidden = false;
        if (resAlertaLimite) resAlertaLimite.textContent = formatted.alertaLimite;
      } else {
        blocoAlertaLimite.hidden = true;
        if (resAlertaLimite) resAlertaLimite.textContent = '';
      }
    }

    if (resElegibilidade) resElegibilidade.textContent = formatted.elegibilidade;
    if (resDireitos) resDireitos.textContent = formatted.direitosPrevidenciarios;
    if (resRestricoes) resRestricoes.textContent = formatted.restricoesPrevidenciarias;

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

    const mod = selectModalidade ? selectModalidade.value : DEFAULTS.modalidade;
    const rawInput = {
      anoReferencia: String(DEFAULTS.anoReferencia),
      modalidade: mod,
      salarioContribuicao: inputSalario ? inputSalario.value : '',
      remuneracaoPJ: inputRemuneracaoPJ ? inputRemuneracaoPJ.value : ''
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
      if (selectModalidade) selectModalidade.value = DEFAULTS.modalidade;
      if (inputSalario) inputSalario.value = '';
      if (inputRemuneracaoPJ) inputRemuneracaoPJ.value = '';
      updateModalidadeFields();
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
          ? `${window.location.origin}/tools/financas/inss-contribuinte-individual.html`
          : 'https://www.calculadoramaster.com/tools/financas/inss-contribuinte-individual.html';
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
