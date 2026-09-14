/**
 * Ferramenta: Calculadora de Juros Simples e Compostos - Calculadora Master
 * Módulo ES nativo com cálculos isolados e eventos semânticos.
 * Zero APIs globais.
 */

/**
 * Calcula juros simples: J = C * i * t e Montante = C + J.
 * Função pura e desacoplada do DOM.
 *
 * @param {Object} params
 * @param {number|string} params.capital Capital inicial
 * @param {number|string} params.taxa Taxa de juros percentual (ex: 5 para 5%)
 * @param {number|string} params.tempo Período em meses
 * @returns {Object} Resultado com juros e montante total ou erro de validação
 */
export function calcularJurosSimples(params = {}) {
  const capital = Number(params.capital);
  const taxa = Number(params.taxa);
  const tempo = Number(params.tempo);

  if (
    !Number.isFinite(capital) ||
    !Number.isFinite(taxa) ||
    !Number.isFinite(tempo) ||
    capital < 0 ||
    taxa < 0 ||
    tempo < 0
  ) {
    return {
      valido: false,
      erro: "Preencha todos os campos corretamente."
    };
  }

  const juros = capital * (taxa / 100) * tempo;
  const total = capital + juros;

  return {
    valido: true,
    capital,
    taxa,
    tempo,
    juros,
    total
  };
}

/**
 * Calcula juros compostos: M = C * (1 + i)^t e Juros = M - C.
 * Função pura e desacoplada do DOM.
 *
 * @param {Object} params
 * @param {number|string} params.capital Capital inicial
 * @param {number|string} params.taxa Taxa de juros percentual (ex: 5 para 5%)
 * @param {number|string} params.tempo Período em meses
 * @returns {Object} Resultado com juros e montante total ou erro de validação
 */
export function calcularJurosCompostos(params = {}) {
  const capital = Number(params.capital);
  const taxa = Number(params.taxa);
  const tempo = Number(params.tempo);

  if (
    !Number.isFinite(capital) ||
    !Number.isFinite(taxa) ||
    !Number.isFinite(tempo) ||
    capital < 0 ||
    taxa < 0 ||
    tempo < 0
  ) {
    return {
      valido: false,
      erro: "Preencha todos os campos corretamente."
    };
  }

  const total = capital * Math.pow(1 + taxa / 100, tempo);
  const juros = total - capital;

  return {
    valido: true,
    capital,
    taxa,
    tempo,
    juros,
    total
  };
}

/**
 * Inicializa a interface da Calculadora de Juros no DOM.
 * Configura os listeners de juros simples, juros compostos e limpeza.
 */
export function setupCalculadoraJuros() {
  if (typeof document === "undefined") return;

  const capSimples = document.getElementById("capitalSimples");
  const taxSimples = document.getElementById("taxaSimples");
  const temSimples = document.getElementById("tempoSimples");
  const resSimples = document.getElementById("resultadoSimples");

  const capComposto = document.getElementById("capitalComposto");
  const taxComposto = document.getElementById("taxaComposta");
  const temComposto = document.getElementById("tempoComposto");
  const resComposto = document.getElementById("resultadoComposto");

  const btnSimples = document.querySelector('[data-action="calculate-simple"]');
  const btnComposto = document.querySelector('[data-action="calculate-compound"]');
  const btnLimpar = document.querySelector('[data-action="clear"]');
  const btnPdfSimples = document.querySelector('[data-action="export-pdf-simple"]');
  const btnPdfComposto = document.querySelector('[data-action="export-pdf-compound"]');
  const contPdfSimples = document.getElementById("containerPdfSimples");
  const contPdfComposto = document.getElementById("containerPdfComposto");

  let chartSimplesInstance = null;
  let chartCompostoInstance = null;
  let ultimoResultadoSimples = null;
  let ultimoResultadoComposto = null;

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

  function renderizarGraficoSimples(capital, taxa, tempo) {
    if (typeof window === "undefined" || typeof window.Chart === "undefined") return;
    const canvas = document.getElementById("graficoJurosSimples");
    const container = document.getElementById("containerGraficoSimples");
    if (!canvas || !container) return;

    if (chartSimplesInstance) {
      chartSimplesInstance.destroy();
      chartSimplesInstance = null;
    }

    const meses = Math.max(1, Math.floor(tempo));
    const labels = [];
    const dados = [];
    const step = meses > 60 ? Math.ceil(meses / 30) : 1;

    for (let m = 0; m <= meses; m += step) {
      labels.push(`Mês ${m}`);
      dados.push(Number((capital + (capital * (taxa / 100) * m)).toFixed(2)));
    }
    if (labels[labels.length - 1] !== `Mês ${meses}`) {
      labels.push(`Mês ${meses}`);
      dados.push(Number((capital + (capital * (taxa / 100) * meses)).toFixed(2)));
    }

    const prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    container.style.display = "block";
    chartSimplesInstance = new window.Chart(canvas, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: 'Evolução do montante',
          data: dados,
          borderColor: '#008080',
          backgroundColor: 'rgba(0, 128, 128, 0.1)',
          fill: true,
          tension: 0.1,
          pointRadius: meses > 36 ? 0 : 3
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: prefersReducedMotion ? false : { duration: 400 },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (context) => `Montante: R$ ${context.parsed.y.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
            }
          }
        },
        scales: {
          x: {
            title: { display: true, text: 'Período (meses)' },
            ticks: {
              maxRotation: 0,
              autoSkip: true,
              maxTicksLimit: 6
            }
          },
          y: {
            title: { display: true, text: 'Valor (R$)' },
            ticks: {
              maxTicksLimit: 5,
              callback: (val) => `R$ ${Number(val).toLocaleString('pt-BR')}`
            }
          }
        }
      }
    });
  }

  function renderizarGraficoComposto(capital, taxa, tempo) {
    if (typeof window === "undefined" || typeof window.Chart === "undefined") return;
    const canvas = document.getElementById("graficoJurosComposto");
    const container = document.getElementById("containerGraficoComposto");
    if (!canvas || !container) return;

    if (chartCompostoInstance) {
      chartCompostoInstance.destroy();
      chartCompostoInstance = null;
    }

    const meses = Math.max(1, Math.floor(tempo));
    const labels = [];
    const dados = [];
    const step = meses > 60 ? Math.ceil(meses / 30) : 1;

    for (let m = 0; m <= meses; m += step) {
      labels.push(`Mês ${m}`);
      dados.push(Number((capital * Math.pow(1 + taxa / 100, m)).toFixed(2)));
    }
    if (labels[labels.length - 1] !== `Mês ${meses}`) {
      labels.push(`Mês ${meses}`);
      dados.push(Number((capital * Math.pow(1 + taxa / 100, meses)).toFixed(2)));
    }

    const prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    container.style.display = "block";
    chartCompostoInstance = new window.Chart(canvas, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: 'Evolução do montante',
          data: dados,
          borderColor: '#1e2a38',
          backgroundColor: 'rgba(30, 42, 56, 0.1)',
          fill: true,
          tension: 0.1,
          pointRadius: meses > 36 ? 0 : 3
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: prefersReducedMotion ? false : { duration: 400 },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (context) => `Montante: R$ ${context.parsed.y.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
            }
          }
        },
        scales: {
          x: {
            title: { display: true, text: 'Período (meses)' },
            ticks: {
              maxRotation: 0,
              autoSkip: true,
              maxTicksLimit: 6
            }
          },
          y: {
            title: { display: true, text: 'Valor (R$)' },
            ticks: {
              maxTicksLimit: 5,
              callback: (val) => `R$ ${Number(val).toLocaleString('pt-BR')}`
            }
          }
        }
      }
    });
  }

  function limparResultado() {
    if (resSimples) resSimples.innerText = "";
    if (resComposto) resComposto.innerText = "";
    ultimoResultadoSimples = null;
    ultimoResultadoComposto = null;
    if (chartSimplesInstance) {
      chartSimplesInstance.destroy();
      chartSimplesInstance = null;
    }
    if (chartCompostoInstance) {
      chartCompostoInstance.destroy();
      chartCompostoInstance = null;
    }
    const contSimples = document.getElementById("containerGraficoSimples");
    if (contSimples) contSimples.style.display = "none";
    const contComposto = document.getElementById("containerGraficoComposto");
    if (contComposto) contComposto.style.display = "none";
    if (contPdfSimples) contPdfSimples.style.display = "none";
    if (contPdfComposto) contPdfComposto.style.display = "none";
  }

  function limparCampos() {
    [capSimples, taxSimples, temSimples, capComposto, taxComposto, temComposto].forEach(input => {
      if (input) input.value = "";
    });
    limparResultado();
  }

  function executarSimples() {
    if (!resSimples) return;

    const capital = capSimples ? capSimples.value : "";
    const taxa = taxSimples ? taxSimples.value : "";
    const tempo = temSimples ? temSimples.value : "";

    if (capital === "" || taxa === "" || tempo === "") {
      resSimples.innerText = "Preencha todos os campos corretamente.";
      return;
    }

    const res = calcularJurosSimples({ capital, taxa, tempo });

    if (!res.valido) {
      resSimples.innerText = res.erro;
      return;
    }

    ultimoResultadoSimples = {
      capital: res.capital,
      taxa: res.taxa,
      tempo: res.tempo,
      juros: res.juros,
      total: res.total
    };

    resSimples.innerHTML = `Juros: R$ ${res.juros.toFixed(2)} <br><strong>Total: R$ ${res.total.toFixed(2)}</strong>`;
    if (contPdfSimples) contPdfSimples.style.display = "flex";

    try {
      renderizarGraficoSimples(res.capital, res.taxa, res.tempo);
    } catch (_) {}
  }

  function executarComposto() {
    if (!resComposto) return;

    const capital = capComposto ? capComposto.value : "";
    const taxa = taxComposto ? taxComposto.value : "";
    const tempo = temComposto ? temComposto.value : "";

    if (capital === "" || taxa === "" || tempo === "") {
      resComposto.innerText = "Preencha todos os campos corretamente.";
      return;
    }

    const res = calcularJurosCompostos({ capital, taxa, tempo });

    if (!res.valido) {
      resComposto.innerText = res.erro;
      return;
    }

    ultimoResultadoComposto = {
      capital: res.capital,
      taxa: res.taxa,
      tempo: res.tempo,
      juros: res.juros,
      total: res.total
    };

    resComposto.innerHTML = `Juros: R$ ${res.juros.toFixed(2)} <br><strong>Total: R$ ${res.total.toFixed(2)}</strong>`;
    if (contPdfComposto) contPdfComposto.style.display = "flex";

    try {
      renderizarGraficoComposto(res.capital, res.taxa, res.tempo);
    } catch (_) {}
  }

  async function exportarPdfSimples() {
    if (!ultimoResultadoSimples) return;
    const canvas = document.getElementById("graficoJurosSimples");
    const helper = await getPdfExporter();
    if (!helper) return;

    helper({
      filename: "calculadora-master-juros-simples.pdf",
      title: "Calculadora de Juros Simples",
      inputs: [
        { label: "Tipo de Operação", value: "Juros Simples" },
        { label: "Capital Inicial", value: `R$ ${ultimoResultadoSimples.capital.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` },
        { label: "Taxa de Juros", value: `${ultimoResultadoSimples.taxa}% ao mês` },
        { label: "Período", value: `${ultimoResultadoSimples.tempo} ${ultimoResultadoSimples.tempo === 1 ? 'mês' : 'meses'}` }
      ],
      results: [
        { label: "Total de Juros", value: `R$ ${ultimoResultadoSimples.juros.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` },
        { label: "Montante Total", value: `R$ ${ultimoResultadoSimples.total.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, highlight: true }
      ],
      canvas: canvas && canvas.offsetParent !== null ? canvas : null,
      notes: ["Cálculo baseado na fórmula J = C × i × t."]
    });
  }

  async function exportarPdfComposto() {
    if (!ultimoResultadoComposto) return;
    const canvas = document.getElementById("graficoJurosComposto");
    const helper = await getPdfExporter();
    if (!helper) return;

    helper({
      filename: "calculadora-master-juros-compostos.pdf",
      title: "Calculadora de Juros Compostos",
      inputs: [
        { label: "Tipo de Operação", value: "Juros Compostos" },
        { label: "Capital Inicial", value: `R$ ${ultimoResultadoComposto.capital.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` },
        { label: "Taxa de Juros", value: `${ultimoResultadoComposto.taxa}% ao mês` },
        { label: "Período", value: `${ultimoResultadoComposto.tempo} ${ultimoResultadoComposto.tempo === 1 ? 'mês' : 'meses'}` }
      ],
      results: [
        { label: "Total de Juros", value: `R$ ${ultimoResultadoComposto.juros.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` },
        { label: "Montante Total", value: `R$ ${ultimoResultadoComposto.total.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, highlight: true }
      ],
      canvas: canvas && canvas.offsetParent !== null ? canvas : null,
      notes: ["Cálculo baseado na fórmula M = C × (1 + i)^t."]
    });
  }

  // Eventos de limpeza ao digitar
  [capSimples, taxSimples, temSimples, capComposto, taxComposto, temComposto].forEach(input => {
    if (input) {
      input.addEventListener("input", limparResultado);
    }
  });

  // Acessibilidade: tecla Enter
  [capSimples, taxSimples, temSimples].forEach(input => {
    if (input) {
      input.addEventListener("keydown", e => {
        if (e.key === "Enter") {
          e.preventDefault();
          executarSimples();
        }
      });
    }
  });

  [capComposto, taxComposto, temComposto].forEach(input => {
    if (input) {
      input.addEventListener("keydown", e => {
        if (e.key === "Enter") {
          e.preventDefault();
          executarComposto();
        }
      });
    }
  });

  // Eventos semânticos nos botões
  if (btnSimples) {
    btnSimples.addEventListener("click", executarSimples);
  }

  if (btnComposto) {
    btnComposto.addEventListener("click", executarComposto);
  }

  if (btnLimpar) {
    btnLimpar.addEventListener("click", limparCampos);
  }

  if (btnPdfSimples) {
    btnPdfSimples.addEventListener("click", exportarPdfSimples);
  }

  if (btnPdfComposto) {
    btnPdfComposto.addEventListener("click", exportarPdfComposto);
  }
}

// Auto-inicialização em ambiente navegador
if (typeof document !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", setupCalculadoraJuros);
  } else {
    setupCalculadoraJuros();
  }
}
