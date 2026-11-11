/**
 * Calculadora de Taxa da Maquininha — Calculadora Master
 * Módulo ES nativo para apuração de taxas de maquininha e valor líquido.
 * Suporta cálculo direto e inverso (gross-up) em débito, crédito à vista e parcelado (2x a 12x).
 * Regras puras desacopladas do DOM e seguras contra XSS.
 */

import { createResultActions } from '../core/result-actions.js';
import { parseBRLCurrency, formatBRLCurrencyInput, formatBRL } from '../core/currency.js';

export const MODALIDADES_VALIDAS = new Set(['debito', 'credito_vista', 'credito_parcelado']);
export const OBJETIVOS_VALIDOS = new Set(['direto', 'inverso']);
export const MIN_PARCELAS = 2;
export const MAX_PARCELAS = 12;

/**
 * Arredonda valor monetário para 2 casas decimais evitando -0 e imprecisões de ponto flutuante.
 *
 * @param {number} valor
 * @returns {number}
 */
export function arredondarMoeda(valor) {
  if (!Number.isFinite(valor)) return 0;
  const arredondado = Math.round((valor + Number.EPSILON) * 100) / 100;
  return Object.is(arredondado, -0) ? 0 : arredondado;
}

/**
 * Arredonda valor percentual para 2 casas decimais evitando -0.
 *
 * @param {number} valor
 * @returns {number}
 */
export function arredondarPercentual(valor) {
  if (!Number.isFinite(valor)) return 0;
  const arredondado = Math.round((valor + Number.EPSILON) * 100) / 100;
  return Object.is(arredondado, -0) ? 0 : arredondado;
}

/**
 * Converte string flexível ou número para taxa percentual numérica.
 * Suporta formatos com vírgula ou ponto ("3,19", "3.19", "5").
 *
 * @param {string|number} valor
 * @returns {number}
 */
export function parseTaxaPercentual(valor) {
  if (valor === undefined || valor === null) return NaN;
  if (typeof valor === 'number') {
    return Number.isFinite(valor) ? valor : NaN;
  }
  const limpo = String(valor).trim().replace(/\s+/g, '').replace('%', '');
  if (!limpo) return NaN;
  const normalizado = limpo.replace(',', '.');
  const num = Number(normalizado);
  return Number.isFinite(num) ? num : NaN;
}

/**
 * Executa o cálculo da taxa da maquininha e valores resultantes.
 * Função pura e desacoplada do DOM para testes automatizados.
 *
 * Fórmulas oficiais:
 * - Direto:
 *     D = (V × T / 100) + F
 *     L = V - D
 * - Inverso (Gross-up):
 *     V_cobrar = (L + F) / (1 - T / 100)
 *     D = V_cobrar - L
 *
 * @param {Object} params
 * @param {'direto'|'inverso'} [params.objetivo='direto'] 'direto' (descontar taxa) ou 'inverso' (repassar taxa)
 * @param {'debito'|'credito_vista'|'credito_parcelado'} [params.modalidade='credito_vista']
 * @param {number|string} params.valor Valor da venda (no direto) ou valor líquido desejado (no inverso)
 * @param {number|string} params.taxaPercentual Taxa percentual da transação (%)
 * @param {number|string} [params.tarifaFixa=0] Tarifa fixa por transação (R$) (opcional, padrão 0)
 * @param {number|string} [params.parcelas=1] Quantidade de parcelas (obrigatório entre 2 e 12 se credito_parcelado)
 * @returns {{ ok: boolean, data?: Object, error?: string }}
 */
export function calcularTaxaMaquininha(params = {}) {
  const objetivo = params.objetivo === 'inverso' ? 'inverso' : 'direto';

  let modalidade = params.modalidade || 'credito_vista';
  if (!MODALIDADES_VALIDAS.has(modalidade)) {
    modalidade = 'credito_vista';
  }

  // 1. Validação do Número de Parcelas
  let parcelas = 1;
  if (modalidade === 'credito_parcelado') {
    const pNum = Number(params.parcelas);
    if (!Number.isInteger(pNum) || pNum < MIN_PARCELAS || pNum > MAX_PARCELAS) {
      return {
        ok: false,
        error: `Para crédito parcelado, informe um número de parcelas entre ${MIN_PARCELAS} e ${MAX_PARCELAS}.`
      };
    }
    parcelas = pNum;
  }

  // 2. Validação do Valor Principal (Venda ou Líquido Desejado)
  if (params.valor === undefined || params.valor === null || String(params.valor).trim() === '') {
    const nomeCampo = objetivo === 'direto' ? 'o valor da venda' : 'o valor líquido desejado';
    return { ok: false, error: `Informe ${nomeCampo}.` };
  }

  const valor = typeof params.valor === 'number'
    ? params.valor
    : parseBRLCurrency(params.valor, { allowNegative: true });

  if (isNaN(valor) || !Number.isFinite(valor) || valor <= 0) {
    const nomeCampo = objetivo === 'direto' ? 'O valor da venda' : 'O valor líquido desejado';
    return { ok: false, error: `${nomeCampo} deve ser maior que zero.` };
  }

  // 3. Validação da Taxa Percentual
  if (params.taxaPercentual === undefined || params.taxaPercentual === null || String(params.taxaPercentual).trim() === '') {
    return { ok: false, error: 'Informe a taxa da maquininha.' };
  }

  const taxaPercentual = parseTaxaPercentual(params.taxaPercentual);

  if (isNaN(taxaPercentual) || !Number.isFinite(taxaPercentual) || taxaPercentual < 0) {
    return { ok: false, error: 'A taxa percentual da maquininha não pode ser negativa.' };
  }

  if (taxaPercentual >= 100) {
    return { ok: false, error: 'A taxa da maquininha deve ser estritamente inferior a 100%.' };
  }

  // 4. Validação da Tarifa Fixa
  let tarifaFixa = 0;
  if (params.tarifaFixa !== undefined && params.tarifaFixa !== null && String(params.tarifaFixa).trim() !== '') {
    tarifaFixa = typeof params.tarifaFixa === 'number'
      ? params.tarifaFixa
      : parseBRLCurrency(params.tarifaFixa, { allowNegative: true });

    if (isNaN(tarifaFixa) || !Number.isFinite(tarifaFixa) || tarifaFixa < 0) {
      return { ok: false, error: 'A tarifa fixa por transação não pode ser negativa.' };
    }
  }

  tarifaFixa = arredondarMoeda(tarifaFixa);

  // 5. Cálculos Matemáticos Oficiais
  let valorCobrado = 0;
  let valorDesconto = 0;
  let valorLiquido = 0;
  let descontoPercentual = 0;

  if (objetivo === 'direto') {
    // V = valor informado
    valorCobrado = arredondarMoeda(valor);
    descontoPercentual = arredondarMoeda(valorCobrado * (taxaPercentual / 100));
    valorDesconto = arredondarMoeda(descontoPercentual + tarifaFixa);
    valorLiquido = arredondarMoeda(valorCobrado - valorDesconto);

    if (valorLiquido < 0) {
      return {
        ok: false,
        error: 'O desconto total das taxas é superior ao valor da venda. Reduza a tarifa fixa ou aumente o valor da venda.'
      };
    }
  } else {
    // Inverso (Gross-up): V_cobrar = (L + F) / (1 - T / 100)
    valorLiquido = arredondarMoeda(valor);
    const fatorDivisor = 1 - (taxaPercentual / 100);

    // Como taxaPercentual < 100, fatorDivisor > 0 sempre
    const valorCobradoBruto = (valorLiquido + tarifaFixa) / fatorDivisor;
    valorCobrado = arredondarMoeda(valorCobradoBruto);
    valorDesconto = arredondarMoeda(valorCobrado - valorLiquido);
    descontoPercentual = arredondarMoeda(valorCobrado * (taxaPercentual / 100));
  }

  // Métricas de parcelas
  const valorParcelaCobrada = arredondarMoeda(valorCobrado / parcelas);
  const valorParcelaLiquida = arredondarMoeda(valorLiquido / parcelas);

  // Percentual efetivo total de desconto sobre o valor cobrado
  const taxaEfetivaTotal = valorCobrado > 0
    ? arredondarPercentual((valorDesconto / valorCobrado) * 100)
    : 0;

  return {
    ok: true,
    data: {
      objetivo,
      modalidade,
      parcelas,
      valorInformado: arredondarMoeda(valor),
      taxaPercentual: arredondarPercentual(taxaPercentual),
      tarifaFixa,
      valorCobrado,
      descontoPercentual,
      valorDesconto,
      valorLiquido,
      valorParcelaCobrada,
      valorParcelaLiquida,
      taxaEfetivaTotal
    }
  };
}

/**
 * Constrói a estrutura de seções para a fábrica compartilhada createResultActions.
 *
 * @param {Object} dados Dados retornados por calcularTaxaMaquininha
 * @returns {Array<{label: string, value: string}>}
 */
export function getResultSections(dados) {
  if (!dados) return [];

  const ehInverso = dados.objetivo === 'inverso';
  const ehParcelado = dados.modalidade === 'credito_parcelado';

  let nomeModalidade = 'Crédito à vista';
  if (dados.modalidade === 'debito') {
    nomeModalidade = 'Débito';
  } else if (ehParcelado) {
    nomeModalidade = `Crédito parcelado em ${dados.parcelas}x`;
  }

  const sections = [
    { label: 'Modalidade', value: nomeModalidade },
    { label: 'Objetivo do cálculo', value: ehInverso ? 'Repassar taxa (Gross-up)' : 'Descontar taxa da venda' },
    { label: 'Taxa informada', value: `${dados.taxaPercentual.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 2 })}%` }
  ];

  if (dados.tarifaFixa > 0) {
    sections.push({ label: 'Tarifa fixa por transação', value: formatBRL(dados.tarifaFixa, true) });
  }

  sections.push(
    { label: 'Valor cobrado na maquininha', value: formatBRL(dados.valorCobrado, true) },
    { label: 'Desconto total da operadora', value: `${formatBRL(dados.valorDesconto, true)} (${dados.taxaEfetivaTotal.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 2 })}%)` },
    { label: 'Valor líquido a receber', value: formatBRL(dados.valorLiquido, true) }
  );

  if (ehParcelado) {
    sections.push({
      label: 'Parcelamento',
      value: `Cliente paga ${dados.parcelas}x de ${formatBRL(dados.valorParcelaCobrada, true)} | Vendedor recebe líquido ~${formatBRL(dados.valorParcelaLiquida, true)} por parcela`
    });
  }

  const notaMetodologia = ehInverso
    ? 'Cálculo por gross-up: o valor cobrado garante o recebimento integral do valor desejado após a dedução das taxas da adquirente.'
    : 'Cálculo direto: deduz a taxa percentual contratada e eventual tarifa fixa do montante total transacionado.';

  sections.push({ label: 'Metodologia', value: notaMetodologia });

  return sections;
}

/**
 * Inicializa os controles, escutas de eventos e integração com o DOM.
 */
export function setupTool() {
  if (typeof document === 'undefined') return;

  const form = document.getElementById('formMaquininha');
  if (!form) return;

  // Modos de cálculo
  const radioDireto = document.getElementById('objDireto');
  const radioInverso = document.getElementById('objInverso');

  // Modalidades
  const radioDebito = document.getElementById('modDebito');
  const radioCreditoVista = document.getElementById('modCreditoVista');
  const radioCreditoParcelado = document.getElementById('modCreditoParcelado');

  // Grupos e campos condicionais
  const grupoParcelas = document.getElementById('grupoParcelas');
  const selectParcelas = document.getElementById('numeroParcelas');

  const labelValorPrincipal = document.getElementById('labelValorPrincipal');
  const inputValorPrincipal = document.getElementById('valorPrincipal');
  const ajudaValorPrincipal = document.getElementById('ajudaValorPrincipal');

  const inputTaxaPercentual = document.getElementById('taxaPercentual');
  const inputTarifaFixa = document.getElementById('tarifaFixa');

  // Containers de erro e resultado
  const erroContainer = document.getElementById('erroMaquininha');
  const resultadoContainer = document.getElementById('resultadoMaquininha');

  // Métricas de resultado
  const resValorCobrado = document.getElementById('resValorCobrado');
  const resDescontoTaxa = document.getElementById('resDescontoTaxa');
  const resValorLiquido = document.getElementById('resValorLiquido');
  const cardParcelamento = document.getElementById('cardParcelamento');
  const resParcelaCliente = document.getElementById('resParcelaCliente');
  const resParcelaVendedor = document.getElementById('resParcelaVendedor');

  // Botões e status de ação
  const btnCopiar = document.getElementById('btnCopiar');
  const btnCompartilhar = document.getElementById('btnCompartilhar');
  const btnImprimir = document.getElementById('btnImprimir');
  const statusAcoes = document.getElementById('statusAcoes');
  const btnLimpar = document.getElementById('btnLimpar');

  let ultimoResultado = null;

  // Máscaras monetárias em tempo real
  if (inputValorPrincipal) {
    inputValorPrincipal.addEventListener('input', () => formatBRLCurrencyInput(inputValorPrincipal));
  }
  if (inputTarifaFixa) {
    inputTarifaFixa.addEventListener('input', () => formatBRLCurrencyInput(inputTarifaFixa));
  }

  // Atualiza rótulos conforme o objetivo (Direto vs Inverso)
  function atualizarTextosObjetivo() {
    const ehInverso = radioInverso ? radioInverso.checked : false;

    if (labelValorPrincipal) {
      labelValorPrincipal.textContent = ehInverso
        ? 'Valor líquido que você deseja receber (R$):'
        : 'Valor total da venda a ser cobrado (R$):';
    }
    if (ajudaValorPrincipal) {
      ajudaValorPrincipal.textContent = ehInverso
        ? 'Informe quanto dinheiro limpo você quer que caia na sua conta após os descontos da máquina.'
        : 'Informe o preço cobrado do cliente na maquininha de cartão.';
    }
    if (inputValorPrincipal) {
      inputValorPrincipal.placeholder = ehInverso ? '100,00' : '100,00';
    }
  }

  // Atualiza visibilidade do grupo de parcelas conforme a modalidade
  function atualizarVisibilidadeParcelas() {
    const ehParcelado = radioCreditoParcelado ? radioCreditoParcelado.checked : false;
    if (grupoParcelas) {
      grupoParcelas.hidden = !ehParcelado;
    }
  }

  if (radioDireto) radioDireto.addEventListener('change', atualizarTextosObjetivo);
  if (radioInverso) radioInverso.addEventListener('change', atualizarTextosObjetivo);

  if (radioDebito) radioDebito.addEventListener('change', atualizarVisibilidadeParcelas);
  if (radioCreditoVista) radioCreditoVista.addEventListener('change', atualizarVisibilidadeParcelas);
  if (radioCreditoParcelado) radioCreditoParcelado.addEventListener('change', atualizarVisibilidadeParcelas);

  // Instancia fábrica de ações com createResultActions
  const acoes = createResultActions({
    title: 'Calculadora de Taxa da Maquininha — Calculadora Master',
    statusElement: statusAcoes,
    getSections: () => (ultimoResultado ? getResultSections(ultimoResultado) : [])
  });

  if (btnCopiar) {
    btnCopiar.hidden = false;
    btnCopiar.addEventListener('click', () => acoes.copy());
  }
  if (btnCompartilhar) {
    btnCompartilhar.hidden = false;
    btnCompartilhar.addEventListener('click', () => acoes.share());
  }
  if (btnImprimir) {
    btnImprimir.hidden = false;
    btnImprimir.addEventListener('click', () => acoes.print());
  }

  // Limpeza de formulário
  function limparTudo() {
    form.reset();
    if (radioDireto) radioDireto.checked = true;
    if (radioCreditoVista) radioCreditoVista.checked = true;
    atualizarTextosObjetivo();
    atualizarVisibilidadeParcelas();

    if (erroContainer) {
      erroContainer.hidden = true;
      erroContainer.textContent = '';
    }
    if (resultadoContainer) {
      resultadoContainer.hidden = true;
    }
    if (cardParcelamento) {
      cardParcelamento.hidden = true;
    }
    if (statusAcoes) {
      statusAcoes.textContent = '';
    }
    ultimoResultado = null;
    if (inputValorPrincipal) inputValorPrincipal.focus();
  }

  if (btnLimpar) {
    btnLimpar.addEventListener('click', limparTudo);
  }

  // Submissão do formulário
  form.addEventListener('submit', (evento) => {
    evento.preventDefault();

    if (erroContainer) {
      erroContainer.hidden = true;
      erroContainer.textContent = '';
    }

    const objetivo = radioInverso && radioInverso.checked ? 'inverso' : 'direto';

    let modalidade = 'credito_vista';
    if (radioDebito && radioDebito.checked) {
      modalidade = 'debito';
    } else if (radioCreditoParcelado && radioCreditoParcelado.checked) {
      modalidade = 'credito_parcelado';
    }

    const parcelas = selectParcelas ? selectParcelas.value : '2';
    const valorRaw = inputValorPrincipal ? inputValorPrincipal.value : '';
    const taxaRaw = inputTaxaPercentual ? inputTaxaPercentual.value : '';
    const tarifaFixaRaw = inputTarifaFixa ? inputTarifaFixa.value : '';

    const resultado = calcularTaxaMaquininha({
      objetivo,
      modalidade,
      parcelas,
      valor: valorRaw,
      taxaPercentual: taxaRaw,
      tarifaFixa: tarifaFixaRaw
    });

    if (!resultado.ok) {
      if (erroContainer) {
        erroContainer.textContent = resultado.error;
        erroContainer.hidden = false;
      }
      if (resultadoContainer) {
        resultadoContainer.hidden = true;
      }
      ultimoResultado = null;
      return;
    }

    ultimoResultado = resultado.data;

    // Renderização segura com textContent
    if (resValorCobrado) {
      resValorCobrado.textContent = formatBRL(ultimoResultado.valorCobrado, true);
    }
    if (resDescontoTaxa) {
      resDescontoTaxa.textContent = `${formatBRL(ultimoResultado.valorDesconto, true)} (${ultimoResultado.taxaEfetivaTotal.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 2 })}%)`;
    }
    if (resValorLiquido) {
      resValorLiquido.textContent = formatBRL(ultimoResultado.valorLiquido, true);
    }

    if (cardParcelamento) {
      if (ultimoResultado.modalidade === 'credito_parcelado') {
        if (resParcelaCliente) {
          resParcelaCliente.textContent = `${ultimoResultado.parcelas}x de ${formatBRL(ultimoResultado.valorParcelaCobrada, true)}`;
        }
        if (resParcelaVendedor) {
          resParcelaVendedor.textContent = `~${formatBRL(ultimoResultado.valorParcelaLiquida, true)} por parcela`;
        }
        cardParcelamento.hidden = false;
      } else {
        cardParcelamento.hidden = true;
      }
    }

    if (resultadoContainer) {
      resultadoContainer.hidden = false;
    }
  });

  // Estado inicial
  atualizarTextosObjetivo();
  atualizarVisibilidadeParcelas();
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupTool);
  } else {
    setupTool();
  }
}
