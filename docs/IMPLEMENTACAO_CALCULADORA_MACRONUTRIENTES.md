# Implementação — Calculadora de Macronutrientes (`calculadora-macronutrientes`)

## 1. Identificação da Ferramenta

- **ID / Slug:** `calculadora-macronutrientes`
- **Nome Oficial:** Calculadora de Macronutrientes
- **Categoria:** Saúde (`categorySlug: saude`)
- **URL Canônica:** `/tools/saude/calculadora-macronutrientes.html`
- **Data da Implementação:** `2026-10-28`
- **Status da Fórmula:** `verified`
- **Status no Catálogo:** `published`
- **Implementação:** `factory`

---

## 2. Auditoria Prévia de Duplicatas e Ferramentas Correlatas

- **`imc`:** Avalia relação estática peso/altura sem qualquer relação com nutrientes ou calorias.
- **`metabolismo-basal`:** Calcula a cota calórica de repouso (TMB).
- **`gasto-calorico-diario`:** Define o Gasto Energético Total (GET) e a meta calórica em kcal/dia.
- **Conclusão:** A nova ferramenta complementa o fluxo nutricional, convertendo o orçamento calórico diário estabelecido nas ferramentas anteriores em gramas reais de alimentos (carboidratos, proteínas, gorduras e fibras) por dia e por refeição.

---

## 3. Metodologia de Cálculo e Fatores de Atwater

### 3.1. Fatores Energéticos Metabolizáveis de Atwater
- **Proteínas:** $4\text{ kcal por grama}$;
- **Carboidratos:** $4\text{ kcal por grama}$;
- **Gorduras:** $9\text{ kcal por grama}$;
- **Fibras Alimentares:** recomendação de $14\text{ g a cada } 1.000\text{ kcal}$ de consumo (DRI/IOM).

### 3.2. Fórmulas de Conversão em Gramas
Dado o consumo calórico alvo ($K$) e o percentual alocado para cada macronutriente ($\%_C, \%_P, \%_G$):
- **Gramas de Carboidrato:**
  $$g_{\text{carb}} = \frac{K \times (\%_C / 100)}{4}$$
- **Gramas de Proteína:**
  $$g_{\text{prot}} = \frac{K \times (\%_P / 100)}{4}$$
- **Gramas de Gordura:**
  $$g_{\text{gord}} = \frac{K \times (\%_G / 100)}{9}$$

### 3.3. Relação Gramas por Quilo ($g/kg$)
Quando o usuário informa o peso corporal ($P$ em kg):
$$\text{Proporção} = \frac{g}{P}$$

### 3.4. Protocolos Nutricionais
- **Equilibrada:** $50\% \text{ Carbs } / 20\% \text{ Prot } / 30\% \text{ Gord}$
- **Emagrecimento (High Protein):** $40\% \text{ Carbs } / 35\% \text{ Prot } / 25\% \text{ Gord}$
- **Hipertrofia:** $55\% \text{ Carbs } / 25\% \text{ Prot } / 20\% \text{ Gord}$
- **Low Carb:** $20\% \text{ Carbs } / 35\% \text{ Prot } / 45\% \text{ Gord}$
- **Cetogênica:** $5\% \text{ Carbs } / 25\% \text{ Prot } / 70\% \text{ Gord}$
- **Personalizada:** validação estrita de soma $= 100\%$.

---

## 4. Fontes e Referências Confiáveis

1. Atwater WO, Bryant AP. *The Chemical Composition of American Food Materials*. US Department of Agriculture, Office of Experiment Stations, Bulletin No. 28, Washington DC, 1899.
2. Institute of Medicine (IOM). *Dietary Reference Intakes for Energy, Carbohydrate, Fiber, Fat, Fatty Acids, Cholesterol, Protein, and Amino Acids*. Washington, DC: The National Academies Press, 2005.
3. Jäger R, Kerksick CM, Campbell BI, et al. *International Society of Sports Nutrition Position Stand: protein and exercise*. Journal of the International Society of Sports Nutrition, 2017; 14:20.
4. Thomas DT, Erdman KA, Burke LM. *Position of the Academy of Nutrition and Dietetics, Dietitians of Canada, and the American College of Sports Medicine: Nutrition and Athletic Performance*. J Acad Nutr Diet, 2016; 116(3):501-528.
