import { ExternalLink } from 'lucide-react'
import type { Catalog } from '../lib/types'
import { CV_ATTENTION } from '../lib/stats'
import { unitLabel } from '../lib/format'

export function Sources({ catalog }: { catalog: Catalog }) {
  const updated = new Date(catalog.generatedAt).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })
  const cat = new Map(catalog.categories.map((c) => [c.id, c.name]))
  return (
    <section id="dados" aria-labelledby="dados-title" className="scroll-mt-6">
      <div className="grid gap-10 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <h2 id="dados-title" className="text-2xl font-extrabold tracking-[-0.01em] text-ink">
            Sobre os dados
          </h2>
          <div className="mt-4 max-w-prose space-y-3 text-sm leading-relaxed text-ink-2">
            <p>
              Os números desta página vêm dos serviços de dados abertos do IBGE: as tabelas estatísticas do SIDRA, a lista oficial de
              municípios e os contornos do mapa. Uma vez por mês, um programa baixa tudo de novo e confere se o Brasil, os 26 estados e o
              Distrito Federal estão presentes em cada período. Se alguma tabela não baixar ou não passar nessa conferência, os dados
              anteriores continuam no ar. Última atualização: {updated}.
            </p>
            <p>
              O valor do Brasil é o que o próprio IBGE publica para o país. A média simples dos estados daria outro número, porque contaria
              Roraima com o mesmo peso de São Paulo, que tem dezenas de vezes mais habitantes.
            </p>
            <p>
              Período que o IBGE não divulgou fica marcado com listras no gráfico e na linha do tempo, sem nenhum número inventado no lugar.
              A PNAD Contínua, pesquisa do IBGE feita com uma amostra de domicílios, não publicou o módulo anual de educação em 2020 e 2021.
              Na série de população faltam 2007, 2010, 2022 e 2023: nesses anos o IBGE fez Contagem ou Censo, ou não publicou estimativa, e
              essas pesquisas têm outro método, por isso não entram na série.
            </p>
            <p>
              Como a PNAD Contínua trabalha com amostra, cada número dela tem alguma imprecisão, indicada pelo coeficiente de variação (CV):
              quanto maior o CV, menos confiável o número. O site mostra o CV ao lado do valor e põe um alerta quando ele passa de{' '}
              {CV_ATTENTION}%. O IBGE não define esse limite; ele foi escolhido para facilitar a leitura.
            </p>
            <p>
              A amostra da PNAD não é grande o bastante para a maioria dos municípios, e o IBGE só a divulga para capitais e regiões
              metropolitanas, que este site não mostra. Nos indicadores da PNAD, cada município aparece com a cor e o valor do estado.
            </p>
            <p>
              Os dados de cada município vêm do Censo 2022, que visita todos os domicílios do país: taxa de alfabetização, idade mediana,
              densidade demográfica e a parcela de domicílios ligados à rede de esgoto, abastecidos pela rede geral de água e com lixo
              coletado. Nesses três últimos, o percentual é calculado aqui, para municípios, estados e Brasil, a partir das contagens de
              domicílios publicadas pelo IBGE. Boa Esperança do Norte (MT) aparece sem dado porque entrou na lista oficial de municípios
              depois do Censo.
            </p>
            <p>Valores em reais estão com a inflação descontada: o IBGE atualizou os valores antigos para os preços do período mais recente.</p>
            <p>
              No mapa, a referência é o Brasil. Azul-cobalto marca os lugares em situação melhor que a do país e ocre os que estão pior;
              quanto mais forte o tom, maior a distância. Cinza indica diferença de até 0,5% em relação ao valor nacional. População,
              densidade e idade mediana não têm lado bom ou ruim e usam uma escala única de turquesa, em que o tom mais escuro é o valor mais
              alto.
            </p>
          </div>
        </div>

        <div className="min-w-0 lg:col-span-8">
          <ul className="divide-y divide-line border-y border-line md:hidden">
            {catalog.indicators.map((i) => (
              <li key={i.id} className="py-3 text-sm">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="font-medium text-ink">{i.name}</span>
                  <a href={i.source.url} target="_blank" rel="noreferrer" className="tnum inline-flex shrink-0 items-center gap-1 font-medium text-good-strong underline">
                    SIDRA {i.source.table}
                    <ExternalLink className="size-3" aria-hidden />
                  </a>
                </div>
                <p className="mt-1 text-xs leading-relaxed text-ink-2">
                  {i.source.survey} · variável {i.source.variable} · {i.firstPeriod} a {i.lastPeriod}
                </p>
                <p className="text-xs leading-relaxed text-ink-3">
                  {i.universe} · {unitLabel(i)}
                </p>
                {i.note && <p className="mt-1 text-xs leading-snug text-ink-3">{i.note}</p>}
              </li>
            ))}
          </ul>
          <div className="hidden md:block">
            <table className="w-full text-sm">
              <caption className="sr-only">Fontes de cada indicador</caption>
              <thead>
                <tr className="border-b border-line-2 text-left text-xs text-ink-3">
                  <th scope="col" className="py-2 pr-4 font-medium">Indicador</th>
                  <th scope="col" className="py-2 pr-4 font-medium">Pesquisa</th>
                  <th scope="col" className="py-2 pr-4 font-medium">Universo e unidade</th>
                  <th scope="col" className="py-2 pr-4 font-medium">Série</th>
                  <th scope="col" className="py-2 font-medium">SIDRA</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line align-top">
                {catalog.indicators.map((i) => (
                  <tr key={i.id}>
                    <th scope="row" className="py-3 pr-4 text-left font-normal">
                      <span className="block font-medium text-ink">{i.name}</span>
                      <span className="text-xs text-ink-3">{cat.get(i.categoryId)}</span>
                      {i.note && <span className="mt-1 block max-w-xs text-xs leading-snug text-ink-3">{i.note}</span>}
                    </th>
                    <td className="py-3 pr-4 text-ink-2">{i.source.survey}</td>
                    <td className="py-3 pr-4 text-ink-2">
                      {i.universe}
                      <span className="block text-xs text-ink-3">{unitLabel(i)}</span>
                    </td>
                    <td className="tnum py-3 pr-4 text-ink-2">{i.firstPeriod} a {i.lastPeriod}
                      <span className="block text-xs text-ink-3">{i.periodicity}</span></td>
                    <td className="py-3">
                      <a
                        href={i.source.url}
                        target="_blank"
                        rel="noreferrer"
                        className="tnum inline-flex items-center gap-1 font-medium text-good-strong underline hover:text-ink"
                      >
                        {i.source.table}
                        <ExternalLink className="size-3" aria-hidden />
                      </a>
                      <span className="block text-xs text-ink-3">var. {i.source.variable}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  )
}
