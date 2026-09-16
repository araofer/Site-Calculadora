import test from 'node:test';
import assert from 'node:assert/strict';

import {
  STORAGE_KEY,
  VALID_TOOL_IDS,
  getFavorites,
  isFavorite,
  addFavorite,
  removeFavorite,
  toggleFavorite,
  updateButtonState,
  initFavoriteButtons,
  _resetMemoryForTesting
} from '../js/core/favorites.js';

function createMockStorage(initial = {}) {
  let store = { ...initial };
  let throwOnGet = false;
  let throwOnSet = false;

  return {
    getItem(key) {
      if (throwOnGet) throw new Error('SecurityError: Access Denied');
      return key in store ? store[key] : null;
    },
    setItem(key, value) {
      if (throwOnSet) throw new Error('QuotaExceededError');
      store[key] = String(value);
    },
    removeItem(key) {
      delete store[key];
    },
    clear() {
      store = {};
    },
    _setThrowOnGet(val) {
      throwOnGet = val;
    },
    _setThrowOnSet(val) {
      throwOnSet = val;
    },
    _getStore() {
      return store;
    }
  };
}

function createMockButton(attrs = {}) {
  const attributes = {
    'type': 'button',
    'data-favorite-button': '',
    'aria-pressed': 'false',
    'data-tool-id': 'juros',
    'data-tool-category': 'financas',
    'data-tool-name': 'Calculadora de Juros',
    'aria-label': 'Adicionar Calculadora de Juros aos favoritos',
    ...attrs
  };
  const listeners = {};
  const children = {
    icon: { textContent: '☆' },
    text: { textContent: 'Favoritar' }
  };
  let innerHTML = '<span class="favorite-icon" aria-hidden="true">☆</span> <span class="favorite-text">Favoritar</span>';

  const statusEl = {
    textContent: '',
    getAttribute(name) {
      if (name === 'role') return 'status';
      if (name === 'aria-live') return 'polite';
      return null;
    }
  };

  const container = {
    querySelector(selector) {
      if (selector === '[role="status"]') return statusEl;
      if (selector === '[data-favorite-button]') return btn;
      return null;
    },
    querySelectorAll(selector) {
      if (selector === '[data-favorite-button]') return [btn];
      return [];
    }
  };

  const btn = {
    _favoriteBound: false,
    getAttribute(name) {
      return attributes[name] !== undefined ? attributes[name] : null;
    },
    setAttribute(name, value) {
      attributes[name] = String(value);
    },
    hasAttribute(name) {
      return name in attributes;
    },
    removeAttribute(name) {
      delete attributes[name];
    },
    querySelector(selector) {
      if (selector === '.favorite-icon') return children.icon;
      if (selector === '.favorite-text') return children.text;
      return null;
    },
    addEventListener(type, fn) {
      if (!listeners[type]) listeners[type] = [];
      listeners[type].push(fn);
    },
    click() {
      if (listeners['click']) {
        listeners['click'].forEach(fn => fn());
      }
    },
    get innerHTML() {
      return innerHTML;
    },
    set innerHTML(val) {
      innerHTML = val;
      if (val.includes('★')) children.icon.textContent = '★';
      if (val.includes('☆')) children.icon.textContent = '☆';
      if (val.includes('Favoritado')) children.text.textContent = 'Favoritado';
      if (val.includes('Favoritar')) children.text.textContent = 'Favoritar';
    },
    get textContent() {
      return `${children.icon.textContent} ${children.text.textContent}`;
    },
    closest(selector) {
      if (selector === '.tool-header-actions') return container;
      return null;
    },
    parentElement: container,
    statusElement: statusEl
  };

  return { btn, statusEl, container };
}

function setupTestEnvironment(initialStorage = {}) {
  const storage = createMockStorage(initialStorage);
  const events = [];
  const gtag = (actionType, eventName, payload) => {
    events.push({ actionType, eventName, payload });
  };

  globalThis.window = {
    localStorage: storage,
    gtag
  };
  globalThis.localStorage = storage;
  _resetMemoryForTesting();

  return {
    storage,
    events,
    restore() {
      delete globalThis.window;
      delete globalThis.localStorage;
      _resetMemoryForTesting();
    }
  };
}

test('1. storage vazio: getFavorites retorna array vazio', () => {
  const env = setupTestEnvironment({});
  try {
    const favs = getFavorites();
    assert.deepEqual(favs, []);
  } finally {
    env.restore();
  }
});

test('2. getFavorites retorna [] quando storage não tem chave definida', () => {
  const env = setupTestEnvironment();
  try {
    assert.equal(env.storage.getItem(STORAGE_KEY), null);
    assert.deepEqual(getFavorites(), []);
  } finally {
    env.restore();
  }
});

test('3. adicionar ID válido adiciona ao storage e retorna true', () => {
  const env = setupTestEnvironment();
  try {
    const ok = addFavorite('juros');
    assert.equal(ok, true);
    assert.deepEqual(getFavorites(), ['juros']);
    assert.equal(isFavorite('juros'), true);
  } finally {
    env.restore();
  }
});

test('4. isFavorite retorna true para favorito e false para não favorito', () => {
  const env = setupTestEnvironment({
    [STORAGE_KEY]: JSON.stringify(['juros', 'lucro'])
  });
  try {
    assert.equal(isFavorite('juros'), true);
    assert.equal(isFavorite('lucro'), true);
    assert.equal(isFavorite('desconto'), false);
    assert.equal(isFavorite('nao-existe'), false);
  } finally {
    env.restore();
  }
});

test('5. remover ID retira do storage e atualiza estado', () => {
  const env = setupTestEnvironment({
    [STORAGE_KEY]: JSON.stringify(['juros', 'lucro'])
  });
  try {
    const ok = removeFavorite('juros');
    assert.equal(ok, true);
    assert.deepEqual(getFavorites(), ['lucro']);
    assert.equal(isFavorite('juros'), false);
    assert.equal(isFavorite('lucro'), true);
  } finally {
    env.restore();
  }
});

test('6. toggleFavorite alterna entre adicionado e removido', () => {
  const env = setupTestEnvironment();
  try {
    const nowTrue = toggleFavorite('juros');
    assert.equal(nowTrue, true);
    assert.equal(isFavorite('juros'), true);

    const nowFalse = toggleFavorite('juros');
    assert.equal(nowFalse, false);
    assert.equal(isFavorite('juros'), false);
  } finally {
    env.restore();
  }
});

test('7. impedir duplicados ao adicionar o mesmo ID repetidamente', () => {
  const env = setupTestEnvironment();
  try {
    addFavorite('juros');
    addFavorite('juros');
    addFavorite('juros');
    assert.deepEqual(getFavorites(), ['juros']);
    assert.equal(getFavorites().length, 1);
  } finally {
    env.restore();
  }
});

test('8. rejeitar ID inválido ou desconhecido', () => {
  const env = setupTestEnvironment();
  try {
    assert.equal(addFavorite('ferramenta-inexistente'), false);
    assert.equal(addFavorite(''), false);
    assert.equal(addFavorite(null), false);
    assert.equal(addFavorite(123), false);
    assert.deepEqual(getFavorites(), []);
    assert.equal(isFavorite('ferramenta-inexistente'), false);
  } finally {
    env.restore();
  }
});

test('9. JSON corrompido no storage é tratado defensivamente sem lançar erro', () => {
  const env = setupTestEnvironment({
    [STORAGE_KEY]: '{json-invalido-quebrado'
  });
  try {
    const favs = getFavorites();
    assert.deepEqual(favs, []);
  } finally {
    env.restore();
  }
});

test('10. storage contendo objeto em vez de array é tratado com fallback []', () => {
  const env = setupTestEnvironment({
    [STORAGE_KEY]: JSON.stringify({ juros: true, lucro: true })
  });
  try {
    const favs = getFavorites();
    assert.deepEqual(favs, []);
  } finally {
    env.restore();
  }
});

test('11. storage bloqueado (exceção SecurityError) não lança erro para o usuário', () => {
  const env = setupTestEnvironment();
  try {
    env.storage._setThrowOnGet(true);
    assert.doesNotThrow(() => {
      const favs = getFavorites();
      assert.deepEqual(favs, []);
    });
  } finally {
    env.restore();
  }
});

test('12. fallback em memória mantém favoritos funcionais mesmo com storage bloqueado', () => {
  const env = setupTestEnvironment();
  try {
    env.storage._setThrowOnSet(true);
    const added = addFavorite('juros');
    assert.equal(added, true);
    assert.equal(isFavorite('juros'), true);
    assert.deepEqual(getFavorites(), ['juros']);
  } finally {
    env.restore();
  }
});

test('13. persistência simulada e reload recuperam estado gravado no storage', () => {
  const env1 = setupTestEnvironment();
  try {
    addFavorite('juros');
    addFavorite('lucro');
  } finally {
    env1.restore();
  }

  // Simula recarregamento de página restaurando o storage com os dados gravados
  const env2 = setupTestEnvironment({
    [STORAGE_KEY]: JSON.stringify(['juros', 'lucro'])
  });
  try {
    assert.deepEqual(getFavorites(), ['juros', 'lucro']);
    assert.equal(isFavorite('juros'), true);
    assert.equal(isFavorite('lucro'), true);
    assert.equal(isFavorite('desconto'), false);
  } finally {
    env2.restore();
  }
});

test('14. isolamento entre IDs diferentes ao favoritar e desfavoritar', () => {
  const env = setupTestEnvironment();
  try {
    addFavorite('juros');
    assert.equal(isFavorite('juros'), true);
    assert.equal(isFavorite('imc'), false);
    assert.equal(isFavorite('combustivel'), false);

    addFavorite('imc');
    assert.equal(isFavorite('juros'), true);
    assert.equal(isFavorite('imc'), true);

    removeFavorite('juros');
    assert.equal(isFavorite('juros'), false);
    assert.equal(isFavorite('imc'), true);
  } finally {
    env.restore();
  }
});

test('15. exatamente 15 IDs reconhecidos no catálogo oficial', () => {
  assert.equal(VALID_TOOL_IDS.size, 15, 'Catálogo deve conter exatamente 15 IDs de ferramentas');
  const expected = [
    'horas-extras',
    'financiamento-carro',
    'financiamento-imovel',
    'desconto',
    'juros',
    'lucro',
    'porcentagem',
    'dividir-conta',
    'imc',
    'idade',
    'combustivel',
    'contador',
    'senha',
    'qr-code',
    'whatsapp'
  ];
  for (const id of expected) {
    assert.ok(VALID_TOOL_IDS.has(id), `ID "${id}" deve estar presente no conjunto de IDs válidos`);
  }
});

test('16. aria-pressed transiciona de false para true e vice-versa ao clicar', () => {
  const env = setupTestEnvironment();
  try {
    const { btn, container } = createMockButton({ 'data-tool-id': 'juros' });
    initFavoriteButtons(container);

    assert.equal(btn.getAttribute('aria-pressed'), 'false');
    btn.click();
    assert.equal(btn.getAttribute('aria-pressed'), 'true');
    btn.click();
    assert.equal(btn.getAttribute('aria-pressed'), 'false');
  } finally {
    env.restore();
  }
});

test('17. aria-label atualizado dinamicamente com base no estado do favorito', () => {
  const env = setupTestEnvironment();
  try {
    const { btn, container } = createMockButton({
      'data-tool-id': 'juros',
      'data-tool-name': 'Calculadora de Juros'
    });
    initFavoriteButtons(container);

    assert.equal(btn.getAttribute('aria-label'), 'Adicionar Calculadora de Juros aos favoritos');
    btn.click();
    assert.equal(btn.getAttribute('aria-label'), 'Remover Calculadora de Juros dos favoritos');
    btn.click();
    assert.equal(btn.getAttribute('aria-label'), 'Adicionar Calculadora de Juros aos favoritos');
  } finally {
    env.restore();
  }
});

test('18. texto do botão transiciona de Favoritar para Favoritado e vice-versa', () => {
  const env = setupTestEnvironment();
  try {
    const { btn, container } = createMockButton({ 'data-tool-id': 'juros' });
    initFavoriteButtons(container);

    assert.ok(btn.textContent.includes('Favoritar'));
    assert.ok(!btn.textContent.includes('Favoritado'));

    btn.click();
    assert.ok(btn.textContent.includes('Favoritado'));

    btn.click();
    assert.ok(btn.textContent.includes('Favoritar'));
  } finally {
    env.restore();
  }
});

test('19. evento favorite_add disparado uma única vez após clique efetivo', () => {
  const env = setupTestEnvironment();
  try {
    const { btn, container } = createMockButton({
      'data-tool-id': 'juros',
      'data-tool-category': 'financas'
    });
    initFavoriteButtons(container);
    assert.equal(env.events.length, 0, 'Zero eventos antes do clique');

    btn.click();
    assert.equal(env.events.length, 1);
    assert.deepEqual(env.events[0], {
      actionType: 'event',
      eventName: 'calculator_action',
      payload: {
        calculator_id: 'juros',
        calculator_category: 'financas',
        action: 'favorite_add'
      }
    });
  } finally {
    env.restore();
  }
});

test('20. evento favorite_remove disparado uma única vez ao desfavoritar', () => {
  const env = setupTestEnvironment({
    [STORAGE_KEY]: JSON.stringify(['juros'])
  });
  try {
    const { btn, container } = createMockButton({
      'data-tool-id': 'juros',
      'data-tool-category': 'financas'
    });
    initFavoriteButtons(container);
    assert.equal(env.events.length, 0, 'Zero eventos na inicialização com favorito salvo');

    btn.click();
    assert.equal(env.events.length, 1);
    assert.deepEqual(env.events[0], {
      actionType: 'event',
      eventName: 'calculator_action',
      payload: {
        calculator_id: 'juros',
        calculator_category: 'financas',
        action: 'favorite_remove'
      }
    });
  } finally {
    env.restore();
  }
});

test('21. nenhuma emissão GA4 na inicialização ou reload dos botões', () => {
  const env = setupTestEnvironment({
    [STORAGE_KEY]: JSON.stringify(['juros', 'lucro'])
  });
  try {
    const { btn, container } = createMockButton({ 'data-tool-id': 'juros' });
    initFavoriteButtons(container);

    assert.equal(env.events.length, 0, 'Nenhum evento GA4 disparado na inicialização');
    assert.equal(btn.getAttribute('aria-pressed'), 'true');
    assert.ok(btn.textContent.includes('Favoritado'));
  } finally {
    env.restore();
  }
});
