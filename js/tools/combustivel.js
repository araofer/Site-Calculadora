/**
 * Ferramenta: Calculadora de Consumo de Combustível - Calculadora Master
 * Módulo ES nativo para cálculo de consumo em litros e custo total de viagens.
 * Zero APIs globais.
 */

/**
 * Calcula a quantidade de litros necessários e o custo total da viagem.
 * Função pura e desacoplada do DOM.
 *
 * @param {Object} params
 * @param {number|string} params.distancia Distância total em km
 * @param {number|string} params.consumo Consumo médio em km/l
 * @param {number|string} params.preco Preço por litro do combustível
 * @returns {Object} Resultado com litros, custo e texto formatado ou erro de validação
 */
export function calcularConsumoCombustivel(params = {}) {
  const distanciaRaw = params.distancia !== undefined && params.distancia !== null ? String(params.distancia).trim() : "";
  const consumoRaw = params.consumo !== undefined && params.consumo !== null ? String(params.consumo).trim() : "";
  const precoRaw = params.preco !== undefined && params.preco !== null ? String(params.preco).trim() : "";

  if (distanciaRaw === "" || consumoRaw === "" || precoRaw === "") {
    return {
      valido: false,
      erro: "Preencha todos os campos!"
    };
  }

  const distancia = typeof params.distancia === "number"
    ? params.distancia
    : parseFloat(distanciaRaw.replace(",", "."));

  const consumo = typeof params.consumo === "number"
    ? params.consumo
    : parseFloat(consumoRaw.replace(",", "."));

  const preco = typeof params.preco === "number"
    ? params.preco
    : parseFloat(precoRaw.replace(",", "."));

  if (!Number.isFinite(distancia) || !Number.isFinite(consumo) || !Number.isFinite(preco)) {
    return {
      valido: false,
      erro: "Informe valores numéricos válidos!"
    };
  }

  if (distancia <= 0 || consumo <= 0 || preco < 0) {
    return {
      valido: false,
      erro: "Distância e consumo devem ser maiores que zero e o preço não pode ser negativo!"
    };
  }

  const litros = distancia / consumo;
  const custo = litros * preco;

  const texto = "Você irá gastar " + litros.toFixed(2) + " litros | Custo total: R$ " + custo.toFixed(2);

  return {
    valido: true,
    distancia,
    consumo,
    preco,
    litros,
    custo,
    texto
  };
}

/**
 * Inicializa os ouvintes de eventos e integração com a interface da página.
 */
export function setupCombustivel() {
  const inputDistancia = document.getElementById("distancia");
  const inputConsumo = document.getElementById("consumo");
  const inputPreco = document.getElementById("preco");
  const resultadoEl = document.getElementById("resultado");

  const btnCalcular = document.querySelector('[data-action="calculate"]');
  const btnLimpar = document.querySelector('[data-action="clear"]');

  if (!inputDistancia || !inputConsumo || !inputPreco || !resultadoEl) {
    return;
  }

  const limparResultado = () => {
    resultadoEl.innerText = "";
  };

  const executarCalculo = () => {
    const res = calcularConsumoCombustivel({
      distancia: inputDistancia.value,
      consumo: inputConsumo.value,
      preco: inputPreco.value
    });

    if (!res.valido) {
      resultadoEl.innerText = res.erro;
      return;
    }

    resultadoEl.innerText = res.texto;
  };

  const executarLimpeza = () => {
    inputDistancia.value = "";
    inputConsumo.value = "";
    inputPreco.value = "";
    limparResultado();
  };

  inputDistancia.addEventListener("input", limparResultado);
  inputConsumo.addEventListener("input", limparResultado);
  inputPreco.addEventListener("input", limparResultado);

  if (btnCalcular) {
    btnCalcular.addEventListener("click", executarCalculo);
  }

  if (btnLimpar) {
    btnLimpar.addEventListener("click", executarLimpeza);
  }
}

if (typeof document !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", setupCombustivel);
  } else {
    setupCombustivel();
  }
}
