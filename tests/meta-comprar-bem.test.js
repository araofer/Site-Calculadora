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
  formatPeriodoAmigavel,
  estimateCompletionDate,
  calculateGoal,
  formatResult,
  buildCopyText,
  setupTool,
  MODOS_CALCULO,
  LIMITE_MAXIMO_MESES
} from '../js/tools/meta-comprar-bem.js';

import { VALID_TOOL_IDS } from '../js/core/favorites.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

/* ==========================================================================
 * 1. Meta já atingida
 * ========================================================================== */
test('1. Meta já atingida: quando o capital inicial é maior ou igual ao preço do bem', () => {
  // Modo A
  const resModoA = calculateGoal({
    modo: MODOS_CALCULO.APORTE_NECESSARIO,
    precoBem: '10.000,00',
    valorEconomizado: '10.000,00',
    prazoMeses: 12
  });
  assert.equal(resModoA.ok, true);
  assert.equal(resModoA.data.metaJaAtingida, true);
  assert.equal(resModoA.data.faltaAcumularNominalCentavos, 0);
  assert.equal(resModoA.data.aporteMensalNecessarioCentavos, 0);

  // Modo B
  const resModoB = calculateGoal({
    modo: MODOS_CALCULO.PRAZO_NECESSARIO,
    precoBem: 15000,
    valorEconomizado: 18000,
    aporteMensal: 500
  });
  assert.equal(resModoB.ok, true);
  assert.equal(resModoB.data.metaJaAtingida, true);
  assert.equal(resModoB.data.prazoMesesAtingido, 0);
  assert.equal(resModoB.data.totalAportesPropriosCentavos, 0);
});

/* ==========================================================================
 * 2. Prazo de um mês
 * ========================================================================== */
test('2. Prazo de um único mês (Modo A)', () => {
  // Sem rentabilidade: meta de R$ 3.000 com R$ 1.000 já guardados -> faltam R$ 2.000 em 1 mês
  const resSemJuros = calculateGoal({
    modo: MODOS_CALCULO.APORTE_NECESSARIO,
    precoBem: 3000,
    valorEconomizado: 1000,
    prazoMeses: 1,
    rentabilidadeAnual: 0
  });
  assert.equal(resSemJuros.ok, true);
  assert.equal(resSemJuros.data.aporteMensalNecessarioCentavos, 200000);
  assert.equal(resSemJuros.data.montanteFinalCentavos, 300000);
  assert.equal(resSemJuros.data.totalAportesPropriosCentavos, 200000);
  assert.equal(resSemJuros.data.rendimentoEstimadoCentavos, 0);

  // Com rentabilidade anual de 12%:
  // Taxa mensal efetiva i = (1.12)^(1/12) - 1 ≈ 0.0094887929
  // Saldo inicial de 1000 rende J1 = round(100000 * i) = 949 centavos (R$ 9,49)
  // Montante necessário de aportes: 300000 - 100949 = 199051 centavos
  // Como é 1 mês, aporte no fim do mês: P = ceil(199051 / 1) = 199051 centavos (R$ 1.990,51)
  const resComJuros = calculateGoal({
    modo: MODOS_CALCULO.APORTE_NECESSARIO,
    precoBem: 3000,
    valorEconomizado: 1000,
    prazoMeses: 1,
    rentabilidadeAnual: 12
  });
  assert.equal(resComJuros.ok, true);
  assert.equal(resComJuros.data.aporteMensalNecessarioCentavos, 199051);
  assert.equal(resComJuros.data.montanteFinalCentavos, 300000);
});

/* ==========================================================================
 * 3. Rentabilidade zero (Modo A e Modo B)
 * ========================================================================== */
test('3. Rentabilidade zero (0% a.a.): divisão puramente nominal', () => {
  // Modo A: Meta de R$ 12.000 em 12 meses do zero -> R$ 1.000/mês
  const resA = calculateGoal({
    modo: MODOS_CALCULO.APORTE_NECESSARIO,
    precoBem: 12000,
    valorEconomizado: 0,
    prazoMeses: 12,
    rentabilidadeAnual: 0
  });
  assert.equal(resA.ok, true);
  assert.equal(resA.data.aporteMensalNecessarioCentavos, 100000);
  assert.equal(resA.data.rendimentoEstimadoCentavos, 0);
  assert.equal(resA.data.totalAportesPropriosCentavos, 1200000);
  assert.equal(resA.data.montanteFinalCentavos, 1200000);

  // Modo B: Meta de R$ 12.000 guardando R$ 1.000/mês do zero -> exatamente 12 meses
  const resB = calculateGoal({
    modo: MODOS_CALCULO.PRAZO_NECESSARIO,
    precoBem: 12000,
    valorEconomizado: 0,
    aporteMensal: 1000,
    rentabilidadeAnual: 0
  });
  assert.equal(resB.ok, true);
  assert.equal(resB.data.prazoMesesAtingido, 12);
  assert.equal(resB.data.rendimentoEstimadoCentavos, 0);
  assert.equal(resB.data.totalAportesPropriosCentavos, 1200000);
  assert.equal(resB.data.montanteFinalCentavos, 1200000);
});

/* ==========================================================================
 * 4. Rentabilidade anual positiva e conversão mensal efetiva
 * ========================================================================== */
test('4. Rentabilidade anual e conversão efetiva i = (1 + r)^(1/12) - 1', () => {
  // Taxa de 10% a.a.
  const i10 = calculateEffectiveMonthlyRate(10);
  const esperado10 = Math.pow(1.10, 1 / 12) - 1;
  assert.ok(Math.abs(i10 - esperado10) < 1e-12);
  assert.ok(i10 > 0.0079 && i10 < 0.0080); // ~0.7974% a.m.

  // Taxa de 0% a.a.
  assert.equal(calculateEffectiveMonthlyRate(0), 0);
  assert.equal(calculateEffectiveMonthlyRate(-5), 0);
});

/* ==========================================================================
 * 5. Cálculo de aporte mensal necessário (Modo A) com caso independente
 * ========================================================================== */
test('5. Modo A: Caso de referência com capital inicial e rentabilidade', () => {
  // Meta: R$ 50.000 em 24 meses
  // Já economizado: R$ 10.000
  // Rentabilidade anual: 10% a.a.
  // i = 1.10^(1/24) - 1 = ...
  // Saldo inicial projetado = 10000 * (1 + i)^24 = 10000 * 1.10^2 = R$ 12.100,00
  // Falta de aportes = 50000 - 12100 = R$ 37.900,00
  // Fator PG dos aportes no fim do mês: ((1 + i)^24 - 1) / i = (1.21 - 1) / i = 0.21 / i
  // i ≈ 0.0079741404289
  // Fator PG ≈ 26.335128
  // P = 37900 / 26.335128 ≈ 1439.14...
  const res = calculateGoal({
    modo: MODOS_CALCULO.APORTE_NECESSARIO,
    precoBem: 50000,
    valorEconomizado: 10000,
    prazoMeses: 24,
    rentabilidadeAnual: 10
  });

  assert.equal(res.ok, true);
  assert.ok(res.data.aporteMensalNecessario >= 1439 && res.data.aporteMensalNecessario <= 1440);
  assert.ok(res.data.montanteFinalCentavos >= 5000000);
  assert.ok(res.data.rendimentoEstimadoCentavos > 0);
});

/* ==========================================================================
 * 6. Simulação de prazo com aportes mensais (Modo B)
 * ========================================================================== */
test('6. Modo B: Simulação mês a mês atinge a meta dentro do prazo esperado', () => {
  // Meta: R$ 20.000
  // Já possui: R$ 5.000
  // Aporte: R$ 1.500/mês
  // Sem juros: faltam 15.000 / 1.500 = 10 meses exatos
  const resSemJuros = calculateGoal({
    modo: MODOS_CALCULO.PRAZO_NECESSARIO,
    precoBem: 20000,
    valorEconomizado: 5000,
    aporteMensal: 1500,
    rentabilidadeAnual: 0
  });
  assert.equal(resSemJuros.ok, true);
  assert.equal(resSemJuros.data.prazoMesesAtingido, 10);
  assert.equal(resSemJuros.data.montanteFinalCentavos, 2000000);

  // Com rentabilidade de 12% a.a., atinge a meta mais rápido (9 meses em vez de 10)
  const resComJuros = calculateGoal({
    modo: MODOS_CALCULO.PRAZO_NECESSARIO,
    precoBem: 20000,
    valorEconomizado: 5000,
    aporteMensal: 1500,
    rentabilidadeAnual: 12
  });
  assert.equal(resComJuros.ok, true);
  assert.ok(resComJuros.data.prazoMesesAtingido <= 10);
  assert.ok(resComJuros.data.rendimentoEstimadoCentavos > 0);
  assert.ok(resComJuros.data.montanteFinalCentavos >= 2000000);
});

/* ==========================================================================
 * 7. Aporte zero quando a meta ainda não foi atingida (Modo B)
 * ========================================================================== */
test('7. Aporte zero: rejeição de simulação estagnada ou sem rendimento', () => {
  // Aporte 0 e taxa 0
  const resEstagnado = calculateGoal({
    modo: MODOS_CALCULO.PRAZO_NECESSARIO,
    precoBem: 10000,
    valorEconomizado: 2000,
    aporteMensal: 0,
    rentabilidadeAnual: 0
  });
  assert.equal(resEstagnado.ok, false);
  assert.match(resEstagnado.error, /aporte mensal de R\$ 0,00 e sem rentabilidade/i);

  // Aporte 0 e capital 0
  const resSemNada = calculateGoal({
    modo: MODOS_CALCULO.PRAZO_NECESSARIO,
    precoBem: 10000,
    valorEconomizado: 0,
    aporteMensal: 0,
    rentabilidadeAnual: 10
  });
  assert.equal(resSemNada.ok, false);
  assert.match(resSemNada.error, /Sem valor inicial economizado/i);
});

/* ==========================================================================
 * 8. Meta não atingida dentro de 600 meses (Modo B)
 * ========================================================================== */
test('8. Meta não atingida no horizonte de 600 meses: exibe mensagem e limita simulação', () => {
  // Preço de R$ 10.000.000 com aporte de R$ 100/mês e sem juros -> levaria 100.000 meses
  const res = calculateGoal({
    modo: MODOS_CALCULO.PRAZO_NECESSARIO,
    precoBem: 10000000,
    valorEconomizado: 0,
    aporteMensal: 100,
    rentabilidadeAnual: 0
  });

  assert.equal(res.ok, true);
  assert.equal(res.data.metaAtingidaNoLimite, false);
  assert.equal(res.data.prazoMesesAtingido, LIMITE_MAXIMO_MESES);
  assert.ok(res.warnings.some(w => w.includes('600 meses')));
});

/* ==========================================================================
 * 9. Valores monetários com centavos e arredondamento consistente
 * ========================================================================== */
test('9. Manipulação monetária com centavos inteiros via parseMoneyToCents', () => {
  assert.equal(parseMoneyToCents('R$ 1.234,56'), 123456);
  assert.equal(parseMoneyToCents('1234.56'), 123456);
  assert.equal(parseMoneyToCents('0,01'), 1);
  assert.equal(parseMoneyToCents('10,555'), 1056);
  assert.equal(parseMoneyToCents('10,554'), 1055);
  assert.equal(parseMoneyToCents(''), 0);
  assert.equal(parseMoneyToCents(null), 0);
  assert.equal(parseMoneyToCents('-50,00'), -5000);
});

/* ==========================================================================
 * 10. Entradas negativas, vazias e inválidas
 * ========================================================================== */
test('10. Rejeição de entradas negativas, zero indevido ou valores vazios', () => {
  // Preço do bem zero ou negativo
  const r1 = calculateGoal({ precoBem: 0 });
  assert.equal(r1.ok, false);
  assert.match(r1.error, /maior que zero/i);

  const r2 = calculateGoal({ precoBem: -500 });
  assert.equal(r2.ok, false);
  assert.match(r2.error, /maior que zero/i);

  // Economizado negativo
  const r3 = calculateGoal({ precoBem: 1000, valorEconomizado: -100 });
  assert.equal(r3.ok, false);
  assert.match(r3.error, /não pode ser negativo/i);

  // Rentabilidade negativa
  const r4 = calculateGoal({ precoBem: 1000, rentabilidadeAnual: -2 });
  assert.equal(r4.ok, false);
  assert.match(r4.error, /não pode ser negativa/i);

  // Prazo inválido no Modo A
  const r5 = calculateGoal({ modo: MODOS_CALCULO.APORTE_NECESSARIO, precoBem: 1000, prazoMeses: 0 });
  assert.equal(r5.ok, false);
  assert.match(r5.error, /maior que zero/i);

  const r6 = calculateGoal({ modo: MODOS_CALCULO.APORTE_NECESSARIO, precoBem: 1000, prazoMeses: 601 });
  assert.equal(r6.ok, false);
  assert.match(r6.error, /máximo permitido.*600 meses/i);

  // Aporte mensal negativo no Modo B
  const r7 = calculateGoal({ modo: MODOS_CALCULO.PRAZO_NECESSARIO, precoBem: 1000, aporteMensal: -50 });
  assert.equal(r7.ok, false);
  assert.match(r7.error, /não pode ser negativo/i);
});

/* ==========================================================================
 * 11. Limites de prazo e taxa
 * ========================================================================== */
test('11. Limite de taxa superior a 500% a.a. rejeitado por segurança', () => {
  const r = calculateGoal({ precoBem: 1000, rentabilidadeAnual: 550 });
  assert.equal(r.ok, false);
  assert.match(r.error, /máxima permitida é de 500%/i);
});

/* ==========================================================================
 * 12. Consistência entre saldo inicial, aportes, rendimento e saldo final
 * ========================================================================== */
test('12. Invariante fundamental: Saldo Final = Saldo Inicial + Total Aportes + Total Rendimentos', () => {
  const res = calculateGoal({
    modo: MODOS_CALCULO.APORTE_NECESSARIO,
    precoBem: 35000,
    valorEconomizado: 7500,
    prazoMeses: 36,
    rentabilidadeAnual: 8.5
  });

  assert.equal(res.ok, true);
  const { montanteFinalCentavos, economizadoCentavos, totalAportesPropriosCentavos, rendimentoEstimadoCentavos } = res.data;

  assert.equal(
    montanteFinalCentavos,
    economizadoCentavos + totalAportesPropriosCentavos + rendimentoEstimadoCentavos,
    'Saldo final em centavos deve ser exatamente a soma de inicial + aportes + rendimentos'
  );
  assert.ok(montanteFinalCentavos >= res.data.precoBemCentavos);
});

/* ==========================================================================
 * 13. Casos de referência calculados independentemente
 * ========================================================================== */
test('13. Casos de referência calculados independentemente das funções de produção', () => {
  // Caso de referência independente:
  // Meta: R$ 10.000
  // Inicial: R$ 0,00
  // Prazo: 3 meses
  // Taxa: 1% a.m. exato (ou taxa anual equivalente)
  // Montante ao final de 3 meses com aporte P:
  // Mês 1: P
  // Mês 2: P*1.01 + P
  // Mês 3: (P*1.01 + P)*1.01 + P = P*(1.01^2 + 1.01 + 1) = P * 3.0301
  // P = 10000 / 3.0301 ≈ 3300.2211... -> 3300.23 (330023 centavos)
  const taxaAnualEfetiva = (Math.pow(1.01, 12) - 1) * 100; // Taxa anual que resulta em i = 0.01 exato
  const res = calculateGoal({
    modo: MODOS_CALCULO.APORTE_NECESSARIO,
    precoBem: 10000,
    valorEconomizado: 0,
    prazoMeses: 3,
    rentabilidadeAnual: taxaAnualEfetiva
  });

  assert.equal(res.ok, true);
  assert.equal(res.data.aporteMensalNecessarioCentavos, 330023);
  assert.ok(res.data.montanteFinalCentavos >= 1000000);
});

/* ==========================================================================
 * 14. Geração de texto de cópia e formatação de resultados
 * ========================================================================== */
test('14. buildCopyText e formatResult: estruturação sem placeholders nem undefined', () => {
  const res = calculateGoal({
    modo: MODOS_CALCULO.APORTE_NECESSARIO,
    precoBem: 25000,
    valorEconomizado: 5000,
    prazoMeses: 18,
    rentabilidadeAnual: 6
  });

  const texto = buildCopyText(res);
  assert.match(texto, /Planejamento de Meta para Comprar um Bem/);
  assert.match(texto, /Preço do Bem:\s*R\$\s*25\.000,00/);
  assert.match(texto, /Valor Já Economizado:\s*R\$\s*5\.000,00/);
  assert.match(texto, /Aporte Mensal Necessário:/);
  assert.doesNotMatch(texto, /\b(undefined|null|NaN)\b/, 'Não deve conter undefined, null ou NaN');
});

/* ==========================================================================
 * 15. Integração com o DOM via setupTool e Limpeza de Campos
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
    children.forEach(child => {
      if (child) {
        child.parentNode = this;
        this.children.push(child);
      }
    });
  }
  appendChild(child) {
    if (child) {
      child.parentNode = this;
      this.children.push(child);
    }
    return child;
  }
  setAttribute(name, value) {
    this.attributes[name] = String(value);
  }
  getAttribute(name) {
    return this.attributes[name] ?? null;
  }
  addEventListener(name, fn) {
    (this.listeners[name] ||= []).push(fn);
  }
  querySelectorAll(selector) {
    const found = [];
    const visit = (node) => {
      for (const child of node.children) {
        if (selector.startsWith('.') && child.className?.split(' ').includes(selector.slice(1))) found.push(child);
        else if (selector.startsWith('#') && child.id === selector.slice(1)) found.push(child);
        else if (selector.toUpperCase() === child.tagName) found.push(child);
        visit(child);
      }
    };
    visit(this);
    return found;
  }
  querySelector(selector) {
    return this.querySelectorAll(selector)[0] || null;
  }
  closest(selector) {
    let p = this.parentNode;
    while (p) {
      if (selector.startsWith('.') && p.className?.split(' ').includes(selector.slice(1))) return p;
      p = p.parentNode;
    }
    return null;
  }
  reset() {}
  focus() {}
}

test('15. setupTool: inicializa interface, executa cálculo e limpa campos', () => {
  const prevDoc = globalThis.document;
  const prevWin = globalThis.window;
  const prevNav = Object.getOwnPropertyDescriptor(globalThis, 'navigator');

  try {
    const registry = new Map();
    const getOrCreate = (id, tag = 'div') => {
      if (!registry.has(id)) {
        const el = new MockElement(tag);
        el.id = id;
        registry.set(id, el);
      }
      return registry.get(id);
    };

    const form = getOrCreate('formMetaComprarBem', 'form');
    const selModo = getOrCreate('modoCalculoMetaBem', 'select');
    selModo.value = 'aporte_necessario';

    const precoInput = getOrCreate('precoBemMeta', 'input');
    precoInput.value = '10.000,00';
    const econInput = getOrCreate('valorEconomizadoMeta', 'input');
    econInput.value = '2.000,00';
    const rentInput = getOrCreate('rentabilidadeAnualMeta', 'input');
    rentInput.value = '0';
    const prazoInput = getOrCreate('prazoMesesMeta', 'input');
    prazoInput.value = '10';
    const aporteInput = getOrCreate('aporteMensalMeta', 'input');

    const btnCalcular = getOrCreate('btnCalcularMetaBem', 'button');
    const btnLimpar = getOrCreate('btnLimparMetaBem', 'button');
    const painelErro = getOrCreate('erroMetaComprarBem', 'p');
    const painelResultado = getOrCreate('resultadoMetaComprarBem', 'section');

    const elDestaqueLabel = getOrCreate('resLabelDestaqueMeta', 'p');
    const elDestaqueValor = getOrCreate('resValorDestaqueMeta', 'p');
    const elDestaqueBadge = getOrCreate('resBadgeDestaqueMeta', 'span');

    const elSubDestaqueLabel = getOrCreate('resLabelSubDestaqueMeta', 'p');
    const elSubDestaqueValor = getOrCreate('resValorSubDestaqueMeta', 'p');
    const elSubDestaqueBadge = getOrCreate('resBadgeSubDestaqueMeta', 'span');

    const elPreco = getOrCreate('resPrecoBemMeta', 'span');
    const elEcon = getOrCreate('resValorEconomizadoMeta', 'span');
    const elFalta = getOrCreate('resFaltaAcumularMeta', 'span');
    const elAportes = getOrCreate('resTotalAportesMeta', 'span');
    const elRend = getOrCreate('resRendimentoEstimadoMeta', 'span');
    const elMontante = getOrCreate('resMontanteFinalMeta', 'span');
    const elRent = getOrCreate('resRentabilidadeAplicadaMeta', 'span');

    const wrapperCronograma = getOrCreate('wrapperCronogramaMetaBem', 'div');
    const tabelaCronograma = getOrCreate('tabelaCronogramaMetaBem', 'table');
    tabelaCronograma.append(new MockElement('tbody'));

    const memoria = getOrCreate('memoriaCalculoMetaBem', 'ul');
    const avisos = getOrCreate('avisosMetaComprarBem', 'div');
    const statusAcoes = getOrCreate('statusAcoesMetaBem', 'p');

    globalThis.document = { createElement: (tag) => new MockElement(tag) };
    globalThis.window = { location: { href: 'https://www.calculadoramaster.com/tools/financas/meta-comprar-bem.html' } };
    Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { clipboard: { writeText: async () => {} } } });

    const mockRoot = {
      querySelector: (selector) => {
        const id = selector.replace(/^[#.]/, '');
        return registry.get(id) || null;
      },
      querySelectorAll: (selector) => {
        const el = mockRoot.querySelector(selector);
        return el ? [el] : [];
      }
    };

    const tool = setupTool(mockRoot);
    assert.ok(tool);

    // Executa cálculo
    const res = tool.executarCalculo();
    assert.equal(res.ok, true);
    assert.equal(painelResultado.hidden, false);
    assert.match(elDestaqueValor.textContent, /800,00/);

    // Simula clique no botão limpar
    btnLimpar.listeners['click'][0]();
    assert.equal(painelResultado.hidden, true);
  } finally {
    if (prevDoc === undefined) delete globalThis.document; else globalThis.document = prevDoc;
    if (prevWin === undefined) delete globalThis.window; else globalThis.window = prevWin;
    if (prevNav) Object.defineProperty(globalThis, 'navigator', prevNav); else delete globalThis.navigator;
  }
});

/* ==========================================================================
 * 16. Conformidade Semântica, Acessibilidade e Ausência de Estilos Inline no HTML
 * ========================================================================== */
test('16. Página HTML segue estritamente padrões semânticos, sem inline style e sem br', () => {
  const pagePath = path.join(ROOT_DIR, 'src', 'pages', 'tools', 'financas', 'meta-comprar-bem.page.html');
  assert.ok(fs.existsSync(pagePath), 'meta-comprar-bem.page.html deve existir');

  const content = fs.readFileSync(pagePath, 'utf-8');
  assert.match(content, /layout:\s*tool/);
  assert.match(content, /id="formMetaComprarBem"/);
  assert.match(content, /id="resultadoMetaComprarBem"/);
  assert.match(content, /role="alert"/);
  assert.match(content, /aria-live="polite"/);

  // Proibição de estilos inline e tags de quebra forçada (conforme tool-layout.test.js)
  assert.doesNotMatch(content, /<br\s*\/?\s*>/i, 'Não deve conter tags <br>');
  assert.doesNotMatch(content, /style="/i, 'Não deve conter atributo style inline');
});

/* ==========================================================================
 * 17. Reconhecimento da Ferramenta pelo Sistema de Favoritos
 * ========================================================================== */
test('17. ID meta-comprar-bem consta no conjunto de ferramentas válidas para favoritos', () => {
  assert.ok(VALID_TOOL_IDS.has('meta-comprar-bem'), 'VALID_TOOL_IDS deve conter meta-comprar-bem');
});

/* ==========================================================================
 * 18. Consistência matemática do aporte mensal e precisão do menor aporte (Modo A)
 * ========================================================================== */
function independentMonthlySimulator(capitalCentavos, taxaMensalDecimal, prazoMeses, aporteCentavos) {
  let saldo = capitalCentavos;
  for (let m = 1; m <= prazoMeses; m++) {
    const juros = taxaMensalDecimal > 0 ? Math.round(saldo * taxaMensalDecimal) : 0;
    saldo = saldo + juros + aporteCentavos;
  }
  return saldo;
}

test('18. Consistência matemática do aporte mensal e precisão do menor aporte (Modo A)', () => {
  // Caso A: Caso onde a fórmula teórica arredondava para baixo e faltava 1 centavo
  // Preço: R$ 100,00, Capital: 0, Prazo: 12 meses, Taxa: 15% a.a.
  // Pela fórmula teórica pura: Math.ceil dava 781 centavos, mas no simulador resultava em 9999 centavos (< meta).
  // Com o ajuste fino de produção, o menor aporte deve garantir >= 10000 e aporte - 1 centavo deve ser < 10000.
  const caso1 = calculateGoal({
    modo: MODOS_CALCULO.APORTE_NECESSARIO,
    precoBem: '100,00',
    valorEconomizado: '0,00',
    prazoMeses: 12,
    rentabilidadeAnual: 15
  });
  assert.equal(caso1.ok, true);
  assert.equal(caso1.data.aporteMensalNecessarioCentavos, 782); // R$ 7,82
  assert.ok(caso1.data.montanteFinalCentavos >= 10000);
  const sim1Aporte = independentMonthlySimulator(0, caso1.data.taxaMensalDecimal, 12, 782);
  const sim1MenosUm = independentMonthlySimulator(0, caso1.data.taxaMensalDecimal, 12, 781);
  assert.equal(caso1.data.montanteFinalCentavos, sim1Aporte);
  assert.ok(sim1Aporte >= 10000);
  assert.ok(sim1MenosUm < 10000, 'Reduzir aporte em 1 centavo deve deixar o saldo abaixo da meta');

  // Caso B: Caso onde a fórmula teórica arredondava para cima e 1 centavo a menos já atinge exatamente a meta
  // Preço: R$ 100,00, Capital: 0, Prazo: 2 meses, Taxa: 8.5% a.a.
  // Pela fórmula teórica: Math.ceil dava 4984 centavos. Mas 4983 centavos já produz exatamente 10000 centavos!
  const caso2 = calculateGoal({
    modo: MODOS_CALCULO.APORTE_NECESSARIO,
    precoBem: '100,00',
    valorEconomizado: '0,00',
    prazoMeses: 2,
    rentabilidadeAnual: 8.5
  });
  assert.equal(caso2.ok, true);
  assert.equal(caso2.data.aporteMensalNecessarioCentavos, 4983); // R$ 49,83
  assert.equal(caso2.data.montanteFinalCentavos, 10000);
  const sim2MenosUm = independentMonthlySimulator(0, caso2.data.taxaMensalDecimal, 2, 4982);
  assert.ok(sim2MenosUm < 10000, '4982 centavos deve ficar abaixo de 10000 centavos');

  // Caso C: Capital inicial positivo com centavos e meta com centavos
  // Preço: R$ 10.500,75, Capital: R$ 1.234,56, Prazo: 6 meses, Taxa: 12% a.a.
  const caso3 = calculateGoal({
    modo: MODOS_CALCULO.APORTE_NECESSARIO,
    precoBem: '10500,75',
    valorEconomizado: '1234,56',
    prazoMeses: 6,
    rentabilidadeAnual: 12
  });
  assert.equal(caso3.ok, true);
  assert.ok(caso3.data.montanteFinalCentavos >= 1050075);
  const p3 = caso3.data.aporteMensalNecessarioCentavos;
  const sim3 = independentMonthlySimulator(123456, caso3.data.taxaMensalDecimal, 6, p3);
  const sim3MenosUm = independentMonthlySimulator(123456, caso3.data.taxaMensalDecimal, 6, p3 - 1);
  assert.equal(caso3.data.montanteFinalCentavos, sim3);
  assert.ok(sim3 >= 1050075);
  assert.ok(sim3MenosUm < 1050075, 'Reduzir em 1 centavo deve ficar abaixo de 1050075 centavos');

  // Caso D: Prazo longo (240 meses) com rentabilidade zero (0% a.a.) e centavos
  // Preço: R$ 123.456,78, Capital: R$ 50.000,00, Prazo: 240 meses, Taxa: 0%
  const caso4 = calculateGoal({
    modo: MODOS_CALCULO.APORTE_NECESSARIO,
    precoBem: '123456,78',
    valorEconomizado: '50000,00',
    prazoMeses: 240,
    rentabilidadeAnual: 0
  });
  assert.equal(caso4.ok, true);
  assert.equal(caso4.data.rendimentoEstimadoCentavos, 0);
  assert.ok(caso4.data.montanteFinalCentavos >= 12345678);
  const p4 = caso4.data.aporteMensalNecessarioCentavos;
  assert.ok(5000000 + p4 * 240 >= 12345678);
  assert.ok(5000000 + (p4 - 1) * 240 < 12345678);

  // Caso E: Limite máximo de prazo (600 meses) e rentabilidade expressiva (13.75% a.a.)
  // Preço: R$ 1.000.000,00, Capital: R$ 1.000,00, Prazo: 600 meses
  const caso5 = calculateGoal({
    modo: MODOS_CALCULO.APORTE_NECESSARIO,
    precoBem: 1000000,
    valorEconomizado: 1000,
    prazoMeses: 600,
    rentabilidadeAnual: 13.75
  });
  assert.equal(caso5.ok, true);
  assert.ok(caso5.data.montanteFinalCentavos >= 100000000);
  const p5 = caso5.data.aporteMensalNecessarioCentavos;
  const sim5 = independentMonthlySimulator(100000, caso5.data.taxaMensalDecimal, 600, p5);
  const sim5MenosUm = independentMonthlySimulator(100000, caso5.data.taxaMensalDecimal, 600, p5 - 1);
  assert.equal(caso5.data.montanteFinalCentavos, sim5);
  assert.ok(sim5 >= 100000000);
  assert.ok(sim5MenosUm < 100000000);

  // Caso F: Capital inicial quase atinge a meta no prazo de 1 mês
  // Preço: R$ 10.000,00, Capital: R$ 9.900,00, Prazo: 1 mês, Taxa: 10% a.a.
  const caso6 = calculateGoal({
    modo: MODOS_CALCULO.APORTE_NECESSARIO,
    precoBem: 10000,
    valorEconomizado: 9900,
    prazoMeses: 1,
    rentabilidadeAnual: 10
  });
  assert.equal(caso6.ok, true);
  assert.equal(caso6.data.montanteFinalCentavos, 1000000);
  const p6 = caso6.data.aporteMensalNecessarioCentavos;
  const sim6MenosUm = independentMonthlySimulator(990000, caso6.data.taxaMensalDecimal, 1, p6 - 1);
  assert.ok(sim6MenosUm < 1000000);

  // Caso G: Capital inicial sozinho já ultrapassa a meta com juros no prazo (aporte zero)
  // Preço: R$ 10.000,00, Capital: R$ 9.500,00, Prazo: 12 meses, Taxa: 10% a.a.
  const caso7 = calculateGoal({
    modo: MODOS_CALCULO.APORTE_NECESSARIO,
    precoBem: 10000,
    valorEconomizado: 9500,
    prazoMeses: 12,
    rentabilidadeAnual: 10
  });
  assert.equal(caso7.ok, true);
  assert.equal(caso7.data.aporteMensalNecessarioCentavos, 0);
  assert.ok(caso7.data.montanteFinalCentavos >= 1000000);
});

/* ==========================================================================
 * 19. Bateria de regressão paramétrica: validação com simulador discreto independente
 * ========================================================================== */
test('19. Bateria de regressão: saldo final >= meta e precisão estrita do menor aporte', () => {
  const precosTeste = [50, 100, 1234.56, 5000.49, 25000, 100000.99];
  const capitaisTeste = [0, 10.25, 500, 2400.50];
  const prazosTeste = [1, 2, 3, 6, 12, 24, 60, 120, 360, 600];
  const taxasTeste = [0, 0.5, 6, 8.5, 10, 12, 15, 20];

  let totalVerificados = 0;

  for (const preco of precosTeste) {
    const precoCentavos = parseMoneyToCents(preco);
    for (const capital of capitaisTeste) {
      const capitalCentavos = parseMoneyToCents(capital);
      if (capitalCentavos >= precoCentavos) continue;

      for (const prazo of prazosTeste) {
        for (const taxa of taxasTeste) {
          totalVerificados++;
          const res = calculateGoal({
            modo: MODOS_CALCULO.APORTE_NECESSARIO,
            precoBem: preco,
            valorEconomizado: capital,
            prazoMeses: prazo,
            rentabilidadeAnual: taxa
          });

          assert.equal(res.ok, true, `Falha no cálculo para preco=${preco}, capital=${capital}, prazo=${prazo}, taxa=${taxa}`);
          const { aporteMensalNecessarioCentavos, montanteFinalCentavos, taxaMensalDecimal } = res.data;

          // 1. Simulação independente deve bater centavo a centavo com o simulador de produção
          const saldoSimulado = independentMonthlySimulator(capitalCentavos, taxaMensalDecimal, prazo, aporteMensalNecessarioCentavos);
          assert.equal(
            montanteFinalCentavos,
            saldoSimulado,
            `Inconsistência entre simulador independente e resultado retornado (${montanteFinalCentavos} vs ${saldoSimulado})`
          );

          // 2. Saldo final projetado deve ser maior ou igual à meta
          assert.ok(
            montanteFinalCentavos >= precoCentavos,
            `Saldo final (${montanteFinalCentavos}) ficou abaixo da meta (${precoCentavos}) para preco=${preco}, capital=${capital}, prazo=${prazo}, taxa=${taxa}`
          );

          // 3. Precisão do menor aporte: reduzir 1 centavo deve deixar o saldo final abaixo da meta
          if (aporteMensalNecessarioCentavos > 0) {
            const saldoComUmCentavoAMenos = independentMonthlySimulator(capitalCentavos, taxaMensalDecimal, prazo, aporteMensalNecessarioCentavos - 1);
            assert.ok(
              saldoComUmCentavoAMenos < precoCentavos,
              `Aporte sugerido não é o menor possível: aporte-1 ainda atinge a meta (${saldoComUmCentavoAMenos} >= ${precoCentavos}) para preco=${preco}, capital=${capital}, prazo=${prazo}, taxa=${taxa}`
            );
          }
        }
      }
    }
  }

  assert.ok(totalVerificados >= 1000, `Deveria ter verificado pelo menos 1000 cenários, verificou ${totalVerificados}`);
});
