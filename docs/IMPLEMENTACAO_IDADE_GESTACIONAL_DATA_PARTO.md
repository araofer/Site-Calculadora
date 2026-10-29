# Implementação — Calculadora de Idade Gestacional e Data Provável do Parto (DPP) (`idade-gestacional-data-parto`)

## 1. Identificação da Ferramenta

- **ID / Slug:** `idade-gestacional-data-parto`
- **Nome Oficial:** Calculadora de Idade Gestacional e Data Provável do Parto (DPP)
- **Categoria:** Saúde (`categorySlug: saude`)
- **URL Canônica:** `/tools/saude/idade-gestacional-data-parto.html`
- **Data da Implementação:** `2026-10-28`
- **Status da Fórmula:** `verified`
- **Status no Catálogo:** `published`
- **Implementação:** `factory`

---

## 2. Auditoria Prévia de Duplicatas e Ferramentas Correlatas

- **`idade` (`/tools/saude/idade.html`):** Mede a idade cronológica civil a partir da data de nascimento de uma pessoa viva (anos, meses e dias de vida). Não realiza cálculos obstétricos, semanas gestacionais nem estimativas de nascimento.
- **`imc` (`/tools/saude/imc.html`):** Relação peso/altura.
- **Conclusão:** Não existia no CalculadoraMaster ferramenta obstétrica para idade gestacional e DPP. Ferramenta com propósito clínico, educativo e técnico claramente diferenciado.

---

## 3. Metodologia de Cálculo e Fórmulas Adotadas

### 3.1. Regra de Naegele e Cálculo por DUM
Para mulheres com ciclo regular de 28 dias:
$$\text{DPP} = \text{DUM} + 280\text{ dias}$$
Equivalente geométrico clássico:
- Somar 7 ao dia do primeiro dia da DUM;
- Subtrair 3 meses (ou somar 9 meses);
- Ajustar o ano conforme o avanço de calendário.

### 3.2. Ajuste para Ciclos Menstruais Diferentes de 28 Dias
Considerando a fase lútea biológica fixa em 14 dias:
$$\Delta_{\text{ciclo}} = c - 28\text{ dias}$$
$$\text{DPP}_{\text{ajustada}} = \text{DUM} + 280\text{ dias} + \Delta_{\text{ciclo}}$$
Onde $c$ é a duração média do ciclo menstrual (entre 21 e 40 dias).

### 3.3. Datação por Ultrassonografia (USG) de 1º Trimestre
A partir da data do exame ($D_{\text{exame}}$) e da idade gestacional aferida ($S_{\text{exame}}$ semanas e $d_{\text{exame}}$ dias):
$$\text{DUM}_{\text{teórica}} = D_{\text{exame}} - (S_{\text{exame}} \times 7 + d_{\text{exame}})$$
$$\text{DPP} = \text{DUM}_{\text{teórica}} + 280\text{ dias}$$

### 3.4. Idade Gestacional na Data de Referência
Sendo $d_{\text{total}}$ os dias corridos entre a DUM (ajustada ou teórica) e a data atual:
$$\text{Semanas} = \lfloor d_{\text{total}} / 7 \rfloor$$
$$\text{Dias} = d_{\text{total}} \pmod 7$$

### 3.5. Alertas Médicos e Limitações
- Informação expressa de que a DPP é uma estimativa estatística e apenas 4% a 5% dos nascimentos ocorrem na data exata;
- Faixa normal a termo: entre 37 semanas completas e 41 semanas e 6 dias;
- Não substitui as consultas de pré-natal e exames médicos obstétricos.

---

## 4. Fontes e Referências Confiáveis

1. Brasil. Ministério da Saúde. Secretaria de Atenção à Saúde. Departamento de Atenção Básica. *Atenção ao pré-natal de baixo risco*. Cadernos de Atenção Básica, n. 32. Brasília: Editora do Ministério da Saúde, 2013.
2. Federação Brasileira das Associações de Ginecologia e Obstetrícia (FEBRASGO). *Manual de Assistência Pré-Natal*. São Paulo: FEBRASGO, 2019.
3. American College of Obstetricians and Gynecologists (ACOG). *Committee Opinion No. 700: Methods for Estimating the Due Date*. Obstetrics & Gynecology, 2017; 129(5):e150-e154.
4. Naegele CF. *Lehrbuch der Geburtshülfe*. Heidelberg: J.C.B. Mohr, 1830.
