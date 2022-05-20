import ProtocolList from '../components/ProtocolList'
import Layout from '../layout'
import { getSimpleProtocolsPageData, revalidate } from '../utils/dataApi'

export async function getStaticProps() {
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
    <Layout title={`TVL Rankings - DefiLlama`} defaultSEO>
      <ProtocolList chainsSet={chainsSet} filteredProtocols={protocols} showChainList={false} />
    </Layout>
  )
}
