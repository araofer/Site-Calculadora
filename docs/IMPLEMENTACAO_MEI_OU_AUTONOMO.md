# Documentação Técnica — Calculadora MEI ou Autônomo? (`mei-ou-autonomo`)

## 1. Visão Geral

- **ID / Slug:** `mei-ou-autonomo`
- **Nome público:** Calculadora MEI ou Autônomo
- **Categoria:** Financeiro (`financas`)
- **URL pública:** `/tools/financas/mei-ou-autonomo.html`
- **Página-fonte SSG:** `src/pages/tools/financas/mei-ou-autonomo.page.html`
- **Módulo JavaScript:** `js/tools/mei-ou-autonomo.js`
- **Testes automatizados:** `tests/mei-ou-autonomo.test.js`
- **Status editorial:** `published`
- **Status da fórmula:** `verified` (fórmulas aritméticas e suíte automatizada verificadas; não representa certificação contábil ou jurídica)

### Escopo e Limitações

A **Calculadora MEI ou Autônomo?** é exclusivamente uma **simuladora financeira comparativa** de primeira ordem entre dois cenários:
1. **Cenário A — MEI convencional** (com estimativa de DAS mensal editável e verificação de limite anual/proporcional de faturamento).
2. **Cenário B — Autônomo pessoa física** (com estimativa de contribuição previdenciária de 11% ou 20% dentro do piso e teto do INSS e campo opcional para estimativa mensal de IRPF/Carnê-Leão).

A ferramenta **não** emite guias (DAS ou GPS/DARF), **não** realiza formalização no Portal do Empreendedor, **não** calcula automaticamente o IRPF/Carnê-Leão, **não** aplica automaticamente as regras específicas do MEI Caminhoneiro, **não** declara aptidão jurídica definitiva ao enquadramento no MEI e **não** recomenda automaticamente um regime como “o melhor”.

---

## 2. Parâmetros Oficiais de Referência (Ano-base 2026)

Os parâmetros estão centralizados na constante `PARAMETROS_REFERENCIA_2026` em `js/tools/mei-ou-autonomo.js`:

| Parâmetro | Valor de Referência (2026) | Observação |
| --- | --- | --- |
| Salário mínimo nacional | R$ 1.621,00 | Base para 5% do INSS no DAS-MEI, plano simplificado (11%) e piso do plano normal (20%) |
| Teto previdenciário (RGPS/INSS) | R$ 8.475,55 | Limite máximo do salário-de-contribuição previdenciário |
| DAS-MEI Comércio/Indústria (`comercio_industria`) | R$ 82,05 / mês | R$ 81,05 (INSS) + R$ 1,00 (ICMS) |
| DAS-MEI Serviços (`servicos`) | R$ 86,05 / mês | R$ 81,05 (INSS) + R$ 5,00 (ISS) |
| DAS-MEI Comércio e Serviços (`comercio_servicos`) | R$ 87,05 / mês | R$ 81,05 (INSS) + R$ 1,00 (ICMS) + R$ 5,00 (ISS) |
| Limite anual geral do MEI | R$ 81.000,00 | Vigente para 12 meses de atividade no ano-calendário |
| Limite proporcional mensal do MEI | R$ 6.750,00 / mês | Referência proporcional no ano de abertura ($6.750 \times \text{meses}$) |
| INSS Autônomo — Plano Simplificado (11%) | R$ 178,31 / mês | $11\% \times \text{R\$ } 1.621,00$ |
| INSS Autônomo — Plano Normal (20%) | R$ 324,20 a R$ 1.695,11 / mês | $20\%$ sobre a base de contribuição limitada entre R$ 1.621,00 e R$ 8.475,55 |

---

## 3. Fórmulas Implementadas

Sejam:
- $F_m \ge 0$: faturamento bruto mensal esperado (R$)
- $D_m \ge 0$: despesas operacionais mensais estimadas (R$)
- $M \in \{1, 2, \dots, 12\}$: quantidade de meses de atividade no ano-calendário

### 3.1 Projeções Comuns no Período

$$\text{Faturamento projetado no período } (F_p) = F_m \times M$$

$$\text{Despesas operacionais projetadas } (D_p) = D_m \times M$$

### 3.2 Cenário A — MEI Convencional

Seja $\text{DAS}_m \ge 0$ o valor mensal do DAS informado pelo usuário (ou preenchido com o valor de referência 2026 conforme o tipo de atividade selecionado):

$$\text{DAS projetado no período } (\text{DAS}_p) = \text{DAS}_m \times M$$

$$\text{Saldo estimado MEI (mensal)} = F_m - D_m - \text{DAS}_m$$

$$\text{Saldo estimado MEI (período)} = F_p - D_p - \text{DAS}_p$$

$$\text{Percentual do DAS sobre o faturamento} = \begin{cases} \dfrac{\text{DAS}_p}{F_p} \times 100, & \text{se } F_p > 0 \\ \text{não aplicável (`null`)}, & \text{se } F_p = 0 \end{cases}$$

**Limite de faturamento aplicável ao período:**

$$\text{Limite MEI aplicável } (L_p) = \begin{cases} 81.000,00, & \text{se } M = 12 \\ 6.750,00 \times M, & \text{se } 1 \le M < 12 \end{cases}$$

$$\text{Diferença para o limite} = L_p - F_p$$

- Se $F_p > L_p$: indica **possível extrapolação do limite de referência** (`ultrapassaLimite = true`, excesso $= F_p - L_p$).
- Se $F_p \le L_p$: indica que a projeção está dentro do limite numérico de referência (`ultrapassaLimite = false`, margem restante $= L_p - F_p$), acompanhado de aviso expresso de que estar dentro do teto não garante elegibilidade automática ao MEI.

### 3.3 Cenário B — Autônomo Pessoa Física

1. **Plano simplificado (`simplificado_11`):**
   $$\text{Base considerada} = 1.621,00 \quad \Rightarrow \quad \text{INSS}_m = \text{round}_2(1.621,00 \times 0,11) = 178,31$$

2. **Plano normal (`normal_20`):**
   Dada uma base informada $B_{\text{inf}}$ com $1.621,00 \le B_{\text{inf}} \le 8.475,55$:
   $$\text{INSS}_m = \text{round}_2(B_{\text{inf}} \times 0,20) \in [324,20;\; 1.695,11]$$

3. **Projeções e saldos no Cenário B:**
   $$\text{INSS projetado no período } (\text{INSS}_p) = \text{INSS}_m \times M$$
   $$\text{Saldo antes de IRPF/Carnê-Leão (mensal)} = F_m - D_m - \text{INSS}_m$$
   $$\text{Saldo antes de IRPF/Carnê-Leão (período)} = F_p - D_p - \text{INSS}_p$$

4. **Tratamento do campo opcional de IRPF/Carnê-Leão:**
   - **Quando deixado em branco (`irpfInformado = false`):** o imposto **não** é tratado como zero; `irpfMensal`, `irpfPeriodo`, `saldoAposIrpfMensal`, `saldoAposIrpfPeriodo` e `percentualTotalSobreFaturamento` permanecem `null`, e o saldo é apresentado explicitamente como *“Saldo estimado antes de IRPF/Carnê-Leão (IRPF/Carnê-Leão não informado)”*.
   - **Quando preenchido com valor válido $\text{IRPF}_m \ge 0$ (`irpfInformado = true`):**
     $$\text{IRPF}_p = \text{IRPF}_m \times M$$
     $$\text{Total de encargos estimados no período} = \text{INSS}_p + \text{IRPF}_p$$
     $$\text{Saldo após IRPF/Carnê-Leão (mensal)} = F_m - D_m - \text{INSS}_m - \text{IRPF}_m$$
     $$\text{Saldo após IRPF/Carnê-Leão (período)} = F_p - D_p - \text{INSS}_p - \text{IRPF}_p$$

### 3.4 Comparação entre Cenários

$$\text{Diferença de saldo no período} = \text{Saldo MEI (período)} - \text{Saldo de comparação do Autônomo (período)}$$

onde o saldo de comparação do Autônomo utiliza o saldo após IRPF/Carnê-Leão quando o usuário preencheu a estimativa opcional, ou o saldo antes de IRPF/Carnê-Leão quando o campo permaneceu em branco (com identificação explícita da base utilizada).

---

## 4. Fontes Oficiais Consultadas

1. **Perguntas Frequentes do Portal do Empreendedor (MEI — Gov.br):**
   `https://www.gov.br/empresas-e-negocios/pt-br/empreendedor/perguntas-frequentes`
2. **Lista Oficial de Ocupações Permitidas ao MEI (Gov.br):**
   `https://www.gov.br/empresas-e-negocios/pt-br/empreendedor/quero-ser-mei/quais-as-ocupacoes-que-podem-ser-mei`
3. **Valores Oficiais do DAS-MEI para 2026 (Portal do Simples Nacional / Receita Federal):**
   `https://www8.receita.fazenda.gov.br/SIMPLESNACIONAL/noticias/NoticiaCompleta.aspx?id=c3b2044c-ff97-432a-b33c-ecf2a3df6dc3`
4. **Tabela Oficial de Contribuição Mensal Previdenciária (INSS — Gov.br):**
   `https://www.gov.br/inss/pt-br/direitos-e-deveres/inscricao-e-contribuicao/tabela-de-contribuicao-mensal`

---

## 5. Integração com a Arquitetura do Projeto

- **Catálogo e SSG:** registrada em `data/tools.json` e compilada em `dist/tools/financas/mei-ou-autonomo.html` pelo pipeline `scripts/build-html.js`.
- **Favoritos:** ID `mei-ou-autonomo` incluído na lista `VALID_TOOL_IDS` de `js/core/favorites.js`.
- **Ações de resultado:** utiliza `createResultActions` de `js/core/result-actions.js` com `title`, `getSections`, `statusElement` e listeners explícitos para os botões `#btn-copy`, `#btn-share` e `#btn-print`.
- **Acessibilidade e responsividade:** rótulos associados via `for`/`id`, descrições via `aria-describedby`, `aria-live="polite"` para feedback e layout responsivo testado em 320px, 360px, 768px e 1366px sem rolagem horizontal.
