# Implementação — Calculadora de Estimativa de Hidratação Diária (`estimativa-hidratacao`)

## 1. Identificação da Ferramenta

- **ID / Slug:** `estimativa-hidratacao`
- **Nome Oficial:** Calculadora de Estimativa de Hidratação Diária
- **Categoria:** Saúde (`categorySlug: saude`)
- **URL Canônica:** `/tools/saude/estimativa-hidratacao.html`
- **Data da Implementação:** `2026-10-28`
- **Status da Fórmula:** `verified`
- **Status no Catálogo:** `published`
- **Implementação:** `factory`

---

## 2. Auditoria Prévia de Duplicatas e Ferramentas Correlatas

- **`consumo-agua` (`/tools/utilidades/consumo-agua.html`):** Focada na medição de consumo predial/residencial em metros cúbicos ($m^3$) e no valor da conta de água da concessionária.
- **`imc` / `metabolismo-basal`:** Não calculam ingestão de fluidos corporais.
- **Conclusão:** Não existia no CalculadoraMaster ferramenta para cálculo de ingestão fisiológica diária de água. Ferramenta inédita e essencial para a categoria de Saúde e Bem-estar.

---

## 3. Metodologia de Cálculo e Fórmulas Adotadas

### 3.1. Necessidade Hídrica Basal
Baseada nas diretrizes da OMS e EFSA (*European Food Safety Authority*):
- **Adultos e Jovens (< 65 anos):**
  $$V_{\text{basal}} = P \times 35\text{ ml/kg}$$
- **Idosos ($\ge 65$ anos):**
  $$V_{\text{basal}} = P \times 30\text{ ml/kg}$$
Onde $P$ é o peso corporal em quilogramas.

### 3.2. Adicional de Exercício Físico (ACSM)
Proporcional à intensidade e duração em minutos ($t$):
- **Leve:** $400\text{ ml/h} \implies \frac{t}{60} \times 400$
- **Moderado:** $600\text{ ml/h} \implies \frac{t}{60} \times 600$
- **Intenso:** $800\text{ ml/h} \implies \frac{t}{60} \times 800$

### 3.3. Ajuste Climático e Condições Especiais
- **Clima Quente (25°C a 32°C):** $+350\text{ ml}$
- **Clima Muito Quente (> 32°C):** $+600\text{ ml}$
- **Gestantes:** $+300\text{ ml/dia}$ (IOM/EFSA)
- **Lactantes:** $+700\text{ ml/dia}$ (IOM/EFSA)

$$V_{\text{total}} = V_{\text{basal}} + V_{\text{exercício}} + V_{\text{clima}} + V_{\text{especial}}$$

### 3.4. Limitações e Alertas Médicos Obrigatórios
- Notificação explícita sobre restrição hídrica para pacientes com Insuficiência Cardíaca Congestiva (ICC), Doença Renal Crônica (DRC) e Cirrose Hepática;
- Alerta contra hiponatremia em volumes $\ge 5{,}0\text{ L/dia}$;
- Tabela de Armstrong para monitoramento visual prático pela coloração da urina.

---

## 4. Fontes e Referências Confiáveis

1. European Food Safety Authority (EFSA) Panel on Dietetic Products, Nutrition, and Allergies (NDA). *Scientific Opinion on Dietary Reference Values for water*. EFSA Journal, 2010; 8(3):1459.
2. Sawka MN, Burke LM, Eichner ER, et al. *American College of Sports Medicine position stand: Exercise and fluid replacement*. Med Sci Sports Exerc, 2007; 39(2):377-390.
3. World Health Organization (WHO). *Nutrients in Drinking-water: Water, Sanitation and Health Protection and the Human Environment*. Geneva: WHO Guidelines, 2005.
4. Armstrong LE, Maresh CM, Castellani JW, et al. *Urinary indices of hydration status*. Int J Sport Nutr, 1994; 4(3):265-279.
5. Institute of Medicine (IOM). *Dietary Reference Intakes for Water, Potassium, Sodium, Chloride, and Sulfate*. Washington, DC: The National Academies Press, 2005.
