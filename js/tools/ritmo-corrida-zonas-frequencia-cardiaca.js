/**
 * Calculadora de Ritmo de Corrida e Zonas de Frequência Cardíaca — Calculadora Master
 *
 * Módulo puro e desacoplado para cálculos de:
 * 1. Cinemática de corrida: Ritmo (Pace em min/km e min/mi), Velocidade (km/h e mph) e tempos de prova lineares.
 * 2. Zonas de Frequência Cardíaca:
 *    - Equação de Tanaka, Monahan & Seals (2001) para FC máxima: FCmáx = 208 - (0.7 × idade).
 *    - Método de Karvonen et al. (1957) com Frequência Cardíaca de Reserva (FCR).
 *    - 5 zonas fisiológicas de treinamento de resistência cardiovascular.
 *
 * Zero dependências externas e seguro para SSR.
 */

import { createResultActions } from '../core/result-actions.js';

export const KM_POR_MILHA = 1.609344;

export const DISTANCIAS_PADRAO = Object.freeze([
  { id: '1k', nome: '1 km', km: 1.0 },
  { id: '5k', nome: '5 km', km: 5.0 },
  { id: '10k', nome: '10 km', km: 10.0 },
  { id: '15k', nome: '15 km', km: 15.0 },
  { id: '21k', nome: 'Meia Maratona (21,1 km)', km: 21.0975 },
  { id: '42k', nome: 'Maratona (42,2 km)', km: 42.195 }
]);

export const ZONAS_CARDIO = Object.freeze([
  {
    zona: 1,
    nome: 'Zona 1 — Muito Leve / Regenerativa',
    pctMin: 0.50,
    pctMax: 0.60,
    borg: 'Esforço muito fácil (Escala 9-11)',
    beneficio: 'Recuperação ativa, aquecimento e volta à calma. Facilidade para conversar sem falta de ar.'
  },
  {
    zona: 2,
    nome: 'Zona 2 — Leve / Aeróbica Base (Zona de Resistência)',
    pctMin: 0.60,
    pctMax: 0.70,
    borg: 'Esforço leve e confortável (Escala 11-13)',
    beneficio: 'Máxima oxidação de gorduras, hipertrofia mitocondrial e base de resistência de longa distância.'
  },
  {
    zona: 3,
    nome: 'Zona 3 — Moderada / Aeróbica Ritmo',
    pctMin: 0.70,
    pctMax: 0.80,
    borg: 'Esforço moderado e firme (Escala 13-15)',
    beneficio: 'Melhora da capacidade cardiovascular e eficiência biomecânica. Respiração mais profunda.'
  },
  {
    zona: 4,
    nome: 'Zona 4 — Difícil / Limiar Anaeróbico (Lactato)',
    pctMin: 0.80,
    pctMax: 0.90,
    borg: 'Esforço vigoroso e intenso (Escala 15-17)',
    beneficio: 'Aumenta a tolerância ao ácido lático e eleva a velocidade de sustentação em provas.'
  },
  {
    zona: 5,
    nome: 'Zona 5 — Máxima / Potência Anaeróbica',
    pctMin: 0.90,
    pctMax: 1.00,
    borg: 'Esforço exaustivo máximo (Escala 17-20)',
    beneficio: 'Desenvolvimento neuromuscular, aceleração máxima e capacidade anaeróbica láctica (sprints curtos).'
  }
]);

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
 * Converte segundos totais para string formatada de tempo "HH:MM:SS" ou "MM:SS".
 *
 * @param {number} totalSeconds
 * @returns {string}
 */
export function formatTimeSeconds(totalSeconds) {
  if (!Number.isFinite(totalSeconds) || totalSeconds < 0) return '00:00';
  const sec = Math.round(totalSeconds);
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;

  const mm = String(m).padStart(2, '0');
  const ss = String(s).padStart(2, '0');

  if (h > 0) {
    const hh = String(h).padStart(2, '0');
    return `${hh}:${mm}:${ss}`;
  }
  return `${mm}:${ss}`;
}

/**
 * Converte pace em segundos/km para formato "M'SS\" / km".
 *
 * @param {number} paceSecondsPerKm
 * @returns {string}
 */
export function formatPace(paceSecondsPerKm) {
  if (!Number.isFinite(paceSecondsPerKm) || paceSecondsPerKm <= 0) return '—';
  const sec = Math.round(paceSecondsPerKm);
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, '0')} min/km`;
}

/**
 * Calcula a frequência cardíaca máxima via Tanaka et al. (2001).
 * FCmáx = 208 - (0.7 × idade)
 *
 * @param {number} ageYears
 * @returns {number}
 */
export function calculateMaxHeartRateTanaka(ageYears) {
  return 208 - (0.7 * ageYears);
}

/**
 * Calcula a cinemática de corrida (ritmo, velocidade e projeções).
 *
 * @param {Object} inputs
 * @param {number|string} inputs.distanciaKm Distância em km
 * @param {number|string} [inputs.horas] Horas de duração
 * @param {number|string} [inputs.minutos] Minutos de duração
 * @param {number|string} [inputs.segundos] Segundos de duração
 * @returns {{ ok: boolean, error?: string, data?: Object }}
 */
export function calculateRunningPace(inputs = {}) {
  const distanciaKm = parseNumberLocale(inputs.distanciaKm);
  if (Number.isNaN(distanciaKm) || distanciaKm <= 0 || distanciaKm > 1000) {
    return { ok: false, error: 'Informe uma distância válida maior que zero (até 1.000 km).' };
  }

  const h = Math.max(0, Math.floor(parseNumberLocale(inputs.horas) || 0));
  const m = Math.max(0, Math.floor(parseNumberLocale(inputs.minutos) || 0));
  const s = Math.max(0, Math.floor(parseNumberLocale(inputs.segundos) || 0));

  const totalSegundos = (h * 3600) + (m * 60) + s;
  if (totalSegundos <= 0 || totalSegundos > 86400 * 7) {
    return { ok: false, error: 'Informe um tempo de duração válido maior que zero.' };
  }

  // Ritmo (Pace) em segundos por km
  const paceSecondsPerKm = totalSegundos / distanciaKm;
  const paceSecondsPerMile = paceSecondsPerKm * KM_POR_MILHA;

  // Velocidade em km/h e mph
  const horasTotais = totalSegundos / 3600;
  const velocidadeKmh = Number((distanciaKm / horasTotais).toFixed(2));
  const velocidadeMph = Number((velocidadeKmh / KM_POR_MILHA).toFixed(2));

  // Tabela de projeções de prova com o mesmo ritmo
  const projecoesProvas = DISTANCIAS_PADRAO.map(d => ({
    id: d.id,
    nome: d.nome,
    km: d.km,
    tempoFormatado: formatTimeSeconds(paceSecondsPerKm * d.km)
  }));

  return {
    ok: true,
    data: {
      distanciaKm,
      totalSegundos,
      tempoFormatado: formatTimeSeconds(totalSegundos),
      paceSecondsPerKm,
      paceKmFormatado: formatPace(paceSecondsPerKm),
      paceMileFormatado: `${formatTimeSeconds(paceSecondsPerMile)} min/mi`,
      velocidadeKmh,
      velocidadeMph,
      projecoesProvas
    }
  };
}

/**
 * Calcula as zonas de frequência cardíaca para treinamento.
 *
 * @param {Object} inputs
 * @param {number|string} inputs.idade Idade em anos (10 a 120)
 * @param {number|string} [inputs.fcRepouso] Frequência cardíaca de repouso opcional (30 a 120 bpm)
 * @returns {{ ok: boolean, error?: string, data?: Object }}
 */
export function calculateHeartRateZones(inputs = {}) {
  const idade = Math.round(parseNumberLocale(inputs.idade));
  if (Number.isNaN(idade) || idade < 10 || idade > 120) {
    return { ok: false, error: 'Informe uma idade válida entre 10 e 120 anos.' };
  }

  const fcMaxTanaka = Math.round(calculateMaxHeartRateTanaka(idade));
  const fcMaxFox = Math.round(220 - idade);

  const fcRepousoRaw = inputs.fcRepouso !== undefined && inputs.fcRepouso !== null && String(inputs.fcRepouso).trim() !== ''
    ? Math.round(parseNumberLocale(inputs.fcRepouso))
    : null;

  let metodo = 'Porcentagem Direta da FC Máx (Tanaka et al.)';
  let fcReserva = null;
  if (fcRepousoRaw !== null) {
    if (fcRepousoRaw < 30 || fcRepousoRaw > 120) {
      return { ok: false, error: 'A frequência cardíaca de repouso deve estar entre 30 e 120 bpm.' };
    }
    if (fcRepousoRaw >= fcMaxTanaka) {
      return { ok: false, error: 'A FC de repouso deve ser inferior à FC máxima estimada.' };
    }
    fcReserva = fcMaxTanaka - fcRepousoRaw;
    metodo = 'Método de Karvonen (FC de Reserva)';
  }

  // Cálculo das 5 zonas
  const zonas = ZONAS_CARDIO.map(z => {
    let bpmMin = 0;
    let bpmMax = 0;

    if (fcReserva !== null && fcRepousoRaw !== null) {
      bpmMin = Math.round(fcRepousoRaw + (fcReserva * z.pctMin));
      bpmMax = Math.round(fcRepousoRaw + (fcReserva * z.pctMax));
    } else {
      bpmMin = Math.round(fcMaxTanaka * z.pctMin);
      bpmMax = Math.round(fcMaxTanaka * z.pctMax);
    }

    return {
      zona: z.zona,
      nome: z.nome,
      pctMin: Math.round(z.pctMin * 100),
      pctMax: Math.round(z.pctMax * 100),
      bpmMin,
      bpmMax,
      faixaBpm: `${bpmMin} a ${bpmMax} bpm`,
      borg: z.borg,
      beneficio: z.beneficio
    };
  });

  return {
    ok: true,
    data: {
      idade,
      fcRepouso: fcRepousoRaw,
      fcMaxTanaka,
      fcMaxFox,
      fcReserva,
      metodo,
      zonas
    }
  };
}

/**
 * Constrói texto para copiar e compartilhar resultados.
 *
 * @param {Object} paceResult
 * @param {Object} cardioResult
 * @returns {string}
 */
export function buildCopyText(paceResult, cardioResult) {
  const linhas = [
    '=== RITMO DE CORRIDA E ZONAS CARDÍACAS — CALCULADORA MASTER ==='
  ];

  if (paceResult && paceResult.ok && paceResult.data) {
    const p = paceResult.data;
    linhas.push('--- Cinemática de Corrida ---');
    linhas.push(`• Distância: ${p.distanciaKm} km | Duração: ${p.tempoFormatado}`);
    linhas.push(`• Ritmo Médio (Pace): ${p.paceKmFormatado} (${p.paceMileFormatado})`);
    linhas.push(`• Velocidade Média: ${p.velocidadeKmh.toLocaleString('pt-BR')} km/h (${p.velocidadeMph.toLocaleString('pt-BR')} mph)`);
    linhas.push('');
    linhas.push('Projeções de Prova:');
    for (const proj of p.projecoesProvas) {
      linhas.push(`• ${proj.nome}: ${proj.tempoFormatado}`);
    }
  }

  if (cardioResult && cardioResult.ok && cardioResult.data) {
    const c = cardioResult.data;
    linhas.push('');
    linhas.push('--- Zonas de Treinamento Cardíaco ---');
    linhas.push(`FC Máxima Estimada: ${c.fcMaxTanaka} bpm (Tanaka et al.)`);
    if (c.fcRepouso) linhas.push(`FC de Repouso: ${c.fcRepouso} bpm (Karvonen)`);
    linhas.push('');
    for (const z of c.zonas) {
      linhas.push(`• ${z.nome}: ${z.faixaBpm} (${z.pctMin}% a ${z.pctMax}%)`);
    }
  }

  linhas.push('');
  linhas.push('Calcule online em: https://www.calculadoramaster.com/tools/saude/ritmo-corrida-zonas-frequencia-cardiaca.html');
  linhas.push('Aviso: As zonas cardíacas são estimativas populacionais. Consulte médico cardiologista para teste ergoespirométrico.');

  return linhas.join('\n');
}

/**
 * Formata resumo das principais métricas.
 *
 * @param {Object} paceResult
 * @returns {Array<{ label: string, value: string }>}
 */
export function formatResult(paceResult) {
  if (!paceResult || !paceResult.ok || !paceResult.data) return [];
  const p = paceResult.data;
  return [
    { label: 'Ritmo Médio (Pace)', value: p.paceKmFormatado },
    { label: 'Velocidade Média', value: `${p.velocidadeKmh.toLocaleString('pt-BR')} km/h` },
    { label: 'Tempo Meia Maratona (21k)', value: p.projecoesProvas[4].tempoFormatado },
    { label: 'Tempo Maratona (42k)', value: p.projecoesProvas[5].tempoFormatado }
  ];
}

/**
 * Inicializa a ferramenta no DOM.
 */
export function setupTool() {
  if (typeof document === 'undefined') return;

  const form = document.getElementById('formRitmoCorrida');
  if (!form) return;

  const inputDistancia = document.getElementById('distanciaKm');
  const inputHoras = document.getElementById('tempoHoras');
  const inputMinutos = document.getElementById('tempoMinutos');
  const inputSegundos = document.getElementById('tempoSegundos');

  const inputIdade = document.getElementById('idadeCardio');
  const inputFcRepouso = document.getElementById('fcRepouso');

  const btnCalcular = document.getElementById('btnCalcularRitmo');
  const btnLimpar = document.getElementById('btnLimparRitmo');
  const erroBox = document.getElementById('erroRitmo');
  const resultadoSecao = document.getElementById('resultadoRitmo');

  const resPacePrincipal = document.getElementById('resPacePrincipal');
  const resPaceMilha = document.getElementById('resPaceMilha');
  const resVelocidadeKmh = document.getElementById('resVelocidadeKmh');
  const resVelocidadeMph = document.getElementById('resVelocidadeMph');

  const tabelaProvasBody = document.querySelector('#tabelaProvasCorrida tbody');
  const tabelaZonasCardioBody = document.querySelector('#tabelaZonasCardio tbody');
  const resCardioInfo = document.getElementById('resCardioInfo');

  const acoesContainer = document.getElementById('acoesResultadoRitmo');
  const statusAcoes = document.getElementById('statusAcoesRitmo');

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

    const paceRes = calculateRunningPace({
      distanciaKm: inputDistancia ? inputDistancia.value : '',
      horas: inputHoras ? inputHoras.value : '0',
      minutos: inputMinutos ? inputMinutos.value : '0',
      segundos: inputSegundos ? inputSegundos.value : '0'
    });

    if (!paceRes.ok) {
      exibirErro(paceRes.error || 'Ocorreu um erro no cálculo de ritmo de corrida.');
      return;
    }

    let cardioRes = null;
    const idadeStr = inputIdade ? inputIdade.value.trim() : '';
    if (idadeStr) {
      cardioRes = calculateHeartRateZones({
        idade: idadeStr,
        fcRepouso: inputFcRepouso ? inputFcRepouso.value : ''
      });
      if (!cardioRes.ok) {
        exibirErro(cardioRes.error || 'Ocorreu um erro no cálculo das zonas cardíacas.');
        return;
      }
    }

    const p = paceRes.data;

    if (resPacePrincipal) resPacePrincipal.textContent = p.paceKmFormatado;
    if (resPaceMilha) resPaceMilha.textContent = p.paceMileFormatado;
    if (resVelocidadeKmh) resVelocidadeKmh.textContent = `${p.velocidadeKmh.toLocaleString('pt-BR')} km/h`;
    if (resVelocidadeMph) resVelocidadeMph.textContent = `${p.velocidadeMph.toLocaleString('pt-BR')} mph`;

    // Tabela de projeções de provas
    if (tabelaProvasBody) {
      tabelaProvasBody.innerHTML = '';
      for (const proj of p.projecoesProvas) {
        const tr = document.createElement('tr');

        const tdProva = document.createElement('td');
        const strong = document.createElement('strong');
        strong.textContent = proj.nome;
        tdProva.appendChild(strong);

        const tdDist = document.createElement('td');
        tdDist.textContent = `${proj.km} km`;

        const tdTempo = document.createElement('td');
        const strongTempo = document.createElement('strong');
        strongTempo.textContent = proj.tempoFormatado;
        tdTempo.appendChild(strongTempo);

        tr.appendChild(tdProva);
        tr.appendChild(tdDist);
        tr.appendChild(tdTempo);
        tabelaProvasBody.appendChild(tr);
      }
    }

    // Tabela de Zonas Cardíacas
    if (tabelaZonasCardioBody && resCardioInfo) {
      tabelaZonasCardioBody.innerHTML = '';
      if (cardioRes && cardioRes.data) {
        const c = cardioRes.data;
        resCardioInfo.textContent = `FC Máxima estimada: ${c.fcMaxTanaka} bpm (${c.metodo})`;

        for (const z of c.zonas) {
          const tr = document.createElement('tr');

          const tdZona = document.createElement('td');
          const strongZ = document.createElement('strong');
          strongZ.textContent = `Zona ${z.zona}`;
          tdZona.appendChild(strongZ);
          const pBeneficio = document.createElement('div');
          pBeneficio.className = 'table-subtext';
          pBeneficio.textContent = z.beneficio;
          tdZona.appendChild(pBeneficio);

          const tdPct = document.createElement('td');
          tdPct.textContent = `${z.pctMin}% - ${z.pctMax}%`;

          const tdBpm = document.createElement('td');
          const strongBpm = document.createElement('strong');
          strongBpm.textContent = z.faixaBpm;
          tdBpm.appendChild(strongBpm);

          const tdBorg = document.createElement('td');
          tdBorg.textContent = z.borg;

          tr.appendChild(tdZona);
          tr.appendChild(tdPct);
          tr.appendChild(tdBpm);
          tr.appendChild(tdBorg);
          tabelaZonasCardioBody.appendChild(tr);
        }
      } else {
        resCardioInfo.textContent = 'Informe sua idade no formulário acima para visualizar as zonas de frequência cardíaca.';
      }
    }

    // Ações
    if (acoesContainer) {
      acoesContainer.innerHTML = '';
      createResultActions(acoesContainer, {
        toolId: 'ritmo-corrida-zonas-frequencia-cardiaca',
        resultText: buildCopyText(paceRes, cardioRes),
        shareTitle: 'Meu Ritmo de Corrida e Zonas Cardíacas - Calculadora Master',
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
