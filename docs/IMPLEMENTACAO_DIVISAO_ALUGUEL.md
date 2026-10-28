# Implementação — Calculadora de Divisão de Aluguel e Despesas (`divisao-aluguel`)

## 1. Identificação da Ferramenta

- **ID / Slug:** `divisao-aluguel`
- **Nome Oficial:** Calculadora de Divisão de Aluguel e Despesas
- **Categoria:** Financeiro (`categorySlug: financas`)
- **URL Canônica:** `/tools/financas/divisao-aluguel.html`
- **Data da Implementação:** `2026-10-26`
- **Status da Fórmula:** `verified`
- **Status no Catálogo:** `published`
- **Implementação:** `factory` (arquitetura dinâmica baseada em `src/pages/`, `layout: tool` e `discoverPublicFactoryTools`)

---

## 2. Auditoria Prévia de Duplicatas e Ferramentas Correlatas

Antes da implementação, foi realizada varredura completa no catálogo (`data/tools.json`), nas páginas (`src/pages/`) e nos scripts (`js/tools/`):
- **`dividir-conta` (`/tools/financas/dividir-conta.html`):** Ferramenta voltada exclusivamente para contas pontuais de consumo em restaurantes, bares e festas, com cálculo de taxa de serviço (10%) e divisão do couvert. Não atende despesas recorrentes de moradia, aluguel, condomínio, múltiplos pagadores com crédito cruzado nem compensação de saldos entre moradores.
- **`orcamento-domestico` (`/tools/financas/orcamento-domestico.html`):** Planejador orçamentário mensal focado no controle das despesas totais de uma família contra rendas, categorizando gastos essenciais e supérfluos. Não possui rateio entre pessoas nem conciliação de transferências entre devedores e credores.
- **Resultado:** Nenhuma ferramenta existente cobria a divisão de aluguel e despesas domésticas compartilhadas. Foi mantida a distinção total de responsabilidades sem duplicação de funcionalidade.

---

## 3. Regras de Negócio e Metodologia de Cálculo

### 3.1. Tratamento Rigoroso de Precisão Monetária (Centavos Inteiros por Conversão Textual Direta)
- A função `parseMoneyToCents` converte a entrada textual validada diretamente para centavos inteiros via manipulação de string e aritmética de inteiros, sem depender de multiplicação por 100 em ponto flutuante (`* 100`), evitando os desvios inerentes ao padrão IEEE 754.
- **Formatos suportados:**
  - Padrão brasileiro com separador de milhar e vírgula decimal: `"R$ 1.234,56"`, `"1.234,56"`, `"1234,56"`.
  - Padrão com ponto decimal: `"1234.56"`, `"1500.75"`.
  - Valores estritamente inteiros: `"1500"`.
- **Precisão superior a duas casas decimais:** Entradas com mais de duas casas decimais (ex: `"10,555"` ou `"10,554"`) sofrem arredondamento bancário/aritmético padrão diretamente na terceira casa decimal: se o terceiro dígito for $\ge 5$, acrescenta-se 1 centavo; caso contrário, preserva-se o valor das duas primeiras casas.
- Todas as operações subsequentes de rateio, soma de faturas, determinação de saldos e cálculo de transferências operam exclusivamente sobre centavos inteiros.
- A saída é formatada para o padrão monetário brasileiro `pt-BR` via `Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })`.

### 3.2. Modalidades de Divisão das Despesas
1. **Divisão Igualitária (`igualitaria`):**
   - O total acumulado de despesas $T$ é dividido igualmente entre os $N$ moradores cadastrados.
   - A cota base em centavos é $c_{\text{base}} = \lfloor T / N \rfloor$.
   - O resto da divisão $R = T \pmod N$ (centavos residuais de dízimas) é distribuído determinística e equitativamente aos primeiros $R$ moradores (1 centavo adicional a cada um).
   - Invariante rigorosa: $\sum_{i=1}^N \text{Cota}_i = T$.
2. **Divisão Proporcional Personalizada (`personalizada`):**
   - Cada morador tem associado um percentual $p_i$ de responsabilidade.
   - **Validação estrita de percentuais:** Exige-se que $\sum_{i=1}^N p_i = 100,00\%$. Se a soma divergir de 100% ou se houver percentual negativo, o formulário bloqueia a apuração e exibe aviso claro em `role="alert"`.
   - Distribuição de centavos por **Método dos Maiores Restos (Hare-Niemeyer):**
     - Cota exata preliminar: $\text{cotaReal}_i = \frac{T \times p_i}{100}$.
     - Cota base inteira: $c_i = \lfloor \text{cotaReal}_i \rfloor$.
     - Centavos remanescentes: $R = T - \sum_{i=1}^N c_i$.
     - Os $R$ centavos são atribuídos em ordem decrescente aos moradores com as maiores partes fracionárias $(\text{cotaReal}_i - c_i)$, com desempate determinístico pelo índice de cadastro.
   - Invariante rigorosa: $\sum_{i=1}^N \text{Cota}_i = T$.

### 3.3. Balanço Financeiro Individual (Saldo Devedor / Credor)
- Para cada morador $i$, apura-se:
  - $\text{Total Pago}_i = \sum \text{Despesas pagas por } i$.
  - $\text{Saldo Final}_i = \text{Total Pago}_i - \text{Cota Devida}_i$.
- **Classificação do Saldo:**
  - $\text{Saldo}_i > 0$: **Credor** (adiantou mais do que devia; tem valor a receber).
  - $\text{Saldo}_i < 0$: **Devedor** (pagou menos do que sua cota; deve repassar dinheiro).
  - $\text{Saldo}_i = 0$: **Quitado** (valor adiantado coincide exatamente com a cota).

### 3.4. Estratégia Gulosa de Liquidação de Saldos (Garantia de até N - 1 Transferências)
- **Objetivo e Garantias:** Liquidar todas as pendências financeiras de forma determinística e prática, sem pagamentos ou cobranças duplicadas, garantindo que todas as contas sejam zeradas em **no máximo $N - 1$ transferências** para $N$ participantes com saldo diferente de zero.
- **Não Garantia de Mínimo Global:** O método guloso não garante o menor número possível de transferências em todos os casos gerais (problema NP-difícil análogo ao particionamento de subconjuntos).
  - *Exemplo de contraexemplo:*
    - Credores: +R$ 4,00, +R$ 3,00 e +R$ 2,00 (Total = +R$ 9,00).
    - Devedores: -R$ 5,00 e -R$ 4,00 (Total = -R$ 9,00).
    - Mínimo global teórico: 3 transferências (Devedor de R$ 5,00 paga R$ 3,00 e R$ 2,00; Devedor de R$ 4,00 paga R$ 4,00).
    - Execução do algoritmo guloso: O maior devedor (R$ 5,00) casa com o maior credor (R$ 4,00) e transfere R$ 4,00, restando R$ 1,00 de dívida; em seguida, o devedor de R$ 4,00 paga R$ 3,00 ao credor de R$ 3,00, restando R$ 1,00; restam dois devedores de R$ 1,00 para saldar o credor de R$ 2,00, totalizando 4 transferências.
    - A liquidação atende perfeitamente à invariante de conservação de centavos ($\sum \text{Dívidas} = \sum \text{Créditos}$) e respeita a cota máxima de $N - 1 = 5 - 1 = 4$ transferências.
- **Passos do Algoritmo:**
  1. Separa participantes com saldo negativo (devedores) e saldo positivo (credores).
  2. Ordena ambas as filas em ordem decrescente pelo módulo da quantia pendente em centavos.
  3. A cada iteração, o maior devedor transfere $v = \min(|\text{dívida}|, \text{crédito})$ para o maior credor.
  4. Abate-se $v$ de ambas as contas. Aquele cujo saldo zera é removido da fila correspondente (garantindo que ao menos 1 participante é liquidado a cada passo).
  5. O processo encerra quando ambas as filas estão vazias.
- **Invariante de Conservação:** $\sum \text{Transferências} = \sum \text{Créditos} = \sum \text{Dívidas}$.

---

## 4. Estrutura de Arquivos e Componentes

1. **Módulo de Lógica e Interface:**
   - [`js/tools/divisao-aluguel.js`](file:///home/araofer/Documentos/github/CalculadoraMaster/js/tools/divisao-aluguel.js)
   - Exporta: `parseMoneyToCents`, `parsePercent`, `formatCurrency`, `formatPercent`, `calculateRentSplit`, `formatResult`, `buildCopyText`, `setupTool`, `MODOS_DIVISAO`, `DESPESAS_PADRAO`.
2. **Página-Fonte Estática:**
   - [`src/pages/tools/financas/divisao-aluguel.page.html`](file:///home/araofer/Documentos/github/CalculadoraMaster/src/pages/tools/financas/divisao-aluguel.page.html)
   - Adota `layout: tool`, tags semânticas, atributos `aria-*`, estrutura compatível com CSS compartilhado do projeto e seções explicativas para SEO.
3. **Catálogo de Ferramentas:**
   - [`data/tools.json`](file:///home/araofer/Documentos/github/CalculadoraMaster/data/tools.json): Registro da ferramenta sob categoria `Financeiro` (`categorySlug: financas`) com recursos de tabela, cópia, compartilhamento e impressão habilitados. Preservada estritamente a quebra de linha CRLF padrão do arquivo.
4. **Gerenciador de Favoritos:**
   - [`js/core/favorites.js`](file:///home/araofer/Documentos/github/CalculadoraMaster/js/core/favorites.js): Inclusão do ID `divisao-aluguel` em `VALID_TOOL_IDS`.
5. **Suíte de Testes Automatizados:**
   - [`tests/divisao-aluguel.test.js`](file:///home/araofer/Documentos/github/CalculadoraMaster/tests/divisao-aluguel.test.js): 14 testes cobrindo divisão igualitária (2, 3 e 4 moradores com centavos residuais), divisão personalizada (60/40), validações de erro, casos com despesas zeradas, múltiplos pagadores cruzados, invariantes de liquidação gulosa, cópia formatada, manipulação de DOM e validação semântica do HTML.
   - Atualizações correspondentes em `tests/build-html.test.js`, `tests/favorites.test.js` e `tests/seo.test.js`.

---

## 5. Verificações e Testes Executados

- **`node --test tests/divisao-aluguel.test.js`:** 14/14 testes aprovados (100%).
- **`npm test`:** 575/575 testes aprovados em todo o repositório sem qualquer regressão.
- **`npm run build:data`:** 37 ferramentas validadas, catálogo gerado e sitemap com 65 URLs.
- **`npm run build:prod`:** 71 páginas HTML compiladas com sucesso para `dist/`.
- **`git diff --check`:** Zero inconsistências de espaços em branco ou quebras de linha.

---

## 6. Limitações e Orientações de Uso

1. **Finalidade Orientativa:** A ferramenta destina-se ao rateio financeiro interno entre moradores e casais. Não constitui recibo formal de quitação locatícia perante imobiliárias ou proprietários locadores regidos pela Lei do Inquilinato (Lei nº 8.245/1991).
2. **Transferências Bancárias:** As transações sugeridas refletem uma recomendação matemática para minimização de TEDs/Pix e dependem da anuência e execução direta pelos próprios participantes.
