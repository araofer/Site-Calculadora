/**
 * Testes Automatizados - Calculadora de Orçamento de Pedreiro
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  MODES,
  DEFAULTS,
  parseFlexibleNumber,
  normalizeInput,
  validateInput,
  calculate,
  formatResult,
  buildCopyText,
  setupTool
} from '../js/tools/orcamento-pedreiro.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');
const PAGE_PATH = path.join(ROOT_DIR, 'src', 'pages', 'tools', 'utilidades', 'orcamento-pedreiro.page.html');

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
    '#modoCalculoPedreiro': createElement({ value: 'm2' }),
    '#camposModoM2': createElement({ hidden: false }),
    '#camposModoDiaria': createElement({ hidden: true }),
    '#areaServico': createElement({ value: '50' }),
    '#precoPorM2': createElement({ value: '60' }),
    '#quantidadeDiarias': createElement({ value: '99' }),
    '#precoDiaria': createElement({ value: '999' }),
    '#custoTransporte': createElement({ value: '150' }),
    '#custoFerramentas': createElement({ value: '100' }),
    '#custoEntulho': createElement({ value: '250' }),
    '#outrosCustosAdicionais': createElement({ value: '0' }),
    '#custoMateriais': createElement({ value: '1000' }),
    '#reservaPercentual': createElement({ value: '10' }),
    '#descontoOrcamento': createElement({ value: '200' }),
    '#btnLimparOrcamentoPedreiro': createElement(),
    '#erroOrcamentoPedreiro': createElement({ hidden: true }),
    '#resultadoOrcamentoPedreiro': createElement({ hidden: true }),
    '#statusOrcamentoPedreiro': createElement(),
    '#resMetodoPedreiro': createElement(),
    '#resMaoDeObraPedreiro': createElement(),
    '#resCustosAdicionaisPedreiro': createElement(),
    '#resMateriaisPedreiro': createElement(),
    '#resBaseReservaPedreiro': createElement(),
    '#resReservaPedreiro': createElement(),
    '#resDescontoPedreiro': createElement(),
    '#resTotalPedreiro': createElement(),
    '#linhaCustoMedioM2Pedreiro': createElement({ hidden: true }),
    '#resCustoMedioM2Pedreiro': createElement(),
    '#btnCopiarOrcamentoPedreiro': createElement({ hidden: true }),
    '#btnCompartilharOrcamentoPedreiro': createElement({ hidden: true }),
    '#btnImprimirOrcamentoPedreiro': createElement({ hidden: true })
  };

  const form = createElement({
    reset() {
      elements['#areaServico'].value = '';
      elements['#precoPorM2'].value = '';
      elements['#quantidadeDiarias'].value = '';
      elements['#precoDiaria'].value = '';
      elements['#custoTransporte'].value = '';
      elements['#custoFerramentas'].value = '';
      elements['#custoEntulho'].value = '';
      elements['#outrosCustosAdicionais'].value = '';
      elements['#custoMateriais'].value = '';
      elements['#reservaPercentual'].value = '10';
      elements['#descontoOrcamento'].value = '';
    }
  });
  elements['#formOrcamentoPedreiro'] = form;

  return {
    elements,
    root: {
      querySelector(selector) {
        return elements[selector] || null;
      }
    }
  };
}

describe('Ferramenta: Calculadora de Orçamento de Pedreiro (orcamento-pedreiro)', () => {
  it('deve exportar as funções contratuais e constantes esperadas', () => {
    assert.equal(typeof parseFlexibleNumber, 'function');
    assert.equal(typeof normalizeInput, 'function');
    assert.equal(typeof validateInput, 'function');
    assert.equal(typeof calculate, 'function');
    assert.equal(typeof formatResult, 'function');
    assert.equal(typeof buildCopyText, 'function');
    assert.equal(typeof setupTool, 'function');
    assert.equal(DEFAULTS.reservaPercentual, 10);
    assert.equal(MODES.M2, 'm2');
    assert.equal(MODES.DIARIA, 'diaria');
  });

  it('deve calcular corretamente no modo por m² com todos os componentes (mão de obra, adicionais, materiais, reserva e desconto)', () => {
    // Mão de obra: 40 m² * R$ 75/m² = R$ 3.000,00
    // Adicionais: 150 + 200 + 250 + 100 = R$ 700,00
    // Materiais: R$ 1.300,00
    // Base antes da reserva: 3000 + 700 + 1300 = R$ 5.000,00
    // Reserva 10%: R$ 500,00 -> Subtotal: R$ 5.500,00
    // Desconto: R$ 300,00 -> Total: R$ 5.200,00
    // Custo médio por m²: 5200 / 40 = R$ 130,00/m²
    const result = calculate({
      modoCalculo: 'm2',
      areaServico: '40',
      precoPorM2: '75,00',
      quantidadeDiarias: '999', // deve ser ignorado no modo m2
      precoDiaria: '999', // deve ser ignorado no modo m2
      custoTransporte: '150',
      custoFerramentas: '200',
      custoEntulho: '250',
      outrosCustosAdicionais: '100',
      custoMateriais: '1300',
      reservaPercentual: '10',
      desconto: '300'
    });

    assert.equal(result.ok, true);
    assert.equal(result.data.custoMaoDeObra, 3000);
    assert.equal(result.data.custosAdicionais, 700);
    assert.equal(result.data.custoMateriais, 1300);
    assert.equal(result.data.baseCalculoReserva, 5000);
    assert.equal(result.data.reservaImprevistos, 500);
    assert.equal(result.data.subtotalAntesDesconto, 5500);
    assert.equal(result.data.descontoAplicado, 300);
    assert.equal(result.data.totalEstimado, 5200);
    assert.equal(result.data.custoMedioPorM2, 130);

    const formatted = formatResult(result);
    assert.match(formatted.custoMaoDeObra, /3\.000,00/);
    assert.match(formatted.totalEstimado, /5\.200,00/);
    assert.match(formatted.custoMedioPorM2, /130,00\/m²/);
  });

  it('deve calcular corretamente no modo por diária e não calcular custo por m² quando área não é aplicável', () => {
    // 10 diárias * R$ 220 = R$ 2.200,00
    // Adicionais = R$ 300,00; Materiais = R$ 500,00
    // Base = R$ 3.000,00; Reserva 10% = R$ 300,00; Desconto = R$ 100,00 -> Total = R$ 3.200,00
    const result = calculate({
      modoCalculo: 'diaria',
      areaServico: '50', // deve ser ignorado no modo diaria
      precoPorM2: '80', // deve ser ignorado no modo diaria
      quantidadeDiarias: '10',
      precoDiaria: '220',
      custosAdicionais: '300',
      custoMateriais: '500',
      reservaPercentual: '10',
      desconto: '100'
    });

    assert.equal(result.ok, true);
    assert.equal(result.data.custoMaoDeObra, 2200);
    assert.equal(result.data.custosAdicionais, 300);
    assert.equal(result.data.custoMateriais, 500);
    assert.equal(result.data.baseCalculoReserva, 3000);
    assert.equal(result.data.reservaImprevistos, 300);
    assert.equal(result.data.totalEstimado, 3200);
    assert.equal(result.data.custoMedioPorM2, null);

    const formatted = formatResult(result);
    assert.equal(formatted.custoMedioPorM2, null);
    assert.doesNotMatch(buildCopyText(result), /Custo médio total por m²/);
  });

  it('deve aceitar valores zero permitidos (sem custos adicionais, sem materiais, reserva 0% e desconto 0)', () => {
    const result = calculate({
      modoCalculo: 'diaria',
      quantidadeDiarias: '5,5',
      precoDiaria: '200',
      custoTransporte: '0',
      custoFerramentas: '0',
      custoEntulho: '0',
      outrosCustosAdicionais: '0',
      custoMateriais: '0',
      reservaPercentual: '0',
      desconto: '0'
    });

    assert.equal(result.ok, true);
    assert.equal(result.data.custoMaoDeObra, 1100);
    assert.equal(result.data.custosAdicionais, 0);
    assert.equal(result.data.custoMateriais, 0);
    assert.equal(result.data.reservaImprevistos, 0);
    assert.equal(result.data.descontoAplicado, 0);
    assert.equal(result.data.totalEstimado, 1100);
  });

  it('deve rejeitar entradas inválidas, valores negativos e descontos superiores ao subtotal com reserva', () => {
    const modoInvalido = calculate({
      modoCalculo: 'invalido',
      areaServico: '10',
      precoPorM2: '50'
    });
    assert.equal(modoInvalido.ok, false);

    const areaZero = calculate({
      modoCalculo: 'm2',
      areaServico: '0',
      precoPorM2: '50'
    });
    assert.equal(areaZero.ok, false);
    assert.ok(areaZero.errors.some((e) => /área do serviço deve ser maior que zero/i.test(e)));

    const diariaNegativa = calculate({
      modoCalculo: 'diaria',
      quantidadeDiarias: '-2',
      precoDiaria: '200'
    });
    assert.equal(diariaNegativa.ok, false);
    assert.ok(diariaNegativa.errors.some((e) => /quantidade de diárias deve ser maior que zero/i.test(e)));

    const materialNegativo = calculate({
      modoCalculo: 'm2',
      areaServico: '20',
      precoPorM2: '50',
      custoMateriais: '-100'
    });
    assert.equal(materialNegativo.ok, false);
    assert.ok(materialNegativo.errors.some((e) => /custo de materiais não pode ser negativo/i.test(e)));

    const reservaInvalida = calculate({
      modoCalculo: 'm2',
      areaServico: '20',
      precoPorM2: '50',
      reservaPercentual: '120'
    });
    assert.equal(reservaInvalida.ok, false);
    assert.ok(reservaInvalida.errors.some((e) => /reserva para imprevistos deve estar entre/i.test(e)));

    const descontoExcessivo = calculate({
      modoCalculo: 'm2',
      areaServico: '10',
      precoPorM2: '50',
      reservaPercentual: '10', // subtotal = 550
      desconto: '600'
    });
    assert.equal(descontoExcessivo.ok, false);
    assert.ok(descontoExcessivo.errors.some((e) => /desconto .* não pode ser maior que o subtotal/i.test(e)));
  });

  it('deve alternar modos limpando campos ocultos e atualizar o DOM via setupTool', async () => {
    const { root, elements } = createFakeDom();
    setupTool(root);

    // Ao iniciar em m2, os campos de diária devem ter sido limpos pelo syncModeVisibility
    assert.equal(elements['#quantidadeDiarias'].value, '');
    assert.equal(elements['#precoDiaria'].value, '');

    await elements['#formOrcamentoPedreiro'].trigger('submit');
    assert.equal(elements['#erroOrcamentoPedreiro'].hidden, true);
    assert.equal(elements['#resultadoOrcamentoPedreiro'].hidden, false);
    assert.equal(elements['#linhaCustoMedioM2Pedreiro'].hidden, false);
    assert.match(elements['#resTotalPedreiro'].textContent, /4\.750,00/);

    // Alternar para modo diária oculta m2 e limpa areaServico/precoPorM2
    elements['#modoCalculoPedreiro'].value = 'diaria';
    await elements['#modoCalculoPedreiro'].trigger('change');
    assert.equal(elements['#camposModoM2'].hidden, true);
    assert.equal(elements['#camposModoDiaria'].hidden, false);
    assert.equal(elements['#areaServico'].value, '');
    assert.equal(elements['#precoPorM2'].value, '');
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
        location: {
          origin: 'https://www.calculadoramaster.com',
          href: 'https://www.calculadoramaster.com/tools/utilidades/orcamento-pedreiro.html'
        },
        print() {
          printCalls += 1;
        }
      };

      setupTool(root);
      await elements['#formOrcamentoPedreiro'].trigger('submit');

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
      await elements['#btnCopiarOrcamentoPedreiro'].trigger('click');
      assert.match(copiedText, /Calculadora de Orçamento de Pedreiro — Calculadora Master/);
      assert.match(copiedText, /Total estimado do orçamento: R\$\s*4\.750,00/);
      assert.equal(elements['#statusOrcamentoPedreiro'].textContent, 'Resultado copiado.');

      // 2. Copiar - falha da área de transferência
      Object.defineProperty(globalThis, 'navigator', {
        configurable: true,
        value: {
          clipboard: {
            writeText: async () => {
              throw new Error('Clipboard error');
            }
          }
        }
      });
      await elements['#btnCopiarOrcamentoPedreiro'].trigger('click');
      assert.equal(elements['#statusOrcamentoPedreiro'].textContent, 'Não foi possível copiar o resultado.');

      // 3. Compartilhar - sucesso nativo (sem dados financeiros na URL)
      Object.defineProperty(globalThis, 'navigator', {
        configurable: true,
        value: {
          share: async (payload) => {
            sharedPayload = payload;
          }
        }
      });
      await elements['#btnCompartilharOrcamentoPedreiro'].trigger('click');
      assert.equal(sharedPayload.title, 'Calculadora de Orçamento de Pedreiro — Calculadora Master');
      assert.equal(sharedPayload.url, 'https://www.calculadoramaster.com/tools/utilidades/orcamento-pedreiro.html');
      assert.doesNotMatch(sharedPayload.url, /\?|4750|4\.750|1000/i);
      assert.match(sharedPayload.text, /Total estimado do orçamento/);
      assert.equal(elements['#statusOrcamentoPedreiro'].textContent, 'Resultado compartilhado.');

      // 4. Compartilhar - cancelamento (AbortError)
      Object.defineProperty(globalThis, 'navigator', {
        configurable: true,
        value: {
          share: async () => {
            const abortErr = new Error('Cancelled');
            abortErr.name = 'AbortError';
            throw abortErr;
          }
        }
      });
      await elements['#btnCompartilharOrcamentoPedreiro'].trigger('click');
      assert.equal(elements['#statusOrcamentoPedreiro'].textContent, 'Compartilhamento cancelado.');

      // 5. Compartilhar - fallback para área de transferência
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
      await elements['#btnCompartilharOrcamentoPedreiro'].trigger('click');
      assert.match(copiedText, /Total estimado do orçamento/);
      assert.equal(
        elements['#statusOrcamentoPedreiro'].textContent,
        'Compartilhamento indisponível. Resultado copiado.'
      );

      // 6. Imprimir - sucesso
      await elements['#btnImprimirOrcamentoPedreiro'].trigger('click');
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
    assert.match(html, /id="formOrcamentoPedreiro"/);
    assert.match(html, /id="modoCalculoPedreiro"/);
    assert.match(html, /id="areaServico"/);
    assert.match(html, /id="precoPorM2"/);
    assert.match(html, /id="quantidadeDiarias"/);
    assert.match(html, /id="precoDiaria"/);
    assert.match(html, /id="custoMateriais"/);
    assert.match(html, /id="reservaPercentual"/);
    assert.match(html, /id="descontoOrcamento"/);
    assert.match(html, /id="resultadoOrcamentoPedreiro"/);
    assert.match(html, /id="btnCalcularOrcamentoPedreiro" class="tool-btn tool-btn-primary"/);
    assert.match(html, /id="btnLimparOrcamentoPedreiro" class="tool-btn tool-btn-secondary"/);
    assert.match(html, /id="btnCopiarOrcamentoPedreiro" class="tool-btn tool-btn-secondary"/);
    assert.match(html, /id="btnCompartilharOrcamentoPedreiro" class="tool-btn tool-btn-secondary"/);
    assert.match(html, /id="btnImprimirOrcamentoPedreiro" class="tool-btn tool-btn-secondary"/);
    assert.match(html, /id="statusOrcamentoPedreiro" class="result-action-status" role="status" aria-live="polite"/);
    assert.doesNotMatch(html, /style="/);
    assert.doesNotMatch(html, /tool-draft-badge/);
  });
});
