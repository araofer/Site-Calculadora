/**
 * Helper ESM: Ações de Resultado (Copiar, Compartilhar, Imprimir) - Calculadora Master
 * Módulo puro, desacoplado, seguro para SSR e acessível (WCAG/ARIA).
 * Zero dependências externas e zero alert().
 */

/**
 * Formata lista de seções ou pares de chave/valor em texto legível sem HTML bruto.
 *
 * @param {string} title Título do resultado / calculadora
 * @param {Array<{label: string, value: string|number}>|Array<{title?: string, items: Array<{label: string, value: string|number}>}>} sections
 * @returns {string} Texto formatado
 */
export function formatResultText(title, sections) {
  const lines = [];
  if (title && typeof title === 'string' && title.trim()) {
    lines.push(title.trim());
    lines.push('');
  }

  if (Array.isArray(sections)) {
    for (const item of sections) {
      if (!item) continue;
      if (Array.isArray(item.items)) {
        if (item.title) {
          lines.push(String(item.title).trim());
        }
        for (const sub of item.items) {
          if (sub && sub.label !== undefined && sub.value !== undefined) {
            lines.push(`${String(sub.label).trim()}: ${String(sub.value).trim()}`);
          }
        }
        lines.push('');
      } else if (item.label !== undefined && item.value !== undefined) {
        lines.push(`${String(item.label).trim()}: ${String(item.value).trim()}`);
      }
    }
  }

  return lines.join('\n').trim();
}

/**
 * Resolve o elemento de status a partir de elemento DOM, ID ou função getter.
 *
 * @param {HTMLElement|string|Function} el
 * @returns {HTMLElement|null}
 */
function resolveStatusElement(el) {
  if (typeof el === 'string') {
    return typeof document !== 'undefined' ? document.getElementById(el) : null;
  }
  if (typeof el === 'function') {
    try {
      return el();
    } catch (_) {
      return null;
    }
  }
  return el || null;
}

/**
 * Atualiza elemento de feedback acessível com role="status" e aria-live="polite".
 *
 * @param {HTMLElement|string|Function} statusElement
 * @param {string} message
 */
function updateStatus(statusElement, message) {
  const target = resolveStatusElement(statusElement);
  if (!target) return;
  if (!target.getAttribute('role')) {
    target.setAttribute('role', 'status');
  }
  if (!target.getAttribute('aria-live')) {
    target.setAttribute('aria-live', 'polite');
  }
  target.textContent = message;
}

/**
 * Copia texto formatado para a área de transferência com fallback limpo.
 *
 * @param {string} text Texto a ser copiado
 * @param {HTMLElement|string|Function} [statusElement] Elemento de status acessível
 * @returns {Promise<boolean>} Sucesso da operação
 */
export async function copyResult(text, statusElement) {
  if (typeof text !== 'string' || text.trim() === '') {
    updateStatus(statusElement, 'Não foi possível copiar o resultado.');
    return false;
  }

  let copied = false;

  // 1. navigator.clipboard.writeText() quando disponível
  if (typeof navigator !== 'undefined' && navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
    try {
      await navigator.clipboard.writeText(text);
      copied = true;
    } catch (_) {
      copied = false;
    }
  }

  // 2. Fallback: textarea temporário + select + execCommand("copy")
  if (!copied && typeof document !== 'undefined') {
    let textarea = null;
    try {
      textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.setAttribute('readonly', '');
      textarea.style.position = 'fixed';
      textarea.style.top = '0';
      textarea.style.left = '-9999px';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      copied = document.execCommand('copy');
    } catch (_) {
      copied = false;
    } finally {
      // 5. Remover textarea sempre
      if (textarea && textarea.parentNode) {
        textarea.parentNode.removeChild(textarea);
      }
    }
  }

  const msg = copied ? 'Resultado copiado.' : 'Não foi possível copiar o resultado.';
  updateStatus(statusElement, msg);
  return copied;
}

/**
 * Compartilha o resultado via Web Share API quando disponível, com fallback para cópia.
 *
 * @param {Object} options
 * @param {string} [options.title] Título do compartilhamento
 * @param {string} [options.text] Texto formatado
 * @param {string} [options.url] URL opcional (default location.href)
 * @param {HTMLElement|string|Function} [statusElement] Elemento de status acessível
 * @returns {Promise<boolean>} Sucesso da operação
 */
export async function shareResult(options = {}, statusElement) {
  const title = options.title || '';
  const text = options.text || '';
  const shareUrl = options.url || (typeof location !== 'undefined' ? location.href : '');

  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    try {
      await navigator.share({
        title,
        text,
        url: shareUrl
      });
      updateStatus(statusElement, 'Resultado compartilhado.');
      return true;
    } catch (err) {
      // Se usuário cancelar com AbortError: não mostrar erro e NÃO copiar automaticamente
      if (err && (err.name === 'AbortError' || err.name === 'Abort')) {
        return false;
      }
      // Outro erro: prosseguir para fallback
    }
  }

  // Fallback para indisponibilidade ou erro não-abort
  const fallbackCopied = await copyResult(text, null);
  if (fallbackCopied) {
    updateStatus(statusElement, 'Compartilhamento indisponível. Resultado copiado.');
    return true;
  } else {
    updateStatus(statusElement, 'Não foi possível copiar o resultado.');
    return false;
  }
}

/**
 * Dispara diálogo nativo de impressão sem alterar o DOM ou o resultado.
 */
export function printResult() {
  if (typeof window !== 'undefined' && typeof window.print === 'function') {
    window.print();
  }
}

/**
 * Instancia fábrica de ações com contexto unificado.
 *
 * @param {Object} config
 * @param {string} [config.title] Título base da ferramenta
 * @param {Function} config.getSections Função geradora das seções de dados
 * @param {HTMLElement|string|Function} [config.statusElement] Elemento de feedback acessível
 * @returns {{getText: Function, copy: Function, share: Function, print: Function}}
 */
export function createResultActions({ title = '', getSections, statusElement }) {
  function getText() {
    if (typeof getSections !== 'function') return '';
    const sections = getSections();
    if (!sections) return '';
    return formatResultText(title, sections);
  }

  async function copy() {
    const text = getText();
    return copyResult(text, statusElement);
  }

  async function share(url) {
    const text = getText();
    return shareResult({
      title,
      text,
      url
    }, statusElement);
  }

  function print() {
    printResult();
  }

  return {
    getText,
    copy,
    share,
    print
  };
}
