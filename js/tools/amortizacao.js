/**
 * Ferramenta: Tabela de Amortização (Sistema Price) - Calculadora Master
 * Módulo ES nativo para geração completa de cronograma de amortização.
 * Funções puras desacopladas de DOM e de window.
 */

import { buildPriceSchedule } from '../core/calculations/amortization.js';

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
 * Normaliza as entradas do formulário de amortização.
 *
 * @param {Object} rawInput
 * @param {string|number} [rawInput.valor] Valor financiado
 * @param {string|number} [rawInput.taxa] Taxa de juros mensal (%)
 * @param {string|number} [rawInput.prazo] Quantidade de parcelas (meses)
 * @returns {{valor: number, taxa: number, prazo: number}}
 */
export function normalizeAmortizacaoInput(rawInput = {}) {
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
 * Valida os dados de entrada normalizados para o cálculo da amortização.
 *
 * @param {Object} params
 * @returns {{valido: boolean, erro?: string}}
 */
export function validateAmortizacaoInput(params = {}) {
  if (!Number.isFinite(params.valor) || params.valor <= 0) {
    return {
      valido: false,
      erro: 'Informe um valor financiado válido maior que zero.'
    };
  }

  if (!Number.isFinite(params.taxa) || params.taxa < 0) {
    return {
      valido: false,
      erro: 'Informe uma taxa de juros mensal válida (zero ou positiva).'
    };
  }

  if (!Number.isFinite(params.prazo) || params.prazo <= 0) {
    return {
      valido: false,
      erro: 'Informe uma quantidade de parcelas de pelo menos 1 mês.'
    };
  }

  if (params.prazo > 480) {
    return {
      valido: false,
      erro: 'O prazo máximo para amortização é de 480 parcelas (40 anos).'
    };
  }

  return { valido: true };
}

/**
 * Gera o cronograma e os totais de amortização pelo Sistema Price.
 * Função pura e desacoplada do DOM.
 *
 * @param {Object} input
 * @returns {Object}
 */
export function calculateAmortizacao(input = {}) {
  const normalized = normalizeAmortizacaoInput(input);
  const validation = validateAmortizacaoInput(normalized);

  if (!validation.valido) {
    return {
      valido: false,
      erro: validation.erro
    };
  }

  const principal = normalized.valor;
  const periodicRate = normalized.taxa / 100;
  const periods = normalized.prazo;

  const scheduleData = buildPriceSchedule({
    principal,
    periodicRate,
    periods
  });

  return {
    valido: true,
    valorFinanciado: principal,
    taxaMensal: normalized.taxa,
    prazoMeses: periods,
    valorParcela: scheduleData.payment,
    totalPago: scheduleData.totalPaid,
    jurosTotais: scheduleData.totalInterest,
    schedule: scheduleData.schedule
  };
}

/**
 * Formata os valores monetários e tabelas para exibição em pt-BR.
 *
 * @param {Object} res
 * @returns {Object}
 */
export function formatAmortizacaoResult(res = {}) {
  if (!res.valido) return res;

  const formatBrl = val =>
    val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const formatPercent = val =>
    val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '%';

  const formattedSchedule = res.schedule.map(row => ({
    period: row.period,
    openingBalanceFmt: formatBrl(row.openingBalance),
    interestFmt: formatBrl(row.interest),
    amortizationFmt: formatBrl(row.amortization),
    paymentFmt: formatBrl(row.payment),
    closingBalanceFmt: formatBrl(row.closingBalance)
  }));

  return {
    ...res,
    valorFinanciadoFmt: formatBrl(res.valorFinanciado),
    valorParcelaFmt: formatBrl(res.valorParcela),
    totalPagoFmt: formatBrl(res.totalPago),
    totalAmortizadoFmt: formatBrl(res.valorFinanciado),
    totalJurosFmt: formatBrl(res.jurosTotais),
    taxaMensalFmt: formatPercent(res.taxaMensal),
    formattedSchedule
  };
}

/**
 * Prepara os dados de dataset para o gráfico de evolução do saldo devedor.
 * Função pura e desacoplada do DOM.
 *
 * @param {Array<Object>} schedule Cronograma de amortização
 * @param {number} [initialPrincipal=0] Saldo inicial no mês 0
 * @returns {Object} Configuração de dados compatível com Chart.js
 */
export function getAmortizacaoChartData(schedule = [], initialPrincipal = 0) {
  if (!Array.isArray(schedule) || schedule.length === 0) {
    return { labels: [], datasets: [] };
  }

  const total = schedule.length;
  const step = total > 120 ? 12 : (total > 48 ? 6 : (total > 24 ? 2 : 1));

  const labels = ['Início'];
  const saldoData = [initialPrincipal > 0 ? Number(initialPrincipal.toFixed(2)) : Number(schedule[0].openingBalance.toFixed(2))];

  for (let i = step - 1; i < total; i += step) {
    const item = schedule[i];
    labels.push(`Mês ${item.period}`);
    saldoData.push(Number(item.closingBalance.toFixed(2)));
  }

  if ((total - 1) % step !== 0) {
    const lastItem = schedule[total - 1];
    labels.push(`Mês ${lastItem.period}`);
    saldoData.push(Number(lastItem.closingBalance.toFixed(2)));
  }

  return {
    labels,
    datasets: [{
      label: 'Saldo Devedor (R$)',
      data: saldoData,
      borderColor: '#0284c7',
      backgroundColor: 'rgba(2, 132, 199, 0.1)',
      fill: true,
      tension: 0.1,
      pointRadius: total > 36 ? 1 : 3
    }]
  };
}

/**
 * Prepara o payload estruturado para a exportação da simulação em PDF.
 * Função pura e desacoplada do DOM.
 *
 * @param {Object} res Resultado de calculateAmortizacao
 * @param {HTMLCanvasElement|null} [canvas=null]
 * @returns {Object} Payload para exportResultPdf
 */
export function getAmortizacaoPdfPayload(res = {}, canvas = null) {
  const fmt = formatAmortizacaoResult(res);
  return {
    filename: 'calculadora-master-amortizacao.pdf',
    title: 'Tabela de Amortização (Sistema Price)',
    inputs: [
      { label: 'Valor Financiado (Principal)', value: fmt.valorFinanciadoFmt },
      { label: 'Taxa de Juros Mensal', value: `${fmt.taxaMensalFmt} a.m.` },
      { label: 'Quantidade de Parcelas', value: `${fmt.prazoMeses} meses` }
    ],
    results: [
      { label: 'Prestação Mensal Fixa', value: fmt.valorParcelaFmt, highlight: true },
      { label: 'Total Financiado', value: fmt.valorFinanciadoFmt },
      { label: 'Total em Juros', value: fmt.totalJurosFmt },
      { label: 'Total a Pagar', value: fmt.totalPagoFmt, highlight: true }
    ],
    canvas: canvas && typeof canvas.toDataURL === 'function' ? canvas : null,
    notes: [
      'Simulação gerada pelo Sistema Francês de Amortização (Tabela Price).',
      'Prestações fixas com amortização crescente e juros decrescentes a cada período.'
    ]
  };
}

/**
 * Inicializa a interface da Tabela de Amortização no DOM.
 */
export function setupTabelaAmortizacao() {
  if (typeof document === 'undefined') return;

  const elValor = document.getElementById('valor');
  const elTaxa = document.getElementById('taxa');
  const elPrazo = document.getElementById('prazo');
  const elResultado = document.getElementById('resultado');
  const elStatus = document.getElementById('amortizacaoStatus');

  const btnCalcular = document.querySelector('[data-action="calculate"]');
  const btnLimpar = document.querySelector('[data-action="clear"]');
  const btnCopy = document.querySelector('[data-action="copy"]');
  const btnShare = document.querySelector('[data-action="share"]');
  const btnPrint = document.querySelector('[data-action="print"]');
  const btnPdf = document.querySelector('[data-action="pdf"]');

  let ultimoResultado = null;
  let chartAmortizacaoInstance = null;

  const actions = createResultActions({
    title: 'Tabela de Amortização - Calculadora Master',
    statusTarget: elStatus || elResultado,
    getSections: () => {
      if (!ultimoResultado || !ultimoResultado.valido) return null;
      const fmt = formatAmortizacaoResult(ultimoResultado);
      return [
        { label: 'Valor Financiado', value: fmt.valorFinanciadoFmt },
        { label: 'Taxa de Juros', value: `${fmt.taxaMensalFmt} a.m.` },
        { label: 'Quantidade de Parcelas', value: `${fmt.prazoMeses} meses` },
        { label: 'Prestação (Price)', value: fmt.valorParcelaFmt },
        { label: 'Juros Totais', value: fmt.jurosTotaisFmt },
        { label: 'Total Pago', value: fmt.totalPagoFmt }
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
    const canvas = document.getElementById('graficoAmortizacao');
    const container = document.getElementById('containerGraficoAmortizacao');
    if (!canvas || !container) return;

    if (chartAmortizacaoInstance) {
      chartAmortizacaoInstance.destroy();
      chartAmortizacaoInstance = null;
    }

    const chartData = getAmortizacaoChartData(res.schedule, res.valorFinanciado);
    const prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    container.style.display = 'block';
    chartAmortizacaoInstance = new window.Chart(canvas, {
      type: 'line',
      data: chartData,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: prefersReducedMotion ? false : { duration: 400 },
        plugins: {
          legend: { display: false },
          title: {
            display: true,
            text: 'Evolução do Saldo Devedor ao Longo do Prazo',
            color: '#1e293b',
            font: { size: 14, weight: 'bold' }
          },
          tooltip: {
            callbacks: {
              label: (ctx) => `Saldo devedor: R$ ${Number(ctx.parsed.y).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
            }
          }
        },
        scales: {
          x: {
            title: { display: true, text: 'Cronograma de Parcelas' }
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

  async function exportarPdf() {
    if (!ultimoResultado || !ultimoResultado.valido) return;
    const canvas = document.getElementById('graficoAmortizacao');
    const payload = getAmortizacaoPdfPayload(ultimoResultado, canvas && canvas.offsetParent !== null ? canvas : null);
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

    const res = calculateAmortizacao(rawInput);
    ultimoResultado = res;

    if (!elResultado) return;

    if (!res.valido) {
      if (chartAmortizacaoInstance) {
        chartAmortizacaoInstance.destroy();
        chartAmortizacaoInstance = null;
      }
      const container = document.getElementById('containerGraficoAmortizacao');
      if (container) container.style.display = 'none';

      elResultado.innerHTML = `
        <div class="result-card error-card" role="alert" style="background:#fee; color:#c00; padding:16px; border-radius:8px; border:1px solid #fcc;">
          <strong>Atenção:</strong> ${res.erro}
        </div>
      `;
      return;
    }

    const fmt = formatAmortizacaoResult(res);

    const tableRowsHtml = fmt.formattedSchedule.map(row => `
      <tr>
        <td style="text-align:center; padding:8px 12px; border-bottom:1px solid #e2e8f0;">${row.period}</td>
        <td style="text-align:right; padding:8px 12px; border-bottom:1px solid #e2e8f0;">${row.openingBalanceFmt}</td>
        <td style="text-align:right; padding:8px 12px; border-bottom:1px solid #e2e8f0; color:#b91c1c;">${row.interestFmt}</td>
        <td style="text-align:right; padding:8px 12px; border-bottom:1px solid #e2e8f0; color:#15803d;">${row.amortizationFmt}</td>
        <td style="text-align:right; padding:8px 12px; border-bottom:1px solid #e2e8f0; font-weight:600;">${row.paymentFmt}</td>
        <td style="text-align:right; padding:8px 12px; border-bottom:1px solid #e2e8f0;">${row.closingBalanceFmt}</td>
      </tr>
    `).join('');

    elResultado.innerHTML = `
      <div class="result-card" style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:20px;">
        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(160px, 1fr)); gap:12px; margin-bottom:24px;">
          <div style="background:#fff; padding:12px; border-radius:6px; border:1px solid #edf2f7; text-align:center;">
            <span style="display:block; font-size:0.8rem; color:#64748b;">Prestação Mensal</span>
            <strong style="font-size:1.2rem; color:#1e293b;">${fmt.valorParcelaFmt}</strong>
          </div>
          <div style="background:#fff; padding:12px; border-radius:6px; border:1px solid #edf2f7; text-align:center;">
            <span style="display:block; font-size:0.8rem; color:#64748b;">Total Financiado</span>
            <strong style="font-size:1.2rem; color:#334155;">${fmt.valorFinanciadoFmt}</strong>
          </div>
          <div style="background:#fff; padding:12px; border-radius:6px; border:1px solid #edf2f7; text-align:center;">
            <span style="display:block; font-size:0.8rem; color:#64748b;">Total em Juros</span>
            <strong style="font-size:1.2rem; color:#b91c1c;">${fmt.jurosTotaisFmt}</strong>
          </div>
          <div style="background:#fff; padding:12px; border-radius:6px; border:1px solid #edf2f7; text-align:center;">
            <span style="display:block; font-size:0.8rem; color:#64748b;">Total a Pagar</span>
            <strong style="font-size:1.2rem; color:#1e293b;">${fmt.totalPagoFmt}</strong>
          </div>
        </div>

        <h3 style="font-size:1.1rem; color:#1e293b; margin-bottom:12px;">Cronograma Parcela a Parcela (Sistema Price)</h3>
        <div style="overflow-x:auto; max-height:480px; border:1px solid #cbd5e1; border-radius:6px; background:#fff;">
          <table style="width:100%; border-collapse:collapse; font-size:0.875rem;">
            <thead style="position:sticky; top:0; background:#f1f5f9; box-shadow:0 1px 2px rgba(0,0,0,0.05);">
              <tr>
                <th style="padding:10px 12px; text-align:center; color:#475569;">Nº</th>
                <th style="padding:10px 12px; text-align:right; color:#475569;">Saldo Inicial</th>
                <th style="padding:10px 12px; text-align:right; color:#475569;">Juros</th>
                <th style="padding:10px 12px; text-align:right; color:#475569;">Amortização</th>
                <th style="padding:10px 12px; text-align:right; color:#475569;">Prestação</th>
                <th style="padding:10px 12px; text-align:right; color:#475569;">Saldo Final</th>
              </tr>
            </thead>
            <tbody>
              ${tableRowsHtml}
            </tbody>
          </table>
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

    if (chartAmortizacaoInstance) {
      chartAmortizacaoInstance.destroy();
      chartAmortizacaoInstance = null;
    }
    const container = document.getElementById('containerGraficoAmortizacao');
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
    document.addEventListener('DOMContentLoaded', setupTabelaAmortizacao);
  } else {
    setupTabelaAmortizacao();
  }
}
