/**
 * Calculadora Simples Nacional (Ano-Calendário 2026) - Calculadora Master
 *
 * Estima a alíquota efetiva e o valor mensal do Documento de Arrecadação do Simples Nacional (DAS)
 * para microempresas (ME) e empresas de pequeno porte (EPP), com base nas regras da
 * Lei Complementar nº 123/2006 (com redação da LC nº 155/2016) e da Resolução CGSN nº 140/2018.
 *
 * Funcionalidades do MVP:
 * 1. Fórmula oficial da Alíquota Efetiva:
 *    Alíquota efetiva = ((RBT12 × alíquota nominal) − parcela a deduzir) ÷ RBT12
 * 2. Tabelas completas dos Anexos I, II, III, IV e V (com as 6 faixas de faturamento);
 * 3. Análise do Fator R (folha de salários 12 meses ÷ RBT12):
 *    - Fator R >= 28%: enquadra no Anexo III;
 *    - Fator R < 28%: enquadra no Anexo V;
 * 4. Tratamento do Anexo IV:
 *    - Destaca expressamente que a alíquota do Anexo IV NÃO inclui a Contribuição Previdenciária
 *      Patronal (CPP), que deve ser recolhida à parte pela empresa sobre a folha via DCTFWeb/DARF (art. 18, § 5º-C da LC 123/2006);
 * 5. Início de atividade (Resolução CGSN nº 140/2018, art. 27):
 *    - 1º mês: proporcionalização da receita do mês multiplicada por 12 (R_mês × 12);
 *    - 2º ao 12º mês: média aritmética dos meses anteriores multiplicada por 12;
 * 6. Segregação de receitas por anexo:
 *    - Aplicação da mesma RBT12 global da empresa para cálculo independente da alíquota efetiva de cada anexo;
 * 7. Alertas sobre Sublimite Estadual de R$ 3.600.000,00 (ICMS e ISS fora do DAS na 6ª faixa) e Teto Geral de R$ 4.800.000,00.
 *
 * Ferramenta exclusivamente informativa: não substitui o PGDAS-D no portal do Simples Nacional,
 * não contempla automaticamente segregações de ICMS-ST, PIS/COFINS monofásicos, retenções na fonte
 * nem desonerações específicas, e não constitui consultoria contábil individualizada.
 */

import { createResultActions } from '../core/result-actions.js';

export const ANO_REFERENCIA = 2026;
export const DATA_CONSULTA_OFICIAL = '2026-10-22';

export const TETO_SIMPLES_NACIONAL = 4800000.0;
export const SUBLIMITE_ESTADUAL = 3600000.0;
export const MARGEM_EXCESSO_SUBLIMITE_20 = 4320000.0; // R$ 3.600.000,00 × 1,20 (Res. CGSN 140/2018, art. 9º, § 1º)
export const MARGEM_EXCESSO_TETO_20 = 5760000.0; // R$ 4.800.000,00 × 1,20 (Res. CGSN 140/2018, art. 3º)
export const PISO_PRIMEIRA_FAIXA = 180000.0;
export const PERCENTUAL_FATOR_R_CORTE = 0.28; // 28%

export const FONTES_OFICIAIS = Object.freeze({
  leiComplementar123: 'https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp123.htm',
  resolucaoCgsn140: 'https://normas.receita.fazenda.gov.br/sijut2consulta/link.action?idAto=92278',
  manualPgdasD: 'https://www8.receita.fazenda.gov.br/SimplesNacional/Arquivos/manual/MANUAL_PGDAS-D_2018_V4.pdf',
  perguntaoSimplesNacional: 'https://www8.receita.fazenda.gov.br/SimplesNacional/Arquivos/manual/PerguntaoSN.pdf',
  rfbOrientacaoAnexoIv: 'https://www.gov.br/receitafederal/pt-br/assuntos/orientacao-tributaria/cobrancas-e-intimacoes/contribuicao-previdenciaria-anexo-iv-do-simples-nacional'
});

export const ANEXOS = Object.freeze({
  ANEXO_I: 'anexo_1',
  ANEXO_II: 'anexo_2',
  ANEXO_III: 'anexo_3',
  ANEXO_IV: 'anexo_4',
  ANEXO_V: 'anexo_5',
  FATOR_R: 'fator_r'
});

export const ROTULOS_ANEXO = Object.freeze({
  [ANEXOS.ANEXO_I]: 'Anexo I — Comércio (Lojas, e-commerce, revenda de mercadorias)',
  [ANEXOS.ANEXO_II]: 'Anexo II — Indústria (Fábricas, transformação e confecção)',
  [ANEXOS.ANEXO_III]: 'Anexo III — Serviços (Instalação, manutenção, reparos, locação de bens e serviços com Fator R ≥ 28%)',
  [ANEXOS.ANEXO_IV]: 'Anexo IV — Serviços (Advocacia, vigilância, limpeza, construção de imóveis — CPP por fora)',
  [ANEXOS.ANEXO_V]: 'Anexo V — Serviços (Tecnologia, engenharia, publicidade, perícias quando Fator R < 28%)',
  [ANEXOS.FATOR_R]: 'Serviços sujeitos ao Fator R (Cálculo automático entre Anexo III e Anexo V)'
});

export const MODOS_APURACAO = Object.freeze({
  REGRA_GERAL: 'regra_geral',
  INICIO_MES_1: 'inicio_mes_1',
  INICIO_MESES_2_12: 'inicio_meses_2_12'
});

export const ROTULOS_MODO_APURACAO = Object.freeze({
  [MODOS_APURACAO.REGRA_GERAL]: 'Empresa em atividade regular (com 13 meses ou mais — RBT12 consolidado)',
  [MODOS_APURACAO.INICIO_MES_1]: 'Início de atividade — 1º mês (Proporcionalização da receita do mês × 12)',
  [MODOS_APURACAO.INICIO_MESES_2_12]: 'Início de atividade — 2º ao 12º mês (Média das receitas anteriores × 12)'
});

export const TIPOS_OPERACAO = Object.freeze({
  UNICA: 'unica',
  SEGREGADA: 'segregada'
});

/**
 * Tabelas oficiais dos Anexos I a V da Lei Complementar nº 123/2006 (vigentes em 2026).
 * Cada faixa contém:
 * - faixa: número da faixa (1 a 6)
 * - limiteInferior: piso da faixa de RBT12 em R$
 * - limiteSuperior: teto da faixa de RBT12 em R$
 * - aliquotaNominal: alíquota percentual expressa em decimal (ex: 0.0400 = 4,00%)
 * - parcelaDeduzir: valor monetário da dedução da fórmula em R$
 */
export const TABELAS_ANEXOS = Object.freeze({
  [ANEXOS.ANEXO_I]: Object.freeze({
    id: ANEXOS.ANEXO_I,
    nome: 'Anexo I',
    descricao: 'Comércio',
    incluiCppNoDas: true,
    faixas: Object.freeze([
      { faixa: 1, limiteInferior: 0.0, limiteSuperior: 180000.0, aliquotaNominal: 0.040, parcelaDeduzir: 0.0, partilha: Object.freeze({ irpj: 0.0550, csll: 0.0350, cofins: 0.1274, pis: 0.0276, cpp: 0.4150, icms: 0.3400 }) },
      { faixa: 2, limiteInferior: 180000.01, limiteSuperior: 360000.0, aliquotaNominal: 0.073, parcelaDeduzir: 5940.0, partilha: Object.freeze({ irpj: 0.0550, csll: 0.0350, cofins: 0.1274, pis: 0.0276, cpp: 0.4150, icms: 0.3400 }) },
      { faixa: 3, limiteInferior: 360000.01, limiteSuperior: 720000.0, aliquotaNominal: 0.095, parcelaDeduzir: 13860.0, partilha: Object.freeze({ irpj: 0.0550, csll: 0.0350, cofins: 0.1274, pis: 0.0276, cpp: 0.4200, icms: 0.3350 }) },
      { faixa: 4, limiteInferior: 720000.01, limiteSuperior: 1800000.0, aliquotaNominal: 0.107, parcelaDeduzir: 22500.0, partilha: Object.freeze({ irpj: 0.0550, csll: 0.0350, cofins: 0.1274, pis: 0.0276, cpp: 0.4200, icms: 0.3350 }) },
      { faixa: 5, limiteInferior: 1800000.01, limiteSuperior: 3600000.0, aliquotaNominal: 0.143, parcelaDeduzir: 87300.0, partilha: Object.freeze({ irpj: 0.0550, csll: 0.0350, cofins: 0.1274, pis: 0.0276, cpp: 0.4200, icms: 0.3350 }) },
      { faixa: 6, limiteInferior: 3600000.01, limiteSuperior: 4800000.0, aliquotaNominal: 0.190, parcelaDeduzir: 378000.0, partilha: Object.freeze({ irpj: 0.1350, csll: 0.1000, cofins: 0.2827, pis: 0.0613, cpp: 0.4210, icms: 0.0000 }) }
    ])
  }),
  [ANEXOS.ANEXO_II]: Object.freeze({
    id: ANEXOS.ANEXO_II,
    nome: 'Anexo II',
    descricao: 'Indústria',
    incluiCppNoDas: true,
    faixas: Object.freeze([
      { faixa: 1, limiteInferior: 0.0, limiteSuperior: 180000.0, aliquotaNominal: 0.045, parcelaDeduzir: 0.0, partilha: Object.freeze({ irpj: 0.0550, csll: 0.0350, cofins: 0.1151, pis: 0.0249, cpp: 0.3750, ipi: 0.0750, icms: 0.3200 }) },
      { faixa: 2, limiteInferior: 180000.01, limiteSuperior: 360000.0, aliquotaNominal: 0.078, parcelaDeduzir: 5940.0, partilha: Object.freeze({ irpj: 0.0550, csll: 0.0350, cofins: 0.1151, pis: 0.0249, cpp: 0.3750, ipi: 0.0750, icms: 0.3200 }) },
      { faixa: 3, limiteInferior: 360000.01, limiteSuperior: 720000.0, aliquotaNominal: 0.100, parcelaDeduzir: 13860.0, partilha: Object.freeze({ irpj: 0.0550, csll: 0.0350, cofins: 0.1151, pis: 0.0249, cpp: 0.3750, ipi: 0.0750, icms: 0.3200 }) },
      { faixa: 4, limiteInferior: 720000.01, limiteSuperior: 1800000.0, aliquotaNominal: 0.112, parcelaDeduzir: 22500.0, partilha: Object.freeze({ irpj: 0.0550, csll: 0.0350, cofins: 0.1151, pis: 0.0249, cpp: 0.3750, ipi: 0.0750, icms: 0.3200 }) },
      { faixa: 5, limiteInferior: 1800000.01, limiteSuperior: 3600000.0, aliquotaNominal: 0.147, parcelaDeduzir: 85500.0, partilha: Object.freeze({ irpj: 0.0550, csll: 0.0350, cofins: 0.1151, pis: 0.0249, cpp: 0.3750, ipi: 0.0750, icms: 0.3200 }) },
      { faixa: 6, limiteInferior: 3600000.01, limiteSuperior: 4800000.0, aliquotaNominal: 0.300, parcelaDeduzir: 720000.0, partilha: Object.freeze({ irpj: 0.0850, csll: 0.0750, cofins: 0.2096, pis: 0.0454, cpp: 0.2350, ipi: 0.3500, icms: 0.0000 }) }
    ])
  }),
  [ANEXOS.ANEXO_III]: Object.freeze({
    id: ANEXOS.ANEXO_III,
    nome: 'Anexo III',
    descricao: 'Serviços em Geral e Serviços com Fator R ≥ 28%',
    incluiCppNoDas: true,
    faixas: Object.freeze([
      { faixa: 1, limiteInferior: 0.0, limiteSuperior: 180000.0, aliquotaNominal: 0.060, parcelaDeduzir: 0.0, partilha: Object.freeze({ irpj: 0.0400, csll: 0.0350, cofins: 0.1282, pis: 0.0278, cpp: 0.4340, iss: 0.3350 }) },
      { faixa: 2, limiteInferior: 180000.01, limiteSuperior: 360000.0, aliquotaNominal: 0.112, parcelaDeduzir: 9360.0, partilha: Object.freeze({ irpj: 0.0400, csll: 0.0350, cofins: 0.1405, pis: 0.0305, cpp: 0.4340, iss: 0.3200 }) },
      { faixa: 3, limiteInferior: 360000.01, limiteSuperior: 720000.0, aliquotaNominal: 0.135, parcelaDeduzir: 17640.0, partilha: Object.freeze({ irpj: 0.0400, csll: 0.0350, cofins: 0.1364, pis: 0.0296, cpp: 0.4340, iss: 0.3250 }) },
      { faixa: 4, limiteInferior: 720000.01, limiteSuperior: 1800000.0, aliquotaNominal: 0.160, parcelaDeduzir: 35640.0, partilha: Object.freeze({ irpj: 0.0400, csll: 0.0350, cofins: 0.1364, pis: 0.0296, cpp: 0.4340, iss: 0.3250 }) },
      { faixa: 5, limiteInferior: 1800000.01, limiteSuperior: 3600000.0, aliquotaNominal: 0.210, parcelaDeduzir: 125640.0, partilha: Object.freeze({ irpj: 0.0400, csll: 0.0350, cofins: 0.1282, pis: 0.0278, cpp: 0.4340, iss: 0.3350 }) },
      { faixa: 6, limiteInferior: 3600000.01, limiteSuperior: 4800000.0, aliquotaNominal: 0.330, parcelaDeduzir: 648000.0, partilha: Object.freeze({ irpj: 0.3500, csll: 0.1500, cofins: 0.1603, pis: 0.0347, cpp: 0.3050, iss: 0.0000 }) }
    ])
  }),
  [ANEXOS.ANEXO_IV]: Object.freeze({
    id: ANEXOS.ANEXO_IV,
    nome: 'Anexo IV',
    descricao: 'Serviços (Advocacia, Vigilância, Limpeza, Obras de Engenharia)',
    incluiCppNoDas: false, // CPP recolhida à parte pela folha de pagamento no RGPS
    faixas: Object.freeze([
      { faixa: 1, limiteInferior: 0.0, limiteSuperior: 180000.0, aliquotaNominal: 0.045, parcelaDeduzir: 0.0, partilha: Object.freeze({ irpj: 0.1880, csll: 0.1520, cofins: 0.1767, pis: 0.0383, iss: 0.4450 }) },
      { faixa: 2, limiteInferior: 180000.01, limiteSuperior: 360000.0, aliquotaNominal: 0.090, parcelaDeduzir: 8100.0, partilha: Object.freeze({ irpj: 0.1980, csll: 0.1520, cofins: 0.2055, pis: 0.0445, iss: 0.4000 }) },
      { faixa: 3, limiteInferior: 360000.01, limiteSuperior: 720000.0, aliquotaNominal: 0.102, parcelaDeduzir: 12420.0, partilha: Object.freeze({ irpj: 0.2080, csll: 0.1520, cofins: 0.1973, pis: 0.0427, iss: 0.4000 }) },
      { faixa: 4, limiteInferior: 720000.01, limiteSuperior: 1800000.0, aliquotaNominal: 0.140, parcelaDeduzir: 39780.0, partilha: Object.freeze({ irpj: 0.1780, csll: 0.1920, cofins: 0.1890, pis: 0.0410, iss: 0.4000 }) },
      { faixa: 5, limiteInferior: 1800000.01, limiteSuperior: 3600000.0, aliquotaNominal: 0.220, parcelaDeduzir: 183780.0, partilha: Object.freeze({ irpj: 0.1880, csll: 0.1920, cofins: 0.1808, pis: 0.0392, iss: 0.4000 }) },
      { faixa: 6, limiteInferior: 3600000.01, limiteSuperior: 4800000.0, aliquotaNominal: 0.330, parcelaDeduzir: 828000.0, partilha: Object.freeze({ irpj: 0.5350, csll: 0.2150, cofins: 0.2055, pis: 0.0445, iss: 0.0000 }) }
    ])
  }),
  [ANEXOS.ANEXO_V]: Object.freeze({
    id: ANEXOS.ANEXO_V,
    nome: 'Anexo V',
    descricao: 'Serviços Intelectuais e Serviços com Fator R < 28%',
    incluiCppNoDas: true,
    faixas: Object.freeze([
      { faixa: 1, limiteInferior: 0.0, limiteSuperior: 180000.0, aliquotaNominal: 0.155, parcelaDeduzir: 0.0, partilha: Object.freeze({ irpj: 0.2500, csll: 0.1500, cofins: 0.1410, pis: 0.0305, cpp: 0.2885, iss: 0.1400 }) },
      { faixa: 2, limiteInferior: 180000.01, limiteSuperior: 360000.0, aliquotaNominal: 0.180, parcelaDeduzir: 4500.0, partilha: Object.freeze({ irpj: 0.2300, csll: 0.1500, cofins: 0.1410, pis: 0.0305, cpp: 0.2785, iss: 0.1700 }) },
      { faixa: 3, limiteInferior: 360000.01, limiteSuperior: 720000.0, aliquotaNominal: 0.195, parcelaDeduzir: 9900.0, partilha: Object.freeze({ irpj: 0.2400, csll: 0.1500, cofins: 0.1492, pis: 0.0323, cpp: 0.2385, iss: 0.1900 }) },
      { faixa: 4, limiteInferior: 720000.01, limiteSuperior: 1800000.0, aliquotaNominal: 0.205, parcelaDeduzir: 17100.0, partilha: Object.freeze({ irpj: 0.2100, csll: 0.1500, cofins: 0.1574, pis: 0.0341, cpp: 0.2385, iss: 0.2100 }) },
      { faixa: 5, limiteInferior: 1800000.01, limiteSuperior: 3600000.0, aliquotaNominal: 0.230, parcelaDeduzir: 62100.0, partilha: Object.freeze({ irpj: 0.2300, csll: 0.1250, cofins: 0.1410, pis: 0.0305, cpp: 0.2385, iss: 0.2350 }) },
      { faixa: 6, limiteInferior: 3600000.01, limiteSuperior: 4800000.0, aliquotaNominal: 0.305, parcelaDeduzir: 540000.0, partilha: Object.freeze({ irpj: 0.3500, csll: 0.1550, cofins: 0.1644, pis: 0.0356, cpp: 0.2950, iss: 0.0000 }) }
    ])
  })
});

export const DEFAULTS = Object.freeze({
  anoReferencia: ANO_REFERENCIA,
  modoApuracao: MODOS_APURACAO.REGRA_GERAL,
  tipoOperacao: TIPOS_OPERACAO.UNICA,
  anexo: ANEXOS.ANEXO_III,
  rbt12: 300000.0,
  rba: null,
  receitaMes: 25000.0,
  folha12: 90000.0
});

export const LIMITS = Object.freeze({
  minValorMonetario: 0,
  maxValorMonetario: 100000000,
  maxMesesInicio: 11
});

const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});

const percentFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'percent',
  minimumFractionDigits: 2,
  maximumFractionDigits: 4
});

const percentSimpleFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'percent',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});

export function roundCurrency(val) {
  if (typeof val !== 'number' || Number.isNaN(val)) return 0;
  return Math.round((val + Number.EPSILON) * 100) / 100;
}

export function roundDecimal(val, places = 4) {
  if (typeof val !== 'number' || Number.isNaN(val)) return 0;
  const factor = 10 ** places;
  return Math.round((val + Number.EPSILON) * factor) / factor;
}

export function formatCurrency(val) {
  return currencyFormatter.format(typeof val === 'number' && !Number.isNaN(val) ? val : 0);
}

export function formatPercent(val, maxDigits = 2) {
  if (typeof val !== 'number' || Number.isNaN(val)) return '0,00%';
  return maxDigits > 2 ? percentFormatter.format(val) : percentSimpleFormatter.format(val);
}

export function parseFlexibleNumber(raw) {
  if (typeof raw === 'number') {
    return Number.isFinite(raw) ? raw : NaN;
  }
  if (!raw || typeof raw !== 'string') {
    return NaN;
  }

  let cleaned = raw.trim();
  if (cleaned === '') return NaN;

  cleaned = cleaned.replace(/^R\$\s?/, '').trim();

  // Caso contenha pontos e vírgulas (ex: 1.250,50)
  if (cleaned.includes('.') && cleaned.includes(',')) {
    cleaned = cleaned.replace(/\./g, '').replace(',', '.');
  } else if (cleaned.includes(',')) {
    cleaned = cleaned.replace(',', '.');
  } else if (/^\d{1,3}(\.\d{3})+$/.test(cleaned)) {
    cleaned = cleaned.replace(/\./g, '');
  }

  const num = Number(cleaned);
  return Number.isFinite(num) ? num : NaN;
}

/**
 * Calcula a relação do Fator R: Folha de Salários 12 meses ÷ RBT12.
 * Folha de salários sob regime de caixa (Resolução CGSN nº 140/2018, art. 26, § 1º):
 * montantes efetivamente pagos nos 12 meses anteriores ao período de apuração, compreendendo
 * remunerações a empregados, pró-labore de sócios, 13º salário, encargos previdenciários patronais e FGTS.
 *
 * @param {number} folha12 Folha de salários acumulada dos últimos 12 meses (regime de caixa)
 * @param {number} rbt12 Receita bruta total acumulada dos últimos 12 meses
 * @returns {object} { fatorR, fatorRPercentual, anexoAplicavel, atingeCorte }
 */
export function calcularFatorR(folha12, rbt12) {
  const f = Math.max(0, Number(folha12) || 0);
  const r = Math.max(0, Number(rbt12) || 0);

  if (r <= 0) {
    // Quando RBT12 é zero, por prudência ou proporcionalidade
    const atinge = f > 0;
    return {
      fatorR: atinge ? 1.0 : 0.0,
      fatorRPercentual: atinge ? 100.0 : 0.0,
      anexoAplicavel: atinge ? ANEXOS.ANEXO_III : ANEXOS.ANEXO_V,
      atingeCorte: atinge
    };
  }

  const fatorR = f / r;
  // Comparação com tolerância numérica de precisão para limite de 28,00% (evita imprecisões IEEE 754)
  const atingeCorte = (fatorR + 1e-9) >= PERCENTUAL_FATOR_R_CORTE; // 28%
  const anexoAplicavel = atingeCorte ? ANEXOS.ANEXO_III : ANEXOS.ANEXO_V;

  return {
    fatorR: roundDecimal(fatorR, 6),
    fatorRPercentual: roundDecimal(fatorR * 100, 2),
    anexoAplicavel,
    atingeCorte
  };
}

/**
 * Analisa os limites do Sublimite Estadual (R$ 3.600.000,00) e do Teto Nacional (R$ 4.800.000,00),
 * diferenciando a RBT12 (utilizada para enquadramento na faixa e alíquota efetiva do mês)
 * da RBA (Receita Bruta Acumulada no ano-calendário em curso no mercado interno) que rege a produção
 * de efeitos do recolhimento de ICMS e ISS fora do DAS (Resolução CGSN nº 140/2018, arts. 9º, 12, 21 e 24).
 *
 * @param {number} rbt12 Receita bruta acumulada nos 12 meses anteriores
 * @param {number|null} rbaAnterior Receita bruta acumulada no ano-calendário até o mês anterior (mercado interno)
 * @param {number} receitaMes Receita do mercado interno no mês simulado
 * @returns {object} Informações detalhadas sobre sublimite e teto
 */
export function analisarLimitesSublimite(rbt12, rbaAnterior = null, receitaMes = 0) {
  const rbt12Val = Math.max(0, Number(rbt12) || 0);
  const recMesVal = Math.max(0, Number(receitaMes) || 0);
  const rbaInformada = rbaAnterior !== null && rbaAnterior !== undefined && !Number.isNaN(Number(rbaAnterior)) && Number(rbaAnterior) >= 0;
  const rbaAnteriorVal = rbaInformada ? Number(rbaAnterior) : null;
  const rbaAtual = rbaInformada ? roundCurrency(rbaAnteriorVal + recMesVal) : null;

  const rbt12NaFaixa6 = rbt12Val > SUBLIMITE_ESTADUAL && rbt12Val <= TETO_SIMPLES_NACIONAL;
  const rbt12UltrapassouTeto = rbt12Val > TETO_SIMPLES_NACIONAL;

  let rbaUltrapassouSublimiteAte20 = false;
  let rbaUltrapassouSublimiteMais20 = false;
  let rbaUltrapassouTeto = false;
  let icmsIssExcluidosNoMes = false;
  let statusSublimite = 'dentro'; // 'dentro' | 'excesso_ate_20' | 'excesso_mais_20_anterior' | 'excesso_mais_20_mes_atual' | 'teto_ultrapassado' | 'indefinido'
  let descricaoEfeitoSublimite = '';

  if (rbaInformada) {
    if (rbaAtual > TETO_SIMPLES_NACIONAL) {
      rbaUltrapassouTeto = true;
      statusSublimite = 'teto_ultrapassado';
      descricaoEfeitoSublimite = 'RBA no mercado interno ultrapassou o teto anual de R$ 4.800.000,00.';
    } else if (rbaAnteriorVal > MARGEM_EXCESSO_SUBLIMITE_20) {
      // Caso A: excesso superior a 20% (> R$ 4.320.000,00) já ocorrido em mês anterior
      rbaUltrapassouSublimiteMais20 = true;
      icmsIssExcluidosNoMes = true;
      statusSublimite = 'excesso_mais_20_anterior';
      descricaoEfeitoSublimite = 'Excesso superior a 20% ocorrido em mês anterior: o impedimento de recolher ICMS e ISS no DAS já está em vigor no mês atual (Resolução CGSN nº 140/2018, art. 9º, § 2º e art. 12, § 1º, I).';
    } else if (rbaAtual > MARGEM_EXCESSO_SUBLIMITE_20) {
      // Caso B: excesso superior a 20% (> R$ 4.320.000,00) ocorrido no próprio mês de apuração
      // RBA anterior <= R$ 4.320.000,00, mas com a receita do mês a RBA acumulada ultrapassou R$ 4.320.000,00
      rbaUltrapassouSublimiteMais20 = true;
      icmsIssExcluidosNoMes = false; // AINDA DENTRO do DAS no mês da ocorrência!
      statusSublimite = 'excesso_mais_20_mes_atual';
      descricaoEfeitoSublimite = 'Excesso superior a 20% ocorrido no próprio mês simulado: o ICMS e o ISS continuam sendo recolhidos dentro do Simples Nacional (no DAS) no mês em curso; o impedimento passará a produzir efeitos apenas a partir do mês subsequente (Resolução CGSN nº 140/2018, art. 9º, § 2º e art. 12, § 1º, I).';
    } else if (rbaAtual > SUBLIMITE_ESTADUAL) {
      // Caso C: excesso de até 20% (R$ 3.600.000,01 a R$ 4.320.000,00)
      rbaUltrapassouSublimiteAte20 = true;
      icmsIssExcluidosNoMes = false; // dentro do DAS no ano corrente
      statusSublimite = 'excesso_ate_20';
      descricaoEfeitoSublimite = 'Excesso de até 20% no ano corrente: o ICMS e o ISS continuam dentro do DAS durante todo o ano-calendário em curso; o impedimento produzirá efeitos apenas a partir do ano-calendário subsequente (Resolução CGSN nº 140/2018, art. 9º, § 1º).';
    } else {
      // rbaAtual <= SUBLIMITE_ESTADUAL (R$ 3.600.000,00)
      icmsIssExcluidosNoMes = false;
      statusSublimite = 'dentro';
      descricaoEfeitoSublimite = 'RBA no mercado interno dentro do sublimite de R$ 3.600.000,00: ICMS e ISS continuam incluídos na apuração unificada do DAS (Resolução CGSN nº 140/2018, art. 9º).';
    }
  } else {
    statusSublimite = 'indefinido';
  }

  return {
    rbt12: rbt12Val,
    rba: rbaAnteriorVal,
    rbaAnterior: rbaAnteriorVal,
    rbaAtual,
    receitaMes: recMesVal,
    rbaInformada,
    rbt12NaFaixa6,
    rbt12UltrapassouTeto,
    rbaUltrapassouSublimiteAte20,
    rbaUltrapassouSublimiteMais20,
    rbaUltrapassouTeto,
    icmsIssExcluidosNoMes,
    statusSublimite,
    descricaoEfeitoSublimite
  };
}

/**
 * Encontra a faixa oficial correspondente ao valor de RBT12 na tabela do anexo especificado.
 *
 * @param {string} anexoId Identificador do anexo ('anexo_1', 'anexo_2', 'anexo_3', 'anexo_4', 'anexo_5')
 * @param {number} rbt12 Receita bruta acumulada em R$
 * @returns {object} Dados da faixa oficial
 */
export function obterFaixaAnexo(anexoId, rbt12) {
  const tabela = TABELAS_ANEXOS[anexoId];
  if (!tabela) {
    throw new Error(`Anexo tributário inválido ou não suportado: "${anexoId}"`);
  }

  const r = Math.max(0, Number(rbt12) || 0);

  // Faixa 1 até 180.000,00
  if (r <= 180000.0) {
    return tabela.faixas[0];
  }

  for (let i = 0; i < tabela.faixas.length; i++) {
    const f = tabela.faixas[i];
    if (r >= f.limiteInferior && r <= f.limiteSuperior) {
      return f;
    }
  }

  // Acima do teto de R$ 4.800.000,00 -> retorna a última faixa (6ª) para fins de referência
  return tabela.faixas[tabela.faixas.length - 1];
}

/**
 * Calcula a Alíquota Efetiva do Simples Nacional para um determinado anexo e RBT12.
 * Fórmula: ((RBT12 × alíquota nominal) − parcela a deduzir) ÷ RBT12
 *
 * @param {string} anexoId Anexo tributário ('anexo_1' a 'anexo_5')
 * @param {number} rbt12 Receita bruta acumulada dos 12 meses anteriores
 * @returns {object} { aliquotaEfetiva, faixa, aliquotaNominal, parcelaDeduzir, tabela }
 */
export function calcularAliquotaEfetiva(anexoId, rbt12) {
  const tabela = TABELAS_ANEXOS[anexoId];
  if (!tabela) {
    throw new Error(`Anexo "${anexoId}" inválido.`);
  }

  const r = Math.max(0, Number(rbt12) || 0);
  const faixa = obterFaixaAnexo(anexoId, r);

  // Na 1ª faixa (ou RBT12 <= 180.000,00), a parcela a deduzir é 0 e a alíquota efetiva é igual à alíquota nominal
  if (r <= 180000.0 || r === 0) {
    return {
      aliquotaEfetiva: faixa.aliquotaNominal,
      faixa: faixa.faixa,
      aliquotaNominal: faixa.aliquotaNominal,
      parcelaDeduzir: 0.0,
      tabela
    };
  }

  // Fórmula oficial: ((RBT12 * Alíquota Nominal) - Parcela a Deduzir) / RBT12
  const numerador = (r * faixa.aliquotaNominal) - faixa.parcelaDeduzir;
  const aliquotaEfetivaCalculada = Math.max(0, numerador / r);

  return {
    aliquotaEfetiva: aliquotaEfetivaCalculada,
    faixa: faixa.faixa,
    aliquotaNominal: faixa.aliquotaNominal,
    parcelaDeduzir: faixa.parcelaDeduzir,
    tabela
  };
}

/**
 * Calcula a taxa efetiva de ICMS ou ISS aplicável no sublimite de R$ 3.600.000,00,
 * conforme o art. 24 da Resolução CGSN nº 140/2018 (aplicação da alíquota efetiva apurada
 * na 5ª faixa no teto do sublimite para o imposto estadual ou municipal enquanto incluído no DAS).
 *
 * @param {string} anexoId Identificador do anexo
 * @returns {object} { aliquotaEfetivaSublimite, percentualPartilhaEstadual, aliquotaEstadual, tipoTributo }
 */
export function calcularTaxaSublimiteArt24(anexoId) {
  const tabela = TABELAS_ANEXOS[anexoId];
  if (!tabela) {
    throw new Error(`Anexo "${anexoId}" inválido.`);
  }

  // Teto da 5ª faixa = SUBLIMITE_ESTADUAL = R$ 3.600.000,00
  const faixa5 = tabela.faixas.find((f) => f.faixa === 5) || tabela.faixas[4];
  const rbtSublimite = SUBLIMITE_ESTADUAL;

  const num5 = (rbtSublimite * faixa5.aliquotaNominal) - faixa5.parcelaDeduzir;
  const aliquotaEfetivaSublimite = Math.max(0, num5 / rbtSublimite);

  const partilha = faixa5.partilha || {};
  let aliquotaEstadual = 0;
  let tipoTributo = 'nenhum';
  let percentualPartilhaEstadual = 0;

  if (anexoId === ANEXOS.ANEXO_I || anexoId === ANEXOS.ANEXO_II) {
    tipoTributo = 'icms';
    percentualPartilhaEstadual = partilha.icms || 0;
    aliquotaEstadual = aliquotaEfetivaSublimite * percentualPartilhaEstadual;
  } else if (anexoId === ANEXOS.ANEXO_III || anexoId === ANEXOS.ANEXO_IV || anexoId === ANEXOS.ANEXO_V) {
    tipoTributo = 'iss';
    percentualPartilhaEstadual = partilha.iss || 0;
    // ISS tem limite máximo de 5,00%
    aliquotaEstadual = Math.min(0.05, aliquotaEfetivaSublimite * percentualPartilhaEstadual);
  }

  return {
    aliquotaEfetivaSublimite,
    percentualPartilhaEstadual,
    aliquotaEstadual,
    tipoTributo
  };
}

/**
 * Ajusta deterministicamente os centavos residuais na partilha de tributos
 * para garantir que a soma dos valores arredondados coincida exatamente com o total alvo.
 * Utiliza o Método do Maior Resto (Largest Remainder Method / Hamilton / Hare-Niemeyer):
 * 1. Atribui a cada componente o piso inteiro de centavos (Math.floor(valor * 100)).
 * 2. Calcula o déficit residual de centavos (targetCents - somaPisoCents).
 * 3. Aloca 1 centavo adicional aos componentes com maior resto fracionário decrescente.
 *    Critério de desempate determinístico: maior peso/partilha decrescente; ordem canônica estável.
 *
 * @param {Array<{ key: string, rawValue: number, weight: number, order: number }>} items
 * @param {number} targetTotal Total monetário alvo arredondado
 * @returns {Record<string, number>} Mapa com os valores monetários ajustados
 */
export function ratearCentavosMaiorResto(items, targetTotal) {
  if (!items || items.length === 0) return {};

  const targetCents = Math.round(targetTotal * 100);

  const parsed = items.map((item, idx) => {
    const rawCents = item.rawValue * 100;
    const normalizedRawCents = Math.round(rawCents * 1e8) / 1e8;
    const baseCents = Math.floor(normalizedRawCents);
    const remainder = normalizedRawCents - baseCents;
    return {
      key: item.key,
      weight: item.weight || 0,
      order: typeof item.order === 'number' ? item.order : idx,
      baseCents,
      remainder,
      finalCents: baseCents
    };
  });

  const sumBaseCents = parsed.reduce((acc, p) => acc + p.baseCents, 0);
  let deltaCents = targetCents - sumBaseCents;

  if (deltaCents > 0) {
    const sorted = [...parsed].sort((a, b) => {
      const diffRem = b.remainder - a.remainder;
      if (Math.abs(diffRem) > 1e-7) return diffRem;
      const diffWeight = b.weight - a.weight;
      if (Math.abs(diffWeight) > 1e-7) return diffWeight;
      return a.order - b.order;
    });

    for (let i = 0; i < deltaCents && i < sorted.length; i++) {
      sorted[i].finalCents += 1;
    }
  } else if (deltaCents < 0) {
    const sorted = [...parsed].sort((a, b) => {
      const diffRem = a.remainder - b.remainder;
      if (Math.abs(diffRem) > 1e-7) return diffRem;
      const diffWeight = a.weight - b.weight;
      if (Math.abs(diffWeight) > 1e-7) return diffWeight;
      return b.order - a.order;
    });

    for (let i = 0; i < Math.abs(deltaCents) && i < sorted.length; i++) {
      sorted[i].finalCents -= 1;
    }
  }

  const result = {};
  for (const p of parsed) {
    result[p.key] = p.finalCents / 100;
  }
  return result;
}

/**
 * Calcula a repartição detalhada dos tributos federais e estadual/municipal
 * sobre a receita apurada com base nas alíquotas efetivas.
 *
 * @param {string} anexoId Identificador do anexo
 * @param {number} faixaNum Número da faixa oficial (1 a 6)
 * @param {number} aliquotaFederal Alíquota efetiva dos tributos federais
 * @param {number} aliquotaEstadual Alíquota efetiva de ICMS ou ISS (0 se fora do DAS)
 * @param {number} receitaMes Receita mensal do anexo
 * @param {boolean} icmsIssNoDas Indica se ICMS/ISS está incluso na guia do DAS
 * @returns {object} Detalhamento dos tributos
 */
export function calcularDistribuicaoTributos(anexoId, faixaNum, aliquotaFederal, aliquotaEstadual, receitaMes, icmsIssNoDas = true) {
  const tabela = TABELAS_ANEXOS[anexoId];
  const faixaObj = (tabela && tabela.faixas.find((f) => f.faixa === faixaNum)) || null;
  const partilha = (faixaObj && faixaObj.partilha) || {};

  const rec = Math.max(0, Number(receitaMes) || 0);
  const baseFederal = rec * aliquotaFederal;
  const valorFederalTotal = roundCurrency(baseFederal);

  // Tributos federais
  const irpjPartilha = partilha.irpj || 0;
  const csllPartilha = partilha.csll || 0;
  const cofinsPartilha = partilha.cofins || 0;
  const pisPartilha = partilha.pis || 0;
  const cppPartilha = tabela && tabela.incluiCppNoDas ? (partilha.cpp || 0) : 0;
  const ipiPartilha = partilha.ipi || 0;

  // Soma dos percentuais de partilha destinados à União (6ª faixa = 1.0; faixas 1 a 5 = 1 - partilhaEstadual)
  const somaPartilhaFederal = irpjPartilha + csllPartilha + cofinsPartilha + pisPartilha + cppPartilha + ipiPartilha;
  const divisorFederal = somaPartilhaFederal > 0 ? somaPartilhaFederal : 1;

  const itensFederais = [
    { key: 'irpj', rawValue: baseFederal * (irpjPartilha / divisorFederal), weight: irpjPartilha, order: 0 },
    { key: 'csll', rawValue: baseFederal * (csllPartilha / divisorFederal), weight: csllPartilha, order: 1 },
    { key: 'cofins', rawValue: baseFederal * (cofinsPartilha / divisorFederal), weight: cofinsPartilha, order: 2 },
    { key: 'pis', rawValue: baseFederal * (pisPartilha / divisorFederal), weight: pisPartilha, order: 3 },
    { key: 'cpp', rawValue: baseFederal * (cppPartilha / divisorFederal), weight: cppPartilha, order: 4 },
  ];
  if (ipiPartilha > 0) {
    itensFederais.push({ key: 'ipi', rawValue: baseFederal * (ipiPartilha / divisorFederal), weight: ipiPartilha, order: 5 });
  }

  const rateioFederais = ratearCentavosMaiorResto(itensFederais, valorFederalTotal);

  const irpjValor = rateioFederais.irpj || 0;
  const csllValor = rateioFederais.csll || 0;
  const cofinsValor = rateioFederais.cofins || 0;
  const pisValor = rateioFederais.pis || 0;
  const cppValor = rateioFederais.cpp || 0;
  const ipiValor = rateioFederais.ipi || 0;

  // Tributo estadual / municipal (ICMS ou ISS)
  let icms = null;
  let iss = null;

  if (anexoId === ANEXOS.ANEXO_I || anexoId === ANEXOS.ANEXO_II) {
    const valorIcms = icmsIssNoDas ? roundCurrency(rec * aliquotaEstadual) : 0;
    icms = {
      nome: 'ICMS',
      descricao: 'Imposto sobre Circulação de Mercadorias e Serviços (Estadual)',
      percentualPartilha: partilha.icms || 0,
      aliquotaEfetiva: aliquotaEstadual,
      valor: valorIcms,
      noDas: icmsIssNoDas
    };
  }

  if (anexoId === ANEXOS.ANEXO_III || anexoId === ANEXOS.ANEXO_IV || anexoId === ANEXOS.ANEXO_V) {
    const valorIss = icmsIssNoDas ? roundCurrency(rec * aliquotaEstadual) : 0;
    iss = {
      nome: 'ISS',
      descricao: 'Imposto sobre Serviços de Qualquer Natureza (Municipal)',
      percentualPartilha: partilha.iss || 0,
      aliquotaEfetiva: aliquotaEstadual,
      valor: valorIss,
      noDas: icmsIssNoDas
    };
  }

  const valorEstadualMunicipalTotal = icms ? icms.valor : (iss ? iss.valor : 0);
  const rawTotal = aliquotaFederal + (icmsIssNoDas ? aliquotaEstadual : 0);
  const aliquotaTotalDas = faixaNum < 6 && icmsIssNoDas ? Math.round(rawTotal * 1e12) / 1e12 : rawTotal;
  const valorDasTotal = roundCurrency(valorFederalTotal + valorEstadualMunicipalTotal);

  return {
    anexoId,
    faixa: faixaNum,
    aliquotaTotalDas,
    valorDasTotal,
    componenteFederal: {
      aliquotaEfetiva: aliquotaFederal,
      valor: valorFederalTotal
    },
    componenteEstadualMunicipal: {
      aliquotaEfetiva: aliquotaEstadual,
      valor: valorEstadualMunicipalTotal,
      noDas: icmsIssNoDas,
      tipo: icms ? 'icms' : (iss ? 'iss' : 'nenhum')
    },
    tributos: {
      irpj: { nome: 'IRPJ', percentualPartilha: irpjPartilha, aliquotaEfetiva: aliquotaFederal * (irpjPartilha / divisorFederal), valor: irpjValor, noDas: true },
      csll: { nome: 'CSLL', percentualPartilha: csllPartilha, aliquotaEfetiva: aliquotaFederal * (csllPartilha / divisorFederal), valor: csllValor, noDas: true },
      cofins: { nome: 'Cofins', percentualPartilha: cofinsPartilha, aliquotaEfetiva: aliquotaFederal * (cofinsPartilha / divisorFederal), valor: cofinsValor, noDas: true },
      pis: { nome: 'PIS/Pasep', percentualPartilha: pisPartilha, aliquotaEfetiva: aliquotaFederal * (pisPartilha / divisorFederal), valor: pisValor, noDas: true },
      cpp: { nome: 'CPP', percentualPartilha: cppPartilha, aliquotaEfetiva: aliquotaFederal * (cppPartilha / divisorFederal), valor: cppValor, noDas: cppPartilha > 0 },
      ...(ipiPartilha > 0 ? { ipi: { nome: 'IPI', percentualPartilha: ipiPartilha, aliquotaEfetiva: aliquotaFederal * (ipiPartilha / divisorFederal), valor: ipiValor, noDas: true } } : {}),
      ...(icms ? { icms } : {}),
      ...(iss ? { iss } : {})
    }
  };
}

/**
 * Realiza a apuração completa de um anexo tributário, calculando a alíquota nominal,
 * a alíquota efetiva federal e a parcela estadual/municipal no DAS (conforme art. 24 da Res. CGSN 140/2018),
 * além da repartição detalhada dos tributos.
 *
 * @param {string} anexoId Identificador do anexo tributário
 * @param {number} rbt12 Receita bruta acumulada (RBT12 considerada)
 * @param {number} receita Receita faturada no mês para o anexo
 * @param {object} limitesInfo Informações da análise de sublimite e teto
 * @returns {object} Dados completos da apuração do anexo
 */
export function calcularApuracaoAnexo(anexoId, rbt12, receita, limitesInfo) {
  const calc = calcularAliquotaEfetiva(anexoId, rbt12);
  const faixaObj = calc.tabela.faixas.find((f) => f.faixa === calc.faixa) || calc.tabela.faixas[0];

  let aliquotaFederal = calc.aliquotaEfetiva;
  let aliquotaEstadual = 0;
  let icmsIssNoDas = true;

  if (calc.faixa === 6) {
    // Na 6ª faixa (LC 123/2006), a tabela nominal contempla exclusivamente tributos federais
    aliquotaFederal = calc.aliquotaEfetiva;
    if (limitesInfo && limitesInfo.rbaInformada && limitesInfo.icmsIssExcluidosNoMes) {
      // Excesso > 20% ocorrido em mês anterior: ICMS/ISS fora do DAS no mês corrente
      aliquotaEstadual = 0;
      icmsIssNoDas = false;
    } else if (limitesInfo && limitesInfo.rbaInformada) {
      // Caso B (excesso no próprio mês), Caso C (excesso até 20%) ou RBA <= 3,6M:
      // ICMS/ISS continua dentro do DAS no mês corrente.
      // Art. 24 da Resolução CGSN nº 140/2018: taxa no sublimite (5ª faixa)
      const taxaSub = calcularTaxaSublimiteArt24(anexoId);
      aliquotaEstadual = taxaSub.aliquotaEstadual;
      icmsIssNoDas = true;
    } else {
      // RBA não informada: apuração da 6ª faixa no DAS baseada na alíquota federal oficial
      aliquotaEstadual = 0;
      icmsIssNoDas = false;
    }
  } else {
    // Faixas 1 a 5: alíquota progressiva engloba federal e estadual/municipal
    const partilhaEstadual = (faixaObj.partilha && (faixaObj.partilha.icms || faixaObj.partilha.iss)) || 0;
    if (limitesInfo && limitesInfo.rbaInformada && limitesInfo.icmsIssExcluidosNoMes) {
      aliquotaEstadual = 0;
      aliquotaFederal = calc.aliquotaEfetiva * (1 - partilhaEstadual);
      icmsIssNoDas = false;
    } else {
      aliquotaEstadual = calc.aliquotaEfetiva * partilhaEstadual;
      aliquotaFederal = calc.aliquotaEfetiva * (1 - partilhaEstadual);
      icmsIssNoDas = true;
    }
  }

  const distribuicao = calcularDistribuicaoTributos(
    anexoId,
    calc.faixa,
    aliquotaFederal,
    aliquotaEstadual,
    receita,
    icmsIssNoDas
  );

  return {
    calc,
    faixaObj,
    aliquotaFederal,
    aliquotaEstadual,
    icmsIssNoDas,
    distribuicao,
    aliquotaEfetivaTotal: distribuicao.aliquotaTotalDas,
    dasEstimado: distribuicao.valorDasTotal
  };
}

/**
 * Normaliza e sanitiza os parâmetros de entrada.
 */
export function normalizeInput(raw = {}) {
  const anoReferencia = parseInt(raw.anoReferencia, 10) || ANO_REFERENCIA;
  const modoApuracao = raw.modoApuracao || MODOS_APURACAO.REGRA_GERAL;
  const tipoOperacao = raw.tipoOperacao || TIPOS_OPERACAO.UNICA;
  const anexo = raw.anexo || ANEXOS.ANEXO_III;

  const rbt12 = parseFlexibleNumber(raw.rbt12);
  const rba = parseFlexibleNumber(raw.rba);
  const receitaMes = parseFlexibleNumber(raw.receitaMes);
  const folha12 = parseFlexibleNumber(raw.folha12);

  // Início de atividade - campos complementares
  const mesesAtividadeAnteriores = parseInt(raw.mesesAtividadeAnteriores, 10) || 0;
  const receitaAcumuladaAnterior = parseFlexibleNumber(raw.receitaAcumuladaAnterior);

  // Modo segregado - receitas por anexo
  const receitaAnexo1 = parseFlexibleNumber(raw.receitaAnexo1);
  const receitaAnexo2 = parseFlexibleNumber(raw.receitaAnexo2);
  const receitaAnexo3 = parseFlexibleNumber(raw.receitaAnexo3);
  const receitaAnexo4 = parseFlexibleNumber(raw.receitaAnexo4);
  const receitaAnexo5 = parseFlexibleNumber(raw.receitaAnexo5);

  return {
    anoReferencia,
    modoApuracao,
    tipoOperacao,
    anexo,
    rbt12: Number.isNaN(rbt12) ? 0 : rbt12,
    rba: Number.isNaN(rba) ? null : rba,
    receitaMes: Number.isNaN(receitaMes) ? 0 : receitaMes,
    folha12: Number.isNaN(folha12) ? 0 : folha12,
    mesesAtividadeAnteriores,
    receitaAcumuladaAnterior: Number.isNaN(receitaAcumuladaAnterior) ? 0 : receitaAcumuladaAnterior,
    receitasSegregadas: {
      [ANEXOS.ANEXO_I]: Number.isNaN(receitaAnexo1) ? 0 : receitaAnexo1,
      [ANEXOS.ANEXO_II]: Number.isNaN(receitaAnexo2) ? 0 : receitaAnexo2,
      [ANEXOS.ANEXO_III]: Number.isNaN(receitaAnexo3) ? 0 : receitaAnexo3,
      [ANEXOS.ANEXO_IV]: Number.isNaN(receitaAnexo4) ? 0 : receitaAnexo4,
      [ANEXOS.ANEXO_V]: Number.isNaN(receitaAnexo5) ? 0 : receitaAnexo5
    }
  };
}

/**
 * Validação rigorosa dos parâmetros recebidos.
 */
export function validateInput(input) {
  if (input.anoReferencia !== ANO_REFERENCIA) {
    return {
      valid: false,
      message: `A calculadora atende exclusivamente a competência do ano-calendário ${ANO_REFERENCIA}.`
    };
  }

  if (!Object.values(MODOS_APURACAO).includes(input.modoApuracao)) {
    return { valid: false, message: 'Selecione um modo de apuração válido.' };
  }

  if (input.tipoOperacao === TIPOS_OPERACAO.UNICA) {
    if (!Object.values(ANEXOS).includes(input.anexo)) {
      return { valid: false, message: 'Selecione um anexo tributário válido.' };
    }
  }

  if (input.rba !== null && input.rba < 0) {
    return { valid: false, message: 'A Receita Bruta Acumulada no ano-calendário (RBA) não pode ser negativa.' };
  }

  if (input.modoApuracao === MODOS_APURACAO.REGRA_GERAL) {
    if (input.rbt12 < 0) {
      return { valid: false, message: 'A Receita Bruta Acumulada (RBT12) não pode ser negativa.' };
    }
  } else if (input.modoApuracao === MODOS_APURACAO.INICIO_MESES_2_12) {
    if (input.mesesAtividadeAnteriores < 1 || input.mesesAtividadeAnteriores > 11) {
      return {
        valid: false,
        message: 'Para empresa em início de atividade (2º ao 12º mês), informe entre 1 e 11 meses de operação anteriores.'
      };
    }
    if (input.receitaAcumuladaAnterior < 0) {
      return { valid: false, message: 'A receita bruta acumulada dos meses anteriores não pode ser negativa.' };
    }
  }

  if (input.tipoOperacao === TIPOS_OPERACAO.UNICA) {
    if (input.receitaMes < 0) {
      return { valid: false, message: 'A receita bruta do mês atual não pode ser negativa.' };
    }
    if (input.anexo === ANEXOS.FATOR_R && input.folha12 < 0) {
      return { valid: false, message: 'A folha de salários acumulada dos 12 meses não pode ser negativa.' };
    }
  } else {
    // Segregada
    const { receitasSegregadas } = input;
    for (const anexoId of Object.keys(receitasSegregadas)) {
      if (receitasSegregadas[anexoId] < 0) {
        return { valid: false, message: `A receita do mês para o ${TABELAS_ANEXOS[anexoId].nome} não pode ser negativa.` };
      }
    }
    const totalSegregado = Object.values(receitasSegregadas).reduce((a, b) => a + b, 0);
    if (totalSegregado <= 0 && input.receitaMes <= 0) {
      return { valid: false, message: 'Informe a receita do mês para pelo menos um anexo.' };
    }
  }

  return { valid: true };
}

/**
 * Motor central de cálculo do Simples Nacional.
 *
 * @param {object} rawInput Entradas cruas do formulário ou testes
 * @returns {object} { ok, error, warnings, data }
 */
export function calculate(rawInput = {}) {
  const input = normalizeInput(rawInput);
  const validation = validateInput(input);

  if (!validation.valid) {
    return {
      ok: false,
      error: validation.message,
      warnings: [],
      data: null
    };
  }

  const warnings = [];
  const memoriaCalculo = [];

  // 1. Determinação da RBT12 considerada
  let rbt12Considerada = 0;
  if (input.modoApuracao === MODOS_APURACAO.REGRA_GERAL) {
    rbt12Considerada = input.rbt12;
    memoriaCalculo.push(
      `1. Modalidade de apuração: Empresa em atividade regular (mais de 12 meses de funcionamento).`,
      `2. Receita Bruta Acumulada nos 12 meses anteriores (RBT12): ${formatCurrency(rbt12Considerada)}.`
    );
  } else if (input.modoApuracao === MODOS_APURACAO.INICIO_MES_1) {
    // No 1º mês de atividade: RBT12 proporcional = Receita do mês × 12 (Res. CGSN 140/2018, art. 27, § 1º)
    const receitaBase = input.tipoOperacao === TIPOS_OPERACAO.SEGREGADA
      ? Object.values(input.receitasSegregadas).reduce((a, b) => a + b, 0)
      : input.receitaMes;
    rbt12Considerada = receitaBase * 12;
    memoriaCalculo.push(
      `1. Modalidade de apuração: Início de atividade no 1º mês (Resolução CGSN nº 140/2018, art. 27, § 1º).`,
      `2. RBT12 Proporcionalizada: ${formatCurrency(receitaBase)} (receita do 1º mês) × 12 = ${formatCurrency(rbt12Considerada)}.`
    );
    warnings.push(
      'Empresa no 1º mês de atividade: a RBT12 é proporcionalizada multiplicando-se o faturamento do próprio mês por 12 para definição da faixa e alíquota efetiva (art. 27 da Resolução CGSN nº 140/2018).'
    );
  } else if (input.modoApuracao === MODOS_APURACAO.INICIO_MESES_2_12) {
    // Do 2º ao 12º mês: Média aritmética das receitas anteriores multiplicada por 12
    const mediaMensal = input.receitaAcumuladaAnterior / Math.max(1, input.mesesAtividadeAnteriores);
    rbt12Considerada = mediaMensal * 12;
    memoriaCalculo.push(
      `1. Modalidade de apuração: Início de atividade (${input.mesesAtividadeAnteriores}º ao 12º mês — Resolução CGSN nº 140/2018, art. 27, § 2º).`,
      `2. Média mensal anterior: ${formatCurrency(input.receitaAcumuladaAnterior)} ÷ ${input.mesesAtividadeAnteriores} meses = ${formatCurrency(mediaMensal)}.`,
      `3. RBT12 Proporcionalizada: ${formatCurrency(mediaMensal)} × 12 = ${formatCurrency(rbt12Considerada)}.`
    );
    warnings.push(
      `Empresa em início de atividade (${input.mesesAtividadeAnteriores} meses anteriores): a RBT12 é estimada pela média das receitas anteriores proporcionalizada por 12 meses.`
    );
  }

  // 2. Alertas de Limites Legais: Sublimite Estadual e Teto Máximo
  const receitaTotalMesPreliminar = input.tipoOperacao === TIPOS_OPERACAO.SEGREGADA
    ? Object.values(input.receitasSegregadas).reduce((a, b) => a + b, 0)
    : input.receitaMes;

  const limitesInfo = analisarLimitesSublimite(rbt12Considerada, input.rba, receitaTotalMesPreliminar);

  if (limitesInfo.rbt12UltrapassouTeto || limitesInfo.rbaUltrapassouTeto) {
    warnings.push(
      `ATENÇÃO — TETO MÁXIMO ULTRAPASSADO: o faturamento acumulado ultrapassa o teto anual de ${formatCurrency(TETO_SIMPLES_NACIONAL)} do Simples Nacional no mercado interno (LC nº 123/2006, art. 3º, II). A empresa sujeita-se às regras de desenquadramento do regime.`
    );
  } else if (limitesInfo.rbt12NaFaixa6) {
    if (limitesInfo.rbaInformada) {
      if (limitesInfo.statusSublimite === 'excesso_mais_20_anterior') {
        warnings.push(
          `ALERTA DE SUBLIMITE (EXCESSO > 20% ANTERIOR): a RBA no mercado interno acumulada até o mês anterior (${formatCurrency(limitesInfo.rbaAnterior)}) já havia ultrapassado o sublimite de ${formatCurrency(SUBLIMITE_ESTADUAL)} em mais de 20% (limite de R$ 4.320.000,00). O ICMS e o ISS devem ser recolhidos fora do DAS diretamente ao Estado/Município no mês simulado (Resolução CGSN nº 140/2018, art. 9º, § 2º e art. 12, § 1º, I).`
        );
      } else if (limitesInfo.statusSublimite === 'excesso_mais_20_mes_atual') {
        warnings.push(
          `ALERTA DE SUBLIMITE (EXCESSO > 20% NO MÊS): a RBA no mercado interno atingiu ${formatCurrency(limitesInfo.rbaAtual)} (anterior de ${formatCurrency(limitesInfo.rbaAnterior)} + receita do mês de ${formatCurrency(receitaTotalMesPreliminar)}), ultrapassando o sublimite de ${formatCurrency(SUBLIMITE_ESTADUAL)} em mais de 20% (limite de R$ 4.320.000,00) no próprio período de apuração. No mês corrente, o ICMS e o ISS CONTINUAM dentro do Simples Nacional (no DAS); o impedimento de recolher no DAS produzirá efeitos apenas a partir do mês subsequente (Resolução CGSN nº 140/2018, art. 9º, § 2º e art. 12, § 1º, I).`
        );
      } else if (limitesInfo.statusSublimite === 'excesso_ate_20') {
        warnings.push(
          `ALERTA DE SUBLIMITE (EXCESSO ATÉ 20%): a RBA no mercado interno acumulada no ano (${formatCurrency(limitesInfo.rbaAtual)}) ultrapassou o sublimite de ${formatCurrency(SUBLIMITE_ESTADUAL)} em até 20% (limite de R$ 4.320.000,00). Durante todo o ano-calendário em curso, o ICMS e o ISS CONTINUAM sendo recolhidos dentro do Simples Nacional (no DAS); o recolhimento fora do DAS produzirá efeitos apenas a partir de 1º de janeiro do ano-calendário subsequente (Resolução CGSN nº 140/2018, art. 9º, § 1º).`
        );
      } else {
        warnings.push(
          `NOTA DE SUBLIMITE: a RBT12 (${formatCurrency(rbt12Considerada)}) situa a empresa na 6ª faixa, mas a RBA no mercado interno (${formatCurrency(limitesInfo.rbaAtual)}) permanece dentro do sublimite de ${formatCurrency(SUBLIMITE_ESTADUAL)}. O ICMS e o ISS continuam integralmente incluídos na apuração unificada do DAS no exercício corrente (Resolução CGSN nº 140/2018, art. 9º).`
        );
      }
    } else {
      warnings.push(
        `ALERTA DE SUBLIMITE ESTADUAL (6ª FAIXA): a RBT12 (${formatCurrency(rbt12Considerada)}) situa a empresa na 6ª faixa (acima de ${formatCurrency(SUBLIMITE_ESTADUAL)}). Conforme os arts. 9º e 24 da Resolução CGSN nº 140/2018, a obrigatoriedade de recolher ICMS/ISS fora do DAS depende da Receita Bruta Acumulada no ano-calendário (RBA) no mercado interno: se a RBA do ano não ultrapassar R$ 3,6M, os tributos continuam dentro do DAS; se ultrapassar em até 20% (até R$ 4.320.000,00), os efeitos ocorrem apenas no ano subsequente; se ultrapassar em mais de 20%, os efeitos iniciam-se no mês subsequente ao da ocorrência. Esta apuração do sublimite aplica-se ao mercado interno e não inclui receitas de exportação.`
      );
    }
  }

  // 3. Processamento conforme tipo de operação: Única vs Segregada
  let apuracoesPorAnexo = [];
  let valorDasTotal = 0;
  let receitaTotalMes = 0;
  let anexoEfetivoPrincipal = null;
  let fatorRInfo = null;

  if (input.tipoOperacao === TIPOS_OPERACAO.UNICA) {
    let anexoAlvo = input.anexo;

    // Resolução do Fator R se selecionado
    if (input.anexo === ANEXOS.FATOR_R) {
      fatorRInfo = calcularFatorR(input.folha12, rbt12Considerada);
      anexoAlvo = fatorRInfo.anexoAplicavel;

      memoriaCalculo.push(
        `Fator R apurado: Folha 12m (${formatCurrency(input.folha12)}) ÷ RBT12 (${formatCurrency(rbt12Considerada)}) = ${formatPercent(fatorRInfo.fatorR, 4)} (${fatorRInfo.fatorRPercentual}%).`,
        fatorRInfo.atingeCorte
          ? `Critério do Fator R: Relação ≥ 28,00% -> Atividade enquadrada no ANEXO III (alíquotas reduzidas).`
          : `Critério do Fator R: Relação < 28,00% -> Atividade enquadrada no ANEXO V (alíquotas mais elevadas).`
      );
    }

    anexoEfetivoPrincipal = anexoAlvo;
    const apur = calcularApuracaoAnexo(anexoAlvo, rbt12Considerada, input.receitaMes, limitesInfo);
    const { calc, aliquotaFederal, aliquotaEstadual, icmsIssNoDas, distribuicao, aliquotaEfetivaTotal, dasEstimado } = apur;

    apuracoesPorAnexo.push({
      anexoId: anexoAlvo,
      nomeAnexo: calc.tabela.nome,
      descricaoAnexo: calc.tabela.descricao,
      incluiCppNoDas: calc.tabela.incluiCppNoDas,
      receitaMes: input.receitaMes,
      faixa: calc.faixa,
      aliquotaNominal: calc.aliquotaNominal,
      parcelaDeduzir: calc.parcelaDeduzir,
      aliquotaEfetiva: aliquotaEfetivaTotal,
      aliquotaEfetivaFederal: aliquotaFederal,
      aliquotaEfetivaEstadual: aliquotaEstadual,
      valorDas: dasEstimado,
      distribuicaoTributos: distribuicao.tributos,
      componenteFederal: distribuicao.componenteFederal,
      componenteEstadualMunicipal: distribuicao.componenteEstadualMunicipal
    });

    valorDasTotal = dasEstimado;
    receitaTotalMes = input.receitaMes;

    memoriaCalculo.push(
      `Anexo tributário considerado: ${calc.tabela.nome} — ${calc.tabela.descricao}.`,
      `Faixa oficial da RBT12: ${calc.faixa}ª Faixa (Alíquota nominal: ${formatPercent(calc.aliquotaNominal)} | Parcela a deduzir: ${formatCurrency(calc.parcelaDeduzir)}).`
    );

    if (calc.faixa === 6) {
      memoriaCalculo.push(
        `Cálculo da Alíquota Federal (6ª Faixa): ((${formatCurrency(rbt12Considerada)} × ${formatPercent(calc.aliquotaNominal)}) − ${formatCurrency(calc.parcelaDeduzir)}) ÷ ${formatCurrency(rbt12Considerada)} = ${formatPercent(aliquotaFederal, 4)} (${(aliquotaFederal * 100).toFixed(7)}%).`
      );
      if (icmsIssNoDas && aliquotaEstadual > 0) {
        memoriaCalculo.push(
          `Cálculo da Parcela Estadual/Municipal no DAS (Resolução CGSN nº 140/2018, art. 24): tributo ainda dentro do Simples Nacional no mês da ocorrência, apurado pela alíquota efetiva no sublimite de ${formatCurrency(SUBLIMITE_ESTADUAL)} = ${formatPercent(aliquotaEstadual, 6)} (${(aliquotaEstadual * 100).toFixed(6)}%).`,
          `Alíquota Total Unificada no DAS: ${formatPercent(aliquotaFederal, 4)} (Federal) + ${formatPercent(aliquotaEstadual, 4)} (ICMS/ISS) = ${formatPercent(aliquotaEfetivaTotal, 4)} (${(aliquotaEfetivaTotal * 100).toFixed(7)}%).`,
          `Receita do mês faturada: ${formatCurrency(input.receitaMes)}.`,
          `Estimativa do DAS mensal: ${formatCurrency(input.receitaMes)} × ${formatPercent(aliquotaEfetivaTotal, 4)} = ${formatCurrency(dasEstimado)} (Componente Federal: ${formatCurrency(distribuicao.componenteFederal.valor)} | Componente ICMS/ISS: ${formatCurrency(distribuicao.componenteEstadualMunicipal.valor)}).`
        );
      } else {
        memoriaCalculo.push(
          `ICMS/ISS fora do DAS: o recolhimento estadual/municipal ocorre diretamente perante o Estado/Município competente (fora da guia única). A alíquota do DAS corresponde exclusivamente aos tributos federais: ${formatPercent(aliquotaFederal, 4)} (${(aliquotaFederal * 100).toFixed(7)}%).`,
          `Receita do mês faturada: ${formatCurrency(input.receitaMes)}.`,
          `Estimativa do DAS mensal: ${formatCurrency(input.receitaMes)} × ${formatPercent(aliquotaFederal, 4)} = ${formatCurrency(dasEstimado)}.`
        );
      }
    } else {
      memoriaCalculo.push(
        calc.parcelaDeduzir > 0
          ? `Cálculo da Alíquota Efetiva: ((${formatCurrency(rbt12Considerada)} × ${formatPercent(calc.aliquotaNominal)}) − ${formatCurrency(calc.parcelaDeduzir)}) ÷ ${formatCurrency(rbt12Considerada)} = ${formatPercent(aliquotaEfetivaTotal, 4)}.`
          : `Cálculo da Alíquota Efetiva: 1ª Faixa (sem dedução) = ${formatPercent(aliquotaEfetivaTotal, 4)}.`,
        `Receita do mês faturada: ${formatCurrency(input.receitaMes)}.`,
        `Estimativa do DAS mensal: ${formatCurrency(input.receitaMes)} × ${formatPercent(aliquotaEfetivaTotal, 4)} = ${formatCurrency(dasEstimado)}.`
      );
    }

    const partesStr = Object.values(distribuicao.tributos)
      .filter((t) => t.valor > 0 || t.noDas === false)
      .map((t) => `${t.nome}: ${formatCurrency(t.valor)}${t.noDas === false ? ' (fora do DAS)' : ''}`)
      .join(' | ');
    if (partesStr) {
      memoriaCalculo.push(`Repartição estimada dos tributos no DAS: ${partesStr}.`);
    }

    // Alerta do Anexo IV (sem CPP no DAS e ressalva da CPRB)
    if (anexoAlvo === ANEXOS.ANEXO_IV) {
      warnings.push(
        'IMPORTANTE — ANEXO IV: a guia do DAS NÃO inclui a Contribuição Previdenciária Patronal (CPP). A apuração patronal (20% + RAT ajustado pelo FAP) sobre a folha de pagamento descreve a sistemática geral da Lei nº 8.212/1991 (art. 18, § 5º-C da LC nº 123/2006) e é recolhida via DCTFWeb/DARF. Atenção: essa regra geral não é universal e pode não se aplicar às empresas sujeitas à CPRB (desoneração da folha da Lei nº 12.546/2011, incidente sobre determinadas atividades de construção civil), cujo enquadramento específico não é calculado por esta ferramenta e deve ser validado com profissional contábil. As optantes pelo Simples Nacional são isentas de contribuições a outras entidades e fundos — terceiros (art. 13, § 3º da LC nº 123/2006).'
      );
      memoriaCalculo.push(
        `Nota do Anexo IV: a Contribuição Previdenciária Patronal (CPP) não compõe esta alíquota. A sistemática convencional prevê CPP (20%) + RAT/FAP sobre a folha via DCTFWeb/DARF, com isenção de contribuições a outras entidades e fundos (terceiros) (art. 13, § 3º da LC nº 123/2006). A estimativa não contempla o regime da CPRB (desoneração da folha da Lei nº 12.546/2011).`
      );
    }
  } else {
    // Tipo Operação = SEGREGADA (Múltiplos anexos)
    memoriaCalculo.push(
      `Operação com segregação de receitas por anexo: a mesma RBT12 global (${formatCurrency(rbt12Considerada)}) é utilizada para apurar a faixa e a alíquota efetiva de cada anexo separadamente.`
    );

    let temAnexo4 = false;

    for (const anexoId of [ANEXOS.ANEXO_I, ANEXOS.ANEXO_II, ANEXOS.ANEXO_III, ANEXOS.ANEXO_IV, ANEXOS.ANEXO_V]) {
      const rec = input.receitasSegregadas[anexoId] || 0;
      if (rec > 0) {
        const apur = calcularApuracaoAnexo(anexoId, rbt12Considerada, rec, limitesInfo);
        const { calc, aliquotaFederal, aliquotaEstadual, distribuicao, aliquotaEfetivaTotal, dasEstimado } = apur;

        apuracoesPorAnexo.push({
          anexoId,
          nomeAnexo: calc.tabela.nome,
          descricaoAnexo: calc.tabela.descricao,
          incluiCppNoDas: calc.tabela.incluiCppNoDas,
          receitaMes: rec,
          faixa: calc.faixa,
          aliquotaNominal: calc.aliquotaNominal,
          parcelaDeduzir: calc.parcelaDeduzir,
          aliquotaEfetiva: aliquotaEfetivaTotal,
          aliquotaEfetivaFederal: aliquotaFederal,
          aliquotaEfetivaEstadual: aliquotaEstadual,
          valorDas: dasEstimado,
          distribuicaoTributos: distribuicao.tributos,
          componenteFederal: distribuicao.componenteFederal,
          componenteEstadualMunicipal: distribuicao.componenteEstadualMunicipal
        });

        valorDasTotal += dasEstimado;
        receitaTotalMes += rec;

        memoriaCalculo.push(
          `• ${calc.tabela.nome} (${calc.tabela.descricao}): Receita ${formatCurrency(rec)} | Faixa ${calc.faixa}ª | Alíquota Nominal ${formatPercent(calc.aliquotaNominal)} | Ded. ${formatCurrency(calc.parcelaDeduzir)} | Alíq. Efetiva ${formatPercent(aliquotaEfetivaTotal, 4)} | DAS do Anexo: ${formatCurrency(dasEstimado)}.`
        );

        if (anexoId === ANEXOS.ANEXO_IV) temAnexo4 = true;
      }
    }

    valorDasTotal = roundCurrency(valorDasTotal);
    memoriaCalculo.push(
      `Total faturado no mês (soma dos anexos): ${formatCurrency(receitaTotalMes)}.`,
      `Total estimado do DAS mensal (soma das guias dos anexos): ${formatCurrency(valorDasTotal)}.`
    );

    if (temAnexo4) {
      warnings.push(
        'ATENÇÃO — ANEXO IV: para a parcela de receitas faturadas no Anexo IV, a Contribuição Previdenciária Patronal NÃO está inclusa no DAS e deve ser recolhida sobre a folha via DCTFWeb/DARF (sistemática geral de CPP 20% + RAT/FAP). As empresas sujeitas à CPRB (desoneração da folha da Lei nº 12.546/2011) possuem regime próprio não calculado por esta ferramenta. As optantes pelo Simples Nacional são isentas de contribuições a outras entidades e fundos — terceiros (art. 13, § 3º da LC nº 123/2006).'
      );
    }
  }

  // Alíquota média ponderada global para fins informativos
  const aliquotaMediaGlobal = receitaTotalMes > 0 ? valorDasTotal / receitaTotalMes : 0;

  return {
    ok: true,
    error: null,
    warnings,
    data: {
      anoReferencia: ANO_REFERENCIA,
      dataConsultaOficial: DATA_CONSULTA_OFICIAL,
      modoApuracao: input.modoApuracao,
      tipoOperacao: input.tipoOperacao,
      rbt12Considerada,
      rbaConsiderada: limitesInfo.rbaAtual,
      rbaAnteriorConsiderada: limitesInfo.rbaAnterior,
      limitesInfo,
      receitaTotalMes,
      valorDasTotal,
      aliquotaMediaGlobal,
      anexoEfetivoPrincipal,
      fatorRInfo,
      apuracoesPorAnexo,
      ultrapassouSublimite: limitesInfo.rbt12NaFaixa6,
      ultrapassouTeto: limitesInfo.rbt12UltrapassouTeto || limitesInfo.rbaUltrapassouTeto,
      memoriaCalculo
    }
  };
}

export function getResultSections(data) {
  if (!data) return [];
  const principal = data.apuracoesPorAnexo[0] || {};
  const sections = [
    {
      title: 'Resumo da Guia Única (DAS) e Alíquotas',
      items: [
        { label: 'Anexo considerado', value: principal.nomeAnexo || 'Múltiplos Anexos' },
        { label: 'Faixa de faturamento', value: principal.faixa ? `${principal.faixa}ª Faixa` : '—' },
        { label: 'Receita bruta acumulada (RBT12)', value: formatCurrency(data.rbt12Considerada) },
        { label: 'Receita faturada no mês', value: formatCurrency(data.receitaTotalMes) },
        { label: 'Alíquota nominal', value: formatPercent(principal.aliquotaNominal || 0) },
        { label: 'Parcela a deduzir', value: formatCurrency(principal.parcelaDeduzir || 0) },
        { label: 'Alíquota efetiva apurada', value: formatPercent(principal.aliquotaEfetiva || data.aliquotaMediaGlobal, 4) },
        { label: 'Valor estimado do DAS mensal', value: formatCurrency(data.valorDasTotal) }
      ]
    }
  ];

  if (data.fatorRInfo) {
    sections.push({
      title: 'Apuração do Fator R',
      items: [
        { label: 'Relação Fator R', value: `${data.fatorRInfo.fatorRPercentual}%` },
        { label: 'Enquadramento', value: data.fatorRInfo.atingeCorte ? 'Anexo III (Fator R ≥ 28,00%)' : 'Anexo V (Fator R < 28,00%)' }
      ]
    });
  }

  if (principal.distribuicaoTributos) {
    const itensTributos = Object.values(principal.distribuicaoTributos).map((trib) => ({
      label: `${trib.nome}${trib.noDas === false ? ' (Fora do DAS)' : ''}`,
      value: `${formatCurrency(trib.valor)} (${formatPercent(trib.aliquotaEfetiva, 4)})`
    }));
    sections.push({
      title: 'Repartição dos Tributos no DAS',
      items: itensTributos
    });
  }

  if (data.warnings && data.warnings.length > 0) {
    sections.push({
      title: 'Avisos e Limitações',
      items: data.warnings.map((w, idx) => ({ label: `Aviso ${idx + 1}`, value: w }))
    });
  }

  sections.push({
    title: 'Memória de Cálculo',
    items: data.memoriaCalculo.map((m, idx) => ({ label: `Passo ${idx + 1}`, value: m }))
  });

  return sections;
}

export function formatResult(data) {
  if (!data) return {};

  const {
    rbt12Considerada,
    receitaTotalMes,
    valorDasTotal,
    aliquotaMediaGlobal,
    apuracoesPorAnexo,
    fatorRInfo,
    ultrapassouSublimite,
    ultrapassouTeto
  } = data;

  const principal = apuracoesPorAnexo[0] || {};

  return {
    rbt12Formatada: formatCurrency(rbt12Considerada),
    receitaMesFormatada: formatCurrency(receitaTotalMes),
    valorDasFormatado: formatCurrency(valorDasTotal),
    aliquotaEfetivaFormatada: formatPercent(principal.aliquotaEfetiva || aliquotaMediaGlobal, 4),
    aliquotaNominalFormatada: formatPercent(principal.aliquotaNominal || 0),
    parcelaDeduzirFormatada: formatCurrency(principal.parcelaDeduzir || 0),
    faixaFormatada: principal.faixa ? `${principal.faixa}ª Faixa` : '—',
    anexoNomeFormatado: principal.nomeAnexo || 'Múltiplos Anexos',
    fatorRFormatado: fatorRInfo ? `${fatorRInfo.fatorRPercentual.toFixed(2)}%` : null,
    ultrapassouSublimite,
    ultrapassouTeto,
    distribuicaoTributos: principal.distribuicaoTributos || null,
    componenteFederal: principal.componenteFederal || null,
    componenteEstadualMunicipal: principal.componenteEstadualMunicipal || null
  };
}

export function buildCopyText(data) {
  if (!data) return '';

  const {
    anoReferencia,
    rbt12Considerada,
    receitaTotalMes,
    valorDasTotal,
    aliquotaMediaGlobal,
    apuracoesPorAnexo,
    fatorRInfo,
    memoriaCalculo,
    warnings
  } = data;

  const lines = [
    `Calculadora Simples Nacional (Ano-Calendário ${anoReferencia}) — Calculadora Master`,
    `Data da consulta oficial: ${DATA_CONSULTA_OFICIAL}`,
    '--------------------------------------------------',
    `Receita Bruta Acumulada (RBT12): ${formatCurrency(rbt12Considerada)}`,
    `Receita do Mês Apurada: ${formatCurrency(receitaTotalMes)}`,
    `Valor Estimado do DAS Mensal: ${formatCurrency(valorDasTotal)}`,
    `Alíquota Efetiva Média: ${formatPercent(aliquotaMediaGlobal, 4)}`,
    '--------------------------------------------------'
  ];

  if (fatorRInfo) {
    lines.push(
      `Fator R Apurado: ${fatorRInfo.fatorRPercentual}% (${fatorRInfo.atingeCorte ? 'Enquadrado no Anexo III' : 'Enquadrado no Anexo V'})`
    );
  }

  lines.push('Detalhamento por Anexo:');
  for (const ap of apuracoesPorAnexo) {
    lines.push(
      `- ${ap.nomeAnexo}: Receita ${formatCurrency(ap.receitaMes)} | Faixa ${ap.faixa}ª | Alíq. Efetiva ${formatPercent(ap.aliquotaEfetiva, 4)} | DAS: ${formatCurrency(ap.valorDas)}`
    );
  }

  const principal = apuracoesPorAnexo[0];
  if (principal && principal.distribuicaoTributos) {
    lines.push('--------------------------------------------------');
    lines.push('Repartição dos Tributos:');
    Object.values(principal.distribuicaoTributos).forEach((trib) => {
      lines.push(`- ${trib.nome}: ${formatCurrency(trib.valor)} (${formatPercent(trib.aliquotaEfetiva, 4)})${trib.noDas === false ? ' [fora do DAS]' : ''}`);
    });
  }

  if (warnings.length > 0) {
    lines.push('--------------------------------------------------');
    lines.push('Avisos e Limitações:');
    warnings.forEach((w) => lines.push(`* ${w}`));
  }

  lines.push('--------------------------------------------------');
  lines.push('Memória de Cálculo:');
  memoriaCalculo.forEach((m) => lines.push(`• ${m}`));

  lines.push('--------------------------------------------------');
  lines.push('Simulação baseada na LC 123/2006 e Res. CGSN 140/2018. Não substitui o PGDAS-D oficial.');
  lines.push('https://www.calculadoramaster.com/tools/financas/simples-nacional.html');

  return lines.join('\n');
}

/**
 * Conecta a interface DOM aos cálculos, validações e ações de usuário.
 */
export function setupTool(root) {
  if (!root) return null;

  const form = root.querySelector('#formSimplesNacional');
  if (!form) return null;

  // Seletores
  const selModoApuracao = root.querySelector('#modoApuracaoSN');
  const selTipoOperacao = root.querySelector('#tipoOperacaoSN');
  const selAnexo = root.querySelector('#anexoSN');

  // Campos numéricos
  const inRbt12 = root.querySelector('#rbt12SN');
  const inRba = root.querySelector('#rbaSN');
  const inReceitaMes = root.querySelector('#receitaMesSN');
  const inFolha12 = root.querySelector('#folha12SN');
  const inMesesInicio = root.querySelector('#mesesInicioSN');
  const inReceitaAnteriorInicio = root.querySelector('#receitaAnteriorInicioSN');

  // Campos de segregação
  const inRecAnexo1 = root.querySelector('#recAnexo1SN');
  const inRecAnexo2 = root.querySelector('#recAnexo2SN');
  const inRecAnexo3 = root.querySelector('#recAnexo3SN');
  const inRecAnexo4 = root.querySelector('#recAnexo4SN');
  const inRecAnexo5 = root.querySelector('#recAnexo5SN');

  // Grupos / Containers
  const grupoRbt12 = root.querySelector('#grupoRbt12SN');
  const grupoInicioMeses = root.querySelector('#grupoInicioMesesSN');
  const grupoAnexoUnico = root.querySelector('#grupoAnexoUnicoSN');
  const grupoReceitaMesUnica = root.querySelector('#grupoReceitaMesUnicaSN');
  const grupoFatorR = root.querySelector('#grupoFatorRSN');
  const grupoSegregadas = root.querySelector('#grupoSegregadasSN');

  // Botões
  const btnLimpar = root.querySelector('#btnLimparSN');
  const btnCopiar = root.querySelector('#btnCopiarSN');
  const btnCompartilhar = root.querySelector('#btnCompartilharSN');
  const btnImprimir = root.querySelector('#btnImprimirSN');

  // Painel de resultados e mensagens
  const painelResultado = root.querySelector('#resultadoSimplesNacional');
  const painelErro = root.querySelector('#erroSimplesNacional');
  const painelStatus = root.querySelector('#statusSimplesNacional');

  // Elementos do resultado
  const resAnexo = root.querySelector('#resAnexoSN');
  const resFaixa = root.querySelector('#resFaixaSN');
  const resRbt12 = root.querySelector('#resRbt12SN');
  const resReceitaMes = root.querySelector('#resReceitaMesSN');
  const resAliquotaNominal = root.querySelector('#resAliquotaNominalSN');
  const resParcelaDeduzir = root.querySelector('#resParcelaDeduzirSN');
  const resAliquotaEfetiva = root.querySelector('#resAliquotaEfetivaSN');
  const resValorDas = root.querySelector('#resValorDasSN');

  const blocoAlertaLimite = root.querySelector('#blocoAlertaLimiteSN');
  const resAlertaLimite = root.querySelector('#resAlertaLimiteSN');

  const cardFatorRResultado = root.querySelector('#cardFatorRResultadoSN');
  const resFatorRPercentual = root.querySelector('#resFatorRPercentualSN');
  const resFatorREnquadramento = root.querySelector('#resFatorREnquadramentoSN');

  const listaMemoria = root.querySelector('#listaMemoriaCalculoSN');

  let currentCalculationData = null;

  function setHidden(el, hidden) {
    if (el) {
      el.hidden = hidden;
    }
  }

  function syncFormVisibility() {
    const modo = (selModoApuracao && selModoApuracao.value) || MODOS_APURACAO.REGRA_GERAL;
    const tipo = (selTipoOperacao && selTipoOperacao.value) || TIPOS_OPERACAO.UNICA;
    const anexo = (selAnexo && selAnexo.value) || ANEXOS.ANEXO_III;

    // RBT12 vs Início de atividade
    if (modo === MODOS_APURACAO.REGRA_GERAL) {
      setHidden(grupoRbt12, false);
      setHidden(grupoInicioMeses, true);
    } else if (modo === MODOS_APURACAO.INICIO_MES_1) {
      setHidden(grupoRbt12, true);
      setHidden(grupoInicioMeses, true);
    } else if (modo === MODOS_APURACAO.INICIO_MESES_2_12) {
      setHidden(grupoRbt12, true);
      setHidden(grupoInicioMeses, false);
    }

    // Tipo de operação: Única vs Segregada
    if (tipo === TIPOS_OPERACAO.UNICA) {
      setHidden(grupoAnexoUnico, false);
      setHidden(grupoReceitaMesUnica, false);
      setHidden(grupoSegregadas, true);

      // Fator R
      if (anexo === ANEXOS.FATOR_R) {
        setHidden(grupoFatorR, false);
      } else {
        setHidden(grupoFatorR, true);
      }
    } else {
      // Segregada
      setHidden(grupoAnexoUnico, true);
      setHidden(grupoReceitaMesUnica, true);
      setHidden(grupoFatorR, true);
      setHidden(grupoSegregadas, false);
    }
  }

  function clearResults() {
    currentCalculationData = null;
    setHidden(painelResultado, true);
    setHidden(painelErro, true);
    if (painelErro) painelErro.textContent = '';
    if (painelStatus) painelStatus.textContent = '';
    if (btnCopiar) setHidden(btnCopiar, true);
    if (btnCompartilhar) setHidden(btnCompartilhar, true);
    if (btnImprimir) setHidden(btnImprimir, true);
  }

  function handleCalculate(e) {
    if (e && e.preventDefault) e.preventDefault();

    const payload = {
      anoReferencia: ANO_REFERENCIA,
      modoApuracao: (selModoApuracao && selModoApuracao.value) || MODOS_APURACAO.REGRA_GERAL,
      tipoOperacao: (selTipoOperacao && selTipoOperacao.value) || TIPOS_OPERACAO.UNICA,
      anexo: (selAnexo && selAnexo.value) || ANEXOS.ANEXO_III,
      rbt12: inRbt12 ? inRbt12.value : '',
      rba: inRba ? inRba.value : '',
      receitaMes: inReceitaMes ? inReceitaMes.value : '',
      folha12: inFolha12 ? inFolha12.value : '',
      mesesAtividadeAnteriores: inMesesInicio ? inMesesInicio.value : '',
      receitaAcumuladaAnterior: inReceitaAnteriorInicio ? inReceitaAnteriorInicio.value : '',
      receitaAnexo1: inRecAnexo1 ? inRecAnexo1.value : '',
      receitaAnexo2: inRecAnexo2 ? inRecAnexo2.value : '',
      receitaAnexo3: inRecAnexo3 ? inRecAnexo3.value : '',
      receitaAnexo4: inRecAnexo4 ? inRecAnexo4.value : '',
      receitaAnexo5: inRecAnexo5 ? inRecAnexo5.value : ''
    };

    const res = calculate(payload);

    if (!res.ok) {
      currentCalculationData = null;
      if (painelErro) {
        painelErro.textContent = res.error;
        setHidden(painelErro, false);
      }
      setHidden(painelResultado, true);
      if (btnCopiar) setHidden(btnCopiar, true);
      if (btnCompartilhar) setHidden(btnCompartilhar, true);
      if (btnImprimir) setHidden(btnImprimir, true);
      return;
    }

    currentCalculationData = res.data;
    setHidden(painelErro, true);
    if (painelErro) painelErro.textContent = '';

    const formatted = formatResult(res.data);

    if (resAnexo) resAnexo.textContent = formatted.anexoNomeFormatado;
    if (resFaixa) resFaixa.textContent = formatted.faixaFormatada;
    if (resRbt12) resRbt12.textContent = formatted.rbt12Formatada;
    if (resReceitaMes) resReceitaMes.textContent = formatted.receitaMesFormatada;
    if (resAliquotaNominal) resAliquotaNominal.textContent = formatted.aliquotaNominalFormatada;
    if (resParcelaDeduzir) resParcelaDeduzir.textContent = formatted.parcelaDeduzirFormatada;
    if (resAliquotaEfetiva) resAliquotaEfetiva.textContent = formatted.aliquotaEfetivaFormatada;
    if (resValorDas) resValorDas.textContent = formatted.valorDasFormatado;

    // Alertas de Limites / Sublimites
    if (res.data.warnings && res.data.warnings.length > 0) {
      if (blocoAlertaLimite) setHidden(blocoAlertaLimite, false);
      if (resAlertaLimite) {
        if (typeof document !== 'undefined' && typeof document.createElement === 'function') {
          resAlertaLimite.innerHTML = '';
          res.data.warnings.forEach((w) => {
            const p = document.createElement('p');
            p.textContent = w;
            resAlertaLimite.appendChild(p);
          });
        } else {
          resAlertaLimite.textContent = res.data.warnings.join('\n');
        }
      }
    } else {
      if (blocoAlertaLimite) setHidden(blocoAlertaLimite, true);
    }

    // Card do Fator R
    if (res.data.fatorRInfo) {
      if (cardFatorRResultado) setHidden(cardFatorRResultado, false);
      if (resFatorRPercentual) resFatorRPercentual.textContent = formatted.fatorRFormatado;
      if (resFatorREnquadramento) {
        resFatorREnquadramento.textContent = res.data.fatorRInfo.atingeCorte
          ? 'Anexo III (Fator R ≥ 28,00%)'
          : 'Anexo V (Fator R < 28,00%)';
      }
    } else {
      if (cardFatorRResultado) setHidden(cardFatorRResultado, true);
    }

    // Memória de cálculo
    if (listaMemoria) {
      if (typeof document !== 'undefined' && typeof document.createElement === 'function') {
        listaMemoria.innerHTML = '';
        res.data.memoriaCalculo.forEach((item) => {
          const li = document.createElement('li');
          li.textContent = item;
          listaMemoria.appendChild(li);
        });
      } else {
        listaMemoria.textContent = res.data.memoriaCalculo.join('\n');
      }
    }

    setHidden(painelResultado, false);
    if (btnCopiar) setHidden(btnCopiar, false);
    if (btnCompartilhar) setHidden(btnCompartilhar, false);
    if (btnImprimir) setHidden(btnImprimir, false);
  }

  // Event Listeners
  if (selModoApuracao) selModoApuracao.addEventListener('change', () => {
    syncFormVisibility();
    clearResults();
  });
  if (selTipoOperacao) selTipoOperacao.addEventListener('change', () => {
    syncFormVisibility();
    clearResults();
  });
  if (selAnexo) selAnexo.addEventListener('change', () => {
    syncFormVisibility();
    clearResults();
  });

  form.addEventListener('submit', handleCalculate);

  if (btnLimpar) {
    btnLimpar.addEventListener('click', () => {
      if (typeof form.reset === 'function') {
        form.reset();
      }
      syncFormVisibility();
      clearResults();
    });
  }

  // Ações de compartilhamento, cópia e impressão
  const resultActions = createResultActions({
    title: 'Calculadora Simples Nacional (2026) — Calculadora Master',
    statusElement: painelStatus,
    getSections: () => (currentCalculationData ? getResultSections(currentCalculationData) : [])
  });

  if (btnCopiar) {
    btnCopiar.addEventListener('click', () => resultActions.copy());
  }
  if (btnCompartilhar) {
    btnCompartilhar.addEventListener('click', () => {
      const shareUrl = typeof window !== 'undefined' && window.location && window.location.href
        ? window.location.href
        : 'https://www.calculadoramaster.com/tools/financas/simples-nacional.html';
      resultActions.share(shareUrl);
    });
  }
  if (btnImprimir) {
    btnImprimir.addEventListener('click', () => resultActions.print());
  }

  syncFormVisibility();

  return {
    calculate: handleCalculate,
    clear: clearResults,
    actions: resultActions
  };
}
