/**
 * Ferramenta: Calculadora de Juros Simples e Compostos - Calculadora Master
 * Módulo ES nativo com cálculos isolados e eventos semânticos.
 * Zero APIs globais.
 */

/**
 * Calcula juros simples: J = C * i * t e Montante = C + J.
 * Função pura e desacoplada do DOM.
 *
 * @param {Object} params
 * @param {number|string} params.capital Capital inicial
 * @param {number|string} params.taxa Taxa de juros percentual (ex: 5 para 5%)
 * @param {number|string} params.tempo Período em meses
 * @returns {Object} Resultado com juros e montante total ou erro de validação
 */
export function calcularJurosSimples(params = {}) {
  const capital = Number(params.capital);
  const taxa = Number(params.taxa);
  const tempo = Number(params.tempo);

  if (
    !Number.isFinite(capital) ||
    !Number.isFinite(taxa) ||
    !Number.isFinite(tempo) ||
    capital < 0 ||
    taxa < 0 ||
    tempo < 0
  ) {
    return {
      valido: false,
      erro: "Preencha todos os campos corretamente."
    };
  }

  const juros = capital * (taxa / 100) * tempo;
  const total = capital + juros;

  return {
    valido: true,
    capital,
    taxa,
    tempo,
    juros,
    total
  };
}

/**
 * Calcula juros compostos: M = C * (1 + i)^t e Juros = M - C.
 * Função pura e desacoplada do DOM.
 *
 * @param {Object} params
 * @param {number|string} params.capital Capital inicial
 * @param {number|string} params.taxa Taxa de juros percentual (ex: 5 para 5%)
 * @param {number|string} params.tempo Período em meses
 * @returns {Object} Resultado com juros e montante total ou erro de validação
 */
export function calcularJurosCompostos(params = {}) {
  const capital = Number(params.capital);
  const taxa = Number(params.taxa);
  const tempo = Number(params.tempo);

  if (
    !Number.isFinite(capital) ||
    !Number.isFinite(taxa) ||
    !Number.isFinite(tempo) ||
    capital < 0 ||
    taxa < 0 ||
    tempo < 0
  ) {
    return {
      valido: false,
      erro: "Preencha todos os campos corretamente."
    };
  }

  const total = capital * Math.pow(1 + taxa / 100, tempo);
  const juros = total - capital;

  return {
    valido: true,
    capital,
    taxa,
    tempo,
    juros,
    total
  };
}

/**
 * Inicializa a interface da Calculadora de Juros no DOM.
 * Configura os listeners de juros simples, juros compostos e limpeza.
 */
export function setupCalculadoraJuros() {
  if (typeof document === "undefined") return;

  const capSimples = document.getElementById("capitalSimples");
  const taxSimples = document.getElementById("taxaSimples");
  const temSimples = document.getElementById("tempoSimples");
  const resSimples = document.getElementById("resultadoSimples");

  const capComposto = document.getElementById("capitalComposto");
  const taxComposto = document.getElementById("taxaComposta");
  const temComposto = document.getElementById("tempoComposto");
  const resComposto = document.getElementById("resultadoComposto");

  const btnSimples = document.querySelector('[data-action="calculate-simple"]');
  const btnComposto = document.querySelector('[data-action="calculate-compound"]');
  const btnLimpar = document.querySelector('[data-action="clear"]');

  function limparResultado() {
    if (resSimples) resSimples.innerText = "";
    if (resComposto) resComposto.innerText = "";
  }

  function limparCampos() {
    [capSimples, taxSimples, temSimples, capComposto, taxComposto, temComposto].forEach(input => {
      if (input) input.value = "";
    });
    limparResultado();
  }

  function executarSimples() {
    if (!resSimples) return;

    const capital = capSimples ? capSimples.value : "";
    const taxa = taxSimples ? taxSimples.value : "";
    const tempo = temSimples ? temSimples.value : "";

    if (capital === "" || taxa === "" || tempo === "") {
      resSimples.innerText = "Preencha todos os campos corretamente.";
      return;
    }

    const res = calcularJurosSimples({ capital, taxa, tempo });

    if (!res.valido) {
      resSimples.innerText = res.erro;
      return;
    }

    resSimples.innerHTML = `Juros: R$ ${res.juros.toFixed(2)} <br><strong>Total: R$ ${res.total.toFixed(2)}</strong>`;
  }

  function executarComposto() {
    if (!resComposto) return;

    const capital = capComposto ? capComposto.value : "";
    const taxa = taxComposto ? taxComposto.value : "";
    const tempo = temComposto ? temComposto.value : "";

    if (capital === "" || taxa === "" || tempo === "") {
      resComposto.innerText = "Preencha todos os campos corretamente.";
      return;
    }

    const res = calcularJurosCompostos({ capital, taxa, tempo });

    if (!res.valido) {
      resComposto.innerText = res.erro;
      return;
    }

    resComposto.innerHTML = `Juros: R$ ${res.juros.toFixed(2)} <br><strong>Total: R$ ${res.total.toFixed(2)}</strong>`;
  }

  // Eventos de limpeza ao digitar
  [capSimples, taxSimples, temSimples, capComposto, taxComposto, temComposto].forEach(input => {
    if (input) {
      input.addEventListener("input", limparResultado);
    }
  });

  // Acessibilidade: tecla Enter
  [capSimples, taxSimples, temSimples].forEach(input => {
    if (input) {
      input.addEventListener("keydown", e => {
        if (e.key === "Enter") {
          e.preventDefault();
          executarSimples();
        }
      });
    }
  });

  [capComposto, taxComposto, temComposto].forEach(input => {
    if (input) {
      input.addEventListener("keydown", e => {
        if (e.key === "Enter") {
          e.preventDefault();
          executarComposto();
        }
      });
    }
  });

  // Eventos semânticos nos botões
  if (btnSimples) {
    btnSimples.addEventListener("click", executarSimples);
  }

  if (btnComposto) {
    btnComposto.addEventListener("click", executarComposto);
  }

  if (btnLimpar) {
    btnLimpar.addEventListener("click", limparCampos);
  }
}

// Auto-inicialização em ambiente navegador
if (typeof document !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", setupCalculadoraJuros);
  } else {
    setupCalculadoraJuros();
  }
}
