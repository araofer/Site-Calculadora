/**
 * Ferramenta: Calculadora de Porcentagem - Calculadora Master
 * Módulo ES nativo para cálculo de valores percentuais, acréscimos e descontos.
 * Zero APIs globais.
 */

/**
 * Calcula a porcentagem de um valor, bem como as variações com desconto e aumento.
 * Função pura e desacoplada do DOM.
 *
 * @param {Object} params
 * @param {number|string} params.valor Valor total de referência
 * @param {number|string} params.percentual Taxa percentual (ex: 10 para 10%)
 * @returns {Object} Objeto contendo o resultado da porcentagem e projeções ou erro de validação
 */
export function calcularPorcentagem(params = {}) {
  let valor = NaN;
  let percentual = NaN;

  if (typeof params.valor === "number") {
    valor = params.valor;
  } else if (typeof params.valor === "string" && params.valor.trim() !== "") {
    valor = parseFloat(params.valor.trim().replace(/\./g, "").replace(",", "."));
  }

  if (typeof params.percentual === "number") {
    percentual = params.percentual;
  } else if (typeof params.percentual === "string" && params.percentual.trim() !== "") {
    percentual = parseFloat(params.percentual.trim().replace(/\./g, "").replace(",", "."));
  }

  if (!Number.isFinite(valor) || !Number.isFinite(percentual)) {
    return {
      valido: false,
      erro: "Preencha os campos corretamente!"
    };
  }

  const parte = (valor * percentual) / 100;
  const comDesconto = valor - parte;
  const comAumento = valor + parte;

  return {
    valido: true,
    valor,
    percentual,
    parte,
    comDesconto,
    comAumento
  };
}

/**
 * Inicializa a interface da Calculadora de Porcentagem no DOM.
 * Configura listeners semânticos e renderização de resultados.
 */
export function setupCalculadoraPorcentagem() {
  if (typeof document === "undefined") return;

  const elPercentual = document.getElementById("percentual");
  const elValor = document.getElementById("valor");
  const resContainer = document.getElementById("resultado-container");
  const elResultado = document.getElementById("resultado");
  const elDetalhes = document.getElementById("detalhes");

  const btnCalcular = document.querySelector('[data-action="calculate"]');
  const btnLimpar = document.querySelector('[data-action="clear"]');

  function limparResultado() {
    if (resContainer) {
      resContainer.style.display = "none";
    }
  }

  function limparCampos() {
    if (elPercentual) elPercentual.value = "";
    if (elValor) elValor.value = "";
    if (elResultado) elResultado.innerText = "";
    if (elDetalhes) elDetalhes.innerHTML = "";
    limparResultado();
  }

  function executarCalculo() {
    if (!resContainer || !elResultado || !elDetalhes) return;

    const percentualStr = elPercentual ? elPercentual.value : "";
    const valorStr = elValor ? elValor.value : "";

    const res = calcularPorcentagem({
      percentual: percentualStr,
      valor: valorStr
    });

    if (!res.valido) {
      elResultado.innerText = res.erro;
      elDetalhes.innerHTML = "";
      resContainer.style.display = "block";
      return;
    }

    resContainer.style.display = "block";
    elResultado.innerText = "Resultado: " + res.parte.toFixed(2);
    elDetalhes.innerHTML =
      `Se for um <strong>desconto</strong>, o valor final é: R$ ${res.comDesconto.toFixed(2)}<br>` +
      `Se for um <strong>aumento</strong>, o valor final é: R$ ${res.comAumento.toFixed(2)}`;
  }

  if (elPercentual) {
    elPercentual.addEventListener("input", limparResultado);
    elPercentual.addEventListener("keydown", e => {
      if (e.key === "Enter") {
        e.preventDefault();
        executarCalculo();
      }
    });
  }

  if (elValor) {
    elValor.addEventListener("input", limparResultado);
    elValor.addEventListener("keydown", e => {
      if (e.key === "Enter") {
        e.preventDefault();
        executarCalculo();
      }
    });
  }

  if (btnCalcular) {
    btnCalcular.addEventListener("click", executarCalculo);
  }

  if (btnLimpar) {
    btnLimpar.addEventListener("click", limparCampos);
  }
}

// Auto-inicialização segura em ambiente navegador
if (typeof document !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", setupCalculadoraPorcentagem);
  } else {
    setupCalculadoraPorcentagem();
  }
}
