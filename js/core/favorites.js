/**
 * Helper ESM: Gerenciador de Favoritos - Calculadora Master
 * Módulo puro, defensivo, seguro para SSR e zero dependências externas.
 * Persistência primária via localStorage com fallback resiliente em memória.
 * Nunca lança exceções para os chamadores e nunca envia dados pessoais.
 */

import { trackCalculatorAction } from './analytics.js';

export const STORAGE_KEY = 'calculadoraMaster:favorites:v1';

export const VALID_TOOL_IDS = new Set([
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
]);

let memoryFavorites = null;

/**
 * Obtém com segurança a referência ao localStorage disponível no ambiente.
 *
 * @returns {Storage|null}
 */
function getStorage() {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage;
    }
    if (typeof globalThis !== 'undefined' && globalThis.localStorage) {
      return globalThis.localStorage;
    }
  } catch (_) {
    // Acesso bloqueado por segurança/política de cookies
  }
  return null;
}

/**
 * Salva a lista de favoritos no storage e no fallback em memória.
 *
 * @param {Array<string>} favoritesArray
 * @returns {boolean} true se persistido no storage, false se apenas em memória
 */
function persistFavorites(favoritesArray) {
  memoryFavorites = new Set(favoritesArray);

  const storage = getStorage();
  if (!storage) {
    return false;
  }

  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(favoritesArray));
    return true;
  } catch (_) {
    // QuotaExceededError, SecurityError, etc.
    return false;
  }
}

/**
 * Retorna a lista atual de IDs favoritos válidos.
 *
 * @returns {Array<string>}
 */
export function getFavorites() {
  const storage = getStorage();
  if (!storage) {
    return memoryFavorites !== null ? Array.from(memoryFavorites) : [];
  }

  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (raw === null || raw === undefined || raw === '') {
      return memoryFavorites !== null ? Array.from(memoryFavorites) : [];
    }

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (_) {
      // JSON corrompido no storage
      return memoryFavorites !== null ? Array.from(memoryFavorites) : [];
    }

    if (!Array.isArray(parsed)) {
      // Dado não é um array
      return memoryFavorites !== null ? Array.from(memoryFavorites) : [];
    }

    const sanitized = [];
    for (const item of parsed) {
      if (typeof item === 'string') {
        const trimmed = item.trim();
        if (VALID_TOOL_IDS.has(trimmed) && !sanitized.includes(trimmed)) {
          sanitized.push(trimmed);
        }
      }
    }

    memoryFavorites = new Set(sanitized);
    return sanitized;
  } catch (_) {
    // Storage inacessível / bloqueado
    return memoryFavorites !== null ? Array.from(memoryFavorites) : [];
  }
}

/**
 * Verifica se uma ferramenta específica está favoritada.
 *
 * @param {string} toolId
 * @returns {boolean}
 */
export function isFavorite(toolId) {
  if (typeof toolId !== 'string') return false;
  const id = toolId.trim();
  if (!VALID_TOOL_IDS.has(id)) return false;

  return getFavorites().includes(id);
}

/**
 * Adiciona uma calculadora aos favoritos.
 *
 * @param {string} toolId
 * @returns {boolean} true se adicionada ou já existente, false se ID inválido
 */
export function addFavorite(toolId) {
  if (typeof toolId !== 'string') return false;
  const id = toolId.trim();
  if (!VALID_TOOL_IDS.has(id)) return false;

  const current = getFavorites();
  if (current.includes(id)) {
    return true;
  }

  current.push(id);
  persistFavorites(current);
  return true;
}

/**
 * Remove uma calculadora dos favoritos.
 *
 * @param {string} toolId
 * @returns {boolean} true se removida ou inexistente, false se ID inválido
 */
export function removeFavorite(toolId) {
  if (typeof toolId !== 'string') return false;
  const id = toolId.trim();
  if (!VALID_TOOL_IDS.has(id)) return false;

  const current = getFavorites();
  const index = current.indexOf(id);
  if (index === -1) {
    return true;
  }

  current.splice(index, 1);
  persistFavorites(current);
  return true;
}

/**
 * Alterna o estado de favorito de uma calculadora.
 *
 * @param {string} toolId
 * @returns {boolean} Novo estado booleano (true = favoritado, false = não favoritado)
 */
export function toggleFavorite(toolId) {
  if (typeof toolId !== 'string') return false;
  const id = toolId.trim();
  if (!VALID_TOOL_IDS.has(id)) return false;

  if (isFavorite(id)) {
    removeFavorite(id);
    return false;
  } else {
    addFavorite(id);
    return true;
  }
}

/**
 * Atualiza visualmente e semanticamente o estado de um botão de favorito.
 *
 * @param {HTMLElement} button
 * @param {boolean} isFav
 */
export function updateButtonState(button, isFav) {
  if (!button || typeof button.setAttribute !== 'function') return;

  const toolName = button.getAttribute('data-tool-name') || 'esta calculadora';
  button.setAttribute('aria-pressed', isFav ? 'true' : 'false');
  button.setAttribute(
    'aria-label',
    isFav ? `Remover ${toolName} dos favoritos` : `Adicionar ${toolName} aos favoritos`
  );

  const icon = isFav ? '★' : '☆';
  const text = isFav ? 'Favoritado' : 'Favoritar';

  const iconEl = typeof button.querySelector === 'function' ? button.querySelector('.favorite-icon') : null;
  const textEl = typeof button.querySelector === 'function' ? button.querySelector('.favorite-text') : null;

  if (iconEl && textEl) {
    iconEl.textContent = icon;
    textEl.textContent = text;
  } else {
    button.innerHTML = `<span class="favorite-icon" aria-hidden="true">${icon}</span> <span class="favorite-text">${text}</span>`;
  }
}

/**
 * Atualiza o elemento de status acessível para leitores de tela.
 *
 * @param {HTMLElement} button
 * @param {boolean} isFav
 */
function updateStatus(button, isFav) {
  if (!button) return;

  let container = null;
  if (typeof button.closest === 'function') {
    container = button.closest('.tool-header-actions');
  }
  if (!container) {
    container = button.parentElement;
  }

  const statusEl = container && typeof container.querySelector === 'function'
    ? container.querySelector('[role="status"]')
    : null;

  if (statusEl) {
    statusEl.textContent = isFav
      ? 'Calculadora adicionada aos favoritos.'
      : 'Calculadora removida dos favoritos.';
  }
}

/**
 * Inicializa todos os botões de favoritos encontrados no escopo.
 * Atualiza o estado inicial imediatamente sem disparar eventos analíticos.
 *
 * @param {ParentNode|Document} [root=document]
 */
export function initFavoriteButtons(root = (typeof document !== 'undefined' ? document : null)) {
  if (!root || typeof root.querySelectorAll !== 'function') return;

  const buttons = root.querySelectorAll('[data-favorite-button]');
  buttons.forEach(button => {
    const toolId = button.getAttribute('data-tool-id');
    if (!toolId || !VALID_TOOL_IDS.has(toolId)) return;

    // 1. Ler estado salvo
    const fav = isFavorite(toolId);

    // 2. Atualizar botão imediatamente (zero analytics aqui)
    updateButtonState(button, fav);

    // 3. Registrar ouvinte de clique sem duplicações
    if (button._favoriteBound) return;
    button._favoriteBound = true;

    button.addEventListener('click', () => {
      const currentToolId = button.getAttribute('data-tool-id');
      if (!currentToolId || !VALID_TOOL_IDS.has(currentToolId)) return;

      const wasFav = isFavorite(currentToolId);
      const nowFav = toggleFavorite(currentToolId);

      if (wasFav !== nowFav) {
        updateButtonState(button, nowFav);
        updateStatus(button, nowFav);

        const category = button.getAttribute('data-tool-category') || '';
        try {
          trackCalculatorAction({
            calculatorId: currentToolId,
            calculatorCategory: category,
            action: nowFav ? 'favorite_add' : 'favorite_remove'
          });
        } catch (_) {
          // Analytics nunca pode interferir na experiência de favoritos
        }
      }
    });
  });
}

/**
 * Utilitário interno para limpeza de estado em testes automatizados.
 */
export function _resetMemoryForTesting() {
  memoryFavorites = null;
}

// Auto-inicialização em ambiente de navegador
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => initFavoriteButtons());
  } else {
    initFavoriteButtons();
  }
}
