# Implementação 02 — Calculadora Carnê-Leão para Autônomos (`carne-leao-autonomo`)

## 1. Identificação da Ferramenta

- **ID / Slug:** `carne-leao-autonomo`
- **Nome:** Calculadora Carnê-Leão para Autônomos
- **Categoria:** Financeiro (`categorySlug: financas`)
- **URL canônica:** `/tools/financas/carne-leao-autonomo.html`
- **Ano de referência atendido:** `2026`
- **Data da consulta oficial:** `2026-10-21`
- **Status da fórmula:** `verified`

## 2. Fontes Oficiais Consultadas

1. **Receita Federal — Recolhimento Mensal Obrigatório (Carnê-Leão):**
   - URL: `https://www.gov.br/receitafederal/pt-br/assuntos/meu-imposto-de-renda/pagamento/carne-leao`
   - Regras confirmadas: obrigatoriedade para rendimentos recebidos de pessoas físicas ou do exterior sem retenção na fonte no Brasil; vencimento até o último dia útil do mês subsequente ao do recebimento; código de receita DARF `0190`.
2. **Receita Federal — Deduções do Carnê-Leão e Livro-Caixa:**
   - URL: `https://www.gov.br/receitafederal/pt-br/assuntos/meu-imposto-de-renda/pagamento/carne-leao/deducoes`
   - Manual oficial: `https://www.gov.br/receitafederal/pt-br/assuntos/meu-imposto-de-renda/pagamento/carne-leao/manual/manual`
   - Regras confirmadas: o limite mensal de dedução das despesas de Livro-Caixa é o valor total da receita da atividade não assalariada no mês, considerando rendimentos de pessoas físicas, pessoas jurídicas (sem vínculo) e do exterior. Despesas excedentes podem ser transportadas mês a mês de fevereiro a dezembro do mesmo ano-calendário, vedada a transferência para o ano seguinte.
3. **Receita Federal — Tabelas de Incidência Mensal do IRPF 2026:**
   - URL: `https://www.gov.br/receitafederal/pt-br/assuntos/meu-imposto-de-renda/tabelas/2026`
   - Regras confirmadas: tabela progressiva mensal vigente a partir de janeiro de 2026, dedução mensal por dependente (`R$ 189,59`), desconto simplificado mensal (`R$ 607,20`) e tabela de redução do imposto mensal para rendimentos tributáveis de até `R$ 7.350,00`.
4. **Presidência da República / Planalto — Lei nº 15.270, de 26 de novembro de 2025:**
   - URL: `https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2025/lei/l15270.htm`
   - Regras confirmadas: inclusão do art. 3º-A na Lei nº 9.250/1995 com vigência a partir de 1º de janeiro de 2026, concedendo redução mensal de até `R$ 312,89` para rendimentos tributáveis sujeitos à incidência mensal até `R$ 5.000,00` e redução decrescente linear (`R$ 978,62 - 0,133145 × rendimentos tributáveis mensais`) para rendimentos de `R$ 5.000,01` até `R$ 7.350,00`, limitada ao valor do imposto apurado.
5. **Presidência da República / Planalto — Lei nº 9.250, de 26 de dezembro de 1995 (arts. 3º-A, 4º e 8º):**
   - URL: `https://www.planalto.gov.br/ccivil_03/leis/L9250.htm`
   - Regras confirmadas: deduções mensais permitidas na base de cálculo (Livro-Caixa, contribuição previdenciária oficial, dependentes e pensão alimentícia) e desconto simplificado mensal alternativo de 25% do limite máximo da faixa de alíquota zero (`25% × R$ 2.428,80 = R$ 607,20`), em substituição às deduções legais.
6. **Receita Federal — Instrução Normativa RFB nº 1.500, de 29 de outubro de 2014 (arts. 52 a 56 e art. 104):**
   - URL: `http://normas.receita.fazenda.gov.br/sijut2consulta/link.action?idAto=57670`
   - Regras confirmadas: vedação à dupla dedução de valores já abatidos em rendimentos sujeitos à retenção na fonte no mesmo mês (art. 56, parágrafo único); teto mensal do Livro-Caixa calculado sobre o total das receitas da atividade profissional (art. 104, § 1º); transporte do excedente até dezembro e bloqueio definitivo para o ano subsequente (§ 2º).

## 3. Fórmulas e Regras Aplicadas

1. **Separação de Receitas e Limites:**
   - **Rendimentos sujeitos ao Carnê-Leão:**
     `RendimentosSujeitosCarneLeao = round2(RendimentosPF + RendimentosExterior)`
   - **Receita total elegível para teto de Livro-Caixa:**
     `ReceitaElegivelLivroCaixa = round2(RendimentosSujeitosCarneLeao + RendimentosPJ)`
   - As receitas de pessoas jurídicas sem vínculo empregatício expandem o limite de despesas aceitas no Livro-Caixa da atividade, mas **não** entram na base de incidência do Carnê-Leão (por já sofrerem retenção de IRRF pela fonte pagadora).

2. **Deduções de Livro-Caixa e Transporte de Excedente:**
   - `DespesasDisponiveis = round2(DespesasLivroCaixaPagasMes + (MesReferencia === 1 ? 0 : ExcedenteLivroCaixaMesAnterior))`
   - `LivroCaixaAceitoNaAtividade = round2(min(DespesasDisponiveis, ReceitaElegivelLivroCaixa))`
   - `ExcedenteRemanescente = round2(max(0, DespesasDisponiveis - LivroCaixaAceitoNaAtividade))`
   - **Janeiro:** bloqueado transporte de excedente do ano anterior (art. 104, § 2º).
   - **Fevereiro a Novembro:** excedente não aproveitado no mês é transportado para os meses seguintes até dezembro.
   - **Dezembro:** excedente remanescente não pode ser transportado para o ano-calendário seguinte.
   - **Abatimento na base do Carnê-Leão:**
     `LivroCaixaDeduzidoNaBaseCarneLeao = round2(min(LivroCaixaAceitoNaAtividade, RendimentosSujeitosCarneLeao))`
     `LivroCaixaAbsorvidoPelaPJ = round2(max(0, LivroCaixaAceitoNaAtividade - LivroCaixaDeduzidoNaBaseCarneLeao))`

3. **Deduções Legais Elegíveis:**
   - `DeducaoDependentes = round2(NumeroDependentes × 189,59)`
   - `DeducoesLegaisTotal = round2(LivroCaixaAceitoNaAtividade + ContribuicaoPrevidenciaria + DeducaoDependentes + PensaoAlimenticia)`

4. **Alternativa Mutuamente Exclusiva — Desconto Simplificado Mensal:**
   - `DescontoSimplificadoMensal = 607,20`
   - O desconto simplificado substitui integralmente as deduções legais no mês; nunca é somado a elas.

5. **Base de Cálculo e Imposto Antes da Redução:**
   - `BaseCalculo = max(0, round2(RendimentosSujeitosCarneLeao - DeducaoEscolhidaNaBase))`
   - `ImpostoAntesReducao = max(0, round2(BaseCalculo × AliquotaFaixa - ParcelaADeduzirFaixa))`

6. **Redução Mensal de 2026 (Art. 3º-A da Lei nº 9.250/1995):**
   - Até `R$ 5.000,00` de `RendimentosSujeitos`: `ReducaoMaxima = 312,89`; `ReducaoAplicada = ImpostoAntesReducao`; `ImpostoDevido = 0,00`.
   - De `R$ 5.000,01` até `R$ 7.350,00` de `RendimentosSujeitos`: `ReducaoMaxima = max(0, round2(978,62 - 0,133145 × RendimentosSujeitos))`; `ReducaoAplicada = min(ImpostoAntesReducao, ReducaoMaxima)`.
   - A partir de `R$ 7.350,01`: `ReducaoAplicada = 0,00`.
   - `ImpostoDevido = max(0, round2(ImpostoAntesReducao - ReducaoAplicada))`

## 4. Limitações Tributárias Documentadas

- Atende exclusivamente o ano-calendário de `2026`.
- Não realiza apuração de ajuste anual (DIRPF), não calcula acréscimos legais de DARF em atraso (multa/juros SELIC), não converte moedas estrangeiras pela PTAX diária do Banco Central e não aplica regras específicas de transporte de cargas/passageiros, serventuários da Justiça ou atividade rural.
