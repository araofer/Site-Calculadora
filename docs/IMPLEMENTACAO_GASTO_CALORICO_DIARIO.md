# Implementação — Calculadora de Gasto Calórico Diário (GET / TDEE) (`gasto-calorico-diario`)

## 1. Identificação da Ferramenta

- **ID / Slug:** `gasto-calorico-diario`
- **Nome Oficial:** Calculadora de Gasto Calórico Diário (GET / TDEE)
- **Categoria:** Saúde (`categorySlug: saude`)
- **URL Canônica:** `/tools/saude/gasto-calorico-diario.html`
- **Data da Implementação:** `2026-10-28`
- **Status da Fórmula:** `verified`
- **Status no Catálogo:** `published`
- **Implementação:** `factory`

---

## 2. Auditoria Prévia de Duplicatas e Ferramentas Correlatas

- **`imc`:** Avalia relação peso/altura ($kg/m^2$) para classificação epidemiológica, sem calcular calorias.
- **`metabolismo-basal`:** Calcula exclusivamente o consumo energético de repouso absoluto (TMB / BMR) sem ponderar o balanço calórico completo, nem definir metas de perda/ganho de peso.
- **Conclusão:** Ferramenta complementar direta à TMB, integrando os fatores de atividade física oficiais da FAO/WHO/UNU e metas calóricas terapêuticas.

---

## 3. Metodologia de Cálculo e Fórmulas Adotadas

### 3.1. Gasto Energético Total (GET / TDEE)
$$GET = TMB \times PAL$$
Onde $PAL$ (*Physical Activity Level*) segue a escala de consensos internacionais (FAO/WHO/UNU, 2004):
- **Sedentário:** $1{,}200$
- **Levemente ativo:** $1{,}375$
- **Moderadamente ativo:** $1{,}550$
- **Muito ativo:** $1{,}725$
- **Extremamente ativo:** $1{,}900$

### 3.2. Metas Calóricas por Objetivo
A partir do GET calculado:
- **Manutenção:** $\text{Meta} = GET$
- **Emagrecimento Moderado (Recomendado):** $\text{Meta} = GET \times 0{,}80$ (déficit de 20%)
- **Emagrecimento Suave:** $\text{Meta} = GET \times 0{,}90$ (déficit de 10%)
- **Emagrecimento Agressivo:** $\text{Meta} = GET \times 0{,}75$ (déficit de 25%)
- **Ganho Limpo (Hipertrofia):** $\text{Meta} = GET \times 1{,}10$ (superávit de 10%)
- **Ganho Acelerado:** $\text{Meta} = GET \times 1{,}15$ (superávit de 15%)

### 3.3. Projeção de Variação de Peso Semanal
Baseada na relação termodinâmica de Wishnofsky ($7.700\text{ kcal} \approx 1\text{ kg de gordura}$):
$$\Delta_{\text{semanal}} = \frac{(\text{Meta} - GET) \times 7}{7700}$$

### 3.4. Regras de Segurança Clínica
- Emissão de avisos automáticos caso a meta fique abaixo dos pisos de segurança clínica ($1.200\text{ kcal/dia}$ para mulheres e $1.500\text{ kcal/dia}$ para homens);
- Alerta explícito quando a meta calórica fica abaixo da própria Taxa Metabólica Basal (TMB).

---

## 4. Fontes e Referências Confiáveis

1. Food and Agriculture Organization, World Health Organization, United Nations University (FAO/WHO/UNU). *Human energy requirements: Report of a Joint FAO/WHO/UNU Expert Consultation*. FAO Food and Nutrition Technical Report Series No. 1, Rome, 2004.
2. Mifflin MD, St Jeor ST, Hill LA, Scott BJ, Daugherty SA, Koh YO. *A new predictive equation for resting energy expenditure in healthy individuals*. Am J Clin Nutr, 1990; 51(2):241-247.
3. Wishnofsky M. *Caloric equivalents of gained or lost weight*. Am J Clin Nutr, 1958; 6(5):542-546.
4. Hall KD, Sacks G, Chandramohan D, et al. *Quantification of the effect of energy imbalance on bodyweight*. The Lancet, 2011; 378(9793):826-837.
