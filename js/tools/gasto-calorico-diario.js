/**
 * Calculadora de Gasto Calórico Diário (GET / TDEE) — Calculadora Master
 *
 * Módulo puro e desacoplado para cálculo do Gasto Energético Total (GET / TDEE)
 * e metas calóricas para manutenção, emagrecimento ou ganho de peso.
 *
 * Base científica:
 * - Multiplicadores de Nível de Atividade Física (PAL clássico da prática clínica e esportiva).
 * - Equação de Mifflin-St Jeor (1990) para cálculo da Taxa Metabólica Basal (TMB) em adultos.
 * - Modelo termodinâmico de balanço energético com cenários orientativos de déficit e superávit.
 *
 * Zero dependências externas e seguro para SSR.
 */

import { createResultActions } from '../core/result-actions.js';

export const FATORES_ATIVIDADE = Object.freeze({
  sedentario: {
    id: 'sedentario',
    nome: 'Sedentário',
    fator: 1.2,
    frequencia: 'Pouco ou nenhum exercício',
    descricao: 'Rotina típica de escritório, locomoção motorizada e pouco movimento corporal.'
  },
  leve: {
    id: 'leve',
    nome: 'Levemente ativo',
    fator: 1.375,
    frequencia: '1 a 3 dias por semana',
    descricao: 'Caminhadas regulares, tarefas domésticas ativas ou treinos leves ocasionais.'
  },
  moderado: {
    id: 'moderado',
    nome: 'Moderadamente ativo',
    fator: 1.55,
    frequencia: '3 a 5 dias por semana',
    descricao: 'Prática regular de musculação, corrida, ciclismo ou esportes em intensidade média.'
  },
  intenso: {
    id: 'intenso',
    nome: 'Muito ativo',
    fator: 1.725,
    frequencia: '6 a 7 dias por semana',
    descricao: 'Treinos intensos quase diários ou trabalho com considerável esforço físico.'
  },
  extremo: {
    id: 'extremo',
    nome: 'Extremamente ativo',
    fator: 1.9,
    frequencia: '2x ao dia ou trabalho pesado',
    descricao: 'Atletas de alto rendimento, maratonistas ou profissões de alta exigência braçal diária.'
  }
});

export const OBJETIVOS_CALORICOS = Object.freeze({
  perda_agressiva: {
    id: 'perda_agressiva',
    nome: 'Emagrecimento Agressivo (-25%)',
    percentualDelta: -0.25,
    descricao: 'Déficit calórico expressivo de 25%. Recomendado apenas com supervisão profissional.',
    varSemanaKg: -0.65
  },
  perda_moderada: {
    id: 'perda_moderada',
    nome: 'Emagrecimento Moderado (-20%)',
    percentualDelta: -0.20,
    descricao: 'Déficit sustentável (~300 a 500 kcal). Faixa habitualmente recomendada para perda de gordura preservando massa magra.',
    varSemanaKg: -0.45
  },
  perda_leve: {
    id: 'perda_leve',
    nome: 'Emagrecimento Suave (-10%)',
    percentualDelta: -0.10,
    descricao: 'Déficit leve de 10%. Ideal para transição gradual ou pessoas próximas ao peso ideal.',
    varSemanaKg: -0.25
  },
  manutencao: {
    id: 'manutencao',
    nome: 'Manutenção do Peso Atual (0%)',
    percentualDelta: 0,
    descricao: 'Consumo igual ao gasto diário total (GET). Mantém a estabilidade da composição corporal.',
    varSemanaKg: 0
  },
  ganho_leve: {
    id: 'ganho_leve',
    nome: 'Ganho Limpo de Massa (+10%)',
    percentualDelta: 0.10,
    descricao: 'Superávit moderado de 10% (~200 a 300 kcal). Ideal para hipertrofia minimizando ganho de gordura.',
    varSemanaKg: 0.25
  },
  ganho_hipertrofia: {
    id: 'ganho_hipertrofia',
    nome: 'Superávit Acentuado (+15%)',
    percentualDelta: 0.15,
    descricao: 'Superávit de 15% (~400 a 500 kcal). Indicado para ganho acelerado de peso ou indivíduos com grande dificuldade de engordar.',
    varSemanaKg: 0.45
  }
});

export const LIMITES_SEGURANCA = Object.freeze({
  MIN_KCAL_MULHER: 1200,
  MIN_KCAL_HOMEM: 1500,
  KCAL_POR_KG_GORDURA: 7700 // Estimativa clássica de Wishnofsky para tecido adiposo humano
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
 * Calcula a TMB via Mifflin-St Jeor.
 *
 * @param {Object} params
 * @param {'m'|'f'} params.sexo
 * @param {number} params.peso
 * @param {number} params.altura
 * @param {number} params.idade
 * @returns {number}
 */
export function calcularTmbMifflin({ sexo, peso, altura, idade }) {
  const base = (10 * peso) + (6.25 * altura) - (5 * idade);
  return sexo === 'm' ? base + 5 : base - 161;
}

/**
 * Executa o cálculo do Gasto Calórico Diário (GET) e metas nutricionais.
 *
 * @param {Object} inputs
 * @param {string} [inputs.modoEntrada] 'calculada' | 'direta'
 * @param {string} [inputs.sexo] 'm' | 'f'
 * @param {number|string} [inputs.idade] Anos
 * @param {number|string} [inputs.peso] Kg
 * @param {number|string} [inputs.altura] Cm ou metros
 * @param {number|string} [inputs.tmbInformada] TMB em kcal fornecida diretamente
 * @param {string} inputs.atividade Nível de atividade ('sedentario'|'leve'|'moderado'|'intenso'|'extremo')
 * @param {string} [inputs.objetivo] Chave do objetivo calórico ('manutencao' por padrão)
 * @returns {{ ok: boolean, error?: string, data?: Object }}
 */
export function calculateDailyCaloricExpenditure(inputs = {}) {
  const atividadeKey = (inputs.atividade || '').toLowerCase().trim();
  const infoAtividade = FATORES_ATIVIDADE[atividadeKey];
  if (!infoAtividade) {
    return {
      ok: false,
      error: 'Selecione um nível de atividade física válido.'
    };
  }

  const objetivoKey = (inputs.objetivo || 'manutencao').toLowerCase().trim();
  const infoObjetivo = OBJETIVOS_CALORICOS[objetivoKey] || OBJETIVOS_CALORICOS.manutencao;

  const modo = (inputs.modoEntrada || 'calculada').toLowerCase().trim();
  let tmb = 0;
  let sexo = inputs.sexo ? inputs.sexo.toLowerCase().trim() : 'm';
  let peso = 0;
  let altura = 0;
  let idade = 0;

  if (modo === 'direta') {
    tmb = parseNumberLocale(inputs.tmbInformada);
    if (Number.isNaN(tmb) || tmb < 500 || tmb > 5000) {
      return {
        ok: false,
        error: 'Informe um valor de TMB válido entre 500 e 5.000 kcal/dia.'
      };
    }
  } else {
    if (sexo !== 'm' && sexo !== 'f') {
      return { ok: false, error: 'Selecione o sexo biológico (Masculino ou Feminino).' };
    }

    idade = Math.round(parseNumberLocale(inputs.idade));
    if (Number.isNaN(idade) || idade < 18 || idade > 120) {
      return { ok: false, error: 'Informe uma idade adulta válida entre 18 e 120 anos (a equação de Mifflin-St Jeor é validada para a população adulta).' };
    }

    peso = parseNumberLocale(inputs.peso);
    if (Number.isNaN(peso) || peso < 20 || peso > 350) {
      return { ok: false, error: 'Informe um peso válido entre 20 e 350 kg.' };
    }

    altura = parseNumberLocale(inputs.altura);
    if (!Number.isNaN(altura) && altura >= 0.8 && altura <= 2.5) {
      altura = Math.round(altura * 100);
    }
    if (Number.isNaN(altura) || altura < 80 || altura > 250) {
      return { ok: false, error: 'Informe uma altura válida entre 80 e 250 cm.' };
    }

    tmb = calcularTmbMifflin({ sexo, peso, altura, idade });
  }

  const roundedTmb = Math.round(tmb);
  const getExato = tmb * infoAtividade.fator;
  const roundedGet = Math.round(getExato);

  // Meta calórica conforme objetivo selecionado
  let metaCalorica = Math.round(getExato * (1 + infoObjetivo.percentualDelta));
  const diferencaCalorica = metaCalorica - roundedGet;

  // Verificação de limites orientativos de ingestão
  const avisos = [];
  const limiteMinimo = sexo === 'f' ? LIMITES_SEGURANCA.MIN_KCAL_MULHER : LIMITES_SEGURANCA.MIN_KCAL_HOMEM;

  if (metaCalorica < limiteMinimo) {
    avisos.push(`A meta calculada (${metaCalorica} kcal) está abaixo do patamar de referência habitual de dietas autônomas (${limiteMinimo} kcal/dia para o sexo ${sexo === 'f' ? 'feminino' : 'masculino'}). Consumos muito reduzidos exigem acompanhamento de um profissional nutricionista ou médico para assegurar a ingestão de micronutrientes essenciais.`);
  }

  if (metaCalorica < roundedTmb) {
    avisos.push(`Atenção: A meta calórica estimada ficou abaixo da sua Taxa Metabólica Basal calculada (${roundedTmb} kcal). Déficits calóricos acentuados demandam avaliação individual e monitoramento profissional presencial para prevenir perda excessiva de massa muscular e fadiga.`);
  }

  // Tabela completa de todos os cenários de objetivos
  const tabelaCenarios = Object.values(OBJETIVOS_CALORICOS).map(obj => {
    const kcalCenario = Math.round(getExato * (1 + obj.percentualDelta));
    const deltaKcal = kcalCenario - roundedGet;
    const deltaSemanalKg = Number(((deltaKcal * 7) / LIMITES_SEGURANCA.KCAL_POR_KG_GORDURA).toFixed(2));
    return {
      id: obj.id,
      nome: obj.nome,
      descricao: obj.descricao,
      metaKcal: kcalCenario,
      deltaKcal,
      deltaSemanalKg,
      selecionado: obj.id === infoObjetivo.id
    };
  });

  return {
    ok: true,
    data: {
      modoEntrada: modo,
      sexo,
      idade,
      peso,
      altura,
      tmb: roundedTmb,
      nivelAtividade: infoAtividade,
      objetivo: infoObjetivo,
      get: roundedGet,
      metaCalorica,
      diferencaCalorica,
      variacaoSemanalKg: Number(((diferencaCalorica * 7) / LIMITES_SEGURANCA.KCAL_POR_KG_GORDURA).toFixed(2)),
      tabelaCenarios,
      avisos
    }
  };
}

/**
 * Constrói o texto formatado para copiar ou compartilhar o resultado do Gasto Calórico.
 *
 * @param {Object} result
 * @returns {string}
 */
export function buildCopyText(result) {
  if (!result || !result.ok || !result.data) return '';
  const d = result.data;
  const linhas = [
    '=== GASTO CALÓRICO DIÁRIO (GET / TDEE) — CALCULADORA MASTER ===',
    `Taxa Metabólica Basal (TMB): ${d.tmb.toLocaleString('pt-BR')} kcal/dia`,
    `Nível de Atividade: ${d.nivelAtividade.nome} (${d.nivelAtividade.fator}x)`,
    `Gasto Energético de Manutenção (GET): ${d.get.toLocaleString('pt-BR')} kcal/dia`,
    '',
    `Objetivo Selecionado: ${d.objetivo.nome}`,
    `Meta Calórica Recomendada: ${d.metaCalorica.toLocaleString('pt-BR')} kcal/dia`,
    `Saldo Diário: ${d.diferencaCalorica >= 0 ? '+' : ''}${d.diferencaCalorica} kcal/dia`,
    d.variacaoSemanalKg !== 0 ? `Projeção Estimada: ~${d.variacaoSemanalKg >= 0 ? '+' : ''}${d.variacaoSemanalKg.toLocaleString('pt-BR')} kg/semana` : 'Projeção: Manutenção do peso corporal',
    '',
    '--- Metas por Objetivo ---'
  ];

  for (const c of d.tabelaCenarios) {
    const sinal = c.deltaKcal >= 0 ? '+' : '';
    linhas.push(`• ${c.nome}: ${c.metaKcal.toLocaleString('pt-BR')} kcal/dia (${sinal}${c.deltaKcal} kcal)`);
  }

  linhas.push('');
  linhas.push('Calcule online em: https://www.calculadoramaster.com/tools/saude/gasto-calorico-diario.html');
  linhas.push('Aviso: Estimativas energéticas não substituem orientação médica ou nutricional presencial.');

  return linhas.join('\n');
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
  return [
    { label: 'Gasto Energético Total (GET)', value: `${d.get.toLocaleString('pt-BR')} kcal/dia` },
    { label: 'Taxa Metabólica Basal (TMB)', value: `${d.tmb.toLocaleString('pt-BR')} kcal/dia` },
    { label: 'Meta Diária para Objetivo', value: `${d.metaCalorica.toLocaleString('pt-BR')} kcal/dia` },
    { label: 'Saldo Calórico', value: `${d.diferencaCalorica >= 0 ? '+' : ''}${d.diferencaCalorica} kcal/dia` },
    { label: 'Fator de Atividade', value: `${d.nivelAtividade.nome} (${d.nivelAtividade.fator}x)` }
  ];
}

/**
 * Inicializa os ouvintes de eventos da interface no DOM.
 */
export function setupTool() {
  if (typeof document === 'undefined') return;

  const form = document.getElementById('formGastoCalorico');
  if (!form) return;

  const radModoCalc = document.getElementById('modoCalc');
  const radModoDireto = document.getElementById('modoDireto');
  const grupoCamposCalc = document.getElementById('grupoCamposCalculados');
  const grupoCampoDireto = document.getElementById('grupoCampoDireto');

  const selectSexo = document.getElementById('sexoGet');
  const inputIdade = document.getElementById('idadeGet');
  const inputPeso = document.getElementById('pesoGet');
  const inputAltura = document.getElementById('alturaGet');
  const inputTmb = document.getElementById('tmbInformada');

  const selectAtividade = document.getElementById('nivelAtividade');
  const selectObjetivo = document.getElementById('objetivoCalorico');

  const btnCalcular = document.getElementById('btnCalcularGet');
  const btnLimpar = document.getElementById('btnLimparGet');
  const erroBox = document.getElementById('erroGet');
  const resultadoSecao = document.getElementById('resultadoGet');

  const resGetPrincipal = document.getElementById('resGetPrincipal');
  const resMetaPrincipal = document.getElementById('resMetaPrincipal');
  const resTmbRef = document.getElementById('resTmbRef');
  const resSaldoCalorico = document.getElementById('resSaldoCalorico');
  const resBadgeObjetivo = document.getElementById('resBadgeObjetivo');

  const tabelaCenariosBody = document.querySelector('#tabelaCenariosGet tbody');
  const avisosContainer = document.getElementById('avisosGet');
  const acoesContainer = document.getElementById('acoesResultadoGet');
  const statusAcoes = document.getElementById('statusAcoesGet');

  // Alternância entre modo calculado e modo TMB direta
  function atualizarModo() {
    const isDireto = radModoDireto && radModoDireto.checked;
    if (grupoCamposCalc) grupoCamposCalc.hidden = isDireto;
    if (grupoCampoDireto) grupoCampoDireto.hidden = !isDireto;
    if (inputTmb) inputTmb.required = isDireto;
    if (inputIdade) inputIdade.required = !isDireto;
    if (inputPeso) inputPeso.required = !isDireto;
    if (inputAltura) inputAltura.required = !isDireto;
  }

  if (radModoCalc) radModoCalc.addEventListener('change', atualizarModo);
  if (radModoDireto) radModoDireto.addEventListener('change', atualizarModo);

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

    const isDireto = radModoDireto && radModoDireto.checked;
    const inputs = {
      modoEntrada: isDireto ? 'direta' : 'calculada',
      sexo: selectSexo ? selectSexo.value : '',
      idade: inputIdade ? inputIdade.value : '',
      peso: inputPeso ? inputPeso.value : '',
      altura: inputAltura ? inputAltura.value : '',
      tmbInformada: inputTmb ? inputTmb.value : '',
      atividade: selectAtividade ? selectAtividade.value : '',
      objetivo: selectObjetivo ? selectObjetivo.value : 'manutencao'
    };

    const res = calculateDailyCaloricExpenditure(inputs);
    if (!res.ok) {
      exibirErro(res.error || 'Ocorreu um erro no cálculo do gasto calórico.');
      return;
    }

    const d = res.data;

    if (resGetPrincipal) {
      resGetPrincipal.textContent = `${d.get.toLocaleString('pt-BR')} kcal`;
    }
    if (resMetaPrincipal) {
      resMetaPrincipal.textContent = `${d.metaCalorica.toLocaleString('pt-BR')} kcal`;
    }
    if (resTmbRef) {
      resTmbRef.textContent = `${d.tmb.toLocaleString('pt-BR')} kcal`;
    }
    if (resSaldoCalorico) {
      const sinal = d.diferencaCalorica >= 0 ? '+' : '';
      resSaldoCalorico.textContent = `${sinal}${d.diferencaCalorica} kcal`;
    }
    if (resBadgeObjetivo) {
      resBadgeObjetivo.textContent = d.objetivo.nome;
    }

    // Tabela comparativa de cenários
    if (tabelaCenariosBody) {
      tabelaCenariosBody.innerHTML = '';
      for (const c of d.tabelaCenarios) {
        const tr = document.createElement('tr');
        if (c.selecionado) {
          tr.className = 'table-row-selected';
        }

        const tdNome = document.createElement('td');
        const strong = document.createElement('strong');
        strong.textContent = c.nome;
        tdNome.appendChild(strong);
        const pDesc = document.createElement('div');
        pDesc.className = 'table-subtext';
        pDesc.textContent = c.descricao;
        tdNome.appendChild(pDesc);

        const tdMeta = document.createElement('td');
        const strongMeta = document.createElement('strong');
        strongMeta.textContent = `${c.metaKcal.toLocaleString('pt-BR')} kcal`;
        tdMeta.appendChild(strongMeta);

        const tdDelta = document.createElement('td');
        const sinal = c.deltaKcal >= 0 ? '+' : '';
        tdDelta.textContent = `${sinal}${c.deltaKcal} kcal/dia`;

        const tdVarSemana = document.createElement('td');
        tdVarSemana.textContent = c.deltaSemanalKg !== 0 ? `~${c.deltaSemanalKg >= 0 ? '+' : ''}${c.deltaSemanalKg.toLocaleString('pt-BR')} kg/sem` : 'Estável';

        tr.appendChild(tdNome);
        tr.appendChild(tdMeta);
        tr.appendChild(tdDelta);
        tr.appendChild(tdVarSemana);
        tabelaCenariosBody.appendChild(tr);
      }
    }

    // Avisos clínicos
    if (avisosContainer) {
      avisosContainer.innerHTML = '';
      if (d.avisos && d.avisos.length > 0) {
        for (const aviso of d.avisos) {
          const div = document.createElement('div');
          div.className = 'tool-alert-box';
          div.textContent = aviso;
          avisosContainer.appendChild(div);
        }
      }
    }

    // Botões de ação
    if (acoesContainer) {
      acoesContainer.innerHTML = '';
      createResultActions(acoesContainer, {
        toolId: 'gasto-calorico-diario',
        resultText: buildCopyText(res),
        shareTitle: 'Meu Gasto Calórico Diário (GET) - Calculadora Master',
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
