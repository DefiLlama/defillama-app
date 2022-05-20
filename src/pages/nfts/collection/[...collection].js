import NFTCollectionPage from '../../../components/NFTCollectionPage'
import Layout from '../../../layout'
import {
  getNFTCollection,
  getNFTCollections,
  getNFTCollectionChartData,
  revalidate,
  getNFTStatistics,
} from '../../../utils/dataApi'

export async function getStaticProps({
  params: {
    collection: [slug],
  },
}) {
  const collection = await getNFTCollection(slug)
  const chart = await getNFTCollectionChartData(slug)
  const statistics = await getNFTStatistics(chart)

  return {
    props: {
      collection,
      chart,
      statistics,
      title: collection ? `${collection.name} - DefiLlama` : `DefiLlama - NFT Dashboard`,
    },
    revalidate: revalidate(),
  }
}

export async function getStaticPaths() {
  const collections = await getNFTCollections()
  const paths = collections.slice(0, 20).map(({ slug }) => ({
    params: { collection: [slug] },
  }))

  return { paths, fallback: 'blocking' }
}

export default function Collection(props) {
  return (
    <Layout title={props.title}>
      <NFTCollectionPage {...props} />
    </Layout>
  )
}
