import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateByLmp,
  calculateByUltrasound,
  parseIsoDate,
  formatDatePtBr,
  addDays,
  differenceInDays,
  getTrimesterInfo,
  getClassificacaoTermo,
  buildCopyText,
  formatResult,
  setupTool
} from '../js/tools/idade-gestacional-data-parto.js';

test('1. parseIsoDate, formatDatePtBr, addDays e differenceInDays', () => {
  const d1 = parseIsoDate('2026-05-10');
  assert.equal(d1.getFullYear(), 2026);
  assert.equal(d1.getMonth(), 4); // Maio = 4
  assert.equal(d1.getDate(), 10);
  assert.equal(formatDatePtBr(d1), '10/05/2026');

  const d2 = addDays(d1, 7);
  assert.equal(formatDatePtBr(d2), '17/05/2026');
  assert.equal(differenceInDays(d1, d2), 7);

  assert.equal(parseIsoDate('invalido'), null);
  assert.equal(parseIsoDate(''), null);
});

test('2. Regra de Naegele e DPP por DUM com ciclo padrão de 28 dias', () => {
  // DUM: 01/01/2026. DPP = DUM + 280 dias = 08/10/2026
  // Naegele clássico: 1 + 7 = 8; 1 + 9 = 10 (Outubro). Ano 2026.
  const res = calculateByLmp({
    dum: '2026-01-01',
    duracaoCiclo: 28,
    dataReferencia: '2026-06-11' // 161 dias desde 01/01/2026 = 23 semanas exatas (23 * 7 = 161)
  });

  assert.equal(res.ok, true);
  assert.equal(res.data.dum, '01/01/2026');
  assert.equal(res.data.dpp, '08/10/2026');
  assert.equal(res.data.semanas, 23);
  assert.equal(res.data.diasResto, 0);
  assert.equal(res.data.idadeGestacionalTexto, '23 semanas e 0 dias');
  assert.equal(res.data.trimestre.numero, 2);
});

test('3. Ajuste de Naegele para ciclo menstrual diferente de 28 dias', () => {
  // Ciclo longo: 35 dias (delta = +7 dias)
  // DUM: 01/01/2026 -> DPP = 08/10/2026 + 7 dias = 15/10/2026
  const resLongo = calculateByLmp({
    dum: '2026-01-01',
    duracaoCiclo: 35,
    dataReferencia: '2026-06-11'
  });
  assert.equal(resLongo.ok, true);
  assert.equal(resLongo.data.dpp, '15/10/2026');

  // Ciclo curto: 25 dias (delta = -3 dias)
  // DUM: 01/01/2026 -> DPP = 08/10/2026 - 3 dias = 05/10/2026
  const resCurto = calculateByLmp({
    dum: '2026-01-01',
    duracaoCiclo: 25,
    dataReferencia: '2026-06-11'
  });
  assert.equal(resCurto.ok, true);
  assert.equal(resCurto.data.dpp, '05/10/2026');
});

test('4. Datação por Ultrassonografia precoce (USG)', () => {
  // Exame em 01/03/2026 apontou 8 semanas e 0 dias (56 dias decorridos)
  // DUM teórica = 01/03/2026 - 56 dias = 04/01/2026
  // DPP = DUM teórica + 280 dias = 11/10/2026
  const resUsg = calculateByUltrasound({
    dataExame: '2026-03-01',
    semanasExame: 8,
    diasExame: 0,
    dataReferencia: '2026-03-08' // 7 dias depois do exame = 9 semanas e 0 dias
  });

  assert.equal(resUsg.ok, true);
  assert.equal(resUsg.data.dataExame, '01/03/2026');
  assert.equal(resUsg.data.semanas, 9);
  assert.equal(resUsg.data.diasResto, 0);
  assert.equal(resUsg.data.dpp, '11/10/2026');
});

test('5. Trimestres e classificações obstétricas de termo', () => {
  assert.equal(getTrimesterInfo(10).numero, 1);
  assert.equal(getTrimesterInfo(20).numero, 2);
  assert.equal(getTrimesterInfo(32).numero, 3);

  assert.match(getClassificacaoTermo(35), /Prematuro/);
  assert.match(getClassificacaoTermo(38), /Termo Precoce/);
  assert.match(getClassificacaoTermo(39), /Termo Pleno/);
  assert.match(getClassificacaoTermo(41), /Termo Tardio/);
  assert.match(getClassificacaoTermo(42), /Pós-termo/);
});

test('6. Validações de entradas inválidas ou inconsistentes', () => {
  // DUM vazia ou inválida
  assert.equal(calculateByLmp({ dum: '' }).ok, false);
  assert.equal(calculateByLmp({ dum: 'data-errada' }).ok, false);

  // Ciclo fora dos limites (mín 21, máx 40)
  assert.equal(calculateByLmp({ dum: '2026-01-01', duracaoCiclo: 15 }).ok, false);
  assert.equal(calculateByLmp({ dum: '2026-01-01', duracaoCiclo: 45 }).ok, false);

  // Referência anterior à DUM
  assert.equal(calculateByLmp({ dum: '2026-05-01', dataReferencia: '2026-04-01' }).ok, false);

  // USG com semanas fora do limite
  assert.equal(calculateByUltrasound({ dataExame: '2026-03-01', semanasExame: 2 }).ok, false);
});

test('7. buildCopyText e formatResult: sem undefined, null ou NaN', () => {
  const res = calculateByLmp({
    dum: '2026-02-15',
    duracaoCiclo: 28,
    dataReferencia: '2026-06-15'
  });
  assert.equal(res.ok, true);

  const texto = buildCopyText(res);
  assert.match(texto, /IDADE GESTACIONAL E DATA PROVÁVEL DO PARTO/);
  assert.match(texto, /Trimestre Atual/);
  assert.doesNotMatch(texto, /\b(undefined|null|NaN)\b/);

  const formatado = formatResult(res);
  assert.ok(formatado.length >= 4);
  for (const item of formatado) {
    assert.doesNotMatch(item.value, /\b(undefined|null|NaN)\b/);
  }
});

test('8. setupTool: inicializa DOM e calcula DUM e USG', () => {
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

    mockEl('formIdadeGestacional', 'form');
    const radDum = mockEl('modoDum', 'input');
    radDum.checked = true;
    mockEl('modoUsg', 'input');
    mockEl('grupoCamposDum', 'div');
    mockEl('grupoCamposUsg', 'div');

    const sDum = mockEl('dataDum', 'input');
    sDum.value = '2026-01-01';
    const sCiclo = mockEl('duracaoCiclo', 'input');
    sCiclo.value = '28';

    mockEl('dataExameUsg', 'input');
    mockEl('semanasExameUsg', 'input');
    mockEl('diasExameUsg', 'input');

    mockEl('btnCalcularGestacao', 'button');
    mockEl('btnLimparGestacao', 'button');
    mockEl('erroGestacao', 'p');
    mockEl('resultadoGestacao', 'section');

    mockEl('resIdadePrincipal', 'strong');
    mockEl('resDppPrincipal', 'strong');
    mockEl('resTrimestre', 'strong');
    mockEl('resDiasRestantes', 'span');
    mockEl('resClassificacaoTermo', 'span');

    mockEl('avisosGestacao', 'div');
    mockEl('statusAcoesGestacao', 'p');
    mockEl('acoesResultadoGestacao', 'div');

    globalThis.document = {
      getElementById: (id) => elementos.get(id) || null,
      querySelector: () => null,
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
      location: { href: 'https://www.calculadoramaster.com/tools/saude/idade-gestacional-data-parto.html' }
    };

    setupTool();

    const form = elementos.get('formIdadeGestacional');
    assert.ok(form.listeners.submit && form.listeners.submit.length > 0);

    form.listeners.submit[0]({ preventDefault() {} });

    const resDpp = elementos.get('resDppPrincipal');
    assert.equal(resDpp.textContent, '08/10/2026');
    assert.equal(elementos.get('resultadoGestacao').hidden, false);
  } finally {
    globalThis.document = prevDoc;
    globalThis.window = prevWin;
  }
});
