/**
 * Ferramenta: Calculadora de IMC - Calculadora Master
 * Módulo ES nativo para cálculo do Índice de Massa Corporal e faixas de classificação.
 * Zero APIs globais.
 */

/**
 * Realiza o cálculo do IMC e determina a faixa de classificação correspondente.
 * Função pura e desacoplada do DOM.
 *
 * @param {Object} params
 * @param {number|string} params.peso Peso corporal em kg
 * @param {number|string} params.altura Altura em metros (ou cm se > 3)
 * @returns {Object} Resultado com valor do IMC, classificação e texto formatado ou erro de validação
 */
export function calcularIMC(params = {}) {
  let peso = NaN;
  let altura = NaN;

  if (typeof params.peso === "number") {
    peso = params.peso;
  } else if (typeof params.peso === "string" && params.peso.trim() !== "") {
    peso = parseFloat(params.peso.trim().replace(",", "."));
  }

  if (typeof params.altura === "number") {
    altura = params.altura;
  } else if (typeof params.altura === "string" && params.altura.trim() !== "") {
    // Para altura, vírgula é decimal (ex: "1,75" -> 1.75)
    altura = parseFloat(params.altura.trim().replace(",", "."));
  }

  if (!Number.isFinite(peso) || !Number.isFinite(altura) || peso <= 0 || altura <= 0) {
    return {
      valido: false,
      erro: "Informe valores válidos para peso e altura!"
    };
  }

  // Ajuste caso o usuário digite altura em cm (ex: 175 em vez de 1.75)
  if (altura > 3) {
    altura = altura / 100;
  }

  const imc = peso / (altura * altura);
  let classificacao = "";

  if (imc < 18.5) {
    classificacao = "Abaixo do peso";
  } else if (imc < 25) {
    classificacao = "Peso normal";
  } else if (imc < 30) {
    classificacao = "Sobrepeso";
  } else if (imc < 35) {
    classificacao = "Obesidade Grau I";
  } else if (imc < 40) {
    classificacao = "Obesidade Grau II";
  } else {
    classificacao = "Obesidade Grau III (Mórbida)";
  }

  const texto = `Seu IMC é ${imc.toFixed(2)} | ${classificacao}`;

  return {
    valido: true,
    peso,
    altura,
    imc,
    classificacao,
    texto
  };
}

/**
 * Inicializa a interface da Calculadora de IMC no DOM.
 * Configura listeners semânticos e renderização de resultados.
 */
export function setupCalculadoraIMC() {
  if (typeof document === "undefined") return;

  const elPeso = document.getElementById("peso");
  const elAltura = document.getElementById("altura");
  const elResultado = document.getElementById("resultado");

  const btnCalcular = document.querySelector('[data-action="calculate"]');
  const btnLimpar = document.querySelector('[data-action="clear"]');

  function limparResultado() {
    if (elResultado) {
      elResultado.innerText = "";
    }
  }

  function limparCampos() {
    if (elPeso) elPeso.value = "";
    if (elAltura) elAltura.value = "";
    limparResultado();
  }

  function executarCalculo() {
    if (!elResultado) return;

    const pesoVal = elPeso ? elPeso.value : "";
    const alturaVal = elAltura ? elAltura.value : "";

    const res = calcularIMC({
      peso: pesoVal,
      altura: alturaVal
    });

    if (!res.valido) {
      elResultado.innerText = res.erro;
      return;
    }

    elResultado.innerText = res.texto;
  }

  if (elPeso) {
    elPeso.addEventListener("input", limparResultado);
    elPeso.addEventListener("keydown", e => {
      if (e.key === "Enter") {
        e.preventDefault();
        executarCalculo();
      }
    });
  }

  if (elAltura) {
    elAltura.addEventListener("input", limparResultado);
    elAltura.addEventListener("keydown", e => {
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
    document.addEventListener("DOMContentLoaded", setupCalculadoraIMC);
  } else {
    setupCalculadoraIMC();
  }
}
