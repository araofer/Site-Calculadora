import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { STORAGE_KEY, _resetMemoryForTesting } from '../js/core/favorites.js';
import build from '../scripts/build-html.js';

const require = createRequire(import.meta.url);
const { TOOLS_CATALOG } = require('../js/tools-catalog.js');
const { SITE_PAGES, SITE_ASSETS, buildPages } = build;
const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let importCounter = 0;

class MockElement {
  constructor(tagName = 'div') {
    this.tagName = tagName.toUpperCase();
    this.attributes = {};
    this.children = [];
    this.listeners = {};
    this.hidden = false;
    this.textContent = '';
    this.className = '';
  }
  setAttribute(name, value) { this.attributes[name] = String(value); }
  getAttribute(name) { return this.attributes[name] ?? null; }
  append(...elements) { this.children.push(...elements); }
  replaceChildren(...elements) { this.children = elements; }
  addEventListener(name, handler) { (this.listeners[name] ||= []).push(handler); }
  click() { for (const fn of this.listeners.click || []) fn({ currentTarget: this }); }
  focus() { globalThis.document.activeElement = this; }
  querySelector(selector) {
    const cls = selector.startsWith('.') ? selector.slice(1) : null;
    const visit = nodes => {
      for (const node of nodes) {
        if (cls && node.className.split(' ').includes(cls)) return node;
        const nested = visit(node.children || []);
        if (nested) return nested;
      }
      return null;
    };
    return visit(this.children);
  }
}

function createPageEnv(seed = [], options = {}) {
  const store = new Map([[STORAGE_KEY, JSON.stringify(seed)]]);
  const storage = {
    getItem(key) {
      if (options.failRead) throw new Error('SecurityError');
      return store.has(key) ? store.get(key) : null;
    },
    setItem(key, value) {
      if (options.failWrite) throw new Error('QuotaExceededError');
      store.set(key, String(value));
    }
  };
  const elements = Object.fromEntries([
    'favorites-list', 'favorites-empty', 'favorites-feedback', 'favorites-error', 'favorites-empty-link'
  ].map(id => [id, new MockElement(id === 'favorites-list' ? 'ul' : 'p')]));
  elements['favorites-empty-link'].setAttribute('href', '/index.html');
  const windowListeners = {};
  globalThis.document = {
    readyState: 'complete',
    activeElement: null,
    getElementById: id => elements[id] || null,
    createElement: tag => new MockElement(tag),
    querySelectorAll: () => [],
    addEventListener() {}
  };
  globalThis.window = {
    localStorage: storage,
    TOOLS_CATALOG,
    addEventListener(name, handler) { (windowListeners[name] ||= []).push(handler); },
    dispatchEvent(event) { for (const fn of windowListeners[event.type] || []) fn(event); }
  };
  globalThis.localStorage = storage;
  _resetMemoryForTesting();
  return {
    elements,
    store,
    async load() {
      const pageScript = new URL('../js/favorites-page.js', import.meta.url);
      pageScript.searchParams.set('test', String(++importCounter));
      await import(pageScript.href);
    },
    restore() {
      delete globalThis.window;
      delete globalThis.document;
      delete globalThis.localStorage;
      _resetMemoryForTesting();
    }
  };
}

test('estado vazio mostra orientação e link para explorar', async () => {
  const env = createPageEnv();
  try {
    await env.load();
    assert.equal(env.elements['favorites-empty'].hidden, false);
    assert.equal(env.elements['favorites-empty-link'].getAttribute('href'), '/index.html');
    assert.equal(env.elements['favorites-list'].children.length, 0);
  } finally { env.restore(); }
});

test('um favorito mostra nome, categoria, URL do catálogo e botão acessível', async () => {
  const env = createPageEnv(['juros']);
  try {
    await env.load();
    const [item] = env.elements['favorites-list'].children;
    assert.equal(item.children[0].textContent, 'Calculadora de Juros');
    assert.equal(item.children[0].href, '/tools/financas/juros.html');
    assert.equal(item.children[1].textContent, 'Financeiro');
    assert.match(item.children[2].getAttribute('aria-label'), /Remover Calculadora de Juros/);
    assert.equal(env.elements['favorites-empty'].hidden, true);
  } finally { env.restore(); }
});

test('Orçamento Doméstico favoritado aparece na listagem com URL e categoria do catálogo', async () => {
  const env = createPageEnv(['orcamento-domestico']);
  try {
    await env.load();
    const [item] = env.elements['favorites-list'].children;
    assert.equal(item.children[0].textContent, 'Calculadora de Orçamento Doméstico');
    assert.equal(item.children[0].href, '/tools/financas/orcamento-domestico.html');
    assert.equal(item.children[1].textContent, 'Financeiro');
  } finally { env.restore(); }
});

test('múltiplos favoritos de categorias diferentes são listados sem duplicatas', async () => {
  const env = createPageEnv(['juros', 'imc', 'juros', 'pisos-revestimentos']);
  try {
    await env.load();
    const items = env.elements['favorites-list'].children;
    assert.equal(items.length, 3);
    assert.deepEqual(items.map(item => item.children[1].textContent), ['Financeiro', 'Saúde', 'Utilidades']);
  } finally { env.restore(); }
});

test('remover atualiza lista e armazenamento, e a lista persiste ao recarregar', async () => {
  const env = createPageEnv(['juros', 'imc']);
  try {
    await env.load();
    const removeJuros = env.elements['favorites-list'].children[0].children[2];
    removeJuros.click();
    assert.equal(env.elements['favorites-list'].children.length, 1);
    assert.equal(env.elements['favorites-list'].children[0].children[0].textContent, 'Calculadora de IMC');
    assert.deepEqual(JSON.parse(env.store.get(STORAGE_KEY)), ['imc']);
    assert.match(env.elements['favorites-feedback'].textContent, /removido dos favoritos/);

    const reload = createPageEnv(JSON.parse(env.store.get(STORAGE_KEY)));
    try {
      await reload.load();
      assert.equal(reload.elements['favorites-list'].children[0].children[0].textContent, 'Calculadora de IMC');
    } finally { reload.restore(); }
  } finally { env.restore(); }
});

test('ID desconhecido permanece visível como indisponível e pode ser removido sem perder outros IDs', async () => {
  const env = createPageEnv(['juros', 'ferramenta-antiga']);
  try {
    await env.load();
    const stale = env.elements['favorites-list'].children[1];
    assert.match(stale.children[0].textContent, /não está mais disponível/);
    assert.equal(stale.children.some(child => child.href), false);
    stale.children[1].click();
    assert.deepEqual(JSON.parse(env.store.get(STORAGE_KEY)), ['juros']);
    assert.equal(env.elements['favorites-list'].children.length, 1);
  } finally { env.restore(); }
});

test('falhas de leitura e gravação exibem erro sem lançar nem apagar dados', async () => {
  const readEnv = createPageEnv(['juros'], { failRead: true });
  try {
    await readEnv.load();
    assert.equal(readEnv.elements['favorites-error'].hidden, false);
    assert.match(readEnv.elements['favorites-error'].textContent, /Não foi possível ler/);
  } finally { readEnv.restore(); }

  const writeEnv = createPageEnv(['juros'], { failWrite: true });
  try {
    await writeEnv.load();
    writeEnv.elements['favorites-list'].children[0].children[2].click();
    assert.match(writeEnv.elements['favorites-error'].textContent, /Não foi possível salvar/);
    assert.deepEqual(JSON.parse(writeEnv.store.get(STORAGE_KEY)), ['juros']);
    assert.equal(writeEnv.elements['favorites-list'].children.length, 1);
  } finally { writeEnv.restore(); }
});

test('build gera favoritos.html, inclui link no cabeçalho e mantém a rota fora do sitemap', () => {
  const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cm-favorites-build-'));
  try {
    const result = buildPages(SITE_PAGES, { outputDir, assets: SITE_ASSETS });
    assert.ok(result.some(page => page.relativeOutputPath === 'favoritos.html'));
    const htmlPath = path.join(outputDir, 'favoritos.html');
    const html = fs.readFileSync(htmlPath, 'utf8');
    assert.match(html, /<meta name="robots" content="noindex, follow">/);
    assert.match(html, /href="\.\/favoritos\.html">Meus favoritos<\/a>/);
    assert.match(html, /src="\.\/js\/favorites-page\.js"><\/script>/);
    assert.doesNotMatch(fs.readFileSync(path.join(rootDir, 'sitemap.xml'), 'utf8'), /\/favoritos\.html/);
    assert.ok(fs.statSync(htmlPath).size > 500);
  } finally {
    fs.rmSync(outputDir, { recursive: true, force: true });
  }
});
