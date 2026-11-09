import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  arredondarMoeda,
  arredondarDecimal,
  parseDecimalPtBr,
  validarEntradasCorrida,
  calcularCustoKmELucroCorrida,
  getResultSections,
  setupTool
} from '../js/tools/custo-km-lucro-corrida.js';

describe('Calculadora de Custo por Quilômetro e Lucro por Corrida (#53)', () => {
  describe('Funções Utilitárias e Arredondamento', () => {
    it('arredondarMoeda deve arredondar com precisão para 2 casas e evitar -0', () => {
      assert.equal(arredondarMoeda(10.555), 10.56);
      assert.equal(arredondarMoeda(10.554), 10.55);
      assert.equal(arredondarMoeda(-0.0001), 0);
      assert.equal(arredondarMoeda(NaN), 0);
      assert.equal(arredondarMoeda(Infinity), 0);
    });

    it('arredondarDecimal deve arredondar para a quantidade de casas indicada', () => {
      assert.equal(arredondarDecimal(1.23456, 2), 1.23);
      assert.equal(arredondarDecimal(1.23456, 4), 1.2346);
      assert.equal(arredondarDecimal(-0.00001, 2), 0);
    });

    it('parseDecimalPtBr deve interpretar números, strings com vírgula e ponto', () => {
      assert.equal(parseDecimalPtBr(12.5), 12.5);
      assert.equal(parseDecimalPtBr('12,5'), 12.5);
      assert.equal(parseDecimalPtBr(' 10.0 '), 10.0);
      assert.equal(parseDecimalPtBr('35%'), 35);
      assert.equal(isNaN(parseDecimalPtBr('')), true);
      assert.equal(isNaN(parseDecimalPtBr(null)), true);
      assert.equal(isNaN(parseDecimalPtBr('abc')), true);
    });
  });

  describe('Cálculo com Modalidade A (Valor Bruto + Taxas do App)', () => {
    it('deve calcular corretamente corrida lucrativa com retorno vazio', () => {
      // Exemplo validado:
      // Corrida 12 km + 3 km retorno = 15 km total
      // Bruto R$ 40,00 | Taxa app 20% | Taxa fixa 0 -> Líquido R$ 32,00
      // Consumo 10 km/L | Preço R$ 6,00/L -> Combustível R$ 9,00 (1.5 L)
      // Desgaste: Manut 0.15/km (R$ 2.25) + Pneus 0.05/km (R$ 0.75) + Deprec 0.15/km (R$ 2.25) = R$ 5.25
      // Custo Op: 9.00 + 5.25 = R$ 14.25 (R$ 0.95/km)
      // Lucro Real: 32.00 - 14.25 = R$ 17.75 (R$ 1.18/km)
      // Margem: (17.75 / 32.00) * 100 = 55.47%
      const res = calcularCustoKmELucroCorrida({
        modalidadeTaxa: 'bruto',
        valorReceita: '40,00',
        taxaPercentual: '20',
        taxaFixa: '0,00',
        distanciaCorrida: '12',
        distanciaRetorno: '3',
        consumoVeiculo: '10',
        precoCombustivel: '6,00',
        custoManutencaoKm: '0,15',
        custoPneusKm: '0,05',
        custoDepreciacaoKm: '0,15',
        outrasDespesas: '0,00'
      });

      assert.equal(res.ok, true);
      const d = res.data;
      assert.equal(d.distanciaTotal, 15);
      assert.equal(d.receitaBruta, 40);
      assert.equal(d.descontoTaxaPercentual, 8);
      assert.equal(d.receitaLiquida, 32);
      assert.equal(d.litrosCombustivel, 1.5);
      assert.equal(d.custoCombustivel, 9);
      assert.equal(d.custoManutencao, 2.25);
      assert.equal(d.custoPneus, 0.75);
      assert.equal(d.custoDepreciacao, 2.25);
      assert.equal(d.reservaDesgaste, 5.25);
      assert.equal(d.custoOperacionalTotal, 14.25);
      assert.equal(d.custoPorKm, 0.95);
      assert.equal(d.lucroReal, 17.75);
      assert.equal(d.lucroPorKm, 1.18);
      assert.equal(d.margemLucro, 55.47);
      assert.equal(d.statusResultado, 'lucro');
    });

    it('deve considerar taxa fixa e outras despesas adicionais', () => {
      // Bruto R$ 50,00 | Taxa app 10% (R$ 5) + Taxa fixa R$ 2,50 = R$ 7,50 -> Líquido R$ 42,50
      // Distância 20 km (20 + 0) | Consumo 10 km/L @ R$ 5,00/L -> Combustível R$ 10,00 (2.0 L)
      // Desgaste: 0.10/km manut + 0.05/km pneus = 0.15/km -> R$ 3,00
      // Outras despesas: R$ 5,00 (pedágio)
      // Custo Op: 10 + 3 + 5 = R$ 18,00
      // Lucro: 42.50 - 18.00 = R$ 24.50
      const res = calcularCustoKmELucroCorrida({
        modalidadeTaxa: 'bruto',
        valorReceita: '50,00',
        taxaPercentual: '10',
        taxaFixa: '2,50',
        distanciaCorrida: '20',
        consumoVeiculo: '10',
        precoCombustivel: '5,00',
        custoManutencaoKm: '0,10',
        custoPneusKm: '0,05',
        outrasDespesas: '5,00'
      });

      assert.equal(res.ok, true);
      const d = res.data;
      assert.equal(d.receitaLiquida, 42.5);
      assert.equal(d.custoCombustivel, 10);
      assert.equal(d.reservaDesgaste, 3);
      assert.equal(d.outrasDespesas, 5);
      assert.equal(d.custoOperacionalTotal, 18);
      assert.equal(d.lucroReal, 24.5);
      assert.equal(d.custoPorKm, 0.9);
      assert.equal(d.lucroPorKm, 1.23);
      assert.equal(d.statusResultado, 'lucro');
    });
  });

  describe('Cálculo com Modalidade B (Valor Já Líquido)', () => {
    it('deve utilizar a receita informada como líquida sem descontar taxas de app', () => {
      // Líquido R$ 25,00 direto
      // Distância 10 km | Consumo 10 km/L @ R$ 6,00/L -> Combustível R$ 6,00
      // Desgaste 0.20/km -> R$ 2,00
      // Custo Op: R$ 8,00
      // Lucro: 25.00 - 8.00 = R$ 17.00
      const res = calcularCustoKmELucroCorrida({
        modalidadeTaxa: 'liquido',
        valorReceita: '25,00',
        taxaPercentual: '50', // Deve ser ignorado na modalidade líquida!
        taxaFixa: '10,00',    // Deve ser ignorado na modalidade líquida!
        distanciaCorrida: '10',
        consumoVeiculo: '10',
        precoCombustivel: '6,00',
        custoManutencaoKm: '0,20'
      });

      assert.equal(res.ok, true);
      const d = res.data;
      assert.equal(d.receitaBruta, 25);
      assert.equal(d.receitaLiquida, 25);
      assert.equal(d.totalDescontoApp, 0);
      assert.equal(d.custoCombustivel, 6);
      assert.equal(d.reservaDesgaste, 2);
      assert.equal(d.custoOperacionalTotal, 8);
      assert.equal(d.lucroReal, 17);
      assert.equal(d.statusResultado, 'lucro');
    });
  });

  describe('Identificação de Prejuízo e Ponto de Equilíbrio', () => {
    it('deve identificar corretamente corrida com prejuízo financeiro', () => {
      // Exemplo validado:
      // Corrida 20 km + 20 km volta vazia = 40 km
      // Líquido R$ 30,00
      // Consumo 8 km/L @ R$ 6,00/L -> Combustível 5.0 L = R$ 30,00
      // Desgaste: 0.25/km * 40 = R$ 10,00
      // Custo Op: 30 + 10 = R$ 40,00
      // Lucro: 30 - 40 = -R$ 10,00 (Prejuízo)
      // Lucro/km: -10 / 40 = -R$ 0,25/km
      // Margem: (-10 / 30) * 100 = -33.33%
      const res = calcularCustoKmELucroCorrida({
        modalidadeTaxa: 'liquido',
        valorReceita: '30,00',
        distanciaCorrida: '20',
        distanciaRetorno: '20',
        consumoVeiculo: '8',
        precoCombustivel: '6,00',
        custoManutencaoKm: '0,10',
        custoPneusKm: '0,05',
        custoDepreciacaoKm: '0,10'
      });

      assert.equal(res.ok, true);
      const d = res.data;
      assert.equal(d.distanciaTotal, 40);
      assert.equal(d.custoCombustivel, 30);
      assert.equal(d.reservaDesgaste, 10);
      assert.equal(d.custoOperacionalTotal, 40);
      assert.equal(d.lucroReal, -10);
      assert.equal(d.lucroPorKm, -0.25);
      assert.equal(d.margemLucro, -33.33);
      assert.equal(d.statusResultado, 'prejuizo');
    });

    it('deve identificar ponto de equilíbrio (lucro R$ 0,00)', () => {
      // Líquido R$ 10,00 | Custo Op R$ 10,00
      const res = calcularCustoKmELucroCorrida({
        modalidadeTaxa: 'liquido',
        valorReceita: '10,00',
        distanciaCorrida: '10',
        consumoVeiculo: '10',
        precoCombustivel: '10,00',
        custoManutencaoKm: '0,00'
      });

      assert.equal(res.ok, true);
      const d = res.data;
      assert.equal(d.lucroReal, 0);
      assert.equal(d.lucroPorKm, 0);
      assert.equal(d.margemLucro, 0);
      assert.equal(d.statusResultado, 'equilibrio');
    });
  });

  describe('Prevenção de Dupla Dedução da Reserva', () => {
    it('garante que a reserva estimada de desgaste não seja deduzida duas vezes', () => {
      const res = calcularCustoKmELucroCorrida({
        modalidadeTaxa: 'liquido',
        valorReceita: '100,00',
        distanciaCorrida: '10',
        consumoVeiculo: '10',
        precoCombustivel: '5,00', // Custo comb = R$ 5,00
        custoManutencaoKm: '0,50'  // Reserva desgaste = R$ 5,00
      });

      assert.equal(res.ok, true);
      const d = res.data;
      // Custo op = 5 + 5 = 10
      // Lucro = 100 - 10 = 90
      // Se houvesse dupla dedução seria 100 - 10 - 5 = 85.
      assert.equal(d.custoOperacionalTotal, 10);
      assert.equal(d.lucroReal, 90);
    });
  });

  describe('Validações e Casos Limite', () => {
    it('deve rejeitar valor de receita vazio, zero ou negativo', () => {
      const v1 = calcularCustoKmELucroCorrida({ valorReceita: '' });
      assert.equal(v1.ok, false);
      assert.match(v1.error, /maior que zero/i);

      const v2 = calcularCustoKmELucroCorrida({ valorReceita: '0,00' });
      assert.equal(v2.ok, false);
      assert.match(v2.error, /maior que zero/i);
    });

    it('deve rejeitar distância da corrida menor ou igual a zero', () => {
      const v = calcularCustoKmELucroCorrida({
        valorReceita: '20,00',
        distanciaCorrida: '0'
      });
      assert.equal(v.ok, false);
      assert.match(v.error, /distância da corrida/i);
    });

    it('deve rejeitar distância de retorno vazio negativa', () => {
      const v = calcularCustoKmELucroCorrida({
        valorReceita: '20,00',
        distanciaCorrida: '10',
        distanciaRetorno: '-5'
      });
      assert.equal(v.ok, false);
      assert.match(v.error, /retorno vazio não pode ser negativa/i);
    });

    it('deve rejeitar consumo em km/L menor ou igual a zero', () => {
      const v = calcularCustoKmELucroCorrida({
        valorReceita: '20,00',
        distanciaCorrida: '10',
        consumoVeiculo: '0'
      });
      assert.equal(v.ok, false);
      assert.match(v.error, /consumo médio do veículo deve ser maior que zero/i);
    });

    it('deve rejeitar preço do combustível menor ou igual a zero', () => {
      const v = calcularCustoKmELucroCorrida({
        valorReceita: '20,00',
        distanciaCorrida: '10',
        consumoVeiculo: '10',
        precoCombustivel: '0'
      });
      assert.equal(v.ok, false);
      assert.match(v.error, /preço do litro do combustível deve ser maior que zero/i);
    });

    it('deve rejeitar taxa percentual do app igual ou superior a 100%', () => {
      const v = calcularCustoKmELucroCorrida({
        modalidadeTaxa: 'bruto',
        valorReceita: '20,00',
        distanciaCorrida: '10',
        consumoVeiculo: '10',
        precoCombustivel: '5,00',
        taxaPercentual: '100'
      });
      assert.equal(v.ok, false);
      assert.match(v.error, /estritamente inferior a 100%/i);
    });

    it('deve rejeitar quando as taxas totais do app excedem a receita bruta', () => {
      const v = calcularCustoKmELucroCorrida({
        modalidadeTaxa: 'bruto',
        valorReceita: '20,00',
        taxaPercentual: '50',
        taxaFixa: '15,00', // 10 + 15 = 25 > 20
        distanciaCorrida: '10',
        consumoVeiculo: '10',
        precoCombustivel: '5,00'
      });
      assert.equal(v.ok, false);
      assert.match(v.error, /iguais ou superiores ao valor bruto/i);
    });
  });

  describe('Integração com Ações de Resultado (getResultSections)', () => {
    it('deve gerar seções formatadas com valores em BRL e unidades', () => {
      const res = calcularCustoKmELucroCorrida({
        modalidadeTaxa: 'bruto',
        valorReceita: '40,00',
        taxaPercentual: '20',
        distanciaCorrida: '12',
        distanciaRetorno: '3',
        consumoVeiculo: '10',
        precoCombustivel: '6,00',
        custoManutencaoKm: '0,15'
      });
      assert.equal(res.ok, true);

      const sections = getResultSections(res.data);
      assert.equal(Array.isArray(sections), true);
      assert.equal(sections.length > 5, true);

      const secLucro = sections.find(s => s.label === 'Lucro Líquido Real');
      assert.ok(secLucro);
      assert.match(secLucro.value, /R\$\s*20,75/);

      const secReserva = sections.find(s => s.label.includes('Reserva Estimada'));
      assert.ok(secReserva);
      assert.match(secReserva.value, /R\$\s*2,25/);
    });
  });

  describe('Integração de Interface e DOM (setupTool e Correções Aprovadas)', () => {
    class MockDomElement {
      constructor(tag = 'div') {
        this.tagName = tag.toUpperCase();
        this.id = '';
        this.value = '';
        this.textContent = '';
        this.hidden = false;
        this.disabled = false;
        this.checked = false;
        this.style = {};
        this._classes = new Set();
        this.listeners = {};
      }

      get className() {
        return Array.from(this._classes).join(' ');
      }

      set className(val) {
        this._classes.clear();
        if (val) {
          val.split(/\s+/).filter(Boolean).forEach(c => this._classes.add(c));
        }
      }

      get classList() {
        return {
          add: (...classes) => classes.forEach(c => this._classes.add(c)),
          remove: (...classes) => classes.forEach(c => this._classes.delete(c)),
          contains: (c) => this._classes.has(c)
        };
      }

      addEventListener(event, fn) {
        if (!this.listeners[event]) this.listeners[event] = [];
        this.listeners[event].push(fn);
      }

      dispatchEvent(event) {
        const fns = this.listeners[event.type] || [];
        for (const fn of fns) {
          fn(event);
        }
        return true;
      }

      click() {
        this.dispatchEvent({ type: 'click' });
      }

      focus() {}

      reset() {
        this.value = '';
        if (this.tagName === 'INPUT' && (this.id === 'modTaxaBruto' || this.id === 'modTaxaLiquido')) {
          this.checked = (this.id === 'modTaxaBruto');
        }
      }
    }

    function createMockEnvironment() {
      const elements = new Map();

      const getOrCreate = (id, tag = 'div') => {
        if (!elements.has(id)) {
          const el = new MockDomElement(tag);
          el.id = id;
          elements.set(id, el);
        }
        return elements.get(id);
      };

      // Form
      const form = getOrCreate('formCorrida', 'form');

      // Presets
      const presetCarro = getOrCreate('presetCarro', 'button');
      const presetMoto = getOrCreate('presetMoto', 'button');

      // Radios de modalidade
      const modTaxaBruto = getOrCreate('modTaxaBruto', 'input');
      modTaxaBruto.checked = true;
      const modTaxaLiquido = getOrCreate('modTaxaLiquido', 'input');
      modTaxaLiquido.checked = false;
      const grupoTaxasApp = getOrCreate('grupoTaxasApp', 'div');
      const labelValorReceita = getOrCreate('labelValorReceita', 'label');
      const ajudaValorReceita = getOrCreate('ajudaValorReceita', 'p');

      // Inputs
      const valorReceita = getOrCreate('valorReceita', 'input');
      const taxaPercentual = getOrCreate('taxaPercentual', 'input');
      const taxaFixa = getOrCreate('taxaFixa', 'input');
      const distanciaCorrida = getOrCreate('distanciaCorrida', 'input');
      const distanciaRetorno = getOrCreate('distanciaRetorno', 'input');
      const consumoVeiculo = getOrCreate('consumoVeiculo', 'input');
      const precoCombustivel = getOrCreate('precoCombustivel', 'input');
      const custoManutencaoKm = getOrCreate('custoManutencaoKm', 'input');
      const custoPneusKm = getOrCreate('custoPneusKm', 'input');
      const custoDepreciacaoKm = getOrCreate('custoDepreciacaoKm', 'input');
      const outrasDespesas = getOrCreate('outrasDespesas', 'input');

      // Feedback e ações
      const erroCorrida = getOrCreate('erroCorrida', 'div');
      erroCorrida.hidden = true;
      const resultadoCorrida = getOrCreate('resultadoCorrida', 'section');
      resultadoCorrida.hidden = true;
      const btnCalcular = getOrCreate('btnCalcular', 'button');
      const btnLimpar = getOrCreate('btnLimpar', 'button');

      // Card principal e elementos de resultado
      const cardLucroPrincipal = getOrCreate('cardLucroPrincipal', 'div');
      cardLucroPrincipal.className = 'card tool-status-card status-lucro';
      const rotuloLucroPrincipal = getOrCreate('rotuloLucroPrincipal', 'span');
      const resLucroReal = getOrCreate('resLucroReal', 'div');
      const resBadgeStatus = getOrCreate('resBadgeStatus', 'span');
      resBadgeStatus.hidden = true;

      const resDistanciaTotal = getOrCreate('resDistanciaTotal', 'div');
      const resCustoOperacional = getOrCreate('resCustoOperacional', 'div');
      const resCustoKm = getOrCreate('resCustoKm', 'div');
      const resLucroKm = getOrCreate('resLucroKm', 'div');
      const resReceitaLiquida = getOrCreate('resReceitaLiquida', 'div');
      const resMargemLucro = getOrCreate('resMargemLucro', 'div');
      const resReservaDesgaste = getOrCreate('resReservaDesgaste', 'div');

      const resDetCombustivel = getOrCreate('resDetCombustivel', 'td');
      const resDetManutencao = getOrCreate('resDetManutencao', 'td');
      const resDetPneus = getOrCreate('resDetPneus', 'td');
      const resDetDepreciacao = getOrCreate('resDetDepreciacao', 'td');
      const resDetOutrasDespesas = getOrCreate('resDetOutrasDespesas', 'td');
      const linhaDetDescontoApp = getOrCreate('linhaDetDescontoApp', 'tr');
      const resDetDescontoApp = getOrCreate('resDetDescontoApp', 'td');

      const btnCopiar = getOrCreate('btnCopiar', 'button');
      const btnCompartilhar = getOrCreate('btnCompartilhar', 'button');
      const btnImprimir = getOrCreate('btnImprimir', 'button');
      const statusAcoes = getOrCreate('statusAcoes', 'div');

      const mockRoot = {
        getElementById: (id) => elements.get(id) || null,
        querySelector: (sel) => {
          const id = sel.replace(/^[#.]/, '');
          return elements.get(id) || null;
        }
      };

      // Simula reset do form limpando todos os inputs filhos
      form.reset = () => {
        for (const el of elements.values()) {
          if (el.tagName === 'INPUT') el.reset();
        }
        modTaxaBruto.checked = true;
        modTaxaLiquido.checked = false;
      };

      return { mockRoot, elements };
    }

    it('Correção 1: Preset Carro define 10,0 km/L e não inventa valores de desgaste', () => {
      const { mockRoot, elements } = createMockEnvironment();
      setupTool(mockRoot);

      const presetCarro = elements.get('presetCarro');
      const consumo = elements.get('consumoVeiculo');
      const manut = elements.get('custoManutencaoKm');
      const pneus = elements.get('custoPneusKm');
      const deprec = elements.get('custoDepreciacaoKm');

      presetCarro.click();

      assert.equal(consumo.value, '10,0', 'Preset Carro deve definir 10,0 km/L');
      assert.equal(manut.value, '', 'Manutenção não deve receber valores inventados');
      assert.equal(pneus.value, '', 'Pneus não deve receber valores inventados');
      assert.equal(deprec.value, '', 'Depreciação não deve receber valores inventados');
    });

    it('Correção 1: Preset Moto define 35,0 km/L e preserva valores manuais ao alternar', () => {
      const { mockRoot, elements } = createMockEnvironment();
      setupTool(mockRoot);

      const presetCarro = elements.get('presetCarro');
      const presetMoto = elements.get('presetMoto');
      const consumo = elements.get('consumoVeiculo');
      const manut = elements.get('custoManutencaoKm');
      const pneus = elements.get('custoPneusKm');

      // 1. Usuário clica em Carro
      presetCarro.click();
      assert.equal(consumo.value, '10,0');

      // 2. Usuário digita custos manuais
      manut.value = '0,20';
      pneus.value = '0,08';

      // 3. Usuário alterna para Moto
      presetMoto.click();
      assert.equal(consumo.value, '35,0', 'Preset Moto deve definir 35,0 km/L');
      assert.equal(manut.value, '0,20', 'Valor manual de manutenção deve ser preservado ao alternar');
      assert.equal(pneus.value, '0,08', 'Valor manual de pneus deve ser preservado ao alternar');

      // 4. Usuário alterna de volta para Carro
      presetCarro.click();
      assert.equal(consumo.value, '10,0', 'Preset Carro deve restaurar 10,0 km/L');
      assert.equal(manut.value, '0,20', 'Valor manual de manutenção deve continuar intacto');
      assert.equal(pneus.value, '0,08', 'Valor manual de pneus deve continuar intacto');
    });

    it('Correção 2: Modo líquido oculta e desabilita inputs de taxas, reabilitando ao voltar para bruto', () => {
      const { mockRoot, elements } = createMockEnvironment();
      setupTool(mockRoot);

      const radioBruto = elements.get('modTaxaBruto');
      const radioLiquido = elements.get('modTaxaLiquido');
      const grupoTaxas = elements.get('grupoTaxasApp');
      const taxaPerc = elements.get('taxaPercentual');
      const taxaFixa = elements.get('taxaFixa');
      const labelReceita = elements.get('labelValorReceita');

      // Estado inicial (bruto)
      assert.equal(grupoTaxas.hidden, false);
      assert.equal(taxaPerc.disabled, false);
      assert.equal(taxaFixa.disabled, false);
      assert.match(labelReceita.textContent, /bruto/i);

      // Alterna para líquido
      radioLiquido.checked = true;
      radioBruto.checked = false;
      radioLiquido.dispatchEvent({ type: 'change' });

      assert.equal(grupoTaxas.hidden, true, 'Grupo de taxas deve ficar oculto no modo líquido');
      assert.equal(taxaPerc.disabled, true, 'Taxa percentual deve ser desabilitada no modo líquido');
      assert.equal(taxaFixa.disabled, true, 'Taxa fixa deve ser desabilitada no modo líquido');
      assert.match(labelReceita.textContent, /líquido/i);

      // Alterna de volta para bruto
      radioBruto.checked = true;
      radioLiquido.checked = false;
      radioBruto.dispatchEvent({ type: 'change' });

      assert.equal(grupoTaxas.hidden, false, 'Grupo de taxas deve voltar a ser visível');
      assert.equal(taxaPerc.disabled, false, 'Taxa percentual deve ser reabilitada');
      assert.equal(taxaFixa.disabled, false, 'Taxa fixa deve ser reabilitada');
      assert.match(labelReceita.textContent, /bruto/i);

      // Alternâncias repetidas
      for (let i = 0; i < 3; i++) {
        radioLiquido.checked = true;
        radioBruto.checked = false;
        radioLiquido.dispatchEvent({ type: 'change' });
        assert.equal(taxaPerc.disabled, true);
        assert.equal(taxaFixa.disabled, true);

        radioBruto.checked = true;
        radioLiquido.checked = false;
        radioBruto.dispatchEvent({ type: 'change' });
        assert.equal(taxaPerc.disabled, false);
        assert.equal(taxaFixa.disabled, false);
      }
    });

    it('Correção 3: Card de lucro reflete estado visual positivo (lucro)', () => {
      const { mockRoot, elements } = createMockEnvironment();
      const tool = setupTool(mockRoot);

      const form = elements.get('formCorrida');
      const card = elements.get('cardLucroPrincipal');
      const resLucro = elements.get('resLucroReal');
      const badge = elements.get('resBadgeStatus');

      // Preenche corrida lucrativa
      elements.get('valorReceita').value = '50,00';
      elements.get('distanciaCorrida').value = '10';
      elements.get('consumoVeiculo').value = '10';
      elements.get('precoCombustivel').value = '5,00';

      form.dispatchEvent({ type: 'submit', preventDefault: () => {} });

      assert.equal(card.classList.contains('status-lucro'), true, 'Card deve ter classe status-lucro');
      assert.equal(card.style.borderLeftColor, '#2f855a', 'Borda do card deve ser verde');
      assert.equal(resLucro.style.color, '#2f855a', 'Texto numérico deve ser verde');
      assert.equal(badge.className.includes('status-lucro'), true, 'Badge deve ter classe status-lucro');
      assert.equal(badge.textContent, 'Corrida Lucrativa');
      assert.equal(badge.hidden, false);
    });

    it('Correção 3: Card de lucro reflete estado visual de equilíbrio (zero a zero)', () => {
      const { mockRoot, elements } = createMockEnvironment();
      setupTool(mockRoot);

      const form = elements.get('formCorrida');
      const card = elements.get('cardLucroPrincipal');
      const rotulo = elements.get('rotuloLucroPrincipal');
      const resLucro = elements.get('resLucroReal');
      const badge = elements.get('resBadgeStatus');

      // Receita líquida R$ 10,00 e Custo Op R$ 10,00 -> Equilíbrio
      elements.get('modTaxaLiquido').checked = true;
      elements.get('modTaxaBruto').checked = false;
      elements.get('valorReceita').value = '10,00';
      elements.get('distanciaCorrida').value = '10';
      elements.get('consumoVeiculo').value = '10';
      elements.get('precoCombustivel').value = '10,00';

      form.dispatchEvent({ type: 'submit', preventDefault: () => {} });

      assert.equal(card.classList.contains('status-equilibrio'), true, 'Card deve ter classe status-equilibrio');
      assert.equal(card.style.borderLeftColor, '#718096', 'Borda do card deve ser neutra');
      assert.equal(resLucro.style.color, '#4a5568', 'Texto numérico deve ser neutro');
      assert.equal(badge.className.includes('status-equilibrio'), true, 'Badge deve ter classe status-equilibrio');
      assert.equal(badge.textContent, 'Ponto de Equilíbrio (Zero a Zero)');
      assert.match(rotulo.textContent, /Ponto de Equilíbrio/i);
    });

    it('Correção 3: Card de lucro reflete estado visual de alerta (prejuízo)', () => {
      const { mockRoot, elements } = createMockEnvironment();
      setupTool(mockRoot);

      const form = elements.get('formCorrida');
      const card = elements.get('cardLucroPrincipal');
      const rotulo = elements.get('rotuloLucroPrincipal');
      const resLucro = elements.get('resLucroReal');
      const badge = elements.get('resBadgeStatus');

      // Receita líquida R$ 20,00 e Custo Op R$ 40,00 -> Prejuízo
      elements.get('modTaxaLiquido').checked = true;
      elements.get('modTaxaBruto').checked = false;
      elements.get('valorReceita').value = '20,00';
      elements.get('distanciaCorrida').value = '20';
      elements.get('distanciaRetorno').value = '20'; // total 40 km
      elements.get('consumoVeiculo').value = '8';
      elements.get('precoCombustivel').value = '6,00'; // comb 30,00
      elements.get('custoManutencaoKm').value = '0,25'; // manut 10,00 -> total 40,00

      form.dispatchEvent({ type: 'submit', preventDefault: () => {} });

      assert.equal(card.classList.contains('status-prejuizo'), true, 'Card deve ter classe status-prejuizo');
      assert.equal(card.style.borderLeftColor, '#c53030', 'Borda do card deve ser vermelha');
      assert.equal(resLucro.style.color, '#c53030', 'Texto numérico deve ser vermelho');
      assert.equal(badge.className.includes('status-prejuizo'), true, 'Badge deve ter classe status-prejuizo');
      assert.equal(badge.textContent, 'Corrida com Prejuízo');
      assert.match(rotulo.textContent, /Prejuízo/i);
    });

    it('Correção 3: Limpeza do formulário restaura visual do card para padrão neutro/lucro e oculta badge', () => {
      const { mockRoot, elements } = createMockEnvironment();
      setupTool(mockRoot);

      const form = elements.get('formCorrida');
      const btnLimpar = elements.get('btnLimpar');
      const card = elements.get('cardLucroPrincipal');
      const badge = elements.get('resBadgeStatus');

      // 1. Gera corrida com prejuízo
      elements.get('modTaxaLiquido').checked = true;
      elements.get('modTaxaBruto').checked = false;
      elements.get('valorReceita').value = '5,00';
      elements.get('distanciaCorrida').value = '20';
      elements.get('consumoVeiculo').value = '5';
      elements.get('precoCombustivel').value = '10,00';
      form.dispatchEvent({ type: 'submit', preventDefault: () => {} });
      assert.equal(card.classList.contains('status-prejuizo'), true);

      // 2. Clica em limpar
      btnLimpar.click();

      assert.equal(card.classList.contains('status-prejuizo'), false, 'Não deve manter status-prejuizo');
      assert.equal(card.classList.contains('status-lucro'), true, 'Deve restaurar status-lucro padrão');
      assert.equal(card.style.borderLeftColor, '#2f855a', 'Borda deve voltar ao padrão');
      assert.equal(badge.hidden, true, 'Badge deve ser ocultado');
    });
  });
});
