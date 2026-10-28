import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  ANO_REFERENCIA,
  DATA_CONSULTA_OFICIAL,
  SALARIO_MINIMO,
  TETO_PREVIDENCIARIO,
  ALIQUOTAS,
  CODIGOS_PAGAMENTO,
  FONTES_OFICIAIS,
  MODALIDADES,
  ROTULOS_MODALIDADE,
  roundCurrency,
  roundDecimal,
  parseFlexibleNumber,
  formatCurrency,
  formatPercent,
  normalizeInput,
  validateInput,
  calculate,
  calculateInss,
  getResultSections,
  formatResult,
  buildCopyText,
  setupTool
} from '../js/tools/inss-contribuinte-individual.js';

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

  const form = register('formInssContribuinteIndividual', 'form');
  form.reset = () => {};

  register('modalidadeInssCI', 'select', { value: 'plano_normal' });
  register('grupoSalarioContribuicaoCI', 'div', { hidden: false });
  register('salarioContribuicaoCI', 'input', { value: '1621,00' });
  register('grupoRemuneracaoPJCI', 'div', { hidden: true });
  register('remuneracaoPJCI', 'input', { value: '' });
  register('blocoInfoPlanoSimplificadoCI', 'div', { hidden: true });

  register('btnCalcularInssCI', 'button');
  register('btnLimparInssCI', 'button');

  register('erroInssContribuinteIndividual', 'p', { hidden: true });
  register('resultadoInssContribuinteIndividual', 'section', { hidden: true });
  register('statusInssContribuinteIndividual', 'p', { textContent: '' });

  register('resModalidadeCI', 'strong');
  register('resBaseCalculoCI', 'strong');
  register('resAliquotaCI', 'strong');
  register('resValorContribuicaoCI', 'strong');
  register('resFormaRecolhimentoCI', 'strong');
  register('resCodigoGPSCI', 'strong');
  register('resVencimentoCI', 'strong');
  register('blocoAlertaLimiteCI', 'div', { hidden: true });
  register('resAlertaLimiteCI', 'p');
  register('resElegibilidadeCI', 'span');
  register('resDireitosCI', 'span');
  register('resRestricoesCI', 'span');
  register('listaMemoriaCalculoCI', 'ul');

  register('btnCopiarInssCI', 'button', { hidden: true });
  register('btnCompartilharInssCI', 'button', { hidden: true });
  register('btnImprimirInssCI', 'button', { hidden: true });

  const favoriteButton = createElementStub('button', 'btnFavoritarInssCI');
  favoriteButton.dataset.favoriteButton = '';
  favoriteButton.dataset.toolId = 'inss-contribuinte-individual';
  const favoriteLabel = createElementStub('span', 'labelFavoritarInssCI');
  favoriteLabel.dataset.favoriteLabel = '';
  const favoriteStatus = createElementStub('p', 'statusFavoritoInssCI');
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

// ---------------------------------------------------------------------------
// 1. Parâmetros e fontes oficiais de 2026
// ---------------------------------------------------------------------------
test('1. Parâmetros oficiais de 2026 e fontes previdenciárias do INSS / Planalto', () => {
  assert.equal(ANO_REFERENCIA, 2026);
  assert.equal(DATA_CONSULTA_OFICIAL, '2026-10-22');
  assert.equal(SALARIO_MINIMO, 1621.0);
  assert.equal(TETO_PREVIDENCIARIO, 8475.55);
  assert.equal(ALIQUOTAS.normal, 20.0);
  assert.equal(ALIQUOTAS.simplificado, 11.0);
  assert.equal(ALIQUOTAS.retencaoPJ, 11.0);
  assert.equal(ALIQUOTAS.meiOuBaixaRenda, 5.0);
  assert.equal(CODIGOS_PAGAMENTO.normalMensal, '1007');
  assert.equal(CODIGOS_PAGAMENTO.simplificadoMensal, '1163');
  assert.equal(CODIGOS_PAGAMENTO.darfComplementacao, '1872');
  assert.ok(Object.keys(FONTES_OFICIAIS).length >= 7);
});

// ---------------------------------------------------------------------------
// 2. Plano Simplificado (11% sobre o salário mínimo)
// ---------------------------------------------------------------------------
test('2. Plano Simplificado: R$ 1.621,00 × 11% = R$ 178,31', () => {
  // Cálculo independente da implementação:
  // Salário Mínimo 2026: R$ 1.621,00
  // Alíquota: 11%
  // Contribuição: 1621,00 * 0,11 = 178,31
  const res = calculate({
    anoReferencia: 2026,
    modalidade: 'plano_simplificado'
  });
  assert.equal(res.ok, true);
  assert.equal(res.data.baseCalculoConsiderada, 1621.0);
  assert.equal(res.data.aliquotaAplicada, 11.0);
  assert.equal(res.data.valorContribuicao, 178.31);
  assert.equal(res.data.codigoPagamentoGPS, '1163');
  assert.equal(res.data.responsabilidadeRecolhimento, 'proprio_segurado');
  assert.match(res.data.formaRecolhimentoRotulo, /GPS/i);
});

// ---------------------------------------------------------------------------
// 3. Plano Normal no piso (20% sobre R$ 1.621,00)
// ---------------------------------------------------------------------------
test('3. Plano Normal no mínimo: R$ 1.621,00 × 20% = R$ 324,20', () => {
  // Cálculo independente:
  // Base = R$ 1.621,00
  // Alíquota = 20%
  // Contribuição = 1621,00 * 0,20 = 324,20
  const res = calculate({
    anoReferencia: 2026,
    modalidade: 'plano_normal',
    salarioContribuicao: '1621,00'
  });
  assert.equal(res.ok, true);
  assert.equal(res.data.baseCalculoConsiderada, 1621.0);
  assert.equal(res.data.aliquotaAplicada, 20.0);
  assert.equal(res.data.valorContribuicao, 324.2);
  assert.equal(res.data.codigoPagamentoGPS, '1007');
  assert.equal(res.data.alertaBaseAbaixoMinimo, false);
  assert.equal(res.data.alertaBaseAcimaTeto, false);
});

// ---------------------------------------------------------------------------
// 4. Plano Normal no teto (20% sobre R$ 8.475,55)
// ---------------------------------------------------------------------------
test('4. Plano Normal no teto: R$ 8.475,55 × 20% = R$ 1.695,11', () => {
  // Cálculo independente:
  // Base = R$ 8.475,55
  // Alíquota = 20%
  // Contribuição = 8475,55 * 0,20 = 1695,11
  const res = calculate({
    anoReferencia: 2026,
    modalidade: 'plano_normal',
    salarioContribuicao: '8475,55'
  });
  assert.equal(res.ok, true);
  assert.equal(res.data.baseCalculoConsiderada, 8475.55);
  assert.equal(res.data.aliquotaAplicada, 20.0);
  assert.equal(res.data.valorContribuicao, 1695.11);
  assert.equal(res.data.codigoPagamentoGPS, '1007');
  assert.equal(res.data.alertaBaseAcimaTeto, false);
});

// ---------------------------------------------------------------------------
// 5. Valores intermediários e arredondamento monetário
// ---------------------------------------------------------------------------
test('5. Valores intermediários e precisão de arredondamento monetário', () => {
  // Caso 5a: R$ 3.000,00 no Plano Normal -> 3000 * 0,20 = R$ 600,00
  const c1 = calculate({
    anoReferencia: 2026,
    modalidade: 'plano_normal',
    salarioContribuicao: '3000,00'
  });
  assert.equal(c1.ok, true);
  assert.equal(c1.data.valorContribuicao, 600.0);

  // Caso 5b: R$ 4.850,25 no Plano Normal -> 4850,25 * 0,20 = 970,05
  const c2 = calculate({
    anoReferencia: 2026,
    modalidade: 'plano_normal',
    salarioContribuicao: '4850,25'
  });
  assert.equal(c2.ok, true);
  assert.equal(c2.data.valorContribuicao, 970.05);

  // Caso 5c: R$ 5.333,33 no Plano Normal -> 5333,33 * 0,20 = 1066,666 -> R$ 1.066,67
  const c3 = calculate({
    anoReferencia: 2026,
    modalidade: 'plano_normal',
    salarioContribuicao: '5333,33'
  });
  assert.equal(c3.ok, true);
  assert.equal(c3.data.valorContribuicao, 1066.67);

  // Caso 5d: Prestação a PJ com valor intermediário R$ 4.500,00 -> 4500 * 0,11 = R$ 495,00
  const c4 = calculate({
    anoReferencia: 2026,
    modalidade: 'prestador_pj',
    remuneracaoPJ: '4500,00'
  });
  assert.equal(c4.ok, true);
  assert.equal(c4.data.valorContribuicao, 495.0);
});

// ---------------------------------------------------------------------------
// 6. Base abaixo do salário mínimo (ajuste no Normal / complementação no PJ)
// ---------------------------------------------------------------------------
test('6. Base abaixo do mínimo: ajuste no Plano Normal e alerta de complementação no PJ', () => {
  // 6a: Plano Normal com R$ 1.000,00 (< R$ 1.621,00)
  // Ajusta base para R$ 1.621,00, gerando contribuição de R$ 324,20 com alerta
  const resNormal = calculate({
    anoReferencia: 2026,
    modalidade: 'plano_normal',
    salarioContribuicao: '1000,00'
  });
  assert.equal(resNormal.ok, true);
  assert.equal(resNormal.data.baseCalculoInformada, 1000.0);
  assert.equal(resNormal.data.baseCalculoConsiderada, 1621.0);
  assert.equal(resNormal.data.valorContribuicao, 324.2);
  assert.equal(resNormal.data.alertaBaseAbaixoMinimo, true);
  assert.match(resNormal.data.mensagemAlertaLimite, /inferior ao salário mínimo de 2026/i);

  // 6b: Prestador PJ com remuneração de R$ 900,00 (< R$ 1.621,00)
  // Empresa desconta 11% sobre o valor real (R$ 99,00), mas há alerta de complementação
  const resPJ = calculate({
    anoReferencia: 2026,
    modalidade: 'prestador_pj',
    remuneracaoPJ: '900,00'
  });
  assert.equal(resPJ.ok, true);
  assert.equal(resPJ.data.baseCalculoInformada, 900.0);
  assert.equal(resPJ.data.baseCalculoConsiderada, 900.0);
  assert.equal(resPJ.data.valorContribuicao, 99.0);
  assert.equal(resPJ.data.alertaBaseAbaixoMinimo, true);
  assert.ok(resPJ.data.orientacaoComplementacao);
  assert.equal(resPJ.data.orientacaoComplementacao.exigeComplementacao, true);
  assert.equal(resPJ.data.orientacaoComplementacao.diferencaBaseParaMinimo, 721.0);
  assert.match(resPJ.data.mensagemAlertaLimite, /NÃO será computada para tempo de contribuição/i);
});

// ---------------------------------------------------------------------------
// 7. Base acima do teto do RGPS (limitação ao teto legal)
// ---------------------------------------------------------------------------
test('7. Base acima do teto: limitação a R$ 8.475,55 no Normal e na Retenção de PJ', () => {
  // 7a: Plano Normal com R$ 12.000,00
  // Base limitada a R$ 8.475,55 -> 20% = R$ 1.695,11
  const resNormal = calculate({
    anoReferencia: 2026,
    modalidade: 'plano_normal',
    salarioContribuicao: '12000,00'
  });
  assert.equal(resNormal.ok, true);
  assert.equal(resNormal.data.baseCalculoInformada, 12000.0);
  assert.equal(resNormal.data.baseCalculoConsiderada, 8475.55);
  assert.equal(resNormal.data.valorContribuicao, 1695.11);
  assert.equal(resNormal.data.alertaBaseAcimaTeto, true);
  assert.match(resNormal.data.mensagemAlertaLimite, /excede o teto previdenciário de 2026/i);

  // 7b: Prestador PJ com remuneração de R$ 15.000,00
  // Retenção limitada a 11% de R$ 8.475,55 = R$ 932,31
  const resPJ = calculate({
    anoReferencia: 2026,
    modalidade: 'prestador_pj',
    remuneracaoPJ: '15000,00'
  });
  assert.equal(resPJ.ok, true);
  assert.equal(resPJ.data.baseCalculoInformada, 15000.0);
  assert.equal(resPJ.data.baseCalculoConsiderada, 8475.55);
  assert.equal(resPJ.data.valorContribuicao, 932.31);
  assert.equal(resPJ.data.alertaBaseAcimaTeto, true);
  assert.match(resPJ.data.mensagemAlertaLimite, /retenção da empresa tomadora é limitada a 11% do teto legal/i);
});

// ---------------------------------------------------------------------------
// 8. Mudança entre planos, sem reutilizar resultados antigos
// ---------------------------------------------------------------------------
test('8. Mudança dinâmica entre planos não reutiliza valores da modalidade anterior', () => {
  // 1º cálculo: Plano Normal com R$ 5.000,00 -> 20% = R$ 1.000,00
  const r1 = calculate({
    anoReferencia: 2026,
    modalidade: 'plano_normal',
    salarioContribuicao: '5000,00'
  });
  assert.equal(r1.data.valorContribuicao, 1000.0);
  assert.equal(r1.data.codigoPagamentoGPS, '1007');

  // 2º cálculo: Mudança para Plano Simplificado -> Deve usar R$ 1.621,00 e R$ 178,31
  const r2 = calculate({
    anoReferencia: 2026,
    modalidade: 'plano_simplificado'
  });
  assert.equal(r2.data.valorContribuicao, 178.31);
  assert.equal(r2.data.baseCalculoConsiderada, 1621.0);
  assert.equal(r2.data.codigoPagamentoGPS, '1163');

  // 3º cálculo: Mudança para Prestador PJ com R$ 6.000,00 -> 11% = R$ 660,00 (sem GPS)
  const r3 = calculate({
    anoReferencia: 2026,
    modalidade: 'prestador_pj',
    remuneracaoPJ: '6000,00'
  });
  assert.equal(r3.data.valorContribuicao, 660.0);
  assert.equal(r3.data.codigoPagamentoGPS, null);
  assert.equal(r3.data.responsabilidadeRecolhimento, 'empresa_contratante');
});

// ---------------------------------------------------------------------------
// 9. Elegibilidade e restrições do Plano Simplificado
// ---------------------------------------------------------------------------
test('9. Elegibilidade e restrições legais do Plano Simplificado', () => {
  const res = calculate({
    anoReferencia: 2026,
    modalidade: 'plano_simplificado'
  });
  assert.match(res.data.elegibilidade, /NÃO presta serviços a pessoas jurídicas/i);
  assert.match(res.data.restricoesPrevidenciarias, /NÃO contempla Aposentadoria por Tempo de Contribuição/i);
  // Não declara limite universal de um salário mínimo para todos os benefícios
  assert.doesNotMatch(res.data.restricoesPrevidenciarias, /nunca excederá 1 salário mínimo/i);
  assert.doesNotMatch(res.data.restricoesPrevidenciarias, /qualquer benefício.*limitado a 1 salário mínimo/i);
  // Explicação precisa sobre regras previdenciárias e histórico contributivo
  assert.match(res.data.direitosPrevidenciarios, /histórico contributivo do segurado/i);
  assert.match(res.data.restricoesPrevidenciarias, /complementar a contribuição com mais 9%/i);
});

// ---------------------------------------------------------------------------
// 10. Separação entre Plano Simplificado e Retenção por PJ
// ---------------------------------------------------------------------------
test('10. Distinção clara entre Plano Simplificado e Retenção Previdenciária por PJ com ressalva para TAC', () => {
  const simp = calculate({ anoReferencia: 2026, modalidade: 'plano_simplificado' });
  const pj = calculate({ anoReferencia: 2026, modalidade: 'prestador_pj', remuneracaoPJ: '3000,00' });

  // Simplificado: recolhido pelo próprio autônomo, GPS 1163, base fixa no piso
  assert.equal(simp.data.responsabilidadeRecolhimento, 'proprio_segurado');
  assert.equal(simp.data.codigoPagamentoGPS, '1163');
  assert.equal(simp.data.baseCalculoConsiderada, 1621.0);

  // PJ: regra geral recolhido pela empresa, sem GPS para o autônomo, base conforme remuneração
  assert.equal(pj.data.responsabilidadeRecolhimento, 'empresa_contratante');
  assert.equal(pj.data.codigoPagamentoGPS, null);
  assert.equal(pj.data.baseCalculoConsiderada, 3000.0);
  assert.match(pj.data.formaRecolhimentoRotulo, /DCTFWeb/i);
  assert.match(pj.data.formaRecolhimentoRotulo, /TAC optante pelo recolhimento direto/i);
  assert.match(pj.data.restricoesPrevidenciarias, /não se confundindo com o Plano Simplificado/i);

  // Ressalva expressa para Transportador Autônomo de Cargas (TAC) - Lei nº 15.485/2026 / Art. 4º-A Lei 10.666/2003
  assert.match(pj.data.restricoesPrevidenciarias, /Transportador Autônomo de Cargas/i);
  assert.match(pj.data.restricoesPrevidenciarias, /TAC/);
  assert.match(pj.data.restricoesPrevidenciarias, /Lei nº 15\.485\/2026/);
  assert.match(pj.data.restricoesPrevidenciarias, /art\. 4º-A/i);
  const memoriaTexto = pj.data.memoriaCalculo.join('\n');
  assert.match(memoriaTexto, /Exceção do Transportador Autônomo de Cargas \(TAC\)/i);
  assert.match(memoriaTexto, /Lei nº 15\.485\/2026/);
  assert.match(memoriaTexto, /esse regime especial não é calculado nesta ferramenta/i);
});

// ---------------------------------------------------------------------------
// 11. Entradas inválidas, valores negativos e ano incorreto
// ---------------------------------------------------------------------------
test('11. Validação de entradas inválidas, negativas, vazias e ano diferente de 2026', () => {
  // Ano incorreto
  const anoInvalido = calculate({
    anoReferencia: 2025,
    modalidade: 'plano_normal',
    salarioContribuicao: '3000'
  });
  assert.equal(anoInvalido.ok, false);
  assert.match(anoInvalido.error, /atende exclusivamente a competência de 2026/i);

  // Modalidade inválida
  const modInvalida = calculate({
    anoReferencia: 2026,
    modalidade: 'plano_inexistente'
  });
  assert.equal(modInvalida.ok, false);
  assert.match(modInvalida.error, /Selecione uma modalidade de contribuição válida/i);

  // Salário vazio no Plano Normal
  const normalVazio = calculate({
    anoReferencia: 2026,
    modalidade: 'plano_normal',
    salarioContribuicao: ''
  });
  assert.equal(normalVazio.ok, false);
  assert.match(normalVazio.error, /Informe o salário de contribuição mensal/i);

  // Salário negativo no Plano Normal
  const normalNegativo = calculate({
    anoReferencia: 2026,
    modalidade: 'plano_normal',
    salarioContribuicao: '-500'
  });
  assert.equal(normalNegativo.ok, false);
  assert.match(normalNegativo.error, /não pode ser negativo/i);

  // Remuneração PJ vazia no Prestador PJ
  const pjVazio = calculate({
    anoReferencia: 2026,
    modalidade: 'prestador_pj',
    remuneracaoPJ: ''
  });
  assert.equal(pjVazio.ok, false);
  assert.match(pjVazio.error, /Informe a remuneração bruta recebida de Pessoa Jurídica/i);

  // Remuneração PJ negativa
  const pjNegativo = calculate({
    anoReferencia: 2026,
    modalidade: 'prestador_pj',
    remuneracaoPJ: '-2000'
  });
  assert.equal(pjNegativo.ok, false);
  assert.match(pjNegativo.error, /não pode ser negativa/i);

  // Strings monetárias formatadas em pt-BR
  assert.equal(parseFlexibleNumber('R$ 8.475,55'), 8475.55);
  assert.equal(parseFlexibleNumber('1.621,00'), 1621.0);
  assert.equal(parseFlexibleNumber('abc'), Number.NaN);
});

// ---------------------------------------------------------------------------
// 12. DOM: calcular, limpar formulário, alternar modalidade, copiar, compartilhar e imprimir
// ---------------------------------------------------------------------------
test('12. DOM: alternância de campos, cálculo, limpar formulário, copiar, compartilhar e imprimir', async () => {
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

    // Inicialmente no Plano Normal: grupo de salário visível, outros ocultos
    assert.equal(dom.querySelector('#grupoSalarioContribuicaoCI').hidden, false);
    assert.equal(dom.querySelector('#grupoRemuneracaoPJCI').hidden, true);
    assert.equal(dom.querySelector('#blocoInfoPlanoSimplificadoCI').hidden, true);

    // Alterna para Plano Simplificado: grupo de salário oculta, bloco de info simplificado exibe
    dom.querySelector('#modalidadeInssCI').value = 'plano_simplificado';
    dom.querySelector('#modalidadeInssCI').dispatchEvent({ type: 'change' });
    assert.equal(dom.querySelector('#grupoSalarioContribuicaoCI').hidden, true);
    assert.equal(dom.querySelector('#grupoRemuneracaoPJCI').hidden, true);
    assert.equal(dom.querySelector('#blocoInfoPlanoSimplificadoCI').hidden, false);

    // Submete cálculo do Plano Simplificado
    dom.querySelector('#formInssContribuinteIndividual').dispatchEvent({
      type: 'submit',
      preventDefault() {}
    });
    assert.equal(dom.querySelector('#erroInssContribuinteIndividual').hidden, true);
    assert.equal(dom.querySelector('#resultadoInssContribuinteIndividual').hidden, false);
    assert.equal(dom.querySelector('#resValorContribuicaoCI').textContent, formatCurrency(178.31));
    assert.equal(dom.querySelector('#resCodigoGPSCI').textContent, '1163');
    assert.equal(dom.querySelector('#btnCopiarInssCI').hidden, false);
    assert.equal(dom.querySelector('#btnCompartilharInssCI').hidden, false);
    assert.equal(dom.querySelector('#btnImprimirInssCI').hidden, false);

    // Copiar resultado
    await instance.actions.copy();
    assert.match(copiedText, /Calculadora INSS do Contribuinte Individual/i);
    assert.match(copiedText, /178,31/);

    // Compartilhar resultado
    await dom.querySelector('#btnCompartilharInssCI').dispatchEvent({ type: 'click' });
    await new Promise((r) => setTimeout(r, 10));
    assert.ok(sharedPayload);
    assert.equal(
      sharedPayload.url,
      'https://www.calculadoramaster.com/tools/financas/inss-contribuinte-individual.html'
    );

    // Imprimir resultado
    dom.querySelector('#btnImprimirInssCI').click();
    assert.equal(printCalled, true);

    // Alterna para Prestador PJ
    dom.querySelector('#modalidadeInssCI').value = 'prestador_pj';
    dom.querySelector('#modalidadeInssCI').dispatchEvent({ type: 'change' });
    assert.equal(dom.querySelector('#grupoSalarioContribuicaoCI').hidden, true);
    assert.equal(dom.querySelector('#grupoRemuneracaoPJCI').hidden, false);
    assert.equal(dom.querySelector('#blocoInfoPlanoSimplificadoCI').hidden, true);

    // Submete vazio -> exibe erro
    dom.querySelector('#remuneracaoPJCI').value = '';
    dom.querySelector('#formInssContribuinteIndividual').dispatchEvent({
      type: 'submit',
      preventDefault() {}
    });
    assert.equal(dom.querySelector('#erroInssContribuinteIndividual').hidden, false);
    assert.equal(dom.querySelector('#resultadoInssContribuinteIndividual').hidden, true);

    // Preenche remuneração de R$ 5.000,00 e submete
    dom.querySelector('#remuneracaoPJCI').value = '5000,00';
    dom.querySelector('#formInssContribuinteIndividual').dispatchEvent({
      type: 'submit',
      preventDefault() {}
    });
    assert.equal(dom.querySelector('#erroInssContribuinteIndividual').hidden, true);
    assert.equal(dom.querySelector('#resultadoInssContribuinteIndividual').hidden, false);
    assert.equal(dom.querySelector('#resValorContribuicaoCI').textContent, formatCurrency(550.0));
    assert.match(dom.querySelector('#resFormaRecolhimentoCI').textContent, /DCTFWeb/i);

    // Limpar formulário
    dom.querySelector('#btnLimparInssCI').click();
    assert.equal(dom.querySelector('#resultadoInssContribuinteIndividual').hidden, true);
    assert.equal(dom.querySelector('#modalidadeInssCI').value, 'plano_normal');
    assert.equal(dom.querySelector('#btnCopiarInssCI').hidden, true);
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
// 13. Arquivo de página HTML, acessibilidade e SEO
// ---------------------------------------------------------------------------
test('13. Arquivo HTML e conformidade com acessibilidade, layout e convenções', () => {
  const pagePath = path.join(ROOT, 'src/pages/tools/financas/inss-contribuinte-individual.page.html');
  assert.equal(fs.existsSync(pagePath), true);
  const html = fs.readFileSync(pagePath, 'utf8');

  assert.match(html, /layout:\s*tool/);
  assert.match(html, /canonical:\s*https:\/\/www\.calculadoramaster\.com\/tools\/financas\/inss-contribuinte-individual\.html/);
  assert.match(html, /<h1>Calculadora INSS do Contribuinte Individual<\/h1>/);
  assert.equal(html.includes('<br'), false, 'Não deve utilizar <br>');
  assert.equal(/\bstyle\s*=/i.test(html), false, 'Não deve utilizar style inline');
  assert.match(html, /id="erroInssContribuinteIndividual"[^>]*role="alert"/);
  assert.match(html, /id="resultadoInssContribuinteIndividual"[^>]*aria-live="polite"/);

  // Verificações direcionadas da revisão:
  // 1. Não afirma limite universal de um salário mínimo para todos os benefícios
  assert.doesNotMatch(html, /limita qualquer benefício ao valor de 1 salário mínimo/i);
  assert.doesNotMatch(html, /nunca excederá 1 salário mínimo/i);
  assert.match(html, /histórico contributivo/i);

  // 2. Ressalva para Transportador Autônomo de Cargas (TAC) - Lei 15.485/2026
  assert.match(html, /Transportador Autônomo de Cargas \(TAC\)/i);
  assert.match(html, /Lei nº 15\.485\/2026/);
  assert.match(html, /art\. 4º-A.*Lei nº 10\.666\/2003/i);
  assert.match(html, /não se aplica ao Transportador Autônomo de Cargas \(TAC\) com opção válida de recolhimento direto/i);
});
