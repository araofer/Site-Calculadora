/**
 * Ferramenta: Simulador de Financiamento Imobiliário (SAC) - Calculadora Master
 * Módulo ES nativo para cálculo do Sistema de Amortização Constante e eventos semânticos.
 * Zero APIs globais.
 */

import { parseBRLCurrency, formatBRLCurrencyInput, formatBRL } from "../core/currency.js";

/**
 * Realiza o cálculo do financiamento imobiliário através do Sistema de Amortização Constante (SAC).
 * Função pura e desacoplada do DOM.
 *
 * @param {Object} params
 * @param {number|string} params.valorImovel Valor total do imóvel
 * @param {number|string} params.valorEntrada Valor da entrada fornecida
 * @param {number|string} params.taxaAnual Taxa de juros anual percentual (ex: 9.5 para 9.5% a.a.)
 * @param {number|string} params.prazoAnos Prazo total em anos
 * @returns {Object} Resultado detalhado do financiamento ou erro de validação
 */
export function calcularFinanciamentoSAC(params = {}) {
  const valorImovel = parseBRLCurrency(params.valorImovel);
  const valorEntrada = parseBRLCurrency(params.valorEntrada);

  // Tratamento da taxa anual (pode vir como número ou string com vírgula/ponto)
  let taxaAnual = 0;
  if (typeof params.taxaAnual === "number") {
    taxaAnual = Number.isFinite(params.taxaAnual) ? params.taxaAnual : NaN;
  } else if (typeof params.taxaAnual === "string" && params.taxaAnual.trim() !== "") {
    taxaAnual = parseFloat(params.taxaAnual.trim().replace(/\./g, "").replace(",", "."));
  } else {
    taxaAnual = NaN;
  }

  const prazoAnos = parseInt(params.prazoAnos, 10);

  if (
    !Number.isFinite(valorImovel) ||
    !Number.isFinite(taxaAnual) ||
    !Number.isFinite(prazoAnos) ||
    valorImovel <= 0 ||
    taxaAnual < 0 ||
    prazoAnos <= 0
  ) {
    return {
      valido: false,
      erro: "Por favor, preencha todos os campos obrigatórios com valores válidos."
    };
  }

  const valorFinanciado = valorImovel - valorEntrada;

  if (valorFinanciado <= 0) {
    return {
      valido: false,
      erro: "O valor da entrada não pode ser maior ou igual ao valor do imóvel."
    };
  }

  const prazoMeses = prazoAnos * 12;
  if (prazoMeses <= 0) {
    return {
      valido: false,
      erro: "Por favor, insira um prazo válido em anos."
    };
  }

  // Conversão de taxa anual para taxa mensal equivalente
  const taxaMensal = taxaAnual === 0 ? 0 : Math.pow(1 + (taxaAnual / 100), 1 / 12) - 1;
  const amortizacaoMensal = valorFinanciado / prazoMeses;

  const jurosPrimeiraParcela = valorFinanciado * taxaMensal;
  const primeiraParcela = amortizacaoMensal + jurosPrimeiraParcela;

  const jurosUltimaParcela = amortizacaoMensal * taxaMensal;
  const ultimaParcela = amortizacaoMensal + jurosUltimaParcela;

  let totalJuros = 0;
  let saldoDevedorAtual = valorFinanciado;
  for (let i = 0; i < prazoMeses; i++) {
    totalJuros += saldoDevedorAtual * taxaMensal;
    saldoDevedorAtual -= amortizacaoMensal;
  }

  const totalFinanciamento = valorFinanciado + totalJuros;
  const custoTotalImovel = totalFinanciamento + valorEntrada;

  return {
    valido: true,
    valorImovel,
    valorEntrada,
    valorFinanciado,
    taxaAnual,
    taxaMensal,
    prazoAnos,
    prazoMeses,
    amortizacaoMensal,
    primeiraParcela,
    ultimaParcela,
    totalJuros,
    totalFinanciamento,
    custoTotalImovel
  };
}

export const calcularFinanciamentoImovel = calcularFinanciamentoSAC;

/**
 * Inicializa a interface da calculadora de financiamento imobiliário no DOM.
 * Configura máscaras, eventos semânticos e renderização acessível.
 */
export function setupFinanciamentoImovel() {
  if (typeof document === "undefined") return;

  const elImovel = document.getElementById("valorImovel");
  const elEntrada = document.getElementById("valorEntrada");
  const elTaxa = document.getElementById("taxaAnual");
  const elPrazo = document.getElementById("prazoAnos");
  const elResultado = document.getElementById("resultadoImovel");

  const btnCalcular = document.querySelector('[data-action="calculate"]');
  const btnLimpar = document.querySelector('[data-action="clear"]');

  function limparResultado() {
    if (elResultado) {
      elResultado.innerHTML = `
        <p style="color: #666; text-align: center;">Insira os dados do imóvel acima e clique em calcular para ver a evolução das parcelas.</p>
      `;
    }
  }

  function limparCampos() {
    if (elImovel) elImovel.value = "";
    if (elEntrada) elEntrada.value = "";
    if (elTaxa) elTaxa.value = "";
    if (elPrazo) elPrazo.value = "";
    limparResultado();
  }

  function executarCalculo() {
    if (!elResultado) return;

    const campoImovel = elImovel ? elImovel.value : "";
    const campoEntrada = elEntrada ? elEntrada.value : "";
    const campoTaxa = elTaxa ? elTaxa.value : "";
    const campoPrazo = elPrazo ? elPrazo.value : "";

    if (!campoImovel || !campoEntrada || !campoTaxa || !campoPrazo) {
      alert("Por favor, preencha todos os campos obrigatórios.");
      return;
    }

    const res = calcularFinanciamentoSAC({
      valorImovel: campoImovel,
      valorEntrada: campoEntrada,
      taxaAnual: campoTaxa,
      prazoAnos: campoPrazo
    });

    if (!res.valido) {
      alert(res.erro);
      return;
    }

    elResultado.innerHTML = `
      <div class="resultado-wrapper">
        <div class="resultado-item principal">
          <span>Valor a Financiar:</span>
          <strong>R$ ${formatBRL(res.valorFinanciado)}</strong>
        </div>
        
        <div class="resultado-duplo-destaque">
          <div class="resultado-destaque">
            <span>Primeira Parcela (Mais alta):</span>
            <h2 style="color: #2c3e50; font-size: 1.8rem; margin: 10px 0;">R$ ${formatBRL(res.primeiraParcela)}</h2>
          </div>
          <div class="resultado-destaque">
            <span>Última Parcela (Mais baixa):</span>
            <h2 style="color: #2e7d32; font-size: 1.8rem; margin: 10px 0;">R$ ${formatBRL(res.ultimaParcela)}</h2>
          </div>
        </div>
        
        <div class="resultado-grid-detalhes">
          <div class="resultado-item">
            <span>Total estimado em Juros:</span>
            <span style="color: #c62828; font-weight: bold;">R$ ${formatBRL(res.totalJuros)}</span>
          </div>
          <div class="resultado-item">
            <span>Total das Parcelas (${res.prazoMeses} meses):</span>
            <strong>R$ ${formatBRL(res.totalFinanciamento)}</strong>
          </div>
          <div class="resultado-item">
            <span>Custo Total do Imóvel (com a entrada):</span>
            <strong>R$ ${formatBRL(res.custoTotalImovel)}</strong>
          </div>
        </div>
      </div>
    `;
  }

  // Máscaras de entrada em tempo real
  if (elImovel) {
    elImovel.addEventListener("input", () => {
      formatBRLCurrencyInput(elImovel);
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

  // Suporte a teclado (Enter) nos campos de entrada
  [elImovel, elEntrada, elTaxa, elPrazo].forEach(input => {
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
    document.addEventListener("DOMContentLoaded", setupFinanciamentoImovel);
  } else {
    setupFinanciamentoImovel();
  }
}
