import { GeneralLayout } from '../layout'
import { revalidate } from '../utils/dataApi'
import { PageWrapper, FullWrapper } from 'components'
import Search from 'components/Search'
import { AutoColumn } from 'components/Column'
import Table, { columnsToShow } from 'components/Table'
import { formattedPercent } from 'utils'

export async function getStaticProps() {
  const { data } = await fetch("https://1rwmj4tky9.execute-api.eu-central-1.amazonaws.com/latest").then(r=>r.json())
  return {
    props: {
      pools: data,
    },
    revalidate: revalidate()
  }
}

const columns = [{
  header: 'Pool',
  accessor: 'pool',
},
{
  header: 'APY',
  accessor: 'apy',
  Cell: ({ value }) => <>{formattedPercent(value)}</>,
},
...columnsToShow('chains', 'tvl'),
{
  header: 'Project',
  accessor: 'project',
},]
/*
apy: 2.7266469312223007
chain: "ethereum"
exposure: "multi"
ilRisk: "no"
pool: "0xDC24316b9AE028F1497c275EB9192a3Ea0f67022-ethereum"
project: "curve"
stablecoin: false
symbol: "steth (ETH-stETH)"
tvlUsd: 4879069148.550062
*/
export default function Protocols({ pools }) {
  return (
    <GeneralLayout title={`APY Rankings - DefiLlama`} defaultSEO>
      <PageWrapper>
      <FullWrapper>
      <AutoColumn gap="24px">
          <Search />
        </AutoColumn>
      <Table data={pools.map(t=>({
        pool: t.symbol,
        chains: [t.chain],
        apy: t.apy,
        tvl: t.tvlUsd,
        project: t.project
      }))} columns={columns} />
      </FullWrapper>
    </PageWrapper>
    </GeneralLayout>
  )
}
