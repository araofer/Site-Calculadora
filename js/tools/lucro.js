/**
 * Ferramenta: Calculadora de Lucro e Margem - Calculadora Master
 * Módulo ES nativo para cálculo de lucro bruto e margem sobre o preço de venda.
 * Zero APIs globais.
 */

/**
 * Realiza o cálculo de lucro bruto e margem de lucro sobre o preço de venda final.
 * Função pura e desacoplada do DOM.
 *
 * @param {Object} params
 * @param {number|string} params.custo Custo total do produto
 * @param {number|string} params.preco Preço de venda final do produto
 * @returns {Object} Resultado com lucro bruto, margem percentual ou erro de validação
 */
export function calcularLucro(params = {}) {
  const custo = Number(params.custo);
  const preco = Number(params.preco);

  if (!Number.isFinite(custo) || !Number.isFinite(preco) || custo < 0) {
    return {
      valido: false,
      erro: "Preencha os valores corretamente!"
    };
  }

  if (preco <= 0) {
    return {
      valido: false,
      erro: "O preço de venda deve ser maior que zero."
    };
  }

  const lucro = preco - custo;
  const margem = (lucro / preco) * 100;
  const ehPrejuizo = lucro < 0;
  const corResultado = ehPrejuizo ? "#d9534f" : "#008080";
  const textoHtml = `Lucro Bruto: R$ ${lucro.toFixed(2)}<br>Margem de Lucro: ${margem.toFixed(2)}%`;

  return {
    valido: true,
    custo,
    preco,
    lucro,
    margem,
    ehPrejuizo,
    corResultado,
    textoHtml
  };
}

/**
 * Inicializa a interface da Calculadora de Lucro no DOM.
 * Configura listeners de cálculo, limpeza e suporte a tecla Enter.
 */
export function setupCalculadoraLucro() {
  if (typeof document === "undefined") return;

  const elCusto = document.getElementById("custo");
  const elPreco = document.getElementById("preco");
  const elResultado = document.getElementById("resultado");

  const btnCalcular = document.querySelector('[data-action="calculate"]');
  const btnLimpar = document.querySelector('[data-action="clear"]');

  function limparResultado() {
    if (elResultado) elResultado.innerText = "";
  }

  function limparCampos() {
    if (elCusto) elCusto.value = "";
    if (elPreco) elPreco.value = "";
    limparResultado();
  }

  function executarCalculo() {
    if (!elResultado) return;

    const custoInput = elCusto ? elCusto.value.trim() : "";
    const precoInput = elPreco ? elPreco.value.trim() : "";

    if (custoInput === "" || precoInput === "") {
      elResultado.innerText = "Preencha os valores corretamente!";
      return;
    }

    const res = calcularLucro({ custo: custoInput, preco: precoInput });

    if (!res.valido) {
      elResultado.innerText = res.erro;
      return;
    }

    elResultado.style.color = res.corResultado;
    elResultado.innerHTML = res.textoHtml;
  }

  if (elCusto) {
    elCusto.addEventListener("input", limparResultado);
    elCusto.addEventListener("keydown", e => {
      if (e.key === "Enter") {
        e.preventDefault();
        executarCalculo();
      }
    });
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
    document.addEventListener("DOMContentLoaded", setupCalculadoraLucro);
  } else {
    setupCalculadoraLucro();
  }
}
