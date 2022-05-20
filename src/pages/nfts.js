import NFTDashboardPage from '../components/NFTDashboardPage'
import { getNFTChainsData, getNFTData, revalidate } from '../utils/dataApi'
import Layout from '../layout'

export async function getStaticProps() {
  const data = await getNFTData()
  const chainData = await getNFTChainsData()

  return {
    props: {
      ...data,
      chainData
    },
    revalidate: revalidate()
  }
}

export default function NFTHomePage(props) {
  return (
    <Layout title="DefiLlama - NFT Dashboard">
      <NFTDashboardPage {...props} />
    </Layout>
  )
}
