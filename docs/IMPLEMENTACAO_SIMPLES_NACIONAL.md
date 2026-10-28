# Implementação 04 — Calculadora Simples Nacional (`simples-nacional`)

## 1. Identificação da Ferramenta

- **ID / Slug:** `simples-nacional`
- **Nome:** Calculadora Simples Nacional
- **Short Name:** Simples Nacional
- **Categoria:** Financeiro (`categorySlug: financas`)
- **URL canônica:** `/tools/financas/simples-nacional.html`
- **Ano de referência atendido:** `2026`
- **Data da consulta oficial:** `2026-10-22`
- **Status da fórmula:** `verified`
- **Implementação:** `factory`

## 2. Fontes Oficiais Consultadas

1. **Presidência da República / Planalto — Lei Complementar nº 123, de 14 de dezembro de 2006 (atualizada pela LC nº 155/2016):**
   - URL: `https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp123.htm`
   - Dispositivos aplicados:
     - Art. 3º, II: teto máximo do Simples Nacional de `R$ 4.800.000,00` no ano-calendário;
     - Arts. 18, 19 e 20: metodologia de cálculo da alíquota efetiva progressiva com parcelas a deduzir; tabelas dos Anexos I, II, III, IV e V; sublimite para recolhimento de ICMS e ISS em `R$ 3.600.000,00`;
     - Art. 18, § 5º-C: tratamento específico do Anexo IV, cuja guia do DAS NÃO inclui a Contribuição Previdenciária Patronal (CPP), devendo ser recolhida sobre a folha via RGPS;
     - Art. 18, §§ 5º-J e 5º-M: fórmula e corte do Fator R (28,00%) entre os Anexos III e V.
2. **Receita Federal / CGSN — Resolução CGSN nº 140, de 22 de maio de 2018 (Consolidada):**
   - URL: `https://normas.receita.fazenda.gov.br/sijut2consulta/link.action?idAto=92278`
   - Dispositivos aplicados:
     - Art. 21: definição de Receita Bruta Acumulada nos 12 meses anteriores (RBT12);
     - Art. 26: composição e apuração da folha de salários para cálculo do Fator R;
     - Art. 27: regras para empresas em início de atividade (1º mês proporcionaliza receita × 12; 2º ao 12º mês utiliza a média aritmética dos meses anteriores multiplicada por 12);
     - Art. 28 e Anexos I a V: tabelas de faixas, alíquotas nominais e parcelas a deduzir.
3. **Receita Federal — Orientação Tributária Oficial do Anexo IV do Simples Nacional:**
   - URL: `https://www.gov.br/receitafederal/pt-br/assuntos/orientacao-tributaria/cobrancas-e-intimacoes/contribuicao-previdenciaria-anexo-iv-do-simples-nacional`
   - Confirmação de que a empresa enquadrada no Anexo IV recolhe via DCTFWeb/DARF a CPP de 20% (art. 22, I da Lei 8.212/1991) e o RAT (art. 22, II da Lei 8.212/1991, ajustado pelo FAP), ficando **isenta de contribuições a outras entidades e fundos (terceiros)** por força expressa do art. 13, § 3º da Lei Complementar nº 123/2006.
4. **Comitê Gestor do Simples Nacional — Manual do PGDAS-D e Defis 2018 (Versão Vigente):**
   - URL: `https://www8.receita.fazenda.gov.br/SimplesNacional/Arquivos/manual/MANUAL_PGDAS-D_2018_V4.pdf`
   - Confirmação de regras operacionais de preenchimento, segregação de receitas e apuração do DAS mensal.
5. **Receita Federal — Perguntas e Respostas do Simples Nacional:**
   - URL: `https://www8.receita.fazenda.gov.br/SimplesNacional/Arquivos/manual/PerguntaoSN.pdf`
   - Esclarecimentos sobre definição de folha sob regime de caixa com pró-labore e FGTS (art. 26), regras do sublimite de ICMS/ISS da 6ª faixa e retenção de ISS.

*Nota sobre a Reforma Tributária (EC nº 132/2023):* As alterações relativas à transição de IBS e CBS no Simples Nacional produzem efeitos a partir do ano-calendário de 2027. Para o exercício de 2026, aplicam-se com exclusividade as regras consolidadas da LC 123/2006 e Res. CGSN 140/2018.

## 3. Fórmulas e Regras Aplicadas

### A. Metodologia Geral da Alíquota Efetiva
1. **Fórmula legal:**
   $$\text{Alíquota Efetiva} = \frac{(\text{RBT12} \times \text{Alíquota Nominal}) - \text{Parcela a Deduzir}}{\text{RBT12}}$$
2. **Cálculo do DAS Mensal:**
   $$\text{Valor do DAS} = \text{Receita Bruta do Mês Elegível} \times \text{Alíquota Efetiva}$$
3. **1ª Faixa (RBT12 até R$ 180.000,00 ou início sem faturamento anterior):**
   - A parcela a deduzir é `R$ 0,00`.
   - A alíquota efetiva é exatamente igual à alíquota nominal da 1ª faixa.

### B. Tabelas dos Anexos (LC nº 123/2006)
- **Anexo I (Comércio):**
  - 1ª Faixa (até R$ 180.000,00): 4,00% | Ded: R$ 0,00
  - 2ª Faixa (R$ 180.000,01 a R$ 360.000,00): 7,30% | Ded: R$ 5.940,00
  - 3ª Faixa (R$ 360.000,01 a R$ 720.000,00): 9,50% | Ded: R$ 13.860,00
  - 4ª Faixa (R$ 720.000,01 a R$ 1.800.000,00): 10,70% | Ded: R$ 22.500,00
  - 5ª Faixa (R$ 1.800.000,01 a R$ 3.600.000,00): 14,30% | Ded: R$ 87.300,00
  - 6ª Faixa (R$ 3.600.000,01 a R$ 4.800.000,00): 19,00% | Ded: R$ 378.000,00
- **Anexo II (Indústria):**
  - 1ª Faixa: 4,50% (R$ 0) | 2ª Faixa: 7,80% (R$ 5.940) | 3ª Faixa: 10,00% (R$ 13.860) | 4ª Faixa: 11,20% (R$ 22.500) | 5ª Faixa: 14,70% (R$ 85.500) | 6ª Faixa: 30,00% (R$ 720.000)
- **Anexo III (Serviços gerais e com Fator R ≥ 28%):**
  - 1ª Faixa: 6,00% (R$ 0) | 2ª Faixa: 11,20% (R$ 9.360) | 3ª Faixa: 13,50% (R$ 17.640) | 4ª Faixa: 16,00% (R$ 35.640) | 5ª Faixa: 21,00% (R$ 125.640) | 6ª Faixa: 33,00% (R$ 648.000)
- **Anexo IV (Advocacia, Limpeza, Obras e Vigilância — Sem CPP no DAS):**
  - 1ª Faixa: 4,50% (R$ 0) | 2ª Faixa: 9,00% (R$ 8.100) | 3ª Faixa: 10,20% (R$ 12.420) | 4ª Faixa: 14,00% (R$ 39.780) | 5ª Faixa: 22,00% (R$ 183.780) | 6ª Faixa: 33,00% (R$ 828.000)
  - *Particularidade, Isenção de Terceiros e Ressalva da CPRB:*
    - A guia do DAS do Anexo IV não inclui a CPP (art. 18, § 5º-C da LC nº 123/2006). A empresa deve apurar e recolher a contribuição patronal previdenciária sobre a folha via DCTFWeb/DARF na sistemática geral do RGPS: CPP de 20% (art. 22, I da Lei nº 8.212/1991) + RAT ajustado pelo FAP (art. 22, II da Lei nº 8.212/1991).
    - **Isenção de Terceiros:** Por determinação expressa do art. 13, § 3º da LC nº 123/2006, as optantes pelo Simples Nacional são **isentas de contribuições a outras entidades e fundos (terceiros)**, não sendo estas devidas.
    - **Ressalva da CPRB (Desoneração da Folha):** A regra convencional de 20% sobre a folha não é universal e **não se aplica a empresas sujeitas à CPRB** (Lei nº 12.546/2011), modalidade em que empresas de certas atividades do Anexo IV (construção civil e obras de engenharia) recolhem a contribuição patronal substituída com base na receita bruta. A CPRB **não é calculada por este simulador**, devendo o enquadramento ser confirmado com contador habilitado.
- **Anexo V (Serviços intelectuais com Fator R < 28%):**
  - 1ª Faixa: 15,50% (R$ 0) | 2ª Faixa: 18,00% (R$ 4.500) | 3ª Faixa: 19,50% (R$ 9.900) | 4ª Faixa: 20,50% (R$ 17.100) | 5ª Faixa: 23,00% (R$ 62.100) | 6ª Faixa: 30,50% (R$ 540.000)

### C. Regra do Fator R (Resolução CGSN nº 140/2018, art. 26)
$$\text{Fator R} = \frac{\text{Folha de Salários dos 12 Meses Anteriores}}{\text{Receita Bruta Acumulada nos 12 Meses Anteriores (RBT12)}}$$
- Se $\text{Fator R} \ge 0{,}28$ (28,00%): Enquadramento no **Anexo III** (alíquotas iniciais a partir de 6,00%).
- Se $\text{Fator R} < 0{,}28$: Enquadramento no **Anexo V** (alíquotas iniciais a partir de 15,50%).
- **Regime de caixa (art. 26, § 1º):** a folha considera montantes efetivamente **pagos** nos 12 meses anteriores ao período de apuração, compreendendo remunerações a empregados, pró-labore de sócios, 13º salário, encargos previdenciários patronais e contribuições do FGTS.

### D. Início de Atividade (Resolução CGSN nº 140/2018, art. 27)
- **1º mês de funcionamento:** $\text{RBT12 Proporcional} = \text{Receita do Próprio Mês} \times 12$.
- **2º ao 12º mês:** $\text{RBT12 Proporcional} = \left(\frac{\text{Receita Acumulada dos Meses Anteriores}}{\text{Número de Meses Anteriores}}\right) \times 12$.

### E. Segregação de Receitas por Anexo
- A empresa calcula uma **única RBT12 global** para todas as atividades.
- A faixa e a alíquota efetiva de cada anexo são calculadas individualmente com base nessa RBT12 global.
- O DAS final é a soma das guias dos respectivos anexos: $\text{DAS Total} = \sum (\text{Receita do Anexo} \times \text{Alíquota Efetiva do Anexo})$.

### F. Sublimite Estadual e Distinção Temporal (Resolução CGSN nº 140/2018, arts. 9º, 12 e 24)
- **Alcance e Limitações do Sublimite:**
  - A apuração considera exclusivamente a receita auferida no **mercado interno**.
  - **Exportações:** receitas decorrentes de exportação para o exterior contam com sublimite e teto próprios e segregados (art. 13-A da LC nº 123/2006 e art. 9º, § 4º da Resolução CGSN nº 140/2018), tratamento este **não abrangido pelo simulador**.
- **Distinção entre RBT12 e RBA:**
  - **RBT12:** determina a faixa da tabela e a alíquota efetiva mensal do Simples Nacional.
  - **RBA Anterior:** receita acumulada de janeiro até o mês anterior no mercado interno.
  - **RBA Atual:** $\text{RBA Atual} = \text{RBA Anterior} + \text{Receita do Mês}$.
- **Momentos de início de produção de efeitos do sublimite (R$ 3.600.000,00):**
  - **RBA Atual até R$ 3.600.000,00:** ICMS e ISS continuam sendo recolhidos dentro do Simples Nacional via DAS, ainda que a RBT12 esteja na 6ª faixa em razão de meses de anos anteriores.
  - **Caso C — Excesso de até 20% (RBA Atual entre R$ 3.600.000,01 e R$ 4.320.000,00):** os efeitos do impedimento produzem-se apenas a partir de **1º de janeiro do ano-calendário subsequente** (art. 9º, § 1º). Durante todo o ano corrente, o recolhimento permanece dentro do DAS.
  - **Caso B — Excesso superior a 20% no próprio mês (RBA Anterior $\le$ R$ 4,32M e RBA Atual $>$ R$ 4,32M):** no mês da ocorrência da ultrapassagem, o ICMS e o ISS **ainda são recolhidos dentro do DAS**; os efeitos do impedimento ocorrem a partir do **mês subsequente ao da ocorrência** (art. 9º, § 2º e art. 12, § 1º, I).
  - **Caso A — Excesso superior a 20% ocorrido em mês anterior (RBA Anterior $>$ R$ 4,32M):** o impedimento já está em vigor, devendo o ICMS e o ISS serem recolhidos fora do DAS diretamente ao Estado ou Município.
  - Quando a RBA não é informada, a calculadora emite uma orientação condicional e didática sem afirmar antecipadamente que os tributos já estão fora do DAS.
- **Teto Máximo Nacional de R$ 4.800.000,00:** faturamento anual excedente enseja o desenquadramento do regime geral do Simples Nacional (LC nº 123/2006, art. 3º, II).

### G. Rateio Determinístico de Centavos Residuais (Método do Maior Resto)
- **Desafio Contábil:** O cálculo independente de múltiplos tributos com alíquotas efetivas fracionárias pode acumular frações de centavos que, se arredondadas isoladamente, geram pequenas divergências (como a diferença de R$ 0,01 entre a soma das linhas e o valor total do DAS).
- **Critério Adotado:** Implementação do **Método do Maior Resto (Largest Remainder Method / Hamilton / Hare-Niemeyer)**:
  1. Cada tributo recebe sua parcela inteira em centavos (`Math.floor(valor * 100)`).
  2. Apura-se o déficit residual em centavos ($\Delta = \text{alvoCents} - \sum \text{pisoCents}$).
  3. O centavo residual é atribuído aos tributos com maior fração decimal decrescente.
  4. Desempate determinístico: maior peso relativo/partilha oficial na tabela da LC nº 123/2006 e ordem canônica estável.
- **Resultado:** A soma das parcelas individualizadas coincide sempre de forma exata e determinística com o valor total do DAS apurado, sem distorcer alíquotas nem bases tributáveis.

## 4. Exemplos Numéricos Calculados Independentemente

1. **Exemplo 1 — Anexo I (Comércio) na 2ª Faixa:**
   - RBT12: `R$ 300.000,00`
   - Receita do mês: `R$ 25.000,00`
   - Faixa 2: Alíquota nominal = `7,30%`, Parcela a deduzir = `R$ 5.940,00`
   - Alíquota efetiva: `((300.000 × 0,073) − 5.940) ÷ 300.000 = (21.900 − 5.940) ÷ 300.000 = 15.960 ÷ 300.000 = 0,0532` (`5,32%`)
   - DAS mensal: `R$ 25.000,00 × 5,32% = R$ 1.330,00`
2. **Exemplo 2 — Anexo III (Serviços) na 3ª Faixa:**
   - RBT12: `R$ 500.000,00`
   - Receita do mês: `R$ 40.000,00`
   - Faixa 3: Alíquota nominal = `13,50%`, Parcela a deduzir = `R$ 17.640,00`
   - Alíquota efetiva: `((500.000 × 0,135) − 17.640) ÷ 500.000 = (67.500 − 17.640) ÷ 500.000 = 49.860 ÷ 500.000 = 0,09972` (`9,972%`)
   - DAS mensal: `R$ 40.000,00 × 0,09972 = R$ 3.988,80`
3. **Exemplo 3 — Fator R no limite de 28,00%:**
   - RBT12: `R$ 100.000,00`, Folha 12m: `R$ 28.000,00`
   - Fator R: `28.000 ÷ 100.000 = 0,2800` (`28,00%`) -> Enquadra no **Anexo III** (1ª faixa: 6,00%).
   - Se a folha for `R$ 27.990,00` (Fator R = `27,99%`) -> Enquadra no **Anexo V** (1ª faixa: 15,50%).
4. **Exemplo 4 — Segregação de Receitas (Comércio + Serviços):**
   - RBT12 Global: `R$ 300.000,00` (ambas na 2ª faixa)
   - Receita Comércio (Anexo I): `R$ 20.000,00` × `5,32%` = `R$ 1.064,00`
   - Receita Serviços (Anexo III): `R$ 15.000,00` × `8,08%` = `R$ 1.212,00`
   - DAS Total: `R$ 1.064,00 + R$ 1.212,00 = R$ 2.276,00`
5. **Exemplo 5 — Anexo I na 6ª Faixa e Demonstração Rigorosa dos Casos A e B (Ano 2026):**
   - **Premissas Comuns:**
     - Atividade: Comércio (Anexo I da LC nº 123/2006).
     - RBT12: `R$ 4.400.000,00` (enquadramento na 6ª faixa: R$ 3.600.000,01 a R$ 4.800.000,00).
     - Alíquota nominal: `19,00%`, Parcela a deduzir: `R$ 378.000,00`.
     - Alíquota efetiva federal oficial da 6ª faixa:
       $$\text{Alíquota Federal} = \frac{(4.400.000 \times 0,19) - 378.000}{4.400.000} = \frac{836.000 - 378.000}{4.400.000} = \frac{458.000}{4.400.000} \approx 10,4090909\%$$
       *(Nota: Não se aplica 12,50% a esse cenário).*
     - Repartição dos tributos federais na 6ª faixa: IRPJ 13,50%, CSLL 10,00%, Cofins 28,27%, PIS/Pasep 6,13%, CPP 42,10% (Soma = 100,00%).
   - **Caso A — Excesso superior a 20% ocorrido em mês anterior:**
     - RBA Anterior: `R$ 4.400.000,00` ($> \text{R\$ 4.320.000,00}$).
     - Receita do mês: `R$ 100.000,00`.
     - RBA Atual: `R$ 4.500.000,00`.
     - Efeito temporal: impedimento já em vigor no mês atual (Res. CGSN 140/2018, art. 9º, § 2º e art. 12, § 1º, I); ICMS **fora do DAS**.
     - Alíquota do DAS (exclusivamente federal): `10,4090909%`.
     - Valor do DAS: `R$ 100.000,00 × 10,4090909% = R$ 10.409,09`.
     - Repartição determinística dos tributos (Método do Maior Resto):
       - IRPJ: `R$ 1.405,23` (13,50% do componente federal)
       - CSLL: `R$ 1.040,91` (10,00% do componente federal)
       - Cofins: `R$ 2.942,65` (28,27% do componente federal)
       - PIS/Pasep: `R$ 638,07` (6,13% do componente federal)
       - CPP: `R$ 4.382,23` (42,10% do componente federal)
       - ICMS: `R$ 0,00` (recolhido fora do DAS)
       - **Soma das parcelas:** `R$ 10.409,09` (coincidência exata com o DAS total exibido).
   - **Caso B — Excesso superior a 20% ocorrido no próprio mês atual:**
     - RBA Anterior: `R$ 4.250.000,00` ($> \text{R\$ 3.600.000,00}$ e $\le \text{R\$ 4.320.000,00}$).
     - Receita do mês: `R$ 250.000,00`.
     - RBA Atual: `R$ 4.500.000,00` ($> \text{R\$ 4.320.000,00}$).
     - Efeito temporal: no mês da ocorrência da ultrapassagem, o ICMS **continua sendo recolhido no DAS**; exclusão do ICMS apenas a partir do mês subsequente (Res. CGSN 140/2018, art. 9º, § 2º e art. 12, § 1º, I).
     - Como a RBA anterior já supera R$ 3.600.000,00, aplica-se a regra do art. 24 da Resolução CGSN nº 140/2018:
       - Alíquota efetiva de ICMS apurada no sublimite de R$ 3.600.000,00 (teto da 5ª faixa):
         $$\text{Alíq. 5ª Faixa (R\$ 3,6M)} = \frac{(3.600.000 \times 0,143) - 87.300}{3.600.000} = \frac{427.500}{3.600.000} = 11,8750\%$$
         $$\text{Taxa Efetiva de ICMS} = 11,8750\% \times 33,50\% = 3,978125\%$$
       - Apuração federal: baseada na 6ª faixa da RBT12: `10,4090909%`.
       - Alíquota total unificada no DAS:
         $$\text{Alíquota DAS} = 10,4090909\% + 3,978125\% = 14,3872159\%$$
       - Valor do DAS sobre `R$ 250.000,00`:
         $$\text{Componente Federal} = \text{R\$ 250.000,00} \times 10,4090909\% = \text{R\$ 26.022,73}$$
         $$\text{Componente ICMS} = \text{R\$ 250.000,00} \times 3,978125\% = \text{R\$ 9.945,31}$$
         $$\text{Total do DAS} = \text{R\$ 26.022,73} + \text{R\$ 9.945,31} = \text{R\$ 35.968,04}$$
       - Repartição dos tributos no DAS:
         - IRPJ: `R$ 3.513,07`
         - CSLL: `R$ 2.602,27`
         - Cofins: `R$ 7.356,63`
         - PIS/Pasep: `R$ 1.595,19`
         - CPP: `R$ 10.955,57`
         - ICMS: `R$ 9.945,31`
         - Total do DAS: `R$ 35.968,04`

## 5. Limitações e Casos Especiais Não Contemplados no MVP

- A ferramenta fornece **estimativas orientativas** para planejamento fiscal e não substitui a apuração oficial no portal do PGDAS-D.
- Não contempla automaticamente:
  - Segregação de produtos sujeitos à Substituição Tributária de ICMS (ICMS-ST);
  - Produtos sujeitos à tributação monofásica de PIS/COFINS (combustíveis, bebidas, autopeças, cosméticos e fármacos);
  - Retenções na fonte de ISSQN ou ICMS efetuadas pelo tomador;
  - Exportações imunes de mercadorias ou serviços;
  - Regimes de valor fixo mensal de ISS ou ICMS instituídos por legislações municipais/estaduais específicas;
  - Regras de transição de IBS/CBS decorrentes da Reforma Tributária (produção de efeitos para Simples Nacional a partir de 2027).
