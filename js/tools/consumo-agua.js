import { createResultActions } from '../core/result-actions.js';
import { parseEnergyNumber } from './conta-luz.js';

const MAX_VALUE = 1_000_000_000;
const money = value => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
const quantity = value => new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 }).format(value);

function nonnegative(raw, label, optional = false) {
  if (optional && String(raw ?? '').trim() === '') return { value: 0 };
  const value = parseEnergyNumber(raw);
  if (!Number.isFinite(value) || value < 0 || value > MAX_VALUE) return { error: `${label}: informe um valor válido, igual ou maior que zero.` };
  return { value };
}

export function calculateWaterConsumption(input = {}) {
  const mode = input.mode === 'readings' ? 'readings' : 'monthly';
  const rate = nonnegative(input.rate, 'Tarifa efetiva');
  if (rate.error) return { valid: false, error: rate.error };
  const charges = nonnegative(input.charges, 'Cobranças adicionais', true);
  if (charges.error) return { valid: false, error: charges.error };
  let consumption;
  let days = null;
  if (mode === 'monthly') {
    const amount = nonnegative(input.consumption, 'Consumo de água');
    if (amount.error) return { valid: false, error: amount.error };
    consumption = amount.value;
  } else {
    const previous = nonnegative(input.previous, 'Leitura anterior');
    const current = nonnegative(input.current, 'Leitura atual');
    if (previous.error) return { valid: false, error: previous.error };
    if (current.error) return { valid: false, error: current.error };
    const periodDays = parseEnergyNumber(input.days);
    if (!Number.isInteger(periodDays) || periodDays <= 0 || periodDays > 366) return { valid: false, error: 'Dias do período: informe um número inteiro entre 1 e 366.' };
    if (current.value < previous.value) return { valid: false, error: 'A leitura atual não pode ser inferior à leitura anterior.' };
    consumption = current.value - previous.value;
    days = periodDays;
  }
  const waterCost = Math.round((consumption * rate.value + Number.EPSILON) * 100) / 100;
  const total = Math.round((waterCost + charges.value + Number.EPSILON) * 100) / 100;
  const dailyAverage = days ? consumption / days : null;
  const monthlyEstimate = days ? dailyAverage * 30 : null;
  const monthlyCostEstimate = days ? Math.round((monthlyEstimate * rate.value + Number.EPSILON) * 100) / 100 : null;
  if (![waterCost, total, ...(days ? [dailyAverage, monthlyEstimate, monthlyCostEstimate] : [])].every(Number.isFinite)) return { valid: false, error: 'Não foi possível calcular com esses valores. Confira os dados informados.' };
  return { valid: true, mode, consumptionM3: consumption, rate: rate.value, waterCost, charges: charges.value, total, dailyAverage, monthlyEstimate, monthlyCostEstimate, days };
}

export function setupTool() {
  if (typeof document === 'undefined') return;
  const form = document.getElementById('formConsumoAgua');
  if (!form) return;
  const monthlyFields = document.getElementById('camposConsumoMensalAgua');
  const readingFields = document.getElementById('camposLeiturasAgua');
  const error = document.getElementById('erroConsumoAgua');
  const result = document.getElementById('resultadoConsumoAgua');
  const status = document.getElementById('statusConsumoAgua');
  const copy = document.getElementById('copiarConsumoAgua');
  const share = document.getElementById('compartilharConsumoAgua');
  const print = document.getElementById('imprimirConsumoAgua');
  let last = null;
  const sections = () => last ? [
    { label: 'Consumo do período', value: `${quantity(last.consumptionM3)} m³` },
    { label: 'Tarifa efetiva', value: `${money(last.rate)} por m³` },
    { label: 'Custo estimado da água', value: money(last.waterCost) },
    { label: 'Cobranças adicionais', value: money(last.charges) },
    { label: 'Total estimado do período', value: money(last.total) },
    ...(last.days ? [{ label: 'Média diária', value: `${quantity(last.dailyAverage)} m³/dia` }, { label: 'Média mensal estimada (30 dias)', value: `${quantity(last.monthlyEstimate)} m³` }, { label: 'Custo mensal estimado', value: money(last.monthlyCostEstimate) }] : [])
  ] : [];
  const actions = createResultActions({ title: 'Calculadora de Consumo de Água — Calculadora Master', getSections: sections, statusElement: status });
  const toggleMode = () => {
    const mode = form.querySelector('input[name="modoConsumoAgua"]:checked')?.value || 'monthly';
    monthlyFields.hidden = mode !== 'monthly';
    readingFields.hidden = mode !== 'readings';
    (mode === 'monthly' ? readingFields : monthlyFields).querySelectorAll('input').forEach(input => { input.value = ''; });
    error.hidden = true; error.textContent = ''; result.hidden = true; last = null;
    [copy, share, print].forEach(button => { button.hidden = true; });
  };
  form.querySelectorAll('input[name="modoConsumoAgua"]').forEach(input => input.addEventListener('change', toggleMode));
  form.addEventListener('submit', event => {
    event.preventDefault();
    if (status) status.textContent = '';
    last = calculateWaterConsumption({
      mode: form.querySelector('input[name="modoConsumoAgua"]:checked')?.value,
      consumption: document.getElementById('consumoMensalAgua').value,
      previous: document.getElementById('leituraAnteriorAgua').value,
      current: document.getElementById('leituraAtualAgua').value,
      days: document.getElementById('diasPeriodoAgua').value,
      rate: document.getElementById('tarifaAgua').value,
      charges: document.getElementById('adicionaisAgua').value
    });
    if (!last.valid) {
      error.textContent = last.error; error.hidden = false; result.hidden = true;
      [copy, share, print].forEach(button => { button.hidden = true; });
      return;
    }
    error.textContent = ''; error.hidden = true;
    document.getElementById('consumoResultadoAgua').textContent = `${quantity(last.consumptionM3)} m³`;
    document.getElementById('tarifaResultadoAgua').textContent = `${money(last.rate)} por m³`;
    document.getElementById('custoAguaResultado').textContent = money(last.waterCost);
    document.getElementById('adicionaisResultadoAgua').textContent = money(last.charges);
    document.getElementById('totalResultadoAgua').textContent = money(last.total);
    const projection = document.getElementById('projecaoResultadoAgua');
    projection.hidden = !last.days;
    if (last.days) {
      document.getElementById('mediaDiariaAgua').textContent = `${quantity(last.dailyAverage)} m³/dia`;
      document.getElementById('mediaMensalAgua').textContent = `${quantity(last.monthlyEstimate)} m³ em 30 dias`;
      document.getElementById('custoMensalAgua').textContent = money(last.monthlyCostEstimate);
    }
    result.hidden = false;
    [copy, share, print].forEach(button => { button.hidden = false; });
  });
  document.getElementById('limparConsumoAgua').addEventListener('click', () => {
    form.reset(); toggleMode(); error.textContent = ''; error.hidden = true; result.hidden = true;
    document.getElementById('projecaoResultadoAgua').hidden = true;
    if (status) status.textContent = '';
    last = null;
  });
  copy.addEventListener('click', () => last && actions.copy());
  share.addEventListener('click', () => last && actions.share(`${window.location.origin}/tools/utilidades/consumo-agua.html`));
  print.addEventListener('click', () => last && actions.print());
  toggleMode();
}

if (typeof document !== 'undefined') document.addEventListener('DOMContentLoaded', setupTool);
