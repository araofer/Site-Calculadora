import { createResultActions } from '../core/result-actions.js';

const MAX_VALUE = 1_000_000_000;

export function parseEnergyNumber(input) {
  if (typeof input === 'number') return Number.isFinite(input) ? input : NaN;
  let value = String(input ?? '').trim().replace(/\s/g, '').replace(/^R\$/i, '');
  if (!value) return NaN;
  if (value.includes(',')) {
    if (!/^-?(?:\d+|\d{1,3}(?:\.\d{3})+),\d{1,6}$/.test(value)) return NaN;
    value = value.replace(/\./g, '').replace(',', '.');
  } else if (/^-?\d{1,3}(?:\.\d{3})+$/.test(value)) value = value.replace(/\./g, '');
  else if (!/^-?\d+(?:\.\d{1,6})?$/.test(value)) return NaN;
  const number = Number(value);
  return Number.isFinite(number) ? number : NaN;
}

function readNonnegative(raw, label, { required = true } = {}) {
  if (String(raw ?? '').trim() === '' && !required) return { value: 0 };
  const value = parseEnergyNumber(raw);
  if (!Number.isFinite(value) || value < 0 || value > MAX_VALUE) return { error: `${label}: informe um valor válido, igual ou maior que zero.` };
  return { value };
}

export function calculateEnergyBill(input = {}) {
  const mode = input.mode === 'readings' ? 'readings' : 'monthly';
  const rate = readNonnegative(input.rate, 'Tarifa efetiva');
  if (rate.error) return { valid: false, error: rate.error };
  const charges = readNonnegative(input.charges, 'Custos adicionais', { required: false });
  if (charges.error) return { valid: false, error: charges.error };
  let consumption;
  let days = null;
  if (mode === 'monthly') {
    const monthly = readNonnegative(input.consumption, 'Consumo mensal');
    if (monthly.error) return { valid: false, error: monthly.error };
    consumption = monthly.value;
  } else {
    const previous = readNonnegative(input.previous, 'Leitura anterior');
    const current = readNonnegative(input.current, 'Leitura atual');
    const periodDays = parseEnergyNumber(input.days);
    if (previous.error) return { valid: false, error: previous.error };
    if (current.error) return { valid: false, error: current.error };
    if (!Number.isInteger(periodDays) || periodDays <= 0 || periodDays > 366) return { valid: false, error: 'Número de dias: informe um inteiro entre 1 e 366.' };
    if (current.value < previous.value) return { valid: false, error: 'A leitura atual deve ser maior ou igual à leitura anterior.' };
    consumption = current.value - previous.value;
    days = periodDays;
  }
  if (consumption > MAX_VALUE || rate.value > MAX_VALUE || charges.value > MAX_VALUE) return { valid: false, error: 'Os valores informados excedem o limite suportado.' };
  const energyCost = Math.round((consumption * rate.value + Number.EPSILON) * 100) / 100;
  const total = Math.round((energyCost + charges.value + Number.EPSILON) * 100) / 100;
  if (![energyCost, total].every(Number.isFinite)) return { valid: false, error: 'Não foi possível calcular com esses valores. Confira os dados informados.' };
  return {
    valid: true, mode, consumptionKWh: consumption, rate: rate.value,
    energyCost, charges: charges.value, total,
    dailyAverage: days ? consumption / days : null,
    monthlyEstimate: days ? consumption / days * 30 : null,
    days
  };
}

const money = value => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
const quantity = value => new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 }).format(value);

export function setupTool() {
  if (typeof document === 'undefined') return;
  const form = document.getElementById('formContaLuz');
  if (!form) return;
  const monthlyFields = document.getElementById('camposConsumoMensalLuz');
  const readingFields = document.getElementById('camposLeiturasLuz');
  const error = document.getElementById('erroContaLuz');
  const result = document.getElementById('resultadoContaLuz');
  const status = document.getElementById('statusContaLuz');
  const copy = document.getElementById('copiarContaLuz');
  const share = document.getElementById('compartilharContaLuz');
  const print = document.getElementById('imprimirContaLuz');
  let last = null;
  const fmtSections = () => last ? [
    { label: 'Consumo do período', value: `${quantity(last.consumptionKWh)} kWh` },
    { label: 'Tarifa efetiva', value: `${money(last.rate)} por kWh` },
    { label: 'Custo de energia', value: money(last.energyCost) },
    { label: 'Custos adicionais', value: money(last.charges) },
    { label: 'Total estimado do período', value: money(last.total) },
    ...(last.days ? [{ label: 'Média diária', value: `${quantity(last.dailyAverage)} kWh/dia` }, { label: 'Média mensal estimada (30 dias)', value: `${quantity(last.monthlyEstimate)} kWh` }] : [])
  ] : [];
  const actions = createResultActions({ title: 'Calculadora de Conta de Luz — Calculadora Master', getSections: fmtSections, statusElement: status });
  const toggleMode = () => {
    const mode = form.querySelector('input[name="modoContaLuz"]:checked')?.value || 'monthly';
    monthlyFields.hidden = mode !== 'monthly';
    readingFields.hidden = mode !== 'readings';
    // Avoid stale values from an inactive mode being submitted or printed.
    (mode === 'monthly' ? readingFields : monthlyFields).querySelectorAll('input').forEach(input => { input.value = ''; });
    error.hidden = true;
    result.hidden = true;
    last = null;
  };
  form.querySelectorAll('input[name="modoContaLuz"]').forEach(input => input.addEventListener('change', toggleMode));
  form.addEventListener('submit', event => {
    event.preventDefault();
    if (status) status.textContent = '';
    const mode = form.querySelector('input[name="modoContaLuz"]:checked')?.value || 'monthly';
    last = calculateEnergyBill({
      mode,
      consumption: document.getElementById('consumoMensalLuz').value,
      previous: document.getElementById('leituraAnteriorLuz').value,
      current: document.getElementById('leituraAtualLuz').value,
      days: document.getElementById('diasPeriodoLuz').value,
      rate: document.getElementById('tarifaLuz').value,
      charges: document.getElementById('adicionaisLuz').value
    });
    if (!last.valid) {
      error.textContent = last.error; error.hidden = false; result.hidden = true;
      [copy, share, print].forEach(button => { button.hidden = true; });
      return;
    }
    error.textContent = ''; error.hidden = true;
    document.getElementById('consumoResultadoLuz').textContent = `${quantity(last.consumptionKWh)} kWh`;
    document.getElementById('tarifaResultadoLuz').textContent = `${money(last.rate)} por kWh`;
    document.getElementById('custoEnergiaResultadoLuz').textContent = money(last.energyCost);
    document.getElementById('adicionaisResultadoLuz').textContent = money(last.charges);
    document.getElementById('totalResultadoLuz').textContent = money(last.total);
    const averages = document.getElementById('mediasResultadoLuz');
    averages.hidden = !last.days;
    if (last.days) {
      document.getElementById('mediaDiariaResultadoLuz').textContent = `${quantity(last.dailyAverage)} kWh/dia`;
      document.getElementById('mediaMensalResultadoLuz').textContent = `${quantity(last.monthlyEstimate)} kWh em 30 dias`;
    }
    result.hidden = false;
    [copy, share, print].forEach(button => { button.hidden = false; });
  });
  document.getElementById('limparContaLuz').addEventListener('click', () => {
    form.reset(); toggleMode(); error.textContent = ''; error.hidden = true; result.hidden = true;
    document.getElementById('mediasResultadoLuz').hidden = true;
    [copy, share, print].forEach(button => { button.hidden = true; });
    if (status) status.textContent = ''; last = null;
  });
  copy.addEventListener('click', () => last && actions.copy());
  share.addEventListener('click', () => last && actions.share(`${window.location.origin}/tools/utilidades/conta-luz.html`));
  print.addEventListener('click', () => last && actions.print());
  toggleMode();
}

if (typeof document !== 'undefined') document.addEventListener('DOMContentLoaded', setupTool);
