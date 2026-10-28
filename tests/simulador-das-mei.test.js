import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  TABELA_PARAMETROS_ANO,
  TIPOS_ATIVIDADE,
  formatCurrency,
  parseMoneyToCents,
  calculateDasMei,
  buildCopyText,
  formatResult,
  setupTool
} from '../js/tools/simulador-das-mei.js';

import { VALID_TOOL_IDS } from '../js/core/favorites.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

/* ==========================================================================
 * 1. Cada tipo de atividade contemplado (2026)
 * ========================================================================== */
test('1. Atividades contempladas: Comércio/Indústria, Serviços e Misto (MEI Geral 2026)', () => {
  assert.equal(TABELA_PARAMETROS_ANO[2026].baseLegal, 'Decreto Federal nº 12.797, de 23 de dezembro de 2025');

  // Comércio / Indústria: INSS 5% (R$ 81,05) + ICMS (R$ 1,00) = R$ 82,05
  const resComercio = calculateDasMei({ ano: 2026, atividade: 'comercio_industria' });
  assert.equal(resComercio.ok, true);
  assert.equal(resComercio.data.baseLegal, 'Decreto Federal nº 12.797, de 23 de dezembro de 2025');
  assert.equal(resComercio.data.inssCentavos, 8105);
  assert.equal(resComercio.data.icmsCentavos, 100);
  assert.equal(resComercio.data.issCentavos, 0);
  assert.equal(resComercio.data.totalMensalCentavos, 8205);
  assert.equal(resComercio.data.totalMensal, 82.05);

  // Prestação de Serviços: INSS 5% (R$ 81,05) + ISS (R$ 5,00) = R$ 86,05
  const resServicos = calculateDasMei({ ano: 2026, atividade: 'servicos' });
  assert.equal(resServicos.ok, true);
  assert.equal(resServicos.data.inssCentavos, 8105);
  assert.equal(resServicos.data.icmsCentavos, 0);
  assert.equal(resServicos.data.issCentavos, 500);
  assert.equal(resServicos.data.totalMensalCentavos, 8605);
  assert.equal(resServicos.data.totalMensal, 86.05);

  // Comércio e Serviços: INSS 5% (R$ 81,05) + ICMS (R$ 1,00) + ISS (R$ 5,00) = R$ 87,05
  const resMisto = calculateDasMei({ ano: 2026, atividade: 'comercio_servicos' });
  assert.equal(resMisto.ok, true);
  assert.equal(resMisto.data.inssCentavos, 8105);
  assert.equal(resMisto.data.icmsCentavos, 100);
  assert.equal(resMisto.data.issCentavos, 500);
  assert.equal(resMisto.data.totalMensalCentavos, 8705);
  assert.equal(resMisto.data.totalMensal, 87.05);
});

/* ==========================================================================
 * 2. MEI Caminhoneiro (LC nº 188/2021)
 * ========================================================================== */
test('2. MEI Caminhoneiro (LC 188/2021): Alíquota previdenciária de 12% em todas as rotas (2026)', () => {
  // Salário 2026: R$ 1.621,00 * 0.12 = R$ 194,52
  // Cargas Intermunicipal/Interestadual (ICMS R$ 1,00) = R$ 195,52
  const resCargas = calculateDasMei({ ano: 2026, atividade: 'caminhoneiro_cargas' });
  assert.equal(resCargas.ok, true);
  assert.equal(resCargas.data.tipoMei, 'caminhoneiro');
  assert.equal(resCargas.data.aliquotaInssPercentual, 12);
  assert.equal(resCargas.data.inssCentavos, 19452);
  assert.equal(resCargas.data.icmsCentavos, 100);
  assert.equal(resCargas.data.issCentavos, 0);
  assert.equal(resCargas.data.totalMensalCentavos, 19552);

  // Municipal (ISS R$ 5,00) = R$ 199,52
  const resMunicipal = calculateDasMei({ ano: 2026, atividade: 'caminhoneiro_municipal' });
  assert.equal(resMunicipal.ok, true);
  assert.equal(resMunicipal.data.inssCentavos, 19452);
  assert.equal(resMunicipal.data.icmsCentavos, 0);
  assert.equal(resMunicipal.data.issCentavos, 500);
  assert.equal(resMunicipal.data.totalMensalCentavos, 19952);

  // Misto (ICMS R$ 1,00 + ISS R$ 5,00) = R$ 200,52
  const resMistoCam = calculateDasMei({ ano: 2026, atividade: 'caminhoneiro_misto' });
  assert.equal(resMistoCam.ok, true);
  assert.equal(resMistoCam.data.inssCentavos, 19452);
  assert.equal(resMistoCam.data.icmsCentavos, 100);
  assert.equal(resMistoCam.data.issCentavos, 500);
  assert.equal(resMistoCam.data.totalMensalCentavos, 20052);
});

/* ==========================================================================
 * 3. Anos de referência 2024 e 2025 com dados oficiais conferidos
 * ========================================================================== */
test('3. Anos de referência 2024 e 2025: Valores oficiais exatos', () => {
  // --- 2024 (Salário Mínimo R$ 1.412,00) ---
  // INSS Comum (5%): R$ 70,60
  // INSS Caminhoneiro (12%): R$ 169,44
  const c2024 = calculateDasMei({ ano: 2024, atividade: 'comercio_industria' });
  assert.equal(c2024.data.inssCentavos, 7060);
  assert.equal(c2024.data.totalMensalCentavos, 7160); // 70.60 + 1.00 = 71.60

  const s2024 = calculateDasMei({ ano: 2024, atividade: 'servicos' });
  assert.equal(s2024.data.totalMensalCentavos, 7560); // 70.60 + 5.00 = 75.60

  const cs2024 = calculateDasMei({ ano: 2024, atividade: 'comercio_servicos' });
  assert.equal(cs2024.data.totalMensalCentavos, 7660); // 70.60 + 6.00 = 76.60

  const cam2024 = calculateDasMei({ ano: 2024, atividade: 'caminhoneiro_cargas' });
  assert.equal(cam2024.data.inssCentavos, 16944);
  assert.equal(cam2024.data.totalMensalCentavos, 17044); // 169.44 + 1.00 = 170.44

  // --- 2025 (Salário Mínimo R$ 1.518,00) ---
  // INSS Comum (5%): R$ 75,90
  // INSS Caminhoneiro (12%): R$ 182,16
  const c2025 = calculateDasMei({ ano: 2025, atividade: 'comercio_industria' });
  assert.equal(c2025.data.inssCentavos, 7590);
  assert.equal(c2025.data.totalMensalCentavos, 7690); // 75.90 + 1.00 = 76.90

  const s2025 = calculateDasMei({ ano: 2025, atividade: 'servicos' });
  assert.equal(s2025.data.totalMensalCentavos, 8090); // 75.90 + 5.00 = 80.90

  const cs2025 = calculateDasMei({ ano: 2025, atividade: 'comercio_servicos' });
  assert.equal(cs2025.data.totalMensalCentavos, 8190); // 75.90 + 6.00 = 81.90

  const cam2025 = calculateDasMei({ ano: 2025, atividade: 'caminhoneiro_cargas' });
  assert.equal(cam2025.data.inssCentavos, 18216);
  assert.equal(cam2025.data.totalMensalCentavos, 18316); // 182.16 + 1.00 = 183.16
});

/* ==========================================================================
 * 4. Validação e rejeição de entradas inválidas
 * ========================================================================== */
test('4. Validação de erros: anos inválidos, atividades inexistentes e meses fora do intervalo', () => {
  // Ano inexistente
  assert.equal(calculateDasMei({ ano: 2020, atividade: 'servicos' }).ok, false);
  assert.equal(calculateDasMei({ ano: 2030, atividade: 'servicos' }).ok, false);
  assert.equal(calculateDasMei({ ano: 'abc', atividade: 'servicos' }).ok, false);

  // Atividade inválida
  assert.equal(calculateDasMei({ ano: 2026, atividade: '' }).ok, false);
  assert.equal(calculateDasMei({ ano: 2026, atividade: 'astronauta' }).ok, false);
  assert.equal(calculateDasMei({ ano: 2026, atividade: null }).ok, false);

  // Meses de projeção inválidos
  assert.equal(calculateDasMei({ ano: 2026, atividade: 'servicos', mesesPersonalizados: 0 }).ok, false);
  assert.equal(calculateDasMei({ ano: 2026, atividade: 'servicos', mesesPersonalizados: 13 }).ok, false);
  assert.equal(calculateDasMei({ ano: 2026, atividade: 'servicos', mesesPersonalizados: 6.5 }).ok, false);
});

/* ==========================================================================
 * 5. Coerência entre valor mensal e estimativa anual
 * ========================================================================== */
test('5. Coerência entre valor mensal e anual para diferentes horizontes de meses', () => {
  for (const meses of [1, 3, 6, 9, 12]) {
    const res = calculateDasMei({ ano: 2026, atividade: 'servicos', mesesPersonalizados: meses });
    assert.equal(res.ok, true);
    assert.equal(res.data.totalAnualCentavos, res.data.totalMensalCentavos * meses);
    assert.equal(res.data.totalAnual, (res.data.totalMensalCentavos * meses) / 100);
  }
});

/* ==========================================================================
 * 6. Utilitários de parsing e formatação monetária
 * ========================================================================== */
test('6. Utilitários: parseMoneyToCents e formatCurrency', () => {
  assert.equal(parseMoneyToCents(82.05), 8205);
  assert.equal(parseMoneyToCents('82,05'), 8205);
  assert.equal(parseMoneyToCents('R$ 1.621,00'), 162100);
  assert.equal(parseMoneyToCents(0), 0);
  assert.equal(parseMoneyToCents(null), 0);
  assert.ok(Number.isNaN(parseMoneyToCents('invalido')));

  const formatado = formatCurrency(82.05);
  assert.match(formatado, /82,05/);
  assert.equal(formatCurrency(NaN), 'R$ 0,00');
});

/* ==========================================================================
 * 7. Memória de cálculo, avisos legais e buildCopyText
 * ========================================================================== */
test('7. Memória de cálculo detalhada, avisos legais e exportação de texto para cópia', () => {
  const res = calculateDasMei({ ano: 2026, atividade: 'comercio_servicos' });
  assert.equal(res.ok, true);
  assert.ok(res.data.memoriaCalculo.length >= 5);
  assert.ok(res.data.avisos.length >= 5);

  const copyText = buildCopyText(res);
  assert.match(copyText, /SIMULADOR DE DAS DO MEI/);
  assert.match(copyText, /Ano de Referência: 2026/);
  assert.match(copyText, /VALOR MENSAL DO DAS/);
  assert.match(copyText, /87,05/);
  assert.match(copyText, /Portal do Empreendedor/);

  const formatado = formatResult(res);
  assert.equal(formatado, copyText);
});

/* ==========================================================================
 * 8. Integração DOM via setupTool
 * ========================================================================== */
test('8. setupTool: Manipulação do DOM, recálculo, limpeza e interações', () => {
  const listeners = {};
  function createElementMock(id, tagName = 'div', value = '') {
    return {
      id,
      tagName,
      value,
      textContent: '',
      hidden: false,
      attributes: {},
      children: [],
      setAttribute(k, v) { this.attributes[k] = v; },
      getAttribute(k) { return this.attributes[k]; },
      focus() {},
      reset() { this.value = ''; },
      innerHTML: '',
      appendChild(child) { this.children.push(child); },
      addEventListener(evt, fn) {
        listeners[`${id}:${evt}`] = fn;
      }
    };
  }

  const elements = {
    formDasMei: createElementMock('formDasMei', 'form'),
    anoReferencia: createElementMock('anoReferencia', 'select', '2026'),
    atividadeEconomica: createElementMock('atividadeEconomica', 'select', 'servicos'),
    mesesProjecao: createElementMock('mesesProjecao', 'select', '12'),
    btnCalcular: createElementMock('btnCalcular', 'button'),
    btnLimpar: createElementMock('btnLimpar', 'button'),
    resultadoSecao: createElementMock('resultadoSecao', 'section'),
    resultadoTotalMensal: createElementMock('resultadoTotalMensal', 'span'),
    resultadoInss: createElementMock('resultadoInss', 'span'),
    resultadoIcms: createElementMock('resultadoIcms', 'span'),
    resultadoIss: createElementMock('resultadoIss', 'span'),
    resultadoTotalAnual: createElementMock('resultadoTotalAnual', 'span'),
    rotuloTotalAnual: createElementMock('rotuloTotalAnual', 'span'),
    listaMemoriaCalculo: createElementMock('listaMemoriaCalculo', 'ul'),
    painelAvisos: createElementMock('painelAvisos', 'div'),
    painelErros: createElementMock('painelErros', 'div'),
    toolActionsContainer: createElementMock('toolActionsContainer', 'div')
  };

  const originalDocument = globalThis.document;
  const originalWindow = globalThis.window;

  globalThis.document = {
    getElementById: (id) => elements[id] || null,
    createElement: (tag) => createElementMock(`mock-${tag}-${Math.random()}`, tag)
  };
  globalThis.window = {
    location: { href: 'https://www.calculadoramaster.com/tools/financas/simulador-das-mei.html' },
    print: () => {}
  };

  try {
    const controller = setupTool();
    assert.ok(controller, 'setupTool deve retornar objeto com métodos de controle');

    // Executa cálculo inicial
    const res = controller.executarCalculo();
    assert.equal(res.ok, true);
    assert.match(elements.resultadoTotalMensal.textContent, /86,05/);
    assert.equal(elements.resultadoSecao.hidden, false);

    // Altera atividade para comércio e recalcula
    elements.atividadeEconomica.value = 'comercio_industria';
    controller.executarCalculo();
    assert.match(elements.resultadoTotalMensal.textContent, /82,05/);

    // Limpa os campos
    controller.limparTudo();
    assert.equal(elements.resultadoSecao.hidden, true);
    assert.equal(controller.getUltimoResultado(), null);
  } finally {
    globalThis.document = originalDocument;
    globalThis.window = originalWindow;
  }
});

/* ==========================================================================
 * 9. Catálogo e Favoritos
 * ========================================================================== */
test('9. Catálogo e Favoritos: Integridade do registro oficial', () => {
  // Catálogo data/tools.json
  const toolsJsonPath = path.join(ROOT_DIR, 'data', 'tools.json');
  const tools = JSON.parse(fs.readFileSync(toolsJsonPath, 'utf-8'));
  const toolEntry = tools.find(t => t.id === 'simulador-das-mei');

  assert.ok(toolEntry, 'simulador-das-mei deve constar em data/tools.json');
  assert.equal(toolEntry.slug, 'simulador-das-mei');
  assert.equal(toolEntry.categorySlug, 'financas');
  assert.equal(toolEntry.status, 'published');
  assert.equal(toolEntry.formulaStatus, 'verified');
  assert.equal(toolEntry.implementation, 'factory');
  assert.equal(toolEntry.url, '/tools/financas/simulador-das-mei.html');

  // VALID_TOOL_IDS em js/core/favorites.js
  assert.ok(VALID_TOOL_IDS.has('simulador-das-mei'), 'simulador-das-mei deve ser reconhecido em VALID_TOOL_IDS');
});

/* ==========================================================================
 * 10. Integridade do template e padrões da página (sem inline style)
 * ========================================================================== */
test('10. Template HTML: conformidade com o padrão visual e semântica', () => {
  const pagePath = path.join(ROOT_DIR, 'src', 'pages', 'tools', 'financas', 'simulador-das-mei.page.html');
  assert.ok(fs.existsSync(pagePath), 'O arquivo da página .page.html deve existir');

  const content = fs.readFileSync(pagePath, 'utf-8');

  // Metadados Frontmatter
  assert.match(content, /layout:\s*tool/);
  assert.match(content, /pageScripts:\s*<script type="module" src="{{ROOT_PREFIX}}js\/tools\/simulador-das-mei\.js"><\/script>/);
  assert.match(content, /canonical:\s*https:\/\/www\.calculadoramaster\.com\/tools\/financas\/simulador-das-mei\.html/);

  // Semântica e Acessibilidade
  assert.match(content, /<form id="formDasMei"/);
  assert.match(content, /aria-describedby="ajudaAnoReferencia"/);
  assert.match(content, /aria-describedby="ajudaAtividadeEconomica"/);
  assert.match(content, /id="resultadoSecao"/);
  assert.match(content, /aria-live="polite"/);
  assert.match(content, /role="alert"|aria-live="assertive"/);

  // Proibição de estilos inline
  assert.doesNotMatch(content, /style\s*=/, 'Não deve conter atributo de estilo inline');

  // Base Legal e Diferenciação dos Anos (Decreto 12.797/2025, 12.339/2024, 11.864/2023)
  assert.match(content, /Decreto 12\.797\/2025/, 'Deve referenciar o Decreto 12.797/2025 para 2026');
  assert.match(content, /Decreto 12\.339\/2024/, 'Deve referenciar o Decreto 12.339/2024 para 2025');
  assert.match(content, /Decreto 11\.864\/2023/, 'Deve referenciar o Decreto 11.864/2023 para 2024');
  assert.match(content, /SIMPLESNACIONAL\/noticias\/NoticiaCompleta\.aspx\?id=c3b2044c-ff97-432a-b33c-ecf2a3df6dc3/, 'Deve conter o link oficial da Receita Federal sobre o DAS-MEI 2026');
});
