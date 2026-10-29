/**
 * Calculadora de Idade Gestacional e Data Provável do Parto (DPP) — Calculadora Master
 *
 * Módulo puro e desacoplado para cálculos obstétricos:
 * 1. Regra de Naegele e projeção da DPP por DUM (Data da Última Menstruação) com ajuste de ciclo.
 * 2. Datação e projeção por Ultrassonografia precoce (CCN).
 * 3. Idade gestacional precisa em semanas e dias, trimestres e contagem regressiva.
 *
 * Diretrizes científicas:
 * - Ministério da Saúde do Brasil — Atenção ao Pré-Natal de Baixo Risco (Caderno 32 / FEBRASGO).
 * - ACOG (American College of Obstetricians and Gynecologists) Committee Opinion No. 700.
 *
 * Zero dependências externas e seguro para SSR.
 */

import { createResultActions } from '../core/result-actions.js';

export const CONSTANTES_GESTACAO = Object.freeze({
  DIAS_GESTAÇÃO_TERMO: 280, // 40 semanas
  DIAS_CICLO_PADRAO: 28,
  LIMITE_MIN_CICLO: 21,
  LIMITE_MAX_CICLO: 40,
  MS_POR_DIA: 24 * 60 * 60 * 1000
});

/**
 * Converte string 'AAAA-MM-DD' em objeto Date local sem deslocamento de fuso UTC.
 *
 * @param {string} dateStr
 * @returns {Date|null}
 */
export function parseIsoDate(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return null;
  const parts = dateStr.trim().split('-');
  if (parts.length !== 3) return null;
  const y = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10) - 1;
  const d = parseInt(parts[2], 10);
  if (Number.isNaN(y) || Number.isNaN(m) || Number.isNaN(d)) return null;
  const dt = new Date(y, m, d);
  if (dt.getFullYear() !== y || dt.getMonth() !== m || dt.getDate() !== d) return null;
  return dt;
}

/**
 * Formata um objeto Date para string no padrão brasileiro DD/MM/AAAA.
 *
 * @param {Date} dt
 * @returns {string}
 */
export function formatDatePtBr(dt) {
  if (!(dt instanceof Date) || Number.isNaN(dt.getTime())) return '—';
  const dia = String(dt.getDate()).padStart(2, '0');
  const mes = String(dt.getMonth() + 1).padStart(2, '0');
  const ano = dt.getFullYear();
  return `${dia}/${mes}/${ano}`;
}

/**
 * Adiciona dias a uma data e retorna nova instância Date.
 *
 * @param {Date} baseDate
 * @param {number} days
 * @returns {Date}
 */
export function addDays(baseDate, days) {
  const res = new Date(baseDate.getTime());
  res.setDate(res.getDate() + days);
  return res;
}

/**
 * Calcula a diferença em dias corridos entre duas datas (dataFinal - dataInicial).
 *
 * @param {Date} startDate
 * @param {Date} endDate
 * @returns {number}
 */
export function differenceInDays(startDate, endDate) {
  const utcStart = Date.UTC(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
  const utcEnd = Date.UTC(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
  return Math.round((utcEnd - utcStart) / CONSTANTES_GESTACAO.MS_POR_DIA);
}

/**
 * Identifica o trimestre da gestação baseado no total de semanas e dias.
 *
 * @param {number} semanas
 * @returns {{ numero: number, nome: string, descricao: string }}
 */
export function getTrimesterInfo(semanas) {
  if (semanas < 14) {
    return {
      numero: 1,
      nome: '1º Trimestre (0 a 13 semanas e 6 dias)',
      descricao: 'Fase de embriogênese, formação dos órgãos essenciais e início dos batimentos cardíacos fetais.'
    };
  }
  if (semanas < 28) {
    return {
      numero: 2,
      nome: '2º Trimestre (14 a 27 semanas e 6 dias)',
      descricao: 'Fase de rápido crescimento fetal, movimentos perceptíveis e alcance da viabilidade fetal (~24 semanas).'
    };
  }
  return {
    numero: 3,
    nome: '3º Trimestre (28 semanas até o parto)',
    descricao: 'Ganho acentuado de peso fetal, maturação pulmonar e preparação final do organismo materno para o parto.'
  };
}

/**
 * Identifica a classificação obstétrica da idade gestacional ao nascimento.
 *
 * @param {number} semanas
 * @returns {string}
 */
export function getClassificacaoTermo(semanas) {
  if (semanas < 37) return 'Pré-termo / Prematuro (menos de 37 semanas)';
  if (semanas < 39) return 'Termo Precoce (37 semanas a 38 semanas e 6 dias)';
  if (semanas <= 40) return 'Termo Pleno (39 semanas a 40 semanas e 6 dias — Ideal)';
  if (semanas < 42) return 'Termo Tardio (41 semanas a 41 semanas e 6 dias)';
  return 'Pós-termo (42 semanas ou mais — Requer vigilância)';
}

/**
 * Calcula a Idade Gestacional e DPP por Data da Última Menstruação (DUM).
 *
 * @param {Object} inputs
 * @param {string} inputs.dum Data ISO 'AAAA-MM-DD'
 * @param {number|string} [inputs.duracaoCiclo] Duração do ciclo em dias (21 a 40, padrão 28)
 * @param {string} [inputs.dataReferencia] Data ISO de referência (padrão hoje)
 * @returns {{ ok: boolean, error?: string, data?: Object }}
 */
export function calculateByLmp(inputs = {}) {
  const dumDate = parseIsoDate(inputs.dum);
  if (!dumDate) {
    return { ok: false, error: 'Informe uma Data da Última Menstruação (DUM) válida.' };
  }

  const refDate = inputs.dataReferencia ? parseIsoDate(inputs.dataReferencia) : new Date();
  if (!refDate) {
    return { ok: false, error: 'A data de referência para o cálculo é inválida.' };
  }

  const duracaoCicloRaw = inputs.duracaoCiclo !== undefined && inputs.duracaoCiclo !== null && String(inputs.duracaoCiclo).trim() !== ''
    ? parseInt(String(inputs.duracaoCiclo).trim(), 10)
    : CONSTANTES_GESTACAO.DIAS_CICLO_PADRAO;

  const duracaoCiclo = Number.isNaN(duracaoCicloRaw) ? CONSTANTES_GESTACAO.DIAS_CICLO_PADRAO : duracaoCicloRaw;

  if (duracaoCiclo < CONSTANTES_GESTACAO.LIMITE_MIN_CICLO || duracaoCiclo > CONSTANTES_GESTACAO.LIMITE_MAX_CICLO) {
    return {
      ok: false,
      error: `A duração média do ciclo menstrual deve estar entre ${CONSTANTES_GESTACAO.LIMITE_MIN_CICLO} e ${CONSTANTES_GESTACAO.LIMITE_MAX_CICLO} dias.`
    };
  }

  // Ajuste de Naegele para ciclos diferentes de 28 dias:
  // delta = duracaoCiclo - 28 dias
  const deltaCiclo = duracaoCiclo - CONSTANTES_GESTACAO.DIAS_CICLO_PADRAO;
  const dppDate = addDays(dumDate, CONSTANTES_GESTACAO.DIAS_GESTAÇÃO_TERMO + deltaCiclo);

  // Dias transcorridos desde a DUM ajustada
  // DUM ajustada = DUM + deltaCiclo (datação biológica corrigida pela ovulação)
  const dumAjustada = addDays(dumDate, deltaCiclo);
  const diasDecorridos = differenceInDays(dumAjustada, refDate);

  if (diasDecorridos < 0) {
    return {
      ok: false,
      error: 'A data de referência informada é anterior à data da última menstruação.'
    };
  }

  if (diasDecorridos > 315) { // 45 semanas
    return {
      ok: false,
      error: 'A data da menstruação informada resultou em mais de 44 semanas de gestação. Verifique se o ano e o mês estão corretos.'
    };
  }

  const semanas = Math.floor(diasDecorridos / 7);
  const diasResto = diasDecorridos % 7;
  const diasAteDpp = differenceInDays(refDate, dppDate);
  const percentualConcluido = Math.min(100, Math.max(0, Number(((diasDecorridos / CONSTANTES_GESTACAO.DIAS_GESTAÇÃO_TERMO) * 100).toFixed(1))));

  const trimestre = getTrimesterInfo(semanas);
  const classificacaoTermo = getClassificacaoTermo(semanas);

  const avisos = [
    'Apenas cerca de 4% a 5% dos bebês nascem exatamente no dia da DPP. A gestação humana a termo normal varia entre 37 semanas e 41 semanas e 6 dias.',
    'Se houver divergência entre a DUM e o ultrassom, os critérios clínicos de referência (ACOG Committee Opinion No. 700 / Ministério da Saúde) adotam margens progressivas de tolerância: pelo CCN até 13s6d (> 5 dias até 8s6d e > 7 dias de 9 a 13s6d); por parâmetros biométricos a partir de 14s (> 7 dias de 14 a 15s6d, > 10 dias de 16 a 21s6d, > 14 dias de 22 a 27s6d e > 21 dias no 3º trimestre). Esses parâmetros apoiam a avaliação médica e não constituem decisão obstétrica automática.',
    'Limitações da DUM: O cálculo pressupõe ciclo previsível com ovulação ~14 dias antes da menstruação seguinte; em mulheres com ciclos irregulares ou sangramentos incertos, a ultrassonografia precoce é a referência clínica.',
    'Esta calculadora tem caráter exclusivamente informativo e não substitui as consultas de pré-natal e a avaliação médica com seu obstetra.'
  ];

  if (duracaoCiclo !== 28) {
    avisos.unshift(`Ajuste de ciclo aplicado: Foi compensada uma variação estimada de ${deltaCiclo > 0 ? '+' : ''}${deltaCiclo} dias na ovulação devido ao ciclo informado de ${duracaoCiclo} dias (válido apenas para ciclos regulares).`);
  }

  return {
    ok: true,
    data: {
      metodo: 'Data da Última Menstruação (DUM / Naegele)',
      dum: formatDatePtBr(dumDate),
      dpp: formatDatePtBr(dppDate),
      dppDate,
      dataReferencia: formatDatePtBr(refDate),
      duracaoCiclo,
      diasDecorridos,
      semanas,
      diasResto,
      idadeGestacionalTexto: `${semanas} semana${semanas !== 1 ? 's' : ''} e ${diasResto} dia${diasResto !== 1 ? 's' : ''}`,
      diasAteDpp,
      percentualConcluido,
      trimestre,
      classificacaoTermo,
      avisos
    }
  };
}

/**
 * Calcula a Idade Gestacional a partir de Ultrassonografia precoce (USG).
 *
 * @param {Object} inputs
 * @param {string} inputs.dataExame Data ISO do exame 'AAAA-MM-DD'
 * @param {number|string} inputs.semanasExame Semanas aferidas no exame
 * @param {number|string} [inputs.diasExame] Dias adicionais aferidos no exame (0 a 6)
 * @param {string} [inputs.dataReferencia] Data ISO de referência (padrão hoje)
 * @returns {{ ok: boolean, error?: string, data?: Object }}
 */
export function calculateByUltrasound(inputs = {}) {
  const exameDate = parseIsoDate(inputs.dataExame);
  if (!exameDate) {
    return { ok: false, error: 'Informe a data em que a ultrassonografia foi realizada.' };
  }

  const refDate = inputs.dataReferencia ? parseIsoDate(inputs.dataReferencia) : new Date();
  if (!refDate) {
    return { ok: false, error: 'A data de referência para o cálculo é inválida.' };
  }

  const semanasExame = parseInt(String(inputs.semanasExame).trim(), 10);
  if (Number.isNaN(semanasExame) || semanasExame < 4 || semanasExame > 42) {
    return { ok: false, error: 'Informe as semanas de idade gestacional apontadas no laudo do exame (4 a 42 semanas).' };
  }

  const diasExameRaw = inputs.diasExame !== undefined && inputs.diasExame !== null && String(inputs.diasExame).trim() !== ''
    ? parseInt(String(inputs.diasExame).trim(), 10)
    : 0;
  const diasExame = Number.isNaN(diasExameRaw) ? 0 : Math.max(0, Math.min(6, diasExameRaw));

  // Idade gestacional no dia do exame em dias totais
  const diasNoExame = (semanasExame * 7) + diasExame;

  // DUM teórica equivalente = dataExame - diasNoExame
  const dumTeorica = addDays(exameDate, -diasNoExame);

  // DPP = DUM teórica + 280 dias
  const dppDate = addDays(dumTeorica, CONSTANTES_GESTACAO.DIAS_GESTAÇÃO_TERMO);

  // Idade gestacional na data de referência
  const diasDecorridos = differenceInDays(dumTeorica, refDate);
  if (diasDecorridos < 0) {
    return { ok: false, error: 'A data de referência é anterior à concepção estimada pelo exame.' };
  }

  const semanas = Math.floor(diasDecorridos / 7);
  const diasResto = diasDecorridos % 7;
  const diasAteDpp = differenceInDays(refDate, dppDate);
  const percentualConcluido = Math.min(100, Math.max(0, Number(((diasDecorridos / CONSTANTES_GESTACAO.DIAS_GESTAÇÃO_TERMO) * 100).toFixed(1))));

  const trimestre = getTrimesterInfo(semanas);
  const classificacaoTermo = getClassificacaoTermo(semanas);

  const avisos = [
    'A ultrassonografia de primeiro trimestre (medida do CCN — Comprimento Cabeça-Nádega até 13 semanas e 6 dias) é o método mais acurado para confirmação da idade gestacional. A partir de 14 semanas utilizam-se parâmetros biométricos fetais com margens de incerteza progressivamente maiores (±10 a ±21 dias).',
    'Apenas cerca de 4% a 5% dos bebês nascem no dia exato da DPP.',
    'Risco de redatação tardia no 3º trimestre: Se um exame precoce confiável já determinou a idade gestacional, a DPP não deve ser redatada no 3º trimestre, pois a discordância tardia reflete variações no ritmo de crescimento fetal (risco de mascarar restrição de crescimento intrauterino ou macrossomia).',
    'Parâmetro informativo: Esta ferramenta não emite diagnóstico nem substitui a decisão e o acompanhamento médico obstétrico no pré-natal.'
  ];

  return {
    ok: true,
    data: {
      metodo: 'Ultrassonografia Obstétrica (USG)',
      dataExame: formatDatePtBr(exameDate),
      dumEquivalente: formatDatePtBr(dumTeorica),
      dpp: formatDatePtBr(dppDate),
      dppDate,
      dataReferencia: formatDatePtBr(refDate),
      diasDecorridos,
      semanas,
      diasResto,
      idadeGestacionalTexto: `${semanas} semana${semanas !== 1 ? 's' : ''} e ${diasResto} dia${diasResto !== 1 ? 's' : ''}`,
      diasAteDpp,
      percentualConcluido,
      trimestre,
      classificacaoTermo,
      avisos
    }
  };
}

/**
 * Constrói texto legível para copiar e compartilhar.
 *
 * @param {Object} result
 * @returns {string}
 */
export function buildCopyText(result) {
  if (!result || !result.ok || !result.data) return '';
  const d = result.data;

  const linhas = [
    '=== IDADE GESTACIONAL E DATA PROVÁVEL DO PARTO (DPP) — CALCULADORA MASTER ===',
    `Idade Gestacional Atual: ${d.idadeGestacionalTexto}`,
    `Data Provável do Parto (DPP): ${d.dpp}`,
    `Trimestre Atual: ${d.trimestre.nome}`,
    `Status Gestacional: ${d.classificacaoTermo}`,
    `Progresso da Gravidez: ${d.percentualConcluido.toLocaleString('pt-BR')}% concluído`,
    d.diasAteDpp > 0 ? `Tempo Restante até a DPP: ~${d.diasAteDpp} dias (~${Math.round(d.diasAteDpp / 7)} semanas)` : 'Período a termo alcançado',
    '',
    `Método de Cálculo: ${d.metodo}`,
    d.dum ? `Data da Última Menstruação (DUM): ${d.dum} (Ciclo de ${d.duracaoCiclo} dias)` : null,
    d.dataExame ? `Data do Ultrassom: ${d.dataExame}` : null,
    '',
    'Calcule online em: https://www.calculadoramaster.com/tools/saude/idade-gestacional-data-parto.html',
    'Aviso: Ferramenta educativa. Não substitui avaliação pré-natal nem exames médicos obstétricos.'
  ];

  return linhas.filter(Boolean).join('\n');
}

/**
 * Retorna lista de métricas formatadas para resumo e testes.
 *
 * @param {Object} result
 * @returns {Array<{ label: string, value: string }>}
 */
export function formatResult(result) {
  if (!result || !result.ok || !result.data) return [];
  const d = result.data;
  return [
    { label: 'Idade Gestacional Atual', value: d.idadeGestacionalTexto },
    { label: 'Data Provável do Parto (DPP)', value: d.dpp },
    { label: 'Trimestre', value: d.trimestre.nome },
    { label: 'Progresso da Gestação', value: `${d.percentualConcluido.toLocaleString('pt-BR')}%` },
    { label: 'Dias Restantes até a DPP', value: `${d.diasAteDpp} dias` }
  ];
}

/**
 * Inicializa a ferramenta no DOM.
 */
export function setupTool() {
  if (typeof document === 'undefined') return;

  const form = document.getElementById('formIdadeGestacional');
  if (!form) return;

  const radModoDum = document.getElementById('modoDum');
  const radModoUsg = document.getElementById('modoUsg');
  const grupoDum = document.getElementById('grupoCamposDum');
  const grupoUsg = document.getElementById('grupoCamposUsg');

  const inputDum = document.getElementById('dataDum');
  const inputCiclo = document.getElementById('duracaoCiclo');

  const inputDataExame = document.getElementById('dataExameUsg');
  const inputSemExame = document.getElementById('semanasExameUsg');
  const inputDiasExame = document.getElementById('diasExameUsg');

  const btnCalcular = document.getElementById('btnCalcularGestacao');
  const btnLimpar = document.getElementById('btnLimparGestacao');
  const erroBox = document.getElementById('erroGestacao');
  const resultadoSecao = document.getElementById('resultadoGestacao');

  const resIdadePrincipal = document.getElementById('resIdadePrincipal');
  const resDppPrincipal = document.getElementById('resDppPrincipal');
  const resTrimestre = document.getElementById('resTrimestre');
  const resDiasRestantes = document.getElementById('resDiasRestantes');
  const resClassificacaoTermo = document.getElementById('resClassificacaoTermo');

  const avisosContainer = document.getElementById('avisosGestacao');
  const acoesContainer = document.getElementById('acoesResultadoGestacao');
  const statusAcoes = document.getElementById('statusAcoesGestacao');

  function atualizarModo() {
    const isUsg = radModoUsg && radModoUsg.checked;
    if (grupoDum) grupoDum.hidden = isUsg;
    if (grupoUsg) grupoUsg.hidden = !isUsg;
    if (inputDum) inputDum.required = !isUsg;
    if (inputDataExame) inputDataExame.required = isUsg;
    if (inputSemExame) inputSemExame.required = isUsg;
  }

  if (radModoDum) radModoDum.addEventListener('change', atualizarModo);
  if (radModoUsg) radModoUsg.addEventListener('change', atualizarModo);

  function esconderErro() {
    if (erroBox) {
      erroBox.hidden = true;
      erroBox.textContent = '';
    }
  }

  function exibirErro(msg) {
    if (erroBox) {
      erroBox.hidden = false;
      erroBox.textContent = msg;
    }
    if (resultadoSecao) {
      resultadoSecao.hidden = true;
    }
  }

  function limparTudo() {
    esconderErro();
    if (form) form.reset();
    atualizarModo();
    if (resultadoSecao) resultadoSecao.hidden = true;
    if (acoesContainer) acoesContainer.innerHTML = '';
    if (statusAcoes) statusAcoes.textContent = '';
    if (avisosContainer) avisosContainer.innerHTML = '';
  }

  if (btnLimpar) {
    btnLimpar.addEventListener('click', limparTudo);
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    esconderErro();

    const isUsg = radModoUsg && radModoUsg.checked;
    let res = null;

    if (isUsg) {
      res = calculateByUltrasound({
        dataExame: inputDataExame ? inputDataExame.value : '',
        semanasExame: inputSemExame ? inputSemExame.value : '',
        diasExame: inputDiasExame ? inputDiasExame.value : '0'
      });
    } else {
      res = calculateByLmp({
        dum: inputDum ? inputDum.value : '',
        duracaoCiclo: inputCiclo ? inputCiclo.value : '28'
      });
    }

    if (!res.ok) {
      exibirErro(res.error || 'Ocorreu um erro no cálculo da idade gestacional.');
      return;
    }

    const d = res.data;

    if (resIdadePrincipal) resIdadePrincipal.textContent = d.idadeGestacionalTexto;
    if (resDppPrincipal) resDppPrincipal.textContent = d.dpp;
    if (resTrimestre) resTrimestre.textContent = d.trimestre.nome;
    if (resDiasRestantes) {
      resDiasRestantes.textContent = d.diasAteDpp > 0 ? `${d.diasAteDpp} dias (~${Math.round(d.diasAteDpp / 7)} sem)` : 'Termo alcançado';
    }
    if (resClassificacaoTermo) resClassificacaoTermo.textContent = d.classificacaoTermo;

    // Avisos clínicos
    if (avisosContainer) {
      avisosContainer.innerHTML = '';
      for (const aviso of d.avisos) {
        const div = document.createElement('div');
        div.className = 'tool-alert-box';
        div.textContent = aviso;
        avisosContainer.appendChild(div);
      }
    }

    // Ações
    if (acoesContainer) {
      acoesContainer.innerHTML = '';
      createResultActions(acoesContainer, {
        toolId: 'idade-gestacional-data-parto',
        resultText: buildCopyText(res),
        shareTitle: 'Minha Idade Gestacional e DPP - Calculadora Master',
        shareUrl: window.location.href,
        statusElement: statusAcoes
      });
    }

    if (resultadoSecao) {
      resultadoSecao.hidden = false;
      if (typeof resultadoSecao.scrollIntoView === 'function') {
        resultadoSecao.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  });
}

if (typeof window !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupTool);
  } else {
    setupTool();
  }
}
