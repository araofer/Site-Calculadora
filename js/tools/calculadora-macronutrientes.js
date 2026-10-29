/**
 * Calculadora de Macronutrientes — Calculadora Master
 *
 * Módulo puro e desacoplado para distribuição calórica em macronutrientes
 * (Proteínas, Carboidratos e Gorduras) em gramas, calorias e g/kg de peso.
 *
 * Premissas científicas e Fatores de Atwater:
 * - Proteínas: 4 kcal por grama
 * - Carboidratos: 4 kcal por grama
 * - Gorduras (Lipídios): 9 kcal por grama
 * - Fibras alimentares: recomendação de 14g a cada 1.000 kcal consumidas (IOM/DRI).
 *
 * Opções ilustrativas de distribuição (para adultos sadios):
 * 1. Equilibrada (AMDR/IOM para adultos): 50% Carbs, 20% Proteínas, 30% Gorduras
 * 2. Emagrecimento Hiperproteico: 40% Carbs, 35% Proteínas, 25% Gorduras
 * 3. Hipertrofia / Performance: 55% Carbs, 25% Proteínas, 20% Gorduras
 * 4. Low Carb Moderada: 20% Carbs, 35% Proteínas, 45% Gorduras
 * 5. Cetogênica (Keto): 5% Carbs, 25% Proteínas, 70% Gorduras
 * 6. Personalizada (percentuais livres cuja soma resulte em 100%)
 *
 * Zero dependências externas e seguro para SSR.
 */

import { createResultActions } from '../core/result-actions.js';

export const FATORES_ENERGIA = Object.freeze({
  KCAL_POR_G_PROTEINA: 4,
  KCAL_POR_G_CARBOIDRATO: 4,
  KCAL_POR_G_GORDURA: 9,
  FIBRA_POR_1000_KCAL: 14 // Diretriz do Institute of Medicine (IOM)
});

export const OPCOES_DISTRIBUICAO = Object.freeze({
  equilibrada: {
    id: 'equilibrada',
    nome: 'Distribuição Equilibrada (Referência AMDR)',
    carbPct: 50,
    protPct: 20,
    gordPct: 30,
    descricao: 'Opção ilustrativa alinhada às faixas aceitáveis de macronutrientes (AMDR/IOM para adultos: 45–65% C, 10–35% P, 20–35% G).'
  },
  emagrecimento: {
    id: 'emagrecimento',
    nome: 'Maior Aporte Proteico (High Protein)',
    carbPct: 40,
    protPct: 35,
    gordPct: 25,
    descricao: 'Opção ilustrativa com maior teor proteico para auxiliar na saciedade e preservação de massa magra em déficit calórico.'
  },
  hipertrofia: {
    id: 'hipertrofia',
    nome: 'Hipertrofia e Performance (Mais Carboidratos)',
    carbPct: 55,
    protPct: 25,
    gordPct: 20,
    descricao: 'Opção ilustrativa rica em carboidratos para suporte a sessões de treino intenso e ressíntese de glicogênio.'
  },
  low_carb: {
    id: 'low_carb',
    nome: 'Low Carb Moderada',
    carbPct: 20,
    protPct: 35,
    gordPct: 45,
    descricao: 'Opção ilustrativa com restrição moderada de carboidratos e maior aporte de lipídios.'
  },
  cetogenica: {
    id: 'cetogenica',
    nome: 'Cetogênica Ilustrativa (Keto)',
    carbPct: 5,
    protPct: 25,
    gordPct: 70,
    descricao: 'Opção ilustrativa com restrição severa de carboidratos. Requer acompanhamento profissional.'
  },
  personalizada: {
    id: 'personalizada',
    nome: 'Distribuição Personalizada',
    carbPct: 40,
    protPct: 30,
    gordPct: 30,
    descricao: 'Defina manualmente os percentuais desejados para sua meta individual.'
  }
});

// Alias para preservar compatibilidade
export const PROTOCOLOS_DIETA = OPCOES_DISTRIBUICAO;

/**
 * Converte entradas numéricas com pontuação brasileira ou internacional.
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
 * Calcula a divisão de macronutrientes a partir de calorias diárias e protocolo escolhido.
 *
 * @param {Object} inputs
 * @param {number|string} inputs.calorias Calorias diárias totais (kcal/dia)
 * @param {number|string} [inputs.peso] Peso corporal em kg (opcional para cálculo de g/kg)
 * @param {string} [inputs.protocolo] Chave do protocolo em PROTOCOLOS_DIETA
 * @param {number|string} [inputs.carbPct] Percentual personalizado de carboidrato
 * @param {number|string} [inputs.protPct] Percentual personalizado de proteína
 * @param {number|string} [inputs.gordPct] Percentual personalizado de gordura
 * @param {number|string} [inputs.refeicoes] Número de refeições (padrão 4)
 * @returns {{ ok: boolean, error?: string, data?: Object }}
 */
export function calculateMacronutrients(inputs = {}) {
  const calorias = parseNumberLocale(inputs.calorias);
  if (Number.isNaN(calorias) || calorias < 500 || calorias > 10000) {
    return {
      ok: false,
      error: 'Informe um valor diário de calorias válido entre 500 e 10.000 kcal.'
    };
  }

  const peso = inputs.peso !== undefined && inputs.peso !== null && String(inputs.peso).trim() !== ''
    ? parseNumberLocale(inputs.peso)
    : null;

  if (peso !== null && (Number.isNaN(peso) || peso < 20 || peso > 350)) {
    return {
      ok: false,
      error: 'O peso corporal deve estar entre 20 e 350 kg.'
    };
  }

  const protocoloKey = (inputs.protocolo || 'equilibrada').toLowerCase().trim();
  const infoProtocolo = PROTOCOLOS_DIETA[protocoloKey] || PROTOCOLOS_DIETA.equilibrada;

  let carbPct = infoProtocolo.carbPct;
  let protPct = infoProtocolo.protPct;
  let gordPct = infoProtocolo.gordPct;

  if (protocoloKey === 'personalizada') {
    carbPct = parseNumberLocale(inputs.carbPct);
    protPct = parseNumberLocale(inputs.protPct);
    gordPct = parseNumberLocale(inputs.gordPct);

    if (Number.isNaN(carbPct) || Number.isNaN(protPct) || Number.isNaN(gordPct)) {
      return {
        ok: false,
        error: 'Informe percentuais numéricos válidos para carboidratos, proteínas e gorduras.'
      };
    }

    if (carbPct < 0 || protPct < 0 || gordPct < 0) {
      return { ok: false, error: 'Os percentuais não podem ser negativos.' };
    }

    const soma = Math.round(carbPct + protPct + gordPct);
    if (soma !== 100) {
      return {
        ok: false,
        error: `A soma dos percentuais deve ser exatamente 100% (atual: ${soma}%).`
      };
    }
  }

  const numRefeicoes = Math.min(Math.max(Math.round(parseNumberLocale(inputs.refeicoes) || 4), 1), 8);

  // Cálculo das calorias e gramas de cada macronutriente
  const kcalCarb = Math.round((calorias * carbPct) / 100);
  const kcalProt = Math.round((calorias * protPct) / 100);
  const kcalGord = Math.round((calorias * gordPct) / 100);

  const gCarb = Number((kcalCarb / FATORES_ENERGIA.KCAL_POR_G_CARBOIDRATO).toFixed(1));
  const gProt = Number((kcalProt / FATORES_ENERGIA.KCAL_POR_G_PROTEINA).toFixed(1));
  const gGord = Number((kcalGord / FATORES_ENERGIA.KCAL_POR_G_GORDURA).toFixed(1));

  // Estimativa de fibras diárias
  const gFibras = Number(((calorias / 1000) * FATORES_ENERGIA.FIBRA_POR_1000_KCAL).toFixed(1));

  // Cálculo de g/kg caso o peso seja informado
  let gKgCarb = null;
  let gKgProt = null;
  let gKgGord = null;

  if (peso !== null && peso > 0) {
    gKgCarb = Number((gCarb / peso).toFixed(2));
    gKgProt = Number((gProt / peso).toFixed(2));
    gKgGord = Number((gGord / peso).toFixed(2));
  }

  // Divisão por refeições
  const porRefeicao = {
    numero: numRefeicoes,
    kcal: Math.round(calorias / numRefeicoes),
    gCarb: Number((gCarb / numRefeicoes).toFixed(1)),
    gProt: Number((gProt / numRefeicoes).toFixed(1)),
    gGord: Number((gGord / numRefeicoes).toFixed(1))
  };

  // Avisos clínicos e de segurança
  const avisos = [];
  if (gordPct < 15) {
    avisos.push('Atenção: Dietas com menos de 15% de gorduras totais podem comprometer a absorção de vitaminas lipossolúveis (A, D, E, K) e a síntese hormonal.');
  }

  if (peso !== null && gKgProt < 0.8) {
    avisos.push(`Alerta: O consumo proteico estimado (${gKgProt} g/kg) está abaixo da recomendação básica diária da OMS para evitar desnutrição (0,8 g/kg).`);
  }

  if (peso !== null && gKgProt > 3.0) {
    avisos.push(`Aviso: O aporte proteico (${gKgProt} g/kg) é muito elevado. Certifique-se de manter excelente hidratação diária e realizar acompanhamento nutricional.`);
  }

  avisos.push('Aviso de Saúde: As faixas de referência (AMDR/IOM) são destinadas a adultos sadios. Indivíduos com doença renal crônica ou disfunção hepática não devem elevar o consumo proteico sem prescrição médica ou nefrológica.');

  return {
    ok: true,
    data: {
      caloriasTotal: Math.round(calorias),
      peso,
      protocolo: {
        id: infoProtocolo.id,
        nome: infoProtocolo.nome,
        descricao: infoProtocolo.descricao
      },
      percentuais: {
        carboidratos: carbPct,
        proteinas: protPct,
        gorduras: gordPct
      },
      macronutrientes: {
        carboidratos: {
          gramas: gCarb,
          kcal: kcalCarb,
          percentual: carbPct,
          gKg: gKgCarb
        },
        proteinas: {
          gramas: gProt,
          kcal: kcalProt,
          percentual: protPct,
          gKg: gKgProt
        },
        gorduras: {
          gramas: gGord,
          kcal: kcalGord,
          percentual: gordPct,
          gKg: gKgGord
        },
        fibras: {
          gramas: gFibras
        }
      },
      porRefeicao,
      avisos
    }
  };
}

/**
 * Constrói texto para cópia e compartilhamento.
 *
 * @param {Object} result
 * @returns {string}
 */
export function buildCopyText(result) {
  if (!result || !result.ok || !result.data) return '';
  const d = result.data;
  const m = d.macronutrientes;

  const linhas = [
    '=== CALCULADORA DE MACRONUTRIENTES — CALCULADORA MASTER ===',
    `Meta Energética Diária: ${d.caloriasTotal.toLocaleString('pt-BR')} kcal`,
    d.peso ? `Peso Corporal: ${d.peso} kg` : null,
    `Estratégia: ${d.protocolo.nome}`,
    '',
    '--- Distribuição Diária de Macronutrientes ---',
    `• Carboidratos (${m.carboidratos.percentual}%): ${m.carboidratos.gramas.toLocaleString('pt-BR')} g (${m.carboidratos.kcal.toLocaleString('pt-BR')} kcal)${m.carboidratos.gKg ? ` [${m.carboidratos.gKg.toLocaleString('pt-BR')} g/kg]` : ''}`,
    `• Proteínas (${m.proteinas.percentual}%): ${m.proteinas.gramas.toLocaleString('pt-BR')} g (${m.proteinas.kcal.toLocaleString('pt-BR')} kcal)${m.proteinas.gKg ? ` [${m.proteinas.gKg.toLocaleString('pt-BR')} g/kg]` : ''}`,
    `• Gorduras (${m.gorduras.percentual}%): ${m.gorduras.gramas.toLocaleString('pt-BR')} g (${m.gorduras.kcal.toLocaleString('pt-BR')} kcal)${m.gorduras.gKg ? ` [${m.gorduras.gKg.toLocaleString('pt-BR')} g/kg]` : ''}`,
    `• Fibras Recomendadas: ~${m.fibras.gramas.toLocaleString('pt-BR')} g/dia`,
    '',
    `--- Divisão por Refeição (${d.porRefeicao.numero} refeições/dia) ---`,
    `• Calorias por refeição: ~${d.porRefeicao.kcal.toLocaleString('pt-BR')} kcal`,
    `• Carboidratos: ~${d.porRefeicao.gCarb.toLocaleString('pt-BR')} g`,
    `• Proteínas: ~${d.porRefeicao.gProt.toLocaleString('pt-BR')} g`,
    `• Gorduras: ~${d.porRefeicao.gGord.toLocaleString('pt-BR')} g`,
    '',
    'Calcule online em: https://www.calculadoramaster.com/tools/saude/calculadora-macronutrientes.html',
    'Aviso: Estimativa educacional baseada nos Fatores Atwater (4-4-9 kcal/g). Consulte nutricionista.'
  ];

  return linhas.filter(l => l !== null).join('\n');
}

/**
 * Formata seções resumidas para exibição ou testes.
 *
 * @param {Object} result
 * @returns {Array<{ label: string, value: string }>}
 */
export function formatResult(result) {
  if (!result || !result.ok || !result.data) return [];
  const d = result.data;
  const m = d.macronutrientes;
  return [
    { label: 'Calorias Diárias', value: `${d.caloriasTotal.toLocaleString('pt-BR')} kcal` },
    { label: 'Carboidratos', value: `${m.carboidratos.gramas.toLocaleString('pt-BR')} g (${m.carboidratos.percentual}%)` },
    { label: 'Proteínas', value: `${m.proteinas.gramas.toLocaleString('pt-BR')} g (${m.proteinas.percentual}%)` },
    { label: 'Gorduras', value: `${m.gorduras.gramas.toLocaleString('pt-BR')} g (${m.gorduras.percentual}%)` },
    { label: 'Fibras Recomendadas', value: `${m.fibras.gramas.toLocaleString('pt-BR')} g` }
  ];
}

/**
 * Conecta e gerencia os elementos do DOM.
 */
export function setupTool() {
  if (typeof document === 'undefined') return;

  const form = document.getElementById('formMacronutrientes');
  if (!form) return;

  const inputCalorias = document.getElementById('caloriasMacro');
  const inputPeso = document.getElementById('pesoMacro');
  const selectProtocolo = document.getElementById('protocoloMacro');
  const selectRefeicoes = document.getElementById('refeicoesMacro');

  const grupoPersonalizado = document.getElementById('grupoPercentuaisPersonalizados');
  const inputCarbPct = document.getElementById('carbPct');
  const inputProtPct = document.getElementById('protPct');
  const inputGordPct = document.getElementById('gordPct');

  const btnCalcular = document.getElementById('btnCalcularMacro');
  const btnLimpar = document.getElementById('btnLimparMacro');
  const erroBox = document.getElementById('erroMacro');
  const resultadoSecao = document.getElementById('resultadoMacro');

  // Elementos do resultado
  const resCarbGramas = document.getElementById('resCarbGramas');
  const resCarbKcal = document.getElementById('resCarbKcal');
  const resCarbKg = document.getElementById('resCarbKg');

  const resProtGramas = document.getElementById('resProtGramas');
  const resProtKcal = document.getElementById('resProtKcal');
  const resProtKg = document.getElementById('resProtKg');

  const resGordGramas = document.getElementById('resGordGramas');
  const resGordKcal = document.getElementById('resGordKcal');
  const resGordKg = document.getElementById('resGordKg');

  const resFibras = document.getElementById('resFibras');
  const resKcalTotal = document.getElementById('resKcalTotal');
  const resBadgeProtocolo = document.getElementById('resBadgeProtocolo');

  const tabelaRefeicoesBody = document.querySelector('#tabelaRefeicoesMacro tbody');
  const avisosContainer = document.getElementById('avisosMacro');
  const acoesContainer = document.getElementById('acoesResultadoMacro');
  const statusAcoes = document.getElementById('statusAcoesMacro');

  function atualizarCamposProtocolo() {
    if (!selectProtocolo || !grupoPersonalizado) return;
    const isCustom = selectProtocolo.value === 'personalizada';
    grupoPersonalizado.hidden = !isCustom;
    if (inputCarbPct) inputCarbPct.required = isCustom;
    if (inputProtPct) inputProtPct.required = isCustom;
    if (inputGordPct) inputGordPct.required = isCustom;
  }

  if (selectProtocolo) {
    selectProtocolo.addEventListener('change', atualizarCamposProtocolo);
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
    atualizarCamposProtocolo();
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
      calorias: inputCalorias ? inputCalorias.value : '',
      peso: inputPeso ? inputPeso.value : '',
      protocolo: selectProtocolo ? selectProtocolo.value : 'equilibrada',
      carbPct: inputCarbPct ? inputCarbPct.value : '',
      protPct: inputProtPct ? inputProtPct.value : '',
      gordPct: inputGordPct ? inputGordPct.value : '',
      refeicoes: selectRefeicoes ? selectRefeicoes.value : '4'
    };

    const res = calculateMacronutrients(inputs);
    if (!res.ok) {
      exibirErro(res.error || 'Ocorreu um erro no cálculo de macronutrientes.');
      return;
    }

    const d = res.data;
    const m = d.macronutrientes;

    if (resKcalTotal) resKcalTotal.textContent = `${d.caloriasTotal.toLocaleString('pt-BR')} kcal`;
    if (resBadgeProtocolo) resBadgeProtocolo.textContent = d.protocolo.nome;

    // Carboidratos
    if (resCarbGramas) resCarbGramas.textContent = `${m.carboidratos.gramas.toLocaleString('pt-BR')} g`;
    if (resCarbKcal) resCarbKcal.textContent = `${m.carboidratos.kcal.toLocaleString('pt-BR')} kcal (${m.carboidratos.percentual}%)`;
    if (resCarbKg) {
      resCarbKg.textContent = m.carboidratos.gKg ? `${m.carboidratos.gKg.toLocaleString('pt-BR')} g/kg` : '—';
    }

    // Proteínas
    if (resProtGramas) resProtGramas.textContent = `${m.proteinas.gramas.toLocaleString('pt-BR')} g`;
    if (resProtKcal) resProtKcal.textContent = `${m.proteinas.kcal.toLocaleString('pt-BR')} kcal (${m.proteinas.percentual}%)`;
    if (resProtKg) {
      resProtKg.textContent = m.proteinas.gKg ? `${m.proteinas.gKg.toLocaleString('pt-BR')} g/kg` : '—';
    }

    // Gorduras
    if (resGordGramas) resGordGramas.textContent = `${m.gorduras.gramas.toLocaleString('pt-BR')} g`;
    if (resGordKcal) resGordKcal.textContent = `${m.gorduras.kcal.toLocaleString('pt-BR')} kcal (${m.gorduras.percentual}%)`;
    if (resGordKg) {
      resGordKg.textContent = m.gorduras.gKg ? `${m.gorduras.gKg.toLocaleString('pt-BR')} g/kg` : '—';
    }

    // Fibras
    if (resFibras) resFibras.textContent = `${m.fibras.gramas.toLocaleString('pt-BR')} g`;

    // Tabela de divisão por refeição
    if (tabelaRefeicoesBody) {
      tabelaRefeicoesBody.innerHTML = '';
      const r = d.porRefeicao;
      for (let i = 1; i <= r.numero; i++) {
        const tr = document.createElement('tr');

        const tdRef = document.createElement('td');
        const strong = document.createElement('strong');
        strong.textContent = `Refeição ${i}`;
        tdRef.appendChild(strong);

        const tdKcal = document.createElement('td');
        tdKcal.textContent = `~${r.kcal.toLocaleString('pt-BR')} kcal`;

        const tdCarb = document.createElement('td');
        tdCarb.textContent = `~${r.gCarb.toLocaleString('pt-BR')} g`;

        const tdProt = document.createElement('td');
        tdProt.textContent = `~${r.gProt.toLocaleString('pt-BR')} g`;

        const tdGord = document.createElement('td');
        tdGord.textContent = `~${r.gGord.toLocaleString('pt-BR')} g`;

        tr.appendChild(tdRef);
        tr.appendChild(tdKcal);
        tr.appendChild(tdCarb);
        tr.appendChild(tdProt);
        tr.appendChild(tdGord);
        tabelaRefeicoesBody.appendChild(tr);
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

    // Ações
    if (acoesContainer) {
      acoesContainer.innerHTML = '';
      createResultActions(acoesContainer, {
        toolId: 'calculadora-macronutrientes',
        resultText: buildCopyText(res),
        shareTitle: 'Minha Divisão de Macronutrientes - Calculadora Master',
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
