import { FullWrapper, PageWrapper } from '../components'
import { GeneralLayout } from '../layout'
import Panel from 'components/Panel'
import { LANGS_API } from '../constants'
import { toNiceMonthlyDate, getRandomColor } from '../utils'
import { revalidate } from '../utils/dataApi'
import { useDarkModeManager } from 'contexts/LocalStorage'
import { GeneralAreaChart } from 'components/TokenChart'
import { ChainDominanceChart } from 'components/Charts'

export async function getStaticProps() {
  const data = await fetch(LANGS_API).then(r=>r.json())
  const langs = data.chart
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
    props: {
      langs: formattedLangs,
      langsUnique: Array.from(langsUnique),
      daySum
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

export default function Protocols({ langs, langsUnique, daySum }) {
  const colors = {}
  langsUnique.forEach(l=>{colors[l]=getRandomColor()})
  return (
    <GeneralLayout title={`Languages - DefiLlama`} defaultSEO>
      <PageWrapper>
      <FullWrapper>
        <Chart {...({langs, langsUnique})} />
        <ChainDominanceChart
            stackOffset="expand"
            formatPercent={true}
            stackedDataset={langs}
            chainsUnique={langsUnique}
            chainColor={colors}
            daySum={daySum} />
      </FullWrapper>
      </PageWrapper>
    </GeneralLayout>
  )
}
