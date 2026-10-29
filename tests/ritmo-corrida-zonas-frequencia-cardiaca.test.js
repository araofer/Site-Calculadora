import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateRunningPace,
  calculateHeartRateZones,
  calculateMaxHeartRateTanaka,
  formatTimeSeconds,
  formatPace,
  buildCopyText,
  formatResult,
  parseNumberLocale,
  setupTool,
  KM_POR_MILHA
} from '../js/tools/ritmo-corrida-zonas-frequencia-cardiaca.js';

test('1. formatTimeSeconds e formatPace: formatação correta de tempos e ritmos', () => {
  assert.equal(formatTimeSeconds(300), '05:00'); // 5 minutos
  assert.equal(formatTimeSeconds(3665), '01:01:05'); // 1 hora, 1 minuto, 5 segundos
  assert.equal(formatPace(300), '5:00 min/km');
  assert.equal(formatPace(275), '4:35 min/km');
});

test('2. calculateRunningPace: 10 km em 50 minutos (ritmo de 5:00 min/km e 12 km/h)', () => {
  const res = calculateRunningPace({
    distanciaKm: 10,
    minutos: 50,
    segundos: 0
  });

  assert.equal(res.ok, true);
  const p = res.data;
  assert.equal(p.distanciaKm, 10);
  assert.equal(p.paceSecondsPerKm, 300); // 300 s/km = 5:00 min/km
  assert.equal(p.paceKmFormatado, '5:00 min/km');
  assert.equal(p.velocidadeKmh, 12);
  assert.equal(p.tempoFormatado, '50:00');

  // Projeção 5k: 25:00
  const p5k = p.projecoesProvas.find(x => x.id === '5k');
  assert.equal(p5k.tempoFormatado, '25:00');

  // Projeção Meia Maratona (21.0975 km * 300 = 6329.25 s = 01:45:29)
  const p21k = p.projecoesProvas.find(x => x.id === '21k');
  assert.equal(p21k.tempoFormatado, '01:45:29');

  // Projeção Maratona (42.195 km * 300 = 12658.5 s = 03:30:59)
  const p42k = p.projecoesProvas.find(x => x.id === '42k');
  assert.equal(p42k.tempoFormatado, '03:30:59');
});

test('3. Equação de Tanaka et al. (2001) para FC máxima', () => {
  // Idade 20: 208 - (0.7 * 20) = 208 - 14 = 194 bpm
  assert.equal(calculateMaxHeartRateTanaka(20), 194);

  // Idade 40: 208 - (0.7 * 40) = 208 - 28 = 180 bpm
  assert.equal(calculateMaxHeartRateTanaka(40), 180);

  // Idade 60: 208 - (0.7 * 60) = 208 - 42 = 166 bpm
  assert.equal(calculateMaxHeartRateTanaka(60), 166);
});

test('4. Zonas de frequência cardíaca: Tanaka direto (sem FC repouso)', () => {
  // Idade 40 anos -> FCmáx = 180 bpm
  const res = calculateHeartRateZones({ idade: 40 });
  assert.equal(res.ok, true);
  const c = res.data;
  assert.equal(c.fcMaxTanaka, 180);
  assert.equal(c.zonas.length, 5);

  // Zona 1 (50-60%): 90 a 108 bpm
  assert.equal(c.zonas[0].bpmMin, 90);
  assert.equal(c.zonas[0].bpmMax, 108);

  // Zona 2 (60-70%): 108 a 126 bpm
  assert.equal(c.zonas[1].bpmMin, 108);
  assert.equal(c.zonas[1].bpmMax, 126);

  // Zona 5 (90-100%): 162 a 180 bpm
  assert.equal(c.zonas[4].bpmMin, 162);
  assert.equal(c.zonas[4].bpmMax, 180);
});

test('5. Zonas de frequência cardíaca: Método de Karvonen com FC de repouso', () => {
  // Idade 40 (FCmáx 180 bpm), FC repouso 60 bpm -> FC Reserva = 120 bpm
  // Zona 1 (50-60%): 60 + (120 * 0.50) = 120 bpm a 60 + (120 * 0.60) = 132 bpm
  // Zona 2 (60-70%): 60 + (120 * 0.60) = 132 bpm a 60 + (120 * 0.70) = 144 bpm
  const res = calculateHeartRateZones({ idade: 40, fcRepouso: 60 });
  assert.equal(res.ok, true);
  const c = res.data;
  assert.equal(c.fcReserva, 120);
  assert.equal(c.zonas[0].bpmMin, 120);
  assert.equal(c.zonas[0].bpmMax, 132);
  assert.equal(c.zonas[1].bpmMin, 132);
  assert.equal(c.zonas[1].bpmMax, 144);
});

test('6. Validação de entradas e casos extremos', () => {
  // Distância zero ou negativa
  assert.equal(calculateRunningPace({ distanciaKm: 0, minutos: 30 }).ok, false);
  assert.equal(calculateRunningPace({ distanciaKm: -5, minutos: 30 }).ok, false);

  // Tempo zerado
  assert.equal(calculateRunningPace({ distanciaKm: 5, horas: 0, minutos: 0, segundos: 0 }).ok, false);

  // Idade fora dos limites
  assert.equal(calculateHeartRateZones({ idade: 5 }).ok, false);
  assert.equal(calculateHeartRateZones({ idade: 130 }).ok, false);

  // FC repouso maior que FC máxima
  assert.equal(calculateHeartRateZones({ idade: 50, fcRepouso: 180 }).ok, false);
});

test('7. buildCopyText e formatResult: integridade textual', () => {
  const pace = calculateRunningPace({ distanciaKm: '5,0', minutos: 25 });
  const cardio = calculateHeartRateZones({ idade: 30, fcRepouso: 55 });

  const texto = buildCopyText(pace, cardio);
  assert.match(texto, /RITMO DE CORRIDA E ZONAS CARDÍACAS/);
  assert.match(texto, /Ritmo Médio/);
  assert.match(texto, /Zonas de Treinamento Cardíaco/);
  assert.doesNotMatch(texto, /\b(undefined|null|NaN)\b/);

  const formatado = formatResult(pace);
  assert.ok(formatado.length >= 3);
  for (const item of formatado) {
    assert.doesNotMatch(item.value, /\b(undefined|null|NaN)\b/);
  }
});

test('8. setupTool: inicializa DOM e calcula ritmo e zonas', () => {
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

    mockEl('formRitmoCorrida', 'form');
    const sDist = mockEl('distanciaKm', 'input');
    sDist.value = '10';
    const sH = mockEl('tempoHoras', 'input');
    sH.value = '0';
    const sM = mockEl('tempoMinutos', 'input');
    sM.value = '50';
    const sS = mockEl('tempoSegundos', 'input');
    sS.value = '0';

    const sIdade = mockEl('idadeCardio', 'input');
    sIdade.value = '35';
    mockEl('fcRepouso', 'input');

    mockEl('btnCalcularRitmo', 'button');
    mockEl('btnLimparRitmo', 'button');
    mockEl('erroRitmo', 'p');
    mockEl('resultadoRitmo', 'section');

    mockEl('resPacePrincipal', 'strong');
    mockEl('resPaceMilha', 'span');
    mockEl('resVelocidadeKmh', 'strong');
    mockEl('resVelocidadeMph', 'span');
    mockEl('resCardioInfo', 'p');

    mockEl('statusAcoesRitmo', 'p');
    mockEl('acoesResultadoRitmo', 'div');

    const tbodyProvas = mockEl('tabelaProvasCorridaTbody', 'tbody');
    const tbodyZonas = mockEl('tabelaZonasCardioTbody', 'tbody');

    globalThis.document = {
      getElementById: (id) => elementos.get(id) || null,
      querySelector: (sel) => {
        if (sel === '#tabelaProvasCorrida tbody') return tbodyProvas;
        if (sel === '#tabelaZonasCardio tbody') return tbodyZonas;
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
      location: { href: 'https://www.calculadoramaster.com/tools/saude/ritmo-corrida-zonas-frequencia-cardiaca.html' }
    };

    setupTool();

    const form = elementos.get('formRitmoCorrida');
    assert.ok(form.listeners.submit && form.listeners.submit.length > 0);

    form.listeners.submit[0]({ preventDefault() {} });

    const resPace = elementos.get('resPacePrincipal');
    assert.match(resPace.textContent, /5:00\s*min\/km/);
    assert.equal(elementos.get('resultadoRitmo').hidden, false);
  } finally {
    globalThis.document = prevDoc;
    globalThis.window = prevWin;
  }
});
