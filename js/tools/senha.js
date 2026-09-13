/**
 * Ferramenta: Gerador de Senha Forte - Calculadora Master
 * Módulo ES nativo com geração criptograficamente segura via Web Crypto API
 * com amostragem por rejeição (rejection sampling).
 * Zero APIs globais e eventos semânticos data-action.
 */

export const CHAR_SETS = {
  maiusculas: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  minusculas: "abcdefghijklmnopqrstuvwxyz",
  numeros: "0123456789",
  especiais: "!@#$%&*()_+{}[]<>?-="
};

/**
 * Gera senha criptograficamente segura com rejection sampling.
 * Utiliza exclusivamente Web Crypto API sem geradores pseudoaleatórios inseguros.
 *
 * @param {Object} opcoes
 * @param {number} [opcoes.tamanho=12] Comprimento da senha
 * @param {boolean} [opcoes.maiusculas=true] Incluir maiúsculas
 * @param {boolean} [opcoes.minusculas=true] Incluir minúsculas
 * @param {boolean} [opcoes.numeros=true] Incluir números
 * @param {boolean} [opcoes.especiais=true] Incluir caracteres especiais
 * @param {Object} [opcoes.cryptoOverride] Instância de crypto para injeção em testes
 * @returns {Object} Resultado { valido: boolean, senha?: string, erro?: string }
 */
export function gerarSenhaSegura(opcoes = {}) {
  const tamanho = Math.max(1, parseInt(opcoes.tamanho !== undefined ? opcoes.tamanho : 12, 10));
  const usarMaiusculas = opcoes.maiusculas !== false;
  const usarMinusculas = opcoes.minusculas !== false;
  const usarNumeros = opcoes.numeros !== false;
  const usarEspeciais = opcoes.especiais !== false;

  let caracteres = "";
  if (usarMaiusculas) caracteres += CHAR_SETS.maiusculas;
  if (usarMinusculas) caracteres += CHAR_SETS.minusculas;
  if (usarNumeros) caracteres += CHAR_SETS.numeros;
  if (usarEspeciais) caracteres += CHAR_SETS.especiais;

  if (caracteres === "") {
    return {
      valido: false,
      erro: "Selecione pelo menos um tipo de caractere!"
    };
  }

  const len = caracteres.length;
  const range = 4294967296; // 2^32
  const maxValid = range - (range % len);
  const randomBuffer = new Uint32Array(1);

  const activeCrypto =
    opcoes.cryptoOverride ||
    (typeof globalThis !== "undefined" && globalThis.crypto) ||
    (typeof window !== "undefined" && window.crypto) ||
    null;

  if (!activeCrypto || typeof activeCrypto.getRandomValues !== "function") {
    return {
      valido: false,
      erro: "Web Crypto API não disponível neste ambiente."
    };
  }

  let senha = "";
  for (let i = 0; i < tamanho; i++) {
    let randomVal;
    do {
      activeCrypto.getRandomValues(randomBuffer);
      randomVal = randomBuffer[0];
    } while (randomVal >= maxValid);
    senha += caracteres[randomVal % len];
  }

  return {
    valido: true,
    senha
  };
}

/**
 * Inicializa os manipuladores de eventos e a interface do Gerador de Senha no DOM.
 * Utiliza seletores semânticos data-action e IDs estáveis.
 */
export function setupGeradorSenha() {
  if (typeof document === "undefined") return;

  const tamanhoEl = document.getElementById("tamanho");
  const valTamanhoEl = document.getElementById("val_tamanho");
  const maiuscEl = document.getElementById("maiusculas");
  const minuscEl = document.getElementById("minusculas");
  const numsEl = document.getElementById("numeros");
  const especsEl = document.getElementById("especiais");
  const senhaGeradaEl = document.getElementById("senha-gerada");
  const areaResultadoEl = document.getElementById("resultado-area");
  const msgCopiadoEl = document.getElementById("msg-copiado");

  const btnGerar = document.querySelector('[data-action="generate"]');
  const btnLimpar = document.querySelector('[data-action="clear"]');
  const btnCopiar = document.querySelector('[data-action="copy"]');

  function atualizarLabel() {
    if (tamanhoEl && valTamanhoEl) {
      valTamanhoEl.innerText = tamanhoEl.value;
    }
  }

  function limparResultado() {
    if (areaResultadoEl) {
      areaResultadoEl.style.display = "none";
    }
    if (msgCopiadoEl) {
      msgCopiadoEl.style.display = "none";
    }
  }

  function limparCampos() {
    if (tamanhoEl) {
      tamanhoEl.value = 12;
    }
    atualizarLabel();

    [maiuscEl, minuscEl, numsEl, especsEl].forEach(cb => {
      if (cb) cb.checked = true;
    });

    limparResultado();
  }

  function gerarSenha() {
    const tamanho = tamanhoEl ? tamanhoEl.value : 12;
    const maiusculas = maiuscEl ? maiuscEl.checked : true;
    const minusculas = minuscEl ? minuscEl.checked : true;
    const numeros = numsEl ? numsEl.checked : true;
    const especiais = especsEl ? especsEl.checked : true;

    const res = gerarSenhaSegura({
      tamanho,
      maiusculas,
      minusculas,
      numeros,
      especiais
    });

    if (!res.valido) {
      alert(res.erro);
      return;
    }

    if (senhaGeradaEl) senhaGeradaEl.innerText = res.senha;
    if (areaResultadoEl) areaResultadoEl.style.display = "block";
    if (msgCopiadoEl) msgCopiadoEl.style.display = "none";
  }

  function copiarSenha() {
    const senha = senhaGeradaEl ? senhaGeradaEl.innerText : "";
    if (!senha) return;

    if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
      navigator.clipboard.writeText(senha)
        .then(() => {
          if (msgCopiadoEl) {
            msgCopiadoEl.style.display = "inline";
            setTimeout(() => {
              msgCopiadoEl.style.display = "none";
            }, 2000);
          }
        })
        .catch(() => {
          copiarFallback(senha);
        });
    } else {
      copiarFallback(senha);
    }
  }

  function copiarFallback(texto) {
    try {
      const textarea = document.createElement("textarea");
      textarea.value = texto;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      if (msgCopiadoEl) {
        msgCopiadoEl.style.display = "inline";
        setTimeout(() => {
          msgCopiadoEl.style.display = "none";
        }, 2000);
      }
    } catch {
      alert("Não foi possível copiar automaticamente. Por favor, copie manualmente.");
    }
  }

  // Eventos de entrada
  if (tamanhoEl) {
    tamanhoEl.addEventListener("input", () => {
      atualizarLabel();
      limparResultado();
    });
  }

  [maiuscEl, minuscEl, numsEl, especsEl].forEach(cb => {
    if (cb) {
      cb.addEventListener("change", limparResultado);
    }
  });

  // Eventos semânticos nos botões
  if (btnGerar) {
    btnGerar.addEventListener("click", gerarSenha);
  }

  if (btnLimpar) {
    btnLimpar.addEventListener("click", limparCampos);
  }

  if (btnCopiar) {
    btnCopiar.addEventListener("click", copiarSenha);
  }
}

// Auto-inicialização em ambiente navegador
if (typeof document !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", setupGeradorSenha);
  } else {
    setupGeradorSenha();
  }
}
