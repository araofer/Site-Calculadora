# Implementação da Calculadora Fator R do Simples Nacional — CalculadoraMaster

## 1. Visão Geral e Contexto Fiscal

A **Calculadora Fator R do Simples Nacional** apura a relação percentual entre a folha de salários com encargos e a receita bruta total acumulada, determinando se atividades de prestação de serviços sujeitas à sistemática do Fator R serão tributadas com base nas alíquotas do **Anexo III** (mais favoráveis, a partir de 6,00%) ou do **Anexo V** (a partir de 15,50%) da Lei Complementar nº 123/2006.

A ferramenta foi projetada e revisada com conformidade estrita às fontes primárias da legislação tributária brasileira:
- **Lei Complementar nº 123/2006** (arts. 18, §§ 5º-J, 5º-K e 5º-M);
- **Resolução CGSN nº 140/2018 (art. 26 e art. 27)** — texto consolidado e compilado oficial;
- **Solução de Consulta Cosit nº 17/2021** (obrigatoriedade do regime de caixa para a folha de salários);
- **Resolução CGSN nº 190/2026** (adequação à Reforma Tributária com efeitos a partir de 1º de janeiro de 2027);
- **Perguntas e Respostas do Simples Nacional** (Receita Federal do Brasil).

Fonte oficial da Resolução CGSN nº 140/2018 (compilada):
[Normas Receita Federal - Resolução CGSN nº 140/2018 Compilada](https://normas.receita.fazenda.gov.br/sijut2consulta/normas.receisulta/link.action?idAto=92278&visao=compilado)

---

## 2. Fórmula Geral, Variáveis e Janelas de Referência

### A. Fórmula Geral
$$\text{Fator R} = \frac{\text{FS}}{\text{RBT}} \times 100$$

### B. Janelas de Referência Temporal por Ano de Competência

A **Resolução CGSN nº 190/2026** produz efeitos, em regra, a partir de **1º de janeiro de 2027**, alterando o caput e incisos do art. 26 da Resolução CGSN nº 140/2018. Por isso, a ferramenta não reutiliza silenciosamente a janela antiga em 2027:

1. **Competências de 2026 (Resolução CGSN nº 140/2018 anterior):**
   - **FS12:** Folha de salários nos **12 meses anteriores ao período de apuração**.
   - **RBT12r:** Receita bruta total acumulada nos **12 meses anteriores ao período de apuração**.
   - Não há defasagem de mês: para a apuração de outubro/2026, a janela é de outubro/2025 a setembro/2026.

2. **Competências de 2027 em diante (Resolução CGSN nº 190/2026, art. 26, I e II):**
   - **FS12:** Folha de salários nos **12 meses antecedentes ao mês anterior ao período de apuração**.
   - **RBT12r:** Receita bruta total acumulada nos **12 meses antecedentes ao mês anterior ao período de apuração**.
   - Há defasagem de 1 mês: para a apuração de março/2027, o mês anterior é fevereiro/2027 e a janela de 12 meses antecedentes vai de fevereiro/2026 a janeiro/2027.

### C. Composição da Folha de Salários (Regime de Caixa Obrigatório)
- **Componentes elegíveis (art. 26, § 1º da Res. CGSN nº 140/2018):**
  - Salários e remunerações pagas a empregados e pessoas físicas;
  - Pró-labore efetivamente pago a sócios e titulares;
  - 13º Salário na competência de incidência previdenciária;
  - CPP Patronal efetivamente recolhida (inclusive a do Simples Nacional);
  - FGTS efetivamente recolhido.
- **Regime de Caixa (SC Cosit nº 17/2021):** Computam-se os valores **efetivamente pagos** na janela de referência, independentemente do regime de competência de faturamento adotado no PGDAS-D.
- **Exclusões legais expressas:** Aluguéis, distribuição de lucros aos sócios, bolsas de estágio (Lei nº 11.788/2008) e serviços pagos a MEI.

### D. Composição da Receita Bruta Total Acumulada
- Soma das receitas auferidas no **mercado interno** com as receitas de **exportações** para o exterior (LC nº 123/2006, art. 18, § 5º-M).

### E. Critério de Enquadramento
- **Fator R $\ge 28,00\%$ ($0,28$):** Enquadramento no **Anexo III**.
- **Fator R $< 28,00\%$ ($0,28$):** Enquadramento no **Anexo V**.
- **Invariante Matemática:** A decisão compara o valor contínuo exato com 0,28. Arredondamentos visuais (ex: 27,9995% exibido como 28,00%) não distorcem o enquadramento fiscal, que permanece rigorosamente no Anexo V.

---

## 3. Tratamento Fiscal dos Casos de Folha e Receita Iguais a Zero

Com base no art. 26 da Resolução CGSN nº 140/2018, em sua redação aplicável:

### A. Períodos posteriores ao mês de início de atividade (Regra Regular e Meses 2 a 12 em 2026)
- **FS12 = 0 e RBT12r = 0:** Fator R fixado por lei em **1,00% (0,01)** $\rightarrow$ **Anexo V** (art. 26, § 7º, inciso I).
- **FS12 > 0 e RBT12r = 0:** Fator R fixado por lei em **28,00% (0,28)** $\rightarrow$ **Anexo III** (art. 26, § 7º, inciso II). O valor de 100% é incorreto e foi expressamente removido.
- **FS12 = 0 e RBT12r > 0:** Fator R fixado por lei em **1,00% (0,01)** $\rightarrow$ **Anexo V** (art. 26, § 7º, inciso IV).
- **FS12 > 0 e RBT12r > 0:** Apuração direta pela razão $\text{FS12} \div \text{RBT12r}$ (art. 26, § 7º, inciso III).

### B. Próprio mês de início de atividade em 2026 (1º mês de funcionamento)
- **FSPA > 0 e RPAr = 0:** Fator R fixado em **28,00% (0,28)** $\rightarrow$ **Anexo III** (art. 26, § 6º, inciso I).
- **FSPA = 0 e RPAr > 0:** Fator R fixado em **1,00% (0,01)** $\rightarrow$ **Anexo V** (art. 26, § 6º, inciso II).
- **FSPA > 0 e RPAr > 0:** Apuração direta pela razão $\text{FSPA} \div \text{RPAr}$ (ou proporcionalizado por 12, que equivale à mesma razão, art. 26, § 6º, inciso III).
- **FSPA = 0 e RPAr = 0:** Na primeira competência de atividade sem registro de folha e sem faturamento, a legislação do Simples Nacional não prevê regra expressa de atribuição de percentual fictício nem de enquadramento automático (art. 26, § 6º). A calculadora **não inventa percentual nem anexo**: o resultado é retornado como **Indeterminado**, apresentando mensagem orientativa clara para conferência direta no PGDAS-D ou com profissional contábil.

---

## 4. Início de Atividade e Transição de 2026 para 2027

### A. Regras para o Ano-Calendário 2026 (Resolução CGSN nº 140/2018)
- **1º Mês de Atividade:** Proporcionalização dos dados da própria competência (FSPA e RPAr) anualizados por 12.
- **2º ao 12º Mês de Atividade:** Proporcionalização pela média aritmética dos meses anteriores decorridos multiplicada por 12 (art. 26, § 4º):
  $$\text{FS12}_{\text{prop}} = \frac{\sum \text{FS}_{\text{ant}}}{N} \times 12 \quad ; \quad \text{RBT12r}_{\text{prop}} = \frac{\sum \text{Rec}_{\text{ant}}}{N} \times 12$$
- **A partir do 13º Mês:** A empresa já possui 12 meses anteriores ao período de apuração, passando imediatamente à regra geral regular de 2026.

### B. Regras para o Ano-Calendário 2027 em diante (Resolução CGSN nº 190/2026)
- **1º e 2º Meses de Atividade (art. 26, § 6º):**
  - **Presunção Legal Fixa em 28,00% (0,28):** A Resolução CGSN nº 190/2026 (art. 26, § 6º) estabelece que nos **dois primeiros meses de início de atividade**, o Fator R é considerado automaticamente em **0,28 (28,00%)**, enquadrando diretamente as empresas recém-criadas no **Anexo III**, sem exigir comprovação prévia ou proporcionalização retroativa.
- **3º ao 13º Mês de Atividade e períodos posteriores ao 2º mês (art. 26, § 7º, conforme redação alterada):**
  - Devido à nova janela temporal (12 meses antecedentes ao mês anterior ao período de apuração, art. 26, § 7º), o número de meses disponíveis para apuração corresponde a $M = N - 2$ (onde $N$ é o mês de atividade da empresa):
    - **No 3º mês:** O mês anterior ao PA é o mês 2. A janela antecedente contempla apenas $1$ mês decorrido (o 1º mês). Os valores são anualizados multiplicando por 12.
    - **No 4º mês:** A janela contempla $2$ meses antecedentes (meses 1 e 2). Anualização: média dos 2 meses $\times 12$.
    - **No 13º mês:** O mês anterior ao PA é o mês 12. A janela antecedente contempla $11$ meses antecedentes (meses 1 a 11). Como a empresa tem 13 meses de atividade (menos de 14 meses), ela ainda recebe o tratamento proporcional de início de atividade: média dos 11 meses antecedentes $\times 12$.
- **14º Mês em diante (empresas com mais de 13 meses, art. 26, § 7º):**
  - No 14º mês, o mês anterior é o mês 13 e os meses antecedentes são os meses 1 a 12 (12 meses completos). A empresa deixa o regime de início de atividade e passa a seguir a **regra geral regular aplicável em 2027 (art. 26, § 7º)**, utilizando diretamente os 12 meses antecedentes ao mês anterior ao período de apuração.

---

## 5. Limitações da Ferramenta

1. **Restrição ao Fator R:** A calculadora apura exclusivamente o índice de corte e o anexo correspondente. Não calcula a guia DAS consolidada nem substitui a declaração mensal no PGDAS-D.
2. **Atividades Elegíveis:** Aplicável estritamente às atividades sujeitas ao Fator R listadas no art. 18, § 5º-J da LC nº 123/2006. Atividades dos Anexos I, II, III puro ou IV puro tributam por suas regras ordinárias.
3. **Ausência de Regra Expressa para Mês 1 com Valores Nulos:** No 1º mês em 2026 com folha zero e receita zero, o sistema aponta a indefinição legal e orienta consulta profissional, prevenindo enquadramentos indevidos.

---

## 6. Cenários de Testes Automatizados e Cobertura Completa

A suíte [`tests/fator-r.test.js`](file:///home/araofer/Documentos/github/CalculadoraMaster/tests/fator-r.test.js) cobre 19 testes automatizados de ponta a ponta:

| ID | Cenário Obrigatório / Requisito | Resultado Obtido | Status |
|:---|:---|:---|:---:|
| 1 | Em 2026, após o mês de início, FS12 = 0 e RBT12r = 0 | Fator R = 1,00% (0,01) ➔ Anexo V | Aprovado |
| 2 | Em 2026, após o mês de início, FS12 > 0 e RBT12r = 0 | Fator R = 28,00% (0,28) ➔ Anexo III (100% removido) | Aprovado |
| 3 | No 1º mês de 2026, folha positiva e receita zero | Fator R = 28,00% (0,28) ➔ Anexo III | Aprovado |
| 4 | No 1º mês de 2026, folha zero e receita positiva | Fator R = 1,00% (0,01) ➔ Anexo V | Aprovado |
| 5 | No 1º mês de 2026, folha e receita ambas zero | Indeterminado (sem inventar anexo ou %) com aviso | Aprovado |
| 6 | Dois primeiros meses de atividade em 2027 | Fator R = 28,00% (0,28) ➔ Anexo III (presunção legal) | Aprovado |
| 7 | 3º mês de 2027 usa janela correta da nova redação | Janela = 1 mês antecedente anualizado por 12 | Aprovado |
| 8 | 13º mês de 2027 recebe tratamento de início de atividade | Janela = 11 meses antecedentes anualizados por 12 | Aprovado |
| 9 | 14º mês de 2027 segue a regra regular aplicável | Janela = 12 meses antecedentes completos (regra regular) | Aprovado |
| 10 | Janela de referência de 2026 permanece inalterada | 12 meses anteriores sem defasagem de mês anterior | Aprovado |
| 11 | Limites de 27,999%, 28,000% e 28,001% | Rigorosamente delimitados (Anexo V / III / III) | Aprovado |
| 12 | Arredondamento visual não altera enquadramento | 27,9995% exibe 28,00%, mas enquadra no Anexo V | Aprovado |
| 13 | Composição detalhada da folha | FS = R$ 84.000,00, RBT = R$ 300.000,00 -> 28,00% -> Anexo III | Aprovado |
| 14 | Vedações da folha (aluguéis, lucros, estagiários, MEI) | Validado em avisos e vedações expressas | Aprovado |
| 15 | Mercado interno + exportações (LC 123/2006) | RBT12r consolidada conjuntamente | Aprovado |
| 16 | Regime de caixa na folha (SC Cosit 17/2021) | Validado em memória de cálculo e avisos | Aprovado |
| 17 | Validações e rejeição de entradas inválidas | Valores negativos e anos inválidos rejeitados | Aprovado |
| 18 | Conformidade HTML, acessibilidade e SEO | Sem style inline, sem `<br>`, semântica completa | Aprovado |
| 19 | Integração DOM | Cálculo, limpeza, cópia com memória detalhada | Aprovado |
