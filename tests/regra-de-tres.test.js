import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import {
  parseRuleOfThreeNumber,
  normalizeRuleOfThreeInput,
  validateRuleOfThreeInput,
  calculateRuleOfThree,
  formatRuleOfThreeResult
} from '../js/tools/regra-de-tres.js';
import {
  STORAGE_KEY,
  VALID_TOOL_IDS,
  getFavorites,
  isFavorite,
  addFavorite,
  removeFavorite,
  toggleFavorite,
  initFavoriteButtons,
  _resetMemoryForTesting
} from '../js/core/favorites.js';

const EPSILON = 1e-6;

test('Regra de Três - parseRuleOfThreeNumber aceita inteiros e decimais com ponto e vírgula', () => {
  assert.equal(parseRuleOfThreeNumber(10), 10);
  assert.equal(parseRuleOfThreeNumber('10'), 10);
  assert.equal(parseRuleOfThreeNumber('10.5'), 10.5);
  assert.equal(parseRuleOfThreeNumber('10,5'), 10.5);
  assert.equal(parseRuleOfThreeNumber('0.5'), 0.5);
  assert.equal(parseRuleOfThreeNumber('0,5'), 0.5);
  assert.equal(parseRuleOfThreeNumber('1.000'), 1000, '1.000 deve ser interpretado como 1000 e não 1');
  assert.notEqual(parseRuleOfThreeNumber('1.000'), 1);
  assert.equal(parseRuleOfThreeNumber('1.000,50'), 1000.5);
  assert.equal(parseRuleOfThreeNumber('1,234.56'), 1234.56);
  assert.equal(parseRuleOfThreeNumber('0'), 0);
});

test('Regra de Três - parseRuleOfThreeNumber rejeita entradas malformadas, não-numéricas e negativas', () => {
  assert.ok(Number.isNaN(parseRuleOfThreeNumber('')));
  assert.ok(Number.isNaN(parseRuleOfThreeNumber('   ')));
  assert.ok(Number.isNaN(parseRuleOfThreeNumber(null)));
  assert.ok(Number.isNaN(parseRuleOfThreeNumber(undefined)));
  assert.ok(Number.isNaN(parseRuleOfThreeNumber('abc')));
  assert.ok(Number.isNaN(parseRuleOfThreeNumber('1..000')));
  assert.ok(Number.isNaN(parseRuleOfThreeNumber('1,,000')));
  assert.ok(Number.isNaN(parseRuleOfThreeNumber('1.00.0')));
  assert.ok(Number.isNaN(parseRuleOfThreeNumber('1,00,0')));
  assert.ok(Number.isNaN(parseRuleOfThreeNumber('-5')));
  assert.ok(Number.isNaN(parseRuleOfThreeNumber(-10)));
  assert.ok(Number.isNaN(parseRuleOfThreeNumber(NaN)));
  assert.ok(Number.isNaN(parseRuleOfThreeNumber(Infinity)));
});

test('Regra de Três - normalizeRuleOfThreeInput converte entradas brutas e define modo padrão', () => {
  const norm1 = normalizeRuleOfThreeInput({ a: ' 2,5 ', b: '10', c: '5', mode: 'DIRECT' });
  assert.equal(norm1.a, 2.5);
  assert.equal(norm1.b, 10);
  assert.equal(norm1.c, 5);
  assert.equal(norm1.mode, 'direct');

  const norm2 = normalizeRuleOfThreeInput({ a: '2', b: '10', c: '5', mode: 'inverse' });
  assert.equal(norm2.mode, 'inverse');

  // Modo padrão quando omitido é direct
  const norm3 = normalizeRuleOfThreeInput({ a: '2', b: '10', c: '5' });
  assert.equal(norm3.mode, 'direct');
});

test('Regra de Três - validateRuleOfThreeInput valida limites, divisão por zero e modos', () => {
  // Entradas válidas
  assert.equal(validateRuleOfThreeInput({ a: 2, b: 10, c: 5, mode: 'direct' }).valido, true);
  assert.equal(validateRuleOfThreeInput({ a: 2, b: 10, c: 5, mode: 'inverse' }).valido, true);
  assert.equal(validateRuleOfThreeInput({ a: 2, b: 0, c: 5, mode: 'direct' }).valido, true, 'b=0 é matematicamente válido');

  // Modo inválido
  assert.equal(validateRuleOfThreeInput({ a: 2, b: 10, c: 5, mode: 'composta' }).valido, false);
  assert.equal(validateRuleOfThreeInput({ a: 2, b: 10, c: 5, mode: '' }).valido, false);

  // Campos ausentes ou NaN
  assert.equal(validateRuleOfThreeInput({ a: NaN, b: 10, c: 5, mode: 'direct' }).valido, false);
  assert.equal(validateRuleOfThreeInput({ a: 2, b: NaN, c: 5, mode: 'direct' }).valido, false);
  assert.equal(validateRuleOfThreeInput({ a: 2, b: 10, c: NaN, mode: 'direct' }).valido, false);

  // Divisão por zero no modo direct: A = 0
  assert.equal(validateRuleOfThreeInput({ a: 0, b: 10, c: 5, mode: 'direct' }).valido, false);

  // Divisão por zero no modo inverse: C = 0
  assert.equal(validateRuleOfThreeInput({ a: 2, b: 10, c: 0, mode: 'inverse' }).valido, false);

  // Valores negativos
  assert.equal(validateRuleOfThreeInput({ a: -2, b: 10, c: 5, mode: 'direct' }).valido, false);
  assert.equal(validateRuleOfThreeInput({ a: 2, b: -10, c: 5, mode: 'direct' }).valido, false);
  assert.equal(validateRuleOfThreeInput({ a: 2, b: 10, c: -5, mode: 'direct' }).valido, false);
});

test('Regra de Três - caso conhecido DIRECT obrigatório (a=2, b=10, c=5 -> x=25)', () => {
  const res = calculateRuleOfThree({
    a: '2',
    b: '10',
    c: '5',
    mode: 'direct'
  });

  assert.equal(res.valido, true);
  assert.equal(res.mode, 'direct');
  assert.equal(res.a, 2);
  assert.equal(res.b, 10);
  assert.equal(res.c, 5);
  assert.equal(res.x, 25);
  assert.equal(res.formula, 'X = (B × C) ÷ A');
  assert.equal(res.formulaSubstituida, 'X = (10 × 5) ÷ 2');
});

test('Regra de Três - caso conhecido INVERSE obrigatório (a=2, b=10, c=5 -> x=4)', () => {
  const res = calculateRuleOfThree({
    a: '2',
    b: '10',
    c: '5',
    mode: 'inverse'
  });

  assert.equal(res.valido, true);
  assert.equal(res.mode, 'inverse');
  assert.equal(res.a, 2);
  assert.equal(res.b, 10);
  assert.equal(res.c, 5);
  assert.equal(res.x, 4);
  assert.equal(res.formula, 'X = (A × B) ÷ C');
  assert.equal(res.formulaSubstituida, 'X = (2 × 10) ÷ 5');
});

test('Regra de Três - valores decimais com vírgula e ponto', () => {
  // Direta: 2,5 -> 7,5 | 10 -> X => X = (7.5 * 10) / 2.5 = 30
  const resDirect = calculateRuleOfThree({
    a: '2,5',
    b: '7,5',
    c: '10',
    mode: 'direct'
  });
  assert.equal(resDirect.valido, true);
  assert.ok(Math.abs(resDirect.x - 30) < EPSILON);

  // Inversa: 1.5 -> 6 | 4.5 -> X => X = (1.5 * 6) / 4.5 = 2
  const resInverse = calculateRuleOfThree({
    a: '1.5',
    b: '6',
    c: '4.5',
    mode: 'inverse'
  });
  assert.equal(resInverse.valido, true);
  assert.ok(Math.abs(resInverse.x - 2) < EPSILON);
});

test('Regra de Três - caso onde B = 0 resulta em X = 0', () => {
  const res = calculateRuleOfThree({
    a: 4,
    b: 0,
    c: 8,
    mode: 'direct'
  });

  assert.equal(res.valido, true);
  assert.equal(res.x, 0);
});

test('Regra de Três - ausência de dependência de DOM e imunidade a NaN/Infinity', () => {
  const res = calculateRuleOfThree({
    a: '123.45',
    b: '678.90',
    c: '45.60',
    mode: 'direct'
  });

  assert.equal(res.valido, true);
  assert.ok(Number.isFinite(res.x));
  assert.ok(!Number.isNaN(res.x));
  assert.ok(typeof res.formula === 'string');
  assert.ok(typeof res.formulaSubstituida === 'string');
});

test('Regra de Três - formatRuleOfThreeResult formata números e rótulos para pt-BR', () => {
  const resDirect = calculateRuleOfThree({
    a: '2,5',
    b: '10',
    c: '5',
    mode: 'direct'
  });

  const fmt = formatRuleOfThreeResult(resDirect);
  assert.equal(fmt.modeLabel, 'Regra de Três Direta');
  assert.equal(fmt.aFmt, '2,5');
  assert.equal(fmt.bFmt, '10');
  assert.equal(fmt.cFmt, '5');
  assert.equal(fmt.xFmt, '20');
  assert.equal(fmt.substitutionFmt, 'X = (10 × 5) ÷ 2,5');
});

test('Regra de Três - favorito é reconhecido e gerenciado corretamente pelo core de favoritos', () => {
  _resetMemoryForTesting();
  try {
    assert.ok(VALID_TOOL_IDS.has('regra-de-tres'), 'regra-de-tres deve constar em VALID_TOOL_IDS');
    assert.equal(isFavorite('regra-de-tres'), false);
    assert.equal(addFavorite('regra-de-tres'), true);
    assert.equal(isFavorite('regra-de-tres'), true);
    assert.equal(toggleFavorite('regra-de-tres'), false);
    assert.equal(isFavorite('regra-de-tres'), false);
    assert.equal(toggleFavorite('regra-de-tres'), true);
    assert.equal(isFavorite('regra-de-tres'), true);
    assert.equal(removeFavorite('regra-de-tres'), true);
    assert.equal(isFavorite('regra-de-tres'), false);
  } finally {
    _resetMemoryForTesting();
  }
});

test('Regra de Três - overflow numérico (Infinity) retorna erro amigável', () => {
  const resDirect = calculateRuleOfThree({
    a: 1,
    b: 1e200,
    c: 1e200,
    mode: 'direct'
  });

  assert.equal(resDirect.valido, false);
  assert.equal(resDirect.erro, 'O resultado matemático é muito grande para ser calculado.');

  const resInverse = calculateRuleOfThree({
    a: 1e200,
    b: 1e200,
    c: 1,
    mode: 'inverse'
  });

  assert.equal(resInverse.valido, false);
  assert.equal(resInverse.erro, 'O resultado matemático é muito grande para ser calculado.');
});

test('Regra de Três - entrada com valores negativos em string retorna mensagem específica', () => {
  const resA = calculateRuleOfThree({ a: '-5', b: '10', c: '2', mode: 'direct' });
  assert.equal(resA.valido, false);
  assert.equal(resA.erro, 'Os valores de A, B e C devem ser números positivos.');

  const resB = calculateRuleOfThree({ a: '5', b: '-10', c: '2', mode: 'direct' });
  assert.equal(resB.valido, false);
  assert.equal(resB.erro, 'Os valores de A, B e C devem ser números positivos.');

  const resC = calculateRuleOfThree({ a: '5', b: '10', c: '-2', mode: 'direct' });
  assert.equal(resC.valido, false);
  assert.equal(resC.erro, 'Os valores de A, B e C devem ser números positivos.');

  const resInverse = calculateRuleOfThree({ a: '-2', b: '10', c: '5', mode: 'inverse' });
  assert.equal(resInverse.valido, false);
  assert.equal(resInverse.erro, 'Os valores de A, B e C devem ser números positivos.');
});

test('Regra de Três - markup e alinhamento dos campos e botões seguem padrão responsivo sem conflitos inline', () => {
  const pagePath = path.join(process.cwd(), 'src', 'pages', 'tools', 'matematica', 'regra-de-tres.page.html');
  const content = fs.readFileSync(pagePath, 'utf-8');

  // Controles de proporcionalidade estruturados com classes dedicadas
  assert.match(content, /class="[^"]*regra-proporcao-group/);
  assert.match(content, /class="[^"]*regra-proporcao-options/);
  assert.match(content, /class="[^"]*regra-radio/);

  // Grid estruturado com linhas e campos simétricos
  assert.match(content, /class="[^"]*regra-grid-container/);
  assert.match(content, /class="[^"]*regra-grid-row/);
  assert.match(content, /class="[^"]*regra-input/);
  assert.match(content, /class="[^"]*regra-box-x/);
  assert.match(content, /class="[^"]*regra-arrow/);

  // Campos de entrada com IDs e atributos preservados
  assert.match(content, /id="valorA"/);
  assert.match(content, /id="valorB"/);
  assert.match(content, /id="valorC"/);
  assert.match(content, /id="resultado"/);
  assert.match(content, /id="regraDeTresStatus"/);

  // Botões principais usam container padrão .tool-actions sem conflito inline
  assert.match(content, /<div class="tool-actions">\s*<button[^>]*data-action="calculate"/);
  assert.match(content, /<button[^>]*data-action="clear"/);

  // Ações secundárias usam .tool-actions.result-actions sem conflito de centralização ou gap restritivo
  assert.match(content, /<div class="tool-actions result-actions"/);
  assert.ok(!content.includes('justify-content: center'), 'Não deve conter centralização inline que desalinhe os botões');
  assert.ok(!content.includes('gap: 8px'), 'Não deve conter gap inline conflitante com padrão de 12px / responsivo');
});

test('Regra de Três - artigo no blog utiliza container .card e blocos pre responsivos', () => {
  const articlePath = path.join(process.cwd(), 'src', 'pages', 'blog', 'artigos', 'como-fazer-regra-de-tres-simples.page.html');
  const content = fs.readFileSync(articlePath, 'utf-8');

  // O artigo deve usar a classe padrão card como todos os artigos do blog
  assert.match(content, /<article class="card"/);

  // Blocos <pre> devem ter overflow horizontal habilitado para evitar quebras em mobile
  const preMatches = content.match(/<pre[^>]*>/g) || [];
  assert.ok(preMatches.length >= 2, 'Deve conter pelo menos 2 blocos pre com tabelas demonstrativas');
  for (const pre of preMatches) {
    assert.ok(pre.includes('overflow-x'), 'Bloco pre deve conter overflow-x para responsividade');
    assert.ok(pre.includes('max-width'), 'Bloco pre deve conter max-width para não estourar viewport');
  }
});

test('Regra de Três - botão de favorito funciona de ponta a ponta com DOM, localStorage e atualização de página', () => {
  let store = {};
  const storage = {
    getItem: key => (key in store ? store[key] : null),
    setItem: (key, val) => { store[key] = String(val); },
    removeItem: key => { delete store[key]; },
    clear: () => { store = {}; }
  };

  const originalWindow = globalThis.window;
  const originalLocalStorage = globalThis.localStorage;

  globalThis.window = { localStorage: storage };
  globalThis.localStorage = storage;
  _resetMemoryForTesting();

  try {
    const listeners = {};
    const attrs = {
      'type': 'button',
      'data-favorite-button': '',
      'data-tool-id': 'regra-de-tres',
      'data-tool-category': 'matematica',
      'data-tool-name': 'Calculadora de Regra de Três',
      'aria-pressed': 'false',
      'aria-label': 'Adicionar Calculadora de Regra de Três aos favoritos'
    };
    const iconSpan = { textContent: '☆' };
    const textSpan = { textContent: 'Favoritar' };
    const statusEl = { textContent: '', getAttribute: name => (name === 'role' ? 'status' : null) };

    let container = null;
    const btn = {
      _favoriteBound: false,
      getAttribute: name => (name in attrs ? attrs[name] : null),
      setAttribute: (name, val) => { attrs[name] = String(val); },
      hasAttribute: name => name in attrs,
      querySelector: sel => {
        if (sel === '.favorite-icon') return iconSpan;
        if (sel === '.favorite-text') return textSpan;
        return null;
      },
      addEventListener: (type, fn) => {
        listeners[type] = listeners[type] || [];
        listeners[type].push(fn);
      },
      click: () => {
        (listeners['click'] || []).forEach(fn => fn());
      },
      closest: () => container,
      get parentElement() { return container; }
    };

    container = {
      querySelector: sel => (sel === '[role="status"]' ? statusEl : (sel === '[data-favorite-button]' ? btn : null)),
      querySelectorAll: sel => (sel === '[data-favorite-button]' ? [btn] : [])
    };

    // 1. Estado inicial não-favoritado
    initFavoriteButtons(container);
    assert.equal(btn.getAttribute('aria-pressed'), 'false');
    assert.equal(iconSpan.textContent, '☆');
    assert.equal(textSpan.textContent, 'Favoritar');
    assert.equal(isFavorite('regra-de-tres'), false);

    // 2. Clique para favoritar
    btn.click();
    assert.equal(btn.getAttribute('aria-pressed'), 'true');
    assert.equal(iconSpan.textContent, '★');
    assert.equal(textSpan.textContent, 'Favoritado');
    assert.equal(isFavorite('regra-de-tres'), true);
    assert.deepEqual(getFavorites(), ['regra-de-tres']);
    assert.ok(storage.getItem(STORAGE_KEY).includes('regra-de-tres'));
    assert.ok(statusEl.textContent.includes('adicionada aos favoritos'));

    // 3. Simulação de recarregamento de página: novo botão lê localStorage existente
    btn._favoriteBound = false;
    listeners['click'] = [];
    btn.setAttribute('aria-pressed', 'false');
    iconSpan.textContent = '☆';
    textSpan.textContent = 'Favoritar';
    initFavoriteButtons(container);
    assert.equal(btn.getAttribute('aria-pressed'), 'true');
    assert.equal(iconSpan.textContent, '★');
    assert.equal(textSpan.textContent, 'Favoritado');

    // 4. Clique para desfavoritar
    btn.click();
    assert.equal(btn.getAttribute('aria-pressed'), 'false');
    assert.equal(iconSpan.textContent, '☆');
    assert.equal(textSpan.textContent, 'Favoritar');
    assert.equal(isFavorite('regra-de-tres'), false);
    assert.deepEqual(getFavorites(), []);
    assert.ok(statusEl.textContent.includes('removida dos favoritos'));
  } finally {
    globalThis.window = originalWindow;
    globalThis.localStorage = originalLocalStorage;
    _resetMemoryForTesting();
  }
});

test('Regra de Três - Listagem da categoria Matemática em dist e dist-pilot inclui card com nome, link e descrição sem duplicatas', () => {
  const rootDir = path.resolve('.');
  const distMatematica = path.join(rootDir, 'dist', 'matematica.html');
  const pilotMatematica = path.join(rootDir, 'dist-pilot', 'matematica.html');

  for (const filePath of [distMatematica, pilotMatematica]) {
    assert.ok(fs.existsSync(filePath), `${filePath} deve existir`);
    const html = fs.readFileSync(filePath, 'utf-8');

    // 1. Link para tools/matematica/regra-de-tres.html
    assert.match(html, /href="\.\/tools\/matematica\/regra-de-tres\.html"/, 'Deve conter link correto para regra de três');

    // 2. Nome da calculadora dentro do card
    assert.match(html, /<a\s+[^>]*class="card"[^>]*>Calculadora de Regra de Três<\/a>/, 'Deve conter o nome Calculadora de Regra de Três no cartão');

    // 3. Descrição clara e objetiva no title
    assert.ok(html.includes('title="Calcule regra de três simples direta ou inversa com explicação do resultado."'), 'Card deve ter descrição clara e objetiva no title');

    // 4. Sem duplicatas
    const occurrences = (html.match(/tools\/matematica\/regra-de-tres\.html/g) || []).length;
    assert.equal(occurrences, 1, 'Deve haver exatamente 1 ocorrência do link da ferramenta na página');

    // 5. Total de 5 cards na categoria Matemática (4 legadas + 1 factory)
    const gridMatch = html.match(/<section class="tools category-tools">([\s\S]*?)<\/section>/);
    assert.ok(gridMatch, 'Deve conter section category-tools');
    const cards = gridMatch[1].match(/<a\s+[^>]*class="card"[^>]*>/g);
    assert.ok(cards, 'Devem existir cards na section');
    assert.equal(cards.length, 5, 'Deve conter exatamente 5 cards na categoria Matemática');
  }
});
