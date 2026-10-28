import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  CATEGORIAS_PADRAO,
  EXEMPLO_LANCAMENTOS,
  parseMoneyToCents,
  formatCurrency,
  formatDateBr,
  isValidIsoDate,
  calculateCashFlow,
  buildCopyText,
  formatResult,
  setupTool
} from '../js/tools/fluxo-de-caixa-empresarial.js';

import { VALID_TOOL_IDS } from '../js/core/favorites.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

/* ==========================================================================
 * 1. Saldo inicial zero e positivo
 * ========================================================================== */
test('1. Saldo inicial: aceita zero e valores positivos, rejeita saldo negativo inicial', () => {
  // Saldo zero
  const resZero = calculateCashFlow({ saldoInicial: 0, lancamentos: [] });
  assert.equal(resZero.ok, true);
  assert.equal(resZero.data.saldoInicialCentavos, 0);
  assert.equal(resZero.data.saldoRealizadoFinalCentavos, 0);
  assert.equal(resZero.data.saldoProjetadoFinalCentavos, 0);

  // Saldo positivo com centavos
  const resPositivo = calculateCashFlow({ saldoInicial: '1.250,50', lancamentos: [] });
  assert.equal(resPositivo.ok, true);
  assert.equal(resPositivo.data.saldoInicialCentavos, 125050);
  assert.equal(resPositivo.data.saldoRealizadoFinalCentavos, 125050);
  assert.equal(resPositivo.data.saldoProjetadoFinalCentavos, 125050);

  // Rejeita saldo negativo inicial
  const resNegativo = calculateCashFlow({ saldoInicial: -500, lancamentos: [] });
  assert.equal(resNegativo.ok, false);
  assert.match(resNegativo.error, /não pode ser negativo/i);

  // Rejeita saldo inválido
  const resInvalido = calculateCashFlow({ saldoInicial: 'abc', lancamentos: [] });
  assert.equal(resInvalido.ok, false);
});

/* ==========================================================================
 * 2. Período sem lançamentos
 * ========================================================================== */
test('2. Período sem lançamentos: preserva o saldo inicial sem erros', () => {
  const res = calculateCashFlow({ saldoInicial: 5000, lancamentos: [] });
  assert.equal(res.ok, true);
  assert.equal(res.data.totalLancamentos, 0);
  assert.equal(res.data.totalEntradasRealizadasCentavos, 0);
  assert.equal(res.data.totalSaidasRealizadasCentavos, 0);
  assert.equal(res.data.totalEntradasPrevistasCentavos, 0);
  assert.equal(res.data.totalSaidasPrevistasCentavos, 0);
  assert.equal(res.data.saldoRealizadoFinalCentavos, 500000);
  assert.equal(res.data.saldoProjetadoFinalCentavos, 500000);
  assert.equal(res.data.possuiSaldoNegativo, false);
  assert.equal(res.data.resumoMensal.length, 0);
});

/* ==========================================================================
 * 3. Apenas receitas e apenas despesas
 * ========================================================================== */
test('3. Cenários com apenas receitas ou apenas despesas', () => {
  // Apenas receitas
  const receitas = [
    { id: 1, tipo: 'receita', descricao: 'Venda 1', valor: 1000, data: '2026-11-01', status: 'realizado' },
    { id: 2, tipo: 'receita', descricao: 'Venda 2', valor: 2500, data: '2026-11-05', status: 'realizado' }
  ];
  const resReceitas = calculateCashFlow({ saldoInicial: 1000, lancamentos: receitas });
  assert.equal(resReceitas.ok, true);
  assert.equal(resReceitas.data.totalEntradasRealizadasCentavos, 350000);
  assert.equal(resReceitas.data.totalSaidasRealizadasCentavos, 0);
  assert.equal(resReceitas.data.saldoRealizadoFinalCentavos, 450000); // 1.000 + 3.500 = 4.500

  // Apenas despesas
  const despesas = [
    { id: 1, tipo: 'despesa', descricao: 'Aluguel', valor: 1500, data: '2026-11-10', status: 'realizado' },
    { id: 2, tipo: 'despesa', descricao: 'Internet', valor: 200, data: '2026-11-15', status: 'realizado' }
  ];
  const resDespesas = calculateCashFlow({ saldoInicial: 3000, lancamentos: despesas });
  assert.equal(resDespesas.ok, true);
  assert.equal(resDespesas.data.totalSaidasRealizadasCentavos, 170000);
  assert.equal(resDespesas.data.saldoRealizadoFinalCentavos, 130000); // 3.000 - 1.700 = 1.300
});

/* ==========================================================================
 * 4. Entradas e saídas em datas diferentes com ordenação cronológica
 * ========================================================================== */
test('4. Ordenação cronológica e cálculo correto entre datas distintas', () => {
  const lancamentos = [
    // Lançamentos inseridos fora de ordem temporal intencionalmente
    { id: 'b', tipo: 'despesa', descricao: 'Despesa dia 15', valor: 800, data: '2026-11-15', status: 'realizado' },
    { id: 'a', tipo: 'receita', descricao: 'Receita dia 02', valor: 2000, data: '2026-11-02', status: 'realizado' },
    { id: 'c', tipo: 'receita', descricao: 'Receita dia 20', valor: 500, data: '2026-11-20', status: 'realizado' }
  ];

  const res = calculateCashFlow({ saldoInicial: 500, lancamentos });
  assert.equal(res.ok, true);

  // A lista detalhada deve ter sido ordenada: 02, 15, 20
  const extrato = res.data.extratoDetalhado;
  assert.equal(extrato[0].data, '2026-11-02');
  assert.equal(extrato[0].saldoProjetadoMomentoCentavos, 250000); // 500 + 2000 = 2500

  assert.equal(extrato[1].data, '2026-11-15');
  assert.equal(extrato[1].saldoProjetadoMomentoCentavos, 170000); // 2500 - 800 = 1700

  assert.equal(extrato[2].data, '2026-11-20');
  assert.equal(extrato[2].saldoProjetadoMomentoCentavos, 220000); // 1700 + 500 = 2200
});

/* ==========================================================================
 * 5. Contas previstas versus realizadas (sem dupla contagem)
 * ========================================================================== */
test('5. Contas previstas versus realizadas: segregação sem dupla contagem', () => {
  const lancamentos = [
    // Realizados (já no caixa)
    { id: 1, tipo: 'receita', descricao: 'Venda à vista', valor: 1000, data: '2026-11-05', status: 'realizado' },
    { id: 2, tipo: 'despesa', descricao: 'Fornecedor pago', valor: 600, data: '2026-11-06', status: 'realizado' },
    // Previstos (a receber / a pagar futuros)
    { id: 3, tipo: 'receita', descricao: 'Duplicata a receber', valor: 1500, data: '2026-11-25', status: 'previsto' },
    { id: 4, tipo: 'despesa', descricao: 'Aluguel a pagar', valor: 800, data: '2026-11-28', status: 'previsto' }
  ];

  const res = calculateCashFlow({ saldoInicial: 2000, lancamentos });
  assert.equal(res.ok, true);

  const d = res.data;
  // Realizado atual: 2.000 + 1.000 - 600 = R$ 2.400,00
  assert.equal(d.saldoRealizadoFinalCentavos, 240000);
  assert.equal(d.totalEntradasRealizadasCentavos, 100000);
  assert.equal(d.totalSaidasRealizadasCentavos, 60000);

  // Previsões:
  assert.equal(d.totalEntradasPrevistasCentavos, 150000);
  assert.equal(d.totalSaidasPrevistasCentavos, 80000);

  // Projetado final: 2.400 + 1.500 - 800 = R$ 3.100,00
  assert.equal(d.saldoProjetadoFinalCentavos, 310000);
  assert.equal(d.variacaoLiquidaCaixaPeriodoCentavos, 110000); // (1000+1500) - (600+800) = 1100
  assert.equal(d.resultadoOperacionalPeriodoCentavos, 110000); // Compatibilidade retroativa
});

/* ==========================================================================
 * 6. Saldo negativo projetado (identificação de períodos em vermelho)
 * ========================================================================== */
test('6. Identificação de saldo projetado negativo e data de menor saldo', () => {
  const lancamentos = [
    { id: 1, tipo: 'receita', descricao: 'Entrada Inicial', valor: 1000, data: '2026-11-01', status: 'realizado' },
    // Saída que extrapola o saldo disponível gerando déficit
    { id: 2, tipo: 'despesa', descricao: 'Pagamento Vultoso', valor: 3500, data: '2026-11-10', status: 'previsto' },
    // Recuperação posterior
    { id: 3, tipo: 'receita', descricao: 'Entrada Futura', valor: 4000, data: '2026-11-20', status: 'previsto' }
  ];

  const res = calculateCashFlow({ saldoInicial: 500, lancamentos });
  assert.equal(res.ok, true);

  const d = res.data;
  assert.equal(d.possuiSaldoNegativo, true);
  assert.equal(d.alertasCaixaNegativo.length, 1);
  assert.equal(d.alertasCaixaNegativo[0].data, '2026-11-10');
  // Saldo no dia 10: 500 + 1000 - 3500 = -2000
  assert.equal(d.menorSaldoProjetadoCentavos, -200000);
  assert.equal(d.menorSaldoProjetado, -2000);
  assert.equal(d.dataMenorSaldo, '2026-11-10');

  // Saldo final recupera para positivo: -2000 + 4000 = +2000
  assert.equal(d.saldoProjetadoFinalCentavos, 200000);
});

/* ==========================================================================
 * 7. Valores com centavos e arredondamento monetário
 * ========================================================================== */
test('7. Precisão de centavos inteiros e formatação', () => {
  const lancamentos = [
    { id: 1, tipo: 'receita', descricao: 'Item com centavos', valor: '86,05', data: '2026-11-05', status: 'realizado' },
    { id: 2, tipo: 'despesa', descricao: 'Despesa com centavos', valor: '32,15', data: '2026-11-10', status: 'realizado' }
  ];

  const res = calculateCashFlow({ saldoInicial: '100,50', lancamentos });
  assert.equal(res.ok, true);

  // 100,50 + 86,05 - 32,15 = 154,40
  assert.equal(res.data.saldoRealizadoFinalCentavos, 15440);
  assert.equal(res.data.saldoRealizadoFinal, 154.40);
  assert.match(formatCurrency(154.40), /154,40/);
});

/* ==========================================================================
 * 8. Resumo consolidado por mês
 * ========================================================================== */
test('8. Agrupamento e resumo mensal consolidado', () => {
  const lancamentos = [
    { id: 1, tipo: 'receita', descricao: 'Nov Receita', valor: 2000, data: '2026-11-10', status: 'realizado' },
    { id: 2, tipo: 'despesa', descricao: 'Nov Despesa', valor: 500, data: '2026-11-20', status: 'realizado' },
    { id: 3, tipo: 'receita', descricao: 'Dez Receita', valor: 3000, data: '2026-12-05', status: 'previsto' },
    { id: 4, tipo: 'despesa', descricao: 'Dez Despesa', valor: 1000, data: '2026-12-15', status: 'previsto' }
  ];

  const res = calculateCashFlow({ saldoInicial: 1000, lancamentos });
  assert.equal(res.ok, true);

  const mensal = res.data.resumoMensal;
  assert.equal(mensal.length, 2);

  // Mês 1: 2026-11
  assert.equal(mensal[0].mesAno, '2026-11');
  assert.equal(mensal[0].totalEntradasCentavos, 200000);
  assert.equal(mensal[0].totalSaidasCentavos, 50000);
  assert.equal(mensal[0].resultadoMensalCentavos, 150000);
  assert.equal(mensal[0].saldoFimDoMesCentavos, 250000); // 1000 + 1500 = 2500

  // Mês 2: 2026-12
  assert.equal(mensal[1].mesAno, '2026-12');
  assert.equal(mensal[1].totalEntradasCentavos, 300000);
  assert.equal(mensal[1].totalSaidasCentavos, 100000);
  assert.equal(mensal[1].resultadoMensalCentavos, 200000);
  assert.equal(mensal[1].saldoFimDoMesCentavos, 450000); // 2500 + 2000 = 4500
});

/* ==========================================================================
 * 9. Datas inválidas e validação de entradas incorretas
 * ========================================================================== */
test('9. Validação de dados inválidos: valores zerados, negativos e datas incorretas', () => {
  assert.equal(isValidIsoDate('2026-11-15'), true);
  assert.equal(isValidIsoDate('2026-02-29'), false); // 2026 não é bissexto
  assert.equal(isValidIsoDate('15/11/2026'), false);
  assert.equal(isValidIsoDate('invalido'), false);

  // Lançamento com valor zero ou negativo
  assert.equal(
    calculateCashFlow({
      saldoInicial: 0,
      lancamentos: [{ id: 1, valor: 0, data: '2026-11-15' }]
    }).ok,
    false
  );

  assert.equal(
    calculateCashFlow({
      saldoInicial: 0,
      lancamentos: [{ id: 1, valor: -100, data: '2026-11-15' }]
    }).ok,
    false
  );

  // Lançamento com data inválida
  assert.equal(
    calculateCashFlow({
      saldoInicial: 0,
      lancamentos: [{ id: 1, valor: 50, data: '2026-13-45' }]
    }).ok,
    false
  );
});

/* ==========================================================================
 * 10. Reconciliação independente e exportação de texto
 * ========================================================================== */
test('10. Reconciliação independente do saldo final e texto para cópia', () => {
  const res = calculateCashFlow({
    saldoInicial: 1000,
    lancamentos: EXEMPLO_LANCAMENTOS
  });
  assert.equal(res.ok, true);

  // Validação independente da equação fundamental:
  // Saldo Projetado = Saldo Inicial + Total Entradas - Total Saídas
  const d = res.data;
  const reconciliado = d.saldoInicialCentavos + d.totalEntradasGeraisCentavos - d.totalSaidasGeraisCentavos;
  assert.equal(d.saldoProjetadoFinalCentavos, reconciliado);

  const copyText = buildCopyText(res);
  assert.match(copyText, /RESUMO DO FLUXO DE CAIXA EMPRESARIAL/);
  assert.match(copyText, /SALDO REALIZADO ATUAL/);
  assert.match(copyText, /SALDO PROJETADO FINAL/);
  assert.match(copyText, /Variação Líquida de Caixa do Período:/);

  const formatado = formatResult(res);
  assert.equal(formatado, copyText);
});

/* ==========================================================================
 * 11. Integração DOM via setupTool
 * ========================================================================== */
test('11. setupTool: Manipulação do DOM, adição, exclusão e reset', () => {
  const elements = {};
  function createMockElement(id, tagName = 'div', value = '') {
    return {
      id,
      tagName: tagName.toUpperCase(),
      value,
      textContent: '',
      innerHTML: '',
      hidden: false,
      attributes: {},
      children: [],
      setAttribute(k, v) { this.attributes[k] = v; },
      getAttribute(k) { return this.attributes[k]; },
      appendChild(c) { this.children.push(c); },
      focus() {},
      addEventListener() {}
    };
  }

  const ids = [
    'formSaldoInicial', 'saldoInicial', 'formLancamento', 'descricaoLancamento',
    'tipoLancamento', 'categoriaLancamento', 'valorLancamento', 'dataLancamento',
    'statusLancamento', 'btnAdicionarLancamento', 'btnLimparTudo', 'btnCarregarExemplo',
    'tabelaLancamentosCorpo', 'resultadoSecao', 'painelErros', 'toolActionsContainer',
    'resultadoSaldoRealizado', 'resultadoSaldoProjetado', 'resultadoEntradasRealizadas',
    'resultadoEntradasPrevistas', 'resultadoSaidasRealizadas', 'resultadoSaidasPrevistas',
    'resultadoVariacaoLiquidaCaixa', 'resultadoOperacionalPeriodo', 'painelAlertaNegativo', 'tabelaResumoMensalCorpo',
    'listaMemoriaCalculo', 'painelAvisos'
  ];

  for (const id of ids) {
    elements[id] = createMockElement(id);
  }

  const originalDocument = globalThis.document;
  const originalWindow = globalThis.window;

  globalThis.document = {
    getElementById: (id) => elements[id] || null,
    createElement: (tag) => createMockElement(`mock-${tag}-${Math.random()}`, tag)
  };
  globalThis.window = {
    location: { href: 'https://www.calculadoramaster.com/tools/financas/fluxo-de-caixa-empresarial.html' },
    print: () => {}
  };

  try {
    const controller = setupTool({ initialLancamentos: [] });
    assert.ok(controller, 'setupTool deve retornar o controlador');

    // Executa com caixa zerado
    const r1 = controller.executarCalculo();
    assert.equal(r1.ok, true);

    // Carrega exemplo didático
    controller.carregarExemplo();
    assert.equal(controller.getLancamentos().length, EXEMPLO_LANCAMENTOS.length);

    // Limpa tudo
    controller.limparTudo();
    assert.equal(controller.getLancamentos().length, 0);
  } finally {
    globalThis.document = originalDocument;
    globalThis.window = originalWindow;
  }
});

/* ==========================================================================
 * 12. Catálogo e Favoritos
 * ========================================================================== */
test('12. Catálogo e Favoritos: Integridade do cadastro oficial', () => {
  const toolsJsonPath = path.join(ROOT_DIR, 'data', 'tools.json');
  const tools = JSON.parse(fs.readFileSync(toolsJsonPath, 'utf-8'));
  const toolEntry = tools.find(t => t.id === 'fluxo-de-caixa-empresarial');

  assert.ok(toolEntry, 'fluxo-de-caixa-empresarial deve existir em data/tools.json');
  assert.equal(toolEntry.categorySlug, 'financas');
  assert.equal(toolEntry.status, 'published');
  assert.equal(toolEntry.formulaStatus, 'verified');
  assert.equal(toolEntry.implementation, 'factory');
  assert.equal(toolEntry.url, '/tools/financas/fluxo-de-caixa-empresarial.html');

  assert.ok(VALID_TOOL_IDS.has('fluxo-de-caixa-empresarial'), 'fluxo-de-caixa-empresarial deve constar em VALID_TOOL_IDS');
});
