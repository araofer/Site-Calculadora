(function () {
  'use strict';

  const STORAGE_KEY = 'cm_cookie_consent';
  const GA_MEASUREMENT_ID = 'G-KRDLTF5GBP';
  const GA_DISABLE_KEY = 'ga-disable-' + GA_MEASUREMENT_ID;
  let timerFechar = null;

  // Define ga-disable true por padrão até haver consentimento explícito
  window[GA_DISABLE_KEY] = true;

  // Inicialização segura e local do dataLayer e gtag
  window.dataLayer = window.dataLayer || [];
  function gtag() {
    window.dataLayer.push(arguments);
  }
  window.gtag = gtag;

  // Consentimento padrão em memória (Zero requisições de rede)
  gtag('consent', 'default', {
    analytics_storage: 'denied',
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied'
  });

  // Aplica o estado de consentimento e controla ga-disable
  function aplicarConsentimentoAnalytics(concedido) {
    if (concedido) {
      window[GA_DISABLE_KEY] = false;
      gtag('consent', 'update', {
        analytics_storage: 'granted',
        ad_storage: 'denied',
        ad_user_data: 'denied',
        ad_personalization: 'denied'
      });
      garantirGA4Carregado();
    } else {
      window[GA_DISABLE_KEY] = true;
      gtag('consent', 'update', {
        analytics_storage: 'denied',
        ad_storage: 'denied',
        ad_user_data: 'denied',
        ad_personalization: 'denied'
      });
    }
  }

  // Garante a injeção única da tag do Google Analytics 4
  function garantirGA4Carregado() {
    if (document.getElementById('cm-ga4-script')) {
      return;
    }

    const script = document.createElement('script');
    script.id = 'cm-ga4-script';
    script.async = true;
    script.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA_MEASUREMENT_ID;
    document.head.appendChild(script);

    gtag('js', new Date());
    gtag('config', GA_MEASUREMENT_ID);
  }

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
    timerFechar = setTimeout(function () {
      if (banner.parentNode) {
        banner.parentNode.removeChild(banner);
      }
      timerFechar = null;
    }, 300);
  }

  function abrirGerenciador() {
    if (timerFechar) {
      clearTimeout(timerFechar);
      timerFechar = null;
    }
    const bannerExistente = document.getElementById('cm-cookie-banner');
    if (bannerExistente) {
      bannerExistente.classList.remove('cm-cookie-banner--hidden');
      return;
    }
    criarBanner();
  }

  function obterCaminhoPolitica() {
    return '/politica.html';
  }

  function criarBanner() {
    if (document.getElementById('cm-cookie-banner')) return;

    const banner = document.createElement('div');
    banner.id = 'cm-cookie-banner';
    banner.className = 'cm-cookie-banner';
    banner.setAttribute('role', 'dialog');
    banner.setAttribute('aria-live', 'polite');
    banner.setAttribute('aria-label', 'Preferências de privacidade');

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
      aplicarConsentimentoAnalytics(false);
      salvarConsentimento('rejected');
      fecharBanner(banner);
    });

    const btnAccept = document.createElement('button');
    btnAccept.type = 'button';
    btnAccept.className = 'cm-cookie-btn cm-cookie-btn-accept';
    btnAccept.textContent = 'Aceitar';
    btnAccept.addEventListener('click', function () {
      salvarConsentimento('accepted');
      aplicarConsentimentoAnalytics(true);
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
    if (consent === 'accepted') {
      aplicarConsentimentoAnalytics(true);
      return;
    }
    if (consent === 'rejected') {
      aplicarConsentimentoAnalytics(false);
      return;
    }
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', criarBanner);
    } else {
      criarBanner();
    }
  }

  // Listener delegado para acionadores de gerenciamento de preferências
  document.addEventListener('click', function (e) {
    const trigger = e.target && e.target.closest('.cm-cookie-manage');
    if (trigger) {
      e.preventDefault();
      abrirGerenciador();
    }
  });

  inicializar();
})();
