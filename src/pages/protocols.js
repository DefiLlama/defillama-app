import ProtocolList from '../components/ProtocolList'
import { GeneralLayout } from '../layout'
import { getSimpleProtocolsPageData, revalidate } from '../utils/dataApi'

export async function getStaticProps({ params }) {
  const { protocols, chains } = await getSimpleProtocolsPageData()
  return {
    props: {
      protocols,
      chainsSet: chains
    },
    revalidate: revalidate()
  }
}

export default function Protocols({ chainsSet, protocols }) {
  return (
    <GeneralLayout title={`TVL Rankings - DefiLlama`}>
      <ProtocolList chainsSet={chainsSet} filteredProtocols={protocols} showChainList={false} />
    </GeneralLayout>
  )
}
