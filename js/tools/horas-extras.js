/**
 * Ferramenta: Calculadora de Horas Extras - Calculadora Master
 * Módulo ES nativo para cálculo de valor da hora normal, adicional e total de horas extras.
 * Zero APIs globais.
 */

import { formatBRL } from "../core/currency.js";

/**
 * Converte string em formato decimal brasileiro ou padrão para número de ponto flutuante.
 * Função pura e desacoplada do DOM.
 *
 * @param {string|number} valorStr
 * @returns {number} Número convertido ou NaN
 */
export function parseNumero(valorStr) {
  if (typeof valorStr === "number") {
    return Number.isFinite(valorStr) ? valorStr : NaN;
  }
  if (typeof valorStr !== "string") return NaN;

  const limpo = valorStr.trim();
  if (!limpo) return NaN;

  let normalizado;

  // Formato brasileiro com milhar e decimal (ex: 2.500,50 ou -2.500,50)
  if (/^-?\d{1,3}(\.\d{3})+,\d+$/.test(limpo)) {
    normalizado = limpo.replace(/\./g, "").replace(",", ".");
  // Decimal com vírgula (ex: 2500,50 ou -2500,50)
  } else if (/^-?\d+,\d+$/.test(limpo)) {
    normalizado = limpo.replace(",", ".");
  // Inteiro ou decimal com ponto (ex: 2500, 2500.50, -5, -10.5)
  } else if (/^-?\d+(\.\d+)?$/.test(limpo)) {
    normalizado = limpo;
  } else {
    return NaN;
  }

  const numero = Number(normalizado);
  return Number.isFinite(numero) ? numero : NaN;
}

/**
 * Realiza o cálculo de horas extras baseado no salário mensal, jornada e adicional percentual.
 * Função pura e desacoplada do DOM.
 *
 * @param {Object} params
 * @param {number|string} params.salario Salário mensal base
 * @param {number|string} params.jornada Jornada mensal em horas (ex: 220)
 * @param {number|string} params.horasExtras Quantidade de horas extras realizadas
 * @param {number|string} params.adicional Percentual de adicional (ex: 50 para 50%)
 * @returns {Object} Resultado detalhado do cálculo ou erro de validação
 */
export function calcularHorasExtras(params = {}) {
  const salarioRaw = params.salario !== undefined && params.salario !== null ? String(params.salario).trim() : "";
  const jornadaRaw = params.jornada !== undefined && params.jornada !== null ? String(params.jornada).trim() : "";
  const horasExtrasRaw = params.horasExtras !== undefined && params.horasExtras !== null ? String(params.horasExtras).trim() : "";
  const adicionalRaw = params.adicional !== undefined && params.adicional !== null ? String(params.adicional).trim() : "";

  if (!salarioRaw || !jornadaRaw || !horasExtrasRaw || !adicionalRaw) {
    return {
      valido: false,
      erro: "Por favor, preencha todos os campos para realizar o cálculo."
    };
  }

  const salario = parseNumero(salarioRaw);
  const jornada = parseNumero(jornadaRaw);
  const horasExtras = parseNumero(horasExtrasRaw);
  const adicional = parseNumero(adicionalRaw);

  if (isNaN(salario) || isNaN(jornada) || isNaN(horasExtras) || isNaN(adicional)) {
    return {
      valido: false,
      erro: "Por favor, informe valores numéricos válidos em todos os campos."
    };
  }

  if (salario <= 0) {
    return {
      valido: false,
      erro: "O salário mensal deve ser maior que zero."
    };
  }

  if (jornada <= 0) {
    return {
      valido: false,
      erro: "A jornada mensal em horas deve ser maior que zero."
    };
  }

  if (horasExtras < 0) {
    return {
      valido: false,
      erro: "A quantidade de horas extras não pode ser negativa."
    };
  }

  if (adicional < 0) {
    return {
      valido: false,
      erro: "O adicional de hora extra não pode ser negativo."
    };
  }

  const valorHora = salario / jornada;
  const valorHoraExtra = valorHora * (1 + adicional / 100);
  const totalHorasExtras = valorHoraExtra * horasExtras;

  const horasFormatadas = new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits: 10
  }).format(horasExtras);

  return {
    valido: true,
    salario,
    jornada,
    horasExtras,
    adicional,
    valorHora,
    valorHoraExtra,
    totalHorasExtras,
    horasFormatadas
  };
}

/**
 * Inicializa a interface da Calculadora de Horas Extras no DOM.
 * Configura listeners semânticos e mensagens de erro e sucesso.
 */
export function setupHorasExtras() {
  if (typeof document === "undefined") return;

  const elSalario = document.getElementById("salario");
  const elJornada = document.getElementById("jornada");
  const elHorasExtras = document.getElementById("horas-extras");
  const elAdicional = document.getElementById("adicional");

  const resContainer = document.getElementById("resultado-container");
  const erroEl = document.getElementById("mensagem-erro");
  const elResultado = document.getElementById("resultado");
  const elDetalhes = document.getElementById("detalhes");

  const btnCalcular = document.querySelector('[data-action="calculate"]');
  const btnLimpar = document.querySelector('[data-action="clear"]');

  function limparResultado() {
    if (erroEl) {
      erroEl.innerText = "";
      erroEl.style.display = "none";
    }
    if (resContainer) {
      resContainer.style.display = "none";
    }
  }

  function limparCampos() {
    if (elSalario) elSalario.value = "";
    if (elJornada) elJornada.value = "";
    if (elHorasExtras) elHorasExtras.value = "";
    if (elAdicional) elAdicional.value = "";

    if (elResultado) elResultado.innerText = "";
    if (elDetalhes) elDetalhes.innerHTML = "";
    limparResultado();
  }

  function executarCalculo() {
    if (!resContainer || !erroEl || !elResultado || !elDetalhes) return;

    limparResultado();

    const salarioStr = elSalario ? elSalario.value : "";
    const jornadaStr = elJornada ? elJornada.value : "";
    const horasExtrasStr = elHorasExtras ? elHorasExtras.value : "";
    const adicionalStr = elAdicional ? elAdicional.value : "";

    const res = calcularHorasExtras({
      salario: salarioStr,
      jornada: jornadaStr,
      horasExtras: horasExtrasStr,
      adicional: adicionalStr
    });

    if (!res.valido) {
      erroEl.innerText = res.erro;
      erroEl.style.display = "block";
      return;
    }

    elResultado.innerText = "Total estimado das horas extras: " + formatBRL(res.totalHorasExtras, true);
    elDetalhes.innerHTML =
      `Valor da hora normal: <strong>${formatBRL(res.valorHora, true)}</strong><br>` +
      `Valor de cada hora extra: <strong>${formatBRL(res.valorHoraExtra, true)}</strong><br>` +
      `Quantidade considerada: <strong>${res.horasFormatadas} horas</strong><br>` +
      `Adicional informado: <strong>${res.adicional}%</strong>`;

    resContainer.style.display = "block";
  }

  [elSalario, elJornada, elHorasExtras, elAdicional].forEach(input => {
    if (input) {
      input.addEventListener("input", limparResultado);
      input.addEventListener("keydown", e => {
        if (e.key === "Enter") {
          e.preventDefault();
          executarCalculo();
        }
      });
    }
  });

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
    document.addEventListener("DOMContentLoaded", setupHorasExtras);
  } else {
    setupHorasExtras();
  }
}
