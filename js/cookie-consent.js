(function () {
  'use strict';

  const STORAGE_KEY = 'cm_cookie_consent';

  function obterConsentimento() {
    try {
      return localStorage.getItem(STORAGE_KEY);
    } catch (e) {
      return null;
    }
  }

  function salvarConsentimento(valor) {
    if (valor !== 'accepted' && valor !== 'rejected') return;
    try {
      localStorage.setItem(STORAGE_KEY, valor);
    } catch (e) {
      // Falha silenciosa caso o armazenamento local esteja bloqueado
    }
  }

  function fecharBanner(banner) {
    if (!banner) return;
    banner.classList.add('cm-cookie-banner--hidden');
    setTimeout(function () {
      if (banner.parentNode) {
        banner.parentNode.removeChild(banner);
      }
    }, 300);
  }

  function obterCaminhoPolitica() {
    var path = window.location.pathname;
    if (path.indexOf('/blog/artigos/') !== -1) {
      return '../../politica.html';
    }
    if (path.indexOf('/blog/') !== -1 || path.indexOf('/tools/') !== -1) {
      if (path.indexOf('/tools/financas/') !== -1 ||
          path.indexOf('/tools/saude/') !== -1 ||
          path.indexOf('/tools/utilidades/') !== -1) {
        return '../../politica.html';
      }
      return '../politica.html';
    }
    return 'politica.html';
  }

  function criarBanner() {
    if (document.getElementById('cm-cookie-banner')) return;

    const banner = document.createElement('div');
    banner.id = 'cm-cookie-banner';
    banner.className = 'cm-cookie-banner';
    banner.setAttribute('role', 'dialog');
    banner.setAttribute('aria-live', 'polite');
    banner.setAttribute('aria-label', 'Consentimento de Cookies');

    const container = document.createElement('div');
    container.className = 'cm-cookie-container';

    const textWrapper = document.createElement('div');
    textWrapper.className = 'cm-cookie-text';

    const p = document.createElement('p');
    p.textContent = 'Usamos tecnologias necessárias para o funcionamento do site e, com sua autorização, dados de navegação para medir o uso do Calculadora Master. Você pode aceitar ou recusar a medição opcional. ';

    const link = document.createElement('a');
    link.href = obterCaminhoPolitica();
    link.className = 'cm-cookie-link';
    link.textContent = 'Política de Privacidade';

    p.appendChild(link);
    textWrapper.appendChild(p);

    const buttonsWrapper = document.createElement('div');
    buttonsWrapper.className = 'cm-cookie-buttons';

    const btnReject = document.createElement('button');
    btnReject.type = 'button';
    btnReject.className = 'cm-cookie-btn cm-cookie-btn-reject';
    btnReject.textContent = 'Recusar';
    btnReject.addEventListener('click', function () {
      salvarConsentimento('rejected');
      fecharBanner(banner);
    });

    const btnAccept = document.createElement('button');
    btnAccept.type = 'button';
    btnAccept.className = 'cm-cookie-btn cm-cookie-btn-accept';
    btnAccept.textContent = 'Aceitar';
    btnAccept.addEventListener('click', function () {
      salvarConsentimento('accepted');
      fecharBanner(banner);
    });

    buttonsWrapper.appendChild(btnReject);
    buttonsWrapper.appendChild(btnAccept);

    container.appendChild(textWrapper);
    container.appendChild(buttonsWrapper);
    banner.appendChild(container);

    document.body.appendChild(banner);
  }

  function inicializar() {
    const consent = obterConsentimento();
    if (consent === 'accepted' || consent === 'rejected') {
      return;
    }
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', criarBanner);
    } else {
      criarBanner();
    }
  }

  inicializar();
})();
