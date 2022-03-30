import { FullWrapper, PageWrapper } from '../components'
import { GeneralLayout } from '../layout'
import Panel from 'components/Panel'
import { LANGS_API } from '../constants'
import { toNiceMonthlyDate, getRandomColor } from '../utils'
import { revalidate } from '../utils/dataApi'
import { useDarkModeManager } from 'contexts/LocalStorage'
import { GeneralAreaChart } from 'components/TokenChart'
import { ChainDominanceChart } from 'components/Charts'
import Search from 'components/Search'
import { Header } from 'Theme'

function formatDataForChart(langs){
  const langsUnique = new Set()
  const daySum = {}
  const formattedLangs = Object.entries(langs).map(lang=>{
    Object.keys(lang[1]).map(l=>langsUnique.add(l))
    daySum[lang[0]]=Object.values(lang[1]).reduce((t,a)=>t+a)
    return {
      ...lang[1],
      date: lang[0],
    }
  }).sort((a,b)=>a.date-b.date);
  return {
    formatted: formattedLangs,
    unique: Array.from(langsUnique),
    daySum
  }
}

export async function getStaticProps() {
  const data = await fetch(LANGS_API).then(r=>r.json())
  const {unique: langsUnique, formatted: formattedLangs, daySum: langsDaySum} = formatDataForChart(data.chart)
  const {unique: osUnique, formatted: osLangs, daySum: osDaySum} = formatDataForChart(data.sumDailySolanaOpenSourceTvls)

  return {
    props: {
      langs: formattedLangs,
      langsUnique,
      langsDaySum,
      osUnique,
      osLangs,
      osDaySum
    },
    revalidate: revalidate()
  }
}

function Chart({langs, langsUnique}){
  const [darkMode] = useDarkModeManager()
  const textColor = darkMode ? 'white' : 'black'
  return <Panel style={{ marginTop: '6px' }} sx={{ padding: ['1rem 0 0 0', '1.25rem'] }}>
  <GeneralAreaChart 
      aspect={60 / 22} 
      finalChartData={langs} 
      tokensUnique={langsUnique}
      textColor={textColor} 
      color={"blue"}
      moneySymbol="$"
      formatDate={toNiceMonthlyDate}
      hallmarks={[]} />
</Panel>
}

export default function Protocols({ langs, langsUnique, langsDaySum,
  osUnique,
  osLangs,
  osDaySum }) {
  const colors = {}
  langsUnique.forEach(l=>{colors[l]=getRandomColor()})
  console.log(colors)
  return (
    <GeneralLayout title={`Languages - DefiLlama`} defaultSEO>
      <PageWrapper>
      <FullWrapper>
        <Search />
        <Header>TVL breakdown by Smart Contract Language</Header>
        <Chart {...({langs, langsUnique})} />
        <ChainDominanceChart
            stackOffset="expand"
            formatPercent={true}
            stackedDataset={langs}
            chainsUnique={langsUnique}
            chainColor={colors}
            daySum={langsDaySum} />
        <br />
        <Header>Open/Closed Source breakdown of solana protocols</Header>
        <ChainDominanceChart
            stackOffset="expand"
            formatPercent={true}
            stackedDataset={osLangs}
            chainsUnique={osUnique}
            chainColor={{
              opensource: "green",
              closedsource: "red"
            }}
            daySum={osDaySum} />
      </FullWrapper>
      </PageWrapper>
    </GeneralLayout>
  )
}
