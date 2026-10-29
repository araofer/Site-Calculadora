# Implementação — Calculadora de Ritmo de Corrida (Pace) e Zonas Cardíacas (`ritmo-corrida-zonas-frequencia-cardiaca`)

## 1. Identificação da Ferramenta

- **ID / Slug:** `ritmo-corrida-zonas-frequencia-cardiaca`
- **Nome Oficial:** Calculadora de Ritmo de Corrida e Zonas de Frequência Cardíaca
- **Categoria:** Saúde (`categorySlug: saude`)
- **URL Canônica:** `/tools/saude/ritmo-corrida-zonas-frequencia-cardiaca.html`
- **Data da Implementação:** `2026-10-28`
- **Status da Fórmula:** `verified`
- **Status no Catálogo:** `published`
- **Implementação:** `factory`

---

## 2. Auditoria Prévia de Duplicatas e Ferramentas Correlatas

- **Nenhuma ferramenta existente** realizava cálculos de ritmo de corrida (pace), projeções de tempos de maratona ou zonas de frequência cardíaca de treinamento.
- **Conclusão:** Ferramenta inédita e essencial para a categoria de Saúde, esportes e condicionamento físico.

---

## 3. Metodologia de Cálculo e Fórmulas Adotadas

### 3.1. Cinemática de Corrida
- **Ritmo Médio (Pace por km):**
  $$\text{Pace}_{\text{s/km}} = \frac{\text{Tempo total em segundos}}{\text{Distância em km}}$$
  Formatado em `MM:SS / km`.
- **Ritmo por Milha:**
  $$\text{Pace}_{\text{s/mi}} = \text{Pace}_{\text{s/km}} \times 1{,}609344$$
- **Velocidade Média:**
  $$v_{\text{km/h}} = \frac{\text{Distância em km}}{\text{Tempo em horas}} = \frac{3600}{\text{Pace}_{\text{s/km}}}$$
- **Projeções de Prova:**
  Tempo estimado para distâncias oficiais clássicas: $1\text{ km}$, $5\text{ km}$, $10\text{ km}$, $15\text{ km}$, $21{,}0975\text{ km}$ (Meia Maratona) e $42{,}195\text{ km}$ (Maratona).

### 3.2. Frequência Cardíaca Máxima — Equação de Tanaka et al. (2001)
$$FC_{\text{máx}} = 208 - (0{,}7 \times \text{Idade})$$

### 3.3. Zonas de Treinamento Cardiorrespiratório (ACSM / Karvonen)
- **Método Percentual Direto:**
  $$FC_{\text{zona}} = FC_{\text{máx}} \times \%_{\text{intensidade}}$$
- **Método de Karvonen (quando informada a FC de repouso $FC_{\text{repouso}}$):**
  $$FCR = FC_{\text{máx}} - FC_{\text{repouso}}$$
  $$FC_{\text{zona}} = FC_{\text{repouso}} + (FCR \times \%_{\text{intensidade}})$$
- **As 5 Zonas Fisiológicas:**
  - **Zona 1 (50% a 60%):** Muito Leve / Regenerativa (Borg 9-11)
  - **Zona 2 (60% a 70%):** Leve / Aeróbica Base (Borg 11-13)
  - **Zona 3 (70% a 80%):** Moderada / Aeróbica de Ritmo (Borg 13-15)
  - **Zona 4 (80% a 90%):** Difícil / Limiar Anaeróbico de Lactato (Borg 15-17)
  - **Zona 5 (90% a 100%):** Máxima / Potência Anaeróbica e VO2máx (Borg 17-20)

### 3.4. Alertas e Limitações Médicas
- Identificação explícita de que as zonas cardíacas são estimativas matemáticas populacionais com desvio de $\pm 10\text{ bpm}$;
- Recomendação formal de avaliação cardiológica prévia (teste ergoespirométrico).

---

## 4. Fontes e Referências Confiáveis

1. Tanaka H, Monahan KD, Seals DR. *Age-predicted maximal heart rate revisited*. Journal of the American College of Cardiology, 2001; 37(1):153-156.
2. Karvonen MJ, Kentala E, Mustala O. *The effects of training on heart rate: a longitudinal study*. Ann Med Exp Biol Fenn, 1957; 35(3):307-315.
3. American College of Sports Medicine (ACSM). *ACSM's Guidelines for Exercise Testing and Prescription*. 11th ed. Philadelphia: Wolters Kluwer, 2021.
4. Borg GA. *Psychophysical bases of perceived exertion*. Med Sci Sports Exerc, 1982; 14(5):377-381.
5. Seiler S. *What is best practice for training intensity and duration distribution in endurance athletes?* Int J Sports Physiol Perform, 2010; 5(3):276-291.
