# Implementação — Calculadora de Meta para Comprar um Bem (`meta-comprar-bem`)

## 1. Identificação da Ferramenta

- **ID / Slug:** `meta-comprar-bem`
- **Nome Oficial:** Calculadora de Meta para Comprar um Bem
- **Categoria:** Financeiro (`categorySlug: financas`)
- **URL Canônica:** `/tools/financas/meta-comprar-bem.html`
- **Data da Implementação:** `2026-10-27`
- **Status da Fórmula:** `verified`
- **Status no Catálogo:** `published`
- **Implementação:** `factory` (arquitetura dinâmica baseada em `src/pages/`, `layout: tool` e `discoverPublicFactoryTools`)

---

## 2. Auditoria Prévia de Duplicatas e Ferramentas Correlatas

Antes da criação dos arquivos, foi realizada auditoria detalhada em `data/tools.json`, `src/pages/` e `js/tools/`:
- **`juros` (`/tools/financas/juros.html`):** Calculadora genérica de juros simples e compostos a partir de um capital inicial único ou taxa pré-definida, sem contexto de metas de consumo, aportes regulares de aquisição nem cálculo reverso de tempo/aporte para atingimento de preço alvo.
- **`financiamento-carro` / `financiamento-imovel` (`/tools/financas/financiamento-*.html`):** Focadas em amortização de dívidas contraídas via empréstimo bancário (Tabela Price/SAC), com parcelas de pagamento de juros a instituições financeiras. A nova ferramenta opera na lógica oposta: acumulação patrimonial para compra à vista sem endividamento bancário.
- **`orcamento-domestico` (`/tools/financas/orcamento-domestico.html`):** Balanço mensal entre receitas e despesas correntes de uma família, sem módulo de evolução de capital ao longo do tempo nem metas específicas de aquisição de bens.
- **`projecao-faturamento-mei` (`/tools/financas/projecao-faturamento-mei.html`):** Projeção fiscal de faturamento para microempreendedores individuais com verificação de enquadramento tributário.
- **Resultado:** Nenhuma ferramenta existente cobria o planejamento para aquisição de bens com acumulação de poupança/investimentos. Não houve sobreposição de escopo.

---

## 3. Fórmulas Matemáticas, Premissas e Regras de Negócio

### 3.1. Tratamento Rigoroso de Precisão Monetária (Centavos Inteiros)
- A função `parseMoneyToCents` converte valores monetários textuais (`R$ 10.000,00`, `10.000,00` ou `10000.00`) diretamente em centavos inteiros via manipulação de string e arredondamento aritmético na terceira casa decimal, eliminando imprecisões de ponto flutuante do padrão IEEE 754.
- Todas as simulações, amortizações de aportes e rendimentos operam exclusivamente com centavos inteiros.

### 3.2. Conversão da Taxa de Rentabilidade Efetiva
A rentabilidade anual $r$ informada pelo usuário (em percentual) é tratada como taxa efetiva anual. A taxa mensal equivalente $i$ é calculada rigorosamente por equivalência composta de taxas:
$$i = (1 + r)^{1/12} - 1$$
Não é utilizada a divisão nominal linear ($r / 12$), preservando o rigor técnico financeiro. Se $r = 0$, adota-se $i = 0$.

### 3.3. Momento de Ocorrência dos Aportes e Rendimentos
- **Rendimento:** Incide sobre o saldo existente no **início** de cada mês ($S_{m-1}$).
- **Aporte:** Ocorre no **final** de cada mês ($P$).
- **Evolução do Saldo do Mês $m$:**
$$J_m = \text{round}(S_{m-1} \times i)$$
$$S_m = S_{m-1} + J_m + P$$

### 3.4. Modo A — "Quanto preciso guardar por mês?" (Prazo Fixo)
Dado o preço do bem $M$ (em centavos), o capital inicial já economizado $S_0$ e o prazo em meses $n$:
1. **Com Rentabilidade Positiva ($i > 0$):**
   - O saldo inicial projeta-se em $n$ meses como:
   $$S_{0,\text{proj}} = S_0 \times (1 + i)^n$$
   - O montante que ainda precisa ser suprido pelos aportes mensais com rendimento é:
   $$\Delta = \max(0, M - S_{0,\text{proj}})$$
   - O aporte mensal necessário $P$ corresponde à anuidade de valor futuro:
   $$P = \Delta \times \frac{i}{(1 + i)^n - 1}$$
   - Converte-se $P$ para centavos inteiros via `Math.ceil`, garantindo que a meta seja integralmente atingida ou ligeiramente superada por fração de centavo.
2. **Sem Rentabilidade ($i = 0$):**
   $$P = \left\lceil \frac{M - S_0}{n} \right\rceil$$

### 3.5. Modo B — "Em quanto tempo atingirei a meta?" (Aporte Mensal Fixo)
Dado o preço do bem $M$, capital inicial $S_0$, aporte mensal $P$ e taxa mensal $i$:
- O motor de cálculo simula mês a mês até que o saldo $S_m \ge M$ ou até o teto de 600 meses (50 anos).
- Se a meta não for atingida em 600 meses, a ferramenta apresenta aviso explicativo transparente, informando o saldo acumulado aos 50 anos e demonstrando que os parâmetros atuais são insuficientes.
- A data estimada de conquista é apurada a partir da data atual do sistema: somam-se os meses atingidos e apresenta-se o mês/ano previsto em português (ex: "setembro de 2027 (09/2027)").

### 3.6. Invariante Fundamental da Simulação
Em todos os cenários e modos de cálculo, a invariante contábil de conservação de centavos é estritamente satisfeita:
$$\text{Saldo Final} = \text{Saldo Inicial} + \text{Total de Aportes Próprios} + \text{Total de Rendimentos Gerados}$$

### 3.7. Limitações e Avisos Educativos ao Usuário
- **Meta Nominal a Valores Atuais:** A ferramenta alerta expressamente que não projeta aumento inflacionário do bem nem reajustes futuros de preços de mercado.
- **Simulação Hipotética:** Destaca que rentabilidades estimadas não representam promessa ou garantia de rentabilidade futura.

---

## 4. Validações e Tratamento de Erros

- **Preço do bem:** Obrigatório, estritamente maior que zero.
- **Valor já economizado:** Opcional (padrão 0), não pode ser negativo.
- **Prazo desejado (Modo A):** Número inteiro positivo entre 1 e 600 meses.
- **Aporte mensal (Modo B):** Não negativo.
- **Aporte zero com taxa zero:** Bloqueia o cálculo com erro explicativo amigável em `role="alert"`.
- **Rentabilidade anual:** Entre 0% e 500% a.a.
- **Meta já atingida:** Se o valor economizado $\ge$ preço do bem, a interface parabeniza o usuário informando que a meta já foi alcançada sem necessidade de novos aportes.

---

## 5. Auditoria de Acessibilidade e Interface

- Estrutura semântica com `<h1>` único e subtítulos `<h2>`/`<h3>` hierárquicos.
- Associação estrita de todos os `<label for="...">` aos respectivos `<input id="...">` e `<select id="...">`.
- Suporte a leitor de tela via `aria-describedby` para textos de ajuda em todos os campos.
- Mensagens de erro em `<p id="erroMetaComprarBem" role="alert" aria-live="assertive">`.
- Resultados dinâmicos em `<section id="resultadoMetaComprarBem" aria-live="polite">`.
- Tabela de evolução temporal encapsulada em `.mei-projection-table-wrapper` com `overflow-x: auto`, garantindo legibilidade completa sem rolagem horizontal no documento principal.
- Integração completa de botões de ação:
  - **Limpar campos:** Restaura o formulário para os valores padrão e oculta resultados.
  - **Copiar resumo:** Gera texto formatado e limpo para compartilhamento ou arquivamento pessoal.
  - **Compartilhar:** Integra-se à Web Share API com fallback automático.
  - **Imprimir:** Regras de CSS de impressão configuradas em `css/style.css`.

---

## 6. Resultados dos Testes Automatizados

Suíte de testes dedicada implementada em `tests/meta-comprar-bem.test.js` com **17 especificações rigorosas** aprovadas:
1. `calculateEffectiveMonthlyRate - Conversão correta de taxa anual efetiva em mensal equivalente`;
2. `parseMoneyToCents - Parser monetário rigoroso em centavos inteiros`;
3. `calculateGoal Modo A - Taxa zero e divisão direta pelo prazo`;
4. `calculateGoal Modo A - Rentabilidade positiva com conversão efetiva e juros acumulados`;
5. `calculateGoal Modo A - Meta já atingida no início`;
6. `calculateGoal Modo A - Prazo de exatamente 1 mês`;
7. `calculateGoal Modo A - Validação de entradas inválidas, prazos negativos e acima de 600 meses`;
8. `calculateGoal Modo B - Aportes mensais com taxa zero`;
9. `calculateGoal Modo B - Aportes mensais com taxa anual positiva e estimativa de data`;
10. `calculateGoal Modo B - Meta já atingida no início`;
11. `calculateGoal Modo B - Aporte zero e rentabilidade zero rejeitado com erro explicativo`;
12. `calculateGoal Modo B - Meta não atingida dentro do limite de 600 meses (50 anos)`;
13. `calculateGoal - Invariante fundamental de conservação: Saldo Final = Inicial + Aportes + Rendimentos`;
14. `calculateGoal - Caso independente de referência validado matematicamente`;
15. `buildCopyText - Formatação limpa e completa para transferência/cópia`;
16. `DOM initMetaComprarBem - Inicialização de elementos, alternância de modo e cálculo integrado`;
17. `DOM initMetaComprarBem - Limpeza de campos e tratamento de acessibilidade`.

Além dos testes unitários específicos:
- `npm test`: **100% de aprovação** em toda a suíte de testes do repositório.
- `npm run build:data`: **38 ferramentas catalogadas e 66 URLs no sitemap validadas com sucesso**.
- `npm run verify:ssg`: **72 páginas estáticas compiladas e aprovadas sem divergências**.
- `npm run audit:prod`: **Aprovado com sucesso total** (ESM, integridade, SEO, mobile, equivalência dist/dist-pilot).

---

## 7. Resultados da Revisão Visual nos 4 Viewports (Chrome Headless)

Revisão visual automatizada executada via Chrome Headless em servidor HTTP local servindo o diretório de produção `dist/`:

| Viewport | `window.innerWidth` | `scrollWidth` | `clientWidth` | Overflow Horizontal (`hasHScroll`) | Modo A (12m, 10% a.a.) | Modo B (R$ 800/mês, 10% a.a.) | Meta Já Atingida | Teto 600 Meses | Erros Console |
| :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **320 px** | 320 px | 320 px | 320 px | **Não (`false`)** | Aporte: R$ 709,70<br>Final: R$ 10.000,03 | Prazo: 11 meses<br>Previsão: 09/2027 | Destaque: "Meta Já Alcançada!" | Destaque: "Mais de 600 meses"<br>Saldo: R$ 6.000,00 | **0 erros** |
| **360 px** | 360 px | 360 px | 360 px | **Não (`false`)** | Aporte: R$ 709,70<br>Final: R$ 10.000,03 | Prazo: 11 meses<br>Previsão: 09/2027 | Destaque: "Meta Já Alcançada!" | Destaque: "Mais de 600 meses"<br>Saldo: R$ 6.000,00 | **0 erros** |
| **768 px** | 768 px | 768 px | 768 px | **Não (`false`)** | Aporte: R$ 709,70<br>Final: R$ 10.000,03 | Prazo: 11 meses<br>Previsão: 09/2027 | Destaque: "Meta Já Alcançada!" | Destaque: "Mais de 600 meses"<br>Saldo: R$ 6.000,00 | **0 erros** |
| **1366 px** | 1366 px | 1351 px | 1351 px | **Não (`false`)** | Aporte: R$ 709,70<br>Final: R$ 10.000,03 | Prazo: 11 meses<br>Previsão: 09/2027 | Destaque: "Meta Já Alcançada!" | Destaque: "Mais de 600 meses"<br>Saldo: R$ 6.000,00 | **0 erros** |

---

## 8. Arquivos Criados e Alterados

### Criados:
1. `js/tools/meta-comprar-bem.js` — Motor desacoplado de cálculo e integração DOM.
2. `src/pages/tools/financas/meta-comprar-bem.page.html` — Página estática fonte com arquitetura `layout: tool`.
3. `tests/meta-comprar-bem.test.js` — Suíte de testes com 17 verificações unitárias e de integração.
4. `docs/IMPLEMENTACAO_META_COMPRAR_BEM.md` — Documentação técnica completa.

### Alterados:
1. `data/tools.json` — Registro da ferramenta com metadados, features e palavras-chave.
2. `js/core/favorites.js` — Inclusão de `meta-comprar-bem` em `VALID_TOOL_IDS`.
3. `css/style.css` — Regras de impressão para ocultar formulário, botões de ação e alertas na impressão.
4. `js/tools-catalog.js` e `sitemap.xml` — Atualizados via `npm run build:data`.
5. `tests/favorites.test.js`, `tests/build-html.test.js`, `tests/seo.test.js` — Atualização das contagens de ferramentas publicadas (37 para 38 ferramentas, 71 para 72 páginas).
