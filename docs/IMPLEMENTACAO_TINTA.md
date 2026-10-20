# Implementação — Calculadora de Tinta (`tinta`)

## 1. Visão Geral

- **ID / Slug:** `tinta`
- **Categoria:** `Utilidades` (`utilidades`)
- **Rota pública:** `/tools/utilidades/tinta.html`
- **Página-fonte:** `src/pages/tools/utilidades/tinta.page.html`
- **Módulo JavaScript:** `js/tools/tinta.js`
- **Testes automatizados:** `tests/tinta.test.js`

## 2. Entradas e Padrões

| Campo | Identificador | Unidade | Padrão | Regra de validação |
| :--- | :--- | :--- | :--- | :--- |
| Área das paredes | `#areaParedes` | m² | — | $\ge 0$ e $\le 100.000$ m² |
| Área do teto | `#areaTeto` | m² | `0` | $\ge 0$ e $\le 100.000$ m² |
| Área de aberturas (portas e janelas) | `#areaAberturas` | m² | `0` | $\ge 0$ e $\le \text{área das paredes}$ |
| Número de demãos | `#demaos` | quantidade | `2` | Inteiro entre `1` e `20` |
| Rendimento por demão | `#rendimento` | m²/L | — | $> 0$, entre `0,1` e `500` m²/L |
| Margem para perdas | `#margem` | % | `10` | Entre `0%` e `100%` |
| Tamanho da embalagem (opcional) | `#tamanhoEmbalagem` | L | vazio | Opcional; quando informado, entre `0,1` e `500` L |

Todos os campos numéricos aceitam separador decimal com vírgula (`,`) ou ponto (`.`).

## 3. Fórmulas Utilizadas

1. **Área bruta ($\text{m}^2$):**
   $$\text{Área bruta} = \text{Área das paredes} + \text{Área do teto}$$
2. **Área líquida ($\text{m}^2$):**
   $$\text{Área líquida} = \text{Área bruta} - \text{Área das aberturas}$$
   *Regra:* as aberturas são descontadas da área das paredes ($\text{Área das aberturas} \le \text{Área das paredes}$) e a área líquida total deve ser estritamente maior que zero.
3. **Área equivalente considerando as demãos ($\text{m}^2$):**
   $$\text{Área equivalente} = \text{Área líquida} \times \text{Número de demãos}$$
4. **Litros sem margem ($\text{L}$):**
   $$\text{Litros sem margem} = \frac{\text{Área equivalente}}{\text{Rendimento por demão}}$$
5. **Litros necessários ($\text{L}$):**
   $$\text{Litros necessários} = \text{Litros sem margem} \times \left(1 + \frac{\text{Margem percentual}}{100}\right)$$
6. **Cálculo de embalagens (quando o tamanho da embalagem é informado):**
   $$\text{Quantidade de embalagens} = \left\lceil \frac{\text{Litros necessários}}{\text{Litros por embalagem}} \right\rceil$$
   $$\text{Volume total comprado} = \text{Quantidade de embalagens} \times \text{Litros por embalagem}$$
   $$\text{Sobra estimada} = \text{Volume total comprado} - \text{Litros necessários}$$
   *Precisão decimal:* o quociente é normalizado com 9 casas decimais antes de `Math.ceil` para evitar que ruídos de ponto flutuante (como `10.8 / 3.6 = 3.0000000000000004`) adicionem uma embalagem indevida, garantindo ao mesmo tempo arredondamento estrito para cima para qualquer fração real.

## 4. Caso de Referência Validado

- **Entradas:** Paredes = `80 m²`, Teto = `20 m²`, Aberturas = `10 m²`, Demãos = `2`, Rendimento = `10 m²/L`, Margem = `10%`, Embalagem = `3,6 L`.
- **Saídas:**
  - Área bruta: `100 m²`
  - Área líquida: `90 m²`
  - Área equivalente (2 demãos): `180 m²`
  - Litros sem margem: `18,00 L`
  - Margem aplicada: `10% (+1,80 L)`
  - Litros necessários: `19,80 L`
  - Embalagens: `6 embalagens de 3,6 L`
  - Volume comprado: `21,60 L`
  - Sobra estimada: `1,80 L`
