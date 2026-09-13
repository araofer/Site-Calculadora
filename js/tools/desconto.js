/**
 * Ferramenta: Calculadora de Desconto - Calculadora Master
 * Módulo ES nativo para cálculo de descontos e preços promocionais.
 * Zero APIs globais.
 */

/**
 * Realiza o cálculo de desconto percentual sobre um preço inicial.
 * Função pura e desacoplada do DOM.
 *
 * @param {Object} params
 * @param {number|string} params.preco Preço original do produto
 * @param {number|string} params.desconto Percentual de desconto (ex: 10 para 10%)
 * @returns {Object} Resultado com valor economizado e preço final ou erro de validação
 */
export function calcularDesconto(params = {}) {
  const preco = Number(params.preco);
  const desconto = Number(params.desconto);

  if (
    !Number.isFinite(preco) ||
    !Number.isFinite(desconto) ||
    preco < 0 ||
    desconto < 0
  ) {
    return {
      valido: false,
      erro: "Por favor, preencha os valores corretamente!"
    };
  }

  const valorDesconto = (preco * desconto) / 100;
  const precoFinal = preco - valorDesconto;
  const texto = `Você economiza R$ ${valorDesconto.toFixed(2)} | Preço final: R$ ${precoFinal.toFixed(2)}`;

  return {
    valido: true,
    preco,
    desconto,
    valorDesconto,
    precoFinal,
    texto
  };
}

/**
 * Inicializa a interface da Calculadora de Desconto no DOM.
 * Configura os listeners de cálculo, limpeza e suporte a tecla Enter.
 */
export function setupCalculadoraDesconto() {
  if (typeof document === "undefined") return;

  const elPreco = document.getElementById("preco");
  const elDesconto = document.getElementById("desconto");
  const elResultado = document.getElementById("resultado");

  const btnCalcular = document.querySelector('[data-action="calculate"]');
  const btnLimpar = document.querySelector('[data-action="clear"]');

  function limparResultado() {
    if (elResultado) elResultado.innerText = "";
  }

  function limparCampos() {
    if (elPreco) elPreco.value = "";
    if (elDesconto) elDesconto.value = "";
    limparResultado();
  }

  function executarCalculo() {
    if (!elResultado) return;

    const precoInput = elPreco ? elPreco.value.trim() : "";
    const descontoInput = elDesconto ? elDesconto.value.trim() : "";

    if (precoInput === "" || descontoInput === "") {
      elResultado.innerText = "Por favor, preencha os valores corretamente!";
      return;
    }

    const res = calcularDesconto({ preco: precoInput, desconto: descontoInput });

    if (!res.valido) {
      elResultado.innerText = res.erro;
      return;
    }

    elResultado.innerText = res.texto;
  }

  if (elPreco) {
    elPreco.addEventListener("input", limparResultado);
    elPreco.addEventListener("keydown", e => {
      if (e.key === "Enter") {
        e.preventDefault();
        executarCalculo();
      }
    });
  }

  if (elDesconto) {
    elDesconto.addEventListener("input", limparResultado);
    elDesconto.addEventListener("keydown", e => {
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

// Auto-inicialização em ambiente navegador
if (typeof document !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", setupCalculadoraDesconto);
  } else {
    setupCalculadoraDesconto();
  }
}
