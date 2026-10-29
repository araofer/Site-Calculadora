import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateBmrMifflinStJeor,
  calculateBmrHarrisBenedict,
  calculateBmrKatchMcArdle,
  calculateBmr,
  buildCopyText,
  formatResult,
  parseNumberLocale,
  setupTool,
  LIMITES,
  NIVEIS_ATIVIDADE
} from '../js/tools/metabolismo-basal.js';

test('1. parseNumberLocale: conversão correta de formatos pt-BR e ponto', () => {
  assert.equal(parseNumberLocale('70,5'), 70.5);
  assert.equal(parseNumberLocale('175.5'), 175.5);
  assert.equal(parseNumberLocale('1.750,25'), 1750.25);
  assert.equal(parseNumberLocale('80'), 80);
  assert.equal(parseNumberLocale(65.5), 65.5);
  assert.ok(Number.isNaN(parseNumberLocale('')));
  assert.ok(Number.isNaN(parseNumberLocale('abc')));
  assert.ok(Number.isNaN(parseNumberLocale(null)));
});

test('2. Equação de Mifflin-St Jeor: casos de referência conhecidos', () => {
  // Homem: 30 anos, 80 kg, 180 cm
  // TMB = (10 * 80) + (6.25 * 180) - (5 * 30) + 5 = 800 + 1125 - 150 + 5 = 1780 kcal
  const h = calculateBmrMifflinStJeor({ sex: 'm', weightKg: 80, heightCm: 180, ageYears: 30 });
  assert.equal(h, 1780);

  // Mulher: 28 anos, 60 kg, 165 cm
  // TMB = (10 * 60) + (6.25 * 165) - (5 * 28) - 161 = 600 + 1031.25 - 140 - 161 = 1330.25 kcal
  const m = calculateBmrMifflinStJeor({ sex: 'f', weightKg: 60, heightCm: 165, ageYears: 28 });
  assert.equal(m, 1330.25);
});

test('3. Equação de Harris-Benedict Revisada: precisão das constantes Roza & Shizgal', () => {
  // Homem: 80 kg, 180 cm, 30 anos
  // 88.362 + (13.397 * 80) + (4.799 * 180) - (5.677 * 30)
  // 88.362 + 1071.76 + 863.82 - 170.31 = 1853.632
  const h = calculateBmrHarrisBenedict({ sex: 'm', weightKg: 80, heightCm: 180, ageYears: 30 });
  assert.ok(Math.abs(h - 1853.632) < 0.001);

  // Mulher: 60 kg, 165 cm, 28 anos
  // 447.593 + (9.247 * 60) + (3.098 * 165) - (4.330 * 28)
  // 447.593 + 554.82 + 511.17 - 121.24 = 1392.343
  const m = calculateBmrHarrisBenedict({ sex: 'f', weightKg: 60, heightCm: 165, ageYears: 28 });
  assert.ok(Math.abs(m - 1392.343) < 0.001);
});

test('4. Equação de Katch-McArdle: baseada na massa magra', () => {
  // Pessoa de 70 kg com 20% de gordura corporal
  // LBM = 70 * (1 - 0.20) = 56 kg
  // TMB = 370 + (21.6 * 56) = 370 + 1209.6 = 1579.6 kcal
  const k = calculateBmrKatchMcArdle({ weightKg: 70, bodyFatPercent: 20 });
  assert.ok(Math.abs(k - 1579.6) < 0.001);
});

test('5. calculateBmr: validação estrita de sexo, limites de idade, peso e altura', () => {
  // Sexo inválido
  assert.equal(calculateBmr({ sexo: 'x', idade: 25, peso: 70, altura: 170 }).ok, false);

  // Idade fora dos limites (mín 18, máx 120 para fórmulas adultas)
  assert.equal(calculateBmr({ sexo: 'm', idade: 17, peso: 70, altura: 170 }).ok, false);
  assert.equal(calculateBmr({ sexo: 'm', idade: 18, peso: 70, altura: 170 }).ok, true);
  assert.equal(calculateBmr({ sexo: 'm', idade: 121, peso: 70, altura: 170 }).ok, false);

  // Peso fora dos limites (mín 20, máx 350)
  assert.equal(calculateBmr({ sexo: 'f', idade: 25, peso: 19, altura: 160 }).ok, false);
  assert.equal(calculateBmr({ sexo: 'f', idade: 25, peso: 351, altura: 160 }).ok, false);

  // Altura fora dos limites (mín 80, máx 250)
  assert.equal(calculateBmr({ sexo: 'm', idade: 25, peso: 70, altura: 79 }).ok, false);
  assert.equal(calculateBmr({ sexo: 'm', idade: 25, peso: 70, altura: 251 }).ok, false);

  // Gordura corporal obrigatória para Katch-McArdle
  assert.equal(calculateBmr({ sexo: 'm', idade: 25, peso: 70, altura: 170, formula: 'katch' }).ok, false);
});

test('6. calculateBmr: estimativas dos fatores de atividade corretas e proporcionais', () => {
  const res = calculateBmr({ sexo: 'm', idade: 30, peso: 80, altura: 180 });
  assert.equal(res.ok, true);
  assert.equal(res.data.tmb, 1780);
  assert.equal(res.data.estimativasAtividade.length, 5);

  const sed = res.data.estimativasAtividade.find(a => a.id === 'sedentario');
  assert.equal(sed.gastoTotalKcal, Math.round(1780 * 1.2)); // 2136 kcal

  const mod = res.data.estimativasAtividade.find(a => a.id === 'moderado');
  assert.equal(mod.gastoTotalKcal, Math.round(1780 * 1.55)); // 2759 kcal
});

test('7. buildCopyText e formatResult: ausência de undefined, NaN ou null', () => {
  const res = calculateBmr({
    sexo: 'f',
    idade: '28',
    peso: '60,5',
    altura: '165',
    gordura: '22',
    formula: 'mifflin'
  });
  assert.equal(res.ok, true);

  const texto = buildCopyText(res);
  assert.match(texto, /TAXA METABÓLICA BASAL/);
  assert.match(texto, /Mifflin-St Jeor/);
  assert.doesNotMatch(texto, /\b(undefined|null|NaN)\b/);

  const formatado = formatResult(res);
  assert.ok(formatado.length >= 5);
  for (const item of formatado) {
    assert.doesNotMatch(item.value, /\b(undefined|null|NaN)\b/);
  }
});

test('8. setupTool: inicializa formulário e calcula no DOM mockado', () => {
  const prevDoc = globalThis.document;
  const prevWin = globalThis.window;

  try {
    const elementos = new Map();
    const mockEl = (id, tag = 'div') => {
      const el = {
        id,
        tagName: tag.toUpperCase(),
        value: '',
        hidden: false,
        textContent: '',
        innerHTML: '',
        children: [],
        listeners: {},
        addEventListener(evt, fn) { (this.listeners[evt] ||= []).push(fn); },
        querySelector() { return null; },
        appendChild(c) { this.children.push(c); return c; },
        reset() {}
      };
      elementos.set(id, el);
      return el;
    };

    mockEl('formTmb', 'form');
    const sSexo = mockEl('sexo', 'select');
    sSexo.value = 'm';
    const sIdade = mockEl('idade', 'input');
    sIdade.value = '30';
    const sPeso = mockEl('peso', 'input');
    sPeso.value = '80';
    const sAltura = mockEl('altura', 'input');
    sAltura.value = '180';
    const sFormula = mockEl('formula', 'select');
    sFormula.value = 'mifflin';
    mockEl('gordura', 'input');
    mockEl('grupoGordura', 'div');
    mockEl('btnCalcularTmb', 'button');
    mockEl('btnLimparTmb', 'button');
    mockEl('erroTmb', 'p');
    mockEl('resultadoTmb', 'section');
    mockEl('resTmbPrincipal', 'strong');
    mockEl('resTmbHora', 'span');
    mockEl('resMifflin', 'span');
    mockEl('resHarris', 'span');
    mockEl('resKatch', 'span');
    mockEl('resKatchItem', 'div');
    mockEl('resFormulaBadge', 'span');
    mockEl('statusAcoesTmb', 'p');
    mockEl('acoesResultadoTmb', 'div');

    const tbody = mockEl('tabelaAtividadesTmbTbody', 'tbody');
    const tab = mockEl('tabelaAtividadesTmb', 'table');
    tab.querySelector = (sel) => sel === 'tbody' ? tbody : null;

    globalThis.document = {
      getElementById: (id) => elementos.get(id) || null,
      querySelector: (sel) => {
        if (sel === '#tabelaAtividadesTmb tbody') return tbody;
        return null;
      },
      createElement: (tag) => ({
        tagName: tag.toUpperCase(),
        className: '',
        textContent: '',
        children: [],
        appendChild(c) { this.children.push(c); return c; }
      }),
      readyState: 'complete'
    };
    globalThis.window = {
      location: { href: 'https://www.calculadoramaster.com/tools/saude/metabolismo-basal.html' }
    };

    setupTool();

    const form = elementos.get('formTmb');
    assert.ok(form.listeners.submit && form.listeners.submit.length > 0);

    // Dispara submit
    let prevented = false;
    form.listeners.submit[0]({ preventDefault() { prevented = true; } });
    assert.equal(prevented, true);

    const resTmb = elementos.get('resTmbPrincipal');
    assert.match(resTmb.textContent, /1\.780\s*kcal/);
    assert.equal(elementos.get('resultadoTmb').hidden, false);
  } finally {
    globalThis.document = prevDoc;
    globalThis.window = prevWin;
  }
});
