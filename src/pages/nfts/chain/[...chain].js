import NFTDashboardPage from '../../../components/NFTDashboardPage'
import { GeneralLayout } from '../../../layout'
import { capitalizeFirstLetter } from '../../../utils'
import { getNFTChainChartData, getNFTCollections, revalidate } from '../../../utils/dataApi'

export async function getStaticProps({
  params: {
    chain: [chainName]
  }
}) {
  const collections = await getNFTCollections()
  const chart = await getNFTChainChartData(chainName)
  const filteredCollections = collections.filter(c => c.chain === chainName)
  const totalVolumeUSD = collections.reduce((a, b) => (b.chain === chainName ? parseInt(b.totalVolumeUSD) : 0) + a, 0)
  const dailyVolumeUSD = collections.reduce((a, b) => (b.chain === chainName ? parseInt(b.dailyVolumeUSD) : 0) + a, 0)

  return {
    props: {
      chain: chainName,
      totalVolumeUSD,
      dailyVolumeUSD,
      dailyChange: 0,
      collections: filteredCollections,
      chart
    },
    revalidate: revalidate()
  }
}

export async function getStaticPaths() {
  const collections = await getNFTCollections()

  const paths = collections.map(({ chain: chainName }) => ({
    params: { chain: [chainName] }
  }))

  return { paths, fallback: 'blocking' }
}

export default function Chain({ chain, ...props }) {
  return (
    <GeneralLayout title={`${capitalizeFirstLetter(chain)} Total Volume - DefiLlama`}>
      <NFTDashboardPage {...props} />
    </GeneralLayout>
  )
}
