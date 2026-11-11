/**
 * Calculadora de Comissão de Vendas — Calculadora Master
 * Módulo ES nativo para apuração de comissões sob perfis CLT e Autônomo/PJ.
 * Regras de negócio puras desacopladas do DOM e seguras contra XSS.
 */

import { createResultActions } from "../core/result-actions.js";
import { parseBRLCurrency, formatBRLCurrencyInput, formatBRL } from "../core/currency.js";

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
 * Arredonda valor percentual para 1 casa decimal evitando -0.
 *
 * @param {number} valor
 * @returns {number}
 */
export function arredondarPercentual(valor) {
  if (!Number.isFinite(valor)) return 0;
  const arredondado = Math.round((valor + Number.EPSILON) * 10) / 10;
  return Object.is(arredondado, -0) ? 0 : arredondado;
}

/**
 * Converte string flexível ou número para taxa percentual numérica.
 * Suporta formatos com vírgula ou ponto ("4,5", "4.5", "5").
 *
 * @param {string|number} valor
 * @returns {number}
 */
export function parseTaxaPercentual(valor) {
  if (valor === undefined || valor === null) return NaN;
  if (typeof valor === "number") {
    return Number.isFinite(valor) ? valor : NaN;
  }
  const limpo = String(valor).trim().replace(/\s+/g, "").replace("%", "");
  if (!limpo) return NaN;
  // Se contiver vírgula, substitui por ponto
  const normalizado = limpo.replace(",", ".");
  const num = Number(normalizado);
  return Number.isFinite(num) ? num : NaN;
}

/**
 * Executa o cálculo da comissão de vendas e remuneração bruta estimada.
 * Função pura e desacoplada do DOM para testes automatizados.
 *
 * @param {Object} params
 * @param {string} [params.perfil='clt'] 'clt' ou 'autonomo_pj'
 * @param {number|string} params.valorVendas Valor total das vendas considerado para comissão
 * @param {number|string} params.taxaComissao Percentual de comissão (ex: 4.5 ou "4,5")
 * @param {number|string} [params.valorFixo=0] Salário ou valor fixo contratual
 * @returns {{ ok: boolean, data?: Object, error?: string }}
 */
export function calcularComissaoVendas(params = {}) {
  const perfilNormalizado = params.perfil === "autonomo_pj" ? "autonomo_pj" : "clt";

  // 1. Validação de Vendas
  if (params.valorVendas === undefined || params.valorVendas === null || String(params.valorVendas).trim() === "") {
    return { ok: false, error: "Informe o total de vendas considerado para comissão." };
  }
  const valorVendas = typeof params.valorVendas === "number"
    ? params.valorVendas
    : parseBRLCurrency(params.valorVendas, { allowNegative: true });

  if (isNaN(valorVendas) || !Number.isFinite(valorVendas) || valorVendas < 0) {
    return { ok: false, error: "O valor das vendas não pode ser negativo." };
  }

  // 2. Validação da Taxa de Comissão
  if (params.taxaComissao === undefined || params.taxaComissao === null || String(params.taxaComissao).trim() === "") {
    return { ok: false, error: "Informe a taxa de comissão." };
  }
  const taxaComissao = parseTaxaPercentual(params.taxaComissao);

  if (isNaN(taxaComissao) || taxaComissao <= 0) {
    return { ok: false, error: "A taxa de comissão deve ser um número maior que zero." };
  }
  if (taxaComissao > 100) {
    return { ok: false, error: "A taxa de comissão não pode ser superior a 100%." };
  }

  // 3. Validação do Fixo Contratual
  let valorFixo = 0;
  if (params.valorFixo !== undefined && params.valorFixo !== null && String(params.valorFixo).trim() !== "") {
    valorFixo = typeof params.valorFixo === "number"
      ? params.valorFixo
      : parseBRLCurrency(params.valorFixo, { allowNegative: true });

    if (isNaN(valorFixo) || !Number.isFinite(valorFixo) || valorFixo < 0) {
      return { ok: false, error: "O valor fixo contratual não pode ser negativo." };
    }
  }

  // 4. Cálculos Matemáticos
  const valorComissao = arredondarMoeda(valorVendas * (taxaComissao / 100));
  const valorFixoArredondado = arredondarMoeda(valorFixo);
  const remuneracaoBruta = arredondarMoeda(valorFixoArredondado + valorComissao);

  const participacaoComissao = remuneracaoBruta > 0
    ? arredondarPercentual((valorComissao / remuneracaoBruta) * 100)
    : 0;

  return {
    ok: true,
    data: {
      perfil: perfilNormalizado,
      valorVendas: arredondarMoeda(valorVendas),
      taxaComissao,
      valorFixo: valorFixoArredondado,
      valorComissao,
      remuneracaoBruta,
      participacaoComissao
    }
  };
}

/**
 * Constrói a estrutura de seções para a fábrica compartilhada createResultActions.
 *
 * @param {Object} dados Dados retornados por calcularComissaoVendas
 * @returns {Array<{label: string, value: string}>}
 */
export function getResultSections(dados) {
  if (!dados) return [];

  const ehClt = dados.perfil === "clt";
  const nomePerfil = ehClt ? "CLT Comissionado" : "Autônomo / PJ / Representante";
  const rotuloFixo = ehClt ? "Salário fixo contratual" : "Valor fixo contratual";
  const rotuloRemuneracao = ehClt ? "Remuneração bruta estimada" : "Faturamento bruto estimado";

  const notaEscopo = ehClt
    ? "Estimativa de remuneração bruta. Não contempla DSR sobre comissões, médias de férias/13º, FGTS ou descontos de INSS/IRRF."
    : "Estimativa de faturamento bruto. Não deduz tributos (DAS/Simples/IRPF/INSS), retenções ou custos operacionais.";

  const formatarTaxa = `${dados.taxaComissao.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 2 })}%`;
  const formatarParticipacao = `${dados.participacaoComissao.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;

  return [
    { label: "Perfil", value: nomePerfil },
    { label: "Total de vendas", value: formatBRL(dados.valorVendas, true) },
    { label: "Taxa de comissão", value: formatarTaxa },
    { label: rotuloFixo, value: formatBRL(dados.valorFixo, true) },
    { label: "Comissão calculada", value: formatBRL(dados.valorComissao, true) },
    { label: rotuloRemuneracao, value: formatBRL(dados.remuneracaoBruta, true) },
    { label: "Participação da comissão", value: formatarParticipacao },
    { label: "Aviso legal", value: notaEscopo }
  ];
}

/**
 * Inicializa os controles, escutas de eventos e integração com o DOM.
 */
export function setupTool() {
  if (typeof document === "undefined") return;

  const form = document.getElementById("formComissao");
  if (!form) return;

  const inputVendas = document.getElementById("valorVendas");
  const inputTaxa = document.getElementById("taxaComissao");
  const inputFixo = document.getElementById("valorFixo");
  const labelValorFixo = document.getElementById("labelValorFixo");
  const ajudaValorFixo = document.getElementById("ajudaValorFixo");
  const labelResFixo = document.getElementById("labelResFixo");

  const radioClt = document.getElementById("perfilClt");
  const radioAutonomo = document.getElementById("perfilAutonomoPj");

  const erroContainer = document.getElementById("erroComissao");
  const resultadoContainer = document.getElementById("resultadoComissao");

  const resValorComissao = document.getElementById("resValorComissao");
  const resValorFixo = document.getElementById("resValorFixo");
  const resRemuneracaoBruta = document.getElementById("resRemuneracaoBruta");
  const resParticipacaoComissao = document.getElementById("resParticipacaoComissao");

  const avisoClt = document.getElementById("avisoClt");
  const avisoAutonomoPj = document.getElementById("avisoAutonomoPj");

  const btnCopiar = document.getElementById("btnCopiar");
  const btnCompartilhar = document.getElementById("btnCompartilhar");
  const btnImprimir = document.getElementById("btnImprimir");
  const statusAcoes = document.getElementById("statusAcoes");
  const btnLimpar = document.getElementById("btnLimpar");

  let ultimoResultado = null;

  // Aplicação de máscaras monetárias aos campos de valor
  if (inputVendas) {
    inputVendas.addEventListener("input", () => formatBRLCurrencyInput(inputVendas));
  }
  if (inputFixo) {
    inputFixo.addEventListener("input", () => formatBRLCurrencyInput(inputFixo));
  }

  // Alternância de perfil
  function atualizarTextosPerfil() {
    const ehClt = radioClt ? radioClt.checked : true;

    if (labelValorFixo) {
      labelValorFixo.textContent = ehClt
        ? "Salário fixo contratual (R$) (opcional):"
        : "Valor fixo contratual (R$) (opcional):";
    }
    if (ajudaValorFixo) {
      ajudaValorFixo.textContent = ehClt
        ? "Salário base fixo contratual garantido na carteira (se não houver fixo, deixe em branco ou 0,00)."
        : "Valor fixo acordado em contrato, fee mensal ou adiantamento (se não houver fixo, deixe em branco ou 0,00).";
    }
    if (labelResFixo) {
      labelResFixo.textContent = ehClt
        ? "Salário fixo informado"
        : "Valor fixo informado";
    }

    // Atualiza visibilidade dos painéis de aviso quando o resultado estiver ativo
    if (resultadoContainer && !resultadoContainer.hidden) {
      if (avisoClt) avisoClt.hidden = !ehClt;
      if (avisoAutonomoPj) avisoAutonomoPj.hidden = ehClt;
    }
  }

  if (radioClt) radioClt.addEventListener("change", atualizarTextosPerfil);
  if (radioAutonomo) radioAutonomo.addEventListener("change", atualizarTextosPerfil);

  // Instancia fábrica de ações com createResultActions
  const acoes = createResultActions({
    title: "Calculadora de Comissão de Vendas — Calculadora Master",
    statusElement: statusAcoes,
    getSections: () => (ultimoResultado ? getResultSections(ultimoResultado) : [])
  });

  if (btnCopiar) {
    btnCopiar.hidden = false;
    btnCopiar.addEventListener("click", () => acoes.copy());
  }
  if (btnCompartilhar) {
    btnCompartilhar.hidden = false;
    btnCompartilhar.addEventListener("click", () => acoes.share());
  }
  if (btnImprimir) {
    btnImprimir.hidden = false;
    btnImprimir.addEventListener("click", () => acoes.print());
  }

  // Limpeza de formulário
  function limparTudo() {
    form.reset();
    if (radioClt) radioClt.checked = true;
    atualizarTextosPerfil();

    if (erroContainer) {
      erroContainer.hidden = true;
      erroContainer.textContent = "";
    }
    if (resultadoContainer) {
      resultadoContainer.hidden = true;
    }
    if (statusAcoes) {
      statusAcoes.textContent = "";
    }
    ultimoResultado = null;
    if (inputVendas) inputVendas.focus();
  }

  if (btnLimpar) {
    btnLimpar.addEventListener("click", limparTudo);
  }

  // Submissão do formulário
  form.addEventListener("submit", (evento) => {
    evento.preventDefault();

    if (erroContainer) {
      erroContainer.hidden = true;
      erroContainer.textContent = "";
    }

    const perfil = radioAutonomo && radioAutonomo.checked ? "autonomo_pj" : "clt";
    const valorVendasRaw = inputVendas ? inputVendas.value : "";
    const taxaComissaoRaw = inputTaxa ? inputTaxa.value : "";
    const valorFixoRaw = inputFixo ? inputFixo.value : "";

    const resultado = calcularComissaoVendas({
      perfil,
      valorVendas: valorVendasRaw,
      taxaComissao: taxaComissaoRaw,
      valorFixo: valorFixoRaw
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

    // Renderização acessível com textContent (zero injeção de HTML dinâmico)
    if (resValorComissao) {
      resValorComissao.textContent = formatBRL(ultimoResultado.valorComissao, true);
    }
    if (resValorFixo) {
      resValorFixo.textContent = formatBRL(ultimoResultado.valorFixo, true);
    }
    if (resRemuneracaoBruta) {
      resRemuneracaoBruta.textContent = formatBRL(ultimoResultado.remuneracaoBruta, true);
    }
    if (resParticipacaoComissao) {
      resParticipacaoComissao.textContent = `${ultimoResultado.participacaoComissao.toLocaleString("pt-BR", {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1
      })}%`;
    }

    const ehClt = ultimoResultado.perfil === "clt";
    if (avisoClt) avisoClt.hidden = !ehClt;
    if (avisoAutonomoPj) avisoAutonomoPj.hidden = ehClt;

    if (resultadoContainer) {
      resultadoContainer.hidden = false;
    }
  });

  // Estado inicial
  atualizarTextosPerfil();
}

if (typeof document !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", setupTool);
  } else {
    setupTool();
  }
}
