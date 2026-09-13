/**
 * Ferramenta: Gerador de QR Code - Calculadora Master
 * Módulo ES nativo para validação, renderização e download de QR Code.
 * Integração segura com a biblioteca externa QRCode.js (carregada globalmente via CDN).
 * Zero APIs globais próprias.
 */

/**
 * Valida o conteúdo informado para geração do QR Code e prepara parâmetros de configuração.
 * Função pura e desacoplada do DOM.
 *
 * @param {string} texto Conteúdo a ser convertido em QR Code
 * @returns {Object} Status de validação, texto sanitizado e configurações
 */
export function validarDadosQRCode(texto = "") {
  if (typeof texto !== "string" || texto.trim() === "") {
    return {
      valido: false,
      erro: "Por favor, digite um link ou texto!"
    };
  }

  return {
    valido: true,
    texto,
    config: {
      width: 256,
      height: 256,
      colorDark: "#000000",
      colorLight: "#ffffff",
      correctLevel: "H"
    }
  };
}

/**
 * Dispara o download da imagem do QR Code gerado em formato PNG.
 * Função utilitária de DOM com suporte a <img> e <canvas>.
 *
 * @param {HTMLElement} containerElement Contêiner contendo o elemento gerado
 * @param {string} nomeArquivo Nome do arquivo para download
 * @returns {boolean} Se o download foi iniciado com sucesso
 */
export function baixarQRCodeElemento(containerElement, nomeArquivo = "qrcode-calculadora-master.png") {
  if (!containerElement) return false;

  const img = containerElement.querySelector("img");
  if (img && img.src) {
    const link = document.createElement("a");
    link.href = img.src;
    link.download = nomeArquivo;
    link.click();
    return true;
  }

  const canvas = containerElement.querySelector("canvas");
  if (canvas && typeof canvas.toDataURL === "function") {
    const link = document.createElement("a");
    link.href = canvas.toDataURL("image/png");
    link.download = nomeArquivo;
    link.click();
    return true;
  }

  return false;
}

/**
 * Inicializa os ouvintes de eventos e integração com a biblioteca QRCode.js.
 */
export function setupQRCode() {
  const inputTexto = document.getElementById("textoQR");
  const qrcodeContainer = document.getElementById("qrcode");
  const areaResultado = document.getElementById("resultado-area");

  const btnGerar = document.querySelector('[data-action="generate"]');
  const btnLimpar = document.querySelector('[data-action="clear"]');
  const btnDownload = document.querySelector('[data-action="download"]') || document.getElementById("btnDownload");

  if (!inputTexto || !qrcodeContainer || !areaResultado) {
    return;
  }

  const executarGeracao = () => {
    const validacao = validarDadosQRCode(inputTexto.value);

    if (!validacao.valido) {
      alert(validacao.erro);
      return;
    }

    qrcodeContainer.innerHTML = "";
    areaResultado.style.display = "block";

    if (typeof QRCode === "undefined") {
      console.error("Biblioteca QRCode não encontrada no escopo.");
      return;
    }

    const nivelCorrecao = QRCode.CorrectLevel && QRCode.CorrectLevel.H !== undefined
      ? QRCode.CorrectLevel.H
      : 2;

    new QRCode(qrcodeContainer, {
      text: validacao.texto,
      width: validacao.config.width,
      height: validacao.config.height,
      colorDark: validacao.config.colorDark,
      colorLight: validacao.config.colorLight,
      correctLevel: nivelCorrecao
    });
  };

  const executarDownload = () => {
    baixarQRCodeElemento(qrcodeContainer, "qrcode-calculadora-master.png");
  };

  const executarLimpeza = () => {
    inputTexto.value = "";
    qrcodeContainer.innerHTML = "";
    areaResultado.style.display = "none";
  };

  if (btnGerar) {
    btnGerar.addEventListener("click", executarGeracao);
  }

  if (btnLimpar) {
    btnLimpar.addEventListener("click", executarLimpeza);
  }

  if (btnDownload) {
    btnDownload.addEventListener("click", executarDownload);
  }
}

if (typeof document !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", setupQRCode);
  } else {
    setupQRCode();
  }
}
