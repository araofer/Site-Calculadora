import {
  getFavoriteStorageStatus,
  getStoredFavorites,
  removeFavorite
} from './core/favorites.js';

const list = document.getElementById('favorites-list');
const emptyState = document.getElementById('favorites-empty');
const feedback = document.getElementById('favorites-feedback');
const error = document.getElementById('favorites-error');
const catalog = Array.isArray(window.TOOLS_CATALOG) ? window.TOOLS_CATALOG : [];
const catalogById = new Map(catalog.map(tool => [tool.id, tool]));

function showFeedback(message) {
  feedback.textContent = message;
  feedback.hidden = !message;
}

function showError(message) {
  error.textContent = message;
  error.hidden = !message;
}

function isSafeToolUrl(url) {
  return typeof url === 'string' && /^tools\/[a-z0-9-]+\/[a-z0-9-]+\.html$/i.test(url);
}

function makeFavoriteItem(id) {
  const item = document.createElement('li');
  item.className = 'favorites-item';
  const tool = typeof id === 'string' ? catalogById.get(id) : null;

  if (tool && isSafeToolUrl(tool.url)) {
    const link = document.createElement('a');
    link.className = 'favorites-item-link';
    link.href = `/${tool.url}`;
    link.textContent = tool.name || tool.nome || 'Calculadora';

    const category = document.createElement('span');
    category.className = 'favorites-item-category';
    category.textContent = tool.category || tool.categoria || 'Categoria';
    item.append(link, category);
  } else {
    const unavailable = document.createElement('span');
    unavailable.className = 'favorites-item-unavailable';
    unavailable.textContent = 'Esta calculadora não está mais disponível no catálogo.';
    item.append(unavailable);
  }

  if (typeof id === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/i.test(id)) {
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'favorites-remove-button';
    remove.textContent = 'Remover';
    remove.setAttribute('aria-label', `Remover ${tool?.name || tool?.nome || 'favorito indisponível'} dos favoritos`);
    remove.addEventListener('click', () => {
      const removed = removeFavorite(id);
      const storageStatus = getFavoriteStorageStatus();
      if (!removed || storageStatus.writeError) {
        showError(storageStatus.writeError || 'Não foi possível remover este favorito.');
        showFeedback('');
        renderFavorites();
        return;
      }

      showError('');
      showFeedback(`${tool?.name || tool?.nome || 'Favorito indisponível'} removido dos favoritos.`);
      renderFavorites();
      const nextControl = list.querySelector('.favorites-remove-button') || document.getElementById('favorites-empty-link');
      nextControl?.focus();
    });
    item.append(remove);
  }

  return item;
}

function renderFavorites() {
  if (!list || !emptyState) return;
  const result = getStoredFavorites();
  const ids = [];
  const seen = new Set();

  for (const value of result.ids) {
    if (typeof value === 'string') {
      if (!seen.has(value)) {
        ids.push(value);
        seen.add(value);
      }
    }
  }

  list.replaceChildren(...ids.map(makeFavoriteItem));
  const hasUnrenderableValues = result.valid && result.ids.some(value => typeof value !== 'string');
  emptyState.hidden = ids.length > 0 || !result.valid || hasUnrenderableValues;

  const storageStatus = getFavoriteStorageStatus();
  const readError = result.readError || storageStatus.readError;
  if (readError || storageStatus.writeError) {
    showError(readError || storageStatus.writeError);
  } else if (hasUnrenderableValues) {
    showError('Há registros antigos de favoritos que não podem ser exibidos. Eles foram preservados no armazenamento.');
  } else if (catalog.length === 0 && ids.length > 0) {
    showError('Não foi possível carregar o catálogo de calculadoras. Seus favoritos continuam salvos.');
  } else {
    showError('');
  }
}

renderFavorites();
window.addEventListener('calculadora:favoriteschange', renderFavorites);
window.addEventListener('storage', event => {
  if (!event.key || event.key === 'calculadoraMaster:favorites:v1') renderFavorites();
});
