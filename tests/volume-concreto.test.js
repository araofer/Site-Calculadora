/**
 * Testes Unitários e de Integração — Calculadora de Volume de Concreto (#54)
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  ELEMENT_TYPES,
  DEFAULTS,
  LIMITS,
  CANONICAL_URL,
  parseDecimal,
  parseFlexibleNumber,
  normalizeInput,
  validateInput,
  calculate,
  formatResult,
  getResultSections,
  formatMemoriaCalculo,
  setupTool
} from '../js/tools/volume-concreto.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

function assertApprox(actual, expected, tol = 1e-9, msg = '') {
  assert.ok(
    Math.abs(actual - expected) < tol,
    `Esperado aproximadamente ${expected}, recebido ${actual}. ${msg}`
  );
}

test('Volume de Concreto - Constantes e defaults contratuais', () => {
  assert.equal(DEFAULTS.tipoElemento, 'laje');
  assert.equal(DEFAULTS.quantidade, 1);
  assert.equal(DEFAULTS.margemPerda, 5);
  assert.equal(LIMITS.minMargemPerda, 0);
  assert.equal(LIMITS.maxMargemPerda, 30);
  assert.equal(ELEMENT_TYPES.LAJE, 'laje');
  assert.equal(ELEMENT_TYPES.PISO, 'piso');
  assert.equal(ELEMENT_TYPES.VIGA, 'viga');
  assert.equal(ELEMENT_TYPES.PILAR_RETANGULAR, 'pilar_retangular');
  assert.equal(ELEMENT_TYPES.PILAR_CIRCULAR, 'pilar_circular');
});

test('Volume de Concreto - Parser flexível com vírgula e ponto', () => {
  assert.equal(parseDecimal('6.00'), 6);
  assert.equal(parseDecimal('6,00'), 6);
  assert.equal(parseDecimal('10,5'), 10.5);
  assert.equal(parseDecimal('0,72576'), 0.72576);
  assert.equal(parseFlexibleNumber('2,80'), 2.8);
  assert.equal(parseDecimal(15), 15);
  assert.ok(Number.isNaN(parseDecimal('')));
  assert.ok(Number.isNaN(parseDecimal('abc')));
  assert.ok(Number.isNaN(parseDecimal(null)));
});

test('Volume de Concreto - 1. Laje maciça: 6 × 4 × 10 cm com 10% de perda = 2,64 m³', () => {
  const res = calculate({
    tipoElemento: 'laje',
    comprimento: 6,
    largura: 4,
    espessura: 10,
    margemPerda: 10
  });

  assert.equal(res.valido, true);
  assertApprox(res.volumeBase, 2.4);
  assertApprox(res.volumePerda, 0.24);
  assertApprox(res.volumeTotal, 2.64);
  assertApprox(res.volumeLitros, 2640);
  assert.match(res.memoriaCalculo, /6 m × 4 m × \(10 cm ÷ 100\)/);
});

test('Volume de Concreto - 2. Piso / Contrapiso: 8 × 5 × 7 cm com 5% de perda = 2,94 m³', () => {
  const res = calculate({
    tipoElemento: 'piso',
    comprimento: '8,00',
    largura: '5,00',
    espessura: '7',
    margemPerda: '5'
  });

  assert.equal(res.valido, true);
  assertApprox(res.volumeBase, 2.8);
  assertApprox(res.volumePerda, 0.14);
  assertApprox(res.volumeTotal, 2.94);
  assertApprox(res.volumeLitros, 2940);
});

test('Volume de Concreto - 3. Quatro vigas: 4 × (5 m × 15 cm × 30 cm) com 10% de perda = 0,99 m³', () => {
  const res = calculate({
    tipoElemento: 'viga',
    quantidade: 4,
    comprimento: 5,
    largura: 15,
    altura: 30,
    margemPerda: 10
  });

  assert.equal(res.valido, true);
  assertApprox(res.volumeBase, 0.9);
  assertApprox(res.volumePerda, 0.09);
  assertApprox(res.volumeTotal, 0.99);
  assertApprox(res.volumeLitros, 990);
  assert.match(res.memoriaCalculo, /4 vigas/);
});

test('Volume de Concreto - 4. Seis pilares retangulares: 6 × (20 × 20 cm × 2,80 m) com 8% de perda = 0,72576 m³', () => {
  const res = calculate({
    tipoElemento: 'pilar_retangular',
    quantidade: 6,
    lado1: 20,
    lado2: 20,
    altura: 2.8,
    margemPerda: 8
  });

  assert.equal(res.valido, true);
  assertApprox(res.volumeBase, 0.672);
  assertApprox(res.volumePerda, 0.05376);
  assertApprox(res.volumeTotal, 0.72576);
  assertApprox(res.volumeLitros, 725.76);
});

test('Volume de Concreto - 5. Duas peças cilíndricas: 2 × (30 cm diâm, 3 m alt) com 10% de perda ≈ 0,4665265091 m³', () => {
  const res = calculate({
    tipoElemento: 'pilar_circular',
    quantidade: 2,
    diametro: 30,
    altura: 3,
    margemPerda: 10
  });

  assert.equal(res.valido, true);
  const esperadoBase = 2 * Math.PI * (0.15 ** 2) * 3;
  const esperadoTotal = esperadoBase * 1.1;

  assertApprox(res.volumeBase, esperadoBase);
  assertApprox(res.volumeTotal, esperadoTotal);
  assertApprox(res.volumeTotal, 0.4665265091, 1e-6);
  assertApprox(res.volumeLitros, esperadoTotal * 1000);
  assert.ok(res.avisos.some(a => a.includes('seção constante')));
});

test('Volume de Concreto - 6. Margem de perda zero (0%): volume total igual ao base', () => {
  const res = calculate({
    tipoElemento: 'laje',
    comprimento: 5,
    largura: 2,
    espessura: 10,
    margemPerda: 0
  });

  assert.equal(res.valido, true);
  assertApprox(res.volumeBase, 1.0);
  assertApprox(res.volumePerda, 0);
  assertApprox(res.volumeTotal, 1.0);
  assertApprox(res.volumeLitros, 1000);
});

test('Volume de Concreto - 7. Margem máxima permitida de 30%', () => {
  const res = calculate({
    tipoElemento: 'laje',
    comprimento: 5,
    largura: 2,
    espessura: 10,
    margemPerda: 30
  });

  assert.equal(res.valido, true);
  assertApprox(res.volumeBase, 1.0);
  assertApprox(res.volumePerda, 0.3);
  assertApprox(res.volumeTotal, 1.3);
  assertApprox(res.volumeLitros, 1300);
});

test('Volume de Concreto - 8. Validações de margem de perdas fora do limite (0% a 30%)', () => {
  const resNeg = calculate({
    tipoElemento: 'laje',
    comprimento: 5,
    largura: 2,
    espessura: 10,
    margemPerda: -0.5
  });
  assert.equal(resNeg.valido, false);
  assert.equal(resNeg.erro, 'A margem de perda deve ficar entre 0% e 30%.');

  const resAlta = calculate({
    tipoElemento: 'laje',
    comprimento: 5,
    largura: 2,
    espessura: 10,
    margemPerda: 30.5
  });
  assert.equal(resAlta.valido, false);
  assert.equal(resAlta.erro, 'A margem de perda deve ficar entre 0% e 30%.');

  const resCem = calculate({
    tipoElemento: 'laje',
    comprimento: 5,
    largura: 2,
    espessura: 10,
    margemPerda: 100
  });
  assert.equal(resCem.valido, false);
  assert.equal(resCem.erro, 'A margem de perda deve ficar entre 0% e 30%.');
});

test('Volume de Concreto - 9. Validação de valores nulos, negativos e campos vazios', () => {
  const resCompZero = calculate({
    tipoElemento: 'laje',
    comprimento: 0,
    largura: 4,
    espessura: 10,
    margemPerda: 5
  });
  assert.equal(resCompZero.valido, false);
  assert.equal(resCompZero.erro, 'Informe o comprimento com um valor maior que zero.');

  const resLargNeg = calculate({
    tipoElemento: 'laje',
    comprimento: 6,
    largura: -2,
    espessura: 10,
    margemPerda: 5
  });
  assert.equal(resLargNeg.valido, false);
  assert.equal(resLargNeg.erro, 'Informe a largura com um valor maior que zero.');

  const resEspVazia = calculate({
    tipoElemento: 'laje',
    comprimento: 6,
    largura: 4,
    espessura: '',
    margemPerda: 5
  });
  assert.equal(resEspVazia.valido, false);
  assert.equal(resEspVazia.erro, 'Informe a espessura com um valor maior que zero.');

  const resTipoInvalido = calculate({
    tipoElemento: 'arco',
    comprimento: 6,
    largura: 4,
    espessura: 10
  });
  assert.equal(resTipoInvalido.valido, false);
  assert.equal(resTipoInvalido.erro, 'Selecione um tipo de elemento estrutural válido.');
});

test('Volume de Concreto - 10. Validação de quantidades (fracionárias, negativas e excessivas)', () => {
  const resQtdZero = calculate({
    tipoElemento: 'viga',
    quantidade: 0,
    comprimento: 5,
    largura: 15,
    altura: 30
  });
  assert.equal(resQtdZero.valido, false);
  assert.equal(resQtdZero.erro, 'A quantidade deve ser um número inteiro maior ou igual a 1.');

  const resQtdFrac = calculate({
    tipoElemento: 'viga',
    quantidade: 2.5,
    comprimento: 5,
    largura: 15,
    altura: 30
  });
  assert.equal(resQtdFrac.valido, false);
  assert.equal(resQtdFrac.erro, 'A quantidade deve ser um número inteiro maior ou igual a 1.');

  const resQtdExcessiva = calculate({
    tipoElemento: 'viga',
    quantidade: 10001,
    comprimento: 5,
    largura: 15,
    altura: 30
  });
  assert.equal(resQtdExcessiva.valido, false);
  assert.equal(resQtdExcessiva.erro, 'A quantidade informada é muito grande.');
});

test('Volume de Concreto - 11. Validação de dimensões excessivas', () => {
  const resMetroGigante = calculate({
    tipoElemento: 'laje',
    comprimento: 1001,
    largura: 4,
    espessura: 10
  });
  assert.equal(resMetroGigante.valido, false);
  assert.equal(resMetroGigante.erro, 'O comprimento informado é excessivamente grande.');

  const resCmGigante = calculate({
    tipoElemento: 'laje',
    comprimento: 10,
    largura: 4,
    espessura: 10001
  });
  assert.equal(resCmGigante.valido, false);
  assert.equal(resCmGigante.erro, 'A espessura informada é excessivamente grande.');
});

test('Volume de Concreto - 12. Formatação textual de resultado e avisos obrigatórios', () => {
  const res = calculate({
    tipoElemento: 'pilar_circular',
    quantidade: 2,
    diametro: 30,
    altura: 3,
    margemPerda: 10
  });

  const texto = formatResult(res);
  assert.match(texto, /Calculadora de Volume de Concreto/);
  assert.match(texto, /Volume total estimado/);
  assert.match(texto, /Volume em litros/);
  assert.match(texto, /não substitui projeto estrutural/i);
  assert.match(texto, /não desconta interseções ou sobreposições/i);
  assert.match(texto, /seção constante/i);
  assert.match(texto, /não uma recomendação técnica universal/i);
});

test('Volume de Concreto - 13. Verificação estrutural do arquivo HTML', () => {
  const htmlPath = path.join(ROOT_DIR, 'src', 'pages', 'tools', 'utilidades', 'volume-concreto.page.html');
  assert.ok(fs.existsSync(htmlPath), 'Arquivo HTML fonte deve existir');

  const content = fs.readFileSync(htmlPath, 'utf8');

  // Layout e scripts
  assert.match(content, /layout:\s*tool/);
  assert.match(content, /pageScripts:\s*<script type="module" src="{{ROOT_PREFIX}}js\/tools\/volume-concreto\.js"><\/script>/);

  // Semântica e acessibilidade
  assert.match(content, /<h1[^>]*>Calculadora de Volume de Concreto<\/h1>/);
  assert.match(content, /class="card tool-calculator-card"/);
  assert.match(content, /id="formVolumeConcreto"/);
  assert.match(content, /id="tipoElemento"/);
  assert.match(content, /id="margemPerda"/);
  assert.match(content, /min="0"\s+max="30"/);
  assert.match(content, /id="erroVolumeConcreto"[^>]*role="alert"/);
  assert.match(content, /id="resultadoVolumeConcreto"[^>]*aria-live="polite"/);

  // Ações de resultado
  assert.match(content, /id="copiarVolumeConcreto"/);
  assert.match(content, /id="compartilharVolumeConcreto"/);
  assert.match(content, /id="imprimirVolumeConcreto"/);
  assert.match(content, /id="statusVolumeConcreto"[^>]*role="status"/);

  // Sem estilos inline
  assert.doesNotMatch(content, /style\s*=/i, 'Não deve conter atributos style inline no HTML');
});

test('Volume de Concreto - 14. setupTool sem DOM não deve lançar erro', () => {
  assert.doesNotThrow(() => {
    setupTool();
  });
});

test('Volume de Concreto - 15. getResultSections estrutura dados, memória de cálculo e avisos', () => {
  const resInvalido = calculate({ tipoElemento: 'laje', comprimento: 0 });
  assert.deepEqual(getResultSections(resInvalido), []);
  assert.deepEqual(getResultSections(null), []);

  const resValido = calculate({
    tipoElemento: 'laje',
    comprimento: 6,
    largura: 4,
    espessura: 10,
    margemPerda: 10
  });

  const secoes = getResultSections(resValido);
  assert.ok(Array.isArray(secoes));
  assert.ok(secoes.length >= 7);

  const getLabel = (l) => secoes.find(s => s.label === l)?.value;
  assert.equal(getLabel('Estrutura'), 'Laje maciça');
  assert.equal(getLabel('Quantidade'), '1');
  assert.equal(getLabel('Volume base nominal'), '2,40 m³');
  assert.equal(getLabel('Margem de perdas'), '10% (0,24 m³)');
  assert.equal(getLabel('Volume total estimado'), '2,64 m³');
  assert.equal(getLabel('Volume em litros'), '2.640 L');
  assert.match(getLabel('Memória de cálculo'), /6 m × 4 m × \(10 cm ÷ 100\)/);

  const avisos = secoes.filter(s => s.label === 'Aviso importante').map(s => s.value);
  assert.ok(avisos.some(a => a.includes('não substitui projeto estrutural')));
  assert.ok(avisos.some(a => a.includes('não desconta interseções')));
});

class MockDomElement {
  constructor(tag = 'div') {
    this.tagName = tag.toUpperCase();
    this.value = '';
    this.textContent = '';
    this.hidden = false;
    this.disabled = false;
    this.children = [];
    this.attributes = new Map();
    this.listeners = new Map();
    this.dataset = {};
    this.style = {};
    this.parentNode = null;
  }

  focus() {}

  select() {}

  getAttribute(attr) {
    return this.attributes.get(attr) || null;
  }

  setAttribute(attr, val) {
    this.attributes.set(attr, String(val));
  }

  removeAttribute(attr) {
    this.attributes.delete(attr);
  }

  addEventListener(event, fn) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(fn);
  }

  async dispatchEvent(evt) {
    const type = typeof evt === 'string' ? evt : evt.type;
    const handlers = this.listeners.get(type) || [];
    for (const h of handlers) {
      await h(evt);
    }
  }

  async click() {
    await this.dispatchEvent({ type: 'click', preventDefault() {} });
  }

  appendChild(child) {
    child.parentNode = this;
    this.children.push(child);
    return child;
  }

  removeChild(child) {
    const index = this.children.indexOf(child);
    if (index !== -1) {
      this.children.splice(index, 1);
    }
    child.parentNode = null;
    return child;
  }

  reset() {
    this.value = '';
  }

  scrollIntoView() {}
}

function buildMockDom() {
  const elements = new Map();

  const getOrCreate = (id, tag = 'div') => {
    if (!elements.has(id)) {
      const el = new MockDomElement(tag);
      el.id = id;
      elements.set(id, el);
    }
    return elements.get(id);
  };

  const form = getOrCreate('formVolumeConcreto', 'form');
  const selectTipo = getOrCreate('tipoElemento', 'select');
  selectTipo.value = 'laje';

  const inputMargem = getOrCreate('margemPerda', 'input');
  inputMargem.value = '5';

  getOrCreate('camposLajePiso', 'div');
  getOrCreate('comprimentoLaje', 'input');
  getOrCreate('larguraLaje', 'input');
  getOrCreate('espessuraLaje', 'input');

  getOrCreate('camposViga', 'div');
  getOrCreate('quantidadeViga', 'input');
  getOrCreate('comprimentoViga', 'input');
  getOrCreate('larguraViga', 'input');
  getOrCreate('alturaViga', 'input');

  getOrCreate('camposPilarRetangular', 'div');
  getOrCreate('quantidadePilarRet', 'input');
  getOrCreate('lado1PilarRet', 'input');
  getOrCreate('lado2PilarRet', 'input');
  getOrCreate('alturaPilarRet', 'input');

  getOrCreate('camposPilarCircular', 'div');
  getOrCreate('quantidadePilarCirc', 'input');
  getOrCreate('diametroPilarCirc', 'input');
  getOrCreate('alturaPilarCirc', 'input');

  getOrCreate('limparVolumeConcreto', 'button');
  getOrCreate('copiarVolumeConcreto', 'button');
  getOrCreate('compartilharVolumeConcreto', 'button');
  getOrCreate('imprimirVolumeConcreto', 'button');

  getOrCreate('resultadoVolumeConcreto', 'section');
  getOrCreate('erroVolumeConcreto', 'p');
  getOrCreate('statusVolumeConcreto', 'p');

  getOrCreate('saidaVolumeTotal', 'strong');
  getOrCreate('saidaVolumeLitros', 'strong');
  getOrCreate('saidaVolumeBase', 'strong');
  getOrCreate('saidaVolumePerda', 'strong');
  getOrCreate('saidaMemoriaCalculo', 'span');
  getOrCreate('listaAvisosTecnicos', 'ul');

  const doc = {
    getElementById: (id) => elements.get(id) || null,
    querySelector: (sel) => elements.get(sel.replace(/^#/, '')) || null,
    createElement: (tag) => new MockDomElement(tag)
  };

  return { doc, elements };
}

test('Volume de Concreto - 16. Configuração de ações e vinculação dos eventos aos três botões', async () => {
  const { doc, elements } = buildMockDom();

  let clipboardText = null;
  let sharedData = null;
  let printExecuted = false;

  const originalNavigator = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
  const originalDocument = Object.getOwnPropertyDescriptor(globalThis, 'document');

  try {
    Object.defineProperty(globalThis, 'navigator', {
      configurable: true,
      value: {
        clipboard: {
          writeText: async (t) => { clipboardText = t; }
        },
        share: async (data) => { sharedData = data; }
      }
    });

    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: {
        location: {
          origin: 'https://www.calculadoramaster.com',
          href: 'https://www.calculadoramaster.com/tools/utilidades/volume-concreto.html'
        },
        print: () => { printExecuted = true; }
      }
    });

    Object.defineProperty(globalThis, 'document', {
      configurable: true,
      value: doc
    });

    const instance = setupTool(doc);
    assert.ok(instance, 'setupTool deve retornar objeto com métodos e referências');
    assert.ok(instance.actions, 'actions deve estar instanciado');
    assert.equal(typeof instance.actions.copy, 'function');
    assert.equal(typeof instance.actions.share, 'function');
    assert.equal(typeof instance.actions.print, 'function');
    assert.equal(typeof instance.actions.getText, 'function');

    // Botões antes de qualquer cálculo não devem disparar ações
    await elements.get('copiarVolumeConcreto').click();
    assert.equal(clipboardText, null);
    await elements.get('compartilharVolumeConcreto').click();
    assert.equal(sharedData, null);
    elements.get('imprimirVolumeConcreto').click();
    assert.equal(printExecuted, false);

    // Preenche e submete cálculo válido de laje
    elements.get('tipoElemento').value = 'laje';
    elements.get('margemPerda').value = '10';
    elements.get('comprimentoLaje').value = '6';
    elements.get('larguraLaje').value = '4';
    elements.get('espessuraLaje').value = '10';

    await elements.get('formVolumeConcreto').dispatchEvent({
      type: 'submit',
      preventDefault() {}
    });

    assert.equal(elements.get('resultadoVolumeConcreto').hidden, false);
    assert.match(elements.get('saidaVolumeTotal').textContent, /2,64 m³/);
    assert.match(elements.get('saidaVolumeLitros').textContent, /2\.640 L/);

    // 1. Clique em Copiar
    await elements.get('copiarVolumeConcreto').click();
    assert.ok(clipboardText, 'Conteúdo deve ter sido copiado para o clipboard');
    assert.match(clipboardText, /Calculadora de Volume de Concreto/);
    assert.match(clipboardText, /Estrutura: Laje maciça/);
    assert.match(clipboardText, /Volume total estimado: 2,64 m³/);
    assert.match(clipboardText, /Volume em litros: 2\.640 L/);
    assert.match(clipboardText, /Memória de cálculo: Laje: 6 m × 4 m × \(10 cm ÷ 100\) = 2,40 m³/);
    assert.doesNotMatch(clipboardText, /2\.4000000000000004/);
    assert.match(clipboardText, /não substitui projeto estrutural/i);
    assert.equal(elements.get('statusVolumeConcreto').textContent, 'Resultado copiado.');

    // 2. Clique em Compartilhar
    await elements.get('compartilharVolumeConcreto').click();
    assert.ok(sharedData, 'share deve ter sido executado');
    assert.equal(sharedData.url, 'https://www.calculadoramaster.com/tools/utilidades/volume-concreto.html');
    assert.match(sharedData.text, /Calculadora de Volume de Concreto/);
    assert.match(sharedData.text, /Volume total estimado: 2,64 m³/);
    assert.equal(elements.get('statusVolumeConcreto').textContent, 'Resultado compartilhado.');

    // 3. Clique em Imprimir
    elements.get('imprimirVolumeConcreto').click();
    assert.equal(printExecuted, true);
  } finally {
    if (originalNavigator) Object.defineProperty(globalThis, 'navigator', originalNavigator); else delete globalThis.navigator;
    if (originalWindow) Object.defineProperty(globalThis, 'window', originalWindow); else delete globalThis.window;
    if (originalDocument) Object.defineProperty(globalThis, 'document', originalDocument); else delete globalThis.document;
  }
});

test('Volume de Concreto - 17. Prevenção contra listeners duplicados se setupTool for chamado mais de uma vez', async () => {
  const { doc, elements } = buildMockDom();

  let copyCallCount = 0;

  const originalNavigator = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
  const originalDocument = Object.getOwnPropertyDescriptor(globalThis, 'document');

  try {
    Object.defineProperty(globalThis, 'navigator', {
      configurable: true,
      value: {
        clipboard: {
          writeText: async () => { copyCallCount++; }
        }
      }
    });

    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: {
        location: {
          origin: 'https://www.calculadoramaster.com',
          href: 'https://www.calculadoramaster.com/tools/utilidades/volume-concreto.html'
        }
      }
    });

    Object.defineProperty(globalThis, 'document', {
      configurable: true,
      value: doc
    });

    const inst1 = setupTool(doc);
    const inst2 = setupTool(doc);
    assert.equal(inst1, inst2, 'Chamadas subsequentes devem retornar a mesma instância sem duplicar');

    // Executa cálculo
    elements.get('comprimentoLaje').value = '5';
    elements.get('larguraLaje').value = '2';
    elements.get('espessuraLaje').value = '10';
    elements.get('margemPerda').value = '0';

    await elements.get('formVolumeConcreto').dispatchEvent({
      type: 'submit',
      preventDefault() {}
    });

    // Clica uma vez no botão de copiar
    await elements.get('copiarVolumeConcreto').click();
    assert.equal(copyCallCount, 1, 'Listener deve ser executado exatamente 1 vez por clique');
  } finally {
    if (originalNavigator) Object.defineProperty(globalThis, 'navigator', originalNavigator); else delete globalThis.navigator;
    if (originalWindow) Object.defineProperty(globalThis, 'window', originalWindow); else delete globalThis.window;
    if (originalDocument) Object.defineProperty(globalThis, 'document', originalDocument); else delete globalThis.document;
  }
});

test('Volume de Concreto - 18. Botão limpar reseta campos, esconde resultado e limpa status acessível', async () => {
  const { doc, elements } = buildMockDom();

  const originalDocument = Object.getOwnPropertyDescriptor(globalThis, 'document');
  try {
    Object.defineProperty(globalThis, 'document', {
      configurable: true,
      value: doc
    });

    setupTool(doc);

    // Simula cálculo
    elements.get('comprimentoLaje').value = '5';
    elements.get('larguraLaje').value = '2';
    elements.get('espessuraLaje').value = '10';

    await elements.get('formVolumeConcreto').dispatchEvent({
      type: 'submit',
      preventDefault() {}
    });

    elements.get('statusVolumeConcreto').textContent = 'Resultado copiado.';
    assert.equal(elements.get('resultadoVolumeConcreto').hidden, false);

    // Clica em limpar
    await elements.get('limparVolumeConcreto').click();

    assert.equal(elements.get('resultadoVolumeConcreto').hidden, true);
    assert.equal(elements.get('statusVolumeConcreto').textContent, '');
    assert.equal(elements.get('tipoElemento').value, DEFAULTS.tipoElemento);
    assert.equal(elements.get('margemPerda').value, String(DEFAULTS.margemPerda));
  } finally {
    if (originalDocument) Object.defineProperty(globalThis, 'document', originalDocument); else delete globalThis.document;
  }
});

test('Volume de Concreto - 19. Fallbacks de cópia e compartilhamento quando APIs nativas estão ausentes', async () => {
  const { doc, elements } = buildMockDom();

  let execCommandCmd = null;
  doc.execCommand = (cmd) => {
    execCommandCmd = cmd;
    return true;
  };
  doc.body = new MockDomElement('body');

  const originalNavigator = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
  const originalDocument = Object.getOwnPropertyDescriptor(globalThis, 'document');

  try {
    // Sem clipboard e sem share
    Object.defineProperty(globalThis, 'navigator', {
      configurable: true,
      value: {}
    });

    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: {
        location: {
          origin: 'https://www.calculadoramaster.com',
          href: 'https://www.calculadoramaster.com/tools/utilidades/volume-concreto.html'
        }
      }
    });

    Object.defineProperty(globalThis, 'document', {
      configurable: true,
      value: doc
    });

    setupTool(doc);

    elements.get('comprimentoLaje').value = '6';
    elements.get('larguraLaje').value = '4';
    elements.get('espessuraLaje').value = '10';
    elements.get('margemPerda').value = '5';

    await elements.get('formVolumeConcreto').dispatchEvent({
      type: 'submit',
      preventDefault() {}
    });

    // Teste de fallback do botão de cópia (textarea + execCommand)
    await elements.get('copiarVolumeConcreto').click();
    assert.equal(execCommandCmd, 'copy');
    assert.equal(elements.get('statusVolumeConcreto').textContent, 'Resultado copiado.');

    // Teste de fallback do botão de compartilhar (copia com mensagem de indisponibilidade)
    execCommandCmd = null;
    await elements.get('compartilharVolumeConcreto').click();
    assert.equal(execCommandCmd, 'copy');
    assert.equal(elements.get('statusVolumeConcreto').textContent, 'Compartilhamento indisponível. Resultado copiado.');
  } finally {
    if (originalNavigator) Object.defineProperty(globalThis, 'navigator', originalNavigator); else delete globalThis.navigator;
    if (originalWindow) Object.defineProperty(globalThis, 'window', originalWindow); else delete globalThis.window;
    if (originalDocument) Object.defineProperty(globalThis, 'document', originalDocument); else delete globalThis.document;
  }
});

test('Volume de Concreto - 20. Formatação da memória de cálculo em pt-BR sem resíduos de ponto flutuante', () => {
  // Caso 1: Laje com imprecisão clássica IEEE 754 (6 * 4 * 0.1 = 2.4000000000000004)
  const resLaje = calculate({
    tipoElemento: 'laje',
    comprimento: 6,
    largura: 4,
    espessura: 10,
    margemPerda: 10
  });

  // A precisão integral interna nos cálculos DEVE ser rigorosamente mantida:
  assert.equal(resLaje.volumeBase, 2.4000000000000004);
  assertApprox(resLaje.volumeTotal, 2.64);
  assertApprox(resLaje.volumeLitros, 2640);

  // A memória de cálculo DEVE ser formatada em pt-BR sem resíduos de ponto flutuante:
  assert.equal(resLaje.memoriaCalculo, 'Laje: 6 m × 4 m × (10 cm ÷ 100) = 2,40 m³');
  assert.doesNotMatch(resLaje.memoriaCalculo, /2\.4000000000000004/);
  assert.doesNotMatch(resLaje.memoriaCalculo, /\d+\.\d{4,}/);

  // Formato textual e seções para cópia/compartilhamento também devem exibir a formatação tratada:
  const textoFormatado = formatResult(resLaje);
  assert.match(textoFormatado, /Memória de cálculo: Laje: 6 m × 4 m × \(10 cm ÷ 100\) = 2,40 m³/);
  assert.doesNotMatch(textoFormatado, /2\.4000000000000004/);

  const secoes = getResultSections(resLaje);
  const secaoMemoria = secoes.find(s => s.label === 'Memória de cálculo');
  assert.ok(secaoMemoria);
  assert.equal(secaoMemoria.value, 'Laje: 6 m × 4 m × (10 cm ÷ 100) = 2,40 m³');

  // Caso 2: Peça cilíndrica com PI
  const resCil = calculate({
    tipoElemento: 'pilar_circular',
    quantidade: 2,
    diametro: 30,
    altura: 3,
    margemPerda: 10
  });
  assert.equal(resCil.memoriaCalculo, '2 peças × [π × (30 cm ÷ 200)² × 3 m] = 0,424 m³');
  assert.doesNotMatch(resCil.memoriaCalculo, /0\.4241/);
});

test('Volume de Concreto - 21. URL compartilhada é estritamente a URL canônica de produção mesmo em servidor local', async () => {
  const { doc, elements } = buildMockDom();

  let sharedPayload = null;

  const originalNavigator = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
  const originalDocument = Object.getOwnPropertyDescriptor(globalThis, 'document');

  try {
    Object.defineProperty(globalThis, 'navigator', {
      configurable: true,
      value: {
        share: async (p) => { sharedPayload = p; }
      }
    });

    // Simula navegador aberto em porta local de teste / ambiente de desenvolvimento
    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: {
        location: {
          origin: 'http://127.0.0.1:42985',
          href: 'http://127.0.0.1:42985/tools/utilidades/volume-concreto.html'
        }
      }
    });

    Object.defineProperty(globalThis, 'document', {
      configurable: true,
      value: doc
    });

    setupTool(doc);

    assert.equal(CANONICAL_URL, 'https://www.calculadoramaster.com/tools/utilidades/volume-concreto.html');

    elements.get('comprimentoLaje').value = '6';
    elements.get('larguraLaje').value = '4';
    elements.get('espessuraLaje').value = '10';

    await elements.get('formVolumeConcreto').dispatchEvent({
      type: 'submit',
      preventDefault() {}
    });

    await elements.get('compartilharVolumeConcreto').click();

    assert.ok(sharedPayload, 'navigator.share deve ter sido chamado');
    // Deve ignorar http://127.0.0.1:42985 e enviar a URL canônica exata de produção:
    assert.equal(sharedPayload.url, 'https://www.calculadoramaster.com/tools/utilidades/volume-concreto.html');
    assert.doesNotMatch(sharedPayload.url, /127\.0\.0\.1/);
    assert.doesNotMatch(sharedPayload.url, /localhost/);
  } finally {
    if (originalNavigator) Object.defineProperty(globalThis, 'navigator', originalNavigator); else delete globalThis.navigator;
    if (originalWindow) Object.defineProperty(globalThis, 'window', originalWindow); else delete globalThis.window;
    if (originalDocument) Object.defineProperty(globalThis, 'document', originalDocument); else delete globalThis.document;
  }
});
