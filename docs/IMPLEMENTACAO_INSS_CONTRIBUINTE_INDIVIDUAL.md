# Implementação 03 — Calculadora INSS do Contribuinte Individual (`inss-contribuinte-individual`)

## 1. Identificação da Ferramenta

- **ID / Slug:** `inss-contribuinte-individual`
- **Nome:** Calculadora INSS do Contribuinte Individual
- **Categoria:** Financeiro (`categorySlug: financas`)
- **URL canônica:** `/tools/financas/inss-contribuinte-individual.html`
- **Ano de referência atendido:** `2026`
- **Data da consulta oficial:** `2026-10-22`
- **Status da fórmula:** `verified`

## 2. Fontes Oficiais Consultadas

1. **INSS — Tabela de Contribuição Mensal e Limites do RGPS:**
   - URL: `https://www.gov.br/inss/pt-br/direitos-e-deveres/inscricao-e-contribuicao/tabela-de-contribuicao-mensal`
   - Parâmetros oficiais de 2026: Salário Mínimo (Piso) = `R$ 1.621,00`; Teto do RGPS = `R$ 8.475,55`.
2. **INSS — Plano Simplificado de Previdência:**
   - URL: `https://www.gov.br/inss/pt-br/direitos-e-deveres/inscricao-e-contribuicao/plano-simplificado`
   - Regras confirmadas: alíquota de `11%` exclusiva para contribuinte individual que trabalha por conta própria (sem relação de emprego) e não presta serviços a pessoas jurídicas; base fixa e obrigatória no salário mínimo (`R$ 1.621,00`), totalizando contribuição mensal de `R$ 178,31`; código GPS `1163`; veda aposentadoria por tempo de contribuição e emissão de CTC sem complementação de 9%.
3. **INSS — Contribuição dos Segurados Facultativo e Contribuinte Individual:**
   - URL: `https://www.gov.br/inss/pt-br/direitos-e-deveres/inscricao-e-contribuicao/contribuicao-dos-segurados-facultativo-e-contribuinte-individual`
   - Regras confirmadas: alíquota normal de `20%` sobre o salário de contribuição (entre piso e teto); recolhimento pelo próprio segurado na GPS código `1007`; vencimento no dia 15 do mês subsequente (prorrogado para o primeiro dia útil seguinte caso recaia em dia não útil).
4. **INSS — Tabela de Códigos de Pagamento (GPS):**
   - URL: `https://www.gov.br/inss/pt-br/direitos-e-deveres/inscricao-e-contribuicao/tabela-de-codigos-de-pagamento-de-contribuicao-previdenciaria`
   - Códigos confirmados: `1007` (Contribuinte Individual - Mensal - 20%); `1163` (Contribuinte Individual - Mensal - Plano Simplificado 11%); `1872` (DARF de complementação para atingir o piso).
5. **Presidência da República / Planalto — Lei nº 8.212, de 24 de julho de 1991:**
   - URL: `https://www.planalto.gov.br/ccivil_03/leis/l8212cons.htm`
   - Art. 21, caput e § 2º: base de incidência e alíquotas do Plano Normal (20%) e do Plano Simplificado (11%); art. 21, § 3º: faculdade de complementação de 9% para aproveitamento de tempo em RPPS.
6. **Presidência da República / Planalto — Lei nº 10.666, de 8 de maio de 2003 (Arts. 4º e 4º-A):**
   - URL: `https://www.planalto.gov.br/ccivil_03/leis/2003/l10.666.htm`
   - Regras confirmadas: a empresa tomadora de serviços é responsável na regra geral por descontar `11%` da remuneração paga ao contribuinte individual a seu serviço (respeitado o teto do RGPS) e recolher via DCTFWeb; ressalva expressa do art. 4º-A (incluído pela Lei nº 15.485/2026), que faculta ao Transportador Autônomo de Cargas (TAC) regular no RNTRC a opção pelo recolhimento direto de sua contribuição, não sendo caso de retenção obrigatória pela contratante.
7. **Receita Federal — Instrução Normativa RFB nº 2.110, de 17 de outubro de 2022:**
   - URL: `http://normas.receita.fazenda.gov.br/sijut2consulta/link.action?idAto=126484`
   - Art. 39 e art. 136-A: regras para prestação a múltiplas fontes pagadoras; obrigatoriedade de complementação de contribuições inferiores ao salário mínimo decorrentes da EC nº 103/2019 (art. 29).
8. **Presidência da República / Planalto — Lei nº 15.485, de 2026:**
   - Incluiu o art. 4º-A na Lei nº 10.666/2003, estabelecendo o direito de opção pelo recolhimento direto pelo TAC inscrito e regular no RNTRC.

## 3. Fórmulas e Regras Aplicadas

1. **Cenário A — Autônomo por conta própria no Plano Normal (20%):**
   - `BaseCalculoConsiderada = min(TetoPrevidenciario, max(SalarioMinimo, SalarioContribuicaoInformado))`
   - `Contribuicao = round2(BaseCalculoConsiderada × 0,20)`
   - No piso (`R$ 1.621,00`): `R$ 324,20` (código GPS `1007`).
   - No teto (`R$ 8.475,55`): `R$ 1.695,11` (código GPS `1007`).
   - Salário abaixo do mínimo: emitido alerta e base ajustada para o piso legal (`R$ 1.621,00`).
   - Salário acima do teto: emitido alerta e base limitada ao teto legal (`R$ 8.475,55`).

2. **Cenário B — Autônomo elegível no Plano Simplificado (11%):**
   - `BaseCalculoConsiderada = SalarioMinimo` (`R$ 1.621,00` fixo)
   - `Contribuicao = round2(1.621,00 × 0,11) = R$ 178,31` (código GPS `1163`).
   - Não permite base personalizada ou intermediária.
   - Condições e restrições: a contribuição simplificada do contribuinte individual elegível corresponde a 11% do salário mínimo; o plano não contempla aposentadoria por tempo de contribuição nem expedição de Certidão de Tempo de Contribuição (CTC) para contagem recíproca em RPPS, salvo mediante complementação de 9% sobre o salário mínimo com encargos moratórios legais; o direito aos benefícios e a renda mensal dependem das regras de cada modalidade e do histórico contributivo do segurado, sem declaração de limite universal de um salário mínimo para todos os casos.

3. **Cenário C — Prestador de serviços a Pessoa Jurídica (Regra geral: Retenção 11%):**
   - Aplica-se à regra geral do art. 4º da Lei nº 10.666/2003.
   - `BaseRetencaoConsiderada = min(TetoPrevidenciario, RemuneracaoPJInformada)`
   - `ValorRetencao = round2(BaseRetencaoConsiderada × 0,11)`
   - Teto da retenção mensal: `round2(8.475,55 × 0,11) = R$ 932,31`.
   - Quem recolhe: na regra geral, a pessoa jurídica contratante via DCTFWeb/DARF Previdenciário. O autônomo não emite GPS.
   - Ressalva para Transportador Autônomo de Cargas (TAC): a Lei nº 15.485/2026 acrescentou o art. 4º-A à Lei nº 10.666/2003, permitindo ao TAC regular no RNTRC a opção pelo recolhimento direto; a calculadora abrange apenas a regra geral de retenção e NÃO calcula esse regime especial, orientando o usuário a consultar os procedimentos oficiais aplicáveis. Não se afirma que a contratante retém e recolhe em todos os casos.
   - Remuneração inferior ao salário mínimo: emitido alerta de que a competência não pontua para carência/tempo sem complementação pelo segurado (via DARF 1872 / Meu INSS) ou agrupamento/compensação (EC nº 103/2019, art. 29).
   - Vínculos concomitantes / múltiplas PJs: instrução para apresentação de RPA/comprovantes às tomadoras seguintes a fim de evitar retenção além do teto legal de `R$ 932,31`.

4. **Tratamento da alíquota de 5%:**
   - Não oferecida como opção genérica ao contribuinte individual, com nota informativa esclarecendo que 5% é exclusivo de MEI (DAS-MEI) e Segurado Facultativo de Baixa Renda no CadÚnico (GPS 1929).

## 4. Limitações Previdenciárias e Tributárias Documentadas

- Atende exclusivamente a competência do ano-calendário de `2026`.
- Não calcula atrasados, juros moratórios ou multas de competências vencidas.
- Não realiza planejamento previdenciário nem cálculo de RMI (Renda Mensal Inicial) futura de aposentadoria.
- Não contempla o regime especial de recolhimento direto pelo Transportador Autônomo de Cargas (Art. 4º-A da Lei nº 10.666/2003, incluído pela Lei nº 15.485/2026).
- Casos complexos de múltiplas fontes simultâneas (CLT concomitante com prestação PJ e carnê individual) exigem apuração individualizada dos holerites e recibos.
