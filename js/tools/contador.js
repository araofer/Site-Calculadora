/**
 * Ferramenta: Contador de Caracteres - Calculadora Master
 * Módulo ES nativo para contagem em tempo real de caracteres, espaços e palavras.
 * Zero APIs globais.
 */

/**
 * Analisa uma cadeia de texto e calcula o total de caracteres, caracteres sem espaços e palavras.
 * Função pura e desacoplada do DOM.
 *
 * @param {string} texto Texto a ser analisado
 * @returns {Object} Contagens estruturadas e texto formatado
 */
export function contarTexto(texto = "") {
  const str = typeof texto === "string" ? texto : (texto !== null && texto !== undefined ? String(texto) : "");

  const caracteres = str.length;
  const caracteresSemEspaco = str.replace(/\s/g, "").length;
  const palavras = str.trim() === "" ? 0 : str.trim().split(/\s+/).length;

  const resultadoFormatado = "Caracteres: " + caracteres +
    " | Sem espaços: " + caracteresSemEspaco +
    " | Palavras: " + palavras;

  return {
    caracteres,
    caracteresSemEspaco,
    palavras,
    textoFormatado: resultadoFormatado
  };
}

/**
 * Inicializa os ouvintes de eventos e integração com a interface da página.
 */
export function setupContador() {
  const textareaTexto = document.getElementById("texto");
  const resultadoEl = document.getElementById("resultado");
  const btnLimpar = document.querySelector('[data-action="clear"]');

  if (!textareaTexto || !resultadoEl) {
    return;
  }

  const executarContagem = () => {
    const contagem = contarTexto(textareaTexto.value);
    resultadoEl.innerText = contagem.textoFormatado;
  };

  const executarLimpeza = () => {
    textareaTexto.value = "";
    resultadoEl.innerText = "Aguardando texto...";
  };

  textareaTexto.addEventListener("input", executarContagem);

  if (btnLimpar) {
    btnLimpar.addEventListener("click", executarLimpeza);
  }
}

if (typeof document !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", setupContador);
  } else {
    setupContador();
  }
}
