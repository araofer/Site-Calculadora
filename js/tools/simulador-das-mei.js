/**
 * Simulador de DAS do MEI — Calculadora Master
 *
 * Módulo puro e desacoplado para cálculo oficial da guia mensal DAS-MEI
 * (Documento de Arrecadação do Simples Nacional do Microempreendedor Individual).
 *
 * Bases Legais e Normativas Oficiais:
 * - Lei Complementar nº 123/2006, art. 18-A, § 3º, inciso I (Redação dada pelas LC 128/2008, 139/2011 e 155/2016);
 * - Lei Complementar nº 188/2021 (MEI Caminhoneiro / Transportador Autônomo de Cargas);
 * - Lei nº 8.212/1991, art. 21, § 2º, inciso II, alínea 'a' (5% do Salário Mínimo);
 * - Decretos Federais de fixação do Salário Mínimo Nacional (2024: Decreto 11.864/2023; 2025: Decreto 12.339/2024; 2026: Decreto 12.797/2025);
 * - Notícia Oficial Receita Federal / Simples Nacional (Valores DAS-MEI 2026): https://www8.receita.fazenda.gov.br/SIMPLESNACIONAL/noticias/NoticiaCompleta.aspx?id=c3b2044c-ff97-432a-b33c-ecf2a3df6dc3
 */

import { createResultActions } from '../core/result-actions.js';

export const TABELA_PARAMETROS_ANO = Object.freeze({
  2026: {
    ano: 2026,
    salarioMinimoCentavos: 162100, // R$ 1.621,00
    aliquotaInssComum: 0.05,       // 5% (R$ 81,05)
    aliquotaInssCaminhoneiro: 0.12,// 12% (R$ 194,52)
    icmsCentavos: 100,             // R$ 1,00
    issCentavos: 500,              // R$ 5,00
    baseLegal: 'Decreto Federal nº 12.797, de 23 de dezembro de 2025'
  },
  2025: {
    ano: 2025,
    salarioMinimoCentavos: 151800, // R$ 1.518,00
    aliquotaInssComum: 0.05,       // 5% (R$ 75,90)
    aliquotaInssCaminhoneiro: 0.12,// 12% (R$ 182,16)
    icmsCentavos: 100,             // R$ 1,00
    issCentavos: 500,              // R$ 5,00
    baseLegal: 'Decreto Federal nº 12.339, de 30 de dezembro de 2024'
  },
  2024: {
    ano: 2024,
    salarioMinimoCentavos: 141200, // R$ 1.412,00
    aliquotaInssComum: 0.05,       // 5% (R$ 70,60)
    aliquotaInssCaminhoneiro: 0.12,// 12% (R$ 169,44)
    icmsCentavos: 100,             // R$ 1,00
    issCentavos: 500,              // R$ 5,00
    baseLegal: 'Decreto Federal nº 11.864, de 27 de dezembro de 2023'
  }
});

export const TIPOS_ATIVIDADE = Object.freeze({
  comercio_industria: {
    id: 'comercio_industria',
    nome: 'Comércio ou Indústria (ICMS)',
    categoria: 'MEI Padrão',
    tipoMei: 'geral',
    pagaIcms: true,
    pagaIss: false,
    descricao: 'Venda de mercadorias, fabricação artesanal ou produtos manufaturados.'
  },
  servicos: {
    id: 'servicos',
    nome: 'Prestação de Serviços (ISS)',
    categoria: 'MEI Padrão',
    tipoMei: 'geral',
    pagaIcms: false,
    pagaIss: true,
    descricao: 'Prestação de serviços em geral (beleza, reparos, desenvolvimento, consultoria permitida, etc.).'
  },
  comercio_servicos: {
    id: 'comercio_servicos',
    nome: 'Comércio e Serviços (ICMS e ISS)',
    categoria: 'MEI Padrão',
    tipoMei: 'geral',
    pagaIcms: true,
    pagaIss: true,
    descricao: 'Atividades conjuntas com fornecimento de mercadorias e prestação de serviços.'
  },
  caminhoneiro_cargas: {
    id: 'caminhoneiro_cargas',
    nome: 'MEI Caminhoneiro — Transporte Intermunicipal/Interestadual (ICMS)',
    categoria: 'MEI Caminhoneiro',
    tipoMei: 'caminhoneiro',
    pagaIcms: true,
    pagaIss: false,
    descricao: 'Transportador Autônomo de Cargas com rotas entre diferentes municípios ou estados (LC 188/2021).'
  },
  caminhoneiro_municipal: {
    id: 'caminhoneiro_municipal',
    nome: 'MEI Caminhoneiro — Transporte Municipal (ISS)',
    categoria: 'MEI Caminhoneiro',
    tipoMei: 'caminhoneiro',
    pagaIcms: false,
    pagaIss: true,
    descricao: 'Transportador Autônomo de Cargas com operação estritamente dentro do mesmo município.'
  },
  caminhoneiro_misto: {
    id: 'caminhoneiro_misto',
    nome: 'MEI Caminhoneiro — Transporte Misto (ICMS e ISS)',
    categoria: 'MEI Caminhoneiro',
    tipoMei: 'caminhoneiro',
    pagaIcms: true,
    pagaIss: true,
    descricao: 'Transportador Autônomo de Cargas atuando em fretes municipais e intermunicipais/interestaduais.'
  }
});

/* ==========================================================================
 * Utilitários de Formatação
 * ========================================================================== */

/**
 * Formata um valor numérico em reais (ex: 82.05 -> "R$ 82,05")
 * @param {number} valorEmReais
 * @returns {string}
 */
export function formatCurrency(valorEmReais) {
  if (typeof valorEmReais !== 'number' || !Number.isFinite(valorEmReais)) {
    return 'R$ 0,00';
  }
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(valorEmReais);
}

/**
 * Converte valor em reais ou texto em centavos inteiros
 * @param {string|number} raw
 * @returns {number}
 */
export function parseMoneyToCents(raw) {
  if (raw === null || raw === undefined) return 0;
  if (typeof raw === 'number') {
    if (!Number.isFinite(raw)) return NaN;
    return Math.round(raw * 100);
  }
  const str = String(raw).trim();
  if (str === '') return 0;
  const cleaned = str.replace(/[^\d,-]/g, '').replace(',', '.');
  const num = parseFloat(cleaned);
  if (!Number.isFinite(num)) return NaN;
  return Math.round(num * 100);
}

/* ==========================================================================
 * Motor de Cálculo Puro: DAS-MEI
 * ========================================================================== */

/**
 * Realiza o cálculo exato do Documento de Arrecadação do Simples Nacional (DAS)
 * para o Microempreendedor Individual.
 *
 * @param {Object} params
 * @param {number|string} params.ano Ano de referência (2026, 2025, 2024)
 * @param {string} params.atividade Identificador da atividade (chave de TIPOS_ATIVIDADE)
 * @param {number} [params.mesesPersonalizados=12] Quantidade de meses para projeção anual (1 a 12)
 * @returns {Object} Resultado detalhado do cálculo ou falha com erro
 */
export function calculateDasMei({ ano, atividade, mesesPersonalizados = 12 } = {}) {
  const anoNum = Number(ano);
  if (!TABELA_PARAMETROS_ANO[anoNum]) {
    return {
      ok: false,
      error: `Ano de referência inválido ou não suportado (${ano}). Escolha entre 2024, 2025 e 2026.`
    };
  }

  const atividadeObj = TIPOS_ATIVIDADE[atividade];
  if (!atividadeObj) {
    return {
      ok: false,
      error: 'Selecione uma atividade econômica válida para o MEI.'
    };
  }

  const meses = Number(mesesPersonalizados);
  if (!Number.isInteger(meses) || meses < 1 || meses > 12) {
    return {
      ok: false,
      error: 'A quantidade de meses para a estimativa anual deve ser um número inteiro entre 1 e 12.'
    };
  }

  const paramsAno = TABELA_PARAMETROS_ANO[anoNum];
  const isCaminhoneiro = atividadeObj.tipoMei === 'caminhoneiro';

  // Alíquota INSS: 5% (comum) ou 12% (MEI Caminhoneiro)
  const aliquotaInss = isCaminhoneiro ? paramsAno.aliquotaInssCaminhoneiro : paramsAno.aliquotaInssComum;
  const percentualInss = isCaminhoneiro ? 12 : 5;

  // INSS em centavos (arredondamento bancário/comercial exato)
  const inssCentavos = Math.round(paramsAno.salarioMinimoCentavos * aliquotaInss);

  // Tributos Estaduais e Municipais fixos por Lei Complementar
  const icmsCentavos = atividadeObj.pagaIcms ? paramsAno.icmsCentavos : 0;
  const issCentavos = atividadeObj.pagaIss ? paramsAno.issCentavos : 0;

  // Total mensal
  const totalMensalCentavos = inssCentavos + icmsCentavos + issCentavos;

  // Projeção Anual
  const totalAnualCentavos = totalMensalCentavos * meses;

  // Memória de cálculo detalhada
  const memoriaCalculo = [
    `Ano-base ${anoNum}: Salário Mínimo Nacional de referência fixado em ${formatCurrency(paramsAno.salarioMinimoCentavos / 100)} (${paramsAno.baseLegal}).`,
    `Contribuição Previdenciária (INSS): ${percentualInss}% sobre o salário mínimo = ${formatCurrency(inssCentavos / 100)} por mês.`,
    atividadeObj.pagaIcms
      ? `Imposto Estadual (ICMS): R$ 1,00 fixo ao mês incidente sobre a atividade de comércio, indústria ou transporte intermunicipal/interestadual.`
      : `Imposto Estadual (ICMS): Isento (R$ 0,00) para a atividade selecionada.`,
    atividadeObj.pagaIss
      ? `Imposto Municipal (ISS): R$ 5,00 fixo ao mês incidente sobre a prestação de serviços ou transporte estritamente municipal.`
      : `Imposto Municipal (ISS): Isento (R$ 0,00) para a atividade selecionada.`,
    `Composição mensal do DAS: ${formatCurrency(inssCentavos / 100)} (INSS) + ${formatCurrency(icmsCentavos / 100)} (ICMS) + ${formatCurrency(issCentavos / 100)} (ISS) = ${formatCurrency(totalMensalCentavos / 100)}.`,
    `Estimativa anual (${meses} meses): ${meses} × ${formatCurrency(totalMensalCentavos / 100)} = ${formatCurrency(totalAnualCentavos / 100)}.`
  ];

  // Avisos educativos e limitações legais
  const avisos = [
    'Vencimento: O DAS vence todo dia 20 de cada mês (ou primeiro dia útil seguinte caso o dia 20 recaia em fim de semana ou feriado nacional).',
    'Competência: A guia emitida refere-se sempre à competência do mês anterior (ex: a competência janeiro vence em 20 de fevereiro).',
    'Emissão Oficial Obrigatória: Esta ferramenta realiza uma simulação didática e transparente. A emissão real do boleto ou código Pix com código de barras deve ser feita exclusivamente via Portal do Empreendedor / PGMEI ou aplicativo MEI oficial da Receita Federal.',
    'Pagamento em atraso: Pagamentos após o vencimento sofrem acréscimo de multa de mora (0,33% por dia de atraso, limitada a 20%) mais juros pela taxa SELIC acumulada. A calculadora simula o valor nominal regular.',
    'Contratação de empregado: Se o MEI possuir 1 funcionário registrado, haverá o recolhimento adicional de 3% a título de encargo previdenciário patronal sobre o salário do empregado, recolhido em guia própria do FGTS Digital / eSocial.'
  ];

  if (isCaminhoneiro) {
    avisos.unshift('MEI Caminhoneiro: Atividade enquadrada nas regras especiais da LC nº 188/2021, que estabelece alíquota previdenciária de 12% do salário mínimo em troca de limite ampliado de faturamento anual.');
  }

  return {
    ok: true,
    data: {
      ano: anoNum,
      salarioMinimoCentavos: paramsAno.salarioMinimoCentavos,
      salarioMinimo: paramsAno.salarioMinimoCentavos / 100,
      tipoMei: atividadeObj.tipoMei,
      categoriaNome: atividadeObj.categoria,
      atividadeId: atividadeObj.id,
      atividadeNome: atividadeObj.nome,
      aliquotaInssPercentual: percentualInss,
      inssCentavos,
      inss: inssCentavos / 100,
      icmsCentavos,
      icms: icmsCentavos / 100,
      issCentavos,
      iss: issCentavos / 100,
      totalMensalCentavos,
      totalMensal: totalMensalCentavos / 100,
      mesesConsiderados: meses,
      totalAnualCentavos,
      totalAnual: totalAnualCentavos / 100,
      vencimentoRegra: 'Dia 20 de cada mês (ou primeiro dia útil subsequente)',
      baseLegal: paramsAno.baseLegal,
      memoriaCalculo,
      avisos
    }
  };
}

/* ==========================================================================
 * Formatação e Compartilhamento de Resultados
 * ========================================================================== */

/**
 * Constrói texto limpo para cópia do resultado da simulação
 * @param {Object} resultado Retorno de calculateDasMei
 * @returns {string}
 */
export function buildCopyText(resultado) {
  if (!resultado || !resultado.ok || !resultado.data) {
    return 'Simulação de DAS do MEI — Calculadora Master';
  }
  const d = resultado.data;
  const linhas = [
    '=== SIMULADOR DE DAS DO MEI — CALCULADORA MASTER ===',
    `Ano de Referência: ${d.ano}`,
    `Modalidade: ${d.categoriaNome} — ${d.atividadeNome}`,
    `Salário Mínimo Base: ${formatCurrency(d.salarioMinimo)}`,
    '----------------------------------------',
    `INSS Previdência (${d.aliquotaInssPercentual}%): ${formatCurrency(d.inss)}`,
    `ICMS (Estado): ${formatCurrency(d.icms)}`,
    `ISS (Município): ${formatCurrency(d.iss)}`,
    '----------------------------------------',
    `VALOR MENSAL DO DAS: ${formatCurrency(d.totalMensal)}`,
    `Estimativa para ${d.mesesConsiderados} meses: ${formatCurrency(d.totalAnual)}`,
    '----------------------------------------',
    'Vencimento: Todo dia 20 do mês seguinte.',
    'Emissão oficial: Portal do Empreendedor / PGMEI (Receita Federal).',
    'Simulado em: https://www.calculadoramaster.com/tools/financas/simulador-das-mei.html'
  ];
  return linhas.join('\n');
}

/**
 * Formata o resultado do cálculo para exibição textual estruturada
 * @param {Object} resultado
 * @returns {string}
 */
export function formatResult(resultado) {
  return buildCopyText(resultado);
}

/* ==========================================================================
 * Conexão com a Interface (DOM / Factory)
 * ========================================================================== */

/**
 * Inicializa a calculadora na página
 * @param {Object} [options]
 * @returns {Object} Controlador com métodos para testes e automação
 */
export function setupTool(options = {}) {
  const form = document.getElementById('formDasMei');
  const selectAno = document.getElementById('anoReferencia');
  const selectAtividade = document.getElementById('atividadeEconomica');
  const selectMeses = document.getElementById('mesesProjecao');
  const btnCalcular = document.getElementById('btnCalcular');
  const btnLimpar = document.getElementById('btnLimpar');

  const resultadoSecao = document.getElementById('resultadoSecao');
  const valorTotalMensal = document.getElementById('resultadoTotalMensal');
  const valorInss = document.getElementById('resultadoInss');
  const valorIcms = document.getElementById('resultadoIcms');
  const valorIss = document.getElementById('resultadoIss');
  const valorTotalAnual = document.getElementById('resultadoTotalAnual');
  const rotuloTotalAnual = document.getElementById('rotuloTotalAnual');
  const listaMemoria = document.getElementById('listaMemoriaCalculo');
  const painelAvisos = document.getElementById('painelAvisos');
  const painelErros = document.getElementById('painelErros');
  const actionsContainer = document.getElementById('toolActionsContainer');

  let ultimoResultado = null;

  const resultActionsController = createResultActions({
    container: actionsContainer,
    onCopy: () => ultimoResultado ? buildCopyText(ultimoResultado) : '',
    onShare: () => ({
      title: 'Simulador de DAS do MEI',
      text: ultimoResultado ? buildCopyText(ultimoResultado) : 'Calcule o valor oficial da guia DAS do MEI no Calculadora Master.',
      url: window.location.href
    }),
    onPrint: () => window.print()
  });

  function limparErros() {
    if (painelErros) {
      painelErros.textContent = '';
      painelErros.hidden = true;
    }
  }

  function exibirErro(msg) {
    if (painelErros) {
      painelErros.textContent = msg;
      painelErros.hidden = false;
      painelErros.setAttribute('role', 'alert');
    }
    if (resultadoSecao) {
      resultadoSecao.hidden = true;
    }
  }

  function executarCalculo() {
    limparErros();

    const ano = selectAno ? selectAno.value : '2026';
    const atividade = selectAtividade ? selectAtividade.value : '';
    const meses = selectMeses ? parseInt(selectMeses.value, 10) : 12;

    const resultado = calculateDasMei({
      ano,
      atividade,
      mesesPersonalizados: meses
    });

    if (!resultado.ok) {
      exibirErro(resultado.error);
      return null;
    }

    ultimoResultado = resultado;
    const d = resultado.data;

    // Atualiza Valores Principais
    if (valorTotalMensal) valorTotalMensal.textContent = formatCurrency(d.totalMensal);
    if (valorInss) valorInss.textContent = `${formatCurrency(d.inss)} (${d.aliquotaInssPercentual}%)`;
    if (valorIcms) valorIcms.textContent = formatCurrency(d.icms);
    if (valorIss) valorIss.textContent = formatCurrency(d.iss);
    if (valorTotalAnual) valorTotalAnual.textContent = formatCurrency(d.totalAnual);
    if (rotuloTotalAnual) rotuloTotalAnual.textContent = `Total estimado para ${d.mesesConsiderados} meses:`;

    // Atualiza Memória de Cálculo
    if (listaMemoria) {
      listaMemoria.innerHTML = '';
      for (const item of d.memoriaCalculo) {
        const li = document.createElement('li');
        li.textContent = item;
        listaMemoria.appendChild(li);
      }
    }

    // Atualiza Avisos Educativos
    if (painelAvisos) {
      painelAvisos.innerHTML = '';
      for (const aviso of d.avisos) {
        const p = document.createElement('p');
        p.className = 'aviso-educativo';
        p.textContent = aviso;
        painelAvisos.appendChild(p);
      }
    }

    if (resultadoSecao) {
      resultadoSecao.hidden = false;
    }

    return resultado;
  }

  function limparTudo() {
    if (form) form.reset();
    if (selectAno) selectAno.value = '2026';
    if (selectAtividade) selectAtividade.value = 'comercio_industria';
    if (selectMeses) selectMeses.value = '12';

    limparErros();
    if (resultadoSecao) resultadoSecao.hidden = true;
    ultimoResultado = null;

    if (selectAtividade) selectAtividade.focus();
  }

  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      executarCalculo();
    });
  }

  if (btnCalcular) {
    btnCalcular.addEventListener('click', (e) => {
      e.preventDefault();
      executarCalculo();
    });
  }

  if (btnLimpar) {
    btnLimpar.addEventListener('click', (e) => {
      e.preventDefault();
      limparTudo();
    });
  }

  // Recálculo automático quando o usuário altera o select
  if (selectAno) selectAno.addEventListener('change', executarCalculo);
  if (selectAtividade) selectAtividade.addEventListener('change', executarCalculo);
  if (selectMeses) selectMeses.addEventListener('change', executarCalculo);

  // Executa o cálculo inicial se a página já possuir valores selecionados
  if (selectAtividade && selectAtividade.value) {
    executarCalculo();
  }

  return {
    executarCalculo,
    limparTudo,
    getUltimoResultado: () => ultimoResultado,
    getResultActionsController: () => resultActionsController
  };
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setupTool());
  } else {
    setupTool();
  }
}
