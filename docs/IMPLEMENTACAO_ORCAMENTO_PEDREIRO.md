# Implementação — Calculadora de Orçamento de Pedreiro (`orcamento-pedreiro`)

## 1. Visão Geral

- **ID / Slug:** `orcamento-pedreiro`
- **Categoria:** `Utilidades` (`utilidades`)
- **Rota pública:** `/tools/utilidades/orcamento-pedreiro.html`
- **Página-fonte:** `src/pages/tools/utilidades/orcamento-pedreiro.page.html`
- **Módulo JavaScript:** `js/tools/orcamento-pedreiro.js`
- **Testes automatizados:** `tests/orcamento-pedreiro.test.js`

## 2. Entradas e Modos de Cálculo

A calculadora suporta dois modos mutuamente exclusivos selecionados em `#modoCalculoPedreiro`:

1. **Modo por m² (`m2`):**
   - Área do serviço em m² (`#areaServico`, $> 0$ e $\le 100.000$ m²)
   - Preço da mão de obra por m² em R$ (`#precoPorM2`, $> 0$ e $\le \text{R\$ } 1.000.000,00$)
2. **Modo por diária (`diaria`):**
   - Quantidade estimada de diárias (`#quantidadeDiarias`, $> 0$ e $\le 3.650$, aceitando decimais como meios-dias)
   - Preço de cada diária em R$ (`#precoDiaria`, $> 0$ e $\le \text{R\$ } 1.000.000,00$)

Os campos do modo inativo ficam ocultos na interface (`hidden`), são limpos ao alternar o modo e são ignorados na camada pura `normalizeInput`, impedindo interferência no cálculo.

### Campos complementares

- **Custos adicionais opcionais (R$):**
  - Transporte e deslocamento (`#custoTransporte`, padrão `0`)
  - Aluguel de ferramentas e equipamentos (`#custoFerramentas`, padrão `0`)
  - Retirada de entulho / caçamba (`#custoEntulho`, padrão `0`)
  - Outros serviços adicionais (`#outrosCustosAdicionais`, padrão `0`)
- **Custo estimado de materiais (R$):** `#custoMateriais` (opcional, padrão `0`, mantido estritamente separado da mão de obra).
- **Reserva para imprevistos (%):** `#reservaPercentual` (padrão `10%`, intervalo de `0%` a `100%`).
- **Desconto opcional (R$):** `#descontoOrcamento` (padrão `0`, $\ge 0$ e limitado ao subtotal com reserva).

## 3. Ordem das Operações e Fórmulas

1. **Custo da mão de obra:**
   - No modo `m2`: $\text{Mão de obra} = \text{Área} \times \text{Preço por m}^2$
   - No modo `diaria`: $\text{Mão de obra} = \text{Quantidade de diárias} \times \text{Preço da diária}$
2. **Custos adicionais de serviço:**
   $$\text{Custos adicionais} = \text{Transporte} + \text{Ferramentas} + \text{Entulho} + \text{Outros adicionais}$$
3. **Custo de materiais:**
   Contabilizado separadamente do valor da mão de obra.
4. **Base de cálculo da reserva (antes do desconto):**
   $$\text{Base da reserva} = \text{Mão de obra} + \text{Custos adicionais} + \text{Materiais}$$
5. **Reserva para imprevistos:**
   $$\text{Reserva} = \text{Base da reserva} \times \left(\frac{\text{Percentual de reserva}}{100}\right)$$
6. **Subtotal antes do desconto:**
   $$\text{Subtotal} = \text{Base da reserva} + \text{Reserva}$$
7. **Total estimado:**
   $$\text{Total estimado} = \text{Subtotal} - \text{Desconto}$$
8. **Custo médio por m²:**
   Calculado somente quando o modo é `m2` e a área é válida ($> 0$):
   $$\text{Custo médio por m}^2 = \frac{\text{Total estimado}}{\text{Área}}$$
   No modo `diaria`, `custoMedioPorM2` retorna `null` e a linha permanece oculta.

## 4. Premissas e Avisos

- Nenhum preço de mercado é presumido ou inventado; todos os preços unitários são informados pelo usuário.
- A página exibe aviso explícito de que o resultado é uma estimativa de planejamento e não substitui visita técnica ou orçamento profissional.
