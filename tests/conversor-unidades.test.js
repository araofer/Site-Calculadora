import { test, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  CATEGORIES,
  parseFlexibleNumber,
  formatUnitNumber,
  convertUnits,
  setupTool
} from '../js/tools/conversor-unidades.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');
const PAGE_PATH = path.join(ROOT_DIR, 'src', 'pages', 'tools', 'utilidades', 'conversor-unidades.page.html');

describe('Conversor de Unidades - Suíte de Testes', () => {

  describe('1. Casos de referência fundamentais da especificação', () => {
    it('1 km = 1.000 m (Comprimento)', () => {
      const res = convertUnits({ category: 'comprimento', value: 1, fromUnit: 'km', toUnit: 'm' });
      assert.equal(res.ok, true);
      assert.equal(res.data.resultValue, 1000);
      assert.equal(res.data.formattedResult, '1.000');
    });

    it('1 milha internacional = 1.609,344 m (Comprimento)', () => {
      const res = convertUnits({ category: 'comprimento', value: 1, fromUnit: 'mi', toUnit: 'm' });
      assert.equal(res.ok, true);
      assert.equal(res.data.resultValue, 1609.344);
      assert.equal(res.data.formattedResult, '1.609,344');
    });

    it('1 kg = 1.000 g (Massa)', () => {
      const res = convertUnits({ category: 'massa', value: 1, fromUnit: 'kg', toUnit: 'g' });
      assert.equal(res.ok, true);
      assert.equal(res.data.resultValue, 1000);
      assert.equal(res.data.formattedResult, '1.000');
    });

    it('1 libra internacional = 0,45359237 kg (Massa)', () => {
      const res = convertUnits({ category: 'massa', value: 1, fromUnit: 'lb', toUnit: 'kg' });
      assert.equal(res.ok, true);
      assert.equal(res.data.resultValue, 0.45359237);
      assert.equal(res.data.formattedResult, '0,45359237');
    });

    it('1 hectare = 10.000 m² (Área)', () => {
      const res = convertUnits({ category: 'area', value: 1, fromUnit: 'ha', toUnit: 'm2' });
      assert.equal(res.ok, true);
      assert.equal(res.data.resultValue, 10000);
      assert.equal(res.data.formattedResult, '10.000');
    });

    it('1 L = 1.000 mL (Volume)', () => {
      const res = convertUnits({ category: 'volume', value: 1, fromUnit: 'l', toUnit: 'ml' });
      assert.equal(res.ok, true);
      assert.equal(res.data.resultValue, 1000);
      assert.equal(res.data.formattedResult, '1.000');
    });

    it('1 galão líquido americano = 3,785411784 L (Volume)', () => {
      const res = convertUnits({ category: 'volume', value: 1, fromUnit: 'us_gal', toUnit: 'l' });
      assert.equal(res.ok, true);
      assert.equal(res.data.resultValue, 3.785411784);
      assert.equal(res.data.formattedResult, '3,785411784');
    });

    it('36 km/h = 10 m/s (Velocidade)', () => {
      const res = convertUnits({ category: 'velocidade', value: 36, fromUnit: 'km_h', toUnit: 'm_s' });
      assert.equal(res.ok, true);
      assert.equal(res.data.resultValue, 10);
      assert.equal(res.data.formattedResult, '10');
    });

    it('0 °C = 32 °F (Temperatura)', () => {
      const res = convertUnits({ category: 'temperatura', value: 0, fromUnit: 'c', toUnit: 'f' });
      assert.equal(res.ok, true);
      assert.equal(res.data.resultValue, 32);
      assert.equal(res.data.formattedResult, '32');
    });

    it('100 °C = 212 °F (Temperatura)', () => {
      const res = convertUnits({ category: 'temperatura', value: 100, fromUnit: 'c', toUnit: 'f' });
      assert.equal(res.ok, true);
      assert.equal(res.data.resultValue, 212);
      assert.equal(res.data.formattedResult, '212');
    });

    it('0 °C = 273,15 K (Temperatura)', () => {
      const res = convertUnits({ category: 'temperatura', value: 0, fromUnit: 'c', toUnit: 'k' });
      assert.equal(res.ok, true);
      assert.equal(res.data.resultValue, 273.15);
      assert.equal(res.data.formattedResult, '273,15');
    });

    it('-40 °C = -40 °F (Ponto de encontro das escalas)', () => {
      const resCtoF = convertUnits({ category: 'temperatura', value: -40, fromUnit: 'c', toUnit: 'f' });
      assert.equal(resCtoF.ok, true);
      assert.equal(resCtoF.data.resultValue, -40);
      assert.equal(resCtoF.data.formattedResult, '-40');

      const resFtoC = convertUnits({ category: 'temperatura', value: -40, fromUnit: 'f', toUnit: 'c' });
      assert.equal(resFtoC.ok, true);
      assert.equal(resFtoC.data.resultValue, -40);
      assert.equal(resFtoC.data.formattedResult, '-40');
    });
  });

  describe('2. Testes de cobertura por categoria', () => {
    it('Comprimento: jardas, pés e polegadas', () => {
      // 1 jarda = 3 pés = 36 polegadas
      const ydToFt = convertUnits({ category: 'comprimento', value: 1, fromUnit: 'yd', toUnit: 'ft' });
      assert.equal(ydToFt.ok, true);
      assert.ok(Math.abs(ydToFt.data.resultValue - 3) < 1e-9);

      const ftToIn = convertUnits({ category: 'comprimento', value: 1, fromUnit: 'ft', toUnit: 'in' });
      assert.equal(ftToIn.ok, true);
      assert.ok(Math.abs(ftToIn.data.resultValue - 12) < 1e-9);

      const inToCm = convertUnits({ category: 'comprimento', value: 1, fromUnit: 'in', toUnit: 'cm' });
      assert.equal(inToCm.ok, true);
      assert.equal(inToCm.data.resultValue, 2.54);
    });

    it('Massa: tonelada métrica e onça', () => {
      const tToKg = convertUnits({ category: 'massa', value: 1, fromUnit: 't', toUnit: 'kg' });
      assert.equal(tToKg.ok, true);
      assert.equal(tToKg.data.resultValue, 1000);

      const lbToOz = convertUnits({ category: 'massa', value: 1, fromUnit: 'lb', toUnit: 'oz' });
      assert.equal(lbToOz.ok, true);
      assert.ok(Math.abs(lbToOz.data.resultValue - 16) < 1e-9);

      const gToMg = convertUnits({ category: 'massa', value: 1, fromUnit: 'g', toUnit: 'mg' });
      assert.equal(gToMg.ok, true);
      assert.ok(Math.abs(gToMg.data.resultValue - 1000) < 1e-9);
      assert.equal(gToMg.data.formattedResult, '1.000');
    });

    it('Temperatura: Kelvin para Fahrenheit e Celsius', () => {
      const kToC = convertUnits({ category: 'temperatura', value: 373.15, fromUnit: 'k', toUnit: 'c' });
      assert.equal(kToC.ok, true);
      assert.ok(Math.abs(kToC.data.resultValue - 100) < 1e-9);

      const kToF = convertUnits({ category: 'temperatura', value: 273.15, fromUnit: 'k', toUnit: 'f' });
      assert.equal(kToF.ok, true);
      assert.ok(Math.abs(kToF.data.resultValue - 32) < 1e-9);
    });

    it('Área: acre, pé quadrado e quilômetro quadrado', () => {
      // 1 acre = 43.560 sq ft
      const acToFt2 = convertUnits({ category: 'area', value: 1, fromUnit: 'ac', toUnit: 'ft2' });
      assert.equal(acToFt2.ok, true);
      assert.ok(Math.abs(acToFt2.data.resultValue - 43560) < 1e-6);

      // 1 km² = 100 ha
      const km2ToHa = convertUnits({ category: 'area', value: 1, fromUnit: 'km2', toUnit: 'ha' });
      assert.equal(km2ToHa.ok, true);
      assert.equal(km2ToHa.data.resultValue, 100);
    });

    it('Volume: xícara americana e quarto americano', () => {
      // 1 US gal = 4 US qt = 16 US cup
      const galToQt = convertUnits({ category: 'volume', value: 1, fromUnit: 'us_gal', toUnit: 'us_qt' });
      assert.equal(galToQt.ok, true);
      assert.equal(galToQt.data.resultValue, 4);

      const galToCup = convertUnits({ category: 'volume', value: 1, fromUnit: 'us_gal', toUnit: 'us_cup' });
      assert.equal(galToCup.ok, true);
      assert.equal(galToCup.data.resultValue, 16);

      // 1 m³ = 1000 L
      const m3ToL = convertUnits({ category: 'volume', value: 2.5, fromUnit: 'm3', toUnit: 'l' });
      assert.equal(m3ToL.ok, true);
      assert.equal(m3ToL.data.resultValue, 2500);
    });

    it('Velocidade: nós, milhas por hora e pés por segundo', () => {
      // 1 nó = 1.852 km/h
      const knToKmh = convertUnits({ category: 'velocidade', value: 1, fromUnit: 'kn', toUnit: 'km_h' });
      assert.equal(knToKmh.ok, true);
      assert.ok(Math.abs(knToKmh.data.resultValue - 1.852) < 1e-9);

      // 60 mph em ft/s: 60 * 5280 / 3600 = 88 ft/s
      const mphToFts = convertUnits({ category: 'velocidade', value: 60, fromUnit: 'mph', toUnit: 'ft_s' });
      assert.equal(mphToFts.ok, true);
      assert.ok(Math.abs(mphToFts.data.resultValue - 88) < 1e-9);
    });
  });

  describe('3. Conversões de grandezas muito diferentes (escalas extremas)', () => {
    it('Milímetro para Quilômetro (fator 1.000.000)', () => {
      const res = convertUnits({ category: 'comprimento', value: 5000000, fromUnit: 'mm', toUnit: 'km' });
      assert.equal(res.ok, true);
      assert.equal(res.data.resultValue, 5);
      assert.equal(res.data.formattedResult, '5');
    });

    it('Miligrama para Tonelada (fator 10^9)', () => {
      const res = convertUnits({ category: 'massa', value: 1e9, fromUnit: 'mg', toUnit: 't' });
      assert.equal(res.ok, true);
      assert.equal(res.data.resultValue, 1);
      assert.equal(res.data.formattedResult, '1');
    });

    it('Milímetro quadrado para Quilômetro quadrado (fator 10^12)', () => {
      const res = convertUnits({ category: 'area', value: 2e12, fromUnit: 'mm2', toUnit: 'km2' });
      assert.equal(res.ok, true);
      assert.equal(res.data.resultValue, 2);
      assert.equal(res.data.formattedResult, '2');
    });
  });

  describe('4. Conversão da mesma unidade para ela mesma', () => {
    it('Preserva o valor idêntico sem alterações em todas as categorias', () => {
      const cases = [
        { category: 'comprimento', unit: 'm', val: 42.5 },
        { category: 'massa', unit: 'kg', val: 78.2 },
        { category: 'temperatura', unit: 'c', val: 25 },
        { category: 'temperatura', unit: 'f', val: -10 },
        { category: 'area', unit: 'ha', val: 12.34 },
        { category: 'volume', unit: 'l', val: 5 },
        { category: 'velocidade', unit: 'km_h', val: 120 }
      ];

      for (const c of cases) {
        const res = convertUnits({ category: c.category, value: c.val, fromUnit: c.unit, toUnit: c.unit });
        assert.equal(res.ok, true, `Falha em ${c.category} mesma unidade`);
        assert.equal(res.data.resultValue, c.val);
      }
    });
  });

  describe('5. Conversões de ida e volta (roundtrip) com tolerância numérica', () => {
    it('Ida e volta preserva valor original em todas as unidades', () => {
      const roundtrips = [
        { category: 'comprimento', from: 'km', to: 'mi', val: 100 },
        { category: 'comprimento', from: 'in', to: 'mm', val: 25.4 },
        { category: 'massa', from: 'kg', to: 'lb', val: 75 },
        { category: 'massa', from: 'oz', to: 'g', val: 16 },
        { category: 'temperatura', from: 'c', to: 'f', val: 36.5 },
        { category: 'temperatura', from: 'f', to: 'k', val: 72 },
        { category: 'area', from: 'm2', to: 'ft2', val: 120 },
        { category: 'area', from: 'ac', to: 'ha', val: 50 },
        { category: 'volume', from: 'l', to: 'us_gal', val: 20 },
        { category: 'volume', from: 'us_cup', to: 'ml', val: 4 },
        { category: 'velocidade', from: 'km_h', to: 'mph', val: 100 },
        { category: 'velocidade', from: 'kn', to: 'm_s', val: 25 }
      ];

      for (const item of roundtrips) {
        const step1 = convertUnits({ category: item.category, value: item.val, fromUnit: item.from, toUnit: item.to });
        assert.equal(step1.ok, true, `Erro no passo 1 de ${item.category}`);

        const step2 = convertUnits({ category: item.category, value: step1.data.resultValue, fromUnit: item.to, toUnit: item.from });
        assert.equal(step2.ok, true, `Erro no passo 2 de ${item.category}`);

        const diff = Math.abs(step2.data.resultValue - item.val);
        assert.ok(diff < 1e-8, `Divergência roundtrip em ${item.category}: ${diff}`);
      }
    });
  });

  describe('6. Temperaturas de referência e limites físicos (zero absoluto)', () => {
    it('Aceita temperaturas negativas válidas', () => {
      const resNegC = convertUnits({ category: 'temperatura', value: -15, fromUnit: 'c', toUnit: 'f' });
      assert.equal(resNegC.ok, true);
      assert.equal(resNegC.data.resultValue, 5);

      const resNegF = convertUnits({ category: 'temperatura', value: -4, fromUnit: 'f', toUnit: 'c' });
      assert.equal(resNegF.ok, true);
      assert.equal(resNegF.data.resultValue, -20);
    });

    it('Aceita o zero absoluto exato em Celsius, Fahrenheit e Kelvin', () => {
      // 0 K
      const k0 = convertUnits({ category: 'temperatura', value: 0, fromUnit: 'k', toUnit: 'c' });
      assert.equal(k0.ok, true);
      assert.equal(k0.data.resultValue, -273.15);

      // -273.15 °C
      const cAbs = convertUnits({ category: 'temperatura', value: -273.15, fromUnit: 'c', toUnit: 'k' });
      assert.equal(cAbs.ok, true);
      assert.equal(cAbs.data.resultValue, 0);

      // -459.67 °F
      const fAbs = convertUnits({ category: 'temperatura', value: -459.67, fromUnit: 'f', toUnit: 'k' });
      assert.equal(fAbs.ok, true);
      assert.ok(Math.abs(fAbs.data.resultValue) < 1e-6);
    });

    it('Rejeita temperaturas abaixo do zero absoluto', () => {
      const cInf = convertUnits({ category: 'temperatura', value: -273.16, fromUnit: 'c', toUnit: 'f' });
      assert.equal(cInf.ok, false);
      assert.match(cInf.errors[0], /zero absoluto/i);

      const kInf = convertUnits({ category: 'temperatura', value: -0.1, fromUnit: 'k', toUnit: 'c' });
      assert.equal(kInf.ok, false);
      assert.match(kInf.errors[0], /zero absoluto/i);

      const fInf = convertUnits({ category: 'temperatura', value: -459.68, fromUnit: 'f', toUnit: 'c' });
      assert.equal(fInf.ok, false);
      assert.match(fInf.errors[0], /zero absoluto/i);
    });
  });

  describe('7. Validações de entradas inválidas, negativas, vazias e limites', () => {
    it('Rejeita valor vazio ou em branco', () => {
      const r1 = convertUnits({ category: 'comprimento', value: '', fromUnit: 'm', toUnit: 'km' });
      assert.equal(r1.ok, false);
      assert.match(r1.errors[0], /informe o valor/i);

      const r2 = convertUnits({ category: 'comprimento', value: '   ', fromUnit: 'm', toUnit: 'km' });
      assert.equal(r2.ok, false);
      assert.match(r2.errors[0], /informe o valor/i);
    });

    it('Rejeita valores não numéricos', () => {
      const r = convertUnits({ category: 'comprimento', value: 'abc', fromUnit: 'm', toUnit: 'km' });
      assert.equal(r.ok, false);
      assert.match(r.errors[0], /valor numérico válido/i);
    });

    it('Rejeita valores negativos em grandezas não-negativas', () => {
      const cats = ['comprimento', 'massa', 'area', 'volume', 'velocidade'];
      for (const cat of cats) {
        const u = Object.keys(CATEGORIES[cat].units)[0];
        const res = convertUnits({ category: cat, value: -5, fromUnit: u, toUnit: u });
        assert.equal(res.ok, false, `Deveria rejeitar negativo em ${cat}`);
        assert.match(res.errors[0], /não pode ser negativo/i);
      }
    });

    it('Aceita zero perfeitamente para grandezas não-negativas', () => {
      const res = convertUnits({ category: 'comprimento', value: 0, fromUnit: 'km', toUnit: 'm' });
      assert.equal(res.ok, true);
      assert.equal(res.data.resultValue, 0);
      assert.equal(res.data.formattedResult, '0');
    });

    it('Rejeita overflow numérico acima de 1e20', () => {
      const res = convertUnits({ category: 'comprimento', value: '1e25', fromUnit: 'm', toUnit: 'km' });
      assert.equal(res.ok, false);
      assert.match(res.errors[0], /limites de cálculo suportados/i);
    });

    it('Rejeita categoria ou unidade inexistente', () => {
      const rCat = convertUnits({ category: 'inexistente', value: 10, fromUnit: 'm', toUnit: 'km' });
      assert.equal(rCat.ok, false);
      assert.match(rCat.errors[0], /categoria/i);

      const rUnit = convertUnits({ category: 'comprimento', value: 10, fromUnit: 'xpto', toUnit: 'km' });
      assert.equal(rUnit.ok, false);
      assert.match(rUnit.errors[0], /unidades de origem e destino válidas/i);
    });
  });

  describe('8. Separador decimal brasileiro e parsing flexível', () => {
    it('Suporta vírgula como separador decimal', () => {
      const res = convertUnits({ category: 'comprimento', value: '1,5', fromUnit: 'km', toUnit: 'm' });
      assert.equal(res.ok, true);
      assert.equal(res.data.resultValue, 1500);
      assert.equal(res.data.formattedResult, '1.500');
    });

    it('Suporta milhar com ponto e decimal com vírgula (pt-BR)', () => {
      const res = convertUnits({ category: 'massa', value: '1.250,5', fromUnit: 'kg', toUnit: 'g' });
      assert.equal(res.ok, true);
      assert.equal(res.data.resultValue, 1250500);
      assert.equal(res.data.formattedResult, '1.250.500');
    });

    it('parseFlexibleNumber retorna null para vazios e NaN para strings corrompidas', () => {
      assert.equal(parseFlexibleNumber(null), null);
      assert.equal(parseFlexibleNumber(''), null);
      assert.equal(Number.isNaN(parseFlexibleNumber('12.34.56')), true);
    });
  });

  describe('9. Formatação e ausência de NaN e Infinity', () => {
    it('Nunca produz NaN ou Infinity em formatações', () => {
      assert.equal(formatUnitNumber(NaN), '');
      assert.equal(formatUnitNumber(Infinity), '');
      assert.equal(formatUnitNumber(-Infinity), '');
      assert.equal(formatUnitNumber(0), '0');
    });

    it('Formata números com decimais úteis sem zeros à direita desnecessários', () => {
      assert.equal(formatUnitNumber(10.0), '10');
      assert.equal(formatUnitNumber(10.5), '10,5');
      assert.equal(formatUnitNumber(1234.56), '1.234,56');
    });
  });

  describe('10. Teste de conformidade HTML, Layout e Acessibilidade da página fonte', () => {
    it('A página fonte existe e contém frontmatter canônico e layout correto', () => {
      assert.ok(fs.existsSync(PAGE_PATH), 'Arquivo de página fonte deve existir no disco');
      const html = fs.readFileSync(PAGE_PATH, 'utf-8');

      assert.match(html, /layout:\s*tool/);
      assert.match(html, /canonical:\s*https:\/\/www\.calculadoramaster\.com\/tools\/utilidades\/conversor-unidades\.html/);
      assert.match(html, /pageScripts:\s*<script type="module" src="\{\{ROOT_PREFIX\}\}js\/tools\/conversor-unidades\.js"><\/script>/);
      assert.match(html, /<h1>Conversor de Unidades<\/h1>/);
      assert.match(html, /id="formConversorUnidades"/);
      assert.match(html, /id="categoriaConversor"/);
      assert.match(html, /id="valorOrigem"/);
      assert.match(html, /id="unidadeOrigem"/);
      assert.match(html, /id="unidadeDestino"/);
      assert.match(html, /id="btnInverter"/);
      assert.match(html, /id="btnConverter"/);
      assert.match(html, /id="btnLimpar"/);
      assert.match(html, /id="erroConversor"[^>]*role="alert"/);
      assert.match(html, /id="resultadoConversor"[^>]*aria-live="polite"/);
      assert.match(html, /id="btnCopiar"/);
      assert.match(html, /id="btnCompartilhar"/);
      assert.match(html, /id="btnImprimir"/);
      assert.match(html, /id="statusConversor"/);
    });
  });

  describe('11. Teste de interface DOM (setupTool, inversão, troca de categoria e limpeza)', () => {
    function createMockDom() {
      const listeners = new Map();
      const elements = {};

      function makeEl(id, tagName = 'div') {
        const el = {
          id,
          tagName: tagName.toUpperCase(),
          value: '',
          textContent: '',
          hidden: false,
          children: [],
          options: [],
          _innerHTML: '',
          set innerHTML(val) {
            this._innerHTML = val;
            if (val === '') {
              this.children = [];
              this.options = [];
            }
          },
          get innerHTML() {
            return this._innerHTML;
          },
          appendChild(child) {
            this.children.push(child);
            this.options.push(child);
          },
          addEventListener(evt, fn) {
            if (!listeners.has(`${id}:${evt}`)) {
              listeners.set(`${id}:${evt}`, []);
            }
            listeners.get(`${id}:${evt}`).push(fn);
          },
          async dispatch(evt, evData = {}) {
            const handlers = listeners.get(`${id}:${evt}`) || [];
            for (const fn of handlers) {
              await fn({ preventDefault() {}, ...evData });
            }
          },
          reset() {
            this.value = '';
          }
        };
        elements[id] = el;
        return el;
      }

      makeEl('formConversorUnidades', 'form');
      const catEl = makeEl('categoriaConversor', 'select');
      catEl.value = 'comprimento';
      makeEl('valorOrigem', 'input');
      makeEl('unidadeOrigem', 'select');
      makeEl('unidadeDestino', 'select');
      makeEl('btnInverter', 'button');
      makeEl('btnConverter', 'button');
      makeEl('btnLimpar', 'button');
      makeEl('erroConversor', 'p');
      makeEl('resultadoConversor', 'section');
      makeEl('valorConvertidoResultado', 'strong');
      makeEl('detalheConversaoResultado', 'p');
      makeEl('formulaConversaoResultado', 'p');
      makeEl('btnCopiar', 'button');
      makeEl('btnCompartilhar', 'button');
      makeEl('btnImprimir', 'button');
      makeEl('statusConversor', 'p');

      const doc = {
        getElementById(id) {
          return elements[id] || null;
        },
        createElement(tag) {
          return {
            tagName: tag.toUpperCase(),
            value: '',
            textContent: ''
          };
        }
      };

      return { doc, elements };
    }

    it('Inicializa selects de unidades e popula com opções de comprimento', () => {
      const { doc, elements } = createMockDom();
      setupTool(doc);

      assert.ok(elements.unidadeOrigem.options.length >= 8);
      assert.ok(elements.unidadeDestino.options.length >= 8);
      assert.equal(elements.unidadeOrigem.value, 'km');
      assert.equal(elements.unidadeDestino.value, 'm');
    });

    it('Troca de categoria atualiza as opções de unidade dinamicamente', async () => {
      const { doc, elements } = createMockDom();
      setupTool(doc);

      elements.categoriaConversor.value = 'temperatura';
      await elements.categoriaConversor.dispatch('change');

      assert.equal(elements.unidadeOrigem.options.length, 3);
      assert.equal(elements.unidadeDestino.options.length, 3);
      assert.equal(elements.unidadeOrigem.value, 'c');
      assert.equal(elements.unidadeDestino.value, 'f');
    });

    it('Executa cálculo com sucesso ao enviar o formulário', async () => {
      const { doc, elements } = createMockDom();
      setupTool(doc);

      elements.categoriaConversor.value = 'comprimento';
      elements.valorOrigem.value = '5';
      elements.unidadeOrigem.value = 'km';
      elements.unidadeDestino.value = 'm';

      await elements.formConversorUnidades.dispatch('submit');

      assert.equal(elements.erroConversor.hidden, true);
      assert.equal(elements.resultadoConversor.hidden, false);
      assert.equal(elements.valorConvertidoResultado.textContent, '5.000 m');
      assert.equal(elements.btnCopiar.hidden, false);
    });

    it('Botão inverter troca as unidades de origem e destino e recalcula', async () => {
      const { doc, elements } = createMockDom();
      setupTool(doc);

      elements.categoriaConversor.value = 'comprimento';
      elements.valorOrigem.value = '5';
      elements.unidadeOrigem.value = 'km';
      elements.unidadeDestino.value = 'm';

      await elements.formConversorUnidades.dispatch('submit');
      assert.equal(elements.valorConvertidoResultado.textContent, '5.000 m');

      // Clica em inverter
      await elements.btnInverter.dispatch('click');
      assert.equal(elements.unidadeOrigem.value, 'm');
      assert.equal(elements.unidadeDestino.value, 'km');
      assert.equal(elements.valorConvertidoResultado.textContent, '0,005 km');
    });

    it('Botão limpar reverte o formulário para o estado inicial limpo', async () => {
      const { doc, elements } = createMockDom();
      setupTool(doc);

      elements.valorOrigem.value = '100';
      await elements.formConversorUnidades.dispatch('submit');
      assert.equal(elements.resultadoConversor.hidden, false);

      await elements.btnLimpar.dispatch('click');
      assert.equal(elements.resultadoConversor.hidden, true);
      assert.equal(elements.erroConversor.hidden, true);
      assert.equal(elements.btnCopiar.hidden, true);
    });

    it('Exibe mensagem de erro acessível para valor inválido', async () => {
      const { doc, elements } = createMockDom();
      setupTool(doc);

      elements.valorOrigem.value = '';
      await elements.formConversorUnidades.dispatch('submit');

      assert.equal(elements.erroConversor.hidden, false);
      assert.match(elements.erroConversor.textContent, /informe o valor/i);
      assert.equal(elements.resultadoConversor.hidden, true);
    });
  });
});
