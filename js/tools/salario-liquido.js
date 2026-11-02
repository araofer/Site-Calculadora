/**
 * Calculadora de Salário Líquido CLT (Competência 2026) - Calculadora Master
 *
 * Realiza o cálculo oficial do salário líquido a partir da remuneração bruta
 * sob as regras da Consolidação das Leis do Trabalho (CLT), aplicando:
 * 1. Contribuição Previdenciária ao RGPS (INSS) progressiva oficial de 2026,
 *    com metodologia de cálculo e arredondamento em conformidade estrita com
 *    o Manual de Orientação do eSocial (MOS S-1.3, item 5.2, pág. 132),
 *    onde o truncamento a duas casas decimais é efetuado por faixa progressiva
 *    utilizando aritmética inteira exata em centavos.
 * 2. Imposto sobre a Renda Retido na Fonte (IRRF) mensal oficial de 2026,
 *    comparando deduções legais (INSS, dependentes, pensão alimentícia judicial
 *    e previdência complementar PGBL em folha) com o desconto simplificado mensal
 *    (R$ 607,20), aplicando a tabela progressiva e a redução mensal da
 *    Lei nº 15.270/2025 (isenção até R$ 5.000,00 e faixa de transição até R$ 7.350,00).
 * 3. Desconto do Vale-Transporte conforme a Lei nº 7.418/1985 e o Decreto nº 10.854/2021
 *    (art. 110), limitado a 6% do salário básico contratual ou ao custo real do benefício,
 *    sem dedução da base de cálculo tributária.
 * 4. Pensão alimentícia judicial e outros descontos em folha autorizados pelo empregado.
 *
 * Fontes Oficiais Primárias:
 * - Tabela do INSS 2026:
 *   https://www.gov.br/inss/pt-br/direitos-e-deveres/inscricao-e-contribuicao/tabela-de-contribuicao-mensal
 * - Manual de Orientação do eSocial (MOS S-1.3):
 *   https://www.gov.br/esocial/pt-br/documentacao-tecnica/manuais/mos-s-1-3-consolidada-ate-a-no-s-1-3-08-2026.pdf
 * - Tabela de IRRF 2026 - Receita Federal do Brasil:
 *   https://www.gov.br/receitafederal/pt-br/assuntos/meu-imposto-de-renda/tabelas/2026
 * - Lei nº 15.270/2025 (Redução do IRPF para rendimentos até R$ 7.350,00):
 *   https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2025/lei/l15270.htm
 * - Lei nº 7.418/1985 e Decreto nº 10.854/2021 (Vale-Transporte):
 *   https://www.planalto.gov.br/ccivil_03/leis/l7418.htm
 *   https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2021/decreto/d10854.htm
 */

import { formatBRLCurrencyInput, parseBRLCurrency, formatBRL } from '../core/currency.js';
import { createResultActions } from '../core/result-actions.js';

export const ANO_COMPETENCIA = 2026;

/**
 * Parâmetros oficiais de INSS vigentes para 2026.
 * Faixas progressivas com limites em centavos inteiros e alíquotas em pontos-base (bps).
 */
export const PARAMETROS_INSS_2026 = Object.freeze({
  tetoRgps: 8475.55,
  tetoRgpsCentavos: 847555,
  tetoContribuicao: 988.07,
  tetoContribuicaoCentavos: 98807,
  faixas: Object.freeze([
    Object.freeze({
      faixa: 1,
      limiteInferiorCentavos: 0,
      limiteSuperiorCentavos: 162100,
      limiteSuperiorReais: 1621.00,
      aliquotaBps: 750,
      aliquotaPercentual: 7.5,
      tetoFaixaCentavos: 12157 // floor(162100 * 750 / 10000)
    }),
    Object.freeze({
      faixa: 2,
      limiteInferiorCentavos: 162100,
      limiteSuperiorCentavos: 290284,
      limiteSuperiorReais: 2902.84,
      aliquotaBps: 900,
      aliquotaPercentual: 9.0,
      tetoFaixaCentavos: 11536 // floor(128184 * 900 / 10000)
    }),
    Object.freeze({
      faixa: 3,
      limiteInferiorCentavos: 290284,
      limiteSuperiorCentavos: 435427,
      limiteSuperiorReais: 4354.27,
      aliquotaBps: 1200,
      aliquotaPercentual: 12.0,
      tetoFaixaCentavos: 17417 // floor(145143 * 1200 / 10000)
    }),
    Object.freeze({
      faixa: 4,
      limiteInferiorCentavos: 435427,
      limiteSuperiorCentavos: 847555,
      limiteSuperiorReais: 8475.55,
      aliquotaBps: 1400,
      aliquotaPercentual: 14.0,
      tetoFaixaCentavos: 57697 // floor(412128 * 1400 / 10000)
    })
  ])
});

/**
 * Parâmetros oficiais de IRRF vigentes para 2026 (Lei nº 15.270/2025).
 */
export const PARAMETROS_IRRF_2026 = Object.freeze({
  deducaoPorDependente: 189.59,
  descontoSimplificadoPadrao: 607.20,
  faixas: Object.freeze([
    Object.freeze({ ate: 2428.80, aliquota: 0.0, deducao: 0.0 }),
    Object.freeze({ ate: 2826.65, aliquota: 0.075, deducao: 182.16 }),
    Object.freeze({ ate: 3751.05, aliquota: 0.15, deducao: 394.16 }),
    Object.freeze({ ate: 4664.68, aliquota: 0.225, deducao: 675.49 }),
    Object.freeze({ ate: Infinity, aliquota: 0.275, deducao: 908.73 })
  ]),
  reducaoLei15270: Object.freeze({
    limiteIsencaoTotal: 5000.00,
    limiteSuperiorTransicao: 7350.00,
    formulaConstante: 978.62,
    formulaFator: 0.133145
  })
});

/**
 * Parâmetros do Vale-Transporte.
 */
export const PARAMETROS_VALE_TRANSPORTE = Object.freeze({
  aliquotaMaxima: 0.06 // 6% sobre salário básico (Decreto nº 10.854/2021, art. 110)
});

/* ==========================================================================
 * Funções Utilitárias de Precisão Numérica e Moeda
 * ========================================================================== */

/**
 * Arredonda valor para 2 casas decimais no padrão financeiro BRL.
 * @param {number} val
 * @returns {number}
 */
export function roundCurrency(val) {
  if (typeof val !== 'number' || !Number.isFinite(val)) return 0;
  return Math.round((val + Number.EPSILON) * 100) / 100;
}

/**
 * Truncamento de centavos por faixa conforme eSocial MOS S-1.3, item 5.2.
 * Realiza multiplicação inteira de centavos por basis points e descarta frações com Math.floor.
 *
 * @param {number} baseCentavos Base tributável na faixa em centavos inteiros
 * @param {number} aliquotaBps Alíquota em pontos-base (ex: 750 para 7,5%)
 * @returns {number} Valor da parcela em centavos inteiros truncados
 */
export function truncarCentavos(baseCentavos, aliquotaBps) {
  if (!Number.isFinite(baseCentavos) || baseCentavos <= 0) return 0;
  if (!Number.isFinite(aliquotaBps) || aliquotaBps <= 0) return 0;
  return Math.floor((baseCentavos * aliquotaBps) / 10000);
}

/**
 * Converte valor em reais para centavos inteiros defensivamente.
 * @param {number} valorReais
 * @returns {number}
 */
export function reaisParaCentavos(valorReais) {
  if (!Number.isFinite(valorReais) || valorReais <= 0) return 0;
  return Math.round((valorReais + Number.EPSILON) * 100);
}

/* ==========================================================================
 * Motores de Cálculo
 * ========================================================================== */

/**
 * Calcula a contribuição previdenciária ao INSS (CLT) para a competência 2026
 * utilizando o truncamento por faixa do eSocial (MOS S-1.3, item 5.2, pág. 132).
 *
 * @param {number} remuneracaoBruta Remuneração bruta mensal em reais
 * @returns {Object} Detalhamento completo do cálculo do INSS
 */
export function calcularInssClt(remuneracaoBruta) {
  const remBrutaNum = typeof remuneracaoBruta === 'number' && Number.isFinite(remuneracaoBruta)
    ? Math.max(0, remuneracaoBruta)
    : 0;

  if (remBrutaNum <= 0) {
    return {
      total: 0,
      totalCentavos: 0,
      aliquotaEfetiva: 0,
      atingiuTeto: false,
      faixas: []
    };
  }

  const remuneracaoCentavos = reaisParaCentavos(remBrutaNum);
  const baseTributavelCentavos = Math.min(remuneracaoCentavos, PARAMETROS_INSS_2026.tetoRgpsCentavos);
  const atingiuTeto = remuneracaoCentavos >= PARAMETROS_INSS_2026.tetoRgpsCentavos;

  let totalCentavos = 0;
  const detalheFaixas = [];

  for (const faixa of PARAMETROS_INSS_2026.faixas) {
    if (baseTributavelCentavos > faixa.limiteInferiorCentavos) {
      const baseFaixaCentavos = Math.min(
        baseTributavelCentavos - faixa.limiteInferiorCentavos,
        faixa.limiteSuperiorCentavos - faixa.limiteInferiorCentavos
      );

      const parcelaCentavos = truncarCentavos(baseFaixaCentavos, faixa.aliquotaBps);
      totalCentavos += parcelaCentavos;

      detalheFaixas.push({
        faixa: faixa.faixa,
        aliquotaPercentual: faixa.aliquotaPercentual,
        baseFaixa: roundCurrency(baseFaixaCentavos / 100),
        valorParcela: roundCurrency(parcelaCentavos / 100)
      });
    } else {
      detalheFaixas.push({
        faixa: faixa.faixa,
        aliquotaPercentual: faixa.aliquotaPercentual,
        baseFaixa: 0,
        valorParcela: 0
      });
    }
  }

  const total = roundCurrency(totalCentavos / 100);
  const aliquotaEfetiva = remBrutaNum > 0 ? roundCurrency((total / remBrutaNum) * 100) : 0;

  return {
    total,
    totalCentavos,
    aliquotaEfetiva,
    atingiuTeto,
    faixas: detalheFaixas
  };
}

/**
 * Calcula o IRRF mensal para a competência 2026 considerando deduções legais,
 * desconto simplificado mensal e redução da Lei nº 15.270/2025.
 *
 * @param {number} remuneracaoBruta Remuneração bruta mensal
 * @param {number} inss Contribuição ao INSS descontada
 * @param {number} dependentes Quantidade de dependentes
 * @param {number} pensaoAlimenticia Pensão alimentícia judicial descontada em folha
 * @param {number} previdenciaPrivadaPgbl Previdência complementar PGBL descontada em folha
 * @returns {Object} Detalhamento completo do IRRF
 */
export function calcularIrrfClt(
  remuneracaoBruta,
  inss = 0,
  dependentes = 0,
  pensaoAlimenticia = 0,
  previdenciaPrivadaPgbl = 0
) {
  const remBrutaNum = typeof remuneracaoBruta === 'number' && Number.isFinite(remuneracaoBruta)
    ? Math.max(0, remuneracaoBruta)
    : 0;
  const inssNum = typeof inss === 'number' && Number.isFinite(inss) ? Math.max(0, inss) : 0;
  const depNum = typeof dependentes === 'number' && Number.isFinite(dependentes)
    ? Math.max(0, Math.floor(dependentes))
    : 0;
  const pensaoNum = typeof pensaoAlimenticia === 'number' && Number.isFinite(pensaoAlimenticia)
    ? Math.max(0, pensaoAlimenticia)
    : 0;
  const pgblNum = typeof previdenciaPrivadaPgbl === 'number' && Number.isFinite(previdenciaPrivadaPgbl)
    ? Math.max(0, previdenciaPrivadaPgbl)
    : 0;

  if (remBrutaNum <= 0) {
    return {
      baseCalculo: 0,
      tipoDeducao: 'simplificado',
      totalDeducoes: 0,
      deducaoDependentes: 0,
      deducoesLegais: 0,
      descontoSimplificado: 0,
      aliquotaNominal: 0,
      parcelaDedutivel: 0,
      impostoTabela: 0,
      reducaoLei15270: 0,
      reducaoAplicada: 0,
      impostoDevido: 0,
      aliquotaEfetiva: 0,
      isento: true
    };
  }

  // 1. Apuração das Deduções: Deduções Legais vs Desconto Simplificado
  const deducaoDependentes = roundCurrency(depNum * PARAMETROS_IRRF_2026.deducaoPorDependente);
  const deducoesLegais = roundCurrency(inssNum + deducaoDependentes + pensaoNum + pgblNum);
  const descontoSimplificado = PARAMETROS_IRRF_2026.descontoSimplificadoPadrao;

  let tipoDeducao = 'simplificado';
  let totalDeducoes = descontoSimplificado;

  if (deducoesLegais >= descontoSimplificado) {
    tipoDeducao = 'legais';
    totalDeducoes = deducoesLegais;
  }

  const baseCalculo = roundCurrency(Math.max(0, remBrutaNum - totalDeducoes));

  // 2. Aplicação da Tabela Progressiva do IRRF 2026
  let aliquotaNominal = 0;
  let parcelaDedutivel = 0;

  for (const faixa of PARAMETROS_IRRF_2026.faixas) {
    if (baseCalculo <= faixa.ate) {
      aliquotaNominal = faixa.aliquota;
      parcelaDedutivel = faixa.deducao;
      break;
    }
  }

  const impostoTabela = roundCurrency(Math.max(0, (baseCalculo * aliquotaNominal) - parcelaDedutivel));

  // 3. Aplicação da Redução Mensal da Lei nº 15.270/2025
  const { limiteIsencaoTotal, limiteSuperiorTransicao, formulaConstante, formulaFator } =
    PARAMETROS_IRRF_2026.reducaoLei15270;

  let reducaoLei15270 = 0;
  let impostoDevido = 0;
  let reducaoAplicada = 0;

  if (remBrutaNum <= limiteIsencaoTotal) {
    // Rendimentos brutos até R$ 5.000,00 possuem isenção total (imposto devido = 0)
    reducaoLei15270 = impostoTabela;
    reducaoAplicada = impostoTabela;
    impostoDevido = 0;
  } else if (remBrutaNum <= limiteSuperiorTransicao) {
    // Faixa de transição entre R$ 5.000,01 e R$ 7.350,00
    // Redução = 978,62 - (0,133145 * Remuneração Bruta)
    // Parcela variável explicitamente arredondada em centavos antes da subtração
    const parcelaVariavel = roundCurrency(formulaFator * remBrutaNum);
    reducaoLei15270 = roundCurrency(Math.max(0, formulaConstante - parcelaVariavel));
    reducaoAplicada = Math.min(impostoTabela, reducaoLei15270);
    impostoDevido = roundCurrency(Math.max(0, impostoTabela - reducaoAplicada));
  } else {
    // Acima de R$ 7.350,00 a redução é zero
    reducaoLei15270 = 0;
    reducaoAplicada = 0;
    impostoDevido = impostoTabela;
  }

  const aliquotaEfetiva = remBrutaNum > 0 ? roundCurrency((impostoDevido / remBrutaNum) * 100) : 0;
  const isento = impostoDevido === 0;

  return {
    baseCalculo,
    tipoDeducao,
    totalDeducoes,
    deducaoDependentes,
    deducoesLegais,
    descontoSimplificado,
    aliquotaNominal,
    parcelaDedutivel,
    impostoTabela,
    reducaoLei15270,
    reducaoAplicada,
    impostoDevido,
    aliquotaEfetiva,
    isento
  };
}

/**
 * Calcula o desconto do Vale-Transporte conforme Lei nº 7.418/1985 e Decreto nº 10.854/2021.
 *
 * @param {boolean} optante Se o trabalhador optou pelo vale-transporte
 * @param {number} salarioBasico Salário básico contratual para cálculo do limite de 6%
 * @param {number} custoReal Gasto total efetivo com o transporte fornecido
 * @returns {Object} Detalhamento do desconto de vale-transporte
 */
export function calcularValeTransporte(optante, salarioBasico = 0, custoReal = 0) {
  if (!optante) {
    return {
      optante: false,
      salarioBasico: 0,
      custoReal: 0,
      tetoLegal6Pct: 0,
      desconto: 0,
      limitadoPor: 'nao_optante'
    };
  }

  const salarioBaseNum = typeof salarioBasico === 'number' && Number.isFinite(salarioBasico)
    ? Math.max(0, salarioBasico)
    : 0;
  const custoRealNum = typeof custoReal === 'number' && Number.isFinite(custoReal)
    ? Math.max(0, custoReal)
    : 0;

  const tetoLegal6Pct = roundCurrency(salarioBaseNum * PARAMETROS_VALE_TRANSPORTE.aliquotaMaxima);
  const desconto = roundCurrency(Math.min(tetoLegal6Pct, custoRealNum));

  let limitadoPor = 'teto_6pct';
  if (custoRealNum <= tetoLegal6Pct) {
    limitadoPor = 'custo_real';
  }

  return {
    optante: true,
    salarioBasico: salarioBaseNum,
    custoReal: custoRealNum,
    tetoLegal6Pct,
    desconto,
    limitadoPor
  };
}

/**
 * Realiza o cálculo integrado do Salário Líquido CLT.
 *
 * @param {Object} dados Parâmetros do cálculo
 * @param {number} dados.remuneracaoBruta Remuneração bruta total (salário + adicionais tributáveis)
 * @param {number} [dados.dependentes=0] Número de dependentes para IRRF
 * @param {number} [dados.pensaoAlimenticia=0] Pensão alimentícia judicial descontada em folha
 * @param {number} [dados.previdenciaPrivadaPgbl=0] Previdência complementar PGBL em folha
 * @param {boolean} [dados.optanteVT=false] Optante pelo vale-transporte
 * @param {number} [dados.salarioBasicoVT=0] Salário básico para incidência do limite do VT
 * @param {number} [dados.custoRealVT=0] Custo real mensal do vale-transporte
 * @param {number} [dados.outrosDescontos=0] Outros descontos em folha autorizados
 * @returns {Object} Resultado consolidado
 */
export function calcularSalarioLiquido(dados = {}) {
  const remuneracaoBruta = typeof dados.remuneracaoBruta === 'number' && Number.isFinite(dados.remuneracaoBruta)
    ? Math.max(0, dados.remuneracaoBruta)
    : 0;
  const dependentes = typeof dados.dependentes === 'number' && Number.isFinite(dados.dependentes)
    ? Math.max(0, Math.floor(dados.dependentes))
    : 0;
  const pensaoAlimenticia = typeof dados.pensaoAlimenticia === 'number' && Number.isFinite(dados.pensaoAlimenticia)
    ? Math.max(0, dados.pensaoAlimenticia)
    : 0;
  const previdenciaPrivadaPgbl = typeof dados.previdenciaPrivadaPgbl === 'number' && Number.isFinite(dados.previdenciaPrivadaPgbl)
    ? Math.max(0, dados.previdenciaPrivadaPgbl)
    : 0;
  const optanteVT = Boolean(dados.optanteVT);
  const salarioBasicoVT = typeof dados.salarioBasicoVT === 'number' && Number.isFinite(dados.salarioBasicoVT)
    ? Math.max(0, dados.salarioBasicoVT)
    : 0;
  const custoRealVT = typeof dados.custoRealVT === 'number' && Number.isFinite(dados.custoRealVT)
    ? Math.max(0, dados.custoRealVT)
    : 0;
  const outrosDescontos = typeof dados.outrosDescontos === 'number' && Number.isFinite(dados.outrosDescontos)
    ? Math.max(0, dados.outrosDescontos)
    : 0;

  // 1. INSS
  const inss = calcularInssClt(remuneracaoBruta);

  // 2. IRRF
  const irrf = calcularIrrfClt(
    remuneracaoBruta,
    inss.total,
    dependentes,
    pensaoAlimenticia,
    previdenciaPrivadaPgbl
  );

  // 3. Vale-Transporte
  const valeTransporte = calcularValeTransporte(optanteVT, salarioBasicoVT, custoRealVT);

  // 4. Totalização de descontos e Salário Líquido
  const totalDescontos = roundCurrency(
    inss.total +
    irrf.impostoDevido +
    valeTransporte.desconto +
    pensaoAlimenticia +
    previdenciaPrivadaPgbl +
    outrosDescontos
  );

  const salarioLiquido = roundCurrency(remuneracaoBruta - totalDescontos);
  const percentualDescontos = remuneracaoBruta > 0
    ? roundCurrency((totalDescontos / remuneracaoBruta) * 100)
    : 0;

  const warnings = [];
  if (salarioLiquido < 0) {
    warnings.push('Atenção: o total de descontos é superior à remuneração bruta informada.');
  }

  return {
    competencia: ANO_COMPETENCIA,
    remuneracaoBruta,
    inss,
    irrf,
    valeTransporte,
    pensaoAlimenticia,
    previdenciaPrivadaPgbl,
    outrosDescontos,
    totalDescontos,
    salarioLiquido,
    percentualDescontos,
    warnings
  };
}

/* ==========================================================================
 * Formatação e Integração com DOM
 * ========================================================================== */

/**
 * Formata um número para o padrão monetário BRL ("R$ X.XXX,XX").
 * @param {number} val
 * @returns {string}
 */
export function formatarMoeda(val) {
  return formatBRL(val, { includeSymbol: true });
}

/**
 * Constrói as seções estruturadas para o createResultActions.
 * @param {Object} calc
 * @returns {Array<Object>}
 */
export function getResultSections(calc) {
  if (!calc) return [];

  const itemsProventos = [
    { label: 'Remuneração Bruta', value: formatarMoeda(calc.remuneracaoBruta) }
  ];

  const itemsDescontos = [
    {
      label: `INSS (Previdência Social)${calc.inss.atingiuTeto ? ' [Teto RGPS]' : ''}`,
      value: `${formatarMoeda(calc.inss.total)} (${calc.inss.aliquotaEfetiva.toFixed(2).replace('.', ',')}% efetiva)`
    },
    {
      label: `IRRF (Imposto de Renda)${calc.irrf.isento ? ' [Isento]' : ''}`,
      value: `${formatarMoeda(calc.irrf.impostoDevido)}${calc.irrf.isento ? (calc.irrf.impostoTabela > 0 ? ' (Isenção Lei 15.270)' : ' (Faixa de Isenção)') : ` (${calc.irrf.aliquotaEfetiva.toFixed(2).replace('.', ',')}% efetiva)`}`
    }
  ];

  if (calc.valeTransporte && calc.valeTransporte.optante) {
    itemsDescontos.push({
      label: 'Vale-Transporte (Lei 7.418/85)',
      value: `${formatarMoeda(calc.valeTransporte.desconto)} (${calc.valeTransporte.limitadoPor === 'teto_6pct' ? 'teto 6% salário básico' : 'custo real menor que 6%'})`
    });
  }

  if (calc.pensaoAlimenticia > 0) {
    itemsDescontos.push({
      label: 'Pensão Alimentícia Judicial',
      value: formatarMoeda(calc.pensaoAlimenticia)
    });
  }

  if (calc.previdenciaPrivadaPgbl > 0) {
    itemsDescontos.push({
      label: 'Previdência Privada (PGBL em folha)',
      value: formatarMoeda(calc.previdenciaPrivadaPgbl)
    });
  }

  if (calc.outrosDescontos > 0) {
    itemsDescontos.push({
      label: 'Outros Descontos Autorizados',
      value: formatarMoeda(calc.outrosDescontos)
    });
  }

  const itemsResultado = [
    { label: 'Total de Descontos', value: `${formatarMoeda(calc.totalDescontos)} (${calc.percentualDescontos.toFixed(2).replace('.', ',')}%)` },
    { label: 'Salário Líquido a Receber', value: formatarMoeda(calc.salarioLiquido) }
  ];

  return [
    { title: 'Proventos', items: itemsProventos },
    { title: 'Descontos em Folha', items: itemsDescontos },
    { title: 'Resultado Final', items: itemsResultado }
  ];
}

/**
 * Inicializa a interface da Calculadora de Salário Líquido no DOM.
 * @param {Document|HTMLElement} [root=document]
 */
export function initSalarioLiquido(root = document) {
  const form = root.querySelector('#formSalarioLiquido');
  if (!form) return;

  const doc = root.ownerDocument || (root.createElement ? root : (typeof document !== 'undefined' ? document : null));
  const createElement = (tag) => {
    if (doc && typeof doc.createElement === 'function') {
      return doc.createElement(tag);
    }
    return {
      tagName: tag.toUpperCase(),
      style: {},
      textContent: '',
      children: [],
      appendChild(child) {
        this.children.push(child);
      },
      setAttribute() {}
    };
  };

  const inputRemuneracao = root.querySelector('#remuneracaoBruta');
  const inputDependentes = root.querySelector('#dependentes');
  const inputPensao = root.querySelector('#pensaoAlimenticia');
  const inputPgbl = root.querySelector('#previdenciaPrivada');
  const checkOptanteVT = root.querySelector('#optanteVT');
  const containerCamposVT = root.querySelector('#containerCamposVT');
  const inputSalarioBasicoVT = root.querySelector('#salarioBasicoVT');
  const inputCustoRealVT = root.querySelector('#custoRealVT');
  const inputOutros = root.querySelector('#outrosDescontos');
  const btnLimpar = root.querySelector('#btnLimpar');

  const painelErro = root.querySelector('#mensagem-erro');
  const painelResultado = root.querySelector('#resultadoSalarioLiquido');

  // Elementos de exibição de resultado
  const elResumoSalarioLiquido = root.querySelector('#resumoSalarioLiquido');
  const elResumoTotalDescontos = root.querySelector('#resumoTotalDescontos');
  const elResumoPercDescontos = root.querySelector('#resumoPercDescontos');
  const elTabelaDetalhamento = root.querySelector('#tabelaDetalhamentoCorpo');
  const elTabelaFaixasInss = root.querySelector('#tabelaFaixasInssCorpo');
  const elContainerAvisos = root.querySelector('#containerAvisosResultado');

  // Ações de resultado
  const btnCopiar = root.querySelector('#btnCopiar');
  const btnCompartilhar = root.querySelector('#btnCompartilhar');
  const btnImprimir = root.querySelector('#btnImprimir');
  const painelStatus = root.querySelector('#statusAcoes');

  let currentCalc = null;

  // Inicializa fábrica de ações de resultado (createResultActions) vinculada aos botões uma única vez
  const resultActions = createResultActions({
    title: 'Demonstrativo de Salário Líquido CLT 2026 — Calculadora Master',
    statusElement: painelStatus,
    getSections: () => getResultSections(currentCalc)
  });

  if (btnCopiar) {
    btnCopiar.addEventListener('click', async () => {
      if (!currentCalc) return;
      await resultActions.copy();
    });
  }

  if (btnCompartilhar) {
    btnCompartilhar.addEventListener('click', async () => {
      if (!currentCalc) return;
      const shareUrl = typeof window !== 'undefined' && window.location?.origin
        ? `${window.location.origin}/tools/trabalhista/salario-liquido.html`
        : 'https://www.calculadoramaster.com/tools/trabalhista/salario-liquido.html';
      await resultActions.share(shareUrl);
    });
  }

  if (btnImprimir) {
    btnImprimir.addEventListener('click', () => {
      if (!currentCalc) return;
      resultActions.print();
    });
  }

  // Aplicação de máscaras nos campos monetários
  const camposMonetarios = [
    inputRemuneracao,
    inputPensao,
    inputPgbl,
    inputSalarioBasicoVT,
    inputCustoRealVT,
    inputOutros
  ];

  camposMonetarios.forEach((campo) => {
    if (!campo) return;
    campo.addEventListener('input', () => {
      formatBRLCurrencyInput(campo);
    });
  });

  // Alternância do grupo de campos do Vale-Transporte (sem auto-preenchimento para garantir separação)
  if (checkOptanteVT && containerCamposVT) {
    checkOptanteVT.addEventListener('change', () => {
      const isChecked = checkOptanteVT.checked;
      containerCamposVT.hidden = !isChecked;
      if (inputSalarioBasicoVT) {
        inputSalarioBasicoVT.required = isChecked;
      }
      if (inputCustoRealVT) {
        inputCustoRealVT.required = isChecked;
      }
    });
  }

  function exibirErro(msg) {
    if (painelErro) {
      painelErro.textContent = msg;
      painelErro.hidden = false;
    }
    if (painelResultado) {
      painelResultado.hidden = true;
    }
  }

  function limparErro() {
    if (painelErro) {
      painelErro.textContent = '';
      painelErro.hidden = true;
    }
  }

  function resetarFormulario() {
    form.reset();
    limparErro();
    if (containerCamposVT) {
      containerCamposVT.hidden = true;
    }
    if (inputSalarioBasicoVT) inputSalarioBasicoVT.required = false;
    if (inputCustoRealVT) inputCustoRealVT.required = false;
    if (painelResultado) {
      painelResultado.hidden = true;
    }
    if (elContainerAvisos) {
      elContainerAvisos.innerHTML = '';
    }
    if (painelStatus) {
      painelStatus.textContent = '';
    }
    currentCalc = null;
    if (inputRemuneracao) inputRemuneracao.focus();
  }

  if (btnLimpar) {
    btnLimpar.addEventListener('click', resetarFormulario);
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    limparErro();

    const remBrutaVal = parseBRLCurrency(inputRemuneracao?.value);
    if (!remBrutaVal || remBrutaVal <= 0) {
      exibirErro('Por favor, informe uma remuneração bruta válida maior que zero.');
      if (inputRemuneracao) inputRemuneracao.focus();
      return;
    }

    const dependentesVal = inputDependentes && inputDependentes.value.trim() !== ''
      ? parseInt(inputDependentes.value, 10)
      : 0;

    if (isNaN(dependentesVal) || dependentesVal < 0 || !Number.isInteger(Number(inputDependentes?.value || 0))) {
      exibirErro('O número de dependentes deve ser um número inteiro maior ou igual a zero.');
      if (inputDependentes) inputDependentes.focus();
      return;
    }

    const pensaoVal = parseBRLCurrency(inputPensao?.value);
    const pgblVal = parseBRLCurrency(inputPgbl?.value);
    const outrosVal = parseBRLCurrency(inputOutros?.value);

    let optanteVT = false;
    let salarioBasicoVT = 0;
    let custoRealVT = 0;

    if (checkOptanteVT && checkOptanteVT.checked) {
      optanteVT = true;
      salarioBasicoVT = parseBRLCurrency(inputSalarioBasicoVT?.value);
      custoRealVT = parseBRLCurrency(inputCustoRealVT?.value);

      if (salarioBasicoVT <= 0) {
        exibirErro('Informe o salário básico contratual para o cálculo do vale-transporte.');
        if (inputSalarioBasicoVT) inputSalarioBasicoVT.focus();
        return;
      }
      if (custoRealVT <= 0) {
        exibirErro('Informe o gasto real com transporte fornecido pela empresa.');
        if (inputCustoRealVT) inputCustoRealVT.focus();
        return;
      }
    }

    // Executa o cálculo
    const resultado = calcularSalarioLiquido({
      remuneracaoBruta: remBrutaVal,
      dependentes: dependentesVal,
      pensaoAlimenticia: pensaoVal,
      previdenciaPrivadaPgbl: pgblVal,
      optanteVT,
      salarioBasicoVT,
      custoRealVT,
      outrosDescontos: outrosVal
    });

    currentCalc = resultado;

    // Atualiza cards de resumo
    if (elResumoSalarioLiquido) {
      elResumoSalarioLiquido.textContent = formatarMoeda(resultado.salarioLiquido);
    }
    if (elResumoTotalDescontos) {
      elResumoTotalDescontos.textContent = formatarMoeda(resultado.totalDescontos);
    }
    if (elResumoPercDescontos) {
      elResumoPercDescontos.textContent = `${resultado.percentualDescontos.toFixed(2).replace('.', ',')}%`;
    }

    // Monta linhas da tabela de detalhamento do holerite
    if (elTabelaDetalhamento) {
      elTabelaDetalhamento.innerHTML = '';

      const linhas = [
        {
          descricao: 'Remuneração Bruta',
          referencia: 'Base contratual',
          proventos: formatarMoeda(resultado.remuneracaoBruta),
          descontos: '-'
        },
        {
          descricao: `INSS (Previdência Social)${resultado.inss.atingiuTeto ? ' [Teto RGPS]' : ''}`,
          referencia: `${resultado.inss.aliquotaEfetiva.toFixed(2).replace('.', ',')}% efetiva`,
          proventos: '-',
          descontos: formatarMoeda(resultado.inss.total)
        },
        {
          descricao: `IRRF (Imposto de Renda)${resultado.irrf.isento ? ' [Isento]' : ''}`,
          referencia: resultado.irrf.isento
            ? (resultado.irrf.impostoTabela > 0 ? 'Isenção Lei 15.270' : 'Faixa de Isenção')
            : `${resultado.irrf.aliquotaEfetiva.toFixed(2).replace('.', ',')}% efetiva`,
          proventos: '-',
          descontos: formatarMoeda(resultado.irrf.impostoDevido)
        }
      ];

      if (resultado.valeTransporte.optante) {
        linhas.push({
          descricao: 'Vale-Transporte (Lei 7.418/85)',
          referencia: resultado.valeTransporte.limitadoPor === 'teto_6pct' ? '6% do salário base' : 'Custo real menor que 6%',
          proventos: '-',
          descontos: formatarMoeda(resultado.valeTransporte.desconto)
        });
      }

      if (resultado.pensaoAlimenticia > 0) {
        linhas.push({
          descricao: 'Pensão Alimentícia Judicial',
          referencia: 'Dedução integral',
          proventos: '-',
          descontos: formatarMoeda(resultado.pensaoAlimenticia)
        });
      }

      if (resultado.previdenciaPrivadaPgbl > 0) {
        linhas.push({
          descricao: 'Previdência Privada (PGBL em folha)',
          referencia: 'Dedução em folha',
          proventos: '-',
          descontos: formatarMoeda(resultado.previdenciaPrivadaPgbl)
        });
      }

      if (resultado.outrosDescontos > 0) {
        linhas.push({
          descricao: 'Outros Descontos Autorizados',
          referencia: 'Convênios / Adiantamentos',
          proventos: '-',
          descontos: formatarMoeda(resultado.outrosDescontos)
        });
      }

      // Linha totalizadora
      linhas.push({
        descricao: 'TOTAL LÍQUIDO A RECEBER',
        referencia: '(=) Proventos - Descontos',
        proventos: formatarMoeda(resultado.salarioLiquido),
        descontos: formatarMoeda(resultado.totalDescontos),
        destaque: true
      });

      for (const item of linhas) {
        const tr = createElement('tr');
        if (item.destaque) {
          tr.style.fontWeight = 'bold';
          tr.style.backgroundColor = '#f1f8f6';
        }

        const tdDesc = createElement('td');
        tdDesc.textContent = item.descricao;
        const tdRef = createElement('td');
        tdRef.textContent = item.referencia;
        const tdProv = createElement('td');
        tdProv.textContent = item.proventos;
        const tdDescVal = createElement('td');
        tdDescVal.textContent = item.descontos;

        tr.appendChild(tdDesc);
        tr.appendChild(tdRef);
        tr.appendChild(tdProv);
        tr.appendChild(tdDescVal);
        elTabelaDetalhamento.appendChild(tr);
      }
    }

    // Monta tabela progressiva de faixas do INSS (eSocial)
    if (elTabelaFaixasInss) {
      elTabelaFaixasInss.innerHTML = '';
      for (const f of resultado.inss.faixas) {
        const tr = createElement('tr');
        const tdFaixa = createElement('td');
        tdFaixa.textContent = `${f.faixa}ª Faixa`;
        const tdAliq = createElement('td');
        tdAliq.textContent = `${f.aliquotaPercentual.toFixed(1).replace('.', ',')}%`;
        const tdBase = createElement('td');
        tdBase.textContent = formatarMoeda(f.baseFaixa);
        const tdValor = createElement('td');
        tdValor.textContent = formatarMoeda(f.valorParcela);

        tr.appendChild(tdFaixa);
        tr.appendChild(tdAliq);
        tr.appendChild(tdBase);
        tr.appendChild(tdValor);
        elTabelaFaixasInss.appendChild(tr);
      }
    }

    // Exibe avisos operacionais e notas
    if (elContainerAvisos) {
      elContainerAvisos.innerHTML = '';

      if (resultado.warnings && resultado.warnings.length > 0) {
        resultado.warnings.forEach((aviso) => {
          const div = createElement('div');
          div.className = 'tool-alert tool-alert-warning';
          div.setAttribute('role', 'alert');
          div.style.padding = '12px';
          div.style.marginBottom = '12px';
          div.style.backgroundColor = '#fff3cd';
          div.style.borderLeft = '4px solid #ffc107';
          div.style.color = '#856404';
          div.textContent = aviso;
          elContainerAvisos.appendChild(div);
        });
      }

      // Detalhamento do método IRRF aplicado
      const infoIrrf = createElement('p');
      infoIrrf.style.fontSize = '0.9em';
      infoIrrf.style.color = '#555';
      infoIrrf.style.marginTop = '8px';

      const textoDeducao = resultado.irrf.tipoDeducao === 'simplificado'
        ? `Desconto Simplificado Mensal (${formatarMoeda(resultado.irrf.descontoSimplificado)})`
        : `Deduções Legais (${formatarMoeda(resultado.irrf.deducoesLegais)}: INSS ${formatarMoeda(resultado.inss.total)} + ${resultado.irrf.deducaoDependentes > 0 ? `Dependentes ${formatarMoeda(resultado.irrf.deducaoDependentes)} + ` : ''}${resultado.pensaoAlimenticia > 0 ? `Pensão ${formatarMoeda(resultado.pensaoAlimenticia)} + ` : ''}${resultado.previdenciaPrivadaPgbl > 0 ? `PGBL ${formatarMoeda(resultado.previdenciaPrivadaPgbl)}` : ''})`;

      let textoLei15270 = '';
      if (resultado.remuneracaoBruta <= 5000) {
        textoLei15270 = ' Rendimentos brutos de até R$ 5.000,00 contam com isenção integral de IRRF pela Lei nº 15.270/2025.';
      } else if (resultado.remuneracaoBruta <= 7350) {
        textoLei15270 = ` Foi aplicada a redução progressiva da Lei nº 15.270/2025 no valor de ${formatarMoeda(resultado.irrf.reducaoAplicada)}.`;
      }

      infoIrrf.textContent = `Metodologia do IRRF: Utilizou ${textoDeducao}, resultando na base tributável de ${formatarMoeda(resultado.irrf.baseCalculo)}.${textoLei15270}`;
      elContainerAvisos.appendChild(infoIrrf);
    }

    if (painelResultado) {
      painelResultado.hidden = false;
    }
  });

  return {
    form,
    resultActions,
    getResultSections: () => getResultSections(currentCalc)
  };
}

// Inicialização automática em ambiente navegador
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => initSalarioLiquido(document));
  } else {
    initSalarioLiquido(document);
  }
}
