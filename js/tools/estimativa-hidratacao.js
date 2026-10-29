/**
 * Calculadora de Estimativa de Hidratação Diária — Calculadora Master
 *
 * Módulo puro e desacoplado para cálculo da ingestão hídrica diária recomendada
 * baseada no peso corporal, faixa etária, atividade física e condições fisiológicas especiais.
 *
 * Diretrizes científicas e fontes:
 * - EFSA (2010) — Valores de Referência de Ingestão Total de Água (TWI): 2,0L a 2,5L para adultos e adolescentes >= 14 anos; 1,9L a 2,1L para 9–13 anos. Origem da água: aproximadamente 20% a 30% de alimentos e 70% a 80% de bebidas.
 * - Estimativas práticas de consultório — 30 a 35 ml/kg/dia (regras empíricas da dietética clínica; não constituem recomendação oficial universal).
 * - ACSM (2007) — Reposição de fluidos no exercício conforme taxa de sudorese (400 a 800 ml/h para recreacionais).
 * - EFSA (2010) / IOM (2005) — Adicionais para gestantes (+300 ml/dia) e lactantes (+700 ml/dia).
 * - Armstrong et al. (1994) — Escala de coloração da urina para monitoramento prático da hidratação.
 *
 * Zero dependências externas e seguro para SSR.
 */

import { createResultActions } from '../core/result-actions.js';

export const FATORES_BASE = Object.freeze({
  ML_POR_KG_ADULTO: 35, // Estimativa prática para adolescentes (>= 10 anos) e adultos (< 65 anos)
  ML_POR_KG_IDOSO: 30,  // Estimativa prática para idosos (>= 65 anos) para compensar menor taxa de filtração
  IDADE_CORTE_IDOSO: 65,
  PROPORCAO_FLUIDOS_BEBIDAS: 0.8, // EFSA (2010): aproximadamente 70% a 80% provém de bebidas (~80%)
  PROPORCAO_AGUA_ALIMENTOS: 0.2   // EFSA (2010): aproximadamente 20% a 30% provém de alimentos sólidos (~20%)
});

export const TAXAS_EXERCICIO = Object.freeze({
  nenhum: { id: 'nenhum', nome: 'Nenhum exercício', mlPorHora: 0 },
  leve: { id: 'leve', nome: 'Exercício Leve (caminhada, ioga)', mlPorHora: 400 },
  moderado: { id: 'moderado', nome: 'Exercício Moderado (musculação, trote, natação)', mlPorHora: 600 },
  intenso: { id: 'intenso', nome: 'Exercício Intenso (corrida, crossfit, futebol)', mlPorHora: 800 }
});

export const AJUSTES_CLIMA = Object.freeze({
  ameno: { id: 'ameno', nome: 'Ameno / Climatizado', adicionalMl: 0 },
  quente: { id: 'quente', nome: 'Quente / Exposição ao Sol', adicionalMl: 0 },
  muito_quente: { id: 'muito_quente', nome: 'Muito Quente ou Úmido', adicionalMl: 0 }
});

export const CONDICOES_ESPECIAIS = Object.freeze({
  nenhuma: { id: 'nenhuma', nome: 'Nenhuma condição especial', adicionalMl: 0 },
  gestante: { id: 'gestante', nome: 'Gestante (+300 ml/dia segundo EFSA/IOM)', adicionalMl: 300 },
  lactante: { id: 'lactante', nome: 'Lactante em amamentação (+700 ml/dia segundo EFSA/IOM)', adicionalMl: 700 }
});

/**
 * Converte strings formatadas com vírgula ou ponto em número.
 *
 * @param {string|number} val
 * @returns {number}
 */
export function parseNumberLocale(val) {
  if (val === null || val === undefined) return NaN;
  if (typeof val === 'number') return Number.isFinite(val) ? val : NaN;
  const str = String(val).trim().replace(/\s+/g, '');
  if (!str) return NaN;

  if (str.includes(',') && str.includes('.')) {
    const lastComma = str.lastIndexOf(',');
    const lastDot = str.lastIndexOf('.');
    if (lastComma > lastDot) {
      return parseFloat(str.replace(/\./g, '').replace(',', '.'));
    }
    return parseFloat(str.replace(/,/g, ''));
  }
  if (str.includes(',')) {
    return parseFloat(str.replace(',', '.'));
  }
  if (str.includes('.')) {
    const parts = str.split('.');
    if (parts.length === 2 && parts[1].length === 3) {
      return parseFloat(parts[0] + parts[1]);
    }
    return parseFloat(str);
  }
  return parseFloat(str);
}

/**
 * Calcula a estimativa de hidratação diária com todos os componentes.
 *
 * @param {Object} inputs
 * @param {number|string} inputs.peso Peso em kg
 * @param {number|string} [inputs.idade] Idade em anos (padrão 30)
 * @param {string} [inputs.intensidadeExercicio] 'nenhum' | 'leve' | 'moderado' | 'intenso'
 * @param {number|string} [inputs.minutosExercicio] Duração do exercício em minutos (0 a 360)
 * @param {string} [inputs.clima] 'ameno' | 'quente' | 'muito_quente'
 * @param {string} [inputs.condicaoEspecial] 'nenhuma' | 'gestante' | 'lactante'
 * @returns {{ ok: boolean, error?: string, data?: Object }}
 */
export function calculateHydration(inputs = {}) {
  const peso = parseNumberLocale(inputs.peso);
  if (Number.isNaN(peso) || peso < 20 || peso > 350) {
    return {
      ok: false,
      error: 'Informe um peso corporal válido entre 20 e 350 kg.'
    };
  }

  const idadeRaw = inputs.idade !== undefined && inputs.idade !== null && String(inputs.idade).trim() !== ''
    ? parseNumberLocale(inputs.idade)
    : 30;
  const idade = Math.round(Number.isNaN(idadeRaw) ? 30 : idadeRaw);

  if (idade < 10 || idade > 120) {
    return {
      ok: false,
      error: 'Informe uma idade válida entre 10 e 120 anos.'
    };
  }

  // Volume Basal: 30 ml/kg para idosos (>= 65 anos), 35 ml/kg para demais
  const taxaBasalPorKg = idade >= FATORES_BASE.IDADE_CORTE_IDOSO
    ? FATORES_BASE.ML_POR_KG_IDOSO
    : FATORES_BASE.ML_POR_KG_ADULTO;

  const volumeBasalMl = Math.round(peso * taxaBasalPorKg);

  // Adicional por Exercício Físico
  const intensidadeKey = (inputs.intensidadeExercicio || 'nenhum').toLowerCase().trim();
  const infoExercicio = TAXAS_EXERCICIO[intensidadeKey] || TAXAS_EXERCICIO.nenhum;

  const minutosExercicioRaw = inputs.minutosExercicio !== undefined && inputs.minutosExercicio !== null && String(inputs.minutosExercicio).trim() !== ''
    ? parseNumberLocale(inputs.minutosExercicio)
    : 0;
  const minutosExercicio = Math.max(0, Math.min(Math.round(Number.isNaN(minutosExercicioRaw) ? 0 : minutosExercicioRaw), 360));

  let adicionalExercicioMl = 0;
  if (infoExercicio.mlPorHora > 0 && minutosExercicio > 0) {
    adicionalExercicioMl = Math.round((minutosExercicio / 60) * infoExercicio.mlPorHora);
  }

  // Condição Especial (Gestante/Lactante)
  const condicaoKey = (inputs.condicaoEspecial || 'nenhuma').toLowerCase().trim();
  const infoCondicao = CONDICOES_ESPECIAIS[condicaoKey] || CONDICOES_ESPECIAIS.nenhuma;
  const adicionalCondicaoMl = infoCondicao.adicionalMl;

  // Clima (informativo/educativo, sem acréscimo numérico fixo arbitrário)
  const climaKey = (inputs.clima || 'ameno').toLowerCase().trim();
  const infoClima = AJUSTES_CLIMA[climaKey] || AJUSTES_CLIMA.ameno;
  const adicionalClimaMl = 0;

  // Volume Total de Água Recomendado (Água total: alimentos + líquidos)
  const volumeTotalMl = volumeBasalMl + adicionalExercicioMl + adicionalCondicaoMl;
  const volumeTotalLitros = Number((volumeTotalMl / 1000).toFixed(2));

  // Cota específica de líquidos sob a forma de bebidas (~80%) e cota alimentar (~20%)
  const volumeFluidosMl = Math.round(volumeTotalMl * FATORES_BASE.PROPORCAO_FLUIDOS_BEBIDAS);
  const volumeFluidosLitros = Number((volumeFluidosMl / 1000).toFixed(2));
  const volumeAlimentosMl = Math.round(volumeTotalMl * FATORES_BASE.PROPORCAO_AGUA_ALIMENTOS);

  // Equivalências em copos e garrafas para a meta líquida de bebidas
  const copos200 = Number((volumeFluidosMl / 200).toFixed(1));
  const copos250 = Number((volumeFluidosMl / 250).toFixed(1));
  const copos300 = Number((volumeFluidosMl / 300).toFixed(1));
  const garrafas500 = Number((volumeFluidosMl / 500).toFixed(1));

  // Cronograma sugerido de ingestão de líquidos ao longo do dia
  const cronograma = [
    { periodo: 'Ao acordar (jejum)', volumeMl: 350, descricao: 'Reidrata o organismo após as horas de sono e ativa o trato digestivo.' },
    { periodo: 'Durante a manhã', volumeMl: Math.round(volumeFluidosMl * 0.25), descricao: 'Distribua em goles regulares ao longo do trabalho ou estudo.' },
    { periodo: 'Antes das refeições principais', volumeMl: 250, descricao: 'Beba 20 a 30 minutos antes das refeições principais para apoiar a saciedade.' },
    { periodo: 'Durante a tarde', volumeMl: Math.round(volumeFluidosMl * 0.25), descricao: 'Mantém a cognição, foco mental e termorregulação vespertina.' },
    adicionalExercicioMl > 0
      ? { periodo: 'Treino / Exercício', volumeMl: adicionalExercicioMl, descricao: 'Consuma antes, durante e logo após o término da atividade física.' }
      : null,
    { periodo: 'Noite (até 1h antes de dormir)', volumeMl: Math.max(200, volumeFluidosMl - (350 + Math.round(volumeFluidosMl * 0.25) + 250 + Math.round(volumeFluidosMl * 0.25) + adicionalExercicioMl)), descricao: 'Evite grandes volumes imediatamente antes de deitar para não fragmentar o sono.' }
  ].filter(Boolean);

  // Avisos clínicos e de segurança
  const avisos = [
    'Aviso Médico: Indivíduos com diagnóstico de insuficiência cardíaca congestiva, doença renal crônica ou cirrose hepática com ascite devem seguir estritamente o limite de restrição hídrica prescrito por seu médico assistente.',
    'Água total vs. Bebidas: Segundo dados da EFSA, aproximadamente 20% a 30% da sua necessidade hídrica é obtida de alimentos sólidos e preparações úmidas, e cerca de 70% a 80% decorre de bebidas; a meta recomendada aqui foca nos líquidos que você deve ingerir diretamente.'
  ];

  if (climaKey === 'quente' || climaKey === 'muito_quente') {
    avisos.unshift('Atenção ao Clima e Temperatura: Em dias de calor, umidade elevada ou exposição solar, as perdas de água por transpiração e respiração elevam-se de forma variável e dinâmica. Reforce a ingestão de líquidos guiando-se pela sensação de sede e pela coloração clara da urina.');
  }

  if (volumeTotalLitros >= 5.0) {
    avisos.unshift('Alerta de Volume Muito Alto: Ingestões superiores a 5 litros diários sem perda extrema comprovada pelo suor podem sobrecarregar a capacidade de filtração renal e causar hiponatremia (queda perigosa do sódio sanguíneo).');
  }

  return {
    ok: true,
    data: {
      peso,
      idade,
      taxaBasalPorKg,
      volumeBasalMl,
      adicionalExercicioMl,
      adicionalClimaMl,
      adicionalCondicaoMl,
      volumeTotalMl,
      volumeTotalLitros,
      volumeFluidosMl,
      volumeFluidosLitros,
      volumeAlimentosMl,
      equivalencias: {
        copos200,
        copos250,
        copos300,
        garrafas500
      },
      cronograma,
      infoExercicio,
      minutosExercicio,
      infoClima,
      infoCondicao,
      avisos
    }
  };
}

/**
 * Constrói texto legível para cópia e compartilhamento.
 *
 * @param {Object} result
 * @returns {string}
 */
export function buildCopyText(result) {
  if (!result || !result.ok || !result.data) return '';
  const d = result.data;

  const linhas = [
    '=== ESTIMATIVA DE HIDRATAÇÃO DIÁRIA — CALCULADORA MASTER ===',
    `Meta Hídrica Total: ${d.volumeTotalLitros.toLocaleString('pt-BR')} L/dia (${d.volumeTotalMl.toLocaleString('pt-BR')} ml)`,
    `• Meta em Bebidas / Água Direta (~70% a 80%): ~${d.volumeFluidosLitros.toLocaleString('pt-BR')} L/dia (${d.volumeFluidosMl.toLocaleString('pt-BR')} ml)`,
    `• Cota Estimada de Alimentos (~20% a 30%): ~${d.volumeAlimentosMl.toLocaleString('pt-BR')} ml`,
    `Perfil: ${d.peso} kg, ${d.idade} anos`,
    '',
    '--- Composição da Necessidade Hídrica ---',
    `• Volume Basal (${d.taxaBasalPorKg} ml/kg): ${d.volumeBasalMl.toLocaleString('pt-BR')} ml`,
    d.adicionalExercicioMl > 0 ? `• Adicional Exercício (${d.infoExercicio.nome}, ${d.minutosExercicio} min): +${d.adicionalExercicioMl.toLocaleString('pt-BR')} ml` : null,
    d.adicionalCondicaoMl > 0 ? `• Condição Especial (${d.infoCondicao.nome}): +${d.adicionalCondicaoMl.toLocaleString('pt-BR')} ml` : null,
    '',
    '--- Equivalências em Bebidas / Copos ---',
    `• Copos de 200 ml: ~${d.equivalencias.copos200.toLocaleString('pt-BR')} copos`,
    `• Copos de 250 ml: ~${d.equivalencias.copos250.toLocaleString('pt-BR')} copos`,
    `• Garrafas de 500 ml: ~${d.equivalencias.garrafas500.toLocaleString('pt-BR')} garrafas`,
    '',
    'Calcule online em: https://www.calculadoramaster.com/tools/saude/estimativa-hidratacao.html',
    'Aviso: Estimativa informativa. Portadores de cardiopatia ou doença renal devem seguir recomendação médica específica.'
  ];

  return linhas.filter(Boolean).join('\n');
}

/**
 * Retorna as principais seções formatadas.
 *
 * @param {Object} result
 * @returns {Array<{ label: string, value: string }>}
 */
export function formatResult(result) {
  if (!result || !result.ok || !result.data) return [];
  const d = result.data;
  const items = [
    { label: 'Volume Diário Recomendado', value: `${d.volumeTotalLitros.toLocaleString('pt-BR')} L (${d.volumeTotalMl.toLocaleString('pt-BR')} ml)` },
    { label: 'Volume Basal de Repouso', value: `${d.volumeBasalMl.toLocaleString('pt-BR')} ml` }
  ];
  if (d.adicionalExercicioMl > 0) {
    items.push({ label: 'Adicional de Exercício', value: `+${d.adicionalExercicioMl.toLocaleString('pt-BR')} ml` });
  }
  if (d.adicionalCondicaoMl > 0) {
    items.push({ label: 'Condição Especial', value: `+${d.adicionalCondicaoMl.toLocaleString('pt-BR')} ml` });
  }
  items.push({ label: 'Equivalente em Copos de 250 ml', value: `~${d.equivalencias.copos250.toLocaleString('pt-BR')} copos` });
  return items;
}

/**
 * Inicializa os ouvintes de interface no DOM.
 */
export function setupTool() {
  if (typeof document === 'undefined') return;

  const form = document.getElementById('formHidratacao');
  if (!form) return;

  const inputPeso = document.getElementById('pesoHidratacao');
  const inputIdade = document.getElementById('idadeHidratacao');
  const selectExercicio = document.getElementById('intensidadeExercicio');
  const inputMinutos = document.getElementById('minutosExercicio');
  const grupoMinutos = document.getElementById('grupoMinutosExercicio');
  const selectClima = document.getElementById('climaHidratacao');
  const selectCondicao = document.getElementById('condicaoHidratacao');

  const btnCalcular = document.getElementById('btnCalcularHidratacao');
  const btnLimpar = document.getElementById('btnLimparHidratacao');
  const erroBox = document.getElementById('erroHidratacao');
  const resultadoSecao = document.getElementById('resultadoHidratacao');

  const resLitros = document.getElementById('resLitrosTotal');
  const resMl = document.getElementById('resMlTotal');
  const resCopos250 = document.getElementById('resCopos250');
  const resGarrafas500 = document.getElementById('resGarrafas500');

  const resBasalMl = document.getElementById('resBasalMl');
  const resExercicioMl = document.getElementById('resExercicioMl');
  const resClimaMl = document.getElementById('resClimaMl');

  const tabelaCronogramaBody = document.querySelector('#tabelaCronogramaHidratacao tbody');
  const avisosContainer = document.getElementById('avisosHidratacao');
  const acoesContainer = document.getElementById('acoesResultadoHidratacao');
  const statusAcoes = document.getElementById('statusAcoesHidratacao');

  if (selectExercicio && grupoMinutos) {
    selectExercicio.addEventListener('change', () => {
      const temExercicio = selectExercicio.value !== 'nenhum';
      grupoMinutos.hidden = !temExercicio;
      if (inputMinutos) inputMinutos.required = temExercicio;
    });
  }

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
    if (grupoMinutos) grupoMinutos.hidden = true;
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

    const inputs = {
      peso: inputPeso ? inputPeso.value : '',
      idade: inputIdade ? inputIdade.value : '',
      intensidadeExercicio: selectExercicio ? selectExercicio.value : 'nenhum',
      minutosExercicio: inputMinutos ? inputMinutos.value : '0',
      clima: selectClima ? selectClima.value : 'ameno',
      condicaoEspecial: selectCondicao ? selectCondicao.value : 'nenhuma'
    };

    const res = calculateHydration(inputs);
    if (!res.ok) {
      exibirErro(res.error || 'Ocorreu um erro no cálculo de hidratação.');
      return;
    }

    const d = res.data;

    if (resLitros) resLitros.textContent = `${d.volumeTotalLitros.toLocaleString('pt-BR')} L`;
    if (resMl) resMl.textContent = `${d.volumeTotalMl.toLocaleString('pt-BR')} ml / dia`;
    if (resCopos250) resCopos250.textContent = `~${d.equivalencias.copos250.toLocaleString('pt-BR')} copos`;
    if (resGarrafas500) resGarrafas500.textContent = `~${d.equivalencias.garrafas500.toLocaleString('pt-BR')} garrafas`;

    if (resBasalMl) resBasalMl.textContent = `${d.volumeBasalMl.toLocaleString('pt-BR')} ml`;
    if (resExercicioMl) resExercicioMl.textContent = d.adicionalExercicioMl > 0 ? `+${d.adicionalExercicioMl.toLocaleString('pt-BR')} ml` : '0 ml';
    if (resClimaMl) resClimaMl.textContent = d.adicionalCondicaoMl > 0 ? `+${d.adicionalCondicaoMl.toLocaleString('pt-BR')} ml` : '0 ml';

    // Tabela do cronograma diário
    if (tabelaCronogramaBody) {
      tabelaCronogramaBody.innerHTML = '';
      for (const item of d.cronograma) {
        const tr = document.createElement('tr');

        const tdPeriodo = document.createElement('td');
        const strong = document.createElement('strong');
        strong.textContent = item.periodo;
        tdPeriodo.appendChild(strong);
        const pDesc = document.createElement('div');
        pDesc.className = 'table-subtext';
        pDesc.textContent = item.descricao;
        tdPeriodo.appendChild(pDesc);

        const tdVol = document.createElement('td');
        const strongVol = document.createElement('strong');
        strongVol.textContent = `${item.volumeMl.toLocaleString('pt-BR')} ml`;
        tdVol.appendChild(strongVol);

        tr.appendChild(tdPeriodo);
        tr.appendChild(tdVol);
        tabelaCronogramaBody.appendChild(tr);
      }
    }

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
        toolId: 'estimativa-hidratacao',
        resultText: buildCopyText(res),
        shareTitle: 'Minha Meta de Hidratação Diária - Calculadora Master',
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
