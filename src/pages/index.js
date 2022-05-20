import ChainPage from '../components/ChainPage'
import Layout from '../layout'
import { getChainPageData, revalidate } from '../utils/dataApi'
import SearchDataProvider from 'contexts/SearchData'

export async function getStaticProps() {
  const data = await getChainPageData()
  return {
    ...data,
    revalidate: revalidate(),
  }
}

export default function HomePage(props) {
  return (
    <SearchDataProvider protocolsAndChains={{ protocolNames: props.filteredProtocols, chainsSet: props.chainsSet }}>
      <Layout title="DefiLlama - DeFi Dashboard">
        <ChainPage {...props} />
      </Layout>
    </SearchDataProvider>
  )
}
