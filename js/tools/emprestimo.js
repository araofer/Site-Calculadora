/**
 * Ferramenta: Calculadora de Empréstimo - Calculadora Master
 * Módulo ES nativo para cálculo de parcelas, juros e custo total pelo Sistema Price.
 * Funções puras desacopladas de DOM e de window.
 */

import {
  calculatePricePayment,
  buildPriceSchedule
} from '../core/calculations/amortization.js';

import {
  parseFinancialNumberPtBr,
  parseFinancialIntegerPtBr
} from '../core/currency.js';

import { createResultActions } from '../core/result-actions.js';

/**
 * Converte valores em formato PT-BR ou numérico de forma estrita e segura.
 * Alias para parseFinancialNumberPtBr.
 *
 * @param {string|number} val
 * @returns {number}
 */
export const parseNumberPtBr = parseFinancialNumberPtBr;

/**
 * Normaliza os parâmetros brutos de entrada do empréstimo.
 *
 * @param {Object} rawInput
 * @param {string|number} [rawInput.valor] Valor solicitado / principal
 * @param {string|number} [rawInput.taxa] Taxa de juros mensal (%)
 * @param {string|number} [rawInput.prazo] Prazo em meses
 * @returns {{valor: number, taxa: number, prazo: number}}
 */
export function normalizeEmprestimoInput(rawInput = {}) {
  const valor = parseFinancialNumberPtBr(rawInput.valor);
  const taxa = parseFinancialNumberPtBr(rawInput.taxa);
  const prazo = parseFinancialIntegerPtBr(rawInput.prazo);

  return {
    valor,
    taxa,
    prazo
  };
}

/**
 * Valida os dados de entrada normalizados para o empréstimo.
 *
 * @param {Object} params
 * @returns {{valido: boolean, erro?: string}}
 */
export function validateEmprestimoInput(params = {}) {
  if (!Number.isFinite(params.valor) || params.valor <= 0) {
    return {
      valido: false,
      erro: 'Informe um valor de empréstimo válido maior que zero.'
    };
  }

  if (!Number.isFinite(params.taxa) || params.taxa < 0) {
    return {
      valido: false,
      erro: 'Informe uma taxa de juros válida (zero ou positiva).'
    };
  }

  if (!Number.isFinite(params.prazo) || params.prazo <= 0) {
    return {
      valido: false,
      erro: 'O prazo deve ser de pelo menos 1 mês.'
    };
  }

  if (params.prazo > 600) {
    return {
      valido: false,
      erro: 'O prazo máximo permitido é de 600 meses (50 anos).'
    };
  }

  return { valido: true };
}

/**
 * Executa o cálculo completo do empréstimo pelo Sistema Price.
 * Função pura e desacoplada do DOM.
 *
 * @param {Object} input
 * @returns {Object}
 */
export function calculateEmprestimo(input = {}) {
  const normalized = normalizeEmprestimoInput(input);
  const validation = validateEmprestimoInput(normalized);

  if (!validation.valido) {
    return {
      valido: false,
      erro: validation.erro
    };
  }

  const principal = normalized.valor;
  const periodicRate = normalized.taxa / 100;
  const periods = normalized.prazo;

  const payment = calculatePricePayment({
    principal,
    periodicRate,
    periods
  });

  const scheduleData = buildPriceSchedule({
    principal,
    periodicRate,
    periods
  });

  const totalPago = scheduleData.totalPaid;
  const jurosTotais = scheduleData.totalInterest;
  const percentualJuros = totalPago > 0 ? (jurosTotais / totalPago) * 100 : 0;
  const percentualPrincipal = totalPago > 0 ? (principal / totalPago) * 100 : 100;

  return {
    valido: true,
    valorEmprestimo: principal,
    taxaMensal: normalized.taxa,
    prazoMeses: periods,
    valorParcela: payment,
    totalPago,
    jurosTotais,
    percentualPrincipal,
    percentualJuros,
    schedule: scheduleData.schedule
  };
}

/**
 * Formata os resultados numéricos para exibição em moeda e texto pt-BR.
 *
 * @param {Object} res
 * @returns {Object}
 */
export function formatEmprestimoResult(res = {}) {
  if (!res.valido) return res;

  const formatBrl = val =>
    val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const formatPercent = val =>
    val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '%';

  return {
    ...res,
    valorParcelaFmt: formatBrl(res.valorParcela),
    valorEmprestimoFmt: formatBrl(res.valorEmprestimo),
    jurosTotaisFmt: formatBrl(res.jurosTotais),
    totalPagoFmt: formatBrl(res.totalPago),
    taxaMensalFmt: formatPercent(res.taxaMensal),
    percentualPrincipalFmt: formatPercent(res.percentualPrincipal),
    percentualJurosFmt: formatPercent(res.percentualJuros)
  };
}

/**
 * Prepara os dados de dataset para o gráfico de composição do empréstimo (Principal vs Juros).
 * Função pura e desacoplada do DOM.
 *
 * @param {Object} res Resultado de calculateEmprestimo
 * @returns {Object} Configuração de dados compatível com Chart.js
 */
export function getEmprestimoChartData(res = {}) {
  const principal = Number(res.valorEmprestimo) || 0;
  const juros = Number(res.jurosTotais) || 0;
  return {
    labels: ['Principal (Valor Solicitado)', 'Juros Totais'],
    datasets: [{
      data: [Number(principal.toFixed(2)), Number(juros.toFixed(2))],
      backgroundColor: ['#3b82f6', '#ef4444'],
      hoverBackgroundColor: ['#2563eb', '#dc2626'],
      borderWidth: 1
    }]
  };
}

/**
 * Prepara o payload estruturado para a exportação em PDF.
 * Função pura e desacoplada do DOM.
 *
 * @param {Object} res Resultado de calculateEmprestimo
 * @param {HTMLCanvasElement|null} [canvas=null]
 * @returns {Object} Payload para exportResultPdf
 */
export function getEmprestimoPdfPayload(res = {}, canvas = null) {
  const fmt = formatEmprestimoResult(res);
  return {
    filename: 'calculadora-master-emprestimo.pdf',
    title: 'Simulação de Empréstimo (Sistema Price)',
    inputs: [
      { label: 'Valor Solicitado', value: fmt.valorEmprestimoFmt },
      { label: 'Taxa de Juros Mensal', value: `${fmt.taxaMensalFmt} a.m.` },
      { label: 'Prazo do Empréstimo', value: `${fmt.prazoMeses} meses` }
    ],
    results: [
      { label: 'Valor da Parcela Mensal (Fixa)', value: fmt.valorParcelaFmt, highlight: true },
      { label: 'Total Estimado em Juros', value: fmt.jurosTotaisFmt },
      { label: 'Custo Total a Pagar', value: fmt.totalPagoFmt, highlight: true },
      { label: 'Participação do Principal', value: fmt.percentualPrincipalFmt },
      { label: 'Participação dos Juros', value: fmt.percentualJurosFmt }
    ],
    canvas: canvas && typeof canvas.toDataURL === 'function' ? canvas : null,
    notes: [
      'Simulação elaborada com base no Sistema Francês de Amortização (Tabela Price).',
      'Valores referenciais para planejamento financeiro. Encargos adicionais (IOF, TAC e seguros) compõem o CET final.'
    ]
  };
}

/**
 * Inicializa a interface da Calculadora de Empréstimo no DOM.
 */
export function setupCalculadoraEmprestimo() {
  if (typeof document === 'undefined') return;

  const elValor = document.getElementById('valor');
  const elTaxa = document.getElementById('taxa');
  const elPrazo = document.getElementById('prazo');
  const elResultado = document.getElementById('resultado');
  const elStatus = document.getElementById('emprestimoStatus');

  const btnCalcular = document.querySelector('[data-action="calculate"]');
  const btnLimpar = document.querySelector('[data-action="clear"]');
  const btnCopy = document.querySelector('[data-action="copy"]');
  const btnShare = document.querySelector('[data-action="share"]');
  const btnPrint = document.querySelector('[data-action="print"]');
  const btnPdf = document.querySelector('[data-action="pdf"]');

  let ultimoResultado = null;
  let chartEmprestimoInstance = null;

  const actions = createResultActions({
    title: 'Calculadora de Empréstimo - Calculadora Master',
    statusTarget: elStatus || elResultado,
    getSections: () => {
      if (!ultimoResultado || !ultimoResultado.valido) return null;
      const fmt = formatEmprestimoResult(ultimoResultado);
      return [
        { label: 'Valor do Empréstimo', value: fmt.valorEmprestimoFmt },
        { label: 'Taxa de Juros', value: `${fmt.taxaMensalFmt} a.m.` },
        { label: 'Prazo', value: `${fmt.prazoMeses} meses` },
        { label: 'Valor da Parcela (Price)', value: fmt.valorParcelaFmt },
        { label: 'Juros Totais', value: fmt.jurosTotaisFmt },
        { label: 'Custo Total do Empréstimo', value: fmt.totalPagoFmt }
      ];
    }
  });

  async function getPdfExporter() {
    if (typeof window !== 'undefined' && typeof window.exportResultPdf === 'function') {
      return window.exportResultPdf;
    }
    try {
      const helper = await import('../core/pdf-export.js');
      if (helper && typeof helper.exportResultPdf === 'function') {
        return helper.exportResultPdf;
      }
    } catch (_) {}
    if (typeof window !== 'undefined' && typeof window.alert === 'function') {
      window.alert('Não foi possível gerar o PDF agora. Tente novamente.');
    }
    return null;
  }

  function renderizarGrafico(res) {
    if (typeof window === 'undefined' || typeof window.Chart === 'undefined') return;
    const canvas = document.getElementById('graficoEmprestimo');
    const container = document.getElementById('containerGraficoEmprestimo');
    if (!canvas || !container) return;

    if (chartEmprestimoInstance) {
      chartEmprestimoInstance.destroy();
      chartEmprestimoInstance = null;
    }

    const chartData = getEmprestimoChartData(res);
    const prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    container.style.display = 'block';
    chartEmprestimoInstance = new window.Chart(canvas, {
      type: 'doughnut',
      data: chartData,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: prefersReducedMotion ? false : { duration: 400 },
        plugins: {
          legend: { position: 'bottom' },
          title: {
            display: true,
            text: 'Composição Total: Principal vs Juros',
            color: '#1e293b',
            font: { size: 14, weight: 'bold' }
          },
          tooltip: {
            callbacks: {
              label: (ctx) => {
                const val = Number(ctx.parsed) || 0;
                return ` ${ctx.label}: R$ ${val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
              }
            }
          }
        }
      }
    });
  }

  async function exportarPdf() {
    if (!ultimoResultado || !ultimoResultado.valido) return;
    const canvas = document.getElementById('graficoEmprestimo');
    const payload = getEmprestimoPdfPayload(ultimoResultado, canvas && canvas.offsetParent !== null ? canvas : null);
    const exporter = await getPdfExporter();
    if (exporter) {
      exporter(payload);
    }
  }

  function executarCalculo() {
    const rawInput = {
      valor: elValor ? elValor.value : '',
      taxa: elTaxa ? elTaxa.value : '',
      prazo: elPrazo ? elPrazo.value : ''
    };

    const res = calculateEmprestimo(rawInput);
    ultimoResultado = res;

    if (!elResultado) return;

    if (!res.valido) {
      if (chartEmprestimoInstance) {
        chartEmprestimoInstance.destroy();
        chartEmprestimoInstance = null;
      }
      const container = document.getElementById('containerGraficoEmprestimo');
      if (container) container.style.display = 'none';

      elResultado.innerHTML = `
        <div class="result-card error-card" role="alert" style="background:#fee; color:#c00; padding:16px; border-radius:8px; border:1px solid #fcc;">
          <strong>Atenção:</strong> ${res.erro}
        </div>
      `;
      return;
    }

    const fmt = formatEmprestimoResult(res);

    const summaryRows = res.schedule.slice(0, 6);
    const summaryRowsHtml = summaryRows.map(row => `
      <tr>
        <td style="text-align:center; padding:8px 12px; border-bottom:1px solid #e2e8f0;">${row.period}</td>
        <td style="text-align:right; padding:8px 12px; border-bottom:1px solid #e2e8f0; font-weight:600;">${row.payment.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
        <td style="text-align:right; padding:8px 12px; border-bottom:1px solid #e2e8f0; color:#b91c1c;">${row.interest.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
        <td style="text-align:right; padding:8px 12px; border-bottom:1px solid #e2e8f0; color:#15803d;">${row.amortization.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
        <td style="text-align:right; padding:8px 12px; border-bottom:1px solid #e2e8f0;">${row.closingBalance.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
      </tr>
    `).join('');

    elResultado.innerHTML = `
      <div class="result-card" style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:20px;">
        <div style="text-align:center; margin-bottom:20px; padding-bottom:16px; border-bottom:1px solid #e2e8f0;">
          <span style="display:block; font-size:0.9rem; color:#64748b; text-transform:uppercase; letter-spacing:0.05em;">Parcela Mensal Estimada</span>
          <strong style="font-size:2rem; color:#1e293b;">${fmt.valorParcelaFmt}</strong>
          <span style="display:block; font-size:0.875rem; color:#64748b; margin-top:4px;">em ${fmt.prazoMeses}x fixas (Sistema Price)</span>
        </div>

        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(180px, 1fr)); gap:12px; margin-bottom:20px;">
          <div style="background:#fff; padding:12px; border-radius:6px; border:1px solid #edf2f7;">
            <span style="display:block; font-size:0.8rem; color:#64748b;">Valor Solicitado</span>
            <strong style="font-size:1.1rem; color:#334155;">${fmt.valorEmprestimoFmt}</strong>
          </div>
          <div style="background:#fff; padding:12px; border-radius:6px; border:1px solid #edf2f7;">
            <span style="display:block; font-size:0.8rem; color:#64748b;">Juros Totais</span>
            <strong style="font-size:1.1rem; color:#b91c1c;">${fmt.jurosTotaisFmt}</strong>
          </div>
          <div style="background:#fff; padding:12px; border-radius:6px; border:1px solid #edf2f7;">
            <span style="display:block; font-size:0.8rem; color:#64748b;">Total a Pagar</span>
            <strong style="font-size:1.1rem; color:#1e293b;">${fmt.totalPagoFmt}</strong>
          </div>
        </div>

        <div style="margin-top:16px; margin-bottom:16px;">
          <span style="display:block; font-size:0.85rem; color:#475569; margin-bottom:6px;">Composição do Pagamento:</span>
          <div style="display:flex; height:20px; border-radius:10px; overflow:hidden; background:#e2e8f0;">
            <div style="width:${res.percentualPrincipal}%; background:#3b82f6;" title="Principal: ${fmt.percentualPrincipalFmt}"></div>
            <div style="width:${res.percentualJuros}%; background:#ef4444;" title="Juros: ${fmt.percentualJurosFmt}"></div>
          </div>
          <div style="display:flex; justify-content:space-between; font-size:0.75rem; color:#64748b; margin-top:4px;">
            <span>● Principal (${fmt.percentualPrincipalFmt})</span>
            <span>● Juros (${fmt.percentualJurosFmt})</span>
          </div>
        </div>

        <div style="margin-top:24px;">
          <h3 style="font-size:1rem; color:#1e293b; margin-bottom:8px;">Resumo das Primeiras Parcelas</h3>
          <div style="overflow-x:auto; border:1px solid #cbd5e1; border-radius:6px; background:#fff;">
            <table style="width:100%; border-collapse:collapse; font-size:0.875rem;">
              <thead>
                <tr style="background:#f1f5f9; color:#475569;">
                  <th style="padding:8px 12px; text-align:center;">Nº</th>
                  <th style="padding:8px 12px; text-align:right;">Parcela</th>
                  <th style="padding:8px 12px; text-align:right;">Juros</th>
                  <th style="padding:8px 12px; text-align:right;">Amortização</th>
                  <th style="padding:8px 12px; text-align:right;">Saldo Devedor</th>
                </tr>
              </thead>
              <tbody>
                ${summaryRowsHtml}
              </tbody>
            </table>
          </div>
          <p style="font-size:0.8rem; color:#64748b; margin-top:6px;">
            Exibindo até 6 parcelas. Para o cronograma completo com todas as parcelas mês a mês, consulte a <a href="./amortizacao.html" style="color:#0284c7; text-decoration:underline;">Tabela de Amortização</a>.
          </p>
        </div>
      </div>
    `;

    renderizarGrafico(res);
  }

  function limpar() {
    if (elValor) elValor.value = '';
    if (elTaxa) elTaxa.value = '';
    if (elPrazo) elPrazo.value = '';
    if (elResultado) elResultado.innerHTML = '';
    ultimoResultado = null;

    if (chartEmprestimoInstance) {
      chartEmprestimoInstance.destroy();
      chartEmprestimoInstance = null;
    }
    const container = document.getElementById('containerGraficoEmprestimo');
    if (container) container.style.display = 'none';
  }

  if (btnCalcular) {
    btnCalcular.addEventListener('click', executarCalculo);
  }

  if (btnLimpar) {
    btnLimpar.addEventListener('click', limpar);
  }

  if (btnCopy) {
    btnCopy.addEventListener('click', () => actions.copy(btnCopy));
  }

  if (btnShare) {
    btnShare.addEventListener('click', () => actions.share(btnShare));
  }

  if (btnPrint) {
    btnPrint.addEventListener('click', () => actions.print(btnPrint));
  }

  if (btnPdf) {
    btnPdf.addEventListener('click', exportarPdf);
  }

  const inputs = [elValor, elTaxa, elPrazo].filter(Boolean);
  inputs.forEach(input => {
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        e.preventDefault();
        executarCalculo();
      }
    });
  });
}

// Inicialização automática se carregado em ambiente de navegador
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupCalculadoraEmprestimo);
  } else {
    setupCalculadoraEmprestimo();
  }
}
