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
  const btnPdf = document.querySelector('[data-action="export-pdf"]');
  const contPdf = document.getElementById("containerPdfLucro");

  let chartLucroInstance = null;
  let ultimoResultadoLucro = null;

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

  function renderizarGraficoLucro(res) {
    if (typeof window === "undefined" || typeof window.Chart === "undefined") return;
    const canvas = document.getElementById("graficoLucro");
    const container = document.getElementById("containerGraficoLucro");
    if (!canvas || !container) return;

    if (chartLucroInstance) {
      chartLucroInstance.destroy();
      chartLucroInstance = null;
    }

    const labels = ['Custo', 'Lucro', 'Preço de Venda'];
    const dados = [res.custo, res.lucro, res.preco];
    const cores = [
      '#e74c3c',
      res.lucro >= 0 ? '#2e7d32' : '#c62828',
      '#1e2a38'
    ];

    const prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    container.style.display = "block";
    chartLucroInstance = new window.Chart(canvas, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Valor (R$)',
          data: dados,
          backgroundColor: cores,
          borderRadius: 6,
          maxBarThickness: 50
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
            text: 'Custo, lucro e preço de venda',
            color: '#1a1a1a',
            font: { size: 14, weight: 'bold' }
          },
          tooltip: {
            callbacks: {
              label: (context) => `${context.label}: R$ ${context.parsed.y.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
            }
          }
        },
        scales: {
          y: {
            title: { display: true, text: 'Valor (R$)' },
            ticks: {
              callback: (val) => `R$ ${Number(val).toLocaleString('pt-BR')}`
            }
          }
        }
      }
    });
  }

  function limparResultado() {
    if (elResultado) elResultado.innerText = "";
    ultimoResultadoLucro = null;
    if (contPdf) contPdf.style.display = "none";
    if (chartLucroInstance) {
      chartLucroInstance.destroy();
      chartLucroInstance = null;
    }
    const container = document.getElementById("containerGraficoLucro");
    if (container) container.style.display = "none";
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

    ultimoResultadoLucro = res;
    if (contPdf) contPdf.style.display = "flex";

    elResultado.style.color = res.corResultado;
    elResultado.innerHTML = res.textoHtml;

    try {
      renderizarGraficoLucro(res);
    } catch (_) {}
  }

  async function exportarPdfLucro() {
    if (!ultimoResultadoLucro) return;
    const res = ultimoResultadoLucro;
    const canvas = document.getElementById("graficoLucro");
    const helper = await getPdfExporter();
    if (!helper) return;

    const statusTexto = res.status === 'lucro'
      ? 'Lucro Positivo'
      : (res.status === 'prejuizo' ? 'Prejuízo' : 'Ponto de Equilíbrio');

    helper({
      filename: "calculadora-master-lucro.pdf",
      title: "Calculadora de Lucro e Margem",
      inputs: [
        { label: "Custo Total do Produto", value: `R$ ${res.custo.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` },
        { label: "Preço de Venda Final", value: `R$ ${res.preco.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` }
      ],
      results: [
        { label: "Situação", value: statusTexto },
        { label: res.lucro >= 0 ? "Lucro Bruto" : "Prejuízo", value: `R$ ${res.lucro.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, highlight: true },
        { label: "Margem de Lucro", value: `${res.margem.toFixed(2)}%`, highlight: true }
      ],
      canvas: canvas && canvas.offsetParent !== null ? canvas : null,
      notes: ["Fórmulas aplicadas: Lucro = Preço de Venda - Custo | Margem % = (Lucro ÷ Preço de Venda) × 100."]
    });
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

  if (btnPdf) {
    btnPdf.addEventListener("click", exportarPdfLucro);
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
