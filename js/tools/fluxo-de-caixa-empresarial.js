/**
 * Calculadora de Fluxo de Caixa Empresarial — Calculadora Master
 *
 * Módulo puro e desacoplado para gestão, simulação e controle do fluxo financeiro
 * voltado a Microempreendedores Individuais (MEI), autônomos e pequenos negócios.
 *
 * Metodologia e Princípios Contábeis:
 * - Operações estritamente em centavos inteiros com arredondamento consistente;
 * - Regime de Caixa vs. Regime de Competência: O fluxo de caixa registra a liquidez financeira
 *   efetiva (entradas e saídas na data de ocorrência), e não o resultado contábil/econômico (DRE);
 * - Segregação temporal: Saldo Realizado (transações efetivadas) vs. Saldo Projetado (compromissos futuros);
 * - Saldo Realizado = Saldo Inicial + Entradas Realizadas − Saídas Realizadas;
 * - Saldo Projetado = Saldo Inicial + (Entradas Realizadas + Entradas Previstas) − (Saídas Realizadas + Saídas Previstas);
 * - Variação Líquida de Caixa = Total de Entradas Gerais − Total de Saídas Gerais (sem confundi-la com resultado operacional contábil);
 * - Não-duplicação: Cada transação é classificada unicamente como "realizada" OU "prevista";
 * - Alerta de Caixa Negativo: Monitoramento cronológico para identificação prévia de insolvência momentânea;
 * - Transparência de dados: Funcionamento 100% no navegador (Client-Side), sem armazenamento em servidor externo.
 */

import { createResultActions } from '../core/result-actions.js';

export const CATEGORIAS_PADRAO = Object.freeze({
  receitas: [
    'Vendas de Produtos',
    'Prestação de Serviços',
    'Recebimento de Clientes / Duplicatas',
    'Rendimento de Aplicações',
    'Aporte de Capital / Investimento',
    'Outras Entradas'
  ],
  despesas: [
    'Fornecedores / Mercadorias',
    'Folha de Pagamento / Pró-labore',
    'Tributos e Encargos (DAS / INSS / FGTS)',
    'Aluguel, Condomínio e Água/Luz/Gás',
    'Marketing, Anúncios e Vendas',
    'Software, Internet e Telefonia',
    'Empréstimos, Juros e Financiamentos',
    'Manutenção e Material de Consumo',
    'Outras Saídas'
  ]
});

/* ==========================================================================
 * Utilitários de Parsing e Formatação
 * ========================================================================== */

/**
 * Converte qualquer valor em reais para centavos inteiros de forma segura.
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

/**
 * Formata valor monetário para o padrão brasileiro (BRL)
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
 * Formata data no formato brasileiro DD/MM/AAAA
 * @param {string} isoDate YYYY-MM-DD
 * @returns {string}
 */
export function formatDateBr(isoDate) {
  if (!isoDate || typeof isoDate !== 'string') return '-';
  const parts = isoDate.split('-');
  if (parts.length !== 3) return isoDate;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

/**
 * Valida se uma string é uma data válida no formato YYYY-MM-DD
 * @param {string} str
 * @returns {boolean}
 */
export function isValidIsoDate(str) {
  if (!str || typeof str !== 'string') return false;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(str);
  if (!match) return false;
  const y = parseInt(match[1], 10);
  const m = parseInt(match[2], 10);
  const d = parseInt(match[3], 10);
  if (y < 1900 || y > 2100 || m < 1 || m > 12 || d < 1 || d > 31) return false;
  const dateObj = new Date(Date.UTC(y, m - 1, d));
  return (
    dateObj.getUTCFullYear() === y &&
    dateObj.getUTCMonth() === m - 1 &&
    dateObj.getUTCDate() === d
  );
}

/* ==========================================================================
 * Motor de Cálculo Puro: Fluxo de Caixa
 * ========================================================================== */

/**
 * Processa e calcula o fluxo de caixa detalhado a partir do saldo inicial e lista de lançamentos.
 *
 * @param {Object} params
 * @param {number|string} [params.saldoInicial=0] Saldo inicial em caixa
 * @param {Array<Object>} [params.lancamentos=[]] Lista de transações
 * @returns {Object} Resultado analítico do fluxo de caixa
 */
export function calculateCashFlow({ saldoInicial = 0, lancamentos = [] } = {}) {
  const saldoInicialCentavos = parseMoneyToCents(saldoInicial);

  if (Number.isNaN(saldoInicialCentavos)) {
    return {
      ok: false,
      error: 'O saldo inicial de caixa informado é inválido.'
    };
  }

  if (saldoInicialCentavos < 0) {
    return {
      ok: false,
      error: 'O saldo inicial de caixa não pode ser negativo. Se o caixa começou descoberto, registre um saldo inicial zero e adicione um lançamento de saída na data de abertura.'
    };
  }

  if (!Array.isArray(lancamentos)) {
    return {
      ok: false,
      error: 'A lista de lançamentos de caixa deve ser um conjunto válido.'
    };
  }

  // Sanitização e validação dos lançamentos
  const lancamentosValidados = [];
  for (let i = 0; i < lancamentos.length; i++) {
    const item = lancamentos[i];
    if (!item || typeof item !== 'object') continue;

    const tipo = item.tipo === 'despesa' ? 'despesa' : 'receita';
    const status = item.status === 'previsto' ? 'previsto' : 'realizado';
    const valorCentavos = parseMoneyToCents(item.valor);

    if (Number.isNaN(valorCentavos) || valorCentavos <= 0) {
      return {
        ok: false,
        error: `O lançamento #${i + 1} (${item.descricao || 'Sem descrição'}) possui valor inválido ou zerado. Cada transação deve ter valor maior que zero.`
      };
    }

    const data = String(item.data || '').trim();
    if (!isValidIsoDate(data)) {
      return {
        ok: false,
        error: `O lançamento #${i + 1} (${item.descricao || 'Sem descrição'}) possui data inválida (${data}). Utilize o formato AAAA-MM-DD.`
      };
    }

    const descricao = String(item.descricao || '').trim() || (tipo === 'receita' ? 'Entrada Diversa' : 'Saída Diversa');
    const categoria = String(item.categoria || '').trim() || (tipo === 'receita' ? 'Outras Entradas' : 'Outras Saídas');

    lancamentosValidados.push({
      id: item.id || `lancto-${i + 1}-${Date.now()}`,
      tipo,
      categoria,
      descricao,
      valorCentavos,
      valor: valorCentavos / 100,
      data,
      status
    });
  }

  // Ordenação cronológica estrita
  lancamentosValidados.sort((a, b) => {
    if (a.data !== b.data) return a.data.localeCompare(b.data);
    // Na mesma data: realizados antes de previstos
    if (a.status !== b.status) return a.status === 'realizado' ? -1 : 1;
    // Receitas antes de despesas
    if (a.tipo !== b.tipo) return a.tipo === 'receita' ? -1 : 1;
    return a.descricao.localeCompare(b.descricao);
  });

  // Linha do tempo e saldos correntes
  let runningRealizadoCentavos = saldoInicialCentavos;
  let runningProjetadoCentavos = saldoInicialCentavos;

  let totalEntradasRealizadasCentavos = 0;
  let totalEntradasPrevistasCentavos = 0;
  let totalSaidasRealizadasCentavos = 0;
  let totalSaidasPrevistasCentavos = 0;

  let menorSaldoProjetadoCentavos = saldoInicialCentavos;
  let dataMenorSaldo = lancamentosValidados.length > 0 ? lancamentosValidados[0].data : null;
  const alertasCaixaNegativo = [];

  const extratoDetalhado = [];
  const resumoMensalMap = new Map();

  for (const item of lancamentosValidados) {
    const isReceita = item.tipo === 'receita';
    const isRealizado = item.status === 'realizado';

    if (isReceita) {
      if (isRealizado) {
        totalEntradasRealizadasCentavos += item.valorCentavos;
        runningRealizadoCentavos += item.valorCentavos;
      } else {
        totalEntradasPrevistasCentavos += item.valorCentavos;
      }
      runningProjetadoCentavos += item.valorCentavos;
    } else {
      if (isRealizado) {
        totalSaidasRealizadasCentavos += item.valorCentavos;
        runningRealizadoCentavos -= item.valorCentavos;
      } else {
        totalSaidasPrevistasCentavos += item.valorCentavos;
      }
      runningProjetadoCentavos -= item.valorCentavos;
    }

    if (runningProjetadoCentavos < menorSaldoProjetadoCentavos) {
      menorSaldoProjetadoCentavos = runningProjetadoCentavos;
      dataMenorSaldo = item.data;
    }

    if (runningProjetadoCentavos < 0) {
      alertasCaixaNegativo.push({
        data: item.data,
        descricao: item.descricao,
        saldoProjetadoCentavos: runningProjetadoCentavos,
        saldoProjetado: runningProjetadoCentavos / 100
      });
    }

    extratoDetalhado.push({
      ...item,
      saldoProjetadoMomentoCentavos: runningProjetadoCentavos,
      saldoProjetadoMomento: runningProjetadoCentavos / 100,
      saldoNegativoMomento: runningProjetadoCentavos < 0
    });

    // Agrupamento mensal
    const mesAno = item.data.substring(0, 7); // YYYY-MM
    if (!resumoMensalMap.has(mesAno)) {
      resumoMensalMap.set(mesAno, {
        mesAno,
        entradasRealizadasCentavos: 0,
        entradasPrevistasCentavos: 0,
        saidasRealizadasCentavos: 0,
        saidasPrevistasCentavos: 0,
        saldoFimDoMesCentavos: runningProjetadoCentavos
      });
    }
    const rMes = resumoMensalMap.get(mesAno);
    if (isReceita) {
      if (isRealizado) rMes.entradasRealizadasCentavos += item.valorCentavos;
      else rMes.entradasPrevistasCentavos += item.valorCentavos;
    } else {
      if (isRealizado) rMes.saidasRealizadasCentavos += item.valorCentavos;
      else rMes.saidasPrevistasCentavos += item.valorCentavos;
    }
    rMes.saldoFimDoMesCentavos = runningProjetadoCentavos;
  }

  const totalEntradasGeraisCentavos = totalEntradasRealizadasCentavos + totalEntradasPrevistasCentavos;
  const totalSaidasGeraisCentavos = totalSaidasRealizadasCentavos + totalSaidasPrevistasCentavos;

  const saldoRealizadoFinalCentavos = saldoInicialCentavos + totalEntradasRealizadasCentavos - totalSaidasRealizadasCentavos;
  const saldoProjetadoFinalCentavos = saldoInicialCentavos + totalEntradasGeraisCentavos - totalSaidasGeraisCentavos;
  const variacaoLiquidaCaixaPeriodoCentavos = totalEntradasGeraisCentavos - totalSaidasGeraisCentavos;
  const resultadoOperacionalPeriodoCentavos = variacaoLiquidaCaixaPeriodoCentavos;

  // Converte resumo mensal para array estruturado
  const resumoMensal = Array.from(resumoMensalMap.values()).map(m => ({
    mesAno: m.mesAno,
    totalEntradasCentavos: m.entradasRealizadasCentavos + m.entradasPrevistasCentavos,
    totalEntradas: (m.entradasRealizadasCentavos + m.entradasPrevistasCentavos) / 100,
    totalSaidasCentavos: m.saidasRealizadasCentavos + m.saidasPrevistasCentavos,
    totalSaidas: (m.saidasRealizadasCentavos + m.saidasPrevistasCentavos) / 100,
    saldoFimDoMesCentavos: m.saldoFimDoMesCentavos,
    saldoFimDoMes: m.saldoFimDoMesCentavos / 100,
    resultadoMensalCentavos: (m.entradasRealizadasCentavos + m.entradasPrevistasCentavos) - (m.saidasRealizadasCentavos + m.saidasPrevistasCentavos),
    resultadoMensal: ((m.entradasRealizadasCentavos + m.entradasPrevistasCentavos) - (m.saidasRealizadasCentavos + m.saidasPrevistasCentavos)) / 100
  }));

  // Memória de cálculo descritiva
  const memoriaCalculo = [
    `Saldo inicial em caixa: ${formatCurrency(saldoInicialCentavos / 100)}.`,
    `Total de Entradas Efetivadas (Realizadas): ${formatCurrency(totalEntradasRealizadasCentavos / 100)}.`,
    `Total de Saídas Efetivadas (Pagas): ${formatCurrency(totalSaidasRealizadasCentavos / 100)}.`,
    `Saldo Efetivo Realizado Atual: ${formatCurrency(saldoInicialCentavos / 100)} + ${formatCurrency(totalEntradasRealizadasCentavos / 100)} − ${formatCurrency(totalSaidasRealizadasCentavos / 100)} = ${formatCurrency(saldoRealizadoFinalCentavos / 100)}.`,
    `Contas a Receber (Entradas Previstas): ${formatCurrency(totalEntradasPrevistasCentavos / 100)}.`,
    `Contas a Pagar (Saídas Previstas): ${formatCurrency(totalSaidasPrevistasCentavos / 100)}.`,
    `Saldo Projetado Final: ${formatCurrency(saldoRealizadoFinalCentavos / 100)} + ${formatCurrency(totalEntradasPrevistasCentavos / 100)} − ${formatCurrency(totalSaidasPrevistasCentavos / 100)} = ${formatCurrency(saldoProjetadoFinalCentavos / 100)}.`,
    `Variação Líquida de Caixa do Período: ${formatCurrency(variacaoLiquidaCaixaPeriodoCentavos / 100)} (diferença total entre entradas e saídas do período).`
  ];

  // Avisos de gestão e conformidade
  const avisos = [
    'Regime de Caixa vs. Lucro: O fluxo de caixa mede a capacidade de pagamento imediato na data exata. Lucro contábil ou vendas parceladas a prazo não representam disponibilidade financeira imediata.',
    'Contas a Receber e Inadimplência: Valores previstos dependem do pagamento pontual dos clientes. Monitore vencimentos e mantenha reserva para cobrir eventuais atrasos.',
    'Privacidade e Segurança: Todos os lançamentos são processados localmente no seu dispositivo. Nenhum dado financeiro da sua empresa é transmitido para servidores remotos.'
  ];

  if (alertasCaixaNegativo.length > 0) {
    avisos.unshift(`ALERTA DE CAIXA: Foram identificados ${alertasCaixaNegativo.length} momento(s) em que o saldo projetado atinge valor negativo (menor saldo registrado: ${formatCurrency(menorSaldoProjetadoCentavos / 100)} em ${formatDateBr(dataMenorSaldo)}). Planeje antecipação de recebíveis, negociação de prazos ou corte de despesas para evitar juros de cheque especial.`);
  }

  return {
    ok: true,
    data: {
      saldoInicialCentavos,
      saldoInicial: saldoInicialCentavos / 100,
      totalLancamentos: lancamentosValidados.length,
      extratoDetalhado,
      totalEntradasRealizadasCentavos,
      totalEntradasRealizadas: totalEntradasRealizadasCentavos / 100,
      totalEntradasPrevistasCentavos,
      totalEntradasPrevistas: totalEntradasPrevistasCentavos / 100,
      totalEntradasGeraisCentavos,
      totalEntradasGerais: totalEntradasGeraisCentavos / 100,
      totalSaidasRealizadasCentavos,
      totalSaidasRealizadas: totalSaidasRealizadasCentavos / 100,
      totalSaidasPrevistasCentavos,
      totalSaidasPrevistas: totalSaidasPrevistasCentavos / 100,
      totalSaidasGeraisCentavos,
      totalSaidasGerais: totalSaidasGeraisCentavos / 100,
      saldoRealizadoFinalCentavos,
      saldoRealizadoFinal: saldoRealizadoFinalCentavos / 100,
      saldoProjetadoFinalCentavos,
      saldoProjetadoFinal: saldoProjetadoFinalCentavos / 100,
      variacaoLiquidaCaixaPeriodoCentavos,
      variacaoLiquidaCaixaPeriodo: variacaoLiquidaCaixaPeriodoCentavos / 100,
      resultadoOperacionalPeriodoCentavos,
      resultadoOperacionalPeriodo: resultadoOperacionalPeriodoCentavos / 100,
      menorSaldoProjetadoCentavos,
      menorSaldoProjetado: menorSaldoProjetadoCentavos / 100,
      dataMenorSaldo,
      possuiSaldoNegativo: alertasCaixaNegativo.length > 0,
      alertasCaixaNegativo,
      resumoMensal,
      memoriaCalculo,
      avisos
    }
  };
}

/* ==========================================================================
 * Formatação e Compartilhamento de Resultados
 * ========================================================================== */

/**
 * Constrói texto limpo para exportação e cópia dos resultados
 * @param {Object} resultado Retorno de calculateCashFlow
 * @returns {string}
 */
export function buildCopyText(resultado) {
  if (!resultado || !resultado.ok || !resultado.data) {
    return 'Fluxo de Caixa Empresarial — Calculadora Master';
  }
  const d = resultado.data;
  const linhas = [
    '=== RESUMO DO FLUXO DE CAIXA EMPRESARIAL — CALCULADORA MASTER ===',
    `Saldo Inicial em Caixa: ${formatCurrency(d.saldoInicial)}`,
    '----------------------------------------',
    'MOVIMENTAÇÕES REALIZADAS (EFETIVADAS):',
    `  (+) Entradas Recebidas: ${formatCurrency(d.totalEntradasRealizadas)}`,
    `  (-) Saídas Pagas: ${formatCurrency(d.totalSaidasRealizadas)}`,
    `  (=) SALDO REALIZADO ATUAL: ${formatCurrency(d.saldoRealizadoFinal)}`,
    '----------------------------------------',
    'PREVISÕES FUTURAS (CONTAS A RECEBER E PAGAR):',
    `  (+) Contas a Receber: ${formatCurrency(d.totalEntradasPrevistas)}`,
    `  (-) Contas a Pagar: ${formatCurrency(d.totalSaidasPrevistas)}`,
    '----------------------------------------',
    `(=) SALDO PROJETADO FINAL: ${formatCurrency(d.saldoProjetadoFinal)}`,
    `Variação Líquida de Caixa do Período: ${formatCurrency(d.variacaoLiquidaCaixaPeriodo ?? d.resultadoOperacionalPeriodo)}`,
    d.possuiSaldoNegativo
      ? `(!) ATENÇÃO: Risco de caixa descoberto (menor saldo projetado: ${formatCurrency(d.menorSaldoProjetado)} em ${formatDateBr(d.dataMenorSaldo)})`
      : '(!) Situação de Caixa: Saldo projetado positivo em todas as datas.',
    '----------------------------------------',
    'Simulado em: https://www.calculadoramaster.com/tools/financas/fluxo-de-caixa-empresarial.html'
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
 * Dados de exemplo didáticos para facilitar a primeira utilização do usuário
 */
export const EXEMPLO_LANCAMENTOS = Object.freeze([
  {
    id: 'ex-1',
    tipo: 'receita',
    categoria: 'Prestação de Serviços',
    descricao: 'Contrato de Consultoria Mensal A',
    valor: 4500,
    data: '2026-11-05',
    status: 'realizado'
  },
  {
    id: 'ex-2',
    tipo: 'despesa',
    categoria: 'Tributos e Encargos (DAS / INSS / FGTS)',
    descricao: 'Pagamento Guia DAS-MEI',
    valor: 86.05,
    data: '2026-11-20',
    status: 'realizado'
  },
  {
    id: 'ex-3',
    tipo: 'despesa',
    categoria: 'Software, Internet e Telefonia',
    descricao: 'Assinatura Plataforma de Vendas e Nuvem',
    valor: 250,
    data: '2026-11-25',
    status: 'realizado'
  },
  {
    id: 'ex-4',
    tipo: 'receita',
    categoria: 'Vendas de Produtos',
    descricao: 'Faturamento Pedido Cliente B (Boleto)',
    valor: 3200,
    data: '2026-12-05',
    status: 'previsto'
  },
  {
    id: 'ex-5',
    tipo: 'despesa',
    categoria: 'Fornecedores / Mercadorias',
    descricao: 'Reposição Estoque de Fim de Ano',
    valor: 2800,
    data: '2026-12-10',
    status: 'previsto'
  }
]);

/**
 * Inicializa a calculadora e conecta elementos do DOM
 * @param {Object} [options]
 * @returns {Object} Controlador com métodos para testes e automação
 */
export function setupTool(options = {}) {
  const formSaldo = document.getElementById('formSaldoInicial');
  const inputSaldoInicial = document.getElementById('saldoInicial');
  const formLancamento = document.getElementById('formLancamento');
  const inputDescricao = document.getElementById('descricaoLancamento');
  const selectTipo = document.getElementById('tipoLancamento');
  const selectCategoria = document.getElementById('categoriaLancamento');
  const inputValor = document.getElementById('valorLancamento');
  const inputData = document.getElementById('dataLancamento');
  const selectStatus = document.getElementById('statusLancamento');
  const btnAdicionar = document.getElementById('btnAdicionarLancamento');
  const btnLimparTudo = document.getElementById('btnLimparTudo');
  const btnCarregarExemplo = document.getElementById('btnCarregarExemplo');

  const tabelaCorpo = document.getElementById('tabelaLancamentosCorpo');
  const resultadoSecao = document.getElementById('resultadoSecao');
  const painelErros = document.getElementById('painelErros');
  const actionsContainer = document.getElementById('toolActionsContainer');

  // Indicadores de Resultado
  const valorSaldoRealizado = document.getElementById('resultadoSaldoRealizado');
  const valorSaldoProjetado = document.getElementById('resultadoSaldoProjetado');
  const valorEntradasRealizadas = document.getElementById('resultadoEntradasRealizadas');
  const valorEntradasPrevistas = document.getElementById('resultadoEntradasPrevistas');
  const valorSaidasRealizadas = document.getElementById('resultadoSaidasRealizadas');
  const valorSaidasPrevistas = document.getElementById('resultadoSaidasPrevistas');
  const valorVariacaoLiquidaCaixa = document.getElementById('resultadoVariacaoLiquidaCaixa') || document.getElementById('resultadoOperacionalPeriodo');
  const painelAlertaNegativo = document.getElementById('painelAlertaNegativo');
  const tabelaResumoMensalCorpo = document.getElementById('tabelaResumoMensalCorpo');
  const listaMemoria = document.getElementById('listaMemoriaCalculo');
  const painelAvisos = document.getElementById('painelAvisos');

  let lancamentosAtivos = options.initialLancamentos ? [...options.initialLancamentos] : [];
  let ultimoResultado = null;

  const resultActionsController = createResultActions({
    container: actionsContainer,
    onCopy: () => ultimoResultado ? buildCopyText(ultimoResultado) : '',
    onShare: () => ({
      title: 'Fluxo de Caixa Empresarial — Calculadora Master',
      text: ultimoResultado ? buildCopyText(ultimoResultado) : 'Controle financeiro e fluxo de caixa da sua empresa.',
      url: window.location.href
    }),
    onPrint: () => window.print()
  });

  function atualizarCategoriasPorTipo() {
    if (!selectCategoria || !selectTipo) return;
    const tipo = selectTipo.value;
    const lista = tipo === 'despesa' ? CATEGORIAS_PADRAO.despesas : CATEGORIAS_PADRAO.receitas;

    selectCategoria.innerHTML = '';
    for (const cat of lista) {
      const opt = document.createElement('option');
      opt.value = cat;
      opt.textContent = cat;
      selectCategoria.appendChild(opt);
    }
  }

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
  }

  function renderizarTabelaLancamentos() {
    if (!tabelaCorpo) return;
    tabelaCorpo.innerHTML = '';

    if (lancamentosAtivos.length === 0) {
      const tr = document.createElement('tr');
      const td = document.createElement('td');
      td.colSpan = 6;
      td.className = 'table-empty-message';
      td.textContent = 'Nenhum lançamento adicionado até o momento. Utilize o formulário acima ou clique em "Carregar Exemplo".';
      tr.appendChild(td);
      tabelaCorpo.appendChild(tr);
      return;
    }

    lancamentosAtivos.forEach((item, index) => {
      const tr = document.createElement('tr');
      tr.className = item.tipo === 'despesa' ? 'row-despesa' : 'row-receita';

      // Data
      const tdData = document.createElement('td');
      tdData.textContent = formatDateBr(item.data);
      tr.appendChild(tdData);

      // Descrição & Categoria
      const tdDesc = document.createElement('td');
      tdDesc.textContent = `${item.descricao} (${item.categoria})`;
      tr.appendChild(tdDesc);

      // Tipo
      const tdTipo = document.createElement('td');
      tdTipo.textContent = item.tipo === 'receita' ? 'Entrada' : 'Saída';
      tr.appendChild(tdTipo);

      // Valor
      const tdValor = document.createElement('td');
      tdValor.textContent = formatCurrency(item.valor);
      tr.appendChild(tdValor);

      // Status
      const tdStatus = document.createElement('td');
      const spanStatus = document.createElement('span');
      spanStatus.className = item.status === 'realizado' ? 'badge badge-success' : 'badge badge-warning';
      spanStatus.textContent = item.status === 'realizado' ? 'Realizado' : 'Previsto';
      tdStatus.appendChild(spanStatus);
      tr.appendChild(tdStatus);

      // Ações (Excluir)
      const tdAcoes = document.createElement('td');
      const btnRemover = document.createElement('button');
      btnRemover.type = 'button';
      btnRemover.className = 'btn btn-danger btn-sm';
      btnRemover.textContent = 'Excluir';
      btnRemover.setAttribute('aria-label', `Excluir lançamento ${item.descricao}`);
      btnRemover.addEventListener('click', () => {
        removerLancamento(index);
      });
      tdAcoes.appendChild(btnRemover);
      tr.appendChild(tdAcoes);

      tabelaCorpo.appendChild(tr);
    });
  }

  function renderizarResumoMensal(resumoMensal) {
    if (!tabelaResumoMensalCorpo) return;
    tabelaResumoMensalCorpo.innerHTML = '';

    if (!resumoMensal || resumoMensal.length === 0) {
      const tr = document.createElement('tr');
      const td = document.createElement('td');
      td.colSpan = 5;
      td.className = 'table-empty-message';
      td.textContent = 'Sem lançamentos no período.';
      tr.appendChild(td);
      tabelaResumoMensalCorpo.appendChild(tr);
      return;
    }

    for (const r of resumoMensal) {
      const tr = document.createElement('tr');

      const tdMes = document.createElement('td');
      tdMes.textContent = r.mesAno;
      tr.appendChild(tdMes);

      const tdEntradas = document.createElement('td');
      tdEntradas.textContent = formatCurrency(r.totalEntradas);
      tr.appendChild(tdEntradas);

      const tdSaidas = document.createElement('td');
      tdSaidas.textContent = formatCurrency(r.totalSaidas);
      tr.appendChild(tdSaidas);

      const tdResultado = document.createElement('td');
      tdResultado.textContent = formatCurrency(r.resultadoMensal);
      tdResultado.className = r.resultadoMensal < 0 ? 'text-danger' : 'text-success';
      tr.appendChild(tdResultado);

      const tdSaldoFim = document.createElement('td');
      tdSaldoFim.textContent = formatCurrency(r.saldoFimDoMes);
      tdSaldoFim.className = r.saldoFimDoMes < 0 ? 'text-danger font-weight-bold' : 'font-weight-bold';
      tr.appendChild(tdSaldoFim);

      tabelaResumoMensalCorpo.appendChild(tr);
    }
  }

  function executarCalculo() {
    limparErros();

    const saldoInicial = inputSaldoInicial ? inputSaldoInicial.value : 0;
    const resultado = calculateCashFlow({
      saldoInicial,
      lancamentos: lancamentosAtivos
    });

    if (!resultado.ok) {
      exibirErro(resultado.error);
      return null;
    }

    ultimoResultado = resultado;
    const d = resultado.data;

    // Atualiza indicadores em destaque
    if (valorSaldoRealizado) valorSaldoRealizado.textContent = formatCurrency(d.saldoRealizadoFinal);
    if (valorSaldoProjetado) {
      valorSaldoProjetado.textContent = formatCurrency(d.saldoProjetadoFinal);
      valorSaldoProjetado.className = d.saldoProjetadoFinal < 0 ? 'highlight-value text-danger' : 'highlight-value';
    }
    if (valorEntradasRealizadas) valorEntradasRealizadas.textContent = formatCurrency(d.totalEntradasRealizadas);
    if (valorEntradasPrevistas) valorEntradasPrevistas.textContent = formatCurrency(d.totalEntradasPrevistas);
    if (valorSaidasRealizadas) valorSaidasRealizadas.textContent = formatCurrency(d.totalSaidasRealizadas);
    if (valorSaidasPrevistas) valorSaidasPrevistas.textContent = formatCurrency(d.totalSaidasPrevistas);
    if (valorVariacaoLiquidaCaixa) valorVariacaoLiquidaCaixa.textContent = formatCurrency(d.variacaoLiquidaCaixaPeriodo ?? d.resultadoOperacionalPeriodo);

    // Alerta de Saldo Negativo
    if (painelAlertaNegativo) {
      if (d.possuiSaldoNegativo) {
        painelAlertaNegativo.hidden = false;
        painelAlertaNegativo.textContent = `Atenção: Identificado saldo projetado negativo em ${d.alertasCaixaNegativo.length} momento(s). O menor saldo de caixa atinge ${formatCurrency(d.menorSaldoProjetado)} em ${formatDateBr(d.dataMenorSaldo)}.`;
      } else {
        painelAlertaNegativo.hidden = true;
        painelAlertaNegativo.textContent = '';
      }
    }

    // Tabela Mensal
    renderizarResumoMensal(d.resumoMensal);

    // Memória de cálculo
    if (listaMemoria) {
      listaMemoria.innerHTML = '';
      for (const item of d.memoriaCalculo) {
        const li = document.createElement('li');
        li.textContent = item;
        listaMemoria.appendChild(li);
      }
    }

    // Avisos
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

    renderizarTabelaLancamentos();
    return resultado;
  }

  function adicionarLancamento(e) {
    if (e && e.preventDefault) e.preventDefault();
    limparErros();

    const descricao = inputDescricao ? inputDescricao.value.trim() : '';
    const tipo = selectTipo ? selectTipo.value : 'receita';
    const categoria = selectCategoria ? selectCategoria.value : '';
    const valor = inputValor ? inputValor.value : '';
    const data = inputData ? inputData.value : '';
    const status = selectStatus ? selectStatus.value : 'realizado';

    if (!descricao) {
      exibirErro('Informe uma descrição clara para o lançamento financeiro.');
      if (inputDescricao) inputDescricao.focus();
      return;
    }

    const valorCents = parseMoneyToCents(valor);
    if (Number.isNaN(valorCents) || valorCents <= 0) {
      exibirErro('O valor do lançamento deve ser maior que zero.');
      if (inputValor) inputValor.focus();
      return;
    }

    if (!isValidIsoDate(data)) {
      exibirErro('Informe uma data válida para o lançamento (formato AAAA-MM-DD).');
      if (inputData) inputData.focus();
      return;
    }

    lancamentosAtivos.push({
      id: `lancto-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      tipo,
      categoria,
      descricao,
      valor: valorCents / 100,
      data,
      status
    });

    if (inputDescricao) inputDescricao.value = '';
    if (inputValor) inputValor.value = '';
    // Mantém a data para agilizar múltiplos lançamentos no mesmo dia

    executarCalculo();
    if (inputDescricao) inputDescricao.focus();
  }

  function removerLancamento(index) {
    if (index >= 0 && index < lancamentosAtivos.length) {
      lancamentosAtivos.splice(index, 1);
      executarCalculo();
    }
  }

  function limparTudo() {
    lancamentosAtivos = [];
    if (inputSaldoInicial) inputSaldoInicial.value = '0,00';
    if (inputDescricao) inputDescricao.value = '';
    if (inputValor) inputValor.value = '';
    limparErros();
    executarCalculo();
    if (inputSaldoInicial) inputSaldoInicial.focus();
  }

  function carregarExemplo() {
    lancamentosAtivos = JSON.parse(JSON.stringify(EXEMPLO_LANCAMENTOS));
    if (inputSaldoInicial) inputSaldoInicial.value = '2.500,00';
    limparErros();
    executarCalculo();
  }

  // Eventos
  if (selectTipo) {
    selectTipo.addEventListener('change', atualizarCategoriasPorTipo);
    atualizarCategoriasPorTipo();
  }

  if (inputSaldoInicial) {
    inputSaldoInicial.addEventListener('change', executarCalculo);
    inputSaldoInicial.addEventListener('input', () => {
      // Pequeno debounce natural em mudanças manuais
      setTimeout(executarCalculo, 200);
    });
  }

  if (formSaldo) {
    formSaldo.addEventListener('submit', (e) => {
      e.preventDefault();
      executarCalculo();
    });
  }

  if (formLancamento) {
    formLancamento.addEventListener('submit', adicionarLancamento);
  }

  if (btnAdicionar) {
    btnAdicionar.addEventListener('click', adicionarLancamento);
  }

  if (btnLimparTudo) {
    btnLimparTudo.addEventListener('click', (e) => {
      e.preventDefault();
      limparTudo();
    });
  }

  if (btnCarregarExemplo) {
    btnCarregarExemplo.addEventListener('click', (e) => {
      e.preventDefault();
      carregarExemplo();
    });
  }

  // Inicialização padrão
  if (options.carregarExemploInicial) {
    carregarExemplo();
  } else {
    executarCalculo();
  }

  return {
    executarCalculo,
    adicionarLancamento,
    removerLancamento,
    limparTudo,
    carregarExemplo,
    getLancamentos: () => lancamentosAtivos,
    getUltimoResultado: () => ultimoResultado,
    getResultActionsController: () => resultActionsController
  };
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setupTool({ carregarExemploInicial: true }));
  } else {
    setupTool({ carregarExemploInicial: true });
  }
}
