/**
 * Calculadora de Metabolismo Basal (TMB) — Calculadora Master
 *
 * Módulo puro e desacoplado para cálculo da Taxa Metabólica Basal (TMB / BMR).
 * Implementa equações científicas de referência internacional:
 * 1. Mifflin-St Jeor (1990) — Equação preditiva de referência recomendada pela Academy of Nutrition and Dietetics.
 * 2. Harris-Benedict Revisada (Roza & Shizgal, 1984) — Referência clássica na literatura médica para adultos.
 * 3. Katch-McArdle (1996) — Baseada na massa livre de gordura (massa magra).
 *
 * Zero dependências externas e seguro para SSR.
 */

import { createResultActions } from '../core/result-actions.js';

export const LIMITES = Object.freeze({
  PESO_MIN: 20,
  PESO_MAX: 350,
  ALTURA_MIN: 80,
  ALTURA_MAX: 250,
  IDADE_MIN: 18,
  IDADE_MAX: 120,
  GORDURA_MIN: 3,
  GORDURA_MAX: 65
});

/**
 * Níveis de atividade física e multiplicadores clássicos de gasto energético total (PAL empírico).
 */
export const NIVEIS_ATIVIDADE = Object.freeze([
  {
    id: 'sedentario',
    nome: 'Sedentário',
    fator: 1.2,
    descricao: 'Pouco ou nenhum exercício, trabalho em escritório sentado.'
  },
  {
    id: 'leve',
    nome: 'Levemente ativo',
    fator: 1.375,
    descricao: 'Exercício leve ou caminhadas de 1 a 3 dias por semana.'
  },
  {
    id: 'moderado',
    nome: 'Moderadamente ativo',
    fator: 1.55,
    descricao: 'Exercício moderado de 3 a 5 dias por semana.'
  },
  {
    id: 'intenso',
    nome: 'Muito ativo',
    fator: 1.725,
    descricao: 'Exercício intenso de 6 a 7 dias por semana.'
  },
  {
    id: 'extremo',
    nome: 'Extremamente ativo',
    fator: 1.9,
    descricao: 'Trabalho braçal pesado ou treino atlético diário de alta performance.'
  }
]);

/**
 * Converte entradas de texto brasileiras (com vírgula ou ponto) para número de ponto flutuante.
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
 * Equação de Mifflin-St Jeor (1990)
 * Homens:   TMB = (10 × peso) + (6.25 × altura) - (5 × idade) + 5
 * Mulheres: TMB = (10 × peso) + (6.25 × altura) - (5 × idade) - 161
 *
 * @param {Object} params
 * @param {'m'|'f'} params.sex
 * @param {number} params.weightKg
 * @param {number} params.heightCm
 * @param {number} params.ageYears
 * @returns {number}
 */
export function calculateBmrMifflinStJeor({ sex, weightKg, heightCm, ageYears }) {
  const base = (10 * weightKg) + (6.25 * heightCm) - (5 * ageYears);
  return sex === 'm' ? base + 5 : base - 161;
}

/**
 * Equação de Harris-Benedict Revisada por Roza & Shizgal (1984)
 * Homens:   TMB = 88.362 + (13.397 × peso) + (4.799 × altura) - (5.677 × idade)
 * Mulheres: TMB = 447.593 + (9.247 × peso) + (3.098 × altura) - (4.330 × idade)
 *
 * @param {Object} params
 * @param {'m'|'f'} params.sex
 * @param {number} params.weightKg
 * @param {number} params.heightCm
 * @param {number} params.ageYears
 * @returns {number}
 */
export function calculateBmrHarrisBenedict({ sex, weightKg, heightCm, ageYears }) {
  if (sex === 'm') {
    return 88.362 + (13.397 * weightKg) + (4.799 * heightCm) - (5.677 * ageYears);
  }
  return 447.593 + (9.247 * weightKg) + (3.098 * heightCm) - (4.330 * ageYears);
}

/**
 * Equação de Katch-McArdle (1996)
 * Massa Magra = peso × (1 - (gordura / 100))
 * TMB = 370 + (21.6 × Massa Magra)
 *
 * @param {Object} params
 * @param {number} params.weightKg
 * @param {number} params.bodyFatPercent
 * @returns {number}
 */
export function calculateBmrKatchMcArdle({ weightKg, bodyFatPercent }) {
  const leanBodyMass = weightKg * (1 - (bodyFatPercent / 100));
  return 370 + (21.6 * leanBodyMass);
}

/**
 * Executa o cálculo completo de Metabolismo Basal com validação de dados.
 *
 * @param {Object} inputs
 * @param {string} inputs.sexo 'm' | 'f'
 * @param {number|string} inputs.idade Anos
 * @param {number|string} inputs.peso Kg
 * @param {number|string} inputs.altura Cm
 * @param {number|string} [inputs.gordura] Percentual de gordura corporal opcional
 * @param {string} [inputs.formula] 'mifflin' | 'harris' | 'katch'
 * @returns {{ ok: boolean, error?: string, data?: Object }}
 */
export function calculateBmr(inputs = {}) {
  const sex = (inputs.sexo || '').toLowerCase().trim();
  if (sex !== 'm' && sex !== 'f') {
    return { ok: false, error: 'Selecione o sexo biológico (Masculino ou Feminino).' };
  }

  const age = Math.round(parseNumberLocale(inputs.idade));
  if (Number.isNaN(age) || age < LIMITES.IDADE_MIN || age > LIMITES.IDADE_MAX) {
    return {
      ok: false,
      error: `Informe uma idade adulta válida entre ${LIMITES.IDADE_MIN} e ${LIMITES.IDADE_MAX} anos (as equações preditivas desta ferramenta são validadas para adultos).`
    };
  }

  const weight = parseNumberLocale(inputs.peso);
  if (Number.isNaN(weight) || weight < LIMITES.PESO_MIN || weight > LIMITES.PESO_MAX) {
    return {
      ok: false,
      error: `Informe um peso válido entre ${LIMITES.PESO_MIN} kg e ${LIMITES.PESO_MAX} kg.`
    };
  }

  let height = parseNumberLocale(inputs.altura);
  if (!Number.isNaN(height) && height >= 0.8 && height <= 2.5) {
    height = Math.round(height * 100);
  }
  if (Number.isNaN(height) || height < LIMITES.ALTURA_MIN || height > LIMITES.ALTURA_MAX) {
    return {
      ok: false,
      error: `Informe uma altura válida entre ${LIMITES.ALTURA_MIN} cm e ${LIMITES.ALTURA_MAX} cm.`
    };
  }

  const formula = (inputs.formula || 'mifflin').toLowerCase().trim();
  let bfPercent = null;
  if (inputs.gordura !== undefined && inputs.gordura !== null && String(inputs.gordura).trim() !== '') {
    bfPercent = parseNumberLocale(inputs.gordura);
    if (Number.isNaN(bfPercent) || bfPercent < LIMITES.GORDURA_MIN || bfPercent > LIMITES.GORDURA_MAX) {
      return {
        ok: false,
        error: `O percentual de gordura corporal deve estar entre ${LIMITES.GORDURA_MIN}% e ${LIMITES.GORDURA_MAX}%.`
      };
    }
  }

  if (formula === 'katch' && (bfPercent === null || Number.isNaN(bfPercent))) {
    return {
      ok: false,
      error: 'Para utilizar a equação de Katch-McArdle, é obrigatório informar o percentual de gordura corporal (% BF).'
    };
  }

  const tmbMifflin = calculateBmrMifflinStJeor({ sex, weightKg: weight, heightCm: height, ageYears: age });
  const tmbHarris = calculateBmrHarrisBenedict({ sex, weightKg: weight, heightCm: height, ageYears: age });
  const tmbKatch = bfPercent !== null ? calculateBmrKatchMcArdle({ weightKg: weight, bodyFatPercent: bfPercent }) : null;

  let tmbPrincipal = tmbMifflin;
  let formulaUtilizada = 'Mifflin-St Jeor (Recomendada AND/ADA)';

  if (formula === 'harris') {
    tmbPrincipal = tmbHarris;
    formulaUtilizada = 'Harris-Benedict Revisada (Roza & Shizgal)';
  } else if (formula === 'katch' && tmbKatch !== null) {
    tmbPrincipal = tmbKatch;
    formulaUtilizada = 'Katch-McArdle (Massa Magra)';
  }

  const roundedTmb = Math.round(tmbPrincipal);
  const hourlyKcal = Number((tmbPrincipal / 24).toFixed(1));

  // Estimativas de gasto com base no nível de atividade (fatores empíricos clássicos)
  const estimativasAtividade = NIVEIS_ATIVIDADE.map(nivel => ({
    id: nivel.id,
    nome: nivel.nome,
    fator: nivel.fator,
    descricao: nivel.descricao,
    gastoTotalKcal: Math.round(tmbPrincipal * nivel.fator)
  }));

  return {
    ok: true,
    data: {
      sexo: sex,
      idade: age,
      peso: weight,
      altura: height,
      gordura: bfPercent,
      formulaUtilizada,
      tmb: roundedTmb,
      tmbExata: Number(tmbPrincipal.toFixed(2)),
      hourlyKcal,
      comparativo: {
        mifflin: Math.round(tmbMifflin),
        harris: Math.round(tmbHarris),
        katch: tmbKatch !== null ? Math.round(tmbKatch) : null
      },
      estimativasAtividade
    }
  };
}

/**
 * Monta o texto legível para copiar e compartilhar os resultados da TMB.
 *
 * @param {Object} result Objeto retornado por calculateBmr
 * @returns {string}
 */
export function buildCopyText(result) {
  if (!result || !result.ok || !result.data) return '';
  const d = result.data;
  const sexoDesc = d.sexo === 'm' ? 'Masculino' : 'Feminino';

  const linhas = [
    '=== TAXA METABÓLICA BASAL (TMB) — CALCULADORA MASTER ===',
    `Perfil: ${sexoDesc}, ${d.idade} anos, ${d.peso} kg, ${d.altura} cm`,
    d.gordura !== null ? `Gordura Corporal: ${d.gordura}%` : null,
    `Fórmula Principal: ${d.formulaUtilizada}`,
    `Metabolismo Basal (TMB): ${d.tmb.toLocaleString('pt-BR')} kcal/dia`,
    `Gasto em Repouso por Hora: ${d.hourlyKcal.toLocaleString('pt-BR')} kcal/h`,
    '',
    '--- Gasto Calórico Diário por Nível de Atividade ---'
  ];

  for (const item of d.estimativasAtividade) {
    linhas.push(`• ${item.nome} (${item.fator}x): ${item.gastoTotalKcal.toLocaleString('pt-BR')} kcal/dia`);
  }

  linhas.push('');
  linhas.push('Comparativo de Fórmulas:');
  linhas.push(`• Mifflin-St Jeor: ${d.comparativo.mifflin.toLocaleString('pt-BR')} kcal/dia`);
  linhas.push(`• Harris-Benedict: ${d.comparativo.harris.toLocaleString('pt-BR')} kcal/dia`);
  if (d.comparativo.katch !== null) {
    linhas.push(`• Katch-McArdle: ${d.comparativo.katch.toLocaleString('pt-BR')} kcal/dia`);
  }
  linhas.push('');
  linhas.push('Calcule online em: https://www.calculadoramaster.com/tools/saude/metabolismo-basal.html');
  linhas.push('Aviso: A TMB é uma estimativa científica e não substitui avaliação médica ou nutricional presencial.');

  return linhas.filter(l => l !== null).join('\n');
}

/**
 * Estrutura seções de resumo para consumo de componentes ou exportação.
 *
 * @param {Object} result
 * @returns {Array<{ label: string, value: string }>}
 */
export function formatResult(result) {
  if (!result || !result.ok || !result.data) return [];
  const d = result.data;
  return [
    { label: 'Metabolismo Basal (TMB)', value: `${d.tmb.toLocaleString('pt-BR')} kcal/dia` },
    { label: 'Gasto por Hora em Repouso', value: `${d.hourlyKcal.toLocaleString('pt-BR')} kcal/h` },
    { label: 'Sedentário (1.2x)', value: `${d.estimativasAtividade[0].gastoTotalKcal.toLocaleString('pt-BR')} kcal/dia` },
    { label: 'Moderadamente Ativo (1.55x)', value: `${d.estimativasAtividade[2].gastoTotalKcal.toLocaleString('pt-BR')} kcal/dia` },
    { label: 'Muito Ativo (1.725x)', value: `${d.estimativasAtividade[3].gastoTotalKcal.toLocaleString('pt-BR')} kcal/dia` },
    { label: 'Fórmula Aplicada', value: d.formulaUtilizada }
  ];
}

/**
 * Inicializa os manipuladores de interface no DOM.
 */
export function setupTool() {
  if (typeof document === 'undefined') return;

  const form = document.getElementById('formTmb');
  if (!form) return;

  const selectSexo = document.getElementById('sexo');
  const inputIdade = document.getElementById('idade');
  const inputPeso = document.getElementById('peso');
  const inputAltura = document.getElementById('altura');
  const selectFormula = document.getElementById('formula');
  const inputGordura = document.getElementById('gordura');
  const grupoGordura = document.getElementById('grupoGordura');

  const btnCalcular = document.getElementById('btnCalcularTmb');
  const btnLimpar = document.getElementById('btnLimparTmb');
  const erroBox = document.getElementById('erroTmb');
  const resultadoSecao = document.getElementById('resultadoTmb');

  const resTmbPrincipal = document.getElementById('resTmbPrincipal');
  const resTmbHora = document.getElementById('resTmbHora');
  const resMifflin = document.getElementById('resMifflin');
  const resHarris = document.getElementById('resHarris');
  const resKatch = document.getElementById('resKatch');
  const resKatchItem = document.getElementById('resKatchItem');
  const resFormulaBadge = document.getElementById('resFormulaBadge');
  const tabelaAtividadesBody = document.querySelector('#tabelaAtividadesTmb tbody');
  const acoesContainer = document.getElementById('acoesResultadoTmb');
  const statusAcoes = document.getElementById('statusAcoesTmb');

  // Alterna visibilidade do campo de gordura quando Katch-McArdle é selecionada
  if (selectFormula && grupoGordura) {
    selectFormula.addEventListener('change', () => {
      if (selectFormula.value === 'katch') {
        grupoGordura.hidden = false;
        if (inputGordura) inputGordura.required = true;
      } else {
        grupoGordura.hidden = false; // mantido acessível como opcional
        if (inputGordura) inputGordura.required = false;
      }
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
    if (resultadoSecao) resultadoSecao.hidden = true;
    if (acoesContainer) acoesContainer.innerHTML = '';
    if (statusAcoes) statusAcoes.textContent = '';
  }

  if (btnLimpar) {
    btnLimpar.addEventListener('click', limparTudo);
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    esconderErro();

    const inputs = {
      sexo: selectSexo ? selectSexo.value : '',
      idade: inputIdade ? inputIdade.value : '',
      peso: inputPeso ? inputPeso.value : '',
      altura: inputAltura ? inputAltura.value : '',
      formula: selectFormula ? selectFormula.value : 'mifflin',
      gordura: inputGordura ? inputGordura.value : ''
    };

    const res = calculateBmr(inputs);
    if (!res.ok) {
      exibirErro(res.error || 'Ocorreu um erro na validação dos dados.');
      return;
    }

    const d = res.data;

    if (resTmbPrincipal) {
      resTmbPrincipal.textContent = `${d.tmb.toLocaleString('pt-BR')} kcal`;
    }
    if (resTmbHora) {
      resTmbHora.textContent = `${d.hourlyKcal.toLocaleString('pt-BR')} kcal/h`;
    }
    if (resFormulaBadge) {
      resFormulaBadge.textContent = d.formulaUtilizada;
    }
    if (resMifflin) {
      resMifflin.textContent = `${d.comparativo.mifflin.toLocaleString('pt-BR')} kcal`;
    }
    if (resHarris) {
      resHarris.textContent = `${d.comparativo.harris.toLocaleString('pt-BR')} kcal`;
    }
    if (resKatch && resKatchItem) {
      if (d.comparativo.katch !== null) {
        resKatch.textContent = `${d.comparativo.katch.toLocaleString('pt-BR')} kcal`;
        resKatchItem.hidden = false;
      } else {
        resKatchItem.hidden = true;
      }
    }

    if (tabelaAtividadesBody) {
      tabelaAtividadesBody.innerHTML = '';
      for (const item of d.estimativasAtividade) {
        const tr = document.createElement('tr');

        const tdNome = document.createElement('td');
        const strong = document.createElement('strong');
        strong.textContent = item.nome;
        tdNome.appendChild(strong);
        const pDesc = document.createElement('div');
        pDesc.className = 'table-subtext';
        pDesc.textContent = item.descricao;
        tdNome.appendChild(pDesc);

        const tdFator = document.createElement('td');
        tdFator.textContent = `${item.fator.toFixed(3)}x`;

        const tdGasto = document.createElement('td');
        const strongGasto = document.createElement('strong');
        strongGasto.textContent = `${item.gastoTotalKcal.toLocaleString('pt-BR')} kcal/dia`;
        tdGasto.appendChild(strongGasto);

        tr.appendChild(tdNome);
        tr.appendChild(tdFator);
        tr.appendChild(tdGasto);
        tabelaAtividadesBody.appendChild(tr);
      }
    }

    if (acoesContainer) {
      acoesContainer.innerHTML = '';
      createResultActions(acoesContainer, {
        toolId: 'metabolismo-basal',
        resultText: buildCopyText(res),
        shareTitle: 'Minha Taxa Metabólica Basal (TMB) - Calculadora Master',
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
