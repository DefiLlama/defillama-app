import ProtocolList from '../components/ProtocolList'
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
  'Kuu Finance'
]

export async function getStaticProps() {
  const protocols = (await getSimpleProtocolsPageData()).protocols.filter(
    token => (token.symbol === null || token.symbol === '-') && !exclude.includes(token.name)
  )
  return {
    props: {
      protocols
    },
    revalidate: revalidate()
  }
}

export default function Protocols({ protocols }) {
  return (
    <GeneralLayout title={`Airdroppable protocols - Defi Llama`} defaultSEO>
      <ProtocolList
        title="Tokenless protocols that may airdrop 🧑‍🌾"
        category=""
        filteredProtocols={protocols}
        showChainList={false}
      />
    </GeneralLayout>
  )
}
