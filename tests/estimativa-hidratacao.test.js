import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateHydration,
  buildCopyText,
  formatResult,
  parseNumberLocale,
  setupTool,
  FATORES_BASE,
  TAXAS_EXERCICIO,
  AJUSTES_CLIMA,
  CONDICOES_ESPECIAIS
} from '../js/tools/estimativa-hidratacao.js';

test('1. Volume basal: adultos (35 ml/kg) e idosos (30 ml/kg)', () => {
  // Adulto de 30 anos e 70 kg -> 70 * 35 = 2450 ml = 2.45 L
  const resAdulto = calculateHydration({ peso: 70, idade: 30 });
  assert.equal(resAdulto.ok, true);
  assert.equal(resAdulto.data.taxaBasalPorKg, 35);
  assert.equal(resAdulto.data.volumeBasalMl, 2450);
  assert.equal(resAdulto.data.volumeTotalMl, 2450);
  assert.equal(resAdulto.data.volumeTotalLitros, 2.45);

  // Idoso de 70 anos e 70 kg -> 70 * 30 = 2100 ml = 2.10 L
  const resIdoso = calculateHydration({ peso: 70, idade: 70 });
  assert.equal(resIdoso.ok, true);
  assert.equal(resIdoso.data.taxaBasalPorKg, 30);
  assert.equal(resIdoso.data.volumeBasalMl, 2100);
  assert.equal(resIdoso.data.volumeTotalMl, 2100);
});

test('2. Adicional de exercício físico: proporção por intensidade e duração', () => {
  // 60 minutos de exercício moderado (600 ml/h) em adulto de 80 kg (2800 ml basal)
  // Total = 2800 + 600 = 3400 ml
  const res60Min = calculateHydration({
    peso: 80,
    idade: 25,
    intensidadeExercicio: 'moderado',
    minutosExercicio: 60
  });
  assert.equal(res60Min.ok, true);
  assert.equal(res60Min.data.adicionalExercicioMl, 600);
  assert.equal(res60Min.data.volumeTotalMl, 3400);

  // 30 minutos de exercício intenso (800 ml/h -> 400 ml)
  const res30Min = calculateHydration({
    peso: 80,
    idade: 25,
    intensidadeExercicio: 'intenso',
    minutosExercicio: 30
  });
  assert.equal(res30Min.ok, true);
  assert.equal(res30Min.data.adicionalExercicioMl, 400);
  assert.equal(res30Min.data.volumeTotalMl, 3200);
});

test('3. Ajustes climáticos e condições especiais (Gestante/Lactante)', () => {
  // Clima quente (educativo, sem acréscimo numérico fixo) + Gestante (+300 ml)
  // Peso 60 kg (2100 ml basal) -> Total = 2100 + 300 = 2400 ml = 2.40 L
  const resGestante = calculateHydration({
    peso: 60,
    idade: 28,
    clima: 'quente',
    condicaoEspecial: 'gestante'
  });
  assert.equal(resGestante.ok, true);
  assert.equal(resGestante.data.adicionalClimaMl, 0);
  assert.equal(resGestante.data.adicionalCondicaoMl, 300);
  assert.equal(resGestante.data.volumeTotalMl, 2400);
  assert.equal(resGestante.data.volumeTotalLitros, 2.40);
  assert.ok(resGestante.data.avisos.some((a) => a.includes('Atenção ao Clima')));

  // Lactante (+700 ml)
  const resLactante = calculateHydration({
    peso: 60,
    idade: 28,
    condicaoEspecial: 'lactante'
  });
  assert.equal(resLactante.data.adicionalCondicaoMl, 700);
  assert.equal(resLactante.data.volumeTotalMl, 2800);
});

test('4. Validação de entradas e limites', () => {
  // Peso fora dos limites
  assert.equal(calculateHydration({ peso: 15 }).ok, false);
  assert.equal(calculateHydration({ peso: 400 }).ok, false);
  assert.equal(calculateHydration({ peso: '' }).ok, false);

  // Idade fora dos limites
  assert.equal(calculateHydration({ peso: 70, idade: 8 }).ok, false);
  assert.equal(calculateHydration({ peso: 70, idade: 130 }).ok, false);
});

test('5. Equivalências em copos e cronograma', () => {
  // 3.000 ml
  const res = calculateHydration({ peso: '85,7', idade: 30 }); // 85.7 * 35 ≈ 3000 ml
  assert.equal(res.ok, true);
  assert.ok(res.data.equivalencias.copos200 > 0);
  assert.ok(res.data.equivalencias.copos250 > 0);
  assert.ok(res.data.cronograma.length >= 4);
});

test('6. buildCopyText e formatResult: sem undefined, null ou NaN', () => {
  const res = calculateHydration({
    peso: 72,
    idade: 35,
    intensidadeExercicio: 'moderado',
    minutosExercicio: 45,
    clima: 'quente'
  });
  assert.equal(res.ok, true);

  const texto = buildCopyText(res);
  assert.match(texto, /ESTIMATIVA DE HIDRATAÇÃO DIÁRIA/);
  assert.match(texto, /Meta Hídrica Total/);
  assert.doesNotMatch(texto, /\b(undefined|null|NaN)\b/);

  const secoes = formatResult(res);
  assert.ok(secoes.length >= 4);
  for (const s of secoes) {
    assert.doesNotMatch(s.value, /\b(undefined|null|NaN)\b/);
  }
});

test('7. setupTool: inicializa DOM e calcula hidratação', () => {
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

    mockEl('formHidratacao', 'form');
    const sPeso = mockEl('pesoHidratacao', 'input');
    sPeso.value = '70';
    const sIdade = mockEl('idadeHidratacao', 'input');
    sIdade.value = '30';
    const sEx = mockEl('intensidadeExercicio', 'select');
    sEx.value = 'nenhum';
    mockEl('minutosExercicio', 'input');
    mockEl('grupoMinutosExercicio', 'div');
    mockEl('climaHidratacao', 'select');
    mockEl('condicaoHidratacao', 'select');

    mockEl('btnCalcularHidratacao', 'button');
    mockEl('btnLimparHidratacao', 'button');
    mockEl('erroHidratacao', 'p');
    mockEl('resultadoHidratacao', 'section');

    mockEl('resLitrosTotal', 'strong');
    mockEl('resMlTotal', 'span');
    mockEl('resCopos250', 'strong');
    mockEl('resGarrafas500', 'strong');
    mockEl('resBasalMl', 'span');
    mockEl('resExercicioMl', 'span');
    mockEl('resClimaMl', 'span');

    mockEl('avisosHidratacao', 'div');
    mockEl('statusAcoesHidratacao', 'p');
    mockEl('acoesResultadoHidratacao', 'div');

    const tbody = mockEl('tabelaCronogramaHidratacaoTbody', 'tbody');
    const tab = mockEl('tabelaCronogramaHidratacao', 'table');
    tab.querySelector = (sel) => sel === 'tbody' ? tbody : null;

    globalThis.document = {
      getElementById: (id) => elementos.get(id) || null,
      querySelector: (sel) => {
        if (sel === '#tabelaCronogramaHidratacao tbody') return tbody;
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
      location: { href: 'https://www.calculadoramaster.com/tools/saude/estimativa-hidratacao.html' }
    };

    setupTool();

    const form = elementos.get('formHidratacao');
    assert.ok(form.listeners.submit && form.listeners.submit.length > 0);

    form.listeners.submit[0]({ preventDefault() {} });

    const resLitros = elementos.get('resLitrosTotal');
    assert.match(resLitros.textContent, /2,45\s*L/); // 70 * 35 = 2450 ml = 2,45 L
    assert.equal(elementos.get('resultadoHidratacao').hidden, false);
  } finally {
    globalThis.document = prevDoc;
    globalThis.window = prevWin;
  }
});

test('8. Rigor científico: fontes e ausência de atribuições indevidas na página HTML', async () => {
  const fs = await import('node:fs');
  const path = await import('node:path');
  const htmlPath = path.resolve('src/pages/tools/saude/estimativa-hidratacao.page.html');
  const html = fs.readFileSync(htmlPath, 'utf8');

  // Não deve conter acréscimos numéricos fixos por clima (+350 ml ou +600 ml/dia) no HTML
  assert.doesNotMatch(html, /\+350\s*ml/i);
  assert.doesNotMatch(html, /\+600\s*ml\/dia/i);
  assert.doesNotMatch(html, /adicional\s*de\s*\+600\s*ml/i);

  // Não deve atribuir regras de 35/30 ml/kg à Cuppari ou Holliday-Segar sem confirmação de página/capítulo
  assert.doesNotMatch(html, /Cuppari/i);
  assert.doesNotMatch(html, /Holliday/i);

  // Deve expressar a proporção da EFSA: aproximadamente 20% a 30% de alimentos e 70% a 80% de bebidas
  assert.match(html, /20%\s*a\s*30%/);
  assert.match(html, /70%\s*a\s*80%/);

  // Deve preservar referências populacionais da EFSA para 9-13 e 14+ anos
  assert.match(html, /9 a 13 anos/);
  assert.match(html, /2,1 L\/dia para meninos/);
  assert.match(html, /1,9 L\/dia para meninas/);
  assert.match(html, /2,5 L\/dia para homens/);
  assert.match(html, /2,0 L\/dia para mulheres/);

  // Deve preservar avisos clínicos obrigatórios
  assert.match(html, /Insuficiência Cardíaca Congestiva/);
  assert.match(html, /Insuficiência Renal Crônica/);
  assert.match(html, /Cirrose Hepática/);
});
