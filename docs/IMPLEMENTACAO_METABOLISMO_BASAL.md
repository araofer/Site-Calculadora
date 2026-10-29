# Implementação — Calculadora de Metabolismo Basal (TMB) (`metabolismo-basal`)

## 1. Identificação da Ferramenta

- **ID / Slug:** `metabolismo-basal`
- **Nome Oficial:** Calculadora de Metabolismo Basal (TMB)
- **Categoria:** Saúde (`categorySlug: saude`)
- **URL Canônica:** `/tools/saude/metabolismo-basal.html`
- **Data da Implementação:** `2026-10-28`
- **Status da Fórmula:** `verified`
- **Status no Catálogo:** `published`
- **Implementação:** `factory` (arquitetura dinâmica baseada em `src/pages/`, `layout: tool` e `discoverPublicFactoryTools`)

---

## 2. Auditoria Prévia de Duplicatas e Ferramentas Correlatas

Antes da implementação, realizou-se auditoria em `data/tools.json` e nos arquivos do projeto:
- **`imc` (`/tools/saude/imc.html`):** Mede o Índice de Massa Corporal ($kg/m^2$) para triagem de faixas de peso corporal (baixo peso, peso normal, sobrepeso, obesidade). Não mede nem projeta gasto calórico em repouso.
- **`idade` (`/tools/saude/idade.html`):** Calcula a idade cronológica exata a partir da data de nascimento.
- **Conclusão:** Não existia no CalculadoraMaster ferramenta para cálculo da Taxa Metabólica Basal (TMB). A nova ferramenta preenche uma lacuna essencial sem qualquer duplicidade funcional.

---

## 3. Metodologia de Cálculo e Fórmulas Adotadas

A metodologia estrutura-se em consenso científico internacional:

### 3.1. Equação de Mifflin-St Jeor (1990) — Padrão Recomendado
Recomendada pela *Academy of Nutrition and Dietetics* (ADA/AND) como a fórmula preditiva com menor margem de erro para a população adulta geral:
- **Homens:**
  $$TMB = (10 \times P) + (6{,}25 \times A) - (5 \times I) + 5$$
- **Mulheres:**
  $$TMB = (10 \times P) + (6{,}25 \times A) - (5 \times I) - 161$$
Onde:
- $P$ = Peso corporal em quilogramas (kg);
- $A$ = Altura em centímetros (cm);
- $I$ = Idade em anos completos.

### 3.2. Equação de Harris-Benedict Revisada (Roza & Shizgal, 1984)
- **Homens:**
  $$TMB = 88{,}362 + (13{,}397 \times P) + (4{,}799 \times A) - (5{,}677 \times I)$$
- **Mulheres:**
  $$TMB = 447{,}593 + (9{,}247 \times P) + (3{,}098 \times A) - (4{,}330 \times I)$$

### 3.3. Equação de Katch-McArdle (1996)
Baseada na massa livre de gordura (massa magra — LBM):
$$LBM = P \times \left(1 - \frac{BF\%}{100}\right)$$
$$TMB = 370 + (21{,}6 \times LBM)$$

### 3.4. Estimativas de Nível de Atividade Física (FAO/WHO/UNU)
Multiplicadores de atividade física aplicados sobre a TMB:
- Sedentário: $\times 1{,}200$
- Levemente ativo: $\times 1{,}375$
- Moderadamente ativo: $\times 1{,}550$
- Muito ativo: $\times 1{,}725$
- Extremamente ativo: $\times 1{,}900$

---

## 4. Fontes e Referências Confiáveis

1. Mifflin MD, St Jeor ST, Hill LA, Scott BJ, Daugherty SA, Koh YO. *A new predictive equation for resting energy expenditure in healthy individuals*. The American Journal of Clinical Nutrition, 1990; 51(2):241-247.
2. Roza AM, Shizgal HM. *The Harris Benedict equation reevaluated: resting energy requirements and the body cell mass*. The American Journal of Clinical Nutrition, 1984; 40(1):168-182.
3. Katch FI, McArdle WD. *Introduction to Nutrition, Exercise, and Health*. 4th ed., 1996.
4. Food and Agriculture Organization, World Health Organization, United Nations University (FAO/WHO/UNU). *Human energy requirements: Report of a Joint FAO/WHO/UNU Expert Consultation*. FAO Food and Nutrition Technical Report Series No. 1, Rome, 2004.
5. Frankenfield D, Roth-Yousey L, Compher C. *Comparison of predictive equations for resting metabolic rate in healthy nonobese and obese adults: a systematic review*. Journal of the American Dietetic Association, 2005; 105(5):775-789.
