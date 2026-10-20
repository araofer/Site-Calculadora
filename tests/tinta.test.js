/**
 * Testes Automatizados - Calculadora de Tinta
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  DEFAULTS,
  LIMITS,
  parseFlexibleNumber,
  normalizeInput,
  validateInput,
  calculate,
  formatResult,
  buildCopyText,
  setupTool
} from '../js/tools/tinta.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');
const PAGE_PATH = path.join(ROOT_DIR, 'src', 'pages', 'tools', 'utilidades', 'tinta.page.html');

function createElement(initial = {}) {
  const listeners = new Map();
  const attributes = new Map();
  return {
    value: '',
    textContent: '',
    hidden: false,
    ...initial,
    getAttribute(name) {
      return attributes.get(name) ?? null;
    },
    setAttribute(name, val) {
      attributes.set(name, String(val));
    },
    addEventListener(type, handler) {
      listeners.set(type, handler);
    },
    async trigger(type, event = {}) {
      const handler = listeners.get(type);
      if (handler) {
        return await handler({
          preventDefault() {},
          ...event
        });
      }
      return undefined;
    }
  };
}

function createFakeDom() {
  const elements = {
    '#areaParedes': createElement({ value: '80' }),
    '#areaTeto': createElement({ value: '20' }),
    '#areaAberturas': createElement({ value: '10' }),
    '#demaos': createElement({ value: '2' }),
    '#rendimento': createElement({ value: '10' }),
    '#margem': createElement({ value: '10' }),
    '#tamanhoEmbalagem': createElement({ value: '3,6' }),
    '#btnLimparTinta': createElement(),
    '#erroTinta': createElement({ hidden: true }),
    '#resultadoTinta': createElement({ hidden: true }),
    '#statusTinta': createElement(),
    '#resAreaBruta': createElement(),
    '#resAreaLiquida': createElement(),
    '#resAreaTotalDemaos': createElement(),
    '#resLitrosSemMargem': createElement(),
    '#resMargemAplicada': createElement(),
    '#resLitrosNecessarios': createElement(),
    '#blocoResultadoEmbalagem': createElement({ hidden: true }),
    '#resQuantidadeEmbalagens': createElement(),
    '#resVolumeComprado': createElement(),
    '#resSobraEstimada': createElement(),
    '#btnCopiarTinta': createElement({ hidden: true }),
    '#btnCompartilharTinta': createElement({ hidden: true }),
    '#btnImprimirTinta': createElement({ hidden: true })
  };

  const form = createElement({
    reset() {
      elements['#areaParedes'].value = '';
      elements['#areaTeto'].value = '';
      elements['#areaAberturas'].value = '';
      elements['#demaos'].value = '2';
      elements['#rendimento'].value = '';
      elements['#margem'].value = '10';
      elements['#tamanhoEmbalagem'].value = '';
    }
  });
  elements['#formTinta'] = form;

  return {
    elements,
    root: {
      querySelector(selector) {
        return elements[selector] || null;
      }
    }
  };
}

describe('Ferramenta: Calculadora de Tinta (tinta)', () => {
  it('deve exportar as funções contratuais e utilitárias do módulo JS', () => {
    assert.equal(typeof parseFlexibleNumber, 'function');
    assert.equal(typeof normalizeInput, 'function');
    assert.equal(typeof validateInput, 'function');
    assert.equal(typeof calculate, 'function');
    assert.equal(typeof formatResult, 'function');
    assert.equal(typeof buildCopyText, 'function');
    assert.equal(typeof setupTool, 'function');
    assert.equal(DEFAULTS.demaos, 2);
    assert.equal(DEFAULTS.margem, 10);
    assert.ok(LIMITS.maxArea >= 10000);
  });

  it('deve reproduzir exatamente o caso de referência (80 m² paredes, 20 m² teto, 10 m² aberturas, 2 demãos, 10 m²/L, 10% margem, 3,6 L)', () => {
    const result = calculate({
      areaParedes: '80',
      areaTeto: '20',
      areaAberturas: '10',
      demaos: '2',
      rendimento: '10',
      margem: '10',
      tamanhoEmbalagem: '3,6'
    });

    assert.equal(result.ok, true);
    assert.equal(result.data.areaBruta, 100);
    assert.equal(result.data.areaLiquida, 90);
    assert.equal(result.data.areaTotalDemaos, 180);
    assert.equal(result.data.litrosSemMargem, 18);
    assert.equal(result.data.litrosMargem, 1.8);
    assert.equal(result.data.litrosNecessarios, 19.8);
    assert.equal(result.data.possuiEmbalagem, true);
    assert.equal(result.data.tamanhoEmbalagem, 3.6);
    assert.equal(result.data.quantidadeEmbalagens, 6);
    assert.equal(result.data.volumeTotalComprado, 21.6);
    assert.equal(result.data.sobraEstimada, 1.8);

    const formatted = formatResult(result);
    assert.equal(formatted.areaBruta, '100 m²');
    assert.equal(formatted.areaLiquida, '90 m²');
    assert.equal(formatted.areaTotalDemaos, '180 m²');
    assert.equal(formatted.litrosSemMargem, '18,00 L');
    assert.equal(formatted.litrosNecessarios, '19,80 L');
    assert.match(formatted.quantidadeEmbalagens, /6 embalagens de 3,6 L/);
    assert.equal(formatted.volumeTotalComprado, '21,60 L');
    assert.equal(formatted.sobraEstimada, '1,80 L');
    assert.match(buildCopyText(result), /Litros totais necessários: 19,80 L/);
  });

  it('deve calcular corretamente com uma e várias demãos, diferentes rendimentos e sem embalagem opcional', () => {
    const umaDemao = calculate({
      areaParedes: '50',
      areaTeto: '0',
      areaAberturas: '5',
      demaos: '1',
      rendimento: '15',
      margem: '0',
      tamanhoEmbalagem: ''
    });

    assert.equal(umaDemao.ok, true);
    assert.equal(umaDemao.data.areaBruta, 50);
    assert.equal(umaDemao.data.areaLiquida, 45);
    assert.equal(umaDemao.data.areaTotalDemaos, 45);
    assert.equal(umaDemao.data.litrosSemMargem, 3);
    assert.equal(umaDemao.data.litrosNecessarios, 3);
    assert.equal(umaDemao.data.possuiEmbalagem, false);
    assert.equal(umaDemao.data.quantidadeEmbalagens, null);

    const tresDemaos = calculate({
      areaParedes: '120',
      areaTeto: '30',
      areaAberturas: '15',
      demaos: '3',
      rendimento: '12,5',
      margem: '15',
      tamanhoEmbalagem: '18'
    });

    assert.equal(tresDemaos.ok, true);
    assert.equal(tresDemaos.data.areaBruta, 150);
    assert.equal(tresDemaos.data.areaLiquida, 135);
    assert.equal(tresDemaos.data.areaTotalDemaos, 405);
    assert.equal(tresDemaos.data.litrosSemMargem, 32.4);
    assert.equal(tresDemaos.data.litrosNecessarios, 37.26);
    assert.equal(tresDemaos.data.quantidadeEmbalagens, 3);
    assert.equal(tresDemaos.data.volumeTotalComprado, 54);
    assert.equal(tresDemaos.data.sobraEstimada, 16.74);
  });

  it('deve aceitar decimais com vírgula ou ponto, valores extremos válidos e evitar erro de precisão em embalagens', () => {
    // 36 m² * 3 demãos = 108 m² / 10 m²/L = 10,8 L; com margem 0% e galão 3,6 L -> exatos 3 galões
    const exato = calculate({
      areaParedes: '39,5',
      areaTeto: '0',
      areaAberturas: '3,5',
      demaos: '3',
      rendimento: '10',
      margem: '0',
      tamanhoEmbalagem: '3,6'
    });

    assert.equal(exato.ok, true);
    assert.equal(exato.data.areaLiquida, 36);
    assert.equal(exato.data.litrosNecessarios, 10.8);
    assert.equal(exato.data.quantidadeEmbalagens, 3);
    assert.equal(exato.data.volumeTotalComprado, 10.8);
    assert.equal(exato.data.sobraEstimada, 0);

    // Qualquer fração acima de 1 embalagem deve arredondar para cima
    const quaseUmaLata = calculate({
      areaParedes: '36,1',
      areaTeto: '0',
      areaAberturas: '0',
      demaos: '1',
      rendimento: '10',
      margem: '0',
      tamanhoEmbalagem: '3,6'
    });

    assert.equal(quaseUmaLata.ok, true);
    assert.equal(quaseUmaLata.data.litrosNecessarios, 3.61);
    assert.equal(quaseUmaLata.data.quantidadeEmbalagens, 2);

    // Pintura apenas de teto (paredes = 0, teto = 25 m², aberturas = 0)
    const apenasTeto = calculate({
      areaParedes: '0',
      areaTeto: '25',
      areaAberturas: '0',
      demaos: '2',
      rendimento: '10',
      margem: '10',
      tamanhoEmbalagem: '3,6'
    });

    assert.equal(apenasTeto.ok, true);
    assert.equal(apenasTeto.data.areaLiquida, 25);
    assert.equal(apenasTeto.data.litrosNecessarios, 5.5);
    assert.equal(apenasTeto.data.quantidadeEmbalagens, 2);
  });

  it('deve rejeitar entradas vazias, negativas, aberturas maiores que paredes e valores fora dos limites', () => {
    const vazio = calculate({});
    assert.equal(vazio.ok, false);
    assert.ok(vazio.errors.some((msg) => /área das paredes ou a área do teto/i.test(msg)));

    const paredeNegativa = calculate({
      areaParedes: '-10',
      areaTeto: '20',
      rendimento: '10'
    });
    assert.equal(paredeNegativa.ok, false);
    assert.ok(paredeNegativa.errors.some((msg) => /paredes não pode ser negativa/i.test(msg)));

    const tetoNegativo = calculate({
      areaParedes: '20',
      areaTeto: '-5',
      rendimento: '10'
    });
    assert.equal(tetoNegativo.ok, false);
    assert.ok(tetoNegativo.errors.some((msg) => /teto não pode ser negativa/i.test(msg)));

    const aberturaMaiorQueParede = calculate({
      areaParedes: '20',
      areaTeto: '15',
      areaAberturas: '25',
      rendimento: '10'
    });
    assert.equal(aberturaMaiorQueParede.ok, false);
    assert.ok(aberturaMaiorQueParede.errors.some((msg) => /aberturas não pode exceder a área das paredes/i.test(msg)));

    const areaLiquidaZero = calculate({
      areaParedes: '20',
      areaTeto: '0',
      areaAberturas: '20',
      rendimento: '10'
    });
    assert.equal(areaLiquidaZero.ok, false);
    assert.ok(areaLiquidaZero.errors.some((msg) => /área líquida a pintar deve ser maior que zero/i.test(msg)));

    const rendimentoZero = calculate({
      areaParedes: '40',
      rendimento: '0'
    });
    assert.equal(rendimentoZero.ok, false);
    assert.ok(rendimentoZero.errors.some((msg) => /rendimento da tinta deve ser maior que zero/i.test(msg)));

    const demaosInvalida = calculate({
      areaParedes: '40',
      demaos: '2,5',
      rendimento: '10'
    });
    assert.equal(demaosInvalida.ok, false);
    assert.ok(demaosInvalida.errors.some((msg) => /número inteiro/i.test(msg)));

    const margemExcessiva = calculate({
      areaParedes: '40',
      rendimento: '10',
      margem: '150'
    });
    assert.equal(margemExcessiva.ok, false);
    assert.ok(margemExcessiva.errors.some((msg) => /margem para perdas deve estar entre/i.test(msg)));

    const embalagemInvalida = calculate({
      areaParedes: '40',
      rendimento: '10',
      tamanhoEmbalagem: '0'
    });
    assert.equal(embalagemInvalida.ok, false);
    assert.ok(embalagemInvalida.errors.some((msg) => /tamanho da embalagem deve ser maior que zero/i.test(msg)));
  });

  it('deve atualizar a interface ao submeter e limpar o formulário via setupTool', async () => {
    const { root, elements } = createFakeDom();
    setupTool(root);

    await elements['#formTinta'].trigger('submit');
    assert.equal(elements['#erroTinta'].hidden, true);
    assert.equal(elements['#resultadoTinta'].hidden, false);
    assert.equal(elements['#resAreaLiquida'].textContent, '90 m²');
    assert.equal(elements['#resLitrosNecessarios'].textContent, '19,80 L');
    assert.equal(elements['#blocoResultadoEmbalagem'].hidden, false);
    assert.equal(elements['#btnCopiarTinta'].hidden, false);
    assert.equal(elements['#btnCompartilharTinta'].hidden, false);
    assert.equal(elements['#btnImprimirTinta'].hidden, false);

    await elements['#btnLimparTinta'].trigger('click');
    assert.equal(elements['#resultadoTinta'].hidden, true);
    assert.equal(elements['#btnCopiarTinta'].hidden, true);
    assert.equal(elements['#btnCompartilharTinta'].hidden, true);
    assert.equal(elements['#btnImprimirTinta'].hidden, true);
    assert.equal(elements['#demaos'].value, '2');
    assert.equal(elements['#margem'].value, '10');
  });

  it('deve executar as ações de copiar, compartilhar e imprimir com sucesso, falhas e fallbacks', async () => {
    const { root, elements } = createFakeDom();
    const originalWindow = globalThis.window;
    const originalNavigator = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
    let copiedText = null;
    let sharedPayload = null;
    let printCalls = 0;

    try {
      globalThis.window = {
        location: { origin: 'https://www.calculadoramaster.com', href: 'https://www.calculadoramaster.com/tools/utilidades/tinta.html' },
        print() {
          printCalls += 1;
        }
      };

      setupTool(root);
      await elements['#formTinta'].trigger('submit');

      // 1. Copiar - sucesso
      Object.defineProperty(globalThis, 'navigator', {
        configurable: true,
        value: {
          clipboard: {
            writeText: async (text) => {
              copiedText = text;
            }
          }
        }
      });
      await elements['#btnCopiarTinta'].trigger('click');
      assert.match(copiedText, /Calculadora de Tinta — Calculadora Master/);
      assert.match(copiedText, /Litros totais necessários: 19,80 L/);
      assert.equal(elements['#statusTinta'].textContent, 'Resultado copiado.');

      // 2. Copiar - falha da área de transferência (não deve informar sucesso)
      Object.defineProperty(globalThis, 'navigator', {
        configurable: true,
        value: {
          clipboard: {
            writeText: async () => {
              throw new Error('Clipboard denied');
            }
          }
        }
      });
      await elements['#btnCopiarTinta'].trigger('click');
      assert.equal(elements['#statusTinta'].textContent, 'Não foi possível copiar o resultado.');

      // 3. Compartilhar - sucesso nativo (sem dados pessoais/financeiros na URL)
      Object.defineProperty(globalThis, 'navigator', {
        configurable: true,
        value: {
          share: async (payload) => {
            sharedPayload = payload;
          }
        }
      });
      await elements['#btnCompartilharTinta'].trigger('click');
      assert.equal(sharedPayload.title, 'Calculadora de Tinta — Calculadora Master');
      assert.equal(sharedPayload.url, 'https://www.calculadoramaster.com/tools/utilidades/tinta.html');
      assert.doesNotMatch(sharedPayload.url, /\?|19,80|80|paredes/i);
      assert.match(sharedPayload.text, /Litros totais necessários: 19,80 L/);
      assert.equal(elements['#statusTinta'].textContent, 'Resultado compartilhado.');

      // 4. Compartilhar - cancelamento pelo usuário (AbortError)
      Object.defineProperty(globalThis, 'navigator', {
        configurable: true,
        value: {
          share: async () => {
            const abortErr = new Error('User cancelled');
            abortErr.name = 'AbortError';
            throw abortErr;
          }
        }
      });
      await elements['#btnCompartilharTinta'].trigger('click');
      assert.equal(elements['#statusTinta'].textContent, 'Compartilhamento cancelado.');

      // 5. Compartilhar - fallback para área de transferência quando Web Share não está disponível
      copiedText = null;
      Object.defineProperty(globalThis, 'navigator', {
        configurable: true,
        value: {
          clipboard: {
            writeText: async (text) => {
              copiedText = text;
            }
          }
        }
      });
      await elements['#btnCompartilharTinta'].trigger('click');
      assert.match(copiedText, /Litros totais necessários: 19,80 L/);
      assert.equal(
        elements['#statusTinta'].textContent,
        'Compartilhamento indisponível. Resultado copiado.'
      );

      // 6. Imprimir - sucesso
      await elements['#btnImprimirTinta'].trigger('click');
      assert.equal(printCalls, 1);
    } finally {
      if (originalWindow === undefined) delete globalThis.window;
      else globalThis.window = originalWindow;
      if (originalNavigator) Object.defineProperty(globalThis, 'navigator', originalNavigator);
      else delete globalThis.navigator;
    }
  });

  it('deve possuir estrutura HTML acessível, classes visuais padronizadas e sem estilos inline', () => {
    const html = fs.readFileSync(PAGE_PATH, 'utf8');
    assert.match(html, /id="formTinta"/);
    assert.match(html, /id="areaParedes"/);
    assert.match(html, /id="areaTeto"/);
    assert.match(html, /id="areaAberturas"/);
    assert.match(html, /id="demaos"/);
    assert.match(html, /id="rendimento"/);
    assert.match(html, /id="margem"/);
    assert.match(html, /id="tamanhoEmbalagem"/);
    assert.match(html, /id="resultadoTinta"/);
    assert.match(html, /id="btnCalcularTinta" class="tool-btn tool-btn-primary"/);
    assert.match(html, /id="btnLimparTinta" class="tool-btn tool-btn-secondary"/);
    assert.match(html, /id="btnCopiarTinta" class="tool-btn tool-btn-secondary"/);
    assert.match(html, /id="btnCompartilharTinta" class="tool-btn tool-btn-secondary"/);
    assert.match(html, /id="btnImprimirTinta" class="tool-btn tool-btn-secondary"/);
    assert.match(html, /id="statusTinta" class="result-action-status" role="status" aria-live="polite"/);
    assert.doesNotMatch(html, /style="/);
    assert.doesNotMatch(html, /tool-draft-badge/);
  });
});
