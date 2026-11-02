import test from 'node:test';
import assert from 'node:assert/strict';

import {
  ANO_COMPETENCIA,
  PARAMETROS_INSS_2026,
  PARAMETROS_IRRF_2026,
  PARAMETROS_VALE_TRANSPORTE,
  roundCurrency,
  truncarCentavos,
  reaisParaCentavos,
  calcularInssClt,
  calcularIrrfClt,
  calcularValeTransporte,
  calcularSalarioLiquido,
  formatarMoeda,
  getResultSections,
  initSalarioLiquido
} from '../js/tools/salario-liquido.js';

/* ==========================================================================
 * 1. Constantes e Parâmetros Oficiais 2026
 * ========================================================================== */

test('Salário Líquido: competência oficial deve ser 2026', () => {
  assert.equal(ANO_COMPETENCIA, 2026);
  assert.equal(PARAMETROS_INSS_2026.tetoRgps, 8475.55);
  assert.equal(PARAMETROS_INSS_2026.tetoRgpsCentavos, 847555);
  assert.equal(PARAMETROS_INSS_2026.tetoContribuicao, 988.07);
  assert.equal(PARAMETROS_INSS_2026.tetoContribuicaoCentavos, 98807);
  assert.equal(PARAMETROS_INSS_2026.faixas.length, 4);

  assert.equal(PARAMETROS_IRRF_2026.deducaoPorDependente, 189.59);
  assert.equal(PARAMETROS_IRRF_2026.descontoSimplificadoPadrao, 607.20);
  assert.equal(PARAMETROS_IRRF_2026.reducaoLei15270.limiteIsencaoTotal, 5000.00);
  assert.equal(PARAMETROS_IRRF_2026.reducaoLei15270.limiteSuperiorTransicao, 7350.00);
  assert.equal(PARAMETROS_IRRF_2026.reducaoLei15270.formulaConstante, 978.62);
  assert.equal(PARAMETROS_IRRF_2026.reducaoLei15270.formulaFator, 0.133145);

  assert.equal(PARAMETROS_VALE_TRANSPORTE.aliquotaMaxima, 0.06);
});

/* ==========================================================================
 * 2. Precisão de Arredondamento e Truncamento de Centavos (eSocial MOS S-1.3)
 * ========================================================================== */

test('Salário Líquido: truncamento de centavos por faixa do eSocial (MOS S-1.3)', () => {
  // Faixa 1: R$ 1.621,00 a 7,5% -> 162100 * 750 / 10000 = 12157 centavos (R$ 121,57)
  assert.equal(truncarCentavos(162100, 750), 12157);

  // Faixa 2 integral: (2902,84 - 1621,00) = 128184 centavos a 9,0% -> 128184 * 900 / 10000 = 11536 centavos (R$ 115,36)
  assert.equal(truncarCentavos(128184, 900), 11536);

  // Faixa 3 integral: (4354,27 - 2902,84) = 145143 centavos a 12,0% -> 145143 * 1200 / 10000 = 17417 centavos (R$ 174,17)
  assert.equal(truncarCentavos(145143, 1200), 17417);

  // Faixa 4 integral: (8475,55 - 4354,27) = 412128 centavos a 14,0% -> 412128 * 1400 / 10000 = 57697 centavos (R$ 576,97)
  assert.equal(truncarCentavos(412128, 1400), 57697);

  // Soma exata dos tetos truncados de cada faixa:
  const somaTetos = 12157 + 11536 + 17417 + 57697;
  assert.equal(somaTetos, 98807); // R$ 988,07

  // Testes defensivos
  assert.equal(truncarCentavos(0, 750), 0);
  assert.equal(truncarCentavos(-100, 750), 0);
  assert.equal(truncarCentavos(1000, 0), 0);
  assert.equal(truncarCentavos(NaN, 750), 0);
});

test('Salário Líquido: conversão de reais para centavos inteiros', () => {
  assert.equal(reaisParaCentavos(1621.00), 162100);
  assert.equal(reaisParaCentavos(2902.84), 290284);
  assert.equal(reaisParaCentavos(4354.27), 435427);
  assert.equal(reaisParaCentavos(8475.55), 847555);
  assert.equal(reaisParaCentavos(0), 0);
  assert.equal(reaisParaCentavos(-50), 0);
});

/* ==========================================================================
 * 3. Os 14 Cenários Oficiais de Validação (Benchmarks)
 * ========================================================================== */

test('Cenário 1: R$ 1.621,00 (1º Teto INSS / Salário Mínimo)', () => {
  const calc = calcularSalarioLiquido({ remuneracaoBruta: 1621.00 });
  assert.equal(calc.inss.total, 121.57);
  assert.equal(calc.irrf.impostoDevido, 0.00);
  assert.equal(calc.salarioLiquido, 1499.43);
  assert.equal(calc.totalDescontos, 121.57);
});

test('Cenário 2: R$ 2.902,84 (2º Teto INSS)', () => {
  const calc = calcularSalarioLiquido({ remuneracaoBruta: 2902.84 });
  assert.equal(calc.inss.total, 236.93);
  assert.equal(calc.irrf.impostoDevido, 0.00);
  assert.equal(calc.salarioLiquido, 2665.91);
  assert.equal(calc.totalDescontos, 236.93);
});

test('Cenário 3: R$ 3.036,00', () => {
  const calc = calcularSalarioLiquido({ remuneracaoBruta: 3036.00 });
  assert.equal(calc.inss.total, 252.90);
  assert.equal(calc.irrf.impostoDevido, 0.00);
  assert.equal(calc.salarioLiquido, 2783.10);
  assert.equal(calc.totalDescontos, 252.90);
});

test('Cenário 4: R$ 4.000,00', () => {
  const calc = calcularSalarioLiquido({ remuneracaoBruta: 4000.00 });
  assert.equal(calc.inss.total, 368.58);
  assert.equal(calc.irrf.impostoDevido, 0.00);
  assert.equal(calc.salarioLiquido, 3631.42);
  assert.equal(calc.totalDescontos, 368.58);
});

test('Cenário 5: R$ 4.354,27 (3º Teto INSS)', () => {
  const calc = calcularSalarioLiquido({ remuneracaoBruta: 4354.27 });
  assert.equal(calc.inss.total, 411.10);
  assert.equal(calc.irrf.impostoDevido, 0.00);
  assert.equal(calc.salarioLiquido, 3943.17);
  assert.equal(calc.totalDescontos, 411.10);
});

test('Cenário 6: R$ 5.000,00 (Limite de Isenção Integral Lei 15.270/2025)', () => {
  const calc = calcularSalarioLiquido({ remuneracaoBruta: 5000.00 });
  assert.equal(calc.inss.total, 501.50);
  assert.equal(calc.irrf.impostoDevido, 0.00);
  assert.equal(calc.salarioLiquido, 4498.50);
  assert.equal(calc.totalDescontos, 501.50);
});

test('Cenário 7: R$ 6.000,00 (Faixa de Transição Lei 15.270/2025)', () => {
  const calc = calcularSalarioLiquido({ remuneracaoBruta: 6000.00 });
  assert.equal(calc.inss.total, 641.50);
  assert.equal(calc.irrf.impostoTabela, 564.86);
  assert.equal(calc.irrf.reducaoLei15270, 179.75);
  assert.equal(calc.irrf.reducaoAplicada, 179.75);
  assert.equal(calc.irrf.impostoDevido, 385.11);
  assert.equal(calc.salarioLiquido, 4973.39);
  assert.equal(calc.totalDescontos, 1026.61);
});

test('Cenário 8: R$ 7.350,00 (Limite Superior da Redução Lei 15.270/2025)', () => {
  const calc = calcularSalarioLiquido({ remuneracaoBruta: 7350.00 });
  assert.equal(calc.inss.total, 830.50);
  assert.equal(calc.irrf.impostoTabela, 884.13);
  assert.equal(calc.irrf.reducaoLei15270, 0.00);
  assert.equal(calc.irrf.reducaoAplicada, 0.00);
  assert.equal(calc.irrf.impostoDevido, 884.13);
  assert.equal(calc.salarioLiquido, 5635.37);
  assert.equal(calc.totalDescontos, 1714.63);
});

test('Cenário 9: R$ 8.475,55 (Teto do RGPS)', () => {
  const calc = calcularSalarioLiquido({ remuneracaoBruta: 8475.55 });
  assert.equal(calc.inss.total, 988.07);
  assert.equal(calc.inss.atingiuTeto, true);
  assert.equal(calc.irrf.impostoDevido, 1150.33);
  assert.equal(calc.salarioLiquido, 6337.15);
  assert.equal(calc.totalDescontos, 2138.40);
});

test('Cenário 10: R$ 10.000,00 com 2 dependentes e VT 480,00 (base VT 8.000,00)', () => {
  const calc = calcularSalarioLiquido({
    remuneracaoBruta: 10000.00,
    dependentes: 2,
    optanteVT: true,
    salarioBasicoVT: 8000.00,
    custoRealVT: 480.00
  });
  assert.equal(calc.inss.total, 988.07);
  assert.equal(calc.inss.atingiuTeto, true);
  assert.equal(calc.irrf.tipoDeducao, 'legais'); // 988,07 + (2 * 189,59) = 1367,25 > 607,20
  assert.equal(calc.irrf.impostoDevido, 1465.28);
  assert.equal(calc.valeTransporte.desconto, 480.00);
  assert.equal(calc.salarioLiquido, 7066.65);
  assert.equal(calc.totalDescontos, 2933.35);
});

test('Cenário 11: R$ 5.000,00 com VT 150,00 (base VT 5.000,00, custo real menor que 6%)', () => {
  const calc = calcularSalarioLiquido({
    remuneracaoBruta: 5000.00,
    optanteVT: true,
    salarioBasicoVT: 5000.00,
    custoRealVT: 150.00
  });
  assert.equal(calc.inss.total, 501.50);
  assert.equal(calc.irrf.impostoDevido, 0.00);
  assert.equal(calc.valeTransporte.desconto, 150.00);
  assert.equal(calc.valeTransporte.limitadoPor, 'custo_real');
  assert.equal(calc.salarioLiquido, 4348.50);
  assert.equal(calc.totalDescontos, 651.50);
});

test('Cenário 12: R$ 6.000,00 com Pensão Alimentícia Judicial R$ 800,00', () => {
  const calc = calcularSalarioLiquido({
    remuneracaoBruta: 6000.00,
    pensaoAlimenticia: 800.00
  });
  assert.equal(calc.inss.total, 641.50);
  assert.equal(calc.irrf.tipoDeducao, 'legais'); // 641,50 + 800,00 = 1441,50 > 607,20
  assert.equal(calc.irrf.impostoTabela, 350.17);
  assert.equal(calc.irrf.reducaoLei15270, 179.75);
  assert.equal(calc.irrf.impostoDevido, 170.42);
  assert.equal(calc.salarioLiquido, 4388.08);
  assert.equal(calc.totalDescontos, 1611.92);
});

test('Cenário 13: R$ 6.000,00 com Previdência Privada PGBL em folha R$ 500,00', () => {
  const calc = calcularSalarioLiquido({
    remuneracaoBruta: 6000.00,
    previdenciaPrivadaPgbl: 500.00
  });
  assert.equal(calc.inss.total, 641.50);
  assert.equal(calc.irrf.tipoDeducao, 'legais'); // 641,50 + 500,00 = 1141,50 > 607,20
  assert.equal(calc.irrf.impostoTabela, 427.36);
  assert.equal(calc.irrf.reducaoLei15270, 179.75);
  assert.equal(calc.irrf.impostoDevido, 247.61);
  assert.equal(calc.salarioLiquido, 4610.89);
  assert.equal(calc.totalDescontos, 1389.11);
});

test('Cenário 14: R$ 4.000,00 com Outros Descontos em folha R$ 200,00', () => {
  const calc = calcularSalarioLiquido({
    remuneracaoBruta: 4000.00,
    outrosDescontos: 200.00
  });
  assert.equal(calc.inss.total, 368.58);
  assert.equal(calc.irrf.impostoDevido, 0.00);
  assert.equal(calc.outrosDescontos, 200.00);
  assert.equal(calc.salarioLiquido, 3431.42);
  assert.equal(calc.totalDescontos, 568.58);
});

/* ==========================================================================
 * 4. Testes de Fronteira e Limites Específicos
 * ========================================================================== */

test('Salário Líquido: remunerações acima do teto do RGPS mantêm INSS constante em R$ 988,07', () => {
  const calc10k = calcularInssClt(10000.00);
  assert.equal(calc10k.total, 988.07);
  assert.equal(calc10k.atingiuTeto, true);

  const calc25k = calcularInssClt(25000.00);
  assert.equal(calc25k.total, 988.07);
  assert.equal(calc25k.atingiuTeto, true);
});

test('Salário Líquido: transições exatas das faixas de INSS', () => {
  // Faixa 1 exata
  const inssFaixa1 = calcularInssClt(1621.00);
  assert.equal(inssFaixa1.total, 121.57);

  // Faixa 1 + 1 centavo
  const inssFaixa2Inicio = calcularInssClt(1621.01);
  assert.equal(inssFaixa2Inicio.total, 121.57); // floor(1 * 900 / 10000) = 0 centavos

  // Faixa 1 + 12 centavos -> floor(12 * 900 / 10000) = floor(10800 / 10000) = 1 centavo
  const inssFaixa2ComCentavo = calcularInssClt(1621.12);
  assert.equal(inssFaixa2ComCentavo.total, 121.58);
});

test('Salário Líquido: IRRF com rendimento exatamente em R$ 5.000,01', () => {
  const calc = calcularSalarioLiquido({ remuneracaoBruta: 5000.01 });
  assert.equal(calc.inss.total, 501.50);
  // Redução calculada: 978.62 - (0.133145 * 5000.01) = 978.62 - 665.7263... = 312.89
  assert.equal(calc.irrf.reducaoLei15270, 312.89);
  // Base IRRF = 5000.01 - 607.20 = 4392.81 -> Faixa 22.5%: (4392.81 * 0.225) - 675.49 = 312.89
  assert.equal(calc.irrf.impostoTabela, 312.89);
  assert.equal(calc.irrf.reducaoAplicada, 312.89);
  assert.equal(calc.irrf.impostoDevido, 0.00);
});

test('Salário Líquido: IRRF com rendimento em R$ 7.350,01 (redução zero)', () => {
  const calc = calcularSalarioLiquido({ remuneracaoBruta: 7350.01 });
  assert.equal(calc.irrf.reducaoLei15270, 0.00);
  assert.equal(calc.irrf.impostoDevido, calc.irrf.impostoTabela);
});

test('Salário Líquido: IRRF com rendimento em R$ 7.000,00 (transição Lei 15.270)', () => {
  const calc = calcularSalarioLiquido({ remuneracaoBruta: 7000.00 });
  assert.equal(calc.inss.total, 781.50);
  assert.equal(calc.irrf.baseCalculo, 6218.50);
  assert.equal(calc.irrf.impostoTabela, 801.36);
  assert.equal(calc.irrf.reducaoLei15270, 46.60);
  assert.equal(calc.irrf.impostoDevido, 754.76);
  assert.equal(calc.salarioLiquido, 5463.74);
});

test('Salário Líquido: IRRF com rendimento em R$ 7.100,00 (transição Lei 15.270)', () => {
  const calc = calcularSalarioLiquido({ remuneracaoBruta: 7100.00 });
  assert.equal(calc.inss.total, 795.50);
  assert.equal(calc.irrf.baseCalculo, 6304.50);
  assert.equal(calc.irrf.impostoTabela, 825.01);
  assert.equal(calc.irrf.reducaoLei15270, 33.29);
  assert.equal(calc.irrf.impostoDevido, 791.72);
  assert.equal(calc.salarioLiquido, 5512.78);
});

test('Salário Líquido: regras de Vale-Transporte', () => {
  // Não optante
  const vtNaoOpt = calcularValeTransporte(false, 3000, 200);
  assert.equal(vtNaoOpt.desconto, 0);

  // Optante com custo real maior que 6%
  const vt6pct = calcularValeTransporte(true, 3000, 250);
  // 6% de 3000 = 180 < 250 -> Desconto = 180
  assert.equal(vt6pct.desconto, 180.00);
  assert.equal(vt6pct.limitadoPor, 'teto_6pct');

  // Optante com custo real menor que 6%
  const vtReal = calcularValeTransporte(true, 3000, 100);
  assert.equal(vtReal.desconto, 100.00);
  assert.equal(vtReal.limitadoPor, 'custo_real');
});

/* ==========================================================================
 * 5. Casos Defensivos e Inválidos
 * ========================================================================== */

test('Salário Líquido: entradas zeradas ou negativas', () => {
  const calcZero = calcularSalarioLiquido({ remuneracaoBruta: 0 });
  assert.equal(calcZero.remuneracaoBruta, 0);
  assert.equal(calcZero.inss.total, 0);
  assert.equal(calcZero.irrf.impostoDevido, 0);
  assert.equal(calcZero.salarioLiquido, 0);

  const calcNeg = calcularSalarioLiquido({ remuneracaoBruta: -1000 });
  assert.equal(calcNeg.remuneracaoBruta, 0);
  assert.equal(calcNeg.salarioLiquido, 0);
});

test('Salário Líquido: descontos superiores à remuneração bruta geram warning', () => {
  const calc = calcularSalarioLiquido({
    remuneracaoBruta: 2000.00,
    outrosDescontos: 2500.00
  });
  assert.ok(calc.salarioLiquido < 0);
  assert.ok(calc.warnings.length > 0);
  assert.match(calc.warnings[0], /superior à remuneração bruta/);
});

/* ==========================================================================
 * 6. Teste de Integração DOM
 * ========================================================================== */

test('Salário Líquido: integração com formulário DOM', () => {
  const listeners = new Map();
  const elements = new Map();

  function createStubElement(id, tagName = 'input', type = 'text') {
    const el = {
      id,
      tagName: tagName.toUpperCase(),
      type,
      value: '',
      checked: false,
      hidden: false,
      required: false,
      textContent: '',
      innerHTML: '',
      style: {},
      children: [],
      addEventListener(evt, fn) {
        if (!listeners.has(`${id}:${evt}`)) {
          listeners.set(`${id}:${evt}`, []);
        }
        listeners.get(`${id}:${evt}`).push(fn);
      },
      async dispatchEvent(evt) {
        const handlers = listeners.get(`${id}:${evt.type}`) || [];
        for (const h of handlers) {
          await h(evt);
        }
      },
      focus() {},
      reset() {
        this.value = '';
        this.checked = false;
      },
      appendChild(child) {
        this.children.push(child);
      },
      setAttribute() {},
      removeAttribute() {}
    };
    elements.set(id, el);
    return el;
  }

  const form = createStubElement('formSalarioLiquido', 'form');
  const inputRemuneracao = createStubElement('remuneracaoBruta');
  const inputDependentes = createStubElement('dependentes', 'input', 'number');
  const inputPensao = createStubElement('pensaoAlimenticia');
  const inputPgbl = createStubElement('previdenciaPrivada');
  const checkOptanteVT = createStubElement('optanteVT', 'input', 'checkbox');
  const containerCamposVT = createStubElement('containerCamposVT', 'div');
  const inputSalarioBasicoVT = createStubElement('salarioBasicoVT');
  const inputCustoRealVT = createStubElement('custoRealVT');
  const inputOutros = createStubElement('outrosDescontos');
  const btnLimpar = createStubElement('btnLimpar', 'button');

  const painelErro = createStubElement('mensagem-erro', 'p');
  const painelResultado = createStubElement('resultadoSalarioLiquido', 'section');
  const elResumoSalarioLiquido = createStubElement('resumoSalarioLiquido', 'strong');
  const elResumoTotalDescontos = createStubElement('resumoTotalDescontos', 'strong');
  const elResumoPercDescontos = createStubElement('resumoPercDescontos', 'strong');
  const elTabelaDetalhamento = createStubElement('tabelaDetalhamentoCorpo', 'tbody');
  const elTabelaFaixasInss = createStubElement('tabelaFaixasInssCorpo', 'tbody');
  const elContainerAvisos = createStubElement('containerAvisosResultado', 'div');

  const mockRoot = {
    querySelector(selector) {
      const cleanId = selector.replace(/^[#.]/, '');
      return elements.get(cleanId) || null;
    }
  };

  initSalarioLiquido(mockRoot);

  // Submissão com campo vazio -> deve exibir erro
  inputRemuneracao.value = '';
  form.dispatchEvent({ type: 'submit', preventDefault() {} });
  assert.equal(painelErro.hidden, false);
  assert.match(painelErro.textContent, /remuneração bruta válida/);

  // Submissão com remuneração de R$ 6.000,00
  inputRemuneracao.value = '6.000,00';
  form.dispatchEvent({ type: 'submit', preventDefault() {} });
  assert.equal(painelErro.hidden, true);
  assert.equal(painelResultado.hidden, false);
  assert.equal(elResumoSalarioLiquido.textContent, formatarMoeda(4973.39));
  assert.equal(elResumoTotalDescontos.textContent, formatarMoeda(1026.61));

  // Teste de Limpar
  btnLimpar.dispatchEvent({ type: 'click' });
  assert.equal(painelResultado.hidden, true);
  assert.equal(painelErro.hidden, true);
});

/* ==========================================================================
 * 7. Testes de Imutabilidade Profunda e Ações de Resultado (Correções Técnicas)
 * ========================================================================== */

test('Salário Líquido: imutabilidade profunda das constantes oficiais', () => {
  assert.ok(Object.isFrozen(PARAMETROS_INSS_2026), 'PARAMETROS_INSS_2026 deve estar congelado');
  assert.ok(Object.isFrozen(PARAMETROS_INSS_2026.faixas), 'PARAMETROS_INSS_2026.faixas deve estar congelado');
  PARAMETROS_INSS_2026.faixas.forEach((faixa, idx) => {
    assert.ok(Object.isFrozen(faixa), `Faixa ${idx + 1} do INSS deve estar congelada`);
  });

  assert.ok(Object.isFrozen(PARAMETROS_IRRF_2026), 'PARAMETROS_IRRF_2026 deve estar congelado');
  assert.ok(Object.isFrozen(PARAMETROS_IRRF_2026.faixas), 'PARAMETROS_IRRF_2026.faixas deve estar congelado');
  PARAMETROS_IRRF_2026.faixas.forEach((faixa, idx) => {
    assert.ok(Object.isFrozen(faixa), `Faixa ${idx + 1} do IRRF deve estar congelada`);
  });
  assert.ok(Object.isFrozen(PARAMETROS_IRRF_2026.reducaoLei15270), 'PARAMETROS_IRRF_2026.reducaoLei15270 deve estar congelado');

  assert.ok(Object.isFrozen(PARAMETROS_VALE_TRANSPORTE), 'PARAMETROS_VALE_TRANSPORTE deve estar congelado');

  // Tentativa de mutação deve falhar em modo estrito
  assert.throws(() => {
    PARAMETROS_INSS_2026.tetoRgps = 999999;
  }, TypeError);
  assert.throws(() => {
    PARAMETROS_INSS_2026.faixas[0].aliquotaPercentual = 50;
  }, TypeError);
  assert.throws(() => {
    PARAMETROS_IRRF_2026.deducaoPorDependente = 500;
  }, TypeError);
  assert.throws(() => {
    PARAMETROS_IRRF_2026.faixas[0].deducao = 999;
  }, TypeError);
  assert.throws(() => {
    PARAMETROS_VALE_TRANSPORTE.aliquotaMaxima = 0.10;
  }, TypeError);
});

test('Salário Líquido DOM: ao marcar optante de VT, a remuneração bruta NÃO é copiada para o salário básico', () => {
  const elements = new Map();
  const listeners = new Map();

  function createStub(id, tagName = 'input', type = 'text') {
    const el = {
      id,
      tagName: tagName.toUpperCase(),
      type,
      value: '',
      checked: false,
      hidden: false,
      required: false,
      textContent: '',
      innerHTML: '',
      style: {},
      children: [],
      addEventListener(evt, fn) {
        if (!listeners.has(`${id}:${evt}`)) listeners.set(`${id}:${evt}`, []);
        listeners.get(`${id}:${evt}`).push(fn);
      },
      async dispatchEvent(evt) {
        const handlers = listeners.get(`${id}:${evt.type}`) || [];
        for (const h of handlers) {
          await h(evt);
        }
      },
      focus() {},
      reset() { this.value = ''; this.checked = false; },
      appendChild(c) { this.children.push(c); },
      setAttribute(k, v) { this[k] = v; },
      getAttribute(k) { return this[k] || null; },
      removeAttribute() {}
    };
    elements.set(id, el);
    return el;
  }

  const form = createStub('formSalarioLiquido', 'form');
  const inputRemuneracao = createStub('remuneracaoBruta');
  createStub('dependentes', 'input', 'number');
  createStub('pensaoAlimenticia');
  createStub('previdenciaPrivada');
  const checkOptanteVT = createStub('optanteVT', 'input', 'checkbox');
  const containerCamposVT = createStub('containerCamposVT', 'div');
  const inputSalarioBasicoVT = createStub('salarioBasicoVT');
  const inputCustoRealVT = createStub('custoRealVT');
  createStub('outrosDescontos');
  createStub('btnLimpar', 'button');
  createStub('mensagem-erro', 'p');
  createStub('resultadoSalarioLiquido', 'section');
  createStub('resumoSalarioLiquido', 'strong');
  createStub('resumoTotalDescontos', 'strong');
  createStub('resumoPercDescontos', 'strong');
  createStub('tabelaDetalhamentoCorpo', 'tbody');
  createStub('tabelaFaixasInssCorpo', 'tbody');
  createStub('containerAvisosResultado', 'div');
  createStub('btnCopiar', 'button');
  createStub('btnCompartilhar', 'button');
  createStub('btnImprimir', 'button');
  createStub('statusAcoes', 'span');

  const mockRoot = {
    querySelector(selector) {
      const cleanId = selector.replace(/^[#.]/, '');
      return elements.get(cleanId) || null;
    }
  };

  initSalarioLiquido(mockRoot);

  // Usuário preenche a remuneração bruta com R$ 7.000,00
  inputRemuneracao.value = '7.000,00';

  // Marca checkbox de VT
  checkOptanteVT.checked = true;
  checkOptanteVT.dispatchEvent({ type: 'change' });

  // Container fica visível e campos tornam-se obrigatórios
  assert.equal(containerCamposVT.hidden, false);
  assert.equal(inputSalarioBasicoVT.required, true);
  assert.equal(inputCustoRealVT.required, true);

  // CRÍTICO: salário básico NÃO pode ter sido preenchido automaticamente com 7.000,00
  assert.equal(inputSalarioBasicoVT.value, '', 'Salário básico contratual para VT não deve ser preenchido automaticamente');
});

test('Salário Líquido DOM: botões de ação (Copiar, Compartilhar e Imprimir) e feedback acessível', async () => {
  const elements = new Map();
  const listeners = new Map();

  function createStub(id, tagName = 'input', type = 'text') {
    const el = {
      id,
      tagName: tagName.toUpperCase(),
      type,
      value: '',
      checked: false,
      hidden: false,
      required: false,
      textContent: '',
      innerHTML: '',
      style: {},
      children: [],
      addEventListener(evt, fn) {
        if (!listeners.has(`${id}:${evt}`)) listeners.set(`${id}:${evt}`, []);
        listeners.get(`${id}:${evt}`).push(fn);
      },
      async dispatchEvent(evt) {
        const handlers = listeners.get(`${id}:${evt.type}`) || [];
        for (const h of handlers) {
          await h(evt);
        }
      },
      focus() {},
      reset() { this.value = ''; this.checked = false; },
      appendChild(c) { this.children.push(c); },
      setAttribute(k, v) { this[k] = v; },
      getAttribute(k) { return this[k] || null; },
      removeAttribute() {}
    };
    elements.set(id, el);
    return el;
  }

  const form = createStub('formSalarioLiquido', 'form');
  const inputRemuneracao = createStub('remuneracaoBruta');
  createStub('dependentes', 'input', 'number');
  createStub('pensaoAlimenticia');
  createStub('previdenciaPrivada');
  createStub('optanteVT', 'input', 'checkbox');
  createStub('containerCamposVT', 'div');
  createStub('salarioBasicoVT');
  createStub('custoRealVT');
  createStub('outrosDescontos');
  createStub('btnLimpar', 'button');
  createStub('mensagem-erro', 'p');
  createStub('resultadoSalarioLiquido', 'section');
  createStub('resumoSalarioLiquido', 'strong');
  createStub('resumoTotalDescontos', 'strong');
  createStub('resumoPercDescontos', 'strong');
  createStub('tabelaDetalhamentoCorpo', 'tbody');
  createStub('tabelaFaixasInssCorpo', 'tbody');
  createStub('containerAvisosResultado', 'div');
  const btnCopiar = createStub('btnCopiar', 'button');
  const btnCompartilhar = createStub('btnCompartilhar', 'button');
  const btnImprimir = createStub('btnImprimir', 'button');
  const statusAcoes = createStub('statusAcoes', 'span');

  const mockRoot = {
    querySelector(selector) {
      const cleanId = selector.replace(/^[#.]/, '');
      return elements.get(cleanId) || null;
    }
  };

  initSalarioLiquido(mockRoot);

  // Antes do cálculo, cliques não disparam cópia
  await btnCopiar.dispatchEvent({ type: 'click' });
  assert.equal(statusAcoes.textContent, '');

  // Executa cálculo com R$ 5.000,00
  inputRemuneracao.value = '5.000,00';
  form.dispatchEvent({ type: 'submit', preventDefault() {} });

  // 1. Teste de Cópia
  let copiedText = null;
  const originalNavigator = globalThis.navigator;
  const originalWindow = globalThis.window;

  try {
    Object.defineProperty(globalThis, 'navigator', {
      configurable: true,
      value: {
        clipboard: {
          async writeText(t) { copiedText = t; }
        }
      }
    });

    await btnCopiar.dispatchEvent({ type: 'click' });
    assert.match(statusAcoes.textContent, /Resultado copiado/i);
    assert.ok(copiedText.includes('Remuneração Bruta: R$ 5.000,00'));
    assert.ok(copiedText.includes('Salário Líquido a Receber: R$ 4.498,50'));

    // 2. Teste de Compartilhamento com sucesso
    let sharedData = null;
    Object.defineProperty(globalThis, 'navigator', {
      configurable: true,
      value: {
        clipboard: {
          async writeText(t) { copiedText = t; }
        },
        async share(data) {
          sharedData = data;
        }
      }
    });

    await btnCompartilhar.dispatchEvent({ type: 'click' });
    assert.match(statusAcoes.textContent, /Resultado compartilhado/i);
    assert.ok(sharedData.text.includes('Remuneração Bruta: R$ 5.000,00'));

    // 3. Teste de Compartilhamento cancelado pelo usuário (AbortError)
    Object.defineProperty(globalThis, 'navigator', {
      configurable: true,
      value: {
        clipboard: {
          async writeText(t) { copiedText = t; }
        },
        async share() {
          const err = new Error('Share canceled');
          err.name = 'AbortError';
          throw err;
        }
      }
    });

    await btnCompartilhar.dispatchEvent({ type: 'click' });
    assert.match(statusAcoes.textContent, /Compartilhamento cancelado/i);

    // 4. Teste de Compartilhamento com erro genérico -> fallback para cópia
    Object.defineProperty(globalThis, 'navigator', {
      configurable: true,
      value: {
        clipboard: {
          async writeText(t) { copiedText = t; }
        },
        async share() {
          throw new Error('Share failed');
        }
      }
    });

    await btnCompartilhar.dispatchEvent({ type: 'click' });
    assert.match(statusAcoes.textContent, /Compartilhamento indisponível\. Resultado copiado/i);

    // 5. Teste de Impressão
    let printCalled = false;
    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: {
        location: { origin: 'https://www.calculadoramaster.com' },
        print() { printCalled = true; }
      }
    });

    btnImprimir.dispatchEvent({ type: 'click' });
    assert.equal(printCalled, true);
  } finally {
    Object.defineProperty(globalThis, 'navigator', {
      configurable: true,
      value: originalNavigator
    });
    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: originalWindow
    });
  }
});

test('Salário Líquido DOM: múltiplos cálculos consecutivos não duplicam ouvintes e atualizam o conteúdo das ações', async () => {
  const elements = new Map();
  const listeners = new Map();

  function createStub(id, tagName = 'input', type = 'text') {
    const el = {
      id,
      tagName: tagName.toUpperCase(),
      type,
      value: '',
      checked: false,
      hidden: false,
      required: false,
      textContent: '',
      innerHTML: '',
      style: {},
      children: [],
      addEventListener(evt, fn) {
        if (!listeners.has(`${id}:${evt}`)) listeners.set(`${id}:${evt}`, []);
        listeners.get(`${id}:${evt}`).push(fn);
      },
      async dispatchEvent(evt) {
        const handlers = listeners.get(`${id}:${evt.type}`) || [];
        for (const h of handlers) {
          await h(evt);
        }
      },
      focus() {},
      reset() { this.value = ''; this.checked = false; },
      appendChild(c) { this.children.push(c); },
      setAttribute(k, v) { this[k] = v; },
      getAttribute(k) { return this[k] || null; },
      removeAttribute() {}
    };
    elements.set(id, el);
    return el;
  }

  const form = createStub('formSalarioLiquido', 'form');
  const inputRemuneracao = createStub('remuneracaoBruta');
  createStub('dependentes', 'input', 'number');
  createStub('pensaoAlimenticia');
  createStub('previdenciaPrivada');
  createStub('optanteVT', 'input', 'checkbox');
  createStub('containerCamposVT', 'div');
  createStub('salarioBasicoVT');
  createStub('custoRealVT');
  createStub('outrosDescontos');
  createStub('btnLimpar', 'button');
  createStub('mensagem-erro', 'p');
  createStub('resultadoSalarioLiquido', 'section');
  createStub('resumoSalarioLiquido', 'strong');
  createStub('resumoTotalDescontos', 'strong');
  createStub('resumoPercDescontos', 'strong');
  createStub('tabelaDetalhamentoCorpo', 'tbody');
  createStub('tabelaFaixasInssCorpo', 'tbody');
  createStub('containerAvisosResultado', 'div');
  const btnCopiar = createStub('btnCopiar', 'button');
  createStub('btnCompartilhar', 'button');
  createStub('btnImprimir', 'button');
  const statusAcoes = createStub('statusAcoes', 'span');

  const mockRoot = {
    querySelector(selector) {
      const cleanId = selector.replace(/^[#.]/, '');
      return elements.get(cleanId) || null;
    }
  };

  initSalarioLiquido(mockRoot);

  // Verifica que o ouvinte de click em btnCopiar foi registrado exatamente uma vez
  const clickListenersInicial = listeners.get('btnCopiar:click') || [];
  assert.equal(clickListenersInicial.length, 1, 'btnCopiar deve ter exatamente 1 ouvinte de click na inicialização');

  // Cálculo 1: R$ 3.000,00
  inputRemuneracao.value = '3.000,00';
  form.dispatchEvent({ type: 'submit', preventDefault() {} });

  // Cálculo 2: R$ 4.000,00
  inputRemuneracao.value = '4.000,00';
  form.dispatchEvent({ type: 'submit', preventDefault() {} });

  // Cálculo 3: R$ 6.000,00
  inputRemuneracao.value = '6.000,00';
  form.dispatchEvent({ type: 'submit', preventDefault() {} });

  // Garante que o ouvinte NÃO foi duplicado após múltiplos submits
  const clickListenersFinal = listeners.get('btnCopiar:click') || [];
  assert.equal(clickListenersFinal.length, 1, 'btnCopiar deve continuar tendo exatamente 1 ouvinte após múltiplos cálculos');

  // Testa cópia: deve refletir o último cálculo (R$ 6.000,00 -> Líquido R$ 4.973,39)
  let copiedText = '';
  const originalNavigator = globalThis.navigator;
  try {
    Object.defineProperty(globalThis, 'navigator', {
      configurable: true,
      value: {
        clipboard: {
          async writeText(t) { copiedText = t; }
        }
      }
    });

    await btnCopiar.dispatchEvent({ type: 'click' });
    assert.ok(copiedText.includes('Remuneração Bruta: R$ 6.000,00'), 'Cópia deve conter a remuneração do cálculo mais recente');
    assert.ok(copiedText.includes('Salário Líquido a Receber: R$ 4.973,39'), 'Cópia deve conter o líquido do cálculo mais recente');
    assert.equal(copiedText.includes('3.000,00'), false);
    assert.equal(copiedText.includes('4.000,00'), false);
  } finally {
    Object.defineProperty(globalThis, 'navigator', {
      configurable: true,
      value: originalNavigator
    });
  }
});

test('Salário Líquido: getResultSections gera seções completas para createResultActions', () => {
  const calc = calcularSalarioLiquido({
    remuneracaoBruta: 8000,
    dependentes: 1,
    pensaoAlimenticia: 500,
    previdenciaPrivadaPgbl: 400,
    optanteVT: true,
    salarioBasicoVT: 6000,
    custoRealVT: 300,
    outrosDescontos: 150
  });

  const sections = getResultSections(calc);
  assert.ok(Array.isArray(sections));
  assert.equal(sections.length, 3);
  assert.equal(sections[0].title, 'Proventos');
  assert.equal(sections[1].title, 'Descontos em Folha');
  assert.equal(sections[2].title, 'Resultado Final');

  const descLabels = sections[1].items.map(i => i.label);
  assert.ok(descLabels.some(l => l.includes('INSS')));
  assert.ok(descLabels.some(l => l.includes('IRRF')));
  assert.ok(descLabels.some(l => l.includes('Vale-Transporte')));
  assert.ok(descLabels.some(l => l.includes('Pensão Alimentícia')));
  assert.ok(descLabels.some(l => l.includes('Previdência Privada')));
  assert.ok(descLabels.some(l => l.includes('Outros Descontos')));

  // Caso vazio/nulo
  assert.deepEqual(getResultSections(null), []);
});
