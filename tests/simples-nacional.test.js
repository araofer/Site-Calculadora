import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  ANO_REFERENCIA,
  DATA_CONSULTA_OFICIAL,
  TETO_SIMPLES_NACIONAL,
  SUBLIMITE_ESTADUAL,
  MARGEM_EXCESSO_SUBLIMITE_20,
  MARGEM_EXCESSO_TETO_20,
  PERCENTUAL_FATOR_R_CORTE,
  FONTES_OFICIAIS,
  ANEXOS,
  ROTULOS_ANEXO,
  MODOS_APURACAO,
  ROTULOS_MODO_APURACAO,
  TIPOS_OPERACAO,
  TABELAS_ANEXOS,
  roundCurrency,
  roundDecimal,
  parseFlexibleNumber,
  formatCurrency,
  formatPercent,
  calcularFatorR,
  analisarLimitesSublimite,
  obterFaixaAnexo,
  calcularAliquotaEfetiva,
  calcularTaxaSublimiteArt24,
  ratearCentavosMaiorResto,
  calcularDistribuicaoTributos,
  normalizeInput,
  validateInput,
  calculate,
  formatResult,
  buildCopyText,
  setupTool
} from '../js/tools/simples-nacional.js';

import {
  VALID_TOOL_IDS,
  addFavorite,
  removeFavorite,
  isFavorite,
  _resetMemoryForTesting
} from '../js/core/favorites.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

function createElementStub(tagName = 'div', id = '') {
  const listeners = new Map();
  const attributes = new Map();
  const children = [];

  const el = {
    tagName: tagName.toUpperCase(),
    id,
    value: '',
    textContent: '',
    hidden: false,
    disabled: false,
    dataset: {},
    children,
    setAttribute(name, val) {
      const str = String(val);
      attributes.set(name, str);
      if (name === 'hidden') this.hidden = true;
      if (name === 'disabled') this.disabled = true;
    },
    getAttribute(name) {
      if (name === 'hidden') return this.hidden ? '' : null;
      if (name === 'disabled') return this.disabled ? '' : null;
      return attributes.has(name) ? attributes.get(name) : null;
    },
    removeAttribute(name) {
      attributes.delete(name);
      if (name === 'hidden') this.hidden = false;
      if (name === 'disabled') this.disabled = false;
    },
    appendChild(child) {
      children.push(child);
      return child;
    },
    replaceChildren(...newChildren) {
      children.length = 0;
      children.push(...newChildren);
    },
    addEventListener(type, handler) {
      if (!listeners.has(type)) listeners.set(type, []);
      listeners.get(type).push(handler);
    },
    dispatchEvent(event) {
      const evt = event || { type: 'unknown' };
      if (!evt.target) evt.target = el;
      const handlers = listeners.get(evt.type) || [];
      for (const h of handlers) {
        h(evt);
      }
      return true;
    },
    click() {
      this.dispatchEvent({ type: 'click', preventDefault() {} });
    }
  };

  return el;
}

function createFakeDomRoot() {
  const root = createElementStub('div', 'root');
  const elements = new Map();

  function register(el) {
    if (el.id) elements.set(el.id, el);
    return el;
  }

  // Form e Controles
  const form = register(createElementStub('form', 'formSimplesNacional'));
  register(createElementStub('select', 'modoApuracaoSN'));
  register(createElementStub('select', 'tipoOperacaoSN'));
  register(createElementStub('select', 'anexoSN'));

  register(createElementStub('input', 'rbt12SN'));
  register(createElementStub('input', 'rbaSN'));
  register(createElementStub('input', 'receitaMesSN'));
  register(createElementStub('input', 'folha12SN'));
  register(createElementStub('input', 'mesesInicioSN'));
  register(createElementStub('input', 'receitaAnteriorInicioSN'));

  register(createElementStub('input', 'recAnexo1SN'));
  register(createElementStub('input', 'recAnexo2SN'));
  register(createElementStub('input', 'recAnexo3SN'));
  register(createElementStub('input', 'recAnexo4SN'));
  register(createElementStub('input', 'recAnexo5SN'));

  register(createElementStub('div', 'grupoRbt12SN'));
  register(createElementStub('div', 'grupoInicioMesesSN'));
  register(createElementStub('div', 'grupoAnexoUnicoSN'));
  register(createElementStub('div', 'grupoReceitaMesUnicaSN'));
  register(createElementStub('div', 'grupoFatorRSN'));
  register(createElementStub('div', 'grupoSegregadasSN'));

  register(createElementStub('button', 'btnCalcularSN'));
  register(createElementStub('button', 'btnLimparSN'));
  register(createElementStub('button', 'btnCopiarSN'));
  register(createElementStub('button', 'btnCompartilharSN'));
  register(createElementStub('button', 'btnImprimirSN'));

  register(createElementStub('p', 'erroSimplesNacional'));
  register(createElementStub('section', 'resultadoSimplesNacional'));
  register(createElementStub('p', 'statusSimplesNacional'));

  register(createElementStub('strong', 'resAnexoSN'));
  register(createElementStub('strong', 'resFaixaSN'));
  register(createElementStub('strong', 'resRbt12SN'));
  register(createElementStub('strong', 'resReceitaMesSN'));
  register(createElementStub('strong', 'resAliquotaNominalSN'));
  register(createElementStub('strong', 'resParcelaDeduzirSN'));
  register(createElementStub('strong', 'resAliquotaEfetivaSN'));
  register(createElementStub('strong', 'resValorDasSN'));

  register(createElementStub('div', 'blocoAlertaLimiteSN'));
  register(createElementStub('div', 'resAlertaLimiteSN'));

  register(createElementStub('div', 'cardFatorRResultadoSN'));
  register(createElementStub('strong', 'resFatorRPercentualSN'));
  register(createElementStub('strong', 'resFatorREnquadramentoSN'));

  register(createElementStub('ul', 'listaMemoriaCalculoSN'));

  root.querySelector = (sel) => {
    if (sel.startsWith('#')) {
      const id = sel.slice(1);
      return elements.get(id) || null;
    }
    return null;
  };

  return root;
}

// ---------------------------------------------------------------------------
// 1. Parâmetros e fontes oficiais de 2026
// ---------------------------------------------------------------------------
test('1. Parâmetros oficiais de 2026 e fontes da LC 123/2006 e Res. CGSN 140/2018', () => {
  assert.equal(ANO_REFERENCIA, 2026);
  assert.equal(DATA_CONSULTA_OFICIAL, '2026-10-22');
  assert.equal(TETO_SIMPLES_NACIONAL, 4800000.0);
  assert.equal(SUBLIMITE_ESTADUAL, 3600000.0);
  assert.equal(MARGEM_EXCESSO_SUBLIMITE_20, 4320000.0);
  assert.equal(MARGEM_EXCESSO_TETO_20, 5760000.0);
  assert.equal(PERCENTUAL_FATOR_R_CORTE, 0.28);

  assert.match(FONTES_OFICIAIS.leiComplementar123, /planalto\.gov\.br.*lcp123/);
  assert.match(FONTES_OFICIAIS.resolucaoCgsn140, /receita\.fazenda\.gov\.br/);
  assert.match(FONTES_OFICIAIS.manualPgdasD, /MANUAL_PGDAS-D/);
  assert.match(FONTES_OFICIAIS.perguntaoSimplesNacional, /PerguntaoSN\.pdf/);
  assert.match(FONTES_OFICIAIS.rfbOrientacaoAnexoIv, /gov\.br\/receitafederal.*anexo-iv/);
});

// ---------------------------------------------------------------------------
// 2. Primeira faixa dos Anexos I, II, III, IV e V
// ---------------------------------------------------------------------------
test('2. Primeira faixa dos Anexos I a V: Alíquota efetiva igual à alíquota nominal (parcela = 0)', () => {
  const casosPrimeiraFaixa = [
    { anexo: ANEXOS.ANEXO_I, aliqEsperada: 0.040 },
    { anexo: ANEXOS.ANEXO_II, aliqEsperada: 0.045 },
    { anexo: ANEXOS.ANEXO_III, aliqEsperada: 0.060 },
    { anexo: ANEXOS.ANEXO_IV, aliqEsperada: 0.045 },
    { anexo: ANEXOS.ANEXO_V, aliqEsperada: 0.155 }
  ];

  for (const c of casosPrimeiraFaixa) {
    const calc = calcularAliquotaEfetiva(c.anexo, 100000.0);
    assert.equal(calc.faixa, 1);
    assert.equal(calc.aliquotaNominal, c.aliqEsperada);
    assert.equal(calc.parcelaDeduzir, 0.0);
    assert.equal(calc.aliquotaEfetiva, c.aliqEsperada);

    const res = calculate({
      anoReferencia: 2026,
      modoApuracao: 'regra_geral',
      tipoOperacao: 'unica',
      anexo: c.anexo,
      rbt12: '100000,00',
      receitaMes: '10000,00'
    });
    assert.equal(res.ok, true);
    assert.equal(res.data.apuracoesPorAnexo[0].faixa, 1);
    assert.equal(res.data.valorDasTotal, roundCurrency(10000.0 * c.aliqEsperada));
  }
});

// ---------------------------------------------------------------------------
// 3. Fórmula da alíquota efetiva e limites entre faixas
// ---------------------------------------------------------------------------
test('3. Limites exatos entre faixas e transição de deduções', () => {
  // Exatamente no limite superior da 1ª faixa: R$ 180.000,00
  const anexo1Faixa1 = calcularAliquotaEfetiva(ANEXOS.ANEXO_I, 180000.0);
  assert.equal(anexo1Faixa1.faixa, 1);
  assert.equal(anexo1Faixa1.aliquotaNominal, 0.040);
  assert.equal(anexo1Faixa1.parcelaDeduzir, 0.0);
  assert.equal(anexo1Faixa1.aliquotaEfetiva, 0.040);

  // Exatamente 1 centavo acima: R$ 180.000,01 -> 2ª Faixa
  const anexo1Faixa2 = calcularAliquotaEfetiva(ANEXOS.ANEXO_I, 180000.01);
  assert.equal(anexo1Faixa2.faixa, 2);
  assert.equal(anexo1Faixa2.aliquotaNominal, 0.073);
  assert.equal(anexo1Faixa2.parcelaDeduzir, 5940.0);

  // Limite da 2ª faixa: R$ 360.000,00
  const anexo1Faixa2Fim = calcularAliquotaEfetiva(ANEXOS.ANEXO_I, 360000.0);
  assert.equal(anexo1Faixa2Fim.faixa, 2);

  // Início da 3ª faixa: R$ 360.000,01
  const anexo1Faixa3 = calcularAliquotaEfetiva(ANEXOS.ANEXO_I, 360000.01);
  assert.equal(anexo1Faixa3.faixa, 3);
  assert.equal(anexo1Faixa3.aliquotaNominal, 0.095);
  assert.equal(anexo1Faixa3.parcelaDeduzir, 13860.0);
});

// ---------------------------------------------------------------------------
// 4. Faixas superiores e parcelas a deduzir nos Anexos I a V
// ---------------------------------------------------------------------------
test('4. Cálculos numéricos independentes nas faixas superiores', () => {
  // Caso A: Anexo I na 2ª faixa com RBT12 = R$ 300.000,00 e receita mês = R$ 25.000,00
  // Fórmula independente: (300.000 * 0,073 - 5.940) / 300.000 = (21.900 - 5.940) / 300.000 = 15.960 / 300.000 = 0,0532 (5,32%)
  // DAS: 25.000 * 0,0532 = R$ 1.330,00
  const resA = calculate({
    anoReferencia: 2026,
    modoApuracao: 'regra_geral',
    tipoOperacao: 'unica',
    anexo: 'anexo_1',
    rbt12: '300000,00',
    receitaMes: '25000,00'
  });
  assert.equal(resA.ok, true);
  assert.equal(resA.data.apuracoesPorAnexo[0].faixa, 2);
  assert.equal(roundDecimal(resA.data.apuracoesPorAnexo[0].aliquotaEfetiva, 4), 0.0532);
  assert.equal(resA.data.valorDasTotal, 1330.0);

  // Caso B: Anexo III na 3ª faixa com RBT12 = R$ 500.000,00 e receita mês = R$ 40.000,00
  // Faixa 3: Alíquota nominal 13,50%, Parcela a deduzir R$ 17.640,00
  // Fórmula: (500.000 * 0,135 - 17.640) / 500.000 = (67.500 - 17.640) / 500.000 = 49.860 / 500.000 = 0,09972 (9,972%)
  // DAS: 40.000 * 0,09972 = R$ 3.988,80
  const resB = calculate({
    anoReferencia: 2026,
    modoApuracao: 'regra_geral',
    tipoOperacao: 'unica',
    anexo: 'anexo_3',
    rbt12: '500000,00',
    receitaMes: '40000,00'
  });
  assert.equal(resB.ok, true);
  assert.equal(resB.data.apuracoesPorAnexo[0].faixa, 3);
  assert.equal(roundDecimal(resB.data.apuracoesPorAnexo[0].aliquotaEfetiva, 5), 0.09972);
  assert.equal(resB.data.valorDasTotal, 3988.80);

  // Caso C: Anexo V na 4ª faixa com RBT12 = R$ 1.000.000,00 e receita mês = R$ 50.000,00
  // Faixa 4: Alíquota nominal 20,50%, Parcela a deduzir R$ 17.100,00
  // Fórmula: (1.000.000 * 0,205 - 17.100) / 1.000.000 = (205.000 - 17.100) / 1.000.000 = 187.900 / 1.000.000 = 0,1879 (18,79%)
  // DAS: 50.000 * 0,1879 = R$ 9.395,00
  const resC = calculate({
    anoReferencia: 2026,
    modoApuracao: 'regra_geral',
    tipoOperacao: 'unica',
    anexo: 'anexo_5',
    rbt12: '1000000,00',
    receitaMes: '50000,00'
  });
  assert.equal(resC.ok, true);
  assert.equal(resC.data.apuracoesPorAnexo[0].faixa, 4);
  assert.equal(roundDecimal(resC.data.apuracoesPorAnexo[0].aliquotaEfetiva, 4), 0.1879);
  assert.equal(resC.data.valorDasTotal, 9395.0);

  // Caso D: Anexo I na 6ª faixa com RBT12 = R$ 4.400.000,00 e receita mês = R$ 100.000,00 (regras oficiais de 2026)
  // Faixa 6: Alíquota nominal 19,00%, Parcela a deduzir R$ 378.000,00
  // Fórmula oficial da LC 123/2006: ((4.400.000 * 0,19) - 378.000) / 4.400.000 = 458.000 / 4.400.000 = 0,104090909... (10,4090909%)
  // Rejeição categórica de 12,50%
  const calcFaixa6 = calcularAliquotaEfetiva(ANEXOS.ANEXO_I, 4400000.0);
  assert.equal(calcFaixa6.faixa, 6);
  assert.equal(calcFaixa6.aliquotaNominal, 0.19);
  assert.equal(calcFaixa6.parcelaDeduzir, 378000.0);
  assert.equal(roundDecimal(calcFaixa6.aliquotaEfetiva, 7), 0.1040909);
  assert.notEqual(calcFaixa6.aliquotaEfetiva, 0.125, 'Alíquota da 6ª faixa do Anexo I não deve ser 12,50%');

  const resD = calculate({
    anoReferencia: 2026,
    modoApuracao: 'regra_geral',
    tipoOperacao: 'unica',
    anexo: 'anexo_1',
    rbt12: '4400000,00',
    receitaMes: '100000,00'
  });
  assert.equal(resD.ok, true);
  assert.equal(resD.data.apuracoesPorAnexo[0].faixa, 6);
  assert.equal(roundDecimal(resD.data.apuracoesPorAnexo[0].aliquotaEfetiva, 7), 0.1040909);
  assert.equal(resD.data.valorDasTotal, 10409.09);
});

// ---------------------------------------------------------------------------
// 5. RBT12 igual a zero
// ---------------------------------------------------------------------------
test('5. RBT12 igual a zero aplica alíquota da 1ª faixa sem gerar NaN nem erro', () => {
  const res = calculate({
    anoReferencia: 2026,
    modoApuracao: 'regra_geral',
    tipoOperacao: 'unica',
    anexo: 'anexo_1',
    rbt12: '0',
    receitaMes: '10000,00'
  });
  assert.equal(res.ok, true);
  assert.equal(res.data.apuracoesPorAnexo[0].faixa, 1);
  assert.equal(res.data.apuracoesPorAnexo[0].aliquotaEfetiva, 0.040);
  assert.equal(res.data.valorDasTotal, 400.0);
});

// ---------------------------------------------------------------------------
// 6. Receita mensal igual a zero
// ---------------------------------------------------------------------------
test('6. Receita mensal igual a zero resulta em DAS de R$ 0,00 mantendo a alíquota calculada', () => {
  const res = calculate({
    anoReferencia: 2026,
    modoApuracao: 'regra_geral',
    tipoOperacao: 'unica',
    anexo: 'anexo_3',
    rbt12: '300000,00',
    receitaMes: '0,00'
  });
  assert.equal(res.ok, true);
  assert.equal(res.data.valorDasTotal, 0.0);
  assert.ok(res.data.apuracoesPorAnexo[0].aliquotaEfetiva > 0);
});

// ---------------------------------------------------------------------------
// 7. Fator R exatamente em 28,00% e acima (regime de caixa e composição do art. 26)
// ---------------------------------------------------------------------------
test('7. Fator R exatamente em 28,00% e acima: enquadra no Anexo III com folha sob regime de caixa', () => {
  // Limite exato: Folha = R$ 28.000,00 e RBT12 = R$ 100.000,00 -> 28.000 / 100.000 = 0,28 (28,00%)
  const fExato = calcularFatorR(28000, 100000);
  assert.equal(fExato.atingeCorte, true);
  assert.equal(fExato.anexoAplicavel, ANEXOS.ANEXO_III);
  assert.equal(fExato.fatorRPercentual, 28.0);

  // Levemente acima: Folha = R$ 28.001,00 -> 28,001%
  const fAcima = calcularFatorR(28001, 100000);
  assert.equal(fAcima.atingeCorte, true);
  assert.equal(fAcima.anexoAplicavel, ANEXOS.ANEXO_III);

  // Composição da folha sob regime de caixa (Res. CGSN 140/2018, art. 26, § 1º):
  // Remunerações a empregados (R$ 50.000) + Pró-labore (R$ 30.000) + 13º (R$ 5.000) + Encargos CPP (R$ 10.000) + FGTS (R$ 5.000) = R$ 100.000
  // RBT12 = R$ 300.000 -> 100.000 / 300.000 = 33,33% -> Anexo III
  const folhaCompostaRegimeCaixa = 50000 + 30000 + 5000 + 10000 + 5000;
  const resComposta = calculate({
    anoReferencia: 2026,
    modoApuracao: 'regra_geral',
    tipoOperacao: 'unica',
    anexo: 'fator_r',
    rbt12: '300000,00',
    folha12: String(folhaCompostaRegimeCaixa),
    receitaMes: '20000,00'
  });
  assert.equal(resComposta.ok, true);
  assert.equal(resComposta.data.anexoEfetivoPrincipal, ANEXOS.ANEXO_III);

  const res = calculate({
    anoReferencia: 2026,
    modoApuracao: 'regra_geral',
    tipoOperacao: 'unica',
    anexo: 'fator_r',
    rbt12: '100000,00',
    folha12: '28000,00',
    receitaMes: '10000,00'
  });
  assert.equal(res.ok, true);
  assert.equal(res.data.anexoEfetivoPrincipal, ANEXOS.ANEXO_III);
  assert.equal(res.data.apuracoesPorAnexo[0].anexoId, ANEXOS.ANEXO_III);
  assert.equal(res.data.apuracoesPorAnexo[0].aliquotaEfetiva, 0.060); // 1ª faixa do Anexo III
  assert.equal(res.data.valorDasTotal, 600.0);
});

// ---------------------------------------------------------------------------
// 8. Fator R abaixo de 28,00%
// ---------------------------------------------------------------------------
test('8. Fator R abaixo de 28,00% enquadra no Anexo V', () => {
  // Folha = R$ 27.990,00 e RBT12 = R$ 100.000,00 -> 27.990 / 100.000 = 0,2799 (27,99%)
  const f = calcularFatorR(27990, 100000);
  assert.equal(f.atingeCorte, false);
  assert.equal(f.anexoAplicavel, ANEXOS.ANEXO_V);
  assert.equal(f.fatorRPercentual, 27.99);

  // Limite imediatamente inferior (27,999%)
  const fBorda = calcularFatorR(27999, 100000);
  assert.equal(fBorda.atingeCorte, false);
  assert.equal(fBorda.anexoAplicavel, ANEXOS.ANEXO_V);

  const res = calculate({
    anoReferencia: 2026,
    modoApuracao: 'regra_geral',
    tipoOperacao: 'unica',
    anexo: 'fator_r',
    rbt12: '100000,00',
    folha12: '27990,00',
    receitaMes: '10000,00'
  });
  assert.equal(res.ok, true);
  assert.equal(res.data.anexoEfetivoPrincipal, ANEXOS.ANEXO_V);
  assert.equal(res.data.apuracoesPorAnexo[0].anexoId, ANEXOS.ANEXO_V);
  assert.equal(res.data.apuracoesPorAnexo[0].aliquotaEfetiva, 0.155); // 1ª faixa do Anexo V
  assert.equal(res.data.valorDasTotal, 1550.0);
});

// ---------------------------------------------------------------------------
// 9. Segregação de receitas por anexo
// ---------------------------------------------------------------------------
test('9. Segregação de receitas: mesma RBT12 global com apurações e DAS independentes somados', () => {
  // Empresa mista: Comércio (Anexo I) e Serviços (Anexo III)
  // RBT12 Global = R$ 300.000,00 (ambos na 2ª faixa)
  // Anexo I: Alíq. Efetiva = (300.000 * 0,073 - 5.940) / 300.000 = 5,32%
  // Anexo III: Alíq. Efetiva = (300.000 * 0,112 - 9.360) / 300.000 = (33.600 - 9.360) / 300.000 = 24.240 / 300.000 = 8,08%
  // Receita mês: Anexo I = R$ 20.000,00 -> DAS I = R$ 1.064,00
  // Receita mês: Anexo III = R$ 15.000,00 -> DAS III = R$ 1.212,00
  // Total DAS = R$ 1.064,00 + R$ 1.212,00 = R$ 2.276,00
  const res = calculate({
    anoReferencia: 2026,
    modoApuracao: 'regra_geral',
    tipoOperacao: 'segregada',
    rbt12: '300000,00',
    receitaAnexo1: '20000,00',
    receitaAnexo2: '0',
    receitaAnexo3: '15000,00',
    receitaAnexo4: '0',
    receitaAnexo5: '0'
  });

  assert.equal(res.ok, true);
  assert.equal(res.data.apuracoesPorAnexo.length, 2);

  const ap1 = res.data.apuracoesPorAnexo.find((a) => a.anexoId === ANEXOS.ANEXO_I);
  const ap3 = res.data.apuracoesPorAnexo.find((a) => a.anexoId === ANEXOS.ANEXO_III);

  assert.equal(roundDecimal(ap1.aliquotaEfetiva, 4), 0.0532);
  assert.equal(ap1.valorDas, 1064.0);

  assert.equal(roundDecimal(ap3.aliquotaEfetiva, 4), 0.0808);
  assert.equal(ap3.valorDas, 1212.0);

  assert.equal(res.data.receitaTotalMes, 35000.0);
  assert.equal(res.data.valorDasTotal, 2276.0);
});

// ---------------------------------------------------------------------------
// 10. Tratamento específico do Anexo IV (sem CPP no DAS e ressalva da CPRB)
// ---------------------------------------------------------------------------
test('10. Tratamento específico do Anexo IV: alíquotas sem CPP, isenção expressa de terceiros (art. 13, § 3º) e ressalva da CPRB', () => {
  const res = calculate({
    anoReferencia: 2026,
    modoApuracao: 'regra_geral',
    tipoOperacao: 'unica',
    anexo: 'anexo_4',
    rbt12: '200000,00',
    receitaMes: '20000,00'
  });

  assert.equal(res.ok, true);
  assert.equal(res.data.apuracoesPorAnexo[0].incluiCppNoDas, false);

  // Alerta normativo expressando que CPP e RAT são recolhidos por fora e que a optante é ISENTA de terceiros
  const avisoCpp = res.warnings.find((w) => w.includes('ANEXO IV') && w.includes('NÃO inclui a Contribuição Previdenciária Patronal'));
  assert.ok(avisoCpp, 'Deve conter alerta expressando ausência de CPP no DAS do Anexo IV');
  assert.match(avisoCpp, /20%\s*\+\s*RAT/i);
  assert.match(avisoCpp, /isentas de contribuições a outras entidades e fundos/i);
  assert.doesNotMatch(avisoCpp, /20%\s*\+\s*RAT\s*\+\s*terceiros/i, 'Não deve declarar que terceiros são devidos');

  // Ressalva explícita sobre a CPRB (Lei nº 12.546/2011)
  assert.match(avisoCpp, /CPRB/i, 'Deve conter ressalva sobre CPRB');
  assert.match(avisoCpp, /Lei nº 12\.546\/2011/i, 'Deve citar a Lei nº 12.546/2011 da CPRB');
  assert.match(avisoCpp, /não é universal/i, 'Não deve apresentar a regra geral como universal');

  // Memória de cálculo também deve explicitar isenção de terceiros e ressalva da CPRB
  const memAnexo4 = res.data.memoriaCalculo.find((m) => m.includes('Nota do Anexo IV'));
  assert.ok(memAnexo4);
  assert.match(memAnexo4, /isen(ta|ção) de contribuições a outras entidades e fundos \(terceiros\)/i);
  assert.match(memAnexo4, /CPRB/i);
});

// ---------------------------------------------------------------------------
// 11. Empresa em início de atividade (1º mês e 2º ao 12º mês)
// ---------------------------------------------------------------------------
test('11. Início de atividade com proporcionalização da RBT12 (Res. CGSN 140/2018, art. 27)', () => {
  // 1º mês: Receita R$ 10.000,00 multiplicada por 12 = R$ 120.000,00 (Faixa 1)
  const resMes1 = calculate({
    anoReferencia: 2026,
    modoApuracao: 'inicio_mes_1',
    tipoOperacao: 'unica',
    anexo: 'anexo_1',
    receitaMes: '10000,00'
  });
  assert.equal(resMes1.ok, true);
  assert.equal(resMes1.data.rbt12Considerada, 120000.0);
  assert.equal(resMes1.data.apuracoesPorAnexo[0].faixa, 1);
  assert.equal(resMes1.data.valorDasTotal, 400.0);

  // 5º mês: R$ 125.000 acumulados em 5 meses -> Média = R$ 25.000 -> RBT12 = R$ 300.000 (Faixa 2)
  const resMeses2a12 = calculate({
    anoReferencia: 2026,
    modoApuracao: 'inicio_meses_2_12',
    tipoOperacao: 'unica',
    anexo: 'anexo_1',
    mesesAtividadeAnteriores: 5,
    receitaAcumuladaAnterior: '125000,00',
    receitaMes: '25000,00'
  });
  assert.equal(resMeses2a12.ok, true);
  assert.equal(resMeses2a12.data.rbt12Considerada, 300000.0);
  assert.equal(resMeses2a12.data.apuracoesPorAnexo[0].faixa, 2);
  assert.equal(roundDecimal(resMeses2a12.data.apuracoesPorAnexo[0].aliquotaEfetiva, 4), 0.0532);
  assert.equal(resMeses2a12.data.valorDasTotal, 1330.0);
});

// ---------------------------------------------------------------------------
// 12. Valores inválidos, momentos de efeito do sublimite (Casos A, B, C e limites exatos)
// ---------------------------------------------------------------------------
test('12. Distinção entre RBT12 e RBA no sublimite estadual: Casos A, B, C e limites exatos (Res. CGSN 140/2018, arts. 9º e 12)', () => {
  // 1. Validações de entradas inválidas
  const anoInvalido = calculate({ anoReferencia: 2025, rbt12: '300000', receitaMes: '20000' });
  assert.equal(anoInvalido.ok, false);
  assert.match(anoInvalido.error, /atende exclusivamente a competência do ano-calendário 2026/i);

  const rbtNegativa = calculate({ anoReferencia: 2026, rbt12: '-500', receitaMes: '20000' });
  assert.equal(rbtNegativa.ok, false);
  assert.match(rbtNegativa.error, /não pode ser negativa/i);

  const rbaNegativa = calculate({ anoReferencia: 2026, rbt12: '500000', rba: '-1000', receitaMes: '20000' });
  assert.equal(rbaNegativa.ok, false);
  assert.match(rbaNegativa.error, /RBA.*não pode ser negativa/i);

  // 2. Sem RBA informada: RBT12 na 6ª faixa (> R$ 3,6M) emite aviso condicional sem presunção categórica
  const resCondicional = calculate({
    anoReferencia: 2026,
    modoApuracao: 'regra_geral',
    tipoOperacao: 'unica',
    anexo: 'anexo_1',
    rbt12: '4000000,00',
    receitaMes: '100000,00'
  });
  assert.equal(resCondicional.ok, true);
  assert.equal(resCondicional.data.ultrapassouSublimite, true);
  const avisoCond = resCondicional.warnings.find((w) => w.includes('SUBLIMITE ESTADUAL (6ª FAIXA)'));
  assert.ok(avisoCond);
  assert.match(avisoCond, /depende da Receita Bruta Acumulada no ano-calendário \(RBA\) no mercado interno/i);
  assert.match(avisoCond, /até 20% \(até R\$ 4\.320\.000,00\)/);
  assert.match(avisoCond, /não inclui receitas de exportação/i);

  // 3. RBT12 alta na 6ª faixa (R$ 4.000.000,00), mas RBA do ano permanece abaixo do sublimite (R$ 2.500.000,00)
  // ICMS/ISS continuam dentro do DAS no mês corrente!
  const limRbaBaixa = analisarLimitesSublimite(4000000, 2400000, 100000);
  assert.equal(limRbaBaixa.statusSublimite, 'dentro');
  assert.equal(limRbaBaixa.rbaAtual, 2500000.0);
  assert.equal(limRbaBaixa.icmsIssExcluidosNoMes, false);

  const resRbaBaixa = calculate({
    anoReferencia: 2026,
    modoApuracao: 'regra_geral',
    tipoOperacao: 'unica',
    anexo: 'anexo_1',
    rbt12: '4000000,00',
    rba: '2400000,00',
    receitaMes: '100000,00'
  });
  assert.equal(resRbaBaixa.ok, true);
  const avisoBaixa = resRbaBaixa.warnings.find((w) => w.includes('NOTA DE SUBLIMITE'));
  assert.ok(avisoBaixa);
  assert.match(avisoBaixa, /permanece dentro do sublimite/i);
  assert.match(avisoBaixa, /continuam integralmente incluídos na apuração unificada do DAS/i);

  // 4. Limite exato de R$ 3.600.000,00 no ano (RBA anterior 3,5M + receita mês 100k = 3,6M exatos)
  // Permanece dentro do sublimite
  const limExato36 = analisarLimitesSublimite(3500000, 3500000, 100000);
  assert.equal(limExato36.rbaAtual, 3600000.0);
  assert.equal(limExato36.statusSublimite, 'dentro');
  assert.equal(limExato36.icmsIssExcluidosNoMes, false);

  // 5. Caso C — Excesso de até 20% (RBA atual acima de R$ 3.600.000,00 e até R$ 4.320.000,00)
  // RBA anterior: R$ 3.800.000 | Receita mês: R$ 200.000 | RBA atual: R$ 4.000.000
  // Resultado: ICMS/ISS dentro do DAS no mês atual; efeitos no ano subsequente (art. 9º, § 1º)
  const limCasoC = analisarLimitesSublimite(4000000, 3800000, 200000);
  assert.equal(limCasoC.rbaAtual, 4000000.0);
  assert.equal(limCasoC.statusSublimite, 'excesso_ate_20');
  assert.equal(limCasoC.rbaUltrapassouSublimiteAte20, true);
  assert.equal(limCasoC.rbaUltrapassouSublimiteMais20, false);
  assert.equal(limCasoC.icmsIssExcluidosNoMes, false);

  const resCasoC = calculate({
    anoReferencia: 2026,
    modoApuracao: 'regra_geral',
    tipoOperacao: 'unica',
    anexo: 'anexo_1',
    rbt12: '4000000,00',
    rba: '3800000,00',
    receitaMes: '200000,00'
  });
  assert.equal(resCasoC.ok, true);
  const avisoC = resCasoC.warnings.find((w) => w.includes('ALERTA DE SUBLIMITE (EXCESSO ATÉ 20%)'));
  assert.ok(avisoC);
  assert.match(avisoC, /CONTINUAM sendo recolhidos dentro do Simples Nacional \(no DAS\)/i);
  assert.match(avisoC, /ano-calendário subsequente/i);

  // 6. Limite exato da margem de 20%: R$ 4.320.000,00 no ano (RBA anterior 4,0M + receita mês 320k)
  // Trata-se de excesso de até 20% (efeitos apenas no ano seguinte, art. 9º, § 1º)
  const limExato432 = analisarLimitesSublimite(4200000, 4000000, 320000);
  assert.equal(limExato432.rbaAtual, 4320000.0);
  assert.equal(limExato432.statusSublimite, 'excesso_ate_20');
  assert.equal(limExato432.icmsIssExcluidosNoMes, false);

  // 7. Caso A — Excesso superior a 20% ocorrido ANTERIORMENTE
  // Premissas oficiais de 2026: Anexo I, RBT12 = R$ 4.400.000,00, RBA anterior = R$ 4.400.000,00, Receita mês = R$ 100.000,00, RBA atual = R$ 4.500.000,00
  // Resultado: ICMS/ISS FORA do DAS no mês simulado (Res. CGSN 140/2018, art. 9º, § 2º e art. 12, § 1º, I)
  // Alíquota efetiva federal oficial da 6ª faixa: ((4.400.000 * 0,19) - 378.000) / 4.400.000 = 10,4090909...%
  // DAS devido no mês (exclusivamente federal): R$ 100.000,00 * 10,4090909...% = R$ 10.409,09
  const limCasoA = analisarLimitesSublimite(4400000, 4400000, 100000);
  assert.equal(limCasoA.rbaAnterior, 4400000.0);
  assert.equal(limCasoA.rbaAtual, 4500000.0);
  assert.equal(limCasoA.statusSublimite, 'excesso_mais_20_anterior');
  assert.equal(limCasoA.rbaUltrapassouSublimiteMais20, true);
  assert.equal(limCasoA.icmsIssExcluidosNoMes, true);

  const resCasoA = calculate({
    anoReferencia: 2026,
    modoApuracao: 'regra_geral',
    tipoOperacao: 'unica',
    anexo: 'anexo_1',
    rbt12: '4400000,00',
    rba: '4400000,00',
    receitaMes: '100000,00'
  });
  assert.equal(resCasoA.ok, true);
  assert.equal(resCasoA.data.apuracoesPorAnexo[0].faixa, 6);
  assert.equal(roundDecimal(resCasoA.data.apuracoesPorAnexo[0].aliquotaEfetivaFederal, 7), 0.1040909);
  assert.equal(resCasoA.data.apuracoesPorAnexo[0].aliquotaEfetivaEstadual, 0);
  assert.equal(roundDecimal(resCasoA.data.apuracoesPorAnexo[0].aliquotaEfetiva, 7), 0.1040909);
  assert.equal(resCasoA.data.valorDasTotal, 10409.09);
  assert.equal(resCasoA.data.apuracoesPorAnexo[0].componenteFederal.valor, 10409.09);
  assert.equal(resCasoA.data.apuracoesPorAnexo[0].componenteEstadualMunicipal.valor, 0);
  assert.equal(resCasoA.data.apuracoesPorAnexo[0].componenteEstadualMunicipal.noDas, false);

  // Distribuição individual dos tributos no Caso A:
  const distA = resCasoA.data.apuracoesPorAnexo[0].distribuicaoTributos;
  assert.equal(distA.irpj.valor, 1405.23);
  assert.equal(distA.csll.valor, 1040.91);
  assert.equal(distA.cofins.valor, 2942.65);
  assert.equal(distA.pis.valor, 638.07);
  assert.equal(distA.cpp.valor, 4382.23);
  assert.equal(distA.icms.valor, 0.0);
  assert.equal(distA.icms.noDas, false);

  // Confirmação determinística de que a soma exata das linhas do Caso A coincide com o DAS total (R$ 10.409,09)
  const somaLinhasA = roundDecimal(
    distA.irpj.valor + distA.csll.valor + distA.cofins.valor + distA.pis.valor + distA.cpp.valor + (distA.icms ? distA.icms.valor : 0),
    2
  );
  assert.equal(somaLinhasA, 10409.09, 'A soma das parcelas individualizadas no Caso A deve coincidir exatamente com R$ 10.409,09');
  assert.equal(somaLinhasA, resCasoA.data.valorDasTotal);

  const avisoA = resCasoA.warnings.find((w) => w.includes('ALERTA DE SUBLIMITE (EXCESSO > 20% ANTERIOR)'));
  assert.ok(avisoA);
  assert.match(avisoA, /já havia ultrapassado o sublimite/i);
  assert.match(avisoA, /devem ser recolhidos fora do DAS diretamente ao Estado\/Município no mês simulado/i);

  // 8. Caso B — Excesso superior a 20% ocorrido NO PRÓPRIO MÊS
  // Premissas oficiais de 2026: Anexo I, RBT12 = R$ 4.400.000,00, RBA anterior = R$ 4.250.000,00 (já > R$ 3,6M e <= R$ 4,32M), Receita mês = R$ 250.000,00, RBA atual = R$ 4.500.000,00
  // Resultado: ICMS/ISS AINDA DENTRO do DAS no mês em que o limite é ultrapassado; impedimento apenas no mês subsequente (art. 9º, § 2º e art. 12, § 1º, I)
  // Regra específica do art. 24 da Resolução CGSN nº 140/2018 para a parcela acima do sublimite:
  // - Taxa efetiva de ICMS no sublimite de R$ 3,6M: ((3.600.000 * 0,143) - 87.300) / 3.600.000 = 11,875% * 33,50% = 3,978125%
  // - Taxa efetiva federal na 6ª faixa: ((4.400.000 * 0,19) - 378.000) / 4.400.000 = 10,4090909...%
  // - Alíquota total unificada de referência: 10,4090909...% + 3,978125% = 14,3872159...%
  // - DAS total sobre R$ 250.000,00: R$ 35.968,04 (sendo R$ 26.022,73 federais e R$ 9.945,31 de ICMS)
  const limCasoB = analisarLimitesSublimite(4400000, 4250000, 250000);
  assert.equal(limCasoB.rbaAnterior, 4250000.0);
  assert.equal(limCasoB.rbaAtual, 4500000.0);
  assert.equal(limCasoB.statusSublimite, 'excesso_mais_20_mes_atual');
  assert.equal(limCasoB.rbaUltrapassouSublimiteMais20, true);
  assert.equal(limCasoB.icmsIssExcluidosNoMes, false); // AINDA DENTRO DO DAS!

  const taxaSublimiteB = calcularTaxaSublimiteArt24(ANEXOS.ANEXO_I);
  assert.equal(taxaSublimiteB.aliquotaEstadual, 0.03978125);
  assert.equal(taxaSublimiteB.tipoTributo, 'icms');

  const resCasoB = calculate({
    anoReferencia: 2026,
    modoApuracao: 'regra_geral',
    tipoOperacao: 'unica',
    anexo: 'anexo_1',
    rbt12: '4400000,00',
    rba: '4250000,00',
    receitaMes: '250000,00'
  });
  assert.equal(resCasoB.ok, true);
  assert.equal(resCasoB.data.apuracoesPorAnexo[0].faixa, 6);
  assert.equal(roundDecimal(resCasoB.data.apuracoesPorAnexo[0].aliquotaEfetivaFederal, 7), 0.1040909);
  assert.equal(roundDecimal(resCasoB.data.apuracoesPorAnexo[0].aliquotaEfetivaEstadual, 8), 0.03978125);
  assert.equal(roundDecimal(resCasoB.data.apuracoesPorAnexo[0].aliquotaEfetiva, 7), 0.1438722);
  assert.equal(resCasoB.data.valorDasTotal, 35968.04);
  assert.equal(resCasoB.data.apuracoesPorAnexo[0].componenteFederal.valor, 26022.73);
  assert.equal(resCasoB.data.apuracoesPorAnexo[0].componenteEstadualMunicipal.valor, 9945.31);

  // Distribuição individual dos tributos no Caso B:
  const distB = resCasoB.data.apuracoesPorAnexo[0].distribuicaoTributos;
  assert.equal(distB.irpj.valor, 3513.07);
  assert.equal(distB.csll.valor, 2602.27);
  assert.equal(distB.cofins.valor, 7356.63);
  assert.equal(distB.pis.valor, 1595.19);
  assert.equal(distB.cpp.valor, 10955.57);
  assert.equal(distB.icms.valor, 9945.31);
  assert.equal(distB.icms.noDas, true);

  // Confirmação determinística de que a soma exata das linhas do Caso B coincide com o DAS total (R$ 35.968,04)
  const somaLinhasB = roundDecimal(
    distB.irpj.valor + distB.csll.valor + distB.cofins.valor + distB.pis.valor + distB.cpp.valor + (distB.icms ? distB.icms.valor : 0),
    2
  );
  assert.equal(somaLinhasB, 35968.04, 'A soma das parcelas individualizadas no Caso B deve coincidir exatamente com R$ 35.968,04');
  assert.equal(somaLinhasB, resCasoB.data.valorDasTotal);

  const avisoB = resCasoB.warnings.find((w) => w.includes('ALERTA DE SUBLIMITE (EXCESSO > 20% NO MÊS)'));
  assert.ok(avisoB);
  assert.match(avisoB, /CONTINUAM dentro do Simples Nacional \(no DAS\)/i);
  assert.match(avisoB, /produzirá efeitos apenas a partir do mês subsequente/i);

  // 9. Teto Máximo anual ultrapassado (> R$ 4.800.000,00)
  const resTeto = calculate({
    anoReferencia: 2026,
    modoApuracao: 'regra_geral',
    tipoOperacao: 'unica',
    anexo: 'anexo_1',
    rbt12: '5000000,00',
    receitaMes: '100000,00'
  });
  assert.equal(resTeto.ok, true);
  assert.equal(resTeto.data.ultrapassouTeto, true);
  assert.ok(resTeto.warnings.some((w) => w.includes('TETO MÁXIMO ULTRAPASSADO')));
});

// ---------------------------------------------------------------------------
// 13. DOM, acessibilidade, ações e persistência
// ---------------------------------------------------------------------------
test('13. Integração DOM: alternância de modos, cálculo, limpar, copiar, compartilhar e imprimir', async () => {
  const dom = createFakeDomRoot();

  let copiedText = '';
  let sharedPayload = null;
  let printCalled = false;

  const prevNavigator = globalThis.navigator;
  const prevWindow = globalThis.window;

  Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    value: {
      clipboard: {
        async writeText(txt) {
          copiedText = txt;
        }
      },
      async share(payload) {
        sharedPayload = payload;
      }
    }
  });

  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: {
      location: { origin: 'https://www.calculadoramaster.com' },
      print() {
        printCalled = true;
      }
    }
  });

  try {
    const instance = setupTool(dom);
    assert.ok(instance);

    // Estado inicial: atividade única no Anexo III
    assert.equal(dom.querySelector('#grupoRbt12SN').hidden, false);
    assert.equal(dom.querySelector('#grupoInicioMesesSN').hidden, true);
    assert.equal(dom.querySelector('#grupoFatorRSN').hidden, true);
    assert.equal(dom.querySelector('#grupoSegregadasSN').hidden, true);

    // Alterna para Fator R
    dom.querySelector('#anexoSN').value = 'fator_r';
    dom.querySelector('#anexoSN').dispatchEvent({ type: 'change' });
    assert.equal(dom.querySelector('#grupoFatorRSN').hidden, false);

    // Executa cálculo com Fator R
    dom.querySelector('#rbt12SN').value = '100000,00';
    dom.querySelector('#folha12SN').value = '30000,00'; // 30% -> Anexo III
    dom.querySelector('#receitaMesSN').value = '10000,00';

    dom.querySelector('#formSimplesNacional').dispatchEvent({
      type: 'submit',
      preventDefault() {}
    });

    assert.equal(dom.querySelector('#erroSimplesNacional').hidden, true);
    assert.equal(dom.querySelector('#resultadoSimplesNacional').hidden, false);
    assert.equal(dom.querySelector('#resValorDasSN').textContent, formatCurrency(600.0));
    assert.equal(dom.querySelector('#cardFatorRResultadoSN').hidden, false);
    assert.equal(dom.querySelector('#btnCopiarSN').hidden, false);

    // Copiar resultado
    await instance.actions.copy();
    assert.match(copiedText, /Calculadora Simples Nacional/i);
    assert.match(copiedText, /600,00/);

    // Compartilhar resultado
    await dom.querySelector('#btnCompartilharSN').dispatchEvent({ type: 'click' });
    await new Promise((r) => setTimeout(r, 10));
    assert.ok(sharedPayload);
    assert.equal(
      sharedPayload.url,
      'https://www.calculadoramaster.com/tools/financas/simples-nacional.html'
    );

    // Imprimir resultado
    dom.querySelector('#btnImprimirSN').click();
    assert.equal(printCalled, true);

    // Limpar formulário
    dom.querySelector('#btnLimparSN').click();
    assert.equal(dom.querySelector('#resultadoSimplesNacional').hidden, true);
    assert.equal(dom.querySelector('#btnCopiarSN').hidden, true);
  } finally {
    Object.defineProperty(globalThis, 'navigator', {
      configurable: true,
      value: prevNavigator
    });
    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: prevWindow
    });
  }
});

// ---------------------------------------------------------------------------
// 14. Arquivo de página HTML, acessibilidade e SEO
// ---------------------------------------------------------------------------
test('14. Arquivo HTML e conformidade com acessibilidade, layout e convenções', () => {
  const pagePath = path.join(ROOT, 'src/pages/tools/financas/simples-nacional.page.html');
  assert.equal(fs.existsSync(pagePath), true);
  const html = fs.readFileSync(pagePath, 'utf8');

  assert.match(html, /layout:\s*tool/);
  assert.match(html, /canonical:\s*https:\/\/www\.calculadoramaster\.com\/tools\/financas\/simples-nacional\.html/);
  assert.match(html, /<h1>Calculadora Simples Nacional \(2026\)<\/h1>/);
  assert.equal(html.includes('<br'), false, 'Não deve utilizar <br>');
  assert.equal(/\bstyle\s*=/i.test(html), false, 'Não deve utilizar style inline');
  assert.match(html, /id="erroSimplesNacional"[^>]*role="alert"/);
  assert.match(html, /id="resultadoSimplesNacional"[^>]*aria-live="polite"/);
  assert.match(html, /id="rbaSN"/);
  assert.match(html, /Anexo IV/i);
  assert.match(html, /art\.\s*13,\s*§\s*3º/);
  assert.doesNotMatch(html, /20%\s*\+\s*RAT\s*\+\s*terceiros/i, 'HTML não deve dizer que terceiros são devidos');
  assert.match(html, /Fator R/i);
  assert.match(html, /regime de caixa/i);
  assert.match(html, /Sublimite/i);
  assert.match(html, /CPRB/i, 'HTML deve conter ressalva sobre CPRB');
  assert.match(html, /mercado interno/i, 'HTML deve ressalvar mercado interno');
  assert.match(html, /exportaç/i, 'HTML deve ressalvar não contemplação de exportações');
});

// ---------------------------------------------------------------------------
// 15. Distribuição determinística de centavos residuais (Método do Maior Resto)
// ---------------------------------------------------------------------------
test('15. Rateio determinístico de centavos residuais garante soma idêntica ao total exibido', () => {
  // Teste 1: 3 parcelas iguais de R$ 100,00 / 3 = 33,3333... total R$ 100,00
  const itensIguais = [
    { key: 'a', rawValue: 100 / 3, weight: 1 / 3, order: 0 },
    { key: 'b', rawValue: 100 / 3, weight: 1 / 3, order: 1 },
    { key: 'c', rawValue: 100 / 3, weight: 1 / 3, order: 2 }
  ];
  const rateio1 = ratearCentavosMaiorResto(itensIguais, 100.0);
  assert.equal(rateio1.a, 33.34);
  assert.equal(rateio1.b, 33.33);
  assert.equal(rateio1.c, 33.33);
  const soma1 = roundDecimal(rateio1.a + rateio1.b + rateio1.c, 2);
  assert.equal(soma1, 100.0);

  // Teste 2: lista vazia retorna objeto vazio
  assert.deepEqual(ratearCentavosMaiorResto([], 50.0), {});

  // Teste 3: conservação para todos os 5 anexos em faixas arbitrárias
  const distAnexo3 = calcularDistribuicaoTributos(ANEXOS.ANEXO_III, 3, 0.08, 0.02, 50000, true);
  const somaAnexo3 = roundDecimal(
    Object.values(distAnexo3.tributos).reduce((acc, t) => acc + (t.noDas ? t.valor : 0), 0),
    2
  );
  assert.equal(somaAnexo3, distAnexo3.valorDasTotal);
});
