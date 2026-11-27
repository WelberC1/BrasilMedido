# Brasil Medido: contexto do projeto

Documento de referência do projeto: o que é, como funciona, de onde vêm os dados, decisões tomadas,
pendências e próximos passos. Estado em **27/11/2026**.

---

## 1. O que é

**Brasil Medido** é um atlas interativo e gratuito de indicadores socioeconômicos **oficiais do IBGE**.
O visitante vê o Brasil inteiro colorido por um indicador, clica em um estado e o mapa "voa" até ele,
mostrando os municípios; clica em uma cidade e recebe a ficha dela. Tudo com fonte, tabela, período e
unidade visíveis.

- **Público principal:** recrutadores e avaliadores técnicos (projeto de portfólio).
- **Público secundário:** brasileiros curiosos que chegam por um link compartilhado.
- **Autoria:** [WelberC1](https://github.com/WelberC1). Repositório: `BrasilMedido` (site em https://welberc1.github.io/BrasilMedido/).
- **Referência de comportamento:** [seuimposto.com](https://seuimposto.com/) (mapa em tela cheia com
  drill-down estado → município). Copiamos o *comportamento*, nunca a identidade (nome, logo, fontes, cores
  de partido).

### Por que "Brasil Medido" e não "Brasil em Números"

O nome original do briefing, "Brasil em Números", é o nome de uma **publicação oficial do IBGE**. Para
evitar risco jurídico, o nome foi trocado. "Brasil Medido" foi escolhido depois de uma busca na web e no
GitHub que não encontrou nenhum projeto, produto ou repositório com esse nome. O rodapé diz explicitamente:
"Projeto independente, sem vínculo com o IBGE".

---

## 2. Arquitetura

```
C:\Github\BrasilMedido
├── etl/                         .NET 10: pipeline de dados
│   ├── BrasilMedido.Etl/        Catalog.cs (catálogo), Sidra.cs (API e parsing),
│   │                            IndicatorBuilder.cs (validação e séries), Program.cs (orquestração)
│   └── BrasilMedido.Etl.Tests/  xUnit (20 testes)
├── web/                         React 19 + TypeScript + Vite + Tailwind v4
│   ├── public/data/             JSON gerado pelo ETL (catálogo, séries, municípios)
│   ├── public/geo/              malhas do IBGE (UFs em GeoJSON, municípios em TopoJSON)
│   └── src/                     app (componentes, lib/ com cálculos testados no Vitest: 15 testes)
├── .github/workflows/deploy.yml ETL + testes + build + publicação no GitHub Pages
├── README.md                    apresentação do repositório
└── CONTEXTO.md                  este documento
```

### Decisão central: sem backend em produção

O briefing pedia hospedagem gratuita e nenhuma infraestrutura desnecessária. A preferência do autor é
C#/.NET no back. A solução que concilia as duas coisas: **o .NET é o pipeline de dados, não um servidor.**

1. O ETL (.NET 10) consulta as APIs públicas do IBGE, valida tudo e grava JSON em `web/public`.
2. O site é estático (React) e lê esses JSON. Ele é publicado no **GitHub Pages**.
3. Um GitHub Action roda o ETL todo dia 5 do mês (e a cada push), versiona os dados que mudaram e publica.

**Garantia de integridade:** o ETL baixa e valida tudo **em memória** e só grava se *todos* os indicadores
passarem. Se o IBGE estiver fora do ar, o site continua com a última versão boa; nunca fica com dados pela metade.

### Frontend

| Peça | Arquivo | Papel |
|---|---|---|
| Mapa com câmera | `components/AtlasMap.tsx` | SVG com d3-geo, zoom animado Brasil → UF → município (no Brasil só os 27 estados; os municípios aparecem ao clicar no estado), rótulos com contra-escala, etiquetas laterais dos estados pequenos, detecção de colisão de rótulos |
| Placar | `components/Scoreboard.tsx` | 5 números principais do lugar na tela, com selo melhor/pior e barra de posição |
| Barra superior | `components/TopBar.tsx` | categorias, busca de cidades/estados, compartilhar link |
| Painel do indicador | `components/IndicatorPanel.tsx` | escolha do indicador, legenda divergente, ranking de estados ou municípios |
| Ficha do lugar | `components/PlacePanel.tsx` | Brasil / UF / município; evolução com eixos; retrato do Censo para cidades |
| Linha do tempo | `components/Timeline.tsx` | seletor de período com animação (▶) |
| Comparação | `components/Compare.tsx` | até 4 UFs, linhas (séries) ou barras (Censo, ano único) + tabela |
| Escala de cores | `lib/scale.ts` | **divergente centrada no valor do Brasil** (azul = melhor, laranja = pior); violeta para indicadores neutros |
| Cálculos | `lib/stats.ts` | ranking com empates, quantis, período comparável, CV |
| Estado na URL | `lib/urlState.ts` | `?i=indicador&uf=SP&mun=3550308&p=período&cmp=SP,RJ`: todo estado da tela é um link compartilhável |

Malhas e dados municipais são carregados **sob demanda**: a visão Brasil mostra só os 27 estados
(decisão do autor: as cidades só aparecem depois do clique no estado). A malha municipal de cada estado
(~0,1–0,5 MB) é baixada apenas quando o estado é clicado.

---

## 3. Fontes de dados

Todas as fontes são **públicas e oficiais**, obtidas pela [API de agregados do IBGE](https://servicodados.ibge.gov.br/api/docs/agregados?versao=3)
(SIDRA), [Localidades](https://servicodados.ibge.gov.br/api/docs/localidades) e [Malhas](https://servicodados.ibge.gov.br/api/docs/malhas?versao=3).

### 3.1 Indicadores por UF (Brasil + 27 UFs, com série histórica)

| Categoria | Indicador | Pesquisa | Tabela | Variável | Filtros | Série |
|---|---|---|---|---|---|---|
| Educação | Taxa de analfabetismo (15+) | PNAD Contínua anual | 7113 | 10267 (CV 10268) | sexo total, 15+ | 2016–2025 |
| Educação | Média de anos de estudo (25+) | PNAD Contínua anual | 7126 | 3593 (CV 3594) | sexo total, 25+ | 2016–2025 |
| Trabalho | Taxa de desocupação | PNAD Contínua trimestral | 4099 | 4099 (CV 4103) | — | 1º tri 2012–3º tri 2026 |
| Trabalho | Taxa composta de subutilização | PNAD Contínua trimestral | 4099 | 4118 (CV 4119) | — | 1º tri 2012–3º tri 2026 |
| Trabalho | Taxa de informalidade | PNAD Contínua trimestral | 8529 | 12466 (CV 12467) | — | 4º tri 2015–3º tri 2026 |
| Trabalho | Rendimento médio habitual (real) | PNAD Contínua trimestral | 5436 | 5933 (CV 5941) | sexo total | 1º tri 2012–3º tri 2026 |
| Renda | Rendimento domiciliar per capita (real) | PNAD Contínua anual | 7533 | 10816 (CV 10817) | classe total | 2012–2025 |
| Renda | Índice de Gini | PNAD Contínua anual | 7435 | 10681 (CV 10682) | — | 2012–2025 |
| Demografia | População residente estimada | Estimativas de População | 6579 | 9324 | — | 2001–2026 |
| Condições de vida | Domicílios com internet | PNAD Contínua anual | 7307 | 9784 (CV 9785) | situação total, "havia utilização" | 2016–2025 |

### 3.2 Indicadores por município (Censo Demográfico 2022, retrato único)

| Indicador | Tabela | Variável / cálculo | Tipo |
|---|---|---|---|
| Taxa de alfabetização (15+) | 10091 | 2513 | observado |
| Idade mediana | 10097 | 10613 | observado |
| Densidade demográfica | 4714 | 614 | calculado pelo IBGE |
| Domicílios ligados à rede de esgoto | 10105 | (rede geral, pluvial ou fossa ligada à rede) ÷ total de domicílios | **calculado por nós** a partir das contagens do Censo |
| Domicílios com água da rede geral | 10103 | rede geral de distribuição ÷ total | **calculado por nós** |
| Domicílios com coleta de lixo | 10109 | (coletado em casa + caçamba) ÷ total | **calculado por nós** |
| População 2022 (apoio: rótulos e ficha) | 4714 | 93 | observado |

Os mesmos arquivos trazem o valor de Brasil e de cada UF, para comparar município × UF × Brasil.

### 3.3 Geografia

- **UFs:** `malhas/paises/BR?intrarregiao=UF&qualidade=intermediaria` (GeoJSON).
- **Municípios por UF (detalhe):** `malhas/estados/{UF}?intrarregiao=municipio&qualidade=intermediaria` (27 arquivos).
- **Lista de municípios:** API de Localidades (5.571 municípios).

> Detalhe técnico: as malhas do IBGE usam a orientação de anéis "plana" (RFC 7946); o d3-geo usa a esférica.
> Sem correção, cada estado vira um retângulo que cobre o globo. A função `rewind` em `lib/data.ts` corrige isso.

---

## 4. Regras de dados (inegociáveis)

1. **Nada é inventado nem interpolado.** Períodos não divulgados (por exemplo, os módulos anuais da PNAD
   em 2020–2021 e trimestres de rendimento na pandemia) aparecem **hachurados como lacuna**.
2. **O valor do Brasil é sempre o oficial do IBGE** (nível N1 do SIDRA), nunca uma média dos estados.
3. **Município só com Censo.** A PNAD Contínua não é representativa por município. Nos indicadores da PNAD,
   as cidades **herdam a cor do estado** e a interface avisa isso explicitamente.
4. **Fontes e metodologias não se misturam na mesma série.** Exemplo: a série de população (estimativas)
   tem lacunas em 2007, 2010, 2022 e 2023; o Censo 2022 **não** foi enxertado nela.
5. **Incerteza visível.** A PNAD é amostral: o coeficiente de variação (CV) acompanha cada estimativa.
   Acima de 15% o site sinaliza "precisão menor"; **esse limite é critério de leitura do site, não regra do IBGE**.
6. **Tipo do dado declarado:** observado, estimado ou calculado.
7. **Valores reais:** rendimentos estão deflacionados pelo próprio IBGE (a preços do período mais recente).
8. **Município sem dado:** apenas **Boa Esperança do Norte (MT)**, criado em 2023, depois do Censo. Aparece hachurado.

---

## 4.1 Verificação de autenticidade (28/11/2026)

Os dados do site foram conferidos contra o IBGE por um **caminho independente do ETL**: a API clássica do
SIDRA (`apisidra.ibge.gov.br/values`), e não a API v3 de agregados que o ETL usa.

- **1.272 valores comparados, 0 divergências.**
- Todos os 16 indicadores, para Brasil e as 27 UFs, no primeiro, num intermediário e no último período de cada série.
- Censo 2022 por município: amostra aleatória de 40 municípios (semente fixa) mais São Paulo, Rio de Janeiro,
  Manaus e Brasília, para os 6 indicadores municipais.
- Os percentuais de esgoto, água e lixo foram **recalculados do zero** a partir das contagens brutas de
  domicílios e bateram com os do site.
- Cada código de variável e de filtro foi conferido nos metadados oficiais, para garantir que o número é o
  que o rótulo diz. Por exemplo: analfabetismo = "15 anos ou mais" e sexo "Total"; anos de estudo = "25 anos
  ou mais"; internet = "Havia utilização de internet".
- Coerência externa: a alfabetização do Censo 2022 no Brasil (93,0%) corresponde à taxa de analfabetismo
  de 7,0% divulgada pelo IBGE para o Censo.

- Checagem pontual pedida pelo autor (28/11): **Palestina de Goiás (5215652)**. População 3.132, densidade 2,38,
  alfabetização 88,76%, idade mediana 40, esgoto na rede 10 de 1.203 domicílios (0,8%), água 748/1.203 (62,2%),
  lixo 802/1.203 (66,7%); tudo idêntico ao SIDRA. Atenção a definições: "esgotamento adequado" do IBGE Cidades
  inclui fossa séptica (daria 30,4%); o site mede só ligação à rede.
- População é sempre exibida **exata** (ex.: 3.132; 214.211.951), nunca arredondada; só os eixos de gráfico abreviam.

Para repetir: `python scripts/verificar_dados.py .` (na raiz do repositório; precisa de internet).

## 5. Design

- **Versão 1 (descartada):** padrão "Our World in Data", azul-marinho sóbrio. O autor achou "sem graça" e
  "com cara de vibecoding".
- **Versão 2: "Noite de Apuração"**, inspirada em gráficos de apuração eleitoral da TV (layout, placar,
  mapa que voa até o estado). A estrutura continua; a paleta azul-elétrico/laranja foi trocada na versão 3.
- **Versão 3 (atual): paleta "Azulejo"**, escolhida pelo autor para tirar a cara de "vibecoding":
  - inspirada nos painéis de azulejo de **Athos Bulcão** em Brasília: cobalto e branco esmaltado;
  - fundo `#E8EDF4`, painéis brancos com borda definida (como azulejo, sem sombra flutuante), tinta cobalto-noite `#0B1F4A`;
  - **mapa divergente centrado no Brasil:** cobalto `#1D3FA8` = melhor que o Brasil, ocre `#C9822E` = pior,
    cinza quente `#C9C3B8` ≈ Brasil; indicadores neutros em turquesa de azulejo;
  - **logo e favicon:** o mapa do Brasil em branco sobre um ladrilho cobalto, com Brasília marcada em ocre
    (contorno gerado da malha oficial do IBGE, em `web/src/components/brazilOutline.ts`); logotipo "Brasil" em tinta + "Medido" em cobalto;
  - tipografia **Archivo** variável (eixo de largura);
  - cores da comparação (verde-azulado, violeta, magenta, oliva) fora do cobalto/ocre e **validadas para daltonismo**.
- **Modo noturno** (botão de lua/sol na barra superior; segue o tema do sistema na primeira visita e lembra a escolha):
  fundo cobalto-noite `#0A1224`, painéis `#111C35`, tinta branco-esmalte. É composto à parte, não invertido:
  o mapa tem rampas próprias em que **mais intenso = mais claro e saturado** (cobalto `#2C4178`→`#A6BDFF`,
  ocre `#5A4127`→`#F6C27A`, turquesa para neutros), e a comparação usa as mesmas quatro cores ajustadas e
  revalidadas para daltonismo no fundo escuro.

---

## 6. Como rodar

```bash
# dados (precisa de internet; ~1–2 min)
dotnet test
dotnet run --project etl/BrasilMedido.Etl

# site
cd web
npm install
npx vitest run
npm run dev          # http://localhost:5173
npm run build && npx vite preview   # build de produção em http://localhost:4173/BrasilMedido/
```

---

## 7. Status atual

| Item | Status |
|---|---|
| ETL .NET com 16 indicadores + camada municipal | ✅ pronto, 20 testes passando |
| Frontend redesenhado (mapa com drill-down, placar, busca, comparação, fontes) | ✅ funcional, 15 testes passando, build ok |
| Revisão de design e acessibilidade (redesenho) | ✅ concluída; ajustes aplicados |
| Autenticidade dos dados | ✅ 1.272 valores conferidos contra o SIDRA, 0 divergências (seção 4.1) |
| Licença | ✅ MIT (`LICENSE`) |
| Repositório Git | ⚠️ `git init` feito, **nenhum commit** |
| GitHub / GitHub Pages | ⚠️ repositório não criado, Pages não ativado |

---

## 8. Pendências

### Para publicar (bloqueiam o lançamento)
- [ ] **Primeiro commit** e publicação do repositório `BrasilMedido` no GitHub (feita pelo autor).
- [ ] Ativar **Settings → Pages → Source: GitHub Actions** e conferir o primeiro deploy.
- [ ] Rodar o workflow uma vez manualmente (`workflow_dispatch`) para validar o ETL no runner Linux.

### Qualidade e acessibilidade (não verificados)
- [ ] Navegação **só por teclado** de ponta a ponta (hoje os municípios no mapa são alcançáveis pela busca e pelo ranking, não por Tab no mapa).
- [ ] Teste com **leitor de tela**.
- [ ] Testes de ponta a ponta (Playwright) para o fluxo Brasil → UF → município.
- [ ] Desempenho em celulares fracos com estados de muitos municípios (MG tem 853 em SVG); avaliar canvas se pesar.

### Técnicas
- [ ] **Bundle JS de ~730 KB** (Recharts pesa): dividir o código (`import()` dinâmico) ou trocar gráficos simples por SVG próprio.
- [ ] **Malhas municipais somam ~3,4 MB** em `public/geo/mun` (baixadas uma por estado, sob demanda): simplificar com mapshaper se necessário.
- [ ] O workflow baixa 27 malhas a cada execução; poderia baixar só quando mudarem.

---

## 9. Próximos passos (sugeridos)

**Curto prazo**
1. Publicar (seção 8, primeiro bloco).
2. Adicionar uma imagem de pré-visualização (Open Graph) para o link ficar bonito quando compartilhado.
3. Comparação também entre **municípios** (hoje só UFs).

**Novos dados**
4. **Internet por município** (Censo 2022, tabela 10201): a variável percentual precisa ser validada antes.
5. **PIB per capita municipal** (PIB dos Municípios, tabela 5938, até 2023): exige dividir pelo número de
   habitantes, então seria um indicador "calculado", com a fonte da população explícita.
6. Indicadores do **INEP** (IDEB, por município) e do **DATASUS** (mortalidade infantil), já previstos no briefing.
7. Distribuições (pirâmide etária, níveis de instrução) como gráficos dentro da ficha do lugar.

**Produto**
9. Botão "baixar dados (CSV)" ao lado das fontes.
10. Textos curtos de leitura ("o que este número quer dizer") para leigos em cada indicador.
