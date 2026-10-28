# Implementação e Documentação Técnica — Fluxo de Caixa Empresarial

## 1. Identificação da Ferramenta

- **ID / Slug:** `fluxo-de-caixa-empresarial`
- **Nome:** Calculadora de Fluxo de Caixa Empresarial
- **Categoria:** Financeiro (`categorySlug: financas`)
- **URL canônica:** `/tools/financas/fluxo-de-caixa-empresarial.html`
- **Status da fórmula:** `verified`
- **Status de publicação:** `published`
- **Implementação:** `factory`

---

## 2. Diagnóstico de Duplicidade Funcional

Antes da implementação, realizou-se auditoria rigorosa no catálogo do CalculadoraMaster (`data/tools.json` e `js/tools-catalog.js`) e nas calculadoras financeiras correlatas:

1. **`orcamento-domestico` (`/tools/financas/orcamento-domestico.html`):**
   - É voltada estritamente às finanças pessoais e familiares (moradia, supermercado, lazer, dependentes).
   - Trabalha com valores mensais estáticos consolidados, sem qualquer suporte a datas cronológicas, contas a pagar, contas a receber, status "previsto vs. realizado" ou linha do tempo de saldo bancário diário.
2. **`lucro` e `margem-markup`:**
   - Calculam a margem de lucro e markup unitário sobre produtos individuais (preço de venda versus custo de aquisição), sem relação com a movimentação bancária da empresa.
3. **`preco-servico` e `valor-hora`:**
   - Dimensionam a precificação de serviços com base em remuneração desejada e rateio de custos fixos.
4. **`projecao-faturamento-mei`:**
   - Acompanha o acúmulo anual de receita bruta contra o limite fiscal do MEI (R$ 81.000,00), sem controlar saldo bancário, pagamentos a fornecedores ou contas a pagar.
5. **`simulador-das-mei`:**
   - Simula o valor da guia única de tributos (DAS) mensal.

**Conclusão da Auditoria:**
Não existia no portal nenhuma ferramenta de gestão ou simulação de fluxo de caixa corporativo (contas a pagar/receber, conciliação e alerta de saldo negativo projetado). A criação da ferramenta é técnica e gerencialmente justificada.

---

## 3. Fontes Oficiais e Materiais de Referência

- **Data de Consulta:** 28 de outubro de 2026.
- **Fontes Oficiais:**
  1. **Sebrae Nacional — Portal Sebrae:**
     - Artigo: *Como Fazer o Fluxo de Caixa da Sua Empresa*
     - URL: `https://sebrae.com.br/sites/PortalSebrae/artigos/como-fazer-o-fluxo-de-caixa-da-sua-empresa`
  2. **Portal do Empreendedor — Governo Federal do Brasil:**
     - Gestão Financeira: *Fluxo de Caixa e Controle de Liquidez para Pequenos Negócios*
     - URL: `https://www.gov.br/empresas-e-negocios/pt-br/empreendedor/gestao/financas/fluxo-de-caixa`
  3. **Conselho Federal de Contabilidade (CFC) — NBC TG 03 (R3):**
     - Demonstração dos Fluxos de Caixa (Regime de Caixa vs. Regime de Competência).

---

## 4. Metodologia de Cálculo e Princípios Contábeis

### 4.1 Regime de Caixa vs. Regime de Competência (DRE)
A ferramenta aplica estritamente o **Regime de Caixa**:
- Uma entrada financeira não é necessariamente lucro contábil (ex: aporte de sócios, resgate de aplicação ou captação de empréstimo).
- Uma saída de caixa não é necessariamente despesa econômica do período (ex: amortização de principal de empréstimo, aquisição de máquinas e equipamentos).
- O fluxo de caixa foca na **liquidez imediata e na capacidade pontual de honrar compromissos financeiros nas datas contratadas**.
- **Nomenclatura Adequada (Variação Líquida de Caixa vs. Resultado Operacional):**
  A diferença consolidada entre o total de entradas e o total de saídas ($\sum \text{Entradas} - \sum \text{Saídas}$) é denominada **Variação Líquida de Caixa do Período** (ou Fluxo Líquido de Caixa). Essa distinção conceitual é fundamental: movimentações como aportes de capital, captação de empréstimos, compra de ativos imobilizados ou amortizações de dívidas afetam a liquidez sem constituir receitas ou despesas operacionais da Demonstração do Resultado do Exercício (DRE). Portanto, a ferramenta não confunde a variação monetária global de caixa com o "Resultado Operacional" contábil.

### 4.2 Fórmulas Fundamentais
1. **Saldo Realizado Atual:**
   $$\text{Saldo Realizado} = \text{Saldo Inicial} + \sum \text{Entradas Realizadas} - \sum \text{Saídas Realizadas}$$
2. **Saldo Projetado Final:**
   $$\text{Saldo Projetado} = \text{Saldo Realizado} + \sum \text{Entradas Previstas} - \sum \text{Saídas Previstas}$$
3. **Variação Líquida de Caixa do Período:**
   $$\text{Variação Líquida de Caixa} = \sum \text{Entradas Gerais} - \sum \text{Saídas Gerais}$$
   Representa o fluxo monetário líquido gerado ou consumido ao longo do período por todas as atividades (operacionais, financeiras e investimentos), relacionando-se diretamente aos saldos: $\text{Saldo Projetado Final} = \text{Saldo Inicial} + \text{Variação Líquida de Caixa}$.
4. **Não-Duplicação de Lançamentos:**
   - Cada transação financeira cadastrada pertence exclusivamente ao status `"realizado"` (já compensada na conta) OU `"previsto"` (compromisso agendado a vencer).
5. **Alerta de Caixa Negativo (Insolvência Momentânea):**
   - A ferramenta ordena cronologicamente todas as transações pela data (`YYYY-MM-DD`). A cada movimentação, o saldo corrente acumulado é recalculado:
   - Se em qualquer data o saldo projetado for menor que zero ($\text{Saldo Corrente} < 0$), o sistema emite alerta visual e identifica o **menor saldo projetado do período** e a **data crítica do déficit**, permitindo ações preventivas (negociação de prazos ou antecipação de recebíveis).
6. **Precisão Numérica:**
   - Todas as operações internas são calculadas em centavos inteiros (`parseMoneyToCents`), prevenindo imprecisões de ponto flutuante.

---

## 5. Arquitetura e Arquivos

- `data/tools.json`: Cadastro oficial da ferramenta nº 42 (`fluxo-de-caixa-empresarial`), com metadados, links e recursos.
- `js/tools/fluxo-de-caixa-empresarial.js`: Módulo com arquitetura Factory, cálculos matemáticos puros, gestão de lançamentos e integração DOM com `createResultActions`.
- `src/pages/tools/financas/fluxo-de-caixa-empresarial.page.html`: Interface com `layout: tool`, formulário semântico, tabelas responsivas encapsuladas em `.mei-projection-table-wrapper` e `.mei-projection-table`, painel analítico com `aria-live="polite"` e seção educativa.
- `tests/fluxo-de-caixa-empresarial.test.js`: Suíte de 12 testes unitários e de integração cobrindo saldo zero/positivo, previsto vs. realizado, ordenação temporal, detecção de déficit, centavos, resumo mensal e DOM.
- `js/core/favorites.js`: Registro de `fluxo-de-caixa-empresarial` em `VALID_TOOL_IDS` (42 ferramentas).
- `tests/favorites.test.js`, `tests/build-html.test.js`, `tests/seo.test.js`: Atualizações das contagens de assertivas de 41 para 42 ferramentas, 75 para 76 páginas e 92 para 93 assets.
