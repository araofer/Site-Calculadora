import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  parseMoneyToCents,
  parsePercent,
  formatCurrency,
  formatPercent,
  calculateEffectiveMonthlyRate,
  calculateRentVsBuy,
  formatResult,
  buildCopyText,
  setupTool,
  SISTEMAS_AMORTIZACAO,
  LIMITE_MAXIMO_ANOS_FINANCIAMENTO,
  LIMITE_MAXIMO_ANOS_COMPARACAO
} from '../js/tools/comprar-ou-alugar-imovel.js';

import { VALID_TOOL_IDS } from '../js/core/favorites.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

/* ==========================================================================
 * 1. Compra à vista, sem financiamento
 * ========================================================================== */
test('1. Compra à vista: entrada igual ao valor do imóvel, sem dívida e sem juros', () => {
  const res = calculateRentVsBuy({
    precoImovel: 500000,
    valorEntrada: 500000,
    custosAquisicaoPerc: 4,
    custoVendaPerc: 5,
    prazoFinanciamentoAnos: 30,
    taxaJurosAnual: 10,
    aluguelMensal: 2500,
    despesasProprietario: 800,
    periodoAnos: 10,
    valorizacaoImovelAnual: 5,
    rentabilidadeInvestimentosAnual: 10
  });

  assert.equal(res.ok, true);
  assert.equal(res.data.compraAVista, true);
  assert.equal(res.data.financiadoCentavos, 0);
  assert.equal(res.data.saldoDevedorCentavos, 0);
  assert.equal(res.data.totalJurosCentavos, 0);
  assert.equal(res.data.totalPrestacoesCentavos, 0);
  assert.equal(res.data.desembolsoInicialCompradorCentavos, 52000000); // 500k + 4% (20k)
  assert.equal(res.data.saldoInvestimentoLocatarioCentavos > 52000000, true);
});

/* ==========================================================================
 * 2. Entrada zero e financiamento integral
 * ========================================================================== */
test('2. Entrada zero e financiamento integral: 100% financiado com custos de aquisição', () => {
  const res = calculateRentVsBuy({
    precoImovel: 300000,
    valorEntrada: 0,
    custosAquisicaoPerc: 3,
    custoVendaPerc: 5,
    prazoFinanciamentoAnos: 20,
    taxaJurosAnual: 9,
    sistemaAmortizacao: SISTEMAS_AMORTIZACAO.SAC,
    aluguelMensal: 1800,
    periodoAnos: 5
  });

  assert.equal(res.ok, true);
  assert.equal(res.data.entradaCentavos, 0);
  assert.equal(res.data.financiadoCentavos, 30000000);
  assert.equal(res.data.desembolsoInicialCompradorCentavos, 900000); // Apenas os 3% de aquisição (R$ 9.000)
  assert.ok(res.data.primeiraPrestacaoCentavos > 0);
  assert.ok(res.data.saldoDevedorCentavos > 0);
});

/* ==========================================================================
 * 3. Entrada igual ou superior ao preço do imóvel
 * ========================================================================== */
test('3. Entrada igual ou superior ao preço: normalizada para compra à vista (100%)', () => {
  const res = calculateRentVsBuy({
    precoImovel: 400000,
    valorEntrada: 450000, // Maior que o preço
    aluguelMensal: 2000
  });

  assert.equal(res.ok, true);
  assert.equal(res.data.entradaCentavos, 40000000);
  assert.equal(res.data.financiadoCentavos, 0);
  assert.equal(res.data.compraAVista, true);
  assert.ok(res.warnings.some(w => w.includes('ajustado para 100%')));
});

/* ==========================================================================
 * 4. Taxa de juros zero (0% a.a.)
 * ========================================================================== */
test('4. Taxa de juros zero: financiamento puro sem incidência de juros', () => {
  const res = calculateRentVsBuy({
    precoImovel: 240000,
    valorEntrada: 0,
    custosAquisicaoPerc: 0,
    custoVendaPerc: 0,
    prazoFinanciamentoAnos: 20, // 240 meses
    taxaJurosAnual: 0,
    sistemaAmortizacao: SISTEMAS_AMORTIZACAO.SAC,
    custoMensalFinanciamento: 0,
    aluguelMensal: 1000,
    despesasProprietario: 0,
    periodoAnos: 20,
    valorizacaoImovelAnual: 0,
    rentabilidadeInvestimentosAnual: 0
  });

  assert.equal(res.ok, true);
  assert.equal(res.data.totalJurosCentavos, 0);
  // 240.000 / 240 meses = R$ 1.000/mês
  assert.equal(res.data.primeiraPrestacaoCentavos, 100000);
  assert.equal(res.data.saldoDevedorCentavos, 0);
  assert.equal(res.data.totalPrestacoesCentavos, 24000000);
});

/* ==========================================================================
 * 5. Comparação entre Sistemas Price e SAC
 * ========================================================================== */
test('5. Sistemas Price e SAC: SAC tem primeira parcela maior e decrescente, Price parcela constante', () => {
  const baseInput = {
    precoImovel: 500000,
    valorEntrada: 100000,
    custosAquisicaoPerc: 0,
    custoVendaPerc: 0,
    prazoFinanciamentoAnos: 30,
    taxaJurosAnual: 10,
    aluguelMensal: 2500,
    periodoAnos: 30,
    valorizacaoImovelAnual: 0,
    rentabilidadeInvestimentosAnual: 0
  };

  const resSac = calculateRentVsBuy({ ...baseInput, sistemaAmortizacao: SISTEMAS_AMORTIZACAO.SAC });
  const resPrice = calculateRentVsBuy({ ...baseInput, sistemaAmortizacao: SISTEMAS_AMORTIZACAO.PRICE });

  assert.equal(resSac.ok, true);
  assert.equal(resPrice.ok, true);

  // Primeira parcela do SAC é maior que a da Tabela Price
  assert.ok(resSac.data.primeiraPrestacaoCentavos > resPrice.data.primeiraPrestacaoCentavos);
  // Última parcela do SAC é menor que a da Tabela Price
  assert.ok(resSac.data.ultimaPrestacaoFinanciamentoCentavos < resPrice.data.ultimaPrestacaoFinanciamentoCentavos);
  // Ambos quitam a dívida no final do prazo
  assert.equal(resSac.data.saldoDevedorCentavos, 0);
  assert.equal(resPrice.data.saldoDevedorCentavos, 0);
});

/* ==========================================================================
 * 6. Período de comparação inferior ao prazo do financiamento
 * ========================================================================== */
test('6. Período de comparação inferior ao financiamento: apura saldo devedor restante', () => {
  const res = calculateRentVsBuy({
    precoImovel: 600000,
    valorEntrada: 120000,
    prazoFinanciamentoAnos: 30, // 360 meses
    taxaJurosAnual: 10,
    sistemaAmortizacao: SISTEMAS_AMORTIZACAO.SAC,
    aluguelMensal: 3000,
    periodoAnos: 10 // Apenas 120 meses simulados
  });

  assert.equal(res.ok, true);
  assert.ok(res.data.saldoDevedorCentavos > 0, 'Deve restar saldo devedor ao final de 10 anos');
  // No SAC de 30 anos (360 meses), após 120 meses amortizou 1/3 da dívida, restam 2/3 de R$ 480.000 = R$ 320.000
  const financiadoCentavos = 48000000;
  const saldoEsperado = Math.round(financiadoCentavos * (240 / 360));
  assert.ok(Math.abs(res.data.saldoDevedorCentavos - saldoEsperado) <= 100);
});

/* ==========================================================================
 * 7. Período de comparação igual ao prazo do financiamento
 * ========================================================================== */
test('7. Período de comparação igual ao prazo do financiamento: quitação completa da dívida', () => {
  const res = calculateRentVsBuy({
    precoImovel: 300000,
    valorEntrada: 60000,
    prazoFinanciamentoAnos: 15,
    taxaJurosAnual: 9,
    sistemaAmortizacao: SISTEMAS_AMORTIZACAO.SAC,
    aluguelMensal: 1500,
    periodoAnos: 15
  });

  assert.equal(res.ok, true);
  assert.equal(res.data.saldoDevedorCentavos, 0, 'Dívida deve ser exatamente 0 ao fim do prazo');
});

/* ==========================================================================
 * 8. Período de comparação superior ao prazo do financiamento
 * ========================================================================== */
test('8. Período de comparação superior ao financiamento: parcelas cessam e comprador investe diferença', () => {
  const res = calculateRentVsBuy({
    precoImovel: 200000,
    valorEntrada: 50000,
    prazoFinanciamentoAnos: 10, // Financiamento acaba no ano 10
    taxaJurosAnual: 8,
    aluguelMensal: 2000,
    reajusteAluguelAnual: 5,
    despesasProprietario: 400,
    reajusteDespesasAnual: 5,
    periodoAnos: 20, // Comparação vai até o ano 20
    rentabilidadeInvestimentosAnual: 10
  });

  assert.equal(res.ok, true);
  assert.equal(res.data.saldoDevedorCentavos, 0);
  // Entre anos 11 e 20 o comprador não paga mais financiamento e aluguel continua subindo: comprador deve acumular investimentos expressivos
  assert.ok(res.data.saldoInvestimentoCompradorCentavos > 0);
});

/* ==========================================================================
 * 9. Aluguel sem reajuste vs com reajuste
 * ========================================================================== */
test('9. Aluguel sem reajuste vs com reajuste: reajuste eleva custo do locatário e patrimônio do comprador', () => {
  const paramsSemReajuste = {
    precoImovel: 400000,
    valorEntrada: 80000,
    aluguelMensal: 2000,
    reajusteAluguelAnual: 0,
    periodoAnos: 10
  };
  const paramsComReajuste = {
    ...paramsSemReajuste,
    reajusteAluguelAnual: 6
  };

  const resSem = calculateRentVsBuy(paramsSemReajuste);
  const resCom = calculateRentVsBuy(paramsComReajuste);

  assert.equal(resSem.ok, true);
  assert.equal(resCom.ok, true);
  assert.ok(resCom.data.totalAluguelCentavos > resSem.data.totalAluguelCentavos);
});

/* ==========================================================================
 * 10. Valorização zero do imóvel
 * ========================================================================== */
test('10. Valorização zero: valor final do imóvel é exatamente igual ao valor de compra inicial', () => {
  const res = calculateRentVsBuy({
    precoImovel: 500000,
    valorEntrada: 100000,
    valorizacaoImovelAnual: 0,
    custoVendaPerc: 0,
    periodoAnos: 10
  });

  assert.equal(res.ok, true);
  assert.equal(res.data.valorImovelFinalCentavos, 50000000);
});

/* ==========================================================================
 * 11. Rentabilidade de investimento zero
 * ========================================================================== */
test('11. Rentabilidade de investimentos zero: carteiras não rendem juros, acumulam apenas aportes nominais', () => {
  const res = calculateRentVsBuy({
    precoImovel: 300000,
    valorEntrada: 60000,
    custosAquisicaoPerc: 4,
    aluguelMensal: 1500,
    periodoAnos: 5,
    rentabilidadeInvestimentosAnual: 0
  });

  assert.equal(res.ok, true);
  assert.equal(res.data.totalRendimentosCompradorCentavos, 0);
  assert.equal(res.data.totalRendimentosLocatarioCentavos, 0);
  assert.equal(res.data.saldoInvestimentoLocatarioCentavos, res.data.totalAportesLocatarioCentavos);
});

/* ==========================================================================
 * 12. Custos de aquisição e venda iguais a zero
 * ========================================================================== */
test('12. Custos de aquisição e venda iguais a zero: sem atrito de transação imobiliária', () => {
  const res = calculateRentVsBuy({
    precoImovel: 400000,
    valorEntrada: 80000,
    custosAquisicaoPerc: 0,
    custoVendaPerc: 0,
    periodoAnos: 5
  });

  assert.equal(res.ok, true);
  assert.equal(res.data.custosAquisicaoCentavos, 0);
  assert.equal(res.data.custoVendaFinalCentavos, 0);
  assert.equal(res.data.desembolsoInicialCompradorCentavos, 8000000);
});

/* ==========================================================================
 * 13. Manipulação de moedas com centavos e arredondamentos consistentes
 * ========================================================================== */
test('13. Formatação monetária com centavos inteiros via parseMoneyToCents', () => {
  assert.equal(parseMoneyToCents('R$ 1.234.567,89'), 123456789);
  assert.equal(parseMoneyToCents('1234567.89'), 123456789);
  assert.equal(parseMoneyToCents('0,01'), 1);
  assert.equal(parseMoneyToCents(500000), 50000000);
  assert.equal(parseMoneyToCents(''), 0);
  assert.equal(parseMoneyToCents(null), 0);
  assert.equal(parseMoneyToCents('-10,00'), -1000);
});

/* ==========================================================================
 * 14. Validação de entradas inválidas e limites de campos
 * ========================================================================== */
test('14. Validação e rejeição de entradas inválidas, prazos negativos e limites', () => {
  // Preço zero ou negativo
  assert.equal(calculateRentVsBuy({ precoImovel: 0 }).ok, false);
  assert.equal(calculateRentVsBuy({ precoImovel: -500 }).ok, false);

  // Entrada negativa
  assert.equal(calculateRentVsBuy({ precoImovel: 100000, valorEntrada: -100 }).ok, false);

  // Prazo de financiamento fora dos limites (1 a 40 anos)
  assert.equal(calculateRentVsBuy({ precoImovel: 100000, prazoFinanciamentoAnos: 0 }).ok, false);
  assert.equal(calculateRentVsBuy({ precoImovel: 100000, prazoFinanciamentoAnos: 45 }).ok, false);

  // Período de comparação fora dos limites (1 a 50 anos)
  assert.equal(calculateRentVsBuy({ precoImovel: 100000, periodoAnos: 0 }).ok, false);
  assert.equal(calculateRentVsBuy({ precoImovel: 100000, periodoAnos: 55 }).ok, false);

  // Aluguel negativo
  assert.equal(calculateRentVsBuy({ precoImovel: 100000, aluguelMensal: -100 }).ok, false);
});

/* ==========================================================================
 * 15. Caso de referência calculado independentemente
 * ========================================================================== */
test('15. Caso de referência calculado independentemente para conferência de patrimônio', () => {
  // Imóvel de R$ 100.000 à vista (sem dívida)
  // Sem custos de aquisição ou venda
  // Valorização: 0% a.a. -> Imóvel final = R$ 100.000
  // Despesas proprietário: R$ 0
  // Aluguel: R$ 1.000/mês sem reajuste
  // Período: 1 ano (12 meses)
  // Rentabilidade investimentos: 0% a.a.
  // Locatário inicia com R$ 100.000 investidos.
  // Mês a mês:
  // Custo habitacional comprador = 0.
  // Custo habitacional locatário = R$ 1.000.
  // Comprador é R$ 1.000 mais barato por mês -> comprador investe R$ 1.000/mês.
  // Ao final de 12 meses:
  // Comprador possui: Imóvel (R$ 100.000) + 12 * R$ 1.000 (R$ 12.000 em investimentos) = R$ 112.000.
  // Locatário possui: R$ 100.000 iniciais + 0 aportes = R$ 100.000.
  // Diferença exata a favor do comprador = R$ 12.000,00!
  const res = calculateRentVsBuy({
    precoImovel: 100000,
    valorEntrada: 100000,
    custosAquisicaoPerc: 0,
    custoVendaPerc: 0,
    despesasProprietario: 0,
    aluguelMensal: 1000,
    reajusteAluguelAnual: 0,
    despesasInquilino: 0,
    periodoAnos: 1,
    valorizacaoImovelAnual: 0,
    rentabilidadeInvestimentosAnual: 0
  });

  assert.equal(res.ok, true);
  assert.equal(res.data.patrimonioLiquidoCompradorCentavos, 11200000); // R$ 112.000,00
  assert.equal(res.data.patrimonioLiquidoLocatarioCentavos, 10000000); // R$ 100.000,00
  assert.equal(res.data.diferencaCentavos, 1200000); // R$ 12.000,00
  assert.equal(res.data.melhorOpcao, 'comprar');
});

/* ==========================================================================
 * 16. buildCopyText e formatResult estruturados sem undefined
 * ========================================================================== */
test('16. buildCopyText e formatResult: sem placeholders undefined nem null', () => {
  const res = calculateRentVsBuy({
    precoImovel: 450000,
    valorEntrada: 90000,
    aluguelMensal: 2200
  });

  const texto = buildCopyText(res);
  assert.match(texto, /SIMULAÇÃO: COMPRAR OU ALUGAR IMÓVEL/);
  assert.match(texto, /Patrimônio Líquido do Comprador:/);
  assert.match(texto, /Patrimônio Líquido do Locatário:/);
  assert.doesNotMatch(texto, /\b(undefined|null|NaN)\b/);

  const secoes = formatResult(res);
  assert.ok(secoes.length > 5);
  secoes.forEach(s => {
    assert.doesNotMatch(s.value, /\b(undefined|null|NaN)\b/);
  });
});

/* ==========================================================================
 * 17. Integração com DOM via setupTool e Limpeza de Campos
 * ========================================================================== */
class MockElement {
  constructor(tagName = 'div') {
    this.tagName = tagName.toUpperCase();
    this.children = [];
    this.listeners = {};
    this.attributes = {};
    this.parentNode = null;
    this.className = '';
    this.textContent = '';
    this.innerHTML = '';
    this.value = '';
    this.hidden = false;
  }
  append(...children) {
    children.forEach(c => {
      if (c) {
        c.parentNode = this;
        this.children.push(c);
      }
    });
  }
  appendChild(c) {
    if (c) {
      c.parentNode = this;
      this.children.push(c);
    }
    return c;
  }
  setAttribute(k, v) { this.attributes[k] = String(v); }
  getAttribute(k) { return this.attributes[k] ?? null; }
  addEventListener(ev, fn) { (this.listeners[ev] ||= []).push(fn); }
  querySelectorAll(sel) {
    const res = [];
    const walk = (node) => {
      for (const ch of node.children) {
        if (sel.startsWith('.') && ch.className?.split(' ').includes(sel.slice(1))) res.push(ch);
        else if (sel.startsWith('#') && ch.id === sel.slice(1)) res.push(ch);
        else if (ch.tagName === sel.toUpperCase()) res.push(ch);
        walk(ch);
      }
    };
    walk(this);
    return res;
  }
  querySelector(sel) { return this.querySelectorAll(sel)[0] || null; }
  reset() {}
  focus() {}
}

test('17. setupTool: inicializa eventos DOM, executa cálculo e limpa campos', () => {
  const prevDoc = globalThis.document;
  const prevWin = globalThis.window;

  try {
    const reg = new Map();
    const getOrCreate = (id, tag = 'div') => {
      if (!reg.has(id)) {
        const el = new MockElement(tag);
        el.id = id;
        reg.set(id, el);
      }
      return reg.get(id);
    };

    const form = getOrCreate('formComprarOuAlugar', 'form');
    const preco = getOrCreate('precoImovel', 'input');
    preco.value = '500.000,00';
    const entrada = getOrCreate('valorEntrada', 'input');
    entrada.value = '100.000,00';
    const percEntrada = getOrCreate('percEntrada', 'input');
    percEntrada.value = '20,0';
    const aluguel = getOrCreate('aluguelMensal', 'input');
    aluguel.value = '2.500,00';

    const btnCalc = getOrCreate('btnCalcularComprarAlugar', 'button');
    const btnLimpar = getOrCreate('btnLimparComprarAlugar', 'button');
    const erro = getOrCreate('erroComprarOuAlugar', 'p');
    const resSecao = getOrCreate('resultadoComprarOuAlugar', 'section');

    const resVencedor = getOrCreate('resTituloVencedor', 'p');
    const resDiferenca = getOrCreate('resDiferenca', 'strong');
    const resBadge = getOrCreate('resBadgeOpcao', 'span');
    const resPlComp = getOrCreate('resPlCompradorDestaque', 'p');
    const resPlLoc = getOrCreate('resPlLocatarioDestaque', 'p');

    const wrapCron = getOrCreate('wrapperCronogramaComprarAlugar', 'div');
    const tabCron = getOrCreate('tabelaCronogramaComprarAlugar', 'table');
    tabCron.append(new MockElement('tbody'));

    const memoria = getOrCreate('memoriaCalculoComprarAlugar', 'ul');
    const avisos = getOrCreate('avisosComprarAlugar', 'div');
    const statusAcoes = getOrCreate('statusAcoesComprarAlugar', 'p');

    globalThis.document = { createElement: (tag) => new MockElement(tag) };
    globalThis.window = { location: { href: 'https://www.calculadoramaster.com/tools/financas/comprar-ou-alugar-imovel.html' } };

    const mockRoot = {
      querySelector: (sel) => {
        const id = sel.replace(/^[#.]/, '');
        return reg.get(id) || null;
      },
      querySelectorAll: (sel) => {
        const el = mockRoot.querySelector(sel);
        return el ? [el] : [];
      }
    };

    const tool = setupTool(mockRoot);
    assert.ok(tool);

    const res = tool.executarCalculo();
    assert.equal(res.ok, true);
    assert.equal(resSecao.hidden, false);
    assert.ok(resVencedor.textContent.length > 0);

    // Botão limpar
    btnLimpar.listeners['click'][0]();
    assert.equal(resSecao.hidden, true);
  } finally {
    if (prevDoc === undefined) delete globalThis.document; else globalThis.document = prevDoc;
    if (prevWin === undefined) delete globalThis.window; else globalThis.window = prevWin;
  }
});

/* ==========================================================================
 * 18. Conformidade Semântica, Acessibilidade e Ausência de Estilos Inline no HTML
 * ========================================================================== */
test('18. Página HTML segue padrões semânticos, sem inline style e sem br', () => {
  const pagePath = path.join(ROOT_DIR, 'src', 'pages', 'tools', 'financas', 'comprar-ou-alugar-imovel.page.html');
  assert.ok(fs.existsSync(pagePath), 'comprar-ou-alugar-imovel.page.html deve existir');

  const content = fs.readFileSync(pagePath, 'utf-8');
  assert.match(content, /layout:\s*tool/);
  assert.match(content, /id="formComprarOuAlugar"/);
  assert.match(content, /id="resultadoComprarOuAlugar"/);
  assert.match(content, /role="alert"/);
  assert.match(content, /aria-live="polite"/);

  assert.doesNotMatch(content, /<br\s*\/?\s*>/i, 'Não deve conter tags <br>');
  assert.doesNotMatch(content, /style="/i, 'Não deve conter atributo style inline');
});

/* ==========================================================================
 * 19. ID no conjunto de ferramentas válidas para favoritos
 * ========================================================================== */
test('19. ID comprar-ou-alugar-imovel consta no conjunto de ferramentas válidas para favoritos', () => {
  assert.ok(VALID_TOOL_IDS.has('comprar-ou-alugar-imovel'), 'VALID_TOOL_IDS deve conter comprar-ou-alugar-imovel');
});

/* ==========================================================================
 * AUDITORIA FINAL — AMORTIZAÇÃO SAC E PRICE, ARREDONDAMENTO E QUITAÇÃO (12 CENÁRIOS)
 * ========================================================================== */

// Função de referência independente sem acoplamento à implementação sob teste
function calcularFinanciamentoReferenciaIndependente(principalCentavos, prazoMeses, simularMeses, taxaAnualPercentual, sistema) {
  const i = taxaAnualPercentual > 0 ? Math.pow(1 + taxaAnualPercentual / 100, 1 / 12) - 1 : 0;
  let saldo = principalCentavos;
  let pmtPrice = 0;
  let amortSacBase = 0;

  if (sistema === 'price') {
    if (i === 0) {
      pmtPrice = Math.ceil(principalCentavos / prazoMeses);
    } else {
      const fator = (i * Math.pow(1 + i, prazoMeses)) / (Math.pow(1 + i, prazoMeses) - 1);
      pmtPrice = Math.round(principalCentavos * fator);
    }
  } else {
    amortSacBase = Math.floor(principalCentavos / prazoMeses);
  }

  let totalAmort = 0;
  let totalJuros = 0;
  const mesesExecutar = Math.min(prazoMeses, simularMeses);

  for (let m = 1; m <= mesesExecutar; m++) {
    if (saldo <= 0) break;
    const juros = i > 0 ? Math.round(saldo * i) : 0;
    let amort = 0;

    if (sistema === 'price') {
      const amortTeorica = Math.max(0, pmtPrice - juros);
      if (m === prazoMeses || amortTeorica >= saldo) {
        amort = saldo;
      } else {
        amort = amortTeorica;
      }
    } else {
      if (m === prazoMeses) {
        amort = saldo;
      } else {
        amort = Math.min(saldo, amortSacBase);
      }
    }

    saldo = Math.max(0, saldo - amort);
    totalAmort += amort;
    totalJuros += juros;
  }

  return { saldo, totalAmort, totalJuros };
}

test('20. Auditoria 1 — Principal indivisível exatamente pelo prazo em centavos: quitação exata em centavos (SAC e Price)', () => {
  // R$ 100.000,00 financiado em 30 anos (360 meses)
  // 10.000.000 / 360 = 27.777,777... centavos. Amortização base SAC = 27.777 centavos.
  // 359 meses * 27.777 = 9.971.943 centavos. Resíduo de amortização na última parcela = 28.057 centavos.
  const baseInput = {
    precoImovel: 100000,
    valorEntrada: 0,
    prazoFinanciamentoAnos: 30,
    periodoAnos: 30,
    taxaJurosAnual: 9.5,
    custoMensalFinanciamento: 0,
    aluguelMensal: 600
  };

  const resSac = calculateRentVsBuy({ ...baseInput, sistemaAmortizacao: SISTEMAS_AMORTIZACAO.SAC });
  assert.equal(resSac.ok, true);
  assert.equal(resSac.data.financiadoCentavos, 10000000);
  assert.equal(resSac.data.totalAmortizacaoCentavos, 10000000, 'SAC deve amortizar exatamente 100% do principal financiado');
  assert.equal(resSac.data.saldoDevedorCentavos, 0, 'SAC deve zerar saldo devedor sem deixar resíduo de centavos');
  assert.equal(resSac.data.totalPrestacoesCentavos - resSac.data.totalJurosCentavos, 10000000);

  const resPrice = calculateRentVsBuy({ ...baseInput, sistemaAmortizacao: SISTEMAS_AMORTIZACAO.PRICE });
  assert.equal(resPrice.ok, true);
  assert.equal(resPrice.data.financiadoCentavos, 10000000);
  assert.equal(resPrice.data.totalAmortizacaoCentavos, 10000000, 'Price deve amortizar exatamente 100% do principal financiado');
  assert.equal(resPrice.data.saldoDevedorCentavos, 0, 'Price deve zerar saldo devedor sem deixar resíduo de centavos');
  assert.equal(resPrice.data.totalPrestacoesCentavos - resPrice.data.totalJurosCentavos, 10000000);
});

test('21. Auditoria 2 — Taxa de juros zero: ausência de juros e amortização integral pura (SAC e Price)', () => {
  const baseInput = {
    precoImovel: 120000,
    valorEntrada: 0,
    prazoFinanciamentoAnos: 10, // 120 meses
    periodoAnos: 10,
    taxaJurosAnual: 0,
    custoMensalFinanciamento: 0,
    aluguelMensal: 800
  };

  const resSac = calculateRentVsBuy({ ...baseInput, sistemaAmortizacao: SISTEMAS_AMORTIZACAO.SAC });
  assert.equal(resSac.ok, true);
  assert.equal(resSac.data.totalJurosCentavos, 0, 'SAC a juros zero não pode cobrar juros');
  assert.equal(resSac.data.totalAmortizacaoCentavos, 12000000);
  assert.equal(resSac.data.totalPrestacoesCentavos, 12000000);
  assert.equal(resSac.data.saldoDevedorCentavos, 0);
  assert.equal(resSac.data.primeiraPrestacaoCentavos, 100000); // R$ 1.000,00
  assert.equal(resSac.data.ultimaPrestacaoFinanciamentoCentavos, 100000);

  const resPrice = calculateRentVsBuy({ ...baseInput, sistemaAmortizacao: SISTEMAS_AMORTIZACAO.PRICE });
  assert.equal(resPrice.ok, true);
  assert.equal(resPrice.data.totalJurosCentavos, 0, 'Price a juros zero não pode cobrar juros');
  assert.equal(resPrice.data.totalAmortizacaoCentavos, 12000000);
  assert.equal(resPrice.data.totalPrestacoesCentavos, 12000000);
  assert.equal(resPrice.data.saldoDevedorCentavos, 0);
  assert.equal(resPrice.data.primeiraPrestacaoCentavos, 100000); // R$ 1.000,00
  assert.equal(resPrice.data.ultimaPrestacaoFinanciamentoCentavos, 100000);
});

test('22. Auditoria 3 — Principal pequeno com prazo longo: quitação exata sem resíduo nem saldo negativo (SAC e Price)', () => {
  // Principal R$ 500,00 (50.000 centavos) financiado em 30 anos (360 meses)
  const baseInput = {
    precoImovel: 500,
    valorEntrada: 0,
    prazoFinanciamentoAnos: 30,
    periodoAnos: 30,
    taxaJurosAnual: 9,
    custoMensalFinanciamento: 0,
    aluguelMensal: 50
  };

  const resSac = calculateRentVsBuy({ ...baseInput, sistemaAmortizacao: SISTEMAS_AMORTIZACAO.SAC });
  assert.equal(resSac.ok, true);
  assert.equal(resSac.data.financiadoCentavos, 50000);
  assert.equal(resSac.data.totalAmortizacaoCentavos, 50000);
  assert.equal(resSac.data.saldoDevedorCentavos, 0);
  assert.equal(resSac.data.totalPrestacoesCentavos - resSac.data.totalJurosCentavos, 50000);

  const resPrice = calculateRentVsBuy({ ...baseInput, sistemaAmortizacao: SISTEMAS_AMORTIZACAO.PRICE });
  assert.equal(resPrice.ok, true);
  assert.equal(resPrice.data.financiadoCentavos, 50000);
  assert.equal(resPrice.data.totalAmortizacaoCentavos, 50000);
  assert.equal(resPrice.data.saldoDevedorCentavos, 0);
  assert.equal(resPrice.data.totalPrestacoesCentavos - resPrice.data.totalJurosCentavos, 50000);
});

test('23. Auditoria 4 — Principal elevado com prazo longo: precisão em centavos sem estouro numérico (SAC e Price)', () => {
  // Principal R$ 10.000.000,00 (1 bilhão de centavos) financiado em 35 anos (420 meses) a 12% a.a.
  const baseInput = {
    precoImovel: 10000000,
    valorEntrada: 0,
    prazoFinanciamentoAnos: 35,
    periodoAnos: 35,
    taxaJurosAnual: 12,
    custoMensalFinanciamento: 100,
    aluguelMensal: 40000
  };

  const resSac = calculateRentVsBuy({ ...baseInput, sistemaAmortizacao: SISTEMAS_AMORTIZACAO.SAC });
  assert.equal(resSac.ok, true);
  assert.equal(resSac.data.financiadoCentavos, 1000000000);
  assert.equal(resSac.data.totalAmortizacaoCentavos, 1000000000);
  assert.equal(resSac.data.saldoDevedorCentavos, 0);
  assert.ok(Number.isSafeInteger(resSac.data.totalPrestacoesCentavos));

  const resPrice = calculateRentVsBuy({ ...baseInput, sistemaAmortizacao: SISTEMAS_AMORTIZACAO.PRICE });
  assert.equal(resPrice.ok, true);
  assert.equal(resPrice.data.financiadoCentavos, 1000000000);
  assert.equal(resPrice.data.totalAmortizacaoCentavos, 1000000000);
  assert.equal(resPrice.data.saldoDevedorCentavos, 0);
  assert.ok(Number.isSafeInteger(resPrice.data.totalPrestacoesCentavos));
});

test('24. Auditoria 5 — Taxa positiva com juros mensais arredondados em centavos (SAC e Price)', () => {
  const baseInput = {
    precoImovel: 300000,
    valorEntrada: 0,
    prazoFinanciamentoAnos: 20, // 240 meses
    periodoAnos: 20,
    taxaJurosAnual: 9.5,
    custoMensalFinanciamento: 25,
    aluguelMensal: 1500
  };

  const custoTotalBancarioCentavos = 240 * 2500; // 240 meses * R$ 25,00

  const resSac = calculateRentVsBuy({ ...baseInput, sistemaAmortizacao: SISTEMAS_AMORTIZACAO.SAC });
  assert.equal(resSac.ok, true);
  assert.equal(resSac.data.totalAmortizacaoCentavos, 30000000);
  assert.equal(resSac.data.saldoDevedorCentavos, 0);
  assert.equal(
    resSac.data.totalPrestacoesCentavos,
    resSac.data.totalAmortizacaoCentavos + resSac.data.totalJurosCentavos + custoTotalBancarioCentavos
  );

  const resPrice = calculateRentVsBuy({ ...baseInput, sistemaAmortizacao: SISTEMAS_AMORTIZACAO.PRICE });
  assert.equal(resPrice.ok, true);
  assert.equal(resPrice.data.totalAmortizacaoCentavos, 30000000);
  assert.equal(resPrice.data.saldoDevedorCentavos, 0);
  assert.equal(
    resPrice.data.totalPrestacoesCentavos,
    resPrice.data.totalAmortizacaoCentavos + resPrice.data.totalJurosCentavos + custoTotalBancarioCentavos
  );
});

test('25. Auditoria 6 — Período de comparação menor que o prazo do financiamento: saldo remanescente sem quitação antecipada (SAC e Price)', () => {
  const baseInput = {
    precoImovel: 400000,
    valorEntrada: 0,
    prazoFinanciamentoAnos: 30, // 360 meses
    periodoAnos: 10, // 120 meses simulados
    taxaJurosAnual: 10,
    custoMensalFinanciamento: 0,
    aluguelMensal: 2000,
    valorizacaoImovelAnual: 5,
    custoVendaPerc: 5
  };

  const resSac = calculateRentVsBuy({ ...baseInput, sistemaAmortizacao: SISTEMAS_AMORTIZACAO.SAC });
  assert.equal(resSac.ok, true);
  assert.ok(resSac.data.saldoDevedorCentavos > 0, 'SAC não deve quitar antecipadamente se período < prazo');
  // Amortização mensal base = floor(40.000.000 / 360) = 111.111 centavos
  // Em 120 meses, amortizou 120 * 111.111 = 13.333.320 centavos. Saldo = 26.666.680 centavos.
  assert.equal(resSac.data.saldoDevedorCentavos, 26666680);
  assert.equal(
    resSac.data.patrimonioLiquidoImobiliarioCentavos,
    resSac.data.valorImovelFinalCentavos - resSac.data.custoVendaFinalCentavos - resSac.data.saldoDevedorCentavos,
    'Saldo devedor restante deve abater exatamente o patrimônio líquido imobiliário no SAC'
  );

  const resPrice = calculateRentVsBuy({ ...baseInput, sistemaAmortizacao: SISTEMAS_AMORTIZACAO.PRICE });
  assert.equal(resPrice.ok, true);
  assert.ok(resPrice.data.saldoDevedorCentavos > 0, 'Price não deve quitar antecipadamente se período < prazo');
  assert.equal(resPrice.data.saldoDevedorCentavos, 36124566);
  assert.equal(
    resPrice.data.patrimonioLiquidoImobiliarioCentavos,
    resPrice.data.valorImovelFinalCentavos - resPrice.data.custoVendaFinalCentavos - resPrice.data.saldoDevedorCentavos,
    'Saldo devedor restante deve abater exatamente o patrimônio líquido imobiliário no Price'
  );
});

test('26. Auditoria 7 — Período de comparação exatamente igual ao prazo do financiamento: quitação exata (SAC e Price)', () => {
  const baseInput = {
    precoImovel: 250000,
    valorEntrada: 50000,
    prazoFinanciamentoAnos: 20, // 240 meses
    periodoAnos: 20,
    taxaJurosAnual: 8.5,
    aluguelMensal: 1400
  };

  const resSac = calculateRentVsBuy({ ...baseInput, sistemaAmortizacao: SISTEMAS_AMORTIZACAO.SAC });
  assert.equal(resSac.ok, true);
  assert.equal(resSac.data.saldoDevedorCentavos, 0, 'SAC deve ter saldo devedor zero no prazo exato');
  assert.equal(resSac.data.totalAmortizacaoCentavos, 20000000);
  assert.equal(
    resSac.data.patrimonioLiquidoImobiliarioCentavos,
    resSac.data.valorImovelFinalCentavos - resSac.data.custoVendaFinalCentavos
  );

  const resPrice = calculateRentVsBuy({ ...baseInput, sistemaAmortizacao: SISTEMAS_AMORTIZACAO.PRICE });
  assert.equal(resPrice.ok, true);
  assert.equal(resPrice.data.saldoDevedorCentavos, 0, 'Price deve ter saldo devedor zero no prazo exato');
  assert.equal(resPrice.data.totalAmortizacaoCentavos, 20000000);
  assert.equal(
    resPrice.data.patrimonioLiquidoImobiliarioCentavos,
    resPrice.data.valorImovelFinalCentavos - resPrice.data.custoVendaFinalCentavos
  );
});

test('27. Auditoria 8 — Período de comparação maior que o prazo do financiamento: cessação de parcelas bancárias e continuidade de custos de moradia (SAC e Price)', () => {
  const baseInput = {
    precoImovel: 200000,
    valorEntrada: 40000,
    prazoFinanciamentoAnos: 15, // Financiamento acaba em 180 meses
    periodoAnos: 25, // Comparação dura 300 meses
    taxaJurosAnual: 9,
    custoMensalFinanciamento: 30,
    despesasProprietario: 500,
    aluguelMensal: 1800,
    rentabilidadeInvestimentosAnual: 8
  };

  for (const sistema of [SISTEMAS_AMORTIZACAO.SAC, SISTEMAS_AMORTIZACAO.PRICE]) {
    const res = calculateRentVsBuy({ ...baseInput, sistemaAmortizacao: sistema });
    assert.equal(res.ok, true);
    assert.equal(res.data.saldoDevedorCentavos, 0);
    assert.equal(res.data.totalAmortizacaoCentavos, 16000000);

    // O cronograma no ano 15 deve ter saldo 0, e nos anos 16 a 25 prestacaoMes deve ser 0
    const cronograma = res.data.cronogramaAnual;
    const ano15 = cronograma.find(c => c.ano === 15);
    const ano20 = cronograma.find(c => c.ano === 20);
    const ano25 = cronograma.find(c => c.ano === 25);

    assert.equal(ano15.saldoDevedor, 0);
    assert.equal(ano20.saldoDevedor, 0);
    assert.equal(ano20.prestacaoMes, 0);
    assert.equal(ano25.saldoDevedor, 0);
    assert.equal(ano25.prestacaoMes, 0);

    // Comprador deve ter acumulado investimentos substanciais após quitar a dívida e continuar investindo a diferença
    assert.ok(res.data.saldoInvestimentoCompradorCentavos > 0);
  }
});

test('28. Auditoria 9 — Compra à vista sem financiamento (SAC e Price)', () => {
  const baseInput = {
    precoImovel: 600000,
    valorEntrada: 600000,
    prazoFinanciamentoAnos: 30,
    periodoAnos: 15,
    aluguelMensal: 3000
  };

  for (const sistema of [SISTEMAS_AMORTIZACAO.SAC, SISTEMAS_AMORTIZACAO.PRICE]) {
    const res = calculateRentVsBuy({ ...baseInput, sistemaAmortizacao: sistema });
    assert.equal(res.ok, true);
    assert.equal(res.data.compraAVista, true);
    assert.equal(res.data.financiadoCentavos, 0);
    assert.equal(res.data.saldoDevedorCentavos, 0);
    assert.equal(res.data.totalJurosCentavos, 0);
    assert.equal(res.data.totalPrestacoesCentavos, 0);
    assert.equal(res.data.totalAmortizacaoCentavos, 0);
    assert.equal(res.data.primeiraPrestacaoCentavos, 0);
    assert.equal(res.data.ultimaPrestacaoFinanciamentoCentavos, 0);
  }
});

test('29. Auditoria 10 — Saldo devedor final rigorosamente igual a R$ 0,00 após término contratado em múltiplos prazos (SAC e Price)', () => {
  const prazosAnos = [1, 5, 10, 15, 20, 25, 30, 35, 40];

  for (const anos of prazosAnos) {
    for (const sistema of [SISTEMAS_AMORTIZACAO.SAC, SISTEMAS_AMORTIZACAO.PRICE]) {
      const res = calculateRentVsBuy({
        precoImovel: 350000,
        valorEntrada: 50000,
        prazoFinanciamentoAnos: anos,
        periodoAnos: anos,
        taxaJurosAnual: 10,
        sistemaAmortizacao: sistema,
        aluguelMensal: 2000
      });
      assert.equal(res.ok, true);
      assert.equal(res.data.saldoDevedorCentavos, 0, `Saldo deve ser 0 em ${anos} anos via ${sistema}`);
      assert.equal(res.data.saldoDevedor, 0);
      assert.equal(res.data.totalAmortizacaoCentavos, 30000000);
    }
  }
});

test('30. Auditoria 11 — Inexistência de saldos negativos e de pagamentos posteriores à quitação (SAC e Price)', () => {
  // Caso de valor pequeno que quita antes do prazo por efeito de arredondamento de centavos
  const resPriceSmall = calculateRentVsBuy({
    precoImovel: 2, // R$ 2,00 (200 centavos)
    valorEntrada: 0,
    prazoFinanciamentoAnos: 5, // 60 meses
    periodoAnos: 5,
    taxaJurosAnual: 5,
    sistemaAmortizacao: SISTEMAS_AMORTIZACAO.PRICE,
    custoMensalFinanciamento: 0,
    aluguelMensal: 10
  });

  assert.equal(resPriceSmall.ok, true);
  assert.equal(resPriceSmall.data.saldoDevedorCentavos, 0);
  assert.equal(resPriceSmall.data.totalAmortizacaoCentavos, 200, 'Amortização exata de R$ 2,00 sem cobrança além do devido');
  assert.equal(
    resPriceSmall.data.totalPrestacoesCentavos - resPriceSmall.data.totalJurosCentavos,
    200,
    'Não pode haver cobrança excedente de prestação'
  );

  const resSacSmall = calculateRentVsBuy({
    precoImovel: 2,
    valorEntrada: 0,
    prazoFinanciamentoAnos: 5,
    periodoAnos: 5,
    taxaJurosAnual: 5,
    sistemaAmortizacao: SISTEMAS_AMORTIZACAO.SAC,
    custoMensalFinanciamento: 0,
    aluguelMensal: 10
  });

  assert.equal(resSacSmall.ok, true);
  assert.equal(resSacSmall.data.saldoDevedorCentavos, 0);
  assert.equal(resSacSmall.data.totalAmortizacaoCentavos, 200);
});

test('31. Auditoria 12 — Validação independente do saldo devedor e totais contra modelo isolado de referência (SAC e Price)', () => {
  // Teste 1: Prazo integral (quitação completa)
  const refSacFull = calcularFinanciamentoReferenciaIndependente(30000000, 240, 240, 9.5, 'sac');
  const toolSacFull = calculateRentVsBuy({
    precoImovel: 300000,
    valorEntrada: 0,
    prazoFinanciamentoAnos: 20,
    periodoAnos: 20,
    taxaJurosAnual: 9.5,
    sistemaAmortizacao: SISTEMAS_AMORTIZACAO.SAC,
    custoMensalFinanciamento: 0,
    aluguelMensal: 1000
  });
  assert.equal(toolSacFull.data.saldoDevedorCentavos, refSacFull.saldo);
  assert.equal(toolSacFull.data.totalAmortizacaoCentavos, refSacFull.totalAmort);
  assert.equal(toolSacFull.data.totalJurosCentavos, refSacFull.totalJuros);

  const refPriceFull = calcularFinanciamentoReferenciaIndependente(30000000, 240, 240, 9.5, 'price');
  const toolPriceFull = calculateRentVsBuy({
    precoImovel: 300000,
    valorEntrada: 0,
    prazoFinanciamentoAnos: 20,
    periodoAnos: 20,
    taxaJurosAnual: 9.5,
    sistemaAmortizacao: SISTEMAS_AMORTIZACAO.PRICE,
    custoMensalFinanciamento: 0,
    aluguelMensal: 1000
  });
  assert.equal(toolPriceFull.data.saldoDevedorCentavos, refPriceFull.saldo);
  assert.equal(toolPriceFull.data.totalAmortizacaoCentavos, refPriceFull.totalAmort);
  assert.equal(toolPriceFull.data.totalJurosCentavos, refPriceFull.totalJuros);

  // Teste 2: Período parcial (saldo devedor remanescente ativo)
  const refSacPartial = calcularFinanciamentoReferenciaIndependente(40000000, 360, 120, 10, 'sac');
  const toolSacPartial = calculateRentVsBuy({
    precoImovel: 400000,
    valorEntrada: 0,
    prazoFinanciamentoAnos: 30,
    periodoAnos: 10,
    taxaJurosAnual: 10,
    sistemaAmortizacao: SISTEMAS_AMORTIZACAO.SAC,
    custoMensalFinanciamento: 0,
    aluguelMensal: 1000
  });
  assert.equal(toolSacPartial.data.saldoDevedorCentavos, refSacPartial.saldo);
  assert.equal(toolSacPartial.data.totalAmortizacaoCentavos, refSacPartial.totalAmort);
  assert.equal(toolSacPartial.data.totalJurosCentavos, refSacPartial.totalJuros);

  const refPricePartial = calcularFinanciamentoReferenciaIndependente(40000000, 360, 120, 10, 'price');
  const toolPricePartial = calculateRentVsBuy({
    precoImovel: 400000,
    valorEntrada: 0,
    prazoFinanciamentoAnos: 30,
    periodoAnos: 10,
    taxaJurosAnual: 10,
    sistemaAmortizacao: SISTEMAS_AMORTIZACAO.PRICE,
    custoMensalFinanciamento: 0,
    aluguelMensal: 1000
  });
  assert.equal(toolPricePartial.data.saldoDevedorCentavos, refPricePartial.saldo);
  assert.equal(toolPricePartial.data.totalAmortizacaoCentavos, refPricePartial.totalAmort);
  assert.equal(toolPricePartial.data.totalJurosCentavos, refPricePartial.totalJuros);
});
