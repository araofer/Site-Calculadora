/**
 * Testes Automatizados - Calculadora MEI ou Autônomo (mei-ou-autonomo)
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  ANO_REFERENCIA,
  FONTES_OFICIAIS,
  TIPOS_ATIVIDADE,
  PLANOS_AUTONOMO,
  PARAMETROS_REFERENCIA_2026,
  DEFAULTS,
  parseFlexibleNumber,
  normalizeInput,
  validateInput,
  calculate,
  getResultSections,
  formatResult,
  buildCopyText,
  setupTool
} from '../js/tools/mei-ou-autonomo.js';
import {
  VALID_TOOL_IDS,
  STORAGE_KEY,
  addFavorite,
  removeFavorite,
  isFavorite,
  getFavorites,
  _resetMemoryForTesting
} from '../js/core/favorites.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');
const PAGE_PATH = path.join(
  ROOT_DIR,
  'src',
  'pages',
  'tools',
  'financas',
  'mei-ou-autonomo.page.html'
);
const TOOLS_JSON_PATH = path.join(ROOT_DIR, 'data', 'tools.json');

function createElement(initial = {}) {
  const listeners = new Map();
  const attributes = new Map();
  return {
    value: '',
    textContent: '',
    className: '',
    hidden: false,
    ...initial,
    getAttribute(name) {
      return attributes.get(name) ?? null;
    },
    setAttribute(name, val) {
      attributes.set(name, String(val));
    },
    addEventListener(type, handler) {
      if (!listeners.has(type)) listeners.set(type, []);
      listeners.get(type).push(handler);
    },
    async trigger(type, event = {}) {
      const handlers = listeners.get(type) || [];
      let lastRes;
      for (const handler of handlers) {
        lastRes = await handler({
          preventDefault() {},
          ...event
        });
      }
      return lastRes;
    }
  };
}

function createFakeDom() {
  const elements = {
    '#faturamentoMensalMeiAutonomo': createElement({ value: '5000,00' }),
    '#despesasMensaisMeiAutonomo': createElement({ value: '800,00' }),
    '#mesesAtividadeMeiAutonomo': createElement({ value: '12' }),
    '#tipoAtividadeMeiAutonomo': createElement({ value: 'servicos' }),
    '#dasMensalMei': createElement({ value: '86,05' }),
    '#planoInssAutonomo': createElement({ value: 'simplificado_11' }),
    '#baseContribuicaoAutonomo': createElement({ value: '1621,00' }),
    '#descricaoBaseContribuicaoAutonomo': createElement({
      textContent:
        'Base mensal considerada no plano normal de 20%, respeitando o piso de R$ 1.621,00 e o teto previdenciário de R$ 8.475,55 em 2026.'
    }),
    '#ajudaBaseContribuicaoAutonomo': createElement({
      textContent:
        'No plano simplificado de 11%, o valor personalizado deste campo não é utilizado no cálculo. Ele será mantido se você selecionar o plano normal de 20%.'
    }),
    '#irpfCarneLeaoMensalAutonomo': createElement({ value: '' }),
    '#btnLimparMeiAutonomo': createElement(),
    '#erroMeiOuAutonomo': createElement({ hidden: true }),
    '#resultadoMeiAutonomo': createElement({ hidden: true }),
    '#statusMeiAutonomo': createElement(),
    '#resPeriodoMesesMeiAutonomo': createElement(),
    '#resFaturamentoMensalComum': createElement(),
    '#resFaturamentoPeriodoComum': createElement(),
    '#resDespesasMensaisComum': createElement(),
    '#resDespesasPeriodoComum': createElement(),
    '#resDiferencaSaldosPeriodo': createElement(),
    '#resDiferencaSaldosMensal': createElement(),
    '#resBaseComparacaoSaldos': createElement(),
    '#resIndicadorLimiteMei': createElement(),
    '#resAvisoLimiteMeiAutonomo': createElement(),
    '#resTipoAtividadeMei': createElement(),
    '#resFaturamentoMeiResumo': createElement(),
    '#resDespesasMeiResumo': createElement(),
    '#resDasMensalMei': createElement(),
    '#resDasPeriodoMei': createElement(),
    '#resPercentualContribuicaoMei': createElement(),
    '#resLimiteAplicavelMei': createElement(),
    '#resComparacaoLimiteMei': createElement(),
    '#resSaldoMensalMei': createElement(),
    '#resSaldoPeriodoMei': createElement(),
    '#resBaseCalculoSaldoMei': createElement(),
    '#resPlanoAutonomo': createElement(),
    '#resBaseInssAutonomo': createElement(),
    '#resFaturamentoAutonomoResumo': createElement(),
    '#resDespesasAutonomoResumo': createElement(),
    '#resInssMensalAutonomo': createElement(),
    '#resInssPeriodoAutonomo': createElement(),
    '#resPercentualInssAutonomo': createElement(),
    '#resSaldoAntesIrpfMensalAutonomo': createElement(),
    '#resSaldoAntesIrpfPeriodoAutonomo': createElement(),
    '#resIrpfInformadoAutonomo': createElement(),
    '#blocoSaldoAposIrpfAutonomo': createElement({ hidden: true }),
    '#resEncargosTotaisAutonomo': createElement(),
    '#resPercentualTotalEncargosAutonomo': createElement(),
    '#resSaldoAposIrpfMensalAutonomo': createElement(),
    '#resSaldoAposIrpfPeriodoAutonomo': createElement(),
    '#resBaseCalculoSaldoAutonomo': createElement(),
    '#btnCopiarMeiAutonomo': createElement({ hidden: true }),
    '#btnCompartilharMeiAutonomo': createElement({ hidden: true }),
    '#btnImprimirMeiAutonomo': createElement({ hidden: true })
  };

  const form = createElement({
    reset() {
      elements['#faturamentoMensalMeiAutonomo'].value = '';
      elements['#despesasMensaisMeiAutonomo'].value = '';
      elements['#mesesAtividadeMeiAutonomo'].value = '12';
      elements['#tipoAtividadeMeiAutonomo'].value = 'servicos';
      elements['#dasMensalMei'].value = '86,05';
      elements['#planoInssAutonomo'].value = 'simplificado_11';
      elements['#baseContribuicaoAutonomo'].value = '1621,00';
      elements['#irpfCarneLeaoMensalAutonomo'].value = '';
    }
  });
  elements['#formMeiOuAutonomo'] = form;

  return {
    elements,
    root: {
      querySelector(selector) {
        return elements[selector] || null;
      }
    }
  };
}

describe('Ferramenta: Calculadora MEI ou Autônomo (mei-ou-autonomo)', () => {
  it('deve exportar parâmetros centralizados de 2026, fontes oficiais e funções contratuais', () => {
    assert.equal(ANO_REFERENCIA, 2026);
    assert.equal(PARAMETROS_REFERENCIA_2026.anoReferencia, 2026);
    assert.equal(PARAMETROS_REFERENCIA_2026.salarioMinimo, 1621.0);
    assert.equal(PARAMETROS_REFERENCIA_2026.tetoPrevidenciario, 8475.55);

    // Valores oficiais do DAS de referência 2026
    assert.equal(
      PARAMETROS_REFERENCIA_2026.mei.dasPorAtividade[TIPOS_ATIVIDADE.COMERCIO_INDUSTRIA],
      82.05
    );
    assert.equal(
      PARAMETROS_REFERENCIA_2026.mei.dasPorAtividade[TIPOS_ATIVIDADE.SERVICOS],
      86.05
    );
    assert.equal(
      PARAMETROS_REFERENCIA_2026.mei.dasPorAtividade[TIPOS_ATIVIDADE.COMERCIO_SERVICOS],
      87.05
    );
    assert.equal(PARAMETROS_REFERENCIA_2026.mei.limiteAnualGeral, 81000.0);
    assert.equal(PARAMETROS_REFERENCIA_2026.mei.limiteProporcionalMensal, 6750.0);

    // Parâmetros previdenciários de referência 2026
    assert.equal(PARAMETROS_REFERENCIA_2026.autonomo.contribuicaoSimplificadaMensal, 178.31);
    assert.equal(PARAMETROS_REFERENCIA_2026.autonomo.contribuicaoMinimaNormal, 324.2);
    assert.equal(PARAMETROS_REFERENCIA_2026.autonomo.contribuicaoMaximaNormal, 1695.11);

    // Fontes oficiais obrigatórias
    assert.equal(
      FONTES_OFICIAIS.perguntasFrequentesMei,
      'https://www.gov.br/empresas-e-negocios/pt-br/empreendedor/perguntas-frequentes'
    );
    assert.equal(
      FONTES_OFICIAIS.ocupacoesPermitidasMei,
      'https://www.gov.br/empresas-e-negocios/pt-br/empreendedor/quero-ser-mei/quais-as-ocupacoes-que-podem-ser-mei'
    );
    assert.equal(
      FONTES_OFICIAIS.valoresDasMei2026,
      'https://www8.receita.fazenda.gov.br/SIMPLESNACIONAL/noticias/NoticiaCompleta.aspx?id=c3b2044c-ff97-432a-b33c-ecf2a3df6dc3'
    );
    assert.equal(
      FONTES_OFICIAIS.tabelaContribuicaoInss,
      'https://www.gov.br/inss/pt-br/direitos-e-deveres/inscricao-e-contribuicao/tabela-de-contribuicao-mensal'
    );

    assert.equal(typeof parseFlexibleNumber, 'function');
    assert.equal(typeof normalizeInput, 'function');
    assert.equal(typeof validateInput, 'function');
    assert.equal(typeof calculate, 'function');
    assert.equal(typeof getResultSections, 'function');
    assert.equal(typeof formatResult, 'function');
    assert.equal(typeof buildCopyText, 'function');
    assert.equal(typeof setupTool, 'function');
  });

  it('deve distinguir agrupamento de milhares de casas decimais com ponto ou vírgula', () => {
    const expectedValues = [
      ['5.000', 5000],
      ['1.621', 1621],
      ['81.000', 81000],
      ['5.000,50', 5000.5],
      ['1.234,56', 1234.56],
      ['86.05', 86.05],
      ['86,05', 86.05],
      ['1.234.567', 1234567],
      ['1.234.567,89', 1234567.89],
      ['1,234,567', 1234567],
      ['1,234,567.89', 1234567.89]
    ];

    for (const [input, expected] of expectedValues) {
      assert.equal(parseFlexibleNumber(input), expected, `Entrada: ${input}`);
    }

    const calculation = calculate({
      faturamentoMensal: '5.000',
      despesasMensais: '1.621',
      mesesAtividade: '12',
      tipoAtividade: 'servicos'
    });
    assert.equal(calculation.ok, true);
    assert.equal(calculation.data.faturamentoMensal, 5000);
    assert.equal(calculation.data.despesasMensais, 1621);
  });

  it('preserva vazio, inválido, zero e negativos no contrato do parser e da calculadora', () => {
    assert.equal(parseFlexibleNumber(''), null);
    assert.equal(parseFlexibleNumber('   '), null);
    assert.equal(parseFlexibleNumber('0'), 0);
    assert.equal(parseFlexibleNumber('0,00'), 0);
    assert.ok(Number.isNaN(parseFlexibleNumber('inválido')));
    assert.ok(Number.isNaN(parseFlexibleNumber('1.2.3')));
    assert.equal(parseFlexibleNumber('-86,05'), -86.05);
    assert.equal(parseFlexibleNumber('-1.234,56'), -1234.56);

    const negativeCalculation = calculate({
      faturamentoMensal: '-5.000',
      despesasMensais: '500',
      mesesAtividade: '12',
      tipoAtividade: 'servicos'
    });
    assert.equal(negativeCalculation.ok, false);
    assert.match(negativeCalculation.errors.join(' '), /não pode ser negativo/i);
  });

  it('rejeita agrupamentos mistos malformados', () => {
    const malformedValues = [
      '1.2.3,45',
      '12.34,56',
      '1.2345,67',
      '1,2,3.45',
      '12,34.56'
    ];

    for (const input of malformedValues) {
      assert.ok(Number.isNaN(parseFlexibleNumber(input)), `Entrada inválida aceita: ${input}`);
    }
  });

  it('deve calcular corretamente os cenários mensal e anual com valores oficiais de DAS 2026 e plano de 11%', () => {
    // Serviços: Faturamento R$ 5.000/mês, Despesas R$ 1.000/mês, 12 meses
    // MEI (DAS R$ 86,05):
    //   Faturamento período = R$ 60.000,00 | Despesas período = R$ 12.000,00
    //   DAS período = 12 * 86,05 = R$ 1.032,60 (1,72% do faturamento)
    //   Saldo mensal MEI = 5000 - 1000 - 86,05 = R$ 3.913,95
    //   Saldo anual MEI = 60000 - 12000 - 1032,60 = R$ 46.967,40
    // Autônomo (Plano 11% -> R$ 178,31/mês, sem IRPF informado):
    //   INSS período = 12 * 178,31 = R$ 2.139,72 (3,57% do faturamento)
    //   Saldo mensal antes IRPF = 5000 - 1000 - 178,31 = R$ 3.821,69
    //   Saldo anual antes IRPF = 60000 - 12000 - 2139,72 = R$ 45.860,28
    //   Diferença anual = 46967,40 - 45860,28 = R$ 1.107,12 (R$ 92,26/mês)
    const servicos = calculate({
      faturamentoMensal: '5000',
      despesasMensais: '1000',
      mesesAtividade: '12',
      tipoAtividade: 'servicos',
      planoAutonomo: 'simplificado_11'
    });

    assert.equal(servicos.ok, true);
    assert.equal(servicos.data.faturamentoMensal, 5000);
    assert.equal(servicos.data.faturamentoProjetado, 60000);
    assert.equal(servicos.data.despesasMensais, 1000);
    assert.equal(servicos.data.despesasProjetadas, 12000);

    assert.equal(servicos.data.mei.dasMensal, 86.05);
    assert.equal(servicos.data.mei.dasProjetado, 1032.6);
    assert.equal(servicos.data.mei.saldoMensal, 3913.95);
    assert.equal(servicos.data.mei.saldoPeriodo, 46967.4);
    assert.equal(servicos.data.mei.percentualContribuicaoSobreFaturamento, 1.72);
    assert.equal(servicos.data.mei.ultrapassaLimitePeriodo, false);

    assert.equal(servicos.data.autonomo.inssMensal, 178.31);
    assert.equal(servicos.data.autonomo.inssProjetado, 2139.72);
    assert.equal(servicos.data.autonomo.percentualInssSobreFaturamento, 3.57);
    assert.equal(servicos.data.autonomo.saldoMensalAntesIrpf, 3821.69);
    assert.equal(servicos.data.autonomo.saldoPeriodoAntesIrpf, 45860.28);
    assert.equal(servicos.data.autonomo.irpfInformado, false);
    assert.equal(servicos.data.autonomo.irpfMensal, null);
    assert.equal(servicos.data.autonomo.saldoPeriodoAposIrpf, null);

    assert.equal(servicos.data.comparacao.diferencaSaldoMensal, 92.26);
    assert.equal(servicos.data.comparacao.diferencaSaldoPeriodo, 1107.12);

    // Comércio/Indústria (DAS R$ 82,05) -> 12 * 82,05 = R$ 984,60
    const comercio = calculate({
      faturamentoMensal: '5000',
      despesasMensais: '1000',
      mesesAtividade: '12',
      tipoAtividade: 'comercio_industria',
      planoAutonomo: 'simplificado_11'
    });
    assert.equal(comercio.ok, true);
    assert.equal(comercio.data.mei.dasMensal, 82.05);
    assert.equal(comercio.data.mei.dasProjetado, 984.6);
    assert.equal(comercio.data.mei.saldoPeriodo, 47015.4);

    // Comércio e Serviços (DAS R$ 87,05) -> 12 * 87,05 = R$ 1.044,60
    const ambos = calculate({
      faturamentoMensal: '5000',
      despesasMensais: '1000',
      mesesAtividade: '12',
      tipoAtividade: 'comercio_servicos',
      planoAutonomo: 'simplificado_11'
    });
    assert.equal(ambos.ok, true);
    assert.equal(ambos.data.mei.dasMensal, 87.05);
    assert.equal(ambos.data.mei.dasProjetado, 1044.6);
    assert.equal(ambos.data.mei.saldoPeriodo, 46955.4);

    // DAS customizado pelo usuário (ex.: R$ 95,00)
    const dasCustom = calculate({
      faturamentoMensal: '5000',
      despesasMensais: '1000',
      mesesAtividade: '10',
      tipoAtividade: 'servicos',
      dasMensal: '95,00',
      planoAutonomo: 'simplificado_11'
    });
    assert.equal(dasCustom.ok, true);
    assert.equal(dasCustom.data.mei.dasMensal, 95);
    assert.equal(dasCustom.data.mei.dasAlteradoPeloUsuario, true);
    assert.equal(dasCustom.data.mei.dasProjetado, 950);
  });

  it('deve calcular contribuições previdenciárias de 11% e 20%, respeitando piso (R$ 1.621,00) e teto (R$ 8.475,55)', () => {
    // 1. Plano de 20% exatamente no piso (R$ 1.621,00 -> INSS = R$ 324,20/mês)
    const noPiso = calculate({
      faturamentoMensal: '4000',
      despesasMensais: '500',
      mesesAtividade: '12',
      tipoAtividade: 'servicos',
      planoAutonomo: 'normal_20',
      baseContribuicao: '1621,00'
    });
    assert.equal(noPiso.ok, true);
    assert.equal(noPiso.data.autonomo.baseContribuicaoEfetiva, 1621.0);
    assert.equal(noPiso.data.autonomo.ajusteBaseInss, 'nenhum');
    assert.equal(noPiso.data.autonomo.inssMensal, 324.2);
    assert.equal(noPiso.data.autonomo.inssProjetado, 3890.4);

    // 2. Plano de 20% com base abaixo do salário mínimo (R$ 1.000,00 -> limitada ao piso R$ 1.621,00 -> R$ 324,20)
    const abaixoDoPiso = calculate({
      faturamentoMensal: '4000',
      despesasMensais: '500',
      mesesAtividade: '12',
      tipoAtividade: 'servicos',
      planoAutonomo: 'normal_20',
      baseContribuicao: '1000,00'
    });
    assert.equal(abaixoDoPiso.ok, true);
    assert.equal(abaixoDoPiso.data.autonomo.baseContribuicaoInformada, 1000.0);
    assert.equal(abaixoDoPiso.data.autonomo.baseContribuicaoEfetiva, 1621.0);
    assert.equal(abaixoDoPiso.data.autonomo.ajusteBaseInss, 'piso');
    assert.equal(abaixoDoPiso.data.autonomo.inssMensal, 324.2);

    // 3. Plano de 20% com base intermediária (R$ 5.000,00 -> INSS = R$ 1.000,00/mês)
    const intermediario = calculate({
      faturamentoMensal: '6500',
      despesasMensais: '1000',
      mesesAtividade: '6',
      tipoAtividade: 'servicos',
      planoAutonomo: 'normal_20',
      baseContribuicao: '5000,00'
    });
    assert.equal(intermediario.ok, true);
    assert.equal(intermediario.data.autonomo.baseContribuicaoEfetiva, 5000.0);
    assert.equal(intermediario.data.autonomo.ajusteBaseInss, 'nenhum');
    assert.equal(intermediario.data.autonomo.inssMensal, 1000.0);
    assert.equal(intermediario.data.autonomo.inssProjetado, 6000.0);

    // 4. Plano de 20% exatamente no teto previdenciário (R$ 8.475,55 -> INSS = R$ 1.695,11/mês)
    const noTeto = calculate({
      faturamentoMensal: '9000',
      despesasMensais: '1000',
      mesesAtividade: '12',
      tipoAtividade: 'servicos',
      planoAutonomo: 'normal_20',
      baseContribuicao: '8475,55'
    });
    assert.equal(noTeto.ok, true);
    assert.equal(noTeto.data.autonomo.baseContribuicaoEfetiva, 8475.55);
    assert.equal(noTeto.data.autonomo.ajusteBaseInss, 'nenhum');
    assert.equal(noTeto.data.autonomo.inssMensal, 1695.11);
    assert.equal(noTeto.data.autonomo.inssProjetado, 20341.32);

    // 5. Plano de 20% acima do teto previdenciário (R$ 15.000,00 -> limitada ao teto R$ 8.475,55 -> R$ 1.695,11/mês)
    const acimaDoTeto = calculate({
      faturamentoMensal: '15000',
      despesasMensais: '2000',
      mesesAtividade: '12',
      tipoAtividade: 'servicos',
      planoAutonomo: 'normal_20',
      baseContribuicao: '15000,00'
    });
    assert.equal(acimaDoTeto.ok, true);
    assert.equal(acimaDoTeto.data.autonomo.baseContribuicaoInformada, 15000.0);
    assert.equal(acimaDoTeto.data.autonomo.baseContribuicaoEfetiva, 8475.55);
    assert.equal(acimaDoTeto.data.autonomo.ajusteBaseInss, 'teto');
    assert.equal(acimaDoTeto.data.autonomo.inssMensal, 1695.11);
  });

  it('deve verificar o limite anual do MEI (R$ 81.000,00) e o limite proporcional por meses de atividade (R$ 6.750,00/mês)', () => {
    // 12 meses dentro do limite (12 * 6750 = R$ 81.000,00)
    const noLimiteAnual = calculate({
      faturamentoMensal: '6750',
      despesasMensais: '500',
      mesesAtividade: '12',
      tipoAtividade: 'servicos'
    });
    assert.equal(noLimiteAnual.ok, true);
    assert.equal(noLimiteAnual.data.mei.limiteAplicavelPeriodo, 81000);
    assert.equal(noLimiteAnual.data.faturamentoProjetado, 81000);
    assert.equal(noLimiteAnual.data.mei.ultrapassaLimitePeriodo, false);
    assert.equal(noLimiteAnual.data.mei.excedenteLimitePeriodo, 0);
    assert.equal(noLimiteAnual.data.mei.percentualLimiteUtilizado, 100);

    // 6 meses de atividade: limite proporcional = 6 * 6750 = R$ 40.500,00
    // Faturamento mensal R$ 7.500 -> Projetado = R$ 45.000,00 -> Ultrapassa em R$ 4.500,00
    const proporcionalAcima = calculate({
      faturamentoMensal: '7500',
      despesasMensais: '1000',
      mesesAtividade: '6',
      tipoAtividade: 'comercio_industria'
    });
    assert.equal(proporcionalAcima.ok, true);
    assert.equal(proporcionalAcima.data.mei.limiteAplicavelPeriodo, 40500);
    assert.equal(proporcionalAcima.data.faturamentoProjetado, 45000);
    assert.equal(proporcionalAcima.data.mei.ultrapassaLimitePeriodo, true);
    assert.equal(proporcionalAcima.data.mei.excedenteLimitePeriodo, 4500);
    assert.equal(proporcionalAcima.data.mei.percentualLimiteUtilizado, 111.11);
    assert.match(proporcionalAcima.data.mei.avisoLimite, /ultrapassa em R\$\s*4\.500,00/i);
    assert.match(
      proporcionalAcima.data.mei.avisoLimite,
      /não determina isoladamente sua aptidão ou inaptidão jurídica/i
    );
  });

  it('deve tratar corretamente o campo opcional de IRPF/Carnê-Leão vazio versus preenchido', () => {
    // Campo vazio: não trata IRPF como zero nem exibe saldo líquido após todos os tributos
    const semIrpf = calculate({
      faturamentoMensal: '6000',
      despesasMensais: '1000',
      mesesAtividade: '12',
      tipoAtividade: 'servicos',
      planoAutonomo: 'normal_20',
      baseContribuicao: '5000',
      irpfMensal: ''
    });
    assert.equal(semIrpf.ok, true);
    assert.equal(semIrpf.data.autonomo.irpfInformado, false);
    assert.equal(semIrpf.data.autonomo.irpfMensal, null);
    assert.equal(semIrpf.data.autonomo.irpfProjetado, null);
    assert.equal(semIrpf.data.autonomo.saldoMensalAposIrpf, null);
    assert.equal(semIrpf.data.autonomo.saldoPeriodoAposIrpf, null);
    assert.equal(semIrpf.data.autonomo.saldoMensalAntesIrpf, 4000); // 6000 - 1000 - 1000
    assert.equal(semIrpf.data.autonomo.saldoPeriodoAntesIrpf, 48000);
    assert.match(semIrpf.data.autonomo.baseCalculoSaldo, /imposto não é tratado como zero/i);

    // Campo preenchido com R$ 350,00/mês (R$ 4.200,00 no ano):
    // Saldo antes do IRPF = R$ 48.000,00 | Saldo após IRPF = 48000 - 4200 = R$ 43.800,00
    const comIrpf = calculate({
      faturamentoMensal: '6000',
      despesasMensais: '1000',
      mesesAtividade: '12',
      tipoAtividade: 'servicos',
      planoAutonomo: 'normal_20',
      baseContribuicao: '5000',
      irpfMensal: '350,00'
    });
    assert.equal(comIrpf.ok, true);
    assert.equal(comIrpf.data.autonomo.irpfInformado, true);
    assert.equal(comIrpf.data.autonomo.irpfMensal, 350);
    assert.equal(comIrpf.data.autonomo.irpfProjetado, 4200);
    assert.equal(comIrpf.data.autonomo.saldoMensalAntesIrpf, 4000);
    assert.equal(comIrpf.data.autonomo.saldoPeriodoAntesIrpf, 48000);
    assert.equal(comIrpf.data.autonomo.saldoMensalAposIrpf, 3650);
    assert.equal(comIrpf.data.autonomo.saldoPeriodoAposIrpf, 43800);
    assert.equal(comIrpf.data.autonomo.encargosPeriodo, 16200); // 12000 INSS + 4200 IRPF
    assert.equal(comIrpf.data.autonomo.percentualEncargosSobreFaturamento, 22.5); // 16200 / 72000
    assert.equal(
      comIrpf.data.comparacao.diferencaSaldoPeriodo,
      round2(comIrpf.data.mei.saldoPeriodo - 43800)
    );
  });

  it('deve aceitar faturamento zero e despesas zero sem divisão por zero e rejeitar campos vazios, negativos ou inválidos', () => {
    // Faturamento zero e despesas zero
    const faturamentoZero = calculate({
      faturamentoMensal: '0',
      despesasMensais: '0',
      mesesAtividade: '6',
      tipoAtividade: 'comercio_industria',
      planoAutonomo: 'simplificado_11'
    });
    assert.equal(faturamentoZero.ok, true);
    assert.equal(faturamentoZero.data.faturamentoProjetado, 0);
    assert.equal(faturamentoZero.data.despesasProjetadas, 0);
    assert.equal(faturamentoZero.data.mei.dasProjetado, 492.3);
    assert.equal(faturamentoZero.data.mei.saldoPeriodo, -492.3);
    assert.equal(faturamentoZero.data.mei.percentualContribuicaoSobreFaturamento, null);
    assert.equal(faturamentoZero.data.autonomo.percentualInssSobreFaturamento, null);
    const formattedZero = formatResult(faturamentoZero);
    assert.match(formattedZero.percentualContribuicaoMei, /Não aplicável/i);
    assert.match(formattedZero.percentualInssAutonomo, /Não aplicável/i);

    // Campos obrigatórios vazios
    assert.equal(
      calculate({ faturamentoMensal: '', despesasMensais: '500', mesesAtividade: '12' }).ok,
      false
    );
    assert.equal(
      calculate({ faturamentoMensal: '5000', despesasMensais: '', mesesAtividade: '12' }).ok,
      false
    );
    assert.equal(
      calculate({ faturamentoMensal: '5000', despesasMensais: '500', mesesAtividade: '' }).ok,
      false
    );
    assert.equal(
      calculate({
        faturamentoMensal: '5000',
        despesasMensais: '500',
        mesesAtividade: '12',
        dasMensal: ''
      }).ok,
      false
    );

    // Valores negativos e inválidos
    assert.equal(
      calculate({ faturamentoMensal: '-100', despesasMensais: '500', mesesAtividade: '12' }).ok,
      false
    );
    assert.equal(
      calculate({ faturamentoMensal: '5000', despesasMensais: '-50', mesesAtividade: '12' }).ok,
      false
    );
    assert.equal(
      calculate({ faturamentoMensal: 'abc', despesasMensais: '500', mesesAtividade: '12' }).ok,
      false
    );
    assert.equal(
      calculate({ faturamentoMensal: '5000', despesasMensais: '500', mesesAtividade: '0' }).ok,
      false
    );
    assert.equal(
      calculate({ faturamentoMensal: '5000', despesasMensais: '500', mesesAtividade: '13' }).ok,
      false
    );
    assert.equal(
      calculate({ faturamentoMensal: '5000', despesasMensais: '500', mesesAtividade: '6.5' }).ok,
      false
    );
    assert.equal(
      calculate({
        faturamentoMensal: '5000',
        despesasMensais: '500',
        mesesAtividade: '12',
        dasMensal: '-10'
      }).ok,
      false
    );
    assert.equal(
      calculate({
        faturamentoMensal: '5000',
        despesasMensais: '500',
        mesesAtividade: '12',
        dasMensal: '0'
      }).ok,
      false
    );
    assert.equal(
      calculate({
        faturamentoMensal: '5000',
        despesasMensais: '500',
        mesesAtividade: '12',
        planoAutonomo: 'normal_20',
        baseContribuicao: '-500'
      }).ok,
      false
    );
    assert.equal(
      calculate({
        faturamentoMensal: '5000',
        despesasMensais: '500',
        mesesAtividade: '12',
        planoAutonomo: 'normal_20',
        baseContribuicao: ''
      }).ok,
      false
    );
    assert.equal(
      calculate({
        faturamentoMensal: '5000',
        despesasMensais: '500',
        mesesAtividade: '12',
        irpfMensal: '-25'
      }).ok,
      false
    );
    assert.equal(
      calculate({
        faturamentoMensal: '5000',
        despesasMensais: '500',
        mesesAtividade: '12',
        irpfMensal: 'invalido'
      }).ok,
      false
    );
  });

  it('deve limpar os campos, restaurar apenas sugestões de preenchimento e recalcular após alterações via setupTool', async () => {
    const { root, elements } = createFakeDom();
    let ajudaTextValue = elements['#ajudaBaseContribuicaoAutonomo'].textContent;
    let ajudaWriteCount = 0;
    Object.defineProperty(elements['#ajudaBaseContribuicaoAutonomo'], 'textContent', {
      configurable: true,
      get() {
        return ajudaTextValue;
      },
      set(nextVal) {
        ajudaWriteCount += 1;
        ajudaTextValue = nextVal;
      }
    });

    setupTool(root);

    assert.equal(elements['#planoInssAutonomo'].value, 'simplificado_11');
    assert.equal(elements['#baseContribuicaoAutonomo'].disabled, true);
    assert.match(elements['#ajudaBaseContribuicaoAutonomo'].textContent, /não é utilizado no cálculo/i);
    // RP-3: Não reescreve o texto da região aria-live na inicialização quando já corresponde ao estado atual
    assert.equal(ajudaWriteCount, 0);

    // 1. Primeiro cálculo (Serviços, 12 meses, R$ 5.000 faturamento, R$ 800 despesas, 11% INSS, sem IRPF)
    await elements['#formMeiOuAutonomo'].trigger('submit');
    assert.equal(elements['#erroMeiOuAutonomo'].hidden, true);
    assert.equal(elements['#resultadoMeiAutonomo'].hidden, false);
    assert.equal(elements['#blocoSaldoAposIrpfAutonomo'].hidden, true);
    assert.match(elements['#resSaldoPeriodoMei'].textContent, /49\.367,40/);
    assert.match(elements['#resSaldoAntesIrpfPeriodoAutonomo'].textContent, /48\.260,28/);
    assert.equal(elements['#btnCopiarMeiAutonomo'].hidden, false);
    assert.equal(elements['#btnCompartilharMeiAutonomo'].hidden, false);
    assert.equal(elements['#btnImprimirMeiAutonomo'].hidden, false);

    // 2. Alterar tipo de atividade atualiza sugestão do DAS para 2026 e invalida resultado anterior
    elements['#tipoAtividadeMeiAutonomo'].value = 'comercio_industria';
    await elements['#tipoAtividadeMeiAutonomo'].trigger('change');
    assert.equal(elements['#dasMensalMei'].value, '82,05');
    assert.equal(elements['#resultadoMeiAutonomo'].hidden, true);

    // Recalcular antes de trocar o plano para confirmar que a troca de plano invalida por si só (RP-1)
    await elements['#formMeiOuAutonomo'].trigger('submit');
    assert.equal(elements['#resultadoMeiAutonomo'].hidden, false);

    // 3. Preencher IRPF opcional e plano de 20% e recalcular (RP-1: sem disparar change manual no form)
    elements['#planoInssAutonomo'].value = 'normal_20';
    await elements['#planoInssAutonomo'].trigger('change');
    assert.equal(elements['#baseContribuicaoAutonomo'].disabled, false);
    assert.match(elements['#ajudaBaseContribuicaoAutonomo'].textContent, /valor personalizado.*utilizado no cálculo/i);
    assert.equal(ajudaWriteCount, 1);
    assert.equal(elements['#resultadoMeiAutonomo'].hidden, true);
    elements['#baseContribuicaoAutonomo'].value = '3000,00';
    elements['#irpfCarneLeaoMensalAutonomo'].value = '200,00';
    await elements['#formMeiOuAutonomo'].trigger('submit');
    assert.equal(elements['#resultadoMeiAutonomo'].hidden, false);
    assert.equal(elements['#blocoSaldoAposIrpfAutonomo'].hidden, false);
    assert.match(elements['#resInssMensalAutonomo'].textContent, /600,00/);
    assert.match(elements['#resSaldoAposIrpfPeriodoAutonomo'].textContent, /40\.800,00/);

    // 4. Voltar a 11% preserva a base personalizada, invalida resultado diretamente e não aplica a base no cálculo
    elements['#planoInssAutonomo'].value = 'simplificado_11';
    await elements['#planoInssAutonomo'].trigger('change');
    assert.equal(elements['#baseContribuicaoAutonomo'].disabled, true);
    assert.equal(elements['#baseContribuicaoAutonomo'].value, '3000,00');
    assert.match(elements['#ajudaBaseContribuicaoAutonomo'].textContent, /não é utilizado no cálculo/i);
    assert.equal(ajudaWriteCount, 2);
    assert.equal(elements['#resultadoMeiAutonomo'].hidden, true);
    await elements['#formMeiOuAutonomo'].trigger('submit');
    assert.match(elements['#resInssMensalAutonomo'].textContent, /178,31/);
    assert.match(elements['#resBaseInssAutonomo'].textContent, /1\.621,00/);

    // RP-3: Limpar quando já está em 11% não reescreve desnecessariamente a região aria-live
    await elements['#btnLimparMeiAutonomo'].trigger('click');
    assert.equal(ajudaWriteCount, 2);
    elements['#faturamentoMensalMeiAutonomo'].value = '5000,00';
    elements['#despesasMensaisMeiAutonomo'].value = '800,00';
    elements['#tipoAtividadeMeiAutonomo'].value = 'comercio_industria';
    await elements['#tipoAtividadeMeiAutonomo'].trigger('change');
    elements['#baseContribuicaoAutonomo'].value = '3000,00';
    elements['#irpfCarneLeaoMensalAutonomo'].value = '200,00';
    await elements['#formMeiOuAutonomo'].trigger('submit');
    assert.equal(elements['#resultadoMeiAutonomo'].hidden, false);

    // 5. Retornar a 20% reabilita o campo, invalida resultado diretamente e reaproveita o valor personalizado
    elements['#planoInssAutonomo'].value = 'normal_20';
    await elements['#planoInssAutonomo'].trigger('change');
    assert.equal(elements['#baseContribuicaoAutonomo'].disabled, false);
    assert.equal(elements['#baseContribuicaoAutonomo'].value, '3000,00');
    assert.equal(ajudaWriteCount, 3);
    assert.equal(elements['#resultadoMeiAutonomo'].hidden, true);
    await elements['#formMeiOuAutonomo'].trigger('submit');
    assert.match(elements['#resInssMensalAutonomo'].textContent, /600,00/);

    // RP-1: Evento change borbulhado a partir de selectPlanoAutonomo ou selectTipoAtividade no form é ignorado para evitar dupla invalidação
    assert.equal(elements['#resultadoMeiAutonomo'].hidden, false);
    await elements['#formMeiOuAutonomo'].trigger('change', {
      target: elements['#planoInssAutonomo']
    });
    assert.equal(elements['#resultadoMeiAutonomo'].hidden, false);

    // 6. Botão "Limpar campos" a partir de 20% restaura padrões sugeridos, atualiza estado e oculta resultados antigos
    await elements['#btnLimparMeiAutonomo'].trigger('click');
    assert.equal(elements['#faturamentoMensalMeiAutonomo'].value, '');
    assert.equal(elements['#despesasMensaisMeiAutonomo'].value, '');
    assert.equal(elements['#irpfCarneLeaoMensalAutonomo'].value, '');
    assert.equal(elements['#mesesAtividadeMeiAutonomo'].value, String(DEFAULTS.mesesAtividade));
    assert.equal(elements['#tipoAtividadeMeiAutonomo'].value, DEFAULTS.tipoAtividade);
    assert.equal(elements['#dasMensalMei'].value, '86,05');
    assert.equal(elements['#planoInssAutonomo'].value, DEFAULTS.planoAutonomo);
    assert.equal(elements['#baseContribuicaoAutonomo'].value, '1621,00');
    assert.equal(elements['#baseContribuicaoAutonomo'].disabled, true);
    assert.match(elements['#ajudaBaseContribuicaoAutonomo'].textContent, /não é utilizado no cálculo/i);
    assert.equal(ajudaWriteCount, 4);
    assert.equal(elements['#resultadoMeiAutonomo'].hidden, true);
    assert.equal(elements['#blocoSaldoAposIrpfAutonomo'].hidden, true);
    assert.equal(elements['#btnCopiarMeiAutonomo'].hidden, true);
    assert.equal(elements['#btnCompartilharMeiAutonomo'].hidden, true);
    assert.equal(elements['#btnImprimirMeiAutonomo'].hidden, true);
  });

  it('deve executar botões de copiar, compartilhar, imprimir e favoritar corretamente', async () => {
    const { root, elements } = createFakeDom();
    const originalWindow = globalThis.window;
    const originalNavigator = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
    let copiedText = null;
    let sharedPayload = null;
    let printCalls = 0;

    try {
      const storageMap = new Map([[STORAGE_KEY, JSON.stringify(['juros'])]]);
      globalThis.window = {
        location: {
          origin: 'https://www.calculadoramaster.com',
          href: 'https://www.calculadoramaster.com/tools/financas/mei-ou-autonomo.html'
        },
        localStorage: {
          getItem: (k) => (storageMap.has(k) ? storageMap.get(k) : null),
          setItem: (k, v) => storageMap.set(k, String(v)),
          removeItem: (k) => storageMap.delete(k)
        },
        print() {
          printCalls += 1;
        }
      };

      setupTool(root);
      await elements['#formMeiOuAutonomo'].trigger('submit');

      // 1. Copiar resultado
      Object.defineProperty(globalThis, 'navigator', {
        configurable: true,
        value: {
          clipboard: {
            writeText: async (text) => {
              copiedText = text;
            }
          }
        }
      });
      await elements['#btnCopiarMeiAutonomo'].trigger('click');
      assert.match(copiedText, /Calculadora MEI ou Autônomo — Calculadora Master/);
      assert.match(copiedText, /Cenário A — MEI/);
      assert.match(copiedText, /Cenário B — Autônomo Pessoa Física/);
      assert.equal(elements['#statusMeiAutonomo'].textContent, 'Resultado copiado.');

      // 2. Compartilhar resultado
      Object.defineProperty(globalThis, 'navigator', {
        configurable: true,
        value: {
          share: async (payload) => {
            sharedPayload = payload;
          }
        }
      });
      await elements['#btnCompartilharMeiAutonomo'].trigger('click');
      assert.equal(sharedPayload.title, 'Calculadora MEI ou Autônomo — Calculadora Master');
      assert.equal(
        sharedPayload.url,
        'https://www.calculadoramaster.com/tools/financas/mei-ou-autonomo.html'
      );
      assert.equal(elements['#statusMeiAutonomo'].textContent, 'Resultado compartilhado.');

      // 3. Imprimir resultado
      await elements['#btnImprimirMeiAutonomo'].trigger('click');
      assert.equal(printCalls, 1);

      // 4. Favoritar e desfavoritar
      _resetMemoryForTesting();
      assert.ok(VALID_TOOL_IDS.has('mei-ou-autonomo'));
      assert.equal(addFavorite('mei-ou-autonomo'), true);
      assert.equal(isFavorite('mei-ou-autonomo'), true);
      assert.deepEqual(getFavorites(), ['juros', 'mei-ou-autonomo']);
      assert.equal(removeFavorite('mei-ou-autonomo'), true);
      assert.equal(isFavorite('mei-ou-autonomo'), false);
    } finally {
      if (originalWindow === undefined) delete globalThis.window;
      else globalThis.window = originalWindow;
      if (originalNavigator) Object.defineProperty(globalThis, 'navigator', originalNavigator);
      else delete globalThis.navigator;
      _resetMemoryForTesting();
    }
  });

  it('deve conter links oficiais, metadados, presença no catálogo e estrutura HTML sem estilos inline', () => {
    const html = fs.readFileSync(PAGE_PATH, 'utf8');
    const tools = JSON.parse(fs.readFileSync(TOOLS_JSON_PATH, 'utf8'));

    // Catálogo data/tools.json
    const entry = tools.find((t) => t.id === 'mei-ou-autonomo');
    assert.ok(entry, 'Ferramenta mei-ou-autonomo deve estar em data/tools.json');
    assert.equal(entry.slug, 'mei-ou-autonomo');
    assert.equal(entry.name, 'Calculadora MEI ou Autônomo');
    assert.equal(entry.category, 'Financeiro');
    assert.equal(entry.categorySlug, 'financas');
    assert.equal(entry.url, '/tools/financas/mei-ou-autonomo.html');
    assert.equal(entry.status, 'published');
    assert.equal(entry.formulaStatus, 'verified');
    assert.equal(entry.implementation, 'factory');

    // Metadados e estrutura HTML
    assert.match(html, /canonical: https:\/\/www\.calculadoramaster\.com\/tools\/financas\/mei-ou-autonomo\.html/);
    assert.match(html, /<h1>Calculadora MEI ou Autônomo<\/h1>/);
    assert.match(html, /id="formMeiOuAutonomo"/);
    assert.match(html, /id="resultadoMeiAutonomo"/);
    assert.match(html, /id="descricaoBaseContribuicaoAutonomo"[^>]*>Base mensal considerada no plano normal de 20%/);
    assert.match(html, /id="ajudaBaseContribuicaoAutonomo" aria-live="polite" aria-atomic="true"/);
    assert.match(html, /<option value="simplificado_11" selected>/);
    assert.match(html, /id="ajudaBaseContribuicaoAutonomo"[^>]*>No plano simplificado de 11%[\s\S]*?não é utilizado no cálculo/);
    assert.match(html, /id="baseContribuicaoAutonomo"[\s\S]*?disabled[\s\S]*?aria-describedby="descricaoBaseContribuicaoAutonomo"/);
    assert.doesNotMatch(html, /aria-describedby="[^"]*ajudaBaseContribuicaoAutonomo[^"]*"/);
    assert.doesNotMatch(html, /style="/);

    // 4 links oficiais obrigatórios na página
    assert.ok(html.includes(FONTES_OFICIAIS.perguntasFrequentesMei));
    assert.ok(html.includes(FONTES_OFICIAIS.ocupacoesPermitidasMei));
    assert.ok(html.includes(FONTES_OFICIAIS.valoresDasMei2026));
    assert.ok(html.includes(FONTES_OFICIAIS.tabelaContribuicaoInss));
  });
});

function round2(n) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}
