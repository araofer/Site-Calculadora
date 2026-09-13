/**
 * Ferramenta: Simulador de Financiamento de Carro - Calculadora Master
 * Módulo ES nativo com cálculo Price isolado e eventos semânticos data-action.
 * Zero APIs globais.
 */

import { parseBRLCurrency, formatBRLCurrencyInput, formatBRL } from "../core/currency.js";

/**
 * Função pura de cálculo financeiro pela Tabela Price.
 *
 * @param {Object} params
 * @param {number} params.valorVeiculo Valor total do veículo
 * @param {number} [params.valorEntrada=0] Valor de entrada opcional
 * @param {number} params.taxaMensal Taxa de juros mensal em percentual (ex: 1.5 para 1.5%)
 * @param {number} params.prazoMeses Prazo em meses
 * @returns {Object} Objeto com resultado detalhado ou erro de validação
 */
export function calcularFinanciamentoPrice(params = {}) {
  const valorVeiculo = Number(params.valorVeiculo);
  const valorEntrada = Number(params.valorEntrada) || 0;
  const taxaMensal = Number(params.taxaMensal);
  const prazoMeses = parseInt(params.prazoMeses, 10);

  if (
    !Number.isFinite(valorVeiculo) ||
    !Number.isFinite(taxaMensal) ||
    !Number.isFinite(prazoMeses) ||
    valorVeiculo <= 0 ||
    taxaMensal < 0 ||
    prazoMeses <= 0
  ) {
    return {
      valido: false,
      erro: "Preencha todos os campos corretamente."
    };
  }

  const valorFinanciado = valorVeiculo - valorEntrada;

  if (valorFinanciado <= 0) {
    return {
      valido: false,
      erro: "O valor da entrada não pode ser maior ou igual ao valor do veículo."
    };
  }

  const taxaDecimal = taxaMensal / 100;
  let valorParcela = 0;

  // Se a taxa for 0%, divisão linear sem divisão por zero na fórmula Price
  if (taxaDecimal === 0) {
    valorParcela = valorFinanciado / prazoMeses;
  } else {
    const fator = Math.pow(1 + taxaDecimal, prazoMeses);
    valorParcela = valorFinanciado * (taxaDecimal * fator) / (fator - 1);
  }

  const totalPago = valorParcela * prazoMeses;
  const jurosPagos = totalPago - valorFinanciado;
  const custoTotalComEntrada = totalPago + valorEntrada;

  return {
    valido: true,
    valorVeiculo,
    valorEntrada,
    valorFinanciado,
    taxaMensal,
    prazoMeses,
    valorParcela,
    totalPago,
    jurosPagos,
    custoTotalComEntrada
  };
}

/**
 * Inicializa os manipuladores de eventos e a interface do simulador no DOM.
 * Utiliza seletores semânticos data-action e IDs estáveis.
 */
export function setupFinanciamentoCarro() {
  if (typeof document === "undefined") return;

  const elVeiculo = document.getElementById("valorVeiculo");
  const elEntrada = document.getElementById("valorEntrada");
  const elTaxa = document.getElementById("taxaMensal");
  const elPrazo = document.getElementById("prazoMeses");
  const containerResultado = document.getElementById("resultadoFinanciamento");

  const btnCalcular = document.querySelector('[data-action="calculate"]');
  const btnLimpar = document.querySelector('[data-action="clear"]');

  function limparResultado() {
    if (containerResultado) {
      containerResultado.innerHTML = `
        <p style="color: #666;">Insira os dados ao lado e clique em calcular para ver o resultado.</p>
      `;
    }
  }

  function limparCampos() {
    if (elVeiculo) elVeiculo.value = "";
    if (elEntrada) elEntrada.value = "";
    if (elTaxa) elTaxa.value = "";
    if (elPrazo) elPrazo.value = "";
    limparResultado();
  }

  function executarCalculo() {
    if (!containerResultado) return;

    const valorVeiculo = parseBRLCurrency(elVeiculo ? elVeiculo.value : "");
    const valorEntrada = parseBRLCurrency(elEntrada ? elEntrada.value : "");
    const taxaInput = elTaxa ? elTaxa.value.trim() : "";
    const taxaMensal = parseFloat(taxaInput.replace(",", "."));
    const prazoMeses = parseInt(elPrazo ? elPrazo.value : "", 10);

    const res = calcularFinanciamentoPrice({
      valorVeiculo,
      valorEntrada,
      taxaMensal,
      prazoMeses
    });

    if (!res.valido) {
      containerResultado.innerHTML = `<span style="color: red;">${res.erro}</span>`;
      return;
    }

    containerResultado.innerHTML = `
      <div style="font-size: 1.1em; margin-bottom: 10px;">Valor a Financiar: <strong>R$ ${formatBRL(res.valorFinanciado)}</strong></div>
      <div style="font-size: 1.3em; color: #008080; margin-bottom: 15px;">Parcela Mensal (${res.prazoMeses}x): <strong>R$ ${formatBRL(res.valorParcela)}</strong></div>
      <hr style="border: 0; border-top: 1px solid #ddd; margin: 10px 0;">
      <p>Total dos Juros: <span style="color: #d9534f; font-weight: bold;">R$ ${formatBRL(res.jurosPagos)}</span></p>
      <p>Total do Financiamento: <strong>R$ ${formatBRL(res.totalPago)}</strong></p>
      <p>Custo Total do Veículo (com entrada): <strong>R$ ${formatBRL(res.custoTotalComEntrada)}</strong></p>
    `;
  }

  // Máscaras de entrada
  if (elVeiculo) {
    elVeiculo.addEventListener("input", () => {
      formatBRLCurrencyInput(elVeiculo);
      limparResultado();
    });
  }

  if (elEntrada) {
    elEntrada.addEventListener("input", () => {
      formatBRLCurrencyInput(elEntrada);
      limparResultado();
    });
  }

  if (elTaxa) {
    elTaxa.addEventListener("input", limparResultado);
  }

  if (elPrazo) {
    elPrazo.addEventListener("input", limparResultado);
  }

  // Eventos semânticos nos botões
  if (btnCalcular) {
    btnCalcular.addEventListener("click", executarCalculo);
  }

  if (btnLimpar) {
    btnLimpar.addEventListener("click", limparCampos);
  }

  // Acessibilidade: disparar cálculo com Enter
  [elVeiculo, elEntrada, elTaxa, elPrazo].forEach(input => {
    if (input) {
      input.addEventListener("keydown", e => {
        if (e.key === "Enter") {
          e.preventDefault();
          executarCalculo();
        }
      });
    }
  });
}

// Auto-inicialização em ambiente navegador
if (typeof document !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", setupFinanciamentoCarro);
  } else {
    setupFinanciamentoCarro();
  }
}
