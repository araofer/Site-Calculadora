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
  calculateEmergencyFund,
  buildCopyText,
  formatResult,
  setupTool,
  CENARIOS_COBERTURA,
  LIMITE_MAXIMO_MESES_COBERTURA
} from '../js/tools/reserva-emergencia.js';

import { VALID_TOOL_IDS } from '../js/core/favorites.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

/* ==========================================================================
 * 1. Despesas mensais: validação de zero, negativas e positivas
 * ========================================================================== */
test('1. Despesas mensais: rejeita zero e negativos, calcula corretamente valores positivos', () => {
  // Despesa zero ou negativa deve falhar
  assert.equal(calculateEmergencyFund({ despesasEssenciais: 0 }).ok, false);
  assert.equal(calculateEmergencyFund({ despesasEssenciais: -1500 }).ok, false);
  assert.equal(calculateEmergencyFund({ despesasEssenciais: '' }).ok, false);
  assert.equal(calculateEmergencyFund({ despesasEssenciais: 'abc' }).ok, false);

  // Valor positivo padrão
  const res = calculateEmergencyFund({
    despesasEssenciais: 3000,
    mesesDesejados: 6
  });

  assert.equal(res.ok, true);
  assert.equal(res.data.despesasCentavos, 300000);
  assert.equal(res.data.reservaMetaCentavos, 1800000); // 3.000 * 6 = R$ 18.000,00
  assert.equal(res.data.reservaMeta, 18000);
});

/* ==========================================================================
 * 2. Reserva atual: zero, parcial e acima da meta
 * ========================================================================== */
test('2. Reserva atual: zero (início), parcial (em formação) e acima da meta (concluída)', () => {
  const base = { despesasEssenciais: 4000, mesesDesejados: 6 }; // Meta = R$ 24.000,00

  // Caso A: Reserva zero
  const resZero = calculateEmergencyFund({ ...base, reservaAtual: 0 });
  assert.equal(resZero.ok, true);
  assert.equal(resZero.data.reservaAtualCentavos, 0);
  assert.equal(resZero.data.mesesCoberturaAtual, 0);
  assert.equal(resZero.data.percentualAtingido, 0);
  assert.equal(resZero.data.faltaCentavos, 2400000);
  assert.equal(resZero.data.statusMeta, 'nao_iniciada');
  assert.equal(resZero.data.metaAtingida, false);

  // Caso B: Reserva parcial (R$ 12.000,00 -> 3 meses, 50%)
  const resParcial = calculateEmergencyFund({ ...base, reservaAtual: 12000 });
  assert.equal(resParcial.ok, true);
  assert.equal(resParcial.data.reservaAtualCentavos, 1200000);
  assert.equal(resParcial.data.mesesCoberturaAtual, 3);
  assert.equal(resParcial.data.percentualAtingido, 50);
  assert.equal(resParcial.data.faltaCentavos, 1200000);
  assert.equal(resParcial.data.statusMeta, 'em_formacao');
  assert.equal(resParcial.data.metaAtingida, false);

  // Caso C: Reserva acima da meta (R$ 30.000,00 -> 7.5 meses, 125%)
  const resSuper = calculateEmergencyFund({ ...base, reservaAtual: 30000 });
  assert.equal(resSuper.ok, true);
  assert.equal(resSuper.data.reservaAtualCentavos, 3000000);
  assert.equal(resSuper.data.mesesCoberturaAtual, 7.5);
  assert.equal(resSuper.data.percentualAtingido, 125);
  assert.equal(resSuper.data.faltaCentavos, 0);
  assert.equal(resSuper.data.statusMeta, 'concluida');
  assert.equal(resSuper.data.metaAtingida, true);
  assert.equal(resSuper.data.mesesNecessarios, 0);
});

/* ==========================================================================
 * 3. Diferentes quantidades de meses de cobertura
 * ========================================================================== */
test('3. Diferentes quantidades de meses de cobertura (3, 6, 9, 12 e limites)', () => {
  const despesa = 5000;

  for (const m of [1, 3, 6, 9, 12, 18, 24, 36]) {
    const res = calculateEmergencyFund({
      despesasEssenciais: despesa,
      mesesDesejados: m
    });
    assert.equal(res.ok, true);
    assert.equal(res.data.mesesDesejados, m);
    assert.equal(res.data.reservaMetaCentavos, despesa * 100 * m);
  }

  // Limite estourado (> 36 meses ou < 1)
  assert.equal(calculateEmergencyFund({ despesasEssenciais: 5000, mesesDesejados: 0 }).ok, false);
  assert.equal(calculateEmergencyFund({ despesasEssenciais: 5000, mesesDesejados: 37 }).ok, false);
  assert.equal(calculateEmergencyFund({ despesasEssenciais: 5000, mesesDesejados: -5 }).ok, false);
});

/* ==========================================================================
 * 4. Aportes mensais zero e positivos
 * ========================================================================== */
test('4. Aportes mensais: zero (sem estimativa de prazo) e positivo (cálculo de meses exatos)', () => {
  const base = {
    despesasEssenciais: 2000,
    mesesDesejados: 6, // Meta: R$ 12.000,00
    reservaAtual: 2000 // Falta: R$ 10.000,00
  };

  // Sem aporte
  const resSemAporte = calculateEmergencyFund({ ...base, aporteMensal: 0 });
  assert.equal(resSemAporte.ok, true);
  assert.equal(resSemAporte.data.mesesNecessarios, null);
  assert.ok(resSemAporte.data.sugestoesAporte.length > 0);

  // Com aporte de R$ 1.000,00/mês sem juros -> 10 meses
  const resComAporte = calculateEmergencyFund({ ...base, aporteMensal: 1000, rentabilidadeAnual: 0 });
  assert.equal(resComAporte.ok, true);
  assert.equal(resComAporte.data.mesesNecessarios, 10);
  assert.equal(resComAporte.data.totalAportesCentavos, 1000000);
  assert.equal(resComAporte.data.totalRendimentosCentavos, 0);

  // Aporte que não divide perfeitamente: Math.ceil(10.000 / 700) = 15 meses
  const resQuebrado = calculateEmergencyFund({ ...base, aporteMensal: 700, rentabilidadeAnual: 0 });
  assert.equal(resQuebrado.ok, true);
  assert.equal(resQuebrado.data.mesesNecessarios, 15);
  assert.equal(resQuebrado.data.totalAportesCentavos, 15 * 70000);
});

/* ==========================================================================
 * 5. Rentabilidade zero e positiva
 * ========================================================================== */
test('5. Rentabilidade zero vs positiva: rentabilidade acelera a conclusão e gera rendimentos secundários', () => {
  const inputZero = {
    despesasEssenciais: 3000,
    mesesDesejados: 6, // Meta: R$ 18.000,00
    reservaAtual: 0,
    aporteMensal: 1000,
    rentabilidadeAnual: 0
  };

  const inputComJuros = {
    ...inputZero,
    rentabilidadeAnual: 12 // 12% a.a.
  };

  const resZero = calculateEmergencyFund(inputZero);
  const resComJuros = calculateEmergencyFund(inputComJuros);

  assert.equal(resZero.ok, true);
  assert.equal(resComJuros.ok, true);

  // Sem juros: 18.000 / 1.000 = 18 meses
  assert.equal(resZero.data.mesesNecessarios, 18);
  assert.equal(resZero.data.totalRendimentosCentavos, 0);

  // Com juros: deve atingir em menos meses
  assert.ok(resComJuros.data.mesesNecessarios < 18);
  assert.ok(resComJuros.data.totalRendimentosCentavos > 0);
  // A meta nominal NÃO muda
  assert.equal(resComJuros.data.reservaMetaCentavos, 1800000);
});

/* ==========================================================================
 * 6. Valores monetários com centavos e arredondamento consistente
 * ========================================================================== */
test('6. Precisão em centavos: valores com fração monetária e formatação consistente', () => {
  const res = calculateEmergencyFund({
    despesasEssenciais: '2.543,87',
    mesesDesejados: 3,
    reservaAtual: '1.200,50',
    aporteMensal: '450,25',
    rentabilidadeAnual: '10,5'
  });

  assert.equal(res.ok, true);
  assert.equal(res.data.despesasCentavos, 254387);
  assert.equal(res.data.reservaAtualCentavos, 120050);
  assert.equal(res.data.aporteMensalCentavos, 45025);
  // Meta: 254387 * 3 = 763161 centavos = R$ 7.631,61
  assert.equal(res.data.reservaMetaCentavos, 763161);
  assert.equal(res.data.faltaCentavos, 763161 - 120050);
  assert.equal(res.data.faltaCentavos, 643111);
});

/* ==========================================================================
 * 7. Tabela de Cenários Multi-Perfil (3, 6, 9 e 12 meses)
 * ========================================================================== */
test('7. Cenários multi-perfil: 3, 6, 9 e 12 meses são calculados corretamente', () => {
  const res = calculateEmergencyFund({
    despesasEssenciais: 4000,
    reservaAtual: 12000,
    aporteMensal: 1000
  });

  assert.equal(res.ok, true);
  assert.equal(res.data.cenarios.length, 4);

  const c3 = res.data.cenarios.find(c => c.meses === 3);
  const c6 = res.data.cenarios.find(c => c.meses === 6);
  const c9 = res.data.cenarios.find(c => c.meses === 9);
  const c12 = res.data.cenarios.find(c => c.meses === 12);

  // 3 meses: R$ 12.000 -> atingido (saldo é 12.000)
  assert.equal(c3.metaCentavos, 1200000);
  assert.equal(c3.faltaCentavos, 0);
  assert.equal(c3.percentualCoberto, 100);
  assert.equal(c3.atingido, true);
  assert.equal(c3.tempoEstimadoMeses, 0);

  // 6 meses: R$ 24.000 -> falta R$ 12.000
  assert.equal(c6.metaCentavos, 2400000);
  assert.equal(c6.faltaCentavos, 1200000);
  assert.equal(c6.percentualCoberto, 50);
  assert.equal(c6.atingido, false);
  assert.equal(c6.tempoEstimadoMeses, 12);

  // 9 meses: R$ 36.000 -> falta R$ 24.000
  assert.equal(c9.metaCentavos, 3600000);
  assert.equal(c9.faltaCentavos, 2400000);
  assert.equal(c9.atingido, false);

  // 12 meses: R$ 48.000 -> falta R$ 36.000
  assert.equal(c12.metaCentavos, 4800000);
  assert.equal(c12.faltaCentavos, 3600000);
  assert.equal(c12.atingido, false);
});

/* ==========================================================================
 * 8. Validação e rejeição de entradas inválidas e limites
 * ========================================================================== */
test('8. Validações de limites e valores impróprios', () => {
  // Reserva negativa
  assert.equal(calculateEmergencyFund({ despesasEssenciais: 2000, reservaAtual: -50 }).ok, false);

  // Aporte negativo
  assert.equal(calculateEmergencyFund({ despesasEssenciais: 2000, aporteMensal: -100 }).ok, false);

  // Rentabilidade negativa ou absurda (> 100% a.a.)
  assert.equal(calculateEmergencyFund({ despesasEssenciais: 2000, rentabilidadeAnual: -5 }).ok, false);
  assert.equal(calculateEmergencyFund({ despesasEssenciais: 2000, rentabilidadeAnual: 150 }).ok, false);

  // Parsing monetário de edge cases
  assert.equal(parseMoneyToCents('R$ 0,00'), 0);
  assert.equal(parseMoneyToCents(''), 0);
  assert.equal(parseMoneyToCents(null), 0);
  assert.equal(parseMoneyToCents(undefined), 0);
  assert.equal(parseMoneyToCents(100), 10000);
  assert.equal(parseMoneyToCents('1.000,00'), 100000);
  assert.ok(isNaN(parseMoneyToCents('invalido')));
});

/* ==========================================================================
 * 9. Comparação independente dos cálculos
 * ========================================================================== */
function modeloReferenciaIndependente(despesaCents, meses, saldoAtualCents, aporteCents, taxaAnual) {
  const metaCents = despesaCents * meses;
  const faltaCents = Math.max(0, metaCents - saldoAtualCents);
  const mesesCobertura = saldoAtualCents / despesaCents;
  const percAtingido = (saldoAtualCents / metaCents) * 100;

  let mesesParaMeta = null;
  if (saldoAtualCents >= metaCents) {
    mesesParaMeta = 0;
  } else if (aporteCents > 0) {
    if (taxaAnual === 0) {
      mesesParaMeta = Math.ceil(faltaCents / aporteCents);
    } else {
      const i = Math.pow(1 + taxaAnual / 100, 1 / 12) - 1;
      let s = saldoAtualCents;
      let count = 0;
      while (s < metaCents && count < 600) {
        count++;
        s += Math.round(s * i);
        s += aporteCents;
      }
      mesesParaMeta = count;
    }
  }

  return { metaCents, faltaCents, mesesCobertura, percAtingido, mesesParaMeta };
}

test('9. Comparação independente contra modelo analítico isolado', () => {
  const cenariosTeste = [
    { d: 350000, m: 6, s: 700000, a: 50000, r: 0 },
    { d: 420000, m: 12, s: 1000000, a: 80000, r: 10.5 },
    { d: 150000, m: 3, s: 500000, a: 0, r: 0 }
  ];

  for (const c of cenariosTeste) {
    const ref = modeloReferenciaIndependente(c.d, c.m, c.s, c.a, c.r);
    const tool = calculateEmergencyFund({
      despesasEssenciais: c.d / 100,
      mesesDesejados: c.m,
      reservaAtual: c.s / 100,
      aporteMensal: c.a / 100,
      rentabilidadeAnual: c.r
    });

    assert.equal(tool.ok, true);
    assert.equal(tool.data.reservaMetaCentavos, ref.metaCents);
    assert.equal(tool.data.faltaCentavos, ref.faltaCents);
    assert.equal(tool.data.mesesCoberturaAtual, ref.mesesCobertura);
    assert.equal(tool.data.percentualAtingido, ref.percAtingido);
    assert.equal(tool.data.mesesNecessarios, ref.mesesParaMeta);
  }
});

/* ==========================================================================
 * 10. Textos de cópia (buildCopyText) e seções de resultado (formatResult)
 * ========================================================================== */
test('10. buildCopyText e formatResult: sem placeholders undefined, null ou NaN', () => {
  const res = calculateEmergencyFund({
    despesasEssenciais: 3500,
    mesesDesejados: 6,
    reservaAtual: 5000,
    aporteMensal: 600,
    rentabilidadeAnual: 8
  });

  const texto = buildCopyText(res);
  assert.match(texto, /PLANEJAMENTO DE RESERVA DE EMERGÊNCIA/);
  assert.match(texto, /Meta recomendada/);
  assert.match(texto, /Saldo atual acumulado/);
  assert.match(texto, /Cobertura atual proporcionada/);
  assert.doesNotMatch(texto, /\b(undefined|null|NaN)\b/);

  const secoes = formatResult(res);
  assert.ok(secoes.length >= 6);
  for (const s of secoes) {
    assert.doesNotMatch(s.value, /\b(undefined|null|NaN)\b/);
  }
});

/* ==========================================================================
 * 11. Integração com DOM via setupTool e Limpeza de Campos
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
    this.style = {};
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

test('11. setupTool: inicializa interface DOM, executa cálculo e limpa campos', () => {
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

    const form = getOrCreate('formReservaEmergencia', 'form');
    const inputDesp = getOrCreate('despesasEssenciais', 'input');
    inputDesp.value = '3.000,00';
    const selectMeses = getOrCreate('mesesDesejados', 'select');
    selectMeses.value = '6';
    const inputAtual = getOrCreate('reservaAtual', 'input');
    inputAtual.value = '6.000,00';
    const inputAporte = getOrCreate('aporteMensal', 'input');
    inputAporte.value = '500,00';
    const inputRent = getOrCreate('rentabilidadeAnual', 'input');
    inputRent.value = '10';

    const btnCalc = getOrCreate('btnCalcularReserva', 'button');
    const btnLimpar = getOrCreate('btnLimparReserva', 'button');
    const erro = getOrCreate('erroReservaEmergencia', 'p');
    const resSecao = getOrCreate('resultadoReservaEmergencia', 'section');

    const resBadge = getOrCreate('resBadgeStatus', 'span');
    const resMeta = getOrCreate('resMetaTotal', 'strong');
    const resMesesDes = getOrCreate('resMesesDesejados', 'span');
    const resCob = getOrCreate('resCoberturaAtual', 'strong');
    const resPerc = getOrCreate('resPercAtingido', 'strong');
    const resFalta = getOrCreate('resFaltaValor', 'strong');
    const resBarra = getOrCreate('resBarraProgresso', 'div');

    const resCardPrazo = getOrCreate('resCardPrazo', 'div');
    const resTempo = getOrCreate('resTempoEstimado', 'strong');
    const resData = getOrCreate('resDataConquista', 'span');
    const resRend = getOrCreate('resRendimentosEstimados', 'span');

    const tabCenarios = getOrCreate('tabelaCenariosReserva', 'table');
    const tbody = new MockElement('tbody');
    tabCenarios.append(tbody);

    const memoria = getOrCreate('memoriaCalculoReserva', 'ul');
    const avisos = getOrCreate('avisosReservaEmergencia', 'div');
    const statusAcoes = getOrCreate('statusAcoesReserva', 'p');

    globalThis.document = { createElement: (tag) => new MockElement(tag) };
    globalThis.window = { location: { href: 'https://www.calculadoramaster.com/tools/financas/reserva-emergencia.html' } };

    const mockRoot = {
      querySelector: (sel) => {
        if (sel === '#tabelaCenariosReserva tbody') return tbody;
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
    assert.equal(resMeta.textContent, formatCurrency(18000));
    assert.match(resCob.textContent, /2,0\s*meses/);

    // Botão Limpar
    btnLimpar.listeners['click'][0]({ preventDefault: () => {} });
    assert.equal(resSecao.hidden, true);
  } finally {
    if (prevDoc === undefined) delete globalThis.document; else globalThis.document = prevDoc;
    if (prevWin === undefined) delete globalThis.window; else globalThis.window = prevWin;
  }
});

/* ==========================================================================
 * 12. Conformidade Semântica, Acessibilidade e Ausência de Estilos Inline no HTML
 * ========================================================================== */
test('12. Página HTML segue padrões semânticos, sem inline style e sem br', () => {
  const pagePath = path.join(ROOT_DIR, 'src', 'pages', 'tools', 'financas', 'reserva-emergencia.page.html');
  assert.ok(fs.existsSync(pagePath), 'reserva-emergencia.page.html deve existir');

  const content = fs.readFileSync(pagePath, 'utf-8');
  assert.match(content, /layout:\s*tool/);
  assert.match(content, /id="formReservaEmergencia"/);
  assert.match(content, /id="resultadoReservaEmergencia"/);
  assert.match(content, /role="alert"/);
  assert.match(content, /aria-live="polite"/);

  assert.doesNotMatch(content, /<br\s*\/?\s*>/i, 'Não deve conter tags <br>');
  assert.doesNotMatch(content, /style="/i, 'Não deve conter atributo style inline no HTML');
});

/* ==========================================================================
 * 13. ID no conjunto de ferramentas válidas para favoritos
 * ========================================================================== */
test('13. ID reserva-emergencia consta no conjunto de ferramentas válidas para favoritos', () => {
  assert.ok(VALID_TOOL_IDS.has('reserva-emergencia'), 'VALID_TOOL_IDS deve conter reserva-emergencia');
});
