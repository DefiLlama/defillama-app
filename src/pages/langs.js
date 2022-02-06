import { FullWrapper, PageWrapper } from '../components'
import { GeneralLayout } from '../layout'
import Panel from 'components/Panel'
import { LANGS_API } from '../constants'
import { toNiceMonthlyDate } from '../utils'
import { revalidate } from '../utils/dataApi'
import { useDarkModeManager } from 'contexts/LocalStorage'
import { GeneralAreaChart } from 'components/TokenChart'

export async function getStaticProps() {
  const langs = await fetch(LANGS_API).then(r=>r.json())
  const langsUnique = new Set()
  const formattedLangs = Object.entries(langs).map(lang=>{
    Object.keys(lang[1]).map(l=>langsUnique.add(l))
    return {
      ...lang[1],
      date: lang[0],
    }
  }).sort((a,b)=>b.date-a.date);

  return {
    props: {
      langs: formattedLangs,
      langsUnique: Array.from(langsUnique)
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

export default function Protocols({ langs, langsUnique }) {
  
  return (
    <GeneralLayout title={`Languages - DefiLlama`} defaultSEO>
      <PageWrapper>
      <FullWrapper>
        <Chart {...({langs, langsUnique})} />
      </FullWrapper>
      </PageWrapper>
    </GeneralLayout>
  )
}
