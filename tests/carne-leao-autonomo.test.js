import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  ANO_REFERENCIA,
  DATA_CONSULTA_OFICIAL,
  FONTES_OFICIAIS,
  MODOS_DEDUCAO,
  TABELA_PROGRESSIVA_MENSAL_2026,
  PARAMETROS_CARNE_LEAO_2026,
  roundCurrency,
  parseFlexibleNumber,
  formatCurrency,
  formatPercent,
  enquadrarFaixaProgressiva,
  calcularImpostoProgressivo,
  calcularReducaoMensal2026,
  normalizeInput,
  validateInput,
  calculate,
  calculateCarneLeao,
  getResultSections,
  formatResult,
  buildCopyText,
  setupTool
} from '../js/tools/carne-leao-autonomo.js';
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
  const elements = new Map();
  const register = (id, tag = 'div', initial = {}) => {
    const el = createElementStub(tag, id);
    Object.assign(el, initial);
    elements.set(`#${id}`, el);
    return el;
  };

  const form = register('formCarneLeaoAutonomo', 'form');
  form.reset = () => {};

  register('mesReferenciaCarneLeao', 'select', { value: '1' });
  register('anoReferenciaCarneLeao', 'input', { value: '2026' });
  register('rendimentosPFCarneLeao', 'input', { value: '' });
  register('rendimentosExteriorCarneLeao', 'input', { value: '0' });
  register('rendimentosPJCarneLeao', 'input', { value: '' });

  register('modoDeducaoCarneLeao', 'select', { value: 'automatico' });
  register('ajudaModoDeducaoDinamicaCarneLeao', 'p', {
    textContent:
      'No modo automático, a calculadora compara a soma das suas Deduções Legais com o Desconto Simplificado Mensal de R$ 607,20 e aplica a alternativa mais benéfica (sem nunca somar as duas opções).'
  });
  register('despesasLivroCaixaCarneLeao', 'input', { value: '0' });
  register('excedenteLivroCaixaMesAnteriorCarneLeao', 'input', { value: '0' });
  register('avisoJaneiroSemExcedenteCarneLeao', 'p', { hidden: true });
  register('contribuicaoPrevidenciariaCarneLeao', 'input', { value: '0' });
  register('numeroDependentesCarneLeao', 'input', { value: '0' });
  register('pensaoAlimenticiaCarneLeao', 'input', { value: '0' });

  register('btnCalcularCarneLeao', 'button');
  register('btnLimparCarneLeao', 'button');

  register('erroCarneLeaoAutonomo', 'p', { hidden: true });
  register('resultadoCarneLeaoAutonomo', 'section', { hidden: true });
  register('statusCarneLeaoAutonomo', 'p', { textContent: '' });

  register('resCompetenciaCarneLeao', 'strong');
  register('resTotalRendimentosInformados', 'strong');
  register('resRendimentosSujeitosCarneLeao', 'strong');
  register('resRendimentosPFCarneLeao', 'strong');
  register('resRendimentosExteriorCarneLeao', 'strong');
  register('blocoAvisoRendimentosPJCarneLeao', 'div', { hidden: true });
  register('resAvisoRendimentosPJCarneLeao', 'p');

  register('resDeducaoAceitaCarneLeao', 'strong');
  register('resSomaDeducoesLegaisCarneLeao', 'strong');
  register('resDescontoSimplificadoCarneLeao', 'strong');
  register('resLivroCaixaResumoCarneLeao', 'strong');
  register('resLimiteDeducaoLivroCaixaCarneLeao', 'strong');
  register('blocoExcedenteAnteriorCarneLeao', 'div', { hidden: true });
  register('resExcedenteAnteriorCarneLeao', 'strong');
  register('blocoExcedenteRemanescenteCarneLeao', 'div', { hidden: true });
  register('resExcedenteRemanescenteCarneLeao', 'strong');
  register('blocoAvisoLivroCaixaCarneLeao', 'div', { hidden: true });
  register('resAvisoLivroCaixaCarneLeao', 'p');
  register('resInssResumoCarneLeao', 'strong');
  register('resDependentesResumoCarneLeao', 'strong');
  register('resPensaoResumoCarneLeao', 'strong');
  register('resComparacaoModalidadesCarneLeao', 'span');

  register('resBaseCalculoMensalCarneLeao', 'strong');
  register('resFaixaEAliquotaCarneLeao', 'strong');
  register('resImpostoAntesReducaoCarneLeao', 'strong');
  register('resReducaoLegalAplicadaCarneLeao', 'strong');
  register('resValorCarneLeaoDevido', 'strong');
  register('resAliquotaEfetivaCarneLeao', 'strong');
  register('resValorAposImpostoCarneLeao', 'strong');
  register('resSaldoAposDesembolsosCarneLeao', 'strong');
  register('resOrientacaoDarfCarneLeao', 'p');
  register('listaMemoriaCalculoCarneLeao', 'ul');

  register('btnCopiarCarneLeao', 'button', { hidden: true });
  register('btnCompartilharCarneLeao', 'button', { hidden: true });
  register('btnImprimirCarneLeao', 'button', { hidden: true });

  const favoriteButton = createElementStub('button', 'btnFavoritarCarneLeao');
  favoriteButton.dataset.favoriteButton = '';
  favoriteButton.dataset.toolId = 'carne-leao-autonomo';
  const favoriteLabel = createElementStub('span', 'labelFavoritarCarneLeao');
  favoriteLabel.dataset.favoriteLabel = '';
  const favoriteStatus = createElementStub('p', 'statusFavoritoCarneLeao');
  favoriteStatus.dataset.favoriteStatus = '';
  favoriteButton.querySelector = (sel) => {
    if (sel === '[data-favorite-label]') return favoriteLabel;
    return null;
  };

  return {
    elements,
    favoriteButton,
    favoriteLabel,
    favoriteStatus,
    querySelector(selector) {
      if (selector === '[data-favorite-status]') return favoriteStatus;
      return elements.get(selector) || null;
    },
    querySelectorAll(selector) {
      if (selector === '[data-favorite-button]') return [favoriteButton];
      return [];
    }
  };
}

test('Parâmetros oficiais de 2026 e fontes da Receita Federal / Planalto estão documentados', () => {
  assert.equal(ANO_REFERENCIA, 2026);
  assert.equal(DATA_CONSULTA_OFICIAL, '2026-10-21');
  assert.equal(TABELA_PROGRESSIVA_MENSAL_2026.length, 5);
  assert.equal(PARAMETROS_CARNE_LEAO_2026.deducaoPorDependente, 189.59);
  assert.equal(PARAMETROS_CARNE_LEAO_2026.descontoSimplificadoMensal, 607.2);
  assert.equal(PARAMETROS_CARNE_LEAO_2026.reducaoMensalArt3A.limiteIsencaoTotal, 5000.0);
  assert.equal(PARAMETROS_CARNE_LEAO_2026.reducaoMensalArt3A.reducaoMaximaAte5000, 312.89);
  assert.equal(PARAMETROS_CARNE_LEAO_2026.reducaoMensalArt3A.limiteSuperiorTransicao, 7350.0);
  assert.equal(PARAMETROS_CARNE_LEAO_2026.reducaoMensalArt3A.constanteLinear, 978.62);
  assert.equal(PARAMETROS_CARNE_LEAO_2026.reducaoMensalArt3A.coeficienteLinear, 0.133145);
  assert.equal(PARAMETROS_CARNE_LEAO_2026.minimoDarf, 10.0);
  assert.equal(PARAMETROS_CARNE_LEAO_2026.codigoDarf, '0190');
  assert.ok(Object.keys(FONTES_OFICIAIS).length >= 5);
});

test('Cada faixa tributária e limites exatos entre faixas na tabela progressiva mensal de 2026', () => {
  // Limite superior da 1ª faixa: R$ 2.428,80 -> 0%, parcela 0,00 -> imposto 0,00
  const f1Limite = calcularImpostoProgressivo(2428.8);
  assert.equal(f1Limite.faixa, 1);
  assert.equal(f1Limite.aliquota, 0);
  assert.equal(f1Limite.parcelaADeduzir, 0);
  assert.equal(f1Limite.impostoBruto, 0);

  // Limite inferior da 2ª faixa: R$ 2.428,81 -> 7,5%, parcela 182,16 -> 2428,81 * 0,075 - 182,16 = 182,16075 - 182,16 = 0,00
  const f2Inicio = calcularImpostoProgressivo(2428.81);
  assert.equal(f2Inicio.faixa, 2);
  assert.equal(f2Inicio.aliquota, 7.5);
  assert.equal(f2Inicio.parcelaADeduzir, 182.16);
  assert.equal(f2Inicio.impostoBruto, 0.0);

  // Interior da 2ª faixa: R$ 2.600,00 -> 2600 * 0,075 - 182,16 = 195,00 - 182,16 = 12,84
  const f2Interior = calcularImpostoProgressivo(2600.0);
  assert.equal(f2Interior.faixa, 2);
  assert.equal(f2Interior.impostoBruto, 12.84);

  // Limite superior da 2ª faixa: R$ 2.826,65 -> 2826,65 * 0,075 - 182,16 = 211,99875 - 182,16 = 29,84
  const f2Limite = calcularImpostoProgressivo(2826.65);
  assert.equal(f2Limite.faixa, 2);
  assert.equal(f2Limite.impostoBruto, 29.84);

  // Limite inferior da 3ª faixa: R$ 2.826,66 -> 15%, parcela 394,16 -> 2826,66 * 0,15 - 394,16 = 423,999 - 394,16 = 29,84
  const f3Inicio = calcularImpostoProgressivo(2826.66);
  assert.equal(f3Inicio.faixa, 3);
  assert.equal(f3Inicio.aliquota, 15.0);
  assert.equal(f3Inicio.parcelaADeduzir, 394.16);
  assert.equal(f3Inicio.impostoBruto, 29.84);

  // Interior da 3ª faixa: R$ 3.500,00 -> 3500 * 0,15 - 394,16 = 525,00 - 394,16 = 130,84
  const f3Interior = calcularImpostoProgressivo(3500.0);
  assert.equal(f3Interior.faixa, 3);
  assert.equal(f3Interior.impostoBruto, 130.84);

  // Limite superior da 3ª faixa: R$ 3.751,05 -> 3751,05 * 0,15 - 394,16 = 562,6575 - 394,16 = 168,50
  const f3Limite = calcularImpostoProgressivo(3751.05);
  assert.equal(f3Limite.faixa, 3);
  assert.equal(f3Limite.impostoBruto, 168.5);

  // Limite inferior da 4ª faixa: R$ 3.751,06 -> 22,5%, parcela 675,49 -> 3751,06 * 0,225 - 675,49 = 843,9885 - 675,49 = 168,50
  const f4Inicio = calcularImpostoProgressivo(3751.06);
  assert.equal(f4Inicio.faixa, 4);
  assert.equal(f4Inicio.aliquota, 22.5);
  assert.equal(f4Inicio.parcelaADeduzir, 675.49);
  assert.equal(f4Inicio.impostoBruto, 168.5);

  // Interior da 4ª faixa: R$ 4.200,00 -> 4200 * 0,225 - 675,49 = 945,00 - 675,49 = 269,51
  const f4Interior = calcularImpostoProgressivo(4200.0);
  assert.equal(f4Interior.faixa, 4);
  assert.equal(f4Interior.impostoBruto, 269.51);

  // Limite superior da 4ª faixa: R$ 4.664,68 -> 4664,68 * 0,225 - 675,49 = 1049,553 - 675,49 = 374,06
  const f4Limite = calcularImpostoProgressivo(4664.68);
  assert.equal(f4Limite.faixa, 4);
  assert.equal(f4Limite.impostoBruto, 374.06);

  // Limite inferior da 5ª faixa: R$ 4.664,69 -> 27,5%, parcela 908,73 -> 4664,69 * 0,275 - 908,73 = 1282,78975 - 908,73 = 374,06
  const f5Inicio = calcularImpostoProgressivo(4664.69);
  assert.equal(f5Inicio.faixa, 5);
  assert.equal(f5Inicio.aliquota, 27.5);
  assert.equal(f5Inicio.parcelaADeduzir, 908.73);
  assert.equal(f5Inicio.impostoBruto, 374.06);

  // Interior da 5ª faixa: R$ 10.000,00 -> 10000 * 0,275 - 908,73 = 2750,00 - 908,73 = 1841,27
  const f5Interior = calcularImpostoProgressivo(10000.0);
  assert.equal(f5Interior.faixa, 5);
  assert.equal(f5Interior.impostoBruto, 1841.27);
});

test('Regra oficial de redução mensal de 2026 (Lei nº 15.270/2025 / Art. 3º-A da Lei nº 9.250/1995)', () => {
  // 1) Rendimento tributável de R$ 5.000,00 com desconto simplificado (R$ 607,20):
  // Base = 5000 - 607,20 = 4.392,80 (4ª faixa: 22,5%, dedução 675,49)
  // Imposto bruto = 4392,80 * 0,225 - 675,49 = 988,38 - 675,49 = 312,89
  // Redução até 5.000,00 = 312,89 -> Imposto após redução = 0,00
  const red5000 = calcularReducaoMensal2026(5000.0, 312.89);
  assert.equal(red5000.faixaReducao, 'ate_5000');
  assert.equal(red5000.reducaoMaximaCalculada, 312.89);
  assert.equal(red5000.reducaoAplicada, 312.89);
  assert.equal(red5000.impostoAposReducao, 0.0);

  // 2) Limite de transição inferior: R$ 5.000,01
  // Redução máxima = round2(978,62 - 0,133145 * 5000,01) = round2(978,62 - 665,72633145) = 312,89
  const red5000_01 = calcularReducaoMensal2026(5000.01, 312.89);
  assert.equal(red5000_01.faixaReducao, 'transicao_5000_a_7350');
  assert.equal(red5000_01.reducaoMaximaCalculada, 312.89);
  assert.equal(red5000_01.reducaoAplicada, 312.89);
  assert.equal(red5000_01.impostoAposReducao, 0.0);

  // 3) Faixa intermediária de transição: R$ 6.000,00
  // Redução máxima = round2(978,62 - 0,133145 * 6000) = round2(978,62 - 798,87) = 179,75
  // Base com simplificado = 6000 - 607,20 = 5.392,80 -> Imposto bruto = 5392,80 * 0,275 - 908,73 = 1483,02 - 908,73 = 574,29
  // Imposto após redução = 574,29 - 179,75 = 394,54
  const red6000 = calcularReducaoMensal2026(6000.0, 574.29);
  assert.equal(red6000.faixaReducao, 'transicao_5000_a_7350');
  assert.equal(red6000.reducaoMaximaCalculada, 179.75);
  assert.equal(red6000.reducaoAplicada, 179.75);
  assert.equal(red6000.impostoAposReducao, 394.54);

  // 4) Limite superior da transição: R$ 7.350,00
  // Redução máxima = round2(978,62 - 0,133145 * 7350) = round2(978,62 - 978,61575) = 0,00
  const red7350 = calcularReducaoMensal2026(7350.0, 945.52);
  assert.equal(red7350.faixaReducao, 'transicao_5000_a_7350');
  assert.equal(red7350.reducaoMaximaCalculada, 0.0);
  assert.equal(red7350.reducaoAplicada, 0.0);
  assert.equal(red7350.impostoAposReducao, 945.52);

  // 5) Acima de R$ 7.350,00 (R$ 7.350,01 e R$ 10.000,00): sem redução
  const red7350_01 = calcularReducaoMensal2026(7350.01, 945.52);
  assert.equal(red7350_01.faixaReducao, 'acima_7350');
  assert.equal(red7350_01.reducaoAplicada, 0.0);
  assert.equal(red7350_01.impostoAposReducao, 945.52);
});

test('Casos de referência calculados independentemente das funções de produção', () => {
  // Caso de Referência 1: Autônomo recebe R$ 4.800,00 de PF em março/2026, sem deduções legais.
  // Alternativa mais vantajosa: Desconto Simplificado Mensal = R$ 607,20.
  // Base de cálculo = 4.800,00 - 607,20 = R$ 4.192,80 (4ª faixa: 22,5%, parcela R$ 675,49).
  // Imposto antes da redução = round2(4192,80 * 0,225 - 675,49) = round2(943,38 - 675,49) = R$ 267,89.
  // Redução mensal (rendimento <= R$ 5.000,00): limitada ao imposto bruto de R$ 267,89.
  // Carnê-Leão devido = 267,89 - 267,89 = R$ 0,00.
  // Valor estimado após o imposto = R$ 4.800,00.
  const ref1 = calculate({
    mesReferencia: 3,
    anoReferencia: 2026,
    rendimentosPessoaFisica: '4800,00',
    rendimentosExterior: '0',
    modoDeducao: 'automatico',
    despesasLivroCaixa: '0',
    contribuicaoPrevidenciaria: '0',
    numeroDependentes: '0',
    pensaoAlimenticia: '0'
  });
  assert.equal(ref1.ok, true);
  assert.equal(ref1.data.deducoes.tipoDeducaoAplicada, MODOS_DEDUCAO.SIMPLIFICADO);
  assert.equal(ref1.data.apuracao.baseCalculoMensal, 4192.8);
  assert.equal(ref1.data.apuracao.faixa, 4);
  assert.equal(ref1.data.apuracao.impostoAntesReducao, 267.89);
  assert.equal(ref1.data.apuracao.reducaoAplicada, 267.89);
  assert.equal(ref1.data.apuracao.impostoDevido, 0.0);
  assert.equal(ref1.data.apuracao.aliquotaEfetiva, 0.0);
  assert.equal(ref1.data.apuracao.valorEstimadoAposImposto, 4800.0);

  // Caso de Referência 2: Autônomo recebe R$ 6.000,00 de PF em abril/2026, sem deduções legais (usa simplificado R$ 607,20).
  // Base de cálculo = 6.000,00 - 607,20 = R$ 5.392,80 (5ª faixa: 27,5%, parcela R$ 908,73).
  // Imposto antes da redução = round2(5392,80 * 0,275 - 908,73) = round2(1483,02 - 908,73) = R$ 574,29.
  // Redução mensal (transição 5.000,01 a 7.350,00): round2(978,62 - 0,133145 * 6000,00) = round2(978,62 - 798,87) = R$ 179,75.
  // Carnê-Leão devido = 574,29 - 179,75 = R$ 394,54.
  // Alíquota efetiva = round2((394,54 / 6000,00) * 100) = 6,58%.
  // Valor estimado após o imposto = 6.000,00 - 394,54 = R$ 5.605,46.
  const ref2 = calculate({
    mesReferencia: 4,
    anoReferencia: 2026,
    rendimentosPessoaFisica: '6000,00',
    rendimentosExterior: '0',
    modoDeducao: 'automatico',
    despesasLivroCaixa: '0',
    contribuicaoPrevidenciaria: '0',
    numeroDependentes: '0',
    pensaoAlimenticia: '0'
  });
  assert.equal(ref2.ok, true);
  assert.equal(ref2.data.apuracao.baseCalculoMensal, 5392.8);
  assert.equal(ref2.data.apuracao.faixa, 5);
  assert.equal(ref2.data.apuracao.impostoAntesReducao, 574.29);
  assert.equal(ref2.data.apuracao.reducaoAplicada, 179.75);
  assert.equal(ref2.data.apuracao.impostoDevido, 394.54);
  assert.equal(ref2.data.apuracao.aliquotaEfetiva, 6.58);
  assert.equal(ref2.data.apuracao.valorEstimadoAposImposto, 5605.46);

  // Caso de Referência 3: Autônomo recebe R$ 7.000,00 (R$ 5.500,00 PF + R$ 1.500,00 Exterior) em maio/2026.
  // Deduções legais: Livro-Caixa R$ 1.200,00 + INSS R$ 324,20 + 2 dependentes (2 * 189,59 = R$ 379,18) + Pensão R$ 500,00.
  // Soma das deduções legais = 1200,00 + 324,20 + 379,18 + 500,00 = R$ 2.403,38 (> R$ 607,20 simplificado).
  // Base de cálculo = 7.000,00 - 2.403,38 = R$ 4.596,62 (4ª faixa: 22,5%, parcela R$ 675,49).
  // Imposto antes da redução = round2(4596,62 * 0,225 - 675,49) = round2(1034,2395 - 675,49) = R$ 358,75.
  // Redução mensal para rendimento tributável de R$ 7.000,00:
  // Redução calculada = round2(978,62 - 0,133145 * 7000,00) = round2(978,62 - 932,015) = round2(46,605) = R$ 46,61.
  // Carnê-Leão devido = 358,75 - 46,61 = R$ 312,14.
  // Alíquota efetiva = round2((312,14 / 7000,00) * 100) = 4,46%.
  // Valor estimado após o imposto = 7.000,00 - 312,14 = R$ 6.687,86.
  // Desembolsos informados (Livro-Caixa 1200 + INSS 324,20 + Pensão 500 = 2024,20) -> Saldo após imposto e desembolsos = 7000 - 2024,20 - 312,14 = R$ 4.663,66.
  const ref3 = calculate({
    mesReferencia: 5,
    anoReferencia: 2026,
    rendimentosPessoaFisica: '5500,00',
    rendimentosExterior: '1500,00',
    modoDeducao: 'automatico',
    despesasLivroCaixa: '1200,00',
    contribuicaoPrevidenciaria: '324,20',
    numeroDependentes: '2',
    pensaoAlimenticia: '500,00'
  });
  assert.equal(ref3.ok, true);
  assert.equal(ref3.data.rendimentos.sujeitosCarneLeao, 7000.0);
  assert.equal(ref3.data.deducoes.deducaoDependentes, 379.18);
  assert.equal(ref3.data.deducoes.deducoesLegaisTotal, 2403.38);
  assert.equal(ref3.data.deducoes.tipoDeducaoAplicada, MODOS_DEDUCAO.LEGAIS);
  assert.equal(ref3.data.apuracao.baseCalculoMensal, 4596.62);
  assert.equal(ref3.data.apuracao.faixa, 4);
  assert.equal(ref3.data.apuracao.impostoAntesReducao, 358.75);
  assert.equal(ref3.data.apuracao.reducaoAplicada, 46.61);
  assert.equal(ref3.data.apuracao.impostoDevido, 312.14);
  assert.equal(ref3.data.apuracao.aliquotaEfetiva, 4.46);
  assert.equal(ref3.data.apuracao.valorEstimadoAposImposto, 6687.86);
  assert.equal(ref3.data.apuracao.saldoEstimadoAposImpostoEDesembolsos, 4663.66);

  // Caso de Referência 4: Rendimento acima de R$ 7.350,00 (sem redução mensal): R$ 10.000,00 de PF em agosto/2026.
  // Deduções legais: Livro-Caixa R$ 1.500,00 + INSS R$ 600,00 + 1 dependente (R$ 189,59) = R$ 2.289,59.
  // Base de cálculo = 10.000,00 - 2.289,59 = R$ 7.710,41 (5ª faixa: 27,5%, parcela R$ 908,73).
  // Imposto antes da redução = round2(7710,41 * 0,275 - 908,73) = round2(2120,36275 - 908,73) = R$ 1.211,63.
  // Redução mensal (acima de R$ 7.350,00) = R$ 0,00.
  // Carnê-Leão devido = R$ 1.211,63.
  // Alíquota efetiva = round2((1211,63 / 10000,00) * 100) = 12,12%.
  const ref4 = calculate({
    mesReferencia: 8,
    anoReferencia: 2026,
    rendimentosPessoaFisica: '10000,00',
    rendimentosExterior: '0',
    modoDeducao: 'automatico',
    despesasLivroCaixa: '1500,00',
    contribuicaoPrevidenciaria: '600,00',
    numeroDependentes: '1',
    pensaoAlimenticia: '0'
  });
  assert.equal(ref4.ok, true);
  assert.equal(ref4.data.deducoes.deducoesLegaisTotal, 2289.59);
  assert.equal(ref4.data.apuracao.baseCalculoMensal, 7710.41);
  assert.equal(ref4.data.apuracao.faixa, 5);
  assert.equal(ref4.data.apuracao.impostoAntesReducao, 1211.63);
  assert.equal(ref4.data.apuracao.reducaoAplicada, 0.0);
  assert.equal(ref4.data.apuracao.impostoDevido, 1211.63);
  assert.equal(ref4.data.apuracao.aliquotaEfetiva, 12.12);
});

test('Cenário 1: Receitas somente de pessoa física', () => {
  // Mês 3/2026. PF = R$ 6.000,00, Exterior = 0, PJ = 0.
  // Livro-Caixa pago = R$ 1.000,00.
  // Receita elegível Livro-Caixa = R$ 6.000,00 (teto).
  // Livro-Caixa aceito = R$ 1.000,00. Excedente = R$ 0,00.
  // Deduções Legais = R$ 1.000,00 > Desconto Simplificado (R$ 607,20) -> Legais selecionado.
  // Base de cálculo = 6.000,00 - 1.000,00 = R$ 5.000,00.
  // Faixa 5: 27,5%, parcela R$ 908,73.
  // Imposto antes redução = round2(5.000 * 0,275 - 908,73) = 1375,00 - 908,73 = R$ 466,27.
  // Rendimento tributável = R$ 6.000,00.
  // Redução art. 3º-A: round2(978,62 - 0,133145 * 6000) = round2(978,62 - 798,87) = R$ 179,75.
  // Carnê-Leão devido = 466,27 - 179,75 = R$ 286,52.
  // Alíquota efetiva = round2((286,52 / 6000) * 100) = 4,78%.
  const res = calculate({
    mesReferencia: 3,
    anoReferencia: 2026,
    rendimentosPessoaFisica: '6000,00',
    rendimentosExterior: '0',
    rendimentosPessoaJuridica: '0',
    despesasLivroCaixa: '1000,00',
    modoDeducao: 'automatico'
  });
  assert.equal(res.ok, true);
  assert.equal(res.data.rendimentos.sujeitosCarneLeao, 6000.0);
  assert.equal(res.data.rendimentos.receitaElegivelLivroCaixa, 6000.0);
  assert.equal(res.data.deducoes.livroCaixaAceitoNaAtividade, 1000.0);
  assert.equal(res.data.deducoes.excedenteLivroCaixaRemanescente, 0.0);
  assert.equal(res.data.deducoes.tipoDeducaoAplicada, MODOS_DEDUCAO.LEGAIS);
  assert.equal(res.data.apuracao.baseCalculoMensal, 5000.0);
  assert.equal(res.data.apuracao.impostoAntesReducao, 466.27);
  assert.equal(res.data.apuracao.reducaoAplicada, 179.75);
  assert.equal(res.data.apuracao.impostoDevido, 286.52);
  assert.equal(res.data.apuracao.aliquotaEfetiva, 4.78);
});

test('Cenário 2: Receitas de pessoa física e pessoa jurídica no mesmo mês', () => {
  // Mês 4/2026. PF = R$ 4.000,00, PJ = R$ 3.000,00.
  // Receita elegível Livro-Caixa = 4.000 + 3.000 = R$ 7.000,00.
  // Rendimentos sujeitos ao Carnê-Leão = R$ 4.000,00 (PJ excluída da base).
  // Livro-Caixa informado = R$ 5.000,00.
  // Como 5.000 <= 7.000, todas as 5.000 são aceitas na atividade. Excedente remanescente = 0,00.
  // Na base do Carnê-Leão: abate até o limite de PF (4.000,00). 1.000 restante é absorvido contra PJ.
  // Base Carnê-Leão = 4.000 - 4.000 = R$ 0,00.
  // Imposto devido = R$ 0,00.
  const res = calculate({
    mesReferencia: 4,
    anoReferencia: 2026,
    rendimentosPessoaFisica: '4000,00',
    rendimentosExterior: '0',
    rendimentosPessoaJuridica: '3000,00',
    despesasLivroCaixa: '5000,00'
  });
  assert.equal(res.ok, true);
  assert.equal(res.data.rendimentos.sujeitosCarneLeao, 4000.0);
  assert.equal(res.data.rendimentos.receitaElegivelLivroCaixa, 7000.0);
  assert.equal(res.data.deducoes.livroCaixaAceitoNaAtividade, 5000.0);
  assert.equal(res.data.deducoes.livroCaixaDeduzidoNaBaseCarneLeao, 4000.0);
  assert.equal(res.data.deducoes.livroCaixaAbsorvidoPelaPJ, 1000.0);
  assert.equal(res.data.deducoes.excedenteLivroCaixaRemanescente, 0.0);
  assert.equal(res.data.apuracao.baseCalculoMensal, 0.0);
  assert.equal(res.data.apuracao.impostoDevido, 0.0);
  assert.match(res.data.avisos.avisoRendimentosPJ, /integra o limite de dedução mensal do Livro-Caixa/i);
});

test('Cenário 3: Receitas de pessoa física, pessoa jurídica e exterior no mesmo mês', () => {
  // Mês 7/2026. PF = R$ 5.000,00, Exterior = R$ 2.000,00, PJ = R$ 3.000,00.
  // Teto Livro-Caixa = 5.000 + 2.000 + 3.000 = R$ 10.000,00.
  // Sujeito a Carnê-Leão = 5.000 + 2.000 = R$ 7.000,00.
  // Livro-Caixa pago = R$ 2.500,00 <= 10.000,00.
  // Deduções Legais = 2.500,00 > Simplificado (607,20).
  // Base Carnê-Leão = 7.000,00 - 2.500,00 = R$ 4.500,00 (4ª faixa: 22,5%, parcela 675,49).
  // Imposto antes redução = round2(4500 * 0,225 - 675,49) = 1012,50 - 675,49 = R$ 337,01.
  // Redução art. 3º-A para R$ 7.000,00: round2(978,62 - 0,133145 * 7000) = round2(978,62 - 932,015) = R$ 46,61.
  // Imposto devido = 337,01 - 46,61 = R$ 290,40.
  const res = calculate({
    mesReferencia: 7,
    anoReferencia: 2026,
    rendimentosPessoaFisica: '5000,00',
    rendimentosExterior: '2000,00',
    rendimentosPessoaJuridica: '3000,00',
    despesasLivroCaixa: '2500,00'
  });
  assert.equal(res.ok, true);
  assert.equal(res.data.rendimentos.sujeitosCarneLeao, 7000.0);
  assert.equal(res.data.rendimentos.receitaElegivelLivroCaixa, 10000.0);
  assert.equal(res.data.deducoes.livroCaixaAceitoNaAtividade, 2500.0);
  assert.equal(res.data.apuracao.baseCalculoMensal, 4500.0);
  assert.equal(res.data.apuracao.impostoAntesReducao, 337.01);
  assert.equal(res.data.apuracao.reducaoAplicada, 46.61);
  assert.equal(res.data.apuracao.impostoDevido, 290.4);
});

test('Cenário 4: Livro-Caixa abaixo, igual e acima do limite de receitas elegíveis', () => {
  // Receita elegível: PF = 3.000, PJ = 2.000 -> Teto = R$ 5.000,00
  // 4a) Abaixo: Despesas = 2.000
  const abaixo = calculate({
    mesReferencia: 5,
    anoReferencia: 2026,
    rendimentosPessoaFisica: '3000,00',
    rendimentosPessoaJuridica: '2000,00',
    despesasLivroCaixa: '2000,00'
  });
  assert.equal(abaixo.ok, true);
  assert.equal(abaixo.data.deducoes.livroCaixaAceitoNaAtividade, 2000.0);
  assert.equal(abaixo.data.deducoes.excedenteLivroCaixaRemanescente, 0.0);
  assert.equal(abaixo.data.deducoes.livroCaixaLimitadoPelaReceita, false);

  // 4b) Igual: Despesas = 5.000
  const igual = calculate({
    mesReferencia: 5,
    anoReferencia: 2026,
    rendimentosPessoaFisica: '3000,00',
    rendimentosPessoaJuridica: '2000,00',
    despesasLivroCaixa: '5000,00'
  });
  assert.equal(igual.ok, true);
  assert.equal(igual.data.deducoes.livroCaixaAceitoNaAtividade, 5000.0);
  assert.equal(igual.data.deducoes.excedenteLivroCaixaRemanescente, 0.0);
  assert.equal(igual.data.deducoes.livroCaixaLimitadoPelaReceita, false);

  // 4c) Acima: Despesas = 6.500 -> Aceito = 5.000, Excedente = 1.500
  const acima = calculate({
    mesReferencia: 5,
    anoReferencia: 2026,
    rendimentosPessoaFisica: '3000,00',
    rendimentosPessoaJuridica: '2000,00',
    despesasLivroCaixa: '6500,00'
  });
  assert.equal(acima.ok, true);
  assert.equal(acima.data.deducoes.livroCaixaAceitoNaAtividade, 5000.0);
  assert.equal(acima.data.deducoes.excedenteLivroCaixaRemanescente, 1500.0);
  assert.equal(acima.data.deducoes.livroCaixaLimitadoPelaReceita, true);
});

test('Cenário 5: Excedente de Livro-Caixa trazido do mês anterior e bloqueio em janeiro', () => {
  // Mês 4 (Abril): PF = 5.000. Despesas do mês = 1.000. Excedente anterior = 800.
  // Despesas disponíveis = 1.000 + 800 = R$ 1.800,00 <= 5.000.
  // Aceito = 1.800,00. Base = 5.000 - 1.800 = R$ 3.200,00.
  const abril = calculate({
    mesReferencia: 4,
    anoReferencia: 2026,
    rendimentosPessoaFisica: '5000,00',
    despesasLivroCaixa: '1000,00',
    excedenteLivroCaixaMesAnterior: '800,00'
  });
  assert.equal(abril.ok, true);
  assert.equal(abril.data.deducoes.excedenteLivroCaixaAnterior, 800.0);
  assert.equal(abril.data.deducoes.despesasLivroCaixaDisponiveis, 1800.0);
  assert.equal(abril.data.deducoes.livroCaixaAceitoNaAtividade, 1800.0);
  assert.equal(abril.data.apuracao.baseCalculoMensal, 3200.0);

  // Janeiro: bloqueia excedente do mês anterior (não há transporte do ano anterior)
  const janeiroComExcedente = calculate({
    mesReferencia: 1,
    anoReferencia: 2026,
    rendimentosPessoaFisica: '5000,00',
    despesasLivroCaixa: '1000,00',
    excedenteLivroCaixaMesAnterior: '500,00'
  });
  assert.equal(janeiroComExcedente.ok, false);
  assert.match(janeiroComExcedente.error, /Para o mês de Janeiro, não é permitido transportar excedente/i);
});

test('Cenário 6: Excedente de Livro-Caixa parcialmente utilizado no mês atual', () => {
  // Mês 5 (Maio): Receita da atividade = 3.000 (PF = 3.000).
  // Despesas pagas no mês = 2.000. Excedente trazido = 2.500.
  // Total disponível = 2.000 + 2.500 = 4.500.
  // Limite = 3.000. Aceito = 3.000.
  // Excedente remanescente = 4.500 - 3.000 = 1.500.
  const res = calculate({
    mesReferencia: 5,
    anoReferencia: 2026,
    rendimentosPessoaFisica: '3000,00',
    despesasLivroCaixa: '2000,00',
    excedenteLivroCaixaMesAnterior: '2500,00'
  });
  assert.equal(res.ok, true);
  assert.equal(res.data.deducoes.despesasLivroCaixaDisponiveis, 4500.0);
  assert.equal(res.data.deducoes.livroCaixaAceitoNaAtividade, 3000.0);
  assert.equal(res.data.deducoes.excedenteLivroCaixaRemanescente, 1500.0);
  assert.equal(res.data.deducoes.excedenteTransponivelMesSeguinte, true);
});

test('Cenário 7: Excedente remanescente de janeiro a novembro com transporte até dezembro', () => {
  // Mês 9 (Setembro): Receita = 4.000. Despesas = 5.200.
  // Excedente remanescente = 1.200.
  // Transponível até dezembro = true.
  const res = calculate({
    mesReferencia: 9,
    anoReferencia: 2026,
    rendimentosPessoaFisica: '4000,00',
    despesasLivroCaixa: '5200,00'
  });
  assert.equal(res.ok, true);
  assert.equal(res.data.deducoes.excedenteLivroCaixaRemanescente, 1200.0);
  assert.equal(res.data.deducoes.excedenteTransponivelMesSeguinte, true);
  assert.equal(res.data.deducoes.excedenteNaoAproveitadoDezembro, false);
  assert.match(res.data.avisos.avisoLivroCaixa, /pode ser transportado para dedução nos meses seguintes até dezembro/i);
});

test('Cenário 8: Tratamento de excedente em dezembro com vedação de transporte ao ano seguinte', () => {
  // Mês 12 (Dezembro): Receita = 4.000. Despesas = 5.200.
  // Excedente remanescente = 1.200.
  // Transponível = false; excedenteNaoAproveitadoDezembro = true.
  const res = calculate({
    mesReferencia: 12,
    anoReferencia: 2026,
    rendimentosPessoaFisica: '4000,00',
    despesasLivroCaixa: '5200,00'
  });
  assert.equal(res.ok, true);
  assert.equal(res.data.deducoes.excedenteLivroCaixaRemanescente, 1200.0);
  assert.equal(res.data.deducoes.excedenteTransponivelMesSeguinte, false);
  assert.equal(res.data.deducoes.excedenteNaoAproveitadoDezembro, true);
  assert.match(res.data.avisos.avisoLivroCaixa, /NÃO pode ser transportado para o ano-calendário seguinte/i);
});

test('Cenário 9: Separação estrita entre a base tributável do Carnê-Leão e o limite do Livro-Caixa', () => {
  // Mês 6. PF = R$ 2.000,00, PJ = R$ 6.000,00.
  // Receita elegível Livro-Caixa = R$ 8.000,00.
  // Sujeito a Carnê-Leão = R$ 2.000,00.
  // Livro-Caixa = R$ 3.500,00.
  // 3.500 <= 8.000 -> despesa aceita na atividade = 3.500.
  // Base Carnê-Leão = max(0, 2.000 - 3.500) = R$ 0,00 (não fica negativa!).
  // Despesa deduzida na base Carnê-Leão = 2.000; absorvida pela PJ = 1.500.
  // Imposto Carnê-Leão = R$ 0,00.
  const res = calculate({
    mesReferencia: 6,
    anoReferencia: 2026,
    rendimentosPessoaFisica: '2000,00',
    rendimentosExterior: '0',
    rendimentosPessoaJuridica: '6000,00',
    despesasLivroCaixa: '3500,00'
  });
  assert.equal(res.ok, true);
  assert.equal(res.data.rendimentos.sujeitosCarneLeao, 2000.0);
  assert.equal(res.data.rendimentos.receitaElegivelLivroCaixa, 8000.0);
  assert.equal(res.data.deducoes.livroCaixaAceitoNaAtividade, 3500.0);
  assert.equal(res.data.deducoes.livroCaixaDeduzidoNaBaseCarneLeao, 2000.0);
  assert.equal(res.data.deducoes.livroCaixaAbsorvidoPelaPJ, 1500.0);
  assert.equal(res.data.apuracao.baseCalculoMensal, 0.0);
  assert.equal(res.data.apuracao.impostoDevido, 0.0);
  assert.equal(res.data.apuracao.baseCalculoMensal >= 0, true);
});

test('Cenário 10: Prevenção de dupla dedução e validação de deduções inválidas', () => {
  // 1) Tentativa de somar Desconto Simplificado com Deduções Legais
  const somaIndevida = calculate({
    mesReferencia: 1,
    anoReferencia: 2026,
    rendimentosPessoaFisica: '6000,00',
    despesasLivroCaixa: '800,00',
    somarSimplificadoComLegais: true
  });
  assert.equal(somaIndevida.ok, false);
  assert.match(somaIndevida.error, /Prevenção de dupla dedução: o desconto simplificado mensal/i);

  // 2) Deduções já utilizadas na fonte
  const jaUsadoFonte = calculate({
    mesReferencia: 1,
    anoReferencia: 2026,
    rendimentosPessoaFisica: '6000,00',
    contribuicaoPrevidenciaria: '324,20',
    deducoesJaUtilizadasNaFonte: true
  });
  assert.equal(jaUsadoFonte.ok, false);
  assert.match(jaUsadoFonte.error, /já utilizados para deduzir rendimentos sujeitos à retenção na fonte/i);

  // 3) INSS ou dependentes embutidos no Livro-Caixa
  const inssNoLivroCaixa = calculate({
    mesReferencia: 1,
    anoReferencia: 2026,
    rendimentosPessoaFisica: '6000,00',
    despesasLivroCaixa: '1000,00',
    inssOuDependentesNoLivroCaixa: true
  });
  assert.equal(inssNoLivroCaixa.ok, false);
  assert.match(inssNoLivroCaixa.error, /não inclua contribuição previdenciária própria, dependentes ou pensão alimentícia dentro das despesas de Livro-Caixa/i);

  // 4) Despesas não dedutíveis de capital
  const despesaNaoDedutivel = calculate({
    mesReferencia: 1,
    anoReferencia: 2026,
    rendimentosPessoaFisica: '6000,00',
    despesasLivroCaixa: '3000,00',
    despesasNaoDedutiveisIncluidas: true
  });
  assert.equal(despesaNaoDedutivel.ok, false);
  assert.match(despesaNaoDedutivel.error, /Despesas não dedutíveis no Livro-Caixa/i);
});

test('Tratamento de rendimentos exclusivamente de PJ ou mistos com PF/Exterior', () => {
  // 1) Usuário informa apenas rendimentos de Pessoa Jurídica (PF = 0, Exterior = 0, PJ = R$ 5.000,00)
  const somentePJ = calculate({
    mesReferencia: 2,
    anoReferencia: 2026,
    rendimentosPessoaFisica: '0',
    rendimentosExterior: '0',
    rendimentosPessoaJuridica: '5000,00'
  });
  assert.equal(somentePJ.ok, true);
  assert.equal(somentePJ.data.rendimentos.sujeitosCarneLeao, 0.0);
  assert.equal(somentePJ.data.rendimentos.pessoaJuridicaNaoSujeito, 5000.0);
  assert.equal(somentePJ.data.rendimentos.receitaElegivelLivroCaixa, 5000.0);
  assert.equal(somentePJ.data.apuracao.impostoDevido, 0.0);
  assert.match(
    somentePJ.data.avisos.avisoRendimentosPJ,
    /NÃO estão sujeitos ao recolhimento mensal de Carnê-Leão/i
  );

  // 2) Usuário informa R$ 6.000,00 de PF e R$ 3.000,00 de PJ
  const mistoPFePJ = calculate({
    mesReferencia: 2,
    anoReferencia: 2026,
    rendimentosPessoaFisica: '6000,00',
    rendimentosExterior: '0',
    rendimentosPessoaJuridica: '3000,00',
    modoDeducao: 'simplificado'
  });
  assert.equal(mistoPFePJ.ok, true);
  assert.equal(mistoPFePJ.data.rendimentos.sujeitosCarneLeao, 6000.0);
  assert.equal(mistoPFePJ.data.rendimentos.pessoaJuridicaNaoSujeito, 3000.0);
  assert.equal(mistoPFePJ.data.rendimentos.totalInformado, 9000.0);
  assert.equal(mistoPFePJ.data.apuracao.impostoDevido, 394.54);
  assert.match(mistoPFePJ.data.avisos.avisoRendimentosPJ, /NÃO entra na base do Carnê-Leão/i);
});

test('Limite mínimo de DARF (R$ 10,00 — Lei nº 9.430/1996, art. 68)', () => {
  // Rendimento PF = R$ 5.200,00, Deduções Legais = R$ 2.500,00 -> Base = R$ 2.700,00 (2ª faixa: 7,5%, dedução 182,16)
  // Imposto bruto = 2700 * 0,075 - 182,16 = 202,50 - 182,16 = R$ 20,34.
  // Redução máxima em R$ 5.200,00 = round2(978,62 - 0,133145 * 5200) = round2(978,62 - 692,354) = R$ 286,27 -> zera imposto.
  // Agora testemos um caso com imposto devido positivo entre R$ 0,01 e R$ 9,99:
  // Rendimento PF = R$ 7.400,00 (acima de 7.350,00 -> redução = 0).
  // Livro-Caixa = R$ 4.850,00 -> Base = 7.400,00 - 4.850,00 = R$ 2.550,00 (2ª faixa: 7,5%, parcela 182,16).
  // Imposto devido = round2(2550 * 0,075 - 182,16) = round2(191,25 - 182,16) = R$ 9,09 (< R$ 10,00).
  const darfMenorQue10 = calculate({
    mesReferencia: 7,
    anoReferencia: 2026,
    rendimentosPessoaFisica: '7400,00',
    despesasLivroCaixa: '4850,00',
    modoDeducao: 'legais'
  });
  assert.equal(darfMenorQue10.ok, true);
  assert.equal(darfMenorQue10.data.apuracao.impostoDevido, 9.09);
  assert.equal(darfMenorQue10.data.apuracao.abaixoMinimoDarf, true);
  assert.match(darfMenorQue10.data.avisos.avisoDarfMinimo, /inferior ao limite mínimo de R\$ 10,00 para emissão de DARF/i);
});

test('Validação de entradas vazias, negativas, inválidas, ano diferente de 2026 e números com vírgula decimal', () => {
  // Entradas vazias
  const vazio = calculate({
    mesReferencia: 1,
    anoReferencia: 2026,
    rendimentosPessoaFisica: '',
    rendimentosExterior: ''
  });
  assert.equal(vazio.ok, false);
  assert.match(vazio.error, /Informe ao menos um valor de rendimento/i);

  // Rendimento negativo
  const negativo = calculate({
    mesReferencia: 1,
    anoReferencia: 2026,
    rendimentosPessoaFisica: '-100'
  });
  assert.equal(negativo.ok, false);
  assert.match(negativo.error, /não podem ser negativos/i);

  // Livro-Caixa negativo
  const lcNegativo = calculate({
    mesReferencia: 1,
    anoReferencia: 2026,
    rendimentosPessoaFisica: '5000',
    despesasLivroCaixa: '-50'
  });
  assert.equal(lcNegativo.ok, false);
  assert.match(lcNegativo.error, /Livro-Caixa não podem ser negativas/i);

  // Dependentes fracionários ou negativos
  const depFracionario = calculate({
    mesReferencia: 1,
    anoReferencia: 2026,
    rendimentosPessoaFisica: '5000',
    numeroDependentes: '1.5'
  });
  assert.equal(depFracionario.ok, false);
  assert.match(depFracionario.error, /número inteiro/i);

  // Ano diferente de 2026 (ex.: 2025)
  const ano2025 = calculate({
    mesReferencia: 1,
    anoReferencia: 2025,
    rendimentosPessoaFisica: '5000'
  });
  assert.equal(ano2025.ok, false);
  assert.match(ano2025.error, /atende exclusivamente o ano-calendário de 2026/i);

  // Strings monetárias brasileiras com ponto de milhar e vírgula decimal
  assert.equal(parseFlexibleNumber('R$ 6.543,21'), 6543.21);
  assert.equal(parseFlexibleNumber('1.234.567,89'), 1234567.89);
  assert.equal(parseFlexibleNumber('abc'), Number.NaN);
  assert.equal(roundCurrency(10.555), 10.56);
});

test('DOM: calcular, limpar formulário, recalcular, copiar, compartilhar, imprimir e favoritar', async () => {
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

    // No carregamento inicial com mês = 1 (Janeiro), o excedente anterior fica desabilitado
    assert.equal(dom.querySelector('#excedenteLivroCaixaMesAnteriorCarneLeao').disabled, true);
    assert.equal(dom.querySelector('#avisoJaneiroSemExcedenteCarneLeao').hidden, false);

    // Mudando para abril, o campo de excedente anterior é habilitado
    dom.querySelector('#mesReferenciaCarneLeao').value = '4';
    dom.querySelector('#mesReferenciaCarneLeao').dispatchEvent({ type: 'change' });
    assert.equal(dom.querySelector('#excedenteLivroCaixaMesAnteriorCarneLeao').disabled, false);
    assert.equal(dom.querySelector('#avisoJaneiroSemExcedenteCarneLeao').hidden, true);

    // Submete vazio -> exibe erro
    dom.querySelector('#rendimentosExteriorCarneLeao').value = '';
    dom.querySelector('#formCarneLeaoAutonomo').dispatchEvent({
      type: 'submit',
      preventDefault() {}
    });
    assert.equal(dom.querySelector('#erroCarneLeaoAutonomo').hidden, false);
    assert.equal(dom.querySelector('#resultadoCarneLeaoAutonomo').hidden, true);

    // Preenche caso válido (R$ 6.000,00 PF em abril/2026 com Livro-Caixa e PJ) e submete
    dom.querySelector('#mesReferenciaCarneLeao').value = '4';
    dom.querySelector('#rendimentosPFCarneLeao').value = '6.000,00';
    dom.querySelector('#rendimentosExteriorCarneLeao').value = '0';
    dom.querySelector('#rendimentosPJCarneLeao').value = '1.500,00';
    dom.querySelector('#despesasLivroCaixaCarneLeao').value = '1.000,00';
    dom.querySelector('#excedenteLivroCaixaMesAnteriorCarneLeao').value = '200,00';
    dom.querySelector('#formCarneLeaoAutonomo').dispatchEvent({
      type: 'submit',
      preventDefault() {}
    });

    assert.equal(dom.querySelector('#erroCarneLeaoAutonomo').hidden, true);
    assert.equal(dom.querySelector('#resultadoCarneLeaoAutonomo').hidden, false);
    assert.equal(dom.querySelector('#resCompetenciaCarneLeao').textContent, 'Abril/2026');
    assert.equal(dom.querySelector('#resValorCarneLeaoDevido').textContent, formatCurrency(231.52));
    assert.equal(dom.querySelector('#blocoAvisoRendimentosPJCarneLeao').hidden, false);
    assert.equal(dom.querySelector('#blocoExcedenteAnteriorCarneLeao').hidden, false);
    assert.equal(dom.querySelector('#resExcedenteAnteriorCarneLeao').textContent, formatCurrency(200.0));
    assert.equal(dom.querySelector('#resLimiteDeducaoLivroCaixaCarneLeao').textContent, formatCurrency(7500.0));
    assert.equal(dom.querySelector('#btnCopiarCarneLeao').hidden, false);
    assert.equal(dom.querySelector('#btnCompartilharCarneLeao').hidden, false);
    assert.equal(dom.querySelector('#btnImprimirCarneLeao').hidden, false);

    // Copiar resultado
    await instance.actions.copy();
    assert.match(copiedText, /Calculadora Carnê-Leão para Autônomos/i);
    assert.match(copiedText, /231,52/);

    // Compartilhar resultado
    await dom.querySelector('#btnCompartilharCarneLeao').dispatchEvent({ type: 'click' });
    // aguarda microtask
    await new Promise((r) => setTimeout(r, 10));
    assert.ok(sharedPayload);
    assert.equal(
      sharedPayload.url,
      'https://www.calculadoramaster.com/tools/financas/carne-leao-autonomo.html'
    );

    // Imprimir resultado
    dom.querySelector('#btnImprimirCarneLeao').click();
    assert.equal(printCalled, true);

    // Limpar formulário e recalcular com novo valor
    dom.querySelector('#btnLimparCarneLeao').click();
    assert.equal(dom.querySelector('#resultadoCarneLeaoAutonomo').hidden, true);
    assert.equal(dom.querySelector('#rendimentosPFCarneLeao').value, '');
    assert.equal(dom.querySelector('#btnCopiarCarneLeao').hidden, true);

    dom.querySelector('#rendimentosPFCarneLeao').value = '4800,00';
    dom.querySelector('#formCarneLeaoAutonomo').dispatchEvent({
      type: 'submit',
      preventDefault() {}
    });
    assert.equal(dom.querySelector('#resultadoCarneLeaoAutonomo').hidden, false);
    assert.equal(dom.querySelector('#resValorCarneLeaoDevido').textContent, formatCurrency(0));

    // Integração com Favoritos
    _resetMemoryForTesting();
    assert.equal(VALID_TOOL_IDS.has('carne-leao-autonomo'), true);
    assert.equal(isFavorite('carne-leao-autonomo'), false);
    addFavorite('carne-leao-autonomo');
    assert.equal(isFavorite('carne-leao-autonomo'), true);
    removeFavorite('carne-leao-autonomo');
    assert.equal(isFavorite('carne-leao-autonomo'), false);
    _resetMemoryForTesting();
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

test('Arquivo de página HTML e entrada no catálogo seguem as convenções de acessibilidade e SEO', () => {
  const pagePath = path.join(ROOT, 'src/pages/tools/financas/carne-leao-autonomo.page.html');
  assert.equal(fs.existsSync(pagePath), true);
  const html = fs.readFileSync(pagePath, 'utf8');

  assert.match(html, /layout:\s*tool/);
  assert.match(html, /canonical:\s*https:\/\/www\.calculadoramaster\.com\/tools\/financas\/carne-leao-autonomo\.html/);
  assert.match(html, /<h1>Calculadora Carnê-Leão para Autônomos<\/h1>/);
  assert.equal(html.includes('<br'), false, 'Não deve utilizar <br>');
  assert.equal(/\bstyle\s*=/i.test(html), false, 'Não deve utilizar style inline');
  assert.match(html, /id="erroCarneLeaoAutonomo"[^>]*role="alert"/);
  assert.match(html, /id="resultadoCarneLeaoAutonomo"[^>]*aria-live="polite"/);
});
