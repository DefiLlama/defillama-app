import PeggedList from '../components/PeggedList'
import { GeneralLayout } from '../layout'
import { getSimplePeggedAssetsPageData, revalidate } from '../utils/peggedDataApi'

export async function getStaticProps({ params }) {
  const { peggedAssets, chains } = await getSimplePeggedAssetsPageData()
  return {
    props: {
      peggedAssets,
      chainsSet: chains
    },
    revalidate: revalidate()
  }
}

export default function PeggedAssets({ chainsSet, peggedAssets }) {
  return (
    <GeneralLayout title={`Circulating - DefiLlama`} defaultSEO>
      <PeggedList chainsSet={chainsSet} filteredProtocols={peggedAssets} showChainList={false} />
    </GeneralLayout>
  )
}
