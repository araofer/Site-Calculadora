/**
 * Testes Automatizados - Calculadora de Projeção de Faturamento MEI
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  DEFAULTS,
  STATUS_LIMITE,
  parseFlexibleNumber,
  normalizeInput,
  validateInput,
  calculate,
  formatResult,
  buildCopyText,
  setupTool
} from '../js/tools/projecao-faturamento-mei.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');
const PAGE_PATH = path.join(ROOT_DIR, 'src', 'pages', 'tools', 'financas', 'projecao-faturamento-mei.page.html');

function createElement(initial = {}) {
  const listeners = new Map();
  const attributes = new Map();
  return {
    value: '',
    textContent: '',
    className: '',
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
    '#faturamentoAcumuladoMei': createElement({ value: '30000' }),
    '#faturamentoMensalReferenciaMei': createElement({ value: '6000' }),
    '#mesesRestantesMei': createElement({ value: '6' }),
    '#crescimentoMensalMei': createElement({ value: '0' }),
    '#limiteAnualMei': createElement({ value: '81000,00' }),
    '#btnLimparProjecaoMei': createElement(),
    '#erroProjecaoMei': createElement({ hidden: true }),
    '#resultadoProjecaoMei': createElement({ hidden: true }),
    '#statusProjecaoMei': createElement(),
    '#resSituacaoLimiteMei': createElement(),
    '#resAvisoLimiteMei': createElement(),
    '#resFaturamentoAcumuladoMei': createElement(),
    '#resTotalProjetadoRestanteMei': createElement(),
    '#resFaturamentoAnualProjetadoMei': createElement(),
    '#resLimiteAnualMei': createElement(),
    '#resPercentualLimiteMei': createElement(),
    '#resValorRestanteLimiteMei': createElement(),
    '#resValorExcedenteLimiteMei': createElement(),
    '#resMediaMensalProjetadaMei': createElement(),
    '#resMensalCompativelLimiteMei': createElement(),
    '#tabelaProjecaoMeiBody': createElement(),
    '#btnCopiarProjecaoMei': createElement({ hidden: true }),
    '#btnCompartilharProjecaoMei': createElement({ hidden: true }),
    '#btnImprimirProjecaoMei': createElement({ hidden: true })
  };

  const form = createElement({
    reset() {
      elements['#faturamentoAcumuladoMei'].value = '0';
      elements['#faturamentoMensalReferenciaMei'].value = '';
      elements['#mesesRestantesMei'].value = '6';
      elements['#crescimentoMensalMei'].value = '0';
      elements['#limiteAnualMei'].value = '81000,00';
    }
  });
  elements['#formProjecaoMei'] = form;

  return {
    elements,
    root: {
      querySelector(selector) {
        return elements[selector] || null;
      }
    }
  };
}

describe('Ferramenta: Calculadora de Projeção de Faturamento MEI (projecao-faturamento-mei)', () => {
  it('deve exportar as funções contratuais e constantes esperadas', () => {
    assert.equal(typeof parseFlexibleNumber, 'function');
    assert.equal(typeof normalizeInput, 'function');
    assert.equal(typeof validateInput, 'function');
    assert.equal(typeof calculate, 'function');
    assert.equal(typeof formatResult, 'function');
    assert.equal(typeof buildCopyText, 'function');
    assert.equal(typeof setupTool, 'function');
    assert.equal(DEFAULTS.limiteAnual, 81000);
    assert.equal(DEFAULTS.crescimentoMensal, 0);
  });

  it('deve projetar crescimento mensal zero com projeção constante e sem contagem duplicada dos meses', () => {
    // Acumulado de 6 meses já realizados: R$ 30.000,00
    // Referência mensal: R$ 5.000,00, faltam 6 meses, crescimento 0%, limite R$ 81.000,00
    // Total projetado meses restantes = 6 * 5000 = R$ 30.000,00
    // Faturamento anual projetado = 30.000 + 30.000 = R$ 60.000,00 (74,07% do limite)
    // Valor restante até o limite = 81.000 - 60.000 = R$ 21.000,00
    // Faturamento mensal compatível com limite restante = (81.000 - 30.000) / 6 = R$ 8.500,00
    const result = calculate({
      faturamentoAcumulado: '30000',
      faturamentoMensalReferencia: '5000',
      mesesRestantes: '6',
      crescimentoMensal: '0',
      limiteAnual: '81000'
    });

    assert.equal(result.ok, true);
    assert.equal(result.data.projecaoMensal.length, 6);
    assert.ok(result.data.projecaoMensal.every((m) => m.faturamentoProjetado === 5000));
    assert.equal(result.data.totalProjetadoMesesRestantes, 30000);
    assert.equal(
      result.data.faturamentoAnualProjetado,
      result.data.faturamentoAcumulado + result.data.totalProjetadoMesesRestantes
    );
    assert.equal(result.data.faturamentoAnualProjetado, 60000);
    assert.equal(result.data.percentualLimiteUtilizado, 74.07);
    assert.equal(result.data.valorRestanteLimite, 21000);
    assert.equal(result.data.valorExcedenteLimite, 0);
    assert.equal(result.data.mediaMensalProjetada, 5000);
    assert.equal(result.data.faturamentoMensalCompativelLimite, 8500);
    assert.equal(result.data.situacaoLimite, STATUS_LIMITE.ABAIXO);
  });

  it('deve calcular projeção composta com crescimento positivo e negativo em um e vários meses', () => {
    // 1 mês futuro com 10% de crescimento sobre R$ 6.000,00 -> Mês 1 = R$ 6.600,00
    const umMes = calculate({
      faturamentoAcumulado: '40000',
      faturamentoMensalReferencia: '6000',
      mesesRestantes: '1',
      crescimentoMensal: '10',
      limiteAnual: '81000'
    });

    assert.equal(umMes.ok, true);
    assert.equal(umMes.data.projecaoMensal.length, 1);
    assert.equal(umMes.data.projecaoMensal[0].faturamentoProjetado, 6600);
    assert.equal(umMes.data.totalProjetadoMesesRestantes, 6600);
    assert.equal(umMes.data.faturamentoAnualProjetado, 46600);

    // 3 meses futuros com 10% de crescimento composto sobre R$ 5.000,00 e acumulado zero:
    // Mês 1 = 5500; Mês 2 = 6050; Mês 3 = 6655 -> Soma = 18205; Média = 6068,33
    const tresMesesPositivo = calculate({
      faturamentoAcumulado: '0',
      faturamentoMensalReferencia: '5000',
      mesesRestantes: '3',
      crescimentoMensal: '10',
      limiteAnual: '81000'
    });

    assert.equal(tresMesesPositivo.ok, true);
    assert.deepEqual(
      tresMesesPositivo.data.projecaoMensal.map((m) => m.faturamentoProjetado),
      [5500, 6050, 6655]
    );
    assert.equal(tresMesesPositivo.data.totalProjetadoMesesRestantes, 18205);
    assert.equal(tresMesesPositivo.data.faturamentoAnualProjetado, 18205);
    assert.equal(tresMesesPositivo.data.mediaMensalProjetada, 6068.33);

    // Crescimento negativo permitido (-10% ao mês por 2 meses sobre R$ 5.000,00):
    // Mês 1 = 4500; Mês 2 = 4050 -> Total = 8550
    const crescimentoNegativo = calculate({
      faturamentoAcumulado: '20000',
      faturamentoMensalReferencia: '5000',
      mesesRestantes: '2',
      crescimentoMensal: '-10',
      limiteAnual: '81000'
    });

    assert.equal(crescimentoNegativo.ok, true);
    assert.deepEqual(
      crescimentoNegativo.data.projecaoMensal.map((m) => m.faturamentoProjetado),
      [4500, 4050]
    );
    assert.equal(crescimentoNegativo.data.totalProjetadoMesesRestantes, 8550);
    assert.equal(crescimentoNegativo.data.faturamentoAnualProjetado, 28550);
  });

  it('deve sinalizar corretamente projeção próxima/exata do limite e projeção que ultrapassa o limite', () => {
    // Exatamente no limite de R$ 81.000,00 (100% -> situação próxima do limite, sem excedente)
    const alcancaLimite = calculate({
      faturamentoAcumulado: '54000',
      faturamentoMensalReferencia: '6750',
      mesesRestantes: '4',
      crescimentoMensal: '0',
      limiteAnual: '81000'
    });

    assert.equal(alcancaLimite.ok, true);
    assert.equal(alcancaLimite.data.faturamentoAnualProjetado, 81000);
    assert.equal(alcancaLimite.data.percentualLimiteUtilizado, 100);
    assert.equal(alcancaLimite.data.valorRestanteLimite, 0);
    assert.equal(alcancaLimite.data.valorExcedenteLimite, 0);
    assert.equal(alcancaLimite.data.situacaoLimite, STATUS_LIMITE.PROXIMO);

    // Ultrapassa o limite (acumulado 60.000 + 4 * 7.500 = 90.000 -> excede em R$ 9.000,00)
    const ultrapassaLimite = calculate({
      faturamentoAcumulado: '60000',
      faturamentoMensalReferencia: '7500',
      mesesRestantes: '4',
      crescimentoMensal: '0',
      limiteAnual: '81000'
    });

    assert.equal(ultrapassaLimite.ok, true);
    assert.equal(ultrapassaLimite.data.faturamentoAnualProjetado, 90000);
    assert.equal(ultrapassaLimite.data.percentualLimiteUtilizado, 111.11);
    assert.equal(ultrapassaLimite.data.valorRestanteLimite, 0);
    assert.equal(ultrapassaLimite.data.valorExcedenteLimite, 9000);
    assert.equal(ultrapassaLimite.data.situacaoLimite, STATUS_LIMITE.ACIMA);
    assert.match(ultrapassaLimite.data.avisoLimite, /ultrapassa o limite informado/i);

    const formatted = formatResult(ultrapassaLimite);
    assert.match(formatted.faturamentoAnualProjetado, /90\.000,00/);
    assert.match(formatted.valorExcedenteLimite, /9\.000,00/);
    assert.equal(formatted.percentualLimiteUtilizado, '111,11%');
    assert.match(buildCopyText(ultrapassaLimite), /1º mês futuro/);
  });

  it('deve rejeitar parâmetros inválidos com mensagens claras', () => {
    const semReferencia = calculate({
      faturamentoAcumulado: '10000',
      mesesRestantes: '6'
    });
    assert.equal(semReferencia.ok, false);
    assert.ok(semReferencia.errors.some((e) => /faturamento mensal de referência/i.test(e)));

    const acumuladoNegativo = calculate({
      faturamentoAcumulado: '-500',
      faturamentoMensalReferencia: '5000',
      mesesRestantes: '6'
    });
    assert.equal(acumuladoNegativo.ok, false);
    assert.ok(acumuladoNegativo.errors.some((e) => /acumulado no ano não pode ser negativo/i.test(e)));

    const mesesInvalidos = calculate({
      faturamentoAcumulado: '10000',
      faturamentoMensalReferencia: '5000',
      mesesRestantes: '15'
    });
    assert.equal(mesesInvalidos.ok, false);
    assert.ok(mesesInvalidos.errors.some((e) => /entre 1 e 12/i.test(e)));

    const crescimentoInvalido = calculate({
      faturamentoAcumulado: '10000',
      faturamentoMensalReferencia: '5000',
      mesesRestantes: '6',
      crescimentoMensal: '-150'
    });
    assert.equal(crescimentoInvalido.ok, false);
    assert.ok(crescimentoInvalido.errors.some((e) => /crescimento mensal esperado deve estar entre/i.test(e)));

    const limiteZero = calculate({
      faturamentoAcumulado: '10000',
      faturamentoMensalReferencia: '5000',
      mesesRestantes: '6',
      limiteAnual: '0'
    });
    assert.equal(limiteZero.ok, false);
    assert.ok(limiteZero.errors.some((e) => /limite anual de faturamento deve ser maior que zero/i.test(e)));

    const tudoZero = calculate({
      faturamentoAcumulado: '0',
      faturamentoMensalReferencia: '0',
      mesesRestantes: '6',
      limiteAnual: '81000'
    });
    assert.equal(tudoZero.ok, false);
  });

  it('deve atualizar indicadores e linhas de projeção via setupTool', async () => {
    const { root, elements } = createFakeDom();
    setupTool(root);

    await elements['#formProjecaoMei'].trigger('submit');
    assert.equal(elements['#erroProjecaoMei'].hidden, true);
    assert.equal(elements['#resultadoProjecaoMei'].hidden, false);
    assert.match(elements['#resFaturamentoAnualProjetadoMei'].textContent, /66\.000,00/);
    assert.equal(elements['#resPercentualLimiteMei'].textContent, '81,48%');
    assert.equal(elements['#resSituacaoLimiteMei'].textContent, 'Próxima do limite');
    assert.equal(elements['#tabelaProjecaoMeiBody'].rowsData.length, 6);
    assert.equal(elements['#btnCopiarProjecaoMei'].hidden, false);
    assert.equal(elements['#btnCompartilharProjecaoMei'].hidden, false);
    assert.equal(elements['#btnImprimirProjecaoMei'].hidden, false);

    await elements['#btnLimparProjecaoMei'].trigger('click');
    assert.equal(elements['#resultadoProjecaoMei'].hidden, true);
    assert.equal(elements['#btnCopiarProjecaoMei'].hidden, true);
    assert.equal(elements['#btnCompartilharProjecaoMei'].hidden, true);
    assert.equal(elements['#btnImprimirProjecaoMei'].hidden, true);
  });

  it('deve executar as ações de copiar projeção, compartilhar link e imprimir com sucesso, falhas e fallbacks', async () => {
    const { root, elements } = createFakeDom();
    const originalWindow = globalThis.window;
    const originalNavigator = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
    let copiedText = null;
    let sharedPayload = null;
    let printCalls = 0;

    try {
      globalThis.window = {
        location: {
          origin: 'https://www.calculadoramaster.com',
          href: 'https://www.calculadoramaster.com/tools/financas/projecao-faturamento-mei.html'
        },
        print() {
          printCalls += 1;
        }
      };

      setupTool(root);
      await elements['#formProjecaoMei'].trigger('submit');

      // 1. Copiar projeção - sucesso
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
      await elements['#btnCopiarProjecaoMei'].trigger('click');
      assert.match(copiedText, /Calculadora de Projeção de Faturamento MEI — Calculadora Master/);
      assert.match(copiedText, /Faturamento bruto anual projetado: R\$\s*66\.000,00/);
      assert.match(copiedText, /1º mês futuro/);
      assert.equal(elements['#statusProjecaoMei'].textContent, 'Resultado copiado.');

      // 2. Copiar projeção - falha da área de transferência
      Object.defineProperty(globalThis, 'navigator', {
        configurable: true,
        value: {
          clipboard: {
            writeText: async () => {
              throw new Error('Clipboard blocked');
            }
          }
        }
      });
      await elements['#btnCopiarProjecaoMei'].trigger('click');
      assert.equal(elements['#statusProjecaoMei'].textContent, 'Não foi possível copiar o resultado.');

      // 3. Compartilhar link - sucesso nativo (sem dados pessoais ou resultados financeiros na URL)
      Object.defineProperty(globalThis, 'navigator', {
        configurable: true,
        value: {
          share: async (payload) => {
            sharedPayload = payload;
          }
        }
      });
      await elements['#btnCompartilharProjecaoMei'].trigger('click');
      assert.equal(sharedPayload.title, 'Calculadora de Projeção de Faturamento MEI — Calculadora Master');
      assert.equal(sharedPayload.url, 'https://www.calculadoramaster.com/tools/financas/projecao-faturamento-mei.html');
      assert.doesNotMatch(sharedPayload.url, /\?|66000|66\.000|30000|81000/i);
      assert.match(sharedPayload.text, /Faturamento bruto anual projetado/);
      assert.equal(elements['#statusProjecaoMei'].textContent, 'Resultado compartilhado.');

      // 4. Compartilhar link - cancelamento (AbortError)
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
      await elements['#btnCompartilharProjecaoMei'].trigger('click');
      assert.equal(elements['#statusProjecaoMei'].textContent, 'Compartilhamento cancelado.');

      // 5. Compartilhar link - fallback para cópia quando Web Share não está disponível
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
      await elements['#btnCompartilharProjecaoMei'].trigger('click');
      assert.match(copiedText, /Faturamento bruto anual projetado/);
      assert.equal(
        elements['#statusProjecaoMei'].textContent,
        'Compartilhamento indisponível. Resultado copiado.'
      );

      // 6. Imprimir - sucesso
      await elements['#btnImprimirProjecaoMei'].trigger('click');
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
    assert.match(html, /id="formProjecaoMei"/);
    assert.match(html, /id="faturamentoAcumuladoMei"/);
    assert.match(html, /id="faturamentoMensalReferenciaMei"/);
    assert.match(html, /id="mesesRestantesMei"/);
    assert.match(html, /id="crescimentoMensalMei"/);
    assert.match(html, /id="limiteAnualMei"/);
    assert.match(html, /id="tabelaProjecaoMeiBody"/);
    assert.match(html, /id="resultadoProjecaoMei"/);
    assert.match(html, /id="btnCalcularProjecaoMei" class="tool-btn tool-btn-primary"/);
    assert.match(html, /id="btnLimparProjecaoMei" class="tool-btn tool-btn-secondary"/);
    assert.match(html, /id="btnCopiarProjecaoMei" class="tool-btn tool-btn-secondary"/);
    assert.match(html, /id="btnCompartilharProjecaoMei" class="tool-btn tool-btn-secondary"/);
    assert.match(html, /id="btnImprimirProjecaoMei" class="tool-btn tool-btn-secondary"/);
    assert.match(html, /id="statusProjecaoMei" class="result-action-status" role="status" aria-live="polite"/);
    assert.doesNotMatch(html, /style="/);
    assert.doesNotMatch(html, /tool-draft-badge/);
  });
});
