import NFTDashboardPage from '../components/NFTDashboardPage'
import { getNFTData, revalidate } from '../utils/dataApi'
import { GeneralLayout } from '../layout'

export async function getStaticProps({ params }) {
  const data = await getNFTData()

  return {
    ...data,
    revalidate: revalidate()
  }
}

export default function NFTHomePage(props) {
  return (
    <GeneralLayout title="DefiLlama - NFT Dashboard">
      <NFTDashboardPage {...props} />
    </GeneralLayout>
  )
}
