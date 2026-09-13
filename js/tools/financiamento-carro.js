/**
 * Ferramenta: Simulador de Financiamento de Carro - Calculadora Master
 * Cálculo baseado na Tabela Price com amortização de juros e parcelas fixas.
 */

(function (root, factory) {
  if (typeof module !== "undefined" && module.exports) {
    const currency = require("../core/currency.js");
    module.exports = factory(currency);
  } else {
    root.FinanciamentoCarro = factory(root.CurrencyUtils || {
      parseBRLCurrency: root.parseBRLCurrency || root.parseMoeda,
      formatBRLCurrencyInput: root.formatBRLCurrencyInput || root.mascaraMoeda,
      formatBRL: root.formatBRL
    });
    // Atalhos globais para compatibilidade
    root.calcularFinanciamento = root.FinanciamentoCarro.calcularFinanciamento;
    root.limparCampos = root.FinanciamentoCarro.limparCampos;
    root.limparResultado = root.FinanciamentoCarro.limparResultado;
  }
})(typeof globalThis !== "undefined" ? globalThis : typeof window !== "undefined" ? window : this, function (Currency) {
  const parseMoeda = (Currency && Currency.parseBRLCurrency) || function (val) {
    if (!val) return 0;
    if (typeof val === "number") return isNaN(val) ? 0 : val;
    const limpo = val.toString().trim().replace(/\./g, "").replace(",", ".");
    const num = Number(limpo);
    return isNaN(num) ? 0 : num;
  };

  const mascaraMoeda = (Currency && Currency.formatBRLCurrencyInput) || function (campo) {
    if (!campo) return;
    const digitos = campo.value.replace(/\D/g, "");
    if (!digitos) {
      campo.value = "";
      return;
    }
    let valor = (Number(digitos) / 100).toFixed(2) + "";
    valor = valor.replace(".", ",");
    valor = valor.replace(/(\d)(?=(\d{3})+(?!\d))/g, "$1.");
    campo.value = valor;
  };

  /**
   * Função pura de cálculo financeiro pela Tabela Price.
   *
   * @param {Object} params
   * @param {number} params.valorVeiculo
   * @param {number} [params.valorEntrada=0]
   * @param {number} params.taxaMensal
   * @param {number} params.prazoMeses
   * @returns {Object} Resultado do cálculo ou erro
   */
  function calcularFinanciamentoPrice(params) {
    const valorVeiculo = Number(params.valorVeiculo);
    const valorEntrada = Number(params.valorEntrada) || 0;
    const taxaMensal = Number(params.taxaMensal);
    const prazoMeses = parseInt(params.prazoMeses, 10);

    if (
      isNaN(valorVeiculo) ||
      isNaN(taxaMensal) ||
      isNaN(prazoMeses) ||
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

    // Se a taxa for 0, evita divisão por zero na fórmula Price
    if (taxaDecimal === 0) {
      valorParcela = valorFinanciado / prazoMeses;
    } else {
      valorParcela =
        valorFinanciado *
        (taxaDecimal * Math.pow(1 + taxaDecimal, prazoMeses)) /
        (Math.pow(1 + taxaDecimal, prazoMeses) - 1);
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

  function limparResultado() {
    if (typeof document === "undefined") return;
    const container = document.getElementById("resultadoFinanciamento");
    if (container) {
      container.innerHTML = `
        <p style="color: #666;">Insira os dados ao lado e clique em calcular para ver o resultado.</p>
      `;
    }
  }

  function limparCampos() {
    if (typeof document === "undefined") return;
    const elVeiculo = document.getElementById("valorVeiculo");
    const elEntrada = document.getElementById("valorEntrada");
    const elTaxa = document.getElementById("taxaMensal");
    const elPrazo = document.getElementById("prazoMeses");

    if (elVeiculo) elVeiculo.value = "";
    if (elEntrada) elEntrada.value = "";
    if (elTaxa) elTaxa.value = "";
    if (elPrazo) elPrazo.value = "";

    limparResultado();
  }

  function calcularFinanciamento() {
    if (typeof document === "undefined") return;
    const elVeiculo = document.getElementById("valorVeiculo");
    const elEntrada = document.getElementById("valorEntrada");
    const elTaxa = document.getElementById("taxaMensal");
    const elPrazo = document.getElementById("prazoMeses");
    const containerResultado = document.getElementById("resultadoFinanciamento");

    if (!containerResultado) return;

    const valorVeiculo = parseMoeda(elVeiculo ? elVeiculo.value : "");
    const valorEntrada = parseMoeda(elEntrada ? elEntrada.value : "");
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

    const fmt = function (val) {
      return val.toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });
    };

    containerResultado.innerHTML = `
      <div style="font-size: 1.1em; margin-bottom: 10px;">Valor a Financiar: <strong>R$ ${fmt(res.valorFinanciado)}</strong></div>
      <div style="font-size: 1.3em; color: #008080; margin-bottom: 15px;">Parcela Mensal (${res.prazoMeses}x): <strong>R$ ${fmt(res.valorParcela)}</strong></div>
      <hr style="border: 0; border-top: 1px solid #ddd; margin: 10px 0;">
      <p>Total dos Juros: <span style="color: #d9534f; font-weight: bold;">R$ ${fmt(res.jurosPagos)}</span></p>
      <p>Total do Financiamento: <strong>R$ ${fmt(res.totalPago)}</strong></p>
      <p>Custo Total do Veículo (com entrada): <strong>R$ ${fmt(res.custoTotalComEntrada)}</strong></p>
    `;
  }

  function inicializarEventos() {
    if (typeof document === "undefined") return;

    const elVeiculo = document.getElementById("valorVeiculo");
    const elEntrada = document.getElementById("valorEntrada");
    const elTaxa = document.getElementById("taxaMensal");
    const elPrazo = document.getElementById("prazoMeses");

    if (elVeiculo) {
      elVeiculo.addEventListener("input", function () {
        mascaraMoeda(this);
        limparResultado();
      });
    }

    if (elEntrada) {
      elEntrada.addEventListener("input", function () {
        mascaraMoeda(this);
        limparResultado();
      });
    }

    if (elTaxa) {
      elTaxa.addEventListener("input", limparResultado);
    }

    if (elPrazo) {
      elPrazo.addEventListener("input", limparResultado);
    }

    // Botões
    const btnCalcular = document.querySelector("button.btn-destaque") || document.querySelector("button[onclick*='calcularFinanciamento']");
    if (btnCalcular) {
      btnCalcular.addEventListener("click", calcularFinanciamento);
    }

    const botoes = document.querySelectorAll("button");
    botoes.forEach(btn => {
      if (btn.textContent.trim().toLowerCase().includes("limpar")) {
        btn.addEventListener("click", limparCampos);
      }
    });

    // Enter para calcular
    [elVeiculo, elEntrada, elTaxa, elPrazo].forEach(el => {
      if (el) {
        el.addEventListener("keydown", function (e) {
          if (e.key === "Enter") {
            e.preventDefault();
            calcularFinanciamento();
          }
        });
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
    calcularFinanciamentoPrice,
    calcularFinanciamento,
    limparCampos,
    limparResultado,
    inicializarEventos
  };
});
