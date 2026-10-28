# Implementação — Calculadora de Reserva de Emergência (`reserva-emergencia`)

## 1. Identificação da Ferramenta

- **ID / Slug:** `reserva-emergencia`
- **Nome Oficial:** Calculadora de Reserva de Emergência
- **Categoria:** Financeiro (`categorySlug: financas`)
- **URL Canônica:** `/tools/financas/reserva-emergencia.html`
- **Data da Implementação:** `2026-10-28`
- **Status da Fórmula:** `verified`
- **Status no Catálogo:** `published`
- **Implementação:** `factory` (arquitetura dinâmica baseada em `src/pages/`, `layout: tool` e `discoverPublicFactoryTools`)

---

## 2. Auditoria Prévia de Duplicatas e Ferramentas Correlatas

Antes da implementação, realizou-se auditoria criteriosa em `data/tools.json`, `js/tools-catalog.js` e na documentação do projeto:
- **`meta-comprar-bem` (`/tools/financas/meta-comprar-bem.html`):** Focada exclusivamente em metas de consumo e acumulação para aquisição de bens com preço alvo fixo (carro, moto, imóvel à vista, viagem, computador). Não opera com despesas essenciais mensais, não avalia meses de cobertura de sobrevivência familiar, não compara horizontes por perfil de estabilidade profissional e trata o patrimônio como capital a ser gasto ao final do plano.
- **`orcamento-domestico` (`/tools/financas/orcamento-domestico.html`):** Focado no balanço mensal de fluxo de caixa (receitas correntes versus despesas fixas e variáveis). Apura saldo mensal imediato e percentual da renda comprometido, mas não projeta colchão de segurança, não calcula meses de cobertura proporcionados pelo patrimônio acumulado nem simula rota de formação de reserva.
- **`juros` / `amortizacao`:** Calculadoras genéricas ou focadas em dívida bancária.
- **Conclusão:** Não existe no CalculadoraMaster ferramenta voltada ao cálculo da reserva de emergência e gestão de risco pessoal baseada em meses de custo de vida essencial. A nova ferramenta atende a uma demanda financeira indispensável e claramente distinta, sem duplicidade funcional.

---

## 3. Metodologia de Cálculo e Fórmulas Adotadas

A metodologia estrutura-se nos princípios consolidados do planejamento financeiro pessoal:

### 3.1. Tratamento Rigoroso em Centavos Inteiros
- Todos os valores monetários informados são convertidos internamente em centavos inteiros via `parseMoneyToCents`, eliminando qualquer imprecisão inerente ao ponto flutuante IEEE 754.

### 3.2. Meta Recomendada da Reserva de Emergência
A meta financeira baseia-se estritamente no custo mensal essencial de sobrevivência ($D_{\text{ess}}$) multiplicado pelo horizonte de cobertura desejado ($m_{\text{desejado}}$):
$$R_{\text{meta}} = D_{\text{ess}} \times m_{\text{desejado}}$$

### 3.3. Diagnóstico do Saldo Atual
A partir do capital já acumulado e disponível com liquidez imediata ($S_{\text{atual}}$):
1. **Meses de cobertura proporcionados:**
   $$m_{\text{atual}} = \frac{S_{\text{atual}}}{D_{\text{ess}}}$$
2. **Percentual de conclusão da meta:**
   $$\text{Progresso} = \left( \frac{S_{\text{atual}}}{R_{\text{meta}}} \right) \times 100$$
3. **Valor restante a acumular:**
   $$F_{\text{falta}} = \max(0, R_{\text{meta}} - S_{\text{atual}})$$

### 3.4. Rota de Acumulação e Prazo Estimado
Quando o usuário informa uma capacidade regular de aporte mensal ($P > 0$):
- **Sem Rentabilidade ($i = 0$):**
  $$n = \left\lceil \frac{F_{\text{falta}}}{P} \right\rceil$$
- **Com Rentabilidade Líquida Estimada ($r > 0$ a.a.):**
  Calcula-se a taxa mensal equivalente por juros compostos:
  $$i = (1 + r/100)^{1/12} - 1$$
  Simula-se mês a mês a incidência de juros sobre o saldo acumulado no início de cada mês ($S_{k-1}$) somado ao aporte no final do mês ($P$), até que $S_k \ge R_{\text{meta}}$. Apura-se também o total de rendimentos acumulados gerados pelo capital.

### 3.5. Separação Estrita entre Reserva e Rendimento Hipotético
- A ferramenta enfatiza pedagogicamente que a reserva de emergência tem como propósito a **segurança do capital e a liquidez imediata**, devendo ser mantida em ativos de baixo risco garantidos pelo FGC ou Tesouro Nacional (Tesouro Selic, CDB diário 100% CDI). A rentabilidade informada atua apenas como estimativa secundária de rendimento passivo, sem inflar ou desvirtuar a meta nominal necessária de proteção.

### 3.6. Cenários de Cobertura Multi-Perfil (Tabela Comparativa)
Apresenta de forma simultânea quatro cenários de referência recomendados por especialistas:
- **3 meses:** Servidor público estatutário / Alta estabilidade empregatícia;
- **6 meses:** Trabalhador celetista (CLT) / Estabilidade moderada com rede de proteção trabalhista (FGTS e seguro-desemprego);
- **9 meses:** Família de renda única ou profissional CLT com forte componente de comissões/variável;
- **12 meses:** Autônomo, MEI, Freelancer, empresário ou profissional PJ.

Para cada cenário, exibe a meta em reais, percentual coberto pelo saldo atual, valor que falta e prazo estimado com o aporte atual.

---

## 4. Testes Automatizados Implementados

O arquivo `tests/reserva-emergencia.test.js` cobre 13 testes automatizados:
1. Despesas mensais: validação de zero, negativas e valores positivos.
2. Reserva atual: cenários com reserva zero, parcial e superior à meta.
3. Quantidade de meses de cobertura: múltiplos prazos (1 a 36 meses) e limites estourados.
4. Aportes mensais: sem aporte (sugestões automáticas) e com aportes regulares.
5. Rentabilidade: comparação entre taxa zero e taxa positiva (juros compostos).
6. Precisão monetária: validação com valores fracionados em centavos.
7. Cenários multi-perfil: apuração correta para 3, 6, 9 e 12 meses.
8. Validação defensiva de limites e inputs inválidos.
9. Comparação independente contra modelo analítico isolado.
10. Geração limpa de textos estruturados (`buildCopyText` e `formatResult`) sem `undefined` ou `NaN`.
11. Integração com DOM via `setupTool`, cálculo dinâmico e limpeza de formulário.
12. Conformidade HTML semântica, acessibilidade e ausência de estilos inline ou `<br>`.
13. Registro e reconhecimento do ID `reserva-emergencia` em `VALID_TOOL_IDS` de favoritos.

---

## 5. Acessibilidade e Interface

- Formulário estruturado com classes padronizadas do design system (`.card.tool-calculator-card`, `.form-group`).
- Labels explicitamente associadas aos campos via `for` e `id`.
- Textos de ajuda acessíveis associados por `aria-describedby`.
- Tratamento de mensagens de erro em `<p id="erroReservaEmergencia" role="alert" aria-live="assertive">`.
- Apresentação de resultados em `<section id="resultadoReservaEmergencia" aria-live="polite">`.
- Barra de progresso visual acessível com atributos `role="progressbar"`, `aria-valuenow`, `aria-valuemin` e `aria-valuemax`.
- Tabela de cenários encapsulada em container responsivo `.table-responsive` com `scope="col"`.
- Ações integradas de copiar resumo, compartilhar e imprimir via `createResultActions`.
- Conteúdo educativo complementar com estrutura hierárquica `<h2>` e `<h3>`.
