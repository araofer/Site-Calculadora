/**
 * Ferramenta: Gerador de Link para WhatsApp - Calculadora Master
 * Módulo ES nativo para validação, sanitização e criação de links diretos (wa.me).
 * Protegido contra injeção de HTML e self-XSS.
 * Zero APIs globais.
 */

/**
 * Sanitiza o número de telefone e gera a URL oficial do WhatsApp com mensagem codificada.
 * Função pura e desacoplada do DOM.
 *
 * @param {Object} params
 * @param {string} params.numero Número com DDD
 * @param {string} [params.mensagem=""] Mensagem opcional pré-definida
 * @returns {Object} Resultado com URL montada ou erro de validação
 */
export function gerarLinkWhatsApp(params = {}) {
  const numeroRaw = params.numero !== undefined && params.numero !== null ? String(params.numero) : "";
  const mensagem = params.mensagem !== undefined && params.mensagem !== null ? String(params.mensagem) : "";

  // Limpa o número: remove tudo o que não for dígito
  let numeroLimpo = numeroRaw.replace(/\D/g, "");

  if (numeroLimpo.length < 10) {
    return {
      valido: false,
      erro: "Por favor, digite um número válido com DDD."
    };
  }

  // Garante o código do país (55 para Brasil) se número não começar com 55 e possuir até 11 dígitos
  if (!numeroLimpo.startsWith("55") && numeroLimpo.length <= 11) {
    numeroLimpo = "55" + numeroLimpo;
  }

  const textoCodificado = encodeURIComponent(mensagem);
  const url = `https://wa.me/${numeroLimpo}?text=${textoCodificado}`;

  return {
    valido: true,
    numero: numeroLimpo,
    mensagem,
    url
  };
}

/**
 * Inicializa os ouvintes de eventos e integração com a interface da página.
 */
export function setupWhatsApp() {
  const inputNumero = document.getElementById("numero");
  const inputMensagem = document.getElementById("mensagem");
  const areaResultado = document.getElementById("resultado-area");
  const linkBox = document.getElementById("link-box");
  const msgCopiado = document.getElementById("msg-copiado");

  const btnGerar = document.querySelector('[data-action="generate"]');
  const btnLimpar = document.querySelector('[data-action="clear"]');
  const btnCopiar = document.querySelector('[data-action="copy"]');

  if (!inputNumero || !inputMensagem || !areaResultado || !linkBox) {
    return;
  }

  let timeoutCopiado = null;

  const executarGeracao = () => {
    const res = gerarLinkWhatsApp({
      numero: inputNumero.value,
      mensagem: inputMensagem.value
    });

    if (!res.valido) {
      alert(res.erro);
      return;
    }

    // Atribuição estritamente segura sem interpretar HTML
    linkBox.innerText = res.url;
    areaResultado.style.display = "block";
    if (msgCopiado) {
      msgCopiado.style.display = "none";
    }
  };

  const executarCopia = () => {
    const link = linkBox.innerText;
    if (!link) return;

    const exibirSucesso = () => {
      if (msgCopiado) {
        msgCopiado.style.display = "inline";
        if (timeoutCopiado) clearTimeout(timeoutCopiado);
        timeoutCopiado = setTimeout(() => {
          msgCopiado.style.display = "none";
        }, 2000);
      }
    };

    if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
      navigator.clipboard.writeText(link).then(exibirSucesso).catch(() => {
        fallbackCopiar(link, exibirSucesso);
      });
    } else {
      fallbackCopiar(link, exibirSucesso);
    }
  };

  const fallbackCopiar = (texto, onSuccess) => {
    try {
      const tempInput = document.createElement("textarea");
      tempInput.value = texto;
      tempInput.style.position = "fixed";
      tempInput.style.opacity = "0";
      document.body.appendChild(tempInput);
      tempInput.select();
      const copiado = document.execCommand("copy");
      document.body.removeChild(tempInput);
      if (copiado && onSuccess) onSuccess();
    } catch {
      // Falha silenciosa defensiva
    }
  };

  const executarLimpeza = () => {
    inputNumero.value = "";
    inputMensagem.value = "";
    areaResultado.style.display = "none";
    if (msgCopiado) {
      msgCopiado.style.display = "none";
    }
  };

  if (btnGerar) {
    btnGerar.addEventListener("click", executarGeracao);
  }

  if (btnLimpar) {
    btnLimpar.addEventListener("click", executarLimpeza);
  }

  if (btnCopiar) {
    btnCopiar.addEventListener("click", executarCopia);
  }
}

if (typeof document !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", setupWhatsApp);
  } else {
    setupWhatsApp();
  }
}
