import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateMacronutrients,
  buildCopyText,
  formatResult,
  parseNumberLocale,
  setupTool,
  FATORES_ENERGIA,
  PROTOCOLOS_DIETA
} from '../js/tools/calculadora-macronutrientes.js';

test('1. Fatores energéticos de Atwater e proporções padrão (2.000 kcal equilibrada)', () => {
  // 2.000 kcal: 50% Carbs (1000 kcal), 20% Prot (400 kcal), 30% Gord (600 kcal)
  // Carbs: 1000 / 4 = 250 g
  // Prot: 400 / 4 = 100 g
  // Gord: 600 / 9 = 66.67 g -> 66.7 g
  const res = calculateMacronutrients({
    calorias: 2000,
    peso: 70,
    protocolo: 'equilibrada'
  });

  assert.equal(res.ok, true);
  const m = res.data.macronutrientes;
  assert.equal(m.carboidratos.gramas, 250);
  assert.equal(m.carboidratos.kcal, 1000);
  assert.equal(m.proteinas.gramas, 100);
  assert.equal(m.proteinas.kcal, 400);
  assert.equal(m.gorduras.gramas, 66.7);
  assert.equal(m.gorduras.kcal, 600);

  // g/kg para 70 kg: 100 / 70 ≈ 1.43 g/kg de proteína
  assert.equal(m.proteinas.gKg, 1.43);
  // Fibras: (2000 / 1000) * 14 = 28 g
  assert.equal(m.fibras.gramas, 28);
});

test('2. Protocolo de Emagrecimento Hiperproteico (High Protein)', () => {
  // 1.800 kcal: 40% Carbs (720 kcal), 35% Prot (630 kcal), 25% Gord (450 kcal)
  const res = calculateMacronutrients({
    calorias: 1800,
    peso: 80,
    protocolo: 'emagrecimento'
  });

  assert.equal(res.ok, true);
  const m = res.data.macronutrientes;
  assert.equal(m.carboidratos.gramas, 180); // 720 / 4
  assert.equal(m.proteinas.gramas, 157.5);  // 630 / 4
  assert.equal(m.gorduras.gramas, 50);      // 450 / 9
  assert.equal(m.proteinas.gKg, 1.97);     // 157.5 / 80
});

test('3. Protocolo Cetogênico (Keto): baixo carboidrato e alta gordura', () => {
  // 2.000 kcal: 5% Carbs (100 kcal = 25 g), 25% Prot (500 kcal = 125 g), 70% Gord (1400 kcal = 155.6 g)
  const res = calculateMacronutrients({
    calorias: 2000,
    protocolo: 'cetogenica'
  });

  assert.equal(res.ok, true);
  const m = res.data.macronutrientes;
  assert.equal(m.carboidratos.gramas, 25);
  assert.equal(m.proteinas.gramas, 125);
  assert.equal(m.gorduras.gramas, 155.6);
});

test('4. Protocolo Personalizado: soma deve ser rigorosamente 100%', () => {
  // Válido: 45% + 30% + 25% = 100%
  const resOk = calculateMacronutrients({
    calorias: 2500,
    protocolo: 'personalizada',
    carbPct: 45,
    protPct: 30,
    gordPct: 25
  });
  assert.equal(resOk.ok, true);

  // Inválido: soma 90%
  const resErro = calculateMacronutrients({
    calorias: 2500,
    protocolo: 'personalizada',
    carbPct: 40,
    protPct: 30,
    gordPct: 20
  });
  assert.equal(resErro.ok, false);
  assert.match(resErro.error, /100%/);
});

test('5. Validação de calorias, peso e casos extremos', () => {
  // Calorias abaixo de 500 ou acima de 10.000
  assert.equal(calculateMacronutrients({ calorias: 400 }).ok, false);
  assert.equal(calculateMacronutrients({ calorias: 15000 }).ok, false);
  assert.equal(calculateMacronutrients({ calorias: '' }).ok, false);

  // Peso fora dos limites
  assert.equal(calculateMacronutrients({ calorias: 2000, peso: 15 }).ok, false);
  assert.equal(calculateMacronutrients({ calorias: 2000, peso: 400 }).ok, false);
});

test('6. Divisão por refeições e avisos de segurança clínica', () => {
  // 2.000 kcal em 4 refeições -> ~500 kcal por refeição
  const res = calculateMacronutrients({
    calorias: 2000,
    peso: 70,
    refeicoes: 4,
    protocolo: 'equilibrada'
  });
  assert.equal(res.ok, true);
  assert.equal(res.data.porRefeicao.numero, 4);
  assert.equal(res.data.porRefeicao.kcal, 500);
  assert.equal(res.data.porRefeicao.gCarb, 62.5); // 250 / 4

  // Dieta com gordura < 15% gera aviso clínico
  const resBaixaGordura = calculateMacronutrients({
    calorias: 2000,
    protocolo: 'personalizada',
    carbPct: 60,
    protPct: 30,
    gordPct: 10
  });
  assert.equal(resBaixaGordura.ok, true);
  assert.ok(resBaixaGordura.data.avisos.length >= 1);
});

test('7. buildCopyText e formatResult: sem undefined, null ou NaN', () => {
  const res = calculateMacronutrients({
    calorias: '2.200',
    peso: '75,5',
    refeicoes: '5',
    protocolo: 'hipertrofia'
  });
  assert.equal(res.ok, true);

  const texto = buildCopyText(res);
  assert.match(texto, /CALCULADORA DE MACRONUTRIENTES/);
  assert.match(texto, /Carboidratos/);
  assert.match(texto, /Proteínas/);
  assert.match(texto, /Gorduras/);
  assert.doesNotMatch(texto, /\b(undefined|null|NaN)\b/);

  const formatado = formatResult(res);
  assert.ok(formatado.length >= 4);
  for (const item of formatado) {
    assert.doesNotMatch(item.value, /\b(undefined|null|NaN)\b/);
  }
});

test('8. setupTool: inicializa DOM e calcula macros', () => {
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

    mockEl('formMacronutrientes', 'form');
    const sCal = mockEl('caloriasMacro', 'input');
    sCal.value = '2000';
    const sPeso = mockEl('pesoMacro', 'input');
    sPeso.value = '70';
    const sProt = mockEl('protocoloMacro', 'select');
    sProt.value = 'equilibrada';
    const sRef = mockEl('refeicoesMacro', 'select');
    sRef.value = '4';

    mockEl('grupoPercentuaisPersonalizados', 'div');
    mockEl('carbPct', 'input');
    mockEl('protPct', 'input');
    mockEl('gordPct', 'input');

    mockEl('btnCalcularMacro', 'button');
    mockEl('btnLimparMacro', 'button');
    mockEl('erroMacro', 'p');
    mockEl('resultadoMacro', 'section');

    mockEl('resCarbGramas', 'strong');
    mockEl('resCarbKcal', 'span');
    mockEl('resCarbKg', 'span');

    mockEl('resProtGramas', 'strong');
    mockEl('resProtKcal', 'span');
    mockEl('resProtKg', 'span');

    mockEl('resGordGramas', 'strong');
    mockEl('resGordKcal', 'span');
    mockEl('resGordKg', 'span');

    mockEl('resFibras', 'strong');
    mockEl('resKcalTotal', 'strong');
    mockEl('resBadgeProtocolo', 'span');
    mockEl('avisosMacro', 'div');
    mockEl('statusAcoesMacro', 'p');
    mockEl('acoesResultadoMacro', 'div');

    const tbody = mockEl('tabelaRefeicoesMacroTbody', 'tbody');
    const tab = mockEl('tabelaRefeicoesMacro', 'table');
    tab.querySelector = (sel) => sel === 'tbody' ? tbody : null;

    globalThis.document = {
      getElementById: (id) => elementos.get(id) || null,
      querySelector: (sel) => {
        if (sel === '#tabelaRefeicoesMacro tbody') return tbody;
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
      location: { href: 'https://www.calculadoramaster.com/tools/saude/calculadora-macronutrientes.html' }
    };

    setupTool();

    const form = elementos.get('formMacronutrientes');
    assert.ok(form.listeners.submit && form.listeners.submit.length > 0);

    form.listeners.submit[0]({ preventDefault() {} });

    const resCarb = elementos.get('resCarbGramas');
    assert.match(resCarb.textContent, /250\s*g/);
    assert.equal(elementos.get('resultadoMacro').hidden, false);
  } finally {
    globalThis.document = prevDoc;
    globalThis.window = prevWin;
  }
});
