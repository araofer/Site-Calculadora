import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateDailyCaloricExpenditure,
  calcularTmbMifflin,
  buildCopyText,
  formatResult,
  parseNumberLocale,
  setupTool,
  FATORES_ATIVIDADE,
  OBJETIVOS_CALORICOS,
  LIMITES_SEGURANCA
} from '../js/tools/gasto-calorico-diario.js';

test('1. parseNumberLocale e calcularTmbMifflin: precisão de base', () => {
  // Homem 30 anos, 80 kg, 180 cm -> 1780 kcal
  const tmbH = calcularTmbMifflin({ sexo: 'm', peso: 80, altura: 180, idade: 30 });
  assert.equal(tmbH, 1780);

  // Mulher 25 anos, 55 kg, 160 cm -> 550 + 1000 - 125 - 161 = 1264 kcal
  const tmbM = calcularTmbMifflin({ sexo: 'f', peso: 55, altura: 160, idade: 25 });
  assert.equal(tmbM, 1264);
});

test('2. Fatores de atividade física (PAL): aplicação exata à TMB', () => {
  // TMB fixa de 2000 kcal
  const tmb = 2000;

  const resSed = calculateDailyCaloricExpenditure({
    modoEntrada: 'direta',
    tmbInformada: tmb,
    atividade: 'sedentario',
    objetivo: 'manutencao'
  });
  assert.equal(resSed.ok, true);
  assert.equal(resSed.data.get, Math.round(tmb * 1.2)); // 2400 kcal

  const resMod = calculateDailyCaloricExpenditure({
    modoEntrada: 'direta',
    tmbInformada: tmb,
    atividade: 'moderado',
    objetivo: 'manutencao'
  });
  assert.equal(resMod.ok, true);
  assert.equal(resMod.data.get, Math.round(tmb * 1.55)); // 3100 kcal

  const resExt = calculateDailyCaloricExpenditure({
    modoEntrada: 'direta',
    tmbInformada: tmb,
    atividade: 'extremo',
    objetivo: 'manutencao'
  });
  assert.equal(resExt.ok, true);
  assert.equal(resExt.data.get, Math.round(tmb * 1.9)); // 3800 kcal
});

test('3. Metas por objetivo: déficit e superávit calculados corretamente', () => {
  // TMB 2000 kcal, moderado (1.55) -> GET = 3100 kcal
  const base = {
    modoEntrada: 'direta',
    tmbInformada: 2000,
    atividade: 'moderado'
  };

  // Manutenção (0%) -> 3100 kcal
  const resMan = calculateDailyCaloricExpenditure({ ...base, objetivo: 'manutencao' });
  assert.equal(resMan.data.metaCalorica, 3100);
  assert.equal(resMan.data.diferencaCalorica, 0);

  // Emagrecimento moderado (-20%) -> 3100 * 0.80 = 2480 kcal
  const resPerda = calculateDailyCaloricExpenditure({ ...base, objetivo: 'perda_moderada' });
  assert.equal(resPerda.data.metaCalorica, 2480);
  assert.equal(resPerda.data.diferencaCalorica, -620);

  // Ganho limpo (+10%) -> 3100 * 1.10 = 3410 kcal
  const resGanho = calculateDailyCaloricExpenditure({ ...base, objetivo: 'ganho_leve' });
  assert.equal(resGanho.data.metaCalorica, 3410);
  assert.equal(resGanho.data.diferencaCalorica, 310);
});

test('4. Alertas de segurança clínica: limites mínimos e meta abaixo da TMB', () => {
  // Mulher com TMB baixa que seleciona perda agressiva
  const res = calculateDailyCaloricExpenditure({
    modoEntrada: 'calculada',
    sexo: 'f',
    idade: 45,
    peso: 48,
    altura: 150,
    atividade: 'sedentario',
    objetivo: 'perda_agressiva'
  });
  assert.equal(res.ok, true);
  assert.ok(res.data.avisos.length >= 1, 'Deve emitir aviso sobre piso mínimo calórico ou TMB');
});

test('5. Validação de entradas: atividade inválida, TMB direta e limites corporais', () => {
  // Atividade inexistente
  assert.equal(calculateDailyCaloricExpenditure({ atividade: 'invalida' }).ok, false);

  // TMB direta fora dos limites (mín 500, máx 5000)
  assert.equal(calculateDailyCaloricExpenditure({ modoEntrada: 'direta', tmbInformada: 400, atividade: 'moderado' }).ok, false);
  assert.equal(calculateDailyCaloricExpenditure({ modoEntrada: 'direta', tmbInformada: 5500, atividade: 'moderado' }).ok, false);

  // Modo calculado com dados ausentes
  assert.equal(calculateDailyCaloricExpenditure({ modoEntrada: 'calculada', atividade: 'moderado' }).ok, false);

  // Validação etária: rejeita menores de 18 anos e aceita 18 anos
  assert.equal(calculateDailyCaloricExpenditure({
    modoEntrada: 'calculada', sexo: 'm', idade: 17, peso: 70, altura: 175, atividade: 'moderado'
  }).ok, false);
  assert.equal(calculateDailyCaloricExpenditure({
    modoEntrada: 'calculada', sexo: 'm', idade: 18, peso: 70, altura: 175, atividade: 'moderado'
  }).ok, true);
});

test('6. buildCopyText e formatResult: sem valores indefinidos ou nulos', () => {
  const res = calculateDailyCaloricExpenditure({
    modoEntrada: 'calculada',
    sexo: 'm',
    idade: 28,
    peso: 75,
    altura: 178,
    atividade: 'moderado',
    objetivo: 'perda_moderada'
  });
  assert.equal(res.ok, true);

  const texto = buildCopyText(res);
  assert.match(texto, /GASTO CALÓRICO DIÁRIO/);
  assert.match(texto, /Gasto Energético de Manutenção/);
  assert.doesNotMatch(texto, /\b(undefined|null|NaN)\b/);

  const secoes = formatResult(res);
  assert.ok(secoes.length >= 4);
  for (const s of secoes) {
    assert.doesNotMatch(s.value, /\b(undefined|null|NaN)\b/);
  }
});

test('7. setupTool: inicializa DOM e calcula gastos com sucesso', () => {
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
        checked: false,
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

    mockEl('formGastoCalorico', 'form');
    const radCalc = mockEl('modoCalc', 'input');
    radCalc.checked = true;
    mockEl('modoDireto', 'input');
    mockEl('grupoCamposCalculados', 'div');
    mockEl('grupoCampoDireto', 'div');

    const sSexo = mockEl('sexoGet', 'select');
    sSexo.value = 'm';
    const sIdade = mockEl('idadeGet', 'input');
    sIdade.value = '30';
    const sPeso = mockEl('pesoGet', 'input');
    sPeso.value = '80';
    const sAltura = mockEl('alturaGet', 'input');
    sAltura.value = '180';
    mockEl('tmbInformada', 'input');

    const sAtiv = mockEl('nivelAtividade', 'select');
    sAtiv.value = 'moderado';
    const sObj = mockEl('objetivoCalorico', 'select');
    sObj.value = 'manutencao';

    mockEl('btnCalcularGet', 'button');
    mockEl('btnLimparGet', 'button');
    mockEl('erroGet', 'p');
    mockEl('resultadoGet', 'section');
    mockEl('resGetPrincipal', 'strong');
    mockEl('resMetaPrincipal', 'strong');
    mockEl('resTmbRef', 'span');
    mockEl('resSaldoCalorico', 'strong');
    mockEl('resBadgeObjetivo', 'span');
    mockEl('avisosGet', 'div');
    mockEl('statusAcoesGet', 'p');
    mockEl('acoesResultadoGet', 'div');

    const tbody = mockEl('tabelaCenariosGetTbody', 'tbody');
    const tab = mockEl('tabelaCenariosGet', 'table');
    tab.querySelector = (sel) => sel === 'tbody' ? tbody : null;

    globalThis.document = {
      getElementById: (id) => elementos.get(id) || null,
      querySelector: (sel) => {
        if (sel === '#tabelaCenariosGet tbody') return tbody;
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
      location: { href: 'https://www.calculadoramaster.com/tools/saude/gasto-calorico-diario.html' }
    };

    setupTool();

    const form = elementos.get('formGastoCalorico');
    assert.ok(form.listeners.submit && form.listeners.submit.length > 0);

    form.listeners.submit[0]({ preventDefault() {} });

    const resGet = elementos.get('resGetPrincipal');
    assert.match(resGet.textContent, /2\.759\s*kcal/); // 1780 * 1.55 = 2759
    assert.equal(elementos.get('resultadoGet').hidden, false);
  } finally {
    globalThis.document = prevDoc;
    globalThis.window = prevWin;
  }
});
