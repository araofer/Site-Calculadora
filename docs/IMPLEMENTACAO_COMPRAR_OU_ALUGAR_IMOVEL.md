# Implementação — Calculadora Comprar ou Alugar Imóvel (`comprar-ou-alugar-imovel`)

## 1. Identificação da Ferramenta

- **ID / Slug:** `comprar-ou-alugar-imovel`
- **Nome Oficial:** Calculadora Comprar ou Alugar Imóvel
- **Categoria:** Financeiro (`categorySlug: financas`)
- **URL Canônica:** `/tools/financas/comprar-ou-alugar-imovel.html`
- **Data da Implementação:** `2026-10-27`
- **Status da Fórmula:** `verified`
- **Status no Catálogo:** `published`
- **Implementação:** `factory` (arquitetura dinâmica baseada em `src/pages/`, `layout: tool` e `discoverPublicFactoryTools`)

---

## 2. Auditoria Prévia de Duplicatas e Ferramentas Correlatas

Antes da implementação, realizou-se auditoria em `data/tools.json`, `js/tools-catalog.js` e na documentação do repositório:
- **`financiamento-imovel` (`/tools/financas/financiamento-imovel.html`):** Focado exclusivamente na simulação do financiamento bancário pelo Sistema SAC (cálculo de parcelas, amortização, juros e renda mínima). Não calcula aluguel, custo de oportunidade do capital nem projeta investimentos alternativos.
- **`divisao-aluguel` (`/tools/financas/divisao-aluguel.html`):** Focado no rateio de aluguel e despesas entre múltiplos moradores (por renda, quartos ou partes iguais). Não faz comparações entre compra e locação.
- **`meta-comprar-bem` (`/tools/financas/meta-comprar-bem.html`):** Focado em acumulação prévia para compra à vista (quanto guardar por mês ou em quanto tempo alcança a meta). Não compara o fluxo contínuo de moradia de quem compra financiado versus quem aluga.
- **`juros`, `amortizacao`, `orcamento-domestico`:** Ferramentas complementares para seus fins específicos.
- **Conclusão:** Não existe no CalculadoraMaster ferramenta com o objetivo de comparar a aquisição de imóvel (financiada ou à vista) com o aluguel e investimento da diferença de capital. Inexistência de duplicidade funcional confirmada.

---

## 3. Metodologia de Cálculo e Fórmulas Adotadas

A simulação baseia-se no princípio da **equivalência de fluxos de caixa e custo de oportunidade**:

### 3.1. Tratamento Rigoroso em Centavos
- Valores monetários são convertidos e manipulados internamente em centavos inteiros (`parseMoneyToCents`), eliminando erros de arredondamento inerentes ao ponto flutuante IEEE 754.

### 3.2. Desembolso Inicial (Mês 0)
- **Comprador:** Desembolsa a entrada ($E$) somada aos custos de transferência imobiliária ($C_{aq}$), calculados sobre o preço de compra ($P$):
  $$D_0 = E + \text{round}(P \times \text{percCustosAquisicao})$$
  Seus investimentos iniciais são $S_{\text{inv,comp}}(0) = 0$.
- **Locatário:** Não adquire o imóvel. No início (mês 0), ele investe na sua carteira de investimentos exatamente o mesmo montante do desembolso inicial:
  $$S_{\text{inv,loc}}(0) = D_0$$

### 3.3. Financiamento Imobiliário (Price ou SAC)
- Principal Financiado: $P_{\text{fin}} = \max(0, P - E)$.
- Taxa mensal efetiva do financiamento ($r_{\text{fin,aa}}$ em percentual):
  $$i_{\text{fin}} = (1 + r_{\text{fin,aa}}/100)^{1/12} - 1$$
- **SAC (Sistema de Amortização Constante):**
  Amortização constante mensal base: $A = \lfloor P_{\text{fin}} / n \rfloor$.
  No mês $m$ (onde $S_{\text{dev}}(m-1) > 0$):
  $$J_m = \begin{cases} \text{round}(S_{\text{dev}}(m-1) \times i_{\text{fin}}), & \text{se } i_{\text{fin}} > 0 \\ 0, & \text{se } i_{\text{fin}} = 0 \end{cases}$$
  Na última parcela ($m = n$) ou quando $A \ge S_{\text{dev}}(m-1)$:
  $$A_m = S_{\text{dev}}(m-1)$$
  Nas demais parcelas ($m < n$):
  $$A_m = \min(S_{\text{dev}}(m-1), A)$$
  Prestação base: $P_m = A_m + J_m$.
  O resíduo monetário da divisão inteira em centavos ($\sum_{k=1}^{n-1} A < P_{\text{fin}}$) é absorvido estritamente na última parcela, garantindo que o total amortizado coincida rigorosamente com $P_{\text{fin}}$ e o saldo devedor resulte em exatos R$ 0,00, sem saldos negativos nem resíduos.

- **Tabela Price (Sistema Francês):**
  Prestação base constante teórica:
  $$\text{PMT} = \begin{cases} \lceil P_{\text{fin}} / n \rceil, & \text{se } i_{\text{fin}} = 0 \\ \text{round}\left( P_{\text{fin}} \times \frac{i_{\text{fin}} (1 + i_{\text{fin}})^n}{(1 + i_{\text{fin}})^n - 1} \right), & \text{se } i_{\text{fin}} > 0 \end{cases}$$
  Amortização teórica: $A_{\text{teor}} = \max(0, \text{PMT} - J_m)$.
  Na última parcela contratada ($m = n$) ou caso o arredondamento de centavos faça a amortização teórica cobrir o saldo devedor restante antes do prazo ($A_{\text{teor}} \ge S_{\text{dev}}(m-1)$):
  $$A_m = S_{\text{dev}}(m-1)$$
  $$P_m = A_m + J_m$$
  Nas demais parcelas:
  $$A_m = A_{\text{teor}}$$
  $$P_m = \text{PMT}$$
  Isso garante que a simulação cesse pagamentos imediatamente após a quitação e ajuste a prestação de encerramento exatamente ao saldo devido mais juros do mês, sem cobrar além do montante devido.

- Prestação total: $P_{\text{total}, m} = P_m + C_{\text{mensal}}$ (onde $C_{\text{mensal}}$ engloba seguros MIP/DFI e taxa de administração bancária). Quando a dívida atinge $S_{\text{dev}} = 0$, $P_{\text{total}, m} = 0$.

### 3.4. Fluxo Mensal e Investimento da Diferença (Meses 1 a $N$)
Para cada mês $m$ (onde $N = \text{periodoAnos} \times 12$):
1. **Custo habitacional do Comprador:** Prestação do mês (se ainda houver dívida ativa) + Despesas do proprietário (condomínio, IPTU e manutenção) corrigidas pelo reajuste anual.
2. **Custo habitacional do Locatário:** Aluguel mensal + Despesas do inquilino corrigidos anualmente a cada 12 meses.
3. **Rendimento das carteiras:** O saldo de investimentos no início do mês rende juros à taxa mensal equivalente $i_{\text{inv}} = (1 + r_{\text{inv,aa}}/100)^{1/12} - 1$.
4. **Equalização de Desembolso:**
   $$\Delta = C_{\text{comp}}(m) - C_{\text{loc}}(m)$$
   - Se $\Delta > 0$: Comprar foi mais caro. O locatário aporta $\Delta$ em seus investimentos no fim do mês.
   - Se $\Delta < 0$: Alugar foi mais caro. O comprador aporta $|\Delta|$ em seus investimentos no fim do mês.
   Dessa forma, ambos alocam exatamente a mesma quantidade de dinheiro em todos os meses da simulação.

### 3.5. Patrimônio Líquido Final (Mês $N$)
- **Valor do Imóvel Projetado:** $V(N) = \text{round}(P \times (1 + v_{\text{aa}}/100)^{\text{periodoAnos}})$.
- **Custos de Venda Futuros:** $C_{\text{venda}} = \text{round}(V(N) \times \text{custoVendaPerc})$.
- **Saldo Devedor Restante:** $S_{\text{dev}}(N)$ apurado no cronograma da dívida.
- **Patrimônio Líquido do Comprador:**
  $$\text{PL}_{\text{comp}} = (V(N) - C_{\text{venda}} - S_{\text{dev}}(N)) + S_{\text{inv,comp}}(N)$$
- **Patrimônio Líquido do Locatário:**
  $$\text{PL}_{\text{loc}} = S_{\text{inv,loc}}(N)$$
- **Decisão:** A ferramenta aponta qual alternativa acumulou maior patrimônio e a diferença financeira, acompanhada de avisos de sensibilidade quando a diferença for estreita (< 5%).

---

## 4. Testes Automatizados Implementados

O arquivo `tests/comprar-ou-alugar-imovel.test.js` cobre 31 testes específicos (19 de conformidade geral e 12 da auditoria de amortização e quitação SAC/Price):

### 4.1. Testes de Regra de Negócio e Comparação Geral
1. Compra à vista com entrada de 100% (sem dívida e sem juros).
2. Financiamento integral com entrada zero.
3. Normalização de entradas superiores a 100% do preço.
4. Financiamento com taxa de juros zero (0% a.a.).
5. Comparação e comportamento contrastante entre Price e SAC.
6. Período de comparação inferior ao financiamento (apuração de saldo devedor restante).
7. Período de comparação igual ao financiamento (quitação exata).
8. Período de comparação superior ao financiamento (cessação de parcelas e acúmulo de investimentos pelo comprador).
9. Impacto de reajuste anual de aluguel versus aluguel sem reajuste.
10. Simulação com valorização imobiliária zero.
11. Simulação com rentabilidade de investimentos zero.
12. Custos de aquisição e venda iguais a zero.
13. Manipulação precisa de moedas e parsing em centavos inteiros.
14. Validação e rejeição de entradas negativas, prazos inválidos e limites.
15. Caso de referência calculado independentemente sem funções de produção.
16. Textos estruturados de cópia (`buildCopyText`) e resumo sem `undefined`.
17. Integração completa com o DOM, inicialização, cálculo e limpeza.
18. Conformidade HTML semântica, acessibilidade e ausência de estilos inline ou `<br>`.
19. Reconhecimento do ID no sistema oficial de favoritos.

### 4.2. Auditoria Específica de Amortização SAC e Price (12 Cenários)
20. **Auditoria 1:** Principal indivisível exatamente pelo prazo em centavos: quitação exata em centavos em SAC e Price.
21. **Auditoria 2:** Taxa de juros zero: ausência de juros e amortização integral pura em SAC e Price.
22. **Auditoria 3:** Principal pequeno com prazo longo: quitação exata sem resíduo nem saldo negativo em SAC e Price.
23. **Auditoria 4:** Principal elevado com prazo longo: precisão em centavos sem estouro numérico em SAC e Price.
24. **Auditoria 5:** Taxa positiva com juros mensais arredondados em centavos em SAC e Price.
25. **Auditoria 6:** Período de comparação menor que o prazo do financiamento: saldo remanescente sem quitação antecipada em SAC e Price.
26. **Auditoria 7:** Período de comparação exatamente igual ao prazo do financiamento: quitação exata em SAC e Price.
27. **Auditoria 8:** Período de comparação maior que o prazo do financiamento: cessação de parcelas bancárias e continuidade de custos de moradia em SAC e Price.
28. **Auditoria 9:** Compra à vista sem financiamento em SAC e Price.
29. **Auditoria 10:** Saldo devedor final rigorosamente igual a R$ 0,00 após término contratado em múltiplos prazos em SAC e Price.
30. **Auditoria 11:** Inexistência de saldos negativos e de pagamentos posteriores à quitação em SAC e Price.
31. **Auditoria 12:** Validação independente do saldo devedor e totais contra modelo isolado de referência em SAC e Price.
