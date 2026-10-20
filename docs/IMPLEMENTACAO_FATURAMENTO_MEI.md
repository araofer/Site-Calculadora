# Implementação — Calculadora de Projeção de Faturamento MEI (`projecao-faturamento-mei`)

## 1. Visão Geral

- **ID / Slug:** `projecao-faturamento-mei`
- **Categoria:** `Financeiro` (`financas`)
- **Rota pública:** `/tools/financas/projecao-faturamento-mei.html`
- **Página-fonte:** `src/pages/tools/financas/projecao-faturamento-mei.page.html`
- **Módulo JavaScript:** `js/tools/projecao-faturamento-mei.js`
- **Testes automatizados:** `tests/projecao-faturamento-mei.test.js`

## 2. Verificação Oficial do Limite Legal e Ressalvas

- **Data da verificação:** `2026-10-20`
- **Fontes oficiais consultadas:**
  1. Presidência da República / Casa Civil — Lei Complementar nº 123, de 14 de dezembro de 2006 (`https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp123.htm`), especificamente:
     - **Art. 18-A, § 1º e § 2º:** limite geral de receita bruta anual de **R$ 81.000,00** (ou R$ 6.750,00 multiplicados pelo número de meses compreendido entre o início da atividade e o final do respectivo ano-calendário).
     - **Art. 18-F:** limite anual específico de **R$ 251.600,00** para o transportador autônomo de cargas (MEI Caminhoneiro).
  2. Portal do Empreendedor / Receita Federal (`https://www.gov.br/empresas-e-negocios/pt-br/empreendedor/perguntas-frequentes/o-que-e-o-microempreendedor-individual-mei/qual-o-limite-de-faturamento-do-mei`).
- **Ressalva técnica:** propostas legislativas em tramitação no Congresso Nacional (como projetos de lei complementar para reajuste do teto do MEI) dependem de aprovação definitiva, sanção presidencial e vigência em exercício financeiro aplicável. Por esse motivo, o campo **Limite anual de faturamento bruto para comparação** é inicializado com **R$ 81.000,00**, mas permanece **totalmente configurável pelo usuário** para contemplar abertura proporcional no ano-calendário, MEI Caminhoneiro ou eventuais atualizações futuras.

## 3. Entradas e Validações

| Campo | Identificador | Unidade | Padrão | Regra de validação |
| :--- | :--- | :--- | :--- | :--- |
| Faturamento bruto já acumulado no ano | `#faturamentoAcumuladoMei` | R$ | `0` | $\ge 0$ e $\le \text{R\$ } 100.000.000,00$ |
| Faturamento bruto mensal de referência | `#faturamentoMensalReferenciaMei` | R$ | — | $\ge 0$ e $\le \text{R\$ } 100.000.000,00$ |
| Quantidade de meses restantes | `#mesesRestantesMei` | meses | `6` | Inteiro de `1` a `12` |
| Crescimento mensal esperado | `#crescimentoMensalMei` | % | `0` | Entre `-100%` e `500%` |
| Limite anual de faturamento bruto | `#limiteAnualMei` | R$ | `81000,00` | $> 0$ e $\le \text{R\$ } 100.000.000,00$ |

## 4. Fórmulas e Premissas

1. **Separação temporal sem contagem duplicada:**
   - O *faturamento acumulado* representa apenas os meses já realizados.
   - Os *meses restantes* ($N \in \{1, \dots, 12\}$) representam exclusivamente os meses futuros.
2. **Projeção mensal composta:**
   Para cada mês futuro $m = 1, \dots, N$:
   $$\text{Faturamento projetado}_m = \text{Faturamento do mês anterior} \times \left(1 + \frac{\text{Crescimento percentual}}{100}\right)$$
   Onde o mês anterior ao 1º mês futuro é o $\text{Faturamento mensal de referência}$. Quando o crescimento é $0\%$, cada mês futuro permanece constante e igual ao valor de referência.
3. **Total projetado para os meses restantes:**
   $$\text{Total projetado restante} = \sum_{m=1}^{N} \text{Faturamento projetado}_m$$
4. **Faturamento anual projetado:**
   $$\text{Faturamento anual projetado} = \text{Faturamento acumulado} + \text{Total projetado restante}$$
5. **Indicadores em relação ao limite anual:**
   - **Percentual utilizado:** $\left(\frac{\text{Faturamento anual projetado}}{\text{Limite anual}}\right) \times 100$
   - **Valor restante até o limite:** $\max(0, \text{Limite anual} - \text{Faturamento anual projetado})$
   - **Valor que ultrapassa o limite:** $\max(0, \text{Faturamento anual projetado} - \text{Limite anual})$
   - **Média mensal projetada:** $\frac{\text{Total projetado restante}}{N}$
   - **Faturamento mensal compatível com o limite restante:** $\frac{\max(0, \text{Limite anual} - \text{Faturamento acumulado})}{N}$
6. **Classificação textual de situação:**
   - **Abaixo do limite (`abaixo`):** percentual utilizado $< 80\%$
   - **Próxima do limite (`proximo`):** $80\% \le \text{percentual utilizado} \le 100\%$
   - **Acima do limite (`acima`):** faturamento anual projetado $> \text{Limite anual}$
