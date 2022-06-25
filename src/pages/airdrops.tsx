import styled from 'styled-components'
import { Header } from '~/Theme'
import Layout from '~/layout'
import { ProtocolsTable } from '~/components'
import { ProtocolsChainsSearch } from '~/components/Search'
import { columnsToShow } from '~/components/Table'
import { useCalcStakePool2Tvl } from '~/hooks/data'
import { revalidate, getProtocolsPageData } from '~/utils/dataApi'

const exclude = [
  'DeerFi',
  'FireDAO',
  'Robo-Advisor for Yield',
  'SenpaiSwap',
  'Zunami Protocol',
  'NowSwap',
  'NeoBurger',
  'MochiFi',
  'StakeHound',
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

const TableWrapper = styled(ProtocolsTable)`
  tr > *:nth-child(7) {
    padding-right: 20px;
  }
`

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

const columns = columnsToShow('protocolName', 'category', 'chains', '1dChange', '7dChange', '1mChange', 'tvl')

export default function Protocols({ protocols }) {
  const data = useCalcStakePool2Tvl(protocols)
  return (
    <Layout title={`Airdroppable protocols - Defi Llama`} defaultSEO>
      <ProtocolsChainsSearch step={{ category: 'Home', name: 'Airdrops' }} />

      <Header>Tokenless protocols that may airdrop 🧑‍🌾</Header>

      <TableWrapper data={data} columns={columns} />
    </Layout>
  )
}
