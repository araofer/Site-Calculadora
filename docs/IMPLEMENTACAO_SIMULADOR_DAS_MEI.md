# Implementação e Documentação Técnica — Simulador de DAS do MEI

## 1. Contexto e Diagnóstico de Duplicidade

Antes de iniciar a codificação, foi realizada uma auditoria funcional detalhada no catálogo do CalculadoraMaster (`data/tools.json` e `js/tools-catalog.js`) e nas calculadoras correlatas existentes:

1. **`mei-ou-autonomo` (Calculadora MEI ou Autônomo):**
   - É um comparador de viabilidade financeira entre enquadramento PJ (MEI) e atuação como Pessoa Física (Autônomo com Carnê-Leão e livro-caixa).
   - Utiliza apenas um valor estimado hardcoded de DAS mensal como despesa fixa de linha para dedução do lucro líquido.
   - Não permite selecionar ano de referência, não discrimina as parcelas de INSS, ICMS e ISS, não suporta o MEI Caminhoneiro e não apresenta a memória tributária da guia.
2. **`projecao-faturamento-mei` (Calculadora de Projeção de Faturamento MEI):**
   - Controla exclusivamente o teto anual de receita bruta (R$ 81.000,00 ou limite proporcional), alertando sobre risco de desenquadramento fiscal. Não calcula valores tributários da guia mensal.
3. **`simples-nacional`:**
   - Calcula os tributos para microempresas (ME) e empresas de pequeno porte (EPP) com base nos Anexos I a V, alíquotas nominais e dedutíveis por faixas de RBT12, sem conexão com o recolhimento fixo do MEI.

**Conclusão da Auditoria:**
Não existia no portal nenhuma ferramenta capaz de simular, decompor ou planejar o recolhimento mensal e anual da guia DAS-MEI. A criação do **Simulador de DAS do MEI** é técnica, fiscal e funcionalmente necessária e justificada.

---

## 2. Pesquisa Tributária Obrigatória e Fontes Oficiais

- **Data da Consulta Oficial:** 28 de outubro de 2026.
- **Fontes Consultadas:**
  1. **Portal do Empreendedor (Governo Federal do Brasil):**
     - URL: `https://www.gov.br/empresas-e-negocios/pt-br/empreendedor`
  2. **Portal do Simples Nacional / Receita Federal do Brasil (Notícia Oficial sobre os Valores do DAS-MEI 2026):**
     - URL: `https://www8.receita.fazenda.gov.br/SIMPLESNACIONAL/noticias/NoticiaCompleta.aspx?id=c3b2044c-ff97-432a-b33c-ecf2a3df6dc3`
  3. **Lei Complementar nº 123, de 14 de dezembro de 2006 (Estatuto Nacional da Microempresa e EPP):**
     - Art. 18-A, § 3º, inciso I (alíneas "a", "b" e "c")
     - URL: `https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp123.htm`
  4. **Lei Complementar nº 188, de 31 de dezembro de 2021 (MEI Caminhoneiro / Transportador Autônomo de Cargas):**
     - Art. 18-F da LC nº 123/2006 (acrescentado pela LC nº 188/2021)
     - URL: `https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp188.htm`
  5. **Lei nº 8.212, de 24 de julho de 1991 (Organização da Seguridade Social):**
     - Art. 21, § 2º, inciso II, alínea "a" (Alíquota de 5% sobre o salário mínimo para segurado individual enquadrado como MEI)
     - URL: `https://www.planalto.gov.br/ccivil_03/leis/l8212cons.htm`
  6. **Decretos Federais de Fixação do Salário Mínimo Nacional:**
     - **2024:** Decreto nº 11.864, de 27 de dezembro de 2023 — Salário Mínimo de R$ 1.412,00.
     - **2025:** Decreto nº 12.339, de 30 de dezembro de 2024 — Salário Mínimo de R$ 1.518,00.
     - **2026:** Decreto nº 12.797, de 23 de dezembro de 2025 — Salário Mínimo de R$ 1.621,00.

---

## 3. Regras Oficiais de Cálculo

### 3.1 Composição Tributária da Guia DAS-MEI

Conforme o art. 18-A, § 3º, inciso I da LC 123/2006, o valor mensal do DAS corresponde à soma invariável de:

1. **Contribuição Previdenciária (INSS do Empreendedor):**
   - **MEI Comum:** 5% do Salário Mínimo Nacional (art. 21, § 2º, II, 'a' da Lei 8.212/1991).
   - **MEI Caminhoneiro:** 12% do Salário Mínimo Nacional (art. 18-F, § 1º da LC 123/2006, incluído pela LC 188/2021).
2. **ICMS (Imposto Estadual):**
   - R$ 1,00 fixo ao mês, incidente quando a atividade envolver Comércio, Indústria ou Transporte Intermunicipal/Interestadual de Cargas.
3. **ISS (Imposto Municipal):**
   - R$ 5,00 fixo ao mês, incidente quando a atividade envolver Prestação de Serviços em geral ou Transporte estritamente Municipal de Cargas.

### 3.2 Tabela Oficial de Valores Nominais por Ano

| Ano | Salário Mínimo | INSS Comum (5%) | Comércio (ICMS) | Serviços (ISS) | Comércio + Serviços | INSS Caminhoneiro (12%) | Caminhoneiro Cargas | Caminhoneiro Municipal | Caminhoneiro Misto |
|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| **2026** | **R$ 1.621,00** | R$ 81,05 | **R$ 82,05** | **R$ 86,05** | **R$ 87,05** | R$ 194,52 | **R$ 195,52** | **R$ 199,52** | **R$ 200,52** |
| **2025** | **R$ 1.518,00** | R$ 75,90 | **R$ 76,90** | **R$ 80,90** | **R$ 81,90** | R$ 182,16 | **R$ 183,16** | **R$ 187,16** | **R$ 188,16** |
| **2024** | **R$ 1.412,00** | R$ 70,60 | **R$ 71,60** | **R$ 75,60** | **R$ 76,60** | R$ 169,44 | **R$ 170,44** | **R$ 174,44** | **R$ 175,44** |

### 3.3 Regras de Vencimento e Encargos Moratórios

- **Vencimento Regular:** Todo dia 20 do mês subsequente à competência apurada (ou primeiro dia útil seguinte se o dia 20 for sábado, domingo ou feriado bancário nacional).
- **Acréscimos em Caso de Atraso:**
  - *Multa de mora:* 0,33% ao dia, contada a partir do primeiro dia útil seguinte ao vencimento, com teto de 20%.
  - *Juros de mora:* Equivalentes à taxa SELIC acumulada a partir do mês seguinte ao vencimento até o mês anterior ao pagamento, acrescida de 1% no mês de liquidação.
- **Aviso Obrigatório:** A calculadora fornece um simulador regular didático e enfatiza que a emissão de guias com código de barras ou Pix deve ser realizada unicamente no PGMEI oficial.

---

## 4. Arquivos Criados e Alterados

- `data/tools.json`: Cadastro oficial da ferramenta nº 41 (`simulador-das-mei`), com metadados, links de fontes governamentais e palavras-chave.
- `js/tools/simulador-das-mei.js`: Módulo com arquitetura Factory, cálculos matemáticos puros em centavos inteiros (`parseMoneyToCents`), exportação e integração DOM via `createResultActions`.
- `src/pages/tools/financas/simulador-das-mei.page.html`: Página fonte com `layout: tool`, formulário semântico com validação nativa, cartões de resultados acessíveis (`aria-live`), memória de cálculo, tabela comparativa e FAQ.
- `tests/simulador-das-mei.test.js`: Suíte de 10 testes dedicados cobrindo todas as atividades, os 3 anos de vigência, limites, formatação, integração DOM, favoritos e conformidade de layout.
- `js/core/favorites.js`: Registro de `simulador-das-mei` no conjunto `VALID_TOOL_IDS` (41 ferramentas).
- `tests/favorites.test.js`, `tests/build-html.test.js`, `tests/seo.test.js`: Atualização das contagens de assertivas de 40 para 41 ferramentas, 74 para 75 páginas do site e 91 para 92 assets.

---

## 5. Verificação e Testes Automatizados

Comandos de validação executados:
- `node --test tests/simulador-das-mei.test.js` (10 testes passaram)
- `node --test tests/favorites.test.js` (33 testes passaram)
- `node --test tests/build-html.test.js` (66 testes passaram)
- `node --test tests/seo.test.js` (17 testes passaram)
- `npm run build:data` (41 ferramentas validadas com sucesso)
- `npm test` (Todos os testes passaram)
- `npm run verify:ssg`
- `npm run audit:prod`
