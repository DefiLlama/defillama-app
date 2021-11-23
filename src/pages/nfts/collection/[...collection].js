import NFTCollectionPage from '../../../components/NFTCollectionPage'
import { GeneralLayout } from '../../../layout'
import { getNFTCollection, getNFTCollections, getNFTCollectionChartData, revalidate } from '../../../utils/dataApi'

export async function getStaticProps({
  params: {
    collection: [slug]
  }
}) {
  const collection = await getNFTCollection(slug)
  const chartData = await getNFTCollectionChartData(slug)

  return {
    props: {
      collection,
      chartData
    },
    revalidate: revalidate()
  }
}

export async function getStaticPaths() {
  const collections = await getNFTCollections()
  const paths = collections.map(({ slug }) => ({
    params: { collection: [slug] }
  }))

  return { paths, fallback: 'blocking' }
}

export default function Collection(props) {
  return (
    <GeneralLayout title="DefiLlama - NFT Dashboard">
      <NFTCollectionPage {...props} />
    </GeneralLayout>
  )
}
