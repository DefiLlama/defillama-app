import Layout from '~/layout'
import ProtocolList from '~/components/ProtocolList'
import { getSimpleProtocolsPageData, revalidate } from '~/utils/dataApi'

export async function getStaticProps() {
  const { protocols } = await getSimpleProtocolsPageData()
  return {
    props: {
      protocols,
    },
    revalidate: revalidate(),
  }
}

export default function Protocols({ protocols }) {
  return (
    <Layout title={`TVL Rankings - DefiLlama`} defaultSEO>
      <ProtocolList filteredProtocols={protocols} showChainList={false} />
    </Layout>
  )
}
