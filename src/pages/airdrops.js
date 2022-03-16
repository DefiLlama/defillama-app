import { FullWrapper, PageWrapper } from 'components'
import PageHeader from 'components/PageHeader'
import Table, { columnsToShow } from 'components/Table'
import { useCalcStakePool2Tvl } from 'hooks/data'
import { GeneralLayout } from '../layout'
import { revalidate, getProtocolsPageData } from '../utils/dataApi'

const exclude = [
  'MochiFi'
  'StakeHound'
  'Mento',
  'Lightning Network',
  'Secret Bridge',
  'Karura Swap',
  'Karura Liquid-Staking',
  'Karura Dollar (kUSD)',
  'Tezos Liquidity Baking',
  'Notional',
  'Tinlake',
  'Kuu Finance',
]

export async function getStaticProps() {
  const protocols = (await getProtocolsPageData()).filteredProtocols.filter(
    (token) => (token.symbol === null || token.symbol === '-') && !exclude.includes(token.name)
  )
  return {
    props: {
      protocols,
    },
    revalidate: revalidate(),
  }
}

const columns = columnsToShow('protocolName', 'chains', '1dChange', '7dChange', '1mChange', 'tvl')

export default function Protocols({ protocols }) {
  const data = useCalcStakePool2Tvl(protocols)
  return (
    <GeneralLayout title={`Airdroppable protocols - Defi Llama`} defaultSEO>
      <PageWrapper>
        <FullWrapper>
          <PageHeader title="Tokenless protocols that may airdrop 🧑‍🌾" />
          <Table data={data} columns={columns} />
        </FullWrapper>
      </PageWrapper>
    </GeneralLayout>
  )
}
