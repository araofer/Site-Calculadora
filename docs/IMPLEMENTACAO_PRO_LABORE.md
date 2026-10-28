# Implementação da Calculadora de Pró-labore (Competência 2026)

Este documento registra a fundamentação jurídica, fórmulas matemáticas, parâmetros fiscais e previdenciários oficiais de 2026, estrutura de código, cenários de teste automatizados e limitações técnicas da **Calculadora de Pró-labore** da plataforma **CalculadoraMaster**.

---

## 1. Contexto e Enquadramento Legal

O **pró-labore** é a remuneração fixada pela sociedade e paga mensalmente aos sócios, diretores e administradores pelo exercício efetivo de atividades laborais e de gestão.

### Enquadramento Previdenciário (Contribuinte Individual)
- **Natureza Jurídica:** Para a Seguridade Social, o sócio que recebe pró-labore qualifica-se como **Contribuinte Individual** (Lei nº 8.212/1991, art. 12, inciso V, alínea "f").
- **Obrigação Patronal de Retenção e Recolhimento (Lei nº 10.666/2003, art. 4º, caput):** A pessoa jurídica tomadora dos serviços é expressamente obrigada a arrecadar a contribuição previdenciária do contribuinte individual a seu serviço, descontando-a da respectiva remuneração (pró-labore) e recolhendo ao INSS juntamente com a contribuição a seu cargo até o dia vinte do mês subsequente via DCTFWeb/DARF Previdenciário (Lei nº 10.666/2003, art. 4º, caput c/c Lei nº 8.212/1991, art. 30, inciso I, alínea "b"). O § 1º do art. 4º da Lei nº 10.666/2003 é específico para cooperativas de trabalho e não se aplica à relação comum entre sociedade empresária e sócio-administrador.
- **Fundamentação Jurídica da Alíquota de 11% do Sócio:** A alíquota-base do contribuinte individual é de 20% (Lei nº 8.212/1991, art. 21, caput). Contudo, quando presta serviços a pessoas jurídicas sujeitas à contribuição patronal do art. 22, III (20%), aplica-se a regra do **art. 30, § 4º da Lei nº 8.212/1991** e do **art. 37, inciso II e § 1º da Instrução Normativa RFB nº 2.110/2022**, que faculta deduzir da sua contribuição mensal 45% da contribuição patronal devida pela empresa (limitada a dedução a 9% do salário de contribuição). Como $20\% \times 45\% = 9\%$, a alíquota final retida é de exatamente **$20\% - 9\% = 11\%$**, limitada ao teto do RGPS.
- **Diferenciação Expressa do Plano Simplificado do INSS:** A retenção de 11% sobre o pró-labore *não se confunde* com o Plano Simplificado de Previdência (Lei nº 8.212/1991, art. 21, § 2º, inciso I), descrito na tabela mensal do INSS com alíquota de 11%. O Plano Simplificado é uma faculdade pessoal para o segurado que recolhe por conta própria (código GPS 1163), aplicável estritamente sobre a base fixa de 1 salário mínimo e sem direito a aposentadoria por tempo de contribuição. Já a retenção patronal sobre o pró-labore é uma obrigação compulsória da empresa contratante, incidente sobre o montante real do pró-labore até o teto do RGPS e confere proteção previdenciária plena.
- **Não Aplicação da Tabela Progressiva de Empregados:** Não se aplica ao pró-labore a tabela progressiva de faixas de empregados celetistas (7,5% a 14%). A alíquota é fixa em **11%**, limitada estritamente ao teto do Regime Geral de Previdência Social (RGPS).
- **Parâmetros de 2026:**
  - **Salário Mínimo:** R$ 1.621,00.
  - **Teto do Salário de Contribuição (RGPS):** R$ 8.475,55.
  - **Desconto Máximo de INSS do Sócio:** $\text{R\$} 8.475,55 \times 11\% = \text{R\$} 932,31$.

### Pró-labore Abaixo do Salário Mínimo
Quando o pró-labore acordado for inferior a R$ 1.621,00, a empresa desconta 11% sobre o valor real pago. A calculadora **não altera silenciosamente a base para o salário mínimo**, mas emite aviso legal obrigatório esclarecendo que, por força do art. 195, § 14 da Constituição Federal e art. 29 da Emenda Constitucional nº 103/2019, a competência não será computada para tempo de contribuição nem carência previdenciária sem o recolhimento da complementação voluntária pelo sócio.

### Múltiplos Vínculos Previdenciários
Se o sócio já auferir outras remunerações sujeitas à incidência de INSS no mesmo mês (como contrato CLT ou pró-labore em outra pessoa jurídica), a soma das bases de cálculo não pode ultrapassar o teto de R$ 8.475,55:
$$\text{Base Disponível} = \max(0, 8.475,55 - \text{Outras Remunerações})$$
$$\text{INSS nesta fonte} = \min(\text{round2}(\min(\text{Pró-labore}, \text{Base Disponível}) \times 11\%), \max(0, 932,31 - \text{INSS Outras Fontes}))$$

---

## 2. Imposto de Renda Retido na Fonte (IRRF) em 2026

### A. Tabela Progressiva Mensal Oficial de 2026
Publicada pela Receita Federal do Brasil para o ano-calendário de 2026:

| Faixa de Base de Cálculo (R$) | Alíquota Nominal | Parcela a Deduzir do Imposto (R$) |
|:---|:---:|:---:|
| Até R$ 2.428,80 | 0,0% | R$ 0,00 (Isento) |
| De R$ 2.428,81 até R$ 2.826,65 | 7,5% | R$ 182,16 |
| De R$ 2.826,66 até R$ 3.751,05 | 15,0% | R$ 394,16 |
| De R$ 3.751,06 até R$ 4.664,68 | 22,5% | R$ 675,49 |
| Acima de R$ 4.664,68 | 27,5% | R$ 908,73 |

### B. Comparação entre Deduções Legais e Desconto Simplificado
A legislação autoriza apurar a base de cálculo mensal utilizando a opção mais favorável ao contribuinte:
1. **Deduções Legais:**
   $$\text{Base Legal} = \text{Pró-labore Bruto} - (\text{INSS retido} + N_{\text{dep}} \times 189,59 + \text{Pensão} + \text{Outras})$$
   - Dedução mensal por dependente em 2026: **R$ 189,59**.
2. **Desconto Simplificado Mensal:**
   $$\text{Base Simplificada} = \text{Pró-labore Bruto} - 607,20$$
   - Valor fixado oficialmente pela Receita Federal para 2026: **R$ 607,20**.

O sistema calcula o imposto devido sob os dois métodos e seleciona automaticamente aquele que resulta em **menor imposto final retido**.

### C. Redução Mensal do Imposto — Lei nº 15.270/2025
A **Lei nº 15.270/2025** instituiu a redução mensal do imposto de renda calculado para pessoas físicas, incidente sobre a base de **Rendimentos Tributáveis Mensais Brutos** (pró-labore bruto):
- **Faixa 1 (até R$ 5.000,00):** Redução integral do imposto devido ($\text{Redução} = \text{IRRF Apurado} \rightarrow \text{IRRF Final} = \text{R\$} 0,00$).
- **Faixa 2 (de R$ 5.000,01 até R$ 7.350,00 — Transição):**
  $$\text{Redução Calculada} = 978,62 - (0,133145 \times \text{Rendimento Tributável Mensal})$$
  A redução é limitada ao montante do imposto calculado, impedindo qualquer valor de imposto negativo:
  $$\text{Redução Aplicada} = \min(\text{IRRF Apurado}, \max(0, \text{Redução Calculada}))$$
  $$\text{IRRF Final} = \text{IRRF Apurado} - \text{Redução Aplicada}$$
- **Faixa 3 (acima de R$ 7.350,00):** Não há aplicação da redução ($\text{Redução} = 0$).

---

## 3. Encargos Previdenciários Patronais da Empresa

A ferramenta segrega de forma cristalina o **desconto previdenciário do sócio** dos **encargos devidos pela pessoa jurídica contratante**:

### A. Simples Nacional — Anexos I, II, III e V
- **Fundamento:** Lei Complementar nº 123/2006, art. 13, inciso VI.
- A Contribuição Previdenciária Patronal (CPP) sobre a folha de salários e remunerações pagas a contribuintes individuais está **substituída e unificada na alíquota do DAS**, recolhida sobre a receita bruta mensal da empresa.
- **Encargo Patronal Avulso:** R$ 0,00.
- **Custo Total da Empresa:** Igual ao valor bruto do pró-labore.

### B. Simples Nacional — Anexo IV
- **Fundamento:** Lei Complementar nº 123/2006, art. 18, § 5º-C; IN RFB nº 2.110/2022.
- As atividades do Anexo IV (construção civil, serviços de vigilância e limpeza, serviços advocatícios) **não têm a CPP incluída no DAS**.
- **Alíquota Patronal:** **20%** sobre o valor bruto do pró-labore (sem teto).
- **Custo Total da Empresa:** $\text{Pró-labore Bruto} + 20\%$.

### C. Empresas Fora do Simples Nacional — Regime Comum (Sem CPRB)
- **Fundamento:** Lei nº 8.212/1991, art. 22, inciso III.
- Para empresas que não se enquadram ou não optaram pelo regime da desoneração, incide a contribuição patronal ordinária de **20%** sobre as remunerações pagas a contribuintes individuais (sócios/administradores).
- Não incide contribuição para terceiros (Outras Entidades / Sistema S) nem RAT/FAP sobre o pró-labore de sócio/administrador.
- **Custo Total da Empresa:** $\text{Pró-labore Bruto} + 20\%$.

### D. Empresas Fora do Simples Nacional — Optantes pela CPRB em 2026
- **Fundamento da CPP Patronal:** Lei nº 14.973/2024, art. 9º-A (cronograma de reoneração gradual da desoneração da folha).
- Em 2026, o regime de transição fixa a contribuição previdenciária patronal sobre a folha em **50% das alíquotas do art. 22, incisos I e III da Lei nº 8.212/1991**.
- Sobre o pró-labore, a alíquota patronal aplicável é de **10%** ($50\% \times 20\%$).
- **CPRB sobre a Receita Bruta:** A empresa recolhe separadamente a contribuição sobre a receita bruta (60% da alíquota setorial prevista na Lei nº 12.546/2011). Como a receita bruta e a alíquota setorial não são informadas na calculadora, **essa parcela sobre a receita NÃO está incluída no custo total**, e o custo tributário fiscal total da empresa não pode ser determinado pela ferramenta nesta modalidade.
- **Custo Parcial da Empresa sobre o Pró-labore:** $\text{Pró-labore Bruto} + 10\%$.
- **Análise da Retenção de INSS do Sócio e Incerteza Jurídica (Lei nº 8.212/1991, art. 30, § 4º c/c IN RFB nº 2.110/2022, art. 37, § 1º):**
  - O art. 30, § 4º da Lei nº 8.212/1991 e o art. 37, § 1º da IN RFB nº 2.110/2022 autorizam o contribuinte individual a deduzir de sua contribuição "quarenta e cinco por cento da contribuição da empresa prevista no inciso III do art. 22 desta Lei, efetivamente recolhida ou declarada".
  - Em uma interpretação estritamente literal dessa regra sobre uma CPP patronal recolhida de 10%, a dedução do segurado seria de $10\% \times 45\% = 4,5\%$, o que implicaria retenção de $20\% - 4,5\% = 15,5\%$.
  - Não se deve confundir a retenção sobre notas fiscais de serviços com cessão de mão de obra (Lei nº 12.546/2011, art. 7º, § 6º) com a contribuição previdenciária descontada do sócio sobre o pró-labore: são institutos jurídicos distintos.
  - A consulta às normas legais primárias vigentes (Lei nº 14.973/2024, Lei nº 8.212/1991, IN RFB nº 2.110/2022) revela que **inexiste manifestação oficial conclusiva da Receita Federal ou do eSocial** que discipline especificamente a contribuição previdenciária do sócio sobre o pró-labore em empresa sujeita ao regime de transição parcial da CPRB em 2026.
  - Portanto, a alíquota de 11% **não pode ser considerada pacificada**. Ela é mantida na calculadora exclusivamente como **hipótese operacional e orientativa** (sem inventar alíquota alternativa nem alterar compulsoriamente para 15,5%).
  - **Reflexo em Cadeia nos Resultados do Sócio:** Como a contribuição previdenciária do segurado integra as deduções legais da base de cálculo do IRRF, qualquer variação no INSS afeta simultaneamente a base tributável, o IRRF apurado e o valor líquido recebido. Por essa razão, **todo o conjunto de resultados do sócio (INSS, Base do IRRF, IRRF e Pró-labore Líquido) é sinalizado como estimativo e não definitivo** neste cenário (`valoresSocioDefinitivos: false`), exigindo confirmação com a assessoria contábil da empresa.

### E. Simples Nacional — Atividades Concomitantes
- **Fundamento:** Instrução Normativa RFB nº 2.110/2022, art. 76.
- Quando a empresa optante exerce simultaneamente atividades do Anexo IV e de outros anexos, a apuração da CPP patronal sobre trabalhadores administrativos e pró-labore depende do percentual de segregação da receita bruta acumulada no mês anterior.
- **Tratamento:** A ferramenta não arbitra coeficientes ficcionais; apresenta aviso de limitação técnica orientando apuração direta na contabilidade.

### F. Microempreendedor Individual (MEI)
- **Fundamento:** Solução de Consulta Cosit nº 251/2024; Lei Complementar nº 123/2006, art. 18-A.
- O titular do MEI recolhe sua contribuição previdenciária unicamente pela guia DAS-MEI (5% do salário mínimo). Não existe na legislação a figura do pró-labore formal com desconto de 11% e CPP patronal de 20% para o titular da firma individual.
- **Tratamento:** A calculadora exibe mensagem orientativa específica fundamentada na SC Cosit nº 251/2024.

### G. Regime Patronal Não Informado
- Caso o usuário não especifique o regime tributário da empresa ou selecione a opção "Não sei informar", a calculadora não arbitra nem exibe estimativa patronal conclusiva, emitindo aviso formal de limitação técnica para evitar conclusões incorretas.

---

## 4. Exemplos Numéricos Validados

### Exemplo 1: Pró-labore de R$ 5.000,00 (Competência 2026, Simples Anexo III)
- **Pró-labore Bruto:** R$ 5.000,00
- **INSS do Sócio (11%):** R$ 550,00
- **Deduções:** Legal (R$ 550,00) vs Simplificado (R$ 607,20) $\rightarrow$ Adotado Simplificado
- **Base IRRF:** R$ 5.000,00 - R$ 607,20 = R$ 4.392,80
- **IRRF Bruto (Faixa 22,5%):** $4.392,80 \times 0,225 - 675,49 = \text{R\$} 312,89$
- **Redução Lei 15.270/2025:** Rendimento $\le \text{R\$} 5.000,00 \rightarrow$ Redução total de R$ 312,89
- **IRRF Final:** R$ 0,00
- **Pró-labore Líquido:** R$ 5.000,00 - R$ 550,00 - R$ 0,00 = **R$ 4.450,00**
- **Encargo Patronal (Anexo III):** R$ 0,00 (incluso no DAS)
- **Custo Total da Empresa:** **R$ 5.000,00**

### Exemplo 2: Pró-labore de R$ 6.000,00 (Competência 2026, Simples Anexo IV)
- **Pró-labore Bruto:** R$ 6.000,00
- **INSS do Sócio (11%):** R$ 660,00
- **Deduções:** Legal (R$ 660,00) > Simplificado (R$ 607,20) $\rightarrow$ Adotadas Deduções Legais
- **Base IRRF:** R$ 6.000,00 - R$ 660,00 = R$ 5.340,00
- **IRRF Bruto (Faixa 27,5%):** $5.340,00 \times 0,275 - 908,73 = \text{R\$} 559,77$
- **Redução Lei 15.270/2025 (Transição):** $978,62 - (0,133145 \times 6.000,00) = 978,62 - 798,87 = \text{R\$} 179,75$
- **IRRF Final:** $559,77 - 179,75 = \text{R\$} 380,02$
- **Pró-labore Líquido:** $6.000,00 - 660,00 - 380,02 = \textbf{R\$ 4.959,98}$
- **CPP Patronal (Anexo IV, 20%):** $6.000,00 \times 20\% = \textbf{R\$ 1.200,00}$
- **Custo Total da Empresa:** $6.000,00 + 1.200,00 = \textbf{R\$ 7.200,00}$

### Exemplo 3: Pró-labore de R$ 10.000,00 (Competência 2026, Fora do Simples — Regime Comum)
- **Pró-labore Bruto:** R$ 10.000,00
- **INSS do Sócio:** Limitado ao teto RGPS (R$ 8.475,55) $\times 11\% = \textbf{R\$ 932,31}$
- **Deduções:** Legal (R$ 932,31) > Simplificado (R$ 607,20) $\rightarrow$ Adotadas Deduções Legais
- **Base IRRF:** R$ 10.000,00 - R$ 932,31 = R$ 9.067,69
- **IRRF Bruto (Faixa 27,5%):** $9.067,69 \times 0,275 - 908,73 = \text{R\$} 1.584,88$
- **Redução Lei 15.270/2025:** Rendimento $> \text{R\$} 7.350,00 \rightarrow$ Redução = R$ 0,00
- **IRRF Final:** **R$ 1.584,88**
- **Pró-labore Líquido:** $10.000,00 - 932,31 - 1.584,88 = \textbf{R\$ 7.482,81}$
- **CPP Patronal (20% sobre pró-labore bruto sem teto):** $10.000,00 \times 20\% = \textbf{R\$ 2.000,00}$
- **Custo Total da Empresa:** $10.000,00 + 2.000,00 = \textbf{R\$ 12.000,00}$

### Exemplo 4: Pró-labore de R$ 6.000,00 (Competência 2026, Fora do Simples — Optante pela CPRB)
- **Pró-labore Bruto:** R$ 6.000,00
- **INSS do Sócio (11% — Hipótese Operacional e Orientativa):** R$ 660,00 (estimativo; ausência de regulamentação conclusiva para a dedução sob CPP de 10%)
- **IRRF Final:** R$ 380,02 (estimativo, pois a base tributável depende da dedução do INSS)
- **Pró-labore Líquido:** **R$ 4.959,98** (estimativo sob a hipótese operacional)
- **CPP Patronal sobre Pró-labore (10%, Lei nº 14.973/2024):** $6.000,00 \times 10\% = \textbf{R\$ 600,00}$
- **Custo sobre Pró-labore:** $6.000,00 + 600,00 = \textbf{R\$ 6.600,00}$ (sem incluir CPRB sobre a receita bruta)
- **Status dos Resultados do Sócio:** `valoresSocioDefinitivos: false` (conjunto completo de valores sinalizado como estimativo).

---

## 5. Cobertura de Testes Automatizados

A suíte [`tests/pro-labore.test.js`](file:///home/araofer/Documentos/github/CalculadoraMaster/tests/pro-labore.test.js) contempla 29 testes com verificação exaustiva:

1. Pró-labore zero;
2. Valores negativos e parâmetros inválidos com rejeição explícita;
3. Pró-labore de R$ 5.000,00 em 2026 com redução total do imposto;
4. Pró-labore de R$ 6.000,00 em 2026 com cálculo progressivo e redução proporcional;
5. Rendimento no limite de R$ 7.350,00 e acima do teto de transição;
6. Comparação entre Deduções Legais e Desconto Simplificado (R$ 607,20);
7. Dedução por dependentes (R$ 189,59/mês);
8. Abatimento de pensão alimentícia judicial;
9. Retenção de 11% do Contribuinte Individual fundamentada na Lei nº 10.666/2003, art. 4º, caput c/c Lei nº 8.212/1991, arts. 21 e 30, § 4º e IN RFB nº 2.110/2022, art. 37 (distinta do Plano Simplificado);
10. Limite máximo previdenciário do RGPS (R$ 8.475,55 e desconto R$ 932,31);
11. Tratamento de outras remunerações da mesma competência;
12. Compensação de contribuições retidas por outras fontes sem bitributação;
13. Pró-labore inferior ao salário mínimo (R$ 1.621,00) sem majoração silenciosa e com aviso legal de complementação;
14. Segregação explícita entre pró-labore líquido do sócio e custo total da empresa;
15. Simples Nacional nos Anexos I, II, III e V com encargo patronal avulso zero (incluso no DAS);
16. Simples Nacional no Anexo IV com CPP patronal de 20%;
16A. Empresa fora do Simples sem CPRB: CPP patronal ordinária de 20% (art. 22, III da Lei nº 8.212/1991);
16B. Empresa abrangida e optante pela CPRB em 2026: CPP parcial de 10% sobre o pró-labore (art. 9º-A da Lei nº 14.973/2024), sinalização estimativa do conjunto completo de resultados do sócio sob hipótese operacional de 11% e advertência de incerteza jurídica;
16C. CPRB sobre receita bruta não incluída no custo total quando a receita e alíquota setorial não são informadas;
16D. Regime patronal não informado: aviso de limitação técnica sem estimativa indevida;
16E. Regimes normais (fora do Simples sem CPRB e Simples Nacional): resultados do sócio mantidos como definitivos e sem marcadores estimativos;
17. Limitação técnica e aviso para atividades concomitantes;
18. Tratamento diferenciado do MEI com base na Solução de Consulta Cosit nº 251/2024;
19. Ausência de imposto negativo, NaN ou divisão por zero;
20. Arredondamento monetário consistente para centavos em todas as operações;
21. Bloqueio de projeções de competências futuras (ex: 2027) sem publicação oficial de portarias;
22. Conformidade do HTML com semântica, acessibilidade e convenções de estilo;
23. Integração com o DOM: formulário, limpeza, renderização e texto de compartilhamento/cópia;
24. Preservação dos resultados de IRRF e do líquido do sócio nos exemplos validados (R$ 5.000, R$ 6.000 e R$ 10.000).

---

## 6. Limitações Técnicas Declaradas

1. **Escopo Orientativo:** A calculadora não substitui o eSocial, a DCTFWeb ou a escrituração contábil/fiscal da empresa.
2. **CPRB sobre Receita Bruta:** Para empresas optantes pela desoneração da folha em 2026 (Lei nº 14.973/2024), a ferramenta calcula apenas a CPP parcial de 10% incidente sobre o pró-labore. A contribuição patronal devida sobre o faturamento da PJ não é estimada, impedindo a determinação do custo tributário global da empresa.
3. **Incerteza Jurídica na CPRB em 2026:** Inexiste orientação oficial conclusiva da Receita Federal ou do eSocial tratando especificamente da retenção previdenciária de sócio sobre pró-labore na transição da CPRB frente à fórmula de dedução do art. 30, § 4º da Lei nº 8.212/1991 e art. 37, II e § 1º da IN RFB nº 2.110/2022. A alíquota de 11% é mantida na ferramenta apenas como hipótese operacional e orientativa (sem arbitrar alíquotas não normatizadas). Por conseguinte, todo o conjunto de resultados do sócio — INSS descontado, base de cálculo do IRRF, IRRF calculado e pró-labore líquido — possui caráter estritamente estimativo e não definitivo neste cenário.
4. **Regime Patronal Não Informado:** Quando o usuário desconhece o regime da empresa, encargos patronais não são arbitrados.
5. **Atividades Concomitantes:** Casos em que a empresa optante pelo Simples Nacional atua simultaneamente no Anexo IV e em outros anexos exigem segregação proporcional da folha mensal pelo percentual de receitas (art. 76 da IN RFB nº 2.110/2022).
6. **MEI:** A legislação não admite pró-labore formal para o titular de microempresa individual, sendo orientado o recolhimento via DAS-MEI e apuração de lucro conforme a SC Cosit nº 251/2024.
7. **Competências Futuras:** A ferramenta restringe-se aos parâmetros vigentes e oficiais homologados para 2026. Tabelas de 2027 dependem de divulgação oficial pelo Governo Federal.
