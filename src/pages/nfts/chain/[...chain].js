import NFTDashboardPage from '../../../components/NFTDashboardPage'
import { GeneralLayout } from '../../../layout'
import { getNFTChainChartData, getNFTChainsData, getNFTCollectionsByChain, getNFTStatistics, revalidate } from '../../../utils/dataApi'

export async function getStaticProps({
  params: {
    chain: [chainName]
  }
}) {
  const collections = await getNFTCollectionsByChain(chainName)
  const chartData = await getNFTChainChartData(chainName)
  const chainData = await getNFTChainsData()
  const statistics = await getNFTStatistics(chartData)
  const { displayName } = chainData.find(c => c.chain === chainName) || { displayName: '' }

  return {
    props: {
      chart: chartData,
      collections,
      statistics,
      chainData,
      displayName,
    },
    revalidate: revalidate()
  }
}

export async function getStaticPaths() {
  const chainData = await getNFTChainsData()

  const paths = chainData.map(({ chain: chainName }) => ({
    params: { chain: [chainName] }
  }))

  return { paths, fallback: 'blocking' }
}

export default function Chain({ displayName, ...props }) {
  return (
    <GeneralLayout title={`${displayName} Total Volume - DefiLlama`}>
      <NFTDashboardPage displayName={displayName} {...props} />
    </GeneralLayout>
  )
}
