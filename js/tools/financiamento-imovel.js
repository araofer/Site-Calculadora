/**
 * Ferramenta: Simulador de Financiamento Imobiliário (SAC) - Calculadora Master
 * Módulo ES nativo para cálculo do Sistema de Amortização Constante e eventos semânticos.
 * Zero APIs globais.
 */

import { parseBRLCurrency, formatBRLCurrencyInput, formatBRL } from "../core/currency.js";
import { createResultActions } from "../core/result-actions.js";

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
  const elErro = document.getElementById("mensagem-erro-imovel");

  const btnCalcular = document.querySelector('[data-action="calculate"]');
  const btnLimpar = document.querySelector('[data-action="clear"]');
  const btnPdf = document.querySelector('[data-action="export-pdf"]');
  const contPdf = document.getElementById("containerPdfImovel");

  function exibirErro(msg) {
    if (elErro) {
      elErro.textContent = msg;
      elErro.style.display = "block";
    }
  }

  let chartImovelInstance = null;
  let ultimoResultadoImovel = null;

  const btnCopy = contPdf ? contPdf.querySelector('[data-action="copy"]') : document.querySelector('[data-action="copy"]');
  const btnShare = contPdf ? contPdf.querySelector('[data-action="share"]') : document.querySelector('[data-action="share"]');
  const btnPrint = contPdf ? contPdf.querySelector('[data-action="print"]') : document.querySelector('[data-action="print"]');

  const actionsImovel = createResultActions({
    title: "Simulador de Financiamento Imobiliário (SAC)",
    getSections: () => {
      if (!ultimoResultadoImovel) return null;
      const res = ultimoResultadoImovel;
      return [
        { label: "Valor do imóvel", value: `R$ ${formatBRL(res.valorImovel)}` },
        { label: "Entrada", value: `R$ ${formatBRL(res.valorEntrada)}` },
        { label: "Valor financiado", value: `R$ ${formatBRL(res.valorFinanciado)}` },
        { label: "Quantidade de parcelas", value: `${res.prazoMeses} parcelas (${res.prazoAnos} anos)` },
        { label: "Juros", value: `R$ ${formatBRL(res.totalJuros)}` },
        { label: "Total", value: `R$ ${formatBRL(res.totalFinanciamento)}` },
        { label: "Custo final", value: `R$ ${formatBRL(res.custoTotalImovel)}` }
      ];
    },
    statusElement: () => document.getElementById("statusImovel")
  });

  async function getPdfExporter() {
    if (typeof window !== 'undefined' && typeof window.exportResultPdf === 'function') {
      return window.exportResultPdf;
    }
    try {
      const helper = await import('../core/' + 'pdf-export.js');
      if (helper && typeof helper.exportResultPdf === 'function') {
        return helper.exportResultPdf;
      }
    } catch (_) {}
    if (typeof window !== 'undefined' && typeof window.alert === 'function') {
      window.alert('Não foi possível gerar o PDF agora. Tente novamente.');
    }
    return null;
  }

  function renderizarGraficoImovel(res) {
    if (typeof window === "undefined" || typeof window.Chart === "undefined") return;
    const canvas = document.getElementById("graficoImovel");
    const container = document.getElementById("containerGraficoImovel");
    if (!canvas || !container) return;

    if (chartImovelInstance) {
      chartImovelInstance.destroy();
      chartImovelInstance = null;
    }

    const prazoMeses = res.prazoMeses;
    const amortizacaoMensal = res.amortizacaoMensal;
    const valorFinanciado = res.valorFinanciado;

    // Amostragem controlada para eixos limpos em prazos longos
    // Sempre preserva início (Parcela 0), intermediárias e última parcela
    const labels = ['Início'];
    const dados = [Number(valorFinanciado.toFixed(2))];

    const step = prazoMeses > 120 ? 12 : (prazoMeses > 36 ? 6 : 1);

    for (let m = step; m < prazoMeses; m += step) {
      labels.push(`Mês ${m}`);
      const saldo = Math.max(0, valorFinanciado - (m * amortizacaoMensal));
      dados.push(Number(saldo.toFixed(2)));
    }

    // Última parcela (saldo quitado / zero)
    labels.push(`Mês ${prazoMeses}`);
    dados.push(0);

    const prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    container.style.display = "block";
    chartImovelInstance = new window.Chart(canvas, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: 'Saldo Devedor (R$)',
          data: dados,
          borderColor: '#1e2a38',
          backgroundColor: 'rgba(30, 42, 56, 0.08)',
          fill: true,
          tension: 0.1,
          pointRadius: prazoMeses > 36 ? 1 : 3
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: prefersReducedMotion ? false : { duration: 400 },
        plugins: {
          legend: { display: false },
          title: {
            display: true,
            text: 'Saldo devedor ao longo do financiamento',
            color: '#1a1a1a',
            font: { size: 14, weight: 'bold' }
          },
          tooltip: {
            callbacks: {
              label: (context) => `Saldo devedor: R$ ${context.parsed.y.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
            }
          }
        },
        scales: {
          x: {
            title: { display: true, text: 'Parcelas' }
          },
          y: {
            title: { display: true, text: 'Saldo Devedor (R$)' },
            ticks: {
              callback: (val) => `R$ ${Number(val).toLocaleString('pt-BR')}`
            }
          }
        }
      }
    });
  }

  function ocultarErro() {
    if (elErro) {
      elErro.textContent = "";
      elErro.style.display = "none";
    }
  }

  function limparResultado() {
    ocultarErro();
    ultimoResultadoImovel = null;
    if (contPdf) contPdf.style.display = "none";
    const statusImovel = document.getElementById("statusImovel");
    if (statusImovel) statusImovel.textContent = "";
    if (chartImovelInstance) {
      chartImovelInstance.destroy();
      chartImovelInstance = null;
    }
    const container = document.getElementById("containerGraficoImovel");
    if (container) container.style.display = "none";
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
    ocultarErro();

    const campoImovel = elImovel ? elImovel.value : "";
    const campoEntrada = elEntrada ? elEntrada.value : "";
    const campoTaxa = elTaxa ? elTaxa.value : "";
    const campoPrazo = elPrazo ? elPrazo.value : "";

    if (!campoImovel || !campoEntrada || !campoTaxa || !campoPrazo) {
      exibirErro("Por favor, preencha todos os campos obrigatórios.");
      return;
    }

    const res = calcularFinanciamentoSAC({
      valorImovel: campoImovel,
      valorEntrada: campoEntrada,
      taxaAnual: campoTaxa,
      prazoAnos: campoPrazo
    });

    if (!res.valido) {
      exibirErro(res.erro);
      return;
    }

    ultimoResultadoImovel = res;
    if (contPdf) contPdf.style.display = "flex";

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

    try {
      renderizarGraficoImovel(res);
    } catch (_) {}
  }

  async function exportarPdfImovel() {
    if (!ultimoResultadoImovel) return;
    const res = ultimoResultadoImovel;
    const canvas = document.getElementById("graficoImovel");
    const helper = await getPdfExporter();
    if (!helper) return;

    helper({
      filename: "calculadora-master-financiamento-imovel.pdf",
      title: "Simulador de Financiamento Imobiliário (SAC)",
      inputs: [
        { label: "Valor do Imóvel", value: `R$ ${formatBRL(res.valorImovel)}` },
        { label: "Valor da Entrada", value: `R$ ${formatBRL(res.valorEntrada)}` },
        { label: "Valor a Financiar", value: `R$ ${formatBRL(res.valorFinanciado)}` },
        { label: "Taxa de Juros Anual", value: `${res.taxaAnual.toLocaleString('pt-BR')}% ao ano` },
        { label: "Prazo de Amortização", value: `${res.prazoAnos} anos (${res.prazoMeses} meses)` }
      ],
      results: [
        { label: "Primeira Parcela (Mais alta)", value: `R$ ${formatBRL(res.primeiraParcela)}`, highlight: true },
        { label: "Última Parcela (Mais baixa)", value: `R$ ${formatBRL(res.ultimaParcela)}` },
        { label: "Amortização Mensal Fixa", value: `R$ ${formatBRL(res.amortizacaoMensal)}` },
        { label: "Total Estimado em Juros", value: `R$ ${formatBRL(res.totalJuros)}` },
        { label: "Total das Parcelas", value: `R$ ${formatBRL(res.totalFinanciamento)}` },
        { label: "Custo Total do Imóvel (com entrada)", value: `R$ ${formatBRL(res.custoTotalImovel)}`, highlight: true }
      ],
      canvas: canvas && canvas.offsetParent !== null ? canvas : null,
      notes: ["Simulação elaborada de acordo com as regras do Sistema de Amortização Constante (SAC)."]
    });
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

  if (btnPdf) {
    btnPdf.addEventListener("click", exportarPdfImovel);
  }

  if (btnCopy) {
    btnCopy.addEventListener("click", () => actionsImovel.copy());
  }

  if (btnShare) {
    btnShare.addEventListener("click", () => actionsImovel.share());
  }

  if (btnPrint) {
    btnPrint.addEventListener("click", () => actionsImovel.print());
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
