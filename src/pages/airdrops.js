import { FullWrapper, PageWrapper } from 'components'
import PageHeader from 'components/PageHeader'
import Table, { columnsToShow } from 'components/Table'
import { GeneralLayout } from '../layout'
import { revalidate, getSimpleProtocolsPageData } from '../utils/dataApi'

const exclude = [
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
  const protocols = (await getSimpleProtocolsPageData()).protocols.filter(
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
  return (
    <GeneralLayout title={`Airdroppable protocols - Defi Llama`} defaultSEO>
      <PageWrapper>
        <FullWrapper>
          <PageHeader title="Tokenless protocols that may airdrop 🧑‍🌾" />
          <Table data={protocols} columns={columns} />
        </FullWrapper>
      </PageWrapper>
    </GeneralLayout>
  )
}
