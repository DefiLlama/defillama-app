import { getColor } from 'utils/getColor'
import NFTCollectionPage from '../../../components/NFTCollectionPage'
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
  const backgroundColor = await getColor(collection.slug, collection.logo)
  // added to preload search. adds this query in build time but improves UX by displaying some results without having to type
  // if used more times would be wise to store it globally (in a context)
  // the response could be also be taken from getStaticPaths but the solution doesnt convince me https://github.com/vercel/next.js/discussions/11272
  const collections = await getNFTCollections()

  return {
    props: {
      collection,
      chart,
      statistics,
      title: collection ? `${collection.name} - DefiLlama` : `DefiLlama - NFT Dashboard`,
      backgroundColor,
      collections,
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
  return <NFTCollectionPage {...props} />
}
