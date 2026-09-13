/**
 * Ferramenta: Gerador de Senha Forte - Calculadora Master
 * Geração criptograficamente segura via Web Crypto API com amostragem por rejeição (rejection sampling).
 */

(function (root, factory) {
  if (typeof module !== "undefined" && module.exports) {
    const nodeCrypto = require("crypto");
    module.exports = factory(nodeCrypto.webcrypto || nodeCrypto);
  } else {
    root.GeradorSenha = factory(root.crypto || (typeof window !== "undefined" && window.crypto));
    // Atalhos globais para compatibilidade
    root.gerarSenha = root.GeradorSenha.gerarSenha;
    root.copiarSenha = root.GeradorSenha.copiarSenha;
    root.limparCampos = root.GeradorSenha.limparCampos;
    root.limparResultado = root.GeradorSenha.limparResultado;
    root.atualizarLabel = root.GeradorSenha.atualizarLabel;
  }
})(typeof globalThis !== "undefined" ? globalThis : typeof window !== "undefined" ? window : this, function (cryptoApi) {
  const CHAR_SETS = {
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
   * @param {number} [opcoes.tamanho=12]
   * @param {boolean} [opcoes.maiusculas=true]
   * @param {boolean} [opcoes.minusculas=true]
   * @param {boolean} [opcoes.numeros=true]
   * @param {boolean} [opcoes.especiais=true]
   * @param {Object} [opcoes.cryptoOverride]
   * @returns {Object} Resultado com a senha ou mensagem de erro
   */
  function gerarSenhaSegura(opcoes = {}) {
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

    const activeCrypto = opcoes.cryptoOverride || cryptoApi || (typeof window !== "undefined" ? window.crypto : null);

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

  function atualizarLabel() {
    if (typeof document === "undefined") return;
    const rangeInput = document.getElementById("tamanho");
    const labelSpan = document.getElementById("val_tamanho");
    if (rangeInput && labelSpan) {
      labelSpan.innerText = rangeInput.value;
    }
  }

  function limparResultado() {
    if (typeof document === "undefined") return;
    const areaResultado = document.getElementById("resultado-area");
    if (areaResultado) {
      areaResultado.style.display = "none";
    }
  }

  function limparCampos() {
    if (typeof document === "undefined") return;
    const rangeInput = document.getElementById("tamanho");
    if (rangeInput) rangeInput.value = 12;

    atualizarLabel();

    ["maiusculas", "minusculas", "numeros", "especiais"].forEach(id => {
      const cb = document.getElementById(id);
      if (cb) cb.checked = true;
    });

    limparResultado();
  }

  function gerarSenha() {
    if (typeof document === "undefined") return;

    const tamanhoEl = document.getElementById("tamanho");
    const maiuscEl = document.getElementById("maiusculas");
    const minuscEl = document.getElementById("minusculas");
    const numsEl = document.getElementById("numeros");
    const especsEl = document.getElementById("especiais");
    const senhaGeradaEl = document.getElementById("senha-gerada");
    const areaResultadoEl = document.getElementById("resultado-area");
    const msgCopiadoEl = document.getElementById("msg-copiado");

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
    if (typeof document === "undefined") return;
    const senhaEl = document.getElementById("senha-gerada");
    const msgEl = document.getElementById("msg-copiado");
    const senha = senhaEl ? senhaEl.innerText : "";

    if (!senha) return;

    if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
      navigator.clipboard.writeText(senha).then(() => {
        if (msgEl) {
          msgEl.style.display = "inline";
          setTimeout(() => {
            msgEl.style.display = "none";
          }, 2000);
        }
      });
    }
  }

  function inicializarEventos() {
    if (typeof document === "undefined") return;

    const rangeInput = document.getElementById("tamanho");
    if (rangeInput) {
      rangeInput.addEventListener("input", function () {
        atualizarLabel();
        limparResultado();
      });
    }

    ["maiusculas", "minusculas", "numeros", "especiais"].forEach(id => {
      const cb = document.getElementById(id);
      if (cb) {
        cb.addEventListener("change", limparResultado);
      }
    });

    const botoes = document.querySelectorAll("button");
    botoes.forEach(btn => {
      const texto = btn.textContent.trim().toLowerCase();
      if (texto.includes("gerar senha")) {
        btn.addEventListener("click", gerarSenha);
      } else if (texto.includes("resetar") || texto.includes("limpar")) {
        btn.addEventListener("click", limparCampos);
      } else if (texto.includes("copiar senha")) {
        btn.addEventListener("click", copiarSenha);
      }
    });
  }

  if (typeof document !== "undefined") {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", inicializarEventos);
    } else {
      inicializarEventos();
    }
  }

  return {
    CHAR_SETS,
    gerarSenhaSegura,
    gerarSenha,
    copiarSenha,
    limparCampos,
    limparResultado,
    atualizarLabel,
    inicializarEventos
  };
});
