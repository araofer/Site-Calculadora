/**
 * Calculadora de Pró-labore (Competência 2026) - Calculadora Master
 *
 * Estima as retenções previdenciárias (INSS de 11% do Contribuinte Individual arrecadado pela PJ
 * com base na obrigação do art. 4º, caput da Lei nº 10.666/2003 c/c art. 30, I, "b" da Lei nº 8.212/1991,
 * e fundamentação da alíquota nos arts. 21 e 30, § 4º da Lei nº 8.212/1991 e art. 37, II e § 1º da
 * IN RFB nº 2.110/2022, distinguindo-se expressamente do Plano Simplificado do INSS de 11%
 * sobre o salário mínimo da Lei nº 8.212/1991, art. 21, § 2º, I),
 * o Imposto de Renda Retido na Fonte (IRRF progressivo com desconto simplificado
 * ou deduções legais e a redução mensal da Lei nº 15.270/2025), o valor líquido
 * recebido pelo sócio/administrador e os encargos patronais da pessoa jurídica
 * conforme o regime tributário (Simples Nacional Anexos I, II, III, IV, V,
 * Lucro Presumido/Real no regime comum ou optante pela CPRB sob a Lei nº 14.973/2024,
 * além do tratamento especial do MEI).
 *
 * Fontes Oficiais Primárias:
 * 1. Tabela do IRPF 2026 - Receita Federal do Brasil:
 *    https://www.gov.br/receitafederal/pt-br/assuntos/meu-imposto-de-renda/tabelas/2026
 * 2. Lei nº 15.270/2025 (Redução mensal do IRPF para rendimentos até R$ 7.350,00):
 *    https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2025/lei/l15270.htm
 * 3. Tabela de Contribuição Mensal INSS 2026:
 *    https://www.gov.br/inss/pt-br/direitos-e-deveres/inscricao-e-contribuicao/tabela-de-contribuicao-mensal
 * 4. Lei nº 10.666/2003, art. 4º, caput (Obrigação da empresa de arrecadar e recolher a contribuição do contribuinte individual):
 *    https://www.planalto.gov.br/ccivil_03/leis/2003/l10.666compilado.htm
 * 5. Lei nº 8.212/1991, arts. 21, 22, III, 30, I, "b" e 30, § 4º (Fundamentação da alíquota de 11% e contribuição patronal):
 *    https://www.planalto.gov.br/ccivil_03/leis/l8212cons.htm
 * 6. Instrução Normativa RFB nº 2.110/2022, art. 37, II e § 1º (Regulamentação da retenção de 11% com dedução de 45%):
 *    https://normas.receita.fazenda.gov.br/sijut2consulta/link.action?idAto=126687
 * 7. Lei nº 14.973/2024, art. 9º-A (Transição da CPRB em 2026: 50% de 20% = 10% de CPP sobre pró-labore):
 *    https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2024/lei/l14973.htm
 * 8. Contribuições Previdenciárias de Pessoas Jurídicas:
 *    https://www.gov.br/receitafederal/pt-br/assuntos/orientacao-tributaria/tributos/contribuicoes-previdenciarias-pj
 * 9. Contribuição Previdenciária no Anexo IV do Simples Nacional (LC nº 123/2006, art. 18, § 5º-C):
 *    https://www.gov.br/receitafederal/pt-br/assuntos/orientacao-tributaria/cobrancas-e-intimacoes/contribuicao-previdenciaria-anexo-iv-do-simples-nacional
 * 10. Solução de Consulta Cosit nº 251/2024 (Tratamento previdenciário do MEI):
 *    https://normas.receita.fazenda.gov.br/sijut2consulta/anexoOutros.action?idArquivoBinario=75571
 */

import { createResultActions } from '../core/result-actions.js';

export const ANO_COMPETENCIA_PADRAO = 2026;
export const ANOS_COMPETENCIA_VALIDOS = Object.freeze([2026]);
export const DATA_CONSULTA_OFICIAL = '2026-10-23';

/**
 * Parâmetros oficiais da competência 2026.
 */
export const PARAMETROS_2026 = Object.freeze({
  ano: 2026,
  salarioMinimo: 1621.0,
  tetoRgps: 8475.55,
  aliquotaInssSocio: 0.11, // 11% retido pela PJ (Lei nº 10.666/2003, art. 4º, caput c/c Lei nº 8.212/1991, art. 30, § 4º e IN RFB nº 2.110/2022, art. 37, II)
  tetoInssSocio: 932.31, // roundCurrency(8475.55 * 0.11) = 932.31
  deducaoPorDependente: 189.59,
  descontoSimplificadoMensal: 607.2,
  aliquotaCppPatronal: 0.2, // 20% sobre pró-labore no regime comum (art. 22, III da Lei nº 8.212/1991)
  aliquotaCppPatronalCprb2026: 0.1, // 10% em 2026 (50% de 20%, art. 9º-A da Lei nº 14.973/2024)
  faixasIrrf: Object.freeze([
    { ate: 2428.8, aliquota: 0.0, deducao: 0.0 },
    { ate: 2826.65, aliquota: 0.075, deducao: 182.16 },
    { ate: 3751.05, aliquota: 0.15, deducao: 394.16 },
    { ate: 4664.68, aliquota: 0.225, deducao: 675.49 },
    { ate: Infinity, aliquota: 0.275, deducao: 908.73 }
  ]),
  reducaoLei15270: Object.freeze({
    limiteIsencaoTotal: 5000.0,
    reducaoMaximaAte5000: 312.89,
    limiteSuperiorTransicao: 7350.0,
    formulaConstante: 978.62,
    formulaFator: 0.133145
  })
});

export const REGIMES_TRIBUTARIOS = Object.freeze({
  SIMPLES_ANEXO_1_2_3_5: 'simples_anexo_1_2_3_5',
  SIMPLES_ANEXO_4: 'simples_anexo_4',
  FORA_SIMPLES: 'fora_simples',
  FORA_SIMPLES_CPRB: 'fora_simples_cprb',
  CONCOMITANTE: 'concomitante',
  MEI: 'mei',
  NAO_INFORMADO: 'nao_informado'
});

export const ROTULOS_REGIME = Object.freeze({
  simples_anexo_1_2_3_5: 'Simples Nacional — Anexos I, II, III ou V (CPP inclusa no DAS)',
  simples_anexo_4: 'Simples Nacional — Anexo IV (CPP patronal de 20% não inclusa no DAS)',
  fora_simples: 'Empresa fora do Simples Nacional — Sem CPRB (Lucro Presumido / Real — CPP de 20%)',
  fora_simples_cprb: 'Empresa fora do Simples Nacional — Optante pela CPRB em 2026 (CPP de 10% sobre pró-labore)',
  concomitante: 'Simples Nacional — Atividades Concomitantes (Anexo IV com outros anexos)',
  mei: 'Microempreendedor Individual (MEI)',
  nao_informado: 'Regime patronal não informado / Não sei informar'
});

/* ==========================================================================
 * Funções Utilitárias de Formatação e Precisão
 * ========================================================================== */

export function roundCurrency(val) {
  if (typeof val !== 'number' || isNaN(val)) return 0;
  return Math.round((val + Number.EPSILON) * 100) / 100;
}

export function roundDecimal(val, places = 4) {
  if (typeof val !== 'number' || isNaN(val)) return 0;
  const factor = 10 ** places;
  return Math.round((val + Number.EPSILON) * factor) / factor;
}

export function formatCurrency(val) {
  const num = typeof val === 'number' && !isNaN(val) ? val : 0;
  return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function formatPercent(val, places = 2) {
  const num = typeof val === 'number' && !isNaN(val) ? val : 0;
  return `${(num * 100).toLocaleString('pt-BR', {
    minimumFractionDigits: places,
    maximumFractionDigits: places
  })}%`;
}

export function parseFlexibleNumber(raw) {
  if (typeof raw === 'number') {
    return isNaN(raw) ? 0 : raw;
  }
  if (!raw || typeof raw !== 'string') {
    return 0;
  }

  let cleaned = raw.trim().replace(/^R\$\s*/i, '').trim();
  if (!cleaned) return 0;

  if (cleaned.includes(',') && cleaned.includes('.')) {
    const lastComma = cleaned.lastIndexOf(',');
    const lastDot = cleaned.lastIndexOf('.');
    if (lastComma > lastDot) {
      cleaned = cleaned.replace(/\./g, '').replace(',', '.');
    } else {
      cleaned = cleaned.replace(/,/g, '');
    }
  } else if (cleaned.includes(',')) {
    cleaned = cleaned.replace(',', '.');
  }

  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}

/* ==========================================================================
 * Funções de Cálculo Especializadas
 * ========================================================================== */

/**
 * Calcula a contribuição previdenciária (INSS) do sócio (Contribuinte Individual).
 *
 * Fundamentação Legal:
 * - Obrigação da Empresa de Arrecadar e Recolher: Lei nº 10.666/2003, art. 4º, caput c/c
 *   Lei nº 8.212/1991, art. 30, I, "b". A pessoa jurídica contratante é expressamente
 *   obrigada a arrecadar a contribuição do segurado contribuinte individual a seu serviço,
 *   descontando-a da respectiva remuneração (pró-labore), e a recolher o valor até o dia
 *   vinte do mês subsequente (via DCTFWeb/DARF).
 * - Fundamentação da Alíquota de 11% do Segurado: Lei nº 8.212/1991, art. 21, caput
 *   (alíquota-base de 20%) c/c art. 30, § 4º e Instrução Normativa RFB nº 2.110/2022,
 *   art. 37, II e § 1º. O contribuinte individual que presta serviços a empresas pode deduzir
 *   45% da contribuição patronal devida pela empresa (art. 22, III, correspondente a 20%),
 *   limitada a dedução a 9% do salário de contribuição (45% de 20% = 9%).
 *   Assim, 20% - 9% = alíquota efetiva de retenção de 11%, limitada ao teto do RGPS.
 *
 * Distinção expressa do Plano Simplificado de Previdência:
 * - A retenção de 11% sobre o pró-labore NÃO se confunde com a alíquota de 11% descrita na
 *   tabela mensal do INSS referente ao Plano Simplificado de Contribuição Previdenciária
 *   (Lei nº 8.212/1991, art. 21, § 2º, inciso I). O Plano Simplificado é uma faculdade exclusiva
 *   para o contribuinte individual que recolhe por conta própria (código GPS 1163), incidente
 *   estritamente sobre 1 salário mínimo e sem direito à aposentadoria por tempo de contribuição.
 *   Já a retenção sobre o pró-labore é obrigação da empresa, incide sobre o valor integral do
 *   pró-labore até o teto do RGPS e confere cobertura previdenciária plena.
 *
 * @param {number} proLaboreBruto
 * @param {number} outrasRemuneracoes
 * @param {number} inssOutrasFontes
 * @param {object} params
 * @returns {object}
 */
export function calcularInssSocio(proLaboreBruto, outrasRemuneracoes = 0, inssOutrasFontes = 0, params = PARAMETROS_2026) {
  const bruto = Math.max(0, proLaboreBruto);
  const outrasRem = Math.max(0, outrasRemuneracoes);
  const inssOutras = Math.max(0, inssOutrasFontes);

  const tetoRgps = params.tetoRgps;
  const tetoRetencaoTotal = params.tetoInssSocio;
  const aliquota = params.aliquotaInssSocio;

  // Se já atingiu o teto em outras fontes
  if (outrasRem >= tetoRgps || inssOutras >= tetoRetencaoTotal) {
    return {
      baseCalculoInss: 0,
      tetoDisponivel: 0,
      aliquotaEfetiva: 0,
      inssDescontado: 0,
      atingiuTetoNaPropriaFonte: false,
      tetoJaAtingidoEmOutrasFontes: true,
      alertaAbaixoMinimo: false
    };
  }

  // Teto disponível de base nesta fonte
  const baseDisponivel = Math.max(0, tetoRgps - outrasRem);
  const baseCalculoInss = Math.min(bruto, baseDisponivel);

  let inssEstimado = roundCurrency(baseCalculoInss * aliquota);

  // Não permitir que a soma das retenções supere o teto
  if (inssOutras > 0) {
    const margemRetencao = Math.max(0, roundCurrency(tetoRetencaoTotal - inssOutras));
    inssEstimado = Math.min(inssEstimado, margemRetencao);
  }

  const atingiuTetoNaPropriaFonte = bruto >= tetoRgps && outrasRem === 0;
  const alertaAbaixoMinimo = bruto > 0 && bruto < params.salarioMinimo;

  return {
    baseCalculoInss: roundCurrency(baseCalculoInss),
    tetoDisponivel: roundCurrency(baseDisponivel),
    aliquotaEfetiva: aliquota,
    inssDescontado: inssEstimado,
    atingiuTetoNaPropriaFonte,
    tetoJaAtingidoEmOutrasFontes: false,
    alertaAbaixoMinimo
  };
}

/**
 * Calcula o IRRF sobre o pró-labore na competência de 2026, com desconto simplificado,
 * deduções legais e a redução mensal da Lei nº 15.270/2025.
 *
 * @param {number} proLaboreBruto
 * @param {number} inssDescontadoSocio
 * @param {number} numDependentes
 * @param {number} pensaoAlimenticia
 * @param {number} outrasDeducoes
 * @param {object} params
 * @returns {object}
 */
export function calcularIrrf(
  proLaboreBruto,
  inssDescontadoSocio = 0,
  numDependentes = 0,
  pensaoAlimenticia = 0,
  outrasDeducoes = 0,
  params = PARAMETROS_2026
) {
  const bruto = Math.max(0, proLaboreBruto);
  if (bruto === 0) {
    return {
      baseLegal: 0,
      baseSimplificada: 0,
      baseEscolhida: 0,
      metodoDeducao: 'isento_zero',
      totalDeducoesLegais: 0,
      descontoSimplificado: params.descontoSimplificadoMensal,
      aliquotaFaixa: 0,
      parcelaDeduzirFaixa: 0,
      impostoAntesReducao: 0,
      reducaoCalculada: 0,
      reducaoAplicada: 0,
      faixaReducao: 'isento_zero',
      irrfFinal: 0
    };
  }

  const inss = Math.max(0, inssDescontadoSocio);
  const depValor = Math.max(0, numDependentes) * params.deducaoPorDependente;
  const pensao = Math.max(0, pensaoAlimenticia);
  const outras = Math.max(0, outrasDeducoes);

  const totalDeducoesLegais = roundCurrency(inss + depValor + pensao + outras);
  const baseLegal = Math.max(0, roundCurrency(bruto - totalDeducoesLegais));

  const descontoSimplificado = params.descontoSimplificadoMensal;
  const baseSimplificada = Math.max(0, roundCurrency(bruto - descontoSimplificado));

  // Função auxiliar para calcular imposto bruto pela tabela progressiva
  function calcularImpostoTabela(base) {
    let aliquota = 0;
    let deducao = 0;

    for (const faixa of params.faixasIrrf) {
      if (base <= faixa.ate) {
        aliquota = faixa.aliquota;
        deducao = faixa.deducao;
        break;
      }
    }

    const brutoImposto = Math.max(0, roundCurrency(base * aliquota - deducao));
    return { aliquota, deducao, imposto: brutoImposto };
  }

  const resultadoLegal = calcularImpostoTabela(baseLegal);
  const resultadoSimplificado = calcularImpostoTabela(baseSimplificada);

  let metodoDeducao = 'simplificado';
  let baseEscolhida = baseSimplificada;
  let impostoAntesReducao = resultadoSimplificado.imposto;
  let aliquotaFaixa = resultadoSimplificado.aliquota;
  let parcelaDeduzirFaixa = resultadoSimplificado.deducao;

  // Adota o método mais vantajoso (menor imposto; em caso de empate, menor base ou legal)
  if (resultadoLegal.imposto < resultadoSimplificado.imposto) {
    metodoDeducao = 'legal';
    baseEscolhida = baseLegal;
    impostoAntesReducao = resultadoLegal.imposto;
    aliquotaFaixa = resultadoLegal.aliquota;
    parcelaDeduzirFaixa = resultadoLegal.deducao;
  } else if (resultadoLegal.imposto === resultadoSimplificado.imposto) {
    if (baseLegal <= baseSimplificada) {
      metodoDeducao = 'legal';
      baseEscolhida = baseLegal;
      impostoAntesReducao = resultadoLegal.imposto;
      aliquotaFaixa = resultadoLegal.aliquota;
      parcelaDeduzirFaixa = resultadoLegal.deducao;
    }
  }

  // Aplicação da Redução Mensal da Lei nº 15.270/2025
  // A base da redução é o Rendimento Tributável Mensal (pró-labore bruto)
  const redCfg = params.reducaoLei15270;
  let reducaoCalculada = 0;
  let reducaoAplicada = 0;
  let faixaReducao = 'nenhuma';

  if (bruto <= redCfg.limiteIsencaoTotal) {
    // Rendimentos tributáveis mensais até R$ 5.000,00: redução conforme regra legal (Art. 3º-A, I da Lei nº 9.250/1995), limitada ao imposto devido
    faixaReducao = 'isencao_total_ate_5000';
    reducaoCalculada = redCfg.reducaoMaximaAte5000;
    reducaoAplicada = Math.min(impostoAntesReducao, reducaoCalculada);
  } else if (bruto <= redCfg.limiteSuperiorTransicao) {
    // De R$ 5.000,01 até R$ 7.350,00: redução = 978,62 - (0,133145 * Rendimentos Tributáveis)
    faixaReducao = 'transicao_5000_a_7350';
    const valorFormula = redCfg.formulaConstante - redCfg.formulaFator * bruto;
    reducaoCalculada = roundCurrency(Math.max(0, valorFormula));
    // Limitada ao imposto calculado (não permite imposto negativo)
    reducaoAplicada = Math.min(impostoAntesReducao, reducaoCalculada);
  } else {
    // Acima de R$ 7.350,00: sem redução
    faixaReducao = 'acima_7350_sem_reducao';
    reducaoCalculada = 0;
    reducaoAplicada = 0;
  }

  const irrfFinal = Math.max(0, roundCurrency(impostoAntesReducao - reducaoAplicada));

  return {
    baseLegal,
    baseSimplificada,
    baseEscolhida,
    metodoDeducao,
    totalDeducoesLegais,
    descontoSimplificado,
    aliquotaFaixa,
    parcelaDeduzirFaixa,
    impostoAntesReducao,
    reducaoCalculada,
    reducaoAplicada,
    faixaReducao,
    irrfFinal
  };
}

/**
 * Calcula os encargos previdenciários patronais da empresa sobre o pró-labore.
 *
 * @param {number} proLaboreBruto
 * @param {string} regimeTributario
 * @param {object} params
 * @returns {object}
 */
export function calcularEncargosPatronais(proLaboreBruto, regimeTributario, params = PARAMETROS_2026) {
  const bruto = Math.max(0, proLaboreBruto);
  const regime = regimeTributario || REGIMES_TRIBUTARIOS.NAO_INFORMADO;

  let cppPatronalCalculavel = true;
  let cppPatronal = 0;
  let aliquotaPatronal = 0;
  let explicacaoPatronal = '';
  let custoTotalEmpresa = bruto;
  let isentoOuSubstituidoNoDas = false;
  let limitacaoIdentificada = false;
  let cprbAplicavel = false;
  let cprbSobreReceitaInclusa = false;

  switch (regime) {
    case REGIMES_TRIBUTARIOS.SIMPLES_ANEXO_1_2_3_5:
      // Anexos I, II, III e V: CPP sobre pró-labore está abrangida pelo recolhimento mensal unificado no DAS
      aliquotaPatronal = 0;
      cppPatronal = 0;
      isentoOuSubstituidoNoDas = true;
      custoTotalEmpresa = bruto;
      explicacaoPatronal =
        'A Contribuição Previdenciária Patronal (CPP) sobre a folha/pró-labore está incluída no recolhimento único do DAS sobre o faturamento (art. 13, VI da LC nº 123/2006). Não há incidência de CPP avulsa de 20%.';
      break;

    case REGIMES_TRIBUTARIOS.SIMPLES_ANEXO_4:
      // Anexo IV: CPP patronal NÃO está inclusa no DAS. Recolhe 20% sobre pró-labore
      aliquotaPatronal = params.aliquotaCppPatronal; // 20%
      cppPatronal = roundCurrency(bruto * aliquotaPatronal);
      custoTotalEmpresa = roundCurrency(bruto + cppPatronal);
      explicacaoPatronal =
        'No Anexo IV do Simples Nacional, a CPP patronal não está inclusa no DAS (art. 18, § 5º-C da LC nº 123/2006). A empresa recolhe 20% sobre o pró-labore em DARF Previdenciário.';
      break;

    case REGIMES_TRIBUTARIOS.FORA_SIMPLES:
      // Empresas fora do Simples (Lucro Presumido / Real) no regime comum (sem CPRB): CPP ordinária de 20%
      // Art. 22, III da Lei nº 8.212/1991. Não incide RAT nem Terceiros sobre pró-labore de sócio
      aliquotaPatronal = params.aliquotaCppPatronal; // 20%
      cppPatronal = roundCurrency(bruto * aliquotaPatronal);
      custoTotalEmpresa = roundCurrency(bruto + cppPatronal);
      explicacaoPatronal =
        'Para empresas fora do Simples Nacional no regime comum (sem opção pela CPRB), incide a contribuição patronal ordinária de 20% sobre a remuneração paga a contribuintes individuais (art. 22, III da Lei nº 8.212/1991). Não há incidência de RAT ou Terceiros sobre pró-labore.';
      break;

    case REGIMES_TRIBUTARIOS.FORA_SIMPLES_CPRB:
      // Empresas fora do Simples optantes pelo regime de transição da CPRB em 2026 (Lei nº 14.973/2024, art. 9º-A)
      // Aplica 50% da alíquota do art. 22, III da Lei nº 8.212/1991 (50% de 20% = 10%) sobre o pró-labore.
      // A contribuição sobre a receita bruta (CPRB) não é calculada aqui por depender do faturamento.
      aliquotaPatronal = params.aliquotaCppPatronalCprb2026 !== undefined ? params.aliquotaCppPatronalCprb2026 : 0.1;
      cppPatronal = roundCurrency(bruto * aliquotaPatronal);
      custoTotalEmpresa = roundCurrency(bruto + cppPatronal);
      cprbAplicavel = true;
      cprbSobreReceitaInclusa = false;
      explicacaoPatronal =
        'Para empresas abrangidas e optantes pela CPRB em 2026, a Lei nº 14.973/2024 (art. 9º-A) fixa a CPP sobre o pró-labore em 50% da alíquota regular do art. 22, III da Lei nº 8.212/1991, resultando em 10%. A contribuição sobre a receita bruta (CPRB) NÃO está incluída neste cálculo por depender do faturamento e da alíquota setorial da empresa.';
      break;

    case REGIMES_TRIBUTARIOS.CONCOMITANTE:
      // Atividades concomitantes (Anexo IV + outros anexos): rateio proporcional exigido
      cppPatronalCalculavel = false;
      limitacaoIdentificada = true;
      cppPatronal = null;
      custoTotalEmpresa = null;
      explicacaoPatronal =
        'Empresas com atividades concomitantes no Simples Nacional (Anexo IV com outros anexos) exigem segregação da receita e critérios de rateio da folha estabelecidos no art. 76 da IN RFB nº 2.110/2022. O cálculo avulso não pode ser determinado sem esses parâmetros.';
      break;

    case REGIMES_TRIBUTARIOS.MEI:
      // Microempreendedor Individual: regra diferenciada (SC Cosit nº 251/2024)
      cppPatronalCalculavel = false;
      limitacaoIdentificada = true;
      cppPatronal = 0;
      custoTotalEmpresa = bruto;
      explicacaoPatronal =
        'O Microempreendedor Individual (MEI) contribui à Previdência via guia DAS-MEI (5% do salário mínimo, art. 18-A da LC nº 123/2006). Conforme a Solução de Consulta Cosit nº 251/2024, a legislação não prevê pró-labore formal nem contribuição patronal de 20% para o titular do MEI.';
      break;

    case REGIMES_TRIBUTARIOS.NAO_INFORMADO:
    default:
      cppPatronalCalculavel = false;
      limitacaoIdentificada = true;
      cppPatronal = null;
      custoTotalEmpresa = null;
      aliquotaPatronal = null;
      explicacaoPatronal =
        'Regime patronal da empresa não informado. Sem essa definição, os encargos previdenciários patronais (CPP) não podem ser calculados com segurança, evitando estimativas indevidas. O valor líquido do sócio foi calculado normalmente.';
      break;
  }

  return {
    regimeTributario: regime,
    nomeRegime: ROTULOS_REGIME[regime] || regime,
    cppPatronalCalculavel,
    cppPatronal,
    aliquotaPatronal,
    custoTotalEmpresa,
    isentoOuSubstituidoNoDas,
    limitacaoIdentificada,
    cprbAplicavel,
    cprbSobreReceitaInclusa,
    explicacaoPatronal
  };
}

/* ==========================================================================
 * Função Principal de Cálculo da Ferramenta
 * ========================================================================== */

/**
 * Realiza a simulação completa do pró-labore.
 *
 * @param {object} input
 * @returns {object}
 */
export function calculate(input = {}) {
  const warnings = [];
  const memoriaCalculo = [];

  // Validação do Ano da Competência
  const anoReferencia = parseInt(input.anoReferencia !== undefined ? input.anoReferencia : ANO_COMPETENCIA_PADRAO, 10);

  if (isNaN(anoReferencia) || !ANOS_COMPETENCIA_VALIDOS.includes(anoReferencia)) {
    return {
      ok: false,
      error: `Ano de competência inválido ou não suportado (${anoReferencia}). A ferramenta opera com as tabelas oficiais homologadas para a competência de 2026. Tabelas de anos futuros dependem de publicação oficial de portarias governamentais.`,
      data: null,
      warnings: [
        'Impedimento legal: O sistema não projeta tabelas de anos posteriores sem publicação oficial no Diário Oficial da União, evitando simulações falsamente exatas.'
      ],
      memoriaCalculo: []
    };
  }

  // Validação de Pró-labore Bruto
  const rawProLabore = input.proLaboreBruto !== undefined ? input.proLaboreBruto : input.valorBruto;
  const proLaboreBruto = parseFlexibleNumber(rawProLabore);

  if (proLaboreBruto < 0) {
    return {
      ok: false,
      error: 'O valor do pró-labore bruto não pode ser negativo.',
      data: null,
      warnings: [],
      memoriaCalculo: []
    };
  }

  // Demais entradas numéricas
  const outrasRemuneracoes = Math.max(0, parseFlexibleNumber(input.outrasRemuneracoes));
  const inssOutrasFontes = Math.max(0, parseFlexibleNumber(input.inssOutrasFontes));
  const dependentes = Math.max(0, parseInt(input.dependentes !== undefined ? input.dependentes : 0, 10) || 0);
  const pensaoAlimenticia = Math.max(0, parseFlexibleNumber(input.pensaoAlimenticia));
  const outrasDeducoes = Math.max(0, parseFlexibleNumber(input.outrasDeducoes));
  const regimeTributario =
    input.regimeTributario !== undefined && input.regimeTributario !== null && input.regimeTributario !== ''
      ? input.regimeTributario
      : REGIMES_TRIBUTARIOS.NAO_INFORMADO;

  const params = PARAMETROS_2026;

  // Início da Memória de Cálculo
  memoriaCalculo.push(`Competência de Apuração: Ano-Calendário ${anoReferencia} (Tabelas Oficiais da RFB e INSS).`);
  memoriaCalculo.push(`Pró-labore bruto mensal informado: ${formatCurrency(proLaboreBruto)}.`);

  // Caso de Pró-labore Zerado
  if (proLaboreBruto === 0) {
    memoriaCalculo.push('Pró-labore informado é zero: não há retenção de INSS, IRRF ou encargos patronais.');
    return {
      ok: true,
      error: null,
      data: {
        anoReferencia,
        proLaboreBruto: 0,
        outrasRemuneracoes,
        inssOutrasFontes,
        dependentes,
        pensaoAlimenticia,
        outrasDeducoes,
        regimeTributario,
        nomeRegime: ROTULOS_REGIME[regimeTributario] || regimeTributario,
        inssSocio: 0,
        baseCalculoInss: 0,
        aliquotaInssEfetiva: 0,
        retencaoInssDefinitiva: true,
        baseIrrfDefinitiva: true,
        irrfDefinitivo: true,
        proLaboreLiquidoDefinitivo: true,
        valoresSocioDefinitivos: true,
        limitacaoPrevidenciariaCprb: regimeTributario === REGIMES_TRIBUTARIOS.FORA_SIMPLES_CPRB,
        atingiuTetoInss: false,
        baseCalculoIrrf: 0,
        metodoDeducaoIrrf: 'isento_zero',
        totalDeducoesLegais: 0,
        descontoSimplificado: params.descontoSimplificadoMensal,
        aliquotaIrrfFaixa: 0,
        parcelaDeduzirIrrfFaixa: 0,
        irrfAntesReducao: 0,
        reducaoLei15270: 0,
        faixaReducaoLei15270: 'nenhuma',
        irrfFinal: 0,
        proLaboreLiquido: 0,
        cppPatronalCalculavel: true,
        cppPatronal: 0,
        aliquotaPatronal: 0,
        isentoOuSubstituidoNoDas: regimeTributario === REGIMES_TRIBUTARIOS.SIMPLES_ANEXO_1_2_3_5,
        custoTotalEmpresa: 0,
        cprbAplicavel: regimeTributario === REGIMES_TRIBUTARIOS.FORA_SIMPLES_CPRB,
        cprbSobreReceitaInclusa: false,
        explicacaoPatronal: 'Pró-labore zerado: nenhum encargo patronal devido.',
        limiteMaximoRgps: params.tetoRgps,
        salarioMinimoVigente: params.salarioMinimo,
        dataConsultaOficial: DATA_CONSULTA_OFICIAL
      },
      warnings: ['Pró-labore zerado: nenhum tributo apurado.'],
      memoriaCalculo
    };
  }

  // 1. Cálculo do INSS do Sócio
  const apuracaoInss = calcularInssSocio(proLaboreBruto, outrasRemuneracoes, inssOutrasFontes, params);
  const inssSocio = apuracaoInss.inssDescontado;

  memoriaCalculo.push(
    `INSS do Sócio (Lei nº 10.666/2003, art. 4º, caput c/c Lei nº 8.212/1991, arts. 21 e 30, § 4º e IN RFB nº 2.110/2022, art. 37 — retenção de 11%): Base considerada = ${formatCurrency(apuracaoInss.baseCalculoInss)} ➔ Retenção = ${formatCurrency(inssSocio)}.`
  );

  if (apuracaoInss.tetoJaAtingidoEmOutrasFontes) {
    memoriaCalculo.push(
      `Teto previdenciário já recolhido em outras fontes (R$ ${formatCurrency(params.tetoInssSocio)}): retenção zero nesta fonte.`
    );
    warnings.push(
      'TETO DO INSS JÁ ATINGIDO: Foi informado que outras remunerações ou retenções já atingiram o teto previdenciário da competência (R$ 8.475,55). Portanto, não há retenção de INSS nesta empresa.'
    );
  } else if (apuracaoInss.atingiuTetoNaPropriaFonte) {
    memoriaCalculo.push(
      `Pró-labore atingiu o teto máximo de contribuição (${formatCurrency(params.tetoRgps)}): desconto limitado a ${formatCurrency(params.tetoInssSocio)}.`
    );
  }

  if (apuracaoInss.alertaAbaixoMinimo) {
    warnings.push(
      `PRÓ-LABORE INFERIOR AO SALÁRIO MÍNIMO: O valor informado (${formatCurrency(proLaboreBruto)}) é inferior ao salário mínimo vigente de 2026 (${formatCurrency(params.salarioMinimo)}). A retenção legal de 11% (${formatCurrency(inssSocio)}) foi calculada sobre o valor real; contudo, para que este mês conte para tempo de contribuição e carência previdenciária, o sócio deverá recolher a complementação voluntária via DARF (art. 195, § 14 da CF/88 e art. 29 da EC 103/2019).`
    );
    memoriaCalculo.push(
      `Aviso: Pró-labore inferior ao salário mínimo (${formatCurrency(params.salarioMinimo)}). Não houve majoração silenciosa da base de retenção.`
    );
  }

  // 2. Cálculo do IRRF do Sócio
  const apuracaoIrrf = calcularIrrf(
    proLaboreBruto,
    inssSocio,
    dependentes,
    pensaoAlimenticia,
    outrasDeducoes,
    params
  );

  memoriaCalculo.push(
    `Deduções do IRRF avaliadas: Deduções legais = ${formatCurrency(apuracaoIrrf.totalDeducoesLegais)} (INSS ${formatCurrency(inssSocio)} + ${dependentes} dep. ${formatCurrency(dependentes * params.deducaoPorDependente)} + pensão ${formatCurrency(pensaoAlimenticia)} + outras ${formatCurrency(outrasDeducoes)}) vs Desconto simplificado mensal = ${formatCurrency(params.descontoSimplificadoMensal)}.`
  );
  memoriaCalculo.push(
    `Método de dedução aplicado: ${apuracaoIrrf.metodoDeducao === 'legal' ? 'Deduções Legais' : 'Desconto Simplificado'} ➔ Base tributável do IRRF = ${formatCurrency(apuracaoIrrf.baseEscolhida)}.`
  );
  memoriaCalculo.push(
    `IRRF pela tabela progressiva de 2026: ${formatCurrency(apuracaoIrrf.baseEscolhida)} × ${formatPercent(apuracaoIrrf.aliquotaFaixa, 1)} - ${formatCurrency(apuracaoIrrf.parcelaDeduzirFaixa)} = ${formatCurrency(apuracaoIrrf.impostoAntesReducao)}.`
  );

  if (apuracaoIrrf.faixaReducao === 'isencao_total_ate_5000') {
    memoriaCalculo.push(
      `Redução da Lei nº 15.270/2025: Rendimento de até R$ 5.000,00 tem redução integral do imposto devido ➔ Redução aplicada = ${formatCurrency(apuracaoIrrf.reducaoAplicada)} | IRRF Final = R$ 0,00.`
    );
  } else if (apuracaoIrrf.faixaReducao === 'transicao_5000_a_7350') {
    memoriaCalculo.push(
      `Redução da Lei nº 15.270/2025 (transição R$ 5.000,01 a R$ 7.350,00): 978,62 - (0,133145 × ${formatCurrency(proLaboreBruto)}) = ${formatCurrency(apuracaoIrrf.reducaoCalculada)} ➔ Redução aplicada = ${formatCurrency(apuracaoIrrf.reducaoAplicada)} | IRRF Final = ${formatCurrency(apuracaoIrrf.irrfFinal)}.`
    );
  } else {
    memoriaCalculo.push(
      `Redução da Lei nº 15.270/2025: Rendimento acima de R$ 7.350,00 não recebe a redução da faixa ➔ IRRF Final = ${formatCurrency(apuracaoIrrf.irrfFinal)}.`
    );
  }

  // 3. Pró-labore Líquido
  const proLaboreLiquido = Math.max(0, roundCurrency(proLaboreBruto - inssSocio - apuracaoIrrf.irrfFinal));
  memoriaCalculo.push(
    `Pró-labore líquido recebido pelo sócio: ${formatCurrency(proLaboreBruto)} - ${formatCurrency(inssSocio)} (INSS) - ${formatCurrency(apuracaoIrrf.irrfFinal)} (IRRF) = ${formatCurrency(proLaboreLiquido)}.`
  );

  // 4. Encargos Patronais da Empresa
  const apuracaoPatronal = calcularEncargosPatronais(proLaboreBruto, regimeTributario, params);

  memoriaCalculo.push(`Regime Tributário da Empresa: ${apuracaoPatronal.nomeRegime}.`);
  memoriaCalculo.push(`Encargos patronais (CPP): ${apuracaoPatronal.explicacaoPatronal}`);

  if (apuracaoPatronal.cprbAplicavel) {
    memoriaCalculo.push(
      `Custo sobre o pró-labore com CPP parcial da CPRB (10%): ${formatCurrency(proLaboreBruto)} + ${formatCurrency(apuracaoPatronal.cppPatronal)} = ${formatCurrency(apuracaoPatronal.custoTotalEmpresa)}. A parcela sobre a receita bruta (CPRB) não está inclusa.`
    );
    memoriaCalculo.push(
      'Incerteza jurídica na CPRB 2026: A retenção de INSS do sócio (11%) é adotada exclusivamente como hipótese operacional e orientativa, pois inexiste orientação oficial conclusiva da Receita Federal ou do eSocial para o pró-labore de sócio sob a transição da Lei nº 14.973/2024 frente ao art. 30, § 4º da Lei nº 8.212/1991 e art. 37 da IN RFB nº 2.110/2022. Como a dedução de INSS repercute diretamente na base do IRRF e no valor líquido, todo o conjunto de resultados do sócio (INSS, Base IRRF, IRRF e Líquido) possui caráter estritamente estimativo e não definitivo neste cenário.'
    );
  } else if (apuracaoPatronal.cppPatronalCalculavel) {
    memoriaCalculo.push(
      `Custo total estimado para a empresa: ${formatCurrency(proLaboreBruto)} (pró-labore) + ${formatCurrency(apuracaoPatronal.cppPatronal)} (CPP) = ${formatCurrency(apuracaoPatronal.custoTotalEmpresa)}.`
    );
  } else {
    memoriaCalculo.push('Custo total para a empresa: não determinável isoladamente sem os critérios de regime/rateio específicos.');
  }

  if (regimeTributario === REGIMES_TRIBUTARIOS.MEI) {
    warnings.push(
      'TRATAMENTO DO MEI (SC Cosit nº 251/2024): A legislação do MEI não prevê retirada formal de pró-labore com retenção de 11% e CPP patronal de 20%. O titular contribui via DAS-MEI (5% do SM) e os valores retirados configuram rendimentos ou lucros da atividade individual.'
    );
  } else if (regimeTributario === REGIMES_TRIBUTARIOS.CONCOMITANTE) {
    warnings.push(
      'ATIVIDADES CONCOMITANTES: Para empresas do Simples Nacional que exercem atividades do Anexo IV concomitantemente com outros anexos, a CPP da folha depende do percentual de segregação de faturamento do mês anterior (art. 76 da IN RFB nº 2.110/2022). Consulte sua contabilidade.'
    );
  } else if (regimeTributario === REGIMES_TRIBUTARIOS.FORA_SIMPLES_CPRB) {
    warnings.push(
      'CPRB EM 2026 (LEI Nº 14.973/2024 — INCERTEZA JURÍDICA E CARÁTER ESTIMATIVO): Empresa optante pelo regime de transição da CPRB (desoneração da folha). Em 2026, a CPP patronal sobre o pró-labore é de 10% (50% da alíquota regular de 20% do art. 22, III da Lei nº 8.212/1991). A contribuição patronal devida sobre a receita bruta (CPRB) NÃO está incluída neste cálculo por depender do faturamento e da alíquota setorial da empresa, não sendo possível determinar o custo fiscal total da PJ. Além disso, inexiste manifestação oficial conclusiva da Receita Federal ou do eSocial tratando da retenção previdenciária de sócio sobre pró-labore sob o regime de transição da CPRB frente à regra de dedução do art. 30, § 4º da Lei nº 8.212/1991 e art. 37, II e § 1º da IN RFB nº 2.110/2022. A alíquota de 11% é mantida nesta ferramenta unicamente como HIPÓTESE OPERACIONAL E ORIENTATIVA, sem arbitrar alíquotas não normatizadas. Em decorrência do reflexo na apuração tributária, todo o conjunto de resultados do sócio — INSS descontado, base de cálculo do IRRF, IRRF calculado e pró-labore líquido — possui caráter estritamente ESTIMATIVO e não definitivo neste cenário, sujeito à confirmação contábil/fiscal.'
    );
  } else if (regimeTributario === REGIMES_TRIBUTARIOS.NAO_INFORMADO) {
    warnings.push(
      'REGIME PATRONAL NÃO INFORMADO: Sem a definição do regime tributário da empresa (Simples Nacional por anexo, regime comum fora do Simples, optante pela CPRB ou MEI), os encargos patronais (CPP) e o custo total não foram estimados para evitar conclusões indevidas. O valor líquido do sócio foi apurado normalmente.'
    );
  }

  // Avisos gerais
  warnings.push(
    'CARÁTER INFORMATIVO: Esta simulação estima os valores com base na legislação oficial de 2026. Não substitui a folha de pagamento oficial gerada pelo eSocial/DCTFWeb nem a apuração fiscal contábil.'
  );

  return {
    ok: true,
    error: null,
    data: {
      anoReferencia,
      proLaboreBruto,
      outrasRemuneracoes,
      inssOutrasFontes,
      dependentes,
      pensaoAlimenticia,
      outrasDeducoes,
      regimeTributario,
      nomeRegime: apuracaoPatronal.nomeRegime,
      // Resultados do Sócio
      inssSocio,
      baseCalculoInss: apuracaoInss.baseCalculoInss,
      aliquotaInssEfetiva: apuracaoInss.aliquotaEfetiva,
      retencaoInssDefinitiva: regimeTributario !== REGIMES_TRIBUTARIOS.FORA_SIMPLES_CPRB,
      baseIrrfDefinitiva: regimeTributario !== REGIMES_TRIBUTARIOS.FORA_SIMPLES_CPRB,
      irrfDefinitivo: regimeTributario !== REGIMES_TRIBUTARIOS.FORA_SIMPLES_CPRB,
      proLaboreLiquidoDefinitivo: regimeTributario !== REGIMES_TRIBUTARIOS.FORA_SIMPLES_CPRB,
      valoresSocioDefinitivos: regimeTributario !== REGIMES_TRIBUTARIOS.FORA_SIMPLES_CPRB,
      limitacaoPrevidenciariaCprb: regimeTributario === REGIMES_TRIBUTARIOS.FORA_SIMPLES_CPRB,
      atingiuTetoInss: apuracaoInss.atingiuTetoNaPropriaFonte || apuracaoInss.tetoJaAtingidoEmOutrasFontes,
      baseCalculoIrrf: apuracaoIrrf.baseEscolhida,
      metodoDeducaoIrrf: apuracaoIrrf.metodoDeducao,
      totalDeducoesLegais: apuracaoIrrf.totalDeducoesLegais,
      descontoSimplificado: apuracaoIrrf.descontoSimplificado,
      aliquotaIrrfFaixa: apuracaoIrrf.aliquotaFaixa,
      parcelaDeduzirIrrfFaixa: apuracaoIrrf.parcelaDeduzirFaixa,
      irrfAntesReducao: apuracaoIrrf.impostoAntesReducao,
      reducaoLei15270: apuracaoIrrf.reducaoAplicada,
      faixaReducaoLei15270: apuracaoIrrf.faixaReducao,
      irrfFinal: apuracaoIrrf.irrfFinal,
      proLaboreLiquido,
      // Resultados da Empresa
      cppPatronalCalculavel: apuracaoPatronal.cppPatronalCalculavel,
      cppPatronal: apuracaoPatronal.cppPatronal,
      aliquotaPatronal: apuracaoPatronal.aliquotaPatronal,
      isentoOuSubstituidoNoDas: apuracaoPatronal.isentoOuSubstituidoNoDas,
      custoTotalEmpresa: apuracaoPatronal.custoTotalEmpresa,
      cprbAplicavel: apuracaoPatronal.cprbAplicavel,
      cprbSobreReceitaInclusa: apuracaoPatronal.cprbSobreReceitaInclusa,
      explicacaoPatronal: apuracaoPatronal.explicacaoPatronal,
      // Parâmetros de Referência
      limiteMaximoRgps: params.tetoRgps,
      salarioMinimoVigente: params.salarioMinimo,
      dataConsultaOficial: DATA_CONSULTA_OFICIAL
    },
    warnings,
    memoriaCalculo
  };
}

/* ==========================================================================
 * Funções de Formatação de Exibição
 * ========================================================================== */

export function formatResult(data) {
  if (!data) return {};

  const {
    proLaboreBruto,
    inssSocio,
    baseCalculoIrrf,
    metodoDeducaoIrrf,
    irrfAntesReducao,
    reducaoLei15270,
    irrfFinal,
    proLaboreLiquido,
    cppPatronalCalculavel,
    cppPatronal,
    custoTotalEmpresa,
    cprbAplicavel,
    nomeRegime,
    limitacaoPrevidenciariaCprb
  } = data;

  const percDescontoTotal = proLaboreBruto > 0 ? (inssSocio + irrfFinal) / proLaboreBruto : 0;
  const isCprbEstimativo = Boolean(limitacaoPrevidenciariaCprb && proLaboreBruto > 0);

  return {
    proLaboreBrutoFormatado: formatCurrency(proLaboreBruto),
    inssSocioFormatado: isCprbEstimativo
      ? `${formatCurrency(inssSocio)} (estimativo — hipótese operacional)`
      : formatCurrency(inssSocio),
    baseIrrfFormatada: isCprbEstimativo
      ? `${formatCurrency(baseCalculoIrrf)} (estimativa)`
      : formatCurrency(baseCalculoIrrf),
    metodoDeducaoTexto:
      metodoDeducaoIrrf === 'legal'
        ? 'Deduções Legais (INSS / Dependentes / Pensão)'
        : metodoDeducaoIrrf === 'simplificado'
        ? 'Desconto Simplificado (R$ 607,20)'
        : 'Isento',
    irrfAntesReducaoFormatado: isCprbEstimativo
      ? `${formatCurrency(irrfAntesReducao)} (estimativo)`
      : formatCurrency(irrfAntesReducao),
    reducaoLei15270Formatada: formatCurrency(reducaoLei15270),
    irrfFinalFormatado: isCprbEstimativo
      ? `${formatCurrency(irrfFinal)} (estimativo)`
      : formatCurrency(irrfFinal),
    proLaboreLiquidoFormatado: isCprbEstimativo
      ? `${formatCurrency(proLaboreLiquido)} (estimativo)`
      : formatCurrency(proLaboreLiquido),
    percentualDescontoTotalFormatado: formatPercent(percDescontoTotal, 2),
    cppPatronalFormatada: cppPatronalCalculavel && cppPatronal !== null
      ? formatCurrency(cppPatronal)
      : 'Não determinado',
    custoTotalEmpresaFormatado:
      custoTotalEmpresa !== null
        ? (cprbAplicavel ? `${formatCurrency(custoTotalEmpresa)} (sem CPRB sobre receita)` : formatCurrency(custoTotalEmpresa))
        : 'Indeterminado sem dados do regime/rateio',
    nomeRegime,
    avisoIncertezaCprb: isCprbEstimativo
      ? 'Atenção: Sob o regime da CPRB em 2026, todo o conjunto de resultados do sócio (INSS, Base IRRF, IRRF e Líquido) possui caráter estimativo sob hipótese operacional de 11%, devido à ausência de regulamentação conclusiva sobre a dedução do art. 30, § 4º da Lei nº 8.212/1991 frente à CPP de 10%.'
      : null,
    resumoMensagem:
      proLaboreBruto > 0
        ? (isCprbEstimativo
            ? `Pró-labore líquido estimado de ${formatCurrency(proLaboreLiquido)} (${formatPercent(
                proLaboreBruto > 0 ? proLaboreLiquido / proLaboreBruto : 0,
                1
              )} do valor bruto — sob hipótese operacional de 11% de INSS). Total de descontos estimados: ${formatCurrency(inssSocio + irrfFinal)} (${formatPercent(
                percDescontoTotal,
                1
              )}).`
            : `Pró-labore líquido de ${formatCurrency(proLaboreLiquido)} (${formatPercent(
                proLaboreBruto > 0 ? proLaboreLiquido / proLaboreBruto : 0,
                1
              )} do valor bruto). Total de descontos: ${formatCurrency(inssSocio + irrfFinal)} (${formatPercent(
                percDescontoTotal,
                1
              )}).`)
        : 'Informe o valor do pró-labore para simular os descontos e encargos.'
  };
}

export function buildCopyText(calculationResult) {
  if (!calculationResult || !calculationResult.data) return '';

  const { data, warnings, memoriaCalculo } = calculationResult;
  const isCprbEstimativo = Boolean(data.limitacaoPrevidenciariaCprb && data.proLaboreBruto > 0);

  const lines = [
    `Simulação de Pró-labore (Competência ${data.anoReferencia}) — Calculadora Master`,
    `Data da consulta aos parâmetros oficiais: ${data.dataConsultaOficial}`,
    '--------------------------------------------------',
    `Pró-labore Bruto: ${formatCurrency(data.proLaboreBruto)}`,
    `INSS do Sócio (11%${isCprbEstimativo ? ' — estimativo sob hipótese operacional' : ''}): ${formatCurrency(data.inssSocio)} (Base: ${formatCurrency(data.baseCalculoInss)})`,
    `Base de Cálculo do IRRF${isCprbEstimativo ? ' (estimativa)' : ''}: ${formatCurrency(data.baseCalculoIrrf)} (${data.metodoDeducaoIrrf === 'legal' ? 'Deduções Legais' : 'Desconto Simplificado'})`,
    `IRRF antes da Redução${isCprbEstimativo ? ' (estimativo)' : ''}: ${formatCurrency(data.irrfAntesReducao)}`,
    `Redução Lei nº 15.270/2025: - ${formatCurrency(data.reducaoLei15270)}`,
    `IRRF Final Retido${isCprbEstimativo ? ' (estimativo)' : ''}: ${formatCurrency(data.irrfFinal)}`,
    `>> Pró-labore Líquido Recebido: ${formatCurrency(data.proLaboreLiquido)}${isCprbEstimativo ? ' (estimativo sob hipótese operacional)' : ''} <<`,
    '--------------------------------------------------',
    `Regime da Empresa: ${data.nomeRegime}`,
    `Encargo Patronal (CPP): ${data.cppPatronalCalculavel && data.cppPatronal !== null ? formatCurrency(data.cppPatronal) : 'Não aplicável / Não informado'}`,
    `>> Custo Total Estimado da Empresa: ${data.custoTotalEmpresa !== null ? (data.cprbAplicavel ? `${formatCurrency(data.custoTotalEmpresa)} (sem CPRB sobre receita)` : formatCurrency(data.custoTotalEmpresa)) : 'Indeterminado'} <<`,
    '--------------------------------------------------',
    'Memória de Cálculo Detalhada:'
  ];

  memoriaCalculo.forEach((m) => lines.push(`• ${m}`));

  if (warnings && warnings.length > 0) {
    lines.push('--------------------------------------------------');
    lines.push('Avisos Legais Importantes:');
    warnings.forEach((w) => lines.push(`* ${w}`));
  }

  lines.push('--------------------------------------------------');
  lines.push('Fontes: RFB Tabelas IRPF 2026, Lei 15.270/2025, INSS Teto 2026, Lei 10.666/2003, Lei 14.973/2024, Lei 8.212/1991, LC 123/2006.');
  lines.push('https://www.calculadoramaster.com/tools/financas/pro-labore.html');

  return lines.join('\n');
}

/* ==========================================================================
 * Conexão com o DOM (Interface do Usuário)
 * ========================================================================== */

export function setupTool(root) {
  if (!root) return null;

  const form = root.querySelector('#formProLabore');
  if (!form) return null;

  // Campos do formulário
  const inValorBruto = root.querySelector('#proLaboreBruto');
  const selAnoReferencia = root.querySelector('#anoReferenciaPL');
  const selRegime = root.querySelector('#regimeTributarioPL');
  const inDependentes = root.querySelector('#dependentesPL');
  const inPensao = root.querySelector('#pensaoAlimenticiaPL');
  const inOutrasDeducoes = root.querySelector('#outrasDeducoesPL');
  const inOutrasRemuneracoes = root.querySelector('#outrasRemuneracoesPL');
  const inInssOutras = root.querySelector('#inssOutrasFontesPL');

  // Elementos de resultado
  const painelResultado = root.querySelector('#resultadoProLabore');
  const elProLaboreBruto = root.querySelector('#resProLaboreBruto');
  const elInssSocio = root.querySelector('#resInssSocio');
  const elBaseIrrf = root.querySelector('#resBaseIrrf');
  const elMetodoDeducao = root.querySelector('#resMetodoDeducao');
  const elIrrfAntesReducao = root.querySelector('#resIrrfAntesReducao');
  const elReducaoLei15270 = root.querySelector('#resReducaoLei15270');
  const elIrrfFinal = root.querySelector('#resIrrfFinal');
  const elProLaboreLiquido = root.querySelector('#resProLaboreLiquido');
  const elCppPatronal = root.querySelector('#resCppPatronal');
  const elCustoTotal = root.querySelector('#resCustoTotalEmpresa');
  const elExplicacaoPatronal = root.querySelector('#resExplicacaoPatronal');
  const elResumoMensagem = root.querySelector('#resumoMensagemPL');
  const listaMemoria = root.querySelector('#memoriaCalculoPL');
  const containerWarnings = root.querySelector('#avisosLegaisPL');
  const painelErro = root.querySelector('#erroProLabore');
  const painelStatus = root.querySelector('#statusAcoesPL');

  // Botões de ação
  const btnCalcular = root.querySelector('#btnCalcularPL');
  const btnLimpar = root.querySelector('#btnLimparPL');
  const btnCopiar = root.querySelector('#btnCopiarPL');
  const btnCompartilhar = root.querySelector('#btnCompartilharPL');
  const btnImprimir = root.querySelector('#btnImprimirPL');

  let currentCalculation = null;

  function executarCalculo() {
    if (painelErro) {
      painelErro.hidden = true;
      painelErro.textContent = '';
    }

    const payload = {
      proLaboreBruto: inValorBruto ? inValorBruto.value : '0',
      anoReferencia: selAnoReferencia ? selAnoReferencia.value : '2026',
      regimeTributario: selRegime ? selRegime.value : 'simples_anexo_1_2_3_5',
      dependentes: inDependentes ? inDependentes.value : '0',
      pensaoAlimenticia: inPensao ? inPensao.value : '0',
      outrasDeducoes: inOutrasDeducoes ? inOutrasDeducoes.value : '0',
      outrasRemuneracoes: inOutrasRemuneracoes ? inOutrasRemuneracoes.value : '0',
      inssOutrasFontes: inInssOutras ? inInssOutras.value : '0'
    };

    const result = calculate(payload);

    if (!result.ok) {
      if (painelErro) {
        painelErro.textContent = result.error || 'Erro ao processar o cálculo.';
        painelErro.hidden = false;
        painelErro.focus();
      }
      if (painelResultado) painelResultado.hidden = true;
      return result;
    }

    currentCalculation = result;
    const formatted = formatResult(result.data);

    if (elProLaboreBruto) elProLaboreBruto.textContent = formatted.proLaboreBrutoFormatado;
    if (elInssSocio) elInssSocio.textContent = formatted.inssSocioFormatado;
    if (elBaseIrrf) elBaseIrrf.textContent = formatted.baseIrrfFormatada;
    if (elMetodoDeducao) elMetodoDeducao.textContent = formatted.metodoDeducaoTexto;
    if (elIrrfAntesReducao) elIrrfAntesReducao.textContent = formatted.irrfAntesReducaoFormatado;
    if (elReducaoLei15270) elReducaoLei15270.textContent = formatted.reducaoLei15270Formatada;
    if (elIrrfFinal) elIrrfFinal.textContent = formatted.irrfFinalFormatado;
    if (elProLaboreLiquido) elProLaboreLiquido.textContent = formatted.proLaboreLiquidoFormatado;
    if (elCppPatronal) elCppPatronal.textContent = formatted.cppPatronalFormatada;
    if (elCustoTotal) elCustoTotal.textContent = formatted.custoTotalEmpresaFormatado;
    if (elExplicacaoPatronal) elExplicacaoPatronal.textContent = result.data.explicacaoPatronal;
    if (elResumoMensagem) elResumoMensagem.textContent = formatted.resumoMensagem;

    // Renderiza memória de cálculo
    if (listaMemoria) {
      listaMemoria.innerHTML = '';
      result.memoriaCalculo.forEach((item) => {
        const li = document.createElement('li');
        li.textContent = item;
        listaMemoria.appendChild(li);
      });
    }

    // Renderiza avisos legais
    if (containerWarnings) {
      containerWarnings.innerHTML = '';
      if (result.warnings && result.warnings.length > 0) {
        result.warnings.forEach((aviso) => {
          const div = document.createElement('div');
          div.className = 'tool-alert tool-alert-warning';
          div.setAttribute('role', 'note');
          div.textContent = aviso;
          containerWarnings.appendChild(div);
        });
      }
    }

    if (painelResultado) painelResultado.hidden = false;

    // Cria/atualiza ações de resultado compartilhadas
    createResultActions({
      container: root.querySelector('.result-actions') || painelResultado,
      copyBtn: btnCopiar,
      shareBtn: btnCompartilhar,
      printBtn: btnImprimir,
      statusEl: painelStatus,
      onCopy: () => buildCopyText(currentCalculation),
      shareData: () => ({
        title: 'Cálculo de Pró-labore 2026',
        text: `Pró-labore bruto de ${formatted.proLaboreBrutoFormatado} resulta em pró-labore líquido de ${formatted.proLaboreLiquidoFormatado}.`,
        url: window.location.href
      }),
      printOptions: {
        title: 'Demonstrativo de Pró-labore'
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
      if (painelResultado) painelResultado.hidden = true;
      if (painelErro) {
        painelErro.hidden = true;
        painelErro.textContent = '';
      }
      if (listaMemoria) listaMemoria.innerHTML = '';
      if (containerWarnings) containerWarnings.innerHTML = '';
      if (inValorBruto) inValorBruto.focus();
    });
  }

  return {
    executarCalculo,
    getCurrentCalculation: () => currentCalculation
  };
}

if (typeof document !== 'undefined') {
  setupTool(document);
}
